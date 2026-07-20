// Shared loader for one level of the Writing gallery — used by both the
// top-level page (/writing) and folder pages (/writing/folder/[id]).
//
// A "level" is: the folders directly inside `parentFolderId`, the projects
// directly inside it, the breadcrumb trail back to the top, and a flat list of
// every folder (to power the "Move to…" picker). Pass null for the top level.
import { writingDb } from '@/db/writing';
import { writingFolders, writingProjects, boards, groups, lists, cards } from '@/db/writing/schema';
import { eq, isNull, desc, and, sql } from 'drizzle-orm';

export interface FolderRow {
  id: number;
  parentFolderId: number | null;
  name: string;
  coverImage: string | null;
  color: string | null;
  position: number;
  createdAt: Date;
}

export interface ProjectRow {
  id: number;
  title: string;
  folderId: number | null;
}

export interface Breadcrumb {
  id: number;
  name: string;
}

export async function loadGalleryLevel(parentFolderId: number | null) {
  const folders = await writingDb
    .select()
    .from(writingFolders)
    .where(parentFolderId == null ? isNull(writingFolders.parentFolderId) : eq(writingFolders.parentFolderId, parentFolderId))
    .orderBy(writingFolders.position, writingFolders.name)
    .all();

  const projects = await writingDb
    .select()
    .from(writingProjects)
    .where(parentFolderId == null ? isNull(writingProjects.folderId) : eq(writingProjects.folderId, parentFolderId))
    .orderBy(desc(writingProjects.createdAt))
    .all();

  // Total word count per project (sum of every card under it), for the
  // gallery card's word-count/goal display. One aggregate query for every
  // project at this level rather than N+1 per-project queries.
  const wordTotals = await writingDb
    .select({ projectId: boards.projectId, total: sql<number>`sum(${cards.wordCount})` })
    .from(cards)
    .innerJoin(lists, eq(cards.listId, lists.id))
    .innerJoin(groups, eq(lists.groupId, groups.id))
    .innerJoin(boards, eq(groups.boardId, boards.id))
    // Same exclusions as the project header total (countsTowardTotal): cards
    // out of the compile or with word count off aren't part of the goal.
    .where(and(eq(cards.includeInCompile, true), eq(cards.hideWordCount, false)))
    .groupBy(boards.projectId)
    .all();
  const wordCountByProject = new Map(wordTotals.map((r) => [r.projectId, Number(r.total)]));

  // Every folder, flat — the picker indents these by depth client-side.
  const allFolders = await writingDb
    .select({
      id: writingFolders.id,
      parentFolderId: writingFolders.parentFolderId,
      name: writingFolders.name,
      coverImage: writingFolders.coverImage,
      color: writingFolders.color,
      position: writingFolders.position,
      createdAt: writingFolders.createdAt,
    })
    .from(writingFolders)
    .orderBy(writingFolders.name)
    .all();

  // Direct child count per folder (subfolders + projects), for the card label.
  const childCounts: Record<number, number> = {};
  for (const f of allFolders) {
    if (f.parentFolderId != null) childCounts[f.parentFolderId] = (childCounts[f.parentFolderId] ?? 0) + 1;
  }
  const projCounts = await writingDb
    .select({ folderId: writingProjects.folderId, n: sql<number>`count(*)` })
    .from(writingProjects)
    .where(sql`${writingProjects.folderId} is not null`)
    .groupBy(writingProjects.folderId)
    .all();
  for (const r of projCounts) {
    if (r.folderId != null) childCounts[r.folderId] = (childCounts[r.folderId] ?? 0) + Number(r.n);
  }

  // All projects (lightweight) — used for Move search to find a folder by project name.
  const allProjects: ProjectRow[] = await writingDb
    .select({ id: writingProjects.id, title: writingProjects.title, folderId: writingProjects.folderId })
    .from(writingProjects)
    .all();

  // Breadcrumb trail from the top down to (and including) the current folder.
  const breadcrumbs: Breadcrumb[] = [];
  let cursor: number | null = parentFolderId;
  while (cursor != null) {
    const f = allFolders.find((x) => x.id === cursor);
    if (!f) break;
    breadcrumbs.unshift({ id: f.id, name: f.name });
    cursor = f.parentFolderId;
  }

  const projectsWithWordCount = projects.map((p) => ({ ...p, wordCount: wordCountByProject.get(p.id) ?? 0 }));

  return { folders, projects: projectsWithWordCount, allFolders, allProjects, breadcrumbs, childCounts };
}
