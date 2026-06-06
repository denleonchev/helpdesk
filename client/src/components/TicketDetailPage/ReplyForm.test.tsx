import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReplyForm } from "./ReplyForm";

vi.mock("@/lib/api");
import { apiFetch } from "@/lib/api";

const mockApiFetch = apiFetch as ReturnType<typeof vi.fn>;

const REPLY = {
  id: 1,
  content: "Hello",
  senderType: "agent" as const,
  ticketId: 1,
  authorId: "agent-1",
  createdAt: "2024-06-01T11:00:00Z",
  updatedAt: "2024-06-01T11:00:00Z",
};

function renderComponent(onSuccess = vi.fn()) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return {
    onSuccess,
    ...render(
      <QueryClientProvider client={queryClient}>
        <ReplyForm ticketId={1} onSuccess={onSuccess} />
      </QueryClientProvider>
    ),
  };
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe("ReplyForm", () => {
  it("calls POST to /api/tickets/:id/replies on submit", async () => {
    const user = userEvent.setup();
    mockApiFetch.mockResolvedValue(REPLY);
    renderComponent();

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

  it("calls onSuccess after a successful submit", async () => {
    const user = userEvent.setup();
    mockApiFetch.mockResolvedValue(REPLY);
    const { onSuccess } = renderComponent();

    await user.type(screen.getByPlaceholderText("Write a reply..."), "Hello");
    await user.click(screen.getByRole("button", { name: "Send Reply" }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledOnce());
  });

  it("clears the textarea after a successful submit", async () => {
    const user = userEvent.setup();
    mockApiFetch.mockResolvedValue(REPLY);
    renderComponent();

    const textarea = screen.getByPlaceholderText("Write a reply...");
    await user.type(textarea, "Hello");
    await user.click(screen.getByRole("button", { name: "Send Reply" }));

    await waitFor(() => expect(textarea).toHaveValue(""));
  });

  it("disables the submit button while the mutation is in flight", async () => {
    const user = userEvent.setup();
    let resolvePost!: (val: unknown) => void;
    mockApiFetch.mockReturnValue(new Promise((res) => { resolvePost = res; }));
    renderComponent();

    await user.type(screen.getByPlaceholderText("Write a reply..."), "Hello");
    await user.click(screen.getByRole("button", { name: "Send Reply" }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Send Reply" })).toBeDisabled()
    );

    resolvePost(REPLY);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Send Reply" })).not.toBeDisabled()
    );
  });

  it("shows an error message when the POST fails", async () => {
    const user = userEvent.setup();
    mockApiFetch.mockRejectedValue(new Error("Server error"));
    renderComponent();

    await user.type(screen.getByPlaceholderText("Write a reply..."), "Hello");
    await user.click(screen.getByRole("button", { name: "Send Reply" }));

    await waitFor(() =>
      expect(screen.getByText("Server error")).toBeInTheDocument()
    );
  });
});
