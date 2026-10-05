'use client';

import { useState } from 'react';
import { Modal, TextInput, ScrollArea, SimpleGrid, Card, Group, Image, Box, Text, Button } from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';
import { linkYarnToProject } from '../../_actions/project_actions';
import { yarnStash } from '../types';
import type { LinkedYarn } from './LinkedYarnSection';
import { TagBadges } from '@components/TagBadges';
import { PLACEHOLDER_IMAGE } from '@/utils/placeholders';
import { splitTags } from '@/utils/tags';

interface StashBrowserModalProps {
  opened: boolean;
  close: () => void;
  projectId: number;
  availableStash: yarnStash[];
  linkedYarns: LinkedYarn[];
}

// "field:value" search keys -> yarn columns. Singular and plural both work.
const SEARCH_KEYS: Record<string, keyof yarnStash> = {
  weight: 'weights', weights: 'weights',
  color: 'colors', colors: 'colors',
  fiber: 'fibers', fibers: 'fibers',
  brand: 'brand',
};

// Every token must match. "color:blue" checks one column; a plain word
// checks the title, brand and tags.
function matchesSearch(yarn: yarnStash, query: string): boolean {
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  const everything = [yarn.title, yarn.brand, yarn.weights, yarn.fibers, yarn.colors].join(' ').toLowerCase();
  return tokens.every((token) => {
    const [key, value] = token.split(':', 2);
    const column = value !== undefined ? SEARCH_KEYS[key] : undefined;
    if (column) return String(yarn[column] ?? '').toLowerCase().includes(value);
    return everything.includes(token);
  });
}

export function StashBrowserModal({ opened, close, projectId, availableStash, linkedYarns }: StashBrowserModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [linkingId, setLinkingId] = useState<number | null>(null);

  const linkedIds = new Set(linkedYarns.map((y) => y.id));
  const results = availableStash.filter((yarn) => !linkedIds.has(yarn.id) && matchesSearch(yarn, searchQuery));

  // The modal stays open so several yarns can be added in a row.
  const handleLinkYarn = async (yarnId: number) => {
    setLinkingId(yarnId);
    try {
      await linkYarnToProject(projectId, yarnId);
    } catch (error) {
      console.error('Failed to link yarn', error);
      alert('Could not add that yarn. Please try again.');
    } finally {
      setLinkingId(null);
    }
  };

  return (
    <Modal opened={opened} onClose={close} title="Add Yarn from Stash" size="xl" centered>
      <TextInput
        placeholder="Search, or try color:blue / weight:worsted"
        leftSection={<IconSearch size={16} />}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.currentTarget.value)}
        mb="md"
        data-autofocus
      />

      <ScrollArea.Autosize mah="min(400px, 60vh)" type="auto" offsetScrollbars>
        {results.length === 0 ? (
          <Text c="dimmed" ta="center" my="xl">
            {availableStash.length === linkedIds.size ? 'All of your stash is already on this project.' : 'No stash items found.'}
          </Text>
        ) : (
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
            {results.map((yarn) => (
              <Card key={yarn.id} withBorder padding="sm" radius="md">
                <Group wrap="nowrap">
                  <Image
                    src={yarn.coverImage || PLACEHOLDER_IMAGE}
                    fallbackSrc={PLACEHOLDER_IMAGE}
                    h={80} w={80} radius="md" fit="cover" alt={yarn.title}
                    style={{ flexShrink: 0 }}
                  />
                  <Box style={{ flex: 1, minWidth: 0 }}>
                    <Text fw={500} lineClamp={1}>{yarn.title}</Text>
                    <Group gap={4} mt={4}>
                      <TagBadges value={yarn.weights} color="mustard" size="xs" />
                      <TagBadges value={splitTags(yarn.colors).slice(0, 2).join(',')} color="olive" variant="outline" size="xs" />
                    </Group>
                    <Button
                      mt="xs"
                      size="compact-xs"
                      variant="light"
                      onClick={() => handleLinkYarn(yarn.id)}
                      loading={linkingId === yarn.id}
                    >
                      Add to Project
                    </Button>
                  </Box>
                </Group>
              </Card>
            ))}
          </SimpleGrid>
        )}
      </ScrollArea.Autosize>
    </Modal>
  );
}
