'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Box, Group, Stack, Text, Title, Button, Anchor, ActionIcon, Tooltip, SegmentedControl,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconArrowLeft, IconLayoutBoard, IconSettings, IconFolders } from '@tabler/icons-react';
import Link from 'next/link';
import UnsplashPicker from '@components/UnsplashPicker';
import { useRouter } from 'next/navigation';
import { DndContext, MeasuringStrategy } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import GroupRow from './GroupRow';
import BoardTabs from './BoardTabs';
import CardEditorModal from './CardEditorModal';
import ManageLabelsModal from './ManageLabelsModal';
import InlineAdd from './InlineAdd';
import FileBrowserView from './file-browser/FileBrowserView';
import BoardSettingsDrawer from './BoardSettingsDrawer';
import BoardDragOverlay from './BoardDragOverlay';
import { useBoardDnd } from './useBoardDnd';
import { glassStyle } from './glass';
import { type Spacing } from '@components/DocumentSpacing';
import { WordCountDisplay, sumBoardWords, type WordCountSettings, type WordCountMode } from '@components/WordCountDisplay';
import { confirmAction, promptText, promptWordGoal } from '@/utils/dialogs';
import type { Board, BoardGroup, BoardCard, LabelCatalog } from '../types';
import {
  createBoard, renameBoard, deleteBoard,
  createGroup, renameGroup, deleteGroup,
  createList, renameList, deleteList,
  createCard, setBoardSpacing, setBoardBackground, getCardById,
  updateWritingSettings, setBoardWordGoal,
} from '../../../_actions/writing_actions';

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
  const { sensors, collisionDetection, activeDrag, originDrag, handleDragStart, handleDragOver, handleDragEnd } =
    useBoardDnd(groups, setGroups);

  // Kanban board vs. file-browser view — remembered per board, so switching
  // to another board and back restores whichever view this board was in.
  const [viewMode, setViewModeState] = useState<'kanban' | 'files'>('kanban');
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(`writing:boardView:${activeBoardId}`);
      setViewModeState(stored === 'files' ? 'files' : 'kanban');
    } catch { /* ignore */ }
  }, [activeBoardId]);
  const setViewMode = (v: 'kanban' | 'files') => {
    setViewModeState(v);
    try { window.localStorage.setItem(`writing:boardView:${activeBoardId}`, v); } catch { /* ignore */ }
  };

  // Card editor
  const [editingCard, setEditingCard] = useState<BoardCard | null>(null);
  const [editorOpened, { open: openEditor, close: closeEditor }] = useDisclosure(false);

  // Label manager
  const [labelsOpened, { open: openLabels, close: closeLabels }] = useDisclosure(false);

  // Board background (Unsplash) picker.
  const [bgOpened, { open: openBg, close: closeBg }] = useDisclosure(false);

  // Settings drawer (slides in from the right) holding the board-level controls.
  const [settingsOpened, { open: openSettings, close: closeSettings }] = useDisclosure(false);

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

  // Memoized: setGroups fires on every drag-over tick, and summing walks the
  // whole board tree — no need to redo it unless the tree actually changed.
  const boardWordCount = useMemo(() => sumBoardWords(groups), [groups]);

  const onSetBoardWordGoal = async () => {
    const goal = await promptWordGoal({ title: 'Board word count goal', initialValue: activeBoard?.wordCountGoal });
    if (goal === undefined) return;
    await setBoardWordGoal(activeBoardId, goal);
    router.refresh();
  };

  // Adopt fresh server data whenever the route re-renders (after an action).
  useEffect(() => { setGroups(initialGroups); }, [initialGroups]);

  // ---------- mutation handlers (server actions + refresh) ----------
  // All useCallback-stable: GroupRow/ListColumn/CardItem are memoized, so a
  // fresh callback identity each render would defeat the memo and re-render
  // the whole tree on every drag-over tick.
  const onAddGroup = useCallback(async (title: string) => { await createGroup(activeBoardId, title); router.refresh(); }, [activeBoardId, router]);
  const onAddList = useCallback(async (groupId: number, title: string) => { await createList(groupId, title); router.refresh(); }, [router]);
  const onAddCard = useCallback(async (listId: number, title: string) => { await createCard(listId, title); router.refresh(); }, [router]);
  const onRenameGroup = useCallback(async (groupId: number, title: string) => { await renameGroup(groupId, title); router.refresh(); }, [router]);
  const onDeleteGroup = useCallback(async (groupId: number) => { if (await confirmAction({ title: 'Delete group', message: 'Delete this group and everything in it?' })) { await deleteGroup(groupId); router.refresh(); } }, [router]);
  const onRenameList = useCallback(async (listId: number, title: string) => { await renameList(listId, title); router.refresh(); }, [router]);
  const onDeleteList = useCallback(async (listId: number) => { if (await confirmAction({ title: 'Delete list', message: 'Delete this list and its cards?' })) { await deleteList(listId); router.refresh(); } }, [router]);

  const onOpenCard = useCallback((card: BoardCard) => { setEditingCard(card); openEditor(); }, [openEditor]);

  // Open a card by ID — checks the current board first, falls back to a server
  // fetch for linked cards that live on a different board. Reads groups via a
  // ref so the callback stays identity-stable while groups change mid-drag.
  const groupsRef = useRef(groups);
  useEffect(() => { groupsRef.current = groups; }, [groups]);
  const onOpenCardById = useCallback(async (cardId: number) => {
    for (const g of groupsRef.current) {
      for (const l of g.lists) {
        const found = l.cards.find((c) => c.id === cardId);
        if (found) { onOpenCard(found); return; }
      }
    }
    const fetched = await getCardById(cardId);
    if (fetched) { setEditingCard(fetched as BoardCard); openEditor(); }
  }, [onOpenCard, openEditor]);

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
    if (name) { await renameBoard(activeBoardId, name); router.refresh(); }
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
            style={boardBg ? glassStyle : undefined}
          />
          <Tooltip label="Board settings" withArrow>
            <ActionIcon
              variant="light"
              color="gray"
              size="lg"
              onClick={openSettings}
              aria-label="Board settings"
              style={boardBg ? { color: '#fff', ...glassStyle } : undefined}
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

        <BoardDragOverlay activeDrag={activeDrag} categories={catalog.categories} />
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

      <BoardSettingsDrawer
        opened={settingsOpened}
        onClose={closeSettings}
        wcSettings={wcSettings}
        onWcSettings={handleWcSettings}
        spacing={spacing}
        onSpacing={handleSpacing}
        onManageLabels={openLabels}
        projectId={projectId}
        activeBoardId={activeBoardId}
      />

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
