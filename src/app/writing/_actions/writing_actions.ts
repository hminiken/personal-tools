// src/app/writing/_actions/writing_actions.ts
'use server';

import { writingDb } from '@/db/writing';
import { writingProjects, boards, groups, lists, cards } from '@/db/writing/schema';
import { eq, desc, max } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

// Revalidate every board page (covers all dynamic [projectId]/[boardId] instances).
function revalidateBoards() {
  revalidatePath('/writing/[projectId]/[boardId]', 'page');
  revalidatePath('/writing/[projectId]', 'page');
}

// Next position when appending to the end of a sibling set.
async function nextPosition(
  table: typeof boards | typeof groups | typeof lists | typeof cards,
  fkColumn: any,
  parentId: number
): Promise<number> {
  const row = await writingDb
    .select({ m: max(table.position) })
    .from(table as any)
    .where(eq(fkColumn, parentId))
    .get();
  return (row?.m ?? 0) + 1;
}

// ==========================================
// PROJECTS
// ==========================================
export async function createWritingProject(formData: FormData) {
  const title = (formData.get('title') as string)?.trim();
  if (!title) return;

  await writingDb.insert(writingProjects).values({
    title,
    description: (formData.get('description') as string) || null,
    status: (formData.get('status') as string) || null,
    categories: (formData.get('categories') as string) || null,
    coverImage: (formData.get('coverImage') as string) || null,
  });

  revalidatePath('/writing');
}

export async function updateWritingProject(formData: FormData) {
  const id = Number(formData.get('id'));
  if (!id || isNaN(id)) return;

  const data: Partial<typeof writingProjects.$inferInsert> = {};
  if (formData.has('title')) data.title = formData.get('title') as string;
  if (formData.has('description')) data.description = formData.get('description') as string;
  if (formData.has('status')) data.status = formData.get('status') as string;
  if (formData.has('categories')) data.categories = formData.get('categories') as string;
  if (formData.has('coverImage')) data.coverImage = formData.get('coverImage') as string;

  if (Object.keys(data).length > 0) {
    await writingDb.update(writingProjects).set(data).where(eq(writingProjects.id, id));
  }
  revalidatePath('/writing');
  revalidatePath(`/writing/${id}`);
}

export async function deleteWritingProject(id: number) {
  await writingDb.delete(writingProjects).where(eq(writingProjects.id, id));
  revalidatePath('/writing');
}

// ==========================================
// BOARDS
// ==========================================
export async function createBoard(projectId: number, title: string) {
  const t = title?.trim();
  if (!projectId || !t) return;
  const position = await nextPosition(boards, boards.projectId, projectId);
  const inserted = await writingDb
    .insert(boards)
    .values({ projectId, title: t, position })
    .returning({ id: boards.id })
    .get();
  revalidatePath(`/writing/${projectId}`);
  return inserted?.id;
}

export async function renameBoard(boardId: number, title: string) {
  await writingDb.update(boards).set({ title: title.trim() }).where(eq(boards.id, boardId));
  revalidateBoards();
}

export async function deleteBoard(boardId: number) {
  await writingDb.delete(boards).where(eq(boards.id, boardId));
  revalidateBoards();
}

// Reorder a board tab within its project. `position` is the midpoint between
// its new neighbours, computed client-side.
//
// NOTE: move actions intentionally DON'T call revalidatePath. The client already
// shows the final position optimistically; revalidating would re-fetch and swap
// the whole board state, causing a sluggish round-trip and a re-animation "pop"
// after every drop. The new position is persisted; a hard load reflects it.
export async function moveBoard(boardId: number, position: number) {
  await writingDb.update(boards).set({ position }).where(eq(boards.id, boardId));
}

// ==========================================
// GROUPS
// ==========================================
export async function createGroup(boardId: number, title: string) {
  const t = title?.trim();
  if (!boardId || !t) return;
  const position = await nextPosition(groups, groups.boardId, boardId);
  await writingDb.insert(groups).values({ boardId, title: t, position });
  revalidateBoards();
}

export async function renameGroup(groupId: number, title: string) {
  await writingDb.update(groups).set({ title: title.trim() }).where(eq(groups.id, groupId));
  revalidateBoards();
}

export async function setGroupColor(groupId: number, color: string | null) {
  await writingDb.update(groups).set({ color }).where(eq(groups.id, groupId));
  revalidateBoards();
}

export async function deleteGroup(groupId: number) {
  await writingDb.delete(groups).where(eq(groups.id, groupId));
  revalidateBoards();
}

// Reorder a group within its board. See moveBoard note: no revalidate (optimistic).
export async function moveGroup(groupId: number, position: number) {
  await writingDb.update(groups).set({ position }).where(eq(groups.id, groupId));
}

// ==========================================
// LISTS
// ==========================================
export async function createList(groupId: number, title: string) {
  const t = title?.trim();
  if (!groupId || !t) return;
  const position = await nextPosition(lists, lists.groupId, groupId);
  await writingDb.insert(lists).values({ groupId, title: t, position });
  revalidateBoards();
}

export async function renameList(listId: number, title: string) {
  await writingDb.update(lists).set({ title: title.trim() }).where(eq(lists.id, listId));
  revalidateBoards();
}

export async function deleteList(listId: number) {
  await writingDb.delete(lists).where(eq(lists.id, listId));
  revalidateBoards();
}

// Move a list to a (possibly new) group at the given position. No revalidate (optimistic).
export async function moveList(listId: number, groupId: number, position: number) {
  await writingDb.update(lists).set({ groupId, position }).where(eq(lists.id, listId));
}

// ==========================================
// CARDS
// ==========================================
export async function createCard(listId: number, title: string) {
  const t = title?.trim();
  if (!listId || !t) return;
  const position = await nextPosition(cards, cards.listId, listId);
  await writingDb.insert(cards).values({ listId, title: t, position });
  revalidateBoards();
}

export async function updateCard(cardId: number, data: { title?: string; content?: string }) {
  const patch: Partial<typeof cards.$inferInsert> = {};
  if (data.title !== undefined) patch.title = data.title;
  if (data.content !== undefined) patch.content = data.content;
  if (Object.keys(patch).length > 0) {
    await writingDb.update(cards).set(patch).where(eq(cards.id, cardId));
  }
  revalidateBoards();
}

export async function deleteCard(cardId: number) {
  await writingDb.delete(cards).where(eq(cards.id, cardId));
  revalidateBoards();
}

// Silent content save used by the compiled chapter view. No revalidate: each
// card editor saves on blur and we don't want a refresh to rebuild editors or
// move the cursor mid-write. Board previews refresh on next load.
export async function saveCardContent(cardId: number, content: string) {
  await writingDb.update(cards).set({ content }).where(eq(cards.id, cardId));
}

// Move a card to a (possibly new) list at the given position. No revalidate (optimistic).
export async function moveCard(cardId: number, listId: number, position: number) {
  await writingDb.update(cards).set({ listId, position }).where(eq(cards.id, cardId));
}

// ==========================================
// READ HELPERS
// ==========================================
export async function getProjectBoards(projectId: number) {
  return writingDb
    .select()
    .from(boards)
    .where(eq(boards.projectId, projectId))
    .orderBy(boards.position, desc(boards.createdAt))
    .all();
}
