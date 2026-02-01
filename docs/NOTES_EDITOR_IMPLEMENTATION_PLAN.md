# Notes Editor — Full Implementation Plan

This plan integrates **BlockNote** (with Shadcn) into the app as the notes canvas, keeps the default **"/" slash menu** for styling/blocks, and uses a **keyboard shortcut** for your custom AI menu. It also lists extra features to add later and what to look into for each.

---

## Part 1: Step-by-step — BlockNote canvas integration

### Step 1: Install BlockNote packages

In `frontend/`:

```bash
npm install @blocknote/core @blocknote/react @blocknote/shadcn
```

Use only these three packages (no `@blocknote/xl-*`) so everything stays free (MPL-2.0).

---

### Step 2: Tailwind — allow BlockNote’s classes

BlockNote (Shadcn) uses Tailwind classes that must be included in the build. In **Tailwind v4** you use `@source`.

**File:** [frontend/src/index.css](frontend/src/index.css)

- Add this **after** your existing `@import "tailwindcss";` (and before `@layer base`):

```css
@import "tailwindcss";

/* BlockNote: generate utility classes used by @blocknote/shadcn */
@source "../node_modules/@blocknote/shadcn";

@layer base {
  /* ... keep your existing :root and styles ... */
}
```

The path is relative to the CSS file: with `index.css` in `frontend/src/`, use `../node_modules/@blocknote/shadcn` so it resolves to `frontend/node_modules/@blocknote/shadcn`. If your CSS lives elsewhere, adjust accordingly.

---

### Step 3: Minimal notes editor component

Create the BlockNote editor wrapper so it uses the Shadcn view and your app’s styling.

**New file:** `frontend/src/components/notes-editor/NotesEditor.tsx`

- Import BlockNote fonts (required by BlockNote).
- Import BlockNote Shadcn style.
- Use `useCreateBlockNote()` (no custom schema yet).
- Render `BlockNoteView` from `@blocknote/shadcn` with `editor={editor}`.
- Optionally pass `shadCNComponents={{ Button, Card }}` so it uses your existing Shadcn Button and Card; other UI (dropdowns, etc.) will use BlockNote’s built-in Shadcn-style components until you add more.

**Imports to use:**

```ts
import "@blocknote/core/fonts/inter.css";
import { BlockNoteView } from "@blocknote/shadcn";
import "@blocknote/shadcn/style.css";
import { useCreateBlockNote } from "@blocknote/react";
```

Do **not** set `slashMenu={false}` — leave the default "/" menu as-is for styling and block insertion.

---

### Step 4: Add Shadcn components BlockNote might need (optional at first)

BlockNote’s Shadcn view can use these Shadcn components if you pass them: Badge, Button, Card, DropdownMenu, Form, Input, Label, Popover, Select, Tabs, Toggle, Tooltip. You only have Button and Card.

- **Minimum:** Use only Button and Card in `shadCNComponents`; the rest will use BlockNote’s defaults and still look consistent.
- **Later:** Add more ShadCN components via `npx shadcn@latest add dropdown-menu select popover input label tabs toggle tooltip` when you want the editor’s menus to use your theme exactly. Then pass them in `shadCNComponents`.

For “canvas in first”, Step 3 is enough.

---

### Step 5: Mount the notes editor in the app

**Option A — Full page for now**

- In [frontend/src/App.tsx](frontend/src/App.tsx), either:
  - Replace the current root with `<NotesEditor />`, or
  - Add a simple tab/router: e.g. “Voice” vs “Notes”, and render `<NotesEditor />` on the Notes tab.

**Option B — 3-pane layout (when you have it)**

- Render `<NotesEditor />` in the center (or right) pane so voice/transcript | notes | recs sit side by side.

For a minimal first step, Option A (single Notes page or one tab) is enough.

---

### Step 6: Verify

