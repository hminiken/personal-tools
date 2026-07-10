'use client';

import {
  ActionIcon, Button, Divider, Drawer, Group, NumberInput, SegmentedControl, Stack, Text,
  useMantineColorScheme, useComputedColorScheme,
} from '@mantine/core';
import { IconBook2, IconFileExport, IconMoon, IconSun, IconTags } from '@tabler/icons-react';
import Link from 'next/link';
import { DocumentSpacingMenu, type Spacing } from '@components/DocumentSpacing';
import type { WordCountSettings, WordCountMode } from '@components/WordCountDisplay';

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
}) {
  const { setColorScheme } = useMantineColorScheme();
  const computedColorScheme = useComputedColorScheme('light', { getInitialValueInEffect: true });

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
