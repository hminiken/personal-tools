// Shared helpers for the comma-joined tag fields (hooks, weights, categories,
// fibers, colors) and status colors, so every gallery card and detail page
// renders them the same way.

/** "Aran,Worsted" -> ["Aran", "Worsted"] (trimmed, empties dropped). */
export function splitTags(value: string | null | undefined): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
}

// Pattern statuses (Not Started / WIP / Completed / On Hold / Did Not Like)
// and project statuses (WIP / Complete / On Hold / Frogged) share one palette.
const STATUS_COLORS: Record<string, string> = {
  'not started': 'gray',
  planned: 'gray',
  wip: 'mustard',
  'in progress': 'mustard',
  completed: 'olive',
  complete: 'olive',
  'on hold': 'blue',
  'did not like': 'rust',
  frogged: 'rust',
};

export function statusColor(status: string | null | undefined): string {
  return STATUS_COLORS[(status ?? '').trim().toLowerCase()] ?? 'gray';
}

/** "https://www.example.com/pattern-1" -> "example.com" (or the input if it isn't a URL). */
export function sourceHost(url: string | null | undefined): string {
  if (!url) return '';
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}
