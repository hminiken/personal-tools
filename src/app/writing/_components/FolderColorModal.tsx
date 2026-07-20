'use client';

import { Modal, SimpleGrid, ColorSwatch, Button, Group, Text, Stack } from '@mantine/core';
import { IconCheck, IconX } from '@tabler/icons-react';
import { LABEL_COLORS, onSwatchColor } from '@/utils/writingLabels';

// Pick (or clear) a folder's accent color. Reuses the same swatch palette as the
// label/group color pickers so folder colors stay on-theme. `value` is the
// folder's current color (CSS hex) or null; onPick receives the chosen hex, or
// null to remove the color.
export function FolderColorModal({
  opened,
  onClose,
  folderName,
  value,
  onPick,
}: {
  opened: boolean;
  onClose: () => void;
  folderName: string;
  value: string | null;
  onPick: (color: string | null) => void;
}) {
  const current = (value ?? '').toLowerCase();

  return (
    <Modal opened={opened} onClose={onClose} title={`Folder color${folderName ? ` — ${folderName}` : ''}`} centered size="sm">
      <Stack gap="md">
        <SimpleGrid cols={8} spacing={8}>
          {LABEL_COLORS.map((hex) => (
            <ColorSwatch
              key={hex}
              component="button"
              type="button"
              color={hex}
              size={26}
              style={{ cursor: 'pointer', color: onSwatchColor(hex) }}
              onClick={() => { onPick(hex); onClose(); }}
              aria-label={hex}
            >
              {current === hex.toLowerCase() ? <IconCheck size={14} /> : null}
            </ColorSwatch>
          ))}
        </SimpleGrid>

        <Group justify="space-between">
          <Button
            variant="subtle"
            color="gray"
            leftSection={<IconX size={16} />}
            onClick={() => { onPick(null); onClose(); }}
            disabled={!value}
          >
            No color
          </Button>
          <Button variant="default" onClick={onClose}>Done</Button>
        </Group>
        {!value && <Text size="xs" c="dimmed">No color set — the folder uses the default tint.</Text>}
      </Stack>
    </Modal>
  );
}
