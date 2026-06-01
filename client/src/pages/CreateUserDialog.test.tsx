import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CreateUserDialog } from "./CreateUserDialog";

vi.mock("@/lib/api");
import { apiFetch } from "@/lib/api";

const mockApiFetch = apiFetch as ReturnType<typeof vi.fn>;

function renderDialog(onOpenChange = vi.fn()) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return { onOpenChange, ...render(
    <QueryClientProvider client={queryClient}>
      <CreateUserDialog open={true} onOpenChange={onOpenChange} />
    </QueryClientProvider>
  )};
}

const NEW_USER = { id: "3", name: "Carol Agent", email: "carol@example.com", role: "agent" as const, createdAt: "2024-06-01T00:00:00Z" };

beforeEach(() => {
  vi.resetAllMocks();
});

describe("CreateUserDialog", () => {
  it("renders Name, Email and Password fields", () => {
    renderDialog();
    expect(screen.getByLabelText("Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
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
    await user.type(screen.getByLabelText("Name"), "ab");
    await user.click(screen.getByRole("button", { name: "Create user" }));
    await waitFor(() =>
      expect(screen.getByText("Name must be at least 3 characters")).toBeInTheDocument()
    );
  });

  it("shows validation error for invalid email", async () => {
    const user = userEvent.setup();
    renderDialog();
    await user.type(screen.getByLabelText("Name"), "Carol Agent");
    await user.type(screen.getByLabelText("Email"), "not-an-email");
    await user.type(screen.getByLabelText("Password"), "securepassword");
    await user.click(screen.getByRole("button", { name: "Create user" }));
    await waitFor(() =>
      expect(screen.getByText("Invalid email")).toBeInTheDocument()
    );
  });

  it("shows validation error when password is too short", async () => {
    const user = userEvent.setup();
    renderDialog();
    await user.type(screen.getByLabelText("Name"), "Carol Agent");
    await user.type(screen.getByLabelText("Email"), "carol@example.com");
    await user.type(screen.getByLabelText("Password"), "short");
    await user.click(screen.getByRole("button", { name: "Create user" }));
    await waitFor(() =>
      expect(screen.getByText("Password must be at least 8 characters")).toBeInTheDocument()
    );
  });

  it("calls the API with correct payload on submit", async () => {
    const user = userEvent.setup();
    mockApiFetch.mockResolvedValueOnce(NEW_USER);
    renderDialog();
    await user.type(screen.getByLabelText("Name"), "Carol Agent");
    await user.type(screen.getByLabelText("Email"), "carol@example.com");
    await user.type(screen.getByLabelText("Password"), "securepassword");
    await user.click(screen.getByRole("button", { name: "Create user" }));
    await waitFor(() => expect(mockApiFetch).toHaveBeenCalledWith("/api/users", expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ name: "Carol Agent", email: "carol@example.com", password: "securepassword" }),
    })));
  });

  it("calls onOpenChange(false) on successful submit", async () => {
    const user = userEvent.setup();
    mockApiFetch.mockResolvedValueOnce(NEW_USER);
    const { onOpenChange } = renderDialog();
    await user.type(screen.getByLabelText("Name"), "Carol Agent");
    await user.type(screen.getByLabelText("Email"), "carol@example.com");
    await user.type(screen.getByLabelText("Password"), "securepassword");
    await user.click(screen.getByRole("button", { name: "Create user" }));
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });

  it("shows server error inline and does not close on failure", async () => {
    const user = userEvent.setup();
    mockApiFetch.mockRejectedValueOnce(new Error("A user with this email already exists"));
    const { onOpenChange } = renderDialog();
    await user.type(screen.getByLabelText("Name"), "Carol Agent");
    await user.type(screen.getByLabelText("Email"), "carol@example.com");
    await user.type(screen.getByLabelText("Password"), "securepassword");
    await user.click(screen.getByRole("button", { name: "Create user" }));
    await waitFor(() =>
      expect(screen.getByText("A user with this email already exists")).toBeInTheDocument()
    );
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });
});
