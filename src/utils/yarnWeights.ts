// Single source of truth for yarn-weight options, shared by the yarn form,
// yarn viewer, and the pattern/project metadata form so the vocabulary stays
// consistent everywhere.
//
// These are the 8 canonical CYC standard weights (numbered 0–7). The labels are
// kept EXACTLY as they were first stored (e.g. "Medium/Worsted (4)") so existing
// rows keep matching their dropdown option. Trade names (Sport, DK, Aran,
// Fingering, Chunky, ...) are NOT separate options — they are normalized onto
// one of these 8 via `normalizeYarnWeight` so we only ever store these values.
// Order follows increasing weight.
export const YARN_WEIGHTS: string[] = [
  'Lace (0)',
  'Super Fine/Fingering/Sock (1)',
  'Fine/Sport (2)',
  'Light/DK (3)',
  'Medium/Worsted/Aran (4)',
  'Bulky/Chunky (5)',
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

// Trade-name → canonical mapping, modeled on the Moogly "Yarn Weights & Symbols"
// chart. Ordered most-specific first so "super bulky" beats "bulky", "light
// worsted" beats "worsted", etc. Ply counts are handled separately (below)
// because a "4 ply" is Super Fine (1), NOT Medium (4) — the ply number and the
// CYC number are different scales.
const WEIGHT_RULES: { canonical: string; match: RegExp }[] = [
  // 6 — Super Bulky / Super Chunky / Roving
  { canonical: 'Super Bulky (6)', match: /super\s*bulky|super\s*chunky|\broving\b|\b6\b/ },
  // 1 — Super Fine / Sock / Fingering / Baby
  { canonical: 'Super Fine/Fingering/Sock (1)', match: /super\s*fine|\bsock\b|\bfingering\b|\bbaby\b|\b1\b/ },
  // 3 — Light / DK / Light Worsted (check before "worsted")
  { canonical: 'Light/DK (3)', match: /light\s*worsted|\blight\b|\bdk\b|double\s*knit|\b3\b/ },
  // 7 — Jumbo
  { canonical: 'Jumbo (7)', match: /\bjumbo\b|\b7\b/ },
  // 5 — Bulky / Chunky / Craft / Rug
  { canonical: 'Bulky/Chunky (5)', match: /\bbulky\b|\bchunky\b|\bcraft\b|\brug\b|\b5\b/ },
  // 4 — Medium / Worsted / Aran / Afghan
  { canonical: 'Medium/Worsted/Aran (4)', match: /\bworsted\b|\baran\b|\bafghan\b|\bmedium\b|\b4\b/ },
  // 2 — Fine / Sport
  { canonical: 'Fine/Sport (2)', match: /\bfine\b|\bsport\b|\b2\b/ },
  // 0 — Lace / Thread / Cobweb
  { canonical: 'Lace (0)', match: /\blace\b|\bthread\b|\bcobweb\b|\b0\b/ },
];

// Map a ply count to a canonical weight, per the chart's "ply" column.
function plyToCanonical(ply: number): string {
  if (ply <= 3) return 'Lace (0)';
  if (ply === 4) return 'Super Fine/Fingering/Sock (1)';
  if (ply <= 7) return 'Fine/Sport (2)';         // 5–7 ply
  if (ply <= 9) return 'Light/DK (3)';           // 8 ply
  if (ply <= 12) return 'Medium/Worsted/Aran (4)'; // 10–12 ply
  if (ply <= 14) return 'Bulky/Chunky (5)';      // 12–14 ply
  if (ply <= 16) return 'Super Bulky (6)';       // 14–16 ply
  return 'Jumbo (7)';                            // 16+ ply
}

// Normalize a single free-text weight token (e.g. "Worsted", "DK", "#4",
// "10-ply", "Super Chunky") to one of the 8 canonical CYC weights, or null if
// it can't be recognized. Ply is checked first so "4 ply" doesn't get misread
// as CYC #4.
export function normalizeYarnWeight(raw: string): string | null {
  const s = raw.toLowerCase().trim();
  if (!s) return null;

  const plyMatch = s.match(/(\d+)\s*-?\s*ply/);
  if (plyMatch) return plyToCanonical(Number(plyMatch[1]));

  for (const rule of WEIGHT_RULES) {
    if (rule.match.test(s)) return rule.canonical;
  }
  return null;
}

// Normalize a comma-separated free-text weights string (as produced by the AI
// import) into a deduped list of canonical weights. Unrecognized tokens are
// dropped so the result only ever contains the 8 standard values.
export function normalizeYarnWeights(raw: string | null | undefined): string[] {
  if (!raw) return [];
  const out: string[] = [];
  for (const token of raw.split(',')) {
    const canonical = normalizeYarnWeight(token);
    if (canonical && !out.includes(canonical)) out.push(canonical);
  }
  return out;
}
