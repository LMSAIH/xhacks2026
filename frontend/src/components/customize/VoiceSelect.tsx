import type { Voice } from "./data";
import {
  StepTitle,
  StepDescription,
  HelpText,
} from "./Typography";
import { BlurFade } from "@/components/ui/blur-fade";
import { useVoices } from "@/hooks/use-backend-config";

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
  // Fetch voices from backend (falls back to local VOICES if unavailable)
  const { voices, loading } = useVoices();

  const playPreview = (voiceId: string) => {
    const audio = new Audio(`/samples/${voiceId}.mp3`);
    audio.play().catch(() => {
      console.log("Voice sample not available");
    });
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

      {/* Loading state */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="text-muted-foreground">Loading voices...</div>
        </div>
      ) : (
        /* Voice Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
          {voices.map((voice, index) => (
            <BlurFade key={voice.id} delay={0.15 + index * 0.05}>
              <VoiceCard
                voice={voice}
                isSelected={selectedId === voice.id}
                onSelect={() => onSelect(voice.id)}
                onPlayPreview={() => playPreview(voice.id)}
              />
            </BlurFade>
          ))}
        </div>
      )}

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
        <div className="flex justify-between items-center border-t border-border pt-4 -mx-6 px-6 -mb-6 pb-6 bg-muted/20">
          <button
            onClick={onBack}
            className="px-4 py-2.5 border border-border text-sm hover:border-foreground transition-colors"
          >
            ← Back
          </button>
          <button
            onClick={onContinue}
            disabled={!selectedId}
            className="px-6 py-2.5 bg-foreground text-background text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-foreground/90 transition-colors"
          >
            Continue →
          </button>
        </div>
      </BlurFade>
    </div>
  );
}

function VoiceCard({
  voice,
  isSelected,
  onSelect,
  onPlayPreview,
}: {
  voice: Voice;
  isSelected: boolean;
  onSelect: () => void;
  onPlayPreview: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={`w-full text-left p-4 border transition-all ${
        isSelected
          ? "border-foreground bg-foreground"
          : "border-border hover:border-foreground bg-background"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className={`font-semibold ${isSelected ? "text-background" : "text-foreground"}`}>
            {voice.name}
          </div>
          <div className={`text-xs mb-1 ${isSelected ? "text-background/70" : "text-muted-foreground"}`}>
            {voice.description}
          </div>
          <p className={`text-xs line-clamp-2 ${isSelected ? "text-background/80" : "text-foreground/80"}`}>
            {voice.personality}
          </p>
        </div>

        {/* Play button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onPlayPreview();
          }}
          className={`w-8 h-8 flex items-center justify-center border transition-colors shrink-0 ${
            isSelected
              ? "border-background/30 text-background hover:bg-background/10"
              : "border-border text-foreground hover:bg-muted"
          }`}
          aria-label={`Play ${voice.name} voice preview`}
        >
          <span>▶</span>
        </button>
      </div>

      {isSelected && (
        <div className="mt-2 pt-2 border-t border-background/20 text-xs text-background/80">
          ✓ Selected
        </div>
      )}
    </button>
  );
}
