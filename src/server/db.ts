import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

export function createPrisma(connectionString = process.env.DATABASE_URL) {
  if (!connectionString) throw new Error("DATABASE_URL manquant : copie .env.example vers .env.");
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

// One client per server process, reused across hot reloads in development.
const globalForPrisma = globalThis as unknown as { kabadPrisma?: PrismaClient };

/** Created on first use, not on import: `next build` loads the routes without a database. */
function client(): PrismaClient {
  globalForPrisma.kabadPrisma ??= createPrisma();
  return globalForPrisma.kabadPrisma;
}

export const db = new Proxy({} as PrismaClient, {
  get(_target, key) {
    const value = Reflect.get(client(), key);
    return typeof value === "function" ? value.bind(client()) : value;
  },
});

export type Db = PrismaClient;
