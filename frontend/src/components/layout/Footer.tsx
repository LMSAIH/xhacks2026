import { useNavigate } from "react-router-dom";

export function Footer() {
  const navigate = useNavigate();

  return (
    <footer className="w-full px-6 py-4 border-t border-border bg-background/95 backdrop-blur-sm">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/")}
              className="hover:opacity-80 transition-opacity"
            >
              <span className="text-sm font-bold tracking-tight">LearnLM</span>
            </button>
            <span className="text-muted-foreground text-xs">© 2026</span>
          </div>

          {/* Links */}
          <nav className="flex items-center gap-2">
            <button
              onClick={() => navigate("/select-topic")}
              className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
            >
              Start Learning
            </button>
            <button
              onClick={() => navigate("/voice")}
              className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
            >
              Demo
            </button>
          </nav>
        </div>
      </div>
    </footer>
  );
}
