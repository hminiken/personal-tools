'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Box, Paper, Group, Stack, Text, Title, Button, Anchor, Drawer, ActionIcon, Divider, Tooltip,
  SegmentedControl, NumberInput, useMantineColorScheme, useComputedColorScheme,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconArrowLeft, IconLayoutBoard, IconBook2, IconTags, IconSettings, IconFileExport, IconSun, IconMoon, IconFolders } from '@tabler/icons-react';
import Link from 'next/link';
import UnsplashPicker from '@components/UnsplashPicker';
import { useRouter } from 'next/navigation';
import {
  DndContext, DragOverlay, PointerSensor, TouchSensor, useSensor, useSensors,
  closestCorners, pointerWithin, MeasuringStrategy,
  type DragStartEvent, type DragOverEvent, type DragEndEvent, type CollisionDetection,
} from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import GroupRow from './GroupRow';
import { CardFace } from './CardItem';
import BoardTabs from './BoardTabs';
import CardEditorModal from './CardEditorModal';
import ManageLabelsModal from './ManageLabelsModal';
import InlineAdd from './InlineAdd';
import FileBrowserView from './file-browser/FileBrowserView';
import { DocumentSpacingMenu, type Spacing } from '@components/DocumentSpacing';
import { WordCountDisplay, sumBoardWords, type WordCountSettings, type WordCountMode } from '@components/WordCountDisplay';
import { confirmAction, promptText, promptWordGoal } from '@/utils/dialogs';
import type { Board, BoardGroup, BoardCard, BoardList, LabelCatalog } from '../types';
import {
  createBoard, renameBoard, deleteBoard,
  createGroup, renameGroup, deleteGroup, moveGroup,
  createList, renameList, deleteList, moveList,
  createCard, moveCard, setBoardSpacing, setBoardBackground, getCardById,
  updateWritingSettings, setBoardWordGoal,
} from '../../../_actions/writing_actions';

// ---------- id helpers ----------
type IdType = 'card' | 'list' | 'group' | 'listzone' | 'groupzone';
function parseId(id: string | number): { type: IdType; num: number } {
  const [type, raw] = String(id).split(':');
  return { type: type as IdType, num: Number(raw) };
}

// midpoint position between two neighbours (or edge handling)
function midpoint(prev?: number, next?: number): number {
  if (prev != null && next != null) return (prev + next) / 2;
  if (next != null) return next - 1;
  if (prev != null) return prev + 1;
  return 1;
}

// ---------- tree lookups (operate on plain nested arrays) ----------
const listIdOfCard = (gs: BoardGroup[], cardId: number) => {
  for (const g of gs) for (const l of g.lists) if (l.cards.some((c) => c.id === cardId)) return l.id;
  return null;
};
const groupIdOfList = (gs: BoardGroup[], listId: number) => {
  for (const g of gs) if (g.lists.some((l) => l.id === listId)) return g.id;
  return null;
};
const findList = (gs: BoardGroup[], listId: number) => {
  for (const g of gs) { const l = g.lists.find((x) => x.id === listId); if (l) return l; }
  return null;
};

