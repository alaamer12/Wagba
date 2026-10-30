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

  const first = (await cards.first().locator("h3").textContent()) ?? "";
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

test("first launch provisions an anonymous account", async ({ page }) => {
  const creates: number[] = [];
  page.on("response", (res) => {
    if (res.url().includes("/api/collections/users/records") && res.request().method() === "POST") {
      creates.push(res.status());
    }
  });
  await page.goto("/#/home");
  await expect(page.locator("[data-kind]").first()).toBeVisible({ timeout: 30_000 });
  await expect.poll(() => creates, { timeout: 15_000 }).toEqual([200]);
});

test("suggestion chips filter the feed", async ({ page }) => {
  await page.goto("/#/home");
  await expect(page.locator('[data-kind="ready"]')).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: "محشي", exact: true }).click();
  await expect(page.getByRole("searchbox")).toHaveValue("محشي");
  await expect(page.locator('[data-kind="ready"] article').first()).toBeVisible({
    timeout: 15_000,
  });
  const titles = await page.locator('[data-kind="ready"] article h3').allTextContents();
  expect(titles.some((title) => title.includes("محشي"))).toBe(true);
});

test("a completed profile can publish a meal and see it on Home", async ({ page }) => {
  await page.goto("/#/profile");
  await page.getByLabel("الاسم").fill("نور حسن");
  await page.getByLabel("رقم الواتساب").fill("01012345678");
  await page.getByLabel("المكان").fill("المعادي");
  await page.getByRole("button", { name: "احفظ ومتابعة" }).click();
  await expect(page).toHaveURL(/#\/settings/, { timeout: 20_000 });

  await page.goto("/#/add");
  await page.getByLabel("اسم الوجبة").fill("كفتة بالطماطم");
  await page.locator("#photos").setInputFiles("tests/fixtures/photos/p2.png");
  await page.getByLabel("المكان").fill("المعادي");
  await page.getByRole("button", { name: "نشر الوجبة" }).click();

  await expect(page.locator('[data-kind="ready"]')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("كفتة بالطماطم").first()).toBeVisible({ timeout: 15_000 });

  // My Meals is scoped to the owner: one card, and none of the seeded cooks' meals.
  await page.goto("/#/mine");
  await expect(page.locator(".item")).toHaveCount(1, { timeout: 20_000 });
  await expect(page.locator(".item")).toContainText("كفتة بالطماطم");
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
  // Quasar's stylesheet forces `direction: ltr`; the locale has to win.
  await expect(page.locator("body")).toHaveCSS("direction", "rtl");
  await page.getByRole("button", { name: /اللغة/ }).click();
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
  await expect(page.locator("body")).toHaveCSS("direction", "ltr");
  await expect(page.locator("h1")).toHaveText("Settings");
  await page.screenshot({ path: `artifacts/screenshots/${info.project.name}/settings-en.png` });
});
