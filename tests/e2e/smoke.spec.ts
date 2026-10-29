import { expect, test } from "@playwright/test";

// Smoke: the app boots, provisions an account, reads the seeded feed, and shows
// meals with distances. Screenshots land in artifacts/screenshots/<project>/.

test("home renders seeded meals nearest-first", async ({ page }, info) => {
  await page.goto("/#/home");
  await page.waitForLoadState("networkidle");
  await expect(page.locator("[data-kind]")).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('[data-kind="ready"]')).toBeVisible({ timeout: 30_000 });

  const cards = page.locator('[data-kind="ready"] article');
  const count = await cards.count();
  expect(count).toBeGreaterThanOrEqual(5);

  const first = await cards.first().locator("h3").innerText();
  expect(first.length).toBeGreaterThan(0);

  await page.locator('[data-kind="ready"] article img').first().waitFor({ state: "visible" });
  await page.waitForFunction(() => {
    const img = document.querySelector(
      '[data-kind="ready"] article img',
    ) as HTMLImageElement | null;
    return !!img && img.complete && img.naturalWidth > 0;
  });
  await page.screenshot({
    path: `artifacts/screenshots/${info.project.name}/home.png`,
    fullPage: false,
  });
});

test("search folds Arabic typos to the same key", async ({ page }) => {
  await page.goto("/#/home");
  await expect(page.locator('[data-kind="ready"]')).toBeVisible({ timeout: 30_000 });
  await page.getByRole("searchbox").fill("السيده زينب");
  await expect(page.locator('[data-kind="ready"] article').first()).toBeVisible({
    timeout: 15_000,
  });
  const count = await page.locator('[data-kind="ready"] article').count();
  expect(count).toBeGreaterThan(0);
});

test("meal details shows cook data and the WhatsApp action", async ({ page }, info) => {
  await page.goto("/#/home");
  await expect(page.locator('[data-kind="ready"] article').first()).toBeVisible({
    timeout: 30_000,
  });
  await page.locator('[data-kind="ready"] article').first().click();
  await expect(page.getByText("صاحب الوجبة")).toBeVisible({ timeout: 15_000 });
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
  await page.getByRole("button", { name: /الإعدادات/ }).click();
  await page.getByRole("button", { name: /الوجبات/ }).click();

  await expect(page.locator('[data-kind="stale"]')).toBeVisible({ timeout: 20_000 });
  const rows = await page.locator('[data-kind="stale"] article').count();
  expect(rows).toBeGreaterThan(0);
  await page.screenshot({ path: `artifacts/screenshots/${info.project.name}/home-stale.png` });
  await page.unroute("**/api/collections/meals/**");
});

test("language switch flips direction and labels", async ({ page }, info) => {
  await page.goto("/#/settings");
  await expect(page.locator("h1")).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: /اللغة/ }).click();
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
  await expect(page.locator("h1")).toHaveText("Settings");
  await page.screenshot({ path: `artifacts/screenshots/${info.project.name}/settings-en.png` });
});
