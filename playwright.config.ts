import { defineConfig, devices } from "@playwright/test";
import { config } from "dotenv";

config({ path: ".env.test" });

const serverUrl = process.env.BETTER_AUTH_URL!;
const clientUrl = process.env.TRUSTED_ORIGINS!;
const serverPort = Number(new URL(serverUrl).port);
const clientPort = Number(new URL(clientUrl).port);

export const TEST_DATABASE_URL = process.env.DATABASE_URL!;
export { serverUrl };

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: "html",
  use: {
    baseURL: clientUrl,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  globalSetup: "./playwright/global-setup.ts",
  webServer: [
    {
      command: "bun run dev",
      cwd: "./server",
      port: serverPort,
      reuseExistingServer: !process.env.CI,
      env: {
        DATABASE_URL: process.env.DATABASE_URL!,
        BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET!,
        BETTER_AUTH_URL: serverUrl,
        ADMIN_EMAIL: process.env.ADMIN_EMAIL!,
        ADMIN_PASSWORD: process.env.ADMIN_PASSWORD!,
        TRUSTED_ORIGINS: clientUrl,
        WEBHOOK_SECRET: process.env.WEBHOOK_SECRET!,
      },
    },
    {
      command: "bun run dev",
      cwd: "./client",
      port: clientPort,
      reuseExistingServer: !process.env.CI,
      env: {
        VITE_PORT: String(clientPort),
        VITE_API_TARGET: serverUrl,
        VITE_E2E: "true",
      },
    },
  ],
});
