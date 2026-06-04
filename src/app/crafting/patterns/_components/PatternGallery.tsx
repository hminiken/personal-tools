'use client';

import { TextInput, Group, Button, Stack, Badge } from '@mantine/core';
import { IconDownload, IconExternalLink } from '@tabler/icons-react';
import ItemGallery from '@/components/ItemGallery';
import { Pattern } from '../types';
import { createNewPattern, deletePattern } from '../_actions/pattern_actions';
import { useDisclosure } from '@mantine/hooks';
import { ImportPatternModal } from '@components/ImportPatternModal';

export default function PatternGallery({ initialPatterns }: { initialPatterns: Pattern[] }) {
  const [importModalOpened, { open: openImport, close: closeImport }] = useDisclosure(false);
  return (
    <>
    <Group justify="flex-end" mb="md">
        <Button 
          leftSection={<IconDownload size={16} />} 
          variant="light" 
          color="olive"
          onClick={openImport}
        >
          Smart Import
        </Button>
      </Group>
    <ItemGallery
      title="Pattern Library"
      items={initialPatterns}
      basePath="/crafting/patterns"
      searchPlaceholder="Search patterns..."
      newItemText="New Pattern"
      createModalTitle="Add a New Pattern"
      // cardDescription="Click to view details and instructions."
      deleteAction={deletePattern}
      renderBadges={(pattern) => (
        <Group gap="xs" mb="md">
          {pattern.hooks && <Badge color="mustard" variant="light">{pattern.hooks}</Badge>}
          {pattern.weights && <Badge color="rust" variant="light">{pattern.weights}</Badge>}
          {pattern.status && <Badge color="olive" variant="light">{pattern.status}</Badge>}
        
        </Group>
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