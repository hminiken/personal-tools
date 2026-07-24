'use client';

import { useState } from 'react';
import { ActionIcon, Box, Group, Popover, Text, Tooltip } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconNotes, IconPencil, IconTrash } from '@tabler/icons-react';
import CardNoteEditor from './CardNoteEditor';
import { linkPreviewDropdownStyle } from './CardItem';
import { sanitizePatternHtml } from '@/utils/sanitizeHtml';

// Freeform note attached to a list or group as a whole — the same idea as a
// card's note but a single blob rather than a dated thread (there's only ever
// one, so no need for the card editor's full comment-list machinery). Reuses
// CardNoteEditor as-is since it's already just "give me html in, get html out."
export default function NotesPopover({
  notes,
  onSave,
  smartQuotes,
  light,
  themeVars,
}: {
  notes: string | null | undefined;
  onSave: (html: string | null) => void;
  smartQuotes?: boolean | null;
  // True on a group/list sitting over a photo background, where the trigger
  // icon needs to match the header's light-on-dark text color.
  light?: boolean;
  // The board's --theme-* vars — this Popover portals to document.body
  // (withinPortal), which breaks out of the board wrapper's CSS cascade, so
  // the vars have to be spread onto the portaled dropdown explicitly (see
  // linkPreviewDropdownStyle, used the same way by CardItem's link preview).
  themeVars?: Record<string, string>;
}) {
  const hasNotes = !!notes?.trim();
  const [opened, { close, toggle }] = useDisclosure(false);
  const [editing, setEditing] = useState(false);

  const handleOpen = (e: React.MouseEvent) => {
    // Stop-prop so this is safe to embed in a draggable row (the file tree),
    // where the whole row is a drag handle and a bare click would select it.
    e.stopPropagation();
    setEditing(!hasNotes);
    toggle();
  };

  const handleClose = () => {
    close();
    setEditing(false);
  };

  return (
    <Popover
      opened={opened}
      onChange={(next) => (next ? toggle() : handleClose())}
      position="bottom-start"
      withinPortal
      shadow="md"
      width={400}
    >
      <Popover.Target>
        <Tooltip label={hasNotes ? 'Notes' : 'Add notes'} withinPortal>
          <ActionIcon
            variant={hasNotes ? 'light' : 'subtle'}
            color={hasNotes ? 'yellow' : 'gray'}
            size="sm"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={handleOpen}
            style={light ? { color: 'rgba(255,255,255,0.8)' } : undefined}
            aria-label="Notes"
          >
            <IconNotes size={16} />
          </ActionIcon>
        </Tooltip>
      </Popover.Target>
      <Popover.Dropdown
        onClick={(e) => e.stopPropagation()}
        style={{
          ...themeVars,
          ...linkPreviewDropdownStyle,
          // Mantine's default popover border reads as a stray white line once
          // the background is themed — replace it with a darker shade of that
          // same background instead of a fixed/theme-agnostic border color.
          border: '1px solid color-mix(in srgb, var(--theme-group-bg, var(--theme-list-bg, var(--mantine-color-body))) 80%, black 20%)',
        }}
      >
        {editing ? (
          <CardNoteEditor
            initialContent={notes ?? ''}
            onSave={(html) => { onSave(html); setEditing(false); }}
            onCancel={() => (hasNotes ? setEditing(false) : handleClose())}
            smartQuotes={smartQuotes}
          />
        ) : (
          <Box>
            <Group justify="flex-end" gap={2} mb={2}>
              <Tooltip label="Edit notes" withinPortal>
                <ActionIcon size="xs" color="gray" variant="subtle" onClick={() => setEditing(true)} aria-label="Edit notes">
                  <IconPencil size={12} />
                </ActionIcon>
              </Tooltip>
              <Tooltip label="Delete notes" withinPortal>
                <ActionIcon size="xs" color="red" variant="subtle" onClick={() => { onSave(null); handleClose(); }} aria-label="Delete notes">
                  <IconTrash size={12} />
                </ActionIcon>
              </Tooltip>
            </Group>
            {hasNotes ? (
              <Box
                style={{ fontSize: 'var(--mantine-font-size-sm)', color: 'var(--theme-card-text, var(--mantine-color-text))' }}
                dangerouslySetInnerHTML={{ __html: sanitizePatternHtml(notes) ?? '' }}
              />
            ) : (
              <Text size="sm" style={{ color: 'var(--theme-card-muted-text, var(--mantine-color-dimmed))' }}>No notes yet.</Text>
            )}
          </Box>
        )}
      </Popover.Dropdown>
    </Popover>
  );
}
