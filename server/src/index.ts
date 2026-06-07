import "dotenv/config";
import express, { type Request, type Response } from "express";
import { toNodeHandler } from "better-auth/node";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { auth } from "./lib/auth";
import boss from "./lib/boss";
import { JOB_NAME, classifyTicketWorker } from "./workers/classifyTicket";
import { JOB_NAME as AUTO_RESOLVE_JOB_NAME, autoResolveTicketWorker } from "./workers/autoResolveTicket";
import usersRouter from "./routes/users";
import ticketsRouter from "./routes/tickets";
import repliesRouter from "./routes/replies";
import webhooksRouter from "./routes/webhooks";

const app = express();
const PORT = new URL(process.env.BETTER_AUTH_URL!).port;

// Trust the first proxy hop so req.ip reflects the real client IP behind a reverse proxy
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

const allowedOrigins = process.env.TRUSTED_ORIGINS?.split(",").filter(Boolean);
if (!allowedOrigins?.length) {
  throw new Error("TRUSTED_ORIGINS must be set");
}

app.use(helmet());
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  skip: () => process.env.NODE_ENV !== "production",
  message: { error: "Too many login attempts, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api/auth/sign-in", authLimiter);
app.all("/api/auth/*path", toNodeHandler(auth));
app.use(express.json());

app.use("/api/users", usersRouter);
app.use("/api/tickets", ticketsRouter);
app.use("/api/tickets/:id/replies", repliesRouter);
app.use("/api/webhooks", webhooksRouter);

app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ status: "ok" });
});

boss.start().then(async () => {
  await boss.createQueue(JOB_NAME, { retryLimit: 0 });
  await boss.createQueue(AUTO_RESOLVE_JOB_NAME, { retryLimit: 0 });
  boss.work(JOB_NAME, classifyTicketWorker);
  boss.work(AUTO_RESOLVE_JOB_NAME, autoResolveTicketWorker);
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});
