import { z } from "zod";
import { TicketStatus, TicketCategory, ReplySenderType } from "../enums/tickets";

export const inboundEmailSchema = z.object({
  from: z.email().max(254),        // RFC 5321 max email address length
  fromName: z.string().min(1).max(255),
  subject: z.string().min(1).max(998), // RFC 2822 max subject line length
  body: z.string().min(1).max(100_000),
});

export type InboundEmailInput = z.infer<typeof inboundEmailSchema>;

export const updateTicketSchema = z.object({
  assignedToId: z.string().nullable().optional(),
  status: z.enum([TicketStatus.open, TicketStatus.resolved, TicketStatus.closed]).optional(),
  category: z.enum([TicketCategory.general_question, TicketCategory.technical_question, TicketCategory.refund_request]).nullable().optional(),
});

export type UpdateTicketInput = z.infer<typeof updateTicketSchema>;

export const createReplySchema = z.object({
  content: z.string().min(1),
  senderType: z.enum([ReplySenderType.agent, ReplySenderType.customer]),
});

export type CreateReplyInput = z.infer<typeof createReplySchema>;
