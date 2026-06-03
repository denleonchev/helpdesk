import type { TicketStatus, TicketCategory } from "@helpdesk/shared";

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
