import { execSync } from "child_process";
import path from "path";
import { Client } from "pg";
import { config } from "dotenv";
import { TEST_DATABASE_URL } from "../playwright.config";

config({ path: ".env.test" });

const SERVER_DIR = path.resolve(__dirname, "../server");

export default async function globalSetup() {
  await createDatabaseIfNotExists();
  runMigrations();
  runSeed();
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
