import type { Job } from "pg-boss";
import { groq } from "@ai-sdk/groq";
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

export async function classifyTicketWorker(jobs: Job<JobData>[]) {
  for (const job of jobs) {
  const { id, subject, body } = job.data;

  try {
    const { output } = await generateText({
      model: groq("meta-llama/llama-4-scout-17b-16e-instruct"),
      output: Output.object({ schema: categorySchema }),
      abortSignal: AbortSignal.timeout(30_000),
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
  } catch (e) {
    console.error("[classify-ticket] error:", e);
  }
  }
}
