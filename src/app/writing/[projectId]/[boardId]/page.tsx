// src/app/writing/[projectId]/[boardId]/page.tsx
import { writingDb } from '@/db/writing';
import { writingProjects, boards, groups, lists, cards, cardImages, labels, labelCategories, cardLabels, cardLinks } from '@/db/writing/schema';
import { eq, desc, inArray, or, and, sql } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import BoardView from './_components/BoardView';
import { getWritingSettings, listThemes } from '../../_actions/writing_actions';
import { decodeHtmlEntities } from '@/utils/htmlEntities';
import type { BoardGroup, LabelCatalog } from './types';

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

  // Project-wide label catalog (categories + labels), used by pickers/manager.
  const projectCategories = await writingDb
    .select()
    .from(labelCategories)
    .where(eq(labelCategories.projectId, projectId))
    .orderBy(labelCategories.position)
    .all();

  const projectLabels = await writingDb
    .select()
    .from(labels)
    .where(eq(labels.projectId, projectId))
    .orderBy(labels.position)
    .all();

  // Project-wide word total (sum of every card across every board in this
  // project), for the header display next to the project title.
  const projectWordTotal = await writingDb
    .select({ total: sql<number>`sum(${cards.wordCount})` })
    .from(cards)
    .innerJoin(lists, eq(cards.listId, lists.id))
    .innerJoin(groups, eq(lists.groupId, groups.id))
    .innerJoin(boards, eq(groups.boardId, boards.id))
    // Cards excluded from compile or with word count switched off don't count
    // toward the goal — mirror of countsTowardTotal() in WordCountDisplay.tsx.
    .where(and(eq(boards.projectId, projectId), eq(cards.includeInCompile, true), eq(cards.hideWordCount, false)))
    .get();
  const projectWordCount = Number(projectWordTotal?.total ?? 0);

  const settings = await getWritingSettings();
  const themes = await listThemes();

  const catalog: LabelCatalog = { categories: projectCategories, labels: projectLabels };
  const labelById = new Map(projectLabels.map((l) => [l.id, l]));

  // Which labels are applied to each card on this board.
  const cardIds = boardCards.map((c) => c.id);
  const assignments = cardIds.length
    ? await writingDb.select().from(cardLabels).where(inArray(cardLabels.cardId, cardIds)).all()
    : [];
  const labelsByCard = new Map<number, typeof projectLabels>();
  for (const a of assignments) {
    const lbl = labelById.get(a.labelId);
    if (!lbl) continue;
    const arr = labelsByCard.get(a.cardId) ?? [];
    arr.push(lbl);
    labelsByCard.set(a.cardId, arr);
  }

  // Gallery images attached to each card on this board.
  const galleryImages = cardIds.length
    ? await writingDb
        .select()
        .from(cardImages)
        .where(inArray(cardImages.cardId, cardIds))
        .orderBy(cardImages.position)
        .all()
    : [];
  const imagesByCard = new Map<number, typeof galleryImages>();
  for (const img of galleryImages) {
    const arr = imagesByCard.get(img.cardId) ?? [];
    arr.push(img);
    imagesByCard.set(img.cardId, arr);
  }

  // Card links: load all link rows that involve any card on this board.
  const cardIdSet = new Set(cardIds);
  const linkRows = cardIds.length
    ? await writingDb
        .select()
        .from(cardLinks)
        .where(or(inArray(cardLinks.sourceCardId, cardIds), inArray(cardLinks.targetCardId, cardIds)))
        .all()
    : [];

  // Collect IDs of linked cards that aren't on this board (they're on another board).
  const externalLinkedIds = new Set<number>();
  for (const l of linkRows) {
    if (!cardIdSet.has(l.sourceCardId)) externalLinkedIds.add(l.sourceCardId);
    if (!cardIdSet.has(l.targetCardId)) externalLinkedIds.add(l.targetCardId);
  }

  // Fetch title/board info for external linked cards so we can build previews.
  const externalRows = externalLinkedIds.size
    ? await writingDb
        .select({ id: cards.id, title: cards.title, content: cards.content, color: cards.color, boardTitle: boards.title, cardType: cards.cardType })
        .from(cards)
        .innerJoin(lists, eq(cards.listId, lists.id))
        .innerJoin(groups, eq(lists.groupId, groups.id))
        .innerJoin(boards, eq(groups.boardId, boards.id))
        .where(inArray(cards.id, [...externalLinkedIds]))
        .all()
    : [];

  // Labels for external linked cards (current-board cards already have theirs
  // in labelsByCard above) — feeds the hover preview's color bar + label chips.
  const externalLabelRows = externalLinkedIds.size
    ? await writingDb
        .select({ cardId: cardLabels.cardId, id: labels.id, color: labels.color, position: labels.position, drivesCardColor: labels.drivesCardColor })
        .from(cardLabels)
        .innerJoin(labels, eq(cardLabels.labelId, labels.id))
        .where(inArray(cardLabels.cardId, [...externalLinkedIds]))
        .all()
    : [];
  const externalLabelsByCard = new Map<number, typeof externalLabelRows>();
  for (const row of externalLabelRows) {
    const arr = externalLabelsByCard.get(row.cardId) ?? [];
    arr.push(row);
    externalLabelsByCard.set(row.cardId, arr);
  }

  // Build a unified info map: current-board cards + external linked cards.
  function stripHtml(html: string | null | undefined) {
    if (!html) return '';
    return decodeHtmlEntities(html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()).slice(0, 160);
  }
  type LinkedLabel = { id: number; color: string; position: number; drivesCardColor: boolean };
  const cardInfoMap = new Map<number, { title: string; content: string | null; boardTitle: string; cardType: 'standard' | 'character'; color: string | null; labels: LinkedLabel[] }>();
  for (const c of boardCards) {
    cardInfoMap.set(c.id, {
      title: c.title, content: c.content, boardTitle: activeBoard.title, cardType: c.cardType as 'standard' | 'character',
      color: c.color, labels: labelsByCard.get(c.id) ?? [],
    });
  }
  for (const r of externalRows) {
    cardInfoMap.set(r.id, {
      title: r.title, content: r.content, boardTitle: r.boardTitle, cardType: r.cardType as 'standard' | 'character',
      color: r.color, labels: externalLabelsByCard.get(r.id) ?? [],
    });
  }

  // Build linksByCard (bidirectional: each card gets refs for all its links).
  const linksByCard = new Map<number, { linkId: number; cardId: number; title: string; contentPreview: string; boardTitle: string; cardType: 'standard' | 'character'; color: string | null; labelColors: string[] }[]>();
  const addRef = (forCardId: number, otherId: number, linkId: number) => {
    const info = cardInfoMap.get(otherId);
    if (!info) return;
    const driver = info.labels.filter((lb) => lb.drivesCardColor).sort((a, b) => a.position - b.position || a.id - b.id)[0];
    const arr = linksByCard.get(forCardId) ?? [];
    arr.push({
      linkId, cardId: otherId, title: info.title, contentPreview: stripHtml(info.content), boardTitle: info.boardTitle, cardType: info.cardType,
      color: info.color ?? driver?.color ?? null,
      labelColors: info.labels.slice(0, 3).map((lb) => lb.color),
    });
    linksByCard.set(forCardId, arr);
  };
  for (const l of linkRows) {
    addRef(l.sourceCardId, l.targetCardId, l.id);
    addRef(l.targetCardId, l.sourceCardId, l.id);
  }

  // Nest into the shape the board UI consumes.
  const tree: BoardGroup[] = boardGroups.map((g) => ({
    ...g,
    lists: boardLists
      .filter((l) => l.groupId === g.id)
      .map((l) => ({
        ...l,
        cards: boardCards
          .filter((c) => c.listId === l.id)
          .map((c) => ({ ...c, labels: labelsByCard.get(c.id) ?? [], images: imagesByCard.get(c.id) ?? [], links: linksByCard.get(c.id) ?? [] })),
      })),
  }));

  const backUrl = project.folderId ? `/writing/folder/${project.folderId}` : '/writing';
  return (
    <BoardView
      projectId={projectId}
      projectTitle={project.title}
      projectWordCount={projectWordCount}
      projectWordGoal={project.wordCountGoal}
      backUrl={backUrl}
      boards={projectBoards}
      activeBoardId={boardId}
      initialGroups={tree}
      catalog={catalog}
      themes={themes}
      wcSettings={{
        mode: settings.wordCountDisplayMode,
        defaultCardGoal: settings.defaultCardWordGoal,
        defaultListGoal: settings.defaultListWordGoal,
        defaultGroupGoal: settings.defaultGroupWordGoal,
      }}
    />
  );
}
