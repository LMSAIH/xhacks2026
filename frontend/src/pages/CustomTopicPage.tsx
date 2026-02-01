import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageLayout } from "@/components/layout";

const SUGGESTED_TOPICS = [
  { name: "JavaScript Fundamentals", icon: "💻", category: "Programming" },
  { name: "Machine Learning Basics", icon: "🤖", category: "AI" },
  { name: "World History", icon: "🌍", category: "History" },
  { name: "Creative Writing", icon: "✍️", category: "Arts" },
  { name: "Organic Chemistry", icon: "🧪", category: "Science" },
  { name: "Personal Finance", icon: "💰", category: "Business" },
];

export function CustomTopicPage() {
  const navigate = useNavigate();
  const [topic, setTopic] = useState("");
  const [context, setContext] = useState("");

  const handleStartLearning = () => {
    if (!topic.trim()) return;

    navigate("/customize", {
      state: {
        topic: topic.trim(),
        context: context.trim() || undefined,
      },
    });
  };

  const handleSuggestionClick = (suggestion: string) => {
    setTopic(suggestion);
  };

  return (
    <PageLayout>
      <div className="max-w-xl mx-auto px-6 py-8 animate-fade-in-up">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-semibold mb-2">
            What do you want to learn?
          </h1>
          <p className="text-muted-foreground">
            Enter any topic you're curious about — our AI tutors can teach almost anything
          </p>
        </div>

        {/* Topic Input */}
        <div className="space-y-5 mb-8">
          <div>
            <label className="block text-sm font-medium mb-2">
              Topic
            </label>
            <input
              type="text"
              placeholder="e.g., Quantum Physics, Data Structures, Spanish..."
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full px-4 py-3 bg-card border border-border focus:outline-none focus:border-foreground transition-colors text-lg"
            />
          </div>

        </div>

        {/* Suggestions */}
        <div className="mb-8">
          <div className="text-sm text-muted-foreground mb-3">
            Or pick a popular topic:
          </div>
          <div className="grid grid-cols-2 gap-3">
            {SUGGESTED_TOPICS.map((suggestion) => (
              <button
                key={suggestion.name}
                onClick={() => handleSuggestionClick(suggestion.name)}
                className={`p-4 text-left border transition-all ${
                  topic === suggestion.name
                    ? "bg-foreground text-background border-foreground"
                    : "bg-card border-border hover:border-foreground"
                }`}
              >
                <span className="text-2xl block mb-2">{suggestion.icon}</span>
                <span className="font-medium block">{suggestion.name}</span>
                <span
                  className={`text-sm ${
                    topic === suggestion.name
                      ? "text-background/70"
                      : "text-muted-foreground"
                  }`}
                >
                  {suggestion.category}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Start Button */}
        <button
          disabled={!topic.trim()}
          onClick={handleStartLearning}
          className="w-full py-4 bg-foreground text-background font-medium text-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-foreground/90 transition-colors"
        >
          Continue to Tutor Selection →
        </button>
      </div>
    </PageLayout>
  );
}
