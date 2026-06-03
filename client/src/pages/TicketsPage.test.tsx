import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TicketsPage } from "./TicketsPage";

vi.mock("@/components/ui/select", () => ({
  Select: ({ value, onValueChange, children, "data-testid": testId }: any) => (
    <select
      value={value}
      onChange={(e) => onValueChange(e.currentTarget.value)}
      data-testid={testId}
    >
      {children}
    </select>
  ),
  SelectTrigger: () => null,
  SelectContent: ({ children }: any) => <>{children}</>,
  SelectItem: ({ value, children }: any) => <option value={value}>{children}</option>,
  SelectValue: () => null,
}));

vi.mock("@/lib/api");
import { apiFetch } from "@/lib/api";

const mockApiFetch = apiFetch as ReturnType<typeof vi.fn>;

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <TicketsPage />
    </QueryClientProvider>
  );
}

const TICKETS = [
  {
    id: 1,
    subject: "App crashes on login",
    body: "Getting a 500 error",
    fromEmail: "alice@example.com",
    fromName: "Alice",
    status: "open" as const,
    category: "technical_question" as const,
    assignedToId: null,
    createdAt: "2024-06-01T10:00:00Z",
    updatedAt: "2024-06-01T10:00:00Z",
  },
  {
    id: 2,
    subject: "Refund please",
    body: "I want my money back",
    fromEmail: "bob@example.com",
    fromName: "Bob",
    status: "resolved" as const,
    category: null,
    assignedToId: null,
    createdAt: "2024-05-20T08:00:00Z",
    updatedAt: "2024-05-20T08:00:00Z",
  },
];

beforeEach(() => {
  vi.resetAllMocks();
});

