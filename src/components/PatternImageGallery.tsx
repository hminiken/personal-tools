'use client';

import { useState } from 'react';
import { 
  Accordion, Title, Group, Button, SimpleGrid, 
  Image, Box, FileInput, Modal, Stack, Text, ActionIcon 
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconTrash, IconPhotoStar } from '@tabler/icons-react';

// Define the flexible props this component accepts
interface ImageGalleryProps {
  images: any[];
  title?: string;
  targetId: number;
  idFieldName: string; // Will be 'patternId' or 'projectId'
  revalidateUrl: string; // Where Next.js should refresh after deleting
  
  // Actions
  uploadAction: (formData: FormData) => Promise<void>;
  deleteAction: (imageId: number, url: string) => Promise<void>;
  
  // Optional Cover Image logic (Projects might not use this!)
  coverImagePath?: string | null;
  setCoverAction?: (id: number, imagePath: string) => Promise<void>;
}

export default function ImageGallery({
  images,
  title = "Reference Photos",
  targetId,
  idFieldName,
  revalidateUrl,
  uploadAction,
  deleteAction,
  coverImagePath,
  setCoverAction
}: ImageGalleryProps) {

  const [uploadModalOpened, { open: openUpload, close: closeUpload }] = useDisclosure(false);
  const [imageViewerOpened, { open: openImageViewer, close: closeImageViewer }] = useDisclosure(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  return (
    <Box>
      <Accordion mb="lg" defaultValue="photos" variant="separated">
        <Accordion.Item value="photos">
          <Accordion.Control>
            <Title order={5}>{title} ({images?.length || 0})</Title>
          </Accordion.Control>
          <Accordion.Panel>
            <Group mb="md">
              <Button size="sm" variant="light" onClick={openUpload}>
                Add Photo
              </Button>
            </Group>

            {images?.length > 0 ? (
              <SimpleGrid cols={{ base: 2, sm: 3, md: 4, lg: 5 }} spacing="sm">
                {images.map((img) => (
                  <Box key={img.id} style={{ position: 'relative' }}>
                    <Image 
                      src={img.imagePath} 
                      alt="Reference"
                      radius="md"
                      h={120} 
                      fit="cover"
                      style={{ 
                        cursor: 'pointer', 
                        transition: 'transform 0.2s',
                        outline: coverImagePath === img.imagePath ? '3px solid var(--mantine-color-blue-filled)' : 'none'
                      }}
                      onClick={() => {
                        setSelectedImage(img.imagePath);
                        openImageViewer();
                      }}
                      fallbackSrc="https://placehold.co/120x120?text=Not+Found"
                    />

                    {/* Delete Button */}
                    <ActionIcon 
                      variant="filled" color="red" size="sm"
                      style={{ position: 'absolute', top: 5, right: 5, zIndex: 10 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteAction(img.id, revalidateUrl);
                      }}
                    >
                      <IconTrash size={14} />
                    </ActionIcon>

                    {/* Set Cover Button (Only renders if the setCoverAction was provided) */}
                    {setCoverAction && (
                      <ActionIcon 
                        variant="filled" color="blue" size="sm"
                        style={{ position: 'absolute', top: 5, left: 5, zIndex: 10 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setCoverAction(targetId, img.imagePath);
                        }}
                      >
                        <IconPhotoStar size={14} />
                      </ActionIcon>
                    )}
                  </Box>
                ))}
              </SimpleGrid>
            ) : (
              <Text c="dimmed" size="sm">No photos uploaded yet.</Text>
            )}
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>

      {/* UPLOAD MODAL */}
      <Modal opened={uploadModalOpened} onClose={closeUpload} title="Upload Photo" centered>
        <form action={async (formData) => {
          await uploadAction(formData);
          closeUpload();
        }}>
          {/* Dynamically uses "patternId" or "projectId" depending on where it is rendered */}
          <input type="hidden" name={idFieldName} value={targetId} />
          <Stack>
            <FileInput 
              label="Select Image" name="image" placeholder="Click to browse" 
              accept="image/png,image/jpeg,image/webp" required
            />
            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={closeUpload}>Cancel</Button>
              <Button type="submit">Upload</Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* FULL SIZE VIEWER */}
      <Modal opened={imageViewerOpened} onClose={closeImageViewer} withCloseButton={false} size="auto" centered padding={0}>
        {selectedImage && (
          <Image src={selectedImage} alt="Full size" style={{ maxHeight: '90vh', objectFit: 'contain' }} />
        )}
      </Modal>
    </Box>
  );
}