- Run `npm run dev` in `frontend/`.
- Open the notes view; you should see the BlockNote canvas.
- Type "/" and confirm the **default slash menu** appears (headings, lists, etc.).
- Confirm no console errors and that styling (e.g. dark theme from your `:root`) still looks correct.

---

## Part 2: Keyboard shortcut for your AI menu (no change to "/")

Keep "/" for BlockNote. Use a **shortcut** to open your AI menu.

### Step 7: AI menu trigger (e.g. Cmd+K / Ctrl+K)

- Add a **keyboard listener** (e.g. in `NotesEditor` or in a layout that wraps the editor) for `Mod+k` (Cmd+K on Mac, Ctrl+K on Windows/Linux).
- On trigger: **do not** call `editor.openSuggestionMenu("/")`. Instead open **your** AI UI, e.g.:
  - A small **popover/panel** (Chat with AI, Voice to text, Write about topic), or
  - Focus an existing AI panel if you already have one.

So: "/" = BlockNote’s menu; Cmd+K (or your choice) = your AI menu.

### Step 8: AI menu content (later)

When you implement the AI panel:

- **Chat with AI:** Connect to your existing WebSocket/Durable Object; show messages and stream replies.
- **Voice to text:** Use your existing STT path; insert the transcript at the current BlockNote cursor (e.g. get current block, insert text or new block).
- **Write about topic:** Prompt for a topic (or use selected text); call your backend; stream/insert the result into the editor (e.g. `editor.insertBlocks` or replace selection).

These are “extra features” below; the plan here is just to reserve the shortcut and the placeholder for the AI menu.

---

## Part 3: Extra features to add later + what to look into

After the canvas is in and the shortcut is wired, add these in any order you prefer.

---

### 3.1 LaTeX / math

