import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
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

beforeEach(() => {
  vi.resetAllMocks();
});

describe("UsersPage", () => {
  it("renders the page heading", () => {
    mockApiFetch.mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.getByRole("heading", { name: "Users" })).toBeInTheDocument();
  });

  it("renders the Create user button", () => {
    mockApiFetch.mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.getByRole("button", { name: "Create user" })).toBeInTheDocument();
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
    expect(screen.queryAllByRole("row")).toHaveLength(1);
  });

  it("shows error message when the request fails", async () => {
    mockApiFetch.mockRejectedValue(new Error("Forbidden"));
    renderPage();
    await waitFor(() => expect(screen.getByText("Forbidden")).toBeInTheDocument());
    expect(screen.queryByTestId("users-table")).not.toBeInTheDocument();
    expect(screen.queryByTestId("users-loading")).not.toBeInTheDocument();
  });

  it("renders an Edit button for each user row", async () => {
    mockApiFetch.mockResolvedValue(USERS);
    renderPage();
    await waitFor(() => screen.getByTestId("users-table"));
    expect(screen.getAllByRole("button", { name: "Edit" })).toHaveLength(USERS.length);
  });

  it("opens the Create user dialog when the button is clicked", async () => {
    const user = userEvent.setup();
    mockApiFetch.mockResolvedValue(USERS);
    renderPage();
    await user.click(screen.getByRole("button", { name: "Create user" }));
    expect(screen.getByRole("dialog", { name: "Create user" })).toBeInTheDocument();
  });

  it("opens the Edit user dialog pre-populated when Edit is clicked", async () => {
    const user = userEvent.setup();
    mockApiFetch.mockResolvedValue(USERS);
    renderPage();
    await waitFor(() => screen.getByTestId("users-table"));
    await user.click(screen.getAllByRole("button", { name: "Edit" })[0]);
    expect(screen.getByRole("dialog", { name: "Edit user" })).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toHaveValue("Alice Admin");
  });
});
