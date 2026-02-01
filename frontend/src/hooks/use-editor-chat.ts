import { useState, useCallback, useRef, useEffect } from 'react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8787';

export type VoiceState = 'idle' | 'recording' | 'processing' | 'playing' | 'error';

export interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  isCommand?: boolean;
  commandType?: string;
}

export interface EditorChatConfig {
  voice?: string;
  professorName?: string;
  professorPersonality?: string;
  topic?: string;
  sectionTitle?: string;
}

// Command result from backend
export interface CommandResult {
  commandType: string;
  data?: unknown;
  response: string;
}

interface UseEditorChatOptions {
  // Callback when a slash command is executed
  onCommand?: (result: CommandResult) => void;
  // Function to get current notes content for commands like /critique
  getNotesContent?: () => string;
  // Callback when conversation reaches a certain length and user should add notes
  onSuggestAddNotes?: (summary: string) => void;
  // Number of exchanges before suggesting to add notes (default: 5)
  suggestNotesAfterExchanges?: number;
}

interface UseEditorChatReturn {
  isReady: boolean;
  voiceState: VoiceState;
  messages: ChatMessage[];
  error: string | null;
  liveTranscript: string;
  exchangeCount: number;
  showNotesPrompt: boolean;
  notesSummary: string | null;
  sessionId: string | null;
  
  init: (config: EditorChatConfig) => Promise<void>;
  sendMessage: (text: string) => Promise<void>;
  startRecording: () => void;
  stopRecording: () => Promise<void>;
  stopAudio: () => void;
  clearHistory: () => Promise<void>;
  updateSection: (sectionTitle: string) => Promise<void>;
  updateNotes: (notes: string) => Promise<void>;
  dismissNotesPrompt: () => void;
  summarizeConversation: () => Promise<string | null>;
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

export function useEditorChat(options: UseEditorChatOptions = {}): UseEditorChatReturn {
  const { 
    onCommand, 
    getNotesContent, 
    onSuggestAddNotes,
    suggestNotesAfterExchanges = 5,
  } = options;
  
  const [isReady, setIsReady] = useState(false);
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [exchangeCount, setExchangeCount] = useState(0);
  const [showNotesPrompt, setShowNotesPrompt] = useState(false);
  const [notesSummary, setNotesSummary] = useState<string | null>(null);
  
  const sessionIdRef = useRef<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const onCommandRef = useRef(onCommand);
  const getNotesContentRef = useRef(getNotesContent);
  const onSuggestAddNotesRef = useRef(onSuggestAddNotes);
  const lastPromptedAtRef = useRef(0); // Track when we last prompted
  
  // Keep refs updated
  useEffect(() => {
    onCommandRef.current = onCommand;
    getNotesContentRef.current = getNotesContent;
    onSuggestAddNotesRef.current = onSuggestAddNotes;
  }, [onCommand, getNotesContent, onSuggestAddNotes]);

  // Check if we should prompt user to add notes
  useEffect(() => {
    // Only prompt if we've had enough exchanges and haven't prompted recently
    if (
      exchangeCount > 0 && 
      exchangeCount % suggestNotesAfterExchanges === 0 &&
      exchangeCount !== lastPromptedAtRef.current
    ) {
      lastPromptedAtRef.current = exchangeCount;
      
      // Generate a summary and show prompt
      summarizeConversation().then((summary) => {
        if (summary) {
          setNotesSummary(summary);
          setShowNotesPrompt(true);
          
          // Also call the callback if provided
          if (onSuggestAddNotesRef.current) {
            onSuggestAddNotesRef.current(summary);
          }
        }
      });
    }
  }, [exchangeCount, suggestNotesAfterExchanges]);

  // Summarize conversation for notes
  const summarizeConversation = useCallback(async (): Promise<string | null> => {
    if (!sessionIdRef.current || messages.length < 2) return null;
    
    try {
      const res = await fetch(`${BACKEND_URL}/api/editor-chat/session/${sessionIdRef.current}/summarize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (!res.ok) {
        console.error('Failed to summarize conversation');
        return null;
      }
      
      const data = await res.json();
      return data.summary || null;
    } catch (e) {
      console.error('Summarize error:', e);
      return null;
    }
  }, [messages.length]);

  // Dismiss the notes prompt
  const dismissNotesPrompt = useCallback(() => {
    setShowNotesPrompt(false);
  }, []);

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
    
    // Before sending, update notes content for potential slash commands
    if (getNotesContentRef.current) {
      const notes = getNotesContentRef.current();
      if (notes) {
        try {
          await fetch(`${BACKEND_URL}/api/editor-chat/session/${sessionIdRef.current}/notes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ notes }),
          });
        } catch (e) {
          console.error('Failed to update notes:', e);
        }
      }
    }
    
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
        isCommand: data.isCommand,
        commandType: data.commandType,
      };
      
      setMessages(prev => [...prev, aiMessage]);
      
      // Increment exchange count (one complete user->AI exchange)
      setExchangeCount(prev => prev + 1);
      
      // If this was a command, trigger the callback
      if (data.isCommand && onCommandRef.current) {
        onCommandRef.current({
          commandType: data.commandType,
          data: data.commandData,
          response: data.response,
        });
      }
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
          // Before sending voice, update notes content for potential slash commands
          if (getNotesContentRef.current && sessionIdRef.current) {
            const notes = getNotesContentRef.current();
            if (notes) {
              try {
                await fetch(`${BACKEND_URL}/api/editor-chat/session/${sessionIdRef.current}/notes`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ notes }),
                });
              } catch (e) {
                console.error('Failed to update notes:', e);
              }
            }
          }
          
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
            isCommand: data.isCommand,
            commandType: data.commandType,
          };
          
          // Add AI response
          const aiMessage: ChatMessage = {
            id: `ai-${Date.now()}`,
            text: data.response,
            isUser: false,
            timestamp: new Date(),
            isCommand: data.isCommand,
            commandType: data.commandType,
          };
          
          setMessages(prev => [...prev, userMessage, aiMessage]);
          
          // Increment exchange count (one complete user->AI exchange)
          setExchangeCount(prev => prev + 1);
          
          // If this was a command, trigger the callback
          if (data.isCommand && onCommandRef.current) {
            onCommandRef.current({
              commandType: data.commandType,
              data: data.commandData,
              response: data.response,
            });
          }
          
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

  const updateNotes = useCallback(async (notes: string) => {
    if (!sessionIdRef.current) return;
    
    try {
      await fetch(`${BACKEND_URL}/api/editor-chat/session/${sessionIdRef.current}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      });
    } catch (e) {
      console.error('Failed to update notes:', e);
    }
  }, []);

  return {
    isReady,
    voiceState,
    messages,
    error,
    liveTranscript,
    exchangeCount,
    showNotesPrompt,
    notesSummary,
    sessionId: sessionIdRef.current,
    init,
    sendMessage,
    startRecording,
    stopRecording,
    stopAudio,
    clearHistory,
    updateSection,
    updateNotes,
    dismissNotesPrompt,
    summarizeConversation,
  };
}
