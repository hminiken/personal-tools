// src/app/writing/page.tsx
import { writingDb } from '@/db/writing';
import { writingProjects } from '@/db/writing/schema';
import { desc } from 'drizzle-orm';
import WritingProjectGallery from './_components/WritingProjectGallery';

export const dynamic = 'force-dynamic';

export default async function WritingPage() {
  const projects = await writingDb
    .select()
    .from(writingProjects)
    .orderBy(desc(writingProjects.createdAt));

  // ItemGallery expects a `coverImagePath` field for the card thumbnail.
  const normalized = projects.map((p) => ({
    ...p,
    coverImagePath: p.coverImage ?? '',
  }));

  return (
    <main>
      <WritingProjectGallery initialProjects={normalized} />
    </main>
  );
}
