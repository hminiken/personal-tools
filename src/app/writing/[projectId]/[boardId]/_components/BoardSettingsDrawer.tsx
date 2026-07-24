'use client';

import { useEffect, useState } from 'react';
import {
  Accordion, ActionIcon, Button, Divider, Drawer, Group, NumberInput, SegmentedControl, Select, Stack, Text,
  useMantineColorScheme, useComputedColorScheme,
} from '@mantine/core';
import { IconBook2, IconFileExport, IconMoon, IconSun, IconTags, IconPalette } from '@tabler/icons-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DocumentFormattingControls, type Spacing } from '@components/DocumentSpacing';
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

  // Selecting a theme applies it to this board immediately; "Apply to all
  // boards" is the only action still requiring an explicit click (it's
  // destructive to every other board's current theme, so it stays gated).
  const [selectedThemeId, setSelectedThemeId] = useState<string | null>(activeThemeId ? String(activeThemeId) : null);
  useEffect(() => setSelectedThemeId(activeThemeId ? String(activeThemeId) : null), [activeThemeId]);

  const handleSelectTheme = async (value: string | null) => {
    setSelectedThemeId(value);
    await setBoardTheme(activeBoardId, value ? Number(value) : null);
    router.refresh();
  };

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
        {/* Collapsible settings sections — all open by default so nothing is
            hidden on first open, but each can be folded away to reduce clutter. */}
        <Accordion
          multiple
          defaultValue={['appearance', 'theme', 'wordcount', 'formatting']}
          variant="default"
          chevronPosition="right"
          styles={{
            item: { border: 0, borderBottom: '1px solid var(--mantine-color-default-border)' },
            control: { paddingLeft: 0, paddingRight: 0 },
            content: { paddingLeft: 0, paddingRight: 0 },
            label: { fontSize: 'var(--mantine-font-size-sm)', fontWeight: 600, paddingTop: 8, paddingBottom: 8 },
          }}
        >
          {/* Appearance — the top bar's dark-mode toggle lives here since it's
              hidden in the Writing Desk. */}
          <Accordion.Item value="appearance">
            <Accordion.Control>Appearance</Accordion.Control>
            <Accordion.Panel>
              <Group justify="space-between">
                <Text size="sm">Dark mode</Text>
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
            </Accordion.Panel>
          </Accordion.Item>

          {/* Theme */}
          <Accordion.Item value="theme">
            <Accordion.Control>Theme</Accordion.Control>
            <Accordion.Panel>
              <Select
                placeholder="Default look"
                clearable
                data={[
                  { group: 'Built-in', items: themes.filter((t) => t.isBuiltin).map((t) => ({ value: String(t.id), label: t.name })) },
                  { group: 'Custom', items: themes.filter((t) => !t.isBuiltin).map((t) => ({ value: String(t.id), label: t.name })) },
                ].filter((g) => g.items.length > 0)}
                value={selectedThemeId}
                onChange={handleSelectTheme}
                comboboxProps={{ withinPortal: true }}
              />
              <Button
                mt="xs"
                size="xs"
                variant="light"
                color="gray"
                fullWidth
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
            </Accordion.Panel>
          </Accordion.Item>

          {/* Word count (applies to every project/board in the Writing Desk) */}
          <Accordion.Item value="wordcount">
            <Accordion.Control>Word count</Accordion.Control>
            <Accordion.Panel>
              <SegmentedControl
                fullWidth
                size="xs"
                value={wcSettings.mode}
                onChange={(v) => onWcSettings({ wordCountDisplayMode: v as WordCountMode })}
                data={[
                  { label: 'Off', value: 'off' },
                  { label: 'Progress bar', value: 'bar' },
                  { label: 'Text', value: 'text' },
                  { label: 'Combo', value: 'combo' },
                ]}
              />
              <Text size="xs" c="dimmed" mt="sm" mb={4}>Default goals (cards/lists/groups can override)</Text>
              <Group gap="xs" grow wrap="nowrap">
                <NumberInput
                  label="Card"
                  placeholder="—"
                  size="xs"
                  min={0}
                  hideControls
                  value={wcSettings.defaultCardGoal ?? ''}
                  onChange={(v) => onWcSettings({ defaultCardWordGoal: v === '' ? null : Number(v) })}
                />
                <NumberInput
                  label="List"
                  placeholder="—"
                  size="xs"
                  min={0}
                  hideControls
                  value={wcSettings.defaultListGoal ?? ''}
                  onChange={(v) => onWcSettings({ defaultListWordGoal: v === '' ? null : Number(v) })}
                />
                <NumberInput
                  label="Group"
                  placeholder="—"
                  size="xs"
                  min={0}
                  hideControls
                  value={wcSettings.defaultGroupGoal ?? ''}
                  onChange={(v) => onWcSettings({ defaultGroupWordGoal: v === '' ? null : Number(v) })}
                />
              </Group>
            </Accordion.Panel>
          </Accordion.Item>

          {/* Prose formatting — inline controls (font, size, spacing, indent, quotes). */}
          <Accordion.Item value="formatting">
            <Accordion.Control>Formatting</Accordion.Control>
            <Accordion.Panel>
              <DocumentFormattingControls value={spacing} onChange={onSpacing} />
            </Accordion.Panel>
          </Accordion.Item>
        </Accordion>

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
