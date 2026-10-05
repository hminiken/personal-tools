import { generateJson } from './gemini';
import { reduceSizeLists } from './prepareSource';

// ---- Planning (only when the user gave instructions) ----
// Asking every chunk to apply "only keep size XL" on its own is unreliable:
// each chunk sees a different slice and they disagree. Instead one call sees
// the whole pattern — one numbered line per block — and returns:
//   - line ranges to remove (e.g. "XS(S,M) ONLY-" and the rows under it).
//     Ranges rather than headings, because some sites format EVERY line as a
//     heading, so "drop a heading and what's under it" removed only labels.
//   - the pattern's size order and the requested size, so code (not the
//     model) can reduce lists like "85 (91, 100, 104, 112)".
//   - ranges that use a shorter, local size order (e.g. under
//     "L(XL,2X,3X,4X,5X) ONLY-" the lists are for L..5X, so XL is the 2nd
//     value there, not the 5th).
// Code then applies all of it deterministically (applyPlan).

type Scoped = { from: number; to: number; count: number; index: number };
export type ImportPlan = { drop: Set<number>; sizeCount: number; sizeIndex: number; scoped: Scoped[] };

export const NO_PLAN: ImportPlan = { drop: new Set(), sizeCount: 0, sizeIndex: -1, scoped: [] };

export function headingOf(block: string): { level: number; text: string } | null {
  const m = block.match(/^<h([1-6])>([\s\S]*?)<\/h\1>$/i);
  if (!m) return null;
  return { level: Number(m[1]), text: m[2].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim() };
}

const plain = (b: string) =>
  b.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

// Canonical size names, so "X-Large" = "XL", "2X-Large" = "2XL" = "2X",
// "Small" = "S".
const SIZE_WORDS: Record<string, string> = {
  xsmall: 'xs', extrasmall: 'xs', small: 's', medium: 'm', large: 'l',
  xlarge: 'xl', extralarge: 'xl', xxl: '2x', xxxl: '3x', xxxxl: '4x', xxxxxl: '5x',
};
function normSize(s: string): string {
  const t = String(s).toLowerCase().replace(/[^a-z0-9]/g, '');
  const m = t.match(/^(\d+)x(large|l)?$/);
  if (m) return `${m[1]}x`;
  return SIZE_WORDS[t] ?? t;
}

const ORDINALS = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth'];

// "fifth size" / "5th size" -> index 4, resolved in code (the model has read
// "fifth size" as "5X").
function ordinalSizeIndex(instructions: string): number {
  const m = instructions.match(/\b(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|(\d+)(?:st|nd|rd|th))\s+(?:largest\s+|smallest\s+)?size\b/i);
  if (!m) return -1;
  return m[2] ? Number(m[2]) - 1 : ORDINALS.indexOf(m[1].toLowerCase());
}

