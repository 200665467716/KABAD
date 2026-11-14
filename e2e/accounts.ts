/*
 * The accounts of the seed (prisma/seed.ts): real addresses of the team. Their passwords come from .env
 * (SEED_PASSWORD_KOFFI…), as in the seed; without them, the local password kabad-demo-2026.
 */
import "dotenv/config";

const LOCAL_PASSWORD = "kabad-demo-2026";
const account = (id: string, email: string) => ({ email, password: process.env[`SEED_PASSWORD_${id.toUpperCase()}`] || LOCAL_PASSWORD });

export const ACCOUNTS = {
  koffi: account("koffi", "success2025lord@gmail.com"),
  aminata: account("aminata", "lord2025success@gmail.com"),
  kwame: account("kwame", "emmerson.copychief.dev@gmail.com"),
  aicha: account("aicha", "worldwide.eliteagency229@gmail.com"),
  nadia: account("nadia", "worldwide.eliteagencyy@gmail.com"),
  sadio: account("sadio", "asukadmt@gmail.com"),
  chidi: account("chidi", "emmersondmt.entrepreneur@gmail.com"),
  equipe: account("equipe", "kabadteam@gmail.com"),
} as const;

export type AccountId = keyof typeof ACCOUNTS;
