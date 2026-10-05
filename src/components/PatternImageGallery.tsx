'use client';

import { startTransition, useState, useEffect } from 'react';
import {
    Accordion, Title, Group, SimpleGrid,
    Image, Box, Modal, Text, ActionIcon, Button, Tooltip, Badge
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
                    {/* The add button sits beside the control rather than inside it
                        (a button can't be nested in the accordion's toggle button). */}
                    <Group wrap="nowrap" gap={0} align="center">
                        <Accordion.Control style={{ flex: 1 }}>
                            <Title order={5}>{title} ({images?.length || 0})</Title>
                        </Accordion.Control>
                        <Button
                            size="xs" variant="light" color="olive" mr="md"
                            leftSection={<IconPlus size={14} />}
                            onClick={openUpload}
                        >
                            Add photos
                        </Button>
                    </Group>
                    <Accordion.Panel>
                        {images?.length > 0 ? (
                            <SimpleGrid cols={{ base: 2, sm: 3, md: 4, lg: 5 }} spacing="sm">
                                {/* ✨ NOTE: Added 'index' to the map function */}
                                {images.map((img, index) => (
                                    <Box key={img.id} style={{ position: 'relative' }}>
                                        <Image
                                            src={img.path}
                                            alt="Reference"
                                            radius="md"
                                            h={120}
                                            fit="cover"
                                            style={{
                                                cursor: 'pointer',
                                                transition: 'transform 0.2s',
                                                outline: coverImagePath === img.path ? '2px solid var(--mantine-color-olive-6)' : 'none'
                                            }}
                                            onClick={() => {
                                                // ✨ CHANGED: Set index instead of URL
                                                setSelectedIndex(index);
                                                openImageViewer();
                                            }}
                                            fallbackSrc={'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120"><rect width="120" height="120" fill="#e9ecef"/></svg>')}
                                        />

                                        <Tooltip label="Delete photo" withArrow openDelay={300}>
                                            <ActionIcon
                                                variant="white" color="rust.7" size="sm" radius="xl"
                                                aria-label="Delete photo"
                                                style={{ position: 'absolute', top: 6, right: 6, zIndex: 10, boxShadow: 'var(--mantine-shadow-xs)' }}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    // One tap used to delete instantly with no undo.
                                                    if (!confirm('Delete this photo?')) return;
                                                    startTransition(async () => {
                                                        await deleteAction(img.id, revalidateUrl);
                                                    });
                                                }}
                                            >
                                                <IconTrash size={14} />
                                            </ActionIcon>
                                        </Tooltip>

                                        {setCoverAction && coverImagePath === img.path && (
                                            <Badge size="xs" color="olive.6" variant="filled" style={{ position: 'absolute', bottom: 6, left: 6, zIndex: 10 }}>
                                                Cover
                                            </Badge>
                                        )}
                                        {setCoverAction && coverImagePath !== img.path && (
                                            <Tooltip label="Use as cover photo" withArrow openDelay={300}>
                                                <ActionIcon
                                                    variant="white" color="olive.7" size="sm" radius="xl"
                                                    aria-label="Use as cover photo"
                                                    style={{ position: 'absolute', top: 6, left: 6, zIndex: 10, boxShadow: 'var(--mantine-shadow-xs)' }}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        startTransition(async () => {
                                                            await setCoverAction(targetId, img.path);
                                                        });
                                                    }}
                                                >
                                                    <IconPhotoStar size={14} />
                                                </ActionIcon>
                                            </Tooltip>
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
                            src={images[selectedIndex].path}
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