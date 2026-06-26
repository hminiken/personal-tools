'use client';

import { useState } from 'react';
import {
  Modal, TextInput, Button, Group, SimpleGrid, Image, Box, Text, Loader, Center, ScrollArea,
} from '@mantine/core';
import { IconSearch, IconPhotoOff } from '@tabler/icons-react';
import { searchUnsplash, trackUnsplashDownload, type UnsplashPhoto } from '@app/writing/_actions/unsplash_actions';

// Reusable Unsplash search-and-pick modal. The caller decides what to do with
// the chosen photo (set it as a board or group background, etc.). We trigger
// Unsplash's download endpoint on select, per their API guidelines.
export default function UnsplashPicker({
  opened,
  onClose,
  onSelect,
}: {
  opened: boolean;
  onClose: () => void;
  onSelect: (photo: UnsplashPhoto) => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UnsplashPhoto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const runSearch = async () => {
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setError(null);
    setSearched(true);
    try {
      const photos = await searchUnsplash(q);
      setResults(photos);
    } catch (e: any) {
      setError(e?.message ?? 'Search failed.');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const pick = (photo: UnsplashPhoto) => {
    // Fire-and-forget download tracking; don't block the selection on it.
    trackUnsplashDownload(photo.downloadLocation);
    onSelect(photo);
    onClose();
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Choose a background from Unsplash" size="xl" centered>
      <Group gap="xs" mb="md" wrap="nowrap">
        <TextInput
          flex={1}
          placeholder="Search Unsplash (e.g. forest, library, mountains)"
          value={query}
          onChange={(e) => setQuery(e.currentTarget.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') runSearch(); }}
          leftSection={<IconSearch size={16} />}
          autoFocus
        />
        <Button color="olive.7" onClick={runSearch} loading={loading}>Search</Button>
      </Group>

      {error && (
        <Text c="rust.7" size="sm" mb="sm">{error}</Text>
      )}

      {loading ? (
        <Center py="xl"><Loader color="olive.7" /></Center>
      ) : results.length > 0 ? (
        <ScrollArea h={420} type="always" offsetScrollbars>
          <SimpleGrid cols={{ base: 2, sm: 3, md: 4 }} spacing="sm">
            {results.map((photo) => (
              <Box
                key={photo.id}
                style={{ position: 'relative', cursor: 'pointer' }}
                onClick={() => pick(photo)}
              >
                <Image
                  src={photo.thumbUrl}
                  alt={`Photo by ${photo.credit.name}`}
                  radius="md"
                  h={120}
                  fit="cover"
                  fallbackSrc="https://placehold.co/200x120?text=Error"
                />
                <Text size="10px" c="dimmed" mt={2} lineClamp={1}>
                  {photo.credit.name}
                </Text>
              </Box>
            ))}
          </SimpleGrid>
        </ScrollArea>
      ) : searched ? (
        <Center py="xl">
          <Group gap="xs" c="dimmed">
            <IconPhotoOff size={18} />
            <Text size="sm">No photos found. Try another search.</Text>
          </Group>
        </Center>
      ) : (
        <Center py="xl">
          <Text size="sm" c="dimmed">Search Unsplash to pick a background image.</Text>
        </Center>
      )}
    </Modal>
  );
}
