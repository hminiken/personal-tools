// One-off: add the writing_themes table (uploaded, selectable board themes)
// and boards.theme_id (a board's active theme, nullable). Migrations are
// stale, so we apply schema changes directly. Idempotent.
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

if (!(await tableExists('writing_themes'))) {
  await client.execute(`
    CREATE TABLE writing_themes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      definition TEXT NOT NULL DEFAULT '{}',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);
  console.log('Created writing_themes table.');
} else {
  console.log('writing_themes already exists — skipping.');
}

if (!(await columnExists('boards', 'theme_id'))) {
  await client.execute(`ALTER TABLE boards ADD COLUMN theme_id INTEGER REFERENCES writing_themes(id)`);
  console.log('Added boards.theme_id column.');
} else {
  console.log('boards.theme_id already exists — skipping.');
}

console.log('Done.');
process.exit(0);
