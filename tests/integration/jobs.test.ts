import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { closeEndedHackathons, expireInvitations, lapseUnansweredBookings, mailNotifications, nudgeMentors, remindRiseEvents, remindSessions } from "@/server/jobs";
import { makeUsers, prisma, resetDb } from "./helpers";

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const now = new Date();
const notes = (userId: string) => prisma.notification.count({ where: { userId } });

beforeEach(async () => {
  await resetDb();
  await makeUsers("Kossi", "Awa", "Yao", "Equipe");
  await prisma.user.update({ where: { id: "equipe" }, data: { isAdmin: true } });
  await prisma.user.update({ where: { id: "awa" }, data: { role: "SENIOR", seniorVerifiedAt: now } });
});
afterAll(() => prisma.$disconnect());

const booking = (data: Record<string, unknown>) =>
  prisma.mentoringBooking.create({ data: { mentorId: "awa", menteeId: "kossi", topic: "API", problem: "Je bloque sur les webhooks.", startsAt: new Date(now.getTime() + DAY), ...data } });

describe("mentorat", () => {
  it("une demande sans réponse à l’heure de la séance expire, et le membre est prévenu une fois", async () => {
    const b = await booking({ startsAt: new Date(now.getTime() - MIN) });
    expect(await lapseUnansweredBookings(now, prisma)).toBe(1);
    expect(await lapseUnansweredBookings(now, prisma)).toBe(0);
    expect((await prisma.mentoringBooking.findUniqueOrThrow({ where: { id: b.id } })).status).toBe("DECLINED");
    expect(await notes("kossi")).toBe(1);
  });

  it("relance le mentor après 48 h, une seule fois", async () => {
    await booking({ createdAt: new Date(now.getTime() - 49 * HOUR), startsAt: new Date(now.getTime() + 3 * DAY) });
    await booking({ startsAt: new Date(now.getTime() + 3 * DAY + HOUR) }); // trop récente
    expect(await nudgeMentors(now, prisma)).toBe(1);
    expect(await nudgeMentors(now, prisma)).toBe(0);
    expect(await notes("awa")).toBe(1);
  });

  it("rappelle la séance aux deux membres dans l’heure qui précède", async () => {
    await booking({ status: "ACCEPTED", startsAt: new Date(now.getTime() + 40 * MIN) });
    await booking({ status: "ACCEPTED", startsAt: new Date(now.getTime() + 3 * HOUR) });
    expect(await remindSessions(now, prisma)).toBe(1);
    expect(await remindSessions(now, prisma)).toBe(0);
    expect(await notes("kossi")).toBe(1);
    expect(await notes("awa")).toBe(1);
  });
});

describe("Africa Rise-Up", () => {
  it("rappelle un événement à chaque membre du projet", async () => {
    await prisma.riseProject.create({ data: { id: "p", name: "Forages", domain: "WATER", summary: "s", problem: "p", initiatorId: "yao", members: { create: [{ userId: "yao" }, { userId: "kossi" }] } } });
    await prisma.riseEvent.create({ data: { projectId: "p", title: "Point d’étape", agenda: "…", startsAt: new Date(now.getTime() + 30 * MIN), minutes: 60, meetingUrl: "https://meet.google.com/abc-defg-hij" } });
    expect(await remindRiseEvents(now, prisma)).toBe(1);
    expect(await remindRiseEvents(now, prisma)).toBe(0);
    expect(await notes("yao")).toBe(1);
    expect(await notes("kossi")).toBe(1);
  });
});

describe("hackathons", () => {
  it("un hackathon terminé passe au jury et prévient ses participants", async () => {
    await prisma.hackathon.create({ data: { id: "h", title: "Fintech", organizerName: "FinLab", format: "ONLINE", startsAt: new Date(now.getTime() - 2 * DAY), endsAt: new Date(now.getTime() - MIN), closesAt: new Date(now.getTime() - 3 * DAY), level: "Tous niveaux", stack: "Web", description: "…", publishedAt: now } });
    await prisma.team.create({ data: { hackathonId: "h", name: "Baobab", captainId: "kossi", members: { create: { userId: "kossi", hackathonId: "h" } } } });
    expect(await closeEndedHackathons(now, prisma)).toBe(1);
    expect(await closeEndedHackathons(now, prisma)).toBe(0);
    expect((await prisma.hackathon.findUniqueOrThrow({ where: { id: "h" } })).status).toBe("JURY");
    expect(await notes("kossi")).toBe(1);
  });
});

