'use client';

import { memo, useEffect, useMemo, useRef } from 'react';
import { Paper, Group, Text, ActionIcon, Menu, ScrollArea, TextInput, Box, Anchor } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconGripVertical, IconDots, IconPencil, IconTrash, IconBook2, IconPhoto, IconPhotoOff } from '@tabler/icons-react';
import { useParams, useRouter } from 'next/navigation';
import UnsplashPicker from '@components/UnsplashPicker';
import { setGroupBackground } from '../../../_actions/writing_actions';
import { useSortable } from '@dnd-kit/sortable';
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable, type DraggableSyntheticListeners } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { animateLayoutChanges, sortableTransition } from './sortableConfig';
import ListColumn from './ListColumn';
import InlineAdd from './InlineAdd';
import { WordCountDisplay, sumGroupWords, type WordCountSettings } from '@components/WordCountDisplay';
import { promptWordGoal } from '@/utils/dialogs';
import { setGroupWordGoal, setGroupNotes } from '../../../_actions/writing_actions';
import NotesPopover from './NotesPopover';
import { useInlineRename } from './useInlineRename';
import type { BoardGroup, BoardCard, LabelCategory } from '../types';

type GroupCallbacks = {
  onOpenCard: (card: BoardCard) => void;
  onOpenCardById: (cardId: number) => void;
  onPeekCard?: (cardId: number) => void;
  onAddCard: (listId: number, title: string) => void;
  onAddList: (groupId: number, title: string) => void;
  onRenameList: (listId: number, title: string) => void;
  onDeleteList: (listId: number) => void;
  onRenameGroup: (groupId: number, title: string) => void;
  onDeleteGroup: (groupId: number) => void;
};

// All of the group's visible chrome (header/menu/word-count, the horizontally
// scrolling list row, the add-list zone). Split out and MEMOIZED for the same
// reason as CardFace / ListColumnInner: dnd-kit re-renders the sortable wrapper
// (GroupRow) on every genuine re-measure mid-drag, but this body only depends on
// referentially-stable data then, so React bails out of re-rendering the whole
// subtree — except the list SortableContext inside, which is a dnd context
// consumer and re-renders directly (memo bailouts don't block context). Net:
// the group's Menu/word-count/scroll chrome stays put; only the lists move.
const GroupRowInner = memo(function GroupRowInner({
  group,
  boardHasBg,
  categories,
  wcSettings,
  originDrag,
  setDropRef,
  setActivatorNodeRef,
  listeners,
  onOpenCard,
  onOpenCardById,
  onPeekCard,
  onAddCard,
  onAddList,
  onRenameList,
  onDeleteList,
  onRenameGroup,
  onDeleteGroup,
  themeVars,
  smartQuotes,
}: {
  group: BoardGroup;
  boardHasBg: boolean;
  categories: LabelCategory[];
  wcSettings: WordCountSettings;
  originDrag: { card: BoardCard; listId: number; index: number } | null;
  setDropRef: (el: HTMLElement | null) => void;
  setActivatorNodeRef: (el: HTMLElement | null) => void;
  listeners: DraggableSyntheticListeners;
  themeVars?: Record<string, string>;
  smartQuotes?: boolean | null;
} & GroupCallbacks) {
  const { editing, setEditing, inputProps: titleInputProps } = useInlineRename({
    value: group.title,
    onCommit: (next) => onRenameGroup(group.id, next),
  });
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

  // Referentially stable across drag-over ticks (see BoardView's groupIds):
  // a new array ref here would make this group's list SortableContext broadcast
  // and re-render every ListColumn in the group even when nothing reordered.
  const listIdKey = group.lists.map((l) => l.id).join(',');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const listIds = useMemo(() => group.lists.map((l) => `list:${l.id}`), [listIdKey]);

  // Word-count sum only needs to be recomputed when the group's lists/cards change.
  const groupWordCount = useMemo(() => sumGroupWords(group), [group]);

  return (
    <>
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
              {...titleInputProps}
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
              count={groupWordCount}
              goal={group.wordCountGoal ?? wcSettings.defaultGroupGoal}
              mode={wcSettings.mode}
              light={hasBg}
            />
          )}
        </Group>

        <NotesPopover
          notes={group.notes}
          onSave={async (html) => { await setGroupNotes(group.id, html); router.refresh(); }}
          smartQuotes={smartQuotes}
          light={hasBg}
          themeVars={themeVars}
        />

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
              {group.wordCountGoal ? 'Update word goal…' : 'Set word goal…'}
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
                  onPeekCard={onPeekCard}
                  onAddCard={onAddCard}
                  onRename={onRenameList}
                  onDelete={onDeleteList}
                  themeVars={themeVars}
                  smartQuotes={smartQuotes}
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
    </>
  );
});

