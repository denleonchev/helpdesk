import type { Page } from "@playwright/test";

export const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@example.com";
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "changeme";
export const AGENT_EMAIL = process.env.AGENT_EMAIL ?? "agent@example.com";
export const AGENT_PASSWORD = process.env.AGENT_PASSWORD ?? "changeme";

/**
 * Fills the login form and submits it. Waits for navigation to the dashboard.
 * Use this when you need a logged-in session for a test.
 */
export async function loginAs(
  page: Page,
  email: string,
  password: string
): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("/");
}

/**
 * Logs in as the seeded admin user.
 */
export async function loginAsAdmin(page: Page): Promise<void> {
  await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
}

/**
 * Logs in as the seeded agent user.
 */
export async function loginAsAgent(page: Page): Promise<void> {
  await loginAs(page, AGENT_EMAIL, AGENT_PASSWORD);
}
