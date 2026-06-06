import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TicketSummary } from "./TicketSummary";

vi.mock("@/lib/api");
import { apiFetch } from "@/lib/api";

const mockApiFetch = apiFetch as ReturnType<typeof vi.fn>;

function renderComponent() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <TicketSummary ticketId={1} />
    </QueryClientProvider>
  );
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe("TicketSummary", () => {
  it("renders the Summarize button initially", () => {
    renderComponent();
    expect(screen.getByRole("button", { name: /summarize/i })).toBeInTheDocument();
  });

  it("does not show a summary card before the button is clicked", () => {
    renderComponent();
    expect(screen.queryByText(/summarize/i, { selector: "p" })).not.toBeInTheDocument();
  });

  it("calls POST /api/tickets/:id/summarize when clicked", async () => {
    const user = userEvent.setup();
    mockApiFetch.mockResolvedValue({ summary: "The customer has an issue." });
    renderComponent();

    await user.click(screen.getByRole("button", { name: /summarize/i }));

    await waitFor(() =>
      expect(mockApiFetch).toHaveBeenCalledWith(
        "/api/tickets/1/summarize",
        expect.objectContaining({ method: "POST" })
      )
    );
  });

  it("shows 'Summarizing…' while the request is in flight", async () => {
    const user = userEvent.setup();
    let resolve!: (val: unknown) => void;
    mockApiFetch.mockReturnValue(new Promise((res) => { resolve = res; }));
    renderComponent();

    await user.click(screen.getByRole("button", { name: /summarize/i }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /summarizing/i })).toBeInTheDocument()
    );

    resolve({ summary: "Done." });
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /regenerate summary/i })).toBeInTheDocument()
    );
  });

  it("displays the summary after a successful response", async () => {
    const user = userEvent.setup();
    mockApiFetch.mockResolvedValue({ summary: "The customer cannot log in." });
    renderComponent();

    await user.click(screen.getByRole("button", { name: /summarize/i }));

    await waitFor(() =>
      expect(screen.getByText("The customer cannot log in.")).toBeInTheDocument()
    );
  });

  it("changes the button label to 'Regenerate Summary' after first summary", async () => {
    const user = userEvent.setup();
    mockApiFetch.mockResolvedValue({ summary: "First summary." });
    renderComponent();

    await user.click(screen.getByRole("button", { name: /summarize/i }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /regenerate summary/i })).toBeInTheDocument()
    );
  });

  it("replaces the summary when Regenerate is clicked", async () => {
    const user = userEvent.setup();
    mockApiFetch
      .mockResolvedValueOnce({ summary: "First summary." })
      .mockResolvedValueOnce({ summary: "Updated summary." });
    renderComponent();

    await user.click(screen.getByRole("button", { name: /summarize/i }));
    await waitFor(() => screen.getByText("First summary."));

    await user.click(screen.getByRole("button", { name: /regenerate summary/i }));
    await waitFor(() => screen.getByText("Updated summary."));
    expect(screen.queryByText("First summary.")).not.toBeInTheDocument();
  });

  it("disables the button while summarizing", async () => {
    const user = userEvent.setup();
    let resolve!: (val: unknown) => void;
    mockApiFetch.mockReturnValue(new Promise((res) => { resolve = res; }));
    renderComponent();

    await user.click(screen.getByRole("button", { name: /summarize/i }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /summarizing/i })).toBeDisabled()
    );

    resolve({ summary: "Done." });
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /regenerate summary/i })).not.toBeDisabled()
    );
  });

  it("shows an error message when the request fails", async () => {
    const user = userEvent.setup();
    mockApiFetch.mockRejectedValue(new Error("AI unavailable"));
    renderComponent();

    await user.click(screen.getByRole("button", { name: /summarize/i }));

    await waitFor(() =>
      expect(screen.getByText("AI unavailable")).toBeInTheDocument()
    );
  });
});
