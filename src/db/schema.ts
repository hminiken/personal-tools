// src/db/schema.ts
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';
import { boolean } from 'drizzle-orm/gel-core';

// 1. The Pattern (The Template)
export const patterns = sqliteTable('patterns', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  sourceLinks: text('source_links', { mode: 'json' }).$type<string[]>(), 
  coverImagePath: text('cover_image_path'),
  // The 5 Tab Fields
  patternText: text('pattern_text'), 
  materials: text('materials'),
  abbreviations: text('abbreviations'),
  sizing: text('sizing'),
  patternNotes: text('pattern_notes'),
  
  // Extra Info
  hookSize: text('hook_size'),       // e.g., "5.0 mm (H)"
  yarnWeight: text('yarn_weight'),   // e.g., "4 - Medium / Worsted"
  yarnYardage: integer('yarn_yardage'), // Number for easy calculations later
  
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

// 2. The Images
export const images = sqliteTable('images', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  patternId: integer('pattern_id').references(() => patterns.id), // Make sure this is NOT marked .notNull()
  projectId: integer('project_id').references(() => projects.id), // NEW: Link to projects
  imagePath: text('image_path').notNull(),
  isInline: boolean('is_inline'),
});

// Add this near your patterns table
export const projects = sqliteTable('projects', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  patternId: integer('pattern_id').references(() => patterns.id).notNull(),
  title: text('title').notNull(),
  yarnUsed: text('yarn_used'),
  colors: text('colors'),
  projectNotes: text('project_notes'), // For your comments/journal
  rulerPosition: integer('ruler_position').default(0), // The Y-coordinate of your highlighter bar
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});