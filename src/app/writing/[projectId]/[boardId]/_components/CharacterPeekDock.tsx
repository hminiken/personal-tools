'use client';

import { useEffect, useRef, useState } from 'react';
import { ActionIcon, Box, Button, Group, Image, Portal, ScrollArea, Stack, Text, Tooltip } from '@mantine/core';
import { IconArrowsMaximize, IconChevronDown, IconFileText, IconMinus, IconUserSquare, IconX } from '@tabler/icons-react';
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, horizontalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { getCardById, updateCard } from '../../../_actions/writing_actions';
import { sanitizePatternHtml } from '@/utils/sanitizeHtml';
import { parseCharacterFields, serializeCharacterFields, type CharacterField } from '@/utils/characterFields';
import type { Spacing } from '@components/DocumentSpacing';
import CharacterFieldsPanel from './CharacterFieldsPanel';
import { cardAccentBorder, effectiveCardColor } from './CardItem';
import type { BoardCard } from '../types';

export type PeekWindowState = { cardId: number; minimized: boolean };

const PANEL_WIDTH = 340;
const DEFAULT_HEIGHT_VH = 50;
const MIN_HEIGHT = 220;

// Themed to match the active board theme (see CardEditorModal's identical
// group-surface pairing) — this renders inline in BoardView's own themed
// tree (not portaled), so the --theme-* custom properties it references
// already cascade down without needing to be passed in explicitly.
const themedSurface = {
  background: 'var(--theme-group-bg, var(--theme-list-bg, var(--mantine-color-body)))',
  color: 'var(--theme-heading, inherit)',
};
const themedBorder = '1px solid var(--theme-card-border, var(--mantine-color-default-border))';