- **What:** Inline and block math (e.g. `$...$` and `$$...$$` or dedicated blocks).
- **How:** Add a **custom block type** (e.g. `math`) that stores a LaTeX string; in the block’s React component render with **KaTeX**.
- **Look into:**
  - BlockNote: [Custom block types](https://www.blocknotejs.org/docs/features/custom-schemas/custom-blocks) (`createReactBlockSpec`, `propSchema`, slash menu item to insert the block).
  - Rendering: `katex` + `react-katex` (`InlineMath` / `BlockMath`), or render `katex.renderToString` into a `div`.  
  - Store in block: e.g. `latex: string`, `displayMode: boolean` (inline vs block).

---

### 3.2 Mermaid diagrams

- **What:** Diagram blocks (flowchart, sequence, etc.) that the AI can also interpret (e.g. from Mermaid source).
- **How:** Custom block type (e.g. `mermaid`) with `code: string`; render with `mermaid.render()` in a `useLayoutEffect`, unique ID per diagram.
- **Look into:**
  - BlockNote: same custom block docs as above; slash menu “Insert diagram”.
  - [Mermaid usage](https://mermaid.js.org/intro/): `mermaid.parse()`, `mermaid.render(id, code)`.  
  - React: use a stable unique ID per block instance (e.g. block id or ref) so multiple Mermaid blocks don’t clash; re-run `render` when `code` changes.

---

### 3.3 Images (paste + URL)

- **What:** Paste images into the doc; “Insert image from URL”.
- **How:** BlockNote has a built-in **image block**; customize paste handling and add a toolbar or slash-like “Insert image from URL” that sets the image URL.
- **Look into:**
  - BlockNote: [Image block](https://www.blocknotejs.org/docs/features/blocks) and [paste handling](https://www.blocknotejs.org/docs/reference/editor/paste-handling) (paste event → get file → upload or data URL → insert image block).
  - Backend: when you have R2/upload, replace data URLs with the uploaded URL before saving.

---

### 3.4 Paint / drawing block

- **What:** A block that lets users draw; store as image (or SVG) so the AI can “see” it.
- **How:** Custom block type (e.g. `paint`) that wraps a canvas; on “Done”, export to data URL (or SVG) and save in the block; show the exported image in the block view.
- **Look into:**
  - BlockNote: custom block with a custom React component; block props e.g. `dataUrl: string` or `svg: string`.
  - Canvas: [react-sketch-canvas](https://www.npmjs.com/package/react-sketch-canvas) (simpler, export image/SVG) or **Fabric.js** (more tools). Prefer react-sketch-canvas for a minimal first version.

---

### 3.5 Live preview pane

- **What:** A second pane that shows the “rendered” note (Markdown + math + Mermaid + images + paint) like markdownlivepreview.
- **How:** Single source of truth = BlockNote’s document (block list). Live preview is a **read-only renderer** that walks the same block list and, per block type, renders: paragraph/heading/list as Markdown (or HTML), math with KaTeX, Mermaid with `mermaid.render()`, image with `<img>`, paint with `<img src={dataUrl}>`.
- **Look into:**
  - Getting doc from BlockNote: `editor.document` or the equivalent in your version; subscribe to changes so the preview updates.
  - No second editor; just a React component that maps blocks to your renderers.

---

### 3.6 AI menu implementation (Chat, Voice, Write about)

- **What:** The actions behind the keyboard shortcut: chat with AI, voice-to-text, “write about topic”.
- **How:** Shortcut opens a popover/panel; three actions call your backend/WebSocket and update the editor (insert blocks or replace selection).
- **Look into:**
  - **Chat:** Existing WebSocket/Durable Object; optional “insert reply into notes” using `editor.insertBlocks` or appending to a “Chat log” block.
  - **Voice:** Existing STT; on result, `editor.insertBlocks` at current position or `editor.replaceBlocks` for selection.
  - **Write about:** Backend endpoint that takes topic (and optionally current selection); stream response; insert as new blocks below cursor or replace selection. BlockNote API: `editor.insertBlocks`, `editor.getSelectedBlocks`, etc.

---

### 3.7 Persistence (save/load notes)

- **What:** Save notes per session (or user); load when opening a session.
- **How:** Serialize BlockNote doc (e.g. `editor.exportToJSON()` or equivalent); send to backend (when you have `notes_docs` or similar); on load, `editor.replaceBlocks(editor.document, importedBlocks)` or use `initialContent`.
- **Look into:**
  - BlockNote: [Format interoperability](https://www.blocknotejs.org/docs/foundations/supported-formats), export/import APIs.
  - Backend: when `notes_docs` (or equivalent) exists, add GET/PUT endpoints and call them from a `useNotesDoc` hook that loads once and saves on change (debounced).

---

### 3.8 Patch suggestions (accept/reject AI edits)

- **What:** AI suggests a change to the note; user sees a diff and accepts or rejects.
- **How:** When backend sends a “patch” (e.g. new block list or diff), show a small UI (e.g. below the editor) with “Accept” / “Reject”. On Accept, apply the patch via BlockNote’s API (e.g. replace range of blocks).
- **Look into:**
  - BlockNote: `editor.replaceBlocks`, `editor.insertBlocks`, selection/cursor APIs to know “where” to apply.
  - Backend: event types like `patch_suggested` with payload; frontend applies the patch only on accept.

---

## Summary checklist

| Step | Action |
|------|--------|
| 1 | Install `@blocknote/core` `@blocknote/react` `@blocknote/shadcn` in frontend |
| 2 | Add `@source "../node_modules/@blocknote/shadcn"` (or correct path) in `index.css` |
| 3 | Create `NotesEditor.tsx` with BlockNoteView, default "/" menu left as-is |
| 4 | (Optional) Add more Shadcn components and pass them in `shadCNComponents` |
| 5 | Mount NotesEditor in App (full page or tab) |
| 6 | Verify "/" works and canvas looks correct |
| 7 | Add Cmd+K (or chosen shortcut) to open your AI menu (no change to "/") |
| 8 | Implement AI menu content (chat, voice, write about) when ready |

Then add extra features (LaTeX, Mermaid, images, paint, live preview, persistence, patch suggestions) using the “what to look into” sections above.
