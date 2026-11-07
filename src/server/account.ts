/*
 * The member's own account: e-mail check, password reset and change, sessions, export and deletion.
 */
import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import type { EmailTokenPurpose } from "@/generated/prisma/client";
import { hashPassword, verifyPassword } from "./auth";
import { db, type Db } from "./db";
import { DomainError } from "./errors";
import { mailLocale, passwordResetMail, verificationMail } from "./emails";
import { sendMail } from "./mailer";

const hash = (token: string) => createHash("sha256").update(token).digest("hex");

async function issueToken(userId: string, purpose: EmailTokenPurpose, minutes: number, prisma: Db, code?: string) {
  const token = randomBytes(32).toString("base64url");
  // A new link replaces the previous ones.
  await prisma.emailToken.deleteMany({ where: { userId, purpose, usedAt: null } });
  await prisma.emailToken.create({ data: { id: hash(token), userId, purpose, expiresAt: new Date(Date.now() + minutes * 60_000), codeHash: code ? hash(code) : null } });
  return token;
}

/** The confirmation code (and its link) stays valid 10 minutes (A3e). */
export const CODE_MINUTES = 10;
const BAD_CODE = `Ce code est incorrect ou a expiré. Un code reste valable ${CODE_MINUTES} minutes.`;

/** Wrong codes allowed before the code is locked and a new one must be requested. */
export const CODE_ATTEMPTS = 5;

async function consumeToken(token: string, purpose: EmailTokenPurpose, prisma: Db) {
  const row = await prisma.emailToken.findUnique({ where: { id: hash(token) } });
  if (!row || row.purpose !== purpose || row.usedAt || row.expiresAt <= new Date()) {
    throw new DomainError("bad_token", "Ce lien n’est plus valable. Demandes-en un nouveau.", 400);
  }
  const { count } = await prisma.emailToken.updateMany({ where: { id: row.id, usedAt: null }, data: { usedAt: new Date() } });
  if (!count) throw new DomainError("bad_token", "Ce lien a déjà servi. Demandes-en un nouveau.", 400);
  return row.userId;
}

/** Sends a 6-digit code (typed in the sign-up screen) and the same check as a link (opened from the e-mail). */
export async function sendVerificationEmail(userId: string, prisma: Db = db) {
  const u = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { email: true, name: true, locale: true, emailVerifiedAt: true } });
  if (u.emailVerifiedAt) return { alreadyVerified: true };
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const token = await issueToken(userId, "VERIFY", CODE_MINUTES, prisma, code);
  const mail = verificationMail(mailLocale(u.locale), u.name, code, token);
  await sendMail(u.email, mail.subject, mail.text);
  return { alreadyVerified: false };
}

export async function verifyEmail(token: string, prisma: Db = db) {
  const userId = await consumeToken(token, "VERIFY", prisma);
  await prisma.user.update({ where: { id: userId }, data: { emailVerifiedAt: new Date() } });
  return { userId };
}

/** Checks the code typed by the signed-in member. After 5 wrong codes, a new one must be requested. */
export async function verifyEmailCode(userId: string, code: string, prisma: Db = db) {
  const row = await prisma.emailToken.findFirst({ where: { userId, purpose: "VERIFY", usedAt: null, codeHash: { not: null } }, orderBy: { createdAt: "desc" } });
  if (!row || row.expiresAt <= new Date()) throw new DomainError("bad_code", BAD_CODE, 400, "code");
  if (row.attempts >= CODE_ATTEMPTS) throw new DomainError("locked", "Trop d’essais. Demande un nouveau code.", 429, "code");
  const ok = timingSafeEqual(Buffer.from(hash(code.trim())), Buffer.from(row.codeHash!));
  if (!ok) {
    await prisma.emailToken.update({ where: { id: row.id }, data: { attempts: { increment: 1 } } });
    throw new DomainError("bad_code", BAD_CODE, 400, "code");
  }
  await prisma.$transaction([
    prisma.emailToken.update({ where: { id: row.id }, data: { usedAt: new Date() } }),
    prisma.user.update({ where: { id: userId }, data: { emailVerifiedAt: new Date() } }),
  ]);
  return { ok: true };
}

/** Changes the address before it is confirmed (typo at sign-up), then sends a new code. */
export async function changeUnverifiedEmail(userId: string, email: string, prisma: Db = db) {
  const u = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { emailVerifiedAt: true } });
  if (u.emailVerifiedAt) throw new DomainError("verified", "Ton adresse est déjà confirmée.", 409);
  const normalized = email.trim().toLowerCase();
  if (await prisma.user.count({ where: { email: normalized, id: { not: userId } } })) throw new DomainError("email_taken", "Cette adresse est déjà utilisée.", 409, "email");
  await prisma.user.update({ where: { id: userId }, data: { email: normalized } });
  return sendVerificationEmail(userId, prisma);
}

/** Remembers the interface language on the account, so it follows the member across devices. */
export async function setLocale(userId: string, locale: "fr" | "en", prisma: Db = db) {
  await prisma.user.update({ where: { id: userId }, data: { locale } });
}

