'use server';

import { getModelOptions, type ModelOption } from '@/lib/patternAi/gemini';

// Model list for the Gemini model pickers (import + Tailor with AI).
export async function listGeminiModels(): Promise<ModelOption[]> {
  return getModelOptions();
}
