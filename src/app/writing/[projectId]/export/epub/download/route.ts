// Route handler: POST /writing/[projectId]/export/epub/download
//
// Receives { boardIds, settings } as JSON. Loads the selected boards (ordered
// by position, filtered to those belonging to this project), assembles an
// EpubBook[] structure, generates an epub, and returns it as a download.

import { NextRequest, NextResponse } from 'next/server';
import { writingDb } from '@/db/writing';
import { boards, groups, lists, cards } from '@/db/writing/schema';
import { eq, inArray, and } from 'drizzle-orm';
import { generateEpub, type EpubSettings, type EpubBook } from '@/utils/epub';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ projectId: string }>;
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  const { projectId: pRaw } = await params;
  const projectId = parseInt(pRaw, 10);
  if (isNaN(projectId)) {
    return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 });
  }

  let body: { boardIds: number[]; settings: EpubSettings };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { boardIds, settings } = body;
  if (!Array.isArray(boardIds) || boardIds.length === 0) {
    return NextResponse.json({ error: 'At least one board must be selected' }, { status: 400 });
  }

  // ── Load boards (verify project ownership, preserve position order) ─────────

  const allBoards = await writingDb
    .select()
    .from(boards)
    .where(and(inArray(boards.id, boardIds), eq(boards.projectId, projectId)))
    .orderBy(boards.position)
    .all();

  if (allBoards.length === 0) {
    return NextResponse.json({ error: 'No valid boards found' }, { status: 404 });
  }

  // ── Load content ─────────────────────────────────────────────────────────────

  const validBoardIds = allBoards.map((b) => b.id);

  const boardGroups = await writingDb
    .select()
    .from(groups)
    .where(inArray(groups.boardId, validBoardIds))
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

  // ── Assemble one EpubBook per board ──────────────────────────────────────────

  const epubBooks: EpubBook[] = allBoards.map((board) => ({
    id: board.id,
    title: board.title,
    groups: boardGroups
      .filter((g) => g.boardId === board.id)
      .map((g) => ({
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
  }));

  // ── Generate epub ─────────────────────────────────────────────────────────────

  let epubBuffer: Buffer;
  try {
    epubBuffer = generateEpub(epubBooks, settings);
  } catch (err) {
    console.error('epub generation failed', err);
    return NextResponse.json({ error: 'epub generation failed' }, { status: 500 });
  }

  const safeTitle = (settings.title || 'export').replace(/[^a-z0-9\-_ ]/gi, '_').trim();
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
