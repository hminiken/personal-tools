import { generateJson, mapLimit, GeminiOutputError } from './gemini';
import {
  prepareEditorHtml,
  chunkBlocks,
  restoreImages,
  reduceSizeLists,
  tokensIn,
  imageList,
  parseJunk,
  rescueImages,
  type SourceImage,
} from './prepareSource';
import { planImport, pruneSections, headingTrails } from './planning';

// Rewrites a project's pattern copy according to free-form instructions,
// e.g. "only show size XL". Same safety model as the import:
//   1. One planning call picks whole sections to drop (outline-level), and
//      reports the size order; code removes the sections and reduces
//      multi-size number lists ("85 (91, 100, 104, 112)" -> "112").
//   2. Each chunk is then rewritten by the model, which is told everything
//      else must come back exactly as given (wording, highlights, markup).
//   3. Image tokens are restored to the original <img> tags, so resized
//      images keep their size.

const CHUNK_CHARS = 15000;
const CONCURRENCY = 4;

type TailorResult = { html?: string; removedImages?: (string | number)[] };

function tailorPrompt(part: number, total: number, instructions: string, headingTrail: string) {
  const context = headingTrail
    ? `\nThis part continues inside the section: ${headingTrail}. Treat its opening text as belonging to that section.`
    : '';
  return `You are editing part ${part} of ${total} of a crochet/knitting pattern the user is working from.${context}
Apply the user's instructions to this part and return JSON: { "html": the complete edited part, "removedImages": tokens you removed }.
- Return the WHOLE part. Anything the instructions don't call for changing must come back exactly as given: same wording, same HTML tags and attributes (keep highlights, colors and other marks on the text you keep).
- Whole sections the instructions exclude have ALREADY been removed, and multi-size number lists like "85 (91, 100, 104)" have already been reduced to the user's size where possible. Do not pick values from any multi-size list that remains, and do not change any other number unless the instructions explicitly ask for it.
- Never summarize, shorten or drop rows/steps unless the instructions ask for it.
- Images appear as tokens like [[IMG_7]]. Keep each one in place unless the instructions remove the content it belongs to; list every token you remove in "removedImages".
- If the instructions don't affect this part, return it unchanged.

USER'S INSTRUCTIONS:
${instructions}`;
}

async function tailorChunk(
  blocks: string[],
  label: { part: number; total: number; trail: string },
  images: SourceImage[],
  instructions: string,
): Promise<string> {
  const html = blocks.join('\n');
  const inputTokens = tokensIn(html);
  try {
    const result = await generateJson<TailorResult>([
      tailorPrompt(label.part, label.total, instructions, label.trail),
      `Pattern HTML (part ${label.part}):\n${html}${imageList(inputTokens, images)}`,
    ]);
    const out = (result.html ?? '').trim();
    if (!out) return '';
    return rescueImages(out, inputTokens, parseJunk(result.removedImages));
  } catch (err) {
    if (err instanceof GeminiOutputError && blocks.length > 1) {
      const mid = Math.ceil(blocks.length / 2);
      const firstHalf = blocks.slice(0, mid);
      const secondTrail = [label.trail, headingTrails([firstHalf, []])[1]].filter(Boolean).join(' > ');
      const [a, b] = await Promise.all([
        tailorChunk(firstHalf, label, images, instructions),
        tailorChunk(blocks.slice(mid), { ...label, trail: secondTrail }, images, instructions),
      ]);
      return [a, b].filter(Boolean).join('\n');
    }
    throw err;
  }
}

/**
 * @param html          The pattern HTML to rewrite (the project's copy).
 * @param instructions  What to do, e.g. 'Only show size "XL"'.
 * @param context       Extra HTML that may declare the size order (the
 *                      master pattern's sizing/materials/notes). Read-only.
 */
export async function tailorPatternHtml(html: string, instructions: string, context: string[] = []): Promise<string> {
  const { blocks, images } = prepareEditorHtml(html);
  if (!blocks.length) return html;

  const contextBlocks = context.filter(Boolean).flatMap((c) => prepareEditorHtml(c).blocks);
  const plan = await planImport(blocks, instructions, 0, contextBlocks);
  const kept = pruneSections(blocks, plan.drop).map((b) => reduceSizeLists(b, plan.sizeCount, plan.sizeIndex));

  const chunks = chunkBlocks(kept, CHUNK_CHARS);
  const trails = headingTrails(chunks);
  const parts = await mapLimit(chunks, CONCURRENCY, (chunk, i) =>
    tailorChunk(chunk, { part: i + 1, total: chunks.length, trail: trails[i] }, images, instructions),
  );
  return restoreImages(parts.filter(Boolean).join('\n'), images);
}
