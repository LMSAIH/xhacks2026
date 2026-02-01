import { useNavigate, useLocation } from "react-router-dom";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export function Navbar() {
  const navigate = useNavigate();

  return (
    <header className="w-full px-6 py-4 border-b border-border bg-background/95 backdrop-blur-sm">
      <div className="max-w-5xl mx-auto flex items-center justify-between">
        {/* Left side - Brand */}
        <button
          onClick={() => navigate("/")}
          className="hover:opacity-80 transition-opacity"
        >
          <span className="text-xl font-bold tracking-tight">LearnLM</span>
        </button>

        {/* Right side - Navigation & Theme Toggle */}
        <nav className="flex items-center gap-2">
          <NavLink to="/select-topic" label="Start Learning" />
          <NavLink to="/voice" label="Demo" />
          <div className="ml-2">
            <ThemeToggle />
          </div>
        </nav>
      </div>
    </header>
  );
}

function NavLink({ to, label }: { to: string; label: string }) {
  const navigate = useNavigate();
  const location = useLocation();
  const isActive = location.pathname === to || location.pathname.startsWith(to + "/");

  return (
    <button
      onClick={() => navigate(to)}
      className={`px-3 py-1.5 text-sm font-medium transition-all ${
        isActive
          ? "bg-foreground text-background"
          : "text-muted-foreground hover:text-foreground hover:bg-muted"
      }`}
    >
      {label}
    </button>
  );
}
