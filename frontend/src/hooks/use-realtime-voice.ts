import { useState, useCallback, useRef, useEffect } from 'react';

// Server message types from Cloudflare backend
type ServerMessage =
  | { type: 'ready' }
  | { type: 'thinking' }
  | { type: 'speaking' }
  | { type: 'transcript'; text: string; isPartial: boolean; isUser: boolean }
  | { type: 'audio'; audio: string; format: string; sampleRate: number }
  | { type: 'audio_complete' }
  | { type: 'cleared' }
  | { type: 'error'; message: string };

interface UseRealtimeVoiceOptions {
  serverUrl: string;
  onTranscriptUpdate?: (transcript: string, isUser: boolean) => void;
  onConnectionChange?: (connected: boolean) => void;
  onError?: (error: string) => void;
}

export function useRealtimeVoice({
  serverUrl,
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
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioQueueRef = useRef<Float32Array[]>([]);
  const isPlayingRef = useRef(false);
  const silenceTimeoutRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Convert base64 PCM16 to Float32Array for playback
  const base64ToFloat32Array = useCallback((base64: string): Float32Array => {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    const int16Array = new Int16Array(bytes.buffer);
    const float32Array = new Float32Array(int16Array.length);
    
    for (let i = 0; i < int16Array.length; i++) {
      float32Array[i] = int16Array[i] / 32768;
    }
    
    return float32Array;
  }, []);

  // Play audio from queue
  const playAudioQueue = useCallback(async () => {
    if (isPlayingRef.current || audioQueueRef.current.length === 0) return;
    
    isPlayingRef.current = true;
    setIsSpeaking(true);

    while (audioQueueRef.current.length > 0) {
      const audioData = audioQueueRef.current.shift();
      if (!audioData || !audioContextRef.current) continue;

      try {
        const audioBuffer = audioContextRef.current.createBuffer(1, audioData.length, 24000);
        audioBuffer.getChannelData(0).set(audioData);

        const source = audioContextRef.current.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContextRef.current.destination);
        
        await new Promise<void>((resolve) => {
          source.onended = () => resolve();
          source.start();
        });
      } catch (e) {
        console.error('Error playing audio chunk:', e);
      }
    }

    isPlayingRef.current = false;
    setIsSpeaking(false);
  }, []);

  // Handle incoming WebSocket messages
  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const data: ServerMessage = JSON.parse(event.data as string);
      
      switch (data.type) {
        case 'ready':
          console.log('Server ready');
          break;
          
        case 'thinking':
          setIsThinking(true);
          setIsSpeaking(false);
          break;
          
        case 'speaking':
          setIsThinking(false);
          setIsSpeaking(true);
          break;
          
        case 'transcript':
          onTranscriptUpdate?.(data.text, data.isUser);
          break;
          
        case 'audio': {
          const pcmData = base64ToFloat32Array(data.audio);
          audioQueueRef.current.push(pcmData);
          playAudioQueue();
          break;
        }
        
        case 'audio_complete':
          setIsThinking(false);
          // Audio playback will set isSpeaking to false when done
          break;
          
        case 'cleared':
          console.log('Conversation cleared');
          break;
          
        case 'error':
          console.error('Server error:', data.message);
          onError?.(data.message);
          setIsThinking(false);
          setIsSpeaking(false);
          break;
      }
    } catch (e) {
      console.error('Error parsing message:', e);
    }
  }, [base64ToFloat32Array, playAudioQueue, onTranscriptUpdate, onError]);

  // Voice activity detection using analyser
  const detectSilence = useCallback(() => {
    if (!analyserRef.current || !isListening) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    
    // Calculate average volume
    const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
    
    // If volume is very low, start silence timer
    if (average < 10) {
      if (!silenceTimeoutRef.current) {
        silenceTimeoutRef.current = window.setTimeout(() => {
          // User stopped speaking - send the audio
          stopRecording();
        }, 1500); // 1.5 seconds of silence
      }
    } else {
      // Voice detected, reset silence timer
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
        silenceTimeoutRef.current = null;
      }
    }

    animationFrameRef.current = requestAnimationFrame(detectSilence);
  }, [isListening]);

  // Stop recording and send audio
  const stopRecording = useCallback(async () => {
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    
    setIsListening(false);
  }, []);

  // Start recording
  const startRecording = useCallback(async () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    if (isListening || isSpeaking || isThinking) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      });
      
      mediaStreamRef.current = stream;
      audioChunksRef.current = [];

      // Set up analyser for VAD
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }
      
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);

      // Use MediaRecorder to capture audio as webm
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });
      
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Combine all chunks and send to server
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        
        if (audioBlob.size > 0 && wsRef.current?.readyState === WebSocket.OPEN) {
          const arrayBuffer = await audioBlob.arrayBuffer();
          const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
          
          wsRef.current.send(JSON.stringify({
            type: 'audio',
            audio: base64,
          }));
        }

        // Clean up
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach(track => track.stop());
          mediaStreamRef.current = null;
        }
        audioChunksRef.current = [];
      };

      mediaRecorder.start(100); // Collect data every 100ms
      setIsListening(true);

      // Start voice activity detection
      detectSilence();
      
    } catch (error) {
      console.error('Error accessing microphone:', error);
      onError?.('Failed to access microphone. Please allow microphone access.');
    }
  }, [isListening, isSpeaking, isThinking, detectSilence, onError]);

  // Send text message directly (for testing)
  const sendText = useCallback((text: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'text',
        text,
      }));
    }
  }, []);

  // Clear conversation
  const clearConversation = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'clear' }));
    }
  }, []);

  // Connect to WebSocket server
  const connect = useCallback(async () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      // Initialize audio context
      audioContextRef.current = new AudioContext({ sampleRate: 24000 });
      
      const ws = new WebSocket(serverUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('Connected to Cloudflare voice server');
        setIsConnected(true);
        onConnectionChange?.(true);
      };

      ws.onmessage = handleMessage;

      ws.onclose = () => {
        console.log('Disconnected from voice server');
        setIsConnected(false);
        setIsListening(false);
        setIsSpeaking(false);
        setIsThinking(false);
        onConnectionChange?.(false);
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        onError?.('Connection error. Make sure the backend is running.');
      };
    } catch (error) {
      console.error('Failed to connect:', error);
      onError?.('Failed to establish connection');
    }
  }, [serverUrl, handleMessage, onConnectionChange, onError]);

  // Disconnect from WebSocket server
  const disconnect = useCallback(() => {
    stopRecording();
    
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
    setIsListening(false);
    setIsSpeaking(false);
    setIsThinking(false);
  }, [stopRecording]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    isConnected,
    isListening,
    isSpeaking,
    isThinking,
    connect,
    disconnect,
    startRecording,
    stopRecording,
    sendText,
    clearConversation,
  };
}
