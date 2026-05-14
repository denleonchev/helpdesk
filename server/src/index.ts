import "dotenv/config";
import express, { type Request, type Response } from "express";
import { toNodeHandler } from "better-auth/node";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { auth } from "./lib/auth";

const app = express();
const PORT = process.env.PORT ?? 3000;

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
app.all("/api/auth/*", toNodeHandler(auth));
app.use(express.json());

app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ status: "ok" });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
