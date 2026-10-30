import { expect, test } from "@playwright/test";
import { SCREENS } from "./region-matrix";

// The state matrix, driven by the applicability table in `region-matrix.ts` rather than by a
// hard-coded list of ten kinds on one screen.
//
// Every kind is forced by injecting the *facts* that produce it (`?state=` plus
// `window.__WAGBA_FORCE_STATE`), so `resolveRegion` still decides — this suite tests the ladder,
// not an override. A kind with no case of its own must render the fault display and say so:
// asserting equality with that screen's own fault text is what stops an undesigned state being
// photographed as though it were one (defect C1).

for (const screen of SCREENS) {
  test.describe(`state matrix: ${screen.name}`, () => {
    let faultText = "";

    test.beforeEach(async ({ page }) => {
      await page.addInitScript(() => {
        (window as { __WAGBA_FORCE_STATE?: boolean }).__WAGBA_FORCE_STATE = true;
      });
      await page.goto(`${screen.route}?state=fault`);
      const region = page.locator('[data-kind="fault"]');
      await expect(region).toBeVisible({ timeout: 30_000 });
      faultText = (await region.innerText()).trim();
    });

    for (const item of screen.cells) {
      test(`${item.kind} is ${item.outcome}`, async ({ page }, testInfo) => {
        const errors: string[] = [];
        page.on("pageerror", (error) => errors.push(String(error)));
        await page.goto(`${screen.route}?state=${item.kind}`);
        const region = page.locator(`[data-kind="${item.kind}"]`);
        const text = () => region.innerText().then((value) => value.trim());

        if (item.outcome === "fallback") {
          await expect(region).toBeVisible({ timeout: 30_000 });
          expect(await text(), item.note ?? `${screen.name} has no ${item.kind} case`).toBe(
            faultText,
          );
        } else if (item.outcome === "data") {
          // The case is distinct but needs real rows; the journey named in the matrix proves it.
          await expect(region).toBeAttached({ timeout: 30_000 });
        } else {
          await expect(region).toBeVisible({ timeout: 30_000 });
          if (item.kind !== "fault") {
            expect(await text(), item.note ?? "").not.toBe(faultText);
          }
          if (screen.shots) {
            await page.screenshot({
              path: `artifacts/states/${testInfo.project.name}/${item.kind}.png`,
              fullPage: false,
            });
          }
        }
        expect(errors).toEqual([]);
      });
    }
  });
}
