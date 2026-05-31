import { describe, it, expect, vi, beforeEach } from "vitest";
import { apiFetch } from "./api";

function mockFetch(status: number, body: unknown) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  });
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("apiFetch", () => {
  it("returns parsed JSON on success", async () => {
    vi.stubGlobal("fetch", mockFetch(200, { id: 1 }));
    const result = await apiFetch("/api/test");
    expect(result).toEqual({ id: 1 });
  });

  it("always sends credentials: include", async () => {
    const spy = mockFetch(200, {});
    vi.stubGlobal("fetch", spy);
    await apiFetch("/api/test");
    expect(spy).toHaveBeenCalledWith("/api/test", expect.objectContaining({ credentials: "include" }));
  });

  it("forwards extra RequestInit options", async () => {
    const spy = mockFetch(200, {});
    vi.stubGlobal("fetch", spy);
    await apiFetch("/api/test", { method: "POST" });
    expect(spy).toHaveBeenCalledWith("/api/test", expect.objectContaining({ method: "POST" }));
  });

  it("throws with body.error message on failure", async () => {
    vi.stubGlobal("fetch", mockFetch(403, { error: "Forbidden" }));
    await expect(apiFetch("/api/test")).rejects.toThrow("Forbidden");
  });

  it("falls back to status message when body has no error field", async () => {
    vi.stubGlobal("fetch", mockFetch(404, {}));
    await expect(apiFetch("/api/test")).rejects.toThrow("Request failed: 404");
  });

  it("falls back to status message when body is not JSON", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.reject(new SyntaxError("invalid json")),
    }));
    await expect(apiFetch("/api/test")).rejects.toThrow("Request failed: 500");
  });
});
