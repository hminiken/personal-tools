import { images, patterns, projects } from '@/db/schema';
import { InferSelectModel } from 'drizzle-orm';

// This automatically reads the schema and generates the exact type above!
export type Project = InferSelectModel<typeof projects>;
export type Pattern = InferSelectModel<typeof patterns>;
export type PatternImage = InferSelectModel<typeof images>;

// // --- TYPES ---
// export type Pattern = {
//   id: number;
//   title: string;
//   patternText: string | null;
//   materials: string | null;
//   abbreviations: string | null;
//   sizing: string | null;
//   patternNotes: string | null;
//   hookSize: string | null;
//   yarnWeight: string | null;
//   yarnYardage: number | null;
//   coverImagePath: string;

// };

// export type PatternImage = {
//   id: number;
//   imagePath: string;
//   isInline: boolean | null;
// };

// export type Project = {
//   id: number;
//   patternId: number;
//   title: string;
//   yarnUsed: string | null;
//   colors: string | null;
//   projectNotes: string | null;
//   rulerPosition: number | null;
//   createdAt: Date | null; // Note: Drizzle returns this as a Date object because of { mode: 'timestamp' }
// };