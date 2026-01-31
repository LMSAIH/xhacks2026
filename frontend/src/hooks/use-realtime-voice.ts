import { useState, useCallback, useRef, useEffect } from 'react';

interface UseRealtimeVoiceOptions {
  serverUrl: string;
  courseCode?: string;
  onTranscriptUpdate?: (transcript: string, isUser: boolean) => void;
  onConnectionChange?: (connected: boolean) => void;
  onError?: (error: string) => void;
}

export function useRealtimeVoice({
  serverUrl,
  courseCode = 'CMPT120',
  onTranscriptUpdate,
  onConnectionChange,
  onError,
}: UseRealtimeVoiceOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isThinking, setIsThinking] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Play audio from base64
  const playAudio = useCallback(async (base64: string) => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }
    
    try {
      const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
      const audioBuffer = await audioContextRef.current.decodeAudioData(bytes.buffer.slice(0));
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      
      source.onended = () => setIsSpeaking(false);
      source.start();
      setIsSpeaking(true);
    } catch (e) {
      console.error('Audio playback error:', e);
      setIsSpeaking(false);
    }
  }, []);

  // Handle WebSocket messages
  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data);

      switch (data.type) {
        case 'state_change':
          setIsThinking(data.state === 'processing');
          if (data.state === 'speaking') setIsSpeaking(true);
          if (data.state === 'idle') setIsThinking(false);
          break;

        case 'transcript':
          onTranscriptUpdate?.(data.text, data.isUser);
          break;

        case 'audio':
          playAudio(data.audio);
          break;

        case 'error':
          onError?.(data.message);
          setIsThinking(false);
          break;
      }
    } catch (e) {
      console.error('Message error:', e);
    }
  }, [playAudio, onTranscriptUpdate, onError]);

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      audioContextRef.current = new AudioContext();
      const ws = new WebSocket(serverUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        onConnectionChange?.(true);
        ws.send(JSON.stringify({ type: 'start_session', courseCode }));
      };

      ws.onmessage = handleMessage;

      ws.onclose = () => {
        setIsConnected(false);
        setIsListening(false);
        setIsSpeaking(false);
        setIsThinking(false);
        onConnectionChange?.(false);
      };

      ws.onerror = () => onError?.('Connection failed');
    } catch (e) {
      onError?.('Failed to connect');
    }
  }, [serverUrl, courseCode, handleMessage, onConnectionChange, onError]);

  // Disconnect
  const disconnect = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
    streamRef.current?.getTracks().forEach(t => t.stop());
    audioContextRef.current?.close();
    audioContextRef.current = null;
    setIsConnected(false);
    setIsListening(false);
  }, []);

  // Start recording
  const startRecording = useCallback(async () => {
    if (isListening || !wsRef.current) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { echoCancellation: true, noiseSuppression: true } 
      });
      streamRef.current = stream;
      chunksRef.current = [];

      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        if (blob.size > 0 && wsRef.current?.readyState === WebSocket.OPEN) {
          const buffer = await blob.arrayBuffer();
          const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
          wsRef.current.send(JSON.stringify({ type: 'audio', audio: base64 }));
        }
        streamRef.current?.getTracks().forEach(t => t.stop());
      };

      recorder.start(100);
      setIsListening(true);
    } catch (e) {
      onError?.('Microphone access denied');
    }
  }, [isListening, onError]);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setIsListening(false);
  }, []);

  // Send text
  const sendText = useCallback((text: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'text', text }));
    }
  }, []);

  // Clear conversation
  const clearConversation = useCallback(() => {
    wsRef.current?.send(JSON.stringify({ type: 'clear_history' }));
  }, []);

  // Interrupt
  const interrupt = useCallback(() => {
    wsRef.current?.send(JSON.stringify({ type: 'interrupt' }));
    setIsSpeaking(false);
    setIsThinking(false);
  }, []);

  // Cleanup
  useEffect(() => {
    return () => { disconnect(); };
  }, [disconnect]);

  return {
    isConnected,
    isListening,
    isSpeaking,
    isThinking,
    isVadActive: false,
    connect,
    disconnect,
    startRecording,
    stopRecording,
    startVAD: () => {},
    stopVAD: () => {},
    sendText,
    clearConversation,
    interrupt,
  };
}
