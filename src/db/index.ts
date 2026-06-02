import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema';

// If we are in Docker, we use the hardcoded path. 
// Otherwise, we default to the local file in the root.
const dbUrl = process.env.DB_PATH || 'file:sqlite.db';

const client = createClient({ 
  url: dbUrl 
});

export const db = drizzle(client, { schema });