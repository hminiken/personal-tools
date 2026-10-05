'use client';

import { useMemo, useState } from 'react';
import { SimpleGrid, Box, Title, Text } from '@mantine/core';
import { ConfirmDeleteModal } from '@components/ConfirmDeleteModal';
import { deleteMediaPermanently } from '@app/crafting/actions/MediaActions';
import { GalleryControls } from '@components/GalleryControls';
import { Filter } from '@components/FilterBuilder';
import type { PatternImage, Pattern, Project, yarnStash } from '@app/crafting/projects/[id]/types';
import MediaCard from './MediaCard';

export type MediaItem = PatternImage & {
    pattern: Pattern | null;
    project: Project | null;
    yarn: yarnStash | null;
};

// Media items only have a "source" (the pattern/project/yarn they're attached
// to), so the single filter searches across those titles.
const MEDIA_FIELDS = [{ value: '__all__', label: 'Source' }];
const GROUP_ORDER = ['Patterns', 'Projects', 'Yarn Stash', 'Orphaned'];

const sourceTitle = (item: MediaItem) =>
    [item.pattern?.title, item.project?.title, item.yarn?.title].filter(Boolean).join(' ');

function groupName(item: MediaItem) {
    if (item.pattern) return 'Patterns';
    if (item.project) return 'Projects';
    if (item.yarn) return 'Yarn Stash';
    return 'Orphaned';
}

function sortMedia(items: MediaItem[], sortOption: string | null) {
    const sorted = [...items];
    if (sortOption === 'title-asc') return sorted.sort((a, b) => sourceTitle(a).localeCompare(sourceTitle(b)));
    if (sortOption === 'title-desc') return sorted.sort((a, b) => sourceTitle(b).localeCompare(sourceTitle(a)));
    // Newest first. Images are never edited, so "recently updated" is the same.
    return sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function MediaGrid({ media }: { media: MediaItem[] }) {
    const [toDelete, setToDelete] = useState<MediaItem | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [filters, setFilters] = useState<Filter[]>([]);
    const [draftFilter, setDraftFilter] = useState<Filter | null>(null);
    const [isGrouped, setIsGrouped] = useState(false);
    const [sortOption, setSortOption] = useState<string | null>('created-desc');

    const visibleMedia = useMemo(() => {
        const needles = [...filters, ...(draftFilter ? [draftFilter] : [])]
            .map((f) => f.value.trim().toLowerCase())
            .filter(Boolean);
        const filtered = media.filter((item) => needles.every((n) => sourceTitle(item).toLowerCase().includes(n)));
        return sortMedia(filtered, sortOption);
    }, [media, filters, draftFilter, sortOption]);

    // [heading, items] pairs; a single unnamed group when not grouping.
    const groups = useMemo<[string, MediaItem[]][]>(() => {
        if (!isGrouped) return [['', visibleMedia]];
        return GROUP_ORDER
            .map((name): [string, MediaItem[]] => [name, visibleMedia.filter((item) => groupName(item) === name)])
            .filter(([, items]) => items.length > 0);
    }, [visibleMedia, isGrouped]);

    const handleConfirmDelete = async () => {
        if (!toDelete) return;
        setIsDeleting(true);
        try {
            await deleteMediaPermanently(toDelete.id);
            setToDelete(null);
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <Box mt="xs">
            <GalleryControls
                fields={MEDIA_FIELDS}
                getSuggestions={() => []}
                filters={filters}
                onAddFilter={(f) => setFilters((prev) => [...prev, f])}
                onRemoveFilter={(index) => setFilters((prev) => prev.filter((_, i) => i !== index))}
                onClearFilters={() => setFilters([])}
                onDraftChange={setDraftFilter}
                searchPlaceholder="Search media by project or pattern..."
                isGrouped={isGrouped}
                setIsGrouped={setIsGrouped}
                groupLabel="Group by type"
                sortOption={sortOption}
                setSortOption={setSortOption}
            />

            {visibleMedia.length === 0 && (
                <Text c="dimmed" ta="center" mt="xl">
                    {media.length === 0 ? 'No images yet.' : 'Nothing matches your search.'}
                </Text>
            )}

            {groups.map(([name, items]) => (
                <Box key={name} mt="lg">
                    {name && <Title order={3} mb="sm">{name} ({items.length})</Title>}
                    <SimpleGrid cols={{ base: 2, md: 3, lg: 4 }} spacing="md">
                        {items.map((item) => (
                            <MediaCard key={item.id} item={item} onDelete={() => setToDelete(item)} />
                        ))}
                    </SimpleGrid>
                </Box>
            ))}

            <ConfirmDeleteModal
                opened={!!toDelete}
                close={() => setToDelete(null)}
                onConfirm={handleConfirmDelete}
                itemName="this image"
                isDeleting={isDeleting}
            />
        </Box>
    );
}
