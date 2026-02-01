import { insertOrUpdateBlockForSlashMenu } from '@blocknote/core/extensions';
import { getDefaultReactSlashMenuItems } from '@blocknote/react';
import type { DefaultReactSuggestionItem } from '@blocknote/react';
import { Calculator, PenTool } from 'lucide-react';

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

export function getNotesSlashMenuItems(editor: unknown): DefaultReactSuggestionItem[] {
  const defaults = getDefaultReactSlashMenuItems(
    editor as unknown as Parameters<typeof getDefaultReactSlashMenuItems>[0]
  ).filter((item) => (item as { key?: string }).key !== 'emoji');

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

  return [...defaults, formulaItem, penItem];
}
