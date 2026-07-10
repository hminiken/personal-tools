// Shared implementation for the epub and docx download route handlers.
//
// Both routes receive the same POST body ({ boardIds, settings }), run the
// same board→group→list→card loading cascade, and assemble the same
// EpubBook[] structure — they differ only in which generator turns that
// structure into bytes and what content type / extension the response gets.

import { NextRequest, NextResponse } from 'next/server';
import { writingDb } from '@/db/writing';
import { boards, groups, lists, cards } from '@/db/writing/schema';
import { eq, inArray, and } from 'drizzle-orm';
import type { EpubSettings, EpubBook } from '@/utils/epub';

// Loads the selected boards (verifying they belong to the project, preserving
// position order) plus their compile-included cards, assembled one EpubBook
// per board. Returns null when no valid boards match.
export async function loadEpubBooks(projectId: number, boardIds: number[]): Promise<EpubBook[] | null> {
  const allBoards = await writingDb
    .select()
    .from(boards)
    .where(and(inArray(boards.id, boardIds), eq(boards.projectId, projectId)))
    .orderBy(boards.position)
    .all();

  if (allBoards.length === 0) return null;

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

  return allBoards.map((board) => ({
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
}

export async function handleExportDownload(
  req: NextRequest,
  params: Promise<{ projectId: string }>,
  format: {
    label: string; // used in error messages, e.g. 'epub'
    extension: string; // e.g. '.epub'
    contentType: string;
    generate: (books: EpubBook[], settings: EpubSettings) => Buffer;
  },
) {
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

  const epubBooks = await loadEpubBooks(projectId, boardIds);
  if (!epubBooks) {
    return NextResponse.json({ error: 'No valid boards found' }, { status: 404 });
  }

  let buffer: Buffer;
  try {
    buffer = format.generate(epubBooks, settings);
  } catch (err) {
    console.error(`${format.label} generation failed`, err);
    return NextResponse.json({ error: `${format.label} generation failed` }, { status: 500 });
  }

  const safeTitle = (settings.title || 'export').replace(/[^a-z0-9\-_ ]/gi, '_').trim();
  const filename = `${safeTitle || 'export'}${format.extension}`;

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      'Content-Type': format.contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': String(buffer.length),
    },
  });
}
