import { useEditor } from '@tiptap/react';
import { buildWritingExtensions } from '@/utils/writingEditorExtensions';
import { sanitizePatternHtml } from '@/utils/sanitizeHtml';

/**
 * Editor hook for the Writing Desk. Same SSR/rebuild semantics as
 * useCraftingEditor (rebuilds on edit-mode/content change), but loaded with the
 * prose-focused writing extensions (smart quotes, Tab indent, alignment,
 * inline font family/size). See writingEditorExtensions for why it's separate
 * from crafting.
 *
 * `opts.smartQuotes` is the board's per-document toggle (default on); when it
 * changes the editor rebuilds so Typography's quote rules re-register.
 */
export function useWritingEditor(
  initialContent: string | null | undefined,
  isEditing: boolean = true,
  opts?: { smartQuotes?: boolean | null }
) {
  const smartQuotes = opts?.smartQuotes !== false;
  return useEditor(
    {
      extensions: buildWritingExtensions({ smartQuotes }),
      content: sanitizePatternHtml(initialContent) || '',
      immediatelyRender: false,
      editable: isEditing,
    },
    [isEditing, initialContent, smartQuotes]
  );
}
