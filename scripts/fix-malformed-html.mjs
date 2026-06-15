// One-time repair for malformed rich-text HTML in the database.
//
// Some AI-imported patterns stored <img> tags with broken resize-image
// attributes, e.g. `containerstyle=" wrapperstyle="display: flex; margin: 0;">`,
// which leaves an unclosed quote that makes HTML parsers swallow the content
// that follows. This scans every rich-text column, repairs those tags, and
// (with --apply) writes the cleaned HTML back.
//
// Usage (inside the running container, where the DB lives):
//   docker compose exec <service> node scripts/fix-malformed-html.mjs          # dry run
//   docker compose exec <service> node scripts/fix-malformed-html.mjs --apply  # write changes
//
// Or anywhere, pointing at a DB explicitly:
//   DATABASE_URL=file:./data/sqlite.db node scripts/fix-malformed-html.mjs
//
// Back up ./data first (deploy.sh already does this). The script is idempotent
// and only touches rows that actually change — re-running it is safe.

import { createClient } from '@libsql/client';

const url = process.env.DATABASE_URL || 'file:/app/data/sqlite.db';
const APPLY = process.argv.includes('--apply');

// Keep this identical to src/utils/sanitizeHtml.ts
function sanitize(html) {
  if (!html) return html;
  return html
    .replace(/\s+containerstyle="[^>]*>/gi, '>')
    .replace(/\s+wrapperstyle="[^>]*>/gi, '>');
}

const TARGETS = [
  { table: 'patterns', cols: ['content', 'materials', 'abbreviations', 'sizing', 'notes'] },
  { table: 'projects', cols: ['content', 'notes'] },
  { table: 'yarns', cols: ['notes'] },
];

const client = createClient({ url });

console.log(`DB: ${url}`);
console.log(APPLY ? 'Mode: APPLY (writing changes)\n' : 'Mode: DRY RUN (no changes written)\n');

let changedRows = 0;
let changedFields = 0;

for (const { table, cols } of TARGETS) {
  const res = await client.execute(`SELECT id, ${cols.join(', ')} FROM ${table}`);

  for (const row of res.rows) {
    const updates = {};
    for (const col of cols) {
      const original = row[col];
      const fixed = sanitize(original);
      if (fixed !== original) updates[col] = fixed;
    }

    const fields = Object.keys(updates);
    if (fields.length === 0) continue;

    changedRows += 1;
    changedFields += fields.length;
    console.log(`${table} #${row.id} -> fix: ${fields.join(', ')}`);

    if (APPLY) {
      const setSql = fields.map((c) => `${c} = ?`).join(', ');
      await client.execute({
        sql: `UPDATE ${table} SET ${setSql} WHERE id = ?`,
        args: [...fields.map((c) => updates[c]), row.id],
      });
    }
  }
}

console.log(
  `\n${APPLY ? 'Repaired' : 'Would repair'} ${changedFields} field(s) across ${changedRows} row(s).`
);
if (!APPLY && changedRows > 0) {
  console.log('Re-run with --apply to write these changes.');
}

await client.close();