export default function BoardView({
  projectId,
  projectTitle,
  projectWordCount,
  projectWordGoal,
  backUrl,
  boards,
  activeBoardId,
  initialGroups,
  catalog,
  wcSettings: initialWcSettings,
}: {
  projectId: number;
  projectTitle: string;
  projectWordCount: number;
  projectWordGoal: number | null;
  backUrl: string;
  boards: Board[];
  activeBoardId: number;
  initialGroups: BoardGroup[];
  catalog: LabelCatalog;
  wcSettings: WordCountSettings;
}) {
  const router = useRouter();
  const [groups, setGroups] = useState<BoardGroup[]>(initialGroups);
  const [activeDrag, setActiveDrag] = useState<
    | { type: 'card'; card: BoardCard }
    | { type: 'list'; list: BoardList }
    | { type: 'group'; group: BoardGroup }
    | null
  >(null);
  const [originDrag, setOriginDrag] = useState<{ card: BoardCard; listId: number; index: number } | null>(null);
  const activeTypeRef = useRef<IdType | null>(null);
  // Skip processing the same over-target twice in a row (dnd-kit can fire
  // multiple onDragOver events for the same droppable without the cursor moving).
  const lastOverRef = useRef<string | number | null>(null);

  // Kanban board vs. file-browser view.
  const [viewMode, setViewMode] = useState<'kanban' | 'files'>('kanban');

  // Card editor
  const [editingCard, setEditingCard] = useState<BoardCard | null>(null);
  const [editorOpened, { open: openEditor, close: closeEditor }] = useDisclosure(false);

  // Label manager
  const [labelsOpened, { open: openLabels, close: closeLabels }] = useDisclosure(false);

  // Board background (Unsplash) picker.
  const [bgOpened, { open: openBg, close: closeBg }] = useDisclosure(false);

  // Settings drawer (slides in from the right) holding the board-level controls.
  const [settingsOpened, { open: openSettings, close: closeSettings }] = useDisclosure(false);

  // The Writing Desk hides the site's top bar (see NavigationShell), so the
  // dark mode toggle lives here instead.
  const { setColorScheme } = useMantineColorScheme();
  const computedColorScheme = useComputedColorScheme('light', { getInitialValueInEffect: true });

  // Document-wide prose spacing (stored on the active board).
  const activeBoard = boards.find((b) => b.id === activeBoardId);
  const boardBg = activeBoard?.backgroundImage ?? null;
  const boardCredit = activeBoard?.backgroundCredit
    ? (JSON.parse(activeBoard.backgroundCredit) as { name: string; link: string })
    : null;
  const [spacing, setSpacing] = useState<Spacing>({
    lineHeight: activeBoard?.lineHeight ?? null,
    spaceBefore: activeBoard?.spaceBefore ?? null,
    spaceAfter: activeBoard?.spaceAfter ?? null,
  });
  const handleSpacing = (next: Spacing) => {
    setSpacing(next);
    setBoardSpacing(activeBoardId, next);
  };

  // Global word-count display settings + default goals (singleton row).
  // Optimistic local copy, same pattern as spacing above.
  const [wcSettings, setWcSettings] = useState<WordCountSettings>(initialWcSettings);
  const handleWcSettings = (patch: {
    wordCountDisplayMode?: WordCountMode;
    defaultCardWordGoal?: number | null;
    defaultListWordGoal?: number | null;
    defaultGroupWordGoal?: number | null;
  }) => {
    setWcSettings((prev) => ({
      mode: patch.wordCountDisplayMode ?? prev.mode,
      defaultCardGoal: patch.defaultCardWordGoal !== undefined ? patch.defaultCardWordGoal : prev.defaultCardGoal,
      defaultListGoal: patch.defaultListWordGoal !== undefined ? patch.defaultListWordGoal : prev.defaultListGoal,
      defaultGroupGoal: patch.defaultGroupWordGoal !== undefined ? patch.defaultGroupWordGoal : prev.defaultGroupGoal,
    }));
    updateWritingSettings(patch);
  };

  const boardWordCount = sumBoardWords(groups);

  const onSetBoardWordGoal = async () => {
    const goal = await promptWordGoal({ title: 'Board word count goal', initialValue: activeBoard?.wordCountGoal });
    if (goal === undefined) return;
    await setBoardWordGoal(activeBoardId, goal);
    router.refresh();
  };

  // Adopt fresh server data whenever the route re-renders (after an action).
  useEffect(() => { setGroups(initialGroups); }, [initialGroups]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
  );

  // Pointer-first collision detection. closestCorners alone fails to target a
  // SHORT empty group sitting between tall populated groups (a neighbour's tall
  // list column has closer corners). So we ask "is the cursor actually inside a
  // droppable?" first, then prefer the most specific valid target for the type
  // being dragged (a card/list for precise index; otherwise the container, which
  // is what makes dropping into an EMPTY group/list work).
  const collisionDetection = useCallback<CollisionDetection>((args) => {
    const at = activeTypeRef.current;
    const valid = (id: string | number) => {
      const t = String(id).split(':')[0];
      if (at === 'card') return t === 'card' || t === 'listzone';
      if (at === 'list') return t === 'list' || t === 'groupzone' || t === 'group';
      if (at === 'group') return t === 'group';
      return true;
    };
    const filtered = { ...args, droppableContainers: args.droppableContainers.filter((c) => valid(c.id)) };
    const collisions = pointerWithin(filtered);
    const hits = collisions.length ? collisions : closestCorners(filtered);
    const pick = (...prefixes: string[]) =>
      hits.find((c) => prefixes.some((p) => String(c.id).startsWith(p)));

    if (at === 'list') {
      const hit = pick('list:') || pick('group:', 'groupzone:');
      return hit ? [hit] : hits;
    }
    if (at === 'card') {
      const hit = pick('card:') || pick('listzone:');
      return hit ? [hit] : hits;
    }
    return hits;
  }, []);

  // ---------- drag handlers ----------
  function handleDragStart(e: DragStartEvent) {
    lastOverRef.current = null;
    const { type, num } = parseId(e.active.id);
    activeTypeRef.current = type;
    if (type === 'card') {
      for (const g of groups) for (const l of g.lists) {
        const i = l.cards.findIndex((x) => x.id === num);
        if (i !== -1) {
          setActiveDrag({ type: 'card', card: l.cards[i] });
          setOriginDrag({ card: l.cards[i], listId: l.id, index: i });
          return;
        }
      }
    } else if (type === 'list') {
      for (const g of groups) {
        const l = g.lists.find((x) => x.id === num);
        if (l) { setActiveDrag({ type: 'list', list: l }); return; }
      }
    } else if (type === 'group') {
      const g = groups.find((x) => x.id === num);
      if (g) setActiveDrag({ type: 'group', group: g });
    }
  }

  function handleDragOver(e: DragOverEvent) {
    const { over, active } = e;
    if (!over) return;
    const a = parseId(active.id);
    const o = parseId(over.id);

    // Card hovering into a different list -> relocate in local state.
    if (a.type === 'card') {
      const fromListId = listIdOfCard(groups, a.num);
      let toListId: number | null = null;
      let toIndex = 0;
      if (o.type === 'card') {
        toListId = listIdOfCard(groups, o.num);
        const tl = toListId != null ? findList(groups, toListId) : null;
        toIndex = tl ? tl.cards.findIndex((c) => c.id === o.num) : 0;
      } else if (o.type === 'listzone' || o.type === 'list') {
        toListId = o.num;
        toIndex = findList(groups, toListId)?.cards.length ?? 0;
      }
      if (fromListId == null || toListId == null || fromListId === toListId) return;
      if (over.id === lastOverRef.current) return;
      lastOverRef.current = over.id;

      setGroups((prev) => {
        // Remove from whichever list currently holds the card.
        let moved: BoardCard | undefined;
        const afterRemove = prev.map((g) => {
          const lists = g.lists.map((l) => {
            if (moved !== undefined) return l;
            const ci = l.cards.findIndex((c) => c.id === a.num);
            if (ci === -1) return l;
            moved = l.cards[ci];
            const cards = [...l.cards];
            cards.splice(ci, 1);
            return { ...l, cards };
          });
          return lists.some((l, i) => l !== g.lists[i]) ? { ...g, lists } : g;
        });
        if (!moved) return prev;
        // Insert into the target list.
        return afterRemove.map((g) => {
          const lists = g.lists.map((l) => {
            if (l.id !== toListId) return l;
            const idx = Math.min(Math.max(toIndex, 0), l.cards.length);
            const cards = [...l.cards];
            cards.splice(idx, 0, moved!);
            return { ...l, cards };
          });
          return lists.some((l, i) => l !== g.lists[i]) ? { ...g, lists } : g;
        });
      });
      return;
    }

    // List hovering into a different group -> relocate in local state.
    if (a.type === 'list') {
      const fromGroupId = groupIdOfList(groups, a.num);
      let toGroupId: number | null = null;
      let toIndex = 0;
      if (o.type === 'list') {
        toGroupId = groupIdOfList(groups, o.num);
        const tg = toGroupId != null ? groups.find((g) => g.id === toGroupId) : null;
        toIndex = tg ? tg.lists.findIndex((l) => l.id === o.num) : 0;
      } else if (o.type === 'groupzone' || o.type === 'group') {
        toGroupId = o.num;
        toIndex = groups.find((g) => g.id === toGroupId)?.lists.length ?? 0;
      }
      if (fromGroupId == null || toGroupId == null || fromGroupId === toGroupId) return;
      if (over.id === lastOverRef.current) return;
      lastOverRef.current = over.id;

      setGroups((prev) => {
        let moved: BoardList | undefined;
        const afterRemove = prev.map((g) => {
          if (g.id !== fromGroupId) return g;
          const i = g.lists.findIndex((l) => l.id === a.num);
          if (i === -1) return g;
          moved = g.lists[i];
          const lists = [...g.lists];
          lists.splice(i, 1);
          return { ...g, lists };
        });
        if (!moved) return prev;
        return afterRemove.map((g) => {
          if (g.id !== toGroupId) return g;
          const idx = Math.min(Math.max(toIndex, 0), g.lists.length);
          const lists = [...g.lists];
          lists.splice(idx, 0, moved!);
          return { ...g, lists };
        });
      });
    }
  }

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    setActiveDrag(null);
    setOriginDrag(null);
    activeTypeRef.current = null;
    lastOverRef.current = null;
    if (!over) return;
    const a = parseId(active.id);
    const o = parseId(over.id);

    // ----- GROUP reorder -----
    if (a.type === 'group') {
      const oldIndex = groups.findIndex((g) => g.id === a.num);
      const overGroupId = o.type === 'group' || o.type === 'groupzone' ? o.num : null;
      if (overGroupId == null) return;
      const newIndex = groups.findIndex((g) => g.id === overGroupId);
      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;
      const reordered = arrayMove(groups, oldIndex, newIndex);
      setGroups(reordered);
      const pos = midpoint(reordered[newIndex - 1]?.position, reordered[newIndex + 1]?.position);
      moveGroup(a.num, pos);
      return;
    }

    // ----- LIST reorder (within its now-current group) -----
    if (a.type === 'list') {
      const groupId = groupIdOfList(groups, a.num);
      if (groupId == null) return;
      const grp = groups.find((g) => g.id === groupId)!;
      const oldIndex = grp.lists.findIndex((l) => l.id === a.num);
      let newIndex = o.type === 'list' ? grp.lists.findIndex((l) => l.id === o.num) : grp.lists.length - 1;
      if (newIndex < 0) newIndex = grp.lists.length - 1;
      let finalGroups = groups;
      if (oldIndex !== newIndex && oldIndex !== -1) {
        const newLists = arrayMove(grp.lists, oldIndex, newIndex);
        finalGroups = groups.map((g) => (g.id === groupId ? { ...g, lists: newLists } : g));
        setGroups(finalGroups);
      }
      const fg = finalGroups.find((g) => g.id === groupId)!;
      const idx = fg.lists.findIndex((l) => l.id === a.num);
      const pos = midpoint(fg.lists[idx - 1]?.position, fg.lists[idx + 1]?.position);
      moveList(a.num, groupId, pos);
      return;
    }

    // ----- CARD reorder (within its now-current list) -----
    if (a.type === 'card') {
      const listId = listIdOfCard(groups, a.num);
      if (listId == null) return;
      const list = findList(groups, listId)!;
      const oldIndex = list.cards.findIndex((c) => c.id === a.num);
      let newIndex: number;
      if (o.type === 'card' && listIdOfCard(groups, o.num) === listId) {
        newIndex = list.cards.findIndex((c) => c.id === o.num);
      } else {
        newIndex = list.cards.length - 1;
      }
      if (newIndex < 0) newIndex = list.cards.length - 1;
      let finalGroups = groups;
      if (oldIndex !== newIndex && oldIndex !== -1) {
        const newCards = arrayMove(list.cards, oldIndex, newIndex);
        finalGroups = groups.map((g) => ({
          ...g,
          lists: g.lists.map((l) => (l.id === listId ? { ...l, cards: newCards } : l)),
        }));
        setGroups(finalGroups);
      }
      const fl = findList(finalGroups, listId)!;
      const idx = fl.cards.findIndex((c) => c.id === a.num);
      const pos = midpoint(fl.cards[idx - 1]?.position, fl.cards[idx + 1]?.position);
      moveCard(a.num, listId, pos);
    }
  }

  // ---------- mutation handlers (server actions + refresh) ----------
  const refresh = () => router.refresh();
  const onAddGroup = async (title: string) => { await createGroup(activeBoardId, title); refresh(); };
  const onAddList = async (groupId: number, title: string) => { await createList(groupId, title); refresh(); };
  const onAddCard = async (listId: number, title: string) => { await createCard(listId, title); refresh(); };
  const onRenameGroup = async (groupId: number, title: string) => { await renameGroup(groupId, title); refresh(); };
  const onDeleteGroup = async (groupId: number) => { if (await confirmAction({ title: 'Delete group', message: 'Delete this group and everything in it?' })) { await deleteGroup(groupId); refresh(); } };
  const onRenameList = async (listId: number, title: string) => { await renameList(listId, title); refresh(); };
  const onDeleteList = async (listId: number) => { if (await confirmAction({ title: 'Delete list', message: 'Delete this list and its cards?' })) { await deleteList(listId); refresh(); } };

  const onOpenCard = (card: BoardCard) => { setEditingCard(card); openEditor(); };

  // Open a card by ID — checks the current board first, falls back to a server fetch
  // for linked cards that live on a different board.
  const onOpenCardById = async (cardId: number) => {
    for (const g of groups) {
      for (const l of g.lists) {
        const found = l.cards.find((c) => c.id === cardId);
        if (found) { onOpenCard(found); return; }
      }
    }
    const fetched = await getCardById(cardId);
    if (fetched) { setEditingCard(fetched as BoardCard); openEditor(); }
  };

  // ---------- board (tab) handlers ----------
  const onAddBoard = async () => {
    const name = (await promptText({ title: 'New board', label: 'Board name' }))?.trim();
    if (!name) return;
    const id = await createBoard(projectId, name);
    if (id) router.push(`/writing/${projectId}/${id}`);
  };
  const onRenameBoard = async () => {
    const current = boards.find((b) => b.id === activeBoardId);
    const name = (await promptText({ title: 'Rename board', label: 'Board name', initialValue: current?.title }))?.trim();
    if (name) { await renameBoard(activeBoardId, name); refresh(); }
  };
  const onRemoveBackground = async () => {
    await setBoardBackground(activeBoardId, null, null);
    router.refresh();
  };

  const onDeleteBoard = async () => {
    if (!(await confirmAction({ title: 'Delete board', message: 'Delete this entire board?' }))) return;
    await deleteBoard(activeBoardId);
    const remaining = boards.filter((b) => b.id !== activeBoardId);
    if (remaining.length) router.push(`/writing/${projectId}/${remaining[0].id}`);
    else router.push(`/writing/${projectId}`);
  };

  const groupIds = groups.map((g) => `group:${g.id}`);

  return (
    <Box
      mx={boardBg ? { base: '-xs', sm: '-xl' } : undefined}
      mt={boardBg ? '-md' : undefined}
      px={boardBg ? { base: 'xs', sm: 'xl' } : undefined}
      py={boardBg ? 'md' : undefined}
      style={
        boardBg
          ? {
              backgroundImage: `linear-gradient(rgba(0,0,0,0.18), rgba(0,0,0,0.18)), url(${boardBg})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundAttachment: 'fixed',
              minHeight: '100vh',
            }
          : undefined
      }
    >
      {/* Header */}
      <Group justify="space-between" mb="sm" mt={'10px'} wrap="nowrap">
        <Group gap="xs" wrap="nowrap" style={{ minWidth: 0 }}>
          <Button
            component={Link}
            href={backUrl}
            variant="subtle"
            color="gray"
            size="compact-sm"
            leftSection={<IconArrowLeft size={16} />}
            style={boardBg ? { color: 'rgba(255,255,255,0.9)', textShadow: '0 1px 2px rgba(0,0,0,0.4)' } : undefined}
          >
            Projects
          </Button>
          <IconLayoutBoard size={20} stroke={1.5} style={boardBg ? { color: 'white', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.4))' } : undefined} />
          <Title order={4} lineClamp={1} style={boardBg ? { color: 'white', textShadow: '0 1px 3px rgba(0,0,0,0.4)' } : undefined}>{projectTitle}</Title>
        </Group>
        <Group gap="xs" wrap="nowrap">
          <SegmentedControl
            size="xs"
            color="dark"
            value={viewMode}
            onChange={(v) => setViewMode(v as 'kanban' | 'files')}
            data={[
              { value: 'kanban', label: <IconLayoutBoard size={16} style={{ display: 'block' }} /> },
              { value: 'files', label: <IconFolders size={16} style={{ display: 'block' }} /> },
            ]}
            style={boardBg ? { background: 'rgba(0,0,0,0.20)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.18)' } : undefined}
          />
          <Tooltip label="Board settings" withArrow>
            <ActionIcon
              variant="light"
              color="gray"
              size="lg"
              onClick={openSettings}
              aria-label="Board settings"
              style={boardBg ? { color: '#fff', background: 'rgba(0,0,0,0.20)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.18)' } : undefined}
            >
              <IconSettings size={20} stroke={1.5} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Group>

      {/* Word count rollups: project total, then this board's total. */}
      {wcSettings.mode !== 'off' && (
        <Group gap="lg" mb="sm" wrap="wrap">
          <Group gap={6} wrap="nowrap">
            <Text size="xs" c={boardBg ? 'gray.3' : 'dimmed'} fw={600}>Project</Text>
            <WordCountDisplay count={projectWordCount} goal={projectWordGoal} mode={wcSettings.mode} light={!!boardBg} />
          </Group>
          <Group gap={6} wrap="nowrap">
            <Text size="xs" c={boardBg ? 'gray.3' : 'dimmed'} fw={600}>Board</Text>
            <WordCountDisplay count={boardWordCount} goal={activeBoard?.wordCountGoal ?? null} mode={wcSettings.mode} light={!!boardBg} />
          </Group>
        </Group>
      )}

      {/* Board tabs (reorderable) */}
      <BoardTabs
        projectId={projectId}
        boards={boards}
        activeBoardId={activeBoardId}
        onAddBoard={onAddBoard}
        onSetWordGoal={onSetBoardWordGoal}
        onRenameBoard={onRenameBoard}
        onDeleteBoard={onDeleteBoard}
        hasBg={!!boardBg}
        onSetBackground={openBg}
        onRemoveBackground={onRemoveBackground}
      />

      {/* Board body: groups + drag context (Kanban view) */}
      {viewMode === 'kanban' && (
      <Box>
      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        measuring={{ droppable: { strategy: MeasuringStrategy.Always, frequency: 100 } }}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={groupIds} strategy={verticalListSortingStrategy}>
          <Stack gap="md">
            {groups.map((group) => (
              <GroupRow
                key={group.id}
                group={group}
                boardHasBg={!!boardBg}
                categories={catalog.categories}
                wcSettings={wcSettings}
                originDrag={originDrag}
                onOpenCard={onOpenCard}
                onOpenCardById={onOpenCardById}
                onAddCard={onAddCard}
                onAddList={onAddList}
                onRenameList={onRenameList}
                onDeleteList={onDeleteList}
                onRenameGroup={onRenameGroup}
                onDeleteGroup={onDeleteGroup}
              />
            ))}
          </Stack>
        </SortableContext>

        {/* dropAnimation=null: the real item is already placed optimistically at
            the drop target, so the overlay just fades out instead of flying to a
            position that doesn't match (which read as a "pop"). */}
        <DragOverlay dropAnimation={null}>
          {activeDrag?.type === 'card' ? (
            <Paper
              withBorder
              shadow="xl"
              radius="sm"
              p={activeDrag.card.isImageCard && (activeDrag.card.coverImage ?? activeDrag.card.imagePath) ? 0 : 'xs'}
              w={248}
              style={{
                transform: 'rotate(2deg)',
                cursor: 'grabbing',
                overflow: activeDrag.card.isImageCard ? 'hidden' : undefined,
              }}
            >
              <CardFace card={activeDrag.card} categories={catalog.categories} />
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
      </DndContext>

      {/* Add group */}
      <Box mt="md" maw={360}>
        <InlineAdd label="Add group" placeholder="Group name" onAdd={onAddGroup} glass={!!boardBg} />
      </Box>

      {/* Unsplash attribution (required when displaying their photos). */}
      {boardBg && boardCredit && (
        <Text size="xs" c="white" mt="sm" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.7)' }}>
          Photo by{' '}
          <Anchor href={boardCredit.link} target="_blank" rel="noopener noreferrer" inherit underline="always">
            {boardCredit.name}
          </Anchor>{' '}
          on Unsplash
        </Text>
      )}
      </Box>
      )}

      {/* File browser view: same board data, folder/file navigation. */}
      {viewMode === 'files' && (
        <FileBrowserView
          projectId={projectId}
          boardTitle={activeBoard?.title ?? 'Board'}
          groups={groups}
          catalog={catalog}
          wcSettings={wcSettings}
          spacing={spacing}
          hasBg={!!boardBg}
          onManageLabels={openLabels}
        />
      )}

      {/* Settings drawer: slides in from the right with the board controls. */}
      <Drawer
        opened={settingsOpened}
        onClose={closeSettings}
        position="right"
        title="Board settings"
        size="sm"
        padding="md"
      >
        <Stack gap="lg">
          {/* Appearance — the top bar's toggle lives here since it's hidden in the Writing Desk. */}
          <Group justify="space-between">
            <Text size="sm" fw={600}>Dark mode</Text>
            <ActionIcon
              onClick={() => setColorScheme(computedColorScheme === 'light' ? 'dark' : 'light')}
              variant="default"
              size="lg"
              aria-label="Toggle color scheme"
            >
              <IconSun stroke={1.5} className="mantine-light-hidden" />
              <IconMoon stroke={1.5} className="mantine-dark-hidden" />
            </ActionIcon>
          </Group>

          <Divider />

          {/* Word count (applies to every project/board in the Writing Desk) */}
          <div>
            <Text size="sm" fw={600} mb="xs">Word count display</Text>
            <SegmentedControl
              fullWidth
              size="xs"
              value={wcSettings.mode}
              onChange={(v) => handleWcSettings({ wordCountDisplayMode: v as WordCountMode })}
              data={[
                { label: 'Off', value: 'off' },
                { label: 'Progress bar', value: 'bar' },
                { label: 'Text', value: 'text' },
              ]}
            />
            <Text size="xs" c="dimmed" mt="md" mb={4}>Default goals (cards/lists/groups can override)</Text>
            <Stack gap="xs">
              <NumberInput
                label="Card"
                placeholder="No default"
                size="xs"
                min={0}
                value={wcSettings.defaultCardGoal ?? ''}
                onChange={(v) => handleWcSettings({ defaultCardWordGoal: v === '' ? null : Number(v) })}
              />
              <NumberInput
                label="List"
                placeholder="No default"
                size="xs"
                min={0}
                value={wcSettings.defaultListGoal ?? ''}
                onChange={(v) => handleWcSettings({ defaultListWordGoal: v === '' ? null : Number(v) })}
              />
              <NumberInput
                label="Group"
                placeholder="No default"
                size="xs"
                min={0}
                value={wcSettings.defaultGroupGoal ?? ''}
                onChange={(v) => handleWcSettings({ defaultGroupWordGoal: v === '' ? null : Number(v) })}
              />
            </Stack>
          </div>

          <Divider />

          {/* Prose spacing */}
          <div>
            <Text size="sm" fw={600} mb="xs">Spacing</Text>
            <DocumentSpacingMenu value={spacing} onChange={handleSpacing} />
          </div>

          <Divider />

          {/* Labels + compile */}
          <Button
            variant="light"
            color="gray"
            leftSection={<IconTags size={16} />}
            onClick={() => { closeSettings(); openLabels(); }}
            fullWidth
          >
            Manage labels
          </Button>
          <Button
            component={Link}
            href={`/writing/${projectId}/${activeBoardId}/compile/board/${activeBoardId}`}
            variant="light"
            color="gray"
            leftSection={<IconBook2 size={16} />}
            fullWidth
          >
            Compile board
          </Button>
          <Button
            component={Link}
            href={`/writing/${projectId}/export/epub?board=${activeBoardId}`}
            variant="light"
            color="gray"
            leftSection={<IconFileExport size={16} />}
            fullWidth
          >
            Export (epub / docx)
          </Button>
        </Stack>
      </Drawer>

      <UnsplashPicker
        opened={bgOpened}
        onClose={closeBg}
        onSelect={async (photo) => {
          await setBoardBackground(activeBoardId, photo.fullUrl, photo.credit);
          router.refresh();
        }}
      />

      <CardEditorModal
        card={editingCard}
        catalog={catalog}
        opened={editorOpened}
        onClose={closeEditor}
        onManageLabels={openLabels}
        spacing={spacing}
        projectId={projectId}
        wcSettings={wcSettings}
      />

      <ManageLabelsModal
        projectId={projectId}
        catalog={catalog}
        opened={labelsOpened}
        onClose={closeLabels}
      />
    </Box>
  );
}
