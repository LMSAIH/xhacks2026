import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageLayout } from "@/components/layout";

type TopicType = "sfu" | "custom" | null;

export function SelectTopicPage() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<TopicType>(null);

  const handleContinue = () => {
    if (selected === "sfu") {
      navigate("/browse-courses");
    } else if (selected === "custom") {
      navigate("/custom-topic");
    }
  };

  return (
    <PageLayout>
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-2xl mx-auto animate-fade-in-up">
          {/* Header */}
          <div className="mb-10 text-center">
            <h1 className="text-3xl md:text-4xl font-semibold mb-4">
              What would you like to learn?
            </h1>
            <p className="text-muted-foreground text-lg">
              Choose how you want to start your learning session
            </p>
          </div>

          {/* Options */}
          <div className="space-y-4 mb-10">
            {/* SFU Course Option */}
            <button
              onClick={() => setSelected("sfu")}
              className={`w-full text-left p-6 border-2 transition-all ${
                selected === "sfu"
                  ? "border-foreground bg-foreground text-background"
                  : "border-border hover:border-foreground bg-card"
              }`}
            >
              <div className="flex items-start gap-5">
                <div
                  className={`w-14 h-14 flex items-center justify-center text-2xl shrink-0 ${
                    selected === "sfu" ? "bg-background/20" : "bg-muted"
                  }`}
                >
                  📚
                </div>
                <div className="flex-1">
                  <div className="text-xl font-semibold mb-1">
                    Browse SFU Courses
                  </div>
                  <p
                    className={`${
                      selected === "sfu"
                        ? "text-background/70"
                        : "text-muted-foreground"
                    }`}
                  >
                    Select from hundreds of Simon Fraser University courses.
                    Great if you're studying for a specific class.
                  </p>
                </div>
                {selected === "sfu" && (
                  <div className="text-2xl">✓</div>
                )}
              </div>
            </button>

            {/* Custom Topic Option */}
            <button
              onClick={() => setSelected("custom")}
              className={`w-full text-left p-6 border-2 transition-all ${
                selected === "custom"
                  ? "border-foreground bg-foreground text-background"
                  : "border-border hover:border-foreground bg-card"
              }`}
            >
              <div className="flex items-start gap-5">
                <div
                  className={`w-14 h-14 flex items-center justify-center text-2xl shrink-0 ${
                    selected === "custom" ? "bg-background/20" : "bg-muted"
                  }`}
                >
                  ✨
                </div>
                <div className="flex-1">
                  <div className="text-xl font-semibold mb-1">
                    Learn Something New
                  </div>
                  <p
                    className={`${
                      selected === "custom"
                        ? "text-background/70"
                        : "text-muted-foreground"
                    }`}
                  >
                    Enter any topic you're curious about — from quantum physics
                    to creative writing to personal finance.
                  </p>
                </div>
                {selected === "custom" && (
                  <div className="text-2xl">✓</div>
                )}
              </div>
            </button>
          </div>

          {/* Continue Button */}
          <button
            disabled={!selected}
            onClick={handleContinue}
            className="w-full py-4 bg-foreground text-background font-medium text-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-foreground/90 transition-colors"
          >
            Continue →
          </button>
        </div>
      </div>
    </PageLayout>
  );
}
