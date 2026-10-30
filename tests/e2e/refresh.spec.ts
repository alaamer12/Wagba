import { expect, type Locator, type Page, test } from "@playwright/test";

// M4: pull-to-refresh, with all four phases real, on every meal list.
//
// The gesture is Quasar's pan (`v-touch-pan`), so a mouse drag drives it exactly as a thumb does
// and no touch event has to be synthesised — the reason `decisions.md` D10 gave for the pointer
// path still holds, it is just no longer hand-rolled. What these tests exist for is the shape
// defect C3 described: a strip that grew while you dragged, an armed state that never rendered,
// and a `refreshing` ref nobody set. Each phase is therefore asserted *while the button is still
// held*, and the refresh is proved by the request that follows the release.
//
// The machine behind the phases is covered in `tests/unit/pull-refresh.test.ts`; this file is
// about what a person can see, and about the lists that must offer the gesture at all: Home, My
// Meals, Saved. C9 lives here too — a saved row's own remove control, and what happens when the
// server refuses it.

const LABELS = {
  ar: {
    save: "احفظ في المحفوظة",
    remove: "إزالة من المحفوظة",
    refused: "مش قدرنا نشيلها — جرّب تاني",
  },
  en: { save: "Save it", remove: "Remove from saved", refused: "Couldn't remove it — try again" },
} as const;

const labelsFor = (project: string) => (project === "en" ? LABELS.en : LABELS.ar);

/** The list read the feed asks for, and the journal read Saved asks for. */
const isMealList = (url: URL) => url.pathname.endsWith("/api/collections/meals/records");
const isJournalList = (url: URL) => url.pathname.endsWith("/api/collections/favorites/records");

/**
 * Answers are delayed so `refreshing` is a phase a test can catch after the release rather than
 * a frame that comes and goes inside one task.
 */
async function holdAnswers(page: Page, ms: number) {
  const asked: URL[] = [];
  await page.route(/\/api\/collections\/(meals|favorites)\/records/, async (route) => {
    if (route.request().method() !== "GET") return void (await route.fallback());
    asked.push(new URL(route.request().url()));
    await new Promise((resolve) => setTimeout(resolve, ms));
    await route.fallback();
  });
  return asked;
}

/** The press point sits inside the list, and the drag is left held until `release`. */
function drag(page: Page) {
  let origin = { x: 0, y: 0 };
  return {
    async grab(area: Locator, raw: number) {
      const box = await area.boundingBox();
      if (!box) throw new Error("the pull area has no box to press");
      origin = {
        x: Math.round(box.x + box.width / 2),
        y: Math.round(Math.min(box.y + 20, 700)),
      };
      await page.mouse.move(origin.x, origin.y);
      await page.mouse.down();
      await page.mouse.move(origin.x, origin.y + raw, { steps: 8 });
    },
    extend(raw: number) {
      return page.mouse.move(origin.x, origin.y + raw, { steps: 6 });
    },
    release() {
      return page.mouse.up();
    },
  };
}

async function waitForList(page: Page, kind: string) {
  await expect(page.locator(`[data-kind="${kind}"]`).first()).toBeVisible({ timeout: 30_000 });
}

async function pullThroughEveryPhase(page: Page, area: Locator) {
  const strip = page.locator("[data-phase]");
  const gesture = drag(page);
  await expect(strip).toHaveCount(0);

  await gesture.grab(area, 60);
  await expect(strip).toHaveAttribute("data-phase", "pulling");
  await expect(strip).toBeVisible();

  await gesture.extend(140);
  await expect(strip).toHaveAttribute("data-phase", "armed");
  // Armed is a differently-shaped indicator, not the same one grown longer: the chip takes the
  // app's action colour and its arrow turns to point back the way the finger came.
  await expect(page.locator(".pull__chip.is-armed")).toBeVisible();

  await gesture.release();
  await expect(strip).toHaveAttribute("data-phase", "refreshing");
  await expect(strip).toBeHidden({ timeout: 15_000 });
}

test("Home answers a pull with all four phases and re-asks the feed", async ({ page }) => {
  await page.goto("/#/home");
  await waitForList(page, "ready");
  const asked = await holdAnswers(page, 500);

  await page.evaluate(() => window.scrollTo(0, 0));
  await pullThroughEveryPhase(page, page.locator('[data-kind="ready"]').first());

  expect(asked.filter(isMealList).length).toBeGreaterThan(0);
  // A pull is not a tap: the drag began on a meal card and must not have opened it.
  expect(page.url()).toContain("#/home");
  await expect(page.locator('[data-kind="ready"] article').first()).toBeVisible();
});

test("a pull stopped short of the threshold arms nothing and asks nothing", async ({ page }) => {
  await page.goto("/#/home");
  await waitForList(page, "ready");
  const asked = await holdAnswers(page, 200);
  const gesture = drag(page);

  await page.evaluate(() => window.scrollTo(0, 0));
  const strip = page.locator("[data-phase]");
  await gesture.grab(page.locator('[data-kind="ready"]').first(), 80);
  await expect(strip).toHaveAttribute("data-phase", "pulling");

  const before = asked.length;
  await gesture.release();
  await expect(strip).toHaveCount(0);
  await page.waitForTimeout(400);
  expect(asked.length).toBe(before);
});

