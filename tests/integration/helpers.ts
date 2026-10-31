import "dotenv/config";
import { Client } from "pg";
import { createPrisma } from "@/server/db";

export const prisma = createPrisma(process.env.DATABASE_URL_TEST);

export async function resetDb() {
  await prisma.$executeRawUnsafe(
    `TRUNCATE "User", "Hackathon", "RateLimit" CASCADE`,
  );
}

export async function makeUsers(...names: string[]) {
  const users = [];
  for (const name of names) {
    const id = name.toLowerCase();
    users.push(await prisma.user.create({ data: { id, name, email: `${id}@test.kabad`, passwordHash: "x" } }));
  }
  return users;
}

export async function makeContacts(a: string, b: string) {
  await prisma.contact.createMany({ data: [{ userId: a, contactId: b }, { userId: b, contactId: a }] });
}

/** Collects pg_notify events sent on the realtime channel while `fn` runs. */
export async function captureEvents<T>(fn: () => Promise<T>) {
  const client = new Client({ connectionString: process.env.DATABASE_URL_TEST });
  await client.connect();
  const events: Array<Record<string, unknown>> = [];
  client.on("notification", (n) => events.push(JSON.parse(n.payload ?? "{}")));
  await client.query("LISTEN kabad_realtime");
  try {
    const result = await fn();
    await new Promise((r) => setTimeout(r, 100));
    return { result, events };
  } finally {
    await client.end();
  }
}
