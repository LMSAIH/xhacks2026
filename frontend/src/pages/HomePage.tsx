import { PageLayout } from '@/components/layout';
import {
  HeroSection,
  TutorsSection,
  McpSection,
  HowItWorksSection,
} from '@/components/home';

export function HomePage() {
  return (
    <PageLayout>
      <div className="flex-1 flex flex-col overflow-x-clip">
        <HeroSection />
        <TutorsSection />
        <McpSection />
        <HowItWorksSection />
      </div>
    </PageLayout>
  );
}
