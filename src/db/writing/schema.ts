// src/db/writing/schema.ts
//
// Schema for the Writing Desk. This lives in its OWN SQLite database
// (see ./index.ts -> writingDb) so it never touches the yarn/crafting DB.
//
// Hierarchy:  writingProjects -> boards -> groups -> lists -> cards
//
// Every orderable row carries a `position` REAL. To move/reorder, we set the
// new parent id + a position that is the average of its two new neighbours
// (or neighbour ±1 at an edge). That lets us drop between any two siblings
// without renumbering the whole set.
import { relations } from 'drizzle-orm';
import { sqliteTable, integer, text, real, primaryKey, uniqueIndex, type AnySQLiteColumn } from 'drizzle-orm/sqlite-core';

// ==========================================
// 0. FOLDERS  (organize projects in the gallery; can nest)
// ==========================================
// Folders are a loose organizational layer over the gallery — NOT a strict
// file path. A folder may live inside another folder (parentFolderId), and a
// project may live inside a folder (writingProjects.folderId). Null parent =
// top level. Deleting a folder reparents its contents to the folder's parent
// (the action handles this explicitly; the FK `set null` is a safety net).
export const writingFolders = sqliteTable('writing_folders', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  parentFolderId: integer('parent_folder_id').references((): AnySQLiteColumn => writingFolders.id, { onDelete: 'set null' }),
  name: text('name').notNull(),
  coverImage: text('cover_image'),
  // Optional accent color (CSS hex, see LABEL_COLORS) shown on the folder card.
  color: text('color'),
  position: real('position').notNull().default(0),

  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()).$onUpdateFn(() => new Date()).notNull(),
});

// ==========================================
// 0b. SETTINGS  (singleton row — global Writing Desk preferences)
// ==========================================
// Always exactly one row (id fixed to 1). Holds preferences that apply across
// every project/board rather than to one entity, so they can't live as a
// column on any single table the way board spacing does.
export const writingSettings = sqliteTable('writing_settings', {
  id: integer('id').primaryKey().default(1),
  // How word counts are displayed everywhere.
  wordCountDisplayMode: text('word_count_display_mode', { enum: ['off', 'bar', 'text', 'combo'] }).notNull().default('off'),
  // Fallback goals used when a card/list/group has no explicit wordCountGoal
  // of its own. Boards and projects have no default — always explicit or null.
  defaultCardWordGoal: integer('default_card_word_goal'),
  defaultListWordGoal: integer('default_list_word_goal'),
  defaultGroupWordGoal: integer('default_group_word_goal'),

  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()).$onUpdateFn(() => new Date()).notNull(),
});

// ==========================================
// 0c. THEMES  (uploaded visual themes — selectable per board)
// ==========================================
// Not scoped to any project/board — this is the generic "account-level" store
// since there's no user/account table yet. `definition` is a JSON object of
// optional CSS color/shadow tokens (see the whitelist in utils/writingTheme.ts);
// any token a theme omits falls back to the Writing Desk's built-in look.
export const writingThemes = sqliteTable('writing_themes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  definition: text('definition').notNull().default('{}'),

  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()).$onUpdateFn(() => new Date()).notNull(),
});

// ==========================================
// 1. PROJECTS  (top-level gallery cards)
// ==========================================
export const writingProjects = sqliteTable('writing_projects', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  // Null = lives at the top level of the gallery; otherwise inside this folder.
  folderId: integer('folder_id').references(() => writingFolders.id, { onDelete: 'set null' }),
  title: text('title').notNull(),
  description: text('description'),
  coverImage: text('cover_image'),
  status: text('status'),
  categories: text('categories'),

  // Optional word-count goal for the whole project (sum of every board's cards).
  // No global default — always explicit or null.
  wordCountGoal: integer('word_count_goal'),

  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()).$onUpdateFn(() => new Date()).notNull(),
});

// ==========================================
// 2. BOARDS  (a project has many; surfaced as tabs)
// ==========================================
export const boards = sqliteTable('boards', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  projectId: integer('project_id').notNull().references(() => writingProjects.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  position: real('position').notNull().default(0),

  // Optional Unsplash background for the whole board page. `backgroundImage` is
  // the image URL; `backgroundCredit` is JSON {name, link} for attribution.
  backgroundImage: text('background_image'),
  backgroundCredit: text('background_credit'),

  // Optional theme applied to this board (see writingThemes above). Null =
  // the built-in default look.
  themeId: integer('theme_id').references(() => writingThemes.id, { onDelete: 'set null' }),

  // Document-wide prose spacing for this board, applied as CSS to every card
  // editor (compiled view + card modal). Null = use the editor default.
  lineHeight: text('line_height'),
  spaceBefore: text('space_before'),
  spaceAfter: text('space_after'),

  // Optional word-count goal for the whole board (sum of every group's cards).
  // No global default — always explicit or null.
  wordCountGoal: integer('word_count_goal'),
  // Per-board override of the global word-count display mode. Null = inherit
  // writingSettings.wordCountDisplayMode.
  wordCountDisplayMode: text('word_count_display_mode', { enum: ['off', 'bar', 'text', 'combo'] }),

  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()).$onUpdateFn(() => new Date()).notNull(),
});

