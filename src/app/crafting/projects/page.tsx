// src/app/crafting/projects/page.tsx
import { db } from '@/db';
import { projects } from '@/db/schema';
import { desc } from 'drizzle-orm';
import ProjectGallery from './_components/ProjectGallery';

export const dynamic = 'force-dynamic';

export default async function ProjectsPage() {
  // Newest first
  const allProjects = await db.select().from(projects).orderBy(desc(projects.createdAt));

  return (
    <main>
      <ProjectGallery initialProjects={allProjects} />
    </main>
  );
}
