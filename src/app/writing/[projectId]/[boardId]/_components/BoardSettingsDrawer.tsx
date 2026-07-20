'use client';

import { useEffect, useState } from 'react';
import {
  ActionIcon, Button, Divider, Drawer, Group, NumberInput, SegmentedControl, Select, Stack, Text,
  useMantineColorScheme, useComputedColorScheme,
} from '@mantine/core';
import { IconBook2, IconFileExport, IconMoon, IconSun, IconTags, IconPalette } from '@tabler/icons-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DocumentSpacingMenu, type Spacing } from '@components/DocumentSpacing';
import type { WordCountSettings, WordCountMode } from '@components/WordCountDisplay';
import { confirmAction } from '@/utils/dialogs';
import { setBoardTheme, setThemeForAllBoards } from '../../../_actions/writing_actions';
import type { WritingTheme } from '../types';

// Settings drawer: slides in from the right with the board-level controls —
// dark mode (the Writing Desk hides the site's top bar, so the toggle lives
// here), word-count display + default goals, prose spacing, and the
// labels/compile/export entry points.
export default function BoardSettingsDrawer({
  opened,
  onClose,
  wcSettings,
  onWcSettings,
  spacing,
  onSpacing,
  onManageLabels,
  projectId,
  activeBoardId,
  themes,
  activeThemeId,
  onManageThemes,
}: {
  opened: boolean;
  onClose: () => void;
  wcSettings: WordCountSettings;
  onWcSettings: (patch: {
    wordCountDisplayMode?: WordCountMode;
    defaultCardWordGoal?: number | null;
    defaultListWordGoal?: number | null;
    defaultGroupWordGoal?: number | null;
  }) => void;
  spacing: Spacing;
  onSpacing: (next: Spacing) => void;
  onManageLabels: () => void;
  projectId: number;
  activeBoardId: number;
  themes: WritingTheme[];
  activeThemeId: number | null;
  onManageThemes: () => void;
}) {
  const { setColorScheme } = useMantineColorScheme();
  const computedColorScheme = useComputedColorScheme('light', { getInitialValueInEffect: true });
  const router = useRouter();

  // Selection is local — "Apply" is an explicit action, not live-on-change,
  // so browsing themes in the dropdown doesn't repaint the board until asked.
  const [selectedThemeId, setSelectedThemeId] = useState<string | null>(activeThemeId ? String(activeThemeId) : null);
  useEffect(() => setSelectedThemeId(activeThemeId ? String(activeThemeId) : null), [activeThemeId]);

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      position="right"
      title="Board settings"
      size="sm"
      padding="md"
    >
      <Stack gap="lg">
        {/* Appearance — the top bar's toggle lives here since it's hidden in the Writing Desk. */}
        <Group justify="space-between">
          <Text size="sm" fw={600}>Dark mode</Text>
          <ActionIcon
            onClick={() => setColorScheme(computedColorScheme === 'light' ? 'dark' : 'light')}
            variant="default"
            size="lg"
            aria-label="Toggle color scheme"
          >
            <IconSun stroke={1.5} className="mantine-light-hidden" />
            <IconMoon stroke={1.5} className="mantine-dark-hidden" />
          </ActionIcon>
        </Group>

        <Divider />

        {/* Word count (applies to every project/board in the Writing Desk) */}
        <div>
          <Text size="sm" fw={600} mb="xs">Word count display</Text>
          <SegmentedControl
            fullWidth
            size="xs"
            style={{m: '3px'}}
            value={wcSettings.mode}
            onChange={(v) => onWcSettings({ wordCountDisplayMode: v as WordCountMode })}
            data={[
              { label: 'Off', value: 'off' },
              { label: 'Progress bar', value: 'bar' },
              { label: 'Text', value: 'text' },
              { label: 'Combo', value: 'combo' },
            ]}
          />
          <Text size="xs" c="dimmed" mt="md" mb={4}>Default goals (cards/lists/groups can override)</Text>
          <Stack gap="xs">
            <NumberInput
              label="Card"
              placeholder="No default"
              size="xs"
              min={0}
              value={wcSettings.defaultCardGoal ?? ''}
              onChange={(v) => onWcSettings({ defaultCardWordGoal: v === '' ? null : Number(v) })}
            />
            <NumberInput
              label="List"
              placeholder="No default"
              size="xs"
              min={0}
              value={wcSettings.defaultListGoal ?? ''}
              onChange={(v) => onWcSettings({ defaultListWordGoal: v === '' ? null : Number(v) })}
            />
            <NumberInput
              label="Group"
              placeholder="No default"
              size="xs"
              min={0}
              value={wcSettings.defaultGroupGoal ?? ''}
              onChange={(v) => onWcSettings({ defaultGroupWordGoal: v === '' ? null : Number(v) })}
            />
          </Stack>
        </div>

        <Divider />

        {/* Theme */}
        <div>
          <Text size="sm" fw={600} mb="xs">Theme</Text>
          <Select
            placeholder="Default look"
            clearable
            data={themes.map((t) => ({ value: String(t.id), label: t.name }))}
            value={selectedThemeId}
            onChange={setSelectedThemeId}
            comboboxProps={{ withinPortal: true }}
          />
          <Group grow mt="xs">
            <Button
              size="xs"
              variant="light"
              color="gray"
              onClick={async () => {
                await setBoardTheme(activeBoardId, selectedThemeId ? Number(selectedThemeId) : null);
                router.refresh();
              }}
            >
              Apply to this board
            </Button>
            <Button
              size="xs"
              variant="light"
              color="gray"
              onClick={async () => {
                if (await confirmAction({
                  title: 'Apply theme to all boards',
                  message: 'Apply this theme to every board in this project? This replaces each board’s current theme.',
                  danger: false,
                  confirmLabel: 'Apply',
                })) {
                  await setThemeForAllBoards(projectId, selectedThemeId ? Number(selectedThemeId) : null);
                  router.refresh();
                }
              }}
            >
              Apply to all boards
            </Button>
          </Group>
          <Button
            mt="xs"
            size="xs"
            variant="subtle"
            color="gray"
            fullWidth
            leftSection={<IconPalette size={14} />}
            onClick={() => { onClose(); onManageThemes(); }}
          >
            Manage themes…
          </Button>
        </div>

        <Divider />

        {/* Prose spacing */}
        <div>
          <Text size="sm" fw={600} mb="xs">Spacing</Text>
          <DocumentSpacingMenu value={spacing} onChange={onSpacing} />
        </div>

        <Divider />

        {/* Labels + compile */}
        <Button
          variant="light"
          color="gray"
          leftSection={<IconTags size={16} />}
          onClick={() => { onClose(); onManageLabels(); }}
          fullWidth
        >
          Manage labels
        </Button>
        <Button
          component={Link}
          href={`/writing/${projectId}/${activeBoardId}/compile/board/${activeBoardId}`}
          variant="light"
          color="gray"
          leftSection={<IconBook2 size={16} />}
          fullWidth
        >
          Compile board
        </Button>
        <Button
          component={Link}
          href={`/writing/${projectId}/export/epub?board=${activeBoardId}`}
          variant="light"
          color="gray"
          leftSection={<IconFileExport size={16} />}
          fullWidth
        >
          Export (epub / docx)
        </Button>
      </Stack>
    </Drawer>
  );
}
