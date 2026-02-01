import { useNavigate } from 'react-router-dom';
import { BlurFade } from '@/components/ui/blur-fade';
import { useEffect, useRef, useState } from 'react';

export function HeroSection() {
  const navigate = useNavigate();
  const boxRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      if (!boxRef.current) return;
      
      const rect = boxRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      
      // Start when box enters viewport, end when top of box is at 30% from top
      const start = windowHeight;
      const end = windowHeight * 1;
      const progress = Math.min(Math.max((start - rect.top) / (start - end), 0), 1);
      
      setScrollProgress(progress);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Calculate dynamic values based on scroll progress
  const borderRadius = 16 * (1 - scrollProgress); // 16px to 0px
  // Extra width in pixels to add on each side (0 to enough to fill viewport)
  const extraWidthPercent = scrollProgress * 50; // 0% to 50% on each side

  return (
    <section className="pt-16">
      <div className="max-w-7xl mx-auto ">
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
          <div 
            ref={boxRef}
            className="relative bg-black will-change-transform"
            style={{
              marginLeft: `calc(-${extraWidthPercent}vw - 1.5rem)`,
              marginRight: `calc(-${extraWidthPercent}vw - 1.5rem)`,
              paddingLeft: `calc(${extraWidthPercent}vw + 1.5rem)`,
              paddingRight: `calc(${extraWidthPercent}vw + 1.5rem)`,
              borderRadius: `${borderRadius}px`,
              transition: 'margin 0.1s ease-out, padding 0.1s ease-out, border-radius 0.1s ease-out',
            }}
          >
            {/* Content container - stays fixed width */}
            <div className="grid lg:grid-cols-2 gap-0">
              {/* Left: Figure/Video */}
              <div className="relative h-125 lg:h-150 flex items-center justify-center p-8 lg:p-12">
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
                <div className="absolute inset-0 bg-linear-to-b from-black/40 via-transparent to-black/40 pointer-events-none" />
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
        </BlurFade>
      </div>
    </section>
  );
}
