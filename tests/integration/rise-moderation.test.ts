import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { DomainError } from "@/server/errors";
import { dashboard, resolveReport } from "@/server/admin";
import { createHackathon, getHackathon, publishHackathon, rejectHackathon } from "@/server/hackathons";
import { createGroup, getConversation, removeMessage, sendMessage } from "@/server/messaging";
import { addPost, answerRoom, createEvent, createProject, getEvent, getProject, getThread, joinProject, openRoom, reportPost, setCoLead } from "@/server/rise";
import { makeContacts, makeUsers, prisma, resetDb } from "./helpers";

/*
 * Remarques du 14 novembre (P5) : l'initiateur d'un projet Rise-Up nomme des co-responsables ; eux seuls
 * programment les événements ; le salon proposé par un contributeur attend leur validation ; un responsable
 * qui signale un message le masque tout de suite, et seule l'équipe KABAD le rétablit ; dans un groupe,
 * le responsable retire un message. L'équipe refuse un hackathon avec une raison (P7).
 */

async function refused(p: Promise<unknown>, code: string) {
  await expect(p).rejects.toBeInstanceOf(DomainError);
  await expect(p).rejects.toMatchObject({ code });
}

const MEET = "https://meet.google.com/abc-defg-hij";
const project = { name: "Forages au Sahel", domain: "WATER" as const, summary: "Une carte des forages.", problem: "x".repeat(40), skills: [] };
const notes = (userId: string, key: string) => prisma.notification.count({ where: { userId, key } });

beforeEach(async () => {
  await resetDb();
  await makeUsers("Yao", "Fatou", "Kossi", "Awa", "Equipe");
  await prisma.user.update({ where: { id: "equipe" }, data: { isAdmin: true } });
});
afterAll(() => prisma.$disconnect());

async function projectWithMembers() {
  const { id } = await createProject("yao", project, prisma);
  for (const u of ["fatou", "kossi"]) await joinProject(u, id, {}, prisma);
  return id;
}

describe("Rise-Up : co-responsables", () => {
  it("seul l'initiateur nomme un co-responsable, choisi parmi les membres, qui est prévenu", async () => {
    const id = await projectWithMembers();
    await refused(setCoLead("fatou", id, "kossi", true, prisma), "forbidden");
    await refused(setCoLead("yao", id, "awa", true, prisma), "not_found");
    await setCoLead("yao", id, "fatou", true, prisma);
    expect(await notes("fatou", "riseCoLead")).toBe(1);
    const p = await getProject("yao", id, prisma);
    expect(p.people.find((m) => m.id === "fatou")?.role).toBe("co_lead");
    expect((await getProject("fatou", id, prisma)).viewerRole).toBe("co_lead");
    expect((await getProject("kossi", id, prisma)).viewerRole).toBe("member");
    // Le rôle se retire aussi.
    await setCoLead("yao", id, "fatou", false, prisma);
    expect((await getProject("fatou", id, prisma)).viewerRole).toBe("member");
  });

  it("seuls l'initiateur et les co-responsables programment un événement", async () => {
    const id = await projectWithMembers();
    const event = { title: "Point d’étape", agenda: "Avancement.", startsAt: new Date(Date.now() + 3 * 3600_000).toISOString(), minutes: 60, meetingUrl: MEET, notify: true };
    await refused(createEvent("kossi", id, event, prisma), "forbidden");
    await setCoLead("yao", id, "fatou", true, prisma);
    await createEvent("fatou", id, event, prisma);
    await createEvent("yao", id, event, prisma);
    expect((await getProject("kossi", id, prisma)).events).toHaveLength(2);
  });
});

