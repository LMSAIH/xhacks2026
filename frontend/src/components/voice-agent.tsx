import { useState, useCallback, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useRealtimeVoice } from '@/hooks/use-realtime-voice';
import { VoiceVisualizer } from '@/components/voice-visualizer';
import { TranscriptDisplay } from '@/components/transcript-display';
import { ControlButtons } from '@/components/control-buttons';
import { StatusIndicator } from '@/components/status-indicator';
import { Card } from '@/components/ui/card';
import { Settings, Sparkles, Loader2, ArrowLeft, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface TranscriptMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

// Backend URL - points to the /api/voice/:courseCode endpoint
const BACKEND_BASE = import.meta.env.VITE_BACKEND_URL || 'ws://localhost:8787';

export function VoiceAgent() {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get topic and voice from navigation state or default
  const topicState = location.state as { 
    topic?: string; 
    context?: string; 
    prerequisites?: string;
    voice?: { id: string; name: string };
    character?: { id: string; name: string };
    outline?: Array<{
      id: string;
      number: string;
      title: string;
      description?: string;
      duration?: string;
      children?: any[];
    }>;
    outlineId?: string;
  } | null;
  const topic = topicState?.topic || 'General Learning';
  const topicContext = topicState?.context || '';
  const selectedVoice = topicState?.voice;
  const selectedCharacter = topicState?.character;
  const outline = topicState?.outline;
  
  // Create a simple course code from the topic
  const courseCode = topic.split(':')[0].replace(/\s+/g, '').toUpperCase().slice(0, 10) || 'GENERAL';

  const [messages, setMessages] = useState<TranscriptMessage[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const transcriptRef = useRef<HTMLDivElement>(null);

  // Build WebSocket URL with course code
  const wsUrl = `${BACKEND_BASE}/api/voice/${courseCode}`;

  const handleTranscriptUpdate = useCallback((transcript: string, isUser: boolean) => {
    // Add to messages immediately
    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        text: transcript,
        isUser,
        timestamp: new Date(),
      },
    ]);
  }, []);

  const handleConnectionChange = useCallback((connected: boolean) => {
    if (connected) {
      setError(null);
      setMessages([]);
    }
  }, []);

  const handleError = useCallback((errorMsg: string) => {
    setError(errorMsg);
  }, []);

  const { 
    isConnected, 
    isListening, 
    isSpeaking, 
    isThinking,
    isVadActive,
    connect, 
    disconnect,
    startRecording,
    stopRecording,
    clearConversation,
    interrupt,
  } = useRealtimeVoice({
    serverUrl: wsUrl,
    courseCode: courseCode,
    voiceId: selectedVoice?.id,
    onTranscriptUpdate: handleTranscriptUpdate,
    onConnectionChange: handleConnectionChange,
    onError: handleError,
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [messages]);

  const handleToggleMute = useCallback(() => {
    setIsMuted((prev) => !prev);
  }, []);

  const handleClear = useCallback(() => {
    setMessages([]);
    clearConversation();
  }, [clearConversation]);

  const handleInterrupt = useCallback(() => {
    interrupt();
  }, [interrupt]);

  const handleGoToEditor = useCallback(() => {
    navigate('/editor', {
      state: {
        topic,
        transcript: messages,
        sections: outline,
      },
    });
  }, [navigate, topic, messages, outline]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-purple-950/20 flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-border/50 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          {/* Back button */}
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg hover:bg-secondary transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-lg shadow-primary/30">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight font-[family-name:var(--font-display)] line-clamp-1">
                {topic}
              </h1>
              <p className="text-xs text-muted-foreground">AI Voice Tutor</p>
            </div>
          </div>
        </div>
        
        {/* Status & Settings */}
        <div className="flex items-center gap-4">
          {messages.length > 0 && (
            <Button
              variant="default"
              size="sm"
              onClick={handleGoToEditor}
              className="flex items-center gap-2 bg-primary/90 hover:bg-primary"
            >
              <BookOpen className="w-4 h-4" />
              <span className="hidden sm:inline">Take Notes</span>
            </Button>
          )}
          <StatusIndicator
            isConnected={isConnected}
            isListening={isListening}
            isSpeaking={isSpeaking}
          />
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            onClick={() => setShowSettings(!showSettings)}
          >
            <Settings className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* Error Banner */}
      {error && (
        <div className="mx-6 mt-4 p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm animate-in fade-in slide-in-from-top-2">
          <p className="font-medium">Connection Error</p>
          <p className="text-destructive/80 mt-1">{error}</p>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col lg:flex-row gap-6 p-6 overflow-hidden">
        {/* Voice Visualizer Section */}
        <Card className={cn(
          'flex-1 flex flex-col items-center justify-center p-8 bg-card/50 backdrop-blur-sm border-border/50',
          'min-h-[400px] lg:min-h-0'
        )}>
          <div className="w-full max-w-md aspect-square relative">
            <VoiceVisualizer
              isActive={isConnected}
              isSpeaking={isSpeaking}
              isListening={isListening}
            />
            
            {/* Center status text */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                {!isConnected && (
                  <p className="text-muted-foreground text-sm animate-pulse">
                    Tap to start
                  </p>
                )}
                {isThinking && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Thinking...</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Controls */}
          <ControlButtons
            isConnected={isConnected}
            isListening={isListening}
            isMuted={isMuted}
            isSpeaking={isSpeaking}
            isThinking={isThinking}
            onConnect={connect}
            onDisconnect={disconnect}
            onStartRecording={startRecording}
            onStopRecording={stopRecording}
            onToggleMute={handleToggleMute}
            onClear={handleClear}
            onInterrupt={handleInterrupt}
            className="mt-8"
          />

          {/* Hint text */}
          <p className="text-xs text-muted-foreground mt-6 text-center max-w-xs">
            {isConnected
              ? isVadActive
                ? 'Hands-free mode active — just speak naturally'
                : 'Hold the mic button and speak — release when done'
              : 'Press the call button to start a conversation'}
          </p>
          
          {/* VAD status indicator */}
          {isConnected && isVadActive && (
            <div className="mt-2 flex items-center gap-2 text-xs text-green-500">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              Listening for speech...
            </div>
          )}
        </Card>

        {/* Transcript Section */}
        <Card className={cn(
          'w-full lg:w-96 flex flex-col bg-card/50 backdrop-blur-sm border-border/50',
          'max-h-[300px] lg:max-h-none'
        )}>
          <div className="px-4 py-3 border-b border-border/50">
            <h2 className="text-sm font-medium">Conversation</h2>
            <p className="text-xs text-muted-foreground">
              {messages.length === 0 ? 'Start talking to see the transcript' : `${messages.length} messages`}
            </p>
          </div>
          
          <div ref={transcriptRef} className="flex-1 overflow-y-auto p-4">
            {messages.length === 0 ? (
              <div className="h-full flex items-center justify-center text-center">
                <div className="space-y-2">
                  <div className="w-12 h-12 rounded-full bg-muted/50 mx-auto flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Your conversation will<br />appear here
                  </p>
                </div>
              </div>
            ) : (
              <TranscriptDisplay
                messages={messages}
                currentTranscript=""
                isUserSpeaking={false}
              />
            )}
          </div>
        </Card>
      </main>

      {/* Settings Panel (slide in) */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 z-50 animate-in fade-in" onClick={() => setShowSettings(false)}>
          <Card
            className="absolute right-0 top-0 h-full w-80 rounded-none border-l animate-in slide-in-from-right"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <h2 className="text-lg font-semibold mb-4 font-[family-name:var(--font-display)]">Settings</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Current Topic
                  </label>
                  <p className="mt-1 text-sm font-medium">{topic}</p>
                  {topicContext && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-3">{topicContext}</p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    WebSocket URL
                  </label>
                  <input
                    type="text"
                    className="mt-1 w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm font-mono"
                    value={wsUrl}
                    disabled
                  />
                </div>
                
                <div className="pt-4 border-t border-border">
                  <h3 className="text-sm font-medium mb-2">AI Stack (Cloudflare)</h3>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• STT: Whisper (OpenAI)</li>
                    <li>• LLM: Llama 3.1 8B Instruct</li>
                    <li>• TTS: MeloTTS</li>
                  </ul>
                </div>
                
                <div className="pt-4 border-t border-border">
                  <h3 className="text-sm font-medium mb-2">Voice Mode</h3>
                  <p className="text-xs text-muted-foreground">
                    {isVadActive ? 'Hands-free (auto-detect speech)' : 'Push-to-talk'}
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
