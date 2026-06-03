'use client';

import { startTransition, useState } from 'react';
import {
    Accordion, Title, Group, Button, SimpleGrid,
    Image, Box, FileInput, Modal, Stack, Text, ActionIcon
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconTrash, IconPhotoStar, IconPlus } from '@tabler/icons-react';
import { UploadModal } from '@app/crafting/patterns/[id]/_components/UploadModal';
import { uploadPatternImage } from '@app/crafting/patterns/_actions/pattern_actions';

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
                        <Group align="center">
                            <Title order={5}>{title} ({images?.length || 0})</Title>

                            <ActionIcon
                                component="div"
                                variant="filled" 
                                color="rust.7"
                                size="sm"
                                onClick={(e) => {
                                    e.preventDefault(); // Prevents default link/button behaviors
                                    e.stopPropagation(); // Stops the accordion from opening/closing when clicked
                                    openUpload();
                                }}
                            >
                                <IconPlus size={14} />
                            </ActionIcon>
                        </Group>
                    </Accordion.Control>
                    <Accordion.Panel>

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
                                                outline: coverImagePath === img.imagePath ? '2px solid var(--mantine-color-olive-6)' : 'none'
                                            }}
                                            onClick={() => {
                                                setSelectedImage(img.imagePath);
                                                openImageViewer();
                                            }}
                                            fallbackSrc="https://placehold.co/120x120?text=Not+Found"
                                        />

                                        {/* 3. Update the Delete Button */}
                                        <ActionIcon
                                            variant="filled" color="red" size="sm"
                                            style={{ position: 'absolute', top: 5, right: 5, zIndex: 10 }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                // Wrap the action so Next.js knows to update the UI
                                                startTransition(async () => {
                                                    await deleteAction(img.id, revalidateUrl);
                                                });
                                            }}
                                        >
                                            <IconTrash size={14} />
                                        </ActionIcon>

                                        {/* 4. Update the Set Cover Button */}
                                        {setCoverAction && (
                                            <ActionIcon
                                                variant="filled" color="blue" size="sm"
                                                style={{ position: 'absolute', top: 5, left: 5, zIndex: 10 }}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    // Wrap the action here too
                                                    startTransition(async () => {
                                                        await setCoverAction(targetId, img.imagePath);
                                                    });
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

            {/* <Modal opened={uploadModalOpened} onClose={closeUpload} title="Upload Photo" centered>
                <form action={async (formData) => {
                    await uploadAction(formData);
                    closeUpload();
                }}>
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
            </Modal> */}

             <UploadModal
                opened={uploadModalOpened} 
                close={closeUpload} 
                targetId={targetId} 
                idFieldName={idFieldName}
                uploadAction={uploadAction}
      />

            {/* FULL SIZE VIEWER */}
            <Modal opened={imageViewerOpened} onClose={closeImageViewer} withCloseButton={false} size="auto" centered padding={0}>
                {selectedImage && (
                    <Image src={selectedImage} alt="Full size" style={{ maxHeight: '90vh', objectFit: 'contain' }} />
                )}
            </Modal>
        </Box>
    );
}