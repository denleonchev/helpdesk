import { Router } from "express";
import { z } from "zod";
import { google } from "@ai-sdk/google";
import { generateText } from "ai";
import prisma from "../lib/prisma";
import { ReplySenderType } from "../generated/prisma/enums";
import { requireAuth } from "../middleware/requireAuth";
import { createReplySchema } from "@helpdesk/shared";

const router = Router({ mergeParams: true });

const ticketIdSchema = z.coerce.number().int().positive();

router.get("/", requireAuth, async (req, res) => {
  const parsed = ticketIdSchema.safeParse(req.params.id);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0].message });
    return;
  }

  const ticket = await prisma.ticket.findUnique({ where: { id: parsed.data } });
  if (!ticket) {
    res.status(404).json({ error: "Ticket not found" });
    return;
  }

  const replies = await prisma.reply.findMany({
    where: { ticketId: parsed.data },
    orderBy: { createdAt: "asc" },
  });

  res.json(replies);
});

router.post("/", requireAuth, async (req, res) => {
  const idParsed = ticketIdSchema.safeParse(req.params.id);
  if (!idParsed.success) {
    res.status(400).json({ error: idParsed.error.issues[0].message });
    return;
  }

  const bodyParsed = createReplySchema.safeParse(req.body);
  if (!bodyParsed.success) {
    res.status(400).json({ error: bodyParsed.error.issues[0].message });
    return;
  }

  const ticket = await prisma.ticket.findUnique({ where: { id: idParsed.data } });
  if (!ticket) {
    res.status(404).json({ error: "Ticket not found" });
    return;
  }

  const { content, senderType } = bodyParsed.data;
  const authorId = senderType === ReplySenderType.agent ? res.locals.session.user.id : null;

  const reply = await prisma.reply.create({
    data: {
      content,
      senderType,
      ticketId: idParsed.data,
      authorId,
    },
  });

  res.status(201).json(reply);
});

const polishSchema = z.object({
  content: z.string().min(1).max(10_000),
});

router.post("/polish", requireAuth, async (req, res) => {
  const idParsed = ticketIdSchema.safeParse(req.params.id);
  if (!idParsed.success) {
    res.status(400).json({ error: idParsed.error.issues[0].message });
    return;
  }

  const parsed = polishSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0].message });
    return;
  }

  const ticket = await prisma.ticket.findUnique({ where: { id: idParsed.data } });
  if (!ticket) {
    res.status(404).json({ error: "Ticket not found" });
    return;
  }

  const customerFirstName = ticket.fromName.split(" ")[0];
  const agentFullName = res.locals.session.user.name;

  const { text } = await generateText({
    model: google("gemini-2.5-flash"),
    prompt: `You are a support agent assistant. Improve the following reply to make it clearer, more professional, and more helpful.
Address the customer by their first name: ${customerFirstName}.
End with a warm closing (e.g. "Best regards," or "Thanks,") followed by the agent's full name: ${agentFullName}.
Return only the improved text with no explanation or preamble.

${parsed.data.content}`,
  });

  res.json({ content: text });
});

export default router;
