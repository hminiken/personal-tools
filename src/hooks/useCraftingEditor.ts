import { useEffect } from 'react';
import { useEditor } from '@tiptap/react';
import { craftingEditorExtensions } from '@/utils/editorExtensions'; // Adjust import path if needed

/**
 * A custom hook that standardizes the Tiptap editor across the app.
 * Automatically handles extensions, SSR rendering, and toggling edit mode.
 */
export function useCraftingEditor(initialContent: string | null | undefined, isEditing: boolean = false) {
  const editor = useEditor({
    extensions: craftingEditorExtensions,
    content: initialContent || '',
    immediatelyRender: false,
    editable: isEditing, // Start in the correct state
  });

  // Automatically toggle editable state when isEditing changes
  useEffect(() => {
    if (editor && editor.isEditable !== isEditing) {
      editor.setEditable(isEditing);
    }
  }, [editor, isEditing]);

  return editor;
}