import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { compressImage } from '@/utils/compressImage';

// ------------------------------------------------------------------
// LOCALIZE IMAGES
// Copies every external (or pasted base64) <img> in a set of HTML fields
// into public/uploads and rewrites the src to the local copy, so imported
// patterns keep their pictures even if the original site removes them or
// blocks hotlinking. Images go through compressImage (longest edge 2000px,
// ~1MB WebP). An image that can't be downloaded keeps its original URL
// rather than failing the save. Server-only (sharp, fs).
// ------------------------------------------------------------------

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const MAX_DOWNLOAD_BYTES = 25 * 1024 * 1024;
const CONCURRENCY = 4;

// Matches the src attribute of <img> tags as serialized by Tiptap (double quotes).
const IMG_SRC_RE = /(<img\b[^>]*?\ssrc=")([^"]+)(")/gi;

const isLocalizable = (src: string) => /^https?:\/\//i.test(src) || /^data:image\/(png|jpe?g|gif|webp);base64,/i.test(src);

const decodeAttr = (s: string) =>
  s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');

function fileBaseName(src: string): string {
  if (src.startsWith('data:')) return 'pasted';
  try {
    const last = new URL(src).pathname.split('/').pop() ?? '';
    return last.replace(/\.[^.]+$/, '').replace(/[^A-Za-z0-9_-]+/g, '_').slice(0, 60) || 'image';
  } catch {
    return 'image';
  }
}

async function download(src: string, referer: string | null): Promise<Buffer> {
  if (src.startsWith('data:')) return Buffer.from(src.slice(src.indexOf(',') + 1), 'base64');

  const response = await fetch(src, {
    headers: {
      'User-Agent': BROWSER_UA,
      Accept: 'image/avif,image/webp,image/png,image/*;q=0.8,*/*;q=0.5',
      // Some sites only serve images to their own pages.
      ...(referer ? { Referer: referer } : {}),
    },
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const type = response.headers.get('content-type') ?? '';
  if (type && !type.startsWith('image/')) throw new Error(`not an image (${type})`);
  const length = Number(response.headers.get('content-length') ?? 0);
  if (length > MAX_DOWNLOAD_BYTES) throw new Error('too large');
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length > MAX_DOWNLOAD_BYTES) throw new Error('too large');
  return bytes;
}

export async function localizeImages<T extends Record<string, string | null | undefined>>(
  fields: T,
  opts: { referer?: string | null } = {},
): Promise<T> {
  const sources = new Set<string>();
  for (const html of Object.values(fields)) {
    for (const m of (html ?? '').matchAll(IMG_SRC_RE)) {
      if (isLocalizable(decodeAttr(m[2]))) sources.add(m[2]);
    }
  }
  if (!sources.size) return fields;

  const uploadDir = path.join(process.cwd(), 'public/uploads');
  await mkdir(uploadDir, { recursive: true });

  const replacements = new Map<string, string>();
  const queue = [...sources];
  const stamp = Date.now();
  let counter = 0;
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, queue.length) }, async () => {
      while (queue.length) {
        const rawSrc = queue.shift()!;
        const src = decodeAttr(rawSrc);
        try {
          const compressed = await compressImage(await download(src, opts.referer ?? null));
          const filename = `${stamp}-${counter++}-${fileBaseName(src)}.webp`;
          await writeFile(path.join(uploadDir, filename), compressed);
          replacements.set(rawSrc, `/uploads/${filename}`);
        } catch (err) {
          // Keep the original link; a missing copy shouldn't block the save.
          console.error('Could not copy image', src.slice(0, 120), '-', err instanceof Error ? err.message : err);
        }
      }
    }),
  );

  const out = { ...fields };
  for (const key of Object.keys(out) as (keyof T)[]) {
    const html = out[key];
    if (!html) continue;
    out[key] = html.replace(IMG_SRC_RE, (match, open: string, src: string, close: string) => {
      const local = replacements.get(src);
      return local ? `${open}${local}${close}` : match;
    }) as T[keyof T];
  }
  return out;
}
