// One-off: add word-count goal columns across the writing hierarchy, a cached
// word_count on cards (backfilled from existing content), and the new
// writing_settings singleton table. Migrations are stale, so we apply schema
// changes directly. Idempotent.
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

function countWords(html) {
  if (!html) return 0;
  const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  return text ? text.split(' ').length : 0;
}

// word_count_goal on every level of the hierarchy.
for (const table of ['writing_projects', 'boards', 'groups', 'lists', 'cards']) {
  if (!(await columnExists(table, 'word_count_goal'))) {
    await client.execute(`ALTER TABLE ${table} ADD COLUMN word_count_goal INTEGER`);
    console.log(`Added ${table}.word_count_goal column.`);
  } else {
    console.log(`${table}.word_count_goal already exists — skipping.`);
  }
}

// cards.word_count — cached count, backfilled from existing content.
if (!(await columnExists('cards', 'word_count'))) {
  await client.execute(`ALTER TABLE cards ADD COLUMN word_count INTEGER NOT NULL DEFAULT 0`);
  console.log('Added cards.word_count column.');

  const rows = (await client.execute(`SELECT id, content FROM cards`)).rows;
  for (const row of rows) {
    const count = countWords(row.content);
    if (count > 0) {
      await client.execute({ sql: `UPDATE cards SET word_count = ? WHERE id = ?`, args: [count, row.id] });
    }
  }
  console.log(`Backfilled word_count for ${rows.length} cards.`);
} else {
  console.log('cards.word_count already exists — skipping.');
}

// writing_settings singleton table.
if (!(await tableExists('writing_settings'))) {
  await client.execute(`
    CREATE TABLE writing_settings (
      id INTEGER PRIMARY KEY DEFAULT 1,
      word_count_display_mode TEXT NOT NULL DEFAULT 'off',
      default_card_word_goal INTEGER,
      default_list_word_goal INTEGER,
      default_group_word_goal INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);
  console.log('Created writing_settings table.');
} else {
  console.log('writing_settings already exists — skipping.');
}

const settingsRow = await client.execute(`SELECT id FROM writing_settings WHERE id = 1`);
if (settingsRow.rows.length === 0) {
  const now = Date.now();
  await client.execute({
    sql: `INSERT INTO writing_settings (id, word_count_display_mode, created_at, updated_at) VALUES (1, 'off', ?, ?)`,
    args: [now, now],
  });
  console.log('Inserted default writing_settings row.');
} else {
  console.log('writing_settings row already present — skipping.');
}

console.log('Done.');
process.exit(0);
