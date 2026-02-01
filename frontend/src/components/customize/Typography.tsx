import type { ReactNode } from "react";

// Standard typography components for consistent styling across customize flow

interface TypographyProps {
  children: ReactNode;
  className?: string;
}

export function StepTitle({ children, className = "" }: TypographyProps) {
  return (
    <h2 className={`text-2xl md:text-3xl font-display tracking-tight ${className}`}>
      {children}
    </h2>
  );
}

export function StepDescription({ children, className = "" }: TypographyProps) {
  return (
    <p className={`text-sm text-muted-foreground leading-relaxed ${className}`}>
      {children}
    </p>
  );
}

export function SectionLabel({ children, className = "" }: TypographyProps) {
  return (
    <div className={`text-xs text-muted-foreground uppercase tracking-widest font-mono ${className}`}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className = "" }: TypographyProps) {
  return (
    <div className={`font-display font-semibold ${className}`}>
      {children}
    </div>
  );
}

export function CardSubtitle({ children, className = "" }: TypographyProps) {
  return (
    <div className={`text-xs text-muted-foreground font-mono ${className}`}>
      {children}
    </div>
  );
}

export function CardDescription({ children, className = "" }: TypographyProps) {
  return (
    <p className={`text-sm text-foreground/80 ${className}`}>
      {children}
    </p>
  );
}

export function HelpText({ children, className = "" }: TypographyProps) {
  return (
    <p className={`text-sm text-muted-foreground ${className}`}>
      {children}
    </p>
  );
}
