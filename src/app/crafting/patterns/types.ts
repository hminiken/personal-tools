// --- TYPES ---
export type Pattern = {
  id: number;
  title: string;
  patternText: string | null;
  materials: string | null;
  abbreviations: string | null;
  sizing: string | null;
  patternNotes: string | null;
  hookSize: string | null;
  yarnWeight: string | null;
  yarnYardage: number | null;
  coverImagePath: string;

};

export type PatternImage = {
  id: number;
  imagePath: string;
  isInline: boolean | null;
};