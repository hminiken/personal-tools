'use client';

import { useCallback, useRef } from 'react';
import {
  PointerSensor, useSensor, useSensors, closestCorners, pointerWithin,
  type DragStartEvent, type DragOverEvent, type DragEndEvent, type CollisionDetection,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { moveLabel, moveLabelCategory } from '../../../_actions/writing_actions';
import type { Label, LabelCategory } from '../types';

// ---------- id helpers ----------
// 'label:<id>' (draggable + sortable), 'category:<id>' (sortable, category
// reordering), 'catzone:<id|standalone>' (droppable — lets a label drop into
// an otherwise-empty category/standalone section, same trick as
// listzone/groupzone in useBoardDnd).
type IdType = 'label' | 'category' | 'catzone';
function parseId(id: string | number): { type: IdType; num: number | 'standalone' } {
  const [type, raw] = String(id).split(':');
  return { type: type as IdType, num: raw === 'standalone' ? 'standalone' : Number(raw) };
}

function midpoint(prev?: number, next?: number): number {
  if (prev != null && next != null) return (prev + next) / 2;
  if (next != null) return next - 1;
  if (prev != null) return prev + 1;
  return 1;
}

// The bucket key a label belongs to — null categoryId groups under 'standalone'.
export const catKey = (categoryId: number | null) => categoryId ?? 'standalone';

// Drag-and-drop for the "Manage labels" screen: reordering labels within a
// category, moving them between categories (including into/out of
// Standalone), and reordering the categories themselves. Mirrors
// useBoardDnd's cross-container pattern (relocate optimistically on
// dragOver, persist via a midpoint position on dragEnd) at a shallower
// nesting depth — categories -> labels, no groups-of-lists-of-cards.
export function useLabelDnd(
  categories: LabelCategory[],
  setCategories: React.Dispatch<React.SetStateAction<LabelCategory[]>>,
  allLabels: Label[],
  setAllLabels: React.Dispatch<React.SetStateAction<Label[]>>,
  // Multiselect: dragging a label that's part of a >1 selection carries the
  // whole selection along instead of just the one under the pointer.
  selectedIds: Set<number>,
  onBulkMove: (ids: number[], targetCategoryId: number | null) => void,
  clearSelection: () => void,
) {
  const activeTypeRef = useRef<IdType | null>(null);
  const lastOverRef = useRef<string | number | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const collisionDetection = useCallback<CollisionDetection>((args) => {
    const at = activeTypeRef.current;
    const valid = (id: string | number) => {
      const t = String(id).split(':')[0];
      if (at === 'label') return t === 'label' || t === 'catzone';
      if (at === 'category') return t === 'category';
      return true;
    };
    const filtered = { ...args, droppableContainers: args.droppableContainers.filter((c) => valid(c.id)) };
    const collisions = pointerWithin(filtered);
    return collisions.length ? collisions : closestCorners(filtered);
  }, []);

  function handleDragStart(e: DragStartEvent) {
    lastOverRef.current = null;
    activeTypeRef.current = parseId(e.active.id).type;
  }

  // Label crossing into a different category/standalone bucket -> relocate
  // in local state so the drag visually reflows immediately.
  function handleDragOver(e: DragOverEvent) {
    const { over, active } = e;
    if (!over) return;
    const a = parseId(active.id);
    if (a.type !== 'label') return;
    const o = parseId(over.id);

    const label = allLabels.find((l) => l.id === a.num);
    if (!label) return;
    const fromKey = catKey(label.categoryId);

    let toKey: number | 'standalone' | null = null;
    let toIndex = 0;
    if (o.type === 'label') {
      const target = allLabels.find((l) => l.id === o.num);
      if (!target) return;
      toKey = catKey(target.categoryId);
      const bucket = allLabels.filter((l) => catKey(l.categoryId) === toKey);
      toIndex = bucket.findIndex((l) => l.id === o.num);
    } else if (o.type === 'catzone') {
      toKey = o.num;
      toIndex = allLabels.filter((l) => catKey(l.categoryId) === toKey).length;
    }
    if (toKey == null || fromKey === toKey) return;
    if (over.id === lastOverRef.current) return;
    lastOverRef.current = over.id;

    setAllLabels((prev) => {
      const without = prev.filter((l) => l.id !== a.num);
      const bucket = without.filter((l) => catKey(l.categoryId) === toKey);
      const rest = without.filter((l) => catKey(l.categoryId) !== toKey);
      const idx = Math.min(Math.max(toIndex, 0), bucket.length);
      const moved: Label = { ...label, categoryId: toKey === 'standalone' ? null : (toKey as number) };
      const nextBucket = [...bucket];
      nextBucket.splice(idx, 0, moved);
      return [...rest, ...nextBucket];
    });
  }

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    activeTypeRef.current = null;
    lastOverRef.current = null;
    if (!over) return;
    const a = parseId(active.id);
    const o = parseId(over.id);

    // ----- CATEGORY reorder -----
    if (a.type === 'category') {
      const oldIndex = categories.findIndex((c) => c.id === a.num);
      const overCatId = o.type === 'category' ? o.num : null;
      if (overCatId == null) return;
      const newIndex = categories.findIndex((c) => c.id === overCatId);
      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;
      const reordered = arrayMove(categories, oldIndex, newIndex);
      setCategories(reordered);
      const pos = midpoint(reordered[newIndex - 1]?.position, reordered[newIndex + 1]?.position);
      moveLabelCategory(a.num as number, pos);
      return;
    }

    // ----- LABEL: multiselect group move -----
    // Dragging a label that's part of a multi-selection carries the whole
    // selection to wherever it was dropped, appended together (see
    // bulkMoveLabels in ManageLabelsModal) — no precise within-bucket index,
    // just "the group landed in this category".
    if (a.type === 'label' && selectedIds.size > 1 && selectedIds.has(a.num as number)) {
      let targetCategoryId: number | null | undefined;
      if (o.type === 'label') {
        const target = allLabels.find((l) => l.id === o.num);
        if (target) targetCategoryId = target.categoryId;
      } else if (o.type === 'catzone') {
        targetCategoryId = o.num === 'standalone' ? null : (o.num as number);
      }
      if (targetCategoryId !== undefined) onBulkMove([...selectedIds], targetCategoryId);
      clearSelection();
      return;
    }

    // ----- LABEL reorder (within its now-current category/standalone bucket) -----
    if (a.type === 'label') {
      const label = allLabels.find((l) => l.id === a.num);
      if (!label) return;
      const key = catKey(label.categoryId);
      const bucket = allLabels.filter((l) => catKey(l.categoryId) === key);
      const oldIndex = bucket.findIndex((l) => l.id === a.num);
      let newIndex = oldIndex;
      if (o.type === 'label') {
        const target = allLabels.find((l) => l.id === o.num);
        if (target && catKey(target.categoryId) === key) newIndex = bucket.findIndex((l) => l.id === o.num);
      }
      let finalBucket = bucket;
      if (newIndex !== oldIndex && oldIndex !== -1 && newIndex !== -1) {
        finalBucket = arrayMove(bucket, oldIndex, newIndex);
        setAllLabels((prev) => {
          const rest = prev.filter((l) => catKey(l.categoryId) !== key);
          return [...rest, ...finalBucket];
        });
      }
      const idx = finalBucket.findIndex((l) => l.id === a.num);
      const pos = midpoint(finalBucket[idx - 1]?.position, finalBucket[idx + 1]?.position);
      moveLabel(a.num as number, label.categoryId, pos);
    }
  }

  return { sensors, collisionDetection, handleDragStart, handleDragOver, handleDragEnd };
}
