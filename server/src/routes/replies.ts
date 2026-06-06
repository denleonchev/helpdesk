import { Router } from "express";
import { z } from "zod";
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

export default router;
