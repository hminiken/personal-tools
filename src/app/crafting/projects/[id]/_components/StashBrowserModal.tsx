'use client';

import { useState } from 'react';
import { Modal, TextInput, ScrollArea, SimpleGrid, Card, Group, Image, Box, Text, Badge, Button } from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';
import { linkYarnToProject } from '../../_actions/project_actions';
import { projectYarns, yarnStash } from '../types';

interface StashBrowserModalProps {
  opened: boolean;
  close: () => void;
  projectId: number;
  availableStash: yarnStash[];
  linkedYarns: projectYarns[];
}

export function StashBrowserModal({ 
  opened, 
  close, 
  projectId, 
  availableStash, 
  linkedYarns 
}: StashBrowserModalProps) {
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isLinking, setIsLinking] = useState<number | null>(null); // Track which specific button is loading

  // 1. Filter out yarn that is already linked
  const unlinkedStash = availableStash.filter(
    (stashItem) => !linkedYarns.some((linked) => linked.yarnId === stashItem.id)
  );

  // 2. Apply the advanced search query
  const filteredStash = unlinkedStash.filter((item) => {
    if (!searchQuery.trim()) return true;
    const tokens = searchQuery.toLowerCase().split(/\s+/);
    
    return tokens.every((token) => {
      if (token.includes(':')) {
        const [key, value] = token.split(':', 2);
        const itemValue = item[key]; 
        if (itemValue && typeof itemValue === 'string') {
          return itemValue.toLowerCase().includes(value);
        }
        return false; 
      }
      return item.title.toLowerCase().includes(token);
    });
  });

  // 3. Handle the server action
  const handleLinkYarn = async (yarnId: number) => {
    setIsLinking(yarnId);
    try {
      await linkYarnToProject(projectId, yarnId);
      // We don't close the modal so you can keep shopping!
    } catch (error) {
      console.error("Failed to link yarn", error);
    } finally {
      setIsLinking(null);
    }
  };

  return (
    <Modal 
      opened={opened} 
      onClose={close} 
      title="Add Yarn from Stash" 
      size="xl" 
      centered
    >
      <TextInput
        placeholder="Search 'colors:blue' or 'weight:worsted'"
        leftSection={<IconSearch size={16} />}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.currentTarget.value)}
        mb="md"
        data-autofocus
      />

      <ScrollArea h={400} type="always" offsetScrollbars>
        {filteredStash.length === 0 ? (
          <Text c="dimmed" ta="center" mt="xl">No stash items found.</Text>
        ) : (
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
            {filteredStash.map((yarn) => (
              <Card key={yarn.id} withBorder padding="sm" radius="md">
                <Group wrap="nowrap">
                  <Image 
                    src={yarn.coverImagePath || 'https://placehold.co/100x100?text=No+Photo'} 
                    h={80} w={80} radius="md" fit="cover" alt={yarn.title}
                  />
                  <Box style={{ flex: 1 }}>
                    <Text fw={500} lineClamp={1}>{yarn.title}</Text>
                    <Group gap={4} mt={4}>
                      {yarn.color_tags?.split(',').slice(0, 2).map((color: string) => (
                        color.trim() && <Badge key={color} size="xs" color="teal" variant="dot">{color}</Badge>
                      ))}
                    </Group>
                    <Button 
                      mt="xs" 
                      size="compact-xs" 
                      variant="light" 
                    //   fullWidth 
                      onClick={() => handleLinkYarn(yarn.id)}
                      loading={isLinking === yarn.id}
                    >
                      Add to Project
                    </Button>
                  </Box>
                </Group>
              </Card>
            ))}
          </SimpleGrid>
        )}
      </ScrollArea>
    </Modal>
  );
}