// src/db/schema.ts
import { sql } from 'drizzle-orm';
import { sqliteTable, integer, text, primaryKey } from 'drizzle-orm/sqlite-core';

// 1. The Pattern (The Template)
export const patterns = sqliteTable('patterns', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  sourceUrl: text('source_url'), 
  sourceLinks: text('source_links', { mode: 'json' }).$type<string[]>(), 
  coverImagePath: text('cover_image_path'),
  // The 5 Tab Fields
  patternText: text('pattern_text'), 
  materials: text('materials'),
  abbreviations: text('abbreviations'),
  sizing: text('sizing'),
  patternNotes: text('pattern_notes'),
  categories: text('categories'),
  status: text('status'),
  
  // Extra Info
  hookSizes: text('hook_sizes'), 
  yarnWeights: text('yarn_weights'),
  yarnYardage: integer('yarn_yardage'), 
  
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: text('updatedAt').default(sql`CURRENT_TIMESTAMP`)
});

// 2. The Projects
export const projects = sqliteTable('projects', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  sourceUrl: text('source_url'), 

  patternId: integer('pattern_id').references(() => patterns.id).notNull(),
  title: text('title').notNull(),
  yarnUsed: text('yarn_used'),
  colors: text('colors'),
  categories: text('categories'),
  status: text('status'),
  
  // NEW COLUMNS:
  hookSizes: text('hook_sizes'), 
  yarnWeights: text('yarn_weights'),
  annotatedPattern: text('annotated_pattern'), 
  
  projectNotes: text('project_notes'),
  rulerPosition: integer('ruler_position').default(0),
  coverImagePath: text('cover_image_path'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: text('updatedAt').default(sql`CURRENT_TIMESTAMP`)
});

// 3. The Yarn Stash
export const yarnStash = sqliteTable('yarn_stash', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(), 
  brand: text('brand'), 
  weight: text('weight'), 
  fiber: text('fiber_tags'), 
  color: text('color_tags'), 
  notes: text('notes'), 
  coverImagePath: text('cover_image_path'), 
  
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
});


// ==========================================
// RELATIONAL TABLES (Must go at the bottom!)
// ==========================================

// 4. The Images (Moved down so it can see patterns, projects, and yarnStash)
export const images = sqliteTable('images', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  patternId: integer('pattern_id').references(() => patterns.id, { onDelete: 'cascade' }),
  projectId: integer('project_id').references(() => projects.id, { onDelete: 'cascade' }),
  yarnId: integer('yarn_id').references(() => yarnStash.id, { onDelete: 'cascade' }),
  imagePath: text('image_path').notNull(),
  created_at: text('created_at').notNull(),
});

// 5. Project/Yarn Connections
export const projectYarns = sqliteTable('project_yarns', {
  projectId: integer('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  yarnId: integer('yarn_id').notNull().references(() => yarnStash.id, { onDelete: 'cascade' }),
}, (t) => ({
  pk: primaryKey({ columns: [t.projectId, t.yarnId] }), 
}));