// scripts/setup-writing-db.mjs
//
// One-off: create the Writing Desk tables directly in the live SQLite file.
// We apply schema directly (no generated migrations) per project convention.
//
//   node scripts/setup-writing-db.mjs
import { createClient } from '@libsql/client';

const url = process.env.WRITING_DATABASE_URL || 'file:./data/writing.db';
const client = createClient({ url });

const statements = [
  `CREATE TABLE IF NOT EXISTS writing_projects (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     title TEXT NOT NULL,
     description TEXT,
     cover_image TEXT,
     status TEXT,
     categories TEXT,
     created_at INTEGER NOT NULL,
     updated_at INTEGER NOT NULL
   )`,
  `CREATE TABLE IF NOT EXISTS boards (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     project_id INTEGER NOT NULL REFERENCES writing_projects(id) ON DELETE CASCADE,
     title TEXT NOT NULL,
     position REAL NOT NULL DEFAULT 0,
     created_at INTEGER NOT NULL,
     updated_at INTEGER NOT NULL
   )`,
  `CREATE TABLE IF NOT EXISTS groups (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     board_id INTEGER NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
     title TEXT NOT NULL,
     color TEXT,
     position REAL NOT NULL DEFAULT 0,
     created_at INTEGER NOT NULL,
     updated_at INTEGER NOT NULL
   )`,
  `CREATE TABLE IF NOT EXISTS lists (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
     title TEXT NOT NULL,
     position REAL NOT NULL DEFAULT 0,
     created_at INTEGER NOT NULL,
     updated_at INTEGER NOT NULL
   )`,
  `CREATE TABLE IF NOT EXISTS cards (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     list_id INTEGER NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
     title TEXT NOT NULL,
     content TEXT,
     position REAL NOT NULL DEFAULT 0,
     created_at INTEGER NOT NULL,
     updated_at INTEGER NOT NULL
   )`,
  `CREATE INDEX IF NOT EXISTS idx_boards_project ON boards(project_id)`,
  `CREATE INDEX IF NOT EXISTS idx_groups_board ON groups(board_id)`,
  `CREATE INDEX IF NOT EXISTS idx_lists_group ON lists(group_id)`,
  `CREATE INDEX IF NOT EXISTS idx_cards_list ON cards(list_id)`,
];

for (const sql of statements) {
  await client.execute(sql);
}

const tables = await client.execute(
  `SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`
);
console.log('Writing DB ready at', url);
console.log('Tables:', tables.rows.map((r) => r.name).join(', '));
process.exit(0);
