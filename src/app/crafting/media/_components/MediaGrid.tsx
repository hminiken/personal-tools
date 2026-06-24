'use client';

import { useMemo, useState, useTransition } from 'react'; // Added useTransition
import { SimpleGrid, Box, Image, Paper, Badge, ActionIcon, Group, Title } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconTrash, IconX } from '@tabler/icons-react';
import { ConfirmDeleteModal } from '@components/ConfirmDeleteModal';
import { deleteMediaPermanently, unlinkMedia } from '@app/crafting/actions/MediaActions';
import Link from 'next/link';
import { GalleryControls } from '@components/GalleryControls';
import { Filter } from '@components/FilterBuilder';
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

    const [filters, setFilters] = useState<Filter[]>([]);
    const [isGrouped, setIsGrouped] = useState(false);
    const [sortOption, setSortOption] = useState<string | null>('created-desc');

    const addFilter = (f: Filter) => setFilters((prev) => [...prev, f]);
    const removeFilter = (index: number) => setFilters((prev) => prev.filter((_, i) => i !== index));
    const clearFilters = () => setFilters([]);

    // Media items only have a "source" (the pattern/project/yarn they're attached
    // to), so the single "Anything" filter searches across all those titles.
    // Filters stack with AND, matching the behavior of the other grids.
    const sourceTitle = (item: { pattern?: { title?: string | null }; project?: { title?: string | null }; yarn?: { title?: string | null } }) =>
        `${item.pattern?.title ?? ''} ${item.project?.title ?? ''} ${item.yarn?.title ?? ''}`.toLowerCase();

    const mediaFields = [{ value: '__all__', label: 'Source' }];

    const filteredMedia = useMemo(() => {
        const active = filters.filter((f) => f.value.trim());
        if (active.length === 0) return media;
        return media.filter((item) =>
            active.every((f) => sourceTitle(item).includes(f.value.trim().toLowerCase()))
        );
    }, [media, filters]);

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
        <Box mt={'xs'}>
            <GalleryControls
                fields={mediaFields}
                getSuggestions={() => []}
                filters={filters}
                onAddFilter={addFilter}
                onRemoveFilter={removeFilter}
                onClearFilters={clearFilters}
                searchPlaceholder="Search media by project or pattern..."
                isGrouped={isGrouped}
                setIsGrouped={setIsGrouped}
                sortOption={sortOption}
                setSortOption={setSortOption}
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