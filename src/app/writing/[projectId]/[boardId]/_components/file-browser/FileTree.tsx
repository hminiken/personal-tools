'use client';

import { useEffect, useRef, useState } from 'react';
import { ActionIcon, Box, Group, Menu, Text, Tooltip } from '@mantine/core';
import {
  IconBan, IconChevronDown, IconChevronRight, IconFileText, IconFolder, IconFolderOpen,
  IconPencil, IconPlus, IconTrash, IconUserSquare,
} from '@tabler/icons-react';
import {
  DndContext, DragOverlay, useDroppable, MeasuringStrategy, MeasuringFrequency,
  type CollisionDetection, type DragStartEvent, type DragOverEvent, type DragEndEvent,
  type SensorDescriptor, type SensorOptions,
} from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { animateLayoutChanges, sortableTransition } from '../sortableConfig';
import { effectiveCardColor } from '../CardItem';
import NotesPopover from '../NotesPopover';
import { promptText } from '@/utils/dialogs';
import type { ActiveDrag } from '../useBoardDnd';
import type { BoardCard, BoardGroup, BoardList } from '../../types';
import type { FileBrowserSelection } from './types';

const ROW_PAD_BASE = 8;
const ROW_INDENT = 14;
// Spring-loaded folders: how long the drag must hover a collapsed folder
// before it auto-expands.
const SPRING_OPEN_DELAY = 600;

// The drag-and-drop bundle, threaded down from BoardView. It's the SAME
// useBoardDnd instance that powers the Kanban view — the handlers operate on
// the shared `groups` state via the id scheme (card:/list:/group:/listzone:/
// groupzone:), so reordering here persists and stays in sync with Kanban.
export type TreeDnd = {
  sensors: SensorDescriptor<SensorOptions>[];
  collisionDetection: CollisionDetection;
  activeDrag: ActiveDrag;
  onDragStart: (e: DragStartEvent) => void;
  onDragOver: (e: DragOverEvent) => void;
  onDragEnd: (e: DragEndEvent) => void;
};

type CtxNode =
  | { kind: 'board' }
  | { kind: 'group'; group: BoardGroup }
  | { kind: 'list'; list: BoardList }
  | { kind: 'card'; card: BoardCard; listId: number };

// Everything the sortable rows need, bundled so we don't drill a dozen props
// through three levels. Recreated each render — fine here (the tree isn't a
// drag-perf hotspot the way the Kanban card grid is).
type TreeHelpers = {
  selection: FileBrowserSelection;
  dropTarget: { kind: 'group' | 'list'; id: number } | null;
  collapsedGroups: Set<number>;
  collapsedLists: Set<number>;
  toggleGroup: (id: number) => void;
  toggleList: (id: number) => void;
  onSelectGroup: (group: BoardGroup) => void;
  onSelectList: (list: BoardList) => void;
  onSelectCard: (card: BoardCard) => void;
  addList: (groupId: number) => void;
  addCard: (listId: number) => void;
  openCtx: (e: React.MouseEvent, node: CtxNode) => void;
  onPeekCard: (cardId: number) => void;
  onGroupNotes: (groupId: number, notes: string | null) => void;
  onListNotes: (listId: number, notes: string | null) => void;
  themeVars?: Record<string, string>;
  smartQuotes?: boolean | null;
};

// The "+" on a folder row. onPointerDown stop-prop so grabbing it never starts
// a drag; onClick stop-prop so it never selects the row.
function AddButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <Tooltip label={label} withinPortal position="right" openDelay={400}>
      <ActionIcon
        size="xs"
        variant="subtle"
        color="gray"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        aria-label={label}
      >
        <IconPlus size={13} />
      </ActionIcon>
    </Tooltip>
  );
}

function Chevron({ collapsed, onToggle, what }: { collapsed: boolean; onToggle: () => void; what: string }) {
  return (
    <ActionIcon
      size="xs"
      variant="transparent"
      color="gray"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => { e.stopPropagation(); onToggle(); }}
      aria-label={collapsed ? `Expand ${what}` : `Collapse ${what}`}
    >
      {collapsed ? <IconChevronRight size={13} /> : <IconChevronDown size={13} />}
    </ActionIcon>
  );
}

