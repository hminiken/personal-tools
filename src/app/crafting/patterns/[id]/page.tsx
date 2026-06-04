// src/app/crafting/patterns/[id]/page.tsx
import { getPatternById, getImagesForPattern } from '../_actions/pattern_actions';
import PatternViewer from './_components/PatternViewer';
import { notFound } from 'next/navigation';

interface PageProps {
  params: Promise<{ id: string }>; 
}

export default async function PatternPage({ params }: PageProps) {
  const resolvedParams = await params; 
  const patternId = parseInt(resolvedParams.id, 10);
  // 1. Fetch the specific data
  const pattern = await getPatternById(patternId);
  const patternImages = await getImagesForPattern(patternId);


  if (!pattern) {
    notFound();
  }

  return (
    <main>
      <PatternViewer 
        pattern={pattern} 
        images={patternImages} 
      />
    </main>
  );
}