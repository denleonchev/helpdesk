import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { TicketStatus, TicketCategory } from "@helpdesk/shared";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const statusVariant: Record<string, "default" | "secondary" | "outline"> = {
  [TicketStatus.open]: "default",
  [TicketStatus.processing]: "secondary",
  [TicketStatus.resolved]: "outline",
  [TicketStatus.closed]: "outline",
};

export const categoryLabel: Record<string, string> = {
  [TicketCategory.general_question]: "General",
  [TicketCategory.technical_question]: "Technical",
  [TicketCategory.refund_request]: "Refund",
};
