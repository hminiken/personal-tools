// src/app/crafting/actions/ImportActions.ts
'use server';

import { db } from '@/db';
import { patterns } from '@/db/schema';

export async function saveImportedPattern(data: any) {
  // Mapping the AI JSON structure to your 5-tab schema
  return await db.insert(patterns).values({
    title: data.title,
    
    // The 5 Tabs
    materials: data.materials,      // Matches your 'materials' column
    sizing: data.sizing,            // Matches your 'sizing' column
    abbreviations: data.abbreviations, // Matches your 'abbreviations' column
    notes: data.notes,              // Matches your 'notes' column
    content: data.content,          // Matches your 'content' column
    
    // Classifications
    categories: data.categories,
    status: 'planned', // Default status
  });
}