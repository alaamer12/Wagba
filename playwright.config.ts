import { defineConfig } from "@playwright/test";

const baseURL = process.env.BASE_URL ?? "http://127.0.0.1:9100";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  fullyParallel: false,
  outputDir: "artifacts/test-results",
  reporter: [["list"], ["html", { outputFolder: "artifacts/report", open: "never" }]],
  use: {
    baseURL,
    channel: "chrome",
    viewport: { width: 390, height: 844 },
    locale: "ar-EG",
    timezoneId: "Africa/Cairo",
    permissions: ["geolocation"],
    geolocation: { latitude: 30.0459, longitude: 31.2243 },
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "ar", use: { locale: "ar-EG" } },
    { name: "en", use: { locale: "en-US" } },
  ],
});
