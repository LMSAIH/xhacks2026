import 'katex/dist/katex.min.css';
import '@blocknote/core/fonts/inter.css';
import { BlockNoteView } from '@blocknote/shadcn';
import '@blocknote/shadcn/style.css';
import {
  BlockNoteSchema,
  createBlockConfig,
  createCodeBlockSpec,
  defaultBlockSpecs,
} from '@blocknote/core';
import { codeBlockOptions } from '@blocknote/code-block';
import { useCreateBlockNote, SuggestionMenuController, createReactBlockSpec } from '@blocknote/react';
import { filterSuggestionItems } from '@blocknote/core/extensions';
import katex from 'katex';
// @ts-expect-error no types for react-katex
import { BlockMath, InlineMath } from 'react-katex';
import { useState, useCallback, useRef, useEffect } from 'react';
import { ReactSketchCanvas, type ReactSketchCanvasRef } from 'react-sketch-canvas';
import { getNotesSlashMenuItems } from '@/components/note-editor-menu';
import * as Button from '@/components/ui/button';
import * as Card from '@/components/ui/card';
import { Button as ShadButton } from '@/components/ui/button';
import { useTheme } from '@/components/ui/theme-provider';

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// --- Math block ---
function isLatexValid(latex: string, displayMode: boolean): boolean {
  try {
    katex.renderToString(latex, { throwOnError: true, displayMode });
    return true;
  } catch {
    return false;
  }
}

type MathBlockContentProps = {
  block: { id: string; props: { latex: string; displayMode: boolean } };
  editor: {
    updateBlock: (
      id: string,
      partial: { props: { latex: string; displayMode: boolean } }
    ) => void;
  };
};

function MathBlockContent({ block, editor }: MathBlockContentProps) {
  const [editing, setEditing] = useState(!block.props.latex);
  const [input, setInput] = useState(block.props.latex);

  const save = useCallback(() => {
    editor.updateBlock(block.id, {
      props: { latex: input, displayMode: block.props.displayMode },
    });
    setEditing(false);
  }, [block.id, block.props.displayMode, editor, input]);

  const displayMode = block.props.displayMode;
  const latex = block.props.latex;

  if (editing) {
    return (
      <div className="my-1">
        <input
          type="text"
          className="w-full border-0 border-b border-border/50 bg-transparent px-0 py-1 text-sm outline-none focus:border-primary"
          placeholder="LaTeX, e.g. E = mc^2"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              save();
            }
          }}
        />
        {input && (
          <div className="mt-1.5 overflow-x-auto text-sm">
            {displayMode ? (
              <BlockMath math={input} />
            ) : (
              <InlineMath math={input} />
            )}
          </div>
        )}
      </div>
    );
  }

  if (!latex) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="my-1 text-sm text-muted-foreground hover:text-foreground"
      >
        Add formula
      </button>
    );
  }

  if (!isLatexValid(latex, displayMode)) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="my-1 text-sm text-destructive hover:underline"
      >
        Invalid LaTeX — click to edit
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="my-1 block w-full overflow-x-auto text-left text-sm"
    >
      {displayMode ? (
        <BlockMath math={latex} />
      ) : (
        <InlineMath math={latex} />
      )}
    </button>
  );
}

const MathBlock = createReactBlockSpec(
  createBlockConfig(() => ({
    type: 'math' as const,
    propSchema: {
      latex: { default: '' },
      displayMode: { default: true },
    },
    content: 'none' as const,
  })),
  {
    render: ({ block, editor }) => (
      <MathBlockContent
        block={block as unknown as MathBlockContentProps['block']}
        editor={editor as unknown as MathBlockContentProps['editor']}
      />
    ),
  }
);

// --- Pen block ---
const PEN_HEIGHT = 280;

type PenBlockContentProps = {
  block: { id: string; props: { dataUrl: string } };
  editor: { updateBlock: (id: string, partial: { props: { dataUrl: string } }) => void };
};

