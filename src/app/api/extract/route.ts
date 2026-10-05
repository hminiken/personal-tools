import { NextResponse } from 'next/server';
import type { Part } from '@google/generative-ai';
import { generateJson, mapLimit, GeminiError, GeminiOutputError } from '@/lib/patternAi/gemini';
import {
  prepareSource,
  chunkBlocks,
  restoreImages,
  tokensIn,
  imageList,
  parseJunk,
  rescueImages,
  type SourceImage,
} from '@/lib/patternAi/prepareSource';
import { planImport, applyPlan, headingTrails, NO_PLAN } from '@/lib/patternAi/planning';

// How the import works:
//   1. The page (or pasted text) is cleaned down to content-only HTML with
//      images swapped for short [[IMG_n]] tokens (prepareSource.ts).
//   2. One call extracts the summary fields (title, materials, sizing, ...)
//      from the whole page.
//   3. The instructions are extracted chunk by chunk (~25k chars each, split
//      on block boundaries) so long patterns don't get truncated, and each
//      call only has to copy a manageable amount of text verbatim.
//   4. Tokens are swapped back to <img> tags. Any token the model dropped
//      without flagging it as junk is re-inserted near where it was.

// ~25k chars per call balances the request count (the free tier allows 20
// requests/model/day) against fidelity: at ~40k the model started dropping
// section headings and connecting lines. A chunk that gets cut off is split
// and retried.
const CHUNK_CHARS = 25000;
const CONCURRENCY = 4;
const PDF_PAGES_PER_CALL = 5;
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';

type Metadata = {
  title?: string;
  materials?: string;
  sizing?: string;
  abbreviations?: string;
  notes?: string;
  categories?: string;
  craftType?: string;
  hooks?: string;
  weights?: string;
};
type ContentResult = { content?: string; junkImages?: (string | number)[] };

const HTML_RULES = `
Formatting rules for HTML fields:
- Use <p> for normal text, <strong> for emphasis/counts/sizes, <ul>/<ol>/<li> for lists, <h4> for subheadings, <table> for tables.
- Images appear as tokens like [[IMG_7]]. Copy each token exactly, in the same position, as its own <p>[[IMG_7]]</p>.`;

const IMAGE_RULES = `
Images: keep every [[IMG_n]] token that sits within or beside pattern content you keep (step photos, finished-item photos, charts, schematics, size charts). Leave a token out only if the image is clearly useless (ad, author headshot, "pin it" graphic, logo, signature) or belongs to content you're leaving out. List EVERY token you leave out, for any reason, in "junkImages".`;

// Optional user guidance (e.g. "only keep size XL"), applied to every call.
function userInstructions(instructions: string) {
  if (!instructions) return '';
  return `

ADDITIONAL INSTRUCTIONS FROM THE USER — follow these within the text you're given. Whole sections the instructions exclude have ALREADY been removed, and multi-size numbers have already been reduced where possible, so do not drop any remaining section or heading on your own.
NEVER change, pick from, or recalculate any number, stitch count, row number or measurement — copy every number exactly as written, even when it lists several sizes:
${instructions}`;
}

function metadataPrompt(sourceNote: string, instructions: string) {
  return `You are a professional crochet and knitting assistant. ${sourceNote}
Extract the pattern's summary details as a JSON object with these keys:
- "title": the pattern name (string).
- "materials": HTML — yarn, hooks/needles, notions, gauge.
- "sizing": HTML — sizes, finished measurements, size charts.
- "abbreviations": HTML — stitch abbreviations and special stitches.
- "notes": HTML — pattern notes and construction notes that come before the instructions. Skip blog chatter, ads and social-media plugs.
- "categories": comma-separated string.
- "craftType": "crochet" or "knitting". Crochet uses a hook and stitches like sc/dc/hdc/tr; knitting uses needles and knit/purl. Default to "crochet" if unclear.
- "hooks": comma-separated tool sizes matching craftType, metric first when available, e.g. "5mm (H/8)".
- "weights": comma-separated yarn weights.
Do NOT include the step-by-step instructions; they are extracted separately. Use "" for anything the pattern doesn't have.
${HTML_RULES}
Only include an image token in these fields if the image belongs to that section (e.g. a size chart in "sizing").${userInstructions(instructions)}`;
}

