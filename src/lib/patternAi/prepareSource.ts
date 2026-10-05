// Turns a scraped pattern page (or pasted text) into compact HTML blocks that
// can be sent to Gemini in chunks.
//
// Two problems this solves:
//   1. Size. Raw page HTML is ~90% markup (classes, wrappers, share widgets),
//      so long patterns blew past the old 70k-char cap and lost their ending.
//      We strip everything that isn't content, then split on block
//      boundaries so each Gemini call gets a manageable piece.
//   2. Images. Asking the model to copy long image URLs verbatim made it drop
//      or mangle them. Each <img> becomes a short token like [[IMG_3]] that
//      the model only has to carry through; the real URL stays here and is
//      swapped back in afterwards (see restoreImages).
import * as cheerio from 'cheerio';
import type { Cheerio, CheerioAPI } from 'cheerio';

// cheerio doesn't re-export domhandler's node types; derive them.
type AnyNode = ReturnType<ReturnType<CheerioAPI['root']>['contents']> extends Cheerio<infer N> ? N : never;

// `tag` (editor HTML only) is the original <img> markup, restored verbatim.
export type SourceImage = { url: string; alt: string; tag?: string };
export type PreparedSource = { blocks: string[]; images: SourceImage[] };

export const IMAGE_TOKEN_RE = /\[\[\s*IMG_(\d+)\s*\]\]/g;
export const imageToken = (i: number) => `[[IMG_${i}]]`;

// Page furniture that never holds pattern content.
const JUNK_SELECTORS = [
  'script', 'style', 'noscript', 'template', 'nav', 'header', 'footer', 'aside', 'iframe', 'svg', 'form',
  'button', 'input', 'select', 'textarea', 'link', 'meta', 'object', 'embed', 'video', 'audio', 'canvas',
  '#comments', '.comments', '.comment-list', '.comments-area', '#respond',
  '.sharedaddy', '.jp-relatedposts', '[class*="related-posts"]', '[class*="social-share"]', '.share-buttons',
  '[class*="adthrive"]', '[class*="mv-ad"]', '.adsbygoogle', '[id^="ad-"]', '[class*="newsletter"]',
  '.widget', '[class*="sidebar"]', '.breadcrumbs', '[class*="cookie"]', '[role="navigation"]',
].join(', ');

// The main content container, when the page has one.
const ROOT_SELECTORS = ['.entry-content', '.post-content', '.post-body', 'article', 'main', '[role="main"]'];

// Images that are never pattern illustrations.
const JUNK_IMAGE_RE =
  /gravatar|\/avatars?\/|[-_/]logo[-_.]|\bicons?\b|emoji|sprite|spacer|blank\.(gif|png)|1x1|pixel|pinit|pin-it|pinterest\.com\/pin|\/ads?\/|doubleclick|googlesyndication|amazon-adsystem|badge|facebook\.com|twitter\.com|feedburner|wp-includes\/images/i;

