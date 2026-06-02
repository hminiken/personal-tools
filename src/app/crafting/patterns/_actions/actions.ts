'use server'

import { db } from "@db";
import { patterns } from "@db/schema";
import { redirect } from "next/navigation";
import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';




// Add this to the bottom of actions.ts
export async function createNewPattern(formData: FormData) {
  const title = formData.get('title') as string;
  const sourceUrl = formData.get('sourceUrl') as string;

  // Insert the blank pattern into the database
  const newPattern = await db.insert(patterns).values({
    title,
    sourceUrl: sourceUrl || null, // Allow it to be empty
  }).returning();

  // Redirect instantly to the new pattern's edit page
  redirect(`/crafting/patterns/${newPattern[0].id}`);
}





