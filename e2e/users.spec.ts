import { test, expect } from "@playwright/test";
import { loginAsAdmin, loginAsAgent, ADMIN_EMAIL } from "./helpers/auth";

test.describe("Users page", () => {
  test("admin sees users in the table with their email and role", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/users");

    const table = page.getByTestId("users-table");
    await expect(table).toBeVisible();

    const adminRow = table.getByRole("row").filter({ hasText: ADMIN_EMAIL });
    await expect(adminRow.getByText("admin")).toBeVisible();
  });

  test("agent is redirected away from /users", async ({ page }) => {
    await loginAsAgent(page);
    await page.goto("/users");

    await expect(page).toHaveURL("/");
  });
});
