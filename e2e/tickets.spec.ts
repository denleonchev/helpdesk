import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers/auth";
import { serverUrl } from "../playwright.config";

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET ?? "dev-webhook-secret";

test("admin sees a submitted ticket in the tickets list", async ({ page, request }) => {
  await request.post(`${serverUrl}/api/webhooks/email`, {
    headers: { "X-Webhook-Secret": WEBHOOK_SECRET },
    data: {
      from: "customer@example.com",
      fromName: "Test Customer",
      subject: "Cannot access my account",
      body: "I have been locked out since yesterday.",
    },
  });

  await loginAsAdmin(page);
  await page.goto("/tickets");

  const table = page.getByTestId("tickets-table");
  await expect(table).toBeVisible();

  const row = table.getByRole("row").filter({ hasText: "Cannot access my account" });
  await expect(row.getByText("Test Customer")).toBeVisible();
  await expect(row.getByText("customer@example.com")).toBeVisible();
  await expect(row.getByText("open")).toBeVisible();
});
