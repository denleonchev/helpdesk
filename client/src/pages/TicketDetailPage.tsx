import { useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { BackLink } from "@/components/BackLink";
import { TicketDetailSkeleton } from "@/components/TicketDetailPage/TicketDetailSkeleton";
import { TicketDetailError } from "@/components/TicketDetailPage/TicketDetailError";
import { TicketEditableDetails } from "@/components/TicketDetailPage/TicketEditableDetails";
import { TicketMessage } from "@/components/TicketDetailPage/TicketMessage";
import { TicketSummary } from "@/components/TicketDetailPage/TicketSummary";
import { ReplyThread } from "@/components/TicketDetailPage/ReplyThread";
import type { Ticket } from "@/types/tickets";

type Agent = { id: string; name: string; email: string };

export function TicketDetailPage() {
  const { id } = useParams();
  const numericId = Number(id);
  const invalid = !id || isNaN(numericId) || numericId <= 0;

  const { data: ticket, isPending, error } = useQuery({
    queryKey: ["tickets", numericId],
    queryFn: () => apiFetch<Ticket>(`/api/tickets/${numericId}`),
    enabled: !invalid,
  });

  const { data: agents = [] } = useQuery({
    queryKey: ["users", "agents"],
    queryFn: () => apiFetch<Agent[]>("/api/users/agents"),
  });

  if (invalid || error) {
    return (
      <div className="p-6 space-y-6">
        <BackLink to="/tickets" label="Back to Tickets" />
        <TicketDetailError message={error ? error.message : "Invalid ticket ID"} />
      </div>
    );
  }

  if (isPending) {
    return (
      <div className="p-6 space-y-6">
        <BackLink to="/tickets" label="Back to Tickets" />
        <TicketDetailSkeleton />
      </div>
    );
  }

  if (!ticket) return null;

  return (
    <div className="p-6 space-y-6">
      <BackLink to="/tickets" label="Back to Tickets" />
      <div data-testid="ticket-detail" className="space-y-6">
        <h1 className="text-2xl font-semibold">{ticket.subject}</h1>
        <TicketEditableDetails ticketId={numericId} ticket={ticket} agents={agents} />
        <TicketMessage body={ticket.body} />
        <TicketSummary ticketId={numericId} />
        <ReplyThread ticketId={numericId} fromName={ticket.fromName} agents={agents} />
      </div>
    </div>
  );
}
