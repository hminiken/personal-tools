// src/app/writing/[projectId]/[boardId]/types.ts
import type { InferSelectModel } from 'drizzle-orm';
import { boards, groups, lists, cards, cardImages, labels, labelCategories, writingThemes } from '@/db/writing/schema';

export type Board = InferSelectModel<typeof boards>;
export type WritingTheme = InferSelectModel<typeof writingThemes>;
type Group = InferSelectModel<typeof groups>;
type List = InferSelectModel<typeof lists>;
type Card = InferSelectModel<typeof cards>;
export type CardImage = InferSelectModel<typeof cardImages>;
export type Label = InferSelectModel<typeof labels>;
export type LabelCategory = InferSelectModel<typeof labelCategories>;

// A reference to a linked card shown near the label chips.
export type LinkedCardRef = {
  linkId: number;      // ID of the card_links row (used for deletion)
  cardId: number;      // The other card's ID
  title: string;
  contentPreview: string;  // Plain-text excerpt (HTML stripped)
  boardTitle: string;
  cardType: 'standard' | 'character';
};

// A card as the board UI consumes it: its own applied labels, gallery
// images, and linked-card references are all attached.
export type BoardCard = Card & { labels: Label[]; images: CardImage[]; links: LinkedCardRef[] };
export type BoardList = List & { cards: BoardCard[] };
export type BoardGroup = Group & { lists: BoardList[] };

// The project-wide label catalog, passed to pickers and the manager.
export type LabelCatalog = {
  categories: LabelCategory[];
  labels: Label[];
};
