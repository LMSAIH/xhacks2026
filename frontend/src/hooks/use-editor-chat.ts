import { useState, useCallback, useRef, useEffect } from 'react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8787';

export type VoiceState = 'idle' | 'recording' | 'processing' | 'playing' | 'error';

export interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

export interface EditorChatConfig {
  voice?: string;
  professorName?: string;
  professorPersonality?: string;
  topic?: string;
  sectionTitle?: string;
}

interface UseEditorChatReturn {
  isReady: boolean;
  voiceState: VoiceState;
  messages: ChatMessage[];
  error: string | null;
  liveTranscript: string;
  
  init: (config: EditorChatConfig) => Promise<void>;
  sendMessage: (text: string) => Promise<void>;
  startRecording: () => void;
  stopRecording: () => Promise<void>;
  stopAudio: () => void;
  clearHistory: () => Promise<void>;
  updateSection: (sectionTitle: string) => Promise<void>;
}

// Browser Speech Recognition types
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

export function useEditorChat(): UseEditorChatReturn {
  const [isReady, setIsReady] = useState(false);
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [liveTranscript, setLiveTranscript] = useState('');
  
  const sessionIdRef = useRef<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
      }
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  const init = useCallback(async (config: EditorChatConfig) => {
    try {
      setError(null);
      console.log('Initializing chat session...', config);
      
      const res = await fetch(`${BACKEND_URL}/api/editor-chat/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Failed to create session: ${errText}`);
      }
      
      const data = await res.json();
      console.log('Session created:', data);
      sessionIdRef.current = data.sessionId;
      setIsReady(true);
      setMessages([]);
    } catch (e) {
      console.error('Init failed:', e);
      setError(`Connection failed: ${e}`);
      setIsReady(false);
    }
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    if (!sessionIdRef.current || !text.trim()) return;
    
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      text: text.trim(),
      isUser: true,
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setVoiceState('processing');
    setError(null);
    
    try {
      const res = await fetch(`${BACKEND_URL}/api/editor-chat/session/${sessionIdRef.current}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });
      
      if (!res.ok) throw new Error('Failed to send message');
      
      const data = await res.json();
      
      const aiMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        text: data.response,
        isUser: false,
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, aiMessage]);
    } catch (e) {
      setError(`Failed to send: ${e}`);
    } finally {
      setVoiceState('idle');
    }
  }, []);

  const startRecording = useCallback(async () => {
    if (voiceState !== 'idle') return;
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      setLiveTranscript('');
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };
      
      // Start live transcription using browser Speech Recognition
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        
        recognition.onresult = (event: SpeechRecognitionEvent) => {
          let interim = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i];
            if (result.isFinal) {
              // Don't update for final - we'll use backend's Whisper result
            } else {
              interim += result[0].transcript;
            }
          }
          setLiveTranscript(interim);
        };
        
        recognition.onerror = () => {
          // Silently ignore - live transcription is optional
        };
        
        recognitionRef.current = recognition;
        recognition.start();
      }
      
      mediaRecorder.start();
      setVoiceState('recording');
    } catch (e) {
      setError('Could not access microphone');
    }
  }, [voiceState]);

  const stopRecording = useCallback(async () => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state !== 'recording') return;
    
    // Stop live transcription
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    
    return new Promise<void>((resolve) => {
      const mediaRecorder = mediaRecorderRef.current!;
      
      mediaRecorder.onstop = async () => {
        // Stop all tracks
        mediaRecorder.stream.getTracks().forEach(track => track.stop());
        
        // Clear live transcript when processing starts
        setLiveTranscript('');
        
        if (audioChunksRef.current.length === 0) {
          setVoiceState('idle');
          resolve();
          return;
        }
        
        setVoiceState('processing');
        
        try {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          
          // Send as FormData with binary audio
          const formData = new FormData();
          formData.append('audio', audioBlob, 'recording.webm');
          
          // Send to backend
          const res = await fetch(`${BACKEND_URL}/api/editor-chat/session/${sessionIdRef.current}/voice`, {
            method: 'POST',
            body: formData,
          });
            
          if (!res.ok) {
            const errData = await res.json();
            throw new Error(errData.error || 'Voice processing failed');
          }
          
          const data = await res.json();
          
          // Add user transcript
          const userMessage: ChatMessage = {
            id: `user-${Date.now()}`,
            text: data.transcript,
            isUser: true,
            timestamp: new Date(),
          };
          
          // Add AI response
          const aiMessage: ChatMessage = {
            id: `ai-${Date.now()}`,
            text: data.response,
            isUser: false,
            timestamp: new Date(),
          };
          
          setMessages(prev => [...prev, userMessage, aiMessage]);
          
          // Play audio response
          if (data.audio) {
            try {
              setVoiceState('playing');
              const format = data.audioFormat || 'wav';
              const audioSrc = `data:audio/${format};base64,${data.audio}`;
              const audio = new Audio(audioSrc);
              currentAudioRef.current = audio;
              
              audio.onended = () => {
                setVoiceState('idle');
                currentAudioRef.current = null;
              };
              
              audio.onerror = (e) => {
                console.error('Audio playback error:', e);
                setVoiceState('idle');
                currentAudioRef.current = null;
              };
              
              await audio.play();
            } catch (playError) {
              console.error('Failed to play audio:', playError);
              setVoiceState('idle');
            }
          } else {
            console.log('No audio in response');
            setVoiceState('idle');
          }
        } catch (e) {
          setError(`Voice error: ${e}`);
          setVoiceState('idle');
        }
        
        resolve();
      };
      
      mediaRecorder.stop();
    });
  }, []);

  const stopAudio = useCallback(() => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    setVoiceState('idle');
  }, []);

  const clearHistory = useCallback(async () => {
    if (!sessionIdRef.current) return;
    
    try {
      await fetch(`${BACKEND_URL}/api/editor-chat/session/${sessionIdRef.current}/clear`, {
        method: 'POST',
      });
      setMessages([]);
    } catch (e) {
      setError(`Failed to clear: ${e}`);
    }
  }, []);

  const updateSection = useCallback(async (sectionTitle: string) => {
    if (!sessionIdRef.current) return;
    
    try {
      await fetch(`${BACKEND_URL}/api/editor-chat/session/${sessionIdRef.current}/section`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sectionTitle }),
      });
    } catch (e) {
      console.error('Failed to update section:', e);
    }
  }, []);

  return {
    isReady,
    voiceState,
    messages,
    error,
    liveTranscript,
    init,
    sendMessage,
    startRecording,
    stopRecording,
    stopAudio,
    clearHistory,
    updateSection,
  };
}
