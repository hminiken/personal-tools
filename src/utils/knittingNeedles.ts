// Single source of truth for knitting-needle-size options, shared by the
// pattern/project metadata form and the AI import preview so the vocabulary
// stays consistent everywhere. The crochet-hook equivalent lives in
// `hookSizes.ts`; which one is used is driven by a pattern's craft type.
//
// Modeled on the Nimble Needles "Knitting Needle Size Chart" (UK sizes ignored,
// per request). We key off the metric (mm) size since that's unambiguous, and
// display the US size alongside it, e.g. "5mm - 8". Several small metric sizes
// share US 0, so the mm keeps them distinct. Rows with no US size show just mm.
//
// Free-text needle values (older data or AI import) are normalized onto one of
// these via `normalizeNeedleSize`, so we only ever store these labels.

type NeedleRow = { mm: string; us: string | null };

// Order follows increasing needle size (smallest to largest).
const NEEDLE_TABLE: NeedleRow[] = [
  { mm: '1',    us: '0' },
  { mm: '1.25', us: '0' },
  { mm: '1.5',  us: '0' },
  { mm: '1.75', us: '0' },
  { mm: '2',    us: '0' },
  { mm: '2.25', us: '1' },
  { mm: '2.75', us: '2' },
  { mm: '3',    us: '2.5' },
  { mm: '3.25', us: '3' },
  { mm: '3.5',  us: '4' },
  { mm: '3.75', us: '5' },
  { mm: '4',    us: '6' },
  { mm: '4.5',  us: '7' },
  { mm: '5',    us: '8' },
  { mm: '5.5',  us: '9' },
  { mm: '6',    us: '10' },
  { mm: '6.5',  us: '10.5' },
  { mm: '7',    us: null },
  { mm: '7.5',  us: null },
  { mm: '8',    us: '11' },
  { mm: '9',    us: '13' },
  { mm: '9.5',  us: '14' },
  { mm: '10',   us: '15' },
  { mm: '12',   us: '17' },
  { mm: '16',   us: '19' },
  { mm: '19',   us: '35' },
  { mm: '25',   us: '50' },
];

function needleLabel(row: NeedleRow): string {
  return row.us ? `${row.mm}mm - ${row.us}` : `${row.mm}mm`;
}

export const NEEDLE_SIZES: string[] = NEEDLE_TABLE.map(needleLabel);

// Build the option list for a Mantine MultiSelect, merging in any values that
// are already saved on the record but aren't in the canonical list (legacy
// free-text entries). This keeps previously-saved needles visible/selected
// instead of vanishing from the chips.
export function needleOptionsWith(current: string[] = []): string[] {
  const merged = [...NEEDLE_SIZES];
  for (const raw of current) {
    const value = raw.trim();
    if (value && !merged.includes(value)) merged.push(value);
  }
  return merged;
}

// --- Lookups, built once from the table -------------------------------------

const byMm = new Map<number, NeedleRow>();
const byUsNumber = new Map<number, NeedleRow>();

for (const row of NEEDLE_TABLE) {
  byMm.set(parseFloat(row.mm), row);
  if (!row.us) continue;
  // Several rows share US 0 (1mm–2mm); iterating in ascending order with
  // last-wins makes a bare "0" resolve to the largest/most-common 2mm needle.
  byUsNumber.set(parseFloat(row.us), row);
}

// Normalize a single free-text needle token (e.g. "5mm", "US 8", "size 10",
// "10.5") to a canonical needle label, or null if it can't be recognized.
//
// Disambiguation: an explicit "mm" always wins; otherwise a bare number is
// treated as a US size (so "6" → US 6 = 4mm, while "6mm" → the 6mm/US-10 row).
export function normalizeNeedleSize(raw: string): string | null {
  const s = raw.toLowerCase().trim();
  if (!s) return null;

  // 1. Explicit metric, e.g. "5mm", "6.5 mm", "4.0mm".
  const mm = s.match(/(\d+(?:\.\d+)?)\s*mm/);
  if (mm) {
    const row = byMm.get(parseFloat(mm[1]));
    if (row) return needleLabel(row);
  }

  // 2. Bare number treated as a US size, e.g. "8", "10.5", "us 15".
  const num = s.match(/\d+(?:\.\d+)?/);
  if (num) {
    const row = byUsNumber.get(parseFloat(num[0]));
    if (row) return needleLabel(row);
  }

  return null;
}

// Normalize a comma-separated free-text needles string (as produced by the AI
// import) into a deduped list of canonical needle labels. Unrecognized tokens
// are dropped so the result only ever contains standard values.
export function normalizeNeedleSizes(raw: string | null | undefined): string[] {
  if (!raw) return [];
  const out: string[] = [];
  for (const token of raw.split(',')) {
    const canonical = normalizeNeedleSize(token);
    if (canonical && !out.includes(canonical)) out.push(canonical);
  }
  return out;
}

// Convenience: pick the right normalizer for a craft type. Crochet → hooks is
// handled in `hookSizes.ts`; this module owns the knitting side.
export type CraftType = 'crochet' | 'knitting';
