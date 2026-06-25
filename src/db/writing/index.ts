// src/db/writing/index.ts
//
// Isolated Drizzle client for the Writing Desk. This is a SEPARATE SQLite file
// from the crafting DB so the two never share tables or connections.
import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema';

const dbUrl =
  process.env.WRITING_DATABASE_URL ||
  'file:/app/data/writing.db'; // Absolute path fallback (prod container)

const client = createClient({ url: dbUrl });

export const writingDb = drizzle(client, { schema });
