'use client';

import { useState } from 'react';
import {
  Group, Popover, Button, Stack, Text, Checkbox, ScrollArea, Divider,
} from '@mantine/core';
import { IconTag, IconSettings, IconX } from '@tabler/icons-react';
import LabelBadge from './LabelBadge';
import { addCardLabel, removeCardLabel } from '../../../_actions/writing_actions';
import type { BoardCard, Label, LabelCatalog } from '../types';
import classes from './LabelPicker.module.css';

// Label assignment UI for the card editor. Holds applied labels in local state
// for instant feedback; the underlying board revalidates on each toggle.
export default function LabelPicker({
  card,
  catalog,
  onManage,
  inline = false,
  children,
}: {
  card: BoardCard;
  catalog: LabelCatalog;
  onManage: () => void;
  // When inline: the trigger sits on a controls row (alongside any `children`,
  // e.g. the card switches) and the applied chips drop to their own row below.
  inline?: boolean;
  children?: React.ReactNode;
}) {
  const [applied, setApplied] = useState<Label[]>(card.labels);
  const [pickerOpened, setPickerOpened] = useState(false);
  const appliedIds = new Set(applied.map((l) => l.id));

  const toggle = (label: Label, on: boolean) => {
    if (on) {
      // Mirror the server's single-select rule locally for instant feedback.
      const cat = catalog.categories.find((c) => c.id === label.categoryId);
      setApplied((prev) => {
        const kept = cat?.singleSelect
          ? prev.filter((l) => l.categoryId !== label.categoryId)
          : prev;
        return [...kept, label];
      });
      addCardLabel(card.id, label.id);
    } else {
      setApplied((prev) => prev.filter((l) => l.id !== label.id));
      removeCardLabel(card.id, label.id);
    }
  };

  // Group labels by category for the picker list; standalone labels last.
  const categorized = catalog.categories.map((cat) => ({
    cat,
    labels: catalog.labels.filter((l) => l.categoryId === cat.id),
  }));
  const standalone = catalog.labels.filter((l) => l.categoryId == null);

  const row = (label: Label) => (
    <Checkbox
      key={label.id}
      checked={appliedIds.has(label.id)}
      onChange={(e) => toggle(label, e.currentTarget.checked)}
      label={<LabelBadge label={label} categories={catalog.categories} />}
      styles={{ labelWrapper: { justifyContent: 'center' } }}
    />
  );

  const trigger = (
    <Popover position="bottom-start" withinPortal shadow="md" width={260} opened={pickerOpened} onChange={setPickerOpened}>
      <Popover.Target>
        <Button
          size="compact-xs"
          variant="light"
          color="gray"
          leftSection={<IconTag size={14} />}
          onClick={() => setPickerOpened((o) => !o)}
        >
          {inline ? 'Add / edit labels' : 'Add / edit'}
        </Button>
      </Popover.Target>
      <Popover.Dropdown p="xs">
            <ScrollArea.Autosize mah={320}>
              <Stack gap="xs">
                {catalog.labels.length === 0 && (
                  <Text size="xs" c="dimmed">No labels yet. Create some in “Manage labels.”</Text>
                )}
                {categorized.map(({ cat, labels }) =>
                  labels.length ? (
                    <Stack key={cat.id} gap={4}>
                      <Text size="xs" fw={700} c="dimmed" tt="uppercase">
                        {cat.name}{cat.singleSelect ? ' · one' : ''}
                      </Text>
                      {labels.map(row)}
                    </Stack>
                  ) : null
                )}
                {standalone.length > 0 && categorized.some(({ labels }) => labels.length) && (
                  <Divider my={2} />
                )}
                {standalone.map(row)}
              </Stack>
            </ScrollArea.Autosize>
            <Divider my="xs" />
            <Button
              size="compact-xs"
              variant="subtle"
              color="gray"
              fullWidth
              leftSection={<IconSettings size={14} />}
              onClick={() => { setPickerOpened(false); onManage(); }}
            >
              Manage labels
            </Button>
          </Popover.Dropdown>
        </Popover>
  );

  const chips = applied.map((label) => (
    <div key={label.id} className={classes.chip}>
      <LabelBadge label={label} categories={catalog.categories} />
      <div
        className={classes.removeOverlay}
        role="button"
        aria-label="Remove label"
        onClick={() => toggle(label, false)}
      >
        <IconX size={13} color="white" />
      </div>
    </div>
  ));

  // Inline: controls row (trigger + any children) with chips on the row below.
  if (inline) {
    return (
      <Stack gap="xs">
        <Group gap="md" align="center" wrap="wrap">
          {trigger}
          {children}
        </Group>
        {applied.length > 0 && <Group gap={6}>{chips}</Group>}
      </Stack>
    );
  }

  return (
    <div>
      <Group gap={6} mb={6} align="center">
        <Text size="sm" fw={600} c="dimmed">Labels</Text>
        {trigger}
      </Group>

      <Group gap={6}>
        {applied.length === 0 && <Text size="xs" c="dimmed">None</Text>}
        {chips}
      </Group>
    </div>
  );
}
