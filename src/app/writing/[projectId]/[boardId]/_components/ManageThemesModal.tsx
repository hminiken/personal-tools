'use client';

import { useState } from 'react';
import {
  Modal, Stack, Group, Text, TextInput, Button, ActionIcon, Divider, ScrollArea, Tooltip, FileButton, Code,
} from '@mantine/core';
import { IconTrash, IconUpload, IconRefresh } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import { createTheme, renameTheme, updateThemeDefinition, deleteTheme } from '../../../_actions/writing_actions';
import { alertUser, confirmAction, promptText } from '@/utils/dialogs';
import { THEME_TOKENS } from '@/utils/writingTheme';
import type { WritingTheme } from '../types';

// One theme: rename inline (commits on blur), replace its file, delete it.
function ThemeRow({ theme, onChanged }: { theme: WritingTheme; onChanged: () => void }) {
  const [name, setName] = useState(theme.name);

  const commitName = async () => {
    const t = name.trim();
    if (t && t !== theme.name) { await renameTheme(theme.id, t); onChanged(); }
    else setName(theme.name);
  };

  const handleReplace = async (file: File | null) => {
    if (!file) return;
    try {
      await updateThemeDefinition(theme.id, await file.text());
      onChanged();
    } catch (e) {
      await alertUser({ title: 'Invalid theme file', message: e instanceof Error ? e.message : String(e) });
    }
  };

  return (
    <Group gap={8} wrap="nowrap">
      <TextInput
        size="xs"
        value={name}
        onChange={(e) => setName(e.currentTarget.value)}
        onBlur={commitName}
        onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
        style={{ flex: 1 }}
      />
      <FileButton onChange={handleReplace} accept="application/json,.json">
        {(props) => (
          <Tooltip label="Replace theme file" withinPortal>
            <ActionIcon variant="subtle" color="gray" {...props} aria-label="Replace theme file">
              <IconRefresh size={16} />
            </ActionIcon>
          </Tooltip>
        )}
      </FileButton>
      <Tooltip label="Delete theme" withinPortal>
        <ActionIcon
          variant="subtle"
          color="red"
          aria-label="Delete theme"
          onClick={async () => {
            if (await confirmAction({
              title: 'Delete theme',
              message: `Delete "${theme.name}"? Any board using it reverts to the default look.`,
            })) {
              await deleteTheme(theme.id);
              onChanged();
            }
          }}
        >
          <IconTrash size={16} />
        </ActionIcon>
      </Tooltip>
    </Group>
  );
}

export default function ManageThemesModal({
  themes,
  opened,
  onClose,
}: {
  themes: WritingTheme[];
  opened: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const refresh = () => router.refresh();

  const handleUpload = async (file: File | null) => {
    if (!file) return;
    const name = (await promptText({
      title: 'New theme',
      label: 'Theme name',
      initialValue: file.name.replace(/\.[^.]+$/, ''),
    }))?.trim();
    if (!name) return;
    try {
      await createTheme(name, await file.text());
      refresh();
    } catch (e) {
      await alertUser({ title: 'Invalid theme file', message: e instanceof Error ? e.message : String(e) });
    }
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Manage themes" size="lg" centered>
      <Stack gap="md">
        <Text size="xs" c="dimmed">
          A theme is a JSON file of color tokens that restyle the board — anything it doesn&apos;t set keeps the
          default look. Valid tokens: <Code>{THEME_TOKENS.map((t) => t.key).join(', ')}</Code>
        </Text>

        <ScrollArea.Autosize mah={320}>
          <Stack gap={6} pr={6}>
            {themes.length === 0 && <Text size="xs" c="dimmed">No themes uploaded yet.</Text>}
            {themes.map((theme) => (
              <ThemeRow key={theme.id} theme={theme} onChanged={refresh} />
            ))}
          </Stack>
        </ScrollArea.Autosize>

        <Divider />

        <FileButton onChange={handleUpload} accept="application/json,.json">
          {(props) => (
            <Button {...props} variant="light" color="gray" leftSection={<IconUpload size={16} />} fullWidth>
              Upload theme file
            </Button>
          )}
        </FileButton>
      </Stack>
    </Modal>
  );
}
