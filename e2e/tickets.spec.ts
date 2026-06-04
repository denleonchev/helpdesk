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

test("pagination controls navigate between pages", async ({ page, request }) => {
  // Seed 11 tickets with a unique run ID so we can isolate them via search.
  // PAGE_SIZE=10, so 11 results produces exactly 2 pages.
  const runId = Date.now().toString();
  await Promise.all(
    Array.from({ length: 11 }, (_, i) =>
      createTicket(request, {
        from: `pagtest${i}@example.com`,
        fromName: `Pag Customer ${i}`,
        subject: `Pagination ticket ${runId} ${i}`,
        body: "Pagination test body.",
      })
    )
  );

  await loginAsAdmin(page);
  await page.goto("/tickets");

  // Filter to just our 11 tickets (search has a 300 ms debounce; Playwright
  // auto-waits on the assertions below, so no explicit sleep needed).
  await page.getByTestId("filter-search").fill(`Pagination ticket ${runId}`);

  const pagination = page.getByTestId("pagination");
  await expect(pagination).toBeVisible();

  // Page 1: Previous disabled, Next enabled
  await expect(page.getByTestId("pagination-prev")).toBeDisabled();
  await expect(page.getByTestId("pagination-next")).toBeEnabled();
  await expect(page.getByText(/Showing 1–10 of 11/)).toBeVisible();

  // Navigate to page 2
  await page.getByTestId("pagination-next").click();

  // Page 2: Previous enabled, Next disabled (only 1 ticket on this page)
  await expect(page.getByTestId("pagination-prev")).toBeEnabled();
  await expect(page.getByTestId("pagination-next")).toBeDisabled();
  await expect(page.getByText(/Showing 11–11 of 11/)).toBeVisible();
});

test("admin can view ticket details by clicking a row", async ({ page, request }) => {
  const runId = Date.now().toString();
  await createTicket(request, {
    from: "detail-test@example.com",
    fromName: "Detail Customer",
    subject: `Detail page test subject ${runId}`,
    body: "This is the detail page test body.",
  });

  await loginAsAdmin(page);
  await page.goto("/tickets");

  const table = page.getByTestId("tickets-table");
  await expect(table).toBeVisible();

  // Click the row for our ticket to navigate to the detail page
  await table
    .getByRole("row")
    .filter({ hasText: `Detail page test subject ${runId}` })
    .click();

  await page.waitForURL(/\/tickets\/[^/]+$/);

  // Wait for the detail content to load
  const detail = page.getByTestId("ticket-detail");
  await expect(detail).toBeVisible();

  // Verify subject, sender info, status, and body are all present
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    `Detail page test subject ${runId}`
  );
  await expect(detail.getByText("Detail Customer")).toBeVisible();
  await expect(detail.getByText("detail-test@example.com")).toBeVisible();
  await expect(detail.getByText("open")).toBeVisible();
  await expect(detail.getByText("This is the detail page test body.")).toBeVisible();
});

test("admin can assign a ticket to an agent", async ({ page, request }) => {
  const runId = Date.now().toString();
  await createTicket(request, {
    from: "assign-test@example.com",
    fromName: "Assign Customer",
    subject: `Assign test subject ${runId}`,
    body: "Please assign this ticket to someone.",
  });

  await loginAsAdmin(page);
  await page.goto("/tickets");

  const table = page.getByTestId("tickets-table");
  await expect(table).toBeVisible();

  await table
    .getByRole("row")
    .filter({ hasText: `Assign test subject ${runId}` })
    .click();

  await page.waitForURL(/\/tickets\/\d+$/);

  const detail = page.getByTestId("ticket-detail");
  await expect(detail).toBeVisible();

  // Before assignment the combobox should show "Unassigned"
  const assignCombobox = page.getByRole("combobox");
  await expect(assignCombobox).toHaveText("Unassigned");

  // Open the dropdown and select the seeded agent
  await assignCombobox.click();
  await page.getByRole("option", { name: "Agent" }).click();

  // After selection the combobox reflects the new assignment without a reload
  await expect(assignCombobox).toHaveText("Agent");

  // Navigate away and back to confirm the assignment was persisted
  await page.goto("/tickets");
  await table
    .getByRole("row")
    .filter({ hasText: `Assign test subject ${runId}` })
    .click();
  await page.waitForURL(/\/tickets\/\d+$/);
  await expect(page.getByTestId("ticket-detail")).toBeVisible();
  await expect(page.getByRole("combobox")).toHaveText("Agent");
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
