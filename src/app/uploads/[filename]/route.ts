import { NextResponse } from 'next/server';
import path from 'path';
import { promises as fs } from 'fs';
import { resolveUploadPath } from '@/utils/uploads';

const MIME_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.avif': 'image/avif',
};

// Serves user photos from public/uploads. This route sits outside the
// basic-auth proxy (see src/proxy.ts), so it must only ever read files that
// are directly inside the uploads folder.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;
  const filePath = resolveUploadPath(filename);
  // New uploads are always .webp; older ones may be anything, served as JPEG like before.
  const mimeType = MIME_TYPES[path.extname(filename).toLowerCase()] ?? 'image/jpeg';
  if (!filePath) {
    return new NextResponse('Image not found', { status: 404 });
  }

  try {
    const fileBuffer = await fs.readFile(filePath);
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': mimeType,
        'Cache-Control': 'public, max-age=86400', // Cache for 1 day
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return new NextResponse('Image not found', { status: 404 });
  }
}
