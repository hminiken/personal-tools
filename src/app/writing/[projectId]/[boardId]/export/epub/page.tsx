// src/app/writing/[projectId]/[boardId]/export/epub/page.tsx
//
// Interactive epub export settings page. Loads board + project titles for
// default metadata, then renders the client-side EpubExportForm.

import { writingDb } from '@/db/writing';
import { boards, writingProjects } from '@/db/writing/schema';
import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { Stack, Title, Text, Anchor, Divider } from '@mantine/core';
import EpubExportForm from './_components/EpubExportForm';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ projectId: string; boardId: string }>;
}

export default async function EpubExportPage({ params }: PageProps) {
  const { projectId: pRaw, boardId: bRaw } = await params;
  const projectId = parseInt(pRaw, 10);
  const boardId = parseInt(bRaw, 10);
  if (isNaN(projectId) || isNaN(boardId)) notFound();

  const board = await writingDb
    .select({ title: boards.title, projectId: boards.projectId })
    .from(boards)
    .where(eq(boards.id, boardId))
    .get();

  if (!board || board.projectId !== projectId) notFound();

  const project = await writingDb
    .select({ title: writingProjects.title })
    .from(writingProjects)
    .where(eq(writingProjects.id, projectId))
    .get();

  const projectTitle = project?.title ?? 'Project';
  const boardTitle = board.title;

  return (
    <Stack gap="xl" p="xl" style={{ maxWidth: 680, margin: '0 auto' }}>

      {/* Back link */}
      <Anchor href={`/writing/${projectId}/${boardId}`} size="sm" c="dimmed">
        ← Back to {boardTitle}
      </Anchor>

      {/* Header */}
      <div>
        <Text size="xs" tt="uppercase" fw={700} c="dimmed" mb={4}>Export</Text>
        <Title order={2} fw={600}>Export as epub</Title>
        <Text size="sm" c="dimmed" mt="xs">
          Exports all cards marked &ldquo;include in compile&rdquo; from{' '}
          <strong>{boardTitle}</strong> ({projectTitle}).
          Configure the structure and formatting below, then download.
        </Text>
      </div>

      <Divider />

      <EpubExportForm
        projectId={projectId}
        boardId={boardId}
        defaultTitle={boardTitle}
      />

    </Stack>
  );
}
