import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiFetch } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import type { Reply } from "@/types/tickets";
import { createReplySchema } from "@helpdesk/shared";
import type { CreateReplyInput } from "@helpdesk/shared";

type Agent = { id: string; name: string; email: string };

type Props = {
  ticketId: number;
  fromName: string;
  agents: Agent[];
};

export function ReplyThread({ ticketId, fromName, agents }: Props) {
  const queryClient = useQueryClient();

  const { data: replies = [] } = useQuery({
    queryKey: ["tickets", ticketId, "replies"],
    queryFn: () => apiFetch<Reply[]>(`/api/tickets/${ticketId}/replies`),
  });

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
      queryClient.invalidateQueries({ queryKey: ["tickets", ticketId, "replies"] });
      form.reset();
    },
  });

  return (
    <>
      <Card data-testid="reply-thread">
        <CardHeader>
          <CardTitle>Replies</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {replies.length === 0 ? (
            <p className="text-sm text-muted-foreground">No replies yet.</p>
          ) : (
            replies.map((reply) => {
              const senderName =
                reply.senderType === "agent"
                  ? (agents.find((a) => a.id === reply.authorId)?.name ?? "Agent")
                  : fromName;
              return (
                <div key={reply.id} className="space-y-1">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{senderName}</span>
                    <span>{new Date(reply.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{reply.content}</p>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

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
    </>
  );
}
