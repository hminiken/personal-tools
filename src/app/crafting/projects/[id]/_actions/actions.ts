// src/app/actions.ts
'use server';

import { db } from '@/db';
import { patterns, projects } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { writeFile } from 'fs/promises';
import path from 'path';
import { images } from '@/db/schema'; // Make sure images is imported from your schema

// 2. Add an action to silently save the highlighter position
export async function saveRulerPosition(projectId: number, yPosition: number) {
  // 1. Debugging: See what the server is actually receiving
  console.log(`Saving ruler. Project ID: ${projectId}, Y: ${yPosition}`);

  // 2. Strict validation: If the ID is missing or invalid, abort safely
  if (!projectId || isNaN(projectId)) {
    console.error("Failed to save ruler: Invalid Project ID");
    return;
  }

  // 3. Strict validation: Ensure yPosition is a valid number
  if (typeof yPosition !== 'number' || isNaN(yPosition)) {
    console.error("Failed to save ruler: Invalid Y Position");
    return;
  }

  // 4. Safely execute the update
  try {
    await db
      .update(projects)
      .set({ rulerPosition: Math.round(yPosition) }) // Ensure integer for SQLite
      .where(eq(projects.id, projectId));
  } catch (error) {
    console.error("Database error saving ruler:", error);
  }
}



// Add this to your existing actions.ts file
export async function updateProject(formData: FormData) {
  const projectId = Number(formData.get('projectId'));
  const title = formData.get('title') as string;
  const yarnUsed = formData.get('yarnUsed') as string;
  const colors = formData.get('colors') as string;
  const projectNotes = formData.get('projectNotes') as string;

  await db
    .update(projects)
    .set({ title, yarnUsed, colors, projectNotes })
    .where(eq(projects.id, projectId));

  // Refresh the specific project page
  revalidatePath(`/crafting/projects/${projectId}`);
}