'use server'

import { db } from "@db";
import { patterns, projects, images } from "@db/schema"; 
import { redirect } from "next/navigation";
import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { sanitizePatternHtml } from "@/utils/sanitizeHtml";
import { localizeImages } from "@/utils/localizeImages";

// ==========================================
// CREATE & FETCH
// ==========================================

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

export async function getPatternById(id: number) {
  return await db.select().from(patterns).where(eq(patterns.id, id)).get();
}

export async function getImagesForPattern(patternId: number) {
  return await db.select().from(images).where(eq(images.patternId, patternId)).all();
}

// ==========================================
// PROJECTS
// ==========================================

export async function spawnProject(formData: FormData) {
  const patternId = Number(formData.get('patternId'));
  const title = formData.get('title') as string;
  const sourceUrl = formData.get('sourceUrl') as string;
  const colors = formData.get('colors') as string;
  
  // Mapping old form inputs to new schema names
  const yarn = formData.get('yarnUsed') as string; 
  const hooks = formData.get('hookSizes') as string; 
  const weights = formData.get('yarnWeights') as string; 

  // Grab the master pattern to copy its text
  const masterPattern = await db.select().from(patterns).where(eq(patterns.id, patternId)).get();

  // Insert the new project WITH the cloned text
  const newProject = await db.insert(projects).values({
    patternId,
    title,
    yarn,         // ✨ NEW SCHEMA NAME
    colors,
    hooks,        // ✨ NEW SCHEMA NAME
    weights,      // ✨ NEW SCHEMA NAME
    craftType: masterPattern?.craftType || 'crochet', // inherit crochet/knitting
    sourceUrl,
    content: masterPattern?.content || '', // ✨ NEW SCHEMA NAME (The magic clone!)
  }).returning();

  const projectId = newProject[0].id;

  // Fetch all images belonging to the master pattern
  const patternImages = await db.select().from(images).where(eq(images.patternId, patternId)).all();

  // If there are images, duplicate their records for the new project
  if (patternImages.length > 0) {
    const projectImagesToInsert = patternImages.map(img => ({
      projectId: projectId, // Link to the new project
      path: img.path,       // ✨ NEW SCHEMA NAME (was imagePath)
    }));

    await db.insert(images).values(projectImagesToInsert);
  }

  redirect(`/crafting/projects/${projectId}`);
}

// ==========================================
// UPDATES
// ==========================================

export async function updatePattern(formData: FormData) {
  const patternId = Number(formData.get('patternId'));

  // Build a PARTIAL update: only write columns whose fields were actually
  // submitted. The "Edit Details" form omits the rich-text fields, so writing
  // them unconditionally (as this used to) wiped content/materials/etc. to
  // null every time you saved details. Guarding each field prevents that.
  const updateData: Partial<typeof patterns.$inferInsert> = {};

  // Metadata (mapping form keys -> schema columns)
  if (formData.has('title')) updateData.title = formData.get('title') as string;
  if (formData.has('sourceUrl')) updateData.sourceUrl = formData.get('sourceUrl') as string;
  if (formData.has('categories')) updateData.categories = formData.get('categories') as string;
  if (formData.has('craftType')) updateData.craftType = formData.get('craftType') as string;
  if (formData.has('hookSizes')) updateData.hooks = formData.get('hookSizes') as string;
  if (formData.has('yarnWeights')) updateData.weights = formData.get('yarnWeights') as string;

  // Supports both the old 'yarnYardage' and new 'yardage' keys
  const yardageStr = formData.get('yarnYardage') ?? formData.get('yardage');
  if (yardageStr !== null) updateData.yardage = yardageStr ? Number(yardageStr) : null;

  // Rich text (only present when submitted from the tabs/content form)
  if (formData.has('patternText')) updateData.content = formData.get('patternText') as string;
  if (formData.has('patternNotes')) updateData.notes = formData.get('patternNotes') as string;
  if (formData.has('materials')) updateData.materials = formData.get('materials') as string;
  if (formData.has('abbreviations')) updateData.abbreviations = formData.get('abbreviations') as string;
  if (formData.has('sizing')) updateData.sizing = formData.get('sizing') as string;

  if (Object.keys(updateData).length > 0) {
    await db.update(patterns).set(updateData).where(eq(patterns.id, patternId));
  }

  revalidatePath(`/crafting/patterns/${patternId}`);
  revalidatePath(`/crafting/patterns`);
}

export async function updatePatternStatus(patternId: number, status: string) {
  try {
    await db
      .update(patterns)
      .set({ status: status })
      .where(eq(patterns.id, patternId));

    // The gallery card shows the status badge, so refresh it too.
    revalidatePath('/crafting/patterns');
    revalidatePath(`/crafting/patterns/${patternId}`);
    return { success: true };
  } catch (error) {
    console.error('Database update failed:', error);
    return { success: false, error: 'Failed to update database' };
  }
}

// ==========================================
// DELETE
// ==========================================

// Returns an error message instead of throwing: server action errors are
// replaced with a generic message in production, so the UI couldn't say why.
export async function deletePattern(patternId: number): Promise<{ error: string } | void> {
  // Projects reference their pattern (and read its materials/sizing/notes),
  // and foreign keys are enforced, so the delete would fail anyway.
  const linked = await db.select({ title: projects.title }).from(projects).where(eq(projects.patternId, patternId)).all();
  if (linked.length > 0) {
    const names = linked.map((p) => `"${p.title}"`).join(', ');
    return {
      error: `This pattern is used by ${linked.length === 1 ? 'a project' : `${linked.length} projects`} (${names}). Delete ${linked.length === 1 ? 'it' : 'them'} first.`,
    };
  }

  // Images cascade with the pattern.
  await db.delete(patterns).where(eq(patterns.id, patternId));
  revalidatePath('/crafting/patterns');
}



// What the Smart Import review page sends back (all fields optional: the AI
// may not have found them).
type ImportedPattern = Partial<Record<
  'title' | 'sourceUrl' | 'materials' | 'sizing' | 'abbreviations' | 'notes' | 'content' |
  'categories' | 'craftType' | 'hooks' | 'weights',
  string | null
>>;

export async function createPatternFromImport(data: ImportedPattern) {
  // Copy imported images into our own uploads (compressed) instead of
  // hotlinking the source site.
  const html = await localizeImages(
    {
      materials: sanitizePatternHtml(data.materials),
      sizing: sanitizePatternHtml(data.sizing),
      abbreviations: sanitizePatternHtml(data.abbreviations),
      notes: sanitizePatternHtml(data.notes),
      content: sanitizePatternHtml(data.content),
    },
    { referer: data.sourceUrl },
  );
  const [newPattern] = await db.insert(patterns).values({
    title: data.title || 'Untitled Import',
    sourceUrl: data.sourceUrl,
    materials: html.materials,
    sizing: html.sizing,
    abbreviations: html.abbreviations,
    notes: html.notes,
    content: html.content,
    categories: data.categories,
    craftType: data.craftType === 'knitting' ? 'knitting' : 'crochet',
    hooks: data.hooks,
    weights: data.weights,
    status: 'Not Started', // must match one of the pattern status options
  }).returning({ id: patterns.id });
revalidatePath('/crafting/patterns');
  return newPattern.id;
}