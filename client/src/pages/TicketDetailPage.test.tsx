import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
  mockApiFetch.mockImplementation((url: string) =>
    url === "/api/users/agents" ? Promise.resolve([]) : Promise.resolve(data)
  );
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

const AGENTS = [
  { id: "agent-1", name: "Bob Agent", email: "bob@helpdesk.com" },
  { id: "agent-2", name: "Carol Agent", email: "carol@helpdesk.com" },
];

describe("assign feature", () => {
  it("shows Unassigned in the trigger when ticket has no assignee", async () => {
    mockApiFetch.mockImplementation((url: string) => {
      if (url === "/api/users/agents") return Promise.resolve(AGENTS);
      return Promise.resolve(TICKET);
    });
    renderAt("/tickets/1");
    await waitFor(() => screen.getByTestId("ticket-detail"));
    expect(screen.getByTestId("assign-select")).toHaveTextContent("Unassigned");
  });

  it("populates the dropdown with all agent options", async () => {
    const user = userEvent.setup();
    mockApiFetch.mockImplementation((url: string) => {
      if (url === "/api/users/agents") return Promise.resolve(AGENTS);
      return Promise.resolve(TICKET);
    });
    renderAt("/tickets/1");
    await waitFor(() => screen.getByTestId("ticket-detail"));
    await user.click(screen.getByTestId("assign-select"));
    expect(screen.getByRole("option", { name: "Unassigned" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Bob Agent" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Carol Agent" })).toBeInTheDocument();
  });

  it("calls PATCH with agent id when an agent is selected", async () => {
    const user = userEvent.setup();
    mockApiFetch.mockImplementation((url: string, opts?: RequestInit) => {
      if (url === "/api/users/agents") return Promise.resolve(AGENTS);
      if (opts?.method === "PATCH") return Promise.resolve({ ...TICKET, assignedToId: "agent-1" });
      return Promise.resolve(TICKET);
    });
    renderAt("/tickets/1");
    await waitFor(() => screen.getByTestId("ticket-detail"));
    await user.click(screen.getByTestId("assign-select"));
    await user.click(screen.getByRole("option", { name: "Bob Agent" }));
    await waitFor(() =>
      expect(mockApiFetch).toHaveBeenCalledWith(
        "/api/tickets/1",
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({ assignedToId: "agent-1" }),
        })
      )
    );
  });

  it("calls PATCH with null when Unassigned is selected", async () => {
    const user = userEvent.setup();
    mockApiFetch.mockImplementation((url: string, opts?: RequestInit) => {
      if (url === "/api/users/agents") return Promise.resolve(AGENTS);
      if (opts?.method === "PATCH") return Promise.resolve(TICKET);
      return Promise.resolve({ ...TICKET, assignedToId: "agent-1" });
    });
    renderAt("/tickets/1");
    await waitFor(() => screen.getByTestId("ticket-detail"));
    await user.click(screen.getByTestId("assign-select"));
    await user.click(screen.getByRole("option", { name: "Unassigned" }));
    await waitFor(() =>
      expect(mockApiFetch).toHaveBeenCalledWith(
        "/api/tickets/1",
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({ assignedToId: null }),
        })
      )
    );
  });

  it("disables the Select trigger while the mutation is in flight", async () => {
    const user = userEvent.setup();
    let resolvePatch!: (val: unknown) => void;
    const patchPromise = new Promise((res) => { resolvePatch = res; });
    mockApiFetch.mockImplementation((url: string, opts?: RequestInit) => {
      if (url === "/api/users/agents") return Promise.resolve(AGENTS);
      if (opts?.method === "PATCH") return patchPromise;
      return Promise.resolve(TICKET);
    });
    renderAt("/tickets/1");
    await waitFor(() => screen.getByTestId("ticket-detail"));
    await user.click(screen.getByTestId("assign-select"));
    await user.click(screen.getByRole("option", { name: "Bob Agent" }));
    await waitFor(() => expect(screen.getByTestId("assign-select")).toBeDisabled());
    resolvePatch({ ...TICKET, assignedToId: "agent-1" });
    await waitFor(() => expect(screen.getByTestId("assign-select")).not.toBeDisabled());
  });
});

describe("status update", () => {
  it("calls PATCH with the new status when a status option is selected", async () => {
    const user = userEvent.setup();
    mockApiFetch.mockImplementation((url: string, opts?: RequestInit) => {
      if (url === "/api/users/agents") return Promise.resolve([]);
      if (opts?.method === "PATCH") return Promise.resolve({ ...TICKET, status: "resolved" as const });
      return Promise.resolve(TICKET);
    });
    renderAt("/tickets/1");
    await waitFor(() => screen.getByTestId("ticket-detail"));
    await user.click(screen.getByTestId("status-select"));
    await user.click(screen.getByRole("option", { name: "resolved" }));
    await waitFor(() =>
      expect(mockApiFetch).toHaveBeenCalledWith(
        "/api/tickets/1",
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({ status: "resolved" }),
        })
      )
    );
  });
});

describe("category update", () => {
  it("calls PATCH with the new category when a category option is selected", async () => {
    const user = userEvent.setup();
    mockApiFetch.mockImplementation((url: string, opts?: RequestInit) => {
      if (url === "/api/users/agents") return Promise.resolve([]);
      if (opts?.method === "PATCH") return Promise.resolve({ ...TICKET, category: "general_question" as const });
      return Promise.resolve(TICKET);
    });
    renderAt("/tickets/1");
    await waitFor(() => screen.getByTestId("ticket-detail"));
    await user.click(screen.getByTestId("category-select"));
    await user.click(screen.getByRole("option", { name: "General" }));
    await waitFor(() =>
      expect(mockApiFetch).toHaveBeenCalledWith(
        "/api/tickets/1",
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({ category: "general_question" }),
        })
      )
    );
  });

  it("calls PATCH with null when None is selected", async () => {
    const user = userEvent.setup();
    mockApiFetch.mockImplementation((url: string, opts?: RequestInit) => {
      if (url === "/api/users/agents") return Promise.resolve([]);
      if (opts?.method === "PATCH") return Promise.resolve({ ...TICKET, category: null });
      return Promise.resolve({ ...TICKET, category: "general_question" as const });
    });
    renderAt("/tickets/1");
    await waitFor(() => screen.getByTestId("ticket-detail"));
    await user.click(screen.getByTestId("category-select"));
    await user.click(screen.getByRole("option", { name: "None" }));
    await waitFor(() =>
      expect(mockApiFetch).toHaveBeenCalledWith(
        "/api/tickets/1",
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({ category: null }),
        })
      )
    );
  });
});
