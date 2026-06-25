'use client';

import { useEffect, useRef, useState } from 'react';
import { Box, Text, Group } from '@mantine/core';
import { RichTextEditor } from '@mantine/tiptap';
import '@mantine/tiptap/styles.css';
import { IconCheck } from '@tabler/icons-react';
import { useWritingEditor } from '@hooks/useWritingEditor';
import { WritingEditorToolbar } from '@components/WritingEditorToolbar';
import { saveCardContent } from '@app/writing/_actions/writing_actions';
import type { Card } from '../types';

export default function CompiledCardEditor({ card }: { card: Card }) {
  const editor = useWritingEditor(card.content, true);
  const [focused, setFocused] = useState(false);
  const [saved, setSaved] = useState(false);
  const lastSaved = useRef(card.content ?? '');

  // Save this card's HTML when the editor loses focus (and only if it changed).
  // Mantine toolbar controls preventDefault on mousedown, so clicking a format
  // button doesn't blur the editor — blur means the user really left the scene.
  useEffect(() => {
    if (!editor) return;
    const onFocus = () => setFocused(true);
    const onBlur = () => {
      setFocused(false);
      const html = editor.getHTML();
      if (html !== lastSaved.current) {
        lastSaved.current = html;
        saveCardContent(card.id, html).then(() => {
          setSaved(true);
          setTimeout(() => setSaved(false), 1500);
        });
      }
    };
    editor.on('focus', onFocus);
    editor.on('blur', onBlur);
    return () => {
      editor.off('focus', onFocus);
      editor.off('blur', onBlur);
    };
  }, [editor, card.id]);

  return (
    <Box>
      <Group justify="space-between" mb={4} gap="xs">
        <Text size="xs" tt="uppercase" c="dimmed" fw={700} style={{ letterSpacing: 0.5 }}>
          {card.title}
        </Text>
        {saved && (
          <Group gap={2} c="olive.7">
            <IconCheck size={13} />
            <Text size="xs">saved</Text>
          </Group>
        )}
      </Group>
      <RichTextEditor editor={editor} style={{ border: 'none' }}>
        {focused && <WritingEditorToolbar />}
        <RichTextEditor.Content />
      </RichTextEditor>
    </Box>
  );
}
