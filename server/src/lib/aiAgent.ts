import prisma from "./prisma";

export const AI_AGENT_EMAIL = "ai@helpdesk.internal";

let cachedId: string | null = null;

export async function getAiAgentId(): Promise<string | null> {
  if (cachedId) return cachedId;
  const agent = await prisma.user.findUnique({ where: { email: AI_AGENT_EMAIL }, select: { id: true } });
  cachedId = agent?.id ?? null;
  return cachedId;
}
