'use client';

import { memo, useMemo } from 'react';
import { Paper, Text, Group, Tooltip, Image, Box, HoverCard, Badge } from '@mantine/core';
import { IconBan, IconLink } from '@tabler/icons-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { animateLayoutChanges, sortableTransition } from './sortableConfig';
import LabelBadge from './LabelBadge';
import { WordCountDisplay, type WordCountSettings } from '@components/WordCountDisplay';
import type { BoardCard, LabelCategory, LinkedCardRef } from '../types';

// Strips HTML tags to show a short text preview of the card body.
function preview(html: string | null | undefined): string {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

// A card's color shows as an accent strip along the card's top edge (a thick
// colored top border) — enough to flag the color at a glance without tinting
// the whole card, so the title/preview stay clean. Returns undefined for
// uncolored cards, leaving the default 1px border in place.
const ACCENT_STRIP = 8;
export function cardAccentBorder(color: string | null | undefined): string | undefined {
  return color ? `${ACCENT_STRIP}px solid ${color}` : undefined;
}

// Resolves the color a card actually displays: an explicit color on the card
// always wins (a manual override); otherwise it derives — live — from the
// applied label flagged to drive card color (lowest position wins if a card
// carries several such labels). null = no color.
export function effectiveCardColor(card: Pick<BoardCard, 'color' | 'labels'>): string | null {
  if (card.color) return card.color;
  const driver = card.labels
    .filter((l) => l.drivesCardColor)
    .sort((a, b) => a.position - b.position || a.id - b.id)[0];
  return driver?.color ?? null;
}

function LinkChip({ link, onOpenLinked }: { link: LinkedCardRef; onOpenLinked: (cardId: number) => void }) {
  return (
    <HoverCard width={260} shadow="md" withinPortal openDelay={300} closeDelay={100}>
      <HoverCard.Target>
        <Badge
          size="xs"
          variant="outline"
          color="gray"
          leftSection={<IconLink size={9} style={{ display: 'block' }} />}
          style={{ cursor: 'pointer', maxWidth: 120, textOverflow: 'ellipsis' }}
          onClick={(e) => { e.stopPropagation(); onOpenLinked(link.cardId); }}
        >
          {link.title}
        </Badge>
      </HoverCard.Target>
      <HoverCard.Dropdown>
        <Text size="sm" fw={600} lineClamp={2}>{link.title}</Text>
        {link.boardTitle && (
          <Text size="xs" c="dimmed" mt={2}>{link.boardTitle}</Text>
        )}
        {link.contentPreview && (
          <Text size="xs" mt={4} lineClamp={4} c="dimmed">{link.contentPreview}</Text>
        )}
      </HoverCard.Dropdown>
    </HoverCard>
  );
}

// Pure render — no dnd-kit hooks. Used both inside CardItem and in the DragOverlay.
//
// MEMOIZED — this is the board's single biggest drag-perf lever. dnd-kit's
// SortableContext hands every `useSortable` consumer a new context value each
// time droppable rects are re-measured (every ~100ms mid-drag, per the board's
// `measuring` config), so every CardItem re-renders many times per second
// during a drag no matter what. CardFace holds all the expensive chrome (the
// Progress ring, Tooltip portals, Badges, text preview); memoizing it means
// that on those churn re-renders only CardItem's thin Paper wrapper re-runs
// (to apply the transform) while this heavy subtree is skipped. Props stay
// referentially stable during a drag — even a moved card keeps its object
// identity (handleDragOver splices the same object across lists).
export const CardFace = memo(function CardFace({
  card,
  categories,
  wcSettings,
  onOpenLinked,
}: {
  card: BoardCard;
  categories: LabelCategory[];
  wcSettings?: WordCountSettings;
  onOpenLinked?: (cardId: number) => void;
}) {
  // Card content can be a whole scene — don't re-run the tag-stripping regex
  // over it on every render (cards re-render often during drags).
  const text = useMemo(() => preview(card.content), [card.content]);
  const imageSrc = card.coverImage ?? card.imagePath;
  const isImage = card.isImageCard && !!imageSrc;

  if (isImage) {
    return (
      <Box style={{ position: 'relative', containerType: 'inline-size' }}>
        <Image
          src={imageSrc!}
          alt={card.title}
          w="100%"
          fit="cover"
          display="block"
          // Cap the height at the card's own width (a square ceiling). Taller
          // images are center-cropped to fit; shorter ones show in full.
          style={{ maxHeight: '100cqw' }}
          fallbackSrc="https://placehold.co/240x160?text=Image"
        />
        {(card.labels.length > 0 || card.links.length > 0 || !card.includeInCompile) && (
          <Box
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              padding: 6,
              background: 'linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0))',
            }}
          >
            <Group gap={4}>
              {!card.includeInCompile && (
                <Tooltip label="Excluded from compile" withinPortal>
                  <IconBan size={12} color="white" style={{ flexShrink: 0 }} />
                </Tooltip>
              )}
              {card.labels.map((label) => (
                <LabelBadge key={label.id} label={label} categories={categories} variant="filled" size="sm" />
              ))}
              {onOpenLinked && card.links.map((link) => (
                <LinkChip key={link.linkId} link={link} onOpenLinked={onOpenLinked} />
              ))}
            </Group>
          </Box>
        )}
      </Box>
    );
  }

  if (card.coverImage) {
    return (
      <>
        {(card.labels.length > 0 || card.links.length > 0) && (
          <Group gap={4} mb={4}>
            {card.labels.map((label) => (
              <LabelBadge key={label.id} label={label} categories={categories} size="sm" />
            ))}
            {onOpenLinked && card.links.map((link) => (
              <LinkChip key={link.linkId} link={link} onOpenLinked={onOpenLinked} />
            ))}
          </Group>
        )}
        <Group gap="xs" wrap="nowrap" align="flex-start">
          <Image
            src={card.coverImage}
            alt=""
            w={72}
            h={72}
            radius="sm"
            fit="cover"
            style={{ flexShrink: 0 }}
          />
          <Box style={{ flex: 1, minWidth: 0 }}>
            <Group gap={4} wrap="nowrap" align="center">
              {!card.includeInCompile && (
                <Tooltip label="Excluded from compile" withinPortal>
                  <IconBan size={14} color="var(--mantine-color-dimmed)" style={{ flexShrink: 0 }} />
                </Tooltip>
              )}
              <Text size="sm" fw={500} lineClamp={2}>{card.title}</Text>
            </Group>
            {text && (
              <Text size="xs" lineClamp={3} mt={2} style={{ color: 'var(--theme-card-muted-text, var(--mantine-color-dimmed))' }}>{text}</Text>
            )}
            {wcSettings && wcSettings.mode !== 'off' && !card.hideWordCount && (
              <Box mt={6}>
                <WordCountDisplay count={card.wordCount} goal={card.wordCountGoal ?? wcSettings.defaultCardGoal} mode={wcSettings.mode} />
              </Box>
            )}
          </Box>
        </Group>
      </>
    );
  }

  return (
    <>
      {(card.labels.length > 0 || card.links.length > 0) && (
        <Group gap={4} mb={4}>
          {card.labels.map((label) => (
            <LabelBadge key={label.id} label={label} categories={categories} size="sm" />
          ))}
          {onOpenLinked && card.links.map((link) => (
            <LinkChip key={link.linkId} link={link} onOpenLinked={onOpenLinked} />
          ))}
        </Group>
      )}
      <Group gap={4} wrap="nowrap" align="center">
        {!card.includeInCompile && (
          <Tooltip label="Excluded from compile" withinPortal>
            <IconBan size={14} color="var(--mantine-color-dimmed)" style={{ flexShrink: 0 }} />
          </Tooltip>
        )}
        <Text size="sm" fw={500} lineClamp={2}>{card.title}</Text>
      </Group>
      {text && (
        <Text size="xs" lineClamp={2} mt={2} style={{ color: 'var(--theme-card-muted-text, var(--mantine-color-dimmed))' }}>{text}</Text>
      )}
      {wcSettings && wcSettings.mode !== 'off' && !card.hideWordCount && (
        <Box mt={6}>
          <WordCountDisplay count={card.wordCount} goal={card.wordCountGoal ?? wcSettings.defaultCardGoal} mode={wcSettings.mode} />
        </Box>
      )}
    </>
  );
});