// Sizes named in a label like "L(XL,2X,3X,4X,5X) ONLY-", "Sizes XS & S:" or
// "2X–5X only", in order; null if the text isn't purely a size label.
function sizeLabel(text: string, sizes: string[]): string[] | null {
  if (text.length > 60 || /\d+\s*(st|sts|rows?|rnds?|rounds?|ch)\b/i.test(text)) return null;
  const hasCue = /\bonly\b|\bsizes?\b|\(/i.test(text);
  if (!hasCue) return null;
  const core = text
    .replace(/\bsizes?\b|\bonly\b|\bfor\b|\band\b/gi, ' ')
    .replace(/\s[-–]\s/g, ' ')
    .replace(/[-–:]\s*$/, '');
  const tokens = core.split(/[\s,()&\/+:;.]+/).filter(Boolean);
  if (!tokens.length) return null;
  return sizeTokens(tokens, sizes);
}

// Maps tokens to canonical sizes (expanding ranges like "2X–5X"); null if
// any token isn't a size.
function sizeTokens(tokens: string[], sizes: string[]): string[] | null {
  const out: string[] = [];
  for (const tok of tokens) {
    const n = normSize(tok);
    if (sizes.includes(n)) {
      out.push(n);
      continue;
    }
    // A range like "2X–5X".
    const [a, b, extra] = tok.split(/[-–]/);
    const ia = a ? sizes.indexOf(normSize(a)) : -1;
    const ib = b ? sizes.indexOf(normSize(b)) : -1;
    if (extra === undefined && ia >= 0 && ib > ia) {
      out.push(...sizes.slice(ia, ib + 1));
      continue;
    }
    return null;
  }
  return out;
}

// Sizes named by a short "Size L move to Cuff section"-style line, or null.
function sizeMention(text: string, sizes: string[]): string[] | null {
  if (text.length > 100) return null;
  const m = text.match(/\bsizes?\s+(.+)$/i);
  if (!m) return null;
  const found: string[] = [];
  for (const tok of m[1].split(/[\s,()&\/+:;.]+/).filter(Boolean)) {
    if (/^(and|or)$/i.test(tok)) continue;
    const mapped = sizeTokens([tok], sizes);
    if (!mapped) break;
    found.push(...mapped);
  }
  return found.length ? found : null;
}

// Deterministic handling of size labels once the size order and the target
// size are known. Returns lines to drop, lines to keep (overriding the
// model), and ranges with their own local size order.
function sizeLabelRules(blocks: string[], sizes: string[], target: string) {
  const drop = new Set<number>();
  const keep = new Set<number>();
  const scoped: Scoped[] = [];
  const texts = blocks.map(plain);
  const headings = blocks.map(headingOf);
  // Some sites make EVERY line a heading; heading levels mean nothing there.
  const headingsMeaningful = headings.filter(Boolean).length < blocks.length * 0.5;

  for (let i = 0; i < blocks.length; i++) {
    const label = sizeLabel(texts[i], sizes);
    if (!label) {
      const mention = sizeMention(texts[i], sizes);
      if (mention && !mention.includes(target)) drop.add(i);
      continue;
    }
    // The label's block runs until the next size label, an "all sizes" line,
    // or (on structured pages) the next heading at the same or higher level.
    let end = i;
    for (let j = i + 1; j < blocks.length; j++) {
      if (sizeLabel(texts[j], sizes) || /\ball sizes\b/i.test(texts[j])) break;
      const h = headings[j];
      const labelLevel = headings[i]?.level ?? 7;
      if (headingsMeaningful && h && h.level <= labelLevel) break;
      end = j;
    }
    drop.add(i); // the label itself is noise once a single size is chosen
    if (label.includes(target)) {
      for (let j = i + 1; j <= end; j++) keep.add(j);
      if (label.length >= 2) scoped.push({ from: i + 1, to: end, count: label.length, index: label.indexOf(target) });
    } else {
      for (let j = i + 1; j <= end; j++) drop.add(j);
    }
  }
  return { drop, keep, scoped };
}

export type PlanResponse = {
  drop?: { from?: number | string; to?: number | string }[];
  sizes?: string[];
  targetSize?: string;
  scopedSizes?: { from?: number | string; to?: number | string; sizes?: string[] }[];
};

export async function planImport(
  blocks: string[],
  instructions: string,
  startTier: number,
  extraContext: string[] = [],
): Promise<ImportPlan> {
  const listing = blocks
    .map((b, i) => {
      const h = headingOf(b);
      const text = plain(b);
      return `${i}: ${h ? `[H${h.level}] ` : ''}${text.length > 160 ? `${text.slice(0, 160)}…` : text}`;
    })
    .join('\n');
  // Sizes are often declared outside the instructions (a project's master
  // Sizing/Materials tab), so include those lines as context too.
  const context = extraContext
    .map(plain)
    .filter((t) => /\bsizes?\b|\bsized?\b|finished|\d\s*\(\s*\d/i.test(t))
    .slice(0, 15)
    .map((t) => `- ${t.slice(0, 300)}`)
    .join('\n');

  const result = await generateJson<PlanResponse>(
    [
      `You are helping tailor a crochet/knitting pattern. Below is the whole pattern, one numbered line per block ([H2] etc. marks headings; long lines are cut short).
The user gave these instructions:
${instructions}

Return JSON with:
1. "drop": inclusive line ranges to REMOVE entirely, [{ "from": n, "to": m }].
   - Remove only what the instructions clearly exclude. For a single size, that means lines that apply ONLY to other sizes: a label like "XS(S,M) ONLY-" or "Size L move to Cuff section", a heading like "Back Panel – X-Small", and every line belonging to it, up to where the shared instructions (or the requested size's part) resume.
   - Keep lines that apply to all sizes or include the requested size (e.g. "L(XL,2X,3X,4X,5X) ONLY-" when the user wants XL), even if they contain numbers for several sizes.
   - Never remove materials, gauge, abbreviations or notes unless asked.
2. "sizes" and "targetSize": if the user wants a single size AND the pattern writes multi-size numbers as lists like "38(42,46,50)", give the pattern's full size list in order, and the requested size exactly as written in that list (resolve "fifth size", "XL", etc.). Otherwise leave both empty.
3. "scopedSizes": line ranges whose multi-size numbers follow a DIFFERENT, shorter size list than the main one, e.g. after "L(XL,2X,3X,4X,5X) ONLY-" a list like "12(13,14,16,17,18)" means L, XL, 2X, 3X, 4X, 5X. Give [{ "from": n, "to": m, "sizes": [...] }]. Only include ranges you're sure of; leave empty otherwise.`,
      `Pattern:\n${listing}${context ? `\n\nSize information from elsewhere in the pattern:\n${context}` : ''}`,
    ],
    startTier,
  );

  if (process.env.PATTERN_AI_DEBUG) console.info('Pattern plan:', JSON.stringify(result));
  return buildPlan(blocks, instructions, result);
}

// Turns the planner's answer into a plan, applying the code-side size rules.
// Pure (no Gemini call), so it can be tested with a fixed response.
export function buildPlan(blocks: string[], instructions: string, result: PlanResponse): ImportPlan {
  const drop = new Set<number>();
  for (const r of result.drop ?? []) {
    const from = Number(r.from);
    const to = Number(r.to ?? r.from);
    if (!Number.isInteger(from) || !Number.isInteger(to) || from < 0 || to < from) continue;
    for (let i = from; i <= Math.min(to, blocks.length - 1); i++) drop.add(i);
  }

  const sizes = (result.sizes ?? []).map(normSize);
  // An ordinal ("fifth size") is resolved here from the size list rather than
  // trusting the model, which has confused "fifth" with "5X".
  const ordinal = ordinalSizeIndex(instructions);
  const target =
    sizes.length >= 2 && ordinal >= 0 && ordinal < sizes.length
      ? sizes[ordinal]
      : result.targetSize
        ? normSize(result.targetSize)
        : '';
  const sizeIndex = target ? sizes.indexOf(target) : -1;

  const scoped: Scoped[] = [];
  if (target && sizeIndex >= 0) {
    // Size labels ("XS(S,M) ONLY-", "L(XL,2X,3X,4X,5X) ONLY-") are handled in
    // code and override the model: blocks for the target are kept and
    // reduced by the label's own size order; blocks for other sizes go.
    const rules = sizeLabelRules(blocks, sizes, target);
    for (const i of rules.keep) drop.delete(i);
    for (const i of rules.drop) drop.add(i);
    scoped.push(...rules.scoped);
  }
  if (target) {
    for (const s of result.scopedSizes ?? []) {
      const list = (s.sizes ?? []).map(normSize);
      const index = list.indexOf(target);
      const from = Number(s.from);
      const to = Number(s.to ?? s.from);
      if (list.length >= 2 && index >= 0 && Number.isInteger(from) && Number.isInteger(to) && to >= from) {
        scoped.push({ from, to, count: list.length, index });
      }
    }
  }

  return {
    drop,
    sizeCount: sizes.length >= 2 && sizeIndex >= 0 ? sizes.length : 0,
    sizeIndex: sizes.length >= 2 ? sizeIndex : -1,
    scoped,
  };
}

// Removes the dropped lines and reduces multi-size lists: by the local size
// order inside scoped ranges, and by the main order everywhere. Each list is
// only reduced when its length matches exactly, so nothing is guessed.
export function applyPlan(blocks: string[], plan: ImportPlan): string[] {
  const out: string[] = [];
  blocks.forEach((block, i) => {
    if (plan.drop.has(i)) return;
    let html = block;
    for (const s of plan.scoped) {
      if (i >= s.from && i <= s.to) html = reduceSizeLists(html, s.count, s.index);
    }
    out.push(reduceSizeLists(html, plan.sizeCount, plan.sizeIndex));
  });
  return out;
}

// The headings in effect where each chunk starts ("Body > Size XL"), so a
// chunk that begins mid-section still knows which section (or size) it's in.
export function headingTrails(chunks: string[][]): string[] {
  const stack: { level: number; text: string }[] = [];
  return chunks.map((blocks) => {
    const trail = stack.map((h) => h.text).join(' > ');
    for (const block of blocks) {
      const h = headingOf(block);
      if (!h) continue;
      while (stack.length && stack[stack.length - 1].level >= h.level) stack.pop();
      if (h.text) stack.push(h);
    }
    return trail;
  });
}
