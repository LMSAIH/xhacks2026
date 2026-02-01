import { useNavigate } from "react-router-dom";
import { PageLayout } from "@/components/layout";
import { CHARACTERS } from "@/components/customize";
import { BlurFade } from "@/components/ui/blur-fade";
import { Marquee } from "@/components/ui/marquee";

// Duplicate tutors for more content in the marquee
const TUTORS_ROW_1 = [...CHARACTERS];
const TUTORS_ROW_2 = [...CHARACTERS].reverse();

function TutorCard({ tutor, onClick }: { tutor: typeof CHARACTERS[0]; onClick: () => void }) {
  return (
    <div
      className="text-center group cursor-pointer shrink-0 w-32"
      onClick={onClick}
    >
      <div className="w-32 h-32 overflow-hidden border border-border mb-3 group-hover:border-foreground transition-all duration-300">
        <img
          src={tutor.image}
          alt={tutor.name}
          className="w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-300"
        />
      </div>
      <div className="font-medium text-sm">{tutor.name}</div>
      <div className="text-xs text-muted-foreground truncate">{tutor.title}</div>
    </div>
  );
}

export function HomePage() {
  const navigate = useNavigate();

  return (
    <PageLayout>
      <div className="flex-1 flex flex-col">
        {/* Hero - Anthropic style */}
        <section className="flex-1 flex items-center justify-center px-6 py-16 relative overflow-hidden min-h-[80vh]">
          {/* Floating video element - Anthropic style with blend mode */}
          <div className="absolute right-[5%] top-1/2 -translate-y-1/2 w-[400px] h-[500px] hidden lg:block">
            <div className="relative w-full h-full">
              {/* Glow effect behind video */}
              <div className="absolute inset-0 bg-gradient-radial from-foreground/5 to-transparent blur-3xl scale-150" />
              
              {/* Video container with blend mode for theme adaptation */}
              <div className="relative w-full h-full rounded-3xl overflow-hidden opacity-60 mix-blend-luminosity dark:mix-blend-screen">
                <video
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-full object-cover grayscale"
                >
                  <source src="/einstein_video.mp4" type="video/mp4" />
                </video>
              </div>
              
              {/* Soft edge fade */}
              <div className="absolute inset-0 bg-gradient-to-l from-transparent via-transparent to-background pointer-events-none" />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/50 pointer-events-none" />
            </div>
          </div>
          
          <div className="max-w-4xl mx-auto relative z-10 lg:mr-auto lg:ml-[10%]">
            {/* Main headline - Anthropic style large text */}
            <BlurFade delay={0.1} inView>
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-medium mb-8 leading-[1.1] tracking-tight">
                Learn from History's
                <br />
                <span className="text-muted-foreground">Greatest Minds</span>
              </h1>
            </BlurFade>

            {/* Subtitle */}
            <BlurFade delay={0.2} inView>
              <p className="text-lg md:text-xl text-muted-foreground mb-12 max-w-lg leading-relaxed">
                Have natural voice conversations with AI tutors modeled after
                legendary thinkers. Ask questions, explore ideas, learn anything.
              </p>
            </BlurFade>

            {/* CTA Buttons - Clean, minimal */}
            <BlurFade delay={0.3} inView>
              <div className="flex flex-col sm:flex-row items-start gap-4">
                <button
                  onClick={() => navigate("/select-topic")}
                  className="group px-6 py-3 bg-foreground text-background font-medium hover:bg-foreground/90 transition-all inline-flex items-center gap-2"
                >
                  Start Learning 
                  <span className="group-hover:translate-x-1 transition-transform">→</span>
                </button>
                <button
                  onClick={() => navigate("/voice")}
                  className="px-6 py-3 text-muted-foreground hover:text-foreground font-medium transition-colors inline-flex items-center gap-2"
                >
                  Try a Demo
                </button>
              </div>
            </BlurFade>

            {/* Subtle trust line */}
            <BlurFade delay={0.4} inView>
              <p className="text-sm text-muted-foreground/60 mt-16">
                Free to try • No account required
              </p>
            </BlurFade>
          </div>
        </section>

        {/* Tutors Preview - Marquee */}
        <section className="py-16 border-t border-border overflow-hidden">
          <div className="max-w-5xl mx-auto px-6">
            <BlurFade delay={0.1} inView>
              <div className="mb-10">
                <h2 className="text-3xl font-medium mb-3">Meet Your Tutors</h2>
                <p className="text-muted-foreground">
                  Choose from brilliant minds across history
                </p>
              </div>
            </BlurFade>
          </div>

          {/* First row - moves left */}
          <BlurFade delay={0.2} inView>
            <Marquee pauseOnHover className="[--duration:30s] mb-6">
              {TUTORS_ROW_1.map((tutor) => (
                <TutorCard
                  key={tutor.id}
                  tutor={tutor}
                  onClick={() => navigate("/select-topic")}
                />
              ))}
            </Marquee>
          </BlurFade>

          {/* Second row - moves right */}
          <BlurFade delay={0.3} inView>
            <Marquee reverse pauseOnHover className="[--duration:35s]">
              {TUTORS_ROW_2.map((tutor) => (
                <TutorCard
                  key={tutor.id}
                  tutor={tutor}
                  onClick={() => navigate("/select-topic")}
                />
              ))}
            </Marquee>
          </BlurFade>
        </section>

        {/* How it works */}
        <section className="px-6 py-20 border-t border-border">
          <div className="max-w-4xl mx-auto">
            <BlurFade delay={0.1} inView>
              <div className="text-center mb-16">
                <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Simple Process</p>
                <h2 className="text-3xl font-bold mb-3">How It Works</h2>
                <p className="text-muted-foreground">
                  Get started in three simple steps
                </p>
              </div>
            </BlurFade>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <BlurFade delay={0.2} inView className="h-full">
                <div className="group h-full p-6 border-2 border-foreground hover:bg-foreground hover:text-background transition-all duration-300">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 border-2 border-foreground group-hover:border-background flex items-center justify-center text-xl font-bold transition-colors duration-300">
                      1
                    </div>
                  </div>
                  <h3 className="font-semibold text-lg mb-2">Choose a Topic</h3>
                  <p className="text-sm text-muted-foreground group-hover:text-background/70 leading-relaxed transition-colors duration-300">
                    Pick from SFU courses or enter any subject you want to learn about
                  </p>
                </div>
              </BlurFade>

              <BlurFade delay={0.3} inView className="h-full">
                <div className="group h-full p-6 border-2 border-foreground hover:bg-foreground hover:text-background transition-all duration-300">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 border-2 border-foreground group-hover:border-background flex items-center justify-center text-xl font-bold transition-colors duration-300">
                      2
                    </div>
                  </div>
                  <h3 className="font-semibold text-lg mb-2">Pick Your Tutor</h3>
                  <p className="text-sm text-muted-foreground group-hover:text-background/70 leading-relaxed transition-colors duration-300">
                    Select a historical figure whose teaching style resonates with you
                  </p>
                </div>
              </BlurFade>

              <BlurFade delay={0.4} inView className="h-full">
                <div className="group h-full p-6 border-2 border-foreground hover:bg-foreground hover:text-background transition-all duration-300">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 border-2 border-foreground group-hover:border-background flex items-center justify-center text-xl font-bold transition-colors duration-300">
                      3
                    </div>
                  </div>
                  <h3 className="font-semibold text-lg mb-2">Start Talking</h3>
                  <p className="text-sm text-muted-foreground group-hover:text-background/70 leading-relaxed transition-colors duration-300">
                    Have a natural voice conversation — ask questions, get explanations
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
