import { useState } from "react";
import { CHARACTERS } from "./data";
import type { Character } from "./data";
import {
  StepTitle,
  StepDescription,
  CardTitle,
  HelpText,
  SectionLabel,
} from "./Typography";
import { BlurFade } from "@/components/ui/blur-fade";
import { generateCustomCharacter } from "@/lib/api";

interface CharacterSelectProps {
  selectedId: string | null;
  customDescription: string;
  onSelect: (id: string | null) => void;
  onCustomChange: (value: string) => void;
  onContinue: () => void;
  // New props for AI-generated experts
  experts?: Character[];
  isLoading?: boolean;
  isGeneratingImages?: boolean;
  onGenerateImages?: () => void;
  useAIExperts?: boolean;
  // Props for custom character generation
  customCharacter?: Character | null;
  onCustomCharacterGenerated?: (character: Character) => void;
}

export function CharacterSelect({
  selectedId,
  customDescription,
  onSelect,
  onCustomChange,
  onContinue,
  experts,
  isLoading = false,
  isGeneratingImages = false,
  onGenerateImages,
  useAIExperts = false,
  customCharacter,
  onCustomCharacterGenerated,
}: CharacterSelectProps) {
  const canContinue = selectedId || customDescription.trim();
  const [modalCharacter, setModalCharacter] = useState<Character | null>(null);
  const [isGeneratingCustom, setIsGeneratingCustom] = useState(false);

  // Use AI-generated experts if provided, otherwise fall back to static CHARACTERS
  const displayCharacters = useAIExperts && experts && experts.length > 0 ? experts : CHARACTERS;

  return (
    <div className="p-6">
      {/* Header */}
      <BlurFade delay={0.1}>
        <div className="mb-6 text-center">
          <StepTitle className="mb-2">Who would you like to learn from?</StepTitle>
          <StepDescription className="max-w-md mx-auto">
            {useAIExperts 
              ? "We found these experts who specialize in your topic. Each has a unique teaching style."
              : "Choose a historical figure as your tutor. Each has a unique teaching style that will shape how they explain concepts to you."}
          </StepDescription>
        </div>
      </BlurFade>

      {/* Loading State */}
      {isLoading && (
        <BlurFade delay={0.15}>
          <div className="flex flex-col items-center justify-center py-12 mb-6">
            <div className="w-8 h-8 border-2 border-foreground/20 border-t-foreground animate-spin mb-4" />
            <p className="text-sm text-muted-foreground">Finding experts for your topic...</p>
          </div>
        </BlurFade>
      )}

      {/* Character Grid */}
      {!isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
          {displayCharacters.map((char, index) => (
            <BlurFade key={char.id} delay={0.15 + index * 0.05}>
              <CharacterCard
                character={char}
                isSelected={selectedId === char.id}
                onSelect={() => {
                  onSelect(char.id);
                  onCustomChange("");
                }}
                onLearnMore={() => setModalCharacter(char)}
                isGeneratingImage={isGeneratingImages && !char.image}
              />
            </BlurFade>
          ))}
        </div>
      )}

      {/* Generate Images Button (if experts don't have images) */}
      {useAIExperts && experts && experts.length > 0 && !isLoading && onGenerateImages && (
        <BlurFade delay={0.35}>
          {experts.some(e => !e.image) && (
            <div className="text-center mb-6">
              <button
                onClick={onGenerateImages}
                disabled={isGeneratingImages}
                className="px-4 py-2 text-sm border border-border hover:border-foreground transition-colors disabled:opacity-50"
              >
                {isGeneratingImages ? (
                  <>
                    <span className="inline-block w-4 h-4 border-2 border-foreground/20 border-t-foreground animate-spin mr-2" />
                    Generating portraits...
                  </>
                ) : (
                  "✨ Generate AI Portraits"
                )}
              </button>
            </div>
          )}
        </BlurFade>
      )}

      {/* Custom Option */}
      <BlurFade delay={0.4}>
        <div className="border border-dashed border-border p-5 bg-muted/20 mb-6">
          <div className="text-center mb-3">
            <CardTitle className="mb-1">Want someone different?</CardTitle>
            <HelpText>
              Enter any character — real, fictional, animated, or imaginary — and we'll bring them to life as your tutor
            </HelpText>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={customDescription}
              onChange={(e) => {
                onCustomChange(e.target.value);
                if (e.target.value) onSelect(null);
              }}
              placeholder="e.g., SpongeBob, Gordon Ramsay, a wise wizard, my grandma..."
              className="flex-1 px-4 py-3 bg-background border border-border text-sm focus:outline-none focus:border-foreground transition-colors"
            />
            <button
              onClick={async () => {
                if (!customDescription.trim() || !onCustomCharacterGenerated) return;
                setIsGeneratingCustom(true);
                try {
                  const character = await generateCustomCharacter(customDescription);
                  if (character) {
                    onCustomCharacterGenerated(character as Character);
                    onSelect(character.id);
                    onCustomChange("");
                  }
                } finally {
                  setIsGeneratingCustom(false);
                }
              }}
              disabled={!customDescription.trim() || isGeneratingCustom || !onCustomCharacterGenerated}
              className="px-4 py-3 bg-foreground text-background text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-foreground/90 transition-colors whitespace-nowrap"
            >
              {isGeneratingCustom ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-background/20 border-t-background animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                "✨ Generate"
              )}
            </button>
          </div>
          
          {/* Show generated custom character */}
          {customCharacter && (
            <div className="mt-4 pt-4 border-t border-border">
              <div className="text-xs text-muted-foreground mb-2 text-center">Your custom tutor:</div>
              <CharacterCard
                character={customCharacter}
                isSelected={selectedId === customCharacter.id}
                onSelect={() => {
                  onSelect(customCharacter.id);
                  onCustomChange("");
                }}
                onLearnMore={() => setModalCharacter(customCharacter)}
              />
            </div>
          )}
        </div>
      </BlurFade>

      {/* Continue Button */}
      <BlurFade delay={0.5}>
        <div className="flex justify-end border-t border-border pt-4 -mx-6 px-6 -mb-6 pb-6 bg-muted/20">
          <button
            onClick={onContinue}
            disabled={!canContinue}
            className="px-6 py-2.5 bg-foreground text-background text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-foreground/90 transition-colors"
          >
            Continue →
          </button>
        </div>
      </BlurFade>

      {/* Character Detail Modal */}
      {modalCharacter && (
        <CharacterModal
          character={modalCharacter}
          isSelected={selectedId === modalCharacter.id}
          onClose={() => setModalCharacter(null)}
          onSelect={() => {
            onSelect(modalCharacter.id);
            onCustomChange("");
            setModalCharacter(null);
          }}
        />
      )}
    </div>
  );
}

