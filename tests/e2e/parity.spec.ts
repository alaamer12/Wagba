import { expect, test } from "@playwright/test";

// Parity captures: the two screens that carry a supplied illustration. Compared
// offline by tools/parity.py against mockups/2.png and mockups/empty-meals state.png.
test("capture home empty state", async ({ page }, info) => {
  await page.addInitScript(() => {
    (window as { __WAGBA_FORCE_STATE?: boolean }).__WAGBA_FORCE_STATE = true;
  });
  await page.goto("/#/home?state=empty");
  await expect(page.locator('[data-kind="empty"]')).toBeVisible({ timeout: 30_000 });
  await page.waitForFunction(() => {
    const img = document.querySelector(".empty__art") as HTMLImageElement | null;
    return !!img && img.complete && img.naturalWidth > 0;
  });
  await page.screenshot({ path: `artifacts/parity/${info.project.name}-home-empty.png` });
});

test("capture my meals empty state", async ({ page }, info) => {
  await page.goto("/#/mine");
  // Strict mode would refuse this either way: the region stamps `data-kind` and the notice
  // inside it carries `.empty`, so the selector resolves to both. What matters is that one of
  // them is on screen before the shutter opens.
  await expect(page.locator("[data-kind], .empty").first()).toBeVisible({ timeout: 30_000 });
  await expect(page.locator(".empty__title")).toBeVisible({ timeout: 30_000 });
  await page.waitForFunction(() => {
    const img = document.querySelector(".empty__art") as HTMLImageElement | null;
    return !!img && img.complete && img.naturalWidth > 0;
  });
  await page.screenshot({ path: `artifacts/parity/${info.project.name}-my-meals-empty.png` });
});
