// src/app/writing/[projectId]/page.tsx
import { writingDb } from '@/db/writing';
import { writingProjects, boards } from '@/db/writing/schema';
import { eq, desc } from 'drizzle-orm';
import { notFound, redirect } from 'next/navigation';
import EmptyProject from './_components/EmptyProject';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default async function WritingProjectPage({ params }: PageProps) {
  const { projectId: projectIdRaw } = await params;
  const projectId = parseInt(projectIdRaw, 10);
  if (isNaN(projectId)) notFound();

  const project = await writingDb
    .select()
    .from(writingProjects)
    .where(eq(writingProjects.id, projectId))
    .get();
  if (!project) notFound();

  const projectBoards = await writingDb
    .select()
    .from(boards)
    .where(eq(boards.projectId, projectId))
    .orderBy(boards.position, desc(boards.createdAt))
    .all();

  // Jump straight to the first board if one exists.
  if (projectBoards.length > 0) {
    redirect(`/writing/${projectId}/${projectBoards[0].id}`);
  }

  return <EmptyProject projectId={projectId} projectTitle={project.title} />;
}
