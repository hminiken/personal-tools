// Editor extensions for the WRITING DESK only (compiled view + card editor).
// Kept separate from craftingEditorExtensions so prose-specific behaviour like
// smart quotes never touches pattern notes (which use straight quotes for inch
// marks, e.g. 6").
import { Extension, type Editor } from '@tiptap/react';
import Typography from '@tiptap/extension-typography';
import TextAlign from '@tiptap/extension-text-align';
import { FontFamily } from '@tiptap/extension-text-style/font-family';
import { FontSize } from '@tiptap/extension-text-style/font-size';
import { craftingEditorExtensions } from './editorExtensions';
import { CommentMark } from './commentMark';

const BLOCK_TYPES = ['paragraph', 'heading'];
const INDENT_STEP_EM = 2; // first-line indent per Tab (manuscript style)
const MAX_INDENT = 8;

// Tab / Shift-Tab apply a FIRST-LINE indent (text-indent) to the current block,
// not a whole-paragraph margin. In lists, the bundled list-keymap sinks/lifts
// items, so we defer to it (return false). Everywhere else we ALWAYS handle Tab
// (return true) so focus never escapes to the next editor.
const Indent = Extension.create<{ types: string[] }>({
  name: 'indent',
  addOptions() {
    return { types: BLOCK_TYPES };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          indent: {
            default: 0,
            parseHTML: (element: HTMLElement) => {
              const ti = parseFloat(element.style.textIndent || '0');
              return ti ? Math.min(Math.round(ti / INDENT_STEP_EM), MAX_INDENT) : 0;
            },
            renderHTML: (attributes: Record<string, unknown>) => {
              const level = (attributes.indent as number) || 0;
              return level ? { style: `text-indent: ${level * INDENT_STEP_EM}em` } : {};
            },
          },
        },
      },
    ];
  },
  addKeyboardShortcuts() {
    const change = (delta: number) => ({ editor }: { editor: Editor }) => {
      const { $from } = editor.state.selection;
      // Defer to the list keymap when inside a list item.
      for (let d = $from.depth; d >= 1; d--) {
        if ($from.node(d).type.name === 'listItem') return false;
      }
      const blockType = $from.parent.type.name;
      if (!this.options.types.includes(blockType)) return false;
      const current = ($from.parent.attrs.indent as number) || 0;
      const next = Math.max(0, Math.min(MAX_INDENT, current + delta));
      if (next !== current) {
        editor.chain().focus().updateAttributes(blockType, { indent: next }).run();
      }
      return true; // handled — keep focus in this editor
    };
    return {
      Tab: change(1),
      'Shift-Tab': change(-1),
    };
  },
});

// NOTE: line spacing, space-before/after, document-wide font family/size, and
// the first-line auto-indent are NOT per-paragraph attributes. They're
// document-wide settings stored on the board and applied as CSS to the whole
// editor (see components/DocumentSpacing). Per-paragraph here: alignment and a
// manual Tab first-line indent. Per-selection (inline): FontFamily/FontSize
// marks, driven from the toolbar.

// Smart quotes come from the Typography extension, which also does em dashes,
// ellipses, fractions, etc. When a board turns smart quotes off we keep those
// other substitutions but disable just the four quote rules.
function typographyFor(smartQuotes: boolean) {
  return smartQuotes
    ? Typography
    : Typography.configure({
        openDoubleQuote: false,
        closeDoubleQuote: false,
        openSingleQuote: false,
        closeSingleQuote: false,
      });
}

// Build the writing extension list for a given board configuration. `useEditor`
// rebuilds when smartQuotes changes so the Typography rules re-register.
export function buildWritingExtensions(opts?: { smartQuotes?: boolean | null }) {
  const smartQuotes = opts?.smartQuotes !== false; // null/undefined = default on
  return [
    ...craftingEditorExtensions, // StarterKit (incl. Underline), TextStyle, Color, Highlight, ResizeImage
    typographyFor(smartQuotes),
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    FontFamily, // inline per-selection font family (rides on TextStyle)
    FontSize, // inline per-selection font size
    Indent,
    CommentMark,
  ];
}

// Default-on list, kept for any consumer that doesn't need the toggle.
export const writingEditorExtensions = buildWritingExtensions();