function PenBlockContent({ block, editor }: PenBlockContentProps) {
  const canvasRef = useRef<ReactSketchCanvasRef>(null);

  const handleDone = useCallback(async () => {
    if (!canvasRef.current) return;
    const dataUrl = await canvasRef.current.exportImage('png');
    editor.updateBlock(block.id, { props: { dataUrl } });
  }, [block.id, editor]);

  if (block.props.dataUrl) {
    return (
      <div className="my-2 w-full overflow-hidden rounded-lg border border-border">
        <img
          src={block.props.dataUrl}
          alt="Drawing"
          className="max-h-[400px] w-auto rounded-lg object-contain"
        />
      </div>
    );
  }

  return (
    <div className="my-2 w-full overflow-hidden rounded-lg border border-border bg-muted/20">
      <div className="rounded-t-lg border-b border-border bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground">
        Pen — draw then click Done
      </div>
      <div style={{ height: PEN_HEIGHT }} className="relative w-full">
        <ReactSketchCanvas
          ref={canvasRef}
          width="100%"
          height="100%"
          strokeWidth={2}
          strokeColor="currentColor"
          canvasColor="transparent"
          style={{ border: 'none' }}
        />
      </div>
      <div className="flex justify-end gap-2 border-t border-border bg-muted/40 px-3 py-2">
        <ShadButton type="button" variant="secondary" size="sm" onClick={handleDone}>
          Done
        </ShadButton>
      </div>
    </div>
  );
}

const PenBlock = createReactBlockSpec(
  createBlockConfig(() => ({
    type: 'pen' as const,
    propSchema: {
      dataUrl: { default: '' },
    },
    content: 'none' as const,
  })),
  {
    render: ({ block, editor }) => (
      <PenBlockContent
        block={block as unknown as PenBlockContentProps['block']}
        editor={editor as unknown as PenBlockContentProps['editor']}
      />
    ),
  }
);

// --- Schema (no circular dep: blocks and schema defined in same file) ---
/* eslint-disable @typescript-eslint/no-unused-vars -- destructuring to omit block types */
const { video, audio, ...blockSpecsWithImageAndFile } = defaultBlockSpecs;

const notesSchema = BlockNoteSchema.create({
  blockSpecs: {
    ...blockSpecsWithImageAndFile,
    codeBlock: createCodeBlockSpec(codeBlockOptions),
    math: MathBlock(),
    pen: PenBlock(),
  },
});

// --- Notes editor ---
interface NotesEditorProps {
  sectionId: string;
  sectionTitle: string;
}

// Sanitize section ID for use as localStorage key
function sanitizeStorageKey(id: string): string {
  return id.replace(/[^a-zA-Z0-9-_]/g, '_');
}

// Inner component that gets remounted when sectionId changes
function NotesEditorInner({ sectionId, sectionTitle }: NotesEditorProps) {
  const { resolvedTheme } = useTheme();
  const storageKey = `notes-section-${sanitizeStorageKey(sectionId)}`;
  
  // Create default content with section title as heading
  const getDefaultContent = () => [
    {
      type: "heading" as const,
      props: { level: 1 },
      content: sectionTitle,
    },
    {
      type: "paragraph" as const,
      content: "",
    },
  ];

  // Load initial content from localStorage or use default
  const getInitialContent = () => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return getDefaultContent();
      }
    }
    return getDefaultContent();
  };

  const editor = useCreateBlockNote({
    schema: notesSchema,
    uploadFile: async (file: File) => fileToDataUrl(file),
    initialContent: getInitialContent(),
  });

  // Save to localStorage on change
  useEffect(() => {
    const saveContent = () => {
      const content = editor.document;
      localStorage.setItem(storageKey, JSON.stringify(content));
    };

    editor.onChange(saveContent);
  }, [editor, storageKey]);

  return (
    <div className="h-full w-full min-h-[400px] rounded-lg border border-border bg-card">
      <BlockNoteView
        editor={editor}
        theme={resolvedTheme}
        slashMenu={false}
        shadCNComponents={{
          Button,
          Card,
        }}
      >
        <SuggestionMenuController
          triggerCharacter="/"
          getItems={async (query) =>
            filterSuggestionItems(
              getNotesSlashMenuItems(editor),
              query
            )
          }
        />
      </BlockNoteView>
    </div>
  );
}

// Wrapper component that forces remount when section changes
export function NotesEditor({ sectionId, sectionTitle }: NotesEditorProps) {
  // Use both sectionId and sectionTitle in key to ensure remount on either change
  return <NotesEditorInner key={`${sectionId}-${sectionTitle}`} sectionId={sectionId} sectionTitle={sectionTitle} />;
}