function TreeRow({
  depth,
  icon,
  label,
  selected,
  dimmed,
  onClick,
  onContextMenu,
  chevron,
  trailing,
  activatorRef,
  dragHandleProps,
  highlighted,
}: {
  depth: number;
  icon: React.ReactNode;
  label: string;
  selected?: boolean;
  dimmed?: boolean;
  onClick: (e: React.MouseEvent) => void;
  onContextMenu?: (e: React.MouseEvent) => void;
  chevron?: React.ReactNode;
  trailing?: React.ReactNode;
  activatorRef?: (el: HTMLElement | null) => void;
  dragHandleProps?: object;
  highlighted?: boolean;
}) {
  return (
    <Group
      ref={activatorRef}
      {...dragHandleProps}
      gap={4}
      wrap="nowrap"
      onClick={onClick}
      onContextMenu={onContextMenu}
      py={4}
      pr={6}
      pl={ROW_PAD_BASE + depth * ROW_INDENT}
      style={{
        cursor: 'pointer',
        borderRadius: 4,
        background: highlighted
          ? 'color-mix(in srgb, var(--theme-accent, #228be6) 18%, transparent)'
          : selected
          ? 'light-dark(rgba(0,0,0,0.06), rgba(255,255,255,0.08))'
          : undefined,
        boxShadow: highlighted ? 'inset 0 0 0 2px var(--theme-accent, var(--mantine-color-blue-5))' : undefined,
      }}
    >
      {chevron}
      {icon}
      <Text size="sm" c={dimmed ? 'dimmed' : undefined} fs={dimmed ? 'italic' : undefined} lineClamp={1} style={{ flex: 1, minWidth: 0 }}>
        {label}
      </Text>
      {trailing}
    </Group>
  );
}

// A card row — the leaf. Sortable within its list's SortableContext.
function SortableCard({ card, listId, h }: { card: BoardCard; listId: number; h: TreeHelpers }) {
  const { setNodeRef, setActivatorNodeRef, transform, transition, isDragging, listeners, attributes } =
    useSortable({ id: `card:${card.id}`, data: { type: 'card', card }, animateLayoutChanges, transition: sortableTransition });
  const style: React.CSSProperties = { transform: CSS.Translate.toString(transform), transition, opacity: isDragging ? 0.4 : undefined };
  const selected = h.selection?.type === 'card' && h.selection.cardId === card.id;
  return (
    <Box ref={setNodeRef} style={style}>
      <TreeRow
        depth={3}
        selected={selected}
        dimmed={!card.includeInCompile}
        // Ctrl/cmd-click pops the card up as a reference window (see
        // BoardView's peek dock) instead of selecting it in the tree.
        // Right-click stays the existing rename/delete context menu.
        onClick={(e) => { if (e.ctrlKey || e.metaKey) h.onPeekCard(card.id); else h.onSelectCard(card); }}
        onContextMenu={(e) => h.openCtx(e, { kind: 'card', card, listId })}
        activatorRef={setActivatorNodeRef}
        dragHandleProps={{ ...attributes, ...listeners }}
        icon={
          card.cardType === 'character' ? (
            <Tooltip label="Character card" withinPortal>
              <span style={{ display: 'flex' }}>
                <IconUserSquare size={15} color={effectiveCardColor(card) ?? undefined} />
              </span>
            </Tooltip>
          ) : card.includeInCompile ? (
            <IconFileText size={15} color={effectiveCardColor(card) ?? undefined} />
          ) : (
            <Tooltip label="Excluded from compile" withinPortal>
              <span style={{ display: 'flex' }}>
                <IconBan size={13} />
              </span>
            </Tooltip>
          )
        }
        label={card.title || 'Untitled'}
      />
    </Box>
  );
}

