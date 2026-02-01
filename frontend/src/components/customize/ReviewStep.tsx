import { useState, useEffect } from "react";
import type { Character, Voice } from "./data";
import {
  StepTitle,
  StepDescription,
  SectionLabel,
  CardTitle,
  CardSubtitle,
  CardDescription,
  HelpText,
} from "./Typography";
import { BlurFade } from "@/components/ui/blur-fade";
import type { OutlineItem, GeneratedOutline } from "@/lib/api";

interface ReviewStepProps {
  topic: string;
  character: Character | null;
  customCharacter: string;
  voice: Voice | null;
  onBack: () => void;
  onStart: (outline: OutlineItem[]) => void;
  outline: GeneratedOutline | null;
  isLoadingOutline: boolean;
  outlineError: string | null;
}

export function ReviewStep({
  topic,
  character,
  customCharacter,
  voice,
  onBack,
  onStart,
  outline: generatedOutline,
  isLoadingOutline,
  outlineError,
}: ReviewStepProps) {
  const tutorName = character?.name || customCharacter || "Custom Tutor";
  const tutorDescription = character?.teachingStyle || "A personalized AI tutor";

  // Use outline from props (API) or fallback to empty
  const [outline, setOutline] = useState<OutlineItem[]>(generatedOutline?.sections || []);
  
  // Update outline when API data arrives
  useEffect(() => {
    if (generatedOutline?.sections) {
      setOutline(generatedOutline.sections);
    }
  }, [generatedOutline]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const handleEditStart = (item: OutlineItem) => {
    setEditingId(item.id);
    setEditValue(item.title);
  };

  const handleEditSave = () => {
    if (!editingId) return;
    
    setOutline(prev => {
      const updateItem = (items: OutlineItem[]): OutlineItem[] => {
        return items.map(item => {
          if (item.id === editingId) {
            return { ...item, title: editValue };
          }
          if (item.children) {
            return { ...item, children: updateItem(item.children) };
          }
          return item;
        });
      };
      return updateItem(prev);
    });
    setEditingId(null);
    setEditValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleEditSave();
    } else if (e.key === "Escape") {
      setEditingId(null);
      setEditValue("");
    }
  };

  const renderOutlineItem = (item: OutlineItem, isChild = false) => {
    const isEditing = editingId === item.id;
    
    return (
      <div key={item.id} className={isChild ? "ml-6" : ""}>
        <div 
          className={`group flex items-center gap-2 py-1.5 px-2 -mx-2 rounded transition-colors hover:bg-muted/50 cursor-pointer ${
            isChild ? "text-sm" : "font-medium"
          }`}
          onClick={() => !isEditing && handleEditStart(item)}
        >
          <span className={`font-mono shrink-0 ${isChild ? "text-muted-foreground text-xs w-8" : "text-xs w-6"}`}>
            {item.number}
          </span>
          {isEditing ? (
            <input
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleEditSave}
              onKeyDown={handleKeyDown}
              autoFocus
              className="flex-1 bg-background border border-border px-2 py-0.5 text-sm focus:outline-none focus:border-foreground"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <>
              <span className="flex-1 truncate">{item.title}</span>
              <span className="text-muted-foreground text-xs opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                click to edit
              </span>
            </>
          )}
        </div>
        {item.children && (
          <div className="border-l border-border/50 ml-3">
            {item.children.map(child => renderOutlineItem(child, true))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-6">
      {/* Header */}
      <BlurFade delay={0.1}>
        <div className="mb-6 text-center">
          <StepTitle className="mb-2">Ready to start learning?</StepTitle>
          <StepDescription>Review your session setup and course outline</StepDescription>
        </div>
      </BlurFade>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Left: Session Summary */}
        <BlurFade delay={0.2}>
          <div className="border border-border bg-muted/20 h-full">
            {/* Topic */}
            <div className="p-4 border-b border-border">
              <SectionLabel className="mb-1">Topic</SectionLabel>
              <CardTitle className="text-lg truncate">{topic}</CardTitle>
            </div>

            {/* Tutor */}
            <div className="p-4 border-b border-border">
              <SectionLabel className="mb-2">Your Tutor</SectionLabel>
              <div className="flex items-start gap-3">
                <img
                  src={character?.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(tutorName)}&background=1a1a1a&color=fff&size=128&font-size=0.4`}
                  alt={tutorName}
                  className="w-10 h-10 object-cover bg-muted shrink-0"
                  onError={(e) => {
                    e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(tutorName)}&background=1a1a1a&color=fff&size=128&font-size=0.4`;
                  }}
                />
                <div className="flex-1 min-w-0">
                  <CardTitle className="truncate">{tutorName}</CardTitle>
                  {character && (
                    <CardSubtitle className="truncate">
                      {character.title} • {character.era}
                    </CardSubtitle>
                  )}
                  <CardDescription className="text-xs mt-1 line-clamp-2">
                    {tutorDescription}
                  </CardDescription>
                </div>
              </div>
            </div>

            {/* Voice */}
            <div className="p-4">
              <SectionLabel className="mb-2">Voice</SectionLabel>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-muted flex items-center justify-center text-sm shrink-0">
                  🔊
                </div>
                <div className="min-w-0">
                  <CardTitle className="truncate">{voice?.name || "Default"}</CardTitle>
                  <CardSubtitle className="truncate">{voice?.description || "Standard voice"}</CardSubtitle>
                </div>
              </div>
            </div>
          </div>
        </BlurFade>

        {/* Right: Course Outline */}
        <BlurFade delay={0.25}>
          <div className="border border-border bg-muted/20 h-full flex flex-col">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div>
                <SectionLabel className="mb-0.5">Course Outline</SectionLabel>
                <HelpText className="text-xs">
                  {isLoadingOutline ? "Generating..." : "AI-generated • Click to edit"}
                </HelpText>
              </div>
              <div className="text-xs text-muted-foreground bg-muted px-2 py-1">
                {isLoadingOutline ? "..." : `${outline.length} sections`}
              </div>
            </div>
            <div className="p-4 overflow-y-auto max-h-64 flex-1 scrollbar-thin">
              {isLoadingOutline ? (
                <div className="flex items-center justify-center h-32">
                  <div className="text-center">
                    <div className="animate-spin w-6 h-6 border-2 border-foreground border-t-transparent rounded-full mx-auto mb-2" />
                    <HelpText>Generating your personalized outline...</HelpText>
                  </div>
                </div>
              ) : outlineError ? (
                <div className="flex items-center justify-center h-32">
                  <div className="text-center text-destructive">
                    <p className="text-sm">Failed to generate outline</p>
                    <HelpText className="mt-1">{outlineError}</HelpText>
                  </div>
                </div>
              ) : outline.length === 0 ? (
                <div className="flex items-center justify-center h-32">
                  <HelpText>No outline available</HelpText>
                </div>
              ) : (
                <div className="space-y-1">
                  {outline.map(item => renderOutlineItem(item))}
                </div>
              )}
            </div>
          </div>
        </BlurFade>
      </div>

      {/* What to expect */}
      <BlurFade delay={0.3}>
        <div className="mb-6 p-4 bg-muted/30 border border-border">
          <CardTitle className="mb-2">What happens next?</CardTitle>
          <ul className="space-y-2">
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 bg-foreground text-background flex items-center justify-center text-xs font-bold shrink-0">
                1
              </span>
              <HelpText>You'll enter a voice conversation with your AI tutor</HelpText>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 bg-foreground text-background flex items-center justify-center text-xs font-bold shrink-0">
                2
              </span>
              <HelpText>Speak naturally — ask questions or request explanations</HelpText>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 bg-foreground text-background flex items-center justify-center text-xs font-bold shrink-0">
                3
              </span>
              <HelpText>Your tutor will guide you through the outline above</HelpText>
            </li>
          </ul>
        </div>
      </BlurFade>

      {/* Navigation */}
      <BlurFade delay={0.4}>
        <div className="flex justify-between items-center border-t border-border pt-4 -mx-6 px-6 -mb-6 pb-6 bg-muted/20">
          <button
            onClick={onBack}
            className="px-4 py-2.5 border border-border text-sm hover:border-foreground transition-colors"
          >
            ← Back
          </button>
          <button
            onClick={() => onStart(outline)}
            disabled={isLoadingOutline || outline.length === 0}
            className="px-6 py-3 bg-foreground text-background font-semibold hover:bg-foreground/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoadingOutline ? "Preparing..." : "Start Learning →"}
          </button>
        </div>
      </BlurFade>
    </div>
  );
}
