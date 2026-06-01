import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DeleteUserDialog } from "./DeleteUserDialog";
import type { User } from "@/types/users";

vi.mock("@/lib/api");
import { apiFetch } from "@/lib/api";

const mockApiFetch = apiFetch as ReturnType<typeof vi.fn>;

const BOB: User = { id: "2", name: "Bob Agent", email: "bob@example.com", role: "agent", createdAt: "2024-03-20T00:00:00Z" };

function renderDialog(user: User = BOB, onOpenChange = vi.fn()) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return { onOpenChange, ...render(
    <QueryClientProvider client={queryClient}>
      <DeleteUserDialog user={user} open={true} onOpenChange={onOpenChange} />
    </QueryClientProvider>
  )};
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe("DeleteUserDialog", () => {
  it("renders the user's name in the description", () => {
    renderDialog();
    expect(screen.getByText(/Bob Agent/)).toBeInTheDocument();
  });

  it("calls onOpenChange(false) when Cancel is clicked", async () => {
    const user = userEvent.setup();
    const { onOpenChange } = renderDialog();
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("calls DELETE /api/users/:id on confirm", async () => {
    const user = userEvent.setup();
    mockApiFetch.mockResolvedValueOnce(undefined);
    renderDialog();
    await user.click(screen.getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(mockApiFetch).toHaveBeenCalledWith(
      `/api/users/${BOB.id}`,
      expect.objectContaining({ method: "DELETE" })
    ));
  });

  it("calls onOpenChange(false) on successful deletion", async () => {
    const user = userEvent.setup();
    mockApiFetch.mockResolvedValueOnce(undefined);
    const { onOpenChange } = renderDialog();
    await user.click(screen.getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });

  it("shows server error inline and does not close on failure", async () => {
    const user = userEvent.setup();
    mockApiFetch.mockRejectedValueOnce(new Error("User not found"));
    const { onOpenChange } = renderDialog();
    await user.click(screen.getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(screen.getByText("User not found")).toBeInTheDocument());
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });
});
