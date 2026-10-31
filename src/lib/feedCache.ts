import type { LatLng } from "../../shared/normalize";
import { read, write } from "../services/storage";
import type { Meal } from "../types/schemas";

// Last good feed, so a dropped connection shows rows with a stale banner instead
// of an error panel. Snapshot only — there are no offline writes.

const KEY = "feed-snapshot";

// The shape is exactly what a reader uses: the rows and the centre they were measured from.
// A stored age lived here (`at`) and nothing ever rendered it — the stale banner is deliberately
// generic (D4′, owner ruling 4), so an unused timestamp was a second, unread claim about how
// old the answer is. A snapshot from an older build that still carries it loads fine: the
// extra key is ignored.
export type FeedSnapshot = { items: Meal[]; lat: number; lng: number };

export async function saveFeed(items: Meal[], center: LatLng): Promise<void> {
  if (items.length === 0) return;
  const snapshot: FeedSnapshot = { items, lat: center.lat, lng: center.lng };
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
    // Rebuilt field by field rather than returned as parsed: a snapshot written by an older
    // build carries keys this one does not define, and handing them on would keep the dead
    // shape alive in every consumer.
    const parsed = JSON.parse(raw) as Partial<FeedSnapshot>;
    if (!Array.isArray(parsed.items) || parsed.items.length === 0) return null;
    const lat = Number(parsed.lat);
    const lng = Number(parsed.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { items: parsed.items, lat, lng };
  } catch {
    return null;
  }
}
