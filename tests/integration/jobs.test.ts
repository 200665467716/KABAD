import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { announcePayableTransfers, closeEndedHackathons, expireInvitations, lapseUnansweredBookings, nudgeMentors, remindRiseEvents, remindSessions } from "@/server/jobs";
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
    await prisma.riseEvent.create({ data: { projectId: "p", title: "Point d’étape", agenda: "…", startsAt: new Date(now.getTime() + 30 * MIN), minutes: 60, meetingUrl: "https://meet.jit.si/x" } });
    expect(await remindRiseEvents(now, prisma)).toBe(1);
    expect(await remindRiseEvents(now, prisma)).toBe(0);
    expect(await notes("yao")).toBe(1);
    expect(await notes("kossi")).toBe(1);
  });
});

describe("hackathons et versements", () => {
  it("un hackathon terminé passe au jury et prévient ses participants", async () => {
    await prisma.hackathon.create({ data: { id: "h", title: "Fintech", organizerName: "FinLab", format: "ONLINE", startsAt: new Date(now.getTime() - 2 * DAY), endsAt: new Date(now.getTime() - MIN), closesAt: new Date(now.getTime() - 3 * DAY), level: "Tous niveaux", stack: "Web", description: "…", publishedAt: now } });
    await prisma.team.create({ data: { hackathonId: "h", name: "Baobab", captainId: "kossi", members: { create: { userId: "kossi", hackathonId: "h" } } } });
    expect(await closeEndedHackathons(now, prisma)).toBe(1);
    expect(await closeEndedHackathons(now, prisma)).toBe(0);
    expect((await prisma.hackathon.findUniqueOrThrow({ where: { id: "h" } })).status).toBe("JURY");
    expect(await notes("kossi")).toBe(1);
  });

  it("annonce à l’équipe KABAD les versements à faire après 48 h de contestation", async () => {
    await prisma.hackathon.create({ data: { id: "h", title: "Fintech", organizerName: "FinLab", format: "ONLINE", startsAt: now, endsAt: now, closesAt: now, level: "Tous niveaux", stack: "Web", description: "…", status: "DONE", resultsAt: new Date(now.getTime() - 49 * HOUR) } });
    await prisma.payout.create({ data: { hackathonId: "h", role: "WINNER", beneficiaryId: "kossi", amount: 60_000 } });
    expect(await announcePayableTransfers(now, prisma)).toBe(1);
    expect(await announcePayableTransfers(now, prisma)).toBe(0);
    expect(await notes("equipe")).toBe(1);
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
