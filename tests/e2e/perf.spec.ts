import { expect, test } from "@playwright/test";

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
