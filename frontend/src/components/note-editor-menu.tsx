import { insertOrUpdateBlockForSlashMenu } from '@blocknote/core/extensions';
import { getDefaultReactSlashMenuItems } from '@blocknote/react';
import type { DefaultReactSuggestionItem } from '@blocknote/react';
import { Calculator, PenTool, MessageCircleQuestion, BookOpen, ClipboardCheck, FunctionSquare, Lightbulb } from 'lucide-react';

const insert = (
  editor: unknown,
  type: string,
  props: Record<string, unknown>
) => {
  insertOrUpdateBlockForSlashMenu(
    editor as unknown as Parameters<typeof insertOrUpdateBlockForSlashMenu>[0],
    { type, props } as unknown as Parameters<typeof insertOrUpdateBlockForSlashMenu>[1]
  );
};

// Extract plain text from editor blocks
const getEditorContent = (editor: unknown): string => {
  try {
    // Cast to access document property
    const editorWithDoc = editor as { document?: Array<{ type: string; content?: unknown; props?: Record<string, unknown> }> };
    if (!editorWithDoc.document) return '';
    
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
    
    return editorWithDoc.document
      .map((block) => {
        // Skip aiResponse blocks and pen blocks
        if (block.type === 'aiResponse' || block.type === 'pen') return '';
        // Get latex from math blocks
        if (block.type === 'math' && block.props?.latex) {
          return `$$${block.props.latex}$$`;
        }
        return extractText(block.content);
      })
      .filter(Boolean)
      .join('\n\n');
  } catch (e) {
    console.error('Failed to extract editor content:', e);
    return '';
  }
};

/**
 * Creates slash menu items for the notes editor
 * 
 * AI commands use inline input - user types the query after the command:
 * - /Ask What is a heap? 
 * - /Explain binary search trees
 * 
 * /Critique, /Formulas, and /Suggest use context automatically
 */
export function getNotesSlashMenuItems(editor: unknown, sectionTitle?: string): DefaultReactSuggestionItem[] {
  const defaults = getDefaultReactSlashMenuItems(
    editor as unknown as Parameters<typeof getDefaultReactSlashMenuItems>[0]
  ).filter((item) => (item as { key?: string }).key !== 'emoji');

  // Custom blocks
  const formulaItem: DefaultReactSuggestionItem = {
    title: 'Formula',
    onItemClick: () => insert(editor, 'math', { latex: '', displayMode: true }),
    aliases: ['math', 'formula', 'latex'],
    group: 'Custom',
    icon: <Calculator size={18} />,
    subtext: 'LaTeX formula',
  };

  const penItem: DefaultReactSuggestionItem = {
    title: 'Pen',
    onItemClick: () => insert(editor, 'pen', { dataUrl: '' }),
    aliases: ['pen', 'draw', 'sketch'],
    group: 'Custom',
    icon: <PenTool size={18} />,
    subtext: 'Draw until Done',
  };

  // AI-powered items - these create an aiInput block for inline typing
  // The format is: /Ask <query> - user continues typing after selecting
  const askItem: DefaultReactSuggestionItem = {
    title: 'Ask',
    onItemClick: () => {
      insert(editor, 'aiInput', { 
        toolType: 'ask',
        placeholder: 'Type your question...',
      });
    },
    aliases: ['ask', 'question', 'ai', 'help'],
    group: 'AI Tools',
    icon: <MessageCircleQuestion size={18} />,
    subtext: 'Ask AI a question',
  };

  const explainItem: DefaultReactSuggestionItem = {
    title: 'Explain',
    onItemClick: () => {
      insert(editor, 'aiInput', { 
        toolType: 'explain',
        placeholder: 'What concept to explain...',
      });
    },
    aliases: ['explain', 'teach', 'describe'],
    group: 'AI Tools',
    icon: <BookOpen size={18} />,
    subtext: 'Explain a concept',
  };

  const critiqueItem: DefaultReactSuggestionItem = {
    title: 'Critique Notes',
    onItemClick: () => {
      const notes = getEditorContent(editor);
      if (!notes || notes.trim().length < 10) {
        // Insert a message block instead
        insert(editor, 'paragraph', {});
        return;
      }
      
      // Use the new aiCritique block with diff-style suggestions
      insert(editor, 'aiCritique', { 
        notes, 
        critiqueData: '', 
        isLoading: true,
      });
    },
    aliases: ['critique', 'review', 'feedback'],
    group: 'AI Tools',
    icon: <ClipboardCheck size={18} />,
    subtext: 'Get feedback on current notes',
  };

  const formulasItem: DefaultReactSuggestionItem = {
    title: 'Get Formulas',
    onItemClick: () => {
      // Use section title and notes content to determine topic for formulas
      const notes = getEditorContent(editor);
      const topic = sectionTitle || 'current topic';
      const context = notes ? `${topic}\n\nNotes context:\n${notes}` : topic;
      
      // Insert aiResponse block that will auto-generate formulas
      insert(editor, 'aiResponse', { 
        prompt: context,
        response: '',
        toolType: 'formulas',
        isLoading: true,
      });
    },
    aliases: ['formulas', 'equations', 'getformulas'],
    group: 'AI Tools',
    icon: <FunctionSquare size={18} />,
    subtext: 'Get relevant formulas for this section',
  };

  const suggestItem: DefaultReactSuggestionItem = {
    title: 'Suggest Notes',
    onItemClick: () => {
      const notes = getEditorContent(editor);
      // Insert aiResponse block that will generate suggestions
      insert(editor, 'aiResponse', { 
        prompt: notes || 'Generate starter notes',
        response: '',
        toolType: 'suggest',
        isLoading: true,
      });
    },
    aliases: ['suggest', 'generate', 'auto'],
    group: 'AI Tools',
    icon: <Lightbulb size={18} />,
    subtext: 'AI suggests notes to add',
  };

  return [
    ...defaults,
    // Custom blocks
    formulaItem,
    penItem,
    // AI Tools
    askItem,
    explainItem,
    critiqueItem,
    formulasItem,
    suggestItem,
  ];
}
