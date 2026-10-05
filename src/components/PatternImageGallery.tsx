'use client';

import { startTransition, useState, useEffect } from 'react';
import {
    Accordion, Title, Group, SimpleGrid,
    Image, Box, Modal, Text, ActionIcon, Button, Tooltip, Badge
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconTrash, IconPhotoStar, IconPlus, IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import { UploadModal, type IdFieldName } from './UploadModal';
import { PatternImage } from '@app/crafting/patterns/types';
import { PLACEHOLDER_IMAGE } from '@/utils/placeholders';

interface ImageGalleryProps {
    images: PatternImage[];
    title?: string;
    targetId: number;
    idFieldName: IdFieldName;
    revalidateUrl: string;
    uploadAction: (formData: FormData) => Promise<void>;
    deleteAction: (imageId: number, url: string) => Promise<void>;
    coverImagePath?: string | null;
    setCoverAction?: (id: number, imagePath: string) => Promise<void>;
}

// Overlay buttons on each thumbnail
const OVERLAY_BUTTON_STYLE = { position: 'absolute', zIndex: 10, boxShadow: 'var(--mantine-shadow-xs)' } as const;

// Photo grid for a pattern, project or yarn, with upload, delete, "use as
// cover", and a full-size viewer (arrow keys / buttons to page through).
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
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
    const viewerOpened = selectedIndex !== null;

    const count = images.length;
    const goToPrevious = () => setSelectedIndex((i) => (i === null ? null : (i - 1 + count) % count));
    const goToNext = () => setSelectedIndex((i) => (i === null ? null : (i + 1) % count));

    useEffect(() => {
        if (!viewerOpened) return;
        const step = (delta: number) => setSelectedIndex((i) => (i === null ? null : (i + delta + count) % count));
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'ArrowLeft') step(-1);
            if (event.key === 'ArrowRight') step(1);
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [viewerOpened, count]);

    const handleDelete = (imageId: number) => {
        if (!confirm('Delete this photo?')) return;
        startTransition(async () => {
            await deleteAction(imageId, revalidateUrl);
        });
    };

    return (
        <Box>
            <Accordion mb="lg" defaultValue="photos" variant="separated">
                <Accordion.Item value="photos">
                    {/* The add button sits beside the control rather than inside it
                        (a button can't be nested in the accordion's toggle button). */}
                    <Group wrap="nowrap" gap={0} align="center">
                        <Accordion.Control style={{ flex: 1 }}>
                            <Title order={5}>{title} ({count})</Title>
                        </Accordion.Control>
                        <Button
                            size="xs" variant="light" mr="md"
                            leftSection={<IconPlus size={14} />}
                            onClick={openUpload}
                        >
                            Add photos
                        </Button>
                    </Group>
                    <Accordion.Panel>
                        {count > 0 ? (
                            <SimpleGrid cols={{ base: 2, sm: 3, md: 4, lg: 5 }} spacing="sm">
                                {images.map((img, index) => {
                                    const isCover = coverImagePath === img.path;
                                    return (
                                        <Box key={img.id} style={{ position: 'relative' }}>
                                            <Image
                                                src={img.path}
                                                alt={`${title} ${index + 1}`}
                                                radius="md"
                                                h={120}
                                                fit="cover"
                                                style={{
                                                    cursor: 'pointer',
                                                    outline: isCover ? '2px solid var(--mantine-color-olive-6)' : 'none'
                                                }}
                                                onClick={() => setSelectedIndex(index)}
                                                fallbackSrc={PLACEHOLDER_IMAGE}
                                            />

                                            <Tooltip label="Delete photo" withArrow openDelay={300}>
                                                <ActionIcon
                                                    variant="white" color="rust.7" size="sm" radius="xl"
                                                    aria-label="Delete photo"
                                                    style={{ ...OVERLAY_BUTTON_STYLE, top: 6, right: 6 }}
                                                    onClick={(e) => { e.stopPropagation(); handleDelete(img.id); }}
                                                >
                                                    <IconTrash size={14} />
                                                </ActionIcon>
                                            </Tooltip>

                                            {setCoverAction && isCover && (
                                                <Badge size="xs" color="olive.6" variant="filled" style={{ position: 'absolute', bottom: 6, left: 6, zIndex: 10 }}>
                                                    Cover
                                                </Badge>
                                            )}
                                            {setCoverAction && !isCover && (
                                                <Tooltip label="Use as cover photo" withArrow openDelay={300}>
                                                    <ActionIcon
                                                        variant="white" color="olive.7" size="sm" radius="xl"
                                                        aria-label="Use as cover photo"
                                                        style={{ ...OVERLAY_BUTTON_STYLE, top: 6, left: 6 }}
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
                                    );
                                })}
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

            {/* Full-size viewer */}
            <Modal
                opened={viewerOpened}
                onClose={() => setSelectedIndex(null)}
                withCloseButton={false}
                size="auto"
                centered
                padding={0}
                styles={{ content: { backgroundColor: 'transparent', boxShadow: 'none' } }}
            >
                {selectedIndex !== null && images[selectedIndex] && (
                    <Box style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {count > 1 && (
                            <ActionIcon
                                variant="filled" color="dark" size="xl" radius="xl" aria-label="Previous photo"
                                style={{ position: 'absolute', left: 10, zIndex: 10, opacity: 0.7 }}
                                onClick={goToPrevious}
                            >
                                <IconChevronLeft size={24} />
                            </ActionIcon>
                        )}

                        <Image
                            src={images[selectedIndex].path}
                            alt={`${title} ${selectedIndex + 1}`}
                            style={{ maxHeight: '90vh', maxWidth: '90vw', objectFit: 'contain' }}
                        />

                        {count > 1 && (
                            <ActionIcon
                                variant="filled" color="dark" size="xl" radius="xl" aria-label="Next photo"
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
