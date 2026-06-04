// src/db/schema.ts
import { relations } from 'drizzle-orm/relations';
import { sqliteTable, integer, text, primaryKey } from 'drizzle-orm/sqlite-core';

// ==========================================
// 1. PATTERNS
// ==========================================
export const patterns = sqliteTable('patterns', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  sourceUrl: text('source_url'), 
  sourceLinks: text('source_links', { mode: 'json' }).$type<string[]>(), 
  coverImage: text('cover_image'),
  
  // The 5 Tab Fields
  content: text('content'), 
  materials: text('materials'),
  abbreviations: text('abbreviations'),
  sizing: text('sizing'),
  notes: text('notes'),
  
  // Classifications
  categories: text('categories'),
  status: text('status'),
  hooks: text('hooks'), 
  weights: text('weights'),
  yardage: integer('yardage'), 
  
  // Timestamps
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()).$onUpdateFn(() => new Date()).notNull(),
});

// ==========================================
// 2. PROJECTS
// ==========================================
export const projects = sqliteTable('projects', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  patternId: integer('pattern_id').references(() => patterns.id).notNull(),
  title: text('title').notNull(),
  sourceUrl: text('source_url'), 
  
  // Materials & Classifications
  yarn: text('yarn'), // Kept singular to denote the string input vs the 'yarns' relation table
  colors: text('colors'),
  categories: text('categories'),
  status: text('status'),
  hooks: text('hooks'), 
  weights: text('weights'),
  
  // Workspace
  content: text('content'), 
  notes: text('notes'),
  ruler: integer('ruler').default(0),
  coverImage: text('cover_image'),
  
  // Timestamps
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()).$onUpdateFn(() => new Date()).notNull(),
});

// ==========================================
// 3. YARNS (Renamed from yarnStash for consistency)
// ==========================================
export const yarns = sqliteTable('yarns', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(), 
  brand: text('brand'), 
  weights: text('weights'), 
  fibers: text('fibers'), 
  colors: text('colors'), 
  notes: text('notes'), 
  coverImage: text('cover_image'), 
  
  // Timestamps
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()).$onUpdateFn(() => new Date()).notNull(),
});


// ==========================================
// RELATIONAL TABLES 
// ==========================================

// 4. IMAGES
export const images = sqliteTable('images', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  patternId: integer('pattern_id').references(() => patterns.id, { onDelete: 'cascade' }),
  projectId: integer('project_id').references(() => projects.id, { onDelete: 'cascade' }),
  yarnId: integer('yarn_id').references(() => yarns.id, { onDelete: 'cascade' }),
  
  path: text('path').notNull(),
  
  // Only needs creation time, images don't usually get "updated"
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()).notNull(),
});

// 5. PROJECT -> YARN CONNECTIONS
export const projectYarns = sqliteTable('project_yarns', {
  projectId: integer('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  yarnId: integer('yarn_id').notNull().references(() => yarns.id, { onDelete: 'cascade' }),
}, (t) => ({
  pk: primaryKey({ columns: [t.projectId, t.yarnId] }), 
}));

export const imagesRelations = relations(images, ({ one }) => ({
    pattern: one(patterns, { fields: [images.patternId], references: [patterns.id] }),
    project: one(projects, { fields: [images.projectId], references: [projects.id] }),
    yarn: one(yarns, { fields: [images.yarnId], references: [yarns.id] }),
}));