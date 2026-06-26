'use client';

import { Card, Image, Text, Box, Menu, ActionIcon } from '@mantine/core';
import {
  IconFolder, IconDots, IconPencil, IconArrowRight, IconTrash,
  IconPhoto, IconPhotoUp, IconPhotoOff, IconPalette,
} from '@tabler/icons-react';
import Link from 'next/link';
import type { FolderRow } from '../_lib/loadGalleryLevel';

// A compact, folder-styled gallery card (~115px square). Distinct from the
// larger project cards: it shows a folder icon over a tinted square (or a cover
// image) and carries a kebab menu for rename / move / delete. The whole card
// links into the folder.
export function FolderCard({
  folder,
  childCount,
  onRename,
  onMove,
  onDelete,
  onCoverUnsplash,
  onCoverUpload,
  onRemoveCover,
  onSetColor,
}: {
  folder: FolderRow;
  childCount: number;
  onRename: () => void;
  onMove: () => void;
  onDelete: () => void;
  onCoverUnsplash: () => void;
  onCoverUpload: () => void;
  onRemoveCover: () => void;
  onSetColor: () => void;
}) {
  return (
    <Card
      shadow="xs"
      padding={6}
      radius="md"
      withBorder
      component={Link}
      href={`/writing/folder/${folder.id}`}
      w={115}
      style={{
        textDecoration: 'none',
        transition: 'transform 0.15s, box-shadow 0.15s',
        ...(folder.color ? { borderTop: `3px solid ${folder.color}` } : {}),
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-3px)';
        e.currentTarget.style.boxShadow = 'var(--mantine-shadow-md)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'var(--mantine-shadow-sm)';
      }}
    >
      <Card.Section style={{ position: 'relative' }}>
        {folder.coverImage ? (
          <Image src={folder.coverImage} h={80} alt={folder.name} fallbackSrc="https://placehold.co/200x160?text=Folder" />
        ) : (
          <Box
            style={{
              height: 80,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              // A folder color tints the placeholder (~13% alpha hex); otherwise
              // fall back to the default olive tint.
              background: folder.color
                ? `${folder.color}22`
                : 'light-dark(var(--mantine-color-olive-1), var(--mantine-color-dark-5))',
            }}
          >
            <IconFolder size={40} stroke={1.3} color={folder.color ?? 'var(--mantine-color-olive-6)'} />
          </Box>
        )}

        <Box style={{ position: 'absolute', top: 3, right: 3, zIndex: 10 }} onClick={(e) => e.preventDefault()}>
          <Menu shadow="md" position="bottom-end" withinPortal>
            <Menu.Target>
              <ActionIcon variant="filled" color="olive.6" size="sm" radius="xl">
                <IconDots size={13} stroke={1.5} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item leftSection={<IconPencil size={16} />} onClick={onRename}>Rename</Menu.Item>
              <Menu.Item leftSection={<IconArrowRight size={16} />} onClick={onMove}>Move to…</Menu.Item>
              <Menu.Divider />
              <Menu.Label>Cover image</Menu.Label>
              <Menu.Item leftSection={<IconPhoto size={16} />} onClick={onCoverUnsplash}>From Unsplash</Menu.Item>
              <Menu.Item leftSection={<IconPhotoUp size={16} />} onClick={onCoverUpload}>Upload / paste</Menu.Item>
              {folder.coverImage && (
                <Menu.Item leftSection={<IconPhotoOff size={16} />} onClick={onRemoveCover}>Remove cover</Menu.Item>
              )}
              <Menu.Divider />
              <Menu.Item leftSection={<IconPalette size={16} />} onClick={onSetColor}>Set color…</Menu.Item>
              <Menu.Divider />
              <Menu.Item color="red" leftSection={<IconTrash size={16} />} onClick={onDelete}>Delete</Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Box>
      </Card.Section>

      <Text fw={500} size="xs" lineClamp={1} mt={5}>{folder.name}</Text>
      <Text size="10px" c="dimmed">{childCount === 1 ? '1 item' : `${childCount} items`}</Text>
    </Card>
  );
}
