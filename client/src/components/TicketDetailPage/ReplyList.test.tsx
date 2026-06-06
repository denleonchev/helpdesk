import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ReplyList } from "./ReplyList";
import type { Reply } from "@/types/tickets";

const AGENTS = [
  { id: "agent-1", name: "Alice Agent", email: "alice@helpdesk.com" },
];

const REPLY_AGENT: Reply = {
  id: 1,
  content: "We're looking into this.",
  senderType: "agent",
  ticketId: 1,
  authorId: "agent-1",
  createdAt: "2024-06-01T11:00:00Z",
  updatedAt: "2024-06-01T11:00:00Z",
};

const REPLY_CUSTOMER: Reply = {
  id: 2,
  content: "Still happening.",
  senderType: "customer",
  ticketId: 1,
  authorId: null,
  createdAt: "2024-06-01T12:00:00Z",
  updatedAt: "2024-06-01T12:00:00Z",
};

describe("ReplyList", () => {
  it("shows 'No replies yet' when the list is empty", () => {
    render(<ReplyList replies={[]} fromName="Bob Customer" agents={AGENTS} />);
    expect(screen.getByText("No replies yet.")).toBeInTheDocument();
  });

  it("renders an agent reply with the agent's name from the agents list", () => {
    render(<ReplyList replies={[REPLY_AGENT]} fromName="Bob Customer" agents={AGENTS} />);
    expect(screen.getByText("Alice Agent")).toBeInTheDocument();
    expect(screen.getByText("We're looking into this.")).toBeInTheDocument();
  });

  it("falls back to 'Agent' when the authorId is not in the agents list", () => {
    render(
      <ReplyList
        replies={[{ ...REPLY_AGENT, authorId: "unknown-id" }]}
        fromName="Bob Customer"
        agents={AGENTS}
      />
    );
    expect(screen.getByText("Agent")).toBeInTheDocument();
  });

  it("renders a customer reply with fromName", () => {
    render(<ReplyList replies={[REPLY_CUSTOMER]} fromName="Bob Customer" agents={AGENTS} />);
    expect(screen.getByText("Bob Customer")).toBeInTheDocument();
    expect(screen.getByText("Still happening.")).toBeInTheDocument();
  });
});
