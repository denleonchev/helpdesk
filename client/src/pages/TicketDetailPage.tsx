import { Link, useParams } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { categoryLabel } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Ticket } from "@/types/tickets";
import { TicketStatus, TicketCategory } from "@helpdesk/shared";
import type { UpdateTicketInput } from "@helpdesk/shared";

type Agent = { id: string; name: string; email: string };

export function TicketDetailPage() {
  const { id } = useParams();
  const numericId = Number(id);
  const invalid = !id || isNaN(numericId) || numericId <= 0;
  const queryClient = useQueryClient();

  const { data: ticket, isPending, error } = useQuery({
    queryKey: ["tickets", numericId],
    queryFn: () => apiFetch<Ticket>(`/api/tickets/${numericId}`),
    enabled: !invalid,
  });

  const { data: agents = [] } = useQuery({
    queryKey: ["users", "agents"],
    queryFn: () => apiFetch<Agent[]>("/api/users/agents"),
  });

  const updateMutation = useMutation({
    mutationFn: (patch: UpdateTicketInput) =>
      apiFetch<Ticket>(`/api/tickets/${numericId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tickets", numericId] }),
  });

  return (
    <div className="p-6 space-y-6">
      <Link to="/tickets" className="text-sm text-muted-foreground hover:text-foreground">
        ← Back to Tickets
      </Link>

      {invalid || error ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {error ? error.message : "Invalid ticket ID"}
          </CardContent>
        </Card>
      ) : isPending ? (
        <div data-testid="ticket-detail-loading" className="space-y-6">
          <Skeleton className="h-8 w-96" />
          <Card>
            <CardHeader><Skeleton className="h-5 w-24" /></CardHeader>
            <CardContent className="grid grid-cols-2 gap-x-4 gap-y-3">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="space-y-1">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-4 w-32" />
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><Skeleton className="h-5 w-20" /></CardHeader>
            <CardContent className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/6" />
            </CardContent>
          </Card>
        </div>
      ) : ticket ? (
        <div data-testid="ticket-detail" className="space-y-6">
          <h1 className="text-2xl font-semibold">{ticket.subject}</h1>

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
                      onValueChange={(val) => updateMutation.mutate({ status: val as TicketStatus })}
                      disabled={updateMutation.isPending}
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
                      onValueChange={(val) => updateMutation.mutate({ category: val === "__none__" ? null : val as TicketCategory })}
                      disabled={updateMutation.isPending}
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
                      onValueChange={(val) => updateMutation.mutate({ assignedToId: val === "__unassigned__" ? null : val })}
                      disabled={updateMutation.isPending}
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

          <Card>
            <CardHeader>
              <CardTitle>Message</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{ticket.body}</p>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
