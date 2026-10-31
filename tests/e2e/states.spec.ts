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
//
// C17: every screen is in the matrix, including the ones with no ladder. For those the proof is
// the other way round — a forced kind must change nothing and stamp no region — because "this
// screen has no cases" is a claim the old four-screen matrix could not make at all.

for (const screen of SCREENS) {
  test.describe(`state matrix: ${screen.name}`, () => {
    if (!screen.region) {
      test("every kind is a fallback: nothing can be forced onto a screen with no region", async ({
        page,
      }) => {
        // Welcome is a first launch, and the app sends a device that has seen it home; the mark
        // is cleared before every load so the screen under test stays on screen.
        if (screen.route.includes("/welcome")) {
          await page.addInitScript(() => {
            // Runs on about:blank too, where storage is denied; the hop is deliberate.
            try {
              globalThis.localStorage?.removeItem("wagba:welcome-seen");
              globalThis.localStorage?.removeItem("welcome-seen");
            } catch {
              /* no storage on this document */
            }
          });
        }
        const errors: string[] = [];
        page.on("pageerror", (error) => errors.push(String(error)));
        for (const item of screen.cells) {
          // A different document first: a hash-only change keeps the app alive, so the guard keeps
          // its cached "seen" answer and would redirect before the reload. about:blank forces the
          // next load to be a real first launch, and the init script clears the mark each time.
          await page.goto("about:blank");
          await page.goto(`${screen.route}?state=${item.kind}`);
          if (screen.landmark) {
            await expect(page.locator(screen.landmark)).toBeVisible({ timeout: 30_000 });
          }
          await expect(page.locator("[data-kind]"), item.note ?? "").toHaveCount(0);
        }
        expect(errors).toEqual([]);
      });
      return;
    }

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
        // One message per region. The ladder picks a single kind, so two notices inside the same
        // `[data-kind]` mean the template restarted the `v-else-if` chain and let the trailing
        // `v-else` paint a fault under the real answer — which is how one screen came to read
        // "Wagba needs your location" *and* "Something went wrong". Cached rows riding under a
        // block are the only extra content allowed, and they are not a notice.
        expect(
          await region.locator(".empty").count(),
          `${screen.name} paints one notice for ${item.kind}`,
        ).toBeLessThanOrEqual(1);
      });
    }
  });
}
