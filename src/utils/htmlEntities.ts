// Decodes HTML entities in a plain string without touching the DOM (safe to
// call during SSR). Needed anywhere HTML content gets tag-stripped down to
// plain text (word counts, card previews) — the underlying TipTap/marked HTML
// legitimately encodes quote/apostrophe/ampersand characters as entities
// (e.g. `it's` -> `it&#39;s`), which is correct HTML but reads as literal
// entity text once the surrounding tags are stripped instead of parsed.
// &amp; is decoded last so a literal "&amp;lt;" doesn't get corrupted into "<".
export function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');
}
