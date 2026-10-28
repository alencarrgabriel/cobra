import { defineConfig, devices } from "@playwright/test";

import { E2E_ALERTS_SECRET, E2E_CRON_SECRET, e2eUrl } from "./e2e/db/setup";

const port = 3100;

// Runs against the production build: run `pnpm build` first (the root `pnpm check` does).
export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/db/setup.ts",
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${port}`,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "mobile-chromium",
      // Mobile first (RNF-15): a 360 px wide phone is the reference viewport.
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 360, height: 740 },
        isMobile: true,
        hasTouch: true,
        // Software WebGL, so the street map renders in headless runs and in CI.
        launchOptions: {
          args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
        },
      },
    },
  ],
  webServer: {
    command: `pnpm start --port ${port}`,
    url: `http://localhost:${port}/api/health`,
    reuseExistingServer: !process.env.CI,
    // The editorial panel writes to the same throwaway database (change painel-editorial).
    env: {
      APP_ENV: "test",
      WEB_DATABASE_URL: e2eUrl(),
      EDITOR_DATABASE_URL: e2eUrl(),
      // Without RESEND_API_KEY, messages go to alerts.outbox_local, where the tests read them.
      ALERTS_DATABASE_URL: e2eUrl(),
      ALERTS_SECRET: E2E_ALERTS_SECRET,
      RESEND_API_KEY: "",
      CRON_SECRET: E2E_CRON_SECRET,
    },
  },
});
