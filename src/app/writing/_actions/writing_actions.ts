// src/app/writing/_actions/writing_actions.ts
'use server';

import { writingDb } from '@/db/writing';
import { writingProjects, writingFolders, boards, groups, lists, cards, cardImages, labels, labelCategories, cardLabels, cardLinks, writingSettings, writingThemes } from '@/db/writing/schema';
import { eq, and, max, inArray, isNull, or, desc } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { writeFile } from 'fs/promises';
import path from 'path';
import { compressImage } from '@/utils/compressImage';
import { countWords } from '@/utils/writingWordCount';
import { parseThemeDefinition } from '@/utils/writingTheme';
import { serializeComments, type CommentRecord } from '@/utils/writingComments';
import { decodeHtmlEntities } from '@/utils/htmlEntities';

// Revalidate every board page (covers all dynamic [projectId]/[boardId] instances).
function revalidateBoards() {
  revalidatePath('/writing/[projectId]/[boardId]', 'page');
  revalidatePath('/writing/[projectId]', 'page');
}

// Next position when appending to the end of a sibling set.
async function nextPosition(
  table: typeof boards | typeof groups | typeof lists | typeof cards | typeof cardImages | typeof labels | typeof labelCategories | typeof writingFolders,
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

// Revalidate the gallery + every folder page (covers all [folderId] instances).
function revalidateGallery() {
  revalidatePath('/writing');
  revalidatePath('/writing/folder/[folderId]', 'page');
}

// Compress an uploaded/pasted image (crafting pipeline: ~1MB WebP, longest
// edge 2000px), store it under public/uploads, and return its serving path.
async function storeUploadedImage(imageFile: File): Promise<string> {
  const originalBuffer = Buffer.from(await imageFile.arrayBuffer());
  const buffer = await compressImage(originalBuffer);

  const baseName = imageFile.name.replaceAll(' ', '_').replace(/\.[^.]+$/, '');
  const filename = `${Date.now()}-${baseName}.webp`;
  const filepath = path.join(process.cwd(), 'public/uploads', filename);
  await writeFile(filepath, buffer);

  return `/uploads/${filename}`;
}

// ==========================================
// FOLDERS  (loose organization layer over the gallery; can nest)
// ==========================================
// Next position when appending a folder/project to a level. Handles the
// top-level case (parentId null) where eq(col, null) would never match.
async function nextSiblingPosition(column: any, parentColumn: any, parentId: number | null): Promise<number> {
  const row = await writingDb
    .select({ m: max(column) })
    .from(writingFolders)
    .where(parentId == null ? isNull(parentColumn) : eq(parentColumn, parentId))
    .get();
  return (row?.m ?? 0) + 1;
}

export async function createFolder(formData: FormData) {
  const name = (formData.get('name') as string)?.trim();
  if (!name) return;
  const rawParent = formData.get('parentFolderId');
  const parentFolderId = rawParent ? Number(rawParent) : null;

  const position = await nextSiblingPosition(writingFolders.position, writingFolders.parentFolderId, parentFolderId);
  await writingDb.insert(writingFolders).values({
    name,
    parentFolderId: parentFolderId && !isNaN(parentFolderId) ? parentFolderId : null,
    coverImage: (formData.get('coverImage') as string) || null,
    position,
  });
  revalidateGallery();
}

export async function renameFolder(folderId: number, name: string) {
  const t = name?.trim();
  if (!folderId || !t) return;
  await writingDb.update(writingFolders).set({ name: t }).where(eq(writingFolders.id, folderId));
  revalidateGallery();
}

export async function setFolderCover(folderId: number, coverImage: string | null) {
  await writingDb.update(writingFolders).set({ coverImage }).where(eq(writingFolders.id, folderId));
  revalidateGallery();
}

// Set (or clear) a folder's accent color. Pass null to remove it.
export async function setFolderColor(folderId: number, color: string | null) {
  if (!folderId) return;
  await writingDb.update(writingFolders).set({ color }).where(eq(writingFolders.id, folderId));
  revalidateGallery();
}

// Upload (or paste) a cover image for a folder. Sets the folder's coverImage
// and returns the new path so the caller can refresh.
export async function uploadFolderCover(formData: FormData): Promise<{ path: string } | null> {
  const folderId = formData.get('folderId') ? Number(formData.get('folderId')) : null;
  const imageFile = formData.get('file') as File | null;
  if (!folderId || !imageFile || imageFile.size === 0) return null;

  const newPath = await storeUploadedImage(imageFile);
  await writingDb.update(writingFolders).set({ coverImage: newPath }).where(eq(writingFolders.id, folderId));
  revalidateGallery();
  return { path: newPath };
}

// Delete a folder, reparenting its direct children (subfolders + projects) up
// to the deleted folder's own parent so nothing is orphaned or lost.
export async function deleteFolder(folderId: number) {
  if (!folderId) return;
  const folder = await writingDb
    .select({ parentFolderId: writingFolders.parentFolderId })
    .from(writingFolders)
    .where(eq(writingFolders.id, folderId))
    .get();
  if (!folder) return;
  const newParent = folder.parentFolderId ?? null;

  await writingDb.update(writingFolders).set({ parentFolderId: newParent }).where(eq(writingFolders.parentFolderId, folderId));
  await writingDb.update(writingProjects).set({ folderId: newParent }).where(eq(writingProjects.folderId, folderId));
  await writingDb.delete(writingFolders).where(eq(writingFolders.id, folderId));
  revalidateGallery();
}

// Move a project into a folder (null = top level).
export async function moveProjectToFolder(projectId: number, folderId: number | null) {
  if (!projectId) return;
  await writingDb.update(writingProjects).set({ folderId: folderId ?? null }).where(eq(writingProjects.id, projectId));
  revalidateGallery();
}

// Move a folder under another folder (null = top level). Guards against cycles:
// a folder cannot become a descendant of itself.
export async function moveFolderToFolder(folderId: number, parentFolderId: number | null) {
  if (!folderId || folderId === parentFolderId) return;

  // Walk up from the proposed parent; if we reach folderId, the move would
  // create a loop — reject it.
  let cursor: number | null = parentFolderId ?? null;
  while (cursor != null) {
    if (cursor === folderId) return;
    const row: { parentFolderId: number | null } | undefined = await writingDb
      .select({ parentFolderId: writingFolders.parentFolderId })
      .from(writingFolders)
      .where(eq(writingFolders.id, cursor))
      .get();
    cursor = row?.parentFolderId ?? null;
  }

  await writingDb.update(writingFolders).set({ parentFolderId: parentFolderId ?? null }).where(eq(writingFolders.id, folderId));
  revalidateGallery();
}

// ==========================================
// PROJECTS
// ==========================================
export async function createWritingProject(formData: FormData) {
  const title = (formData.get('title') as string)?.trim();
  if (!title) return;

  const rawFolder = formData.get('folderId');
  const folderId = rawFolder ? Number(rawFolder) : null;

  await writingDb.insert(writingProjects).values({
    title,
    folderId: folderId && !isNaN(folderId) ? folderId : null,
    description: (formData.get('description') as string) || null,
    status: (formData.get('status') as string) || null,
    categories: (formData.get('categories') as string) || null,
    coverImage: (formData.get('coverImage') as string) || null,
  });

  revalidateGallery();
}

// Set (or clear) a project's cover image. Pass null to remove it.
export async function setProjectCover(projectId: number, coverImage: string | null) {
  if (!projectId) return;
  await writingDb.update(writingProjects).set({ coverImage }).where(eq(writingProjects.id, projectId));
  revalidateGallery();
}

// Upload (or paste) a cover image for a project. See uploadFolderCover.
export async function uploadProjectCover(formData: FormData): Promise<{ path: string } | null> {
  const projectId = formData.get('projectId') ? Number(formData.get('projectId')) : null;
  const imageFile = formData.get('file') as File | null;
  if (!projectId || !imageFile || imageFile.size === 0) return null;

  const newPath = await storeUploadedImage(imageFile);
  await writingDb.update(writingProjects).set({ coverImage: newPath }).where(eq(writingProjects.id, projectId));
  revalidateGallery();
  return { path: newPath };
}

export async function deleteWritingProject(id: number) {
  await writingDb.delete(writingProjects).where(eq(writingProjects.id, id));
  revalidateGallery();
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

// Cheap "did anything change?" check for a board, backing client-side polling
// that catches up a stale tab/computer after a change made elsewhere (see
// BoardView's poll effect). Returns the latest updatedAt across the board row
// itself and everything nested under it (groups/lists/cards all bump
// updatedAt on any .update(), including reorders) as an epoch ms number the
// client can compare against what it last saw — a plain select+orderBy+limit
// per level rather than an aggregate, so there's no column-mapping ambiguity
// around max() over a timestamp column.
export async function getBoardActivityStamp(boardId: number): Promise<number> {
  const [board, group, list, card] = await Promise.all([
    writingDb.select({ updatedAt: boards.updatedAt }).from(boards).where(eq(boards.id, boardId)).get(),
    writingDb.select({ updatedAt: groups.updatedAt }).from(groups).where(eq(groups.boardId, boardId)).orderBy(desc(groups.updatedAt)).limit(1).get(),
    writingDb
      .select({ updatedAt: lists.updatedAt })
      .from(lists)
      .innerJoin(groups, eq(lists.groupId, groups.id))
      .where(eq(groups.boardId, boardId))
      .orderBy(desc(lists.updatedAt))
      .limit(1)
      .get(),
    writingDb
      .select({ updatedAt: cards.updatedAt })
      .from(cards)
      .innerJoin(lists, eq(cards.listId, lists.id))
      .innerJoin(groups, eq(lists.groupId, groups.id))
      .where(eq(groups.boardId, boardId))
      .orderBy(desc(cards.updatedAt))
      .limit(1)
      .get(),
  ]);
  const stamps = [board?.updatedAt, group?.updatedAt, list?.updatedAt, card?.updatedAt]
    .filter((d): d is Date => d != null)
    .map((d) => d.getTime());
  return stamps.length ? Math.max(...stamps) : 0;
}

// Document-wide prose formatting for a board (spacing + typography). Applied
// client-side as CSS / editor config, persisted here. No revalidate: the client
// updates optimistically.
export async function setBoardSpacing(
  boardId: number,
  spacing: {
    lineHeight?: string | null;
    spaceBefore?: string | null;
    spaceAfter?: string | null;
    fontFamily?: string | null;
    fontSize?: string | null;
    paragraphIndent?: string | null;
    smartQuotes?: boolean | null;
  }
) {
  await writingDb.update(boards).set(spacing).where(eq(boards.id, boardId));
}

// Set (or clear) a board's Unsplash background. `credit` is the {name, link}
// attribution object, stored as JSON; pass null for both to remove it.
export async function setBoardBackground(
  boardId: number,
  image: string | null,
  credit: { name: string; link: string } | null
) {
  await writingDb
    .update(boards)
    .set({ backgroundImage: image, backgroundCredit: credit ? JSON.stringify(credit) : null })
    .where(eq(boards.id, boardId));
  revalidateBoards();
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

// Set (or clear) a group's Unsplash background. See setBoardBackground.
export async function setGroupBackground(
  groupId: number,
  image: string | null,
  credit: { name: string; link: string } | null
) {
  await writingDb
    .update(groups)
    .set({ backgroundImage: image, backgroundCredit: credit ? JSON.stringify(credit) : null })
    .where(eq(groups.id, groupId));
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

export async function updateCard(
  cardId: number,
  data: {
    title?: string; content?: string; includeInCompile?: boolean; isImageCard?: boolean; imagePath?: string | null;
    coverImage?: string | null; comments?: string | null; hideWordCount?: boolean; color?: string | null;
    cardType?: 'standard' | 'character'; characterFields?: string | null;
  }
) {
  const patch: Partial<typeof cards.$inferInsert> = {};
  if (data.title !== undefined) patch.title = data.title;
  if (data.content !== undefined) { patch.content = data.content; patch.wordCount = countWords(data.content); }
  if (data.includeInCompile !== undefined) patch.includeInCompile = data.includeInCompile;
  if (data.isImageCard !== undefined) patch.isImageCard = data.isImageCard;
  if (data.hideWordCount !== undefined) patch.hideWordCount = data.hideWordCount;
  if (data.imagePath !== undefined) patch.imagePath = data.imagePath;
  if (data.coverImage !== undefined) patch.coverImage = data.coverImage;
  if (data.comments !== undefined) patch.comments = data.comments;
  if (data.color !== undefined) patch.color = data.color;
  if (data.cardType !== undefined) patch.cardType = data.cardType;
  if (data.characterFields !== undefined) patch.characterFields = data.characterFields;
  if (Object.keys(patch).length > 0) {
    await writingDb.update(cards).set(patch).where(eq(cards.id, cardId));
  }
  revalidateBoards();
}

// ==========================================
// CARD GALLERY IMAGES (any card may hold several reference photos)
// ==========================================
// Upload (or paste) an image into a card's gallery. Returns the new path.
// Does NOT flip the card into image-card mode — it just appends to the
// gallery (the first image does become the cover by default, below).
export async function addCardImage(formData: FormData): Promise<{ id: number; path: string } | null> {
  const cardId = formData.get('cardId') ? Number(formData.get('cardId')) : null;
  const imageFile = formData.get('file') as File | null;
  if (!cardId || !imageFile || imageFile.size === 0) return null;

  const newImagePath = await storeUploadedImage(imageFile);
  const position = await nextPosition(cardImages, cardImages.cardId, cardId);
  const inserted = await writingDb
    .insert(cardImages)
    .values({ cardId, path: newImagePath, position })
    .returning({ id: cardImages.id })
    .get();

  // First image added becomes the cover by default.
  const card = await writingDb.select({ coverImage: cards.coverImage }).from(cards).where(eq(cards.id, cardId)).get();
  if (card && !card.coverImage) {
    await writingDb.update(cards).set({ coverImage: newImagePath }).where(eq(cards.id, cardId));
  }

  revalidateBoards();
  return inserted ? { id: inserted.id, path: newImagePath } : null;
}

// Remove one gallery image. If it was the card's cover, clear the cover.
export async function deleteCardImage(imageId: number) {
  const img = await writingDb.select().from(cardImages).where(eq(cardImages.id, imageId)).get();
  if (!img) return;
  await writingDb.delete(cardImages).where(eq(cardImages.id, imageId));

  const card = await writingDb.select({ coverImage: cards.coverImage }).from(cards).where(eq(cards.id, img.cardId)).get();
  if (card?.coverImage === img.path) {
    await writingDb.update(cards).set({ coverImage: null }).where(eq(cards.id, img.cardId));
  }
  revalidateBoards();
}

// Flag one gallery image (by path) as the card's cover. Pass null to clear.
export async function setCardCover(cardId: number, imagePath: string | null) {
  await writingDb.update(cards).set({ coverImage: imagePath }).where(eq(cards.id, cardId));
  revalidateBoards();
}

export async function deleteCard(cardId: number) {
  await writingDb.delete(cards).where(eq(cards.id, cardId));
  revalidateBoards();
}

// ==========================================
// WORD COUNT GOALS
// ==========================================
export async function setProjectWordGoal(projectId: number, goal: number | null) {
  await writingDb.update(writingProjects).set({ wordCountGoal: goal }).where(eq(writingProjects.id, projectId));
  revalidateGallery();
}

export async function setBoardWordGoal(boardId: number, goal: number | null) {
  await writingDb.update(boards).set({ wordCountGoal: goal }).where(eq(boards.id, boardId));
  revalidateBoards();
}

export async function setGroupWordGoal(groupId: number, goal: number | null) {
  await writingDb.update(groups).set({ wordCountGoal: goal }).where(eq(groups.id, groupId));
  revalidateBoards();
}

export async function setListWordGoal(listId: number, goal: number | null) {
  await writingDb.update(lists).set({ wordCountGoal: goal }).where(eq(lists.id, listId));
  revalidateBoards();
}

export async function setCardWordGoal(cardId: number, goal: number | null) {
  await writingDb.update(cards).set({ wordCountGoal: goal }).where(eq(cards.id, cardId));
  revalidateBoards();
}

// ==========================================
// GLOBAL WRITING DESK SETTINGS  (singleton row, id = 1)
// ==========================================
export type WordCountDisplayMode = 'off' | 'bar' | 'text' | 'combo';

export async function getWritingSettings() {
  const row = await writingDb.select().from(writingSettings).where(eq(writingSettings.id, 1)).get();
  return (
    row ?? {
      id: 1,
      wordCountDisplayMode: 'off' as WordCountDisplayMode,
      defaultCardWordGoal: null,
      defaultListWordGoal: null,
      defaultGroupWordGoal: null,
    }
  );
}

export async function updateWritingSettings(patch: {
  wordCountDisplayMode?: WordCountDisplayMode;
  defaultCardWordGoal?: number | null;
  defaultListWordGoal?: number | null;
  defaultGroupWordGoal?: number | null;
}) {
  await writingDb
    .insert(writingSettings)
    .values({ id: 1, ...patch })
    .onConflictDoUpdate({ target: writingSettings.id, set: patch });
  revalidateGallery();
  revalidateBoards();
}

// Move a card to a (possibly new) list at the given position. No revalidate (optimistic).
export async function moveCard(cardId: number, listId: number, position: number) {
  await writingDb.update(cards).set({ listId, position }).where(eq(cards.id, cardId));
}

// ==========================================
// LABEL CATEGORIES
// ==========================================
export async function createLabelCategory(projectId: number, name: string, singleSelect = false) {
  const t = name?.trim();
  if (!projectId || !t) return;
  const position = await nextPosition(labelCategories, labelCategories.projectId, projectId);
  const inserted = await writingDb
    .insert(labelCategories)
    .values({ projectId, name: t, singleSelect, position })
    .returning({ id: labelCategories.id })
    .get();
  revalidateBoards();
  return inserted?.id;
}

export async function updateLabelCategory(
  categoryId: number,
  data: { name?: string; singleSelect?: boolean }
) {
  const patch: Partial<typeof labelCategories.$inferInsert> = {};
  if (data.name !== undefined) patch.name = data.name.trim();
  if (data.singleSelect !== undefined) patch.singleSelect = data.singleSelect;
  if (Object.keys(patch).length > 0) {
    await writingDb.update(labelCategories).set(patch).where(eq(labelCategories.id, categoryId));
  }
  revalidateBoards();
}

// Deleting a category cascades to its labels (and their card assignments).
export async function deleteLabelCategory(categoryId: number) {
  await writingDb.delete(labelCategories).where(eq(labelCategories.id, categoryId));
  revalidateBoards();
}

// ==========================================
// LABELS
// ==========================================
export async function createLabel(
  projectId: number,
  data: { name: string; color: string; categoryId?: number | null }
) {
  const t = data.name?.trim();
  if (!projectId || !t) return;
  const position = await nextPosition(labels, labels.projectId, projectId);
  const inserted = await writingDb
    .insert(labels)
    .values({
      projectId,
      categoryId: data.categoryId ?? null,
      name: t,
      color: data.color || 'gray',
      position,
    })
    .returning({ id: labels.id })
    .get();
  revalidateBoards();
  return inserted?.id;
}

export async function updateLabel(
  labelId: number,
  data: { name?: string; color?: string; categoryId?: number | null; drivesCardColor?: boolean }
) {
  const patch: Partial<typeof labels.$inferInsert> = {};
  if (data.name !== undefined) patch.name = data.name.trim();
  if (data.color !== undefined) patch.color = data.color;
  if (data.categoryId !== undefined) patch.categoryId = data.categoryId;
  if (data.drivesCardColor !== undefined) patch.drivesCardColor = data.drivesCardColor;
  if (Object.keys(patch).length > 0) {
    await writingDb.update(labels).set(patch).where(eq(labels.id, labelId));
  }
  revalidateBoards();
}

export async function deleteLabel(labelId: number) {
  await writingDb.delete(labels).where(eq(labels.id, labelId));
  revalidateBoards();
}

// ==========================================
// CARD <-> LABEL ASSIGNMENT
// ==========================================
// Apply a label to a card. If the label belongs to a single-select category,
// any other labels from that same category are removed from the card first
// (so a card holds at most one "POV", etc.).
export async function addCardLabel(cardId: number, labelId: number) {
  if (!cardId || !labelId) return;

  const label = await writingDb
    .select({ categoryId: labels.categoryId, projectId: labels.projectId })
    .from(labels)
    .where(eq(labels.id, labelId))
    .get();
  if (!label) return;

  if (label.categoryId != null) {
    const category = await writingDb
      .select({ singleSelect: labelCategories.singleSelect })
      .from(labelCategories)
      .where(eq(labelCategories.id, label.categoryId))
      .get();

    if (category?.singleSelect) {
      // Find the card's existing labels that share this category and drop them.
      const siblingLabelIds = (
        await writingDb
          .select({ id: labels.id })
          .from(labels)
          .where(eq(labels.categoryId, label.categoryId))
          .all()
      ).map((r) => r.id);

      if (siblingLabelIds.length) {
        await writingDb
          .delete(cardLabels)
          .where(and(eq(cardLabels.cardId, cardId), inArray(cardLabels.labelId, siblingLabelIds)));
      }
    }
  }

  await writingDb.insert(cardLabels).values({ cardId, labelId }).onConflictDoNothing();
  revalidateBoards();
}

export async function removeCardLabel(cardId: number, labelId: number) {
  await writingDb
    .delete(cardLabels)
    .where(and(eq(cardLabels.cardId, cardId), eq(cardLabels.labelId, labelId)));
  revalidateBoards();
}

// ==========================================
// CARD LINKS
// ==========================================
// Links are stored in canonical order (min(a,b) as source, max(a,b) as target)
// so the UNIQUE constraint deduplicates (A→B) and (B→A) automatically.

function stripHtml(html: string | null | undefined): string {
  if (!html) return '';
  return decodeHtmlEntities(html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()).slice(0, 160);
}

export async function addCardLink(cardIdA: number, cardIdB: number) {
  if (!cardIdA || !cardIdB || cardIdA === cardIdB) return;
  const [src, tgt] = cardIdA < cardIdB ? [cardIdA, cardIdB] : [cardIdB, cardIdA];
  await writingDb
    .insert(cardLinks)
    .values({ sourceCardId: src, targetCardId: tgt, createdAt: new Date() })
    .onConflictDoNothing();
  revalidateBoards();
}

export async function removeCardLink(linkId: number) {
  if (!linkId) return;
  await writingDb.delete(cardLinks).where(eq(cardLinks.id, linkId));
  revalidateBoards();
}

// ==========================================
// THEMES  (uploaded, selectable per board — not scoped to any project)
// ==========================================
export async function listThemes() {
  // Built-ins first (alphabetically), then custom uploads — mirrors the
  // grouping shown in the theme picker/manage-themes modal.
  return writingDb.select().from(writingThemes).orderBy(desc(writingThemes.isBuiltin), writingThemes.name).all();
}

// Validates + stores an uploaded theme file. Throws (with a message safe to
// show the user) if the JSON is malformed or uses an unknown token/bad value —
// see parseThemeDefinition for the exact rules.
export async function createTheme(name: string, definitionJson: string) {
  const t = name?.trim();
  if (!t) throw new Error('Theme needs a name.');
  const definition = parseThemeDefinition(definitionJson); // throws on invalid input
  const inserted = await writingDb
    .insert(writingThemes)
    .values({ name: t, definition: JSON.stringify(definition) })
    .returning({ id: writingThemes.id })
    .get();
  revalidateBoards();
  return inserted?.id;
}

async function assertNotBuiltin(themeId: number, action: string) {
  const theme = await writingDb.select({ isBuiltin: writingThemes.isBuiltin }).from(writingThemes).where(eq(writingThemes.id, themeId)).get();
  if (theme?.isBuiltin) throw new Error(`Built-in themes can't be ${action}. Duplicate it to make an editable copy.`);
}

export async function renameTheme(themeId: number, name: string) {
  await assertNotBuiltin(themeId, 'renamed');
  const t = name?.trim();
  if (!t) return;
  await writingDb.update(writingThemes).set({ name: t }).where(eq(writingThemes.id, themeId));
  revalidateBoards();
}

// Replaces a theme's definition in place (re-uploading the same theme rather
// than creating a new one). Same validation as createTheme.
export async function updateThemeDefinition(themeId: number, definitionJson: string) {
  await assertNotBuiltin(themeId, 'replaced');
  const definition = parseThemeDefinition(definitionJson); // throws on invalid input
  await writingDb.update(writingThemes).set({ definition: JSON.stringify(definition) }).where(eq(writingThemes.id, themeId));
  revalidateBoards();
}

// Any board still pointing at this theme falls back to the default look
// (themeId set null via the FK's onDelete rule).
export async function deleteTheme(themeId: number) {
  await assertNotBuiltin(themeId, 'deleted');
  await writingDb.delete(writingThemes).where(eq(writingThemes.id, themeId));
  revalidateBoards();
}

// Copies a built-in (or any) theme's current definition into a new,
// ordinary editable theme — the intended path for customizing a built-in
// without touching the shipped preset.
export async function duplicateTheme(themeId: number, name: string) {
  const t = name?.trim();
  if (!t) throw new Error('Theme needs a name.');
  const source = await writingDb.select({ definition: writingThemes.definition }).from(writingThemes).where(eq(writingThemes.id, themeId)).get();
  if (!source) throw new Error('Theme not found.');
  const inserted = await writingDb
    .insert(writingThemes)
    .values({ name: t, definition: source.definition })
    .returning({ id: writingThemes.id })
    .get();
  revalidateBoards();
  return inserted?.id;
}

export async function setBoardTheme(boardId: number, themeId: number | null) {
  await writingDb.update(boards).set({ themeId }).where(eq(boards.id, boardId));
  revalidateBoards();
}

export async function setThemeForAllBoards(projectId: number, themeId: number | null) {
  await writingDb.update(boards).set({ themeId }).where(eq(boards.projectId, projectId));
  revalidateBoards();
}

// Fetch a single card with its labels, images, and links — used when
// navigating to a linked card that may be on a different board.
export async function getCardById(cardId: number) {
  const card = await writingDb.select().from(cards).where(eq(cards.id, cardId)).get();
  if (!card) return null;

  const assignments = await writingDb.select().from(cardLabels).where(eq(cardLabels.cardId, cardId)).all();
  const labelIds = assignments.map((a) => a.labelId);
  const cardLabelRows = labelIds.length
    ? await writingDb.select().from(labels).where(inArray(labels.id, labelIds)).all()
    : [];

  const images = await writingDb
    .select()
    .from(cardImages)
    .where(eq(cardImages.cardId, cardId))
    .orderBy(cardImages.position)
    .all();

  const linkRows = await writingDb
    .select()
    .from(cardLinks)
    .where(or(eq(cardLinks.sourceCardId, cardId), eq(cardLinks.targetCardId, cardId)))
    .all();

  const otherIds = linkRows.map((l) => (l.sourceCardId === cardId ? l.targetCardId : l.sourceCardId));
  const linkedInfoRows = otherIds.length
    ? await writingDb
        .select({ id: cards.id, title: cards.title, content: cards.content, boardTitle: boards.title, cardType: cards.cardType })
        .from(cards)
        .innerJoin(lists, eq(cards.listId, lists.id))
        .innerJoin(groups, eq(lists.groupId, groups.id))
        .innerJoin(boards, eq(groups.boardId, boards.id))
        .where(inArray(cards.id, otherIds))
        .all()
    : [];
  const linkedMap = new Map(linkedInfoRows.map((r) => [r.id, r]));

  const links = linkRows
    .map((l) => {
      const otherId = l.sourceCardId === cardId ? l.targetCardId : l.sourceCardId;
      const info = linkedMap.get(otherId);
      if (!info) return null;
      return { linkId: l.id, cardId: otherId, title: info.title, contentPreview: stripHtml(info.content), boardTitle: info.boardTitle, cardType: info.cardType };
    })
    .filter(Boolean) as import('@/app/writing/[projectId]/[boardId]/types').LinkedCardRef[];

  return { ...card, labels: cardLabelRows, images, links };
}

// ==========================================
// TRELLO IMPORT
// ==========================================
// Bulk-creates a project (or a board within an existing project) plus one
// group, its lists, and their cards from an already-parsed Trello export
// (see src/utils/trelloImport.ts for the parsing/validation step). Everything
// happens in a single transaction with a single revalidate at the end, since
// a board can carry hundreds of cards and we don't want per-card round-trips
// or per-card page invalidations.
export async function importTrelloBoard(input: {
  target: { mode: 'existing'; projectId: number } | { mode: 'new'; title: string };
  boardName: string;
  labels?: { key: string; name: string; color: string }[];
  groups: {
    name: string;
    lists: {
      name: string;
      cards: {
        title: string;
        contentHtml: string;
        labelKeys?: string[];
        comments?: { key: string; text: string; createdAt: string }[];
      }[];
    }[];
  }[];
}): Promise<{ projectId: number; boardId: number }> {
  if (!input.target) throw new Error('No import target specified.');

  const result = await writingDb.transaction(async (tx) => {
    let projectId: number;
    if (input.target.mode === 'new') {
      const title = input.target.title.trim();
      if (!title) throw new Error('New project needs a name.');
      const insertedProject = await tx.insert(writingProjects).values({ title }).returning({ id: writingProjects.id }).get();
      if (!insertedProject) throw new Error('Failed to create project.');
      projectId = insertedProject.id;
    } else {
      projectId = input.target.projectId;
    }

    // Create the label catalog once up front, keyed by the Trello label id so
    // per-card joins below can resolve their new integer labelId.
    const labelIdByKey = new Map<string, number>();
    const inputLabels = input.labels ?? [];
    for (let labelIndex = 0; labelIndex < inputLabels.length; labelIndex++) {
      const label = inputLabels[labelIndex];
      const insertedLabel = await tx
        .insert(labels)
        .values({ projectId, categoryId: null, name: label.name, color: label.color, position: labelIndex + 1 })
        .returning({ id: labels.id })
        .get();
      if (insertedLabel) labelIdByKey.set(label.key, insertedLabel.id);
    }

    const boardPositionRow = await tx
      .select({ m: max(boards.position) })
      .from(boards)
      .where(eq(boards.projectId, projectId))
      .get();
    const boardPosition = (boardPositionRow?.m ?? 0) + 1;

    const insertedBoard = await tx
      .insert(boards)
      .values({ projectId, title: input.boardName, position: boardPosition })
      .returning({ id: boards.id })
      .get();
    if (!insertedBoard) throw new Error('Failed to create board.');
    const boardId = insertedBoard.id;

    for (let groupIndex = 0; groupIndex < input.groups.length; groupIndex++) {
      const group = input.groups[groupIndex];
      const insertedGroup = await tx
        .insert(groups)
        .values({ boardId, title: group.name, position: groupIndex + 1 })
        .returning({ id: groups.id })
        .get();
      if (!insertedGroup) throw new Error('Failed to create group.');
      const groupId = insertedGroup.id;

      for (let listIndex = 0; listIndex < group.lists.length; listIndex++) {
        const list = group.lists[listIndex];
        const insertedList = await tx
          .insert(lists)
          .values({ groupId, title: list.name, position: listIndex + 1 })
          .returning({ id: lists.id })
          .get();
        if (!insertedList) throw new Error('Failed to create list.');
        const listId = insertedList.id;

        for (let cardIndex = 0; cardIndex < list.cards.length; cardIndex++) {
          const card = list.cards[cardIndex];
          const content = card.contentHtml || '';

          const commentRecord: CommentRecord = {};
          for (const comment of card.comments ?? []) {
            commentRecord[comment.key] = { text: comment.text, createdAt: comment.createdAt, anchored: false };
          }

          const insertedCard = await tx
            .insert(cards)
            .values({
              listId,
              title: card.title,
              content: content || null,
              position: cardIndex + 1,
              wordCount: countWords(content),
              comments: serializeComments(commentRecord),
            })
            .returning({ id: cards.id })
            .get();
          if (!insertedCard) throw new Error('Failed to create card.');

          for (const labelKey of card.labelKeys ?? []) {
            const labelId = labelIdByKey.get(labelKey);
            if (labelId == null) continue;
            await tx.insert(cardLabels).values({ cardId: insertedCard.id, labelId }).onConflictDoNothing();
          }
        }
      }
    }

    return { projectId, boardId };
  });

  revalidateGallery();
  revalidatePath(`/writing/${result.projectId}`);
  return result;
}

// Lightweight list of all cards in a project for the link picker.
export async function getProjectCards(projectId: number) {
  return writingDb
    .select({
      id: cards.id,
      title: cards.title,
      boardId: boards.id,
      boardTitle: boards.title,
      listTitle: lists.title,
      cardType: cards.cardType,
    })
    .from(cards)
    .innerJoin(lists, eq(cards.listId, lists.id))
    .innerJoin(groups, eq(lists.groupId, groups.id))
    .innerJoin(boards, eq(groups.boardId, boards.id))
    .where(eq(boards.projectId, projectId))
    .orderBy(boards.position, groups.position, lists.position, cards.position)
    .all();
}
