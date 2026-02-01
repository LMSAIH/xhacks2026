import { useState, useCallback, useRef, useEffect } from 'react';

// Get backend URL from environment or use default
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8787';

export type VoiceState = 'idle' | 'connecting' | 'listening' | 'processing' | 'speaking' | 'error';

export interface EditorVoiceMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

export interface EditorVoiceConfig {
  voice?: string;
  professorName?: string;
  professorPersonality?: string;
  topic?: string;
  sectionTitle?: string;
  sectionContext?: string;
}

interface UseEditorVoiceReturn {
  // State
  isConnected: boolean;
  voiceState: VoiceState;
  messages: EditorVoiceMessage[];
  partialTranscript: string;
  error: string | null;
  
  // Actions
  connect: (config: EditorVoiceConfig) => Promise<void>;
  disconnect: () => void;
  startListening: () => void;
  stopListening: () => void;
  sendText: (text: string) => void;
  interrupt: () => void;
  clearHistory: () => void;
  updateSection: (sectionTitle: string, sectionContext?: string) => void;
}

export function useEditorVoice(): UseEditorVoiceReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [messages, setMessages] = useState<EditorVoiceMessage[]>([]);
  const [partialTranscript, setPartialTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioQueueRef = useRef<ArrayBuffer[]>([]);
  const isPlayingRef = useRef(false);
  const configRef = useRef<EditorVoiceConfig | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []);

  const playAudioQueue = useCallback(async () => {
    if (isPlayingRef.current || audioQueueRef.current.length === 0) return;
    
    isPlayingRef.current = true;
    
    while (audioQueueRef.current.length > 0) {
      const audioData = audioQueueRef.current.shift();
      if (!audioData) continue;

      try {
        if (!audioContextRef.current) {
          audioContextRef.current = new AudioContext();
        }

        // Decode the audio (works with both MP3 and other formats)
        const audioBuffer = await audioContextRef.current.decodeAudioData(audioData.slice(0));

        const source = audioContextRef.current.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContextRef.current.destination);

        await new Promise<void>((resolve) => {
          source.onended = () => resolve();
          source.start();
        });
      } catch (e) {
        console.error('Audio playback error:', e);
      }
    }

    isPlayingRef.current = false;
    if (voiceState === 'speaking') {
      setVoiceState('idle');
    }
  }, [voiceState]);

  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data);

      switch (data.type) {
        case 'ready':
          // Session ready, now start it
          if (wsRef.current && configRef.current) {
            wsRef.current.send(JSON.stringify({
              type: 'start_session',
              ...configRef.current,
            }));
          }
          break;

        case 'session_started':
          setIsConnected(true);
          setVoiceState('idle');
          setError(null);
          break;

        case 'state_change':
          setVoiceState(data.state);
          break;

        case 'transcript_partial':
          setPartialTranscript(data.text);
          break;

        case 'transcript':
          setPartialTranscript('');
          setMessages((prev) => [
            ...prev,
            {
              id: `${Date.now()}-${Math.random()}`,
              text: data.text,
              isUser: data.isUser,
              timestamp: new Date(),
            },
          ]);
          break;

        case 'audio':
          // Decode base64 audio and queue for playback
          const binaryString = atob(data.audio);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          audioQueueRef.current.push(bytes.buffer);
          playAudioQueue();
          break;

        case 'audio_complete':
          // All audio chunks received
          break;

        case 'interrupted':
          audioQueueRef.current = [];
          setVoiceState('idle');
          break;

        case 'cleared':
          setMessages([]);
          break;

        case 'section_updated':
          // Section context updated
          break;

        case 'error':
          setError(data.message);
          setVoiceState('error');
          break;
      }
    } catch (e) {
      console.error('Message parse error:', e);
    }
  }, [playAudioQueue]);

  const connect = useCallback(async (config: EditorVoiceConfig) => {
    if (wsRef.current) {
      disconnect();
    }

    setVoiceState('connecting');
    setError(null);
    configRef.current = config;

    const wsUrl = `${BACKEND_URL.replace('http', 'ws')}/api/editor-voice/session`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('Editor voice WebSocket connected');
      };

      ws.onmessage = handleMessage;

      ws.onerror = (e) => {
        console.error('WebSocket error:', e);
        setError('Connection error');
        setVoiceState('error');
      };

      ws.onclose = () => {
        console.log('WebSocket closed');
        setIsConnected(false);
        setVoiceState('idle');
        wsRef.current = null;
      };
    } catch (e) {
      setError(`Connection failed: ${e}`);
      setVoiceState('error');
    }
  }, [handleMessage]);

  const disconnect = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    audioQueueRef.current = [];
    setIsConnected(false);
    setVoiceState('idle');
  }, []);

  const startListening = useCallback(async () => {
    if (!wsRef.current || voiceState !== 'idle') return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        
        if (audioChunksRef.current.length === 0) return;

        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        
        // Convert to base64 and send
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1];
          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
              type: 'audio',
              audio: base64,
            }));
          }
        };
        reader.readAsDataURL(audioBlob);
      };

      mediaRecorder.start();
      setVoiceState('listening');
    } catch (e) {
      console.error('Microphone access error:', e);
      setError('Could not access microphone');
    }
  }, [voiceState]);

  const stopListening = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setVoiceState('processing');
    }
  }, []);

  const sendText = useCallback((text: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    if (voiceState !== 'idle') return;

    wsRef.current.send(JSON.stringify({
      type: 'text',
      text,
    }));
  }, [voiceState]);

  const interrupt = useCallback(() => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    wsRef.current.send(JSON.stringify({ type: 'interrupt' }));
    audioQueueRef.current = [];
    isPlayingRef.current = false;
  }, []);

  const clearHistory = useCallback(() => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    wsRef.current.send(JSON.stringify({ type: 'clear_history' }));
  }, []);

  const updateSection = useCallback((sectionTitle: string, sectionContext?: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    wsRef.current.send(JSON.stringify({
      type: 'update_section',
      sectionTitle,
      sectionContext,
    }));
  }, []);

  return {
    isConnected,
    voiceState,
    messages,
    partialTranscript,
    error,
    connect,
    disconnect,
    startListening,
    stopListening,
    sendText,
    interrupt,
    clearHistory,
    updateSection,
  };
}
