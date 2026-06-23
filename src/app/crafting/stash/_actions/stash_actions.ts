'use server';

import { db } from '@/db'; // Adjust path if your db.ts is elsewhere
import { images, projectYarns, yarns } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { compressImage } from '@/utils/compressImage';

// 1. Fetch all yarn
export async function getYarnStash() {
  return await db.select().from(yarns).orderBy(yarns.createdAt);
}

// 2. Delete a yarn (Project connections will auto-delete thanks to our 'cascade' rule!)
export async function deleteYarn(id: number) {
  await db.delete(yarns).where(eq(yarns.id, id));
  revalidatePath('/crafting/stash');
}

// 3. Create a new yarn AND handle the photo upload
export async function createYarn(formData: FormData) {
  const title = formData.get('title') as string;
  const brand = formData.get('brand') as string;
  const weight = formData.get('weight') as string;
  const notes = formData.get('notes') as string;
  
  // Tags arrive as comma-separated strings from our UI
  const fiberTags = formData.get('fiberTags') as string;
  const colorTags = formData.get('colorTags') as string;

  // Handle the Image Upload
  const file = formData.get('photo') as File | null;
  let coverImage = null;

  if (file && file.size > 0) {
    const bytes = await file.arrayBuffer();
    // Compress before saving: cap dimensions + re-encode to ~1MB WebP.
    const buffer = await compressImage(Buffer.from(bytes));

    // Create a unique filename so you don't overwrite photos with the same name.
    // Strip the original extension since we always write WebP now.
    const baseName = file.name.replace(/\s+/g, '_').replace(/\.[^.]+$/, '');
    const uniqueFilename = `${Date.now()}-${baseName}.webp`;

    // Define where to save it (public/uploads so the browser can see it)
    const uploadDir = join(process.cwd(), 'public/uploads');
    
    // Ensure the directory exists
    await mkdir(uploadDir, { recursive: true });
    
    // Write the file to your server's hard drive
    const filepath = join(uploadDir, uniqueFilename);
    await writeFile(filepath, buffer);
    
    // Save the relative URL path for the database
    coverImage = `/uploads/${uniqueFilename}`;
  }

  // Insert into SQLite
  const [newYarn] = await db.insert(yarns).values({
    title,
    brand,
    weights: weight,
    fibers: fiberTags,
    colors: colorTags,
    notes,
    coverImage,
  }).returning({ id: yarns.id });

  // Also add the uploaded photo to the gallery (images table) so it shows up
  // in the item's photo gallery — not just as the card cover.
  if (coverImage && newYarn) {
    await db.insert(images).values({
      path: coverImage,
      yarnId: newYarn.id,
    });
  }

  // Tell Next.js to refresh the page so the new yarn instantly appears
  revalidatePath('/crafting/stash');
}


// 4. Update existing yarn details or notes
export async function updateYarn(formData: FormData) {
  const idString = formData.get('id');
  if (!idString) throw new Error("Yarn ID is required");
  const id = parseInt(idString as string, 10);

  // Extract the text fields
  const title = formData.get('title') as string;
  const brand = formData.get('brand') as string;
  const weights = formData.get('weight') as string;
  const notes = formData.get('notes') as string;
  
  // Extract tags
  const fiberTags = formData.get('fiberTags') as string;
  const colorTags = formData.get('colorTags') as string;

  // Execute the update in SQLite
  await db.update(yarns)
    .set({
      title,
      brand,
      weights,
      fibers: fiberTags,
      colors: colorTags,
      notes,
      updatedAt: new Date(), // Optional: Keeps track of when you last edited it
    })
    .where(eq(yarns.id, id));

  // Revalidate both the main list and the specific item page so the UI updates instantly
  revalidatePath('/crafting/stash');
  revalidatePath(`/crafting/stash/${id}`);
  
  return { success: true };
}

export async function linkProjectToYarn(yarnId: number, projectId: number) {
  await db.insert(projectYarns).values({
    yarnId,
    projectId,
  });

  // Revalidate both pages so the UI updates instantly everywhere
  revalidatePath(`/crafting/stash/${yarnId}`);
  revalidatePath(`/crafting/projects/${projectId}`); 
}

export async function unlinkProjectFromYarn(yarnId: number, projectId: number) {
  await db.delete(projectYarns).where(
    and(
      eq(projectYarns.yarnId, yarnId),
      eq(projectYarns.projectId, projectId)
    )
  );

  revalidatePath(`/crafting/stash/${yarnId}`);
  revalidatePath(`/crafting/projects/${projectId}`);
}