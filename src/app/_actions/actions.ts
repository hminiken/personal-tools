import { db } from "@db";
import { patterns, projects } from "@db/schema";
import { redirect } from "next/navigation";
import { desc } from 'drizzle-orm';



// src/app/crafting/_actions/dashboardActions.ts
export async function getDashboardData() {
  const latestProject = await db.select().from(projects).orderBy(desc(projects.updatedAt)).limit(1).get();
  const latestPattern = await db.select().from(patterns).orderBy(desc(patterns.updatedAt)).limit(1).get();
  return { latestProject, latestPattern };
}