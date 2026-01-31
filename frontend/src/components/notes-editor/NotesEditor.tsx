import '@blocknote/core/fonts/inter.css';
import {
  BlockNoteSchema,
  createCodeBlockSpec,
  defaultBlockSpecs,
} from '@blocknote/core';
import { BlockNoteView } from '@blocknote/shadcn';
import '@blocknote/shadcn/style.css';
import { useCreateBlockNote } from '@blocknote/react';
import { codeBlockOptions } from '@blocknote/code-block';
import * as Button from '@/components/ui/button';
import * as Card from '@/components/ui/card';

// Schema without image/video/audio/file (media blocks are optional and don't work out of the box)
/* eslint-disable @typescript-eslint/no-unused-vars -- destructuring to omit media block types */
const { image, video, audio, file, ...blockSpecsWithoutMedia } =
  defaultBlockSpecs;

const schema = BlockNoteSchema.create({
  blockSpecs: {
    ...blockSpecsWithoutMedia,
    codeBlock: createCodeBlockSpec(codeBlockOptions),
  },
});

// Slash menu is editable: use slashMenu={false} + SuggestionMenuController with getItems
// to add/remove/reorder items (see BlockNote docs: Suggestion Menus).

export function NotesEditor() {
  const editor = useCreateBlockNote({ schema });

  return (
    <div className="h-full w-full min-h-[400px] rounded-lg border border-border bg-card">
      <BlockNoteView
        editor={editor}
        theme="dark"
        shadCNComponents={{
          Button,
          Card,
        }}
      />
    </div>
  );
}
