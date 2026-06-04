'use client';

import { startTransition, useState, useEffect } from 'react';
import {
    Accordion, Title, Group, SimpleGrid,
    Image, Box, Modal, Text, ActionIcon
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconTrash, IconPhotoStar, IconPlus, IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import { UploadModal } from './UploadModal';
import { PatternImage } from '@app/crafting/patterns/types';

interface ImageGalleryProps {
    images: PatternImage[];
    title?: string;
    targetId: number;
    idFieldName: string; 
    revalidateUrl: string;
    uploadAction: (formData: FormData) => Promise<void>;
    deleteAction: (imageId: number, url: string) => Promise<void>;
    libraryImages?: PatternImage[];
    linkLibraryImageAction?: (imageUrl: string, targetId: number) => Promise<void>;
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
    libraryImages = [],
    linkLibraryImageAction,
    coverImagePath,
    setCoverAction
}: ImageGalleryProps) {

    const [uploadModalOpened, { open: openUpload, close: closeUpload }] = useDisclosure(false);
    const [imageViewerOpened, { open: openImageViewer, close: closeImageViewer }] = useDisclosure(false);
    
    // ✨ CHANGED: Track the index instead of the URL
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

    const [libraryModalOpened, { open: openLibrary, close: closeLibrary }] = useDisclosure(false);
    const [isLinking, setIsLinking] = useState(false);

    const handleLinkImage = async (imageUrl: string) => {
        if (!linkLibraryImageAction) return;
        setIsLinking(true);
        try {
            await linkLibraryImageAction(imageUrl, targetId);
            closeLibrary();
        } catch (error) {
            console.error("Failed to link image", error);
        } finally {
            setIsLinking(false);
        }
    }

    // ✨ NEW: Navigation handlers
    const goToPrevious = () => {
        setSelectedIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : images.length - 1));
    };

    const goToNext = () => {
        setSelectedIndex((prev) => (prev !== null && prev < images.length - 1 ? prev + 1 : 0));
    };

    // ✨ NEW: Keyboard listener for arrow keys
    useEffect(() => {
        if (!imageViewerOpened) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'ArrowLeft') goToPrevious();
            if (event.key === 'ArrowRight') goToNext();
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [imageViewerOpened, images.length]); // Re-bind if modal opens or image count changes

    return (
        <Box>
            <Accordion mb="lg" defaultValue="photos" variant="separated">
                <Accordion.Item value="photos">
                    <Accordion.Control>
                        <Group align="center">
                            <Title order={5}>{title} ({images?.length || 0})</Title>
                            <ActionIcon
                                component="div" variant="filled" color="rust.7" size="sm"
                                onClick={(e) => {
                                    e.preventDefault(); 
                                    e.stopPropagation(); 
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
                                {/* ✨ NOTE: Added 'index' to the map function */}
                                {images.map((img, index) => (
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
                                                // ✨ CHANGED: Set index instead of URL
                                                setSelectedIndex(index);
                                                openImageViewer();
                                            }}
                                            fallbackSrc="https://placehold.co/120x120?text=Not+Found"
                                        />

                                        <ActionIcon
                                            variant="filled" color="red" size="sm"
                                            style={{ position: 'absolute', top: 5, right: 5, zIndex: 10 }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                startTransition(async () => {
                                                    await deleteAction(img.id, revalidateUrl);
                                                });
                                            }}
                                        >
                                            <IconTrash size={14} />
                                        </ActionIcon>

                                        {setCoverAction && (
                                            <ActionIcon
                                                variant="filled" color="blue" size="sm"
                                                style={{ position: 'absolute', top: 5, left: 5, zIndex: 10 }}
                                                onClick={(e) => {
                                                    e.stopPropagation();
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

            <UploadModal
                opened={uploadModalOpened}
                close={closeUpload}
                targetId={targetId}
                idFieldName={idFieldName}
                uploadAction={uploadAction}
                revalidateUrl={revalidateUrl}
            />

            {/* ✨ UPDATED: FULL SIZE VIEWER WITH CONTROLS */}
            <Modal 
                opened={imageViewerOpened} 
                onClose={closeImageViewer} 
                withCloseButton={false} 
                size="auto" 
                centered 
                padding={0}
                styles={{ content: { backgroundColor: 'transparent', boxShadow: 'none' } }} // Removes the white box behind the image
            >
                {selectedIndex !== null && images[selectedIndex] && (
                    <Box style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        
                        {/* Only show arrows if there is more than 1 image */}
                        {images.length > 1 && (
                            <ActionIcon 
                                variant="filled" color="dark" size="xl" radius="xl"
                                style={{ position: 'absolute', left: 10, zIndex: 10, opacity: 0.7 }}
                                onClick={goToPrevious}
                            >
                                <IconChevronLeft size={24} />
                            </ActionIcon>
                        )}

                        <Image 
                            src={images[selectedIndex].imagePath} 
                            alt="Full size" 
                            style={{ maxHeight: '90vh', maxWidth: '90vw', objectFit: 'contain' }} 
                        />

                        {images.length > 1 && (
                            <ActionIcon 
                                variant="filled" color="dark" size="xl" radius="xl"
                                style={{ position: 'absolute', right: 10, zIndex: 10, opacity: 0.7 }}
                                onClick={goToNext}
                            >
                                <IconChevronRight size={24} />
                            </ActionIcon>
                        )}
                    </Box>
                )}
            </Modal>
        </Box>
    );
}