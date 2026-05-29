// src/app/crafting/projects/[id]/page.tsx
import { db } from '@/db';
import { patterns, projects, images} from '@/db/schema';
import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import ProjectWorkspace from  './_components/ProjectWorkspace'

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectPage({ params }: PageProps) {
  const resolvedParams = await params;
  const projectId = parseInt(resolvedParams.id, 10);
  
  // Fetch the project data
  const project = await db.select().from(projects).where(eq(projects.id, projectId)).get();
  
  if (!project) notFound();

  // Fetch the parent pattern data
  const pattern = await db.select().from(patterns).where(eq(patterns.id, project.patternId)).get();
  const projectImages = await db.select().from(images).where(eq(images.projectId, projectId)).all();

  if (!pattern) notFound();

  return (
    <main>
      <ProjectWorkspace project={project} pattern={pattern} images={projectImages} />
    </main>
  );
}