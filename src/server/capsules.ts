/* Capsules: what a verified senior learned, readable in under 5 minutes. */
import { db, type Db } from "./db";
import { forbidden, notFound } from "./errors";
import type { CapsuleView } from "@/lib/domain-types";

/** About 200 words a minute, at least one minute. */
export const readingMinutes = (text: string) => Math.max(1, Math.round(text.trim().split(/\s+/).length / 200));

const include = { author: { select: { id: true, name: true } } } as const;

export async function listCapsules(prisma: Db = db): Promise<CapsuleView[]> {
  const rows = await prisma.capsule.findMany({ include, orderBy: { createdAt: "desc" }, take: 100 });
  return rows.map((c) => ({ ...c, createdAt: c.createdAt.toISOString() }));
}

export async function readCapsule(id: string, prisma: Db = db): Promise<CapsuleView> {
  const c = await prisma.capsule.update({ where: { id }, data: { reads: { increment: 1 } }, include }).catch(() => null);
  if (!c) throw notFound("Capsule introuvable.");
  return { ...c, createdAt: c.createdAt.toISOString() };
}

export async function publishCapsule(authorId: string, input: { title: string; theme: "BACKEND" | "MOBILE" | "CAREER"; body: string; code?: string; tags: string[] }, prisma: Db = db) {
  const author = await prisma.user.findUnique({ where: { id: authorId }, select: { role: true, seniorVerifiedAt: true } });
  if (author?.role !== "SENIOR" || !author.seniorVerifiedAt) throw forbidden("Les capsules sont écrites par les seniors vérifiés.");
  const c = await prisma.capsule.create({
    data: { authorId, title: input.title, theme: input.theme, body: input.body, code: input.code?.trim() || null, tags: input.tags, minutes: readingMinutes(`${input.body} ${input.code ?? ""}`) },
  });
  return { id: c.id };
}
