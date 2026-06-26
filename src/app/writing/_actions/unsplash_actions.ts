// src/app/writing/_actions/unsplash_actions.ts
'use server';

// Thin wrapper over the Unsplash API for picking board/group backgrounds.
// Only the access key (Client-ID) is needed for searching + download tracking.
const ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;
const API = 'https://api.unsplash.com';
// Per Unsplash guidelines, attribution links must carry these UTM params.
const UTM = 'utm_source=writing_desk&utm_medium=referral';

export interface UnsplashPhoto {
  id: string;
  thumbUrl: string;   // small, for the picker grid
  fullUrl: string;    // what we store + render as the background
  // Stored as JSON in *.backgroundCredit for attribution.
  credit: { name: string; link: string };
  // Unsplash requires hitting this endpoint when a photo is actually used.
  downloadLocation: string;
  blurHash: string | null;
}

export async function searchUnsplash(query: string, page = 1): Promise<UnsplashPhoto[]> {
  const q = query.trim();
  if (!q) return [];
  if (!ACCESS_KEY) {
    throw new Error('UNSPLASH_ACCESS_KEY is not set in the environment.');
  }

  const url = `${API}/search/photos?query=${encodeURIComponent(q)}&page=${page}&per_page=24&orientation=landscape`;
  const res = await fetch(url, {
    headers: { Authorization: `Client-ID ${ACCESS_KEY}` },
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`Unsplash search failed (${res.status})`);
  }

  const data = await res.json();
  return (data.results ?? []).map((p: any): UnsplashPhoto => ({
    id: p.id,
    thumbUrl: p.urls?.small ?? p.urls?.thumb,
    fullUrl: p.urls?.regular ?? p.urls?.full,
    credit: {
      name: p.user?.name ?? 'Unknown',
      link: `${p.user?.links?.html ?? 'https://unsplash.com'}?${UTM}`,
    },
    downloadLocation: p.links?.download_location ?? '',
    blurHash: p.blur_hash ?? null,
  }));
}

// Notify Unsplash that a photo was used (required by their API guidelines).
// Fire-and-forget: never block the UI on this.
export async function trackUnsplashDownload(downloadLocation: string) {
  if (!ACCESS_KEY || !downloadLocation) return;
  try {
    await fetch(downloadLocation, {
      headers: { Authorization: `Client-ID ${ACCESS_KEY}` },
      cache: 'no-store',
    });
  } catch {
    // Non-fatal — tracking is best-effort.
  }
}
