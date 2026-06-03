import { z } from "zod";

export const inboundEmailSchema = z.object({
  from: z.email(),
  fromName: z.string().min(1),
  subject: z.string().min(1),
  body: z.string().min(1),
});

export type InboundEmailInput = z.infer<typeof inboundEmailSchema>;
