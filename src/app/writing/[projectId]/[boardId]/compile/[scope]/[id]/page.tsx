// src/app/writing/[projectId]/[boardId]/compile/[scope]/[id]/page.tsx
//
// "Compiled chapter" view. Renders every card in a list / group / board as one
// continuous, editable document (segmented: one TipTap editor per card).
import { writingDb } from '@/db/writing';
import { boards, groups, lists, cards } from '@/db/writing/schema';
import { eq, inArray, and } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import CompiledView from './_components/CompiledView';
import type { CompiledData, CompiledList } from './types';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ projectId: string; boardId: string; scope: string; id: string }>;
}

async function loadList(listId: number): Promise<CompiledList | null> {
  const list = await writingDb.select().from(lists).where(eq(lists.id, listId)).get();
  if (!list) return null;
  const listCards = await writingDb
    .select()
    .from(cards)
    .where(and(eq(cards.listId, listId), eq(cards.includeInCompile, true)))
    .orderBy(cards.position)
    .all();
  return { id: list.id, title: list.title, cards: listCards };
}

async function loadGroup(groupId: number) {
  const group = await writingDb.select().from(groups).where(eq(groups.id, groupId)).get();
  if (!group) return null;
  const groupLists = await writingDb
    .select()
    .from(lists)
    .where(eq(lists.groupId, groupId))
    .orderBy(lists.position)
    .all();
  const listIds = groupLists.map((l) => l.id);
  const allCards = listIds.length
    ? await writingDb.select().from(cards).where(and(inArray(cards.listId, listIds), eq(cards.includeInCompile, true))).orderBy(cards.position).all()
    : [];
  return {
    id: group.id,
    title: group.title,
    lists: groupLists.map((l) => ({
      id: l.id,
      title: l.title,
      cards: allCards.filter((c) => c.listId === l.id),
    })),
  };
}

export default async function CompilePage({ params }: PageProps) {
  const { projectId: pRaw, boardId: bRaw, scope, id: idRaw } = await params;
  const projectId = parseInt(pRaw, 10);
  const boardId = parseInt(bRaw, 10);
  const id = parseInt(idRaw, 10);
  if (isNaN(projectId) || isNaN(boardId) || isNaN(id)) notFound();

  let data: CompiledData | null = null;

  if (scope === 'list') {
    const list = await loadList(id);
    if (list) data = { scope: 'list', title: list.title, lists: [list] };
  } else if (scope === 'group') {
    const group = await loadGroup(id);
    if (group) data = { scope: 'group', title: group.title, groups: [group] };
  } else if (scope === 'board') {
    const board = await writingDb.select().from(boards).where(eq(boards.id, id)).get();
    if (!board) notFound();
    const boardGroups = await writingDb
      .select()
      .from(groups)
      .where(eq(groups.boardId, id))
      .orderBy(groups.position)
      .all();
    const groupIds = boardGroups.map((g) => g.id);
    const boardLists = groupIds.length
      ? await writingDb.select().from(lists).where(inArray(lists.groupId, groupIds)).orderBy(lists.position).all()
      : [];
    const listIds = boardLists.map((l) => l.id);
    const boardCards = listIds.length
      ? await writingDb.select().from(cards).where(and(inArray(cards.listId, listIds), eq(cards.includeInCompile, true))).orderBy(cards.position).all()
      : [];
    data = {
      scope: 'board',
      title: board.title,
      groups: boardGroups.map((g) => ({
        id: g.id,
        title: g.title,
        lists: boardLists
          .filter((l) => l.groupId === g.id)
          .map((l) => ({ id: l.id, title: l.title, cards: boardCards.filter((c) => c.listId === l.id) })),
      })),
    };
  } else {
    notFound();
  }

  if (!data) notFound();

  // Document-wide spacing is stored on the parent board.
  const boardRow = await writingDb
    .select({ lineHeight: boards.lineHeight, spaceBefore: boards.spaceBefore, spaceAfter: boards.spaceAfter })
    .from(boards)
    .where(eq(boards.id, boardId))
    .get();
  const initialSpacing = {
    lineHeight: boardRow?.lineHeight ?? null,
    spaceBefore: boardRow?.spaceBefore ?? null,
    spaceAfter: boardRow?.spaceAfter ?? null,
  };

  return (
    <CompiledView
      data={data}
      backHref={`/writing/${projectId}/${boardId}`}
      boardId={boardId}
      initialSpacing={initialSpacing}
    />
  );
}
