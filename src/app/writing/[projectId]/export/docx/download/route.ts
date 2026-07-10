// Route handler: POST /writing/[projectId]/export/docx/download
//
// Same request shape as the epub download route: { boardIds, settings };
// shared loading/response logic lives in ../_lib/exportDownload.

import { NextRequest } from 'next/server';
import { generateDocx } from '@/utils/docx-gen';
import { handleExportDownload } from '../../_lib/exportDownload';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ projectId: string }>;
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  return handleExportDownload(req, params, {
    label: 'docx',
    extension: '.docx',
    contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    generate: generateDocx,
  });
}
