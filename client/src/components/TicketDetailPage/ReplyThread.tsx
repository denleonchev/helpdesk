import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { ReplyList } from "./ReplyList";
import { ReplyForm } from "./ReplyForm";
import type { Reply } from "@/types/tickets";

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

  return (
    <>
      <ReplyList replies={replies} fromName={fromName} agents={agents} />
      <ReplyForm
        ticketId={ticketId}
        onSuccess={() =>
          queryClient.invalidateQueries({ queryKey: ["tickets", ticketId, "replies"] })
        }
      />
    </>
  );
}
