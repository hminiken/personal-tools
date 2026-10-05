'use client';

import { ActionIcon, Box, Button, Card, Group, Image, SimpleGrid, Text, Title, Tooltip } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconPlus, IconUnlink } from '@tabler/icons-react';
import Link from 'next/link';
import { unlinkYarnFromProject } from '../../_actions/project_actions';
import { yarnStash } from '../types';
import { StashBrowserModal } from './StashBrowserModal';
import { TagBadges } from '@components/TagBadges';
import { PLACEHOLDER_IMAGE } from '@/utils/placeholders';

export type LinkedYarn = Pick<yarnStash, 'id' | 'title' | 'brand' | 'weights' | 'fibers' | 'colors' | 'coverImage'>;

// "Project Yarn": the stash yarns linked to this project, plus the stash browser.
export function LinkedYarnSection({
  projectId,
  linkedYarns,
  availableStash,
}: {
  projectId: number;
  linkedYarns: LinkedYarn[];
  availableStash: yarnStash[];
}) {
  const [stashOpened, { open: openStash, close: closeStash }] = useDisclosure(false);

  const handleUnlink = async (e: React.MouseEvent, yarnId: number) => {
    e.preventDefault(); // the card is a link
    if (confirm('Remove this yarn from the project?')) {
      await unlinkYarnFromProject(projectId, yarnId);
    }
  };

  return (
    <Box mb="xl" mt="xl">
      <Group justify="space-between" mb="md">
        <Title order={4}>Project Yarn</Title>
        <Button variant="light" size="sm" leftSection={<IconPlus size={16} />} onClick={openStash}>
          Browse Stash
        </Button>
      </Group>

      {linkedYarns.length === 0 ? (
        <Text c="dimmed" size="sm">No yarn linked yet. Browse your stash to add some.</Text>
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="sm">
          {linkedYarns.map((yarn) => (
            <Card
              key={yarn.id}
              withBorder
              shadow="sm"
              radius="md"
              component={Link}
              href={`/crafting/stash/${yarn.id}`}
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <Group wrap="nowrap" align="flex-start">
                <Image
                  src={yarn.coverImage || PLACEHOLDER_IMAGE}
                  h={60}
                  w={60}
                  radius="md"
                  fit="cover"
                  alt={yarn.title}
                  fallbackSrc={PLACEHOLDER_IMAGE}
                  style={{ flexShrink: 0 }}
                />
                <Box style={{ flex: 1, minWidth: 0 }}>
                  <Text fw={500} lineClamp={1}>{yarn.title}</Text>
                  <Text size="xs" c="dimmed" mb={6}>{yarn.brand || 'Unknown brand'}</Text>
                  <Group gap={4}>
                    <TagBadges value={yarn.weights} color="mustard" size="xs" />
                    <TagBadges value={yarn.fibers} color="rust" size="xs" />
                    <TagBadges value={yarn.colors} color="olive" variant="outline" size="xs" />
                  </Group>
                </Box>
                <Tooltip label="Remove from project" withArrow>
                  <ActionIcon variant="subtle" color="rust.7" aria-label="Remove from project" onClick={(e) => handleUnlink(e, yarn.id)}>
                    <IconUnlink size={16} />
                  </ActionIcon>
                </Tooltip>
              </Group>
            </Card>
          ))}
        </SimpleGrid>
      )}

      <StashBrowserModal
        opened={stashOpened}
        close={closeStash}
        projectId={projectId}
        availableStash={availableStash}
        linkedYarns={linkedYarns}
      />
    </Box>
  );
}
