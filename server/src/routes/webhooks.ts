import { Router } from "express";
import sanitizeHtml from "sanitize-html";
import { google } from "@ai-sdk/google";
import { generateText, Output } from "ai";
import { z } from "zod";
import prisma from "../lib/prisma";
import { TicketStatus, TicketCategory } from "../generated/prisma/enums";
import { inboundEmailSchema } from "@helpdesk/shared";
import { requireWebhookSecret } from "../middleware/requireWebhookSecret";
import type { Ticket } from "../generated/prisma/client";

const sanitize = (s: string) =>
  sanitizeHtml(s, { allowedTags: [], allowedAttributes: {} });

const router = Router();

const categorySchema = z.object({
  category: z.enum(TicketCategory),
});

async function classifyTicket(ticket: Ticket) {
  try {
    const { output } = await generateText({
      model: google("gemini-2.5-flash"),
      output: Output.object({ schema: categorySchema }),
      prompt: `Classify this support ticket into exactly one category.

Categories:
- general_question: General questions about the product or service
- technical_question: Technical issues, bugs, errors, or troubleshooting
- refund_request: Requests for refunds, cancellations, or billing disputes

Subject: ${ticket.subject}
Body: ${ticket.body}`,
    });

    await prisma.ticket.update({
      where: { id: ticket.id },
      data: { category: output.category },
    });
  } catch (err) {
    console.error(`Failed to classify ticket ${ticket.id}:`, err);
  }
}

router.post("/email", requireWebhookSecret, async (req, res) => {
  const result = inboundEmailSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.issues[0].message });
    return;
  }
  const { from, fromName, subject, body } = result.data;

  const ticket = await prisma.ticket.create({
    data: {
      subject: sanitize(subject),
      body: sanitize(body),
      fromEmail: from,
      fromName: sanitize(fromName),
      status: TicketStatus.open,
    },
  });

  res.status(201).json(ticket);

  void classifyTicket(ticket);
});

export default router;
