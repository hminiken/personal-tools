'use client';

import { useState } from 'react';
import { Paper, Group, Text, ActionIcon, Menu, ScrollArea, Stack, TextInput } from '@mantine/core';
import { IconGripVertical, IconDots, IconPencil, IconTrash, IconBook2 } from '@tabler/icons-react';
import { useParams, useRouter } from 'next/navigation';
import { useSortable } from '@dnd-kit/sortable';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { animateLayoutChanges, sortableTransition } from './sortableConfig';
import CardItem from './CardItem';
import InlineAdd from './InlineAdd';
import type { BoardList, BoardCard, LabelCategory } from '../types';

export default function ListColumn({
  list,
  categories,
  onOpenCard,
  onOpenCardById,
  onAddCard,
  onRename,
  onDelete,
}: {
  list: BoardList;
  categories: LabelCategory[];
  onOpenCard: (card: BoardCard) => void;
  onOpenCardById: (cardId: number) => void;
  onAddCard: (listId: number, title: string) => void;
  onRename: (listId: number, title: string) => void;
  onDelete: (listId: number) => void;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: `list:${list.id}`, data: { type: 'list', list }, animateLayoutChanges, transition: sortableTransition });

  // Droppable zone so cards can be dropped onto this list (even when empty).
  const { setNodeRef: setDropRef } = useDroppable({ id: `listzone:${list.id}`, data: { type: 'listzone', listId: list.id } });

  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(list.title);
  const params = useParams();
  const router = useRouter();

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const commitRename = () => {
    const t = title.trim();
    if (t && t !== list.title) onRename(list.id, t);
    else setTitle(list.title);
    setEditing(false);
  };

  const cardIds = list.cards.map((c) => `card:${c.id}`);

  return (
    <Paper
      ref={setNodeRef}
      style={style}
      withBorder
      radius="md"
      bg="light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-6))"
      w={272}
      miw={272}
      p="xs"
      {...attributes}
    >
      {/* Header */}
      <Group justify="space-between" wrap="nowrap" mb="xs" gap={4}>
        <ActionIcon
          ref={setActivatorNodeRef}
          variant="subtle"
          color="gray"
          size="sm"
          style={{ cursor: 'grab' }}
          {...listeners}
          aria-label="Drag list"
        >
          <IconGripVertical size={16} />
        </ActionIcon>

        {editing ? (
          <TextInput
            size="xs"
            value={title}
            onChange={(e) => setTitle(e.currentTarget.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitRename();
              if (e.key === 'Escape') { setTitle(list.title); setEditing(false); }
            }}
            autoFocus
            style={{ flex: 1 }}
          />
        ) : (
          <Text fw={600} size="sm" lineClamp={1} style={{ flex: 1 }} onDoubleClick={() => setEditing(true)}>
            {list.title}
          </Text>
        )}

        <Menu position="bottom-end" withinPortal>
          <Menu.Target>
            <ActionIcon variant="subtle" color="gray" size="sm" aria-label="List options">
              <IconDots size={16} />
            </ActionIcon>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Item
              leftSection={<IconBook2 size={14} />}
              onClick={() => router.push(`/writing/${params.projectId}/${params.boardId}/compile/list/${list.id}`)}
            >
              Open as chapter
            </Menu.Item>
            <Menu.Item leftSection={<IconPencil size={14} />} onClick={() => setEditing(true)}>
              Rename
            </Menu.Item>
            <Menu.Item color="red" leftSection={<IconTrash size={14} />} onClick={() => onDelete(list.id)}>
              Delete list
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </Group>

      {/* Cards — mah subtracts header (~42px) + add-card row (~40px) + Paper padding (20px). */}
      <ScrollArea.Autosize mah="max(calc(50vh - 110px), 290px)" type="hover">
        <div ref={setDropRef}>
          <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
            <Stack gap="xs" mih={8}>
              {list.cards.map((card) => (
                <CardItem key={card.id} card={card} categories={categories} onOpen={onOpenCard} onOpenLinked={onOpenCardById} />
              ))}
            </Stack>
          </SortableContext>
        </div>
      </ScrollArea.Autosize>

      <div style={{ marginTop: 8 }}>
        <InlineAdd
          label="Add card"
          placeholder="Card title"
          variant="subtle"
          fullWidth
          onAdd={(v) => onAddCard(list.id, v)}
        />
      </div>
    </Paper>
  );
}