// A list row + (when expanded) its droppable card container. Sortable within
// its group's SortableContext; also a `listzone` droppable so cards can drop
// onto an empty list.
function SortableList({ list, h }: { list: BoardList; h: TreeHelpers }) {
  const { setNodeRef, setActivatorNodeRef, transform, transition, isDragging, listeners, attributes } =
    useSortable({ id: `list:${list.id}`, data: { type: 'list', list }, animateLayoutChanges, transition: sortableTransition });
  const { setNodeRef: setDropRef } = useDroppable({ id: `listzone:${list.id}`, data: { type: 'listzone', listId: list.id } });
  const style: React.CSSProperties = { transform: CSS.Translate.toString(transform), transition, opacity: isDragging ? 0.4 : undefined };
  const collapsed = h.collapsedLists.has(list.id);
  const selected = h.selection?.type === 'list' && h.selection.listId === list.id;
  const cardIds = list.cards.map((c) => `card:${c.id}`);
  return (
    <Box ref={setNodeRef} style={style}>
      {/* The listzone covers the row + cards, so a card can be dropped onto
          the list even while it's collapsed (which then springs it open). */}
      <div ref={setDropRef}>
        <TreeRow
          depth={2}
          selected={selected}
          highlighted={h.dropTarget?.kind === 'list' && h.dropTarget.id === list.id}
          onClick={() => h.onSelectList(list)}
          onContextMenu={(e) => h.openCtx(e, { kind: 'list', list })}
          activatorRef={setActivatorNodeRef}
          dragHandleProps={{ ...attributes, ...listeners }}
          chevron={<Chevron collapsed={collapsed} onToggle={() => h.toggleList(list.id)} what="list" />}
          icon={collapsed ? <IconFolder size={16} /> : <IconFolderOpen size={16} />}
          label={list.title}
          trailing={
            <Group gap={2} wrap="nowrap">
              <NotesPopover
                notes={list.notes}
                onSave={(notes) => h.onListNotes(list.id, notes)}
                smartQuotes={h.smartQuotes}
                themeVars={h.themeVars}
              />
              <AddButton onClick={() => h.addCard(list.id)} label="Add card" />
            </Group>
          }
        />
        {!collapsed && (
          <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
            {list.cards.map((card) => (
              <SortableCard key={card.id} card={card} listId={list.id} h={h} />
            ))}
          </SortableContext>
        )}
      </div>
    </Box>
  );
}

// A group row + (when expanded) its droppable list container. Sortable at the
// board level; also a `groupzone` droppable so lists can drop onto an empty
// group.
function SortableGroup({ group, h }: { group: BoardGroup; h: TreeHelpers }) {
  const { setNodeRef, setActivatorNodeRef, transform, transition, isDragging, listeners, attributes } =
    useSortable({ id: `group:${group.id}`, data: { type: 'group', group }, animateLayoutChanges, transition: sortableTransition });
  const { setNodeRef: setDropRef } = useDroppable({ id: `groupzone:${group.id}`, data: { type: 'groupzone', groupId: group.id } });
  const style: React.CSSProperties = { transform: CSS.Translate.toString(transform), transition, opacity: isDragging ? 0.4 : undefined };
  const collapsed = h.collapsedGroups.has(group.id);
  const selected = h.selection?.type === 'group' && h.selection.groupId === group.id;
  const listIds = group.lists.map((l) => `list:${l.id}`);
  return (
    <Box ref={setNodeRef} style={style}>
      {/* The groupzone covers the row + lists, so a list can be dropped onto
          the group even while it's collapsed (which then springs it open). */}
      <div ref={setDropRef}>
        <TreeRow
          depth={1}
          selected={selected}
          highlighted={h.dropTarget?.kind === 'group' && h.dropTarget.id === group.id}
          onClick={() => h.onSelectGroup(group)}
          onContextMenu={(e) => h.openCtx(e, { kind: 'group', group })}
          activatorRef={setActivatorNodeRef}
          dragHandleProps={{ ...attributes, ...listeners }}
          chevron={<Chevron collapsed={collapsed} onToggle={() => h.toggleGroup(group.id)} what="group" />}
          icon={collapsed ? <IconFolder size={16} /> : <IconFolderOpen size={16} />}
          label={group.title}
          trailing={
            <Group gap={2} wrap="nowrap">
              <NotesPopover
                notes={group.notes}
                onSave={(notes) => h.onGroupNotes(group.id, notes)}
                smartQuotes={h.smartQuotes}
                themeVars={h.themeVars}
              />
              <AddButton onClick={() => h.addList(group.id)} label="Add list" />
            </Group>
          }
        />
        {!collapsed && (
          <SortableContext items={listIds} strategy={verticalListSortingStrategy}>
            {group.lists.map((list) => (
              <SortableList key={list.id} list={list} h={h} />
            ))}
          </SortableContext>
        )}
      </div>
    </Box>
  );
}

