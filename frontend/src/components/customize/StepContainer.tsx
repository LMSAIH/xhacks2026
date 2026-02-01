import type { ReactNode } from "react";
import { BlurFade } from "@/components/ui/blur-fade";

interface StepContainerProps {
  children: ReactNode;
  currentStep: number;
  steps: { id: string; label: string; completed: boolean }[];
  onStepClick: (stepIndex: number) => void;
  topic: string;
}

export function StepContainer({
  children,
  currentStep,
  steps,
  onStepClick,
  topic,
}: StepContainerProps) {
  return (
    <div className="flex-1 flex items-start justify-center px-6 py-10 md:py-16">
      <BlurFade delay={0.1} duration={0.5} blur="10px">
        <div className="w-full max-w-4xl">
          {/* Main Box Container */}
          <div className="border-2 border-foreground bg-card relative">
            {/* Terminal-style corner brackets */}
            <div className="absolute top-2 left-2 text-border font-mono text-xs">┌</div>
            <div className="absolute top-2 right-2 text-border font-mono text-xs">┐</div>
            <div className="absolute bottom-2 left-2 text-border font-mono text-xs">└</div>
            <div className="absolute bottom-2 right-2 text-border font-mono text-xs">┘</div>

            {/* Box Header with Topic */}
            <div className="px-6 py-4 border-b border-border bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="min-w-0">
                  <div className="text-xs text-muted-foreground uppercase tracking-widest font-mono">
                    Learning Session
                  </div>
                  <div className="font-display font-semibold truncate">{topic}</div>
                </div>
              </div>
            </div>

            {/* Step Indicator Bar */}
            <div className="px-6 py-3 border-b border-border bg-background">
              <div className="flex items-center gap-1">
                {steps.map((step, index) => {
                  const isActive = index === currentStep;
                  const isCompleted = step.completed;
                  const isClickable = index === 0 || steps[index - 1]?.completed;

                  return (
                    <div key={step.id} className="flex items-center flex-1">
                      <button
                        onClick={() => isClickable && onStepClick(index)}
                        disabled={!isClickable}
                        className={`flex items-center gap-2 w-full py-2 px-3 transition-all duration-300 ${
                          isActive
                            ? "bg-foreground text-background"
                            : isCompleted
                            ? "bg-muted/80 text-foreground hover:bg-muted"
                            : "text-muted-foreground bg-muted/30"
                        } ${isClickable ? "cursor-pointer" : "cursor-not-allowed"}`}
                      >
                        <span
                          className={`w-6 h-6 flex items-center justify-center text-xs font-bold font-mono shrink-0 border-2 ${
                            isActive
                              ? "border-background text-background"
                              : isCompleted
                              ? "border-foreground bg-foreground text-background"
                              : "border-muted-foreground/30 text-muted-foreground"
                          }`}
                        >
                          {isCompleted && !isActive ? "✓" : index + 1}
                        </span>
                        <span className="text-xs font-medium truncate hidden sm:block">
                          {step.label}
                        </span>
                      </button>
                      {index < steps.length - 1 && (
                        <div
                          className={`w-6 h-0.5 shrink-0 ${
                            isCompleted ? "bg-foreground" : "bg-border"
                          }`}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Content Area */}
            <div className="bg-background">
              {children}
            </div>
          </div>

        </div>
      </BlurFade>
    </div>
  );
}
