import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Meal } from "@/types/schemas";

vi.mock("@/services/meals", () => ({
  listNearby: vi.fn(),
  searchMeals: vi.fn(),
}));
vi.mock("@/lib/feedCache", () => ({ saveFeed: vi.fn(), loadFeed: vi.fn() }));
vi.mock("@/shared/conditions/useFeedSnapshotCondition", () => ({
  readSnapshot: vi.fn(() => Promise.resolve(null)),
}));

import { listNearby, searchMeals } from "@/services/meals";
import { useMealFeedState } from "@/shared/state/useMealFeedState";

// The ladder is pure and tested elsewhere; these tests pin the *timing* that made the
// first-launch fault possible: which facts are true while the device is still locating,
// and who is allowed to write answers after the screen has gone.

const meal = (id: string, distance = 1): Meal => ({
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
  created: "2026-01-01 00:00:00.000Z",
  updated: "2026-01-01 00:00:00.000Z",
  distance_km: distance,
  cook: { display_name: "محمد" },
});

const center = { lat: 30.0459, lng: 31.2243 };

beforeEach(() => {
  setActivePinia(createPinia());
  vi.mocked(listNearby).mockReset();
  vi.mocked(searchMeals).mockReset();
});

describe("the request window", () => {
  it("is loading while the position is still being read, never fault", async () => {
    let releasePosition: (value: typeof center | null) => void = () => {};
    const getCenter = () =>
      new Promise<typeof center | null>((resolve) => {
        releasePosition = resolve;
      });

    const feed = useMealFeedState();
    const pending = feed.load(getCenter);

    // The frame a cold start actually paints: nothing answered yet.
    await Promise.resolve();
    expect(feed.inFlight).toBe(true);
    expect(feed.kind).toBe("loading");

    vi.mocked(listNearby).mockResolvedValue([meal("m1")]);
    releasePosition(center);
    await pending;

    expect(feed.kind).toBe("ready");
    expect(feed.items).toHaveLength(1);
  });

  it("records an absent position as the device's answer, not a load failure", async () => {
    const feed = useMealFeedState();
    await feed.load(async () => null);
    expect(feed.error?.code).toBe("GEO_UNAVAILABLE");
    expect(feed.error?.retryClass).toBe("transient");
  });

  it("stays loading rather than empty while a query is in flight with rows already shown", async () => {
    vi.mocked(listNearby).mockResolvedValue([meal("m1")]);
    const feed = useMealFeedState();
    await feed.load(async () => center);

    let release: (rows: Meal[]) => void = () => {};
    vi.mocked(searchMeals).mockReturnValue(
      new Promise<Meal[]>((resolve) => {
        release = resolve;
      }),
    );

    const pending = feed.search("محشي", center);
    await Promise.resolve();
    // Rows the user is reading are never replaced by skeletons mid-query.
    expect(feed.kind).toBe("ready");
    release([meal("m2")]);
    await pending;
    expect(feed.items[0]?.id).toBe("m2");
  });
});

describe("answers that arrive too late", () => {
  it("refuses an answer that arrives after the feed was invalidated", async () => {
    let release: (rows: Meal[]) => void = () => {};
    vi.mocked(listNearby).mockReturnValue(
      new Promise<Meal[]>((resolve) => {
        release = resolve;
      }),
    );

    const feed = useMealFeedState();
    const pending = feed.load(async () => center);
    await Promise.resolve();

    // A publish or a logout invalidates the feed; the in-flight answer is then stale.
    feed.reset();
    release([meal("late")]);
    await pending;

    expect(feed.items).toHaveLength(0);
    expect(feed.inFlight).toBe(false);
    expect(feed.read).toBe(false);
  });

  it("leaves the answer of a still-current request alone when the view navigates away", async () => {
    // The store outlives the screen. An earlier draft cancelled from onUnmounted, which
    // made the *next* Home's answer vanish during a route change (S2 en regression).
    vi.mocked(listNearby).mockResolvedValue([meal("m1")]);
    const feed = useMealFeedState();
    await feed.load(async () => center);
    expect(feed.items).toHaveLength(1);
    await feed.load(async () => center);
    expect(feed.items).toHaveLength(1);
  });

  it("keeps the newest query's answer when an older one lands after it", async () => {
    const feed = useMealFeedState();
    let releaseSlow: (rows: Meal[]) => void = () => {};
    vi.mocked(searchMeals).mockImplementationOnce(
      () =>
        new Promise<Meal[]>((resolve) => {
          releaseSlow = resolve;
        }),
    );
    vi.mocked(searchMeals).mockResolvedValueOnce([meal("fast")]);

    const first = feed.search("كشري", center);
    const second = feed.search("محشي", center);
    await second;
    releaseSlow([meal("slow")]);
    await first;

    expect(feed.items.map((m) => m.id)).toEqual(["fast"]);
    expect(feed.active).toBe("محشي");
  });
});
