import type { Job } from "pg-boss";
import { google } from "@ai-sdk/google";
import { generateText, Output } from "ai";
import { z } from "zod";
import prisma from "../lib/prisma";
import { TicketCategory } from "../generated/prisma/enums";
import type { Ticket } from "../generated/prisma/client";

export const JOB_NAME = "classify-ticket";

export type JobData = Pick<Ticket, "id" | "subject" | "body">;

const categorySchema = z.object({
  category: z.enum(TicketCategory),
});

export async function classifyTicketWorker(job: Job<JobData>) {
  const { id, subject, body } = job.data;

  const { output } = await generateText({
    model: google("gemini-2.5-flash"),
    output: Output.object({ schema: categorySchema }),
    prompt: `Classify this support ticket into exactly one category.

Categories:
- general_question: General questions about the product or service
- technical_question: Technical issues, bugs, errors, or troubleshooting
- refund_request: Requests for refunds, cancellations, or billing disputes

Subject: ${subject}
Body: ${body}`,
  });

  await prisma.ticket.update({
    where: { id },
    data: { category: output.category },
  });
}
