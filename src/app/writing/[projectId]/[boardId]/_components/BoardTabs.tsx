'use client';

import { useEffect, useState } from 'react';
import { Group, ActionIcon, Menu, ScrollArea, Tooltip } from '@mantine/core';
import { IconPlus, IconDots, IconPencil, IconTrash, IconPhoto, IconPhotoOff } from '@tabler/icons-react';
import Link from 'next/link';
import {
  DndContext, PointerSensor, useSensor, useSensors, closestCenter,
  MeasuringStrategy, type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, horizontalListSortingStrategy, useSortable, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { moveBoard } from '../../../_actions/writing_actions';
import type { Board } from '../types';
import classes from './BoardTabs.module.css';

function midpoint(prev?: number, next?: number): number {
  if (prev != null && next != null) return (prev + next) / 2;
  if (next != null) return next - 1;
  if (prev != null) return prev + 1;
  return 1;
}

function SortableTab({
  board,
  projectId,
  active,
}: {
  board: Board;
  projectId: number;
  active: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `board:${board.id}`,
  });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    zIndex: isDragging ? 2 : 1,
    opacity: isDragging ? 0.85 : 1,
  };

  return (
    <Link
      ref={setNodeRef}
      href={`/writing/${projectId}/${board.id}`}
      className={classes.tab}
      data-active={active || undefined}
      style={style}
      {...attributes}
      {...listeners}
    >
      {board.title}
    </Link>
  );
}

export default function BoardTabs({
  projectId,
  boards,
  activeBoardId,
  onAddBoard,
  onRenameBoard,
  onDeleteBoard,
  hasBg,
  onSetBackground,
  onRemoveBackground,
}: {
  projectId: number;
  boards: Board[];
  activeBoardId: number;
  onAddBoard: () => void;
  onRenameBoard: () => void;
  onDeleteBoard: () => void;
  hasBg: boolean;
  onSetBackground: () => void;
  onRemoveBackground: () => void;
}) {
  const [order, setOrder] = useState<Board[]>(boards);
  useEffect(() => { setOrder(boards); }, [boards]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = order.findIndex((b) => `board:${b.id}` === active.id);
    const newIndex = order.findIndex((b) => `board:${b.id}` === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(order, oldIndex, newIndex);
    setOrder(reordered);
    const pos = midpoint(reordered[newIndex - 1]?.position, reordered[newIndex + 1]?.position);
    // Persist in the background; the optimistic order above is authoritative.
    moveBoard(reordered[newIndex].id, pos);
  }

  const ids = order.map((b) => `board:${b.id}`);

  return (
    <Group gap="xs" mb="md" wrap="nowrap" align="flex-end">
      <ScrollArea type="hover" scrollbarSize={6} style={{ flex: 1, minWidth: 0 }}>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={ids} strategy={horizontalListSortingStrategy}>
            <Group
              gap={4}
              wrap="nowrap"
              pr="xs"
              style={{ borderBottom: '2px solid var(--mantine-color-olive-3)' }}
            >
              {order.map((b) => (
                <SortableTab key={b.id} board={b} projectId={projectId} active={b.id === activeBoardId} />
              ))}
            </Group>
          </SortableContext>
        </DndContext>
      </ScrollArea>

      <Tooltip label="Add board">
        <ActionIcon variant="light" color="olive" size="lg" onClick={onAddBoard} aria-label="Add board">
          <IconPlus size={18} />
        </ActionIcon>
      </Tooltip>
      <Menu position="bottom-end" withinPortal>
        <Menu.Target>
          <ActionIcon variant="subtle" color="gray" size="lg" aria-label="Board options">
            <IconDots size={18} />
          </ActionIcon>
        </Menu.Target>
        <Menu.Dropdown>
          <Menu.Item leftSection={<IconPencil size={14} />} onClick={onRenameBoard}>Rename board</Menu.Item>
          <Menu.Item color="red" leftSection={<IconTrash size={14} />} onClick={onDeleteBoard}>Delete board</Menu.Item>
          <Menu.Divider />
          <Menu.Item leftSection={<IconPhoto size={14} />} onClick={onSetBackground}>
            {hasBg ? 'Change background' : 'Set background'}
          </Menu.Item>
          {hasBg && (
            <Menu.Item leftSection={<IconPhotoOff size={14} />} onClick={onRemoveBackground}>
              Remove background
            </Menu.Item>
          )}
        </Menu.Dropdown>
      </Menu>
    </Group>
  );
}
