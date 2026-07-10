'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Paper, Title, Text, Box, Button, Divider, Group } from '@mantine/core';
import { IconArrowLeft } from '@tabler/icons-react';
import Link from 'next/link';
import { DocumentSpacingMenu, docSpacingClass, spacingVars, type Spacing } from '@components/DocumentSpacing';
import { setBoardSpacing } from '@app/writing/_actions/writing_actions';
import CompiledCardEditor, { type CommentRecord } from './CompiledCardEditor';
import type { CompiledData, CompiledList, Card } from '../types';

type CommentEntry = { commentId: string; text: string; createdAt: string; cardId: number; cardTitle: string };

function getAllCards(data: CompiledData): Card[] {
  if (data.scope === 'list') return data.lists[0]?.cards ?? [];
  if (data.scope === 'group') return data.groups[0]?.lists.flatMap((l) => l.cards) ?? [];
  return data.groups.flatMap((g) => g.lists.flatMap((l) => l.cards));
}

// Push overlapping sidebar cards down so they don't stack on top of each other.
function resolveCollisions(
  comments: CommentEntry[],
  rawPositions: Record<string, number>,
  cardHeight = 80,
  gap = 6,
): Record<string, number> {
  const measured = comments.filter((c) => rawPositions[c.commentId] !== undefined);
  const sorted = [...measured].sort((a, b) => rawPositions[a.commentId] - rawPositions[b.commentId]);
  const resolved: Record<string, number> = {};
  let cursor = 0;
  for (const { commentId } of sorted) {
    const raw = rawPositions[commentId];
    const top = Math.max(raw, cursor);
    resolved[commentId] = top;
    cursor = top + cardHeight + gap;
  }
  return resolved;
}

function CardDivider() {
  return (
    <div
      aria-hidden
      style={{ borderTop: '2px dotted var(--mantine-color-gray-4)', margin: '20px 0' }}
    />
  );
}

function CardList({
  cards,
  cardComments,
  onCommentsChange,
}: {
  cards: Card[];
  cardComments: Record<number, CommentRecord>;
  onCommentsChange: (cardId: number, next: CommentRecord) => void;
}) {
  if (cards.length === 0) {
    return <Text c="dimmed" size="sm" fs="italic">No cards yet.</Text>;
  }
  return (
    <>
      {cards.map((card, i) => (
        <Box key={card.id}>
          {i > 0 && <CardDivider />}
          <CompiledCardEditor
            card={card}
            comments={cardComments[card.id] ?? {}}
            onCommentsChange={(next) => onCommentsChange(card.id, next)}
          />
        </Box>
      ))}
    </>
  );
}

function ListBlock({
  list,
  cardComments,
  onCommentsChange,
}: {
  list: CompiledList;
  cardComments: Record<number, CommentRecord>;
  onCommentsChange: (cardId: number, next: CommentRecord) => void;
}) {
  return (
    <Box mb="xl">
      <Title order={3} c="dark.6" mb="sm">{list.title}</Title>
      <CardList cards={list.cards} cardComments={cardComments} onCommentsChange={onCommentsChange} />
    </Box>
  );
}

