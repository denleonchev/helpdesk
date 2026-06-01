import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { EditUserDialog } from "./EditUserDialog";
import type { User } from "@/types/users";

vi.mock("@/lib/api");
import { apiFetch } from "@/lib/api";

const mockApiFetch = apiFetch as ReturnType<typeof vi.fn>;

const ALICE: User = { id: "1", name: "Alice Admin", email: "alice@example.com", role: "admin", createdAt: "2024-01-15T00:00:00Z" };

function renderDialog(user: User = ALICE, onOpenChange = vi.fn()) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return { onOpenChange, ...render(
    <QueryClientProvider client={queryClient}>
      <EditUserDialog user={user} open={true} onOpenChange={onOpenChange} />
    </QueryClientProvider>
  )};
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe("EditUserDialog", () => {
  it("renders Name, Email, Old password and New password fields", () => {
    renderDialog();
    expect(screen.getByLabelText("Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Old password")).toBeInTheDocument();
    expect(screen.getByLabelText("New password")).toBeInTheDocument();
  });

  it("pre-populates name and email from the user prop", () => {
    renderDialog();
    expect(screen.getByLabelText("Name")).toHaveValue("Alice Admin");
    expect(screen.getByLabelText("Email")).toHaveValue("alice@example.com");
  });

  it("pre-populates the correct data when a different user is passed", () => {
    const bob: User = { id: "2", name: "Bob Agent", email: "bob@example.com", role: "agent", createdAt: "2024-03-20T00:00:00Z" };
    renderDialog(bob);
    expect(screen.getByLabelText("Name")).toHaveValue("Bob Agent");
    expect(screen.getByLabelText("Email")).toHaveValue("bob@example.com");
  });

  it("calls onOpenChange(false) when Cancel is clicked", async () => {
    const user = userEvent.setup();
    const { onOpenChange } = renderDialog();
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("shows validation error when name is too short", async () => {
    const user = userEvent.setup();
    renderDialog();
    await user.clear(screen.getByLabelText("Name"));
    await user.type(screen.getByLabelText("Name"), "ab");
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() =>
      expect(screen.getByText("Name must be at least 3 characters")).toBeInTheDocument()
    );
  });

  it("shows validation error for invalid email", async () => {
    const user = userEvent.setup();
    renderDialog();
    await user.clear(screen.getByLabelText("Email"));
    await user.type(screen.getByLabelText("Email"), "not-an-email");
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() =>
      expect(screen.getByText("Invalid email")).toBeInTheDocument()
    );
  });

  it("shows validation error when old password is filled but new password is empty", async () => {
    const user = userEvent.setup();
    renderDialog();
    await user.type(screen.getByLabelText("Old password"), "oldpassword");
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() =>
      expect(screen.getByText("New password is required")).toBeInTheDocument()
    );
  });

  it("shows validation error when new password is filled but old password is empty", async () => {
    const user = userEvent.setup();
    renderDialog();
    await user.type(screen.getByLabelText("New password"), "newpassword");
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() =>
      expect(screen.getByText("Old password is required")).toBeInTheDocument()
    );
  });

  it("shows validation error when new password is too short", async () => {
    const user = userEvent.setup();
    renderDialog();
    await user.type(screen.getByLabelText("Old password"), "oldpassword");
    await user.type(screen.getByLabelText("New password"), "short");
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() =>
      expect(screen.getByText("New password must be at least 8 characters")).toBeInTheDocument()
    );
  });

  it("calls the API with correct payload on submit without password change", async () => {
    const user = userEvent.setup();
    mockApiFetch.mockResolvedValueOnce({ ...ALICE, name: "Alice Updated" });
    renderDialog();
    await user.clear(screen.getByLabelText("Name"));
    await user.type(screen.getByLabelText("Name"), "Alice Updated");
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(mockApiFetch).toHaveBeenCalledWith(`/api/users/${ALICE.id}`, expect.objectContaining({
      method: "PATCH",
      body: JSON.stringify({ name: "Alice Updated", email: "alice@example.com", oldPassword: "", newPassword: "" }),
    })));
  });

  it("calls the API with passwords when a password change is requested", async () => {
    const user = userEvent.setup();
    mockApiFetch.mockResolvedValueOnce(ALICE);
    renderDialog();
    await user.type(screen.getByLabelText("Old password"), "oldpassword");
    await user.type(screen.getByLabelText("New password"), "newpassword123");
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(mockApiFetch).toHaveBeenCalledWith(`/api/users/${ALICE.id}`, expect.objectContaining({
      method: "PATCH",
      body: JSON.stringify({ name: "Alice Admin", email: "alice@example.com", oldPassword: "oldpassword", newPassword: "newpassword123" }),
    })));
  });

  it("calls onOpenChange(false) on successful submit", async () => {
    const user = userEvent.setup();
    mockApiFetch.mockResolvedValueOnce(ALICE);
    const { onOpenChange } = renderDialog();
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });

  it("shows server error inline and does not close on failure", async () => {
    const user = userEvent.setup();
    mockApiFetch.mockRejectedValueOnce(new Error("Old password is incorrect"));
    const { onOpenChange } = renderDialog();
    await user.type(screen.getByLabelText("Old password"), "wrongpassword");
    await user.type(screen.getByLabelText("New password"), "newpassword123");
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() =>
      expect(screen.getByText("Old password is incorrect")).toBeInTheDocument()
    );
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });
});
