// drizzle.writing.config.ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/writing/schema.ts',
  out: './drizzle-writing',
  dialect: 'sqlite',
  dbCredentials: {
    url: process.env.WRITING_DATABASE_URL || 'file:./data/writing.db',
  },
});
