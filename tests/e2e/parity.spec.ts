import { expect, test } from "@playwright/test";

// Parity capture: the empty My Meals screen, the one mockup that has a real
// illustration in it. Compared offline by tools/parity.py.
test("capture my meals empty state", async ({ page }, info) => {
  await page.goto("/#/mine");
  await expect(page.locator("[data-kind], .empty")).toBeVisible({ timeout: 30_000 });
  await expect(page.locator(".empty__title")).toBeVisible({ timeout: 30_000 });
  await page.waitForFunction(() => {
    const img = document.querySelector(".empty__art") as HTMLImageElement | null;
    return !!img && img.complete && img.naturalWidth > 0;
  });
  await page.screenshot({ path: `artifacts/parity/${info.project.name}-my-meals-empty.png` });
});
