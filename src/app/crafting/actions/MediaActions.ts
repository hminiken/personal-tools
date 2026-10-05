// src/app/crafting/actions/MediaActions.ts
'use server';

import { db } from '@/db';
import { images } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { unlink } from 'fs/promises';
import { resolveUploadPath } from '@/utils/uploads';

// Deletes the image record, and the file on disk once nothing else uses it.
// (Starting a project copies the pattern's image records, so one file can
// back several records.)
export async function deleteMediaPermanently(imageId: number) {
    const image = await db.select().from(images).where(eq(images.id, imageId)).get();
    if (!image) return;

    await db.delete(images).where(eq(images.id, imageId));

    const stillUsed = await db.select({ id: images.id }).from(images).where(eq(images.path, image.path)).get();
    const filePath = image.path.startsWith('/uploads/') ? resolveUploadPath(image.path.slice('/uploads/'.length)) : null;
    if (!stillUsed && filePath) {
        try {
            await unlink(filePath);
        } catch (err) {
            console.error('Image file was already gone; record deleted.', err);
        }
    }

    revalidatePath('/crafting/media');
}

// Detaches an image from one owner, keeping the record (it may become an orphan).
export async function unlinkMedia(imageId: number, entityType: 'pattern' | 'project' | 'yarn') {
    const column = ({ pattern: 'patternId', project: 'projectId', yarn: 'yarnId' } as const)[entityType];

    await db.update(images)
        .set({ [column]: null })
        .where(eq(images.id, imageId));

    revalidatePath('/crafting/media');
}
