import { cn } from '@/lib/utils';

interface TranscriptMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

interface TranscriptDisplayProps {
  messages: TranscriptMessage[];
  currentTranscript: string;
  isUserSpeaking: boolean;
  className?: string;
}

export function TranscriptDisplay({
  messages,
  currentTranscript,
  isUserSpeaking,
  className,
}: TranscriptDisplayProps) {
  return (
    <div className={cn('flex flex-col gap-3 overflow-y-auto', className)}>
      {messages.map((message) => (
        <div
          key={message.id}
          className={cn(
            'max-w-[85%] rounded-2xl px-4 py-3 text-sm animate-in fade-in slide-in-from-bottom-2 duration-300',
            message.isUser
              ? 'self-end bg-primary text-primary-foreground'
              : 'self-start bg-secondary text-secondary-foreground'
          )}
        >
          <p className="leading-relaxed">{message.text}</p>
          <span className="text-[10px] opacity-60 mt-1 block">
            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      ))}
      
      {/* Live transcript indicator */}
      {currentTranscript && (
        <div
          className={cn(
            'max-w-[85%] rounded-2xl px-4 py-3 text-sm animate-pulse',
            isUserSpeaking
              ? 'self-end bg-primary/60 text-primary-foreground'
              : 'self-start bg-secondary/60 text-secondary-foreground'
          )}
        >
          <p className="leading-relaxed">{currentTranscript}</p>
          <span className="inline-flex gap-1 mt-1">
            <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce [animation-delay:-0.3s]" />
            <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce [animation-delay:-0.15s]" />
            <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" />
          </span>
        </div>
      )}
    </div>
  );
}
