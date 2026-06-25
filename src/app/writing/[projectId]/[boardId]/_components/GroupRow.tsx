'use client';

import { useState } from 'react';
import { Paper, Group, Text, ActionIcon, Menu, ScrollArea, TextInput, Box } from '@mantine/core';
import { IconGripVertical, IconDots, IconPencil, IconTrash, IconBook2 } from '@tabler/icons-react';
import { useParams, useRouter } from 'next/navigation';
import { useSortable } from '@dnd-kit/sortable';
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { animateLayoutChanges, sortableTransition } from './sortableConfig';
import ListColumn from './ListColumn';
import InlineAdd from './InlineAdd';
import type { BoardGroup, Card } from '../types';

export default function GroupRow({
  group,
  onOpenCard,
  onAddCard,
  onAddList,
  onRenameList,
  onDeleteList,
  onRenameGroup,
  onDeleteGroup,
}: {
  group: BoardGroup;
  onOpenCard: (card: Card) => void;
  onAddCard: (listId: number, title: string) => void;
  onAddList: (groupId: number, title: string) => void;
  onRenameList: (listId: number, title: string) => void;
  onDeleteList: (listId: number) => void;
  onRenameGroup: (groupId: number, title: string) => void;
  onDeleteGroup: (groupId: number) => void;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: `group:${group.id}`, data: { type: 'group', group }, animateLayoutChanges, transition: sortableTransition });

  // Droppable zone so lists can be dropped into this group (even when empty).
  const { setNodeRef: setDropRef } = useDroppable({ id: `groupzone:${group.id}`, data: { type: 'groupzone', groupId: group.id } });

  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(group.title);
  const params = useParams();
  const router = useRouter();

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  const commitRename = () => {
    const t = title.trim();
    if (t && t !== group.title) onRenameGroup(group.id, t);
    else setTitle(group.title);
    setEditing(false);
  };

  const listIds = group.lists.map((l) => `list:${l.id}`);

  return (
    <Paper
      ref={setNodeRef}
      style={style}
      withBorder
      radius="md"
      p="sm"
      bg="light-dark(var(--mantine-color-olive-0), var(--mantine-color-dark-7))"
      {...attributes}
    >
      {/* Group header */}
      <Group justify="space-between" wrap="nowrap" mb="sm" gap={4}>
        <Group gap={4} wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
          <ActionIcon
            ref={setActivatorNodeRef}
            variant="subtle"
            color="gray"
            size="sm"
            style={{ cursor: 'grab' }}
            {...listeners}
            aria-label="Drag group"
          >
            <IconGripVertical size={18} />
          </ActionIcon>

          {editing ? (
            <TextInput
              size="sm"
              value={title}
              onChange={(e) => setTitle(e.currentTarget.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitRename();
                if (e.key === 'Escape') { setTitle(group.title); setEditing(false); }
              }}
              autoFocus
              style={{ maxWidth: 320 }}
            />
          ) : (
            <Text fw={700} size="md" lineClamp={1} onDoubleClick={() => setEditing(true)}>
              {group.title}
            </Text>
          )}
        </Group>

        <Menu position="bottom-end" withinPortal>
          <Menu.Target>
            <ActionIcon variant="subtle" color="gray" size="sm" aria-label="Group options">
              <IconDots size={18} />
            </ActionIcon>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Item
              leftSection={<IconBook2 size={14} />}
              onClick={() => router.push(`/writing/${params.projectId}/${params.boardId}/compile/group/${group.id}`)}
            >
              Compile group
            </Menu.Item>
            <Menu.Item leftSection={<IconPencil size={14} />} onClick={() => setEditing(true)}>
              Rename
            </Menu.Item>
            <Menu.Item color="red" leftSection={<IconTrash size={14} />} onClick={() => onDeleteGroup(group.id)}>
              Delete group
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </Group>

      {/* Lists: horizontal scroll */}
      <ScrollArea type="hover" offsetScrollbars scrollbarSize={8}>
        <div ref={setDropRef} style={{ minHeight: 64 }}>
          <SortableContext items={listIds} strategy={horizontalListSortingStrategy}>
            <Group align="flex-start" wrap="nowrap" gap="sm" pb="xs" style={{ minHeight: 64 }}>
              {group.lists.map((list) => (
                <ListColumn
                  key={list.id}
                  list={list}
                  onOpenCard={onOpenCard}
                  onAddCard={onAddCard}
                  onRename={onRenameList}
                  onDelete={onDeleteList}
                />
              ))}
              <Box
                miw={220}
                style={
                  group.lists.length === 0
                    ? {
                        alignSelf: 'stretch',
                        display: 'flex',
                        alignItems: 'center',
                        border: '1.5px dashed var(--mantine-color-olive-3)',
                        borderRadius: 8,
                        padding: 8,
                      }
                    : { paddingTop: 4 }
                }
              >
                <InlineAdd
                  label={group.lists.length === 0 ? 'Drop a list here, or add one' : 'Add list'}
                  placeholder="List title"
                  onAdd={(v) => onAddList(group.id, v)}
                />
              </Box>
            </Group>
          </SortableContext>
        </div>
      </ScrollArea>
    </Paper>
  );
}
