// src/utils/writingLabels.ts
//
// Shared constants/helpers for Writing Desk card labels.
import type { Label, LabelCategory } from '@/app/writing/[projectId]/[boardId]/types';

// The swatches offered in the label color picker. Each value is a CSS hex.
// Mantine v9 computes the `variant="light"` tint from any color, so chips
// render readably in light + dark mode. Colors sit in the 400–800 range so the
// (colored) chip text stays legible on its tint — no pale, washed-out swatches.
// Legacy labels saved as Mantine color NAMES (e.g. 'rust') still render fine.
export const LABEL_COLORS: string[] = [
  // grays / neutrals
  '#64748b', '#475569', '#334155', '#6b7280', '#4b5563', '#374151', '#78716c', '#57534e',
  // reds
  '#ef4444', '#dc2626', '#b91c1c', '#991b1b',
  // oranges / ambers
  '#f97316', '#ea580c', '#c2410c', '#d97706', '#b45309',
  // yellows (kept dark for legibility)
  '#ca8a04', '#a16207',
  // limes / greens
  '#65a30d', '#4d7c0f', '#16a34a', '#15803d', '#166534',
  // emeralds / teals
  '#059669', '#047857', '#0d9488', '#0f766e',
  // cyans / skies
  '#0891b2', '#0e7490', '#0284c7', '#0369a1',
  // blues / indigos
  '#3b82f6', '#2563eb', '#1d4ed8', '#4f46e5', '#4338ca',
  // violets / purples
  '#7c3aed', '#6d28d9', '#9333ea', '#7e22ce',
  // fuchsias / pinks / roses
  '#c026d3', '#a21caf', '#db2777', '#be185d', '#e11d48', '#be123c',
  // app theme accents
  '#9b492f', '#6a7f4f', '#98752e',
];

export const DEFAULT_LABEL_COLOR = '#64748b';

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
