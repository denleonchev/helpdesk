import "dotenv/config";
import { randomUUID } from "crypto";
import { hashPassword } from "better-auth/crypto";
import { Role } from "../src/generated/prisma/enums";
import { AI_AGENT_EMAIL } from "../src/lib/aiAgent";
import prisma from "../src/lib/prisma";

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.error("ADMIN_EMAIL and ADMIN_PASSWORD must be set");
    process.exit(1);
  }

  const now = new Date();

  const existingAdmin = await prisma.user.findUnique({ where: { email } });
  if (existingAdmin) {
    console.log(`Admin user ${email} already exists, skipping.`);
  } else {
    const userId = randomUUID();
    const hashed = await hashPassword(password);

    await prisma.user.create({
      data: { id: userId, name: "Admin", email, emailVerified: true, role: Role.admin, createdAt: now, updatedAt: now },
    });

    await prisma.account.create({
      data: {
        id: randomUUID(),
        accountId: userId,
        providerId: "credential",
        userId,
        password: hashed,
        createdAt: now,
        updatedAt: now,
      },
    });

    console.log(`Admin user created: ${email}`);
  }

  const existingAi = await prisma.user.findUnique({ where: { email: AI_AGENT_EMAIL } });
  if (existingAi) {
    console.log("AI agent already exists, skipping.");
  } else {
    await prisma.user.create({
      data: { id: randomUUID(), name: "AI", email: AI_AGENT_EMAIL, emailVerified: true, role: Role.agent, createdAt: now, updatedAt: now },
    });
    console.log("AI agent created.");
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
