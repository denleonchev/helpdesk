import { execSync } from "child_process";
import path from "path";
import { randomUUID } from "crypto";
import { hashPassword } from "better-auth/crypto";
import { Client } from "pg";
import { config } from "dotenv";
import { TEST_DATABASE_URL } from "../playwright.config";

config({ path: ".env.test" });

const SERVER_DIR = path.resolve(__dirname, "../server");

export default async function globalSetup() {
  await createDatabaseIfNotExists();
  await resetDatabase();
  runMigrations();
  runSeed();
  await seedAgentUser();
}

async function createDatabaseIfNotExists() {
  const client = new Client({
    connectionString: process.env.TEST_DATABASE_ADMIN_URL,
  });
  await client.connect();
  try {
    const { rows } = await client.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      ["helpdesk_test"]
    );
    if (rows.length === 0) {
      await client.query("CREATE DATABASE helpdesk_test");
      console.log("Created test database: helpdesk_test");
    }
  } finally {
    await client.end();
  }
}

function runMigrations() {
  execSync("bunx prisma migrate deploy", {
    cwd: SERVER_DIR,
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
    stdio: "inherit",
  });
}

async function resetDatabase() {
  const client = new Client({ connectionString: TEST_DATABASE_URL });
  await client.connect();
  try {
    await client.query(`DROP SCHEMA public CASCADE`);
    await client.query(`CREATE SCHEMA public`);
    console.log("Test database schema reset");
  } finally {
    await client.end();
  }
}

function runSeed() {
  execSync("bun run seed", {
    cwd: SERVER_DIR,
    env: {
      ...process.env,
      DATABASE_URL: TEST_DATABASE_URL,
    },
    stdio: "inherit",
  });
}

async function seedAgentUser() {
  const email = process.env.AGENT_EMAIL;
  const password = process.env.AGENT_PASSWORD;
  if (!email || !password) return;

  const client = new Client({ connectionString: TEST_DATABASE_URL });
  await client.connect();
  try {
    const userId = randomUUID();
    const now = new Date().toISOString();
    const hashed = await hashPassword(password);

    await client.query(
      `INSERT INTO "User" (id, name, email, "emailVerified", role, "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [userId, "Agent", email, true, "agent", now, now]
    );
    await client.query(
      `INSERT INTO "Account" (id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [randomUUID(), userId, "credential", userId, hashed, now, now]
    );
    console.log(`Agent user created: ${email}`);
  } finally {
    await client.end();
  }
}
