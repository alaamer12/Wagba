import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Meal } from "@/types/schemas";

// D4′: the cached feed's shape is a contract with the next run of the app, so what is *written*
// is asserted, not assumed. `at` was stored from the first version and rendered by nothing —
// the stale banner is generic by owner ruling, which makes a timestamp an unread claim about how
// old the answer is, and an unread field is one a later reader will believe is maintained.

const store = vi.hoisted(() => new Map<string, string>());

vi.mock("@/services/storage", () => ({
  read: vi.fn(async (key: string) => store.get(key) ?? null),
  write: vi.fn(async (key: string, value: string) => {
    store.set(key, value);
    return true;
  }),
}));

import { loadFeed, saveFeed } from "@/lib/feedCache";

const KEY = "feed-snapshot";
const center = { lat: 30.0459, lng: 31.2243 };
// The cache round-trips JSON and reads two fields; the rows themselves are opaque to it.
const rows = [{ id: "m1" }, { id: "m2" }] as unknown as Meal[];

const raw = () => JSON.parse(store.get(KEY) ?? "null") as Record<string, unknown>;

beforeEach(() => {
  store.clear();
});

describe("the feed snapshot", () => {
  it("stores the rows and the centre, and nothing else", async () => {
    await saveFeed(rows, center);

    expect(Object.keys(raw()).sort()).toEqual(["items", "lat", "lng"]);
    expect(raw().at).toBeUndefined();
  });

  it("ignores a timestamp written by an older build instead of handing it on", async () => {
    // Whatever an earlier version left on the device still loads — it is the same rows.
    store.set(KEY, JSON.stringify({ items: rows, at: 1_700_000_000_000, ...center }));

    const snapshot = await loadFeed();
    expect(snapshot).toEqual({ items: rows, lat: center.lat, lng: center.lng });
    expect(snapshot && "at" in snapshot).toBe(false);
  });

  it("refuses a snapshot with no rows or no usable centre", async () => {
    store.set(KEY, JSON.stringify({ items: [], ...center }));
    expect(await loadFeed()).toBeNull();

    store.set(KEY, JSON.stringify({ items: rows, lat: "x", lng: null }));
    expect(await loadFeed()).toBeNull();
  });

  it("writes nothing for an empty answer", async () => {
    await saveFeed([], center);
    expect(store.has(KEY)).toBe(false);
  });
});
