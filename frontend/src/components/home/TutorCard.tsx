import { CHARACTERS } from '@/components/customize';

interface TutorCardProps {
  tutor: (typeof CHARACTERS)[0];
  onClick: () => void;
}

export function TutorCard({ tutor, onClick }: TutorCardProps) {
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
