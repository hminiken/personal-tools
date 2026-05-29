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
  const sourceUrl = formData.get('sourceUrl') as string;
  const colors = formData.get('colors') as string;
  const hookSizes = formData.get('hookSizes') as string;
  const yarnWeights = formData.get('yarnWeights') as string;

  // Grab the master pattern to copy its text
  const masterPattern = await db.select().from(patterns).where(eq(patterns.id, patternId)).get();

  // Insert the new project WITH the cloned text
  const newProject = await db.insert(projects).values({
    patternId,
    title,
    yarnUsed,
    colors,
    hookSizes,
    yarnWeights,
    sourceUrl ,
    annotatedPattern: masterPattern?.patternText || '', // The magic clone!
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

// 1. The Text & Metadata Update Action
export async function updatePattern(formData: FormData) {
  const patternId = Number(formData.get('patternId'));
  
  // Extract Metadata
  const title = formData.get('title') as string;
  const hookSizes = formData.get('hookSizes') as string;
  const yarnWeights = formData.get('yarnWeights') as string;
  const yarnYardage = formData.get('yarnYardage') ? Number(formData.get('yarnYardage')) : null;
  const sourceUrl = formData.get('sourceUrl') as string;

  // Extract Rich Text
  const patternText = formData.get('patternText') as string;
  const materials = formData.get('materials') as string;
  const abbreviations = formData.get('abbreviations') as string;
  const sizing = formData.get('sizing') as string;
  const patternNotes = formData.get('patternNotes') as string;

  // Save to Database
  await db
    .update(patterns)
    .set({ 
      title, hookSizes, yarnWeights, yarnYardage, sourceUrl, 
      patternText, materials, abbreviations, sizing, patternNotes 
    })
    .where(eq(patterns.id, patternId));

  revalidatePath(`/crafting/patterns/${patternId}`);
  revalidatePath(`/crafting/patterns`); 
}

// 2. The Image Upload Action
export async function uploadPatternImage(formData: FormData) {
  const patternId = Number(formData.get('patternId'));
  const imageFile = formData.get('image') as File | null;
  
  if (imageFile && imageFile.size > 0) {
    const buffer = Buffer.from(await imageFile.arrayBuffer());
    const filename = `${Date.now()}-${imageFile.name.replaceAll(' ', '_')}`;
    const filepath = path.join(process.cwd(), 'public/uploads', filename);
    
    // Note: Make sure 'fs/promises' and 'path' are imported at the top of your file!
    await writeFile(filepath, buffer);

    const newImagePath = `/uploads/${filename}`;
    await db.insert(images).values({
      patternId,
      imagePath: newImagePath,
      isInline: false,
    });

    // Auto-set as cover if none exists
    const currentPattern = await db.select().from(patterns).where(eq(patterns.id, patternId)).get();
    if (!currentPattern?.coverImagePath) {
      await db.update(patterns).set({ coverImagePath: newImagePath }).where(eq(patterns.id, patternId));
    }
  }
  revalidatePath(`/crafting/patterns/${patternId}`);
}



export async function updatePatternStatus(patternId: number, status: string ) {
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
