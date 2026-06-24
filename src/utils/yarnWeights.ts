// Single source of truth for yarn-weight options, shared by the yarn form,
// yarn viewer, and the pattern/project metadata form so the vocabulary stays
// consistent everywhere.
//
// The original 8 CYC standard values are kept EXACTLY as they were first
// stored (e.g. "Medium/Worsted (4)") so existing rows keep matching their
// dropdown option. We additionally expose the common trade names (Sport, DK,
// Aran) that already appear in older free-text data so those values map cleanly
// too. Order roughly follows increasing weight.
export const YARN_WEIGHTS: string[] = [
  'Lace (0)',
  'Super Fine (1)',
  'Fine (2)',
  'Sport',
  'Light (3)',
  'DK',
  'Medium/Worsted (4)',
  'Aran',
  'Bulky (5)',
  'Super Bulky (6)',
  'Jumbo (7)',
];

// Build the option list for a Mantine MultiSelect, merging in any values that
// are already saved on the record but aren't in the canonical list (legacy
// free-text entries like "Worsted, #4"). This keeps previously-saved weights
// visible and selected instead of silently vanishing from the chips.
export function weightOptionsWith(current: string[] = []): string[] {
  const merged = [...YARN_WEIGHTS];
  for (const raw of current) {
    const value = raw.trim();
    if (value && !merged.includes(value)) merged.push(value);
  }
  return merged;
}
