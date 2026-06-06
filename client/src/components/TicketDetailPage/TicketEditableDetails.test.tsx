import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TicketEditableDetails } from "./TicketEditableDetails";
import type { Ticket } from "@/types/tickets";

vi.mock("@/lib/api");
import { apiFetch } from "@/lib/api";

const mockApiFetch = apiFetch as ReturnType<typeof vi.fn>;

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

type Agent = { id: string; name: string; email: string };

const AGENTS: Agent[] = [
  { id: "agent-1", name: "Bob Agent", email: "bob@helpdesk.com" },
  { id: "agent-2", name: "Carol Agent", email: "carol@helpdesk.com" },
];

function renderComponent(ticket: Ticket = TICKET, agents: Agent[] = AGENTS) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <TicketEditableDetails ticketId={1} ticket={ticket} agents={agents} />
    </QueryClientProvider>
  );
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe("assign feature", () => {
  it("shows Unassigned in the trigger when ticket has no assignee", () => {
    renderComponent();
    expect(screen.getByTestId("assign-select")).toHaveTextContent("Unassigned");
  });

  it("populates the dropdown with all agent options", async () => {
    const user = userEvent.setup();
    renderComponent();
    await user.click(screen.getByTestId("assign-select"));
    expect(screen.getByRole("option", { name: "Unassigned" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Bob Agent" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Carol Agent" })).toBeInTheDocument();
  });

  it("calls PATCH with agent id when an agent is selected", async () => {
    const user = userEvent.setup();
    mockApiFetch.mockResolvedValue({ ...TICKET, assignedToId: "agent-1" });
    renderComponent();
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
    mockApiFetch.mockResolvedValue(TICKET);
    renderComponent({ ...TICKET, assignedToId: "agent-1" });
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
    mockApiFetch.mockReturnValue(patchPromise);
    renderComponent();
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
    mockApiFetch.mockResolvedValue({ ...TICKET, status: "resolved" as const });
    renderComponent();
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
    mockApiFetch.mockResolvedValue({ ...TICKET, category: "general_question" as const });
    renderComponent();
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
    mockApiFetch.mockResolvedValue({ ...TICKET, category: null });
    renderComponent({ ...TICKET, category: "general_question" as const });
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
