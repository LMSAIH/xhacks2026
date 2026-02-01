import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageLayout } from "@/components/layout";

const SUGGESTED_TOPICS = [
  { name: "JavaScript Fundamentals", category: "Programming" },
  { name: "Machine Learning Basics", category: "AI" },
  { name: "World History", category: "History" },
  { name: "Creative Writing", category: "Arts" },
  { name: "Organic Chemistry", category: "Science" },
  { name: "Personal Finance", category: "Business" },
];

export function CustomTopicPage() {
  const navigate = useNavigate();
  const [topic, setTopic] = useState("");

  const handleStartLearning = () => {
    if (!topic.trim()) return;

    navigate("/customize", {
      state: {
        topic: topic.trim(),
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
          <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-3">
            Custom Topic
          </p>
          <h1 className="text-2xl md:text-3xl font-display font-semibold mb-2">
            What do you want to learn?
          </h1>
          <p className="text-muted-foreground">
            Enter any topic you're curious about — our AI tutors can teach almost anything
          </p>
        </div>

        {/* Topic Input */}
        <div className="space-y-5 mb-8">
          <div>
            <label className="block text-xs font-mono uppercase tracking-widest text-muted-foreground mb-2">
              Topic
            </label>
            <input
              type="text"
              placeholder="e.g., Quantum Physics, Data Structures, Spanish..."
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full px-4 py-3 bg-card border-2 border-border focus:outline-none focus:border-foreground transition-colors text-lg"
            />
          </div>

        </div>

        {/* Suggestions */}
        <div className="mb-8">
          <div className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-3">
            Or pick a popular topic
          </div>
          <div className="grid grid-cols-2 gap-3">
            {SUGGESTED_TOPICS.map((suggestion) => (
              <button
                key={suggestion.name}
                onClick={() => handleSuggestionClick(suggestion.name)}
                className={`relative p-4 text-left border-2 transition-all ${
                  topic === suggestion.name
                    ? "bg-foreground text-background border-foreground"
                    : "bg-card border-border hover:border-foreground"
                }`}
              >
                {/* Corner brackets */}
                <span className={`absolute top-1 left-1 text-[10px] font-mono ${topic === suggestion.name ? "text-background/40" : "text-muted-foreground/40"}`}>┌</span>
                <span className={`absolute top-1 right-1 text-[10px] font-mono ${topic === suggestion.name ? "text-background/40" : "text-muted-foreground/40"}`}>┐</span>
                <span className={`absolute bottom-1 left-1 text-[10px] font-mono ${topic === suggestion.name ? "text-background/40" : "text-muted-foreground/40"}`}>└</span>
                <span className={`absolute bottom-1 right-1 text-[10px] font-mono ${topic === suggestion.name ? "text-background/40" : "text-muted-foreground/40"}`}>┘</span>
                
                <span className="font-display font-medium block">{suggestion.name}</span>
                <span
                  className={`text-xs font-mono ${
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
          className="group w-full py-4 bg-foreground text-background font-display font-medium text-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-foreground/90 transition-colors flex items-center justify-center gap-2"
        >
          Continue to Tutor Selection
          <span className="inline-block transition-transform group-hover:translate-x-1">→</span>
        </button>
      </div>
    </PageLayout>
  );
}
