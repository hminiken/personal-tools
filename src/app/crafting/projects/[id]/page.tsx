// src/app/crafting/projects/[id]/page.tsx
import { db } from '@/db';
import { patterns, projects, images, projectYarns, yarns } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import ProjectWorkspace from './_components/ProjectWorkspace';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectPage({ params }: PageProps) {
  const projectId = parseInt((await params).id, 10);
  if (Number.isNaN(projectId)) notFound();

  const project = await db.select().from(projects).where(eq(projects.id, projectId)).get();
  if (!project) notFound();

  const pattern = await db.select().from(patterns).where(eq(patterns.id, project.patternId)).get();
  if (!pattern) notFound();

  const projectImages = await db.select().from(images).where(eq(images.projectId, projectId)).all();

  // Yarns linked to this project
  const linkedYarns = await db
    .select({
      id: yarns.id,
      title: yarns.title,
      brand: yarns.brand,
      weights: yarns.weights,
      fibers: yarns.fibers,
      colors: yarns.colors,
      coverImage: yarns.coverImage,
    })
    .from(projectYarns)
    .innerJoin(yarns, eq(projectYarns.yarnId, yarns.id))
    .where(eq(projectYarns.projectId, projectId));

  // The whole stash, for the "Browse Stash" picker
  const entireStash = await db.select().from(yarns);

  return (
    <main>
      <ProjectWorkspace project={project} pattern={pattern} images={projectImages} linkedYarns={linkedYarns} availableStash={entireStash} />
    </main>
  );
}
