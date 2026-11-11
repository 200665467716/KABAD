/*
 * In-app notifications. Written in the same transaction as the action that causes them,
 * then pushed live by the realtime service.
 */
import { createTranslator } from "next-intl";
import type { Prisma } from "@/generated/prisma/client";
import enMessages from "../../messages/en/notifications.json";
import frMessages from "../../messages/fr/notifications.json";
import { messageValues, type NotificationKey, type NotificationParams } from "@/lib/notification-text";
import { db, type Db } from "./db";
import { notify } from "./realtime-events";

export type NotificationIcon = "clock" | "user" | "message" | "trophy" | "check" | "wallet" | "info" | "users" | "radio";
export type NotificationTone = "brand" | "success" | "accent" | "neutral";

/** A notification is a key of messages/<locale>/notifications.json with its values; the French text is kept too. */
export type NotificationInput = { userId: string; actor: string; key: NotificationKey; params?: NotificationParams; href: string; icon: NotificationIcon; tone: NotificationTone };

const french = createTranslator({ locale: "fr", messages: frMessages, namespace: "notifications.kinds" });
const english = createTranslator({ locale: "en", messages: enMessages, namespace: "notifications.kinds" });

/** The full sentence of a notification ("Awa Diop a accepté ta séance…"), in French or in English. */
export function notificationSentence(n: { actor: string; key: string | null; params: unknown; text: string }, locale: "fr" | "en"): string {
  const say = locale === "en" ? english : french;
  const text = n.key && say.has(n.key as NotificationKey) ? say(n.key as NotificationKey, messageValues(n.params as NotificationParams | null, locale)) : n.text;
  return `${n.actor}${/^[\s:]/.test(text) ? "" : " "}${text}`;
}

export async function pushNotifications(tx: Prisma.TransactionClient, items: NotificationInput[]) {
  if (items.length === 0) return;
  await tx.notification.createMany({
    data: items.map(({ key, params, ...n }) => ({ ...n, key, params: params ?? undefined, text: french(key, messageValues(params, "fr")).slice(0, 300) })),
  });
  await notify(tx, { t: "notification", recipients: [...new Set(items.map((i) => i.userId))] });
}

export type NotificationView = { id: string; actor: string; text: string; key: NotificationKey | null; params: NotificationParams | null; href: string; icon: NotificationIcon; tone: NotificationTone; unread: boolean; createdAt: string };

export async function listNotifications(userId: string, prisma: Db = db): Promise<NotificationView[]> {
  const rows = await prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 100 });
  return rows.map((n) => ({
    id: n.id,
    actor: n.actor,
    text: n.text,
    key: (n.key as NotificationKey | null) ?? null,
    params: (n.params as NotificationParams | null) ?? null,
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