// ==========================================
// 3. GROUPS  (full-width rows, stacked vertically, reorderable)
// ==========================================
export const groups = sqliteTable('groups', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  boardId: integer('board_id').notNull().references(() => boards.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  color: text('color'),
  position: real('position').notNull().default(0),

  // Optional Unsplash background for this group row (behind its lists).
  // `backgroundImage` is the URL; `backgroundCredit` is JSON {name, link}.
  backgroundImage: text('background_image'),
  backgroundCredit: text('background_credit'),

  // Optional word-count goal for this group. Null = fall back to the global
  // default group goal (writingSettings.defaultGroupWordGoal).
  wordCountGoal: integer('word_count_goal'),

  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()).$onUpdateFn(() => new Date()).notNull(),
});

// ==========================================
// 4. LISTS  (columns inside a group; can move between groups)
// ==========================================
export const lists = sqliteTable('lists', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  groupId: integer('group_id').notNull().references(() => groups.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  position: real('position').notNull().default(0),

  // Optional word-count goal for this list. Null = fall back to the global
  // default list goal (writingSettings.defaultListWordGoal).
  wordCountGoal: integer('word_count_goal'),

  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()).$onUpdateFn(() => new Date()).notNull(),
});

// ==========================================
// 5. CARDS  (title + rich-text body; move to any list)
// ==========================================
export const cards = sqliteTable('cards', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  listId: integer('list_id').notNull().references(() => lists.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  content: text('content'), // TipTap HTML
  position: real('position').notNull().default(0),

  // An "image card" shows its image (and labels) on the board instead of the
  // title/text preview. `imagePath` points at an uploaded /uploads/*.webp file.
  isImageCard: integer('is_image_card', { mode: 'boolean' }).notNull().default(false),
  imagePath: text('image_path'),

  // Optional cover image for any card (image card or not). Shown as a small
  // thumbnail beside the title. Stores the path of one of the card's gallery
  // images (see cardImages); null means no cover chosen.
  coverImage: text('cover_image'),

  // Optional background color for the whole card on the board (CSS hex, see
  // LABEL_COLORS). Applied as a soft tint behind the card. Null = default.
  color: text('color'),

  // When false, this card is skipped in the compiled chapter/board view.
  includeInCompile: integer('include_in_compile', { mode: 'boolean' }).notNull().default(true),

  // JSON: Record<commentId, { text: string; createdAt: string }>
  // Comment marks in `content` reference these by data-comment-id.
  comments: text('comments'),

  // Cached plain-text word count of `content`, recomputed whenever content is
  // saved (see countWords in utils/writingWordCount). Every ancestor level's
  // total is a live sum of this column rather than a separately stored value.
  wordCount: integer('word_count').notNull().default(0),
  // Optional word-count goal for this card. Null = fall back to the global
  // default card goal (writingSettings.defaultCardWordGoal).
  wordCountGoal: integer('word_count_goal'),
  // Per-card opt-out: when true, this card never shows a word count anywhere,
  // regardless of the board-wide display mode. For cards where a count is
  // meaningless (image cards, dividers, notes, etc.).
  hideWordCount: integer('hide_word_count', { mode: 'boolean' }).notNull().default(false),

  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()).$onUpdateFn(() => new Date()).notNull(),
});

// ==========================================
// 5b. CARD IMAGES  (gallery: a card may hold many reference photos)
// ==========================================
// Independent of the single "image card" imagePath. Any card can collect a
// gallery of uploaded photos; one of them may be flagged as the card's cover
// (stored as cards.coverImage by path).
export const cardImages = sqliteTable('card_images', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  cardId: integer('card_id').notNull().references(() => cards.id, { onDelete: 'cascade' }),
  path: text('path').notNull(),
  position: real('position').notNull().default(0),

  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()).notNull(),
});

// ==========================================
// 6. LABEL CATEGORIES  (optional grouping for labels, e.g. "POV")
// ==========================================
// A category namespaces a set of labels and supplies the display prefix
// ("POV: John"). `singleSelect` means a card may hold at most one label from
// this category (enforced in the assign action). Standalone labels have no
// category and are always freely multi-applied.
export const labelCategories = sqliteTable('label_categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  projectId: integer('project_id').notNull().references(() => writingProjects.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  singleSelect: integer('single_select', { mode: 'boolean' }).notNull().default(false),
  position: real('position').notNull().default(0),

  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()).$onUpdateFn(() => new Date()).notNull(),
});