test("My Meals offers the same pull", async ({ page }) => {
  await page.goto("/#/mine");
  await waitForList(page, "empty");
  const asked = await holdAnswers(page, 500);

  await page.evaluate(() => window.scrollTo(0, 0));
  await pullThroughEveryPhase(page, page.locator("section.mine__list"));

  expect(asked.filter(isMealList).length).toBeGreaterThan(0);
});

test("Saved offers the same pull", async ({ page }) => {
  await page.goto("/#/favorites");
  await waitForList(page, "empty");
  const asked = await holdAnswers(page, 500);

  await page.evaluate(() => window.scrollTo(0, 0));
  await pullThroughEveryPhase(page, page.locator("section.saved"));

  expect(asked.filter(isJournalList).length).toBeGreaterThan(0);
});

/** Save the meal the list is already showing, so the journal has exactly one row. */
async function saveFirstMeal(page: Page, save: string) {
  await page.goto("/#/home");
  await waitForList(page, "ready");
  await page.locator('[data-kind="ready"] article').first().click();
  const saved = page.waitForResponse(
    (res) =>
      res.url().includes("/api/collections/favorites/records") &&
      res.request().method() === "POST" &&
      res.status() < 400,
  );
  await page.getByRole("button", { name: save }).click();
  await saved;
}

test("a saved row can be removed from the list, without opening the meal", async ({
  page,
}, info) => {
  await saveFirstMeal(page, labelsFor(info.project.name).save);

  await page.goto("/#/favorites");
  const row = page.locator('[data-kind="ready"] article').first();
  await expect(row).toBeVisible({ timeout: 30_000 });

  const removed = page.waitForResponse(
    (res) =>
      res.url().includes("/api/collections/favorites/records/") &&
      res.request().method() === "DELETE" &&
      res.status() < 400,
  );
  await page.getByRole("button", { name: labelsFor(info.project.name).remove }).click();
  await removed;

  // The row leaves when the journal says it has left, and a journal emptied by that removal says
  // so instead of holding a list of nothing.
  await expect(row).toBeHidden({ timeout: 15_000 });
  await expect(page.locator('[data-kind="empty"]')).toBeVisible({ timeout: 15_000 });
});

test("a refused remove keeps the row and says so", async ({ page }, info) => {
  const labels = labelsFor(info.project.name);
  await saveFirstMeal(page, labels.save);

  // A server that refuses the write, not a row that was already gone: `removeFavorite` treats a
  // 404 as the wanted end state, so only a real refusal proves the row is not silently dropped.
  await page.route(/\/api\/collections\/favorites\/records\//, async (route) => {
    if (route.request().method() !== "DELETE") return void (await route.fallback());
    await route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({ code: 500, message: "refused" }),
    });
  });

  await page.goto("/#/favorites");
  const row = page.locator('[data-kind="ready"] article').first();
  await expect(row).toBeVisible({ timeout: 30_000 });

  await page.getByRole("button", { name: labels.remove }).click();

  // Nothing flips back silently: the meal is still in the journal because the write never
  // landed, and the row that was refused is the one that admits it.
  await expect(row).toBeVisible();
  await expect(page.getByRole("status").filter({ hasText: labels.refused })).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.locator('[data-kind="empty"]')).toHaveCount(0);
});

// C13: Details caches nothing, so "showing the last results" is a sentence it can never honour.
// The screen must name offline with its own copy — and the ladder must still call the kind `fault`.
test("an offline meal page names offline, not the cached-rows sentence", async ({ page }, info) => {
  const ar = info.project.name !== "en";
  await page.goto("/#/home");
  await expect(page.locator('[data-kind="ready"] article').first()).toBeVisible({
    timeout: 30_000,
  });

  const id = await page.evaluate(async () => {
    const res = await fetch(
      "http://127.0.0.1:8090/api/collections/meals/records?perPage=1&sort=-created",
    );
    const json = (await res.json()) as { items?: Array<{ id: string }> };
    return json.items?.[0]?.id ?? "";
  });
  expect(id).not.toBe("");

  // Two things at once, without reloading the document: the data path dies, and the device says
  // it is offline. `context.setOffline` is wrong here — it also blocks the bundle, so the page
  // would never boot. A hash change keeps the loaded app and remounts the detail view.
  await page.route(/\/api\/collections\/meals\/records/, (route) => route.abort());
  await page.evaluate(() => {
    Object.defineProperty(navigator, "onLine", { configurable: true, get: () => false });
    window.dispatchEvent(new Event("offline"));
  });
  await page.evaluate((mealId) => {
    window.location.hash = `#/meal/${mealId}`;
  }, id);

  await expect(page.locator('[data-kind="fault"]')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(ar ? "انت مش متصل" : "You are offline").first()).toBeVisible();
  await expect(
    page.getByText(
      ar
        ? "الوجبة دي مش هتتحمّل غير لما النت يرجع"
        : "This meal can't load until you're back online",
    ),
  ).toBeVisible();
  await expect(page.getByText(ar ? "دي آخر نتائج" : "showing the last results")).toHaveCount(0);
});
