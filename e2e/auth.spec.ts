import { test, expect } from "@playwright/test";
import { loginAs, loginAsAdmin, ADMIN_EMAIL, ADMIN_PASSWORD } from "./helpers/auth";

// ---------------------------------------------------------------------------
// Login page rendering
// ---------------------------------------------------------------------------

test.describe("Login page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
  });

  test("renders the sign-in form with all expected elements", async ({ page }) => {
    // CardTitle renders as a <div>, not a semantic heading element
    await expect(page.getByText("Helpdesk — Sign in")).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
  });

  test("email field receives focus automatically", async ({ page }) => {
    await expect(page.getByLabel("Email")).toBeFocused();
  });
});

// ---------------------------------------------------------------------------
// Successful login
// ---------------------------------------------------------------------------

test.describe("Successful login", () => {
  test("admin can sign in and lands on the dashboard", async ({ page }) => {
    await loginAsAdmin(page);

    await expect(page).toHaveURL("/");
    // Dashboard heading visible means we are past the protected route
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  });

  test("navbar shows the signed-in user's name after login", async ({ page }) => {
    await loginAsAdmin(page);

    // The seed creates the admin with name "Admin"
    await expect(page.getByText("Admin", { exact: true })).toBeVisible();
  });

  test("sign-in button shows loading state while request is in flight", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(ADMIN_EMAIL);
    await page.getByLabel("Password").fill(ADMIN_PASSWORD);

    // Intercept the auth request so we can observe the loading state
    await page.route("**/api/auth/sign-in/email", async (route) => {
      // Delay the response long enough to catch the interim label
      await new Promise((resolve) => setTimeout(resolve, 300));
      await route.continue();
    });

    const button = page.getByRole("button", { name: /Sign in|Signing in/ });
    await button.click();

    // While the request is pending the button label changes and it is disabled
    await expect(page.getByRole("button", { name: "Signing in..." })).toBeDisabled();

    // After the request resolves we land on the dashboard
    await page.waitForURL("/");
  });
});

// ---------------------------------------------------------------------------
// Failed login – client-side validation (Zod, React Hook Form)
// ---------------------------------------------------------------------------

test.describe("Client-side validation", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
  });

  test("shows required-field errors when form is submitted empty", async ({ page }) => {
    await page.getByRole("button", { name: "Sign in" }).click();

    // Email field: Zod's z.email() rejects an empty string
    await expect(page.getByText("Invalid email")).toBeVisible();
    // Password field: z.string().min(1, ...) produces this message
    await expect(page.getByText("Password is required")).toBeVisible();
  });

  test("shows email format error for a malformed email", async ({ page }) => {
    await page.getByLabel("Email").fill("not-an-email");
    await page.getByLabel("Password").fill("anything");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page.getByText("Invalid email")).toBeVisible();
  });

  test("shows password required error when only email is filled", async ({ page }) => {
    await page.getByLabel("Email").fill(ADMIN_EMAIL);
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page.getByText("Password is required")).toBeVisible();
  });

  test("shows email error when only password is filled", async ({ page }) => {
    await page.getByLabel("Password").fill("somepassword");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page.getByText("Invalid email")).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Failed login – server-side errors
// ---------------------------------------------------------------------------

test.describe("Server-side login errors", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
  });

  test("shows an error message for a correct email but wrong password", async ({ page }) => {
    await page.getByLabel("Email").fill(ADMIN_EMAIL);
    await page.getByLabel("Password").fill("wrong-password");
    await page.getByRole("button", { name: "Sign in" }).click();

    // Better Auth returns "Invalid email or password" for any credential mismatch
    await expect(page.getByText(/invalid email or password/i)).toBeVisible();
    // Must stay on the login page
    await expect(page).toHaveURL("/login");
  });

  test("shows an error message for an email that does not exist", async ({ page }) => {
    await page.getByLabel("Email").fill("nobody@example.com");
    await page.getByLabel("Password").fill("irrelevant");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page.getByText(/invalid email or password/i)).toBeVisible();
    await expect(page).toHaveURL("/login");
  });

  test("shows an error for a valid-format email that is not registered", async ({ page }) => {
    await page.getByLabel("Email").fill("ghost@helpdesk.io");
    await page.getByLabel("Password").fill("password123");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page.getByText(/invalid email or password/i)).toBeVisible();
  });

  test("does not navigate away from /login after a failed attempt", async ({ page }) => {
    await page.getByLabel("Email").fill(ADMIN_EMAIL);
    await page.getByLabel("Password").fill("badpassword");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page.getByText(/invalid email or password/i)).toBeVisible();
    await expect(page).toHaveURL("/login");

    // Form fields remain filled so the user can correct only what is wrong
    await expect(page.getByLabel("Email")).toHaveValue(ADMIN_EMAIL);
  });
});

