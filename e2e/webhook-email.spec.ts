import { test, expect } from "@playwright/test";
import { serverUrl } from "../playwright.config";

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET ?? "dev-webhook-secret";
const WEBHOOK_URL = `${serverUrl}/api/webhooks/email`;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Minimal valid payload that satisfies the inboundEmailSchema. */
function validPayload(overrides?: Record<string, unknown>) {
  return {
    from: "sender@example.com",
    fromName: "Test Sender",
    subject: "My support request",
    body: "I need help with my account.",
    ...overrides,
  };
}

/** POST to the webhook endpoint with the correct secret and JSON body. */
async function postWebhook(
  request: import("@playwright/test").APIRequestContext,
  payload: unknown,
  secret: string = WEBHOOK_SECRET
) {
  return request.post(WEBHOOK_URL, {
    headers: {
      "Content-Type": "application/json",
      "X-Webhook-Secret": secret,
    },
    data: payload,
  });
}

// ---------------------------------------------------------------------------
// Happy path
// ---------------------------------------------------------------------------

test.describe("POST /api/webhooks/email — happy path", () => {
  test("returns 201 with the created ticket on a valid request", async ({ request }) => {
    const response = await postWebhook(request, validPayload());

    expect(response.status()).toBe(201);

    const body = await response.json();
    expect(typeof body.id).toBe("number");
    expect(body.subject).toBe("My support request");
    expect(body.body).toBe("I need help with my account.");
    expect(body.fromEmail).toBe("sender@example.com");
    expect(body.fromName).toBe("Test Sender");
    expect(body.status).toBe("open");
    expect(body.category).toBeNull();
    expect(body.assignedToId).toBeNull();
    expect(typeof body.createdAt).toBe("string");
    expect(typeof body.updatedAt).toBe("string");
  });

  test("each call creates a distinct ticket with a unique id", async ({ request }) => {
    const [r1, r2] = await Promise.all([
      postWebhook(request, validPayload({ subject: "First ticket" })),
      postWebhook(request, validPayload({ subject: "Second ticket" })),
    ]);

    expect(r1.status()).toBe(201);
    expect(r2.status()).toBe(201);

    const t1 = await r1.json();
    const t2 = await r2.json();
    expect(t1.id).not.toBe(t2.id);
  });

  test("fromEmail is correctly mapped from the 'from' field in the request body", async ({ request }) => {
    const response = await postWebhook(request, validPayload({ from: "mapped@test.io" }));

    expect(response.status()).toBe(201);
    const body = await response.json();
    // The route maps `from` → `fromEmail` in the database
    expect(body.fromEmail).toBe("mapped@test.io");
  });

  test("created ticket always has status 'open'", async ({ request }) => {
    const response = await postWebhook(request, validPayload());

    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body.status).toBe("open");
  });

  test("created ticket has null category and assignedToId", async ({ request }) => {
    const response = await postWebhook(request, validPayload());

    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body.category).toBeNull();
    expect(body.assignedToId).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Authentication
// ---------------------------------------------------------------------------

test.describe("POST /api/webhooks/email — authentication", () => {
  test("returns 401 when the X-Webhook-Secret header is missing", async ({ request }) => {
    const response = await request.post(WEBHOOK_URL, {
      headers: { "Content-Type": "application/json" },
      data: validPayload(),
    });

    expect(response.status()).toBe(401);
  });

  test("returns 401 when the X-Webhook-Secret header is wrong", async ({ request }) => {
    const response = await postWebhook(request, validPayload(), "wrong-secret");

    expect(response.status()).toBe(401);
  });

  test("returns 401 when the X-Webhook-Secret header is empty string", async ({ request }) => {
    const response = await postWebhook(request, validPayload(), "");

    expect(response.status()).toBe(401);
  });

  test("401 response body contains an error field", async ({ request }) => {
    const response = await postWebhook(request, validPayload(), "bad-secret");

    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(typeof body.error).toBe("string");
    expect(body.error.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Validation — missing required fields
// ---------------------------------------------------------------------------

test.describe("POST /api/webhooks/email — missing required fields", () => {
  test("returns 400 when 'from' is missing", async ({ request }) => {
    const { from: _omitted, ...payload } = validPayload();
    const response = await postWebhook(request, payload);

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(typeof body.error).toBe("string");
  });

  test("returns 400 when 'fromName' is missing", async ({ request }) => {
    const { fromName: _omitted, ...payload } = validPayload();
    const response = await postWebhook(request, payload);

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(typeof body.error).toBe("string");
  });

  test("returns 400 when 'subject' is missing", async ({ request }) => {
    const { subject: _omitted, ...payload } = validPayload();
    const response = await postWebhook(request, payload);

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(typeof body.error).toBe("string");
  });

  test("returns 400 when 'body' is missing", async ({ request }) => {
    const { body: _omitted, ...payload } = validPayload();
    const response = await postWebhook(request, payload);

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(typeof body.error).toBe("string");
  });

  test("returns 400 when the entire body is empty", async ({ request }) => {
    const response = await postWebhook(request, {});

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(typeof body.error).toBe("string");
  });
});

// ---------------------------------------------------------------------------
// Validation — invalid field values
// ---------------------------------------------------------------------------

test.describe("POST /api/webhooks/email — invalid field values", () => {
  test("returns 400 when 'from' is not a valid email address", async ({ request }) => {
    const response = await postWebhook(request, validPayload({ from: "not-an-email" }));

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(typeof body.error).toBe("string");
  });

  test("returns 400 when 'fromName' is an empty string", async ({ request }) => {
    const response = await postWebhook(request, validPayload({ fromName: "" }));

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(typeof body.error).toBe("string");
  });

  test("returns 400 when 'subject' is an empty string", async ({ request }) => {
    const response = await postWebhook(request, validPayload({ subject: "" }));

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(typeof body.error).toBe("string");
  });

  test("returns 400 when 'body' is an empty string", async ({ request }) => {
    const response = await postWebhook(request, validPayload({ body: "" }));

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(typeof body.error).toBe("string");
  });

  test("returns 400 when 'from' has a bare domain with no TLD", async ({ request }) => {
    // Zod z.email() rejects addresses like user@localhost
    const response = await postWebhook(request, validPayload({ from: "user@localhost" }));

    // Zod's email validator rejects bare domains — 400 expected
    expect(response.status()).toBe(400);
  });
});
