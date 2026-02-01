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
    <div className="flex-1 flex items-start justify-center px-4 py-6 md:py-10">
      <BlurFade delay={0.1} duration={0.5} blur="10px">
        <div className="w-full max-w-4xl">
          {/* Main Box Container */}
          <div className="border border-border bg-card shadow-sm">
            {/* Box Header with Topic */}
            <div className="px-6 py-4 border-b border-border bg-muted/30">
              <div className="flex items-center gap-3">

                <div className="min-w-0">
                  <div className="text-xs text-muted-foreground uppercase tracking-wider">
                    Learning Session
                  </div>
                  <div className="font-semibold truncate">{topic}</div>
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
                        className={`flex items-center gap-2 w-full py-2 px-3 transition-all ${
                          isActive
                            ? "bg-foreground text-background"
                            : isCompleted
                            ? "bg-muted/80 text-foreground hover:bg-muted"
                            : "text-muted-foreground bg-muted/30"
                        } ${isClickable ? "cursor-pointer" : "cursor-not-allowed"}`}
                      >
                        <span
                          className={`w-5 h-5 flex items-center justify-center text-xs font-bold shrink-0 ${
                            isActive
                              ? "bg-background text-foreground"
                              : isCompleted
                              ? "bg-foreground text-background"
                              : "bg-muted-foreground/20 text-muted-foreground"
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
                          className={`w-4 h-px shrink-0 ${
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
