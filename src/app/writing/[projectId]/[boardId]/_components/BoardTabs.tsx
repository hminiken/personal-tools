'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Group, ActionIcon, Menu, ScrollArea, Tooltip } from '@mantine/core';
import { IconPlus, IconDots, IconPencil, IconTrash, IconPhoto, IconPhotoOff, IconChevronLeft, IconChevronRight, IconBrandTrello } from '@tabler/icons-react';
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

const MAX_TAB_TITLE = 25;

function truncateTitle(title: string): string {
  return title.length > MAX_TAB_TITLE ? `${title.slice(0, MAX_TAB_TITLE - 1)}…` : title;
}

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
  hasBg,
}: {
  board: Board;
  projectId: number;
  active: boolean;
  hasBg: boolean;
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

  const truncated = board.title.length > MAX_TAB_TITLE;

  return (
    <Tooltip
      label={board.title}
      // Only worth a tooltip when the label is actually clipped. Hidden while
      // dragging so it doesn't trail the tab, and delayed so it doesn't flash
      // as the pointer sweeps across the strip.
      disabled={!truncated || isDragging}
      position="bottom"
      withArrow
      openDelay={400}
      multiline
      maw={340}
      transitionProps={{ transition: 'pop', duration: 150 }}
    >
      <Link
        ref={setNodeRef}
        href={`/writing/${projectId}/${board.id}`}
        className={hasBg ? `${classes.tab} ${classes.tabGlass}` : classes.tab}
        data-active={active || undefined}
        style={style}
        {...attributes}
        {...listeners}
      >
        {truncateTitle(board.title)}
      </Link>
    </Tooltip>
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
  onSetWordGoal,
  onImportBoard,
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
  onSetWordGoal: () => void;
  onImportBoard: () => void;
}) {
  const [order, setOrder] = useState<Board[]>(boards);
  useEffect(() => { setOrder(boards); }, [boards]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  // Scroll arrows appear as a pair only once the tab strip is actually wider
  // than its container (`overflowing`). Crucially, once shown they stay
  // mounted for the whole scroll range — we only toggle each arrow's
  // `disabled` state at the ends. If we unmounted an arrow on reaching an
  // end, the strip would reflow (jump) and the click that triggered it would
  // fall through onto the tab now under the cursor, navigating into a board.
  const viewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  // Smooth-scroll animation state: a target scrollLeft the strip eases toward,
  // and the current rAF handle. Both wheel and arrow buttons feed this so they
  // share one continuous, momentum-y motion instead of hard jumps.
  const targetScrollRef = useRef<number | null>(null);
  const rafRef = useRef<number>(0);
  const [overflowing, setOverflowing] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Remember where the strip is scrolled to, per project, so switching boards
  // (which re-renders/remounts this component) keeps the tabs exactly where
  // the user left them instead of snapping back to the start.
  const scrollKey = `writing:boardtabs:scroll:${projectId}`;

  const updateScrollState = useCallback(() => {
    const el = viewportRef.current;
    if (!el) return;
    // 1px slack absorbs sub-pixel rounding so the flags don't flicker.
    setOverflowing(el.scrollWidth > el.clientWidth + 1);
    setCanScrollLeft(el.scrollLeft > 1);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
    try { sessionStorage.setItem(scrollKey, String(el.scrollLeft)); } catch { /* ignore */ }
  }, [scrollKey]);

  useEffect(() => {
    updateScrollState();
    const viewport = viewportRef.current;
    if (!viewport) return;
    // Watch both the viewport (window resizes) and the tab strip itself
    // (boards added/renamed) — either can flip whether we're overflowing.
    const observer = new ResizeObserver(updateScrollState);
    observer.observe(viewport);
    if (contentRef.current) observer.observe(contentRef.current);
    return () => observer.disconnect();
  }, [updateScrollState, order]);

  // Restore the saved scroll offset before paint whenever we (re)mount or
  // switch boards, so there's no visible jump back to the start.
  useLayoutEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    try {
      const saved = sessionStorage.getItem(scrollKey);
      if (saved != null) el.scrollLeft = parseFloat(saved);
    } catch { /* ignore */ }
    updateScrollState();
  }, [scrollKey, activeBoardId, updateScrollState]);

  // One eased animation loop toward `targetScrollRef`. Each frame closes ~22%
  // of the remaining distance (exponential ease-out), which feels smooth for
  // both a flick of the wheel and an arrow tap, and naturally absorbs rapid
  // wheel ticks (they just push the target further out).
  const stepScroll = useCallback(() => {
    const frame = () => {
      const el = viewportRef.current;
      const target = targetScrollRef.current;
      if (!el || target == null) { rafRef.current = 0; return; }
      const cur = el.scrollLeft;
      const diff = target - cur;
      if (Math.abs(diff) <= 0.5) {
        el.scrollLeft = target;
        targetScrollRef.current = null;
        rafRef.current = 0;
        updateScrollState();
        return;
      }
      el.scrollLeft = cur + diff * 0.22;
      updateScrollState();
      rafRef.current = requestAnimationFrame(frame);
    };
    frame();
  }, [updateScrollState]);

  // Nudge the target by `delta` (clamped to the scroll range) and make sure the
  // animation loop is running. Shared by the wheel handler and arrow buttons.
  const scrollByAmount = useCallback((delta: number) => {
    const el = viewportRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    const base = targetScrollRef.current == null ? el.scrollLeft : targetScrollRef.current;
    targetScrollRef.current = Math.max(0, Math.min(max, base + delta));
    if (!rafRef.current) rafRef.current = requestAnimationFrame(stepScroll);
  }, [stepScroll]);

  // Hover-to-scroll: when the pointer is over the (overflowing) tab strip, the
  // wheel scrolls the tabs horizontally instead of the page. Attached as a
  // non-passive native listener so we can preventDefault; when there's no
  // overflow we bail early and let the page scroll normally.
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (el.scrollWidth <= el.clientWidth) return;
      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (delta === 0) return;
      e.preventDefault();
      scrollByAmount(delta);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [scrollByAmount]);

  // Cancel any in-flight scroll animation on unmount.
  useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); }, []);

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

  const arrowStyle = hasBg ? { color: 'rgba(255,255,255,0.85)' } : undefined;

  return (
    <Group gap="xs" mb="md" wrap="nowrap" align="flex-end">
      {overflowing && (
        <ActionIcon
          variant="subtle"
          color="gray"
          size="lg"
          disabled={!canScrollLeft}
          onClick={() => scrollByAmount(-160)}
          aria-label="Scroll boards left"
          style={arrowStyle}
        >
          <IconChevronLeft size={18} />
        </ActionIcon>
      )}
      <ScrollArea
        // Scrollbar hidden ("never") now that the arrow buttons drive
        // scrolling; content stays scrollable via wheel/touch and scrollBy.
        type="never"
        style={{ flex: 1, minWidth: 0 }}
        viewportRef={viewportRef}
        onScrollPositionChange={updateScrollState}
      >
        <DndContext
          // Explicit id — this tab bar's DndContext mounts alongside
          // BoardView's board-dnd one on every board page; without a stable
          // id both fall back to dnd-kit's shared auto-increment counter for
          // the aria "described-by" id, which can drift between the server
          // render and the client's first render and trip a hydration
          // mismatch on that attribute.
          id="board-tabs-dnd"
          sensors={sensors}
          collisionDetection={closestCenter}
          measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={ids} strategy={horizontalListSortingStrategy}>
            <Group
              ref={contentRef}
              gap={4}
              wrap="nowrap"
              pr="xs"
              // The divider lives on this strip, so the strip must be exactly
              // as wide as its content in both directions:
              //   width: max-content -> grow to fit ALL tabs when they overflow
              //     (otherwise the box is only viewport-wide and its line
              //     scrolls away from the tabs that spilled past it),
              //   minWidth: 100%     -> still fill the container when there are
              //     only a few tabs, so the line reaches the right edge.
              style={{
                width: 'max-content',
                minWidth: '100%',
                borderBottom: hasBg ? '2px solid rgba(255,255,255,0.3)' : '2px solid var(--mantine-color-default-border)',
              }}
            >
              {order.map((b) => (
                <SortableTab key={b.id} board={b} projectId={projectId} active={b.id === activeBoardId} hasBg={hasBg} />
              ))}
            </Group>
          </SortableContext>
        </DndContext>
      </ScrollArea>
      {overflowing && (
        <ActionIcon
          variant="subtle"
          color="gray"
          size="lg"
          disabled={!canScrollRight}
          onClick={() => scrollByAmount(160)}
          aria-label="Scroll boards right"
          style={arrowStyle}
        >
          <IconChevronRight size={18} />
        </ActionIcon>
      )}

      <Tooltip label="Add board">
        <ActionIcon
          variant="light"
          color="gray"
          size="lg"
          onClick={onAddBoard}
          aria-label="Add board"
          style={hasBg ? {
            color: 'var(--theme-glass-text, #fff)',
            background: 'var(--theme-glass-bg, rgba(109, 109, 109, 0.22))',
            backdropFilter: 'blur(var(--theme-glass-blur, 10px))',
            WebkitBackdropFilter: 'blur(var(--theme-glass-blur, 10px))',
            border: '1px solid var(--theme-glass-border, rgba(255,255,255,0.18))',
          } : undefined}
        >
          <IconPlus size={18} />
        </ActionIcon>
      </Tooltip>
      <Menu position="bottom-end" withinPortal>
        <Menu.Target>
          <ActionIcon
            variant="light"
            color="gray"
            size="lg"
            aria-label="Board options"
            style={hasBg ? { color: 'rgba(255,255,255,0.85)' } : undefined}
          >
            <IconDots size={18} />
          </ActionIcon>
        </Menu.Target>
        <Menu.Dropdown>
          <Menu.Item leftSection={<IconPencil size={14} />} onClick={onRenameBoard}>Rename board</Menu.Item>
          <Menu.Item onClick={onSetWordGoal}>
            {boards.find((b) => b.id === activeBoardId)?.wordCountGoal ? 'Update word goal…' : 'Set word goal…'}
          </Menu.Item>
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
          <Menu.Divider />
          <Menu.Item leftSection={<IconBrandTrello size={14} />} onClick={onImportBoard}>
            Import board from Trello…
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>
    </Group>
  );
}
