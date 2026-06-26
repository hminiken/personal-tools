// src/app/writing/folder/[folderId]/page.tsx
//
// A folder page: the same gallery view, scoped to one folder's contents.
import { notFound } from 'next/navigation';
import { writingDb } from '@/db/writing';
import { writingFolders } from '@/db/writing/schema';
import { eq } from 'drizzle-orm';
import WritingGalleryView from '../../_components/WritingGalleryView';
import { loadGalleryLevel } from '../../_lib/loadGalleryLevel';
import { SetPageTitleSuffix } from '@/components/PageTitleContext';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ folderId: string }>;
}

export default async function WritingFolderPage({ params }: PageProps) {
  const { folderId: folderIdRaw } = await params;
  const folderId = parseInt(folderIdRaw, 10);
  if (isNaN(folderId)) notFound();

  const folder = await writingDb.select().from(writingFolders).where(eq(writingFolders.id, folderId)).get();
  if (!folder) notFound();

  const { folders, projects, allFolders, allProjects, breadcrumbs, childCounts } = await loadGalleryLevel(folderId);

  const normalized = projects.map((p) => ({ ...p, coverImagePath: p.coverImage ?? '' }));

  return (
    <main>
      <SetPageTitleSuffix value={folder.name} />
      <WritingGalleryView
        folders={folders}
        projects={normalized}
        allFolders={allFolders}
        allProjects={allProjects}
        breadcrumbs={breadcrumbs}
        childCounts={childCounts}
        currentFolderId={folderId}
      />
    </main>
  );
}
