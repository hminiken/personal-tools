// Single source of truth for crochet-hook-size options, shared by the
// pattern/project metadata form and the AI import preview so the vocabulary
// stays consistent everywhere.
//
// Modeled on the Heart Hook Home "Crochet Hook Sizes" chart. We key everything
// off the metric (mm) size since that's unambiguous, and display the US
// designation (letter + number) alongside it, e.g. "6mm - J/10". Rows that have
// no US letter/number on the chart show just the mm, e.g. "7mm".
//
// Free-text hook values (from older data or the AI import) are normalized onto
// one of these via `normalizeHookSize`, so we only ever store these labels.

type HookRow = { mm: string; us: string | null };

// Order follows increasing hook size (smallest to largest).
const HOOK_TABLE: HookRow[] = [
  { mm: '2',    us: null },
  { mm: '2.25', us: 'B/1' },
  { mm: '2.5',  us: null },
  { mm: '2.75', us: 'C/2' },
  { mm: '3',    us: null },
  { mm: '3.25', us: 'D/3' },
  { mm: '3.5',  us: 'E/4' },
  { mm: '3.75', us: 'F/5' },
  { mm: '4',    us: 'G/6' },
  { mm: '4.5',  us: '7' },
  { mm: '5',    us: 'H/8' },
  { mm: '5.5',  us: 'I/9' },
  { mm: '6',    us: 'J/10' },
  { mm: '6.5',  us: 'K/10.5' },
  { mm: '7',    us: null },
  { mm: '8',    us: 'L/11' },
  { mm: '9',    us: 'M/13' },
  { mm: '10',   us: 'N/15' },
  { mm: '15',   us: 'P/Q' },
  { mm: '16',   us: 'Q' },
  { mm: '19',   us: 'S' },
];

function hookLabel(row: HookRow): string {
  return row.us ? `${row.mm}mm - ${row.us}` : `${row.mm}mm`;
}

export const HOOK_SIZES: string[] = HOOK_TABLE.map(hookLabel);

// Build the option list for a Mantine MultiSelect, merging in any values that
// are already saved on the record but aren't in the canonical list (legacy
// free-text entries). This keeps previously-saved hooks visible/selected
// instead of vanishing from the chips.
export function hookOptionsWith(current: string[] = []): string[] {
  const merged = [...HOOK_SIZES];
  for (const raw of current) {
    const value = raw.trim();
    if (value && !merged.includes(value)) merged.push(value);
  }
  return merged;
}

// --- Lookups, built once from the table -------------------------------------

const byMm = new Map<number, HookRow>();
const byUsLetter = new Map<string, HookRow>();
const byUsNumber = new Map<number, HookRow>();

for (const row of HOOK_TABLE) {
  byMm.set(parseFloat(row.mm), row);
  if (!row.us) continue;
  const [first, second] = row.us.split('/');
  // Letter side (e.g. "J" of "J/10", or "P" of "P/Q", or a bare "Q"/"S").
  if (/^[a-z]$/i.test(first) && !byUsLetter.has(first.toLowerCase())) {
    byUsLetter.set(first.toLowerCase(), row);
  }
  // Number side (e.g. "10" of "J/10", "10.5" of "K/10.5", or a bare "7").
  const numStr = second ?? first;
  const num = parseFloat(numStr);
  if (/^\d+(\.\d+)?$/.test(numStr) && !byUsNumber.has(num)) {
    byUsNumber.set(num, row);
  }
}

// Normalize a single free-text hook token (e.g. "5mm", "H/8", "H", "size J",
// "10.5") to a canonical hook label, or null if it can't be recognized.
//
// Disambiguation: an explicit "mm" always wins; otherwise a US letter; and only
// then is a bare number treated as a US size (so "6" → US G/6 = 4mm, while
// "6mm" → the 6mm/J/10 row).
export function normalizeHookSize(raw: string): string | null {
  const s = raw.toLowerCase().trim();
  if (!s) return null;

  // 1. Explicit metric, e.g. "5mm", "6.5 mm", "4.0mm".
  const mm = s.match(/(\d+(?:\.\d+)?)\s*mm/);
  if (mm) {
    const row = byMm.get(parseFloat(mm[1]));
    if (row) return hookLabel(row);
  }

  // 2. US letter, e.g. "h", "h/8", "size j", "p/q".
  const letter = s.match(/\b([b-np-s])\b/);
  if (letter) {
    const row = byUsLetter.get(letter[1]);
    if (row) return hookLabel(row);
  }

  // 3. Bare number treated as a US size, e.g. "10", "10.5", "7".
  const num = s.match(/\d+(?:\.\d+)?/);
  if (num) {
    const row = byUsNumber.get(parseFloat(num[0]));
    if (row) return hookLabel(row);
  }

  return null;
}

// Normalize a comma-separated free-text hooks string (as produced by the AI
// import) into a deduped list of canonical hook labels. Unrecognized tokens are
// dropped so the result only ever contains standard values.
export function normalizeHookSizes(raw: string | null | undefined): string[] {
  if (!raw) return [];
  const out: string[] = [];
  for (const token of raw.split(',')) {
    const canonical = normalizeHookSize(token);
    if (canonical && !out.includes(canonical)) out.push(canonical);
  }
  return out;
}
