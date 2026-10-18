import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { cache } from "react";
import { db, type Db } from "./db";
import { DomainError, unauthorized } from "./errors";

export const SESSION_COOKIE = "kabad_session";
const SESSION_DAYS = 30;

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

/** Creates a session and returns the raw token for the cookie. Only its hash is stored. */
export async function createSession(userId: string, prisma: Db = db) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 3600 * 1000);
  await prisma.session.create({ data: { id: hashToken(token), userId, expiresAt } });
  return { token, expiresAt };
}

export async function setSessionCookie(token: string, expiresAt: Date) {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function userFromToken(token: string | undefined, prisma: Db = db) {
  if (!token) return null;
  const session = await prisma.session.findUnique({ where: { id: hashToken(token) }, include: { user: true } });
  if (!session || session.expiresAt <= new Date()) return null;
  return session.user;
}

/** The signed-in member for this request, or null. Deduplicated within one render. */
export const getCurrentUser = cache(async () => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return userFromToken(token);
});

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw unauthorized();
  return user;
}

export async function destroySession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { id: hashToken(token) } });
  store.delete(SESSION_COOKIE);
}

let dummyHash: Promise<string> | null = null;

export async function login(email: string, password: string) {
  const user = await db.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  // Compare even when the account does not exist, so the answer time does not reveal it.
  dummyHash ??= hashPassword("kabad-timing-guard");
  const ok = await verifyPassword(password, user?.passwordHash ?? (await dummyHash));
  if (!user || !ok) throw new DomainError("bad_credentials", "E-mail ou mot de passe incorrect.", 401);
  return user;
}
