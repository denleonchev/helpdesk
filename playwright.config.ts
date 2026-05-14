import { defineConfig, devices } from "@playwright/test";
import { config } from "dotenv";

config({ path: ".env.test" });

const TEST_HOST = process.env.TEST_HOST!;
const TEST_SERVER_PORT = Number(process.env.TEST_SERVER_PORT);
const TEST_CLIENT_PORT = Number(process.env.TEST_CLIENT_PORT);

export const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL!;

const serverUrl = `http://${TEST_HOST}:${TEST_SERVER_PORT}`;
const clientUrl = `http://${TEST_HOST}:${TEST_CLIENT_PORT}`;

const serverEnv: Record<string, string> = {
  DATABASE_URL: TEST_DATABASE_URL,
  PORT: String(TEST_SERVER_PORT),
  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET!,
  BETTER_AUTH_URL: serverUrl,
  ADMIN_EMAIL: process.env.ADMIN_EMAIL!,
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD!,
  TRUSTED_ORIGINS: clientUrl,
};

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
      port: TEST_SERVER_PORT,
      reuseExistingServer: !process.env.CI,
      env: serverEnv,
    },
    {
      command: "bun run dev",
      cwd: "./client",
      port: TEST_CLIENT_PORT,
      reuseExistingServer: !process.env.CI,
      env: {
        VITE_PORT: String(TEST_CLIENT_PORT),
        VITE_API_TARGET: serverUrl,
      },
    },
  ],
});
