// Route handler: POST /writing/[projectId]/[boardId]/export/epub/download
//
// Receives EpubSettings as a JSON body, loads the board's compiled content
// (includeInCompile=true only), generates an epub, and returns it as a
// downloadable file.

import { NextRequest, NextResponse } from 'next/server';
import { writingDb } from '@/db/writing';
import { boards, groups, lists, cards } from '@/db/writing/schema';
import { eq, inArray, and } from 'drizzle-orm';
import { generateEpub, type EpubSettings, type EpubBook } from '@/utils/epub';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ projectId: string; boardId: string }>;
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  const { boardId: bRaw } = await params;
  const boardId = parseInt(bRaw, 10);
  if (isNaN(boardId)) {
    return NextResponse.json({ error: 'Invalid board ID' }, { status: 400 });
  }

  let settings: EpubSettings;
  try {
    settings = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  // ── Load board data ──────────────────────────────────────────────────────

  const board = await writingDb.select({ title: boards.title })
    .from(boards)
    .where(eq(boards.id, boardId))
    .get();

  if (!board) {
    return NextResponse.json({ error: 'Board not found' }, { status: 404 });
  }

  const boardGroups = await writingDb
    .select()
    .from(groups)
    .where(eq(groups.boardId, boardId))
    .orderBy(groups.position)
    .all();

  const groupIds = boardGroups.map((g) => g.id);

  const boardLists = groupIds.length
    ? await writingDb
        .select()
        .from(lists)
        .where(inArray(lists.groupId, groupIds))
        .orderBy(lists.position)
        .all()
    : [];

  const listIds = boardLists.map((l) => l.id);

  const boardCards = listIds.length
    ? await writingDb
        .select()
        .from(cards)
        .where(and(inArray(cards.listId, listIds), eq(cards.includeInCompile, true)))
        .orderBy(cards.position)
        .all()
    : [];

  // ── Assemble the nested structure ────────────────────────────────────────

  const epubBooks: EpubBook[] = [{
    id: boardId,
    title: settings.title || board.title,
    groups: boardGroups.map((g) => ({
      id: g.id,
      title: g.title,
      lists: boardLists
        .filter((l) => l.groupId === g.id)
        .map((l) => ({
          id: l.id,
          title: l.title,
          cards: boardCards
            .filter((c) => c.listId === l.id)
            .map((c) => ({ id: c.id, title: c.title, content: c.content })),
        })),
    })),
  }];

  // ── Generate epub ────────────────────────────────────────────────────────

  let epubBuffer: Buffer;
  try {
    epubBuffer = generateEpub(epubBooks, settings);
  } catch (err) {
    console.error('epub generation failed', err);
    return NextResponse.json({ error: 'epub generation failed' }, { status: 500 });
  }

  const safeTitle = (settings.title || board.title).replace(/[^a-z0-9\-_ ]/gi, '_').trim();
  const filename = `${safeTitle || 'export'}.epub`;

  return new NextResponse(new Uint8Array(epubBuffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/epub+zip',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': String(epubBuffer.length),
    },
  });
}
