// src/utils/writingLabels.ts
//
// Shared constants/helpers for Writing Desk card labels.
import type { Label, LabelCategory } from '@/app/writing/[projectId]/[boardId]/types';

// The swatches offered in the color picker (labels, folders, card backgrounds).
// Each value is a CSS hex. Organised as one family per row (the picker grids are
// 8 columns wide, so each family below is exactly 8 shades, light → dark):
// the rainbow in ROYGBIV order, then a white → gray → black ramp, then a light
// tan → dark brown ramp. Light shades are meant as soft backgrounds/tints; on
// filled label chips, LabelBadge's `autoContrast` flips the text to dark so
// pale swatches stay legible. Legacy labels saved as Mantine color NAMES (e.g.
// 'rust') or older hexes still render fine — stored colors don't have to appear
// in this list.
export const LABEL_COLORS: string[] = [
  // red
  '#fecaca', '#fca5a5', '#f87171', '#ef4444', '#dc2626', '#b91c1c', '#991b1b', '#7f1d1d',
  // orange
  '#fed7aa', '#fdba74', '#fb923c', '#f97316', '#ea580c', '#c2410c', '#9a3412', '#7c2d12',
  // yellow
  '#fef08a', '#fde047', '#facc15', '#eab308', '#ca8a04', '#a16207', '#854d0e', '#713f12',
  // green
  '#bbf7d0', '#86efac', '#4ade80', '#22c55e', '#16a34a', '#15803d', '#166534', '#14532d',
  // blue
  '#bfdbfe', '#93c5fd', '#60a5fa', '#3b82f6', '#2563eb', '#1d4ed8', '#1e40af', '#1e3a8a',
  // indigo
  '#c7d2fe', '#a5b4fc', '#818cf8', '#6366f1', '#4f46e5', '#4338ca', '#3730a3', '#312e81',
  // violet
  '#ddd6fe', '#c4b5fd', '#a78bfa', '#8b5cf6', '#7c3aed', '#6d28d9', '#5b21b6', '#4c1d95',
  // white → gray → black
  '#ffffff', '#e5e7eb', '#cbd5e1', '#94a3b8', '#64748b', '#475569', '#1e293b', '#000000',
  // light tan → dark brown
  '#f0e2d0', '#e3c9a8', '#d2a679', '#bd8551', '#9e6a3c', '#7e5230', '#5d3c22', '#3e2815',
];

export const DEFAULT_LABEL_COLOR = '#64748b';

// Picks a readable foreground (black or white) for content drawn ON TOP of a
// swatch — e.g. the "selected" check mark. Uses perceived luminance so the mark
// stays visible on both the pale and dark ends of every family. Non-hex values
// (legacy Mantine color names) default to white.
export function onSwatchColor(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return '#fff';
  const int = parseInt(m[1], 16);
  const r = (int >> 16) & 0xff, g = (int >> 8) & 0xff, b = int & 0xff;
  // Rec. 601 luma, 0–255. Bright swatches get a dark mark, dark ones a light mark.
  const luma = 0.299 * r + 0.587 * g + 0.114 * b;
  return luma > 150 ? '#000' : '#fff';
}

// Text shown on a chip: "POV: John" when the label sits in a category,
// otherwise just the label name.
export function labelDisplay(
  label: Pick<Label, 'name' | 'categoryId'>,
  categories: Pick<LabelCategory, 'id' | 'name'>[]
): string {
  if (label.categoryId == null) return label.name;
  const cat = categories.find((c) => c.id === label.categoryId);
  return cat ? `${cat.name}: ${label.name}` : label.name;
}
