import { Mark, mergeAttributes } from '@tiptap/react';

export const CommentMark = Mark.create({
  name: 'comment',

  addAttributes() {
    return {
      commentId: {
        default: null,
        parseHTML: (el: HTMLElement) => el.getAttribute('data-comment-id'),
        renderHTML: (attrs: Record<string, unknown>) =>
          attrs.commentId ? { 'data-comment-id': attrs.commentId } : {},
      },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-comment-id]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        style: [
          'background-color: rgba(251,191,36,0.22)',
          'border-bottom: 1.5px solid rgba(217,119,6,0.65)',
          'cursor: pointer',
          'border-radius: 1px',
        ].join(';'),
      }),
      0,
    ];
  },
});
