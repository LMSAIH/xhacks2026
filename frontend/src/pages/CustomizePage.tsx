import { useState } from "react";
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

type Step = "character" | "voice" | "review";

export default function CustomizePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { topic, courseId, courseName } = location.state || {};

  const [currentStep, setCurrentStep] = useState<Step>("character");
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  const [selectedVoiceId, setSelectedVoiceId] = useState<string | null>(null);
  const [customCharacter, setCustomCharacter] = useState("");

  const selectedCharacter = CHARACTERS.find((c) => c.id === selectedCharacterId) || null;
  const selectedVoice = VOICES.find((v) => v.id === selectedVoiceId) || null;
  const displayTopic = topic || courseName || "Custom Topic";

  const steps = [
    {
      id: "character",
      label: "Choose Tutor",
      completed: !!(selectedCharacterId || customCharacter),
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

  const handleStart = () => {
    navigate("/voice", {
      state: {
        topic: displayTopic,
        courseId,
        character: selectedCharacter || {
          id: "custom",
          name: customCharacter || "Custom Tutor",
        },
        voice: selectedVoice,
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
            customDescription={customCharacter}
            onSelect={setSelectedCharacterId}
            onCustomChange={setCustomCharacter}
            onContinue={() => setCurrentStep("voice")}
          />
        )}

        {currentStep === "voice" && (
          <VoiceSelect
            selectedId={selectedVoiceId}
            characterName={selectedCharacter?.name || customCharacter || "your tutor"}
            onSelect={setSelectedVoiceId}
            onBack={() => setCurrentStep("character")}
            onContinue={() => setCurrentStep("review")}
          />
        )}

        {currentStep === "review" && (
          <ReviewStep
            topic={displayTopic}
            character={selectedCharacter}
            customCharacter={customCharacter}
            voice={selectedVoice}
            onBack={() => setCurrentStep("voice")}
            onStart={handleStart}
          />
        )}
      </StepContainer>
    </PageLayout>
  );
}
