import { useNavigate } from 'react-router-dom';
import { PageLayout } from '@/components/layout';
import { CHARACTERS } from '@/components/customize';
import { BlurFade } from '@/components/ui/blur-fade';
import { Marquee } from '@/components/ui/marquee';
import { useEffect, useRef, useState } from 'react';

// All tutors in one row for single-line marquee
const ALL_TUTORS = [...CHARACTERS, ...CHARACTERS];

function TutorCard({
  tutor,
  onClick,
}: {
  tutor: (typeof CHARACTERS)[0];
  onClick: () => void;
}) {
  return (
    <div
      className="text-center group cursor-pointer shrink-0 w-28"
      onClick={onClick}
    >
      <div className="w-28 h-28 overflow-hidden border border-border mb-2 group-hover:border-foreground transition-all duration-300">
        <img
          src={tutor.image}
          alt={tutor.name}
          className="w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-300"
        />
      </div>
      <div className="font-medium text-sm font-mono">{tutor.name}</div>
      <div className="text-xs text-muted-foreground truncate">
        {tutor.title}
      </div>
    </div>
  );
}

function McpExampleBox({
  title,
  description,
  snippet,
  ide,
}: {
  title: string;
  description: string;
  snippet: string;
  ide?: string;
}) {
  return (
    <div className="border border-border bg-card hover:border-foreground transition-all duration-300 overflow-hidden h-full flex flex-col">
      {/* Title bar - terminal style */}
      <div className="border-b border-border px-4 py-2 bg-muted/50 flex items-center justify-between flex-shrink-0">
        <span className="font-mono text-xs font-medium">{title}</span>
        {ide && (
          <span className="font-mono text-xs text-muted-foreground">{ide}</span>
        )}
      </div>

      {/* Content - flex-grow to fill available space */}
      <div className="p-4 flex flex-col flex-grow">
        <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
          {description}
        </p>
        <div className="bg-muted/50 border border-border p-3 rounded font-mono text-xs overflow-x-auto flex-grow">
          <pre className="whitespace-pre-wrap break-words">{snippet}</pre>
        </div>
      </div>
    </div>
  );
}

