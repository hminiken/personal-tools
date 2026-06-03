'use server'

import { db } from "@/db";
import { images, patterns, projects, yarnStash } from "@/db/schema";
import { eq } from "drizzle-orm";
import { writeFile } from 'fs/promises';
import { revalidatePath } from "next/cache";
import path from "path";

// ------------------------------------------------------------------
// 1. UNIVERSAL UPLOAD ACTION
// ------------------------------------------------------------------
export async function uploadImage(formData: FormData) {
  // Check which ID was sent by the frontend modal
  const patternId = formData.get('patternId') ? Number(formData.get('patternId')) : null;
  const projectId = formData.get('projectId') ? Number(formData.get('projectId')) : null;
  const yarnId = formData.get('yarnId') ? Number(formData.get('yarnId')) : null;
  
  // Always look for 'file'
  const imageFile = formData.get('file') as File | null; 
  
  if (!imageFile || imageFile.size === 0) return;

  // Save the file to the hard drive
  const buffer = Buffer.from(await imageFile.arrayBuffer());
  const filename = `${Date.now()}-${imageFile.name.replaceAll(' ', '_')}`;
  const filepath = path.join(process.cwd(), 'public/uploads', filename);
  await writeFile(filepath, buffer);

  const newImagePath = `/uploads/${filename}`;

  // Insert into the database, linking whichever ID is present
  await db.insert(images).values({
    imagePath: newImagePath,
    patternId,
    projectId,
    yarnId,
  });

  // Auto-set the cover image if one doesn't exist
  if (patternId) {
    const current = await db.select().from(patterns).where(eq(patterns.id, patternId)).get();
    if (!current?.coverImagePath) {
      await db.update(patterns).set({ coverImagePath: newImagePath }).where(eq(patterns.id, patternId));
    }
    revalidatePath(`/crafting/patterns/${patternId}`);
  } 
  else if (projectId) {
    const current = await db.select().from(projects).where(eq(projects.id, projectId)).get();
    if (!current?.coverImagePath) {
      await db.update(projects).set({ coverImagePath: newImagePath }).where(eq(projects.id, projectId));
    }
    revalidatePath(`/crafting/projects/${projectId}`);
  }
  else if (yarnId) {
    const current = await db.select().from(yarnStash).where(eq(yarnStash.id, yarnId)).get();
    if (!current?.coverImagePath) {
      await db.update(yarnStash).set({ coverImagePath: newImagePath }).where(eq(yarnStash.id, yarnId));
    }
    revalidatePath(`/crafting/stash/${yarnId}`);
  }
}

// ------------------------------------------------------------------
// 2. UNIVERSAL SET COVER ACTION
// ------------------------------------------------------------------
export async function setCoverImage(id: number, imagePath: string, type: 'pattern' | 'project' | 'yarn') {
  if (type === 'pattern') {
    await db.update(patterns).set({ coverImagePath: imagePath }).where(eq(patterns.id, id));
    revalidatePath(`/crafting/patterns/${id}`);
  } 
  else if (type === 'project') {
    await db.update(projects).set({ coverImagePath: imagePath }).where(eq(projects.id, id));
    revalidatePath(`/crafting/projects/${id}`);
  } 
  else if (type === 'yarn') {
    await db.update(yarnStash).set({ coverImagePath: imagePath }).where(eq(yarnStash.id, id));
    revalidatePath(`/crafting/stash/${id}`);
  }
}

// ------------------------------------------------------------------
// 3. UNIVERSAL DELETE ACTION
// ------------------------------------------------------------------
export async function deleteImage(imageId: number, revalidateUrl: string) {
  await db.delete(images).where(eq(images.id, imageId));
  revalidatePath(revalidateUrl);
}