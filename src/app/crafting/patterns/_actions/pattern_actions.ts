'use server'

import { db } from "@db";
import { patterns, projects, images } from "@db/schema"; 
import { redirect } from "next/navigation";
import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';

// ==========================================
// CREATE & FETCH
// ==========================================

export async function createNewPattern(formData: FormData) {
  const title = formData.get('title') as string;
  const sourceUrl = formData.get('sourceUrl') as string;

  // Insert the blank pattern into the database
  const newPattern = await db.insert(patterns).values({
    title,
    sourceUrl: sourceUrl || null, // Allow it to be empty
  }).returning();

  // Redirect instantly to the new pattern's edit page
  redirect(`/crafting/patterns/${newPattern[0].id}`);
}

export async function getPatternById(id: number) {
  return await db.select().from(patterns).where(eq(patterns.id, id)).get();
}

export async function getImagesForPattern(patternId: number) {
  return await db.select().from(images).where(eq(images.patternId, patternId)).all();
}

// ==========================================
// PROJECTS
// ==========================================

export async function spawnProject(formData: FormData) {
  const patternId = Number(formData.get('patternId'));
  const title = formData.get('title') as string;
  const sourceUrl = formData.get('sourceUrl') as string;
  const colors = formData.get('colors') as string;
  
  // Mapping old form inputs to new schema names
  const yarn = formData.get('yarnUsed') as string; 
  const hooks = formData.get('hookSizes') as string; 
  const weights = formData.get('yarnWeights') as string; 

  // Grab the master pattern to copy its text
  const masterPattern = await db.select().from(patterns).where(eq(patterns.id, patternId)).get();

  // Insert the new project WITH the cloned text
  const newProject = await db.insert(projects).values({
    patternId,
    title,
    yarn,         // ✨ NEW SCHEMA NAME
    colors,
    hooks,        // ✨ NEW SCHEMA NAME
    weights,      // ✨ NEW SCHEMA NAME
    sourceUrl,
    content: masterPattern?.content || '', // ✨ NEW SCHEMA NAME (The magic clone!)
  }).returning();

  const projectId = newProject[0].id;

  // Fetch all images belonging to the master pattern
  const patternImages = await db.select().from(images).where(eq(images.patternId, patternId)).all();

  // If there are images, duplicate their records for the new project
  if (patternImages.length > 0) {
    const projectImagesToInsert = patternImages.map(img => ({
      projectId: projectId, // Link to the new project
      path: img.path,       // ✨ NEW SCHEMA NAME (was imagePath)
    }));

    await db.insert(images).values(projectImagesToInsert);
  }

  redirect(`/crafting/projects/${projectId}`);
}

// ==========================================
// UPDATES
// ==========================================

export async function updatePattern(formData: FormData) {
  const patternId = Number(formData.get('patternId'));

  // Extract Metadata & Map to new schema
  const title = formData.get('title') as string;
  const sourceUrl = formData.get('sourceUrl') as string;
  const categories = formData.get('categories') as string;
  const hooks = formData.get('hookSizes') as string; 
  const weights = formData.get('yarnWeights') as string;
  
  // Checking for both the old 'yarnYardage' or new 'yardage' in case you update the frontend form later
  const yardageStr = formData.get('yarnYardage') || formData.get('yardage');
  const yardage = yardageStr ? Number(yardageStr) : null;

  // Extract Rich Text & Map to new schema
  const content = formData.get('patternText') as string; 
  const notes = formData.get('patternNotes') as string; 
  const materials = formData.get('materials') as string;
  const abbreviations = formData.get('abbreviations') as string;
  const sizing = formData.get('sizing') as string;

  // Save to Database using the exact new schema column names
  await db
    .update(patterns)
    .set({
      title, 
      hooks, 
      weights, 
      yardage, 
      sourceUrl,
      content, 
      materials, 
      abbreviations, 
      sizing, 
      notes, 
      categories
    })
    .where(eq(patterns.id, patternId));

  revalidatePath(`/crafting/patterns/${patternId}`);
  revalidatePath(`/crafting/patterns`);
}

export async function updatePatternStatus(patternId: number, status: string) {
  try {
    await db
      .update(patterns)
      .set({ status: status })
      .where(eq(patterns.id, patternId));

    return { success: true };
  } catch (error) {
    console.error('Database update failed:', error);
    return { success: false, error: 'Failed to update database' };
  }
}

// ==========================================
// DELETE
// ==========================================

export async function deletePattern(patternId: number) {
  // Since you have cascading deletes setup on your images table now, 
  // deleting the pattern will cleanly wipe its associated images too!
  await db.delete(patterns).where(eq(patterns.id, patternId));
  revalidatePath('/crafting/patterns');
}



export async function createPatternFromImport(data: any) {
  const [newPattern] = await db.insert(patterns).values({
    title: data.title || 'Untitled Import',
    sourceUrl: data.sourceUrl,
    materials: data.materials,
    sizing: data.sizing,
    abbreviations: data.abbreviations,
    notes: data.notes,
    content: data.content,
    categories: data.categories,
    hooks: data.hooks,
    weights: data.weights,
    status: 'planned', // Give it a default status
  }).returning({ id: patterns.id });
revalidatePath('/crafting/patterns');
  return newPattern.id;
}