// Repairs malformed rich-text HTML before it's parsed/rendered.
//
// The AI import pipeline (and some pasted content) can emit <img> tags with
// broken resize-image attributes, e.g.:
//   <img src="..." alt="..." containerstyle=" wrapperstyle="display: flex; margin: 0;">
// The quotes are unbalanced — the trailing `"` opens an attribute value that
// is never closed before `>`, so any HTML parser swallows everything after it
// (the following paragraphs) until it finds the next `"`. That makes large
// chunks of content silently disappear when rendered.
//
// We strip the broken containerstyle/wrapperstyle attribute blocks (everything
// from the attribute up to the tag's closing `>`), leaving a clean <img>. These
// attributes aren't needed for display; the editor re-adds well-formed ones on
// the next save.
export function sanitizePatternHtml<T extends string | null | undefined>(html: T): T {
  if (!html) return html;
  return html
    .replace(/\s+containerstyle="[^>]*>/gi, '>')
    .replace(/\s+wrapperstyle="[^>]*>/gi, '>') as T;
}
