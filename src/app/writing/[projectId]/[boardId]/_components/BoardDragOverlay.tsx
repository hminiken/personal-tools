'use client';

import type { CSSProperties } from 'react';
import { Group, Paper, Text } from '@mantine/core';
import { DragOverlay } from '@dnd-kit/core';
import { CardFace, cardAccentBorder, effectiveCardColor } from './CardItem';
import type { ActiveDrag } from './useBoardDnd';
import type { LabelCatalog } from '../types';

// The floating ghost that follows the cursor mid-drag: a rendering of the
// dragged card/list/group. dropAnimation=null: the real item is already
// placed optimistically at the drop target, so the overlay just fades out
// instead of flying to a position that doesn't match (which read as a "pop").
//
// dnd-kit portals this to document.body, OUTSIDE the wrapper BoardView sets
// --theme-* vars on — so it can't rely on CSS inheritance. `themeVars` is the
// same object BoardView computed and is spread directly onto this Paper so
// the ghost stays in sync with the real card even mid-drag.
export default function BoardDragOverlay({
  activeDrag,
  categories,
  themeVars,
}: {
  activeDrag: ActiveDrag;
  categories: LabelCatalog['categories'];
  themeVars: CSSProperties;
}) {
  return (
    <DragOverlay dropAnimation={null}>
      {activeDrag?.type === 'card' ? (
        <Paper
          withBorder
          shadow="xl"
          radius="sm"
          p={activeDrag.card.isImageCard && (activeDrag.card.coverImage ?? activeDrag.card.imagePath) ? 0 : 'xs'}
          w={248}
          style={{
            ...themeVars,
            transform: 'rotate(2deg)',
            cursor: 'grabbing',
            overflow: activeDrag.card.isImageCard ? 'hidden' : undefined,
            background: 'var(--theme-card-bg, var(--mantine-color-body))',
            borderColor: 'var(--theme-card-border, var(--mantine-color-default-border))',
            color: 'var(--theme-card-text, inherit)',
            // Conditional: passing borderTop: undefined here would clear the
            // themed borderColor above on the top edge (see CardItem note).
            ...(effectiveCardColor(activeDrag.card)
              ? { borderTop: cardAccentBorder(effectiveCardColor(activeDrag.card)) }
              : {}),
          }}
        >
          <CardFace card={activeDrag.card} categories={categories} />
        </Paper>
      ) : activeDrag?.type === 'list' ? (
        <Paper
          withBorder
          shadow="xl"
          radius="md"
          p="xs"
          bg="light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-6))"
          w={272}
          style={{ transform: 'rotate(1.5deg)', cursor: 'grabbing' }}
        >
          <Group gap={4} wrap="nowrap">
            <Text fw={600} size="sm" lineClamp={1} style={{ flex: 1 }}>{activeDrag.list.title}</Text>
            <Text size="xs" c="dimmed">{activeDrag.list.cards.length}</Text>
          </Group>
        </Paper>
      ) : activeDrag?.type === 'group' ? (
        <Paper
          withBorder
          shadow="xl"
          radius="md"
          p="sm"
          bg="light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-7))"
          maw={360}
          style={{ transform: 'rotate(1deg)', cursor: 'grabbing' }}
        >
          <Text fw={600} lineClamp={1}>{activeDrag.group.title}</Text>
          <Text size="xs" c="dimmed" mt={2}>
            {activeDrag.group.lists.length} {activeDrag.group.lists.length === 1 ? 'list' : 'lists'}
          </Text>
        </Paper>
      ) : null}
    </DragOverlay>
  );
}
