import { db } from '@/db';
import { yarnStash, images, projectYarns, projects } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import YarnViewer from '../_components/YarnViewer';

export default async function YarnItemPage({ params }: { params: Promise<{ id: string }> }) {
  
  // 2. Await the params before reading them
  const resolvedParams = await params;
  
  // 3. Parse the ID safely
  const id = parseInt(resolvedParams.id, 10);

  // ... the rest of your database fetching code stays exactly the same!
  const [yarn] = await db.select().from(yarnStash).where(eq(yarnStash.id, id));
  
  if (!yarn) {
    return notFound(); 
  }
  // 3. Fetch the gallery images linked to this yarn
  const yarnImages = await db.select().from(images).where(eq(images.yarnId, id));

  // 4. Fetch the linked projects using an Inner Join on your Junction Table
  const linked = await db
    .select({
      id: projects.id,
      title: projects.title,
      status: projects.status,
      categories: projects.categories,
      hooks: projects.hookSizes

    })
    .from(projectYarns)
    .innerJoin(projects, eq(projectYarns.projectId, projects.id))
    .where(eq(projectYarns.yarnId, id));

  // 5. Pass all the fetched data safely to your Client Component
  return (
    <YarnViewer 
      yarn={yarn} 
      images={yarnImages} 
      linkedProjects={linked} 
    />
  );
}