// The board, groups, and lists are folders (click the name to compile that
// scope in the center pane; the chevron expands/collapses without selecting),
// cards are files. Drag a row to reorder it or move it between parents —
// dragging a folder carries its whole subtree; the grab lives on the row, so
// clicks still select and the +/chevron/right-click controls still work.
// The right-click menu is bound only to tree rows, so the browser's native
// menu (copy selected text, etc.) is untouched everywhere else.
export default function FileTree({
  boardTitle,
  groups,
  selection,
  onSelectBoard,
  onSelectGroup,
  onSelectList,
  onSelectCard,
  onAddGroup,
  onAddList,
  onAddCard,
  onRenameGroup,
  onDeleteGroup,
  onRenameList,
  onDeleteList,
  onRenameCard,
  onDeleteCard,
  onGroupNotes,
  onListNotes,
  onPeekCard,
  themeVars,
  smartQuotes,
  dnd,
}: {
  boardTitle: string;
  groups: BoardGroup[];
  selection: FileBrowserSelection;
  onSelectBoard: () => void;
  onSelectGroup: (group: BoardGroup) => void;
  onSelectList: (list: BoardList) => void;
  onSelectCard: (card: BoardCard) => void;
  onAddGroup: (title: string) => void | Promise<void>;
  onAddList: (groupId: number, title: string) => void | Promise<void>;
  onAddCard: (listId: number, title: string) => void | Promise<void>;
  onRenameGroup: (groupId: number, title: string) => void | Promise<void>;
  onDeleteGroup: (groupId: number) => void | Promise<void>;
  onRenameList: (listId: number, title: string) => void | Promise<void>;
  onDeleteList: (listId: number) => void | Promise<void>;
  onRenameCard: (cardId: number, title: string) => void | Promise<void>;
  onDeleteCard: (cardId: number) => void | Promise<void>;
  onGroupNotes: (groupId: number, notes: string | null) => void | Promise<void>;
  onListNotes: (listId: number, notes: string | null) => void | Promise<void>;
  onPeekCard: (cardId: number) => void;
  themeVars?: Record<string, string>;
  smartQuotes?: boolean | null;
  dnd: TreeDnd;
}) {
  const [collapsedGroups, setCollapsedGroups] = useState<Set<number>>(() => new Set());
  const [collapsedLists, setCollapsedLists] = useState<Set<number>>(() => new Set());
  const [ctx, setCtx] = useState<{ x: number; y: number; node: CtxNode } | null>(null);
  // The folder the drag is currently over — highlighted so you can tell what
  // you're aiming at even as the tree reflows to preview the drop.
  const [dropTarget, setDropTarget] = useState<{ kind: 'group' | 'list'; id: number } | null>(null);
  const dropKeyRef = useRef<string | null>(null);

  const toggleGroup = (id: number) =>
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  const toggleList = (id: number) =>
    setCollapsedLists((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  // Make sure a freshly-added child is visible: drop its parent out of the
  // collapsed set (a no-op if already expanded).
  const expandGroup = (id: number) =>
    setCollapsedGroups((prev) => (prev.has(id) ? new Set([...prev].filter((g) => g !== id)) : prev));
  const expandList = (id: number) =>
    setCollapsedLists((prev) => (prev.has(id) ? new Set([...prev].filter((l) => l !== id)) : prev));

  // ---- create / rename (shared by the + buttons and the context menu) ----
  const addGroup = async () => {
    const t = await promptText({ title: 'New group', placeholder: 'Group title' });
    if (t?.trim()) await onAddGroup(t.trim());
  };
  const addList = async (groupId: number) => {
    const t = await promptText({ title: 'New list', placeholder: 'List title' });
    if (t?.trim()) { expandGroup(groupId); await onAddList(groupId, t.trim()); }
  };
  const addCard = async (listId: number) => {
    const t = await promptText({ title: 'New card', placeholder: 'Card title' });
    if (t?.trim()) { expandList(listId); await onAddCard(listId, t.trim()); }
  };
  const renameGroup = async (group: BoardGroup) => {
    const t = await promptText({ title: 'Rename group', initialValue: group.title });
    if (t?.trim() && t.trim() !== group.title) await onRenameGroup(group.id, t.trim());
  };
  const renameList = async (list: BoardList) => {
    const t = await promptText({ title: 'Rename list', initialValue: list.title });
    if (t?.trim() && t.trim() !== list.title) await onRenameList(list.id, t.trim());
  };
  const renameCard = async (card: BoardCard) => {
    const t = await promptText({ title: 'Rename card', initialValue: card.title });
    if (t?.trim() && t.trim() !== card.title) await onRenameCard(card.id, t.trim());
  };

  const openCtx = (e: React.MouseEvent, node: CtxNode) => {
    e.preventDefault();
    e.stopPropagation();
    setCtx({ x: e.clientX, y: e.clientY, node });
  };

  const ctxItems = (node: CtxNode) => {
    switch (node.kind) {
      case 'board':
        return <Menu.Item leftSection={<IconPlus size={14} />} onClick={addGroup}>New group</Menu.Item>;
      case 'group':
        return (
          <>
            <Menu.Item leftSection={<IconPlus size={14} />} onClick={() => addList(node.group.id)}>New list</Menu.Item>
            <Menu.Item leftSection={<IconPencil size={14} />} onClick={() => renameGroup(node.group)}>Rename</Menu.Item>
            <Menu.Item color="red" leftSection={<IconTrash size={14} />} onClick={() => onDeleteGroup(node.group.id)}>Delete</Menu.Item>
          </>
        );
      case 'list':
        return (
          <>
            <Menu.Item leftSection={<IconPlus size={14} />} onClick={() => addCard(node.list.id)}>New card</Menu.Item>
            <Menu.Item leftSection={<IconPencil size={14} />} onClick={() => renameList(node.list)}>Rename</Menu.Item>
            <Menu.Item color="red" leftSection={<IconTrash size={14} />} onClick={() => onDeleteList(node.list.id)}>Delete</Menu.Item>
          </>
        );
      case 'card':
        return (
          <>
            <Menu.Item leftSection={<IconPlus size={14} />} onClick={() => addCard(node.listId)}>New card</Menu.Item>
            <Menu.Item leftSection={<IconPencil size={14} />} onClick={() => renameCard(node.card)}>Rename</Menu.Item>
            <Menu.Item color="red" leftSection={<IconTrash size={14} />} onClick={() => onDeleteCard(node.card.id)}>Delete</Menu.Item>
          </>
        );
    }
  };

  const h: TreeHelpers = {
    selection,
    dropTarget,
    collapsedGroups,
    collapsedLists,
    toggleGroup,
    toggleList,
    onSelectGroup,
    onSelectList,
    onSelectCard,
    addList,
    addCard,
    openCtx,
    onPeekCard,
    onGroupNotes,
    onListNotes,
    themeVars,
    smartQuotes,
  };

  // Spring-loaded folders: while dragging, hovering a collapsed group/list for
  // SPRING_OPEN_DELAY auto-expands it (like Finder/Explorer). dnd-kit fires
  // onDragOver when the hovered target changes, so we (re)arm the timer on a
  // new collapsed-folder target and cancel it whenever we leave.
  const springRef = useRef<{ key: string; timer: ReturnType<typeof setTimeout> } | null>(null);
  const clearSpring = () => {
    if (springRef.current) {
      clearTimeout(springRef.current.timer);
      springRef.current = null;
    }
  };
  const clearDrop = () => {
    if (dropKeyRef.current !== null) {
      dropKeyRef.current = null;
      setDropTarget(null);
    }
  };
  useEffect(() => clearSpring, []);

  const handleDragStart = (e: DragStartEvent) => { clearSpring(); clearDrop(); dnd.onDragStart(e); };
  const handleDragEnd = (e: DragEndEvent) => { clearSpring(); clearDrop(); dnd.onDragEnd(e); };
  const handleDragOver = (e: DragOverEvent) => {
    dnd.onDragOver(e);
    const over = e.over;
    if (!over) { clearSpring(); clearDrop(); return; }

    // Which folder is under the cursor (a row, or its drop zone)?
    const [type, raw] = String(over.id).split(':');
    const num = Number(raw);
    let folder: { kind: 'group' | 'list'; id: number } | null = null;
    if (type === 'group' || type === 'groupzone') folder = { kind: 'group', id: num };
    else if (type === 'list' || type === 'listzone') folder = { kind: 'list', id: num };

    // Highlight it (deduped so we don't re-render on every over tick).
    const key = folder ? `${folder.kind}:${folder.id}` : null;
    if (key !== dropKeyRef.current) { dropKeyRef.current = key; setDropTarget(folder); }

    // Spring it open if it's collapsed.
    const collapsed = folder && (folder.kind === 'group' ? collapsedGroups.has(folder.id) : collapsedLists.has(folder.id));
    if (!folder || !collapsed) { clearSpring(); return; }
    if (springRef.current?.key === key) return; // already counting down for this target
    clearSpring();
    const expand = folder.kind === 'group' ? () => expandGroup(folder.id) : () => expandList(folder.id);
    springRef.current = { key: key!, timer: setTimeout(() => { expand(); springRef.current = null; }, SPRING_OPEN_DELAY) };
  };

  const groupIds = groups.map((g) => `group:${g.id}`);

  const active = dnd.activeDrag;
  const activeTitle = active
    ? active.type === 'card' ? (active.card.title || 'Untitled') : active.type === 'list' ? active.list.title : active.group.title
    : '';

  return (
    <DndContext
      // Explicit id — see BoardView's board-dnd DndContext for why: without
      // one, dnd-kit's shared auto-increment counter for the aria
      // "described-by" id can drift between server and client renders and
      // trip a hydration mismatch.
      id="file-tree-dnd"
      sensors={dnd.sensors}
      collisionDetection={dnd.collisionDetection}
      measuring={{ droppable: { strategy: MeasuringStrategy.WhileDragging, frequency: MeasuringFrequency.Optimized } }}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <Box style={{ overflowY: 'auto' }}>
        <TreeRow
          depth={0}
          selected={selection?.type === 'board'}
          onClick={onSelectBoard}
          onContextMenu={(e) => openCtx(e, { kind: 'board' })}
          icon={<IconFolderOpen size={16} />}
          label={boardTitle}
          trailing={<AddButton onClick={addGroup} label="Add group" />}
        />
        <SortableContext items={groupIds} strategy={verticalListSortingStrategy}>
          {groups.map((group) => (
            <SortableGroup key={group.id} group={group} h={h} />
          ))}
        </SortableContext>
      </Box>

      {/* Compact drag preview (not the heavy Kanban overlay). */}
      <DragOverlay>
        {active ? (
          <Group
            gap={6}
            wrap="nowrap"
            px={8}
            py={4}
            style={{
              background: 'var(--mantine-color-body)',
              border: '1px solid var(--mantine-color-default-border)',
              borderRadius: 6,
              boxShadow: 'var(--mantine-shadow-md)',
              maxWidth: 240,
            }}
          >
            {active.type === 'card' ? <IconFileText size={15} /> : <IconFolder size={16} />}
            <Text size="sm" lineClamp={1}>{activeTitle}</Text>
          </Group>
        ) : null}
      </DragOverlay>

      {/* Right-click menu. A zero-size fixed anchor at the cursor gives the
          Menu something to position against. */}
      <Menu
        opened={!!ctx}
        onClose={() => setCtx(null)}
        withinPortal
        position="bottom-start"
        shadow="md"
        width={170}
        offset={2}
      >
        <Menu.Target>
          <div style={{ position: 'fixed', left: ctx?.x ?? -9999, top: ctx?.y ?? -9999, width: 1, height: 1 }} />
        </Menu.Target>
        <Menu.Dropdown>{ctx && ctxItems(ctx.node)}</Menu.Dropdown>
      </Menu>
    </DndContext>
  );
}
