'use server'

import { db } from "@/db";
import { images, patterns, projects, yarns } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { writeFile } from 'fs/promises';
import { revalidatePath } from "next/cache";
import path from "path";
import { compressImage } from "@/utils/compressImage";

// Reusable Type for knowing which entity to update
type EntityTable = 'pattern' | 'project' | 'yarn';

// ------------------------------------------------------------------
// Sets the given image as the cover ONLY if the entity doesn't
// already have one — i.e. the first image added becomes the cover.
// Shared by both the upload and library-link paths so the behavior
// is identical no matter how the image got attached.
// ------------------------------------------------------------------
async function setCoverIfMissing(entity: EntityTable, id: number, imagePath: string) {
  if (entity === 'pattern') {
    const current = await db.select().from(patterns).where(eq(patterns.id, id)).get();
    if (!current?.coverImage) {
      await db.update(patterns).set({ coverImage: imagePath }).where(eq(patterns.id, id));
    }
  } else if (entity === 'project') {
    const current = await db.select().from(projects).where(eq(projects.id, id)).get();
    if (!current?.coverImage) {
      await db.update(projects).set({ coverImage: imagePath }).where(eq(projects.id, id));
    }
  } else if (entity === 'yarn') {
    const current = await db.select().from(yarns).where(eq(yarns.id, id)).get();
    if (!current?.coverImage) {
      await db.update(yarns).set({ coverImage: imagePath }).where(eq(yarns.id, id));
    }
  }
}

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

  // Compress before saving: cap dimensions + re-encode to ~1MB WebP.
  const originalBuffer = Buffer.from(await imageFile.arrayBuffer());
  const buffer = await compressImage(originalBuffer);

  // Strip the original extension since we always write WebP now.
  const baseName = imageFile.name.replaceAll(' ', '_').replace(/\.[^.]+$/, '');
  const filename = `${Date.now()}-${baseName}.webp`;
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

  // Auto-set the cover image if one doesn't exist (first image wins)
  if (patternId) {
    await setCoverIfMissing('pattern', patternId, newImagePath);
    revalidatePath(`/crafting/patterns/${patternId}`);
  }
  else if (projectId) {
    await setCoverIfMissing('project', projectId, newImagePath);
    revalidatePath(`/crafting/projects/${projectId}`);
  }
  else if (yarnId) {
    await setCoverIfMissing('yarn', yarnId, newImagePath);
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
    revalidatePath(`/crafting/patterns`)
  } 
  else if (type === 'project') {
    await db.update(projects).set({ coverImage: imagePath }).where(eq(projects.id, id));
    revalidatePath(`/crafting/projects/${id}`);
    revalidatePath(`/crafting/projects`)
  } 
  else if (type === 'yarn') {
    await db.update(yarns).set({ coverImage: imagePath }).where(eq(yarns.id, id));
    revalidatePath(`/crafting/stash/${id}`);
    revalidatePath(`/crafting/stash`)

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

    // Auto-set the cover image if one doesn't exist (first image wins),
    // matching the behavior of a fresh upload.
    const entity = entityColumn.replace(/Id$/, '') as EntityTable;
    await setCoverIfMissing(entity, targetId, imageUrl);

    // ✨ MAGIC REFRESH TRIGGER
    revalidatePath(revalidateUrl);
}

export async function getAllLibraryImages() {
    return await db.query.images.findMany({
        orderBy: [desc(images.createdAt)],
    });
}