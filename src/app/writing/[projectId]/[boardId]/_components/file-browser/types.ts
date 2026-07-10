import type { CSSProperties } from 'react';
import type { BoardCard, BoardGroup, BoardList } from '../../types';

// The frosted-glass Pane (FileBrowserView) forces --mantine-color-text /
// --mantine-color-dimmed to white for readability over the board photo, but
// that shouldn't bleed into the actual card prose — the editor keeps its own
// solid background, so its text should stay the normal light/dark colors.
// Applied on the wrapper around each RichTextEditor to reset the cascade.
export const editorTextResetStyle: CSSProperties = {
  color: 'var(--mantine-color-text)',
  textShadow: 'none',
  ['--mantine-color-text' as string]: 'light-dark(#000, var(--mantine-color-dark-0))',
  ['--mantine-color-dimmed' as string]: 'light-dark(var(--mantine-color-gray-6), var(--mantine-color-dark-2))',
};

export type FileBrowserSelection =
  | { type: 'board' }
  | { type: 'group'; groupId: number }
  | { type: 'list'; listId: number }
  | { type: 'card'; cardId: number }
  | null;

export function findGroupInGroups(groups: BoardGroup[], groupId: number): BoardGroup | null {
  return groups.find((g) => g.id === groupId) ?? null;
}

export function findListInGroups(groups: BoardGroup[], listId: number): BoardList | null {
  for (const g of groups) {
    const l = g.lists.find((x) => x.id === listId);
    if (l) return l;
  }
  return null;
}

export function findCardInGroups(groups: BoardGroup[], cardId: number): BoardCard | null {
  for (const g of groups) {
    for (const l of g.lists) {
      const c = l.cards.find((x) => x.id === cardId);
      if (c) return c;
    }
  }
  return null;
}