describe("invitations", () => {
  it("une invitation sans réponse depuis 30 jours disparaît", async () => {
    await prisma.invitation.create({ data: { fromId: "kossi", toId: "yao", message: "Salut", createdAt: new Date(now.getTime() - 31 * DAY) } });
    await prisma.invitation.create({ data: { fromId: "kossi", toId: "awa", message: "Bonjour" } });
    expect(await expireInvitations(now, prisma)).toBe(1);
    expect(await prisma.invitation.count()).toBe(1);
  });
});

describe("notifications par e-mail", () => {
  type Sent = { to: string; subject: string; text: string };
  const outbox = () => {
    const sent: Sent[] = [];
    return { sent, send: async (to: string, subject: string, text: string) => void sent.push({ to, subject, text }) };
  };
  const note = (data: Record<string, unknown> = {}) =>
    prisma.notification.create({
      data: { userId: "kossi", actor: "Awa Diop", key: "bookingAccepted", params: { at: new Date(now.getTime() + DAY).toISOString(), tz: "Africa/Lome", link: "https://meet.google.com/abc-defg-hij" }, text: "a accepté ta séance.", href: "/mentorat/seances/s1", icon: "check", tone: "success", ...data },
    });
  beforeEach(() => prisma.user.updateMany({ data: { emailVerifiedAt: now } }));

  it("envoie la séance acceptée avec le lien Google Meet, dans la langue du membre, une seule fois", async () => {
    await note();
    const box = outbox();
    expect(await mailNotifications(now, prisma, box.send)).toBe(1);
    expect(await mailNotifications(now, prisma, box.send)).toBe(0);
    expect(box.sent).toHaveLength(1);
    expect(box.sent[0].to).toBe("kossi@test.kabad");
    expect(box.sent[0].subject).toMatch(/^KABAD · Awa Diop a accepté ta séance du /);
    expect(box.sent[0].text).toContain("Lien Google Meet : https://meet.google.com/abc-defg-hij");
    expect(box.sent[0].text).toContain("/mentorat/seances/s1");

    await prisma.user.update({ where: { id: "kossi" }, data: { locale: "en" } });
    await note();
    await mailNotifications(now, prisma, box.send);
    expect(box.sent[1].text).toContain("Google Meet link : https://meet.google.com/abc-defg-hij");
    expect(box.sent[1].text).toContain("/en/mentorat/seances/s1");
  });

  it("n’envoie rien si le membre a coupé les e-mails, n’a pas confirmé son adresse, ou si la notification n’en vaut pas un", async () => {
    await prisma.user.update({ where: { id: "kossi" }, data: { emailNotifications: false } });
    await prisma.user.update({ where: { id: "yao" }, data: { emailVerifiedAt: null } });
    await note();
    await note({ userId: "yao" });
    await note({ userId: "awa", key: "testJoined", params: { title: "Kalo" } });
    await note({ userId: "awa", createdAt: new Date(now.getTime() - 25 * HOUR) }); // trop ancienne
    const box = outbox();
    expect(await mailNotifications(now, prisma, box.send)).toBe(0);
    expect(box.sent).toHaveLength(0);
    // Réactiver les e-mails ne fait pas repartir les anciennes notifications.
    await prisma.user.update({ where: { id: "kossi" }, data: { emailNotifications: true } });
    expect(await mailNotifications(now, prisma, box.send)).toBe(0);
  });

  it("deux passages en même temps n’envoient qu’un e-mail, et un envoi raté repart au passage suivant", async () => {
    await note();
    const box = outbox();
    const counts = await Promise.all([mailNotifications(now, prisma, box.send), mailNotifications(now, prisma, box.send)]);
    expect(counts[0] + counts[1]).toBe(1);

    await note({ userId: "awa" });
    const failing = async () => {
      throw new Error("SMTP indisponible");
    };
    expect(await mailNotifications(now, prisma, failing)).toBe(0);
    expect(await mailNotifications(now, prisma, box.send)).toBe(1);
    expect(box.sent.map((m) => m.to)).toEqual(["kossi@test.kabad", "awa@test.kabad"]);
  });
});

