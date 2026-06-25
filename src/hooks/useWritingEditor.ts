import { useEditor } from '@tiptap/react';
import { writingEditorExtensions } from '@/utils/writingEditorExtensions';
import { sanitizePatternHtml } from '@/utils/sanitizeHtml';

/**
 * Editor hook for the Writing Desk. Same SSR/rebuild semantics as
 * useCraftingEditor (rebuilds on edit-mode/content change), but loaded with the
 * prose-focused writing extensions (smart quotes, Tab indent, alignment, line
 * spacing). See writingEditorExtensions for why it's separate from crafting.
 */
export function useWritingEditor(initialContent: string | null | undefined, isEditing: boolean = true) {
  return useEditor(
    {
      extensions: writingEditorExtensions,
      content: sanitizePatternHtml(initialContent) || '',
      immediatelyRender: false,
      editable: isEditing,
    },
    [isEditing, initialContent]
  );
}
