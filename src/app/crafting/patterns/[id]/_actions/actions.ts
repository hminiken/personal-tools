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



// Add this function at the bottom
export async function getImagesForPattern(patternId: number) {
  return await db.select().from(images).where(eq(images.patternId, patternId)).all();
}

export async function getPatternById(id: number) {
  const result = await db.select().from(patterns).where(eq(patterns.id, id)).get();
  return result;
}



export async function spawnProject(formData: FormData) {
  const patternId = Number(formData.get('patternId'));
  const title = formData.get('title') as string;
  const yarnUsed = formData.get('yarnUsed') as string;
  const colors = formData.get('colors') as string;

  // Insert the new project
  const newProject = await db.insert(projects).values({
    patternId,
    title,
    yarnUsed,
    colors,
  }).returning();

  const projectId = newProject[0].id;

  // Fetch all images belonging to the master pattern
  const patternImages = await db.select().from(images).where(eq(images.patternId, patternId)).all();

  // If there are images, duplicate their records for the new project
  if (patternImages.length > 0) {
    const projectImagesToInsert = patternImages.map(img => ({
      projectId: projectId, // Link to the new project
      patternId: null,      // Explicitly detach from pattern so they are independent
      imagePath: img.imagePath, // Point to the exact same file on the hard drive
      isInline: img.isInline
    }));
    
    await db.insert(images).values(projectImagesToInsert);
  }

  redirect(`/crafting/projects/${projectId}`);
}

export async function updatePattern(formData: FormData) {
  const patternId = Number(formData.get('patternId'));
  
  // 1. Build a payload of ONLY the text fields that were actually submitted
  // formData.has() checks if the field exists in the form at all
  const textUpdates: any = {};
  
  if (formData.has('patternText')) textUpdates.patternText = formData.get('patternText');
  if (formData.has('materials')) textUpdates.materials = formData.get('materials');
  if (formData.has('abbreviations')) textUpdates.abbreviations = formData.get('abbreviations');
  if (formData.has('sizing')) textUpdates.sizing = formData.get('sizing');
  if (formData.has('patternNotes')) textUpdates.patternNotes = formData.get('patternNotes');

  // 2. Only run the text update if we actually received text fields
  if (Object.keys(textUpdates).length > 0) {
    await db
      .update(patterns)
      .set(textUpdates)
      .where(eq(patterns.id, patternId));
  }

  // 3. Handle the Image Upload (This stays exactly the same)
 const imageFile = formData.get('image') as File | null;
  if (imageFile && imageFile.size > 0) {
    const buffer = Buffer.from(await imageFile.arrayBuffer());
    const filename = `${Date.now()}-${imageFile.name.replaceAll(' ', '_')}`;
    const filepath = path.join(process.cwd(), 'public/uploads', filename);
    await writeFile(filepath, buffer);

    const newImagePath = `/uploads/${filename}`;
    await db.insert(images).values({
      patternId,
      imagePath: newImagePath,
      isInline: false,
    });

    // Check if pattern already has a cover. If not, make this the cover!
    const currentPattern = await db.select().from(patterns).where(eq(patterns.id, patternId)).get();
    if (!currentPattern?.coverImagePath) {
      await db.update(patterns).set({ coverImagePath: newImagePath }).where(eq(patterns.id, patternId));
    }
  }

  revalidatePath(`/crafting/patterns/${patternId}`);
  revalidatePath(`/crafting/patterns`);
}



