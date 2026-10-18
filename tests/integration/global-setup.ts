import { execFileSync } from "node:child_process";
import "dotenv/config";

/** Applies the migrations to the test database before the integration tests. */
export default function setup() {
  const url = process.env.DATABASE_URL_TEST;
  if (!url) throw new Error("DATABASE_URL_TEST manquant (voir .env.example).");
  if (url === process.env.DATABASE_URL) throw new Error("DATABASE_URL_TEST doit viser une autre base que DATABASE_URL : les tests la vident.");
  execFileSync("npx", ["prisma", "migrate", "deploy"], { env: { ...process.env, DATABASE_URL: url }, stdio: "pipe" });
}
