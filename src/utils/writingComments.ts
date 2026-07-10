// Shared model + helpers for Writing Desk card comments.
//
// A card's comments live in the `cards.comments` column as a JSON object
// keyed by comment id. `anchored: false` marks a general card note with no
// text-span mark in the document — added directly from a sidebar rather than
// via the editor's selection bubble menu, so there's nothing to jump to.
// Older rows predate the flag; absent means anchored.

import type { Editor } from '@tiptap/react';

export type CommentRecord = Record<string, { text: string; createdAt: string; anchored?: boolean }>;

export function parseComments(json: string | null | undefined): CommentRecord {
  if (!json) return {};
  try {
    return JSON.parse(json);
  } catch {
    return {};
  }
}

// Storage convention: an empty record is stored as NULL, not '{}'.
export function serializeComments(comments: CommentRecord): string | null {
  return Object.keys(comments).length > 0 ? JSON.stringify(comments) : null;
}

// Strips every span of the given comment's mark from the document (a comment
// mark can cover multiple nodes if the selection crossed formatting).
export function removeCommentMarkFromEditor(editor: Editor, commentId: string) {
  const { state } = editor;
  const tr = state.tr;
  const markType = state.schema.marks.comment;
  if (!markType) return;
  state.doc.descendants((node, pos) => {
    const m = node.marks.find((mk) => mk.type === markType && mk.attrs.commentId === commentId);
    if (m) tr.removeMark(pos, pos + node.nodeSize, markType);
  });
  editor.view.dispatch(tr);
}

// Moves the cursor to the comment's mark and scrolls it into view.
export function jumpToCommentInEditor(editor: Editor, commentId: string) {
  const markType = editor.state.schema.marks.comment;
  if (markType) {
    let foundPos: number | null = null;
    editor.state.doc.descendants((node, pos) => {
      if (foundPos !== null) return false;
      const m = node.marks.find((mk) => mk.type === markType && mk.attrs.commentId === commentId);
      if (m) { foundPos = pos; return false; }
    });
    if (foundPos !== null) editor.commands.setTextSelection(foundPos);
  }
  const el = editor.view.dom.querySelector(`[data-comment-id="${commentId}"]`) as HTMLElement | null;
  el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}
