import { expect, test } from "@playwright/test";

// Cross-locale smoke. Journeys live in stories.spec.ts; this file proves the app
// boots, provisions, renders a feed, and switches direction, in both languages.

test("home renders the seeded feed nearest-first", async ({ page }, info) => {
  await page.goto("/#/home");
  await expect(page.locator('[data-kind="ready"]')).toBeVisible({ timeout: 30_000 });
  const cards = page.locator('[data-kind="ready"] article');
  expect(await cards.count()).toBeGreaterThanOrEqual(5);

  const distance = async (index: number) => {
    const text = ((await cards.nth(index).textContent()) ?? "").replace(/\u200f/g, "");
    const match = text.match(/([\d.]+)\s*(كم|km)/);
    return match ? Number(match[1]) : Number.POSITIVE_INFINITY;
  };
  expect(await distance(0)).toBeLessThanOrEqual(await distance(3));

  await page.waitForFunction(() => {
    const img = document.querySelector(
      '[data-kind="ready"] article img',
    ) as HTMLImageElement | null;
    return !img || (img.complete && img.naturalWidth > 0);
  });
  await page.screenshot({
    path: `artifacts/screenshots/${info.project.name}/home.png`,
    fullPage: false,
  });
});

test("first launch provisions an anonymous account", async ({ page }) => {
  const creates: number[] = [];
  page.on("response", (res) => {
    if (res.url().endsWith("/api/collections/users/records") && res.request().method() === "POST") {
      creates.push(res.status());
    }
  });
  await page.goto("/#/home");
  await expect(page.locator("[data-kind]").first()).toBeVisible({ timeout: 30_000 });
  await expect.poll(() => creates, { timeout: 15_000 }).toEqual([200]);
});

test("suggestion chips are derived from the feed and filter it", async ({ page }) => {
  await page.goto("/#/home");
  await expect(page.locator('[data-kind="ready"]')).toBeVisible({ timeout: 30_000 });
  const labels = (await page.locator(".suggestions button").allTextContents()).map((label) =>
    label.trim(),
  );
  expect(labels.length).toBeGreaterThan(1);
  const area = labels.at(1);
  expect(area).toBeTruthy();
  await page.getByRole("button", { name: area as string, exact: true }).click();
  await expect(page.getByRole("searchbox")).toHaveValue(area as string);
  await expect(page.locator('[data-kind="ready"] article').first()).toBeVisible({
    timeout: 15_000,
  });
  const body = await page.locator('[data-kind="ready"]').textContent();
  expect(body).toContain(area as string);
});

test("language switch flips direction, labels, and layout", async ({ page }, info) => {
  await page.goto("/#/settings");
  await expect(page.locator("h1")).toBeVisible({ timeout: 30_000 });
  const before = await page.locator("html").getAttribute("dir");
  await page.getByRole("button", { name: /اللغة|Language/ }).click();
  await expect(page.locator("html")).toHaveAttribute("dir", before === "rtl" ? "ltr" : "rtl");
  await expect(page.locator("body")).toHaveCSS("direction", before === "rtl" ? "ltr" : "rtl");
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
  await page.screenshot({
    path: `artifacts/screenshots/${info.project.name}/settings-toggled.png`,
  });
});

test("typed text reaches the model behind it", async ({ page }) => {
  // The primitive tiers are re-exports, and a re-export that only spreads attributes
  // silently drops `v-model` (a component binding compiles to a modelValue prop plus an
  // update event, neither of which falls through to the nested <input>). The symptom is
  // three layers away: the field looks typed-in, the model stays empty, validation fails.
  // So assert the derivation, not the DOM value: the handle preview is computed from the
  // display name, and it only moves if the name reached the model.
  await page.goto("/#/profile");
  const name = page.getByLabel(/الاسم|Name/);
  const handle = page.getByLabel("handle");

  const before = await handle.getAttribute("placeholder");
  await name.fill("منصور علي");
  const after = await handle.getAttribute("placeholder");

  expect(after).toBeTruthy();
  expect(after).not.toBe(before);
  await expect(name).toHaveValue("منصور علي");
});

test("meal details renders the photo and the cook block", async ({ page }, info) => {
  await page.goto("/#/home");
  await expect(page.locator('[data-kind="ready"] article').first()).toBeVisible({
    timeout: 30_000,
  });
  await page.locator('[data-kind="ready"] article').first().click();
  await expect(page.locator(".hero img").first()).toBeVisible({ timeout: 20_000 });
  await page.waitForFunction(() => {
    const img = document.querySelector(".hero img") as HTMLImageElement | null;
    return !img || (img.complete && img.naturalWidth > 0);
  });
  await page.screenshot({ path: `artifacts/screenshots/${info.project.name}/meal-details.png` });
});

test("offline keeps the rows and shows the stale banner", async ({ page }, info) => {
  await page.goto("/#/home");
  await expect(page.locator('[data-kind="ready"] article').first()).toBeVisible({
    timeout: 30_000,
  });

  // Abort the data channel only; the app bundle stays loaded, which isolates the
  // cache path from the asset channel and from network-stack timing.
  await page.route("**/api/collections/meals/**", (route) => route.abort());
  await page.reload();

  await expect(page.locator('[data-kind="stale"]')).toBeVisible({ timeout: 20_000 });
  const rows = await page.locator('[data-kind="stale"] article').count();
  expect(rows).toBeGreaterThan(0);
  await page.screenshot({ path: `artifacts/screenshots/${info.project.name}/home-stale.png` });
  await page.unroute("**/api/collections/meals/**");
});
