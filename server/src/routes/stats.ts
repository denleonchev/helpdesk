import { Router } from "express";
import prisma from "../lib/prisma";
import { TicketStatus } from "../generated/prisma/enums";
import { getAiAgentId } from "../lib/aiAgent";
import { requireAuth } from "../middleware/requireAuth";

const router = Router();

router.get("/", requireAuth, async (_req, res) => {
  const aiAgentId = await getAiAgentId();

  const aiResolvedWhere = aiAgentId
    ? { status: TicketStatus.resolved, assignedToId: aiAgentId }
    : { status: TicketStatus.resolved, assignedToId: "__none__" }; // no match if AI agent not seeded

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
  thirtyDaysAgo.setHours(0, 0, 0, 0);

  const [total, aiResolved, aiResolvedTickets, recentTickets] = await Promise.all([
    prisma.ticket.count(),
    prisma.ticket.count({ where: aiResolvedWhere }),
    prisma.ticket.findMany({
      where: aiResolvedWhere,
      select: { createdAt: true, updatedAt: true },
    }),
    prisma.ticket.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      select: { createdAt: true },
    }),
  ]);

  const countsByDate: Record<string, number> = {};
  for (let i = 0; i < 30; i++) {
    const d = new Date(thirtyDaysAgo);
    d.setDate(d.getDate() + i);
    countsByDate[d.toISOString().slice(0, 10)] = 0;
  }
  for (const t of recentTickets) {
    const key = t.createdAt.toISOString().slice(0, 10);
    if (key in countsByDate) countsByDate[key]++;
  }
  const ticketsPerDay = Object.entries(countsByDate).map(([date, count]) => ({ date, count }));

  const totalResolutionMs = aiResolvedTickets.reduce(
    (sum, t) => sum + (t.updatedAt.getTime() - t.createdAt.getTime()),
    0
  );

  const avgResolutionSeconds =
    aiResolvedTickets.length > 0
      ? Math.round(totalResolutionMs / aiResolvedTickets.length / 1000)
      : null;

  res.json({
    total,
    aiResolved,
    aiResolvedPercent: total > 0 ? Math.round((aiResolved / total) * 100) : 0,
    avgResolutionSeconds,
    ticketsPerDay,
  });
});

export default router;
