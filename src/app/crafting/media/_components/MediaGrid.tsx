'use client';

import { useMemo, useState, useTransition } from 'react'; // Added useTransition
import { SimpleGrid, Box, Image, Paper, Badge, ActionIcon, Group, Title } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconTrash, IconX } from '@tabler/icons-react';
import { ConfirmDeleteModal } from '@components/ConfirmDeleteModal';
import { deleteMediaPermanently, unlinkMedia } from '@app/crafting/actions/MediaActions';
import Link from 'next/link';
import { GalleryControls } from '@components/GalleryControls';
import MediaCard from './MediaCard';

export function MediaGrid({ media }: { media: any[] }) {
    const [opened, { open, close }] = useDisclosure(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [selectedMedia, setSelectedMedia] = useState<{id: number, path: string} | null>(null);
    const [isPending, startTransition] = useTransition(); // Hook for smooth updates

    const handleConfirmDelete = async () => {
        if (!selectedMedia) return;
        setIsDeleting(true);
        try {
            await deleteMediaPermanently(selectedMedia.id, selectedMedia.path);
            close();
        } finally {
            setIsDeleting(false);
            setSelectedMedia(null);
        }
    };

    const [searchQuery, setSearchQuery] = useState('');
    const [isGrouped, setIsGrouped] = useState(false);
    const [sortOption, setSortOption] = useState<string | null>('created-desc');
    const [showSearchHelp, setShowSearchHelp] = useState(false);

    // 2. Add the filter/sort logic (using your existing logic from ItemGallery)
    const filteredMedia = useMemo(() => {
        return media.filter(item => 
            item.pattern?.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.project?.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.yarn?.title.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [media, searchQuery]);

    const groupedMedia = useMemo(() => {
    if (!isGrouped) return { 'All Media': filteredMedia };
    
    const groups: Record<string, any[]> = {
        'Patterns': [],
        'Projects': [],
        'Yarn Stash': [],
        'Orphaned': []
    };

    filteredMedia.forEach(item => {
        if (item.pattern) groups['Patterns'].push(item);
        else if (item.project) groups['Projects'].push(item);
        else if (item.yarn) groups['Yarn Stash'].push(item);
        else groups['Orphaned'].push(item);
    });

    // Remove empty groups
    return Object.fromEntries(Object.entries(groups).filter(([_, items]) => items.length > 0));
}, [filteredMedia, isGrouped]);

    return (
        <Box>
            <GalleryControls 
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                searchPlaceholder="Search media by project or pattern..."
                isGrouped={isGrouped}
                setIsGrouped={setIsGrouped}
                sortOption={sortOption}
                setSortOption={setSortOption}
                setShowSearchHelp={setShowSearchHelp}
                // You can define a simple style or import your universal ones
                universalInputStyles={{}} 
            />
{isGrouped ? (
            // ✨ IF GROUPED: Loop through the groups
            Object.entries(groupedMedia).map(([groupName, items]) => (
                <Box key={groupName} mb="xl">
                    <Title order={3} mb="sm">{groupName} ({items.length})</Title>
                    <SimpleGrid cols={{ base: 2, sm: 2, md: 4 }}>
                        {items.map((item: any) => (
                            <MediaCard 
                                key={item.id} 
                                item={item} 
                                onDelete={() => {
                                    setSelectedMedia({ id: item.id, path: item.path });
                                    open();
                                }} 
                            />
                        ))}
                    </SimpleGrid>
                </Box>
            ))
        ) : (
            // ✨ IF NOT GROUPED: Just show the flat grid
            <SimpleGrid cols={{ base: 2, sm: 2, md: 4 }}>
                {filteredMedia.map((item) => (
                    <MediaCard 
                        key={item.id} 
                        item={item} 
                        onDelete={() => {
                            setSelectedMedia({ id: item.id, path: item.path });
                            open();
                        }} 
                    />
                ))}
            </SimpleGrid>
        )}

        <ConfirmDeleteModal 
            opened={opened}
            close={close}
            onConfirm={handleConfirmDelete}
            itemName="this image"
            isDeleting={isDeleting}
        />
    </Box>
    );
}