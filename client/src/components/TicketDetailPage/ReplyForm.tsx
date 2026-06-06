import { useMutation } from "@tanstack/react-query";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiFetch } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import type { Reply } from "@/types/tickets";
import { createReplySchema } from "@helpdesk/shared";
import type { CreateReplyInput } from "@helpdesk/shared";

type Props = {
  ticketId: number;
  onSuccess: () => void;
};

export function ReplyForm({ ticketId, onSuccess }: Props) {
  const form = useForm<CreateReplyInput>({
    resolver: zodResolver(createReplySchema),
    defaultValues: { content: "", senderType: "agent" },
  });

  const content = useWatch({ control: form.control, name: "content" });

  const sendMutation = useMutation({
    mutationFn: (data: CreateReplyInput) =>
      apiFetch<Reply>(`/api/tickets/${ticketId}/replies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      onSuccess();
      form.reset();
    },
  });

  const polishMutation = useMutation({
    mutationFn: (text: string) =>
      apiFetch<{ content: string }>(`/api/tickets/${ticketId}/replies/polish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text }),
      }),
    onSuccess: ({ content }) => form.setValue("content", content),
  });

  const isBusy = sendMutation.isPending || polishMutation.isPending;

  return (
    <Card data-testid="reply-form">
      <CardHeader>
        <CardTitle>Reply</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={form.handleSubmit((data) => sendMutation.mutate(data))}
          className="space-y-3"
        >
          <Textarea
            placeholder="Write a reply..."
            {...form.register("content")}
          />
          <div className="flex gap-2">
            <Button type="submit" disabled={isBusy}>
              Send Reply
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={isBusy || !content?.trim()}
              onClick={() => polishMutation.mutate(content)}
            >
              {polishMutation.isPending ? "Polishing…" : "Polish"}
            </Button>
          </div>
          {sendMutation.isError && (
            <p className="text-sm text-destructive">{sendMutation.error.message}</p>
          )}
          {polishMutation.isError && (
            <p className="text-sm text-destructive">{polishMutation.error.message}</p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
