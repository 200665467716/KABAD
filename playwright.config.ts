import "dotenv/config";
import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.PORT ?? 3100);
const REALTIME_PORT = Number(process.env.REALTIME_PORT ?? 4001);
const BASE = `http://127.0.0.1:${PORT}`;
// Voice rooms are tested only when switched on (NEXT_PUBLIC_SALONS=on at build time).
const SALONS = process.env.NEXT_PUBLIC_SALONS === "on";

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
  // Screens first (read only), then the journeys that change data, one after the other.
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    { name: "telephone", testMatch: /ecrans/, dependencies: ["setup"], use: { ...devices["Pixel 7"], browserName: "chromium" } },
    { name: "ordinateur", testMatch: /ecrans/, dependencies: ["setup"], use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 860 } } },
    { name: "parcours", testMatch: /parcours/, dependencies: ["telephone", "ordinateur"], fullyParallel: false, use: { ...devices["Pixel 7"], browserName: "chromium" } },
    { name: "messagerie", testMatch: /messagerie/, dependencies: ["parcours"], fullyParallel: false, use: { ...devices["Pixel 7"], browserName: "chromium" } },
    // Voice rooms: a fake microphone plays a tone, and the browser never asks for permission.
    ...(SALONS ? [{
      name: "salons",
      testMatch: /salons/,
      dependencies: ["messagerie"],
      fullyParallel: false,
      use: {
        ...devices["Desktop Chrome"],
        launchOptions: {
          ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
          args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream", "--autoplay-policy=no-user-gesture-required"],
        },
      },
    }] : []),
  ],
  webServer: [
    // LiveKit for the voice rooms: LIVEKIT_BIN points to the livekit-server binary (see README).
    ...(SALONS ? [{
      command: `${process.env.LIVEKIT_BIN ?? "livekit-server"} --dev --bind 127.0.0.1`,
      url: "http://127.0.0.1:7880",
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    }] : []),
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
