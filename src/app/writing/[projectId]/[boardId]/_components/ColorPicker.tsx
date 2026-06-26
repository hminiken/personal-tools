'use client';

import { Popover, ColorSwatch, SimpleGrid, useMantineTheme } from '@mantine/core';
import { IconCheck } from '@tabler/icons-react';
import { LABEL_COLORS } from '@/utils/writingLabels';

// Resolve a stored color value to a hex for the swatch preview. Hex values pass
// through; legacy Mantine color NAMES (e.g. 'rust') resolve via the theme.
function resolveHex(theme: ReturnType<typeof useMantineTheme>, value: string): string {
  if (value.startsWith('#') || value.startsWith('rgb') || value.startsWith('hsl')) return value;
  const tuple = theme.colors[value];
  return tuple ? tuple[6] : value;
}

// A swatch button that opens a grid of label colors. `value`/`onChange` use
// CSS color values (see LABEL_COLORS).
export default function ColorPicker({
  value,
  onChange,
  size = 22,
}: {
  value: string;
  onChange: (color: string) => void;
  size?: number;
}) {
  const theme = useMantineTheme();
  const current = resolveHex(theme, value);

  return (
    <Popover position="bottom-start" withinPortal shadow="md">
      <Popover.Target>
        <ColorSwatch
          component="button"
          type="button"
          color={current}
          size={size}
          style={{ cursor: 'pointer', color: '#fff' }}
          aria-label="Pick color"
        />
      </Popover.Target>
      <Popover.Dropdown p="xs">
        <SimpleGrid cols={8} spacing={6} style={{ maxWidth: 280 }}>
          {LABEL_COLORS.map((hex) => (
            <ColorSwatch
              key={hex}
              component="button"
              type="button"
              color={hex}
              size={24}
              style={{ cursor: 'pointer', color: '#fff' }}
              onClick={() => onChange(hex)}
              aria-label={hex}
            >
              {current.toLowerCase() === hex.toLowerCase() ? <IconCheck size={14} /> : null}
            </ColorSwatch>
          ))}
        </SimpleGrid>
      </Popover.Dropdown>
    </Popover>
  );
}