describe("Rise-Up : salons proposés par un contributeur", () => {
  it("un salon proposé reste caché jusqu'à sa validation, puis s'ouvre et prévient les membres", async () => {
    const id = await projectWithMembers();
    await setCoLead("yao", id, "fatou", true, prisma);
    const room = await openRoom("kossi", id, { title: "Point capteurs", meetingUrl: MEET }, prisma);
    expect(room.pending).toBe(true);
    // Les responsables sont prévenus, pas les membres ; le salon n'est pas encore sur le projet.
    expect(await notes("yao", "roomProposed")).toBe(1);
    expect(await notes("fatou", "roomProposed")).toBe(1);
    expect(await prisma.notification.count({ where: { key: "roomLive" } })).toBe(0);
    expect((await getProject("kossi", id, prisma)).event).toBeNull();
    expect((await getProject("kossi", id, prisma)).pendingRooms).toHaveLength(1);
    expect((await getProject("fatou", id, prisma)).pendingRooms).toHaveLength(1);
    await joinProject("awa", id, {}, prisma);
    expect((await getProject("awa", id, prisma)).pendingRooms).toHaveLength(0);
    await refused(getEvent("awa", id, room.id, prisma), "not_found");
    // Une seule proposition à la fois par membre ; un simple membre ne valide pas.
    await refused(openRoom("kossi", id, { meetingUrl: MEET }, prisma), "room_pending");
    await refused(answerRoom("kossi", id, room.id, true, prisma), "forbidden");

    await answerRoom("fatou", id, room.id, true, prisma);
    expect((await getProject("awa", id, prisma)).event).toMatchObject({ live: true, title: "Point capteurs" });
    expect(await notes("kossi", "roomLive")).toBe(1);
    expect(await notes("awa", "roomLive")).toBe(1);
    expect(await notes("fatou", "roomLive")).toBe(0);
    await refused(answerRoom("yao", id, room.id, false, prisma), "answered");
  });

  it("un salon refusé disparaît et son auteur est prévenu ; un responsable ouvre le sien tout de suite", async () => {
    const id = await projectWithMembers();
    const room = await openRoom("kossi", id, { meetingUrl: MEET }, prisma);
    await answerRoom("yao", id, room.id, false, prisma);
    expect(await notes("kossi", "roomRefused")).toBe(1);
    expect((await getProject("kossi", id, prisma)).pendingRooms).toHaveLength(0);
    const own = await openRoom("yao", id, { meetingUrl: MEET }, prisma);
    expect(own.pending).toBe(false);
    expect((await getEvent("kossi", id, own.id, prisma)).live).toBe(true);
  });
});

describe("Rise-Up : signalement des messages du projet", () => {
  it("un membre signale sans masquer ; un responsable masque avec un justificatif ; seule l'équipe rétablit", async () => {
    const id = await projectWithMembers();
    const { id: postId } = await addPost("kossi", id, { body: "Message hors sujet" }, prisma);

    expect(await reportPost("fatou", postId, { reason: "Autre", block: false }, prisma)).toMatchObject({ hidden: false });
    expect((await getProject("fatou", id, prisma)).posts).toHaveLength(1);

    await refused(reportPost("yao", postId, { reason: "Autre", details: "Bof", block: false }, prisma), "reason_required");
    expect(await reportPost("yao", postId, { reason: "Autre", details: "Publicité sans rapport avec le projet.", block: false }, prisma)).toMatchObject({ hidden: true });
    expect((await getProject("fatou", id, prisma)).posts).toHaveLength(0);
    await refused(getThread("fatou", id, postId, prisma), "not_found");
    const post = await prisma.risePost.findUniqueOrThrow({ where: { id: postId } });
    expect(post).toMatchObject({ hiddenById: "yao", hiddenReason: "Publicité sans rapport avec le projet." });

    // L'équipe KABAD le fait réapparaître ; un membre ne le peut pas.
    const report = await prisma.report.findFirstOrThrow({ where: { targetType: "RISE_POST", reporterId: "yao" } });
    await refused(resolveReport("yao", report.id, "restore", undefined, prisma), "forbidden");
    await resolveReport("equipe", report.id, "restore", undefined, prisma);
    expect((await getProject("fatou", id, prisma)).posts).toHaveLength(1);
    // Les autres signalements du même message sont traités avec lui.
    expect(await prisma.report.count({ where: { targetType: "RISE_POST", status: "OPEN" } })).toBe(0);
  });
});

