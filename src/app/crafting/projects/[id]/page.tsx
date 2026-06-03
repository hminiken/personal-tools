// src/app/crafting/projects/[id]/page.tsx
import { db } from '@/db';
import { patterns, projects, images, projectYarns, yarnStash} from '@/db/schema';
import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import ProjectWorkspace from  './_components/ProjectWorkspace'

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectPage({ params }: PageProps) {
  const resolvedParams = await params;
  const projectId = parseInt(resolvedParams.id, 10);
  
  // Fetch the project data
  const project = await db.select().from(projects).where(eq(projects.id, projectId)).get();
  
  if (!project) notFound();

  // Fetch the parent pattern data
  const pattern = await db.select().from(patterns).where(eq(patterns.id, project.patternId)).get();
  const projectImages = await db.select().from(images).where(eq(images.projectId, projectId)).all();
const id = parseInt(resolvedParams.id, 10);
// 1. Fetch Yarns currently linked to this project
  const linkedYarns = await db
    .select({
      // Explicitly map these so your component can find them!
      id: yarnStash.id,
      yarnId: yarnStash.id, 
      title: yarnStash.title,
      brand: yarnStash.brand,
      weight: yarnStash.weight,
      color_tags: yarnStash.color_tags,
      fiber_tags: yarnStash.fiber_tags,
      coverImagePath: yarnStash.coverImagePath,
    })
    .from(projectYarns)
    .innerJoin(yarnStash, eq(projectYarns.yarnId, yarnStash.id))
    .where(eq(projectYarns.projectId, id));

  // 2. Fetch the entire available stash for the modal to browse
  const entireStash = await db.select().from(yarnStash);

  if (!pattern) notFound();

  return (
    <main>
      <ProjectWorkspace project={project} pattern={pattern} images={projectImages} linkedYarns={linkedYarns} availableStash={entireStash} />
      
    </main>
  );
}