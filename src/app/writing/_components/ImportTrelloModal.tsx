'use client';

import { useState } from 'react';
import { Modal, Stack, Group, Text, TextInput, Button, FileButton, SegmentedControl, Select } from '@mantine/core';
import { IconUpload } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import { parseTrelloExport, type ParsedTrelloBoard } from '@/utils/trelloImport';
import { importTrelloBoard } from '../_actions/writing_actions';
import { alertUser } from '@/utils/dialogs';

type TargetMode = 'new' | 'existing';

export default function ImportTrelloModal({
  opened,
  onClose,
  projects,
  defaultProjectId,
}: {
  opened: boolean;
  onClose: () => void;
  projects: { id: number; title: string }[];
  defaultProjectId?: number;
}) {
  const router = useRouter();
  const [parsed, setParsed] = useState<ParsedTrelloBoard | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [mode, setMode] = useState<TargetMode>(defaultProjectId != null ? 'existing' : 'new');
  const [newProjectTitle, setNewProjectTitle] = useState('');
  const [existingProjectId, setExistingProjectId] = useState<string | null>(
    defaultProjectId != null ? String(defaultProjectId) : null
  );
  const [isImporting, setIsImporting] = useState(false);

  const handleFile = async (file: File | null) => {
    if (!file) return;
    setParseError(null);
    try {
      const result = parseTrelloExport(await file.text());
      setParsed(result);
      setNewProjectTitle(result.boardName);
    } catch (e) {
      setParsed(null);
      setParseError(e instanceof Error ? e.message : String(e));
    }
  };

  const handleClose = () => {
    setParsed(null);
    setParseError(null);
    setMode(defaultProjectId != null ? 'existing' : 'new');
    setNewProjectTitle('');
    setExistingProjectId(defaultProjectId != null ? String(defaultProjectId) : null);
    setIsImporting(false);
    onClose();
  };

  const targetValid =
    mode === 'new' ? newProjectTitle.trim().length > 0 : existingProjectId != null && existingProjectId !== '';
  const canImport = !!parsed && targetValid && !isImporting;

  const handleImport = async () => {
    if (!parsed || !targetValid) return;
    setIsImporting(true);
    try {
      const target =
        mode === 'new'
          ? ({ mode: 'new', title: newProjectTitle.trim() } as const)
          : ({ mode: 'existing', projectId: Number(existingProjectId) } as const);
      const result = await importTrelloBoard({
        target,
        boardName: parsed.boardName,
        labels: parsed.labels,
        groups: parsed.groups,
      });
      handleClose();
      router.push(`/writing/${result.projectId}/${result.boardId}`);
    } catch (e) {
      setIsImporting(false);
      await alertUser({ title: 'Import failed', message: e instanceof Error ? e.message : String(e) });
    }
  };

  return (
    <Modal opened={opened} onClose={handleClose} title="Import from Trello" size="md" centered>
      <Stack gap="md">
        <Text size="xs" c="dimmed">
          Export a board from Trello (Board menu → More → Print, export, and share → Export as JSON) and pick the
          file below. Lists and cards become a new board; a list whose name starts with &ldquo;|&rdquo; starts a new
          group, otherwise everything lands in one &ldquo;Imported&rdquo; group.
        </Text>

        <FileButton onChange={handleFile} accept="application/json,.json">
          {(props) => (
            <Button {...props} variant="light" color="gray" leftSection={<IconUpload size={16} />} fullWidth>
              {parsed ? 'Choose a different file' : 'Choose Trello export file'}
            </Button>
          )}
        </FileButton>

        {parseError && <Text size="sm" c="red">{parseError}</Text>}

        {parsed && (
          <>
            <Text size="sm">
              &ldquo;{parsed.boardName}&rdquo; —{' '}
              {parsed.groupCount > 1 && `${parsed.groupCount} groups, `}
              {parsed.listCount} list{parsed.listCount === 1 ? '' : 's'},{' '}
              {parsed.cardCount} card{parsed.cardCount === 1 ? '' : 's'}
              {parsed.labelCount > 0 && `, ${parsed.labelCount} label${parsed.labelCount === 1 ? '' : 's'}`}
              {parsed.commentCount > 0 && `, ${parsed.commentCount} comment${parsed.commentCount === 1 ? '' : 's'}`}
            </Text>

            <SegmentedControl
              fullWidth
              value={mode}
              onChange={(v) => setMode(v as TargetMode)}
              data={[
                { value: 'new', label: 'New project' },
                { value: 'existing', label: 'Add to existing project' },
              ]}
              color="dark"
            />

            {mode === 'new' ? (
              <TextInput
                label="Project name"
                value={newProjectTitle}
                onChange={(e) => setNewProjectTitle(e.currentTarget.value)}
                data-autofocus
              />
            ) : (
              <Select
                label="Project"
                placeholder="Choose a project"
                data={projects.map((p) => ({ value: String(p.id), label: p.title }))}
                value={existingProjectId}
                onChange={setExistingProjectId}
                searchable
              />
            )}
          </>
        )}

        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={handleClose}>Cancel</Button>
          <Button onClick={handleImport} disabled={!canImport} loading={isImporting}>Import</Button>
        </Group>
      </Stack>
    </Modal>
  );
}
