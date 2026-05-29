import { images, patterns, projects } from '@/db/schema';
import { InferSelectModel } from 'drizzle-orm';

// This automatically reads the schema and generates the exact type above!
export type Project = InferSelectModel<typeof projects>;
export type Pattern = InferSelectModel<typeof patterns>;
export type PatternImage = InferSelectModel<typeof images>;