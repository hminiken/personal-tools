'use client';

import { useEffect, useMemo, useState } from 'react';
import { Modal, Stack, Button, ScrollArea, Group, Text, Box, ActionIcon, TextInput } from '@mantine/core';
import { IconFolder, IconHome, IconChevronRight, IconSearch, IconX } from '@tabler/icons-react';
import type { FolderRow, ProjectRow } from '../_lib/loadGalleryLevel';

// A picker for choosing a destination folder. Renders the folder hierarchy as a
// collapsible tree (folders with children get an expand/collapse chevron), plus
// a "Top level" option. Used to move both projects and folders.
//
// `excludeIds` removes destinations that would be invalid — for a folder move,
// the folder itself and all its descendants (a folder can't go inside itself).
// `currentParentId` is the destination the item already lives in; shown
// disabled so it's clear where the item is now.
//
// When `search` is non-empty the tree is replaced by a flat list of matching
// destinations: folders whose name matches AND folders that contain a project
// whose title matches (the project name shown as a hint below the folder button).
export function MoveToFolderModal({
  opened,
  onClose,
  allFolders,
  allProjects = [],
  excludeIds = [],
  currentParentId,
  onPick,
  itemName,
}: {
  opened: boolean;
  onClose: () => void;
  allFolders: FolderRow[];
  allProjects?: ProjectRow[];
  excludeIds?: number[];
  currentParentId: number | null;
  onPick: (folderId: number | null) => Promise<void>;
  itemName: string;
}) {
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');

  const byParent = useMemo(() => {
    const map = new Map<number | null, FolderRow[]>();
    for (const f of allFolders) {
      const key = f.parentFolderId ?? null;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(f);
    }
    for (const list of map.values()) list.sort((a, b) => a.name.localeCompare(b.name));
    return map;
  }, [allFolders]);

  // Folders with children, expanded by default so the whole tree is visible.
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  // Reset expansion and search each time the modal opens.
  useEffect(() => {
    if (!opened) return;
    setSearch('');
    const s = new Set<number>();
    for (const f of allFolders) if ((byParent.get(f.id)?.length ?? 0) > 0) s.add(f.id);
    setExpanded(s);
  }, [opened, allFolders, byParent]);

  const toggle = (id: number) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const excluded = useMemo(() => new Set(excludeIds), [excludeIds]);

  const pick = async (folderId: number | null) => {
    setBusy(true);
    try {
      await onPick(folderId);
      onClose();
    } finally {
      setBusy(false);
    }
  };

  // ----- search results (flat list) -----
  // Map: destination folder id (null = top level) → matched project titles
  const searchResults = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return null;

    const destinations = new Map<number | null, string[]>();

    for (const f of allFolders) {
      if (excluded.has(f.id)) continue;
      if (f.name.toLowerCase().includes(q)) destinations.set(f.id, []);
    }

    for (const p of allProjects) {
      if (!p.title.toLowerCase().includes(q)) continue;
      const dest = p.folderId ?? null;
      if (dest !== null && excluded.has(dest)) continue;
      if (!destinations.has(dest)) destinations.set(dest, []);
      destinations.get(dest)!.push(p.title);
    }

    return destinations;
  }, [search, allFolders, allProjects, excluded]);

  const renderSearchResults = () => {
    if (!searchResults) return null;
    if (searchResults.size === 0) {
      return <Text c="dimmed" size="sm" ta="center" py="md">No matching folders or projects.</Text>;
    }

    const items: React.ReactNode[] = [];

    // Top level (only appears when a top-level project matched)
    if (searchResults.has(null)) {
      const matched = searchResults.get(null)!;
      const isCurrent = currentParentId == null;
      items.push(
        <Box key="__top">
          <Button
            fullWidth
            variant={isCurrent ? 'light' : 'subtle'}
            color="olive"
            justify="flex-start"
            disabled={busy || isCurrent}
            leftSection={<IconHome size={18} />}
            styles={{ inner: { justifyContent: 'flex-start' } }}
            onClick={() => pick(null)}
          >
            Top level
          </Button>
          {matched.length > 0 && (
            <Text size="xs" c="dimmed" pl={44} pb={2}>
              has: {matched.slice(0, 3).join(', ')}{matched.length > 3 ? ` +${matched.length - 3} more` : ''}
            </Text>
          )}
        </Box>
      );
    }

    for (const [folderId, matched] of searchResults) {
      if (folderId === null) continue;
      const folder = allFolders.find((f) => f.id === folderId);
      if (!folder) continue;
      const isCurrent = currentParentId === folderId;
      items.push(
        <Box key={folderId}>
          <Button
            fullWidth
            variant={isCurrent ? 'light' : 'subtle'}
            color="olive"
            justify="flex-start"
            disabled={busy || isCurrent}
            leftSection={<IconFolder size={18} />}
            styles={{ inner: { justifyContent: 'flex-start' } }}
            onClick={() => pick(folderId)}
          >
            {folder.name}
          </Button>
          {matched.length > 0 && (
            <Text size="xs" c="dimmed" pl={44} pb={2}>
              has: {matched.slice(0, 3).join(', ')}{matched.length > 3 ? ` +${matched.length - 3} more` : ''}
            </Text>
          )}
        </Box>
      );
    }

    return <>{items}</>;
  };

  // ----- tree view (no search) -----
  const renderNodes = (parent: number | null, depth: number): React.ReactNode =>
    (byParent.get(parent) ?? []).map((folder) => {
      const children = byParent.get(folder.id) ?? [];
      const hasChildren = children.length > 0;
      const isOpen = expanded.has(folder.id);
      const isExcluded = excluded.has(folder.id);
      const isCurrent = currentParentId === folder.id;

      return (
        <Box key={folder.id}>
          <Group gap={2} wrap="nowrap" style={{ paddingLeft: depth * 18 }}>
            {hasChildren ? (
              <ActionIcon variant="subtle" color="gray" size="sm" onClick={() => toggle(folder.id)} aria-label={isOpen ? 'Collapse' : 'Expand'}>
                <IconChevronRight size={16} style={{ transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }} />
              </ActionIcon>
            ) : (
              <Box w={26} style={{ flexShrink: 0 }} />
            )}
            <Button
              flex={1}
              variant={isCurrent ? 'light' : 'subtle'}
              color="olive"
              justify="flex-start"
              disabled={busy || isExcluded || isCurrent}
              leftSection={<IconFolder size={18} />}
              styles={{ inner: { justifyContent: 'flex-start' } }}
              onClick={() => pick(folder.id)}
            >
              {folder.name}
            </Button>
          </Group>
          {hasChildren && isOpen && renderNodes(folder.id, depth + 1)}
        </Box>
      );
    });

  return (
    <Modal opened={opened} onClose={onClose} title={`Move "${itemName}" to…`} yOffset={120}>
      <Stack gap="sm">
        <TextInput
          placeholder="Search folders or projects…"
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
          leftSection={<IconSearch size={15} />}
          rightSection={
            search ? (
              <ActionIcon variant="subtle" color="gray" size="sm" onClick={() => setSearch('')} aria-label="Clear search">
                <IconX size={13} />
              </ActionIcon>
            ) : null
          }
        />

        <ScrollArea.Autosize mah={360}>
          <Stack gap={4}>
            {searchResults ? (
              renderSearchResults()
            ) : (
              <>
                <Button
                  variant={currentParentId == null ? 'light' : 'subtle'}
                  color="olive"
                  justify="flex-start"
                  leftSection={<IconHome size={18} />}
                  disabled={busy || currentParentId == null}
                  onClick={() => pick(null)}
                >
                  Top level
                </Button>

                {allFolders.length === 0 ? (
                  <Group justify="center" py="md">
                    <Text c="dimmed" size="sm">No folders yet — create one first.</Text>
                  </Group>
                ) : (
                  renderNodes(null, 0)
                )}
              </>
            )}
          </Stack>
        </ScrollArea.Autosize>
      </Stack>
    </Modal>
  );
}
