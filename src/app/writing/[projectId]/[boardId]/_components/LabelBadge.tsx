'use client';

import { Badge, type BadgeProps } from '@mantine/core';
import { IconBorderTop } from '@tabler/icons-react';
import { labelDisplay } from '@/utils/writingLabels';
import type { Label, LabelCategory } from '../types';

// A single colored label chip. Shows "Category: Value" when the label sits in
// a category, otherwise just the value. Labels flagged to drive card color get
// a small top-strip glyph (the same icon as the Manage Labels toggle) so it's
// obvious at a glance that this label paints the card's accent strip.
export default function LabelBadge({
  label,
  categories,
  ...badgeProps
}: {
  label: Label;
  categories: LabelCategory[];
} & BadgeProps) {
  return (
    <Badge
      color={label.color}
      variant="filled"
      autoContrast
      radius="sm"
      size="lg"
      style={{ textTransform: 'none', fontWeight: 600 }}
      styles={{ section: { marginInlineStart: 3 } }}
      rightSection={label.drivesCardColor ? <IconBorderTop size={10} style={{ display: 'block' }} /> : undefined}
      {...badgeProps}
    >
      {labelDisplay(label, categories)}
    </Badge>
  );
}
