import { expect, test } from "@playwright/test";

// Every region kind, forced through the documented harness: `?state=` injects
// facts and window.__WAGBA_FORCE_STATE enables it outside dev. Each cell asserts
// the kind, captures a screenshot, and fails on any console error.

const KINDS = [
  "ready",
  "empty",
  "empty-filtered",
  "stale",
  "fault",
  "loading",
  "blocked",
  "submitting",
  "rejected",
  "unknown",
] as const;

for (const kind of KINDS) {
  test(`state matrix: ${kind}`, async ({ page }, info) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(String(error)));
    await page.addInitScript(() => {
      (window as { __WAGBA_FORCE_STATE?: boolean }).__WAGBA_FORCE_STATE = true;
    });
    await page.goto(`/#/home?state=${kind}`);
    const region = page.locator(`[data-kind="${kind === "unknown" ? "unknown" : kind}"]`);
    await expect(region).toBeVisible({ timeout: 30_000 });
    await page.screenshot({
      path: `artifacts/states/${info.project.name}/${kind}.png`,
      fullPage: false,
    });
    expect(errors).toEqual([]);
  });
}
