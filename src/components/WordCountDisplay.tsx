'use client';

import type { ReactElement } from 'react';
import { Group, Text, Progress, Tooltip } from '@mantine/core';

export type WordCountMode = 'off' | 'bar' | 'text' | 'combo';

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
type SummableCard = { wordCount: number; includeInCompile?: boolean; hideWordCount?: boolean };

// A card is left out of every total/goal when it's excluded from the compile
// or has its word count switched off — those cards aren't part of the goal at
// all. Must mirror the SQL filters on the project-total aggregates in
// page.tsx / loadGalleryLevel.ts.
export function countsTowardTotal(c: SummableCard): boolean {
  return c.includeInCompile !== false && !c.hideWordCount;
}
export function sumListWords(list: { cards: SummableCard[] }): number {
  return list.cards.reduce((sum, c) => sum + (countsTowardTotal(c) ? c.wordCount : 0), 0);
}
export function sumGroupWords(group: { lists: { cards: SummableCard[] }[] }): number {
  return group.lists.reduce((sum, l) => sum + sumListWords(l), 0);
}
export function sumBoardWords(groups: { lists: { cards: SummableCard[] }[] }[]): number {
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

  // True percentage of goal — NOT clamped, so going over reads as e.g. 116%.
  // The bar's fill still caps at 100 (a Progress can't overflow visually), but
  // the hover tooltip always reports the real number. Shown for every format.
  const reached = goal ? count >= goal : false;
  const tooltipLabel = goal
    ? `${Math.round((count / goal) * 100)}% of goal — ${count.toLocaleString()} / ${goal.toLocaleString()} words`
    : `${count.toLocaleString()} words — no goal set`;

  const withTooltip = (child: ReactElement) => (
    <Tooltip label={tooltipLabel} withinPortal>{child}</Tooltip>
  );

  if (mode === 'text') {
    return withTooltip(
      <Text
        size={size}
        c={light ? 'gray.3' : 'dimmed'}
        style={{ width: 'fit-content', ...(light ? { textShadow: '0 1px 2px rgba(0,0,0,0.5)' } : {}) }}
      >
        {goal ? `${count.toLocaleString()} / ${goal.toLocaleString()} words` : `${count.toLocaleString()} words`}
      </Text>,
    );
  }

  // mode === 'combo' — bar taking most of the width with a compact "x / y"
  // count beside it, so you get the at-a-glance fill and the exact numbers.
  if (mode === 'combo') {
    const fill = goal ? Math.min(100, Math.round((count / goal) * 100)) : 0;
    return withTooltip(
      <Group gap="xs" wrap="nowrap" style={{ minWidth: 120 }}>
        <Progress value={fill} size="sm" color={progressColor(reached)} style={{ flex: 1, ...progressTrackStyle }} />
        <Text
          size={size}
          c={light ? 'gray.3' : 'dimmed'}
          style={{ flexShrink: 0, whiteSpace: 'nowrap', ...(light ? { textShadow: '0 1px 2px rgba(0,0,0,0.5)' } : {}) }}
        >
          {goal ? `${count.toLocaleString()} / ${goal.toLocaleString()}` : count.toLocaleString()}
        </Text>
      </Group>,
    );
  }

  // mode === 'bar' — always render an actual bar (even with no goal to fill it
  // against) so switching between "Progress bar" and "Text" is visibly
  // different; falling back to the same plain text as "text" mode here made
  // the two modes look identical whenever no goal was set.
  const fill = goal ? Math.min(100, Math.round((count / goal) * 100)) : 0;
  return withTooltip(
    <Progress value={fill} size="sm" color={progressColor(reached)} style={{ minWidth: 60, ...progressTrackStyle }} />,
  );
}

// Passed straight through as Progress's `color` prop — Mantine only resolves
// recognized theme color names (e.g. "gray"), so an unrecognized var()
// string like this is forwarded to the fill verbatim, with the exact
// default gray/dark distinction as the fallback when no theme is set.
function progressColor(reached: boolean): string {
  return `var(--theme-progress-fill, var(--mantine-color-${reached ? 'dark' : 'gray'}-filled))`;
}

const progressTrackStyle = {
  backgroundColor: 'var(--theme-progress-bg, light-dark(var(--mantine-color-gray-2), var(--mantine-color-dark-4)))',
};
