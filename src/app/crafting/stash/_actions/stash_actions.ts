'use server';

import { db } from '@/db'; // Adjust path if your db.ts is elsewhere
import { images, projectYarns, yarnStash } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { writeFile, mkdir, unlink } from 'fs/promises';
import { join } from 'path';

// 1. Fetch all yarn
export async function getYarnStash() {
  return await db.select().from(yarnStash).orderBy(yarnStash.createdAt);
}

// 2. Delete a yarn (Project connections will auto-delete thanks to our 'cascade' rule!)
export async function deleteYarn(id: number) {
  await db.delete(yarnStash).where(eq(yarnStash.id, id));
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
  let coverImagePath = null;

  if (file && file.size > 0) {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create a unique filename so you don't overwrite photos with the same name
    const uniqueFilename = `${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
    
    // Define where to save it (public/uploads so the browser can see it)
    const uploadDir = join(process.cwd(), 'public/uploads');
    
    // Ensure the directory exists
    await mkdir(uploadDir, { recursive: true });
    
    // Write the file to your server's hard drive
    const filepath = join(uploadDir, uniqueFilename);
    await writeFile(filepath, buffer);
    
    // Save the relative URL path for the database
    coverImagePath = `/uploads/${uniqueFilename}`;
  }

  // Insert into SQLite
  await db.insert(yarnStash).values({
    title,
    brand,
    weight,
    fiber_tags: fiberTags,
    color_tags: colorTags,
    notes,
    coverImagePath,
  });

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
  const weight = formData.get('weight') as string;
  const notes = formData.get('notes') as string;
  
  // Extract tags
  const fiberTags = formData.get('fiberTags') as string;
  const colorTags = formData.get('colorTags') as string;

  // Execute the update in SQLite
  await db.update(yarnStash)
    .set({
      title,
      brand,
      weight,
      fiber_tags: fiberTags,
      color_tags: colorTags,
      notes,
      updatedAt: new Date().toISOString(), // Optional: Keeps track of when you last edited it
    })
    .where(eq(yarnStash.id, id));

  // Revalidate both the main list and the specific item page so the UI updates instantly
  revalidatePath('/crafting/stash');
  revalidatePath(`/crafting/stash/${id}`);
  
  return { success: true };
}

// 1. Upload a new image to the shared gallery
export async function uploadYarnImage(formData: FormData) {
  const yarnIdString = formData.get('yarnId');
  if (!yarnIdString) throw new Error("Yarn ID is required");
  const yarnId = parseInt(yarnIdString as string, 10);

  const file = formData.get('file') as File | null;
  if (!file || file.size === 0) throw new Error("No file uploaded");

  // Process and save the file locally
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const uniqueFilename = `${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
  
  const uploadDir = join(process.cwd(), 'public/uploads');
  await mkdir(uploadDir, { recursive: true });
  
  const filepath = join(uploadDir, uniqueFilename);
  await writeFile(filepath, buffer);
  
  const imagePath = `/uploads/${uniqueFilename}`;

  // Save to the shared images table
  await db.insert(images).values({
    yarnId, // Only providing yarnId, the other IDs will default to null
    imagePath,
  });

  revalidatePath(`/crafting/stash/${yarnId}`);
}
// 2. Delete an image from the gallery
export async function deleteYarnImage(imageId: number, revalidateUrl: string) {
  // Find the image so we can delete the file from the hard drive
  const [image] = await db.select().from(images).where(eq(images.id, imageId));
  
  if (image) {
    try {
      const filepath = join(process.cwd(), 'public', image.imagePath);
      await unlink(filepath);
    } catch (error) {
      console.error("Failed to delete file from disk:", error);
    }
  }

  // Delete the record from SQLite
  await db.delete(images).where(eq(images.id, imageId));
  
  // Refresh the page using the URL string passed by your ImageGallery component!
  revalidatePath(revalidateUrl); 
}

// 3. Set the cover photo (This stays on the yarnStash table)
export async function setYarnCoverImage(yarnId: number, imagePath: string) {
  await db.update(yarnStash)
    .set({ 
      coverImagePath: imagePath,
      updatedAt: new Date().toISOString()
    })
    .where(eq(yarnStash.id, yarnId));

  revalidatePath('/crafting/stash');
  revalidatePath(`/crafting/stash/${yarnId}`);
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