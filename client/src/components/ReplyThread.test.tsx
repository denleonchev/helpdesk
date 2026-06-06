import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReplyThread } from "./ReplyThread";
import type { Reply } from "@/types/tickets";

vi.mock("@/lib/api");
import { apiFetch } from "@/lib/api";

const mockApiFetch = apiFetch as ReturnType<typeof vi.fn>;

const AGENTS = [
  { id: "agent-1", name: "Alice Agent", email: "alice@helpdesk.com" },
];

const REPLY_AGENT = {
  id: 1,
  content: "We're looking into this.",
  senderType: "agent" as const,
  ticketId: 1,
  authorId: "agent-1",
  createdAt: "2024-06-01T11:00:00Z",
  updatedAt: "2024-06-01T11:00:00Z",
};

const REPLY_CUSTOMER = {
  id: 2,
  content: "Still happening.",
  senderType: "customer" as const,
  ticketId: 1,
  authorId: null,
  createdAt: "2024-06-01T12:00:00Z",
  updatedAt: "2024-06-01T12:00:00Z",
};

function renderComponent(replies: Reply[] = [REPLY_AGENT]) {
  mockApiFetch.mockResolvedValue(replies);
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ReplyThread ticketId={1} fromName="Bob Customer" agents={AGENTS} />
    </QueryClientProvider>
  );
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe("ReplyThread", () => {
  it("shows 'No replies yet' when the list is empty", async () => {
    renderComponent([]);
    await waitFor(() =>
      expect(screen.getByText("No replies yet.")).toBeInTheDocument()
    );
  });

  it("renders agent reply with the agent's name from the agents list", async () => {
    renderComponent([REPLY_AGENT]);
    await waitFor(() =>
      expect(screen.getByText("Alice Agent")).toBeInTheDocument()
    );
    expect(screen.getByText("We're looking into this.")).toBeInTheDocument();
  });

  it("falls back to 'Agent' when the authorId is not in the agents list", async () => {
    renderComponent([{ ...REPLY_AGENT, authorId: "unknown-id" }]);
    await waitFor(() =>
      expect(screen.getByText("Agent")).toBeInTheDocument()
    );
  });

  it("renders customer reply with fromName", async () => {
    renderComponent([REPLY_CUSTOMER]);
    await waitFor(() =>
      expect(screen.getByText("Bob Customer")).toBeInTheDocument()
    );
    expect(screen.getByText("Still happening.")).toBeInTheDocument();
  });

  it("renders both cards", async () => {
    renderComponent([]);
    await waitFor(() => screen.getByTestId("reply-thread"));
    expect(screen.getByTestId("reply-form")).toBeInTheDocument();
  });
});

describe("reply form", () => {
  it("calls POST to /api/tickets/:id/replies on submit", async () => {
    const user = userEvent.setup();
    mockApiFetch.mockImplementation((url: string, opts?: RequestInit) => {
      if (opts?.method === "POST")
        return Promise.resolve({ ...REPLY_AGENT, content: "New reply" });
      return Promise.resolve([]);
    });
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    render(
      <QueryClientProvider client={queryClient}>
        <ReplyThread ticketId={1} fromName="Bob Customer" agents={AGENTS} />
      </QueryClientProvider>
    );
    await waitFor(() => screen.getByTestId("reply-form"));

    await user.type(screen.getByPlaceholderText("Write a reply..."), "New reply");
    await user.click(screen.getByRole("button", { name: "Send Reply" }));

    await waitFor(() =>
      expect(mockApiFetch).toHaveBeenCalledWith(
        "/api/tickets/1/replies",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ content: "New reply", senderType: "agent" }),
        })
      )
    );
  });

  it("clears the textarea after a successful submit", async () => {
    const user = userEvent.setup();
    mockApiFetch.mockImplementation((url: string, opts?: RequestInit) => {
      if (opts?.method === "POST") return Promise.resolve(REPLY_AGENT);
      return Promise.resolve([]);
    });
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    render(
      <QueryClientProvider client={queryClient}>
        <ReplyThread ticketId={1} fromName="Bob Customer" agents={AGENTS} />
      </QueryClientProvider>
    );
    await waitFor(() => screen.getByTestId("reply-form"));

    const textarea = screen.getByPlaceholderText("Write a reply...");
    await user.type(textarea, "Hello");
    await user.click(screen.getByRole("button", { name: "Send Reply" }));

    await waitFor(() => expect(textarea).toHaveValue(""));
  });

  it("disables the submit button while the mutation is in flight", async () => {
    const user = userEvent.setup();
    let resolvePost!: (val: unknown) => void;
    const postPromise = new Promise((res) => { resolvePost = res; });
    mockApiFetch.mockImplementation((url: string, opts?: RequestInit) => {
      if (opts?.method === "POST") return postPromise;
      return Promise.resolve([]);
    });
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    render(
      <QueryClientProvider client={queryClient}>
        <ReplyThread ticketId={1} fromName="Bob Customer" agents={AGENTS} />
      </QueryClientProvider>
    );
    await waitFor(() => screen.getByTestId("reply-form"));

    await user.type(screen.getByPlaceholderText("Write a reply..."), "Hello");
    await user.click(screen.getByRole("button", { name: "Send Reply" }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Send Reply" })).toBeDisabled()
    );

    resolvePost(REPLY_AGENT);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Send Reply" })).not.toBeDisabled()
    );
  });

  it("shows an error message when the POST fails", async () => {
    const user = userEvent.setup();
    mockApiFetch.mockImplementation((url: string, opts?: RequestInit) => {
      if (opts?.method === "POST") return Promise.reject(new Error("Server error"));
      return Promise.resolve([]);
    });
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    render(
      <QueryClientProvider client={queryClient}>
        <ReplyThread ticketId={1} fromName="Bob Customer" agents={AGENTS} />
      </QueryClientProvider>
    );
    await waitFor(() => screen.getByTestId("reply-form"));

    await user.type(screen.getByPlaceholderText("Write a reply..."), "Hello");
    await user.click(screen.getByRole("button", { name: "Send Reply" }));

    await waitFor(() =>
      expect(screen.getByText("Server error")).toBeInTheDocument()
    );
  });
});
