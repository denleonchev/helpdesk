import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReplyThread } from "./ReplyThread";

vi.mock("@/lib/api");
import { apiFetch } from "@/lib/api";

const mockApiFetch = apiFetch as ReturnType<typeof vi.fn>;

function renderComponent() {
  mockApiFetch.mockResolvedValue([]);
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ReplyThread ticketId={1} fromName="Bob Customer" agents={[]} />
    </QueryClientProvider>
  );
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe("ReplyThread", () => {
  it("renders the reply list and reply form", async () => {
    renderComponent();
    await waitFor(() => screen.getByTestId("reply-thread"));
    expect(screen.getByTestId("reply-form")).toBeInTheDocument();
  });

  it("fetches replies for the given ticketId", async () => {
    renderComponent();
    await waitFor(() =>
      expect(mockApiFetch).toHaveBeenCalledWith("/api/tickets/1/replies")
    );
  });
});