function contentPrompt(part: number, total: number, sourceNote: string, instructions: string, headingTrail = '') {
  const context = headingTrail
    ? `\nThis part continues inside the section: ${headingTrail}. Treat its opening text as belonging to that section.`
    : '';
  return `You are a professional crochet and knitting assistant. ${sourceNote}
This is part ${part} of ${total}. Extract ONLY the step-by-step pattern instructions found in this part.${context}
Return a JSON object: { "content": HTML string, "junkImages": array of tokens you left out }.
- Copy every row, round, step and stitch count VERBATIM, in order. Never summarize, shorten, merge or skip rows — a missing row ruins the pattern.
- Keep every heading and subheading inside the instructions (e.g. "Back Panel – X-Large", "Seaming the Shoulders", "Sleeves") as <h4>, and keep the short connecting lines between rows ("Do not fasten off.", "Continue on to …", "Your piece should measure …", "Tie off.").
- Include special-stitch tutorials and instruction tables/charts found in this part.
- Leave out materials, abbreviations, sizing and general notes (extracted separately), plus blog intros, ads, comments, "related patterns" lists and social-media plugs.
- If this part contains no instructions at all, return "content": "".
${HTML_RULES}
${IMAGE_RULES}${userInstructions(instructions)}`;
}

// Extracts instructions from one chunk; if the answer is cut off or
// unparseable, splits the chunk in half and tries again.
async function extractChunk(
  blocks: string[],
  label: { part: number; total: number; trail: string },
  images: SourceImage[],
  skipTokens: Set<number>,
  sourceNote: string,
  instructions: string,
  startTier: number,
): Promise<string> {
  const html = blocks.join('\n');
  const inputTokens = tokensIn(html);
  try {
    const result = await generateJson<ContentResult>(
      [contentPrompt(label.part, label.total, sourceNote, instructions, label.trail), `Pattern HTML (part ${label.part}):\n${html}${imageList(inputTokens, images)}`],
      startTier,
    );
    const content = (result.content ?? '').trim();
    if (!content) return '';
    const skip = new Set([...skipTokens, ...parseJunk(result.junkImages)]);
    return rescueImages(content, inputTokens, skip);
  } catch (err) {
    if (err instanceof GeminiOutputError && blocks.length > 1) {
      const mid = Math.ceil(blocks.length / 2);
      const firstHalf = blocks.slice(0, mid);
      // The second half starts under whatever headings the first half opened.
      const secondTrail = [label.trail, headingTrails([firstHalf, []])[1]].filter(Boolean).join(' > ');
      const [a, b] = await Promise.all([
        extractChunk(firstHalf, label, images, skipTokens, sourceNote, instructions, startTier),
        extractChunk(blocks.slice(mid), { ...label, trail: secondTrail }, images, skipTokens, sourceNote, instructions, startTier),
      ]);
      return [a, b].filter(Boolean).join('\n');
    }
    throw err;
  }
}

// Rough page count from the raw PDF bytes (good enough for batching; falls
// back to a single call when it can't tell).
function countPdfPages(bytes: Buffer): number {
  return bytes.toString('latin1').match(/\/Type\s*\/Page(?!s)/g)?.length ?? 0;
}

