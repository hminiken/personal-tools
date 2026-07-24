'use client';

import { useEffect, useRef, useState } from 'react';
import { ActionIcon, Box, Button, Group, Image, ScrollArea, Stack, Text, Tooltip } from '@mantine/core';
import { IconArrowsMaximize, IconFileText, IconMinus, IconUserSquare, IconX } from '@tabler/icons-react';
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, horizontalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { getCardById, updateCard } from '../../../_actions/writing_actions';
import { sanitizePatternHtml } from '@/utils/sanitizeHtml';
import { parseCharacterFields, serializeCharacterFields, type CharacterField } from '@/utils/characterFields';
import type { Spacing } from '@components/DocumentSpacing';
import CharacterFieldsPanel from './CharacterFieldsPanel';
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

  if (win.minimized) {
    return (
      <Box
        style={{ ...themedSurface, width: 220, borderRadius: 8, border: themedBorder, boxShadow: 'var(--mantine-shadow-md)', cursor: 'grab' }}
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
        width: PANEL_WIDTH,
        height: heightPx != null ? heightPx : `${DEFAULT_HEIGHT_VH}vh`,
        borderRadius: 8,
        border: themedBorder,
        boxShadow: 'var(--mantine-shadow-lg)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
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
        <Group gap={6} wrap="nowrap" style={{ minWidth: 0 }}>
          <TitleIcon size={14} style={{ flexShrink: 0 }} />
          <Text size="sm" fw={600} lineClamp={1}>{title}</Text>
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

      <ScrollArea style={{ flex: 1 }} p="sm">
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
}: {
  cards: PeekWindowState[];
  onClose: (cardId: number) => void;
  onToggleMinimize: (cardId: number) => void;
  onOpenFull: (card: BoardCard) => void;
  onReorder: (next: PeekWindowState[]) => void;
  spacing: Spacing;
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
    <Box style={{ position: 'fixed', bottom: 16, right: 16, zIndex: 1000, display: 'flex', alignItems: 'flex-end', gap: 12, pointerEvents: 'none' }}>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
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
  );
}
