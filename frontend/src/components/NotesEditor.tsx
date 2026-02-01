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
import { useState, useCallback, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { ReactSketchCanvas, type ReactSketchCanvasRef } from 'react-sketch-canvas';
import { getNotesSlashMenuItems } from '@/components/note-editor-menu';
import * as Button from '@/components/ui/button';
import * as Card from '@/components/ui/card';
import { Button as ShadButton } from '@/components/ui/button';
import { useTheme } from '@/components/ui/theme-provider';
import { Loader2, Sparkles, Copy, Check, Plus, X, CheckCircle, AlertCircle, PlusCircle, MinusCircle, MessageSquare } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8787';

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

// --- AI Response block ---
type AIResponseBlockContentProps = {
  block: { 
    id: string; 
    props: { 
      prompt: string; 
      response: string; 
      toolType: string;
      isLoading: boolean;
    } 
  };
  editor: { 
    updateBlock: (id: string, partial: { props: Partial<AIResponseBlockContentProps['block']['props']> }) => void;
    removeBlocks: (ids: string[]) => void;
    insertBlocks: (blocks: Array<{ type: string; props?: Record<string, unknown>; content?: unknown }>, referenceBlock: string, placement: 'before' | 'after') => void;
    tryParseMarkdownToBlocks: (markdown: string) => Promise<Array<{ type: string; props?: Record<string, unknown>; content?: unknown }>>;
  };
};

function AIResponseBlockContent({ block, editor }: AIResponseBlockContentProps) {
  const [copied, setCopied] = useState(false);
  const [added, setAdded] = useState(false);
  const hasRun = useRef(false);
  
  const { prompt, response, toolType, isLoading } = block.props;
  
  // Run the AI request on mount if no response yet
  useEffect(() => {
    if (hasRun.current || response || !prompt) return;
    hasRun.current = true;
    
    const runAI = async () => {
      editor.updateBlock(block.id, { props: { isLoading: true } });
      
      try {
        // Determine endpoint based on tool type
        let endpoint = '/api/mcp/ask';
        let payload: Record<string, unknown> = { question: prompt };
        
        switch (toolType) {
          case 'explain':
            endpoint = '/api/mcp/explain';
            payload = { concept: prompt };
            break;
          case 'critique':
            endpoint = '/api/mcp/critique';
            payload = { notes: prompt };
            break;
          case 'formulas':
            endpoint = '/api/mcp/formulas';
            payload = { topic: prompt };
            break;
          default:
            endpoint = '/api/mcp/ask';
            payload = { question: prompt };
        }
        
        const res = await fetch(`${BACKEND_URL}${endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        
        const data = await res.json();
        
        editor.updateBlock(block.id, { 
          props: { 
            response: data.response || data.error || 'No response',
            isLoading: false,
          } 
        });
      } catch (e) {
        editor.updateBlock(block.id, { 
          props: { 
            response: `Error: ${e}`,
            isLoading: false,
          } 
        });
      }
    };
    
    runAI();
  }, [block.id, editor, prompt, response, toolType]);
  
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(response);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [response]);
  
  // Add response content as proper BlockNote blocks (parsed from markdown)
  const handleAddToNotes = useCallback(async () => {
    if (!response) return;
    
    try {
      // Parse markdown to BlockNote blocks
      const blocks = await editor.tryParseMarkdownToBlocks(response);
      
      if (blocks.length > 0) {
        // Insert the parsed blocks after this AI response block
        editor.insertBlocks(blocks, block.id, 'after');
        
        // For critique and explain, remove the AI block after adding to notes
        if (toolType === 'critique' || toolType === 'explain') {
          // Small delay to ensure blocks are inserted first
          setTimeout(() => {
            editor.removeBlocks([block.id]);
          }, 100);
        } else {
          setAdded(true);
          setTimeout(() => setAdded(false), 2000);
        }
      }
    } catch (e) {
      console.error('Failed to parse markdown:', e);
      // Fallback: insert as plain paragraphs
      const paragraphs = response.split(/\n\n+/).filter(p => p.trim());
      const fallbackBlocks = paragraphs.map(text => ({
        type: 'paragraph' as const,
        content: [{ type: 'text' as const, text: text.trim() }],
      }));
      
      if (fallbackBlocks.length > 0) {
        editor.insertBlocks(fallbackBlocks, block.id, 'after');
        if (toolType === 'critique' || toolType === 'explain') {
          setTimeout(() => {
            editor.removeBlocks([block.id]);
          }, 100);
        } else {
          setAdded(true);
          setTimeout(() => setAdded(false), 2000);
        }
      }
    }
  }, [block.id, editor, response, toolType]);
  
  // Loading state
  if (isLoading) {
    const loadingText = toolType === 'critique' 
      ? 'Reviewing your notes...' 
      : toolType === 'explain'
      ? 'Preparing explanation...'
      : toolType === 'formulas'
      ? 'Finding formulas...'
      : 'Thinking...';
    
    return (
      <div className="my-2 p-4 rounded-lg border border-primary/20 bg-primary/5">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>{loadingText}</span>
        </div>
      </div>
    );
  }
  
  if (!prompt && !response) {
    return (
      <div className="my-2 p-4 rounded-lg border border-border bg-muted/20">
        <p className="text-sm text-muted-foreground">AI response block</p>
      </div>
    );
  }
  
  // Get header label based on tool type
  const getHeaderLabel = () => {
    switch (toolType) {
      case 'explain': return 'Explanation';
      case 'critique': return 'Notes Review';
      case 'formulas': return 'Formulas';
      default: return 'Answer';
    }
  };
  
  // For critique, don't show the prompt (it's the full notes content)
  const showPrompt = toolType !== 'critique';
  
  // Button label for add to notes
  const addButtonTitle = toolType === 'critique' 
    ? 'Apply feedback to notes' 
    : 'Add to notes';
  
  return (
    <div className="my-2 rounded-lg border border-primary/20 bg-primary/5 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-primary/10 bg-primary/10">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-xs font-medium text-primary">{getHeaderLabel()}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleAddToNotes}
            className="p-1 hover:bg-primary/20 rounded transition-colors"
            title={addButtonTitle}
          >
            {added ? (
              <Check className="h-3 w-3 text-green-500" />
            ) : (
              <Plus className="h-3 w-3 text-muted-foreground" />
            )}
          </button>
          <button
            onClick={handleCopy}
            className="p-1 hover:bg-primary/20 rounded transition-colors"
            title="Copy to clipboard"
          >
            {copied ? (
              <Check className="h-3 w-3 text-green-500" />
            ) : (
              <Copy className="h-3 w-3 text-muted-foreground" />
            )}
          </button>
        </div>
      </div>
      
      {/* Prompt - only show for non-critique */}
      {showPrompt && prompt && (
        <div className="px-3 py-2 border-b border-primary/10 bg-primary/5">
          <p className="text-xs text-muted-foreground italic">"{prompt}"</p>
        </div>
      )}
      
      {/* Response with Markdown rendering */}
      <div className="px-3 py-3">
        <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-ol:my-1 prose-li:my-0">
          <ReactMarkdown
            remarkPlugins={[remarkGfm, remarkMath]}
            rehypePlugins={[rehypeKatex]}
          >
            {response}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}

const AIResponseBlock = createReactBlockSpec(
  createBlockConfig(() => ({
    type: 'aiResponse' as const,
    propSchema: {
      prompt: { default: '' },
      response: { default: '' },
      toolType: { default: 'ask' },
      isLoading: { default: false },
    },
    content: 'none' as const,
  })),
  {
    render: ({ block, editor }) => (
      <AIResponseBlockContent
        block={block as unknown as AIResponseBlockContentProps['block']}
        editor={editor as unknown as AIResponseBlockContentProps['editor']}
      />
    ),
  }
);

// --- AI Input block (inline prompt input) ---
type AIInputBlockContentProps = {
  block: { 
    id: string; 
    props: { 
      toolType: string;
      placeholder: string;
    } 
  };
  editor: { 
    updateBlock: (id: string, partial: { type?: string; props?: Record<string, unknown> }) => void;
    removeBlocks: (ids: string[]) => void;
    insertBlocks: (blocks: Array<{ type: string; props?: Record<string, unknown> }>, referenceBlock: string, placement: 'before' | 'after') => void;
  };
};

function AIInputBlockContent({ block, editor }: AIInputBlockContentProps) {
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const { toolType, placeholder } = block.props;
  
  // Auto-focus on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  
  const handleSubmit = useCallback(() => {
    if (!input.trim()) return;
    
    // Replace this input block with an aiResponse block
    editor.updateBlock(block.id, {
      type: 'aiResponse',
      props: {
        prompt: input.trim(),
        response: '',
        toolType,
        isLoading: true,
      },
    });
  }, [block.id, editor, input, toolType]);
  
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape') {
      // Remove the block on escape
      editor.removeBlocks([block.id]);
    }
  }, [block.id, editor, handleSubmit]);
  
  const toolLabel = toolType === 'ask' ? 'Ask AI' : toolType === 'explain' ? 'Explain' : toolType === 'formulas' ? 'Get Formulas' : 'AI';
  
  return (
    <div className="my-2 rounded-lg border border-primary/30 bg-primary/5 overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2">
        <Sparkles className="h-4 w-4 text-primary flex-shrink-0" />
        <span className="text-xs font-medium text-primary flex-shrink-0">{toolLabel}:</span>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1 bg-transparent border-0 outline-none text-sm placeholder:text-muted-foreground/50"
        />
        <span className="text-xs text-muted-foreground/50 flex-shrink-0">Enter to submit</span>
      </div>
    </div>
  );
}

const AIInputBlock = createReactBlockSpec(
  createBlockConfig(() => ({
    type: 'aiInput' as const,
    propSchema: {
      toolType: { default: 'ask' },
      placeholder: { default: 'Type your question...' },
    },
    content: 'none' as const,
  })),
  {
    render: ({ block, editor }) => (
      <AIInputBlockContent
        block={block as unknown as AIInputBlockContentProps['block']}
        editor={editor as unknown as AIInputBlockContentProps['editor']}
      />
    ),
  }
);

// --- AI Critique block (diff-style with accept/reject) ---
interface NoteSuggestion {
  type: 'addition' | 'deletion' | 'modification' | 'comment';
  original?: string;
  suggested?: string;
  reason: string;
  priority: 'high' | 'medium' | 'low';
  location?: string;
}

interface CritiqueResult {
  suggestions: NoteSuggestion[];
  overallFeedback: string;
  strengths: string[];
  score?: number;
}

type AICritiqueBlockContentProps = {
  block: { 
    id: string; 
    props: { 
      notes: string;
      critiqueData: string; // JSON stringified CritiqueResult
      isLoading: boolean;
    } 
  };
  editor: { 
    updateBlock: (id: string, partial: { props: Partial<AICritiqueBlockContentProps['block']['props']> }) => void;
    removeBlocks: (ids: string[]) => void;
    insertBlocks: (blocks: Array<{ type: string; props?: Record<string, unknown>; content?: unknown }>, referenceBlock: string, placement: 'before' | 'after') => void;
    tryParseMarkdownToBlocks: (markdown: string) => Promise<Array<{ type: string; props?: Record<string, unknown>; content?: unknown }>>;
    document: Array<{ id: string; type: string; content?: unknown; props?: Record<string, unknown> }>;
  };
};

function SuggestionCard({ 
  suggestion, 
  onAccept, 
  onReject,
  accepted,
  rejected,
}: { 
  suggestion: NoteSuggestion; 
  onAccept: () => void; 
  onReject: () => void;
  accepted: boolean;
  rejected: boolean;
}) {
  const getTypeIcon = () => {
    switch (suggestion.type) {
      case 'addition': return <PlusCircle className="h-4 w-4 text-green-500" />;
      case 'deletion': return <MinusCircle className="h-4 w-4 text-red-500" />;
      case 'modification': return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'comment': return <MessageSquare className="h-4 w-4 text-blue-500" />;
    }
  };
  
  const getTypeLabel = () => {
    switch (suggestion.type) {
      case 'addition': return 'Add';
      case 'deletion': return 'Remove';
      case 'modification': return 'Change';
      case 'comment': return 'Note';
    }
  };
  
  const getPriorityColor = () => {
    switch (suggestion.priority) {
      case 'high': return 'border-l-red-500';
      case 'medium': return 'border-l-yellow-500';
      case 'low': return 'border-l-blue-500';
    }
  };
  
  if (accepted || rejected) {
    return (
      <div className={`p-2 rounded text-xs ${accepted ? 'bg-green-500/10 text-green-600' : 'bg-muted/50 text-muted-foreground line-through'}`}>
        {accepted ? <Check className="h-3 w-3 inline mr-1" /> : <X className="h-3 w-3 inline mr-1" />}
        {getTypeLabel()}: {suggestion.suggested || suggestion.original || suggestion.reason}
      </div>
    );
  }
  
  return (
    <div className={`border-l-4 ${getPriorityColor()} bg-card rounded-r p-3 space-y-2`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-medium">
          {getTypeIcon()}
          <span>{getTypeLabel()}</span>
          {suggestion.location && (
            <span className="text-muted-foreground">({suggestion.location})</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onAccept}
            className="p-1 hover:bg-green-500/20 rounded transition-colors"
            title="Accept suggestion"
          >
            <Check className="h-4 w-4 text-green-500" />
          </button>
          <button
            onClick={onReject}
            className="p-1 hover:bg-red-500/20 rounded transition-colors"
            title="Reject suggestion"
          >
            <X className="h-4 w-4 text-red-500" />
          </button>
        </div>
      </div>
      
      {/* Show diff for modifications */}
      {suggestion.type === 'modification' && suggestion.original && (
        <div className="text-sm space-y-1">
          <div className="bg-red-500/10 text-red-700 dark:text-red-300 px-2 py-1 rounded line-through">
            {suggestion.original}
          </div>
          <div className="bg-green-500/10 text-green-700 dark:text-green-300 px-2 py-1 rounded">
            {suggestion.suggested}
          </div>
        </div>
      )}
      
      {/* Show just addition */}
      {suggestion.type === 'addition' && suggestion.suggested && (
        <div className="text-sm bg-green-500/10 text-green-700 dark:text-green-300 px-2 py-1 rounded">
          + {suggestion.suggested}
        </div>
      )}
      
      {/* Show deletion */}
      {suggestion.type === 'deletion' && suggestion.original && (
        <div className="text-sm bg-red-500/10 text-red-700 dark:text-red-300 px-2 py-1 rounded line-through">
          - {suggestion.original}
        </div>
      )}
      
      {/* Reason */}
      <p className="text-xs text-muted-foreground italic">{suggestion.reason}</p>
    </div>
  );
}

function AICritiqueBlockContent({ block, editor }: AICritiqueBlockContentProps) {
  const hasRun = useRef(false);
  const [suggestionStates, setSuggestionStates] = useState<Record<number, 'accepted' | 'rejected' | null>>({});
  
  const { notes, critiqueData, isLoading } = block.props;
  
  // Parse critique data
  const critique: CritiqueResult | null = critiqueData ? (() => {
    try {
      return JSON.parse(critiqueData) as CritiqueResult;
    } catch {
      return null;
    }
  })() : null;
  
  // Run the critique request on mount
  useEffect(() => {
    if (hasRun.current || critiqueData || !notes) return;
    hasRun.current = true;
    
    const runCritique = async () => {
      editor.updateBlock(block.id, { props: { isLoading: true } });
      
      try {
        const res = await fetch(`${BACKEND_URL}/api/mcp/critique-diff`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notes }),
        });
        
        const data = await res.json();
        
        editor.updateBlock(block.id, { 
          props: { 
            critiqueData: JSON.stringify(data),
            isLoading: false,
          } 
        });
      } catch (e) {
        console.error('Critique error:', e);
        editor.updateBlock(block.id, { 
          props: { 
            critiqueData: JSON.stringify({
              suggestions: [],
              overallFeedback: `Error getting feedback: ${e}`,
              strengths: [],
            }),
            isLoading: false,
          } 
        });
      }
    };
    
    runCritique();
  }, [block.id, editor, notes, critiqueData]);
  
  // Handle accepting a suggestion - this should apply the change to the notes
  const handleAccept = useCallback(async (index: number, suggestion: NoteSuggestion) => {
    setSuggestionStates(prev => ({ ...prev, [index]: 'accepted' }));
    
    // For additions, insert the suggested content at the end
    if (suggestion.type === 'addition' && suggestion.suggested) {
      try {
        const blocks = await editor.tryParseMarkdownToBlocks(suggestion.suggested);
        if (blocks.length > 0) {
          // Find the last non-AI block to insert after
          const lastContentBlock = [...editor.document].reverse().find(
            b => b.type !== 'aiCritique' && b.type !== 'aiResponse' && b.type !== 'aiInput'
          );
          if (lastContentBlock) {
            editor.insertBlocks(blocks, lastContentBlock.id, 'after');
          }
        }
      } catch (e) {
        console.error('Failed to apply addition:', e);
      }
    }
    
    // For modifications and deletions, we'd need to find and replace text
    // This is complex because we need to find the original text in the blocks
    // For now, we'll just mark it as accepted and the user can manually apply
    
  }, [editor]);
  
  const handleReject = useCallback((index: number) => {
    setSuggestionStates(prev => ({ ...prev, [index]: 'rejected' }));
  }, []);
  
  // Dismiss the critique block
  const handleDismiss = useCallback(() => {
    editor.removeBlocks([block.id]);
  }, [block.id, editor]);
  
  // Accept all pending suggestions
  const handleAcceptAll = useCallback(async () => {
    if (!critique) return;
    
    for (let i = 0; i < critique.suggestions.length; i++) {
      if (!suggestionStates[i]) {
        await handleAccept(i, critique.suggestions[i]);
      }
    }
  }, [critique, suggestionStates, handleAccept]);
  
  // Loading state
  if (isLoading) {
    return (
      <div className="my-2 p-4 rounded-lg border border-primary/20 bg-primary/5">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Analyzing your notes...</span>
        </div>
      </div>
    );
  }
  
  if (!critique) {
    return (
      <div className="my-2 p-4 rounded-lg border border-border bg-muted/20">
        <p className="text-sm text-muted-foreground">No critique data available</p>
      </div>
    );
  }
  
  // Count pending/accepted/rejected
  const pending = critique.suggestions.filter((_, i) => !suggestionStates[i]).length;
  const accepted = Object.values(suggestionStates).filter(s => s === 'accepted').length;
  
  return (
    <div className="my-2 rounded-lg border border-primary/20 bg-primary/5 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-primary/10 bg-primary/10">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-xs font-medium text-primary">Notes Review</span>
          {critique.score && (
            <span className="text-xs bg-primary/20 px-1.5 py-0.5 rounded">
              Score: {critique.score}/10
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {pending > 0 && (
            <button
              onClick={handleAcceptAll}
              className="text-xs text-green-600 hover:underline"
            >
              Accept all ({pending})
            </button>
          )}
          <button
            onClick={handleDismiss}
            className="p-1 hover:bg-primary/20 rounded transition-colors"
            title="Dismiss"
          >
            <X className="h-3 w-3 text-muted-foreground" />
          </button>
        </div>
      </div>
      
      {/* Overall feedback */}
      <div className="px-3 py-2 border-b border-primary/10">
        <p className="text-sm">{critique.overallFeedback}</p>
        {critique.strengths.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {critique.strengths.map((strength, i) => (
              <span key={i} className="text-xs bg-green-500/10 text-green-600 px-2 py-0.5 rounded">
                {strength}
              </span>
            ))}
          </div>
        )}
      </div>
      
      {/* Suggestions */}
      {critique.suggestions.length > 0 ? (
        <div className="p-3 space-y-2">
          <div className="text-xs text-muted-foreground mb-2">
            {pending > 0 ? `${pending} suggestions remaining` : `${accepted} changes applied`}
          </div>
          {critique.suggestions.map((suggestion, index) => (
            <SuggestionCard
              key={index}
              suggestion={suggestion}
              onAccept={() => handleAccept(index, suggestion)}
              onReject={() => handleReject(index)}
              accepted={suggestionStates[index] === 'accepted'}
              rejected={suggestionStates[index] === 'rejected'}
            />
          ))}
        </div>
      ) : (
        <div className="p-3">
          <div className="flex items-center gap-2 text-sm text-green-600">
            <CheckCircle className="h-4 w-4" />
            <span>Your notes look great! No specific changes needed.</span>
          </div>
        </div>
      )}
    </div>
  );
}

const AICritiqueBlock = createReactBlockSpec(
  createBlockConfig(() => ({
    type: 'aiCritique' as const,
    propSchema: {
      notes: { default: '' },
      critiqueData: { default: '' },
      isLoading: { default: false },
    },
    content: 'none' as const,
  })),
  {
    render: ({ block, editor }) => (
      <AICritiqueBlockContent
        block={block as unknown as AICritiqueBlockContentProps['block']}
        editor={editor as unknown as AICritiqueBlockContentProps['editor']}
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
    aiResponse: AIResponseBlock(),
    aiInput: AIInputBlock(),
    aiCritique: AICritiqueBlock(),
  },
});

// --- Notes editor ---
interface NotesEditorProps {
  sectionId: string;
  sectionTitle: string;
}

// Ref handle exposed to parent components
export interface NotesEditorHandle {
  getContent: () => string;
  insertCritiqueBlock: (critiqueData: unknown) => void;
  insertResponseBlock: (toolType: string, prompt: string, response: string) => void;
}

// Sanitize section ID for use as localStorage key
function sanitizeStorageKey(id: string): string {
  return id.replace(/[^a-zA-Z0-9-_]/g, '_');
}

// Extract plain text from editor blocks (shared helper)
function extractEditorContent(document: Array<{ type: string; content?: unknown; props?: Record<string, unknown> }>): string {
  const extractText = (content: unknown): string => {
    if (!content) return '';
    if (typeof content === 'string') return content;
    if (Array.isArray(content)) {
      return content.map((item) => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object') {
          if ('text' in item) return (item as { text: string }).text;
          if ('content' in item) return extractText((item as { content: unknown }).content);
        }
        return '';
      }).join('');
    }
    return '';
  };
  
  return document
    .map((block) => {
      // Skip aiResponse blocks and pen blocks
      if (block.type === 'aiResponse' || block.type === 'aiCritique' || block.type === 'pen') return '';
      // Get latex from math blocks
      if (block.type === 'math' && block.props?.latex) {
        return `$$${block.props.latex}$$`;
      }
      return extractText(block.content);
    })
    .filter(Boolean)
    .join('\n\n');
}

// Inner component that gets remounted when sectionId changes
const NotesEditorInner = forwardRef<NotesEditorHandle, NotesEditorProps>(
  function NotesEditorInner({ sectionId, sectionTitle }, ref) {
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

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    getContent: () => {
      return extractEditorContent(editor.document as Array<{ type: string; content?: unknown; props?: Record<string, unknown> }>);
    },
    insertCritiqueBlock: (critiqueData: unknown) => {
      // Find the last block to insert after
      const lastBlock = editor.document[editor.document.length - 1];
      if (lastBlock) {
        editor.insertBlocks(
          [{
            type: 'aiCritique' as const,
            props: {
              notes: '',
              critiqueData: JSON.stringify(critiqueData),
              isLoading: false,
            },
          }],
          lastBlock.id,
          'after'
        );
      }
    },
    insertResponseBlock: (toolType: string, prompt: string, response: string) => {
      // Find the last block to insert after
      const lastBlock = editor.document[editor.document.length - 1];
      if (lastBlock) {
        editor.insertBlocks(
          [{
            type: 'aiResponse' as const,
            props: {
              prompt,
              response,
              toolType,
              isLoading: false,
            },
          }],
          lastBlock.id,
          'after'
        );
      }
    },
  }), [editor]);

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
});

// Wrapper component that forces remount when section changes
export const NotesEditor = forwardRef<NotesEditorHandle, NotesEditorProps>(
  function NotesEditor({ sectionId, sectionTitle }, ref) {
  // Use both sectionId and sectionTitle in key to ensure remount on either change
  return <NotesEditorInner key={`${sectionId}-${sectionTitle}`} ref={ref} sectionId={sectionId} sectionTitle={sectionTitle} />;
});
