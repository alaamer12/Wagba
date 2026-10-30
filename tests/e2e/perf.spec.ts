import { expect, type Page, test } from "@playwright/test";

// A loose performance budget on a throttled profile. It catches regressions of
// the "waiting on nothing" kind (a spinner that never resolves, a blocking
// request); it is not a benchmark.

test("home reaches ready under 4x CPU and Fast 3G", async ({ context, page }) => {
  const cdp = await context.newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await cdp.send("Network.enable");
  await cdp.send("Network.emulateNetworkConditions", {
    offline: false,
    latency: 150,
    downloadThroughput: (1.6 * 1024 * 1024) / 8,
    uploadThroughput: (750 * 1024) / 8,
  });
  const started = Date.now();
  await page.goto("/#/home");
  await expect(page.locator('[data-kind="ready"]')).toBeVisible({ timeout: 30_000 });
  const elapsed = Date.now() - started;
  console.log(`home ready in ${elapsed} ms (4x CPU, Fast 3G)`);
  expect(elapsed).toBeLessThan(15_000);
});

// ---------------------------------------------------------------------------------------------
// M5, D6′/F25: the read is wide (one request for up to 500 nearest-first rows) and the paint is
// windowed (20, then 20 per sentinel entry). The fixture replaces only the feed's *wide* read —
// the chips' and the freshness probe's narrow reads keep the real server — so the numbers below
// describe the window, not the seed.
//
// The ordering is part of the fixture on purpose: distances are a permutation of the row index
// while `created` descends with it, so "newest first" (the server's sort) is *not* nearest first.
// A first row that matches the computed nearest row therefore proves the client ordered the set.
// ---------------------------------------------------------------------------------------------

const FEED_SIZE = 200;

type FixtureRow = {
  id: string;
  collectionId: string;
  title: string;
  description: string;
  price: number | null;
  quantity: number | null;
  status: "available";
  photos: string[];
  delivery_option: "pickup";
  available_time: string;
  location_text: string;
  user: string;
  created: string;
  updated: string;
  distance_km: number;
  cook: { id: string; collectionId: string; display_name: string; handle: string; avatar: string };
};

const pad = (n: number) => String(n).padStart(3, "0");

/** Deterministic, in-radius distances with ties; newer rows are arbitrarily nearer or farther. */
function feedFixture(): FixtureRow[] {
  return Array.from({ length: FEED_SIZE }, (_, i) => ({
    id: `perf${pad(i)}`,
    collectionId: "pbc_perf",
    title: `Meal ${pad(i)}`,
    description: "طبق بيتي",
    price: 80,
    quantity: 4,
    status: "available",
    photos: [],
    delivery_option: "pickup",
    available_time: "",
    location_text: "المعادي",
    user: "cookperf",
    created: new Date(Date.UTC(2026, 0, 1, 12, 0) - i * 60_000).toISOString(),
    updated: new Date(Date.UTC(2026, 0, 1, 12, 0) - i * 60_000).toISOString(),
    distance_km: 0.1 + ((i * 37 + 11) % 100) / 10,
    cook: {
      id: "cookperf",
      collectionId: "pbc_users",
      display_name: "صفية",
      handle: "safeya",
      avatar: "",
    },
  }));
}

/** The rows in the order the app must paint them: distance, then -created, then id. */
function nearestFirst(rows: FixtureRow[]): FixtureRow[] {
  return [...rows].sort((a, b) => {
    if (a.distance_km !== b.distance_km) return a.distance_km - b.distance_km;
    if (a.created !== b.created) return a.created < b.created ? 1 : -1;
    return a.id < b.id ? -1 : 1;
  });
}

/** Answer the feed's wide read from memory; everything else goes to the running server. */
async function serveFeed(page: Page, rows: FixtureRow[]): Promise<void> {
  await page.route("**/api/collections/meals/records**", async (route) => {
    const request = route.request();
    if (request.method() !== "GET") return void (await route.fallback());
    const perPage = Number(new URL(request.url()).searchParams.get("perPage") ?? 0);
    // Below 100 is a chips/freshness read, not the feed's fetch-wide request.
    if (perPage < 100) return void (await route.fallback());
    await route.fulfill({
      status: 200,
      headers: { "content-type": "application/json", "access-control-allow-origin": "*" },
      body: JSON.stringify({ page: 1, perPage, totalItems: rows.length, items: rows }),
    });
  });
}

test("a 200-row feed paints twenty under the budget and appends to the end", async ({
  context,
  page,
}) => {
  const rows = feedFixture();
  const expected = nearestFirst(rows);
  await serveFeed(page, rows);

  const cdp = await context.newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await cdp.send("Network.enable");
  await cdp.send("Network.emulateNetworkConditions", {
    offline: false,
    latency: 150,
    downloadThroughput: (1.6 * 1024 * 1024) / 8,
    uploadThroughput: (750 * 1024) / 8,
  });

  const cards = page.locator('[data-kind="ready"] article');
  const started = Date.now();
  await page.goto("/#/home");
  // First paint is the window, not the read: twenty rows, even though 200 arrived.
  await expect(cards).toHaveCount(20, { timeout: 30_000 });
  const firstPaint = Date.now() - started;
  console.log(`200-row feed painted 20 rows in ${firstPaint} ms (4x CPU, Fast 3G)`);
  expect(firstPaint).toBeLessThan(15_000);

  // Nearest first, and the nearest row is not the newest one: the fixture's newest row (index 0)
  // is nowhere near the front of the distance order, so only a client-side sort can put this
  // title first.
  expect(expected[0]?.title).toBeTruthy();
  await expect(cards.first()).toContainText(expected[0]?.title ?? "");

  // Scroll to the end: every sentinel entry appends one page, and the last entry disarms it.
  const scrolling = Date.now();
  let painted = await cards.count();
  let appends = 0;
  while (painted < rows.length) {
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await expect.poll(() => cards.count(), { timeout: 5_000 }).toBeGreaterThan(painted);
    painted = await cards.count();
    appends += 1;
  }
  const elapsed = Date.now() - scrolling;
  console.log(`appended ${painted} rows in ${appends} pages, ${elapsed} ms (4x CPU)`);
  expect(painted).toBe(rows.length);
  expect(elapsed).toBeLessThan(15_000);
  // Exhausted means exhausted: the marker stays, disarmed, and nothing more is asked for.
  await expect(page.locator("[data-more]")).toHaveAttribute("data-more", "false");
});
