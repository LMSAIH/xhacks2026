import { useNavigate } from "react-router-dom";
import { PageLayout } from "@/components/layout";
import { CHARACTERS } from "@/components/customize";
import { BlurFade } from "@/components/ui/blur-fade";

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

        {/* Tutors Preview */}
        <section className="px-6 py-12 border-t border-border bg-card/30">
          <div className="max-w-5xl mx-auto">
            <BlurFade delay={0.1} inView>
              <div className="text-center mb-8">
                <h2 className="text-2xl font-semibold mb-2">Meet Your Tutors</h2>
                <p className="text-muted-foreground">
                  Choose from brilliant minds across history, each with their own teaching style
                </p>
              </div>
            </BlurFade>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {CHARACTERS.map((tutor, index) => (
                <BlurFade key={tutor.id} delay={0.15 + index * 0.05} inView>
                  <div
                    className="text-center group cursor-pointer"
                    onClick={() => navigate("/select-topic")}
                  >
                    <div className="w-full aspect-square overflow-hidden border border-border mb-3 group-hover:border-foreground transition-colors">
                      <img
                        src={tutor.image}
                        alt={tutor.name}
                        className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all"
                      />
                    </div>
                    <div className="font-medium text-sm">{tutor.name}</div>
                    <div className="text-xs text-muted-foreground">{tutor.title}</div>
                  </div>
                </BlurFade>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="px-6 py-16">
          <div className="max-w-4xl mx-auto">
            <BlurFade delay={0.1} inView>
              <div className="text-center mb-12">
                <h2 className="text-2xl font-semibold mb-2">How It Works</h2>
                <p className="text-muted-foreground">
                  Get started in three simple steps
                </p>
              </div>
            </BlurFade>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <BlurFade delay={0.2} inView>
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 bg-muted flex items-center justify-center text-2xl font-bold">
                    1
                  </div>
                  <h3 className="font-semibold mb-2">Choose a Topic</h3>
                  <p className="text-sm text-muted-foreground">
                    Pick from SFU courses or enter any subject you want to learn about
                  </p>
                </div>
              </BlurFade>

              <BlurFade delay={0.3} inView>
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 bg-muted flex items-center justify-center text-2xl font-bold">
                    2
                  </div>
                  <h3 className="font-semibold mb-2">Pick Your Tutor</h3>
                  <p className="text-sm text-muted-foreground">
                    Select a historical figure whose teaching style resonates with you
                  </p>
                </div>
              </BlurFade>

              <BlurFade delay={0.4} inView>
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 bg-muted flex items-center justify-center text-2xl font-bold">
                    3
                  </div>
                  <h3 className="font-semibold mb-2">Start Talking</h3>
                  <p className="text-sm text-muted-foreground">
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
