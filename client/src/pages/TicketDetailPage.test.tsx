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
    mockApiFetch.mockResolvedValue(TICKET);
    renderAt("/tickets/1");
    await waitFor(() => screen.getByTestId("ticket-detail"));
    expect(screen.getByRole("heading", { name: "App crashes on login" })).toBeInTheDocument();
  });

  it("renders sender name and email", async () => {
    mockApiFetch.mockResolvedValue(TICKET);
    renderAt("/tickets/1");
    await waitFor(() => screen.getByTestId("ticket-detail"));
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("alice@example.com")).toBeInTheDocument();
  });

  it("renders status badge", async () => {
    mockApiFetch.mockResolvedValue(TICKET);
    renderAt("/tickets/1");
    await waitFor(() => screen.getByTestId("ticket-detail"));
    expect(screen.getByText("open")).toBeInTheDocument();
  });

  it("renders category label", async () => {
    mockApiFetch.mockResolvedValue(TICKET);
    renderAt("/tickets/1");
    await waitFor(() => screen.getByTestId("ticket-detail"));
    expect(screen.getByText("Technical")).toBeInTheDocument();
  });

  it("renders ticket body", async () => {
    mockApiFetch.mockResolvedValue(TICKET);
    renderAt("/tickets/1");
    await waitFor(() => screen.getByTestId("ticket-detail"));
    expect(screen.getByText("Getting a 500 error every time I try to log in.")).toBeInTheDocument();
  });

  it("shows Unassigned when assignedTo is null", async () => {
    mockApiFetch.mockResolvedValue(TICKET);
    renderAt("/tickets/1");
    await waitFor(() => screen.getByTestId("ticket-detail"));
    expect(screen.getByText("Unassigned")).toBeInTheDocument();
  });

  it("shows assigned agent name and email when present", async () => {
    mockApiFetch.mockResolvedValue({
      ...TICKET,
      assignedToId: "agent-1",
      assignedTo: { id: "agent-1", name: "Bob Agent", email: "bob@helpdesk.com" },
    });
    renderAt("/tickets/1");
    await waitFor(() => screen.getByTestId("ticket-detail"));
    expect(screen.getByText("Bob Agent")).toBeInTheDocument();
    expect(screen.getByText("bob@helpdesk.com")).toBeInTheDocument();
  });

  it("shows error message when the request fails", async () => {
    mockApiFetch.mockRejectedValue(new Error("Ticket not found"));
    renderAt("/tickets/1");
    await waitFor(() => expect(screen.getByText("Ticket not found")).toBeInTheDocument());
    expect(screen.queryByTestId("ticket-detail")).not.toBeInTheDocument();
  });

  it("shows error immediately for a non-numeric id", () => {
    renderAt("/tickets/abc");
    expect(screen.getByText("Invalid ticket ID")).toBeInTheDocument();
    expect(mockApiFetch).not.toHaveBeenCalled();
  });

  it("fetches /api/tickets/:id", async () => {
    mockApiFetch.mockResolvedValue(TICKET);
    renderAt("/tickets/1");
    await waitFor(() => screen.getByTestId("ticket-detail"));
    expect(mockApiFetch).toHaveBeenCalledWith("/api/tickets/1");
  });
});
