import { Router } from "express";
import sanitizeHtml from "sanitize-html";
import prisma from "../lib/prisma";
import { TicketStatus } from "../generated/prisma/enums";
import { inboundEmailSchema } from "@helpdesk/shared";
import { requireWebhookSecret } from "../middleware/requireWebhookSecret";

const sanitize = (s: string) => sanitizeHtml(s, { allowedTags: [], allowedAttributes: {} });

const router = Router();

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
});

export default router;