// Memoized: see GroupRow/ListColumn — an unmoved card keeps its identity
// through drag updates, so only the affected cards re-render mid-drag.
function CardItem({
  card,
  categories,
  wcSettings,
  onOpen,
  onOpenLinked,
}: {
  card: BoardCard;
  categories: LabelCategory[];
  wcSettings: WordCountSettings;
  onOpen: (card: BoardCard) => void;
  onOpenLinked: (cardId: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `card:${card.id}`,
    data: { type: 'card', card },
    animateLayoutChanges,
    transition: sortableTransition,
  });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  const imageSrc = card.coverImage ?? card.imagePath;
  const isImage = card.isImageCard && !!imageSrc;

  // Ghost placeholder — card stays visible at reduced opacity to show its origin
  // while the DragOverlay follows the cursor.
  // Base card chrome from the board's theme (if any) — background, border,
  // and text color. Listed BEFORE borderTop below so the accent strip (an
  // explicit per-card/per-label color, a more specific override) always wins
  // on the top edge; theme border color only shows on the other three sides.
  const themedChrome: React.CSSProperties = {
    background: 'var(--theme-card-bg, var(--mantine-color-body))',
    borderColor: 'var(--theme-card-border, var(--mantine-color-default-border))',
    color: 'var(--theme-card-text, inherit)',
  };

  // Only include a `borderTop` key when the card actually has an accent color.
  // Passing `borderTop: undefined` alongside `borderColor` makes React clear
  // the border-top shorthand AFTER borderColor set it, so the themed top color
  // is wiped and the top edge reverts to Mantine's default --paper-border-color
  // (a light gray) — showing as a stray white line only along the top.
  const accentTop = cardAccentBorder(effectiveCardColor(card));
  const accentTopStyle = accentTop ? { borderTop: accentTop } : {};

  if (isDragging) {
    return (
      <Paper
        ref={setNodeRef}
        style={{ ...style, ...themedChrome, ...accentTopStyle, cursor: 'grab', overflow: isImage ? 'hidden' : undefined, opacity: 0.35 }}
        withBorder
        radius="sm"
        p={isImage ? 0 : 'xs'}
        data-no-drag-scroll
        {...attributes}
        {...listeners}
      >
        <CardFace card={card} categories={categories} wcSettings={wcSettings} onOpenLinked={onOpenLinked} />
      </Paper>
    );
  }

  return (
    <Paper
      ref={setNodeRef}
      style={{ ...style, ...themedChrome, ...accentTopStyle, cursor: 'grab', overflow: isImage ? 'hidden' : undefined }}
      withBorder
      shadow="xs"
      radius="sm"
      data-no-drag-scroll
      p={isImage ? 0 : 'xs'}
      onClick={() => onOpen(card)}
      {...attributes}
      {...listeners}
    >
      <CardFace card={card} categories={categories} wcSettings={wcSettings} onOpenLinked={onOpenLinked} />
    </Paper>
  );
}

export default memo(CardItem);