// ---------------------------------------------------------------------------
// Logout
// ---------------------------------------------------------------------------

test.describe("Logout", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("sign-out button redirects to /login", async ({ page }) => {
    await page.getByRole("button", { name: "Sign out" }).click();

    await expect(page).toHaveURL("/login");
  });

  test("after signing out the dashboard is no longer accessible", async ({ page }) => {
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL("/login");

    // Trying to visit the dashboard directly should bounce back to login
    await page.goto("/");
    await expect(page).toHaveURL("/login");
  });

  test("after signing out the login form is visible again", async ({ page }) => {
    await page.getByRole("button", { name: "Sign out" }).click();

    // CardTitle renders as a <div>, not a semantic heading element
    await expect(page.getByText("Helpdesk — Sign in")).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Session persistence
// ---------------------------------------------------------------------------

test.describe("Session persistence", () => {
  test("session survives a full page reload", async ({ page }) => {
    await loginAsAdmin(page);
    await expect(page).toHaveURL("/");

    await page.reload();

    // ProtectedRoute checks the session; if the cookie is gone it redirects to /login
    await expect(page).toHaveURL("/");
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  });

  test("session survives navigating away and back via the browser history", async ({ page }) => {
    await loginAsAdmin(page);

    // Use a client-side SPA nav link click so the browser history entry for "/"
    // is a pushState entry, not a full-page load. This ensures goBack() returns
    // to "/" within the SPA rather than triggering a fresh page load that could
    // race with the session check.
    await page.getByRole("link", { name: "Users" }).click();
    await page.waitForURL("/users");
    await expect(page.getByRole("heading", { name: "Users" })).toBeVisible();

    await page.goBack();

    await expect(page).toHaveURL("/");
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Unauthenticated access – protected routes redirect to /login
// ---------------------------------------------------------------------------

test.describe("Unauthenticated access", () => {
  test("visiting / without a session redirects to /login", async ({ page }) => {
    await page.goto("/");

    await expect(page).toHaveURL("/login");
  });

  test("visiting /users without a session redirects to /login", async ({ page }) => {
    await page.goto("/users");

    await expect(page).toHaveURL("/login");
  });

  test("an unknown route without a session redirects to /login", async ({ page }) => {
    await page.goto("/does-not-exist");

    await expect(page).toHaveURL("/login");
  });

  test("/login is accessible without a session", async ({ page }) => {
    await page.goto("/login");

    await expect(page).toHaveURL("/login");
    // CardTitle renders as a <div>, not a semantic heading element
    await expect(page.getByText("Helpdesk — Sign in")).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Role-based access
// ---------------------------------------------------------------------------

test.describe("Role-based access", () => {
  // The only seeded user is an admin; agent tests use a mocked session so we do
  // not depend on a second database user existing in every test run.

  test("admin can access the /users route", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/users");

    await expect(page).toHaveURL("/users");
    await expect(page.getByRole("heading", { name: "Users" })).toBeVisible();
  });

  test("admin navbar contains the Users link", async ({ page }) => {
    await loginAsAdmin(page);

    await expect(page.getByRole("link", { name: "Users" })).toBeVisible();
  });

  test("admin navbar contains the Dashboard link", async ({ page }) => {
    await loginAsAdmin(page);

    await expect(page.getByRole("link", { name: "Dashboard" })).toBeVisible();
  });

  test("non-admin session is redirected to / when visiting /users", async ({ page }) => {
    // We simulate an agent role by intercepting the session API that Better Auth
    // exposes and returning a user whose role is "agent". This avoids needing a
    // second seeded user while still exercising the ProtectedRoute role guard.
    await page.route("**/api/auth/get-session", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          session: {
            id: "fake-session-id",
            userId: "fake-user-id",
            expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
          },
          user: {
            id: "fake-user-id",
            name: "Agent User",
            email: "agent@example.com",
            role: "agent",
            emailVerified: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        }),
      });
    });

    await page.goto("/users");

    // ProtectedRoute with allowedRoles={["admin"]} redirects non-admins to "/"
    await expect(page).toHaveURL("/");
  });

  test("non-admin session does not see the Users link in the navbar", async ({ page }) => {
    await page.route("**/api/auth/get-session", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          session: {
            id: "fake-session-id",
            userId: "fake-user-id",
            expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
          },
          user: {
            id: "fake-user-id",
            name: "Agent User",
            email: "agent@example.com",
            role: "agent",
            emailVerified: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        }),
      });
    });

    await page.goto("/");

    await expect(page.getByRole("link", { name: "Dashboard" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Users" })).not.toBeVisible();
  });
});
