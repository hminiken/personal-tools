'use client';

import { useEffect, useRef, useState } from 'react';
import { ActionIcon, Box, Group, Text, Tooltip } from '@mantine/core';
import { IconCheck, IconX } from '@tabler/icons-react';
import { RichTextEditor } from '@mantine/tiptap';
import '@mantine/tiptap/styles.css';
import { useWritingEditor } from '@hooks/useWritingEditor';
import { WritingEditorToolbar } from '@components/WritingEditorToolbar';
import { writingEditorStyles } from '@/utils/writingTheme';

// The "add a note" composer — a small TipTap instance (same theming/toolbar
// as the character fields), with explicit save/cancel rather than autosave:
// blur fires constantly just from clicking the toolbar's own controls, which
// made a blur-triggered save unreliable and made it hard to tell a note had
// actually gone through. Enter (without shift) also saves, Escape cancels,
// matching the plain-textarea version this replaced.
export default function CardNoteEditor({
  onSave,
  onCancel,
  smartQuotes,
  initialContent,
}: {
  onSave: (html: string) => void;
  onCancel: () => void;
  smartQuotes?: boolean | null;
  initialContent?: string;
}) {
  const editor = useWritingEditor(initialContent ?? '', true, { smartQuotes });
  const [isEmpty, setIsEmpty] = useState(!initialContent?.trim());
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;
  const onCancelRef = useRef(onCancel);
  onCancelRef.current = onCancel;

  const handleSave = () => {
    if (!editor || editor.isEmpty) return;
    onSaveRef.current(editor.getHTML());
  };

  useEffect(() => {
    if (!editor) return;
    const onUpdate = () => setIsEmpty(editor.isEmpty);
    editor.on('update', onUpdate);
    return () => { editor.off('update', onUpdate); };
  }, [editor]);

  useEffect(() => {
    if (!editor) return;
    const dom = editor.view.dom;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSave(); }
      if (e.key === 'Escape') { onCancelRef.current(); }
    };
    dom.addEventListener('keydown', onKeyDown);
    return () => dom.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  useEffect(() => {
    editor?.commands.focus('end');
  }, [editor]);

  return (
    <Box>
      <Group justify="flex-end" gap={4} mb={2}>
        <Tooltip label="Save note" withinPortal>
          <ActionIcon size="sm" color="dark.6" variant="filled" onClick={handleSave} disabled={isEmpty} aria-label="Save note">
            <IconCheck size={13} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label="Cancel" withinPortal>
          <ActionIcon size="sm" color="dark.6" variant="filled" onClick={onCancel} aria-label="Cancel note">
            <IconX size={13} />
          </ActionIcon>
        </Tooltip>
      </Group>
      <RichTextEditor
        editor={editor}
        styles={{
          ...writingEditorStyles(),
          content: { ...writingEditorStyles().content, minHeight: 50, maxHeight: 200, overflowY: 'auto', paddingRight: 12 },
        }}
      >
        <WritingEditorToolbar compact />
        <Box style={{ position: 'relative' }}>
          {isEmpty && (
            <Text size="sm" c="dimmed" style={{ position: 'absolute', top: 10, left: 14, pointerEvents: 'none', zIndex: 1 }}>
              Note about this card…
            </Text>
          )}
          <RichTextEditor.Content />
        </Box>
      </RichTextEditor>
    </Box>
  );
}
