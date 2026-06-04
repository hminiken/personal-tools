// src/app/crafting/projects/[id]/page.tsx
import { db } from '@/db';
import { patterns, projects, images, projectYarns, yarns} from '@/db/schema';
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
      id: yarns.id,
      yarnId: yarns.id, 
      title: yarns.title,
      brand: yarns.brand,
      weight: yarns.weights,
      color_tags: yarns.colors,
      fiber_tags: yarns.fibers,
      coverImagePath: yarns.coverImage,
    })
    .from(projectYarns)
    .innerJoin(yarns, eq(projectYarns.yarnId, yarns.id))
    .where(eq(projectYarns.projectId, id));

  // 2. Fetch the entire available stash for the modal to browse
  const entireStash = await db.select().from(yarns);

  if (!pattern) notFound();

  return (
    <main>
      <ProjectWorkspace project={project} pattern={pattern} images={projectImages} linkedYarns={linkedYarns} availableStash={entireStash} />
      
    </main>
  );
}