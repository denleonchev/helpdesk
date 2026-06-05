import { z } from "zod";

export const inboundEmailSchema = z.object({
  from: z.email(),
  fromName: z.string().min(1),
  subject: z.string().min(1),
  body: z.string().min(1),
});

export type InboundEmailInput = z.infer<typeof inboundEmailSchema>;

export const updateTicketSchema = z.object({
  assignedToId: z.string().nullable().optional(),
  status: z.enum(["open", "resolved", "closed"]).optional(),
  category: z.enum(["general_question", "technical_question", "refund_request"]).nullable().optional(),
});

export type UpdateTicketInput = z.infer<typeof updateTicketSchema>;
