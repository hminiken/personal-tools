// Shared loader for one level of the Writing gallery — used by both the
// top-level page (/writing) and folder pages (/writing/folder/[id]).
//
// A "level" is: the folders directly inside `parentFolderId`, the projects
// directly inside it, the breadcrumb trail back to the top, and a flat list of
// every folder (to power the "Move to…" picker). Pass null for the top level.
import { writingDb } from '@/db/writing';
import { writingFolders, writingProjects } from '@/db/writing/schema';
import { eq, isNull, desc, sql } from 'drizzle-orm';

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

  return { folders, projects, allFolders, allProjects, breadcrumbs, childCounts };
}
