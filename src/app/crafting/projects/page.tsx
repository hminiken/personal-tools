// src/app/crafting/patterns/page.tsx
import { db } from '@/db';
import { projects } from '@/db/schema';
import { desc } from 'drizzle-orm';
import ProjectGallery from '../patterns/_components/ProjectGallery';

export default async function PatternsPage() {
  // Fetch all patterns from the database, ordering by the newest first
  const allProjects = await db.select().from(projects).orderBy(desc(projects.createdAt));

  // Ensure fields that the PatternGallery expects as non-nullable are provided
  const normalizedPatterns = allProjects.map(p => ({
    ...p,
    coverImagePath: p.coverImagePath ?? '',
  }));

  return (
    <main>
      <ProjectGallery initialProjects={normalizedPatterns} />
    </main>
  );
}