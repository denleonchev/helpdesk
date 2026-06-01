import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { UsersPage } from "./UsersPage";

vi.mock("@/lib/api");
import { apiFetch } from "@/lib/api";

const mockApiFetch = apiFetch as ReturnType<typeof vi.fn>;

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <UsersPage />
    </QueryClientProvider>
  );
}

const USERS = [
  { id: "1", name: "Alice Admin", email: "alice@example.com", role: "admin" as const, createdAt: "2024-01-15T00:00:00Z" },
  { id: "2", name: "Bob Agent", email: "bob@example.com", role: "agent" as const, createdAt: "2024-03-20T00:00:00Z" },
];

const NEW_USER = { id: "3", name: "Carol Agent", email: "carol@example.com", role: "agent" as const, createdAt: "2024-06-01T00:00:00Z" };

beforeEach(() => {
  vi.resetAllMocks();
});

describe("UsersPage", () => {
  it("renders the page heading", () => {
    mockApiFetch.mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.getByRole("heading", { name: "Users" })).toBeInTheDocument();
  });

  it("shows skeleton table while loading", () => {
    mockApiFetch.mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.getByTestId("users-loading")).toBeInTheDocument();
    expect(screen.queryByTestId("users-table")).not.toBeInTheDocument();
  });

  it("replaces skeleton with data table after loading", async () => {
    mockApiFetch.mockResolvedValue(USERS);
    renderPage();
    await waitFor(() => expect(screen.getByTestId("users-table")).toBeInTheDocument());
    expect(screen.queryByTestId("users-loading")).not.toBeInTheDocument();
  });

  it("renders user names and emails", async () => {
    mockApiFetch.mockResolvedValue(USERS);
    renderPage();
    await waitFor(() => screen.getByTestId("users-table"));
    expect(screen.getByText("Alice Admin")).toBeInTheDocument();
    expect(screen.getByText("bob@example.com")).toBeInTheDocument();
  });

  it("shows correct role badge for admin", async () => {
    mockApiFetch.mockResolvedValue(USERS);
    renderPage();
    await waitFor(() => screen.getByTestId("users-table"));
    expect(screen.getAllByText("admin")).toHaveLength(1);
  });

  it("shows correct role badge for agent", async () => {
    mockApiFetch.mockResolvedValue(USERS);
    renderPage();
    await waitFor(() => screen.getByTestId("users-table"));
    expect(screen.getByText("agent")).toBeInTheDocument();
  });

  it("formats the joined date", async () => {
    mockApiFetch.mockResolvedValue(USERS);
    renderPage();
    await waitFor(() => screen.getByTestId("users-table"));
    expect(screen.getByText(new Date("2024-01-15T00:00:00Z").toLocaleDateString())).toBeInTheDocument();
  });

  it("renders empty table body when there are no users", async () => {
    mockApiFetch.mockResolvedValue([]);
    renderPage();
    await waitFor(() => expect(screen.getByTestId("users-table")).toBeInTheDocument());
    expect(screen.queryAllByRole("row")).toHaveLength(1); // header row only
  });

  it("shows error message when the request fails", async () => {
    mockApiFetch.mockRejectedValue(new Error("Forbidden"));
    renderPage();
    await waitFor(() => expect(screen.getByText("Forbidden")).toBeInTheDocument());
    expect(screen.queryByTestId("users-table")).not.toBeInTheDocument();
    expect(screen.queryByTestId("users-loading")).not.toBeInTheDocument();
  });
});