export function HomePage() {
  const navigate = useNavigate();
  const boxRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      if (!boxRef.current) return;
      
      const boxTop = boxRef.current.offsetTop;
      const scrollY = window.scrollY;
      const windowHeight = window.innerHeight;
      
      // Start expanding when box is 60% into viewport, complete when fully past
      const start = boxTop - windowHeight * 0.4;
      const end = boxTop + windowHeight * 1.5;
      const progress = Math.min(Math.max((scrollY - start) / (end - start), 0), 1);
      
      // Ease out cubic for ultra-smooth transition
      const eased = 1 - Math.pow(1 - progress, 3);
      setScrollProgress(eased);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial calculation
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Calculate dynamic values based on scroll progress - very subtle
  const maxWidth = 85 + (scrollProgress * 15); // 85% to 100% (more subtle)
  const borderRadius = 16 * (1 - scrollProgress); // 16px to 0px
  const paddingX = 24 - (scrollProgress * 24); // Remove horizontal padding as it expands

  return (
    <PageLayout>
      <div className="flex-1 flex flex-col">
        {/* Hero Section */}
        <section className="px-6 py-16 lg:py-24">
          <div className="max-w-7xl mx-auto">
            {/* Header and Title */}
            <div className="mb-12 lg:mb-16">
              {/* Main headline */}
              <BlurFade delay={0.1} inView>
                <h1 className="text-5xl md:text-6xl lg:text-7xl font-display mb-8 leading-[1.1] tracking-tight">
                  Learn from History's
                  <br />
                  <span className="text-muted-foreground">Greatest Minds</span>
                </h1>
              </BlurFade>

              {/* Subtitle */}
              <BlurFade delay={0.2} inView>
                <p className="text-lg md:text-xl text-muted-foreground mb-8 leading-relaxed max-w-2xl">
                  Have natural voice conversations with AI tutors modeled after
                  legendary thinkers. Ask questions, explore ideas, learn anything.
                </p>
              </BlurFade>

              {/* CTA Buttons */}
              <BlurFade delay={0.3} inView>
                <div className="flex flex-col sm:flex-row items-start gap-4 mb-6">
                  <button
                    onClick={() => navigate('/select-topic')}
                    className="group px-6 py-3 bg-foreground text-background font-medium hover:bg-foreground/90 transition-all inline-flex items-center gap-2"
                  >
                    Start Learning 
                    <span className="group-hover:translate-x-1 transition-transform">→</span>
                  </button>
                  <button
                    onClick={() => navigate('/voice')}
                    className="px-6 py-3 text-muted-foreground hover:text-foreground font-medium transition-colors inline-flex items-center gap-2"
                  >
                    Try a Demo
                  </button>
                </div>
              </BlurFade>

              {/* Trust line */}
              <BlurFade delay={0.4} inView>
                <p className="text-sm text-muted-foreground/60">
                  Free to try • No account required
                </p>
              </BlurFade>
            </div>

            {/* Expanding Black Box with Figure and Data */}
            <BlurFade delay={0.5} inView>
              <div className="relative" style={{ paddingLeft: `${paddingX}px`, paddingRight: `${paddingX}px` }}>
                <div 
                  ref={boxRef}
                  className="bg-black dark:bg-black overflow-hidden mx-auto will-change-transform"
                  style={{
                    maxWidth: `${maxWidth}%`,
                    borderRadius: `${borderRadius}px`,
                    transition: 'max-width 0.1s linear, border-radius 0.1s linear',
                  }}
                >
                  <div className="grid lg:grid-cols-2 gap-0">
                    {/* Left: Figure/Video */}
                    <div className="relative h-[500px] lg:h-[600px] flex items-center justify-center p-8 lg:p-12">
                      {/* Subtle ambient glow */}
                      <div className="absolute inset-0 bg-gradient-radial from-white/3 to-transparent blur-3xl" />
                      
                      {/* Video container */}
                      <div className="relative w-full h-full overflow-hidden">
                        <video
                          autoPlay
                          loop
                          muted
                          playsInline
                          className="w-full h-full object-cover opacity-40 mix-blend-screen"
                        >
                          <source src="/einstein_video.mp4" type="video/mp4" />
                        </video>
                      </div>
                      
                      {/* Subtle vignette */}
                      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/40 pointer-events-none" />
                    </div>

                    {/* Right: Additional Data */}
                    <div className="relative p-8 lg:p-12 flex flex-col justify-center text-white">
                      <p className="text-xs uppercase tracking-widest text-white/60 mb-4 font-mono">Featured</p>
                      <h2 className="text-3xl lg:text-4xl font-display mb-4 leading-tight">
                        AI-Powered Learning
                      </h2>
                      <p className="text-white/80 mb-6 leading-relaxed">
                        Experience personalized tutoring sessions with historical figures. 
                        Each mentor adapts their teaching style to help you master any subject.
                      </p>
                      <div className="space-y-3 text-sm">
                        <div className="flex items-center gap-3">
                          <div className="w-1.5 h-1.5 bg-white/60 rounded-full"></div>
                          <span className="text-white/70">Voice-based conversations</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-1.5 h-1.5 bg-white/60 rounded-full"></div>
                          <span className="text-white/70">Course-specific knowledge</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-1.5 h-1.5 bg-white/60 rounded-full"></div>
                          <span className="text-white/70">Multiple teaching personas</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </BlurFade>
          </div>
        </section>

        {/* Tutors Preview - Single line */}
        <section className="py-12 border-t border-border overflow-hidden bg-muted/30">
          <div className="max-w-6xl mx-auto px-6 mb-6">
            <BlurFade delay={0.1} inView>
              <h2 className="text-2xl font-display inline">
                Meet your mentors
              </h2>
              <span className="text-muted-foreground ml-3">
                — choose from history's greatest minds
              </span>
            </BlurFade>
          </div>

          {/* Single marquee row */}
          <BlurFade delay={0.2} inView>
            <Marquee pauseOnHover className="[--duration:40s]">
              {ALL_TUTORS.map((tutor, idx) => (
                <TutorCard
                  key={`${tutor.id}-${idx}`}
                  tutor={tutor}
                  onClick={() => navigate('/select-topic')}
                />
              ))}
            </Marquee>
          </BlurFade>
        </section>

        {/* MCP Integration Showcase */}
        <section className="px-6 py-20 border-t border-border">
          <div className="max-w-6xl mx-auto">
            <BlurFade delay={0.1} inView>
              <div className="mb-12">
                <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3 font-mono">
                  MCP Integration
                </p>
                <h2 className="text-3xl font-display mb-4">
                  LearnLM works in your IDE
                </h2>
                <p className="text-muted-foreground max-w-2xl">
                  Use our Model Context Protocol server with Cursor, VS Code,
                  Claude Desktop, and more. Get tutoring help, search courses,
                  and critique notes directly in your editor.
                </p>
              </div>
            </BlurFade>

            {/* MCP Examples Grid - Unified sizing */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              <BlurFade delay={0.2} inView>
                <McpExampleBox
                  title="Search Courses"
                  ide="Cursor / VS Code"
                  description="Find SFU courses with text search, department filters, and prerequisite lookup."
                  snippet={`Use the learnlm tools to search for CMPT 225

// Or with filters:
search_courses({
  "department": "CMPT",
  "level": "300"
})`}
                />
              </BlurFade>

              <BlurFade delay={0.25} inView>
                <McpExampleBox
                  title="Start Tutoring Session"
                  ide="Claude Desktop"
                  description="Begin an AI tutoring session with course context and your preferred teaching style."
                  snippet={`start_tutoring_session({
  "courseCode": "CMPT 225",
  "topic": "recursion",
  "persona": "socratic"
})`}
                />
              </BlurFade>

              <BlurFade delay={0.3} inView>
                <McpExampleBox
                  title="Critique Notes"
                  ide="Cursor"
                  description="Get feedback on your study notes with course-specific context from our knowledge base."
                  snippet={`Use LearnLM to critique my notes in @chapter1-notes.md for CMPT 225

// Focuses on clarity, completeness, and accuracy`}
                />
              </BlurFade>

              <BlurFade delay={0.35} inView>
                <McpExampleBox
                  title="Explain Concepts"
                  ide="VS Code"
                  description="Ask questions about course material and get explanations with examples and diagrams."
                  snippet={`explain_concept({
  "concept": "Big O notation",
  "courseCode": "CMPT 225",
  "includeExamples": true
})`}
                />
              </BlurFade>

              <BlurFade delay={0.4} inView>
                <McpExampleBox
                  title="Voice & Personas"
                  ide="OpenCode"
                  description="List available AI voices and teaching personas for your tutoring sessions."
                  snippet={`list_personas()
// Returns: socratic, professor, mentor, standard

get_voice_for_course({
  "courseCode": "CMPT 120"
})`}
                />
              </BlurFade>

              <BlurFade delay={0.45} inView>
                <McpExampleBox
                  title="Quick Setup"
                  ide="Remote Server"
                  description="Add LearnLM to your IDE with our hosted MCP server. No local setup required."
                  snippet={`// Add to Cursor's mcp.json:
{
  "mcpServers": {
    "learnlm": {
      "type": "http",
      "url": "https://mcp.learn-lm.com/mcp"
    }
  }
}`}
                />
              </BlurFade>
            </div>

            <BlurFade delay={0.5} inView>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  20+ tools available • Full documentation in{' '}
                  <a
                    href="/docs/mcp"
                    className="underline hover:text-foreground transition-colors font-mono"
                  >
                    docs/MCP.md
                  </a>
                </p>
              </div>
            </BlurFade>
          </div>
        </section>

        {/* How it works */}
        <section className="px-6 py-20 border-t border-border bg-muted/30">
          <div className="max-w-4xl mx-auto">
            <BlurFade delay={0.1} inView>
              <div className="text-center mb-16">
                <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3 font-mono">
                  Simple Process
                </p>
                <h2 className="text-3xl font-display mb-3">How It Works</h2>
                <p className="text-muted-foreground">
                  Get started in three simple steps
                </p>
              </div>
            </BlurFade>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <BlurFade delay={0.2} inView className="h-full">
                <div className="group h-full p-6 border-2 border-foreground hover:bg-foreground hover:text-background transition-all duration-300 relative">
                  {/* Terminal-style corner brackets */}
                  <div className="absolute top-2 left-2 text-border group-hover:text-background/30 transition-colors font-mono text-xs">
                    ┌
                  </div>
                  <div className="absolute top-2 right-2 text-border group-hover:text-background/30 transition-colors font-mono text-xs">
                    ┐
                  </div>
                  <div className="absolute bottom-2 left-2 text-border group-hover:text-background/30 transition-colors font-mono text-xs">
                    └
                  </div>
                  <div className="absolute bottom-2 right-2 text-border group-hover:text-background/30 transition-colors font-mono text-xs">
                    ┘
                  </div>

                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 border-2 border-foreground group-hover:border-background flex items-center justify-center text-xl font-bold font-mono transition-colors duration-300">
                      1
                    </div>
                  </div>
                  <h3 className="font-display text-lg mb-2">Choose a Topic</h3>
                  <p className="text-sm text-muted-foreground group-hover:text-background/70 leading-relaxed transition-colors duration-300">
                    Pick from SFU courses or enter any subject you want to learn
                    about
                  </p>
                </div>
              </BlurFade>

              <BlurFade delay={0.3} inView className="h-full">
                <div className="group h-full p-6 border-2 border-foreground hover:bg-foreground hover:text-background transition-all duration-300 relative">
                  {/* Terminal-style corner brackets */}
                  <div className="absolute top-2 left-2 text-border group-hover:text-background/30 transition-colors font-mono text-xs">
                    ┌
                  </div>
                  <div className="absolute top-2 right-2 text-border group-hover:text-background/30 transition-colors font-mono text-xs">
                    ┐
                  </div>
                  <div className="absolute bottom-2 left-2 text-border group-hover:text-background/30 transition-colors font-mono text-xs">
                    └
                  </div>
                  <div className="absolute bottom-2 right-2 text-border group-hover:text-background/30 transition-colors font-mono text-xs">
                    ┘
                  </div>

                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 border-2 border-foreground group-hover:border-background flex items-center justify-center text-xl font-bold font-mono transition-colors duration-300">
                      2
                    </div>
                  </div>
                  <h3 className="font-display text-lg mb-2">Pick Your Tutor</h3>
                  <p className="text-sm text-muted-foreground group-hover:text-background/70 leading-relaxed transition-colors duration-300">
                    Select a historical figure whose teaching style resonates
                    with you
                  </p>
                </div>
              </BlurFade>

              <BlurFade delay={0.4} inView className="h-full">
                <div className="group h-full p-6 border-2 border-foreground hover:bg-foreground hover:text-background transition-all duration-300 relative">
                  {/* Terminal-style corner brackets */}
                  <div className="absolute top-2 left-2 text-border group-hover:text-background/30 transition-colors font-mono text-xs">
                    ┌
                  </div>
                  <div className="absolute top-2 right-2 text-border group-hover:text-background/30 transition-colors font-mono text-xs">
                    ┐
                  </div>
                  <div className="absolute bottom-2 left-2 text-border group-hover:text-background/30 transition-colors font-mono text-xs">
                    └
                  </div>
                  <div className="absolute bottom-2 right-2 text-border group-hover:text-background/30 transition-colors font-mono text-xs">
                    ┘
                  </div>

                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 border-2 border-foreground group-hover:border-background flex items-center justify-center text-xl font-bold font-mono transition-colors duration-300">
                      3
                    </div>
                  </div>
                  <h3 className="font-display text-lg mb-2">Start Talking</h3>
                  <p className="text-sm text-muted-foreground group-hover:text-background/70 leading-relaxed transition-colors duration-300">
                    Have a natural voice conversation — ask questions, get
                    explanations
                  </p>
                </div>
              </BlurFade>
            </div>
          </div>
        </section>
      </div>
    </PageLayout>
  );
}