describe("TicketsPage", () => {
  it("renders the page heading", () => {
    mockApiFetch.mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.getByRole("heading", { name: "Tickets" })).toBeInTheDocument();
  });

  it("shows skeleton table while loading", () => {
    mockApiFetch.mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.getByTestId("tickets-loading")).toBeInTheDocument();
    expect(screen.queryByTestId("tickets-table")).not.toBeInTheDocument();
  });

  it("replaces skeleton with data table after loading", async () => {
    mockApiFetch.mockResolvedValue(TICKETS);
    renderPage();
    await waitFor(() => expect(screen.getByTestId("tickets-table")).toBeInTheDocument());
    expect(screen.queryByTestId("tickets-loading")).not.toBeInTheDocument();
  });

  it("renders ticket subject and sender name", async () => {
    mockApiFetch.mockResolvedValue(TICKETS);
    renderPage();
    await waitFor(() => screen.getByTestId("tickets-table"));
    expect(screen.getByText("App crashes on login")).toBeInTheDocument();
    expect(screen.getByText("Alice")).toBeInTheDocument();
  });

  it("renders sender email below sender name", async () => {
    mockApiFetch.mockResolvedValue(TICKETS);
    renderPage();
    await waitFor(() => screen.getByTestId("tickets-table"));
    expect(screen.getByText("alice@example.com")).toBeInTheDocument();
  });

  it("renders ticket id prefixed with #", async () => {
    mockApiFetch.mockResolvedValue(TICKETS);
    renderPage();
    await waitFor(() => screen.getByTestId("tickets-table"));
    expect(screen.getByText("#1")).toBeInTheDocument();
  });

  it("renders the status badge", async () => {
    mockApiFetch.mockResolvedValue(TICKETS);
    renderPage();
    await waitFor(() => screen.getByTestId("tickets-table"));
    expect(screen.getByText("open")).toBeInTheDocument();
    expect(screen.getByText("resolved")).toBeInTheDocument();
  });

  it("renders the category label when present", async () => {
    mockApiFetch.mockResolvedValue(TICKETS);
    renderPage();
    await waitFor(() => screen.getByTestId("tickets-table"));
    expect(within(screen.getByTestId("tickets-table")).getByText("Technical")).toBeInTheDocument();
  });

  it("renders a dash when category is null", async () => {
    mockApiFetch.mockResolvedValue(TICKETS);
    renderPage();
    await waitFor(() => screen.getByTestId("tickets-table"));
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("formats the received date", async () => {
    mockApiFetch.mockResolvedValue(TICKETS);
    renderPage();
    await waitFor(() => screen.getByTestId("tickets-table"));
    expect(
      screen.getByText(new Date("2024-06-01T10:00:00Z").toLocaleDateString())
    ).toBeInTheDocument();
  });

  it("shows empty state message when there are no tickets", async () => {
    mockApiFetch.mockResolvedValue([]);
    renderPage();
    await waitFor(() => screen.getByTestId("tickets-table"));
    expect(screen.getByText("No tickets found")).toBeInTheDocument();
  });

  it("shows error message when the request fails", async () => {
    mockApiFetch.mockRejectedValue(new Error("Unauthorized"));
    renderPage();
    await waitFor(() => expect(screen.getByText("Unauthorized")).toBeInTheDocument());
    expect(screen.queryByTestId("tickets-table")).not.toBeInTheDocument();
    expect(screen.queryByTestId("tickets-loading")).not.toBeInTheDocument();
  });

  it("fetches with createdAt desc by default", async () => {
    mockApiFetch.mockResolvedValue(TICKETS);
    renderPage();
    await waitFor(() => screen.getByTestId("tickets-table"));
    expect(mockApiFetch).toHaveBeenCalledWith(
      "/api/tickets?sortBy=createdAt&sortOrder=desc"
    );
  });

  it("refetches with new column and ascending order when a header is clicked", async () => {
    mockApiFetch.mockResolvedValue(TICKETS);
    renderPage();
    await waitFor(() => screen.getByTestId("tickets-table"));

    fireEvent.click(screen.getByRole("button", { name: /Subject/ }));

    await waitFor(() =>
      expect(mockApiFetch).toHaveBeenCalledWith(
        "/api/tickets?sortBy=subject&sortOrder=asc"
      )
    );
  });

  it("toggles to descending on second click of the same header", async () => {
    mockApiFetch.mockResolvedValue(TICKETS);
    renderPage();
    await waitFor(() => screen.getByTestId("tickets-table"));

    fireEvent.click(screen.getByRole("button", { name: /Subject/ }));
    // wait for the data table to reappear (new queryKey triggers a loading cycle)
    await waitFor(() => screen.getByTestId("tickets-table"));
    expect(mockApiFetch).toHaveBeenCalledWith(
      "/api/tickets?sortBy=subject&sortOrder=asc"
    );

    fireEvent.click(screen.getByRole("button", { name: /Subject/ }));
    await waitFor(() =>
      expect(mockApiFetch).toHaveBeenCalledWith(
        "/api/tickets?sortBy=subject&sortOrder=desc"
      )
    );
  });

  it("refetches with status param when a status is selected", async () => {
    mockApiFetch.mockResolvedValue(TICKETS);
    renderPage();
    await waitFor(() => screen.getByTestId("tickets-table"));

    fireEvent.change(screen.getByTestId("filter-status"), { target: { value: "open" } });

    await waitFor(() =>
      expect(mockApiFetch).toHaveBeenCalledWith(
        "/api/tickets?sortBy=createdAt&sortOrder=desc&status=open"
      )
    );
  });

  it("refetches with category param when a category is selected", async () => {
    mockApiFetch.mockResolvedValue(TICKETS);
    renderPage();
    await waitFor(() => screen.getByTestId("tickets-table"));

    fireEvent.change(screen.getByTestId("filter-category"), {
      target: { value: "technical_question" },
    });

    await waitFor(() =>
      expect(mockApiFetch).toHaveBeenCalledWith(
        "/api/tickets?sortBy=createdAt&sortOrder=desc&category=technical_question"
      )
    );
  });

  it("refetches with search param after debounce", async () => {
    const user = userEvent.setup();
    mockApiFetch.mockResolvedValue(TICKETS);
    renderPage();
    await waitFor(() => screen.getByTestId("tickets-table"));

    await user.type(screen.getByTestId("filter-search"), "alice");

    await waitFor(
      () =>
        expect(mockApiFetch).toHaveBeenCalledWith(
          "/api/tickets?sortBy=createdAt&sortOrder=desc&search=alice"
        ),
      { timeout: 1000 }
    );
  });

  it("combines active filters in the request", async () => {
    const user = userEvent.setup();
    mockApiFetch.mockResolvedValue(TICKETS);
    renderPage();
    await waitFor(() => screen.getByTestId("tickets-table"));

    fireEvent.change(screen.getByTestId("filter-status"), { target: { value: "open" } });
    await waitFor(() => screen.getByTestId("tickets-table"));

    await user.type(screen.getByTestId("filter-search"), "crash");

    await waitFor(
      () =>
        expect(mockApiFetch).toHaveBeenCalledWith(
          "/api/tickets?sortBy=createdAt&sortOrder=desc&status=open&search=crash"
        ),
      { timeout: 1000 }
    );
  });
});
