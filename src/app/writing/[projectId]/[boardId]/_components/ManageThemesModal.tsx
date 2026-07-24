'use client';

import { useState } from 'react';
import {
  Modal, Stack, Group, Text, TextInput, Button, ActionIcon, Divider, ScrollArea, Tooltip, FileButton, Code, Badge,
} from '@mantine/core';
import { IconTrash, IconUpload, IconRefresh, IconCopy } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import { createTheme, renameTheme, updateThemeDefinition, deleteTheme, duplicateTheme } from '../../../_actions/writing_actions';
import { alertUser, confirmAction, promptText } from '@/utils/dialogs';
import { THEME_TOKENS } from '@/utils/writingTheme';
import type { WritingTheme } from '../types';

// One theme: rename inline (commits on blur), replace its file, delete it.
// Built-ins are read-only (name locked, no replace/delete) — a "Duplicate"
// button gives an easy path to an editable copy instead.
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

  const handleDuplicate = async () => {
    const newName = (await promptText({
      title: 'Duplicate theme',
      label: 'Theme name',
      initialValue: `${theme.name} copy`,
    }))?.trim();
    if (!newName) return;
    await duplicateTheme(theme.id, newName);
    onChanged();
  };

  if (theme.isBuiltin) {
    return (
      <Group gap={8} wrap="nowrap">
        <Group gap={6} wrap="nowrap" style={{ flex: 1 }}>
          <Text size="sm">{theme.name}</Text>
          <Badge size="xs" variant="light" color="gray">Built-in</Badge>
        </Group>
        <Tooltip label="Duplicate to make an editable copy" withinPortal>
          <ActionIcon variant="subtle" color="gray" aria-label="Duplicate theme" onClick={handleDuplicate}>
            <IconCopy size={16} />
          </ActionIcon>
        </Tooltip>
      </Group>
    );
  }

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
      <Tooltip label="Duplicate theme" withinPortal>
        <ActionIcon variant="subtle" color="gray" aria-label="Duplicate theme" onClick={handleDuplicate}>
          <IconCopy size={16} />
        </ActionIcon>
      </Tooltip>
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
  const builtinThemes = themes.filter((t) => t.isBuiltin);
  const customThemes = themes.filter((t) => !t.isBuiltin);

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

        <ScrollArea.Autosize mah={360}>
          <Stack gap="md" pr={6}>
            {builtinThemes.length > 0 && (
              <Stack gap={6}>
                <Text size="xs" fw={600} c="dimmed" tt="uppercase">Built-in</Text>
                {builtinThemes.map((theme) => (
                  <ThemeRow key={theme.id} theme={theme} onChanged={refresh} />
                ))}
              </Stack>
            )}
            <Stack gap={6}>
              <Text size="xs" fw={600} c="dimmed" tt="uppercase">Custom</Text>
              {customThemes.length === 0 && <Text size="xs" c="dimmed">No themes uploaded yet.</Text>}
              {customThemes.map((theme) => (
                <ThemeRow key={theme.id} theme={theme} onChanged={refresh} />
              ))}
            </Stack>
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
