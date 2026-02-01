import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
  Mic,
  MicOff,
  MessageSquare,
  Command,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  SkipForward,
  Volume2,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

export interface Character {
  id: string;
  name: string;
  title?: string;
  image?: string;
}

interface LectureSidebarProps {
  messages?: ChatMessage[];
  isOpen?: boolean;
  onToggle?: () => void;
  isListening?: boolean;
  isPlaying?: boolean;
  character?: Character;
}

const KEYBINDS = [
  { key: "Space", description: "Push to talk", icon: Mic },
  { key: "Esc", description: "Stop / Interrupt", icon: MicOff },
  { key: "P", description: "Play / Pause lecture", icon: Play },
  { key: "N", description: "Next section", icon: SkipForward },
];

export function LectureSidebar({
  messages = [],
  isOpen = true,
  onToggle,
  isListening = false,
  isPlaying = false,
  character,
}: LectureSidebarProps) {
  const [activeTab, setActiveTab] = useState<"chat" | "commands">("chat");

  const professorName = character?.name || "AI Tutor";
  const professorTitle = character?.title || "Your Teacher";
  const professorImage = character?.image;

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
              {/* Status Indicators */}
              <div className="flex flex-col items-end gap-0.5">
                {isListening && (
                  <span className="flex items-center gap-1 text-[10px] text-green-500">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                    Listening
                  </span>
                )}
                {isPlaying && (
                  <span className="flex items-center gap-1 text-[10px] text-blue-500">
                    <Volume2 className="h-3 w-3" />
                    Speaking
                  </span>
                )}
              </div>
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
              <ChatTab messages={messages} />
            ) : (
              <CommandsTab />
            )}
          </div>

          {/* Footer - Voice Controls */}
          <div className="border-t border-border px-4 py-3 shrink-0">
            <div className="flex items-center gap-2">
              <Button
                variant={isListening ? "default" : "outline"}
                size="sm"
                className="flex-1 flex items-center gap-2"
              >
                {isListening ? (
                  <>
                    <MicOff className="h-4 w-4" />
                    Stop
                  </>
                ) : (
                  <>
                    <Mic className="h-4 w-4" />
                    Talk to AI
                  </>
                )}
              </Button>
              <Button variant="outline" size="icon" className="shrink-0">
                {isPlaying ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground text-center mt-2">
              Hold <kbd className="px-1 py-0.5 bg-muted text-[10px]">Space</kbd> to talk
            </p>
          </div>
        </>
      )}
    </div>
  );
}

function ChatTab({ messages }: { messages: ChatMessage[] }) {
  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">
              No messages yet
            </p>
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
                message.isUser
                  ? "bg-primary/10 ml-4"
                  : "bg-muted mr-4"
              )}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-medium text-muted-foreground">
                  {message.isUser ? "You" : "AI Tutor"}
                </span>
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
      </div>
    </ScrollArea>
  );
}

function CommandsTab() {
  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        {/* Keybinds Section */}
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

        {/* Quick Actions */}
        <div>
          <h3 className="text-xs font-medium text-muted-foreground mb-2">
            Quick Actions
          </h3>
          <div className="space-y-1">
            <button className="w-full flex items-center gap-3 px-2 py-2 text-sm text-left hover:bg-muted/50 transition-colors">
              <span className="text-base">📝</span>
              <span>Summarize current section</span>
            </button>
            <button className="w-full flex items-center gap-3 px-2 py-2 text-sm text-left hover:bg-muted/50 transition-colors">
              <span className="text-base">❓</span>
              <span>Ask a question</span>
            </button>
            <button className="w-full flex items-center gap-3 px-2 py-2 text-sm text-left hover:bg-muted/50 transition-colors">
              <span className="text-base">🔄</span>
              <span>Repeat last explanation</span>
            </button>
            <button className="w-full flex items-center gap-3 px-2 py-2 text-sm text-left hover:bg-muted/50 transition-colors">
              <span className="text-base">📖</span>
              <span>Give me an example</span>
            </button>
            <button className="w-full flex items-center gap-3 px-2 py-2 text-sm text-left hover:bg-muted/50 transition-colors">
              <span className="text-base">⏭️</span>
              <span>Skip to next topic</span>
            </button>
          </div>
        </div>

        {/* Lecture Progress */}
        <div>
          <h3 className="text-xs font-medium text-muted-foreground mb-2">
            Lecture Status
          </h3>
          <div className="px-2 py-3 bg-muted/30 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">Section 1 of 4</span>
            </div>
            <div className="h-1 bg-muted overflow-hidden">
              <div className="h-full w-1/4 bg-foreground" />
            </div>
            <p className="text-[10px] text-muted-foreground">
              Currently covering: Introduction
            </p>
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}
