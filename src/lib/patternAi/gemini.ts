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

// Models whose quota is used up (e.g. the free tier's 20 requests/day), with
// when to try them again. Without this every call in a multi-chunk import
// re-tries a dead model first, which made imports take minutes. Aliases share
// quota ("gemini-flash-latest" is really e.g. gemini-3.8-flash), so the model
// named in the error is marked too.
const exhaustedUntil = new Map<string, number>();

function noteQuotaExhausted(tierId: string, message: string) {
  if (!/quota|exceeded/i.test(message)) return; // plain overload: worth retrying next call
  const seconds = Number(message.match(/"retryDelay":"(\d+)s"/)?.[1] ?? message.match(/retry in (\d+)s/i)?.[1] ?? 3600);
  const until = Date.now() + Math.min(seconds, 24 * 3600) * 1000;
  exhaustedUntil.set(tierId, until);
  for (const m of message.matchAll(/model[":\s]+(gemini-[\w.-]+)/gi)) exhaustedUntil.set(m[1], until);
}

const isExhausted = (id: string) => (exhaustedUntil.get(id) ?? 0) > Date.now();

export type ModelOption = { tier: number; id: string; label: string; availableAt: number | null };

// The model list for the UI's model picker, with when any model whose quota
// ran out becomes usable again (null = available now). Only knows about
// quota errors this server process has seen since it started.
export function getModelOptions(): ModelOption[] {
  return MODEL_TIERS.map((m, tier) => ({
    tier,
    id: m.id,
    label: m.label,
    availableAt: isExhausted(m.id) ? (exhaustedUntil.get(m.id) ?? null) : null,
  }));
}

export async function generateJson<T>(parts: (string | Part)[], startTier = 0): Promise<T> {
  let lastMessage = '';
  for (let tier = Math.max(0, startTier); tier < MODEL_TIERS.length; tier++) {
    if (isExhausted(MODEL_TIERS[tier].id)) continue;
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
      console.error(`Gemini ${MODEL_TIERS[tier].id} error:`, lastMessage.slice(0, 300));
      if (isOverloaded(lastMessage)) {
        noteQuotaExhausted(MODEL_TIERS[tier].id, lastMessage);
        continue;
      }
      throw new GeminiError(lastMessage, false);
    }

    if (finishReason === 'MAX_TOKENS') throw new GeminiOutputError('Response was cut off (too long).');
    try {
      return JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, '').trim()) as T;
    } catch {
      throw new GeminiOutputError('Response was not valid JSON.');
    }
  }
  throw new GeminiError(
    lastMessage || 'Every Gemini model is busy or out of quota right now. Free-tier quotas reset daily.',
    true,
  );
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
