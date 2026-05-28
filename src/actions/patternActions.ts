
export async function uploadProjectImage(formData: FormData) {
  const projectId = Number(formData.get('projectId'));
  const imageFile = formData.get('image') as File | null;
  
  if (imageFile && imageFile.size > 0) {
    const buffer = Buffer.from(await imageFile.arrayBuffer());
    const filename = `${Date.now()}-${imageFile.name.replaceAll(' ', '_')}`;
    const filepath = path.join(process.cwd(), 'public/uploads', filename);
    await writeFile(filepath, buffer);

    await db.insert(images).values({
      projectId,
      imagePath: `/uploads/${filename}`,
      isInline: false,
    });
  }
  revalidatePath(`/crafting/projects/${projectId}`);
}

// 3. NEW UNIVERSAL DELETE ACTION
export async function deleteImage(imageId: number, revalidateUrl: string) {
  // We only delete the database row. We leave the file on the hard drive 
  // so we don't accidentally break the master pattern if they share a file!
  await db.delete(images).where(eq(images.id, imageId));
  revalidatePath(revalidateUrl);
}


// 1. New action to manually set a cover
export async function setCoverImage(patternId: number, imagePath: string) {
  await db
    .update(patterns)
    .set({ coverImagePath: imagePath })
    .where(eq(patterns.id, patternId));
    
  revalidatePath(`/crafting/patterns/${patternId}`);
  revalidatePath(`/crafting/patterns`);
}
