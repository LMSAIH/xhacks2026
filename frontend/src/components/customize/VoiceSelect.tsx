import { useState, useRef } from "react";
import { Play, Square, Loader2 } from "lucide-react";
import { VOICES } from "./data";
import type { Voice } from "./data";
import {
  StepTitle,
  StepDescription,
  HelpText,
} from "./Typography";
import { BlurFade } from "@/components/ui/blur-fade";

// Backend URL for voice preview API
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL?.replace('ws://', 'http://').replace('wss://', 'https://') || 'http://localhost:8787';

interface VoiceSelectProps {
  selectedId: string | null;
  characterName: string;
  onSelect: (id: string) => void;
  onBack: () => void;
  onContinue: () => void;
}

export function VoiceSelect({
  selectedId,
  characterName,
  onSelect,
  onBack,
  onContinue,
}: VoiceSelectProps) {
  const [loadingVoice, setLoadingVoice] = useState<string | null>(null);
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stopCurrentAudio = () => {
    if (audioRef.current) {
      // Remove event listeners before stopping to prevent false error events
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    setPlayingVoice(null);
  };

  const playPreview = async (voiceId: string) => {
    // If same voice is playing, stop it
    if (playingVoice === voiceId) {
      stopCurrentAudio();
      return;
    }

    // Stop any currently playing audio
    stopCurrentAudio();
    setError(null);
    setLoadingVoice(voiceId);

    try {
      // Fetch audio from backend TTS API
      const response = await fetch(`${BACKEND_URL}/api/voices/${voiceId}/preview`);
      
      if (!response.ok) {
        throw new Error(`Failed to load voice preview`);
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      
      audio.onended = () => {
        setPlayingVoice(null);
        URL.revokeObjectURL(audioUrl);
      };

      audio.onerror = () => {
        setError("Failed to play audio");
        setPlayingVoice(null);
        URL.revokeObjectURL(audioUrl);
      };

      await audio.play();
      setPlayingVoice(voiceId);
    } catch (err) {
      console.error("Voice preview error:", err);
      setError("Voice preview unavailable. Try again later.");
    } finally {
      setLoadingVoice(null);
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <BlurFade delay={0.1}>
        <div className="mb-6 text-center">
          <StepTitle className="mb-2">How should {characterName} sound?</StepTitle>
          <StepDescription className="max-w-md mx-auto">
            Choose a voice that fits your learning preference. Click the play
            button to hear a preview.
          </StepDescription>
        </div>
      </BlurFade>

      {/* Error message */}
      {error && (
        <BlurFade delay={0.1}>
          <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 text-sm text-center">
            {error}
          </div>
        </BlurFade>
      )}

      {/* Voice Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        {VOICES.map((voice, index) => (
          <BlurFade key={voice.id} delay={0.15 + index * 0.05}>
            <VoiceCard
              voice={voice}
              isSelected={selectedId === voice.id}
              isLoading={loadingVoice === voice.id}
              isPlaying={playingVoice === voice.id}
              onSelect={() => onSelect(voice.id)}
              onPlayPreview={() => playPreview(voice.id)}
            />
          </BlurFade>
        ))}
      </div>

      {/* Tip */}
      <BlurFade delay={0.4}>
        <div className="p-4 bg-muted/30 border border-border mb-6">
          <HelpText className="text-center">
            <strong>Tip:</strong> Don't worry too much about this choice — you can
            always change the voice later in settings.
          </HelpText>
        </div>
      </BlurFade>

      {/* Navigation */}
      <BlurFade delay={0.5}>
        <div className="flex justify-between items-center border-t-2 border-border pt-4 -mx-6 px-6 -mb-6 pb-6 bg-muted/20">
          <button
            onClick={onBack}
            className="group px-5 py-3 border-2 border-border text-sm hover:border-foreground transition-all duration-300 inline-flex items-center gap-2"
          >
            <span className="group-hover:-translate-x-1 transition-transform">←</span>
            Back
          </button>
          <button
            onClick={onContinue}
            disabled={!selectedId}
            className="group px-6 py-3 bg-foreground text-background text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-foreground/90 transition-all duration-300 inline-flex items-center gap-2"
          >
            Continue
            <span className="group-hover:translate-x-1 transition-transform">→</span>
          </button>
        </div>
      </BlurFade>
    </div>
  );
}

function VoiceCard({
  voice,
  isSelected,
  isLoading,
  isPlaying,
  onSelect,
  onPlayPreview,
}: {
  voice: Voice;
  isSelected: boolean;
  isLoading: boolean;
  isPlaying: boolean;
  onSelect: () => void;
  onPlayPreview: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={`group w-full text-left p-4 border-2 transition-all duration-300 relative ${
        isSelected
          ? "border-foreground bg-foreground"
          : "border-border hover:border-foreground bg-background"
      }`}
    >
      {/* Terminal-style corner brackets */}
      <div className={`absolute top-1 left-1 font-mono text-[10px] transition-colors ${isSelected ? 'text-background/30' : 'text-border'}`}>┌</div>
      <div className={`absolute top-1 right-1 font-mono text-[10px] transition-colors ${isSelected ? 'text-background/30' : 'text-border'}`}>┐</div>
      <div className={`absolute bottom-1 left-1 font-mono text-[10px] transition-colors ${isSelected ? 'text-background/30' : 'text-border'}`}>└</div>
      <div className={`absolute bottom-1 right-1 font-mono text-[10px] transition-colors ${isSelected ? 'text-background/30' : 'text-border'}`}>┘</div>

      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="mb-1">
            <span className={`font-display font-semibold ${isSelected ? "text-background" : "text-foreground"}`}>
              {voice.name}
            </span>
          </div>
          <div className={`text-xs font-mono mb-1 ${isSelected ? "text-background/70" : "text-muted-foreground"}`}>
            {voice.description}
          </div>
          <p className={`text-xs line-clamp-2 ${isSelected ? "text-background/80" : "text-foreground/80"}`}>
            {voice.personality}
          </p>
          {/* Best for tags */}
          <div className="flex flex-wrap gap-1 mt-2">
            {voice.bestFor.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className={`text-[10px] font-mono px-1.5 py-0.5 ${
                  isSelected
                    ? "bg-background/10 text-background/70"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Play button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onPlayPreview();
          }}
          disabled={isLoading}
          className={`w-10 h-10 flex items-center justify-center border-2 transition-all duration-300 shrink-0 ${
            isSelected
              ? "border-background/30 text-background hover:bg-background/10"
              : "border-border text-foreground hover:border-foreground hover:bg-muted"
          } ${isLoading ? "opacity-50 cursor-wait" : ""}`}
          aria-label={`Play ${voice.name} voice preview`}
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : isPlaying ? (
            <Square className="w-4 h-4 fill-current" />
          ) : (
            <Play className="w-4 h-4 fill-current" />
          )}
        </button>
      </div>

      {isSelected && (
        <div className="mt-3 pt-3 border-t border-background/20 text-xs font-mono text-background/80">
          ✓ Selected
        </div>
      )}
    </button>
  );
}
