import { useState, useMemo, useEffect, useRef } from "react";
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
import { useOnboardingPipeline } from "@/hooks/use-onboarding-pipeline";
import type { Character } from "@/components/customize/data";
import type { OutlineItem } from "@/lib/api";

type Step = "character" | "voice" | "review";

export default function CustomizePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { topic, courseName } = location.state || {};

  const [currentStep, setCurrentStep] = useState<Step>("character");
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  const [selectedVoiceId, setSelectedVoiceId] = useState<string | null>(null);
  const [customCharacterDescription, setCustomCharacterDescription] = useState("");
  const [generatedCustomCharacter, setGeneratedCustomCharacter] = useState<Character | null>(null);
  
  // Track which character we've regenerated the outline for to prevent duplicate calls
  const regeneratedForCharacterRef = useRef<string | null>(null);

  const displayTopic = topic || courseName || "Custom Topic";
  
  // Use the onboarding pipeline for parallel generation
  // This starts fetching experts, images, AND outline all at once when topic is set
  const pipeline = useOnboardingPipeline({
    enabled: !!(topic || courseName),
  });
  
  // Start the pipeline when the component mounts with a topic
  useEffect(() => {
    if (displayTopic && displayTopic !== "Custom Topic") {
      pipeline.setTopic(displayTopic);
    }
  }, [displayTopic]);
  
  // Regenerate outline when user selects a character (to personalize it)
  // Only regenerate once per character to prevent race conditions
  useEffect(() => {
    if (
      currentStep === "review" && 
      selectedCharacterId && 
      pipeline.outline &&
      regeneratedForCharacterRef.current !== selectedCharacterId
    ) {
      const character = pipeline.experts.find(e => e.id === selectedCharacterId);
      if (character) {
        regeneratedForCharacterRef.current = selectedCharacterId;
        // Regenerate with character info for personalized outline
        pipeline.regenerateOutline({
          id: character.id,
          name: character.name,
          teachingStyle: character.teachingStyle,
        });
      }
    }
  }, [currentStep, selectedCharacterId, pipeline.outline, pipeline.experts, pipeline.regenerateOutline]);

  // Convert pipeline experts to Character format for the component
  const aiCharacters: Character[] = useMemo(() => {
    return pipeline.experts.map((expert) => ({
      id: expert.id,
      name: expert.name,
      title: expert.title,
      era: expert.era,
      image: expert.image,
      description: expert.description,
      teachingStyle: expert.teachingStyle,
    }));
  }, [pipeline.experts]);

  // Use AI experts if available, otherwise use static characters
  // Include the generated custom character if it exists
  const shouldFetchExperts = !!(topic || courseName);
  const allCharacters = useMemo(() => {
    const baseCharacters = shouldFetchExperts && aiCharacters.length > 0 ? aiCharacters : CHARACTERS;
    if (generatedCustomCharacter) {
      return [generatedCustomCharacter, ...baseCharacters];
    }
    return baseCharacters;
  }, [shouldFetchExperts, aiCharacters, generatedCustomCharacter]);
  
  const selectedCharacter = allCharacters.find((c) => c.id === selectedCharacterId) || null;
  const selectedVoice = VOICES.find((v) => v.id === selectedVoiceId) || null;

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
        outlineId: pipeline.outline?.id,
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
            isLoading={pipeline.isLoadingExperts}
            isGeneratingImages={pipeline.isGeneratingImages}
            onGenerateImages={pipeline.retryImages}
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
            outline={pipeline.outline}
            isLoadingOutline={pipeline.isLoadingOutline}
            outlineError={pipeline.outlineError}
            streamingSections={pipeline.streamingSections}
            isStreamingOutline={pipeline.isStreamingOutline}
            outlineProgress={pipeline.outlineProgress}
          />
        )}
      </StepContainer>
    </PageLayout>
  );
}
