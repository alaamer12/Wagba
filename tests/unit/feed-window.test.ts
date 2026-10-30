import { describe, expect, it } from "vitest";
import { ref } from "vue";
import { FEED_WINDOW_PAGE, useFeedWindow } from "@/features/feed/behaviour/useFeedWindow";
import { nearestFirst } from "@/services/meals";
import type { Meal } from "@/types/schemas";

// The two halves of M5 that are pure: how many of a wide read are painted (`useFeedWindow`,
// F25) and in what order the read arrives (`nearestFirst`, F44). The sentinel that drives the
// first half is an IntersectionObserver around `more()`; what it can do is exhausted here, and
// the browser's part of it is the perf budget in `tests/e2e/perf.spec.ts`.

const meal = (id: string, distance: number, created = "2026-01-01 00:00:00.000Z"): Meal => ({
  id,
  collectionId: "meals",
  title: `وجبة ${id}`,
  description: "",
  price: null,
  quantity: null,
  status: "available",
  photos: [],
  delivery_option: null,
  available_time: "",
  location_text: "المعادي",
  user: "cook1",
  created,
  updated: created,
  distance_km: distance,
  cook: { display_name: "محمد" },
});

/** A window over a fixed count, the way the View hands one in. */
const windowOver = (total: number) => useFeedWindow(() => total);

describe("the feed window", () => {
  it("paints the first twenty rows of a read that holds more", () => {
    const feed = windowOver(200);
    expect(FEED_WINDOW_PAGE).toBe(20);
    expect(feed.visible.value).toBe(20);
    expect(feed.hasMore.value).toBe(true);
  });

  it("appends one page at a time", () => {
    const feed = windowOver(200);
    feed.more();
    expect(feed.visible.value).toBe(40);
    feed.more();
    expect(feed.visible.value).toBe(60);
    expect(feed.hasMore.value).toBe(true);
  });

  it("stops at the last row: no append past the end, and the sentinel is disarmed", () => {
    const feed = windowOver(45);
    feed.more();
    expect(feed.visible.value).toBe(40);
    feed.more();
    // The last page is short: the window lands on 45, not on 60.
    expect(feed.visible.value).toBe(45);
    expect(feed.hasMore.value).toBe(false);
    // An observer event that lands after exhaustion must not ask for rows that do not exist.
    feed.more();
    expect(feed.visible.value).toBe(45);
  });

  it("paints everything when the read is smaller than one page", () => {
    const feed = windowOver(3);
    expect(feed.visible.value).toBe(3);
    expect(feed.hasMore.value).toBe(false);
  });

  it("resets to the first page", () => {
    const feed = windowOver(200);
    feed.more();
    feed.more();
    expect(feed.visible.value).toBe(60);
    feed.reset();
    expect(feed.visible.value).toBe(20);
    expect(feed.hasMore.value).toBe(true);
  });

  it("clamps to a smaller row set but keeps its place when the feed grows again", () => {
    const total = ref(200);
    const feed = useFeedWindow(() => total.value);
    feed.more();
    expect(feed.visible.value).toBe(40);

    // A search narrows the feed under the same window.
    total.value = 30;
    expect(feed.visible.value).toBe(30);
    expect(feed.hasMore.value).toBe(false);

    // And a later refresh widens it again: the reader is not thrown back to row one.
    total.value = 200;
    expect(feed.visible.value).toBe(40);
    expect(feed.hasMore.value).toBe(true);
  });
});

describe("nearest-first ordering", () => {
  it("orders measured rows by distance", () => {
    const rows = [meal("c", 3.2), meal("a", 0.4), meal("b", 1.5)];
    expect(nearestFirst(rows).map((row) => row.id)).toEqual(["a", "b", "c"]);
  });

  it("puts a row with no distance last instead of first (F44)", () => {
    // distance_km is 0 for a row the request could not measure — the schema default and what
    // the hook writes on save. Ascending sort used to rank it ahead of everything.
    const rows = [meal("far", 8.9), meal("unmeasured", 0), meal("near", 0.3)];
    expect(nearestFirst(rows).map((row) => row.id)).toEqual(["near", "far", "unmeasured"]);
  });

  it("keeps the unmeasured tail newest-first, deterministically", () => {
    const rows = [
      meal("old", 0, "2026-01-01 00:00:00.000Z"),
      meal("new", 0, "2026-03-01 00:00:00.000Z"),
      meal("mid", 0, "2026-02-01 00:00:00.000Z"),
    ];
    expect(nearestFirst(rows).map((row) => row.id)).toEqual(["new", "mid", "old"]);
  });

  it("tie-breaks two rows at the same rounded distance by -created, then id", () => {
    const rows = [
      meal("older", 1.2, "2026-01-01 00:00:00.000Z"),
      meal("newer", 1.2, "2026-02-01 00:00:00.000Z"),
      meal("same-b", 1.2, "2026-01-15 00:00:00.000Z"),
      meal("same-a", 1.2, "2026-01-15 00:00:00.000Z"),
    ];
    expect(nearestFirst(rows).map((row) => row.id)).toEqual(["newer", "same-a", "same-b", "older"]);
  });

  it("falls back to newest-first when the request measured nothing at all", () => {
    // A search with no position sends no lat/lng, so every row carries the 0 default. The
    // order is then exactly what the server sorted by, not an invented one.
    const rows = [
      meal("first", 0, "2026-01-03 00:00:00.000Z"),
      meal("second", 0, "2026-01-02 00:00:00.000Z"),
      meal("third", 0, "2026-01-01 00:00:00.000Z"),
    ];
    expect(nearestFirst(rows).map((row) => row.id)).toEqual(["first", "second", "third"]);
  });

  it("does not reorder the caller's rows", () => {
    const rows = [meal("c", 3), meal("a", 1)];
    nearestFirst(rows);
    expect(rows.map((row) => row.id)).toEqual(["c", "a"]);
  });
});
