import type { BoardCard, BoardGroup, BoardList } from '../../types';

export type FileBrowserSelection =
  | { type: 'list'; listId: number }
  | { type: 'card'; cardId: number }
  | null;

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
