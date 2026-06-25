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
import { sqliteTable, integer, text, real } from 'drizzle-orm/sqlite-core';

// ==========================================
// 1. PROJECTS  (top-level gallery cards)
// ==========================================
export const writingProjects = sqliteTable('writing_projects', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  description: text('description'),
  coverImage: text('cover_image'),
  status: text('status'),
  categories: text('categories'),

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

  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()).$onUpdateFn(() => new Date()).notNull(),
});

// ==========================================
// RELATIONS
// ==========================================
export const writingProjectsRelations = relations(writingProjects, ({ many }) => ({
  boards: many(boards),
}));

export const boardsRelations = relations(boards, ({ one, many }) => ({
  project: one(writingProjects, { fields: [boards.projectId], references: [writingProjects.id] }),
  groups: many(groups),
}));

export const groupsRelations = relations(groups, ({ one, many }) => ({
  board: one(boards, { fields: [groups.boardId], references: [boards.id] }),
  lists: many(lists),
}));

export const listsRelations = relations(lists, ({ one, many }) => ({
  group: one(groups, { fields: [lists.groupId], references: [groups.id] }),
  cards: many(cards),
}));

export const cardsRelations = relations(cards, ({ one }) => ({
  list: one(lists, { fields: [cards.listId], references: [lists.id] }),
}));
