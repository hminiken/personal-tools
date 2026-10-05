import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { compressImage } from '@/utils/compressImage';

// Server-only: everything user photos touch on disk goes through here so the
// upload actions and the /uploads route agree on where files live.
export const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');

/**
 * Resolves a bare filename inside UPLOAD_DIR, or null if it would land
 * anywhere else ("../.env", "a/b.webp", ...).
 */
export function resolveUploadPath(filename: string): string | null {
  if (!filename || filename !== path.basename(filename)) return null;
  const resolved = path.resolve(UPLOAD_DIR, filename);
  return resolved.startsWith(UPLOAD_DIR + path.sep) ? resolved : null;
}

/**
 * Compresses an uploaded photo to WebP, writes it to UPLOAD_DIR and returns
 * its public URL ("/uploads/<file>.webp"). The client's file name is reduced
 * to safe characters, so it can't steer the write outside the folder.
 */
export async function saveUploadedImage(file: File): Promise<string> {
  const buffer = await compressImage(Buffer.from(await file.arrayBuffer()));
  const baseName =
    file.name
      .replace(/\.[^.]+$/, '')
      .replace(/[^a-zA-Z0-9_-]+/g, '_')
      .slice(0, 60) || 'photo';
  const filename = `${Date.now()}-${baseName}.webp`;

  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(path.join(UPLOAD_DIR, filename), buffer);
  return `/uploads/${filename}`;
}
