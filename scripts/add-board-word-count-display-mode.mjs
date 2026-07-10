// One-off: add boards.word_count_display_mode (per-board override of the
// global word-count display mode; null = inherit). Migrations are stale, so
// we apply schema changes directly. Idempotent.
import { createClient } from '@libsql/client';

const url = process.env.WRITING_DATABASE_URL || 'file:./data/writing.db';
const client = createClient({ url });

async function columnExists(table, col) {
  const res = await client.execute(`PRAGMA table_info(${table})`);
  return res.rows.some((r) => r.name === col);
}

if (!(await columnExists('boards', 'word_count_display_mode'))) {
  await client.execute(`ALTER TABLE boards ADD COLUMN word_count_display_mode TEXT`);
  console.log('Added boards.word_count_display_mode column.');
} else {
  console.log('boards.word_count_display_mode already exists — skipping.');
}

console.log('Done.');
process.exit(0);
