import { BlurFade } from '@/components/ui/blur-fade';

function StepCard({ number, title, description, delay }: { 
  number: number; 
  title: string; 
  description: string;
  delay: number;
}) {
  return (
    <BlurFade delay={delay} inView className="h-full">
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
            {number}
          </div>
        </div>
        <h3 className="font-display text-lg mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground group-hover:text-background/70 leading-relaxed transition-colors duration-300">
          {description}
        </p>
      </div>
    </BlurFade>
  );
}

export function HowItWorksSection() {
  return (
    <section className="py-20 border-t border-border bg-muted">
      <div className="max-w-7xl mx-auto">
        <BlurFade delay={0.1} inView>
          <div className="text-left mb-16">
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
          <StepCard
            number={1}
            title="Choose a Topic"
            description="Pick from SFU courses or enter any subject you want to learn about"
            delay={0.2}
          />
          <StepCard
            number={2}
            title="Pick Your Tutor"
            description="Select a historical figure whose teaching style resonates with you"
            delay={0.3}
          />
          <StepCard
            number={3}
            title="Start Talking"
            description="Have a natural voice conversation — ask questions, get explanations"
            delay={0.4}
          />
        </div>
      </div>
    </section>
  );
}
