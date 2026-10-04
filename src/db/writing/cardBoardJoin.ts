import { eq, sql } from 'drizzle-orm';
import { cards, lists, groups } from './schema';

// A card reaches its board through one of three paths:
//   - regular card:    cards.listId       → lists → groups
//   - list note card:  cards.ownerListId  → lists → groups
//   - group note card: cards.ownerGroupId → groups
// Joining only on cards.listId silently drops note cards, so queries that
// resolve a card's board should use these conditions instead:
//
//   .from(cards)
//   .leftJoin(lists, cardListJoin)
//   .innerJoin(groups, cardGroupJoin)
//   .innerJoin(boards, eq(groups.boardId, boards.id))
export const cardListJoin = eq(lists.id, sql`coalesce(${cards.listId}, ${cards.ownerListId})`);
export const cardGroupJoin = eq(groups.id, sql`coalesce(${lists.groupId}, ${cards.ownerGroupId})`);
