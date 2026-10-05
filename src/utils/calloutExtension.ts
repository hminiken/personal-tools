import { Node, mergeAttributes } from '@tiptap/react';

// Colored "callout" boxes (Tip, Note, Example, Warning, Success) that wrap
// ordinary paragraphs/lists. Stored as plain HTML so the read-only views,
// the AI import and the tailor step can all produce or keep them:
//   <div data-callout="tip"><p>Use a stitch marker…</p></div>
// The box styling and its label come from src/app/callouts.css; the toolbar
// inserts them with the built-in wrapIn / lift / updateAttributes commands.

export const CALLOUT_TYPES = [
  { value: 'info', label: 'Note' },
  { value: 'tip', label: 'Tip' },
  { value: 'example', label: 'Example' },
  { value: 'warning', label: 'Warning' },
  { value: 'success', label: 'Success' },
] as const;

export type CalloutType = (typeof CALLOUT_TYPES)[number]['value'];
const TYPES = new Set<string>(CALLOUT_TYPES.map((t) => t.value));

export const Callout = Node.create({
  name: 'callout',
  group: 'block',
  content: 'block+',
  defining: true,

  addAttributes() {
    return {
      type: {
        default: 'info',
        parseHTML: (el) => {
          const type = el.getAttribute('data-callout') ?? '';
          return TYPES.has(type) ? type : 'info';
        },
        renderHTML: (attrs) => ({ 'data-callout': attrs.type }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-callout]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes), 0];
  },

  // Enter on an empty last line inside a box steps out of the box, so you
  // can keep typing below it.
  addKeyboardShortcuts() {
    return {
      Enter: ({ editor }) => {
        const { $from, empty } = editor.state.selection;
        if (!empty || $from.depth < 2 || $from.parent.content.size > 0) return false;
        const box = $from.node(-1);
        if (box.type.name !== this.name || $from.index(-1) !== box.childCount - 1) return false;
        return editor.commands.lift(this.name);
      },
    };
  },
});
