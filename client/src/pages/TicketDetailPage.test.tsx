import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router";
import { TicketDetailPage } from "./TicketDetailPage";

vi.mock("@/lib/api");
import { apiFetch } from "@/lib/api";

const mockApiFetch = apiFetch as ReturnType<typeof vi.fn>;

function renderAt(path: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <MemoryRouter initialEntries={[path]}>
      <QueryClientProvider client={queryClient}>
        <Routes>
          <Route path="/tickets/:id" element={<TicketDetailPage />} />
        </Routes>
      </QueryClientProvider>
    </MemoryRouter>
  );
}

const TICKET = {
  id: 1,
  subject: "App crashes on login",
  body: "Getting a 500 error every time I try to log in.",
  fromEmail: "alice@example.com",
  fromName: "Alice",
  status: "open" as const,
  category: "technical_question" as const,
  assignedToId: null,
  assignedTo: null,
  createdAt: "2024-06-01T10:00:00Z",
  updatedAt: "2024-06-01T10:00:00Z",
};

function mockTicket(data: typeof TICKET = TICKET) {
  mockApiFetch.mockImplementation((url: string) => {
    if (url === "/api/users/agents") return Promise.resolve([]);
    if (url.endsWith("/replies")) return Promise.resolve([]);
    return Promise.resolve(data);
  });
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe("TicketDetailPage", () => {
  it("shows skeleton while loading", () => {
    mockApiFetch.mockReturnValue(new Promise(() => {}));
    renderAt("/tickets/1");
    expect(screen.getByTestId("ticket-detail-loading")).toBeInTheDocument();
    expect(screen.queryByTestId("ticket-detail")).not.toBeInTheDocument();
  });

  it("renders ticket subject as heading", async () => {
    mockTicket();
    renderAt("/tickets/1");
    await waitFor(() => screen.getByTestId("ticket-detail"));
    expect(screen.getByRole("heading", { name: "App crashes on login" })).toBeInTheDocument();
  });

  it("renders sender name and email", async () => {
    mockTicket();
    renderAt("/tickets/1");
    await waitFor(() => screen.getByTestId("ticket-detail"));
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("alice@example.com")).toBeInTheDocument();
  });

  it("renders status badge", async () => {
    mockTicket();
    renderAt("/tickets/1");
    await waitFor(() => screen.getByTestId("ticket-detail"));
    expect(screen.getByText("open")).toBeInTheDocument();
  });

  it("renders category label", async () => {
    mockTicket();
    renderAt("/tickets/1");
    await waitFor(() => screen.getByTestId("ticket-detail"));
    expect(screen.getByText("Technical")).toBeInTheDocument();
  });

  it("renders ticket body", async () => {
    mockTicket();
    renderAt("/tickets/1");
    await waitFor(() => screen.getByTestId("ticket-detail"));
    expect(screen.getByText("Getting a 500 error every time I try to log in.")).toBeInTheDocument();
  });

  it("shows Unassigned when assignedTo is null", async () => {
    mockTicket();
    renderAt("/tickets/1");
    await waitFor(() => screen.getByTestId("ticket-detail"));
    expect(screen.getByText("Unassigned")).toBeInTheDocument();
  });

  it("shows error message when the request fails", async () => {
    mockApiFetch.mockRejectedValue(new Error("Ticket not found"));
    renderAt("/tickets/1");
    await waitFor(() => expect(screen.getByText("Ticket not found")).toBeInTheDocument());
    expect(screen.queryByTestId("ticket-detail")).not.toBeInTheDocument();
  });

  it("shows error immediately for a non-numeric id", () => {
    mockApiFetch.mockResolvedValue([]);
    renderAt("/tickets/abc");
    expect(screen.getByText("Invalid ticket ID")).toBeInTheDocument();
    expect(mockApiFetch).not.toHaveBeenCalledWith(expect.stringContaining("/api/tickets/abc"));
  });

  it("fetches /api/tickets/:id", async () => {
    mockTicket();
    renderAt("/tickets/1");
    await waitFor(() => screen.getByTestId("ticket-detail"));
    expect(mockApiFetch).toHaveBeenCalledWith("/api/tickets/1");
  });
});
