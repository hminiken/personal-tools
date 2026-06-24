// src/app/api/extract-pattern/route.ts
import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// Ordered from most capable to lightest. When a tier is overloaded (503) the
// client can retry with the next one down, which is usually under less demand.
const MODEL_TIERS = [
  { id: 'gemini-flash-latest', label: 'Flash (standard)' },
  { id: 'gemini-flash-lite-latest', label: 'Flash-Lite (lighter)' },
  { id: 'gemini-2.5-flash', label: '2.5 Flash ' },
];

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get('content-type') || '';

    let sourceUrl: string | null = null;
    let rawText: string | null = null;
    let pdfPart: { inlineData: { data: string; mimeType: string } } | null = null;
    let modelTier = 0;

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      sourceUrl = (formData.get('sourceUrl') as string) || null;
      rawText = (formData.get('rawText') as string) || null;
      modelTier = Number(formData.get('modelTier')) || 0;

      const file = formData.get('pdf');
      if (file && file instanceof File) {
        if (file.type !== 'application/pdf') {
          return NextResponse.json({ error: 'Uploaded file must be a PDF.' }, { status: 400 });
        }
        const bytes = Buffer.from(await file.arrayBuffer());
        pdfPart = {
          inlineData: { data: bytes.toString('base64'), mimeType: 'application/pdf' },
        };
      }
    } else {
      const body = await req.json();
      sourceUrl = body.sourceUrl || null;
      rawText = body.rawText || null;
      modelTier = Number(body.modelTier) || 0;
    }

    // Clamp to a valid tier index.
    modelTier = Math.min(Math.max(0, modelTier), MODEL_TIERS.length - 1);

    let textToParse = rawText;

    if (sourceUrl && !rawText && !pdfPart) {
      try {
        const response = await fetch(sourceUrl);
        if (!response.ok) throw new Error('Failed to fetch URL');
        
        const html = await response.text();
        const $ = cheerio.load(html);
        
        // 1. Clean out layout junk
        $('script, style, noscript, nav, header, footer, aside, iframe, svg, form').remove();
      
        $('img').each((_, img) => {
          const $img = $(img);
          const lazySrc = $img.attr('data-lazy-src') || $img.attr('data-src') || $img.attr('data-original');
          if (lazySrc) {
            $img.attr('src', lazySrc); // Swap it back so Gemini can see it!
          }
        });

        // 3. Extract the cleaned inner HTML
        textToParse = $('body').html() || '';

        // Prevent token blowout
        if (textToParse.length > 70000) {
            textToParse = textToParse.substring(0, 70000);
        }

      } catch (err) {
        console.error("Scraping failed:", err);
        return NextResponse.json({ error: 'Failed to read URL.' }, { status: 400 });
      }
    }

    if (!textToParse && !pdfPart) {
      return NextResponse.json({ error: 'No content provided.' }, { status: 400 });
    }

    // ✨ 4. THE AGGRESSIVE FILTER PROMPT ✨
    const sourceDescription = pdfPart
      ? 'Extract the attached pattern PDF into a structured JSON object.'
      : 'Extract the provided pattern HTML into a structured JSON object.';

    const prompt = `
      You are a professional crochet and knitting assistant.
      ${sourceDescription}
      Do NOT include markdown wrapping blocks around the final JSON object response, ONLY raw valid JSON.

      CRITICAL FORMATTING RULES FOR TEXT FIELDS:
      The fields "materials", "sizing", "abbreviations", "notes", and "content" MUST use clean HTML tags to preserve lists, spacing, and images.
      - Use <p> for normal text rows.
      - Use <strong> for emphasis, counts, or sizes.
      - Use <ul> and <li> for lists.
      - Use <h4> for internal subheadings.

      CRITICAL IMAGE RETENTION RULE:
      You must act as a strict editor. Preserve <img> tags that demonstrate step-by-step illustrations, charts, or construction details inline with the text.
      Keep the original "src" attribute exactly as it is written.

      You MUST aggressively DELETE any <img> tags that are:
      - Author portraits or headshots.
      - Affiliate banners, ads, or logos.
      - "Pin this for later" graphics or heavy text-overlay Pinterest images.
      - Generic lifestyle fluff that does not directly aid in crafting the garment.
      ${pdfPart ? '\n      NOTE: The source is a PDF, so there are no <img> "src" URLs to preserve. Omit <img> tags entirely; capture any chart or illustration information as descriptive text instead.\n' : ''}
      Map the data exactly to these JSON keys:
      - "title": The pattern name (string).
      - "materials": HTML string.
      - "sizing": HTML string.
      - "abbreviations": HTML string.
      - "notes": HTML string.
      - "content": HTML string containing full step-by-step instructions and strictly filtered inline <img> tags.
      - "categories": Comma separated string.
      - "hooks": Comma separated string.
      - "weights": Comma separated string.
      ${pdfPart ? '' : `\n      Pattern HTML Data:\n      ${textToParse}\n`}
    `;

    const selected = MODEL_TIERS[modelTier];
    let responseText: string;

    try {
      const model = genAI.getGenerativeModel({ model: selected.id });
      const result = await model.generateContent(
        pdfPart ? [prompt, pdfPart] : prompt
      );
      responseText = result.response.text();
    } catch (err) {
      // Surface the real Gemini error to the user, and tell the client whether
      // a lighter model tier is available to retry with.
      const message = err instanceof Error ? err.message : String(err);
      const isOverloaded = /\b503\b|overloaded|high demand|service unavailable|unavailable/i.test(message);
      const hasLowerTier = modelTier < MODEL_TIERS.length - 1;

      console.error('Gemini generate error:', message);

      return NextResponse.json(
        {
          error: message,
          model: selected.label,
          overloaded: isOverloaded,
          canRetryLower: hasLowerTier,
          nextTier: hasLowerTier ? modelTier + 1 : null,
          nextModelLabel: hasLowerTier ? MODEL_TIERS[modelTier + 1].label : null,
        },
        { status: isOverloaded ? 503 : 502 }
      );
    }

    responseText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();

    let parsedData;
    try {
      parsedData = JSON.parse(responseText);
    } catch {
      return NextResponse.json(
        { error: `${selected.label} returned a response we couldn't read. Please try again.` },
        { status: 502 }
      );
    }

    // ✨ INJECT THE SOURCE URL FOR YOUR DATABASE
    return NextResponse.json({
      ...parsedData,
      sourceUrl: sourceUrl || null
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to parse pattern';
    console.error('Extract route error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}