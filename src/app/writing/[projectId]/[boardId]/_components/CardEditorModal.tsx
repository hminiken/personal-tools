'use client';

import { useEffect, useState } from 'react';
import { Modal, TextInput, Button, Group, Stack } from '@mantine/core';
import { RichTextEditor } from '@mantine/tiptap';
import '@mantine/tiptap/styles.css';
import { useRouter } from 'next/navigation';
import { useWritingEditor } from '@hooks/useWritingEditor';
import { WritingEditorToolbar } from '@components/WritingEditorToolbar';
import { updateCard, deleteCard } from '../../../_actions/writing_actions';
import type { Card } from '../types';

export default function CardEditorModal({
  card,
  opened,
  onClose,
}: {
  card: Card | null;
  opened: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Editor is rebuilt whenever the card's content changes (see useCraftingEditor).
  const editor = useWritingEditor(card?.content, true);

  useEffect(() => {
    setTitle(card?.title ?? '');
  }, [card]);

  const handleSave = async () => {
    if (!card) return;
    setIsSaving(true);
    await updateCard(card.id, {
      title: title.trim() || 'Untitled',
      content: editor?.getHTML() || '',
    });
    router.refresh();
    setIsSaving(false);
    onClose();
  };

  const handleDelete = async () => {
    if (!card) return;
    if (!confirm('Delete this card?')) return;
    setIsSaving(true);
    await deleteCard(card.id);
    router.refresh();
    setIsSaving(false);
    onClose();
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Edit Card" size="xl" centered>
      <Stack>
        <TextInput
          label="Title"
          value={title}
          onChange={(e) => setTitle(e.currentTarget.value)}
          required
        />
        <RichTextEditor editor={editor}>
          <WritingEditorToolbar />
          <RichTextEditor.Content />
        </RichTextEditor>
        <Group justify="space-between" mt="md">
          <Button variant="subtle" color="rust.7" onClick={handleDelete} disabled={isSaving}>
            Delete
          </Button>
          <Group>
            <Button variant="default" onClick={onClose} disabled={isSaving}>Cancel</Button>
            <Button color="olive.6" onClick={handleSave} loading={isSaving}>Save</Button>
          </Group>
        </Group>
      </Stack>
    </Modal>
  );
}