function CharacterCard({
  character,
  isSelected,
  onSelect,
  onLearnMore,
  isGeneratingImage = false,
}: {
  character: Character;
  isSelected: boolean;
  onSelect: () => void;
  onLearnMore: () => void;
  isGeneratingImage?: boolean;
}) {
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(character.name)}&background=1a1a1a&color=fff&size=128&font-size=0.4`;
  };

  const hasImage = character.image && character.image.length > 0;

  return (
    <div
      className={`w-full text-left p-3 border transition-all ${
        isSelected
          ? "border-foreground bg-foreground"
          : "border-border hover:border-foreground bg-background"
      }`}
    >
      <button onClick={onSelect} className="w-full text-left">
        <div className="flex gap-3">
          {/* Image */}
          <div className="w-14 h-14 bg-muted overflow-hidden shrink-0 relative">
            {isGeneratingImage ? (
              <div className="w-full h-full flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-foreground/20 border-t-foreground animate-spin" />
              </div>
            ) : hasImage ? (
              <img
                src={character.image}
                alt={character.name}
                className={`w-full h-full object-cover ${isSelected ? "" : "grayscale"}`}
                onError={handleImageError}
              />
            ) : (
              <div className={`w-full h-full flex items-center justify-center text-lg font-semibold ${isSelected ? "bg-background/20 text-background" : "bg-muted text-muted-foreground"}`}>
                {character.name.charAt(0)}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className={`font-semibold ${isSelected ? "text-background" : "text-foreground"}`}>
              {character.name}
            </div>
            <div className={`text-xs ${isSelected ? "text-background/70" : "text-muted-foreground"}`}>
              {character.era}
            </div>
            <p className={`mt-1 line-clamp-2 text-xs ${isSelected ? "text-background/80" : "text-foreground/80"}`}>
              {character.teachingStyle}
            </p>
          </div>
        </div>
      </button>

      {/* Bottom row with Learn More and Selection indicator */}
      <div className={`mt-2 pt-2 border-t flex items-center justify-between ${
        isSelected ? "border-background/20" : "border-border"
      }`}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onLearnMore();
          }}
          className={`text-xs underline underline-offset-2 hover:no-underline ${
            isSelected ? "text-background/80 hover:text-background" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Learn more
        </button>
        {isSelected && (
          <span className="text-xs text-background/80">✓ Selected</span>
        )}
      </div>
    </div>
  );
}

function CharacterModal({
  character,
  isSelected,
  onClose,
  onSelect,
}: {
  character: Character;
  isSelected: boolean;
  onClose: () => void;
  onSelect: () => void;
}) {
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(character.name)}&background=1a1a1a&color=fff&size=256&font-size=0.4`;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-background border border-border shadow-xl animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <SectionLabel>Tutor Profile</SectionLabel>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center hover:bg-muted transition-colors"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6">
          {/* Character Header */}
          <div className="flex gap-4 mb-6">
            <div className="w-24 h-24 bg-muted overflow-hidden shrink-0">
              <img
                src={character.image}
                alt={character.name}
                className="w-full h-full object-cover"
                onError={handleImageError}
              />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold mb-1">{character.name}</h3>
              <div className="text-sm text-muted-foreground mb-2">
                {character.title} • {character.era}
              </div>
              {isSelected && (
                <span className="inline-block px-2 py-1 bg-foreground text-background text-xs">
                  ✓ Currently Selected
                </span>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-4">
            <div>
              <SectionLabel className="mb-2">About</SectionLabel>
              <p className="text-sm text-foreground/90 leading-relaxed">
                {character.description}
              </p>
            </div>

            <div>
              <SectionLabel className="mb-2">Teaching Style</SectionLabel>
              <p className="text-sm text-foreground/90 leading-relaxed">
                {character.teachingStyle}
              </p>
            </div>

            <div className="p-4 bg-muted/30 border border-border">
              <div className="text-sm text-muted-foreground">
                <strong className="text-foreground">What to expect:</strong> When learning with {character.name}, 
                expect a unique experience shaped by their historical expertise and personality. 
                They'll guide you through topics using their distinctive approach to teaching and discovery.
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex justify-end gap-3 p-4 border-t border-border bg-muted/20">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border border-border hover:border-foreground transition-colors"
          >
            Close
          </button>
          {!isSelected && (
            <button
              onClick={onSelect}
              className="px-4 py-2 text-sm bg-foreground text-background font-medium hover:bg-foreground/90 transition-colors"
            >
              Select {character.name}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
