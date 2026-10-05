'use client';

import { useState } from 'react';
import { Button, Modal, Stack, TextInput } from '@mantine/core';
import { addQuickNote } from '../../_actions/project_actions';

// One-line note appended (with a timestamp) to the project's notes tab.
export function QuickNoteModal({ projectId, opened, close }: { projectId: number; opened: boolean; close: () => void }) {
  const [note, setNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const save = async () => {
    if (!note.trim() || isSaving) return;
    setIsSaving(true);
    try {
      await addQuickNote(projectId, note);
      setNote('');
      close();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal opened={opened} onClose={close} title="Quick Note" centered>
      <Stack>
        <TextInput
          data-autofocus
          value={note}
          onChange={(e) => setNote(e.currentTarget.value)}
          placeholder="What did you just finish?"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              save();
            }
          }}
        />
        <Button onClick={save} loading={isSaving} disabled={!note.trim()}>Save Note</Button>
      </Stack>
    </Modal>
  );
}
