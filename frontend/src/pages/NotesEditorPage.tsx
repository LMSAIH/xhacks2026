import { PageLayout } from "@/components/layout";
import { NotesEditor } from "@/components/NotesEditor";
import { BlurFade } from "@/components/ui/blur-fade";

export function NotesEditorPage() {
  return (
    <PageLayout hideFooter>
      <div className="flex-1 flex flex-col h-full">
        {/* Header */}
        <BlurFade delay={0.1}>
          <div className="border-b border-border px-6 py-4">
            <h1 className="text-2xl font-bold">Notes</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Take notes during your learning session. Supports math equations, code blocks, and sketches.
            </p>
          </div>
        </BlurFade>

        {/* Editor */}
        <BlurFade delay={0.2}>
          <div className="flex-1 px-6 py-4">
            <NotesEditor />
          </div>
        </BlurFade>
      </div>
    </PageLayout>
  );
}
