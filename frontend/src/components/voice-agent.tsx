import { useState, useCallback, useRef, useEffect } from 'react';
import { useRealtimeVoice } from '@/hooks/use-realtime-voice';
import { VoiceVisualizer } from '@/components/voice-visualizer';
import { TranscriptDisplay } from '@/components/transcript-display';
import { ControlButtons } from '@/components/control-buttons';
import { StatusIndicator } from '@/components/status-indicator';
import { Card } from '@/components/ui/card';
import { Settings, Sparkles, Loader2, BookOpen } from 'lucide-react';
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

// Sample courses for demo
const COURSES = [
  { code: 'CMPT120', name: 'Introduction to Computing Science' },
  { code: 'CMPT125', name: 'Introduction to Computing Science II' },
  { code: 'CMPT225', name: 'Data Structures and Programming' },
  { code: 'CMPT276', name: 'Introduction to Software Engineering' },
  { code: 'CMPT310', name: 'Introduction to Artificial Intelligence' },
];

export function VoiceAgent() {
  const [messages, setMessages] = useState<TranscriptMessage[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(COURSES[0]);
  const transcriptRef = useRef<HTMLDivElement>(null);

  // Build WebSocket URL with course code
  const wsUrl = `${BACKEND_BASE}/api/voice/${selectedCourse.code}`;

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
    courseCode: selectedCourse.code,
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-purple-950/20 flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-border/50 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-lg shadow-primary/30">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight">SFU AI Teacher</h1>
            <p className="text-xs text-muted-foreground">Your AI tutor for SFU courses</p>
          </div>
        </div>
        
        {/* Course Selector */}
        <div className="flex items-center gap-4">
          <select
            value={selectedCourse.code}
            onChange={(e) => {
              const course = COURSES.find(c => c.code === e.target.value);
              if (course && !isConnected) {
                setSelectedCourse(course);
                setMessages([]);
              }
            }}
            disabled={isConnected}
            className="px-3 py-1.5 rounded-lg bg-secondary border border-border text-sm disabled:opacity-50"
          >
            {COURSES.map(course => (
              <option key={course.code} value={course.code}>
                {course.code} - {course.name}
              </option>
            ))}
          </select>
          
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
              <h2 className="text-lg font-semibold mb-4">Settings</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Current Course
                  </label>
                  <p className="mt-1 text-sm font-medium">{selectedCourse.code}</p>
                  <p className="text-xs text-muted-foreground">{selectedCourse.name}</p>
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
                    <li>• LLM: Llama 3.2 3B Instruct</li>
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
