import { useEditor } from '@tiptap/react';
import { craftingEditorExtensions } from '@/utils/editorExtensions'; // Adjust import path if needed
import { sanitizePatternHtml } from '@/utils/sanitizeHtml';

/**
 * A custom hook that standardizes the Tiptap editor across the app.
 * Automatically handles extensions, SSR rendering, and toggling edit mode.
 *
 * We recreate the editor (via the deps array) whenever edit mode is toggled
 * rather than calling `editor.setEditable()`. The resize-image extension only
 * wires up resize handles for image NodeViews that are *built* while the editor
 * is editable; images are leaf nodes, so ProseMirror reuses their existing
 * NodeView on a plain `setEditable` toggle and never rebuilds them. The result
 * was that images already in the document couldn't be resized (only freshly
 * pasted ones could). Rebuilding the editor forces every image NodeView to be
 * constructed in the correct editable state.
 *
 * `initialContent` is also in the deps so the editor re-syncs when the saved
 * server content changes (e.g. after a save + `router.refresh()`). Without it,
 * the editor would keep showing the stale content it was first built with until
 * a full page reload. Strings compare by value, so this only rebuilds when the
 * content actually differs — not on every render.
 */
export function useCraftingEditor(initialContent: string | null | undefined, isEditing: boolean = false) {
  const editor = useEditor({
    extensions: craftingEditorExtensions,
    content: sanitizePatternHtml(initialContent) || '',
    immediatelyRender: false,
    editable: isEditing, // Start in the correct state
  }, [isEditing, initialContent]);

  return editor;
}