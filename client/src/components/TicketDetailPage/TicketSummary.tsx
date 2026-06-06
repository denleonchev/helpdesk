import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type Props = {
  ticketId: number;
};

export function TicketSummary({ ticketId }: Props) {
  const [summary, setSummary] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      apiFetch<{ summary: string }>(`/api/tickets/${ticketId}/summarize`, {
        method: "POST",
      }),
    onSuccess: ({ summary }) => setSummary(summary),
  });

  return (
    <div className="space-y-3" data-testid="ticket-summary">
      <Button
        variant="outline"
        size="sm"
        onClick={() => mutation.mutate()}
        disabled={mutation.isPending}
      >
        <Sparkles className="h-4 w-4 mr-2" />
        {mutation.isPending ? "Summarizing…" : summary ? "Regenerate Summary" : "Summarize"}
      </Button>

      {mutation.isError && (
        <p className="text-sm text-destructive">{mutation.error.message}</p>
      )}

      {summary && !mutation.isPending && (
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{summary}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
