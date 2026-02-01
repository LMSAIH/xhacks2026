import { useNavigate, useLocation } from "react-router-dom";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export function Navbar() {
  const navigate = useNavigate();

  return (
    <header className="w-full px-6 py-4 border-b border-border bg-background/95 backdrop-blur-sm">
      <div className="max-w-5xl mx-auto flex items-center justify-between">
        {/* Left side - Logo */}
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <div className="w-8 h-8 bg-foreground text-background flex items-center justify-center text-xs font-bold">
            LB
          </div>
          <span className="font-semibold hidden sm:inline">Learn from the Best</span>
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