// ==========================================
// 7. LABELS  (the colored chip; project-scoped, optionally in a category)
// ==========================================
// `color` is a CSS color value, usually a hex (see LABEL_COLORS in the labels
// util). Legacy rows may hold a Mantine color name (e.g. 'rust') — still valid.
export const labels = sqliteTable('labels', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  projectId: integer('project_id').notNull().references(() => writingProjects.id, { onDelete: 'cascade' }),
  categoryId: integer('category_id').references(() => labelCategories.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  color: text('color').notNull().default('gray'),
  // When true, applying this label to a card sets the card's accent color to
  // this label's color (live-derived — see effectiveCardColor). An explicit
  // color on the card itself overrides it.
  drivesCardColor: integer('drives_card_color', { mode: 'boolean' }).notNull().default(false),
  position: real('position').notNull().default(0),

  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()).$onUpdateFn(() => new Date()).notNull(),
});

// ==========================================
// 8. CARD LINKS  (peer-to-peer links between cards within the same project)
// ==========================================
// Links are stored in canonical order: source_card_id < target_card_id.
// This ensures (A→B) and (B→A) are the same row. The application always
// canonicalises before inserting (min first) and queries both directions.
export const cardLinks = sqliteTable('card_links', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  sourceCardId: integer('source_card_id').notNull().references(() => cards.id, { onDelete: 'cascade' }),
  targetCardId: integer('target_card_id').notNull().references(() => cards.id, { onDelete: 'cascade' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()).notNull(),
}, (t) => ({
  uniq: uniqueIndex('card_links_uniq').on(t.sourceCardId, t.targetCardId),
}));

// ==========================================
// 9. CARD LABELS  (join: which labels are applied to which cards)
// ==========================================
export const cardLabels = sqliteTable('card_labels', {
  cardId: integer('card_id').notNull().references(() => cards.id, { onDelete: 'cascade' }),
  labelId: integer('label_id').notNull().references(() => labels.id, { onDelete: 'cascade' }),
}, (t) => ({
  pk: primaryKey({ columns: [t.cardId, t.labelId] }),
}));

// ==========================================
// RELATIONS
// ==========================================
export const writingFoldersRelations = relations(writingFolders, ({ one, many }) => ({
  parent: one(writingFolders, { fields: [writingFolders.parentFolderId], references: [writingFolders.id], relationName: 'folderTree' }),
  children: many(writingFolders, { relationName: 'folderTree' }),
  projects: many(writingProjects),
}));

export const writingProjectsRelations = relations(writingProjects, ({ one, many }) => ({
  folder: one(writingFolders, { fields: [writingProjects.folderId], references: [writingFolders.id] }),
  boards: many(boards),
  labelCategories: many(labelCategories),
  labels: many(labels),
}));

export const boardsRelations = relations(boards, ({ one, many }) => ({
  project: one(writingProjects, { fields: [boards.projectId], references: [writingProjects.id] }),
  groups: many(groups),
  theme: one(writingThemes, { fields: [boards.themeId], references: [writingThemes.id] }),
}));

export const writingThemesRelations = relations(writingThemes, ({ many }) => ({
  boards: many(boards),
}));

export const groupsRelations = relations(groups, ({ one, many }) => ({
  board: one(boards, { fields: [groups.boardId], references: [boards.id] }),
  lists: many(lists),
}));

export const listsRelations = relations(lists, ({ one, many }) => ({
  group: one(groups, { fields: [lists.groupId], references: [groups.id] }),
  cards: many(cards),
}));

export const cardsRelations = relations(cards, ({ one, many }) => ({
  list: one(lists, { fields: [cards.listId], references: [lists.id] }),
  cardLabels: many(cardLabels),
  images: many(cardImages),
}));

export const cardImagesRelations = relations(cardImages, ({ one }) => ({
  card: one(cards, { fields: [cardImages.cardId], references: [cards.id] }),
}));

export const labelCategoriesRelations = relations(labelCategories, ({ one, many }) => ({
  project: one(writingProjects, { fields: [labelCategories.projectId], references: [writingProjects.id] }),
  labels: many(labels),
}));

export const labelsRelations = relations(labels, ({ one, many }) => ({
  project: one(writingProjects, { fields: [labels.projectId], references: [writingProjects.id] }),
  category: one(labelCategories, { fields: [labels.categoryId], references: [labelCategories.id] }),
  cardLabels: many(cardLabels),
}));

export const cardLabelsRelations = relations(cardLabels, ({ one }) => ({
  card: one(cards, { fields: [cardLabels.cardId], references: [cards.id] }),
  label: one(labels, { fields: [cardLabels.labelId], references: [labels.id] }),
}));

export const cardLinksRelations = relations(cardLinks, ({ one }) => ({
  sourceCard: one(cards, { fields: [cardLinks.sourceCardId], references: [cards.id], relationName: 'sourceLinks' }),
  targetCard: one(cards, { fields: [cardLinks.targetCardId], references: [cards.id], relationName: 'targetLinks' }),
}));
