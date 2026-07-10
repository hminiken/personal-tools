'use client';

import { useState, useEffect, useRef } from 'react';
import { Paper, Group, Text, ActionIcon, Menu, ScrollArea, TextInput, Box, Anchor } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconGripVertical, IconDots, IconPencil, IconTrash, IconBook2, IconPhoto, IconPhotoOff } from '@tabler/icons-react';
import { useParams, useRouter } from 'next/navigation';
import UnsplashPicker from '@components/UnsplashPicker';
import { setGroupBackground } from '../../../_actions/writing_actions';
import { useSortable } from '@dnd-kit/sortable';
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { animateLayoutChanges, sortableTransition } from './sortableConfig';
import ListColumn from './ListColumn';
import InlineAdd from './InlineAdd';
import { WordCountDisplay, sumGroupWords, type WordCountSettings } from '@components/WordCountDisplay';
import { promptWordGoal } from '@/utils/dialogs';
import { setGroupWordGoal } from '../../../_actions/writing_actions';
import type { BoardGroup, BoardCard, LabelCategory } from '../types';

export default function GroupRow({
  group,
  boardHasBg,
  categories,
  wcSettings,
  originDrag,
  onOpenCard,
  onOpenCardById,
  onAddCard,
  onAddList,
  onRenameList,
  onDeleteList,
  onRenameGroup,
  onDeleteGroup,
}: {
  group: BoardGroup;
  boardHasBg: boolean;
  categories: LabelCategory[];
  wcSettings: WordCountSettings;
  originDrag: { card: BoardCard; listId: number; index: number } | null;
  onOpenCard: (card: BoardCard) => void;
  onOpenCardById: (cardId: number) => void;
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
  const [bgOpened, { open: openBg, close: closeBg }] = useDisclosure(false);
  const params = useParams();
  const router = useRouter();

  const viewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;

    const ds = { startX: 0, startScroll: 0, active: false };

    const onDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      const target = e.target as Element;
      if (target.closest('[data-no-drag-scroll], button, a, input, textarea, select')) return;
      ds.startX = e.clientX;
      ds.startScroll = vp.scrollLeft;
      ds.active = true;
      vp.setPointerCapture(e.pointerId);
      vp.style.cursor = 'grabbing';
      vp.style.userSelect = 'none';
    };

    const onMove = (e: PointerEvent) => {
      if (!ds.active) return;
      vp.scrollLeft = ds.startScroll - (e.clientX - ds.startX);
    };

    const onUp = () => {
      if (!ds.active) return;
      ds.active = false;
      vp.style.cursor = '';
      vp.style.userSelect = '';
    };

    vp.addEventListener('pointerdown', onDown);
    vp.addEventListener('pointermove', onMove);
    vp.addEventListener('pointerup', onUp);
    vp.addEventListener('pointercancel', onUp);

    return () => {
      vp.removeEventListener('pointerdown', onDown);
      vp.removeEventListener('pointermove', onMove);
      vp.removeEventListener('pointerup', onUp);
      vp.removeEventListener('pointercancel', onUp);
    };
  }, []);

  const hasBg = !!group.backgroundImage;          // group has its own photo background
  const onBoardBg = boardHasBg && !hasBg;         // sits on the board's background, no photo of its own
  const credit = group.backgroundCredit ? (JSON.parse(group.backgroundCredit) as { name: string; link: string }) : null;

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    // A light scrim over the photo keeps list columns + header text readable.
    ...(hasBg
      ? {
          backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.14), rgba(0, 0, 0, 0.15)), url(${group.backgroundImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'top center',
        }
      : {}),
  };

  const commitRename = () => {
    const t = title.trim();
    if (t && t !== group.title) onRenameGroup(group.id, t);
    else setTitle(group.title);
    setEditing(false);
  };

  const listIds = group.lists.map((l) => `list:${l.id}`);

  // Ghost placeholder — dashed outline the same width as the real group.
  if (isDragging) {
    return (
      <Paper
        ref={setNodeRef}
        style={{ ...style, borderStyle: 'dashed' }}
        withBorder
        radius="md"
        p="sm"
        bg="light-dark(var(--mantine-color-gray-1), var(--mantine-color-dark-5))"
        {...attributes}
      >
        <Box style={{ opacity: 0 }}>
          <Text fw={600} size="md">{group.title}</Text>
          <Box style={{ height: 80 }} />
        </Box>
      </Paper>
    );
  }

  return (
    <Paper
      ref={setNodeRef}
      style={style}
      withBorder={!hasBg && !onBoardBg}
      radius="md"
      p={hasBg ? 'lg' : 'sm'}
      bg={
        hasBg
          ? undefined
          : onBoardBg
            ? 'light-dark(rgba(255, 255, 255, 0.33), rgba(0,0,0,0.45))'
            : 'light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-7))'
      }
      {...attributes}
    >
      {/* Group header */}
      <Group justify="space-between" wrap="nowrap" mb="sm" gap={4}>
        <Group gap={4} wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
          <ActionIcon
            ref={setActivatorNodeRef}
            variant="subtle"
            size="sm"
            style={{ cursor: 'grab', color: hasBg ? 'rgba(255,255,255,0.8)' : undefined }}
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
            <Text
              fw={700}
              size="md"
              lineClamp={1}
              onDoubleClick={() => setEditing(true)}
              c={hasBg ? 'white' : undefined}
              style={hasBg ? { textShadow: '0 1px 3px rgba(0,0,0,0.6)' } : undefined}
            >
              {group.title}
            </Text>
          )}
          {wcSettings.mode !== 'off' && (
            <WordCountDisplay
              count={sumGroupWords(group)}
              goal={group.wordCountGoal ?? wcSettings.defaultGroupGoal}
              mode={wcSettings.mode}
              light={hasBg}
            />
          )}
        </Group>

        <Menu position="bottom-end" withinPortal>
          <Menu.Target>
            <ActionIcon variant="subtle" color="gray" size="sm" aria-label="Group options" style={hasBg ? { color: 'rgba(255,255,255,0.8)' } : undefined}>
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
            <Menu.Item
              onClick={async () => {
                const goal = await promptWordGoal({ title: 'Group word count goal', initialValue: group.wordCountGoal });
                if (goal === undefined) return;
                await setGroupWordGoal(group.id, goal);
                router.refresh();
              }}
            >
              Set word goal…
            </Menu.Item>
            <Menu.Item leftSection={<IconPhoto size={14} />} onClick={openBg}>
              {hasBg ? 'Change background' : 'Set background'}
            </Menu.Item>
            {hasBg && (
              <Menu.Item
                leftSection={<IconPhotoOff size={14} />}
                onClick={async () => { await setGroupBackground(group.id, null, null); router.refresh(); }}
              >
                Remove background
              </Menu.Item>
            )}
            <Menu.Item color="red" leftSection={<IconTrash size={14} />} onClick={() => onDeleteGroup(group.id)}>
              Delete group
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </Group>

      {/* Lists: horizontal scroll */}
      <ScrollArea type="hover" offsetScrollbars scrollbarSize={8} viewportRef={viewportRef}>
        <div ref={setDropRef} style={{ minHeight: 64 }}>
          <SortableContext items={listIds} strategy={horizontalListSortingStrategy}>
            <Group align="flex-start" wrap="nowrap" gap="sm" pb="xs" style={{ minHeight: 64 }}>
              {group.lists.map((list) => (
                <ListColumn
                  key={list.id}
                  list={list}
                  categories={categories}
                  wcSettings={wcSettings}
                  originDrag={originDrag}
                  onOpenCard={onOpenCard}
                  onOpenCardById={onOpenCardById}
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
                        border: (hasBg || boardHasBg) ? '1.5px dashed rgba(255,255,255,0.35)' : '1.5px dashed var(--mantine-color-gray-4)',
                        borderRadius: 8,
                        padding: 8,
                        background: (hasBg || boardHasBg) ? 'rgba(0,0,0,0.2)' : undefined,
                        backdropFilter: (hasBg || boardHasBg) ? 'blur(8px)' : undefined,
                        WebkitBackdropFilter: (hasBg || boardHasBg) ? 'blur(8px)' : undefined,
                      }
                    : { paddingTop: 4 }
                }
              >
                <InlineAdd
                  label={group.lists.length === 0 ? 'Drop a list here, or add one' : 'Add list'}
                  placeholder="List title"
                  onAdd={(v) => onAddList(group.id, v)}
                  glass={hasBg || boardHasBg}
                />
              </Box>
            </Group>
          </SortableContext>
        </div>
      </ScrollArea>

      {/* Unsplash attribution (required when displaying their photos). */}
      {hasBg && credit && (
        <Text size="10px" c="white" mt={4} style={{ textShadow: '0 1px 2px rgba(0,0,0,0.7)' }}>
          Photo by{' '}
          <Anchor href={credit.link} target="_blank" rel="noopener noreferrer" inherit underline="always">
            {credit.name}
          </Anchor>{' '}
          on Unsplash
        </Text>
      )}

      <UnsplashPicker
        opened={bgOpened}
        onClose={closeBg}
        onSelect={async (photo) => {
          await setGroupBackground(group.id, photo.fullUrl, photo.credit);
          router.refresh();
        }}
      />
    </Paper>
  );
}
