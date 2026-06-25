// src/app/writing/[projectId]/[boardId]/types.ts
import type { InferSelectModel } from 'drizzle-orm';
import { boards, groups, lists, cards } from '@/db/writing/schema';

export type Board = InferSelectModel<typeof boards>;
export type Group = InferSelectModel<typeof groups>;
export type List = InferSelectModel<typeof lists>;
export type Card = InferSelectModel<typeof cards>;

export type BoardList = List & { cards: Card[] };
export type BoardGroup = Group & { lists: BoardList[] };
