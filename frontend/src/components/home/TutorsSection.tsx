import { useNavigate } from 'react-router-dom';
import { CHARACTERS } from '@/components/customize';
import { BlurFade } from '@/components/ui/blur-fade';
import { Marquee } from '@/components/ui/marquee';
import { TutorCard } from './TutorCard';

const ALL_TUTORS = [...CHARACTERS, ...CHARACTERS];

export function TutorsSection() {
  const navigate = useNavigate();

  return (
    <section className="py-12 border-t border-border overflow-hidden bg-muted">
      <div className="max-w-7xl mx-auto mb-6">
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
  );
}
