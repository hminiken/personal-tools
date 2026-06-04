// src/app/crafting/patterns/[id]/page.tsx
import { getPatternById, getImagesForPattern } from '../_actions/pattern_actions';
import PatternViewer from './_components/PatternViewer';
import { notFound } from 'next/navigation';
import { db } from '@/db'; // Adjust to your Drizzle instance path
import { images } from '@/db/schema'; // Adjust to your schema path
import { desc } from 'drizzle-orm';

interface PageProps {
  params: Promise<{ id: string }>; 
}

export default async function PatternPage({ params }: PageProps) {
  const resolvedParams = await params; 
  const patternId = parseInt(resolvedParams.id, 10);
  
  // 1. Fetch the specific data
  const pattern = await getPatternById(patternId);
  const patternImages = await getImagesForPattern(patternId);

  // 2. Fetch the global image library (newest first)
  const allLibraryImages = await db.query.images.findMany({
    orderBy: [desc(images.createdAt)],
  });

  if (!pattern) {
    notFound();
  }

  return (
    <main>
      {/* 3. Pass all three data sets down */}
      <PatternViewer 
        pattern={pattern} 
        images={patternImages} 
        libraryImages={allLibraryImages} 
      />
    </main>
  );
}