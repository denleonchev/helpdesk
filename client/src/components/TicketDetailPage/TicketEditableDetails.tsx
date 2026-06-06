import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { categoryLabel } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Ticket } from "@/types/tickets";
import { TicketStatus, TicketCategory } from "@helpdesk/shared";
import type { UpdateTicketInput } from "@helpdesk/shared";

type Agent = { id: string; name: string; email: string };

type Props = {
  ticketId: number;
  ticket: Ticket;
  agents: Agent[];
};

export function TicketEditableDetails({ ticketId, ticket, agents }: Props) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (patch: UpdateTicketInput) =>
      apiFetch<Ticket>(`/api/tickets/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tickets", ticketId] }),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Details</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
          <div>
            <dt className="text-muted-foreground mb-1">From</dt>
            <dd className="font-medium">{ticket.fromName}</dd>
            <dd className="text-muted-foreground">{ticket.fromEmail}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground mb-1">Status</dt>
            <dd>
              <Select
                value={ticket.status}
                onValueChange={(val) => mutation.mutate({ status: val as TicketStatus })}
                disabled={mutation.isPending}
              >
                <SelectTrigger className="w-36" data-testid="status-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(TicketStatus).map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground mb-1">Received</dt>
            <dd>{new Date(ticket.createdAt).toLocaleString()}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground mb-1">Category</dt>
            <dd>
              <Select
                value={ticket.category ?? "__none__"}
                onValueChange={(val) => mutation.mutate({ category: val === "__none__" ? null : val as TicketCategory })}
                disabled={mutation.isPending}
              >
                <SelectTrigger className="w-48" data-testid="category-select">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {Object.values(TicketCategory).map((c) => (
                    <SelectItem key={c} value={c}>{categoryLabel[c]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground mb-1">Last Updated</dt>
            <dd>{new Date(ticket.updatedAt).toLocaleString()}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground mb-1">Assigned To</dt>
            <dd>
              <Select
                value={ticket.assignedToId ?? "__unassigned__"}
                onValueChange={(val) => mutation.mutate({ assignedToId: val === "__unassigned__" ? null : val })}
                disabled={mutation.isPending}
              >
                <SelectTrigger className="w-48" data-testid="assign-select">
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__unassigned__">Unassigned</SelectItem>
                  {agents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}
