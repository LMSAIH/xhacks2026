import { useState } from "react";
import { useLocation } from "react-router-dom";
import { NotesEditor } from "@/components/NotesEditor";
import { CourseOutlineSidebar, type OutlineSection } from "@/components/course-outline-sidebar";
import { LectureSidebar, type ChatMessage } from "@/components/lecture-sidebar";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

interface EditorPageState {
  topic?: string;
  sections?: OutlineSection[];
  transcript?: Array<{ id: string; text: string; isUser: boolean; timestamp: Date }>;
  character?: {
    id: string;
    name: string;
    title?: string;
    image?: string;
  };
}

// Default sections if none provided
const defaultSections: OutlineSection[] = [
  {
    id: "1",
    number: "1.0",
    title: "Introduction",
    description: "Overview of the topic and learning objectives",
    duration: "15 min",
    isCompleted: false,
    children: [
      {
        id: "1.1",
        number: "1.1",
        title: "What You'll Learn",
        description: "Key concepts and skills you'll master",
        duration: "5 min",
      },
      {
        id: "1.2",
        number: "1.2",
        title: "Prerequisites",
        description: "Required background knowledge",
        duration: "5 min",
      },
      {
        id: "1.3",
        number: "1.3",
        title: "Getting Started",
        description: "Setting up your learning environment",
        duration: "5 min",
      },
    ],
  },
  {
    id: "2",
    number: "2.0",
    title: "Core Concepts",
    description: "Fundamental principles and theory",
    duration: "45 min",
    isCompleted: false,
    children: [
      {
        id: "2.1",
        number: "2.1",
        title: "Basic Principles",
        description: "Understanding the foundations",
        duration: "15 min",
      },
      {
        id: "2.2",
        number: "2.2",
        title: "Key Terminology",
        description: "Essential vocabulary and definitions",
        duration: "15 min",
      },
      {
        id: "2.3",
        number: "2.3",
        title: "Practical Applications",
        description: "Real-world use cases",
        duration: "15 min",
      },
    ],
  },
  {
    id: "3",
    number: "3.0",
    title: "Advanced Topics",
    description: "Deep dive into complex subjects",
    duration: "30 min",
    isCompleted: false,
    children: [
      {
        id: "3.1",
        number: "3.1",
        title: "Advanced Techniques",
        description: "Expert-level methods and strategies",
        duration: "15 min",
      },
      {
        id: "3.2",
        number: "3.2",
        title: "Best Practices",
        description: "Industry standards and recommendations",
        duration: "15 min",
      },
    ],
  },
  {
    id: "4",
    number: "4.0",
    title: "Practice & Review",
    description: "Reinforce your learning with exercises",
    duration: "30 min",
    isCompleted: false,
    children: [
      {
        id: "4.1",
        number: "4.1",
        title: "Practice Problems",
        description: "Apply what you've learned",
        duration: "15 min",
      },
      {
        id: "4.2",
        number: "4.2",
        title: "Summary & Next Steps",
        description: "Review key points and continue learning",
        duration: "15 min",
      },
    ],
  },
];

export function EditorPage() {
  const location = useLocation();
  const state = location.state as EditorPageState | null;

  const [rightSidebarOpen, setRightSidebarOpen] = useState(true);
  const [activeSectionId, setActiveSectionId] = useState<string>("1");
  
  const topic = state?.topic || "Learning Session";
  const sections = state?.sections || defaultSections;
  const transcript = state?.transcript || [];
  const character = state?.character || {
    id: "default",
    name: "AI Tutor",
    title: "Your Personal Teacher",
  };

  // Helper function to find section title by id
  const findSectionTitle = (id: string, items: OutlineSection[]): string | undefined => {
    for (const item of items) {
      if (item.id === id) return item.title;
      if (item.children) {
        const found = findSectionTitle(id, item.children);
        if (found) return found;
      }
    }
    return undefined;
  };

  const activeSectionTitle = findSectionTitle(activeSectionId, sections) || topic;

  // Convert transcript to chat messages format
  const chatMessages: ChatMessage[] = transcript.map((msg) => ({
    id: msg.id,
    text: msg.text,
    isUser: msg.isUser,
    timestamp: new Date(msg.timestamp),
  }));

  const handleDownloadTranscript = () => {
    if (transcript.length === 0) return;
    
    const transcriptText = transcript
      .map((msg) => `[${msg.isUser ? 'You' : 'AI Tutor'}]: ${msg.text}`)
      .join('\n\n');
    
    const blob = new Blob([transcriptText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcript-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSectionClick = (sectionId: string) => {
    setActiveSectionId(sectionId);
  };

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full overflow-hidden bg-background">
        {/* Left Sidebar - Course Outline */}
        <CourseOutlineSidebar
          topic={topic}
          sections={sections}
          activeSectionId={activeSectionId}
          onSectionClick={handleSectionClick}
        />

        {/* Main Content */}
        <SidebarInset className="flex flex-col flex-1 overflow-hidden">
          {/* Header */}
          <header className="flex items-center justify-between border-b border-border/50 bg-card/30 backdrop-blur-sm px-4 py-0 shrink-0">
         

            <div className="flex items-center gap-2">
              {transcript.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadTranscript}
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  <span className="hidden sm:inline">Transcript</span>
                </Button>
              )}
            </div>
          </header>

          {/* Editor Content */}
          <div className="flex-1 overflow-auto">
            <div className="h-full min-h-full px-0 ">
               
              <NotesEditor 
                sectionId={activeSectionId} 
                sectionTitle={activeSectionTitle}
              />
            </div>
          </div>
        </SidebarInset>

        {/* Right Sidebar - AI Assistant */}
        <div className="relative">
          <LectureSidebar
            messages={chatMessages}
            isOpen={rightSidebarOpen}
            onToggle={() => setRightSidebarOpen(!rightSidebarOpen)}
            character={character}
          />
        </div>
      </div>
    </SidebarProvider>
  );
}
