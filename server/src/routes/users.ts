import { Router, type Request } from "express";
import { requireAuth } from "../middleware/requireAuth";
import { requireAdmin } from "../middleware/requireAdmin";
import prisma from "../lib/prisma";
import { hashPassword, generateRandomString, verifyPassword } from "better-auth/crypto";
import { Role } from "../generated/prisma/enums";
import { createUserSchema, editUserSchema } from "@helpdesk/shared";

const router = Router();

router.get("/agents", requireAuth, async (_req, res) => {
  const agents = await prisma.user.findMany({
    where: { deletedAt: null, role: Role.agent },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });
  res.json(agents);
});

router.get("/", requireAuth, requireAdmin, async (_req, res) => {
  const users = await prisma.user.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  res.json(users);
});

router.post("/", requireAuth, requireAdmin, async (req, res) => {
  const result = createUserSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.issues[0].message });
    return;
  }
  const { name, email, password } = result.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ error: "A user with this email already exists" });
    return;
  }

  const hashed = await hashPassword(password);
  const now = new Date();
  const userId = generateRandomString(32, "a-z", "A-Z", "0-9");
  const accountId = generateRandomString(32, "a-z", "A-Z", "0-9");

  const user = await prisma.user.create({
    data: {
      id: userId,
      name: name.trim(),
      email,
      emailVerified: false,
      role: Role.agent,
      createdAt: now,
      updatedAt: now,
      accounts: {
        create: {
          id: accountId,
          accountId: userId,
          providerId: "credential",
          password: hashed,
          createdAt: now,
          updatedAt: now,
        },
      },
    },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });

  res.status(201).json(user);
});

router.delete("/:id", requireAuth, requireAdmin, async (req: Request<{ id: string }>, res) => {
  if (req.params.id === res.locals.session.user.id) {
    res.status(403).json({ error: "You cannot delete your own account" });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: req.params.id, deletedAt: null },
  });
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: req.params.id },
      data: { deletedAt: new Date() },
    }),
    prisma.session.deleteMany({ where: { userId: req.params.id } }),
  ]);

  res.status(204).end();
});

router.patch("/:id", requireAuth, requireAdmin, async (req: Request<{ id: string }>, res) => {
  const result = editUserSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.issues[0].message });
    return;
  }
  const { name, email, oldPassword, newPassword } = result.data;

  const user = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  if (email !== user.email) {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(409).json({ error: "A user with this email already exists" });
      return;
    }
  }

  if (oldPassword && newPassword) {
    const account = await prisma.account.findFirst({
      where: { userId: user.id, providerId: "credential" },
    });
    if (!account?.password) {
      res.status(400).json({ error: "No password set for this user" });
      return;
    }
    const valid = await verifyPassword({ hash: account.password, password: oldPassword });
    if (!valid) {
      res.status(400).json({ error: "Old password is incorrect" });
      return;
    }
    const hashed = await hashPassword(newPassword);
    await prisma.account.update({
      where: { id: account.id },
      data: { password: hashed, updatedAt: new Date() },
    });
  }

  const updated = await prisma.user.update({
    where: { id: req.params.id },
    data: { name: name.trim(), email, updatedAt: new Date() },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });

  res.json(updated);
});

export default router;
