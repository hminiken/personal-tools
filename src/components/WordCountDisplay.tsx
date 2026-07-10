'use client';

import { Text, Progress, Tooltip } from '@mantine/core';

export type WordCountMode = 'off' | 'bar' | 'text';

// Global display preference + the per-level fallback goals used when a
// card/list/group has no explicit wordCountGoal of its own. Threaded down the
// board tree the same way `categories` is.
export type WordCountSettings = {
  mode: WordCountMode;
  defaultCardGoal: number | null;
  defaultListGoal: number | null;
  defaultGroupGoal: number | null;
};

// Sum helpers — word counts for list/group/board are never stored, only
// derived from the already-loaded tree's cached `cards.wordCount`.
export function sumListWords(list: { cards: { wordCount: number }[] }): number {
  return list.cards.reduce((sum, c) => sum + c.wordCount, 0);
}
export function sumGroupWords(group: { lists: { cards: { wordCount: number }[] }[] }): number {
  return group.lists.reduce((sum, l) => sum + sumListWords(l), 0);
}
export function sumBoardWords(groups: { lists: { cards: { wordCount: number }[] }[] }[]): number {
  return groups.reduce((sum, g) => sum + sumGroupWords(g), 0);
}

export function WordCountDisplay({
  count,
  goal,
  mode,
  size = 'xs',
  light = false,
}: {
  count: number;
  goal: number | null | undefined;
  mode: WordCountMode;
  size?: 'xs' | 'sm';
  /** Set when rendered over a background photo — swaps the dimmed gray for
   * a shadowed white so it stays readable, matching the adjacent title. */
  light?: boolean;
}) {
  if (mode === 'off') return null;

  if (mode === 'text') {
    return (
      <Text
        size={size}
        c={light ? 'gray.3' : 'dimmed'}
        style={light ? { textShadow: '0 1px 2px rgba(0,0,0,0.5)' } : undefined}
      >
        {goal ? `${count.toLocaleString()} / ${goal.toLocaleString()} words` : `${count.toLocaleString()} words`}
      </Text>
    );
  }

  // mode === 'bar' — always render an actual bar (even with no goal to fill it
  // against) so switching between "Progress bar" and "Text" is visibly
  // different; falling back to the same plain text as "text" mode here made
  // the two modes look identical whenever no goal was set.
  if (!goal) {
    return (
      <Tooltip label={`${count.toLocaleString()} words — no goal set`} withinPortal>
        <Progress value={0} size="sm" color="gray" style={{ minWidth: 60 }} />
      </Tooltip>
    );
  }

  const pct = Math.min(100, Math.round((count / goal) * 100));
  return (
    <Tooltip label={`${count.toLocaleString()} / ${goal.toLocaleString()} words`} withinPortal>
      <Progress value={pct} size="sm" color={count >= goal ? 'dark' : 'gray'} style={{ minWidth: 60 }} />
    </Tooltip>
  );
}
