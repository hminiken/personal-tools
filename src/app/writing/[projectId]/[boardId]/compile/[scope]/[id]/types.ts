import type { InferSelectModel } from 'drizzle-orm';
import { cards } from '@/db/writing/schema';

export type Card = InferSelectModel<typeof cards>;

export type CompiledList = { id: number; title: string; cards: Card[] };
export type CompiledGroup = { id: number; title: string; lists: CompiledList[] };

// One unified shape. `lists` is used for list scope; `groups` for group/board scope.
export type CompiledData =
  | { scope: 'list'; title: string; lists: CompiledList[] }
  | { scope: 'group'; title: string; groups: CompiledGroup[] }
  | { scope: 'board'; title: string; groups: CompiledGroup[] };
