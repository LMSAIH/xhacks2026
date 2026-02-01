import { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { PageLayout } from "@/components/layout";
import {
  CharacterSelect,
  VoiceSelect,
  ReviewStep,
  StepContainer,
  CHARACTERS,
  VOICES,
} from "@/components/customize";
import { useExperts } from "@/hooks";
import type { Character } from "@/components/customize/data";
import { generateOutline, type GeneratedOutline, type OutlineItem } from "@/lib/api";

type Step = "character" | "voice" | "review";

export default function CustomizePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { topic, courseId, courseName } = location.state || {};

  const [currentStep, setCurrentStep] = useState<Step>("character");
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  const [selectedVoiceId, setSelectedVoiceId] = useState<string | null>(null);
  const [customCharacterDescription, setCustomCharacterDescription] = useState("");
  const [generatedCustomCharacter, setGeneratedCustomCharacter] = useState<Character | null>(null);
  
  // Outline state
  const [generatedOutline, setGeneratedOutline] = useState<GeneratedOutline | null>(null);
  const [isLoadingOutline, setIsLoadingOutline] = useState(false);
  const [outlineError, setOutlineError] = useState<string | null>(null);

  const displayTopic = topic || courseName || "Custom Topic";
  
  // Always fetch AI-generated experts based on the topic or course name
  const shouldFetchExperts = !!(topic || courseName);
  
  const {
    experts,
    isLoading: isLoadingExperts,
    isGeneratingImages,
    generateImages,
  } = useExperts({
    topic: displayTopic,
    count: 6,
    withImages: true, // Get images in one call
    enabled: shouldFetchExperts,
  });

  // Convert experts to Character format for the component
  const aiCharacters: Character[] = useMemo(() => {
    return experts.map((expert) => ({
      id: expert.id,
      name: expert.name,
      title: expert.title,
      era: expert.era,
      image: expert.image,
      description: expert.description,
      teachingStyle: expert.teachingStyle,
    }));
  }, [experts]);

  // Use AI experts if available, otherwise use static characters
  // Include the generated custom character if it exists
  const allCharacters = useMemo(() => {
    const baseCharacters = shouldFetchExperts && aiCharacters.length > 0 ? aiCharacters : CHARACTERS;
    if (generatedCustomCharacter) {
      return [generatedCustomCharacter, ...baseCharacters];
    }
    return baseCharacters;
  }, [shouldFetchExperts, aiCharacters, generatedCustomCharacter]);
  
  const selectedCharacter = allCharacters.find((c) => c.id === selectedCharacterId) || null;
  const selectedVoice = VOICES.find((v) => v.id === selectedVoiceId) || null;

  // Fetch outline when entering review step
  const fetchOutline = useCallback(async () => {
    if (!displayTopic) return;
    
    setIsLoadingOutline(true);
    setOutlineError(null);
    
    try {
      const characterInfo = selectedCharacter ? {
        id: selectedCharacter.id,
        name: selectedCharacter.name,
        teachingStyle: selectedCharacter.teachingStyle,
      } : undefined;
      
      const outline = await generateOutline(displayTopic, characterInfo);
      
      if (outline) {
        setGeneratedOutline(outline);
      } else {
        setOutlineError("Failed to generate outline. Please try again.");
      }
    } catch (error) {
      console.error("Error generating outline:", error);
      setOutlineError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoadingOutline(false);
    }
  }, [displayTopic, selectedCharacter]);

  // Fetch outline when entering review step
  useEffect(() => {
    if (currentStep === "review" && !generatedOutline && !isLoadingOutline) {
      fetchOutline();
    }
  }, [currentStep, generatedOutline, isLoadingOutline, fetchOutline]);

  const steps = [
    {
      id: "character",
      label: "Choose Tutor",
      completed: !!(selectedCharacterId || customCharacterDescription),
    },
    {
      id: "voice",
      label: "Select Voice",
      completed: !!selectedVoiceId,
    },
    {
      id: "review",
      label: "Review & Start",
      completed: false,
    },
  ];

  const currentStepIndex = steps.findIndex((s) => s.id === currentStep);

  const handleStepClick = (index: number) => {
    const stepId = steps[index].id as Step;
    setCurrentStep(stepId);
  };

  const handleStart = (outline: OutlineItem[]) => {
    // Convert outline items to sections format for EditorPage
    const sections = outline.map((item, index) => ({
      id: item.id || String(index + 1),
      number: `${index + 1}.0`,
      title: item.title,
      description: item.description || "",
      duration: item.duration || "15 min",
      isCompleted: false,
      children: item.children?.map((child, childIndex) => ({
        id: child.id || `${index + 1}.${childIndex + 1}`,
        number: `${index + 1}.${childIndex + 1}`,
        title: child.title,
        description: child.description || "",
        duration: child.duration || "10 min",
      })),
    }));

    navigate("/editor", {
      state: {
        topic: displayTopic,
        sections,
        character: {
          id: selectedCharacter?.id || "custom",
          name: selectedCharacter?.name || customCharacterDescription || "AI Tutor",
          title: selectedCharacter?.title || "Your Personal Teacher",
          image: selectedCharacter?.image,
          voice: selectedVoice?.id,
          personality: selectedCharacter?.teachingStyle || "helpful, patient, and encouraging",
        },
        outlineId: generatedOutline?.id,
      },
    });
  };

  return (
    <PageLayout hideFooter>
      <StepContainer
        currentStep={currentStepIndex}
        steps={steps}
        onStepClick={handleStepClick}
        topic={displayTopic}
      >
        {currentStep === "character" && (
          <CharacterSelect
            selectedId={selectedCharacterId}
            customDescription={customCharacterDescription}
            onSelect={setSelectedCharacterId}
            onCustomChange={setCustomCharacterDescription}
            onContinue={() => setCurrentStep("voice")}
            experts={aiCharacters}
            isLoading={isLoadingExperts}
            isGeneratingImages={isGeneratingImages}
            onGenerateImages={generateImages}
            useAIExperts={shouldFetchExperts}
            customCharacter={generatedCustomCharacter}
            onCustomCharacterGenerated={setGeneratedCustomCharacter}
          />
        )}

        {currentStep === "voice" && (
          <VoiceSelect
            selectedId={selectedVoiceId}
            characterName={selectedCharacter?.name || customCharacterDescription || "your tutor"}
            onSelect={setSelectedVoiceId}
            onBack={() => setCurrentStep("character")}
            onContinue={() => setCurrentStep("review")}
          />
        )}

        {currentStep === "review" && (
          <ReviewStep
            topic={displayTopic}
            character={selectedCharacter}
            customCharacter={customCharacterDescription}
            voice={selectedVoice}
            onBack={() => setCurrentStep("voice")}
            onStart={handleStart}
            outline={generatedOutline}
            isLoadingOutline={isLoadingOutline}
            outlineError={outlineError}
          />
        )}
      </StepContainer>
    </PageLayout>
  );
}
