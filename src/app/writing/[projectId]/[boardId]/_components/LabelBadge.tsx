'use client';

import { Badge, type BadgeProps } from '@mantine/core';
import { labelDisplay } from '@/utils/writingLabels';
import type { Label, LabelCategory } from '../types';

// A single colored label chip. Shows "Category: Value" when the label sits in
// a category, otherwise just the value.
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
      radius="sm"
      size="lg"
      style={{ textTransform: 'none', fontWeight: 600 }}
      {...badgeProps}
    >
      {labelDisplay(label, categories)}
    </Badge>
  );
}
