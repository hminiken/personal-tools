// One-off: add writing_folders table + writing_projects.folder_id to the live DB.
// Migrations are stale, so we apply schema changes directly. Idempotent.
import { createClient } from '@libsql/client';

const url = process.env.WRITING_DATABASE_URL || 'file:./data/writing.db';
const client = createClient({ url });

async function columnExists(table, col) {
  const res = await client.execute(`PRAGMA table_info(${table})`);
  return res.rows.some((r) => r.name === col);
}

async function tableExists(table) {
  const res = await client.execute({
    sql: `SELECT name FROM sqlite_master WHERE type='table' AND name=?`,
    args: [table],
  });
  return res.rows.length > 0;
}

if (!(await tableExists('writing_folders'))) {
  await client.execute(`
    CREATE TABLE writing_folders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      parent_folder_id INTEGER REFERENCES writing_folders(id) ON DELETE SET NULL,
      name TEXT NOT NULL,
      cover_image TEXT,
      position REAL NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);
  console.log('Created writing_folders table.');
} else {
  console.log('writing_folders already exists — skipping.');
}

if (!(await columnExists('writing_projects', 'folder_id'))) {
  await client.execute(
    `ALTER TABLE writing_projects ADD COLUMN folder_id INTEGER REFERENCES writing_folders(id) ON DELETE SET NULL`
  );
  console.log('Added writing_projects.folder_id column.');
} else {
  console.log('writing_projects.folder_id already exists — skipping.');
}

console.log('Done.');
process.exit(0);
