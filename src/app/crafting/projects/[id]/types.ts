import { images, patterns, projects, yarnStash, projectYarns } from '@/db/schema';
import { InferSelectModel } from 'drizzle-orm';

// This automatically reads the schema and generates the exact type above!
export type Project = InferSelectModel<typeof projects>;
export type Pattern = InferSelectModel<typeof patterns>;
export type PatternImage = InferSelectModel<typeof images>;
export type yarnStash = InferSelectModel<typeof yarnStash>;
export type projectYarns = InferSelectModel<typeof projectYarns>;
