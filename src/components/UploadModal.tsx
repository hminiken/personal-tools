import { useEffect, useState } from 'react';
import { Modal, Button, Group, FileInput, Box, Text, Accordion, SimpleGrid, Image, Loader, ScrollArea } from '@mantine/core';
import { IconPhotoPlus } from '@tabler/icons-react';
import { getAllLibraryImages, linkLibraryImageAction } from '@app/crafting/actions/ImageActions';
import { PLACEHOLDER_IMAGE } from '@/utils/placeholders';
import type { PatternImage } from '@app/crafting/patterns/types';

export type IdFieldName = 'patternId' | 'projectId' | 'yarnId';

interface UploadModalProps {
  opened: boolean;
  close: () => void;
  targetId: number;
  idFieldName: IdFieldName;
  uploadAction: (formData: FormData) => Promise<void>;
  revalidateUrl: string;
}

// Add a photo by uploading/pasting a new one, or by reusing one that's
// already in the library.
export function UploadModal({ opened, close, targetId, idFieldName, uploadAction, revalidateUrl }: UploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  // null while loading
  const [libraryImages, setLibraryImages] = useState<PatternImage[] | null>(null);
  const [isLinking, setIsLinking] = useState(false);

  const handleClose = () => {
    setFile(null);
    setLibraryImages(null);
    close();
  };

  // Load the library each time the modal opens. The same file can back
  // several records (projects copy their pattern's photos), so show each once.
  useEffect(() => {
    if (!opened) return;
    getAllLibraryImages()
      .then((data) => {
        const seen = new Set<string>();
        setLibraryImages(data.filter((img) => !seen.has(img.path) && seen.add(img.path)));
      })
      .catch((err) => {
        console.error('Failed to fetch library', err);
        setLibraryImages([]);
      });
  }, [opened]);

  // Ctrl+V anywhere while the modal is open picks up a copied image.
  useEffect(() => {
    if (!opened) return;
    const handlePaste = (event: ClipboardEvent) => {
      for (const item of event.clipboardData?.items ?? []) {
        const pasted = item.type.startsWith('image/') ? item.getAsFile() : null;
        if (pasted) {
          event.preventDefault();
          setFile(new File([pasted], `pasted_photo_${Date.now()}.png`, { type: pasted.type }));
          return;
        }
      }
    };
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [opened]);

  const handleSubmit = async () => {
    if (!file) return;
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append(idFieldName, String(targetId));
      formData.append('file', file);
      await uploadAction(formData);
      handleClose();
    } catch (error) {
      console.error('Upload failed', error);
      alert('Failed to upload image.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleLinkImage = async (imageUrl: string) => {
    setIsLinking(true);
    try {
      await linkLibraryImageAction(idFieldName, imageUrl, targetId, revalidateUrl);
      handleClose();
    } catch (error) {
      console.error('Failed to link image', error);
      alert('Failed to link image.');
    } finally {
      setIsLinking(false);
    }
  };

  return (
    <Modal opened={opened} onClose={handleClose} title="Add Photo" centered size="lg">
      <Box mb="xl">
        <Text size="sm" fw={500} mb="xs">Upload New</Text>
        <FileInput
          placeholder="Click to browse or paste image (Ctrl+V)"
          value={file}
          onChange={setFile}
          accept="image/*"
          clearable
          leftSection={<IconPhotoPlus size={16} />}
          mb="md"
        />

        <Group justify="flex-end">
          <Button variant="default" onClick={handleClose} disabled={isUploading || isLinking}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!file || isLinking} loading={isUploading}>Upload</Button>
        </Group>
      </Box>

      <Accordion variant="separated">
        <Accordion.Item value="library">
          <Accordion.Control>
            <Text size="sm" fw={500}>Browse Existing Library</Text>
          </Accordion.Control>
          <Accordion.Panel>
            {libraryImages === null ? (
              <Group justify="center" p="xl">
                <Loader />
              </Group>
            ) : libraryImages.length > 0 ? (
              <ScrollArea.Autosize mah={300} type="auto" offsetScrollbars>
                <SimpleGrid cols={{ base: 2, sm: 3, md: 4 }} spacing="sm">
                  {libraryImages.map((img) => (
                    <Image
                      key={img.id}
                      src={img.path}
                      alt="Library image"
                      radius="md"
                      h={100}
                      fit="cover"
                      fallbackSrc={PLACEHOLDER_IMAGE}
                      onClick={() => { if (!isLinking) handleLinkImage(img.path); }}
                      style={{ cursor: isLinking ? 'wait' : 'pointer', transition: 'opacity 0.2s', opacity: isLinking ? 0.5 : 1 }}
                    />
                  ))}
                </SimpleGrid>
              </ScrollArea.Autosize>
            ) : (
              <Text c="dimmed" ta="center" py="md">No images found in your library.</Text>
            )}
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>
    </Modal>
  );
}
