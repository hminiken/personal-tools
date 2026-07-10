// src/app/writing/[projectId]/export/epub/page.tsx
//
// Project-level epub export page. Loads all boards for the project so the
// user can choose which ones to include (each becomes a "book" in the epub).

import { writingDb } from '@/db/writing';
import { boards, writingProjects } from '@/db/writing/schema';
import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { Stack, Title, Text, Anchor, Divider } from '@mantine/core';
import EpubExportForm from './_components/EpubExportForm';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ board?: string }>;
}

export default async function EpubExportPage({ params, searchParams }: PageProps) {
  const { projectId: pRaw } = await params;
  const { board: boardRaw } = await searchParams;
  const projectId = parseInt(pRaw, 10);
  if (isNaN(projectId)) notFound();

  const project = await writingDb
    .select({ title: writingProjects.title })
    .from(writingProjects)
    .where(eq(writingProjects.id, projectId))
    .get();

  if (!project) notFound();

  const allBoards = await writingDb
    .select({ id: boards.id, title: boards.title })
    .from(boards)
    .where(eq(boards.projectId, projectId))
    .orderBy(boards.position)
    .all();

  const defaultBoardId = boardRaw ? parseInt(boardRaw, 10) : null;

  return (
    <Stack gap="xl" p="xl" style={{ maxWidth: 680, margin: '0 auto' }}>

      <Anchor href={`/writing/${projectId}`} size="sm" c="dimmed">
        ← Back to {project.title}
      </Anchor>

      <div>
        <Text size="xs" tt="uppercase" fw={700} c="dimmed" mb={4}>Export</Text>
        <Title order={2} fw={600}>Export</Title>
        <Text size="sm" c="dimmed" mt="xs">
          Select which boards to include, configure formatting, and download
          as epub or docx. Each board becomes its own titled section.
        </Text>
      </div>

      <Divider />

      <EpubExportForm
        projectId={projectId}
        projectTitle={project.title}
        boards={allBoards}
        defaultBoardId={isNaN(defaultBoardId ?? NaN) ? null : defaultBoardId}
      />

    </Stack>
  );
}
