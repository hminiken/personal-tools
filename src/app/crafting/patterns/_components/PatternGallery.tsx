'use client';

import { TextInput, Group, Button, Stack } from '@mantine/core';
import { IconExternalLink, IconSparkles } from '@tabler/icons-react';
import ItemGallery from '@/components/ItemGallery';
import { Pattern } from '../types';
import { createNewPattern, deletePattern } from '../_actions/pattern_actions';
import { useDisclosure } from '@mantine/hooks';
import { ImportPatternModal } from '@components/ImportPatternModal';
import { TagBadges, StatusBadge, BadgeRow } from '@components/TagBadges';

export default function PatternGallery({ initialPatterns }: { initialPatterns: Pattern[] }) {
  const [importModalOpened, { open: openImport, close: closeImport }] = useDisclosure(false);
  return (
    <>
    <ItemGallery
      title="Pattern Library"
      items={initialPatterns}
      basePath="/crafting/patterns"
      searchPlaceholder="Search patterns..."
      newItemText="New Pattern"
      createModalTitle="Add a New Pattern"
      // cardDescription="Click to view details and instructions."
      deleteAction={deletePattern}
      extraActions={
        <Button variant="light" color="mustard" leftSection={<IconSparkles size={16} />} onClick={openImport}>
          Smart Import
        </Button>
      }
      renderBadges={(pattern) => (
        <BadgeRow>
          <StatusBadge status={pattern.status} />
          <TagBadges value={pattern.hooks} color="mustard" />
          <TagBadges value={pattern.weights} color="rust" />
        </BadgeRow>
      )}

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
    <ImportPatternModal opened={importModalOpened} close={closeImport} />
    </>
  );
}