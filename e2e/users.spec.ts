import { test, expect } from "@playwright/test";
import { loginAsAdmin, loginAsAgent, ADMIN_EMAIL } from "./helpers/auth";

test.describe("Users page", () => {
  test("admin sees users in the table with their email and role", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/users");

    const table = page.getByTestId("users-table");
    await expect(table).toBeVisible();

    const adminRow = table.getByRole("row").filter({ hasText: ADMIN_EMAIL });
    await expect(adminRow.getByRole("cell", { name: "admin", exact: true })).toBeVisible();
  });

  test("agent is redirected away from /users", async ({ page }) => {
    await loginAsAgent(page);
    await page.goto("/users");

    await expect(page).toHaveURL("/");
  });
});

test.describe("Edit user", () => {
  test("admin can edit a user's name", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/users");

    const table = page.getByTestId("users-table");
    await expect(table).toBeVisible();

    // Scope to the admin's own row and click Edit
    const adminRow = table.getByRole("row").filter({ hasText: ADMIN_EMAIL });
    await adminRow.getByRole("button", { name: "Edit" }).click();

    // Dialog should open with the title "Edit user"
    const dialog = page.getByRole("dialog", { name: "Edit user" });
    await expect(dialog).toBeVisible();

    // Name and Email fields should be pre-populated
    const nameField = dialog.getByLabel("Name");
    const emailField = dialog.getByLabel("Email");
    await expect(nameField).not.toHaveValue("");
    await expect(emailField).toHaveValue(ADMIN_EMAIL);

    // Update the name
    await nameField.clear();
    await nameField.fill("Updated Admin");

    await dialog.getByRole("button", { name: "Save changes" }).click();

    // Dialog closes after a successful save
    await expect(dialog).not.toBeVisible();

    // The updated name appears in the table row
    await expect(table).toBeVisible();
    const updatedRow = table.getByRole("row").filter({ hasText: ADMIN_EMAIL });
    await expect(updatedRow.getByRole("cell", { name: "Updated Admin" })).toBeVisible();
  });

  test("agent cannot reach /users and therefore never sees the Edit button", async ({ page }) => {
    await loginAsAgent(page);
    await page.goto("/users");

    // The page is entirely inaccessible to agents — they are redirected away
    await expect(page).toHaveURL("/");
  });
});

