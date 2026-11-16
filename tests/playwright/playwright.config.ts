import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright configuration for live Business Central Web Client verification.
 * Overlay counterpart: root playwright.config.ts
 */
export default defineConfig({
  testDir: ".",
  testMatch: "**/*.spec.ts",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never", outputFolder: "../../test-results/html" }]],
  use: {
    baseURL: process.env.BC_WEB_URL ?? "https://businesscentral.dynamics.com",
    // Managed Entra ID session captured by `npm run cli -- browse` / a login capture.
    ...(process.env.PLAYWRIGHT_STORAGE_STATE || process.env.BC_STORAGE_STATE
      ? { storageState: process.env.PLAYWRIGHT_STORAGE_STATE ?? process.env.BC_STORAGE_STATE! }
      : {}),
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    ...devices["Desktop Chrome"],
  },
  outputDir: "../../test-results/artifacts",
});