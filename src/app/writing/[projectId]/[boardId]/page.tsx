// src/app/writing/[projectId]/[boardId]/page.tsx
import { writingDb } from '@/db/writing';
import { writingProjects, boards, groups, lists, cards } from '@/db/writing/schema';
import { eq, desc, inArray } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import BoardView from './_components/BoardView';
import type { BoardGroup } from './types';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ projectId: string; boardId: string }>;
}

export default async function BoardPage({ params }: PageProps) {
  const { projectId: pRaw, boardId: bRaw } = await params;
  const projectId = parseInt(pRaw, 10);
  const boardId = parseInt(bRaw, 10);
  if (isNaN(projectId) || isNaN(boardId)) notFound();

  const project = await writingDb
    .select()
    .from(writingProjects)
    .where(eq(writingProjects.id, projectId))
    .get();
  if (!project) notFound();

  const activeBoard = await writingDb.select().from(boards).where(eq(boards.id, boardId)).get();
  if (!activeBoard || activeBoard.projectId !== projectId) notFound();

  // Tabs across the top.
  const projectBoards = await writingDb
    .select()
    .from(boards)
    .where(eq(boards.projectId, projectId))
    .orderBy(boards.position, desc(boards.createdAt))
    .all();

  // Full tree for the active board: groups -> lists -> cards.
  const boardGroups = await writingDb
    .select()
    .from(groups)
    .where(eq(groups.boardId, boardId))
    .orderBy(groups.position)
    .all();

  const groupIds = boardGroups.map((g) => g.id);
  const boardLists = groupIds.length
    ? await writingDb.select().from(lists).where(inArray(lists.groupId, groupIds)).orderBy(lists.position).all()
    : [];

  const listIds = boardLists.map((l) => l.id);
  const boardCards = listIds.length
    ? await writingDb.select().from(cards).where(inArray(cards.listId, listIds)).orderBy(cards.position).all()
    : [];

  // Nest into the shape the board UI consumes.
  const tree: BoardGroup[] = boardGroups.map((g) => ({
    ...g,
    lists: boardLists
      .filter((l) => l.groupId === g.id)
      .map((l) => ({
        ...l,
        cards: boardCards.filter((c) => c.listId === l.id),
      })),
  }));

  return (
    <BoardView
      projectId={projectId}
      projectTitle={project.title}
      boards={projectBoards}
      activeBoardId={boardId}
      initialGroups={tree}
    />
  );
}
