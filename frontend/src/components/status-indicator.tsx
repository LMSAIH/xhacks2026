import { cn } from '@/lib/utils';
import { Wifi, WifiOff, Ear, Volume2 } from 'lucide-react';

interface StatusIndicatorProps {
  isConnected: boolean;
  isListening: boolean;
  isSpeaking: boolean;
  className?: string;
}

export function StatusIndicator({
  isConnected,
  isListening,
  isSpeaking,
  className,
}: StatusIndicatorProps) {
  const getStatus = () => {
    if (!isConnected) return { text: 'Disconnected', icon: WifiOff, color: 'text-muted-foreground' };
    if (isSpeaking) return { text: 'Speaking...', icon: Volume2, color: 'text-purple-400' };
    if (isListening) return { text: 'Listening...', icon: Ear, color: 'text-blue-400' };
    return { text: 'Connected', icon: Wifi, color: 'text-green-400' };
  };

  const status = getStatus();
  const Icon = status.icon;

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className={cn('relative', status.color)}>
        <Icon className="w-4 h-4" />
        {isConnected && (
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
        )}
      </div>
      <span className={cn('text-sm font-medium', status.color)}>
        {status.text}
      </span>
    </div>
  );
}
