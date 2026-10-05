import { db } from "@db";
import { patterns, projects } from "@db/schema";
import { desc } from 'drizzle-orm';

// Most recently touched project and pattern, for the dashboard cards.
export async function getDashboardData() {
  const latestProject = await db.select().from(projects).orderBy(desc(projects.updatedAt)).limit(1).get();
  const latestPattern = await db.select().from(patterns).orderBy(desc(patterns.updatedAt)).limit(1).get();
  return { latestProject, latestPattern };
}
