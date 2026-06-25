'use client';

import { Paper, Text } from '@mantine/core';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { animateLayoutChanges, sortableTransition } from './sortableConfig';
import type { Card } from '../types';

// Strips HTML tags to show a short text preview of the card body.
function preview(html: string | null | undefined): string {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

export default function CardItem({
  card,
  onOpen,
}: {
  card: Card;
  onOpen: (card: Card) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `card:${card.id}`,
    data: { type: 'card', card },
    animateLayoutChanges,
    transition: sortableTransition,
  });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const text = preview(card.content);

  return (
    <Paper
      ref={setNodeRef}
      style={{ ...style, cursor: 'grab' }}
      withBorder
      shadow="xs"
      radius="sm"
      p="xs"
      onClick={() => onOpen(card)}
      {...attributes}
      {...listeners}
    >
      <Text size="sm" fw={500} lineClamp={2}>{card.title}</Text>
      {text && (
        <Text size="xs" c="dimmed" lineClamp={2} mt={2}>{text}</Text>
      )}
    </Paper>
  );
}
