import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema';

const dbUrl = process.env.DATABASE_URL 
  || 'file:/app/data/sqlite.db'; // Absolute path fallback!

const client = createClient({ 
  url: dbUrl 
});

export const db = drizzle(client, { schema });