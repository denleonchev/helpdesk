import { Router } from "express";
import { z } from "zod";
import prisma from "../lib/prisma";
import { TicketStatus, TicketCategory } from "../generated/prisma/enums";
import { requireAuth } from "../middleware/requireAuth";

const router = Router();

const sortableFields = ["id", "subject", "fromName", "status", "category", "createdAt"] as const;

const listQuerySchema = z.object({
  sortBy: z.enum(sortableFields).optional().default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
  status: z.nativeEnum(TicketStatus).optional(),
  category: z.nativeEnum(TicketCategory).optional(),
  search: z.string().optional(),
});

router.get("/", requireAuth, async (req, res) => {
  const parsed = listQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0].message });
    return;
  }
  const { sortBy, sortOrder, status, category, search } = parsed.data;

  const tickets = await prisma.ticket.findMany({
    where: {
      ...(status && { status }),
      ...(category && { category }),
      ...(search && {
        OR: [
          { subject: { contains: search, mode: "insensitive" } },
          { fromEmail: { contains: search, mode: "insensitive" } },
          { fromName: { contains: search, mode: "insensitive" } },
        ],
      }),
    },
    orderBy: { [sortBy]: sortOrder },
  });
  res.json(tickets);
});

export default router;
