import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers/auth";
import { serverUrl } from "../playwright.config";

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET ?? "dev-webhook-secret";

/** POST a ticket via the email webhook and return when the request completes. */
async function createTicket(
  request: import("@playwright/test").APIRequestContext,
  data: { from: string; fromName: string; subject: string; body: string }
) {
  await request.post(`${serverUrl}/api/webhooks/email`, {
    headers: { "X-Webhook-Secret": WEBHOOK_SECRET },
    data,
  });
}

test("admin sees a submitted ticket in the tickets list", async ({ page, request }) => {
  await createTicket(request, {
    from: "customer@example.com",
    fromName: "Test Customer",
    subject: "Cannot access my account",
    body: "I have been locked out since yesterday.",
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

test("clicking a column header re-sorts the tickets table", async ({ page, request }) => {
  await Promise.all([
    createTicket(request, {
      from: "aaa@example.com",
      fromName: "AAA Customer",
      subject: "AAA sort test subject",
      body: "First ticket.",
    }),
    createTicket(request, {
      from: "zzz@example.com",
      fromName: "ZZZ Customer",
      subject: "ZZZ sort test subject",
      body: "Second ticket.",
    }),
  ]);

  await loginAsAdmin(page);
  await page.goto("/tickets");

  const table = page.getByTestId("tickets-table");
  await expect(table).toBeVisible();

  await page.getByRole("button", { name: "Subject" }).click();
  await expect(table).toBeVisible();

  const rows = table.getByRole("row");
  const allRowTexts = await rows.allTextContents();
  const aaaIndex = allRowTexts.findIndex((t) => t.includes("AAA sort test subject"));
  const zzzIndex = allRowTexts.findIndex((t) => t.includes("ZZZ sort test subject"));

  expect(aaaIndex).toBeGreaterThan(-1);
  expect(zzzIndex).toBeGreaterThan(-1);
  expect(aaaIndex).toBeLessThan(zzzIndex);
});
