// Route handler: POST /writing/[projectId]/export/epub/download
//
// Receives { boardIds, settings } as JSON; shared loading/response logic
// lives in ../_lib/exportDownload.

import { NextRequest } from 'next/server';
import { generateEpub } from '@/utils/epub';
import { handleExportDownload } from '../../_lib/exportDownload';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ projectId: string }>;
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  return handleExportDownload(req, params, {
    label: 'epub',
    extension: '.epub',
    contentType: 'application/epub+zip',
    generate: generateEpub,
  });
}
