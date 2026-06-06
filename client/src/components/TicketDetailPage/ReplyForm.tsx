import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
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

  const mutation = useMutation({
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

  return (
    <Card data-testid="reply-form">
      <CardHeader>
        <CardTitle>Reply</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={form.handleSubmit((data) => mutation.mutate(data))}
          className="space-y-3"
        >
          <Textarea
            placeholder="Write a reply..."
            {...form.register("content")}
          />
          <Button type="submit" disabled={mutation.isPending}>
            Send Reply
          </Button>
          {mutation.isError && (
            <p className="text-sm text-destructive">{mutation.error.message}</p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
