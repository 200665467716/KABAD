/*
 * The member's own account: e-mail check, password reset and change, sessions, export and deletion.
 */
import { createHash, randomBytes } from "node:crypto";
import type { EmailTokenPurpose } from "@/generated/prisma/client";
import { hashPassword, verifyPassword } from "./auth";
import { db, type Db } from "./db";
import { DomainError } from "./errors";
import { sendMail } from "./mailer";

const hash = (token: string) => createHash("sha256").update(token).digest("hex");
const appUrl = () => (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");

async function issueToken(userId: string, purpose: EmailTokenPurpose, hours: number, prisma: Db) {
  const token = randomBytes(32).toString("base64url");
  // A new link replaces the previous ones.
  await prisma.emailToken.deleteMany({ where: { userId, purpose, usedAt: null } });
  await prisma.emailToken.create({ data: { id: hash(token), userId, purpose, expiresAt: new Date(Date.now() + hours * 3600_000) } });
  return token;
}

async function consumeToken(token: string, purpose: EmailTokenPurpose, prisma: Db) {
  const row = await prisma.emailToken.findUnique({ where: { id: hash(token) } });
  if (!row || row.purpose !== purpose || row.usedAt || row.expiresAt <= new Date()) {
    throw new DomainError("bad_token", "Ce lien n’est plus valable. Demandez-en un nouveau.", 400);
  }
  const { count } = await prisma.emailToken.updateMany({ where: { id: row.id, usedAt: null }, data: { usedAt: new Date() } });
  if (!count) throw new DomainError("bad_token", "Ce lien a déjà servi. Demandez-en un nouveau.", 400);
  return row.userId;
}

export async function sendVerificationEmail(userId: string, prisma: Db = db) {
  const u = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { email: true, name: true, emailVerifiedAt: true } });
  if (u.emailVerifiedAt) return { alreadyVerified: true };
  const token = await issueToken(userId, "VERIFY", 48, prisma);
  await sendMail(
    u.email,
    "Confirmez votre adresse e-mail KABAD",
    `Bonjour ${u.name.split(" ")[0]},\n\nConfirmez votre adresse pour écrire aux membres de KABAD :\n${appUrl()}/verifier-email?jeton=${token}\n\nCe lien est valable 48 heures. Si vous n’avez pas créé de compte, ignorez ce message.\n\nL’équipe KABAD`,
  );
  return { alreadyVerified: false };
}

export async function verifyEmail(token: string, prisma: Db = db) {
  const userId = await consumeToken(token, "VERIFY", prisma);
  await prisma.user.update({ where: { id: userId }, data: { emailVerifiedAt: new Date() } });
  return { userId };
}

/** Always answers the same way, so the form does not reveal which addresses have an account. */
export async function requestPasswordReset(email: string, prisma: Db = db) {
  const u = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() }, select: { id: true, name: true, email: true, suspendedAt: true } });
  if (!u || u.suspendedAt) return;
  const token = await issueToken(u.id, "RESET_PASSWORD", 1, prisma);
  await sendMail(
    u.email,
    "Réinitialiser votre mot de passe KABAD",
    `Bonjour ${u.name.split(" ")[0]},\n\nPour choisir un nouveau mot de passe, ouvrez ce lien :\n${appUrl()}/reinitialiser?jeton=${token}\n\nIl est valable une heure. Si vous n’avez rien demandé, ignorez ce message : votre mot de passe ne change pas.\n\nL’équipe KABAD`,
  );
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
  const [user, messages, invitations, pairs, submissions, reports, capsules, testApps] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { id: true, email: true, name: true, role: true, city: true, country: true, diaspora: true, years: true, headline: true, bio: true, stack: true, profileLink: true, githubLogin: true, createdAt: true },
    }),
    prisma.message.findMany({ where: { authorId: userId }, select: { conversationId: true, body: true, createdAt: true } }),
    prisma.invitation.findMany({ where: { OR: [{ fromId: userId }, { toId: userId }] }, select: { fromId: true, toId: true, message: true, status: true, createdAt: true } }),
    prisma.pair.findMany({ where: { OR: [{ mentorId: userId }, { menteeId: userId }] }, include: { sessions: true } }),
    prisma.submission.findMany({ where: { userId } }),
    prisma.testReport.findMany({ where: { testerId: userId }, select: { testAppId: true, device: true, answers: true, remarks: true, status: true, createdAt: true } }),
    prisma.capsule.findMany({ where: { authorId: userId } }),
    prisma.testApp.findMany({ where: { ownerId: userId } }),
  ]);
  return { exportedAt: new Date().toISOString(), user, messages, invitations, pairs, submissions, testReports: reports, capsules, testApps };
}

/**
 * Deletes the account. Messages stay in the conversations of the others, without author;
 * everything else that belongs only to the member is deleted.
 */
export async function deleteAccount(userId: string, password: string | undefined, prisma: Db = db) {
  const u = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { passwordHash: true, isAdmin: true } });
  if (u.passwordHash && !(password && (await verifyPassword(password, u.passwordHash)))) throw new DomainError("bad_password", "Le mot de passe est incorrect.", 400, "password");
  if (u.isAdmin && (await prisma.user.count({ where: { isAdmin: true } })) <= 1) throw new DomainError("last_admin", "Vous êtes le dernier administrateur : nommez-en un autre avant de partir.", 409);
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