// One floating reference window — a chat-widget-style panel docked to the
// corner: collapses to a small title pill, expands to a resizable (drag the
// top edge), non-fullscreen panel. Several can be open side by side.
function PeekWindow({
  win,
  onClose,
  onToggleMinimize,
  onOpenFull,
  spacing,
  dragHandleProps,
}: {
  win: PeekWindowState;
  onClose: () => void;
  onToggleMinimize: () => void;
  onOpenFull: (card: BoardCard) => void;
  spacing: Spacing;
  // Applied to the pill (minimized) or header bar (expanded) so the window
  // can be dragged to reorder along the dock — kept off the resize handle
  // and the minimize/close buttons so those keep working normally.
  dragHandleProps: object;
}) {
  const [card, setCard] = useState<BoardCard | null>(null);
  const [fields, setFields] = useState<CharacterField[]>([]);
  const [heightPx, setHeightPx] = useState<number | null>(null);
  const dragRef = useRef<{ startY: number; startHeight: number } | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    getCardById(win.cardId).then((fetched) => {
      if (cancelled) return;
      setCard(fetched as BoardCard | null);
      setFields(parseCharacterFields((fetched as BoardCard | null)?.characterFields));
    });
    return () => { cancelled = true; };
  }, [win.cardId]);

  const handleFieldsChange = (next: CharacterField[]) => {
    setFields(next);
    if (card) updateCard(card.id, { characterFields: serializeCharacterFields(next) });
  };

  const onPointerMoveRef = useRef<(e: PointerEvent) => void>(() => {});
  const onPointerUpRef = useRef<() => void>(() => {});
  onPointerMoveRef.current = (e: PointerEvent) => {
    if (!dragRef.current) return;
    const delta = dragRef.current.startY - e.clientY; // dragging the handle up grows the panel
    const next = Math.min(window.innerHeight * 0.9, Math.max(MIN_HEIGHT, dragRef.current.startHeight + delta));
    setHeightPx(next);
  };
  onPointerUpRef.current = () => {
    dragRef.current = null;
    window.removeEventListener('pointermove', onPointerMoveRef.current);
    window.removeEventListener('pointerup', onPointerUpRef.current);
  };
  const onHandlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    const rect = panelRef.current?.getBoundingClientRect();
    dragRef.current = { startY: e.clientY, startHeight: rect?.height ?? window.innerHeight * (DEFAULT_HEIGHT_VH / 100) };
    window.addEventListener('pointermove', onPointerMoveRef.current);
    window.addEventListener('pointerup', onPointerUpRef.current);
  };
  useEffect(() => () => {
    window.removeEventListener('pointermove', onPointerMoveRef.current);
    window.removeEventListener('pointerup', onPointerUpRef.current);
  }, []);

  const title = card?.title || 'Untitled';
  const TitleIcon = card?.cardType === 'character' ? IconUserSquare : IconFileText;

  // Same accent-strip technique as the board face itself (see CardItem's
  // cardAccentBorder) — a thick colored top border, so a peeked card reads
  // as "the same card" at a glance instead of a generic gray panel.
  const accentColor = card ? effectiveCardColor(card) : null;
  const accentTop = cardAccentBorder(accentColor);
  const accentTopStyle = accentTop ? { borderTop: accentTop } : {};
  const labelColors = (card?.labels ?? []).slice(0, 3).map((l) => l.color);

  if (win.minimized) {
    return (
      <Box
        style={{ ...themedSurface, width: 220, borderRadius: 8, border: themedBorder, ...accentTopStyle, boxShadow: 'var(--mantine-shadow-md)', cursor: 'grab' }}
        onClick={onToggleMinimize}
        {...dragHandleProps}
      >
        <Group justify="space-between" wrap="nowrap" px="sm" py={6} gap={4}>
          <Group gap={6} wrap="nowrap" style={{ minWidth: 0 }}>
            <TitleIcon size={14} style={{ flexShrink: 0 }} />
            <Text size="sm" fw={600} lineClamp={1}>{title}</Text>
          </Group>
          <Tooltip label="Close" withinPortal>
            <ActionIcon size="xs" variant="subtle" color="gray" onClick={(e) => { e.stopPropagation(); onClose(); }} aria-label="Close">
              <IconX size={13} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Box>
    );
  }

  return (
    <Box
      ref={panelRef}
      style={{
        ...themedSurface,
        position: 'relative',
        width: PANEL_WIDTH,
        height: heightPx != null ? heightPx : `${DEFAULT_HEIGHT_VH}vh`,
        borderRadius: 8,
        border: themedBorder,
        ...accentTopStyle,
        boxShadow: 'var(--mantine-shadow-lg)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Quick-minimize corner — tucks the window back into its dock pill,
          the same corner it visually docks to. A faster target than hunting
          for the header's minimize button. */}
      {/* Bottom-LEFT, deliberately — the pill this collapses into has its
          close (X) button at top-right, so keeping this on the opposite
          side means your cursor doesn't land right on top of "close"
          immediately after minimizing. */}
      <Tooltip label="Minimize" withinPortal position="top" openDelay={300}>
        <ActionIcon
          variant="filled"
          color="dark"
          radius="xl"
          size={30}
          onClick={onToggleMinimize}
          style={{ position: 'absolute', left: 10, bottom: 10, boxShadow: 'var(--mantine-shadow-md)', zIndex: 2 }}
          aria-label="Minimize"
        >
          <IconChevronDown size={16} />
        </ActionIcon>
      </Tooltip>
      {/* Drag the top edge to resize — grows/shrinks upward so the panel
          stays anchored to the corner it's docked in. */}
      <Tooltip label="Drag to resize" withinPortal position="top" openDelay={400}>
        <Box onPointerDown={onHandlePointerDown} style={{ flexShrink: 0, height: 8, cursor: 'ns-resize', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Box style={{ width: 32, height: 3, borderRadius: 2, background: 'var(--theme-card-border, var(--mantine-color-default-border))' }} />
        </Box>
      </Tooltip>

      <Group
        justify="space-between"
        wrap="nowrap"
        px="sm"
        pb={6}
        gap={4}
        style={{ flexShrink: 0, borderBottom: themedBorder, cursor: 'grab' }}
        {...dragHandleProps}
      >
        <Group gap={6} wrap="nowrap" style={{ minWidth: 0, flex: 1 }}>
          <TitleIcon size={14} style={{ flexShrink: 0 }} />
          <Text size="sm" fw={600} lineClamp={1} style={{ minWidth: 0 }}>{title}</Text>
          {labelColors.length > 0 && (
            <Group gap={4} wrap="nowrap" style={{ flexShrink: 0 }}>
              {labelColors.map((c, i) => (
                <Box key={i} style={{ width: 8, height: 8, borderRadius: 2, background: c, flexShrink: 0 }} />
              ))}
            </Group>
          )}
        </Group>
        <Group gap={2} wrap="nowrap">
          <Tooltip label="Minimize" withinPortal>
            <ActionIcon size="sm" variant="subtle" color="gray" onClick={onToggleMinimize} aria-label="Minimize">
              <IconMinus size={14} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Close" withinPortal>
            <ActionIcon size="sm" variant="subtle" color="gray" onClick={onClose} aria-label="Close">
              <IconX size={14} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Group>

      {/* minHeight: 0 — a flex item defaults to min-height: auto, which lets
          it grow to fit its content instead of shrinking to the space this
          column actually has. Without it, the ScrollArea's true box can end
          up taller than what's visible (the panel's own overflow: hidden
          clips the rest), so wheel scroll lands outside the real scrollable
          frame while the thumb — a direct scrollTop drag — still works. */}
      <ScrollArea style={{ flex: 1, minHeight: 0 }} p="sm">
        {!card ? (
          <Text size="sm" c="dimmed">Loading…</Text>
        ) : (
          <Stack gap="md">
            {card.coverImage && (
              <Image src={card.coverImage} alt="" radius="sm" h={140} fit="cover" fallbackSrc="https://placehold.co/320x140?text=Image" />
            )}
            {card.content && (
              <Box style={{ fontSize: 'var(--mantine-font-size-sm)' }} dangerouslySetInnerHTML={{ __html: sanitizePatternHtml(card.content) }} />
            )}
            {card.cardType === 'character' && (
              <CharacterFieldsPanel fields={fields} onChange={handleFieldsChange} spacing={spacing} />
            )}
            <Button variant="subtle" color="gray" size="xs" leftSection={<IconArrowsMaximize size={14} />} onClick={() => onOpenFull(card)}>
              Open full card
            </Button>
          </Stack>
        )}
      </ScrollArea>
    </Box>
  );
}

// Sortable wrapper: owns the dnd-kit hooks and hands PeekWindow just the
// drag-handle props, so PeekWindow can put them on the pill/header bar
// specifically (not the resize handle or the min/close buttons).
function SortablePeekWindow({
  win,
  onClose,
  onToggleMinimize,
  onOpenFull,
  spacing,
}: {
  win: PeekWindowState;
  onClose: () => void;
  onToggleMinimize: () => void;
  onOpenFull: (card: BoardCard) => void;
  spacing: Spacing;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: win.cardId });
  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : undefined,
    pointerEvents: 'auto',
  };
  return (
    <Box ref={setNodeRef} style={style}>
      <PeekWindow
        win={win}
        onClose={onClose}
        onToggleMinimize={onToggleMinimize}
        onOpenFull={onOpenFull}
        spacing={spacing}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </Box>
  );
}

// A dock of floating reference windows, anchored bottom-right — several can
// be open at once, each independently minimized (a small title pill) or
// expanded (a resizable panel), and draggable to reorder along the dock.
// Not a modal: no overlay, nothing closes on outside click, so it sits
// alongside whatever card/view is already open.
export default function CharacterPeekDock({
  cards,
  onClose,
  onToggleMinimize,
  onOpenFull,
  onReorder,
  spacing,
  containerRef,
  themeVars,
}: {
  cards: PeekWindowState[];
  onClose: (cardId: number) => void;
  onToggleMinimize: (cardId: number) => void;
  onOpenFull: (card: BoardCard) => void;
  onReorder: (next: PeekWindowState[]) => void;
  spacing: Spacing;
  // Handed to CardEditorModal as a react-remove-scroll "shard" — Mantine's
  // Modal locks background scroll while open (global wheel/touchmove
  // blocking, not just body overflow), and the dock lives outside the
  // Modal's own DOM subtree, so without this it goes scroll-dead the moment
  // a card is opened full while a peek window is up. Dragging the scrollbar
  // thumb still worked (that's a plain mouse drag, which the lock doesn't
  // touch) — only wheel/touch scrolling was actually blocked.
  containerRef?: React.RefObject<HTMLDivElement | null>;
  // The board's --theme-* CSS custom properties. The dock is portaled to
  // <body> below (to escape BoardView's stacking context — see the Portal
  // comment further down), which also escapes the themed wrapper's CSS
  // cascade, so these have to be applied explicitly instead of inherited.
  themeVars?: Record<string, string>;
}) {
  // A small movement threshold before a drag engages, so a plain click on
  // the pill (to toggle minimize) or the header's buttons isn't swallowed.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = cards.findIndex((w) => w.cardId === active.id);
    const newIndex = cards.findIndex((w) => w.cardId === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    onReorder(arrayMove(cards, oldIndex, newIndex));
  };

  if (cards.length === 0) return null;
  return (
    // Portaled to <body>: rendered inline, this div's z-index:1000 only ever
    // competes with its own React-tree siblings — it can't outrank a modal's
    // overlay, which Mantine portals to its OWN <body>-level container. Two
    // separate top-level stacking contexts don't compare by z-index at all;
    // the later-mounted one just paints on top regardless of the number, so
    // the (invisible, full-viewport) overlay silently ate every wheel/click
    // over the dock the moment a card was open full alongside it. Portaling
    // this too makes both true siblings under <body>, where 1000 vs the
    // modal's 200 finally means something.
    <Portal>
      <Box
        ref={containerRef}
        style={{ ...themeVars, position: 'fixed', bottom: 16, right: 16, zIndex: 1000, display: 'flex', alignItems: 'flex-end', gap: 12, pointerEvents: 'none' }}
      >
        {/* Explicit id — see BoardView's board-dnd DndContext for why: without
            one, a second DndContext on the page can drift out of sync with the
            server-rendered aria "described-by" id and trigger a hydration
            mismatch. This dock never renders during SSR (cards start empty),
            but a stable id keeps it safe if that ever changes. */}
        <DndContext id="peek-dock-dnd" sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={cards.map((w) => w.cardId)} strategy={horizontalListSortingStrategy}>
            {cards.map((win) => (
              <SortablePeekWindow
                key={win.cardId}
                win={win}
                onClose={() => onClose(win.cardId)}
                onToggleMinimize={() => onToggleMinimize(win.cardId)}
                onOpenFull={onOpenFull}
                spacing={spacing}
              />
            ))}
          </SortableContext>
        </DndContext>
      </Box>
    </Portal>
  );
}
