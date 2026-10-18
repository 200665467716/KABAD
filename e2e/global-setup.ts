import { execFileSync } from "node:child_process";

/** Resets the demo data so every run starts from the same conversations and invitations. */
export default function globalSetup() {
  execFileSync("npx", ["prisma", "migrate", "deploy"], { stdio: "inherit" });
  execFileSync("npx", ["prisma", "db", "seed"], { stdio: "inherit" });
}