describe("Create user", () => {
  it("renders the create user button", async () => {
    mockApiFetch.mockResolvedValue(USERS);
    renderPage();
    expect(screen.getByRole("button", { name: "Create user" })).toBeInTheDocument();
  });

  it("opens the dialog when the button is clicked", async () => {
    const user = userEvent.setup();
    mockApiFetch.mockResolvedValue(USERS);
    renderPage();
    await user.click(screen.getByRole("button", { name: "Create user" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
  });

  it("closes the dialog when Cancel is clicked", async () => {
    const user = userEvent.setup();
    mockApiFetch.mockResolvedValue(USERS);
    renderPage();
    await user.click(screen.getByRole("button", { name: "Create user" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows validation error when name is too short", async () => {
    const user = userEvent.setup();
    mockApiFetch.mockResolvedValue(USERS);
    renderPage();
    await user.click(screen.getByRole("button", { name: "Create user" }));
    const dialog = screen.getByRole("dialog");
    await user.type(within(dialog).getByLabelText("Name"), "ab");
    await user.click(within(dialog).getByRole("button", { name: "Create user" }));
    await waitFor(() =>
      expect(within(dialog).getByText("Name must be at least 3 characters")).toBeInTheDocument()
    );
  });

  it("shows validation error for invalid email", async () => {
    const user = userEvent.setup();
    mockApiFetch.mockResolvedValue(USERS);
    renderPage();
    await user.click(screen.getByRole("button", { name: "Create user" }));
    const dialog = screen.getByRole("dialog");
    await user.type(within(dialog).getByLabelText("Name"), "Carol Agent");
    await user.type(within(dialog).getByLabelText("Email"), "not-an-email");
    await user.type(within(dialog).getByLabelText("Password"), "securepassword");
    await user.click(within(dialog).getByRole("button", { name: "Create user" }));
    await waitFor(() =>
      expect(within(dialog).getByText("Invalid email")).toBeInTheDocument()
    );
  });

  it("shows validation error when password is too short", async () => {
    const user = userEvent.setup();
    mockApiFetch.mockResolvedValue(USERS);
    renderPage();
    await user.click(screen.getByRole("button", { name: "Create user" }));
    const dialog = screen.getByRole("dialog");
    await user.type(within(dialog).getByLabelText("Name"), "Carol Agent");
    await user.type(within(dialog).getByLabelText("Email"), "carol@example.com");
    await user.type(within(dialog).getByLabelText("Password"), "short");
    await user.click(within(dialog).getByRole("button", { name: "Create user" }));
    await waitFor(() =>
      expect(within(dialog).getByText("Password must be at least 8 characters")).toBeInTheDocument()
    );
  });

  it("submits the form and closes dialog on success", async () => {
    const user = userEvent.setup();
    mockApiFetch.mockResolvedValueOnce(USERS).mockResolvedValueOnce(NEW_USER).mockResolvedValue(USERS);
    renderPage();
    await user.click(screen.getByRole("button", { name: "Create user" }));
    const dialog = screen.getByRole("dialog");
    await user.type(within(dialog).getByLabelText("Name"), "Carol Agent");
    await user.type(within(dialog).getByLabelText("Email"), "carol@example.com");
    await user.type(within(dialog).getByLabelText("Password"), "securepassword");
    await user.click(within(dialog).getByRole("button", { name: "Create user" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("calls the API with correct payload on submit", async () => {
    const user = userEvent.setup();
    mockApiFetch.mockResolvedValueOnce(USERS).mockResolvedValueOnce(NEW_USER).mockResolvedValue(USERS);
    renderPage();
    await user.click(screen.getByRole("button", { name: "Create user" }));
    const dialog = screen.getByRole("dialog");
    await user.type(within(dialog).getByLabelText("Name"), "Carol Agent");
    await user.type(within(dialog).getByLabelText("Email"), "carol@example.com");
    await user.type(within(dialog).getByLabelText("Password"), "securepassword");
    await user.click(within(dialog).getByRole("button", { name: "Create user" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(mockApiFetch).toHaveBeenCalledWith("/api/users", expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ name: "Carol Agent", email: "carol@example.com", password: "securepassword" }),
    }));
  });

  it("shows server error inline when API returns an error", async () => {
    const user = userEvent.setup();
    mockApiFetch.mockResolvedValueOnce(USERS).mockRejectedValueOnce(new Error("A user with this email already exists"));
    renderPage();
    await user.click(screen.getByRole("button", { name: "Create user" }));
    const dialog = screen.getByRole("dialog");
    await user.type(within(dialog).getByLabelText("Name"), "Carol Agent");
    await user.type(within(dialog).getByLabelText("Email"), "carol@example.com");
    await user.type(within(dialog).getByLabelText("Password"), "securepassword");
    await user.click(within(dialog).getByRole("button", { name: "Create user" }));
    await waitFor(() =>
      expect(within(dialog).getByText("A user with this email already exists")).toBeInTheDocument()
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("resets the form when the dialog is reopened", async () => {
    const user = userEvent.setup();
    mockApiFetch.mockResolvedValue(USERS);
    renderPage();
    await user.click(screen.getByRole("button", { name: "Create user" }));
    await user.type(screen.getByLabelText("Name"), "Carol Agent");
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    await user.click(screen.getByRole("button", { name: "Create user" }));
    expect(screen.getByLabelText("Name")).toHaveValue("");
  });
});
