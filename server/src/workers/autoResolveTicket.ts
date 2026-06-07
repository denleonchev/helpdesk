import fs from "fs";
import path from "path";
import type { Job } from "pg-boss";
import { groq } from "@ai-sdk/groq";
import { generateText, Output } from "ai";
import { z } from "zod";
import prisma from "../lib/prisma";
import { ReplySenderType, TicketStatus } from "../generated/prisma/enums";
import type { Ticket } from "../generated/prisma/client";

export const JOB_NAME = "auto-resolve-ticket";

export type JobData = Pick<Ticket, "id" | "subject" | "body" | "fromName">;

const knowledgeBase = fs.readFileSync(
  path.join(process.cwd(), "knowledge-base.md"),
  "utf-8"
);

const resolveSchema = z.object({
  canResolve: z.boolean(),
  reply: z.string(),
});

export async function autoResolveTicketWorker(jobs: Job<JobData>[]) {
  for (const job of jobs) {
  const { id, subject, body, fromName } = job.data;
  const customerFirstName = fromName.split(" ")[0];

  try {
    await prisma.ticket.update({
      where: { id },
      data: { status: TicketStatus.processing },
    });

    const { output } = await generateText({
      model: groq("meta-llama/llama-4-scout-17b-16e-instruct"),
      output: Output.object({ schema: resolveSchema }),
      abortSignal: AbortSignal.timeout(30_000),
      prompt: `You are a friendly and professional support agent for Code with Mosh.

Your task: decide whether the customer's ticket can be fully resolved using the knowledge base below, and if so, write the reply.

RESOLUTION RULES:
- Set canResolve to true only if the knowledge base contains a clear, complete answer AND none of the escalation rules apply.
- Set canResolve to false if the ticket requires escalation (legal threats, refund outside 30 days, chargeback disputes, account security concerns) or the knowledge base does not cover the issue confidently.
- When canResolve is false, set reply to an empty string.

REPLY FORMAT (when canResolve is true):
- Open with: "Hi ${customerFirstName},"
- Write 1–3 short paragraphs that directly answer the customer's question. Be warm, clear, and concise.
- Close with:
  Kind regards,
  Code with Mosh Support Team
- Use plain text only — no markdown, no bullet points, no headers.

Knowledge Base:
${knowledgeBase}

Customer Ticket:
Subject: ${subject}
Body: ${body}`,
    });

    if (!output.canResolve) {
      await prisma.ticket.update({ where: { id }, data: { status: TicketStatus.open, assignedToId: null } });
      continue;
    }

    await prisma.$transaction([
      prisma.reply.create({
        data: {
          content: output.reply,
          senderType: ReplySenderType.agent,
          ticketId: id,
          authorId: null,
        },
      }),
      prisma.ticket.update({
        where: { id },
        data: { status: TicketStatus.resolved },
      }),
    ]);
  } catch {
    await prisma.ticket.update({ where: { id }, data: { status: TicketStatus.open, assignedToId: null } });
  }
  }
}
