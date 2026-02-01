import type { ReactNode } from "react";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { BlurFade } from "@/components/ui/blur-fade";

interface PageLayoutProps {
  children: ReactNode;
  hideFooter?: boolean;
}

export function PageLayout({
  children,
  hideFooter = false,
}: PageLayoutProps) {
  return (
    <BlurFade delay={0} duration={0.6} blur="12px" direction="up" offset={0}>
      <div className="min-h-screen flex flex-col bg-background dot-pattern relative">
        <Navbar />
        <main className="flex-1 overflow-auto">{children}</main>
        {!hideFooter && <Footer />}
      </div>
    </BlurFade>
  );
}
