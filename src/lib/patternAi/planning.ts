import { generateJson } from './gemini';

// ---- Section planning (only when the user gave instructions) ----
// Asking every chunk to apply "only keep size XL" on its own is unreliable:
// each chunk sees a different slice and they disagree. Instead one call sees
// the whole heading outline and picks the sections to drop, and we remove
// them deterministically before chunking.
type OutlineEntry = { block: number; level: number; text: string; preview: string };

export function headingOf(block: string): { level: number; text: string } | null {
  const m = block.match(/^<h([1-6])>([\s\S]*?)<\/h\1>$/i);
  if (!m) return null;
  return { level: Number(m[1]), text: m[2].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim() };
}

function buildOutline(blocks: string[]): OutlineEntry[] {
  const outline: OutlineEntry[] = [];
  blocks.forEach((block, i) => {
    const h = headingOf(block);
    if (!h || !h.text) return;
    const preview = blocks
      .slice(i + 1, i + 4)
      .join(' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 160);
    outline.push({ block: i, level: h.level, text: h.text, preview });
  });
  return outline;
}

export type ImportPlan = { drop: Set<number>; sizeCount: number; sizeIndex: number };

export async function planImport(
  blocks: string[],
  instructions: string,
  startTier: number,
  extraContext: string[] = [],
): Promise<ImportPlan> {
  const outline = buildOutline(blocks);
  const listing = outline
    .map((o, i) => `${i}. ${'  '.repeat(o.level - 1)}[H${o.level}] ${o.text} — "${o.preview}"`)
    .join('\n');
  // Many patterns declare their sizes in body text ("Sizes: S (M, L, XL)")
  // and never use size headings, so also show the lines that talk about sizes
  // and a few sample multi-size lists — otherwise the size order is invisible.
  const plain = (b: string) => b.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
  const sizeLines = [...extraContext, ...blocks].map(plain).filter((t) => /\bsizes?\b|\bsized?\b|finished measurements?/i.test(t)).slice(0, 15);
  const sampleLists = [...extraContext, ...blocks]
    .map(plain)
    .filter((t) => /\d\s*["″]?\s*\(\s*[\d.\/-]+(\s*["″]?\s*,\s*[\d.\/-]+){1,}\s*["″]?\s*\)/.test(t))
    .slice(0, 5);
  const sizeContext = [...sizeLines, ...sampleLists]
    .map((t) => `- ${t.slice(0, 300)}`)
    .filter((line, i, all) => all.indexOf(line) === i)
    .join('\n');
  const result = await generateJson<{
    sections?: { n?: number | string; keep?: boolean }[];
    sizes?: string[];
    targetSize?: string;
  }>(
    [
      `You are helping tailor a crochet/knitting pattern. Below is the outline of the pattern: every heading, indented by level, with a preview of the text that follows it.
The user gave these instructions:
${instructions}

1. Go through EVERY heading in the outline, one by one, and decide whether to keep it. Dropping a heading removes everything under it up to the next heading of the same or higher level.
- keep: false when the user's instructions exclude that section. A heading that names ONLY sizes/options other than the requested one must be dropped (e.g. "Medium & Large", "Back Panel – X-Small" or "2X-Large & 4X-Large" when the user wants XL).
- keep: true for sections that apply to everything (gauge, ribbing, assembly, stitch tutorials, finishing), even if they contain numbers for several sizes.
- keep: true when a heading covers several options and one of them is wanted (e.g. "Sizes L, XL & 2X" when the user wants XL).
2. If the user wants a single size AND the pattern writes multi-size numbers as a list like "XS (S, M, L, XL)", give the pattern's full size list in order in "sizes" and the requested size exactly as it appears in that list in "targetSize". Otherwise leave both empty.
Return JSON: { "sections": [{ "n": outline number, "keep": true|false }, ... one entry for EVERY heading], "sizes": [...], "targetSize": "..." }.`,
      `Outline:\n${listing || '(no headings)'}${sizeContext ? `\n\nLines that mention sizes, and sample multi-size numbers:\n${sizeContext}` : ''}`,
    ],
    startTier,
  );
  const drop = new Set<number>();
  for (const s of result.sections ?? []) {
    const entry = outline[Number(s.n)];
    if (entry && s.keep === false) drop.add(entry.block);
  }
  const sizes = (result.sizes ?? []).map((s) => String(s).trim().toLowerCase());
  const sizeIndex = result.targetSize ? sizes.indexOf(result.targetSize.trim().toLowerCase()) : -1;
  return sizes.length >= 2 && sizeIndex >= 0 ? { drop, sizeCount: sizes.length, sizeIndex } : { drop, sizeCount: 0, sizeIndex: -1 };
}


// Removes each dropped heading and everything under it.
export function pruneSections(blocks: string[], dropHeadingBlocks: Set<number>): string[] {
  const out: string[] = [];
  let skippingLevel: number | null = null;
  blocks.forEach((block, i) => {
    const h = headingOf(block);
    if (skippingLevel !== null) {
      if (!h || h.level > skippingLevel) return;
      skippingLevel = null;
    }
    if (h && dropHeadingBlocks.has(i)) {
      skippingLevel = h.level;
      return;
    }
    out.push(block);
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
      const m = block.match(/^<h([1-6])>([\s\S]*?)<\/h\1>$/i);
      if (!m) continue;
      const level = Number(m[1]);
      const text = m[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
      while (stack.length && stack[stack.length - 1].level >= level) stack.pop();
      if (text) stack.push({ level, text });
    }
    return trail;
  });
}

export const NO_PLAN: ImportPlan = { drop: new Set(), sizeCount: 0, sizeIndex: -1 };
