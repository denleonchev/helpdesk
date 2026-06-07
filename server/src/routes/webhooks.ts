import { Router } from "express";
import sanitizeHtml from "sanitize-html";
import prisma from "../lib/prisma";
import boss from "../lib/boss";
import { TicketStatus } from "../generated/prisma/enums";
import { inboundEmailSchema } from "@helpdesk/shared";
import { requireWebhookSecret } from "../middleware/requireWebhookSecret";
import { getAiAgentId } from "../lib/aiAgent";
import { JOB_NAME as CLASSIFY_JOB_NAME } from "../workers/classifyTicket";
import { JOB_NAME as AUTO_RESOLVE_JOB_NAME } from "../workers/autoResolveTicket";

const sanitize = (s: string) =>
  sanitizeHtml(s, { allowedTags: [], allowedAttributes: {} });

const router = Router();

router.post("/email", requireWebhookSecret, async (req, res) => {
  const result = inboundEmailSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.issues[0].message });
    return;
  }
  const { from, fromName, subject, body } = result.data;

  const aiAgentId = await getAiAgentId();
  const ticket = await prisma.ticket.create({
    data: {
      subject: sanitize(subject),
      body: sanitize(body),
      fromEmail: from,
      fromName: sanitize(fromName),
      status: TicketStatus.new,
      ...(aiAgentId && { assignedToId: aiAgentId }),
    },
  });

  await Promise.all([
    boss.send(CLASSIFY_JOB_NAME, { id: ticket.id, subject: ticket.subject, body: ticket.body }),
    boss.send(AUTO_RESOLVE_JOB_NAME, { id: ticket.id, subject: ticket.subject, body: ticket.body, fromName: ticket.fromName }),
  ]);

  res.status(201).json(ticket);
});

export default router;
