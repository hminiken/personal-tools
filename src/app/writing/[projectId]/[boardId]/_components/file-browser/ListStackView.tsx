'use client';

import { useCallback, useState } from 'react';
import { Box, Text, Title } from '@mantine/core';
import { docSpacingClass, spacingVars, type Spacing } from '@components/DocumentSpacing';
import CompiledCardEditor, { type CommentRecord } from '../../compile/[scope]/[id]/_components/CompiledCardEditor';
import type { BoardList } from '../../types';

function CardDivider() {
  return <div aria-hidden style={{ borderTop: '2px dotted var(--mantine-color-gray-4)', margin: '20px 0' }} />;
}

// Lightweight "read the whole list at once" view — reuses CompiledCardEditor
// (one independent TipTap editor per card, blur-save) directly rather than
// duplicating it, but skips everything CompiledView wraps it in: no export
// button, no spacing menu, no floating comment-position sidebar.
export default function ListStackView({ list, spacing }: { list: BoardList; spacing: Spacing }) {
  const [cardComments, setCardComments] = useState<Record<number, CommentRecord>>(() => {
    const init: Record<number, CommentRecord> = {};
    for (const card of list.cards) {
      if (!card.comments) continue;
      try { init[card.id] = JSON.parse(card.comments); } catch { /* ignore */ }
    }
    return init;
  });

  const handleCommentsChange = useCallback((cardId: number, next: CommentRecord) => {
    setCardComments((prev) => ({ ...prev, [cardId]: next }));
  }, []);

  return (
    <Box>
      <Title order={4} mb="md">{list.title}</Title>
      {list.cards.length === 0 ? (
        <Text c="dimmed" size="sm" fs="italic">No cards yet.</Text>
      ) : (
        <Box className={docSpacingClass} style={spacingVars(spacing)}>
          {list.cards.map((card, i) => (
            <Box key={card.id}>
              {i > 0 && <CardDivider />}
              <CompiledCardEditor
                card={card}
                comments={cardComments[card.id] ?? {}}
                onCommentsChange={(next) => handleCommentsChange(card.id, next)}
              />
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}
