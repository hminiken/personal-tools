// src/app/crafting/patterns/page.tsx
import { db } from '@/db';
import { patterns } from '@/db/schema';
import { desc } from 'drizzle-orm';
import PatternGallery from './_components/PatternGallery'

export const dynamic = 'force-dynamic';

export default async function PatternsPage() {
  // Fetch all patterns from the database, ordering by the newest first
  const allPatterns = await db.select().from(patterns).orderBy(desc(patterns.createdAt));



  return (
    <main>
      <PatternGallery initialPatterns={allPatterns} />
    </main>
  );
}