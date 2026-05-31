// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useRoles } from "./useRoles";

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    useSession: vi.fn(),
  },
}));

import { authClient } from "@/lib/auth-client";

const mockUseSession = authClient.useSession as ReturnType<typeof vi.fn>;

describe("useRoles", () => {
  it("returns isAdmin=true for admin session", () => {
    mockUseSession.mockReturnValue({ data: { user: { role: "admin" } } });
    const { result } = renderHook(() => useRoles());
    expect(result.current.isAdmin).toBe(true);
    expect(result.current.isAgent).toBe(false);
  });

  it("returns isAgent=true for agent session", () => {
    mockUseSession.mockReturnValue({ data: { user: { role: "agent" } } });
    const { result } = renderHook(() => useRoles());
    expect(result.current.isAdmin).toBe(false);
    expect(result.current.isAgent).toBe(true);
  });

  it("returns all false when there is no session", () => {
    mockUseSession.mockReturnValue({ data: null });
    const { result } = renderHook(() => useRoles());
    expect(result.current.isAdmin).toBe(false);
    expect(result.current.isAgent).toBe(false);
  });

  it("hasRole returns true for matching role", () => {
    mockUseSession.mockReturnValue({ data: { user: { role: "admin" } } });
    const { result } = renderHook(() => useRoles());
    expect(result.current.hasRole("admin")).toBe(true);
    expect(result.current.hasRole("agent")).toBe(false);
  });

  it("hasRole returns false when there is no session", () => {
    mockUseSession.mockReturnValue({ data: null });
    const { result } = renderHook(() => useRoles());
    expect(result.current.hasRole("admin")).toBe(false);
    expect(result.current.hasRole("agent")).toBe(false);
  });
});
