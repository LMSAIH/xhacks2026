interface StepIndicatorProps {
  currentStep: number;
  steps: { id: string; label: string; completed: boolean }[];
  onStepClick: (stepIndex: number) => void;
}

export function StepIndicator({ currentStep, steps, onStepClick }: StepIndicatorProps) {
  return (
    <div className="w-full border-b border-border bg-card/50">
      <div className="max-w-5xl mx-auto px-6">
        <div className="flex items-center py-4 gap-2">
          {steps.map((step, index) => {
            const isActive = index === currentStep;
            const isCompleted = step.completed;
            const isClickable = index === 0 || steps[index - 1]?.completed;

            return (
              <div key={step.id} className="flex items-center">
                {index > 0 && (
                  <div
                    className={`w-8 h-px mx-2 ${
                      isCompleted || isActive ? "bg-foreground" : "bg-border"
                    }`}
                  />
                )}
                <button
                  onClick={() => isClickable && onStepClick(index)}
                  disabled={!isClickable}
                  className={`flex items-center gap-2 px-3 py-2 transition-all ${
                    isActive
                      ? "bg-foreground text-background"
                      : isCompleted
                      ? "bg-muted text-foreground hover:bg-muted/80"
                      : "text-muted-foreground"
                  } ${isClickable ? "cursor-pointer" : "cursor-not-allowed opacity-50"}`}
                >
                  <span
                    className={`w-6 h-6 flex items-center justify-center text-xs font-medium ${
                      isActive
                        ? "bg-background text-foreground"
                        : isCompleted
                        ? "bg-foreground text-background"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {isCompleted && !isActive ? "✓" : index + 1}
                  </span>
                  <span className="text-sm font-medium hidden sm:inline">{step.label}</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
