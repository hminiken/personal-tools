// src/app/crafting/actions/MediaActions.ts
'use server';

import { db } from '@/db';
import { images } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { unlink } from 'fs/promises';
import path from 'path';

export async function deleteMediaPermanently(imageId: number, imagePath: string) {
    // 1. Delete from DB (CASCADE will handle removing the image record)
    await db.delete(images).where(eq(images.id, imageId));

    // 2. Delete the actual file from disk
    // imagePath is '/uploads/123-photo.png'
    const absolutePath = path.join(process.cwd(), 'public', imagePath);
    
    try {
        await unlink(absolutePath);
    } catch (err) {
        console.error("File not found on disk, but DB record deleted.", err);
    }

    revalidatePath('/crafting/media'); // Refresh the gallery page
}

// src/app/crafting/actions/MediaActions.ts
export async function unlinkMedia(imageId: number, entityType: 'pattern' | 'project' | 'yarn') {
    const updateData: any = {};
    
    if (entityType === 'pattern') updateData.patternId = null;
    if (entityType === 'project') updateData.projectId = null;
    if (entityType === 'yarn') updateData.yarnId = null;

    await db.update(images)
        .set(updateData)
        .where(eq(images.id, imageId));

    revalidatePath('/crafting/media');
}