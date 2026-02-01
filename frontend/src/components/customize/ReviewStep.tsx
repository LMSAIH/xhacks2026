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
  // New streaming props
  streamingSections?: OutlineItem[];
  isStreamingOutline?: boolean;
  outlineProgress?: { current: number; total: number } | null;
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
  streamingSections = [],
  isStreamingOutline = false,
  outlineProgress = null,
}: ReviewStepProps) {
  const tutorName = character?.name || customCharacter || "Custom Tutor";
  const tutorDescription = character?.teachingStyle || "A personalized AI tutor";

  // Use outline from props (API) or streaming sections, or fallback to empty
  // Prefer streaming sections while streaming is in progress for progressive UI
  const [outline, setOutline] = useState<OutlineItem[]>(generatedOutline?.sections || []);
  
  // Update outline when API data arrives or streaming sections update
  useEffect(() => {
    if (generatedOutline?.sections) {
      setOutline(generatedOutline.sections);
    } else if (isStreamingOutline && streamingSections.length > 0) {
      // During streaming, show sections as they arrive
      setOutline(streamingSections);
    }
  }, [generatedOutline, streamingSections, isStreamingOutline]);
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
          <div className="border-2 border-border bg-muted/20 h-full relative">
            {/* Terminal-style corner brackets */}
            <div className="absolute top-1 left-1 font-mono text-[10px] text-border">┌</div>
            <div className="absolute top-1 right-1 font-mono text-[10px] text-border">┐</div>
            <div className="absolute bottom-1 left-1 font-mono text-[10px] text-border">└</div>
            <div className="absolute bottom-1 right-1 font-mono text-[10px] text-border">┘</div>

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
                  className="w-12 h-12 object-cover bg-muted shrink-0 border border-border"
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
                <div className="w-10 h-10 bg-muted border border-border flex items-center justify-center text-sm shrink-0">
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
          <div className="border-2 border-border bg-muted/20 h-full flex flex-col relative">
            {/* Terminal-style corner brackets */}
            <div className="absolute top-1 left-1 font-mono text-[10px] text-border">┌</div>
            <div className="absolute top-1 right-1 font-mono text-[10px] text-border">┐</div>
            <div className="absolute bottom-1 left-1 font-mono text-[10px] text-border">└</div>
            <div className="absolute bottom-1 right-1 font-mono text-[10px] text-border">┘</div>

            <div className="p-4 border-b border-border flex items-center justify-between">
              <div>
                <SectionLabel className="mb-0.5">Course Outline</SectionLabel>
                <HelpText className="text-xs">
                  {isStreamingOutline 
                    ? `Generating${outlineProgress ? ` (${outlineProgress.current}/${outlineProgress.total})` : '...'}`
                    : isLoadingOutline 
                      ? "Generating..." 
                      : "AI-generated • Click to edit"}
                </HelpText>
              </div>
              <div className="text-xs font-mono text-muted-foreground bg-muted px-2 py-1">
                {isLoadingOutline || isStreamingOutline ? (
                  outlineProgress ? `${outlineProgress.current}/${outlineProgress.total}` : "..."
                ) : (
                  `${outline.length} sections`
                )}
              </div>
            </div>
            <div className="p-4 overflow-y-auto max-h-64 flex-1 scrollbar-thin">
              {isLoadingOutline && !isStreamingOutline && outline.length === 0 ? (
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
                  {outline.map((item, index) => (
                    <div 
                      key={item.id} 
                      className={isStreamingOutline && index === outline.length - 1 ? 'animate-pulse' : ''}
                    >
                      {renderOutlineItem(item)}
                    </div>
                  ))}
                  {isStreamingOutline && (
                    <div className="flex items-center gap-2 py-2 text-muted-foreground">
                      <div className="animate-spin w-3 h-3 border border-foreground border-t-transparent rounded-full" />
                      <span className="text-xs">Loading more sections...</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </BlurFade>
      </div>

      {/* What to expect */}
      <BlurFade delay={0.3}>
        <div className="mb-6 p-5 bg-muted/30 border-2 border-border relative">
          {/* Terminal-style corner brackets */}
          <div className="absolute top-1 left-1 font-mono text-[10px] text-border">┌</div>
          <div className="absolute top-1 right-1 font-mono text-[10px] text-border">┐</div>
          <div className="absolute bottom-1 left-1 font-mono text-[10px] text-border">└</div>
          <div className="absolute bottom-1 right-1 font-mono text-[10px] text-border">┘</div>

          <CardTitle className="mb-3">What happens next?</CardTitle>
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 bg-foreground text-background flex items-center justify-center text-xs font-bold font-mono shrink-0 border-2 border-foreground">
                1
              </span>
              <HelpText>You'll enter a voice conversation with your AI tutor</HelpText>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 bg-foreground text-background flex items-center justify-center text-xs font-bold font-mono shrink-0 border-2 border-foreground">
                2
              </span>
              <HelpText>Speak naturally — ask questions or request explanations</HelpText>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 bg-foreground text-background flex items-center justify-center text-xs font-bold font-mono shrink-0 border-2 border-foreground">
                3
              </span>
              <HelpText>Your tutor will guide you through the outline above</HelpText>
            </li>
          </ul>
        </div>
      </BlurFade>

      {/* Navigation */}
      <BlurFade delay={0.4}>
        <div className="flex justify-between items-center border-t-2 border-border pt-4 -mx-6 px-6 -mb-6 pb-6 bg-muted/20">
          <button
            onClick={onBack}
            className="group px-5 py-3 border-2 border-border text-sm hover:border-foreground transition-all duration-300 inline-flex items-center gap-2"
          >
            <span className="group-hover:-translate-x-1 transition-transform">←</span>
            Back
          </button>
          <button
            onClick={() => onStart(outline)}
            disabled={(isLoadingOutline && !isStreamingOutline) || outline.length === 0}
            className="group px-6 py-3 bg-foreground text-background font-semibold hover:bg-foreground/90 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
          >
            {isLoadingOutline && !isStreamingOutline ? "Preparing..." : 
             isStreamingOutline ? `Start Learning (${outline.length} sections ready)` :
             "Start Learning"}
            <span className="group-hover:translate-x-1 transition-transform">→</span>
          </button>
        </div>
      </BlurFade>
    </div>
  );
}
