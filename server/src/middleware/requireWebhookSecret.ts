import type { Request, Response, NextFunction } from "express";

export function requireWebhookSecret(req: Request, res: Response, next: NextFunction) {
  const secret = process.env.WEBHOOK_SECRET;
  if (!secret || req.headers["x-webhook-secret"] !== secret) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}
