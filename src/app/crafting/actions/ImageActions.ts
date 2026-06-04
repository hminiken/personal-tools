'use server'

import { db } from "@/db";
import { images, patterns, projects, yarns } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { writeFile } from 'fs/promises';
import { revalidatePath } from "next/cache";
import path from "path";

// Reusable Type for knowing which column to update
type EntityColumn = 'patternId' | 'projectId' | 'yarnId';
type EntityTable = 'pattern' | 'project' | 'yarn';

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
    path: newImagePath,
    patternId,
    projectId,
    yarnId,
  });

  // Auto-set the cover image if one doesn't exist
  if (patternId) {
    const current = await db.select().from(patterns).where(eq(patterns.id, patternId)).get();
    if (!current?.coverImage) {
      await db.update(patterns).set({ coverImage: newImagePath }).where(eq(patterns.id, patternId));
    }
    revalidatePath(`/crafting/patterns/${patternId}`);
  } 
  else if (projectId) {
    const current = await db.select().from(projects).where(eq(projects.id, projectId)).get();
    if (!current?.coverImage) {
      await db.update(projects).set({ coverImage: newImagePath }).where(eq(projects.id, projectId));
    }
    revalidatePath(`/crafting/projects/${projectId}`);
  }
  else if (yarnId) {
    const current = await db.select().from(yarns).where(eq(yarns.id, yarnId)).get();
    if (!current?.coverImage) {
      await db.update(yarns).set({ coverImage: newImagePath }).where(eq(yarns.id, yarnId));
    }
    revalidatePath(`/crafting/stash/${yarnId}`);
  }
}

// ------------------------------------------------------------------
// 2. UNIVERSAL SET COVER ACTION
// ------------------------------------------------------------------
export async function setCoverImage(id: number, imagePath: string, type: 'pattern' | 'project' | 'yarn') {
  if (type === 'pattern') {
    await db.update(patterns).set({ coverImage: imagePath }).where(eq(patterns.id, id));
    revalidatePath(`/crafting/patterns/${id}`);
  } 
  else if (type === 'project') {
    await db.update(projects).set({ coverImage: imagePath }).where(eq(projects.id, id));
    revalidatePath(`/crafting/projects/${id}`);
  } 
  else if (type === 'yarn') {
    await db.update(yarns).set({ coverImage: imagePath }).where(eq(yarns.id, id));
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

export async function linkLibraryImageAction(
    entityColumn: string, 
    imageUrl: string, 
    targetId: number, 
    revalidateUrl: string // ✨ NEW
) {
    await db.insert(images).values({
        path: imageUrl,
        [entityColumn]: targetId,
    });
    
    // ✨ MAGIC REFRESH TRIGGER
    revalidatePath(revalidateUrl); 
}

export async function getAllLibraryImages() {
    return await db.query.images.findMany({
        orderBy: [desc(images.createdAt)],
    });
}