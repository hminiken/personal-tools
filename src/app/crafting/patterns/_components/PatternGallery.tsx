'use client';

import { TextInput, Group, Button, Stack, Badge } from '@mantine/core';
import { IconExternalLink } from '@tabler/icons-react';
import ItemGallery from '@/components/ItemGallery';
import { Pattern } from '../types';
import { createNewPattern } from '../_actions/actions';
import { deletePattern } from '../[id]/_actions/actions';

export default function PatternGallery({ initialPatterns }: { initialPatterns: Pattern[] }) {
  return (
    <ItemGallery
      title="Pattern Library"
      items={initialPatterns}
      basePath="/crafting/patterns"
      searchPlaceholder="Search patterns..."
      newItemText="New Pattern"
      createModalTitle="Add a New Pattern"
      // cardDescription="Click to view details and instructions."
      deleteAction={deletePattern}
      // 1. Inject the Pattern-specific badges
      renderBadges={(pattern) => (
        <Group gap="xs" mb="md">
          {pattern.hookSizes && <Badge color="mustard" variant="light">{pattern.hookSizes}</Badge>}
          {pattern.yarnWeights && <Badge color="rust" variant="light">{pattern.yarnWeights}</Badge>}
          {pattern.status && <Badge color="olive" variant="light">{pattern.status}</Badge>}
        
        </Group>
      )}

      // 2. Inject the Pattern-specific creation form
      renderCreateForm={(closeModal) => (
        <form action={createNewPattern}>
          <Stack>
            <TextInput 
              label="Pattern Name" name="title" 
              placeholder="e.g., Hexagon Cardigan" required 
            />
            <TextInput 
              label="Source Link (Optional)" name="sourceUrl" 
              placeholder="https://etsy.com/..." 
              leftSection={<IconExternalLink size={16} />}
            />
            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={closeModal}>Cancel</Button>
              <Button type="submit">Create Blank Pattern</Button>
            </Group>
          </Stack>
        </form>
      )}
    />
  );
}