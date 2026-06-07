export const TicketStatus = {
  open: "open",
  processing: "processing",
  resolved: "resolved",
  closed: "closed",
} as const;
export type TicketStatus = (typeof TicketStatus)[keyof typeof TicketStatus];

export const TicketCategory = {
  general_question: "general_question",
  technical_question: "technical_question",
  refund_request: "refund_request",
} as const;
export type TicketCategory = (typeof TicketCategory)[keyof typeof TicketCategory];

export const ReplySenderType = {
  agent: "agent",
  customer: "customer",
} as const;
export type ReplySenderType = (typeof ReplySenderType)[keyof typeof ReplySenderType];
