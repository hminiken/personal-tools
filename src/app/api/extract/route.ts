// src/app/api/extract-pattern/route.ts
import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: Request) {
  try {
    const { sourceUrl, rawText } = await req.json();
    
    let textToParse = rawText; 
    
    if (sourceUrl && !rawText) {
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

    if (!textToParse) {
      return NextResponse.json({ error: 'No content provided.' }, { status: 400 });
    }

    // ✨ 4. THE AGGRESSIVE FILTER PROMPT ✨
    const prompt = `
      You are a professional crochet and knitting assistant. 
      Extract the provided pattern HTML into a structured JSON object. 
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
      
      Pattern HTML Data:
      ${textToParse}
    `;

    const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
    const result = await model.generateContent(prompt);
    let responseText = result.response.text();

    responseText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsedData = JSON.parse(responseText);

    // ✨ INJECT THE SOURCE URL FOR YOUR DATABASE
    return NextResponse.json({
      ...parsedData,
      sourceUrl: sourceUrl || null 
    });

  } catch (error) {
    console.error('Gemini Error:', error);
    return NextResponse.json({ error: 'Failed to parse pattern' }, { status: 500 });
  }
}