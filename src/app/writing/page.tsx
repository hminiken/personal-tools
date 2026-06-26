// src/app/writing/page.tsx
import WritingGalleryView from './_components/WritingGalleryView';
import { loadGalleryLevel } from './_lib/loadGalleryLevel';
import { SetPageTitleSuffix } from '@/components/PageTitleContext';

export const dynamic = 'force-dynamic';

export default async function WritingPage() {
  const { folders, projects, allFolders, allProjects, breadcrumbs, childCounts } = await loadGalleryLevel(null);

  // ItemGallery expects a `coverImagePath` field for the card thumbnail.
  const normalized = projects.map((p) => ({ ...p, coverImagePath: p.coverImage ?? '' }));

  return (
    <main>
      <SetPageTitleSuffix value={null} />
      <WritingGalleryView
        folders={folders}
        projects={normalized}
        allFolders={allFolders}
        allProjects={allProjects}
        breadcrumbs={breadcrumbs}
        childCounts={childCounts}
        currentFolderId={null}
      />
    </main>
  );
}
