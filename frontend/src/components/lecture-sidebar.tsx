import { useState, useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Mic,
  MicOff,
  MessageSquare,
  Command,
  ChevronLeft,
  ChevronRight,
  Pause,
  Volume2,
  Send,
  Loader2,
  Circle,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEditorChat, type CommandResult } from "@/hooks/use-editor-chat";

export interface Character {
  id: string;
  name: string;
  title?: string;
  image?: string;
  voice?: string;
  personality?: string;
}

interface LectureSidebarProps {
  isOpen?: boolean;
  onToggle?: () => void;
  character?: Character;
  topic?: string;
  sectionTitle?: string;
  // For voice slash commands
  getNotesContent?: () => string;
  onCommand?: (result: CommandResult) => void;
}

const KEYBINDS = [
  { key: "Space", description: "Hold to talk", icon: Mic },
  { key: "Esc", description: "Stop audio", icon: MicOff },
  { key: "Enter", description: "Send message", icon: Send },
];

export function LectureSidebar({
  isOpen = true,
  onToggle,
  character,
  topic = "Learning Session",
  sectionTitle = "Introduction",
  getNotesContent,
  onCommand,
}: LectureSidebarProps) {
  const [activeTab, setActiveTab] = useState<"chat" | "commands">("chat");
  const [textInput, setTextInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevSectionRef = useRef(sectionTitle);

  const {
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
  } = useEditorChat({
    onCommand,
    getNotesContent,
  });

  const professorName = character?.name || "AI Tutor";
  const professorTitle = character?.title || "Your Teacher";
  const professorImage = character?.image;

  // Initialize on mount
  useEffect(() => {
    init({
      voice: character?.voice,
      professorName: character?.name,
      professorPersonality: character?.personality || "helpful, patient, and encouraging",
      topic,
      sectionTitle,
    });
  }, []); // Only on mount

  // Update section when it changes
  useEffect(() => {
    if (isReady && sectionTitle !== prevSectionRef.current) {
      prevSectionRef.current = sectionTitle;
      updateSection(sectionTitle);
    }
  }, [sectionTitle, isReady, updateSection]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.code === "Space" && !e.repeat && voiceState === 'idle' && isReady) {
        e.preventDefault();
        startRecording();
      }

      if (e.code === "Escape") {
        e.preventDefault();
        if (voiceState === 'playing') {
          stopAudio();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.code === "Space" && voiceState === 'recording') {
        e.preventDefault();
        stopRecording();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [voiceState, isReady, startRecording, stopRecording, stopAudio]);

  const handleSendText = () => {
    if (textInput.trim() && isReady && voiceState === 'idle') {
      sendMessage(textInput.trim());
      setTextInput("");
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendText();
    }
  };

  const getStatusInfo = () => {
    switch (voiceState) {
      case 'recording':
        return { text: 'Recording...', color: 'text-red-500', pulse: true };
      case 'processing':
        return { text: 'Thinking...', color: 'text-yellow-500', pulse: true };
      case 'playing':
        return { text: 'Speaking', color: 'text-blue-500', pulse: true };
      case 'error':
        return { text: 'Error', color: 'text-red-500', pulse: false };
      default:
        return { text: isReady ? 'Ready' : 'Connecting...', color: 'text-muted-foreground', pulse: !isReady };
    }
  };

  const status = getStatusInfo();

  return (
    <div
      className={cn(
        "h-full border-l border-border bg-background flex flex-col transition-all duration-200",
        isOpen ? "w-80" : "w-0"
      )}
    >
      {/* Toggle Button */}
      <button
        onClick={onToggle}
        className={cn(
          "absolute top-1/2 -translate-y-1/2 -left-3 z-10 p-1 bg-background border border-border hover:bg-accent transition-colors",
          !isOpen && "-left-6"
        )}
      >
        {isOpen ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <ChevronLeft className="h-4 w-4" />
        )}
      </button>

      {isOpen && (
        <>
          {/* Header - Professor Info */}
          <div className="border-b border-border px-4 py-3 shrink-0">
            <div className="flex items-center gap-3 mb-3">
              {/* Professor Avatar */}
              <div className="shrink-0">
                {professorImage ? (
                  <img
                    src={professorImage}
                    alt={professorName}
                    className="w-10 h-10 object-cover bg-muted"
                  />
                ) : (
                  <div className="w-10 h-10 bg-muted flex items-center justify-center text-muted-foreground text-sm font-medium">
                    {professorName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              {/* Professor Name & Status */}
              <div className="flex-1 min-w-0">
                <h2 className="text-sm font-semibold truncate">{professorName}</h2>
                <p className="text-xs text-muted-foreground truncate">{professorTitle}</p>
              </div>
              {/* Status Indicator */}
              <span className={cn("flex items-center gap-1 text-[10px]", status.color)}>
                <Circle className={cn("h-2 w-2 fill-current", status.pulse && "animate-pulse")} />
                {status.text}
              </span>
            </div>

            {/* Tabs */}
            <div className="flex gap-1">
              <button
                onClick={() => setActiveTab("chat")}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors",
                  activeTab === "chat"
                    ? "bg-foreground text-background"
                    : "bg-muted text-muted-foreground hover:bg-accent"
                )}
              >
                <MessageSquare className="h-3 w-3" />
                Chat
              </button>
              <button
                onClick={() => setActiveTab("commands")}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors",
                  activeTab === "commands"
                    ? "bg-foreground text-background"
                    : "bg-muted text-muted-foreground hover:bg-accent"
                )}
              >
                <Command className="h-3 w-3" />
                Commands
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden">
            {activeTab === "chat" ? (
              <ScrollArea className="h-full" ref={scrollRef}>
                <div className="p-4 space-y-3">
                  {error && (
                    <div className="text-center py-2 px-3 bg-red-500/10 border border-red-500/20 rounded">
                      <p className="text-xs text-red-500">{error}</p>
                    </div>
                  )}
                  
                  {messages.length === 0 ? (
                    <div className="text-center py-12">
                      <MessageSquare className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                      <p className="text-xs text-muted-foreground">No messages yet</p>
                      <p className="text-[10px] text-muted-foreground/60 mt-1">
                        Start talking to your AI tutor
                      </p>
                    </div>
                  ) : (
                    messages.map((message) => (
                      <div
                        key={message.id}
                        className={cn(
                          "text-sm p-2.5",
                          message.isUser ? "bg-primary/10 ml-4" : "bg-muted mr-4",
                          message.isCommand && !message.isUser && "border-l-2 border-primary"
                        )}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-medium text-muted-foreground">
                            {message.isUser ? "You" : professorName}
                          </span>
                          {message.isCommand && (
                            <span className="text-[10px] bg-primary/20 text-primary px-1 py-0.5 rounded flex items-center gap-1">
                              <Sparkles className="h-2 w-2" />
                              {message.commandType}
                            </span>
                          )}
                          <span className="text-[10px] text-muted-foreground/60">
                            {message.timestamp.toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <p className="text-sm leading-relaxed">{message.text}</p>
                      </div>
                    ))
                  )}
                  
                  {/* Live transcription while recording */}
                  {voiceState === 'recording' && liveTranscript && (
                    <div className="text-sm p-2.5 bg-primary/10 ml-4 border border-primary/20 animate-pulse">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-medium text-muted-foreground">You</span>
                        <Loader2 className="h-3 w-3 animate-spin text-primary" />
                        <span className="text-[10px] text-primary">listening...</span>
                      </div>
                      <p className="text-sm leading-relaxed italic">{liveTranscript}</p>
                    </div>
                  )}
                  
                  {/* Show recording indicator even without transcript */}
                  {voiceState === 'recording' && !liveTranscript && (
                    <div className="text-sm p-2.5 bg-primary/10 ml-4 border border-primary/20 animate-pulse">
                      <div className="flex items-center gap-2">
                        <Mic className="h-4 w-4 text-primary animate-pulse" />
                        <span className="text-xs text-primary">Listening...</span>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            ) : (
              <ScrollArea className="h-full">
                <div className="p-4 space-y-4">
                  <div>
                    <h3 className="text-xs font-medium text-muted-foreground mb-2">
                      Keyboard Shortcuts
                    </h3>
                    <div className="space-y-1">
                      {KEYBINDS.map((bind) => (
                        <div
                          key={bind.key}
                          className="flex items-center gap-3 px-2 py-2 hover:bg-muted/50 transition-colors"
                        >
                          <bind.icon className="h-4 w-4 text-muted-foreground" />
                          <span className="flex-1 text-sm">{bind.description}</span>
                          <kbd className="px-1.5 py-0.5 bg-muted text-xs font-mono">
                            {bind.key}
                          </kbd>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs font-medium text-muted-foreground mb-2">
                      Quick Actions
                    </h3>
                    <div className="space-y-1">
                      <button 
                        onClick={() => clearHistory()}
                        className="w-full flex items-center gap-3 px-2 py-2 text-sm text-left hover:bg-muted/50 transition-colors"
                      >
                        <span className="text-base">🗑️</span>
                        <span>Clear chat history</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                      <Sparkles className="h-3 w-3" />
                      Voice Commands
                    </h3>
                    <div className="space-y-1 text-xs">
                      <div className="px-2 py-1.5 bg-muted/30 rounded">
                        <kbd className="font-mono text-primary">"slash critique"</kbd>
                        <p className="text-muted-foreground mt-0.5">Review your notes with suggestions</p>
                      </div>
                      <div className="px-2 py-1.5 bg-muted/30 rounded">
                        <kbd className="font-mono text-primary">"slash explain [topic]"</kbd>
                        <p className="text-muted-foreground mt-0.5">Get an explanation added to notes</p>
                      </div>
                      <div className="px-2 py-1.5 bg-muted/30 rounded">
                        <kbd className="font-mono text-primary">"slash ask [question]"</kbd>
                        <p className="text-muted-foreground mt-0.5">Ask a question, answer in notes</p>
                      </div>
                      <div className="px-2 py-1.5 bg-muted/30 rounded">
                        <kbd className="font-mono text-primary">"slash formulas [topic]"</kbd>
                        <p className="text-muted-foreground mt-0.5">Get formulas added to notes</p>
                      </div>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-2 px-2">
                      Say "slash" followed by a command while recording
                    </p>
                  </div>

                  <div>
                    <h3 className="text-xs font-medium text-muted-foreground mb-2">
                      Current Section
                    </h3>
                    <div className="px-2 py-3 bg-muted/30 space-y-2">
                      <p className="text-sm font-medium">{sectionTitle}</p>
                      <p className="text-[10px] text-muted-foreground">
                        AI tutor is focused on this section
                      </p>
                    </div>
                  </div>
                </div>
              </ScrollArea>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-border px-4 py-3 shrink-0 space-y-2">
            {/* Text Input */}
            <div className="flex items-center gap-2">
              <Input
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyDown={handleInputKeyDown}
                placeholder="Type a message..."
                className="flex-1 h-8 text-sm"
                disabled={!isReady || voiceState !== 'idle'}
              />
              <Button
                variant="outline"
                size="icon"
                className="shrink-0 h-8 w-8"
                onClick={handleSendText}
                disabled={!textInput.trim() || !isReady || voiceState !== 'idle'}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>

            {/* Voice Controls */}
            <div className="flex items-center gap-2">
              <Button
                variant={voiceState === 'recording' ? "destructive" : "outline"}
                size="sm"
                className="flex-1 flex items-center gap-2"
                onMouseDown={() => {
                  if (voiceState === 'idle' && isReady) startRecording();
                }}
                onMouseUp={() => {
                  if (voiceState === 'recording') stopRecording();
                }}
                onMouseLeave={() => {
                  if (voiceState === 'recording') stopRecording();
                }}
                disabled={!isReady || (voiceState !== 'idle' && voiceState !== 'recording')}
              >
                {voiceState === 'recording' ? (
                  <>
                    <Mic className="h-4 w-4 animate-pulse" />
                    Recording...
                  </>
                ) : voiceState === 'processing' ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : voiceState === 'playing' ? (
                  <>
                    <Volume2 className="h-4 w-4 animate-pulse" />
                    Playing...
                  </>
                ) : (
                  <>
                    <Mic className="h-4 w-4" />
                    Hold to Talk
                  </>
                )}
              </Button>
              {voiceState === 'playing' && (
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="shrink-0"
                  onClick={stopAudio}
                >
                  <Pause className="h-4 w-4" />
                </Button>
              )}
            </div>
            
            <p className="text-[10px] text-muted-foreground text-center">
              Hold <kbd className="px-1 py-0.5 bg-muted text-[10px]">Space</kbd> to talk
            </p>
          </div>
        </>
      )}
    </div>
  );
}
