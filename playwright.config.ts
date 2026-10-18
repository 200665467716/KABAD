import "dotenv/config";
import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.PORT ?? 3100);
const REALTIME_PORT = Number(process.env.REALTIME_PORT ?? 4001);
const BASE = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "e2e",
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: BASE,
    locale: "fr-FR",
    trace: "retain-on-failure",
    // Set CHROMIUM_PATH to reuse a browser already installed on the machine.
    launchOptions: process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : undefined,
  },
  projects: [
    { name: "telephone", testIgnore: /messagerie/, use: { ...devices["Pixel 7"], browserName: "chromium" } },
    { name: "ordinateur", testIgnore: /messagerie/, use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 860 } } },
    // Messaging writes to the database: one worker, in order.
    { name: "messagerie", testMatch: /messagerie/, fullyParallel: false, use: { ...devices["Pixel 7"], browserName: "chromium" } },
  ],
  webServer: [
    {
      command: "node realtime/server.mjs",
      url: `http://127.0.0.1:${REALTIME_PORT}/health`,
      reuseExistingServer: !process.env.CI,
      env: { REALTIME_PORT: String(REALTIME_PORT), REALTIME_ALLOWED_ORIGINS: BASE },
      timeout: 30_000,
    },
    {
      command: `npx next start -p ${PORT}`,
      url: BASE,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
  ],
});
