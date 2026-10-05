import { db } from '@/db';
import { yarns, images, projectYarns, projects } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import YarnViewer from '../_components/YarnViewer';

export default async function YarnItemPage({ params }: { params: Promise<{ id: string }> }) {
  const id = parseInt((await params).id, 10);
  if (Number.isNaN(id)) notFound();

  const yarn = await db.select().from(yarns).where(eq(yarns.id, id)).get();
  if (!yarn) notFound();

  const yarnImages = await db.select().from(images).where(eq(images.yarnId, id));

  // Projects this yarn is linked to
  const linked = await db
    .select({
      id: projects.id,
      title: projects.title,
      status: projects.status,
      categories: projects.categories,
      hooks: projects.hooks,
    })
    .from(projectYarns)
    .innerJoin(projects, eq(projectYarns.projectId, projects.id))
    .where(eq(projectYarns.yarnId, id));

  return <YarnViewer yarn={yarn} images={yarnImages} linkedProjects={linked} />;
}
