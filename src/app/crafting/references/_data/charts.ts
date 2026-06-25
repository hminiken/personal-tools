// Static reference chart data for the crafting References area.
//
// These are reference *facts* (industry conversion charts), separate from the
// canonical dropdown vocabularies in `src/utils/{yarnWeights,hookSizes,
// knittingNeedles}.ts`. The dropdowns store what you pick; these tables explain
// how the sizes relate. Recommended hook/needle ranges follow the Craft Yarn
// Council standards.

// ── Master yarn-weight chart ────────────────────────────────────────────────
// The headline "what yarn = what tools" table.
export type YarnWeightRow = {
  cyc: string;        // CYC symbol number, 0–7
  name: string;       // Standard weight name
  alsoCalled: string; // Common trade names that map to this weight
  ply: string;        // Approx ply (AU/UK)
  crochetHook: string;// Recommended crochet hook range (metric / US)
  knitNeedle: string; // Recommended knitting needle range (metric / US)
};

export const YARN_WEIGHT_CHART: YarnWeightRow[] = [
  { cyc: '0', name: 'Lace',        alsoCalled: 'Fingering, Thread, Cobweb', ply: '1–3 ply', crochetHook: '1.6–2.25 mm (steel–B/1)', knitNeedle: '1.5–2.25 mm (000–1)' },
  { cyc: '1', name: 'Super Fine',  alsoCalled: 'Sock, Fingering, Baby',     ply: '4 ply',   crochetHook: '2.25–3.5 mm (B/1–E/4)',     knitNeedle: '2.25–3.25 mm (1–3)' },
  { cyc: '2', name: 'Fine',        alsoCalled: 'Sport, Baby',               ply: '5 ply',   crochetHook: '3.5–4.5 mm (E/4–7)',        knitNeedle: '3.25–3.75 mm (3–5)' },
  { cyc: '3', name: 'Light',       alsoCalled: 'DK, Light Worsted',         ply: '8 ply',   crochetHook: '4.5–5.5 mm (7–I/9)',        knitNeedle: '3.75–4.5 mm (5–7)' },
  { cyc: '4', name: 'Medium',      alsoCalled: 'Worsted, Aran, Afghan',     ply: '10–12 ply', crochetHook: '5.5–6.5 mm (I/9–K/10.5)', knitNeedle: '4.5–5.5 mm (7–9)' },
  { cyc: '5', name: 'Bulky',       alsoCalled: 'Chunky, Craft, Rug',        ply: '12–14 ply', crochetHook: '6.5–9 mm (K/10.5–M/13)', knitNeedle: '5.5–8 mm (9–11)' },
  { cyc: '6', name: 'Super Bulky', alsoCalled: 'Super Chunky, Roving',      ply: '14–16 ply', crochetHook: '9–15 mm (M/13–Q)',       knitNeedle: '8–12.75 mm (11–17)' },
  { cyc: '7', name: 'Jumbo',       alsoCalled: 'Roving',                    ply: '16+ ply', crochetHook: '15 mm+ (Q and up)',         knitNeedle: '12.75 mm+ (17 and up)' },
];

// ── Crochet hook conversion chart ───────────────────────────────────────────
// Metric / US / UK. Mirrors the dropdown list in utils/hookSizes.ts, plus UK.
export type HookConvRow = { mm: string; us: string; uk: string };

export const HOOK_CONVERSION_CHART: HookConvRow[] = [
  { mm: '2 mm',    us: '–',       uk: '14' },
  { mm: '2.25 mm', us: 'B/1',     uk: '13' },
  { mm: '2.5 mm',  us: '–',       uk: '12' },
  { mm: '2.75 mm', us: 'C/2',     uk: '–' },
  { mm: '3 mm',    us: '–',       uk: '11' },
  { mm: '3.25 mm', us: 'D/3',     uk: '10' },
  { mm: '3.5 mm',  us: 'E/4',     uk: '9' },
  { mm: '3.75 mm', us: 'F/5',     uk: '–' },
  { mm: '4 mm',    us: 'G/6',     uk: '8' },
  { mm: '4.5 mm',  us: '7',       uk: '7' },
  { mm: '5 mm',    us: 'H/8',     uk: '6' },
  { mm: '5.5 mm',  us: 'I/9',     uk: '5' },
  { mm: '6 mm',    us: 'J/10',    uk: '4' },
  { mm: '6.5 mm',  us: 'K/10.5',  uk: '3' },
  { mm: '7 mm',    us: '–',       uk: '2' },
  { mm: '8 mm',    us: 'L/11',    uk: '0' },
  { mm: '9 mm',    us: 'M/13',    uk: '00' },
  { mm: '10 mm',   us: 'N/15',    uk: '000' },
  { mm: '15 mm',   us: 'P/Q',     uk: '–' },
  { mm: '16 mm',   us: 'Q',       uk: '–' },
  { mm: '19 mm',   us: 'S',       uk: '–' },
];

// ── Knitting needle conversion chart ────────────────────────────────────────
// Metric / US (UK sizes intentionally omitted). Mirrors utils/knittingNeedles.ts.
export type NeedleConvRow = { mm: string; us: string };

export const NEEDLE_CONVERSION_CHART: NeedleConvRow[] = [
  { mm: '1 mm',    us: '0' },
  { mm: '1.25 mm', us: '0' },
  { mm: '1.5 mm',  us: '0' },
  { mm: '1.75 mm', us: '0' },
  { mm: '2 mm',    us: '0' },
  { mm: '2.25 mm', us: '1' },
  { mm: '2.75 mm', us: '2' },
  { mm: '3 mm',    us: '2.5' },
  { mm: '3.25 mm', us: '3' },
  { mm: '3.5 mm',  us: '4' },
  { mm: '3.75 mm', us: '5' },
  { mm: '4 mm',    us: '6' },
  { mm: '4.5 mm',  us: '7' },
  { mm: '5 mm',    us: '8' },
  { mm: '5.5 mm',  us: '9' },
  { mm: '6 mm',    us: '10' },
  { mm: '6.5 mm',  us: '10.5' },
  { mm: '7 mm',    us: '–' },
  { mm: '7.5 mm',  us: '–' },
  { mm: '8 mm',    us: '11' },
  { mm: '9 mm',    us: '13' },
  { mm: '9.5 mm',  us: '14' },
  { mm: '10 mm',   us: '15' },
  { mm: '12 mm',   us: '17' },
  { mm: '16 mm',   us: '19' },
  { mm: '19 mm',   us: '35' },
  { mm: '25 mm',   us: '50' },
];
