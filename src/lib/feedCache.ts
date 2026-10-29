import type { LatLng } from '@shared/normalize';
import type { Meal } from '../types/schemas';
import { read, write } from '../services/storage';

// Last good feed, so a dropped connection shows rows with a stale banner instead
// of an error panel. Snapshot only — there are no offline writes.

const KEY = 'feed-snapshot';

export type FeedSnapshot = { items: Meal[]; at: number; lat: number; lng: number };

export async function saveFeed(items: Meal[], center: LatLng): Promise<void> {
  if (items.length === 0) return;
  const snapshot: FeedSnapshot = { items, at: Date.now(), lat: center.lat, lng: center.lng };
  try {
    await write(KEY, JSON.stringify(snapshot));
  } catch {
    /* storage full or disabled — the cache is an optimisation, never a gate */
  }
}

export async function loadFeed(): Promise<FeedSnapshot | null> {
  try {
    const raw = await read(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as FeedSnapshot;
    return Array.isArray(parsed.items) && parsed.items.length > 0 ? parsed : null;
  } catch {
    return null;
  }
}