/** Always answers the same way, so the form does not reveal which addresses have an account. */
export async function requestPasswordReset(email: string, prisma: Db = db) {
  const u = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() }, select: { id: true, name: true, email: true, locale: true, suspendedAt: true } });
  if (!u || u.suspendedAt) return;
  const token = await issueToken(u.id, "RESET_PASSWORD", 60, prisma);
  const mail = passwordResetMail(mailLocale(u.locale), u.name, token);
  await sendMail(u.email, mail.subject, mail.text);
}

/** Sets the new password and closes every session: whoever knew the old one is signed out. */
export async function resetPassword(token: string, password: string, prisma: Db = db) {
  const userId = await consumeToken(token, "RESET_PASSWORD", prisma);
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { passwordHash: await hashPassword(password), emailVerifiedAt: new Date() } }),
    prisma.session.deleteMany({ where: { userId } }),
  ]);
  return { userId };
}

export async function changePassword(userId: string, currentSessionId: string, current: string, next: string, prisma: Db = db) {
  const u = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { passwordHash: true } });
  if (u.passwordHash && !(await verifyPassword(current, u.passwordHash))) throw new DomainError("bad_password", "Le mot de passe actuel est incorrect.", 400, "current");
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { passwordHash: await hashPassword(next) } }),
    prisma.session.deleteMany({ where: { userId, NOT: { id: currentSessionId } } }),
  ]);
}

export async function signOutEverywhere(userId: string, prisma: Db = db) {
  await prisma.session.deleteMany({ where: { userId } });
}

/** Everything the member wrote or declared, in one JSON file. */
export async function exportData(userId: string, prisma: Db = db) {
  const [user, messages, invitations, bookings, teams, badgeRequests, riseProjects, risePosts, reports, testApps] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { id: true, email: true, name: true, role: true, level: true, city: true, country: true, diaspora: true, years: true, headline: true, bio: true, stack: true, goals: true, locale: true, timeZone: true, profileLink: true, githubLogin: true, createdAt: true },
    }),
    prisma.message.findMany({ where: { authorId: userId }, select: { conversationId: true, body: true, createdAt: true } }),
    prisma.invitation.findMany({ where: { OR: [{ fromId: userId }, { toId: userId }] }, select: { fromId: true, toId: true, message: true, status: true, createdAt: true } }),
    prisma.mentoringBooking.findMany({ where: { OR: [{ mentorId: userId }, { menteeId: userId }] }, select: { mentorId: true, menteeId: true, startsAt: true, minutes: true, topic: true, problem: true, status: true, createdAt: true } }),
    prisma.teamMember.findMany({ where: { userId }, select: { hackathonId: true, skill: true, team: { select: { name: true, submission: true } } } }),
    prisma.mentorBadgeRequest.findMany({ where: { userId } }),
    prisma.riseMember.findMany({ where: { userId }, select: { projectId: true, skill: true, joinedAt: true } }),
    prisma.risePost.findMany({ where: { authorId: userId }, select: { projectId: true, body: true, createdAt: true } }),
    prisma.testReport.findMany({ where: { testerId: userId }, select: { testAppId: true, device: true, answers: true, remarks: true, status: true, createdAt: true } }),
    prisma.testApp.findMany({ where: { ownerId: userId } }),
  ]);
  return { exportedAt: new Date().toISOString(), user, messages, invitations, mentoring: bookings, hackathons: teams, badgeRequests, riseProjects, risePosts, testReports: reports, testApps };
}

/**
 * Deletes the account. Messages stay in the conversations of the others, without author;
 * everything else that belongs only to the member is deleted.
 */
export async function deleteAccount(userId: string, password: string | undefined, prisma: Db = db) {
  const u = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { passwordHash: true, isAdmin: true } });
  if (u.passwordHash && !(password && (await verifyPassword(password, u.passwordHash)))) throw new DomainError("bad_password", "Le mot de passe est incorrect.", 400, "password");
  if (u.isAdmin && (await prisma.user.count({ where: { isAdmin: true } })) <= 1) throw new DomainError("last_admin", "Tu es le dernier administrateur : nommes-en un autre avant de partir.", 409);
  await prisma.$transaction(async (tx) => {
    await tx.message.updateMany({ where: { authorId: userId }, data: { authorId: null } });
    // Groups the member created pass to the longest-standing member.
    const owned = await tx.conversation.findMany({ where: { createdById: userId, kind: "GROUP" }, select: { id: true } });
    for (const g of owned) {
      const heir = await tx.conversationMember.findFirst({ where: { conversationId: g.id, NOT: { userId } }, orderBy: { joinedAt: "asc" } });
      if (heir) {
        await tx.conversationMember.update({ where: { conversationId_userId: { conversationId: g.id, userId: heir.userId } }, data: { role: "OWNER" } });
        await tx.conversation.update({ where: { id: g.id }, data: { createdById: heir.userId } });
      }
    }
    await tx.user.delete({ where: { id: userId } });
  });
}
