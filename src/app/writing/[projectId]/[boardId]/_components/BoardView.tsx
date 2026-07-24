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
import { DndContext, MeasuringStrategy, MeasuringFrequency } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import GroupRow from './GroupRow';
import BoardTabs from './BoardTabs';
import CardEditorModal from './CardEditorModal';
import CharacterPeekDock, { type PeekWindowState } from './CharacterPeekDock';
import ManageLabelsModal from './ManageLabelsModal';
import ManageThemesModal from './ManageThemesModal';
import ImportTrelloModal from '../../../_components/ImportTrelloModal';
import InlineAdd from './InlineAdd';
import FileBrowserView from './file-browser/FileBrowserView';
import BoardSettingsDrawer from './BoardSettingsDrawer';
import BoardDragOverlay from './BoardDragOverlay';
import { useBoardDnd } from './useBoardDnd';
import { glassStyle, glassTextStyle } from './glass';
import { type Spacing } from '@components/DocumentSpacing';
import { WordCountDisplay, sumBoardWords, type WordCountSettings, type WordCountMode } from '@components/WordCountDisplay';
import { confirmAction, promptText, promptWordGoal } from '@/utils/dialogs';
import { themeVars, type WritingThemeDefinition } from '@/utils/writingTheme';
import type { Board, BoardGroup, BoardCard, LabelCatalog, WritingTheme } from '../types';
import {
  createBoard, renameBoard, deleteBoard,
  createGroup, renameGroup, deleteGroup,
  createList, renameList, deleteList,
  createCard, updateCard, deleteCard, setBoardSpacing, setBoardBackground, getCardById,
  updateWritingSettings, setBoardWordGoal, getBoardActivityStamp,
} from '../../../_actions/writing_actions';

// Reads the latest updatedAt across a board's own row plus everything nested
// under it — the client-side counterpart to getBoardActivityStamp's server
// query, computed for free from data BoardView already has in memory instead
// of a round-trip.
function latestActivityStamp(board: Board | undefined, groups: BoardGroup[]): number {
  let max = board?.updatedAt ? new Date(board.updatedAt).getTime() : 0;
  for (const g of groups) {
    if (g.updatedAt) max = Math.max(max, new Date(g.updatedAt).getTime());
    for (const l of g.lists) {
      if (l.updatedAt) max = Math.max(max, new Date(l.updatedAt).getTime());
      for (const c of l.cards) {
        if (c.updatedAt) max = Math.max(max, new Date(c.updatedAt).getTime());
      }
    }
  }
  return max;
}

