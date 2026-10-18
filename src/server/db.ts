import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

export function createPrisma(connectionString = process.env.DATABASE_URL) {
  if (!connectionString) throw new Error("DATABASE_URL manquant : copiez .env.example vers .env.");
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

// One client per server process, reused across hot reloads in development.
const globalForPrisma = globalThis as unknown as { kabadPrisma?: PrismaClient };

export const db = globalForPrisma.kabadPrisma ?? createPrisma();
if (process.env.NODE_ENV !== "production") globalForPrisma.kabadPrisma = db;

export type Db = PrismaClient;
