'use client';

import { useState } from 'react';
import { Paper, Group, Text, ActionIcon, Menu, ScrollArea, Stack, TextInput, Box } from '@mantine/core';
import { IconGripVertical, IconDots, IconPencil, IconTrash, IconBook2 } from '@tabler/icons-react';
import { useParams, useRouter } from 'next/navigation';
import { useSortable } from '@dnd-kit/sortable';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { animateLayoutChanges, sortableTransition } from './sortableConfig';
import CardItem, { CardFace } from './CardItem';
import InlineAdd from './InlineAdd';
import { WordCountDisplay, sumListWords, type WordCountSettings } from '@components/WordCountDisplay';
import { promptWordGoal } from '@/utils/dialogs';
import { setListWordGoal } from '../../../_actions/writing_actions';
import type { BoardList, BoardCard, LabelCategory } from '../types';

export default function ListColumn({
  list,
  categories,
  wcSettings,
  originDrag,
  onOpenCard,
  onOpenCardById,
  onAddCard,
  onRename,
  onDelete,
}: {
  list: BoardList;
  categories: LabelCategory[];
  wcSettings: WordCountSettings;
  originDrag: { card: BoardCard; listId: number; index: number } | null;
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
  };

  const commitRename = () => {
    const t = title.trim();
    if (t && t !== list.title) onRename(list.id, t);
    else setTitle(list.title);
    setEditing(false);
  };

  const cardIds = list.cards.map((c) => `card:${c.id}`);

  // Show a static ghost at the origin position when the dragged card has moved
  // to a different list (optimistic update removed it from here).
  const showOriginGhost =
    originDrag?.listId === list.id && !list.cards.some((c) => c.id === originDrag!.card.id);

  // Build the display list, inserting the ghost placeholder at the original index.
  type DisplayItem = { kind: 'card'; card: BoardCard } | { kind: 'ghost' };
  const displayItems: DisplayItem[] = list.cards.map((card) => ({ kind: 'card', card }));
  if (showOriginGhost) {
    const insertAt = Math.min(originDrag!.index, displayItems.length);
    displayItems.splice(insertAt, 0, { kind: 'ghost' });
  }

  // Ghost placeholder — dashed outline the same size as the real list.
  if (isDragging) {
    return (
      <Paper
        ref={setNodeRef}
        style={{ ...style, borderStyle: 'dashed' }}
        withBorder
        radius="md"
        bg="light-dark(var(--mantine-color-gray-1), var(--mantine-color-dark-5))"
        w={272}
        miw={272}
        p="xs"
        {...attributes}
      >
        <Box style={{ opacity: 0 }}>
          <Group justify="space-between" wrap="nowrap" mb="xs" gap={4}>
            <Text fw={600} size="sm">{list.title}</Text>
          </Group>
          {list.cards.slice(0, 3).map((c) => (
            <Box key={c.id} style={{ height: 36, marginBottom: 4 }} />
          ))}
        </Box>
      </Paper>
    );
  }

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
            <Menu.Item
              onClick={async () => {
                const goal = await promptWordGoal({ title: 'List word count goal', initialValue: list.wordCountGoal });
                if (goal === undefined) return;
                await setListWordGoal(list.id, goal);
                router.refresh();
              }}
            >
              Set word goal…
            </Menu.Item>
            <Menu.Item color="red" leftSection={<IconTrash size={14} />} onClick={() => onDelete(list.id)}>
              Delete list
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </Group>

      {wcSettings.mode !== 'off' && (
        <WordCountDisplay
          count={sumListWords(list)}
          goal={list.wordCountGoal ?? wcSettings.defaultListGoal}
          mode={wcSettings.mode}
        />
      )}

      {/* Cards — mah subtracts header (~42px) + add-card row (~40px) + Paper padding (20px). */}
      <ScrollArea.Autosize mah="max(calc(50vh - 110px), 290px)" type="hover">
        <div ref={setDropRef} style={list.cards.length === 0 && !showOriginGhost ? { minHeight: 80 } : undefined}>
          <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
            <Stack gap="xs" mih={8}>
              {displayItems.map((item) =>
                item.kind === 'ghost' ? (
                  <Paper
                    key="origin-ghost"
                    radius="sm"
                    p={originDrag!.card.isImageCard && (originDrag!.card.coverImage ?? originDrag!.card.imagePath) ? 0 : 'xs'}
                    withBorder
                    style={{
                      opacity: 0.35,
                      overflow: originDrag!.card.isImageCard ? 'hidden' : undefined,
                      pointerEvents: 'none',
                    }}
                  >
                    <CardFace card={originDrag!.card} categories={categories} />
                  </Paper>
                ) : (
                  <CardItem key={item.card.id} card={item.card} categories={categories} wcSettings={wcSettings} onOpen={onOpenCard} onOpenLinked={onOpenCardById} />
                )
              )}
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