// True while the user has a text field/editor focused — polling skips a tick
// in this case so a background refresh can't land mid-keystroke.
function userIsTyping(): boolean {
  const el = typeof document !== 'undefined' ? (document.activeElement as HTMLElement | null) : null;
  if (!el) return false;
  return el.isContentEditable || el.tagName === 'INPUT' || el.tagName === 'TEXTAREA';
}

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
  themes,
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
  themes: WritingTheme[];
}) {
  const router = useRouter();
  const [groups, setGroups] = useState<BoardGroup[]>(initialGroups);
  const { sensors, collisionDetection, activeDrag, originDrag, handleDragStart, handleDragOver, handleDragEnd, canAutoRefresh } =
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
  // Lazy-mount the editor modal: CardEditorModal builds a live Tiptap/ProseMirror
  // instance on mount (with update/blur listeners) regardless of `opened`, so
  // mounting it up front kept a heavy editor alive for the whole session. Mount
  // only on first open, then keep it mounted so Mantine's close animation still
  // plays and reopening stays instant. Written in render (idempotent ref).
  const editorMountedRef = useRef(false);
  editorMountedRef.current = editorMountedRef.current || editorOpened;

  // Label manager
  const [labelsOpened, { open: openLabels, close: closeLabels }] = useDisclosure(false);

  // Theme manager
  const [themesOpened, { open: openThemes, close: closeThemes }] = useDisclosure(false);

  // Board background (Unsplash) picker.
  const [bgOpened, { open: openBg, close: closeBg }] = useDisclosure(false);

  // Settings drawer (slides in from the right) holding the board-level controls.
  const [settingsOpened, { open: openSettings, close: closeSettings }] = useDisclosure(false);

  // Import-a-new-board-from-Trello modal, opened from the board-options menu.
  const [importOpened, { open: openImport, close: closeImport }] = useDisclosure(false);

  // Document-wide prose spacing (stored on the active board).
  const activeBoard = boards.find((b) => b.id === activeBoardId);
  const boardBg = activeBoard?.backgroundImage ?? null;
  const boardCredit = activeBoard?.backgroundCredit
    ? (JSON.parse(activeBoard.backgroundCredit) as { name: string; link: string })
    : null;

  // The board's active theme (if any), turned into --theme-* CSS custom
  // properties applied on the outer wrapper below. Everything downstream
  // (glass, groups, cards, editors) reads these with its current hardcoded
  // look as the var() fallback, so no theme selected = unchanged.
  const activeTheme = themes.find((t) => t.id === activeBoard?.themeId) ?? null;
  const themeStyle = useMemo(() => {
    if (!activeTheme) return {};
    try {
      return themeVars(JSON.parse(activeTheme.definition) as WritingThemeDefinition);
    } catch {
      return {};
    }
  }, [activeTheme]);
  const [spacing, setSpacing] = useState<Spacing>({
    lineHeight: activeBoard?.lineHeight ?? null,
    spaceBefore: activeBoard?.spaceBefore ?? null,
    spaceAfter: activeBoard?.spaceAfter ?? null,
    fontFamily: activeBoard?.fontFamily ?? null,
    fontSize: activeBoard?.fontSize ?? null,
    paragraphIndent: activeBoard?.paragraphIndent ?? null,
    smartQuotes: activeBoard?.smartQuotes ?? null,
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

  // Staleness poll: if this board is open elsewhere (another tab/computer)
  // and gets edited there, pick up the change here within roughly a minute.
  // Kept lightweight — one small timestamp query, not a full board refetch —
  // and only actually calls router.refresh() when something changed. Skips a
  // tick during/just after a drag (see useBoardDnd's canAutoRefresh) and
  // while the user has a text field focused, so a background refresh can't
  // clobber an in-progress drag or keystroke.
  const localStampRef = useRef(0);
  useEffect(() => { localStampRef.current = latestActivityStamp(activeBoard, groups); }, [activeBoard, groups]);
  useEffect(() => {
    const POLL_MS = 60_000;
    let cancelled = false;
    const tick = async () => {
      if (document.hidden || !canAutoRefresh() || userIsTyping()) return;
      try {
        const serverStamp = await getBoardActivityStamp(activeBoardId);
        if (!cancelled && serverStamp > localStampRef.current) router.refresh();
      } catch {
        // Transient failure — next tick retries.
      }
    };
    const id = setInterval(tick, POLL_MS);
    const onVisible = () => { if (!document.hidden) tick(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [activeBoardId, canAutoRefresh, router]);

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
  const onRenameCard = useCallback(async (cardId: number, title: string) => { await updateCard(cardId, { title }); router.refresh(); }, [router]);
  const onDeleteCard = useCallback(async (cardId: number) => { if (await confirmAction({ title: 'Delete card', message: 'Delete this card?' })) { await deleteCard(cardId); router.refresh(); } }, [router]);

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

  // Any card can pop open as a floating, non-modal reference window docked
  // to a corner (see CharacterPeekDock) instead of navigating away from
  // whatever card/view is currently open — ctrl/cmd-click or right-click a
  // card (on the board, in a link badge, or in the file tree) to peek it;
  // a plain click keeps doing the normal open/navigate. Several can be
  // open at once, each independently minimized/expanded/resized.
  const [peekCards, setPeekCards] = useState<PeekWindowState[]>([]);
  const onPeekCard = useCallback((cardId: number) => {
    setPeekCards((prev) => {
      if (prev.some((w) => w.cardId === cardId)) {
        return prev.map((w) => (w.cardId === cardId ? { ...w, minimized: false } : w));
      }
      return [...prev, { cardId, minimized: false }];
    });
  }, []);
  const onClosePeekCard = useCallback((cardId: number) => {
    setPeekCards((prev) => prev.filter((w) => w.cardId !== cardId));
  }, []);
  const onToggleMinimizePeekCard = useCallback((cardId: number) => {
    setPeekCards((prev) => prev.map((w) => (w.cardId === cardId ? { ...w, minimized: !w.minimized } : w)));
  }, []);
  const onReorderPeekCards = useCallback((next: PeekWindowState[]) => setPeekCards(next), []);
  const onPeekOpenFull = useCallback((card: BoardCard) => {
    setPeekCards((prev) => prev.filter((w) => w.cardId !== card.id));
    setEditingCard(card);
    openEditor();
  }, [openEditor]);

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

  // dnd-kit's SortableContext compares `items` BY REFERENCE and broadcasts a
  // new context value whenever that reference changes — re-rendering every
  // sortable/droppable descendant regardless of React.memo. `groups` gets a
  // fresh reference on every optimistic drag-over tick, so rebuilding this
  // inline re-rendered the ENTIRE board (every group/list/card) each tick.
  // Key the memo on the id sequence so the array stays referentially stable
  // unless groups are actually added/removed/reordered.
  const groupIdKey = groups.map((g) => g.id).join(',');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const groupIds = useMemo(() => groups.map((g) => `group:${g.id}`), [groupIdKey]);

  // A theme-set solid color needs the exact same full-bleed treatment as a
  // photo background — otherwise it's only as wide/tall as the shrink-wrapped
  // content column instead of the whole page.
  const hasThemeBoardBg = !!themeStyle['--theme-board-bg'];
  const bleed = !!boardBg || hasThemeBoardBg;

  return (
    <Box
      // The full-bleed background must cancel the Writing route's AppShell
      // padding EXACTLY (NavigationShell: base 'xs', sm 'sm') — overshooting it
      // (the old '-xl') pushed the box wider than the viewport on both sides
      // and made the whole page scroll horizontally. Groups still scroll
      // internally via each GroupRow's ScrollArea.
      mx={bleed ? { base: '-xs', sm: '-sm' } : undefined}
      mt={bleed ? '-md' : undefined}
      px={bleed ? { base: 'xs', sm: 'sm' } : undefined}
      py={bleed ? 'md' : undefined}
      style={
        boardBg
          ? {
              // flow-root: contain child margins (e.g. the header's mt) so they
              // don't collapse out to <body> and add stray scroll height.
              display: 'flow-root',
              // The photo lives in a position:fixed layer below (not
              // background-attachment:fixed, which forced a full-viewport
              // repaint on every scroll frame — the board's main scroll jank).
              // isolation:isolate contains that layer's zInd:-1 so it sits
              // behind this box's content but above the AppShell background.
              position: 'relative',
              isolation: 'isolate',
              minHeight: '100vh',
              // Mantine's Text/Title set no `color` of their own — they rely
              // on plain CSS inheritance, so this is what actually reaches
              // otherwise-untouched titles/labels (board/group/list titles,
              // file-tree + sidebar labels). Explicitly-colored descendants
              // (cards, the editor, glass panels) already set their own
              // `color` and are unaffected.
              color: 'var(--theme-heading, inherit)',
              ...themeStyle,
            }
          : {
              display: 'flow-root',
              background: 'var(--theme-board-bg, transparent)',
              minHeight: hasThemeBoardBg ? '100vh' : undefined,
              color: 'var(--theme-heading, inherit)',
              ...themeStyle,
            }
      }
    >
      {/* Board photo background — a viewport-fixed layer (zIndex -1, behind
          content) instead of background-attachment:fixed, which repainted the
          whole image every scroll frame. Same look, no per-frame repaint. */}
      {boardBg && (
        <Box
          aria-hidden
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: -1,
            pointerEvents: 'none',
            backgroundImage: `linear-gradient(rgba(0,0,0,0.18), rgba(0,0,0,0.18)), url(${boardBg})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
      )}
      {/* Header */}
      <Group justify="space-between" mb="sm" mt={'10px'} wrap="nowrap">
        <Group gap="xs" wrap="nowrap" style={{ minWidth: 0 }}>
          <Button
            component={Link}
            href={backUrl}
            variant="light"
            color="gray"
            size="compact-sm"
            leftSection={<IconArrowLeft size={16} />}
            style={boardBg ? { ...glassStyle, ...glassTextStyle } : undefined}
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
        onImportBoard={openImport}
      />

      {/* Board body: groups + drag context (Kanban view) */}
      {viewMode === 'kanban' && (
      <Box>
      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        // WhileDragging (NOT Always): Always keeps dnd-kit re-measuring every
        // droppable continuously even when idle. WhileDragging disables
        // measuring entirely when not dragging, so idle cost is already zero.
        //
        // frequency MUST be Optimized (the default), NOT a number. A numeric
        // frequency arms a setTimeout that re-measures every N ms for the WHOLE
        // drag — and each re-measure builds a fresh droppableRects Map, which is
        // a dependency of every SortableContext's context value, so it re-renders
        // EVERY sortable item on the board ~10x/second (the core drag jank).
        // Optimized re-measures only on real events (drag start, a card actually
        // changing lists), which is all the pointer-first collision needs.
        measuring={{ droppable: { strategy: MeasuringStrategy.WhileDragging, frequency: MeasuringFrequency.Optimized } }}
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
                onPeekCard={onPeekCard}
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

        <BoardDragOverlay activeDrag={activeDrag} categories={catalog.categories} themeVars={themeStyle} />
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
          onAddGroup={onAddGroup}
          onAddList={onAddList}
          onAddCard={onAddCard}
          onRenameGroup={onRenameGroup}
          onDeleteGroup={onDeleteGroup}
          onRenameList={onRenameList}
          onDeleteList={onDeleteList}
          onRenameCard={onRenameCard}
          onDeleteCard={onDeleteCard}
          onPeekCard={onPeekCard}
          dnd={{ sensors, collisionDetection, activeDrag, onDragStart: handleDragStart, onDragOver: handleDragOver, onDragEnd: handleDragEnd }}
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
        themes={themes}
        activeThemeId={activeBoard?.themeId ?? null}
        onManageThemes={openThemes}
      />

      <ManageThemesModal
        themes={themes}
        opened={themesOpened}
        onClose={closeThemes}
      />

      <UnsplashPicker
        opened={bgOpened}
        onClose={closeBg}
        onSelect={async (photo) => {
          await setBoardBackground(activeBoardId, photo.fullUrl, photo.credit);
          router.refresh();
        }}
      />

      {editorMountedRef.current && (
        <CardEditorModal
          card={editingCard}
          catalog={catalog}
          opened={editorOpened}
          onClose={closeEditor}
          onManageLabels={openLabels}
          spacing={spacing}
          projectId={projectId}
          wcSettings={wcSettings}
          themeVars={themeStyle}
          onPeekCard={onPeekCard}
        />
      )}

      <CharacterPeekDock
        cards={peekCards}
        onClose={onClosePeekCard}
        onToggleMinimize={onToggleMinimizePeekCard}
        onOpenFull={onPeekOpenFull}
        onReorder={onReorderPeekCards}
        spacing={spacing}
      />

      <ManageLabelsModal
        projectId={projectId}
        catalog={catalog}
        opened={labelsOpened}
        onClose={closeLabels}
      />

      {/* Import a NEW board into this (existing) project. Defaults its target to
          the current project; the modal still allows switching to a new project. */}
      <ImportTrelloModal
        opened={importOpened}
        onClose={closeImport}
        projects={[{ id: projectId, title: projectTitle }]}
        defaultProjectId={projectId}
      />
    </Box>
  );
}
