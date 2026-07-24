// One-off: add the "character card" type to cards — card_type enum column
// plus a JSON character_fields column for the right-rail of named text
// fields (background, appearance, etc). Migrations are stale, so we apply
// schema changes directly. Idempotent.
import { createClient } from '@libsql/client';

const url = process.env.WRITING_DATABASE_URL || 'file:./data/writing.db';
const client = createClient({ url });

async function columnExists(table, col) {
  const res = await client.execute(`PRAGMA table_info(${table})`);
  return res.rows.some((r) => r.name === col);
}

if (!(await columnExists('cards', 'card_type'))) {
  await client.execute(`ALTER TABLE cards ADD COLUMN card_type TEXT NOT NULL DEFAULT 'standard'`);
  console.log('Added cards.card_type column.');
} else {
  console.log('cards.card_type already exists — skipping.');
}

if (!(await columnExists('cards', 'character_fields'))) {
  await client.execute(`ALTER TABLE cards ADD COLUMN character_fields TEXT`);
  console.log('Added cards.character_fields column.');
} else {
  console.log('cards.character_fields already exists — skipping.');
}

console.log('Done.');
process.exit(0);
