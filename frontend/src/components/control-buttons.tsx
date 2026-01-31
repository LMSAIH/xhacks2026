import { cn } from '@/lib/utils';
import { Mic, MicOff, Phone, PhoneOff, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ControlButtonsProps {
  isConnected: boolean;
  isListening: boolean;
  isMuted: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onToggleMute: () => void;
  onClear: () => void;
  className?: string;
}

export function ControlButtons({
  isConnected,
  isListening,
  isMuted,
  onConnect,
  onDisconnect,
  onStartRecording,
  onStopRecording,
  onToggleMute,
  onClear,
  className,
}: ControlButtonsProps) {
  return (
    <div className={cn('flex items-center justify-center gap-4', className)}>
      {!isConnected ? (
        /* Connect button when disconnected */
        <Button
          variant="default"
          size="lg"
          className={cn(
            'rounded-full w-20 h-20 transition-all duration-300 shadow-lg',
            'bg-green-600 hover:bg-green-700 shadow-green-600/30',
            'hover:scale-105 active:scale-95'
          )}
          onClick={onConnect}
        >
          <Phone className="w-8 h-8" />
        </Button>
      ) : (
        <>
          {/* Mute button */}
          <Button
            variant="outline"
            size="lg"
            className={cn(
              'rounded-full w-14 h-14 transition-all duration-300',
              isMuted && 'bg-destructive/20 border-destructive/50 hover:bg-destructive/30'
            )}
            onClick={onToggleMute}
          >
            {isMuted ? (
              <MicOff className="w-6 h-6 text-destructive" />
            ) : (
              <Mic className="w-6 h-6" />
            )}
          </Button>

          {/* Push to talk button */}
          <Button
            variant="default"
            size="lg"
            className={cn(
              'rounded-full w-20 h-20 transition-all duration-300 shadow-lg',
              isListening
                ? 'bg-blue-500 hover:bg-blue-600 shadow-blue-500/40 scale-110'
                : 'bg-primary hover:bg-primary/90 shadow-primary/30 hover:scale-105',
              isMuted && 'opacity-50 cursor-not-allowed'
            )}
            onMouseDown={onStartRecording}
            onMouseUp={onStopRecording}
            onMouseLeave={onStopRecording}
            onTouchStart={onStartRecording}
            onTouchEnd={onStopRecording}
            disabled={isMuted}
          >
            <Mic className={cn('w-8 h-8', isListening && 'animate-pulse')} />
          </Button>

          {/* End call button */}
          <Button
            variant="destructive"
            size="lg"
            className={cn(
              'rounded-full w-14 h-14 transition-all duration-300',
              'hover:scale-105 active:scale-95'
            )}
            onClick={onDisconnect}
          >
            <PhoneOff className="w-6 h-6" />
          </Button>

          {/* Clear conversation */}
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full w-10 h-10 opacity-60 hover:opacity-100"
            onClick={onClear}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </>
      )}
    </div>
  );
}