async function fetchPage(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: { 'User-Agent': BROWSER_UA, Accept: 'text/html,application/xhtml+xml' },
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error(`The site responded with ${response.status}.`);
  return response.text();
}

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get('content-type') || '';

    let sourceUrl: string | null = null;
    let rawText: string | null = null;
    let pdfBytes: Buffer | null = null;
    let modelTier = 0;
    let instructions = '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      sourceUrl = (formData.get('sourceUrl') as string) || null;
      rawText = (formData.get('rawText') as string) || null;
      modelTier = Number(formData.get('modelTier')) || 0;
      instructions = ((formData.get('instructions') as string) || '').trim();

      const file = formData.get('pdf');
      if (file && file instanceof File) {
        if (file.type !== 'application/pdf') {
          return NextResponse.json({ error: 'Uploaded file must be a PDF.' }, { status: 400 });
        }
        pdfBytes = Buffer.from(await file.arrayBuffer());
      }
    } else {
      const body = await req.json();
      sourceUrl = body.sourceUrl || null;
      rawText = body.rawText || null;
      modelTier = Number(body.modelTier) || 0;
      instructions = (typeof body.instructions === 'string' ? body.instructions : '').trim();
    }
    instructions = instructions.slice(0, 2000);

    let metadata: Metadata;
    let content: string;
    let images: SourceImage[] = [];

    if (pdfBytes) {
      const pdfPart: Part = { inlineData: { data: pdfBytes.toString('base64'), mimeType: 'application/pdf' } };
      const note =
        'The source is an attached PDF. It has no image URLs, so there are no image tokens; describe any chart or illustration in words instead.';
      const pages = countPdfPages(pdfBytes);
      const ranges: [number, number][] = [];
      if (pages > PDF_PAGES_PER_CALL) {
        for (let start = 1; start <= pages; start += PDF_PAGES_PER_CALL) {
          ranges.push([start, Math.min(pages, start + PDF_PAGES_PER_CALL - 1)]);
        }
      }

      const [meta, parts] = await Promise.all([
        generateJson<Metadata>([metadataPrompt(note, instructions), pdfPart], modelTier),
        ranges.length
          ? mapLimit(ranges, CONCURRENCY, ([a, b], i) =>
              generateJson<ContentResult>(
                [contentPrompt(i + 1, ranges.length, `${note} Only look at PDF pages ${a}–${b}.`, instructions), pdfPart],
                modelTier,
              ),
            )
          : generateJson<ContentResult>([contentPrompt(1, 1, note, instructions), pdfPart], modelTier).then((r) => [r]),
      ]);
      metadata = meta;
      content = parts.map((p) => (p.content ?? '').trim()).filter(Boolean).join('\n');
    } else {
      let source: string;
      let isHtml: boolean;
      if (rawText) {
        source = rawText;
        isHtml = /<[a-z][\s\S]*>/i.test(rawText);
      } else if (sourceUrl) {
        try {
          source = await fetchPage(sourceUrl);
          isHtml = true;
        } catch (err) {
          console.error('Scraping failed:', err);
          const reason = err instanceof Error ? ` ${err.message}` : '';
          return NextResponse.json({ error: `Failed to read URL.${reason}` }, { status: 400 });
        }
      } else {
        return NextResponse.json({ error: 'No content provided.' }, { status: 400 });
      }

      const prepared = prepareSource(source, { baseUrl: sourceUrl, isHtml });
      images = prepared.images;
      if (!prepared.blocks.length) {
        return NextResponse.json({ error: "Couldn't find any pattern text on that page." }, { status: 400 });
      }

      const note = 'The source is a cleaned pattern web page.';
      const fullHtml = prepared.blocks.join('\n');
      const [meta, plan] = await Promise.all([
        generateJson<Metadata>(
          [metadataPrompt(note, instructions), `Pattern HTML:\n${fullHtml}${imageList(tokensIn(fullHtml), images)}`],
          modelTier,
        ),
        instructions
          ? planImport(prepared.blocks, instructions, modelTier)
          : Promise.resolve(NO_PLAN),
      ]);
      metadata = meta;

      // Images already placed in a summary field (e.g. a size chart) shouldn't
      // be re-inserted into the instructions.
      const usedInMetadata = new Set(
        tokensIn([metadata.materials, metadata.sizing, metadata.abbreviations, metadata.notes].join(' ')),
      );
      const kept = applyPlan(prepared.blocks, plan);
      const chunks = chunkBlocks(kept, CHUNK_CHARS);
      const trails = headingTrails(chunks);
      const parts = await mapLimit(chunks, CONCURRENCY, (blocks, i) =>
        extractChunk(
          blocks,
          { part: i + 1, total: chunks.length, trail: trails[i] },
          images,
          usedInMetadata,
          note,
          instructions,
          modelTier,
        ),
      );
      content = parts.filter(Boolean).join('\n');
    }

    const html = (value: string | undefined) => restoreImages(value ?? '', images);
    return NextResponse.json({
      title: metadata.title || 'Imported pattern',
      materials: html(metadata.materials),
      sizing: html(metadata.sizing),
      abbreviations: html(metadata.abbreviations),
      notes: html(metadata.notes),
      content: html(content),
      categories: metadata.categories ?? '',
      craftType: metadata.craftType === 'knitting' ? 'knitting' : 'crochet',
      hooks: metadata.hooks ?? '',
      weights: metadata.weights ?? '',
      sourceUrl: sourceUrl || null,
    });
  } catch (error) {
    if (error instanceof GeminiError) {
      return NextResponse.json(
        {
          error: error.overloaded
            ? 'Every Gemini model from the one you picked down is busy or out of quota. Try again in a minute, or pick a different model.'
            : error.message,
          overloaded: error.overloaded,
        },
        { status: error.overloaded ? 503 : 502 },
      );
    }
    if (error instanceof GeminiOutputError) {
      return NextResponse.json({ error: `Gemini returned a response we couldn't read. ${error.message}` }, { status: 502 });
    }
    const message = error instanceof Error ? error.message : 'Failed to parse pattern';
    console.error('Extract route error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
