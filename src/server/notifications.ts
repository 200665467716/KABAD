/*
 * In-app notifications. Written in the same transaction as the action that causes them,
 * then pushed live by the realtime service.
 */
import type { Prisma } from "@/generated/prisma/client";
import { db, type Db } from "./db";
import { notify } from "./realtime-events";

export type NotificationIcon = "clock" | "user" | "message" | "trophy" | "check" | "wallet";
export type NotificationTone = "brand" | "success" | "accent" | "neutral";

export type NotificationInput = { userId: string; actor: string; text: string; href: string; icon: NotificationIcon; tone: NotificationTone };

export async function pushNotifications(tx: Prisma.TransactionClient, items: NotificationInput[]) {
  if (items.length === 0) return;
  await tx.notification.createMany({ data: items });
  await notify(tx, { t: "notification", recipients: [...new Set(items.map((i) => i.userId))] });
}

export type NotificationView = { id: string; actor: string; text: string; href: string; icon: NotificationIcon; tone: NotificationTone; unread: boolean; createdAt: string };

export async function listNotifications(userId: string, prisma: Db = db): Promise<NotificationView[]> {
  const rows = await prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 100 });
  return rows.map((n) => ({
    id: n.id,
    actor: n.actor,
    text: n.text,
    href: n.href,
    icon: n.icon as NotificationIcon,
    tone: n.tone as NotificationTone,
    unread: n.readAt === null,
    createdAt: n.createdAt.toISOString(),
  }));
}

export async function unreadNotifications(userId: string, prisma: Db = db) {
  return prisma.notification.count({ where: { userId, readAt: null } });
}

/** Marks one notification, or all of them when `id` is omitted, as read. */
export async function markNotificationsRead(userId: string, id?: string, prisma: Db = db) {
  await prisma.notification.updateMany({ where: { userId, readAt: null, ...(id ? { id } : {}) }, data: { readAt: new Date() } });
}