// Thin sortable wrapper: holds the dnd-kit hooks and the outer Paper (the node
// that gets the drag transform + photo/scrim background + attributes). dnd-kit
// re-renders this on every re-measure mid-drag, but the heavy body lives in the
// memoized GroupRowInner above, so those re-renders are cheap. BoardView keeps a
// group's object identity when its contents didn't change, so an untouched group
// skips re-rendering entirely.
function GroupRow({
  group,
  boardHasBg,
  categories,
  wcSettings,
  originDrag,
  onOpenCard,
  onOpenCardById,
  onPeekCard,
  onAddCard,
  onAddList,
  onRenameList,
  onDeleteList,
  onRenameGroup,
  onDeleteGroup,
  themeVars,
  smartQuotes,
}: {
  group: BoardGroup;
  boardHasBg: boolean;
  categories: LabelCategory[];
  wcSettings: WordCountSettings;
  originDrag: { card: BoardCard; listId: number; index: number } | null;
  themeVars?: Record<string, string>;
  smartQuotes?: boolean | null;
} & GroupCallbacks) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: `group:${group.id}`, data: { type: 'group', group }, animateLayoutChanges, transition: sortableTransition });

  // Droppable zone so lists can be dropped into this group (even when empty).
  const { setNodeRef: setDropRef } = useDroppable({ id: `groupzone:${group.id}`, data: { type: 'groupzone', groupId: group.id } });

  const hasBg = !!group.backgroundImage;          // group has its own photo background
  const onBoardBg = boardHasBg && !hasBg;         // sits on the board's background, no photo of its own

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    // Shadow is a pure addition (there was no elevation styling before) —
    // applies regardless of photo state, so it's independent of the
    // background branching below.
    boxShadow: 'var(--theme-group-shadow, none)',
    // A light scrim over the photo keeps list columns + header text readable.
    ...(hasBg
      ? {
          backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.14), rgba(0, 0, 0, 0.15)), url(${group.backgroundImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'top center',
        }
      : {}),
  };

  // Ghost placeholder — dashed outline the same width as the real group.
  if (isDragging) {
    return (
      <Paper
        ref={setNodeRef}
        style={{ ...style, borderStyle: 'dashed' }}
        withBorder
        radius="md"
        p="sm"
        bg="var(--theme-group-bg, light-dark(var(--mantine-color-gray-1), var(--mantine-color-dark-5)))"
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
      style={{
        ...style,
        // Border color only matters when withBorder is on (the plain,
        // no-photo case) — themed, falling back to Mantine's own default.
        ...(!hasBg && !onBoardBg ? { borderColor: 'var(--theme-group-border, var(--mantine-color-default-border))' } : {}),
      }}
      withBorder={!hasBg && !onBoardBg}
      radius="md"
      p={hasBg ? 'lg' : 'sm'}
      bg={
        hasBg
          ? undefined
          : onBoardBg
            ? 'light-dark(rgba(255, 255, 255, 0.33), rgba(0,0,0,0.45))'
            : 'var(--theme-group-bg, light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-7)))'
      }
      {...attributes}
    >
      <GroupRowInner
        group={group}
        boardHasBg={boardHasBg}
        categories={categories}
        wcSettings={wcSettings}
        originDrag={originDrag}
        setDropRef={setDropRef}
        setActivatorNodeRef={setActivatorNodeRef}
        listeners={listeners}
        onOpenCard={onOpenCard}
        onOpenCardById={onOpenCardById}
        onPeekCard={onPeekCard}
        onAddCard={onAddCard}
        onAddList={onAddList}
        onRenameList={onRenameList}
        onDeleteList={onDeleteList}
        onRenameGroup={onRenameGroup}
        onDeleteGroup={onDeleteGroup}
        themeVars={themeVars}
        smartQuotes={smartQuotes}
      />
    </Paper>
  );
}

export default memo(GroupRow);