export default function CompiledView({
  data,
  backHref,
  boardId,
  initialSpacing,
}: {
  data: CompiledData;
  backHref: string;
  boardId: number;
  initialSpacing: Spacing;
}) {
  const scopeLabel = data.scope === 'list' ? 'chapter' : data.scope;
  const [spacing, setSpacing] = useState<Spacing>(initialSpacing);

  // Live comment state for all cards — source of truth for the sidebar.
  const [cardComments, setCardComments] = useState<Record<number, CommentRecord>>(() => {
    const init: Record<number, CommentRecord> = {};
    for (const card of getAllCards(data)) {
      if (!card.comments) continue;
      try { init[card.id] = JSON.parse(card.comments); } catch { /* ignore */ }
    }
    return init;
  });

  const handleCommentsChange = useCallback((cardId: number, next: CommentRecord) => {
    setCardComments((prev) => ({ ...prev, [cardId]: next }));
  }, []);

  // Derive the flat comment list from live state (keeps sidebar in sync with edits).
  const allComments = useMemo((): CommentEntry[] => {
    const result: CommentEntry[] = [];
    for (const card of getAllCards(data)) {
      const comments = cardComments[card.id] ?? {};
      for (const [commentId, { text, createdAt }] of Object.entries(comments)) {
        result.push({ commentId, text, createdAt, cardId: card.id, cardTitle: card.title ?? 'Untitled' });
      }
    }
    return result;
  }, [cardComments, data]);

  // Measure where each comment span sits in the prose so we can align sidebar cards.
  const [commentPositions, setCommentPositions] = useState<Record<string, number>>({});
  const proseRef = useRef<HTMLDivElement>(null);

  const measurePositions = useCallback(() => {
    if (!proseRef.current) return;
    const proseTop = proseRef.current.getBoundingClientRect().top;
    const next: Record<string, number> = {};
    for (const { commentId } of allComments) {
      const el = proseRef.current.querySelector(`[data-comment-id="${commentId}"]`);
      if (el) next[commentId] = el.getBoundingClientRect().top - proseTop;
    }
    setCommentPositions(next);
  }, [allComments]);

  // Initial measurement — wait for TipTap editors to finish rendering.
  // Re-runs whenever allComments changes (new comment span added).
  useEffect(() => {
    const t = setTimeout(measurePositions, 200);
    return () => clearTimeout(t);
  }, [measurePositions]);

  // Re-measure whenever the prose area resizes.
  useEffect(() => {
    if (!proseRef.current) return;
    const ro = new ResizeObserver(measurePositions);
    ro.observe(proseRef.current);
    return () => ro.disconnect();
  }, [measurePositions]);

  const handleSpacing = (next: Spacing) => {
    setSpacing(next);
    setBoardSpacing(boardId, next);
  };

  const jumpToComment = (cardId: number, commentId: string) => {
    const cardEl = document.querySelector(`[data-card-id="${cardId}"]`);
    const el = cardEl?.querySelector(`[data-comment-id="${commentId}"]`) as HTMLElement | null;
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const positioned = Object.keys(commentPositions).length > 0;
  const resolvedPositions = positioned ? resolveCollisions(allComments, commentPositions) : {};

  return (
    <Paper pl={{ base: 0, sm: 'xl' }} pr={{ base: 'xs', sm: 'xl' }}>
      <Button
        component={Link}
        href={backHref}
        variant="subtle"
        color="gray"
        leftSection={<IconArrowLeft size={16} />}
        mb="md"
        pl={0}
      >
        Back to board
      </Button>

      <Group justify="space-between" align="flex-start" wrap="nowrap">
        <Box>
          <Title order={1}>{data.title}</Title>
          <Text c="dimmed" size="sm" mt={4} mb="lg">
            Compiled {scopeLabel} · one editor per card. Edits save automatically when you click out of a scene.
          </Text>
        </Box>
        <DocumentSpacingMenu value={spacing} onChange={handleSpacing} />
      </Group>
      <Divider mb="xl" />

      {/* Flex row: prose on the left, floating comment cards on the right */}
      <div style={{ display: 'flex', gap: 24 }}>
        {/* Prose — constrained to comfortable reading width */}
        <Box
          ref={proseRef}
          maw={760}
          style={{ flex: 1, minWidth: 0, ...spacingVars(spacing) }}
          className={docSpacingClass}
        >
          {data.scope === 'list' && (
            <CardList cards={data.lists[0].cards} cardComments={cardComments} onCommentsChange={handleCommentsChange} />
          )}

          {data.scope === 'group' &&
            (data.groups[0].lists.length === 0 ? (
              <Text c="dimmed" size="sm" fs="italic">No lists in this group.</Text>
            ) : (
              data.groups[0].lists.map((list) => (
                <ListBlock key={list.id} list={list} cardComments={cardComments} onCommentsChange={handleCommentsChange} />
              ))
            ))}

          {data.scope === 'board' &&
            data.groups.map((g) => (
              <Box key={g.id} mb={40}>
                <Title order={2} mb="md">{g.title}</Title>
                {g.lists.length === 0 ? (
                  <Text c="dimmed" size="sm" fs="italic">No lists in this group.</Text>
                ) : (
                  g.lists.map((list) => (
                    <ListBlock key={list.id} list={list} cardComments={cardComments} onCommentsChange={handleCommentsChange} />
                  ))
                )}
              </Box>
            ))}
        </Box>

        {/* Comment sidebar — hidden on small screens, cards float next to their text */}
        {allComments.length > 0 && (
          <Box w={240} visibleFrom="md" style={{ flexShrink: 0, position: 'relative' }}>
            {allComments.map(({ commentId, text, createdAt, cardId, cardTitle }) => {
              const top = resolvedPositions[commentId] ?? 0;
              return (
                <Paper
                  key={commentId}
                  p="xs"
                  withBorder
                  radius="sm"
                  bg="light-dark(var(--mantine-color-yellow-0), var(--mantine-color-dark-6))"
                  style={{
                    position: 'absolute',
                    top,
                    left: 0,
                    right: 0,
                    cursor: 'pointer',
                    opacity: positioned ? 1 : 0,
                    transition: 'top 0.2s ease, opacity 0.15s ease',
                  }}
                  onClick={() => jumpToComment(cardId, commentId)}
                >
                  <Text size="xs" fw={500} c="dark.4" lineClamp={1}>{cardTitle}</Text>
                  <Text size="xs" mt={2}>{text}</Text>
                  <Text size="10px" c="dimmed" mt={2}>
                    {new Date(createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </Paper>
              );
            })}
          </Box>
        )}
      </div>
    </Paper>
  );
}