describe("groupes : le responsable retire un message", () => {
  it("le responsable retire le message d'un membre ; un membre ne le peut pas ; l'équipe le rétablit", async () => {
    await makeContacts("yao", "fatou");
    await makeContacts("yao", "kossi");
    const { id } = await createGroup("yao", { name: "Devs Lomé", memberIds: ["fatou", "kossi"] }, prisma);
    const msg = await sendMessage("kossi", id, { body: "Un message déplacé" }, prisma);
    await refused(removeMessage("fatou", id, msg.id, prisma), "forbidden");
    await removeMessage("yao", id, msg.id, prisma);
    const seen = (await getConversation("fatou", id, {}, prisma)).messages.find((m) => m.id === msg.id);
    expect(seen?.hidden).toBe(true);
    expect(seen?.body).not.toContain("déplacé");
    expect((await getConversation("yao", id, {}, prisma)).canModerate).toBe(true);
    expect((await getConversation("fatou", id, {}, prisma)).canModerate).toBe(false);

    await prisma.report.create({ data: { reporterId: "kossi", targetType: "MESSAGE", targetId: msg.id, targetUserId: "kossi", reason: "Autre" } });
    const report = await prisma.report.findFirstOrThrow({ where: { targetId: msg.id } });
    await resolveReport("equipe", report.id, "restore", undefined, prisma);
    expect((await getConversation("fatou", id, {}, prisma)).messages.find((m) => m.id === msg.id)?.hidden).toBeFalsy();
  });

  it("dans le canal d'un projet Rise-Up, les co-responsables retirent aussi un message", async () => {
    const id = await projectWithMembers();
    await setCoLead("yao", id, "fatou", true, prisma);
    const { conversationId } = await prisma.riseProject.findUniqueOrThrow({ where: { id }, select: { conversationId: true } });
    const msg = await sendMessage("kossi", conversationId!, { body: "Spam" }, prisma);
    await removeMessage("fatou", conversationId!, msg.id, prisma);
    expect((await getConversation("kossi", conversationId!, {}, prisma)).messages.find((m) => m.id === msg.id)?.hidden).toBe(true);
  });
});

describe("hackathons : l'équipe refuse une proposition (P7)", () => {
  const DAY = 86_400_000;
  const input = {
    title: "Agritech Sahel",
    organizerName: "Réseau Agritech",
    format: "ONLINE" as const,
    startsAt: new Date(Date.now() + 3 * DAY).toISOString(),
    endsAt: new Date(Date.now() + 5 * DAY).toISOString(),
    closesAt: new Date(Date.now() + 2 * DAY).toISOString(),
    teamMin: 2,
    teamMax: 5,
    level: "Tous niveaux",
    stack: "Web ou mobile",
    description: "Des outils pour les coopératives agricoles.",
    prizes: [],
  };

  it("le refus exige une raison, prévient l'organisateur, qui la lit ; l'équipe peut encore publier", async () => {
    const { id } = await createHackathon("kossi", input, prisma);
    await refused(rejectHackathon("kossi", id, "Pas assez précis sur les prix.", prisma), "forbidden");
    await refused(rejectHackathon("equipe", id, "Bof", prisma), "reason_required");
    await rejectHackathon("equipe", id, "Le règlement manque : ajoute-le puis propose à nouveau.", prisma);
    expect(await notes("kossi", "hackathonRejected")).toBe(1);
    const seen = await getHackathon("kossi", id, prisma);
    expect(seen).toMatchObject({ published: false, rejected: true, rejectionReason: "Le règlement manque : ajoute-le puis propose à nouveau." });
    await refused(getHackathon("fatou", id, prisma), "not_found");
    await refused(rejectHackathon("equipe", id, "Encore une fois, non merci.", prisma), "rejected");
    // Plus « à publier » sur le tableau de bord de l'équipe.
    expect((await dashboard("equipe", prisma)).toPublish).toBe(0);
    await publishHackathon("equipe", id, prisma);
    expect(await getHackathon("fatou", id, prisma)).toMatchObject({ published: true, rejected: false });
  });
});
