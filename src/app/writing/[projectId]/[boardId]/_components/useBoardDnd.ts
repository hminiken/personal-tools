'use client';

import { useCallback, useRef, useState } from 'react';
import {
  PointerSensor, TouchSensor, useSensor, useSensors,
  closestCorners, pointerWithin,
  type DragStartEvent, type DragOverEvent, type DragEndEvent, type CollisionDetection,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { moveGroup, moveList, moveCard } from '../../../_actions/writing_actions';
import type { BoardGroup, BoardCard, BoardList } from '../types';

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

export type ActiveDrag =
  | { type: 'card'; card: BoardCard }
  | { type: 'list'; list: BoardList }
  | { type: 'group'; group: BoardGroup }
  | null;

export type OriginDrag = { card: BoardCard; listId: number; index: number } | null;

// All of the Kanban board's drag-and-drop machinery: sensors, the
// pointer-first collision detection, and the start/over/end handlers that
// mutate `groups` optimistically and persist positions via the move actions.
export function useBoardDnd(
  groups: BoardGroup[],
  setGroups: React.Dispatch<React.SetStateAction<BoardGroup[]>>,
) {
  const [activeDrag, setActiveDrag] = useState<ActiveDrag>(null);
  const [originDrag, setOriginDrag] = useState<OriginDrag>(null);
  const activeTypeRef = useRef<IdType | null>(null);
  // Skip processing the same over-target twice in a row (dnd-kit can fire
  // multiple onDragOver events for the same droppable without the cursor moving).
  const lastOverRef = useRef<string | number | null>(null);

  // A ref (not state) so BoardView's poll-driven refresh can check it without
  // waiting on a render — true for the whole drag gesture, plus however long
  // the fire-and-forget move* action below is still in flight. Refreshing
  // mid-drag would rip dnd-kit's sortable items out from under an active
  // pointer sensor; refreshing in the drop/persist gap could race the
  // just-committed position back to stale.
  const dragActiveRef = useRef(false);
  const pendingMoveCountRef = useRef(0);
  const canAutoRefresh = useCallback(() => !dragActiveRef.current && pendingMoveCountRef.current === 0, []);
  const trackMove = useCallback((promise: Promise<unknown>) => {
    pendingMoveCountRef.current++;
    promise.finally(() => { pendingMoveCountRef.current--; });
  }, []);

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

  function handleDragStart(e: DragStartEvent) {
    dragActiveRef.current = true;
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
    dragActiveRef.current = false;
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
      trackMove(moveGroup(a.num, pos));
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
      trackMove(moveList(a.num, groupId, pos));
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
      trackMove(moveCard(a.num, listId, pos));
    }
  }

  return { sensors, collisionDetection, activeDrag, originDrag, handleDragStart, handleDragOver, handleDragEnd, canAutoRefresh };
}
