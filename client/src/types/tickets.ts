import type { TicketStatus, TicketCategory, ReplySenderType } from "@helpdesk/shared";

export type Ticket = {
  id: number;
  subject: string;
  body: string;
  fromEmail: string;
  fromName: string;
  status: TicketStatus;
  category: TicketCategory | null;
  assignedToId: string | null;
  assignedTo?: { id: string; name: string; email: string } | null;
  createdAt: string;
  updatedAt: string;
};

export type Reply = {
  id: number;
  content: string;
  senderType: ReplySenderType;
  ticketId: number;
  authorId: string | null;
  createdAt: string;
  updatedAt: string;
};
