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
// containerstyle/wrapperstyle came from the old tiptap-extension-resize-image
// extension, which the editor no longer uses. Well-formed containerstyle
// values carry the image's saved width, so we convert that into a plain
// width="N" attribute first (the current Image extension reads it). Then we
// drop any remaining well-formed values, and finally strip broken attribute
// blocks (everything from the attribute up to the tag's closing `>`).
export function sanitizePatternHtml<T extends string | null | undefined>(html: T): T {
  if (!html) return html;
  return html
    .replace(/\s+containerstyle="[^"=]*?\bwidth:\s*([\d.]+)px[^"=]*"/gi, ' width="$1"')
    .replace(/\s+(?:containerstyle|wrapperstyle)="[^"=]*"/gi, '')
    .replace(/\s+containerstyle="[^>]*>/gi, '>')
    .replace(/\s+wrapperstyle="[^>]*>/gi, '>') as T;
}
