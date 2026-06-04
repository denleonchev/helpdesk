import { Router } from "express";
import { z } from "zod";
import prisma from "../lib/prisma";
import { TicketStatus, TicketCategory, Role } from "../generated/prisma/enums";
import { requireAuth } from "../middleware/requireAuth";
import { updateTicketSchema } from "@helpdesk/shared";

const router = Router();

const sortableFields = [
  "id",
  "subject",
  "fromName",
  "status",
  "category",
  "createdAt",
] as const;

const listQuerySchema = z.object({
  sortBy: z.enum(sortableFields).optional().default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
  status: z.nativeEnum(TicketStatus).optional(),
  category: z.nativeEnum(TicketCategory).optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(10),
});

router.get("/", requireAuth, async (req, res) => {
  const parsed = listQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0].message });
    return;
  }
  const { sortBy, sortOrder, status, category, search, page, pageSize } =
    parsed.data;

  const where = {
    ...(status && { status }),
    ...(category && { category }),
    ...(search && {
      OR: [
        { subject: { contains: search, mode: "insensitive" as const } },
        { fromEmail: { contains: search, mode: "insensitive" as const } },
        { fromName: { contains: search, mode: "insensitive" as const } },
      ],
    }),
  };

  const [data, total] = await prisma.$transaction([
    prisma.ticket.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.ticket.count({ where }),
  ]);

  res.json({ data, total });
});

router.get("/:id", requireAuth, async (req, res) => {
  const parsed = z.coerce.number().int().positive().safeParse(req.params.id);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0].message });
    return;
  }

  const ticket = await prisma.ticket.findUnique({
    where: { id: parsed.data },
    include: { assignedTo: true },
  });

  if (!ticket) {
    res.status(404).json({ error: "Ticket not found" });
    return;
  }

  res.json(ticket);
});

router.patch("/:id", requireAuth, async (req, res) => {
  const idParsed = z.coerce.number().int().positive().safeParse(req.params.id);
  if (!idParsed.success) {
    res.status(400).json({ error: idParsed.error.issues[0].message });
    return;
  }

  const bodyParsed = updateTicketSchema.safeParse(req.body);
  if (!bodyParsed.success) {
    res.status(400).json({ error: bodyParsed.error.issues[0].message });
    return;
  }

  const { assignedToId } = bodyParsed.data;

  if (assignedToId != null) {
    const agent = await prisma.user.findUnique({
      where: { id: assignedToId, deletedAt: null, role: Role.agent },
    });
    if (!agent) {
      res.status(400).json({ error: "Assigned user is not a valid agent" });
      return;
    }
  }

  const existing = await prisma.ticket.findUnique({ where: { id: idParsed.data } });
  if (!existing) {
    res.status(404).json({ error: "Ticket not found" });
    return;
  }

  const ticket = await prisma.ticket.update({
    where: { id: idParsed.data },
    data: { assignedToId: assignedToId ?? null },
    include: { assignedTo: true },
  });

  res.json(ticket);
});

export default router;
