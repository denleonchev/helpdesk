import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Reply } from "@/types/tickets";

type Agent = { id: string; name: string; email: string };

type Props = {
  replies: Reply[];
  fromName: string;
  agents: Agent[];
};

export function ReplyList({ replies, fromName, agents }: Props) {
  return (
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
  );
}
