import { NextResponse } from 'next/server';
import path from 'path';
import { promises as fs } from 'fs';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  const resolvedParams = await params;
  const filename = resolvedParams.filename;
  
  // Point to the exact folder we mapped in docker-compose
  const filePath = path.join(process.cwd(), 'public', 'uploads', filename);

  try {
    const fileBuffer = await fs.readFile(filePath);
    
    // Determine basic mime types so the browser renders the image properly
    const ext = path.extname(filename).toLowerCase();
    let mimeType = 'image/jpeg';
    if (ext === '.png') mimeType = 'image/png';
    if (ext === '.gif') mimeType = 'image/gif';
    if (ext === '.webp') mimeType = 'image/webp';
    if (ext === '.svg') mimeType = 'image/svg+xml';

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': mimeType,
        'Cache-Control': 'public, max-age=86400', // Cache for 1 day
      },
    });
  } catch (e) {
    return new NextResponse('Image not found', { status: 404 });
  }
}