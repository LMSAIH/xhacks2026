import { BlurFade } from '@/components/ui/blur-fade';
import { McpExampleBox } from './McpExampleBox';

export function McpSection() {
  return (
    <section className="py-20 border-t border-border bg-background">
      <div className="max-w-7xl mx-auto">
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

        {/* MCP Examples Grid */}
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
  );
}
