// src/app/actions.ts
'use server';

import { db } from '@/db';
import { projects, projectYarns } from '@/db/schema';
import { and, eq } from 'drizzle-orm';

import { revalidatePath } from 'next/cache';

// 2. Add an action to silently save the highlighter position
export async function saveRulerPosition(projectId: number, yPosition: number) {

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
      .set({ ruler: Math.round(yPosition) }) // Ensure integer for SQLite
      .where(eq(projects.id, projectId));
  } catch (error) {
    console.error("Database error saving ruler:", error);
  }
}



// Add this to your existing actions.ts file
export async function updateProject(formData: FormData) {
  const projectId = Number(formData.get('projectId'));

  // PARTIAL update: only write columns whose fields were actually submitted,
  // so a form that omits the rich-text fields (e.g. an "edit details" save)
  // can't wipe the annotated pattern or project notes to null.
  const updateData: Partial<typeof projects.$inferInsert> = {};

  if (formData.has('title')) updateData.title = formData.get('title') as string;
  if (formData.has('sourceUrl')) updateData.sourceUrl = formData.get('sourceUrl') as string;
  if (formData.has('yarnUsed')) updateData.yarn = formData.get('yarnUsed') as string;
  if (formData.has('colors')) updateData.colors = formData.get('colors') as string;
  if (formData.has('craftType')) updateData.craftType = formData.get('craftType') as string;
  if (formData.has('hookSizes')) updateData.hooks = formData.get('hookSizes') as string;
  if (formData.has('yarnWeights')) updateData.weights = formData.get('yarnWeights') as string;
  if (formData.has('categories')) updateData.categories = formData.get('categories') as string;
  if (formData.has('projectNotes')) updateData.notes = formData.get('projectNotes') as string;
  if (formData.has('annotatedPattern')) updateData.content = formData.get('annotatedPattern') as string;

  if (Object.keys(updateData).length > 0) {
    await db.update(projects).set(updateData).where(eq(projects.id, projectId));
  }

  revalidatePath(`/crafting/projects/${projectId}`);
}



export async function addQuickNote(projectId: number, newNote: string) {
  // 1. Get the current notes
  const project = await db.select({ notes: projects.notes })
    .from(projects)
    .where(eq(projects.id, projectId))
    .get();

  // 2. Append the new note with a timestamp
const timestamp = new Date().toLocaleDateString('en-US', {
  year: '2-digit',
  month: 'numeric',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  hour12: true
}).replace(',', '').toLowerCase();

const formattedNote = `<p><strong>[${timestamp}]</strong> ${newNote}</p>`;
const updatedNotes = (project?.notes || '') + formattedNote;


  // 3. Save
  await db.update(projects)
    .set({ notes: updatedNotes })
    .where(eq(projects.id, projectId));

  revalidatePath(`/crafting/projects/${projectId}`);
}


export async function updateProjectStatus(projectId: number, status: string ) {
    try {
    await db
      .update(projects)
      .set({ status: status })
      .where(eq(projects.id, projectId));
      
    return { success: true };
  } catch (error) {
    console.error('Database update failed:', error);
    return { success: false, error: 'Failed to update database' };
  }
}


export async function deleteProject(projectId: number) {
    await db.delete(projects).where(eq(projects.id, projectId));
    revalidatePath('/crafting/projects');
}



export async function linkYarnToProject(projectId: number, yarnId: number) {
  await db.insert(projectYarns).values({ projectId, yarnId });
  revalidatePath(`/crafting/projects/${projectId}`);
  revalidatePath(`/crafting/stash/${yarnId}`);
}

export async function unlinkYarnFromProject(projectId: number, yarnId: number) {
  await db.delete(projectYarns).where(
    and(
      eq(projectYarns.projectId, projectId),
      eq(projectYarns.yarnId, yarnId)
    )
  );
  revalidatePath(`/crafting/projects/${projectId}`);
  revalidatePath(`/crafting/stash/${yarnId}`);
}

