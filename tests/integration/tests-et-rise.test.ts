import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { DomainError } from "@/server/errors";
import { createTestApp, joinTest, leaveTest, setStep } from "@/server/community-tests";
import { closeRoom, createEvent, createProject, getEvent, getProject, joinProject, leaveProject, openRoom } from "@/server/rise";
import { remindRiseEvents } from "@/server/jobs";
import { makeUsers, prisma, resetDb } from "./helpers";

async function refused(p: Promise<unknown>, code: string) {
  await expect(p).rejects.toBeInstanceOf(DomainError);
  await expect(p).rejects.toMatchObject({ code });
}

const MEET = "https://meet.google.com/abc-defg-hij";
const HOUR = 3600_000;
const app = { name: "Kalo", platforms: ["WEB" as const], url: "https://kalo.tg", minutes: 10, slots: 5, pitch: "Un carnet de dépenses partagé.", task: "Ajouter une dépense.", steps: ["Créer un compte", "Ajouter une dépense", "Partager le budget"], questions: [] };
const project = { name: "Forages au Sahel", domain: "WATER" as const, summary: "Une carte des forages.", problem: "x".repeat(40), skills: [] };

beforeEach(async () => {
  await resetDb();
  await makeUsers("Yao", "Fatou", "Kossi");
});
afterAll(() => prisma.$disconnect());

describe("tests d’apps : corrections du 13 novembre", () => {
  it("seules les annonces publiées comptent dans la limite de 5 par jour", async () => {
    const wrong = { ...app, questions: [{ q: "Quelle couleur ?", options: ["Vert", "Bleu"], answer: "Rouge" }] };
    // Six annonces refusées (bonne réponse hors des choix) : aucune ne compte.
    for (let i = 0; i < 6; i++) await refused(createTestApp("yao", wrong, prisma), "answer");
    expect(await prisma.rateLimit.findUnique({ where: { key: "test-app:yao" } })).toBeNull();
    for (let i = 0; i < 5; i++) await createTestApp("yao", { ...app, name: `Kalo ${i}` }, prisma);
    // La 6e est refusée, et son compteur repart avec elle : il reste à 5.
    await refused(createTestApp("yao", { ...app, name: "Kalo 6" }, prisma), "rate_limited");
    expect((await prisma.rateLimit.findUniqueOrThrow({ where: { key: "test-app:yao" } })).count).toBe(5);
    expect(await prisma.testApp.count({ where: { ownerId: "yao" } })).toBe(5);
  });

  it("des coches envoyées en même temps sont toutes gardées", async () => {
    const { id } = await createTestApp("yao", app, prisma);
    await joinTest("fatou", id, prisma);
    await Promise.all([0, 1, 2].map((i) => setStep("fatou", id, i, true, prisma)));
    const p = await prisma.testParticipant.findUniqueOrThrow({ where: { testAppId_userId: { testAppId: id, userId: "fatou" } } });
    expect([...p.doneSteps].sort()).toEqual([0, 1, 2]);
    // Cocher et décocher vite : la dernière demande l’emporte, les autres coches restent.
    await setStep("fatou", id, 2, false, prisma);
    expect((await setStep("fatou", id, 1, true, prisma)).doneSteps).toEqual([0, 1]);
  });

  it("rendre sa place puis revenir ne prévient l’auteur qu’une fois", async () => {
    const { id } = await createTestApp("yao", app, prisma);
    await joinTest("fatou", id, prisma);
    await leaveTest("fatou", id, prisma);
    await joinTest("fatou", id, prisma);
    expect(await prisma.notification.count({ where: { userId: "yao", key: "testJoined" } })).toBe(1);
  });
});

describe("Africa Rise-Up : corrections du 13 novembre", () => {
  it("quitter puis rejoindre un projet ne prévient l’initiateur qu’une fois", async () => {
    const { id } = await createProject("yao", project, prisma);
    await joinProject("fatou", id, {}, prisma);
    await leaveProject("fatou", id, prisma);
    await joinProject("fatou", id, {}, prisma);
    expect(await prisma.notification.count({ where: { userId: "yao", key: "riseJoined" } })).toBe(1);
  });

  it("un événement à venir s’annule : il quitte le projet, son rappel ne part pas, les membres prévenus le savent", async () => {
    const { id } = await createProject("yao", project, prisma);
    await joinProject("fatou", id, {}, prisma);
    await joinProject("kossi", id, {}, prisma);
    const startsAt = new Date(Date.now() + 3 * HOUR).toISOString();
    const e = await createEvent("fatou", id, { title: "Point d’étape", agenda: "Avancement.", startsAt, minutes: 60, meetingUrl: MEET, notify: true }, prisma);

    // Ni un autre membre, ni après coup : seuls son auteur et l’initiateur l’annulent.
    await refused(closeRoom("kossi", id, e.id, prisma), "forbidden");
    expect(await closeRoom("yao", id, e.id, prisma)).toMatchObject({ cancelled: true });
    expect(await getEvent("fatou", id, e.id, prisma)).toMatchObject({ ended: true, cancelled: true, canClose: false });
    expect((await getProject("kossi", id, prisma)).event).toBeNull();
    expect(await prisma.notification.count({ where: { key: "riseEventCancelled", userId: { in: ["fatou", "kossi"] } } })).toBe(2);
    expect(await prisma.notification.count({ where: { key: "riseEventCancelled", userId: "yao" } })).toBe(0);
    expect(await remindRiseEvents(new Date(Date.now() + 2.5 * HOUR), prisma)).toBe(0);
    await refused(closeRoom("yao", id, e.id, prisma), "over");
  });

  it("un salon fermé n’est pas compté comme annulé", async () => {
    const { id } = await createProject("yao", project, prisma);
    const room = await openRoom("yao", id, { meetingUrl: MEET }, prisma);
    expect(await closeRoom("yao", id, room.id, prisma)).toMatchObject({ cancelled: false });
    expect(await getEvent("yao", id, room.id, prisma)).toMatchObject({ ended: true, cancelled: false });
  });

  it("un événement à moins d’une heure : l’annonce tient lieu de rappel", async () => {
    const { id } = await createProject("yao", project, prisma);
    await joinProject("fatou", id, {}, prisma);
    const startsAt = new Date(Date.now() + 40 * 60_000).toISOString();
    await createEvent("yao", id, { title: "Point QA", agenda: "Les derniers tests.", startsAt, minutes: 30, meetingUrl: MEET, notify: true }, prisma);
    expect(await remindRiseEvents(new Date(), prisma)).toBe(0);
    expect(await prisma.notification.count({ where: { userId: "fatou", key: { in: ["riseEvent", "riseEventSoon"] } } })).toBe(1);
  });
});
