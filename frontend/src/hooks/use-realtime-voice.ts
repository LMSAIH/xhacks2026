import { useState, useCallback, useRef, useEffect } from 'react';

interface UseRealtimeVoiceOptions {
  serverUrl: string;
  courseCode?: string;
  voiceId?: string;
  onTranscriptUpdate?: (transcript: string, isUser: boolean) => void;
  onConnectionChange?: (connected: boolean) => void;
  onError?: (error: string) => void;
}

export function useRealtimeVoice({
  serverUrl,
  courseCode = 'CMPT120',
  voiceId,
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
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const audioQueueRef = useRef<string[]>([]);
  const isPlayingRef = useRef(false);
  const vadEnabledRef = useRef(false);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const vadIntervalRef = useRef<number | null>(null);
  const [isVadActive, setIsVadActive] = useState(false);

  // Play audio from base64 - with queue support for sequential playback
  const playAudioFromQueue = useCallback(async () => {
    if (isPlayingRef.current || audioQueueRef.current.length === 0) return;
    
    isPlayingRef.current = true;
    setIsSpeaking(true);
    
    while (audioQueueRef.current.length > 0) {
      const base64 = audioQueueRef.current.shift();
      if (!base64) continue;
      
      try {
        const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
        
        // Use native Audio API for MP3 playback (most reliable)
        const blob = new Blob([bytes], { type: 'audio/mp3' });
        const url = URL.createObjectURL(blob);
        
        const audio = new Audio();
        audio.src = url;
        
        console.log('Playing audio chunk...');
        
        // Wait for audio to finish playing
        await new Promise<void>((resolve) => {
          let timeoutId: ReturnType<typeof setTimeout> | null = null;
          
          const cleanup = () => {
            if (timeoutId) clearTimeout(timeoutId);
            URL.revokeObjectURL(url);
            audio.pause();
            audio.src = '';
          };
          
          const handleEnded = () => {
            cleanup();
            resolve();
          };
          
          const handleError = (e: Event | string) => {
            console.error('Audio playback error:', e);
            cleanup();
            // Resolve anyway to continue with next audio
            resolve();
          };
          
          const handleCanPlay = () => {
            audio.play().catch((err) => {
              console.error('Audio play() failed:', err);
              handleError(err);
            });
          };
          
          audio.addEventListener('ended', handleEnded, { once: true });
          audio.addEventListener('error', handleError, { once: true });
          audio.addEventListener('canplay', handleCanPlay, { once: true });
          
          // Set timeout in case audio never loads
          timeoutId = setTimeout(() => {
            console.warn('Audio load timeout, skipping...');
            cleanup();
            resolve();
          }, 5000);
          
          // Try to load
          audio.load();
        });
      } catch (e) {
        console.error('Audio queue processing error:', e);
      }
    }
    
    isPlayingRef.current = false;
    setIsSpeaking(false);
  }, []);

  // Queue audio and start playing
  const playAudio = useCallback(async (base64: string) => {
    audioQueueRef.current.push(base64);
    playAudioFromQueue();
  }, [playAudioFromQueue]);

  // Handle WebSocket messages - v2 protocol with streaming support
  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data);

      switch (data.type) {
        case 'state_change':
          setIsThinking(data.state === 'processing');
          if (data.state === 'speaking') setIsSpeaking(true);
          if (data.state === 'idle') {
            setIsThinking(false);
            setIsSpeaking(false);
          }
          break;

        case 'transcript':
          onTranscriptUpdate?.(data.text, data.isUser);
          break;

        case 'transcript_partial':
          onTranscriptUpdate?.(data.text, true);
          break;

        case 'audio':
          playAudio(data.audio);
          break;

        case 'audio_chunk':
          playAudio(data.audio);
          break;

        case 'audio_complete':
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

  // Connect to WebSocket with optional warmup for lower latency
  const connect = useCallback((warmup = false) => {
    if (wsRef.current?.readyState === WebSocket.OPEN && !warmup) return;

    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext({ sampleRate: 48000 });
    }

    const ws = new WebSocket(serverUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      if (!warmup) {
        setIsConnected(true);
        onConnectionChange?.(true);
        ws.send(JSON.stringify({ 
          type: 'start_session', 
          courseCode,
          voice: voiceId 
        }));
      }
    };

    ws.onmessage = handleMessage;

    ws.onclose = () => {
      if (!warmup) {
        setIsConnected(false);
        setIsListening(false);
        setIsSpeaking(false);
        setIsThinking(false);
        onConnectionChange?.(false);
      }
    };

    ws.onerror = () => {
      if (!warmup) onError?.('Connection failed');
    };
  }, [serverUrl, courseCode, voiceId, handleMessage, onConnectionChange, onError]);

  // Warmup connection on mount for lower first-request latency
  useEffect(() => {
    connect(true);
  }, [connect]);

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

  // Start recording with optional VAD
  const startRecording = useCallback(async () => {
    if (isListening || !wsRef.current) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { echoCancellation: true, noiseSuppression: true } 
      });
      streamRef.current = stream;
      chunksRef.current = [];

      // Set up VAD if enabled
      if (vadEnabledRef.current && !analyserRef.current) {
        audioContextRef.current = audioContextRef.current || new AudioContext({ sampleRate: 48000 });
        analyserRef.current = audioContextRef.current.createAnalyser();
        const source = audioContextRef.current.createMediaStreamSource(stream);
        source.connect(analyserRef.current);
        analyserRef.current.fftSize = 256;
      }

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
        if (!vadEnabledRef.current) {
          streamRef.current?.getTracks().forEach(t => t.stop());
        }
      };

      recorder.start(40); // Reduced from 100ms to 40ms for lower latency
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

  // Interrupt with audio stop
  const interrupt = useCallback(() => {
    wsRef.current?.send(JSON.stringify({ type: 'interrupt' }));
    if (currentSourceRef.current) {
      try {
        currentSourceRef.current.stop();
      } catch (e) {
        // Ignore
      }
      currentSourceRef.current = null;
    }
    audioQueueRef.current = [];
    isPlayingRef.current = false;
    setIsSpeaking(false);
    setIsThinking(false);
  }, []);

  // VAD: Start hands-free mode with automatic voice detection
  const startVAD = useCallback(async () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext({ sampleRate: 48000 });
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { echoCancellation: true, noiseSuppression: true } 
      });
      streamRef.current = stream;

      const analyser = audioContextRef.current.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.8;
      analyserRef.current = analyser;

      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyser);

      vadEnabledRef.current = true;
      setIsVadActive(true);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      let silenceCounter = 0;
      const SILENCE_THRESHOLD = 30;
      const SPEECH_THRESHOLD = 40;
      const MAX_SILENCE_FRAMES = 30;

      const checkVAD = () => {
        if (!vadEnabledRef.current || !analyserRef.current) return;

        analyserRef.current.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;

        if (average > SPEECH_THRESHOLD) {
          // Voice detected - start recording if not already
          if (!isListening && !isSpeaking) {
            silenceCounter = 0;
            startRecording();
          } else {
            silenceCounter = 0;
          }
        } else if (average < SILENCE_THRESHOLD && isListening) {
          // Silence - increment counter
          silenceCounter++;
          if (silenceCounter > MAX_SILENCE_FRAMES) {
            // End of speech
            stopRecording();
            silenceCounter = 0;
          }
        }

        vadIntervalRef.current = requestAnimationFrame(checkVAD);
      };

      checkVAD();
    } catch (e) {
      console.error('VAD start error:', e);
      onError?.('Failed to start voice detection');
      vadEnabledRef.current = false;
      setIsVadActive(false);
    }
  }, [isListening, isSpeaking, startRecording, stopRecording, onError]);

  // VAD: Stop hands-free mode
  const stopVAD = useCallback(() => {
    vadEnabledRef.current = false;
    setIsVadActive(false);

    if (vadIntervalRef.current) {
      cancelAnimationFrame(vadIntervalRef.current);
      vadIntervalRef.current = null;
    }

    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setIsListening(false);

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }

    analyserRef.current = null;
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
    isVadActive,
    connect,
    disconnect,
    startRecording,
    stopRecording,
    startVAD,
    stopVAD,
    sendText,
    clearConversation,
    interrupt,
  };
}
