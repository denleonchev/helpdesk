import type { Request, Response, NextFunction } from "express";

export function requireAdmin(_req: Request, res: Response, next: NextFunction) {
  if (res.locals.session?.user?.role !== "admin") {
    return res.status(403).json({ error: "Forbidden" });
  }
  next();
}