const BLOCK_TAGS = new Set(['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'table', 'blockquote', 'pre', 'hr', 'dl']);
const CONTAINER_TAGS = new Set(['html', 'body', 'div', 'section', 'article', 'main', 'figure', 'center', 'details', 'summary']);
const UNWRAP_TAGS = 'a, span, font, small, big, label, time, abbr, picture, mark, ins, del, sup, sub, cite, u';

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Largest candidate in a srcset ("url 300w, url 1024w").
function largestFromSrcset(srcset: string | undefined): string | undefined {
  if (!srcset) return undefined;
  let best: { url: string; size: number } | undefined;
  for (const part of srcset.split(',')) {
    const [url, descriptor] = part.trim().split(/\s+/);
    if (!url) continue;
    const size = parseFloat(descriptor ?? '') || 1;
    if (!best || size > best.size) best = { url, size };
  }
  return best?.url;
}

function resolveImageUrl(attrs: Record<string, string>, baseUrl: string | null): string | null {
  const candidates = [
    largestFromSrcset(attrs['data-lazy-srcset'] || attrs['data-srcset'] || attrs['srcset']),
    attrs['data-large-file'],
    attrs['data-lazy-src'],
    attrs['data-src'],
    attrs['data-original'],
    attrs['src'],
  ];
  for (const raw of candidates) {
    const src = raw?.trim();
    if (!src) continue;
    // Tiny data: URIs are lazy-load placeholders; real inline images are long.
    if (src.startsWith('data:')) {
      if (src.length > 2000) return src;
      continue;
    }
    try {
      return baseUrl ? new URL(src, baseUrl).href : src;
    } catch {
      continue;
    }
  }
  return null;
}

function isJunkImage(url: string, attrs: Record<string, string>): boolean {
  const w = parseInt(attrs.width ?? '', 10);
  const h = parseInt(attrs.height ?? '', 10);
  if (w > 0 && h > 0 && w <= 60 && h <= 60) return true;
  return JUNK_IMAGE_RE.test(url);
}

function plainTextToHtml(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .split(/\n\s*\n/)
    .map((para) => para.trim())
    .filter(Boolean)
    .map((para) => `<p>${escapeHtml(para).replace(/\n/g, '<br>')}</p>`)
    .join('');
}

export function prepareSource(input: string, opts: { baseUrl?: string | null; isHtml: boolean }): PreparedSource {
  const html = opts.isHtml ? input : plainTextToHtml(input);
  const $ = cheerio.load(html);
  const baseUrl = opts.baseUrl ?? null;

  // Lazy-load plugins often put the real <img> inside <noscript>; cheerio
  // parses noscript content as text, so re-parse it as HTML before cleanup.
  $('noscript').each((_, el) => {
    const inner = $(el).text();
    if (/<img/i.test(inner)) $(el).replaceWith(inner);
  });

  // Substring selectors like [class*="sidebar"] also match layout wrappers
  // ("content-sidebar-wrap", body.has-sidebar), so never remove an element
  // that holds most of the page's text.
  const textLength = (el: Parameters<CheerioAPI>[0]) => $(el).text().replace(/\s+/g, ' ').length;
  const bodyTextLength = textLength('body');
  $(JUNK_SELECTORS).each((_, el) => {
    if ('tagName' in el && (el.tagName === 'html' || el.tagName === 'body')) return;
    if (textLength(el) > bodyTextLength * 0.3) return;
    $(el).remove();
  });

  // Narrow to the main content container when it holds most of the text.
  const rootSelector =
    ROOT_SELECTORS.find((sel) => {
      const candidate = $(sel).first();
      return candidate.length > 0 && textLength(candidate) >= textLength('body') * 0.5;
    }) ?? 'body';
  const root = $(rootSelector).first();

  // Replace each kept image with a token; drop junk, placeholders and dupes.
  const images: SourceImage[] = [];
  const seen = new Map<string, number>();
  root.find('img').each((_, el) => {
    const $img = $(el);
    const attrs = ($img.attr() ?? {}) as Record<string, string>;
    const url = resolveImageUrl(attrs, baseUrl);
    if (!url || isJunkImage(url, attrs) || seen.has(url)) {
      $img.remove();
      return;
    }
    seen.set(url, images.length);
    images.push({ url, alt: (attrs.alt ?? attrs.title ?? '').trim() });
    $img.replaceWith(` ${imageToken(images.length - 1)} `);
  });
  root.find('source').remove();

  // Strip all attributes and unwrap inline wrappers that carry no meaning.
  root.find('*').each((_, el) => {
    if (el.type !== 'tag') return;
    for (const name of Object.keys(el.attribs)) delete el.attribs[name];
  });
  root.find(UNWRAP_TAGS).each((_, el) => {
    $(el).replaceWith($(el).contents());
  });
  root.find('figcaption').each((_, el) => {
    el.tagName = 'p';
  });

  // Drop elements left with no text (wrappers of removed widgets, etc.).
  let removed = true;
  while (removed) {
    removed = false;
    root.find('*').each((_, el) => {
      if (el.type !== 'tag' || el.tagName === 'br' || el.tagName === 'hr') return;
      if (!$(el).text().trim()) {
        $(el).remove();
        removed = true;
      }
    });
  }

  const blocks: string[] = [];
  collectBlocks($, root.contents().toArray(), blocks);
  return { blocks, images };
}

// Same token/block preparation for HTML that came out of our own editor (a
// project's pattern copy). None of the web-page cleanup applies, and it must
// not strip anything: the user's highlights/colors stay, and each image keeps
// its original tag (including a resized width/height) to be put back as-is.
export function prepareEditorHtml(html: string): PreparedSource {
  const $ = cheerio.load(html, null, false);
  const images: SourceImage[] = [];
  $('img').each((_, el) => {
    const $img = $(el);
    images.push({ url: $img.attr('src') ?? '', alt: ($img.attr('alt') ?? '').trim(), tag: $.html(el) });
    $img.replaceWith(imageToken(images.length - 1));
  });
  const blocks: string[] = [];
  for (const node of $.root().contents().toArray()) {
    if (node.type === 'text') {
      const text = $(node).text().trim();
      if (text) blocks.push(`<p>${escapeHtml(text)}</p>`);
    } else if (node.type === 'tag') {
      blocks.push($.html(node));
    }
  }
  return { blocks, images };
}

// Flattens nested containers into a list of top-level block HTML strings.
// Runs of inline content (text, <strong>, tokens) are grouped into one <p>.
function collectBlocks($: CheerioAPI, nodes: AnyNode[], out: string[]) {
  let inline = '';
  const flushInline = () => {
    const text = inline.replace(/\s+/g, ' ').trim();
    if (text) out.push(`<p>${text}</p>`);
    inline = '';
  };

  for (const node of nodes) {
    if (node.type === 'text') {
      inline += escapeHtml($(node).text());
      continue;
    }
    if (node.type !== 'tag') continue;
    const tag = node.tagName.toLowerCase();

    if (CONTAINER_TAGS.has(tag)) {
      const children = $(node).contents().toArray();
      const hasBlockChild = children.some(
        (c) => c.type === 'tag' && (BLOCK_TAGS.has(c.tagName.toLowerCase()) || CONTAINER_TAGS.has(c.tagName.toLowerCase())),
      );
      if (hasBlockChild) {
        flushInline();
        collectBlocks($, children, out);
        continue;
      }
      // A container holding only inline content reads as one paragraph.
      flushInline();
      inline = $(node).html() ?? '';
      flushInline();
      continue;
    }

    if (BLOCK_TAGS.has(tag)) {
      flushInline();
      out.push($.html(node).replace(/\s+/g, ' ').trim());
      continue;
    }

    inline += $.html(node);
  }
  flushInline();
}

// Splits one block that's too big for a single chunk: lists by item, tables
// by row, anything else at <br>s, and finally at whitespace.
function splitOversizedBlock(block: string, maxChars: number): string[] {
  const $ = cheerio.load(block, null, false);
  const top = $.root().children().first();
  const tag = top.length ? top[0].tagName?.toLowerCase() : '';

  const regroup = (items: string[], wrap: (inner: string) => string) => {
    const out: string[] = [];
    let current = '';
    for (const item of items) {
      if (current && current.length + item.length > maxChars) {
        out.push(wrap(current));
        current = '';
      }
      current += item;
    }
    if (current) out.push(wrap(current));
    return out;
  };

  if (tag === 'ul' || tag === 'ol') {
    const items = top.children('li').toArray().map((li) => $.html(li));
    if (items.length > 1) return regroup(items, (inner) => `<${tag}>${inner}</${tag}>`);
  }
  if (tag === 'table') {
    const rows = top.find('tr').toArray().map((tr) => $.html(tr));
    if (rows.length > 1) return regroup(rows, (inner) => `<table>${inner}</table>`);
  }

  const inner = top.length ? top.html() ?? '' : block;
  const lines = inner.split(/<br\s*\/?>/i).map((l) => l.trim()).filter(Boolean);
  if (lines.length > 1) return regroup(lines.map((l) => `${l}<br>`), (inner2) => `<p>${inner2}</p>`);

  // Last resort: a single enormous run of text.
  const words = inner.split(/(?<=\s)/);
  return regroup(words, (inner2) => `<p>${inner2.trim()}</p>`);
}

// Packs blocks into chunks of at most ~maxChars, never splitting a block
// unless it's larger than a chunk on its own.
export function chunkBlocks(blocks: string[], maxChars: number): string[][] {
  const chunks: string[][] = [];
  let current: string[] = [];
  let size = 0;
  for (const block of blocks.flatMap((b) => (b.length > maxChars ? splitOversizedBlock(b, maxChars) : [b]))) {
    if (current.length && size + block.length > maxChars) {
      chunks.push(current);
      current = [];
      size = 0;
    }
    current.push(block);
    size += block.length;
  }
  if (current.length) chunks.push(current);
  return chunks;
}

export function tokensIn(text: string): number[] {
  return [...text.matchAll(IMAGE_TOKEN_RE)].map((m) => Number(m[1]));
}

// Swaps [[IMG_n]] tokens back to real <img> tags.
export function restoreImages(html: string, images: SourceImage[]): string {
  return html.replace(IMAGE_TOKEN_RE, (_, n) => {
    const img = images[Number(n)];
    if (!img) return '';
    if (img.tag) return img.tag;
    const alt = img.alt ? ` alt="${escapeHtml(img.alt)}"` : '';
    return `<img src="${escapeHtml(img.url)}"${alt}>`;
  });
}

// Reduces multi-size values like "85 (91, 100, 104, 112)" to the requested
// size's value. Done in code, not by the model: picking the Nth number is
// position-counting, which the model gets wrong (it chose L's 104 for XL's
// 112 in testing). Only lists with exactly one value per size are touched;
// anything else is left as the full list so no number is ever guessed.
export function reduceSizeLists(html: string, sizeCount: number, sizeIndex: number): string {
  if (sizeCount < 2 || sizeIndex < 0) return html;
  const listOf = (value: string) =>
    new RegExp(
      String.raw`(${value})(\s*["″']?\s*)\(\s*(${value}(?:\s*["″']?\s*,\s*${value}){${sizeCount - 2}})\s*["″']?\s*\)`,
      'gi',
    );
  const pick = (match: string, first: string, unit: string, rest: string) => {
    const values = [first, ...rest.split(/\s*["″']?\s*,\s*/)];
    if (values.length !== sizeCount) return match;
    return `${values[sizeIndex].trim()}${unit.trim()}`;
  };
  // Lists of ranges first ("Rows 2-24 (2-26, 2-28, 2-30)"). Only when EVERY
  // value is a range — in "Rows 2 – 85 (91, …)" the "2 –" is part of the
  // sentence and the list is single values, handled by the second pass.
  const range = String.raw`(?:\d+\s*[-–]\s*\d+)`;
  // A single value: 85, 43.75, 2-1/2, 1/2, or a dash/"n/a" for sizes that skip a step.
  const value = String.raw`(?:\d+(?:\.\d+)?(?:-\d+\/\d+)?|\d+\/\d+|[-–]|n\/a)`;
  return html.replace(listOf(range), pick).replace(listOf(value), pick);
}

export function imageList(tokens: number[], images: SourceImage[]) {
  const described = tokens.filter((t) => images[t]?.alt).map((t) => `${imageToken(t)}: ${images[t].alt}`);
  return described.length ? `\n\nImage descriptions (alt text):\n${described.join('\n')}` : '';
}

export function parseJunk(list: (string | number)[] | undefined): Set<number> {
  const out = new Set<number>();
  for (const item of list ?? []) {
    const m = String(item).match(/(\d+)/);
    if (m) out.add(Number(m[1]));
  }
  return out;
}

// Re-inserts tokens the model dropped without flagging as junk, right after
// the block holding the nearest earlier surviving token (or at the start).
export function rescueImages(content: string, inputTokens: number[], skip: Set<number>): string {
  let out = content;
  for (let i = 0; i < inputTokens.length; i++) {
    const t = inputTokens[i];
    if (skip.has(t) || tokensIn(out).includes(t)) continue;
    const insert = `<p>${imageToken(t)}</p>`;
    let anchorPos = -1;
    for (let j = i - 1; j >= 0 && anchorPos < 0; j--) {
      const idx = out.indexOf(imageToken(inputTokens[j]));
      if (idx >= 0) anchorPos = idx;
    }
    if (anchorPos < 0) {
      out = insert + out;
      continue;
    }
    const close = /<\/(p|li|h\d|ul|ol|table|blockquote)>/gi;
    close.lastIndex = anchorPos;
    const m = close.exec(out);
    const at = m ? m.index + m[0].length : out.length;
    out = out.slice(0, at) + insert + out.slice(at);
  }
  return out;
}
