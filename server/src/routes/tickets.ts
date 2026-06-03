import { Router } from "express";
import { z } from "zod";
import prisma from "../lib/prisma";
import { requireAuth } from "../middleware/requireAuth";

const router = Router();

const sortableFields = ["id", "subject", "fromName", "status", "category", "createdAt"] as const;

const listQuerySchema = z.object({
  sortBy: z.enum(sortableFields).optional().default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
});

router.get("/", requireAuth, async (req, res) => {
  const parsed = listQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0].message });
    return;
  }
  const { sortBy, sortOrder } = parsed.data;
  const tickets = await prisma.ticket.findMany({
    orderBy: { [sortBy]: sortOrder },
  });
  res.json(tickets);
});

export default router;
