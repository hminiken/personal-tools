// src/app/crafting/patterns/[id]/page.tsx
import { getPatternById, getImagesForPattern } from '../_actions/pattern_actions';
import PatternViewer from './_components/PatternViewer';
import { notFound } from 'next/navigation';

interface PageProps {
  // 1. Update the type to be a Promise
  params: Promise<{ id: string }>; 
}

export default async function PatternPage({ params }: PageProps) {
  // 2. Await the params before using them
  const resolvedParams = await params; 
  
  // 3. Now it is safe to parse the ID
  const patternId = parseInt(resolvedParams.id, 10);
  const pattern = await getPatternById(patternId);
  const patternImages = await getImagesForPattern(patternId);

  if (!pattern) {
    notFound();
  }

  return (
    <main>
      <PatternViewer pattern={pattern} images={patternImages} />
    </main>
  );
}