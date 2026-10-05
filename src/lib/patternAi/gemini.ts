import { GoogleGenerativeAI, type Part } from '@google/generative-ai';

// Ordered from most capable to lightest. When a tier is overloaded we fall
// through to the next one automatically, since lighter tiers are usually
// under less demand.
export const MODEL_TIERS = [
  { id: 'gemini-flash-latest', label: 'Flash (standard)' },
  { id: 'gemini-flash-lite-latest', label: 'Flash-Lite (lighter)' },
  { id: 'gemini-3.8-flash', label: '3.8 Flash' },
  { id: 'gemini-3.7-flash', label: '3.7 Flash' },
  { id: 'gemini-3.6-flash', label: '3.6 Flash' },
  { id: 'gemini-3.5-flash', label: '3.5 Flash' },
  { id: 'gemini-3.5-flash-lite', label: '3.5 Flash Lite' },
];

let client: GoogleGenerativeAI | null = null;
function getClient() {
  if (!process.env.GEMINI_API_KEY) throw new GeminiError('GEMINI_API_KEY is not set on the server.', false);
  client ??= new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  return client;
}

export class GeminiError extends Error {
  constructor(message: string, readonly overloaded: boolean) {
    super(message);
  }
}

// The model ran out of output room or returned JSON we couldn't parse. The
// caller can retry with a smaller piece of input.
export class GeminiOutputError extends Error {}

const isOverloaded = (message: string) =>
  /\b(429|503)\b|overloaded|high demand|service unavailable|unavailable|resource.?exhausted|rate limit/i.test(message);

export async function generateJson<T>(parts: (string | Part)[], startTier = 0): Promise<T> {
  let lastMessage = '';
  for (let tier = Math.max(0, startTier); tier < MODEL_TIERS.length; tier++) {
    const model = getClient().getGenerativeModel({
      model: MODEL_TIERS[tier].id,
      generationConfig: {
        // JSON mode guarantees escaped, parseable output (the old prompt-only
        // approach broke on stray quotes inside HTML).
        responseMimeType: 'application/json',
        maxOutputTokens: 32768,
        temperature: 0.2,
      },
    });

    let text: string;
    let finishReason: string | undefined;
    try {
      const result = await model.generateContent(parts);
      finishReason = result.response.candidates?.[0]?.finishReason;
      text = result.response.text();
    } catch (err) {
      lastMessage = err instanceof Error ? err.message : String(err);
      console.error(`Gemini ${MODEL_TIERS[tier].id} error:`, lastMessage);
      if (isOverloaded(lastMessage)) continue;
      throw new GeminiError(lastMessage, false);
    }

    if (finishReason === 'MAX_TOKENS') throw new GeminiOutputError('Response was cut off (too long).');
    try {
      return JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, '').trim()) as T;
    } catch {
      throw new GeminiOutputError('Response was not valid JSON.');
    }
  }
  throw new GeminiError(lastMessage || 'All Gemini models are busy right now.', true);
}

// Runs async tasks with a concurrency cap, preserving result order.
export async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return results;
}
