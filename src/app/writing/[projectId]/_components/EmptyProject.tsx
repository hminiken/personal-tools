'use client';

import { useState, useTransition } from 'react';
import { Paper, Stack, Title, Text, TextInput, Button, Group } from '@mantine/core';
import { IconLayoutBoard, IconArrowLeft } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createBoard } from '../../_actions/writing_actions';

export default function EmptyProject({
  projectId,
  projectTitle,
}: {
  projectId: number;
  projectTitle: string;
}) {
  const [title, setTitle] = useState('');
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleCreate = () => {
    const t = title.trim() || 'Board';
    startTransition(async () => {
      const newId = await createBoard(projectId, t);
      if (newId) router.push(`/writing/${projectId}/${newId}`);
    });
  };

  return (
    <Paper p="xl" maw={520} mx="auto" mt="xl">
      <Stack align="center" gap="md">
        <Button
          component={Link}
          href="/writing"
          variant="subtle"
          color="gray"
          leftSection={<IconArrowLeft size={16} />}
          style={{ alignSelf: 'flex-start' }}
        >
          All projects
        </Button>
        <IconLayoutBoard size={48} stroke={1.5} color="var(--mantine-color-olive-6)" />
        <Title order={3} ta="center">{projectTitle}</Title>
        <Text c="dimmed" ta="center">
          No boards yet. Create your first board to start organizing groups, lists, and cards.
        </Text>
        <TextInput
          w="100%"
          placeholder="Board name (e.g., Manuscript, Outline, Research)"
          value={title}
          onChange={(e) => setTitle(e.currentTarget.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          data-autofocus
        />
        <Group justify="flex-end" w="100%">
          <Button onClick={handleCreate} loading={isPending}>Create Board</Button>
        </Group>
      </Stack>
    </Paper>
  );
}
