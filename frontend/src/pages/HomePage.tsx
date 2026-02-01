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
        {/* Hero */}
        <section className="flex-1 flex flex-col items-center justify-center px-6 py-16">
          <div className="max-w-3xl mx-auto text-center">
            {/* Main headline */}
            <BlurFade delay={0.1} inView>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
                Learn from History's
                <br />
                Greatest Minds
              </h1>
            </BlurFade>

            {/* Subtitle */}
            <BlurFade delay={0.2} inView>
              <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-xl mx-auto">
                Have natural voice conversations with AI tutors modeled after
                legendary thinkers. Ask questions, explore ideas, learn anything.
              </p>
            </BlurFade>

            {/* CTA Buttons */}
            <BlurFade delay={0.3} inView>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
                <button
                  onClick={() => navigate("/select-topic")}
                  className="px-8 py-4 bg-foreground text-background font-semibold text-lg hover:bg-foreground/90 transition-colors w-full sm:w-auto"
                >
                  Start Learning →
                </button>
                <button
                  onClick={() => navigate("/voice")}
                  className="px-8 py-4 border-2 border-border font-medium hover:border-foreground transition-colors w-full sm:w-auto"
                >
                  Try a Demo First
                </button>
              </div>
            </BlurFade>

            {/* Social proof / trust */}
            <BlurFade delay={0.4} inView>
              <p className="text-sm text-muted-foreground">
                Free to try • No account required • Works on any device
              </p>
            </BlurFade>
          </div>
        </section>

        {/* Tutors Preview - Marquee */}
        <section className="py-12 border-y-2 border-foreground bg-card overflow-hidden">
          <div className="max-w-5xl mx-auto px-6">
            <BlurFade delay={0.1} inView>
              <div className="text-center mb-8">
                <h2 className="text-2xl font-semibold mb-2">Meet Your Tutors</h2>
                <p className="text-muted-foreground">
                  Choose from brilliant minds across history, each with their own teaching style
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
