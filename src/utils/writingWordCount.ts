// Plain-text word count from TipTap HTML content. Used to keep cards.wordCount
// in sync whenever a card's content is saved.
export function countWords(html: string | null | undefined): number {
  if (!html) return 0;
  const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  return text ? text.split(' ').length : 0;
}
