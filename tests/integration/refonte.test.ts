import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { DomainError } from "@/server/errors";
import { answerBooking, bookSlot, cancelBooking, getMentor, listMentors, saveAvailability } from "@/server/mentoring";
import { revokeBadge } from "@/server/admin";
import { badgeRevocation, requestBadge, reviewBadge } from "@/server/badges";
import { answerJoinRequest, getHackathon, getResults, publishResults, register, scoreSubmission, submitSolution } from "@/server/hackathons";
import { createTestApp, joinTest, leaveTest, setStep } from "@/server/community-tests";
import { leaveGroup, listConversations } from "@/server/messaging";
import { addPost, closeRoom, createEvent, createProject, getEvent, getProject, joinProject, openRoom, setCoLead } from "@/server/rise";
import { remindRiseEvents } from "@/server/jobs";
import { sendVerificationEmail, verifyEmailCode } from "@/server/account";
import { updateProfile } from "@/server/members";
import { makeUsers, prisma, resetDb } from "./helpers";

async function refused(p: Promise<unknown>, code: string) {
  await expect(p).rejects.toBeInstanceOf(DomainError);
  await expect(p).rejects.toMatchObject({ code });
}

const DAY = 86_400_000;
const MEET = "https://meet.google.com/abc-defg-hij";

beforeEach(async () => {
  await resetDb();
  await makeUsers("Kossi", "Yao", "Fatou", "Awa", "Nadia", "Ibrahim", "Aicha", "Equipe");
  await prisma.user.update({ where: { id: "equipe" }, data: { isAdmin: true } });
  for (const id of ["awa", "nadia", "ibrahim", "aicha"]) await prisma.user.update({ where: { id }, data: { role: "SENIOR", seniorVerifiedAt: new Date() } });
});
afterAll(() => prisma.$disconnect());

/** Awa opens every day from 09:00 to 18:00, Lomé time (UTC). */
async function awaOpensEveryDay() {
  await saveAvailability("awa", { timeZone: "Africa/Lome", meetingUrl: MEET, ranges: [1, 2, 3, 4, 5, 6, 7].map((weekday) => ({ weekday, startMin: 9 * 60, endMin: 18 * 60 })), blocked: [] }, prisma);
  const { slots } = await getMentor("awa", prisma);
  return slots;
}
const booking = (startsAt: string) => ({ mentorId: "awa", startsAt, topic: "Webhooks", problem: "Je ne sais pas gérer les confirmations en retard." });

describe("mentorat par créneaux", () => {
  it("deux membres qui réservent le même créneau au même instant : un seul l’obtient", async () => {
    const [slot] = await awaOpensEveryDay();
    const results = await Promise.allSettled([bookSlot("kossi", booking(slot), prisma), bookSlot("yao", booking(slot), prisma)]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const failure = results.find((r) => r.status === "rejected") as PromiseRejectedResult;
    expect(failure.reason).toMatchObject({ code: "slot_taken" });
  });

  it("refuse un créneau que le mentor n’a pas ouvert, et ses propres créneaux", async () => {
    await awaOpensEveryDay();
    const night = new Date(Date.now() + 3 * DAY);
    night.setUTCHours(2, 0, 0, 0);
    await refused(bookSlot("kossi", booking(night.toISOString()), prisma), "bad_slot");
    await refused(bookSlot("awa", booking(night.toISOString()), prisma), "self");
  });

  it("sans lien Google Meet, un mentor n’ouvre aucun créneau et n’accepte aucune séance", async () => {
    const week = { timeZone: "Africa/Lome", ranges: [{ weekday: 1, startMin: 9 * 60, endMin: 10 * 60 }], blocked: [] };
    await refused(saveAvailability("awa", week, prisma), "meet_required");
    const [slot] = await awaOpensEveryDay();
    const { id } = await bookSlot("kossi", booking(slot), prisma);
    await prisma.user.update({ where: { id: "awa" }, data: { meetingUrl: "" } });
    await refused(answerBooking("awa", id, { accept: true }, prisma), "meet_required");
    // Declining needs no link.
    expect((await answerBooking("awa", id, { accept: false }, prisma)).status).toBe("DECLINED");
  });

  it("une séance acceptée donne un lien de visio et ne s'accepte qu'une fois", async () => {
    const [slot] = await awaOpensEveryDay();
    const { id } = await bookSlot("kossi", booking(slot), prisma);
    const { meetingUrl } = await answerBooking("awa", id, { accept: true }, prisma);
    // Google Meet in V1: the session carries the mentor's own link.
    expect(meetingUrl).toBe(MEET);
    await refused(answerBooking("awa", id, { accept: false }, prisma), "answered");
  });

  it("on réserve dans les 30 jours à venir, pas plus loin", async () => {
    await awaOpensEveryDay();
    const far = new Date(Date.now() + 45 * DAY);
    far.setUTCHours(10, 0, 0, 0);
    await refused(bookSlot("kossi", booking(far.toISOString()), prisma), "too_far");
  });

  it("un dev n’a pas deux séances à la même heure, même avec deux mentors", async () => {
    const [slot] = await awaOpensEveryDay();
    await saveAvailability("nadia", { timeZone: "Africa/Lome", meetingUrl: MEET, ranges: [1, 2, 3, 4, 5, 6, 7].map((weekday) => ({ weekday, startMin: 9 * 60, endMin: 18 * 60 })), blocked: [] }, prisma);
    await bookSlot("kossi", booking(slot), prisma);
    await refused(bookSlot("kossi", { ...booking(slot), mentorId: "nadia" }, prisma), "clash");
    // Another member takes Nadia's slot without trouble.
    await bookSlot("yao", { ...booking(slot), mentorId: "nadia" }, prisma);
  });

  it("un mentor n’a pas deux séances à la même heure, comme dev et comme mentor, à la réservation et à l’acceptation", async () => {
    const [slot] = await awaOpensEveryDay();
    await saveAvailability("nadia", { timeZone: "Africa/Lome", meetingUrl: MEET, ranges: [1, 2, 3, 4, 5, 6, 7].map((weekday) => ({ weekday, startMin: 9 * 60, endMin: 18 * 60 })), blocked: [] }, prisma);
    // Nadia, as a dev, books Awa at that time: her own slot at that time is no longer offered, nor bookable.
    await bookSlot("nadia", booking(slot), prisma);
    expect((await getMentor("nadia", prisma)).slots).not.toContain(slot);
    await refused(bookSlot("yao", { ...booking(slot), mentorId: "nadia" }, prisma), "slot_taken");
    // The same, the other way round: Awa holds a session as a mentor, she cannot book one as a dev at that time.
    await refused(bookSlot("awa", { ...booking(slot), mentorId: "nadia" }, prisma), "clash");
    // The calendar shown to a dev leaves out the times they are already busy.
    expect((await getMentor("awa", prisma, "nadia")).slots).not.toContain(slot);
  });

  it("à l’acceptation, le serveur revérifie que le mentor et le dev sont libres", async () => {
    const [slot] = await awaOpensEveryDay();
    await saveAvailability("nadia", { timeZone: "Africa/Lome", meetingUrl: MEET, ranges: [1, 2, 3, 4, 5, 6, 7].map((weekday) => ({ weekday, startMin: 9 * 60, endMin: 18 * 60 })), blocked: [] }, prisma);
    const { id } = await bookSlot("yao", { ...booking(slot), mentorId: "nadia" }, prisma);
    // A session written straight in the base (old data, or a race lost before this rule): Nadia is a dev at that time.
    await prisma.mentoringBooking.create({ data: { mentorId: "awa", menteeId: "nadia", startsAt: new Date(slot), topic: "API", problem: "Je bloque sur les webhooks." } });
    await refused(answerBooking("nadia", id, { accept: true }, prisma), "clash_mentor");
    expect((await prisma.mentoringBooking.findUniqueOrThrow({ where: { id } })).status).toBe("PENDING");
    // Declining stays possible.
    expect((await answerBooking("nadia", id, { accept: false }, prisma)).status).toBe("DECLINED");

    // The dev who asked is busy too: the mentor cannot accept.
    await prisma.mentoringBooking.deleteMany({});
    const other = await bookSlot("yao", { ...booking(slot), mentorId: "nadia" }, prisma);
    await prisma.mentoringBooking.create({ data: { mentorId: "awa", menteeId: "yao", startsAt: new Date(slot), topic: "API", problem: "Je bloque sur les webhooks.", status: "ACCEPTED" } });
    await refused(answerBooking("nadia", other.id, { accept: true }, prisma), "clash_mentee");
  });

  it("le catalogue montre d’abord les mentors qui ont un créneau proche, puis ceux qui n’en ont pas", async () => {
    await awaOpensEveryDay();
    const mentors = await listMentors({}, prisma);
    expect(mentors[0].id).toBe("awa");
    expect(mentors.slice(1).every((m) => m.nextSlot === null)).toBe(true);
  });

  it("une séance annulée prévient l’autre membre, libère le créneau, et ne s’annule qu’une fois", async () => {
    const [slot] = await awaOpensEveryDay();
    const { id } = await bookSlot("kossi", booking(slot), prisma);
    await answerBooking("awa", id, { accept: true }, prisma);
    expect((await getMentor("awa", prisma)).takenSlots).toContain(slot);
    await refused(cancelBooking("yao", id, prisma), "not_found");

    await cancelBooking("kossi", id, prisma);
    expect(await prisma.notification.count({ where: { userId: "awa", key: "bookingCancelled" } })).toBe(1);
    const awa = await getMentor("awa", prisma);
    expect(awa.slots).toContain(slot);
    expect(awa.takenSlots).not.toContain(slot);
    await refused(cancelBooking("awa", id, prisma), "closed");
  });

  it("un badge retiré annule les séances à venir, prévient chaque dev et arrête les missions d’instructeur", async () => {
    const [slot] = await awaOpensEveryDay();
    const { id } = await bookSlot("kossi", booking(slot), prisma);
    await answerBooking("awa", id, { accept: true }, prisma);
    const soon = new Date(Date.now() + 5 * DAY);
    await prisma.hackathon.create({ data: { id: "h", title: "Fintech", organizerName: "FinLab", format: "ONLINE", startsAt: soon, endsAt: new Date(soon.getTime() + DAY), closesAt: soon, level: "Tous niveaux", stack: "Web", description: "…", publishedAt: new Date(), missions: { create: { mentorId: "awa", fee: 50_000, status: "ACCEPTED" } } } });

    await revokeBadge("equipe", "awa", "Fausses informations", prisma);
    expect((await prisma.mentoringBooking.findUniqueOrThrow({ where: { id } })).status).toBe("CANCELLED");
    expect(await prisma.notification.count({ where: { userId: "kossi", key: "bookingCancelled" } })).toBe(1);
    expect((await prisma.instructorMission.findFirstOrThrow({ where: { mentorId: "awa" } })).status).toBe("DECLINED");
    await refused(getMentor("awa", prisma), "not_found");
  });
});

describe("badge mentor", () => {
  const input = { domains: ["Backend"], technologies: ["Node.js"], experience: "5-10" as const, jobTitle: "Lead backend", githubUrl: "https://github.com/kossi", bio: "Je construis des API depuis cinq ans.", topics: "Concevoir une API." };

  it("exige un lien, puis fait du membre un mentor une fois validé", async () => {
    await refused(requestBadge("kossi", { ...input, githubUrl: undefined }, prisma), "links");
    const { id } = await requestBadge("kossi", input, prisma);
    await refused(reviewBadge("kossi", id, { approve: true }, prisma), "forbidden");
    await refused(reviewBadge("equipe", id, { approve: false }, prisma), "reason");
    await reviewBadge("equipe", id, { approve: true }, prisma);
    const kossi = await prisma.user.findUniqueOrThrow({ where: { id: "kossi" } });
    expect(kossi.seniorVerifiedAt).not.toBeNull();
    expect(kossi.role).toBe("SENIOR");
    await refused(reviewBadge("equipe", id, { approve: true }, prisma), "reviewed");
  });

  it("après un retrait, l’écran du badge retrouve le motif ; une nouvelle demande l’efface", async () => {
    const { id } = await requestBadge("kossi", input, prisma);
    await reviewBadge("equipe", id, { approve: true }, prisma);
    expect(await badgeRevocation("kossi", prisma)).toBeNull();
    await revokeBadge("equipe", "kossi", "Fausses informations", prisma);
    expect(await badgeRevocation("kossi", prisma)).toEqual({ reason: "Fausses informations" });
    await requestBadge("kossi", input, prisma);
    expect(await badgeRevocation("kossi", prisma)).toBeNull();
  });

  it("deux envois de la demande au même instant ne font qu’une demande", async () => {
    const both = await Promise.allSettled([requestBadge("kossi", input, prisma), requestBadge("kossi", input, prisma)]);
    expect(both.every((r) => r.status === "fulfilled")).toBe(true);
    expect(await prisma.mentorBadgeRequest.count({ where: { userId: "kossi" } })).toBe(1);
  });

  it("la fiche du mentor reprend ce que l’équipe a vérifié : poste, expérience, sujets et liens", async () => {
    const { id } = await requestBadge("kossi", { ...input, company: "FinLab", linkedinUrl: "https://www.linkedin.com/in/kossi" }, prisma);
    await reviewBadge("equipe", id, { approve: true }, prisma);
    expect(await getMentor("kossi", prisma)).toMatchObject({
      jobTitle: "Lead backend",
      company: "FinLab",
      experience: "5-10",
      topics: "Concevoir une API.",
      links: { github: "https://github.com/kossi", linkedin: "https://www.linkedin.com/in/kossi", portfolio: null },
    });
  });
});

describe("hackathons", () => {
  async function hackathon(extra: Record<string, unknown> = {}) {
    await prisma.hackathon.create({
      data: {
        id: "h",
        title: "Fintech",
        organizerName: "FinLab",
        format: "ONLINE",
        startsAt: new Date(Date.now() - DAY),
        endsAt: new Date(Date.now() + DAY),
        closesAt: new Date(Date.now() + DAY / 2),
        teamMin: 1,
        teamMax: 2,
        level: "Tous niveaux",
        stack: "Web",
        description: "Un service pour les commerçants.",
        publishedAt: new Date(),
        ...extra,
      },
    });
  }

  it("un membre n’est que dans une équipe, et une équipe pleine refuse les nouvelles demandes", async () => {
    await hackathon();
    const { teamId } = (await register("kossi", "h", { mode: "create", teamName: "Baobab" }, prisma)) as { teamId: string };
    await refused(register("kossi", "h", { mode: "solo" }, prisma), "already_in");
    const { requestId } = (await register("yao", "h", { mode: "join", teamId }, prisma)) as { requestId: string };
    await answerJoinRequest("kossi", requestId, true, prisma);
    await refused(register("fatou", "h", { mode: "join", teamId }, prisma), "full");
    expect((await getHackathon("yao", "h", prisma)).myTeam?.members).toHaveLength(2);
  });

  it("un juré ne note pas l’équipe d’un membre qu’il a accompagné en séance", async () => {
    await hackathon({ status: "JURY", endsAt: new Date(Date.now() - 1000), jurors: { create: [{ userId: "awa" }, { userId: "nadia" }, { userId: "ibrahim" }] } });
    await prisma.team.create({ data: { id: "t", hackathonId: "h", name: "Baobab", captainId: "kossi", members: { create: { userId: "kossi", hackathonId: "h" } } } });
    const sub = await prisma.submission.create({ data: { hackathonId: "h", teamId: "t", projectName: "P", repoUrl: "https://github.com/k/r", explanation: "x".repeat(40) } });
    await prisma.mentoringBooking.create({ data: { mentorId: "awa", menteeId: "kossi", startsAt: new Date(Date.now() - 3 * DAY), topic: "API", problem: "…", status: "ACCEPTED" } });
    await refused(scoreSubmission("awa", "h", { submissionId: sub.id, works: 4, code: 4, tests: 4, explain: 4 }, prisma), "forbidden");
  });

  it("inscription sans mentorat exigé ; les prix suivent le classement et chaque équipe primée apprend le sien, une seule fois", async () => {
    await hackathon({ prizes: ["Un ordinateur portable", "Un an d’hébergement"], jurors: { create: [{ userId: "nadia" }, { userId: "ibrahim" }, { userId: "aicha" }] } });
    // Kossi has never had a mentoring session: hackathons and mentoring are independent.
    const marks = { kossi: 5, yao: 4, fatou: 3 };
    for (const who of Object.keys(marks)) {
      await register(who, "h", { mode: "solo" }, prisma);
      await submitSolution(who, "h", { projectName: `Projet ${who}`, repoUrl: `https://github.com/${who}/r`, explanation: "x".repeat(40) }, prisma);
    }
    await prisma.hackathon.update({ where: { id: "h" }, data: { status: "JURY" } });
    for (const sub of await prisma.submission.findMany({ include: { team: true } })) {
      const m = marks[sub.team.captainId as keyof typeof marks];
      for (const j of ["nadia", "ibrahim", "aicha"]) await scoreSubmission(j, "h", { submissionId: sub.id, works: m, code: m, tests: m, explain: m }, prisma);
    }
    const results = await Promise.allSettled([publishResults("equipe", "h", prisma), publishResults("equipe", "h", prisma)]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);

    // Two prizes for three teams: the first two win one, the third only gets the results.
    expect((await getResults("h", prisma)).ranking.map((r) => [r.captainId, r.prize])).toEqual([
      ["kossi", "Un ordinateur portable"],
      ["yao", "Un an d’hébergement"],
      ["fatou", null],
    ]);
    const note = async (userId: string) => {
      const rows = await prisma.notification.findMany({ where: { userId, key: { in: ["teamWonPrize", "teamWon", "resultsPublished"] } } });
      expect(rows).toHaveLength(1);
      return [rows[0].key, rows[0].params];
    };
    expect(await note("kossi")).toEqual(["teamWonPrize", { place: 1, prize: "Un ordinateur portable" }]);
    expect(await note("yao")).toEqual(["teamWonPrize", { place: 2, prize: "Un an d’hébergement" }]);
    expect(await note("fatou")).toEqual(["resultsPublished", null]);
  });

  it("sans aucune note du jury, la publication est refusée avec un message, pas une erreur 500", async () => {
    // No juror was named: nothing is missing, yet there is no ranking.
    await hackathon();
    await register("kossi", "h", { mode: "solo" }, prisma);
    await submitSolution("kossi", "h", { projectName: "Momo", repoUrl: "https://github.com/k/r", explanation: "x".repeat(40) }, prisma);
    await prisma.hackathon.update({ where: { id: "h" }, data: { status: "JURY" } });
    await refused(publishResults("equipe", "h", prisma), "unscored");
    expect((await prisma.hackathon.findUniqueOrThrow({ where: { id: "h" } })).status).toBe("JURY");
  });

  it("sans prix annoncé, la première équipe apprend qu’elle a gagné", async () => {
    await hackathon({ jurors: { create: [{ userId: "nadia" }, { userId: "ibrahim" }, { userId: "aicha" }] } });
    await register("kossi", "h", { mode: "solo" }, prisma);
    await submitSolution("kossi", "h", { projectName: "Momo", repoUrl: "https://github.com/k/r", explanation: "x".repeat(40) }, prisma);
    await prisma.hackathon.update({ where: { id: "h" }, data: { status: "JURY" } });
    const sub = await prisma.submission.findFirstOrThrow();
    for (const j of ["nadia", "ibrahim", "aicha"]) await scoreSubmission(j, "h", { submissionId: sub.id, works: 4, code: 4, tests: 4, explain: 4 }, prisma);
    await publishResults("equipe", "h", prisma);
    expect(await prisma.notification.count({ where: { userId: "kossi", key: "teamWon" } })).toBe(1);
    expect((await getResults("h", prisma)).ranking[0].prize).toBeNull();
  });
});

describe("tests communautaires", () => {
  it("les places sont limitées et seules les étapes connues se cochent", async () => {
    await prisma.testApp.create({ data: { id: "app", ownerId: "awa", name: "Marché Vert", platforms: ["ANDROID"], url: "https://x.tg", minutes: 10, slots: 1, pitch: "p", task: "t", steps: ["Créer un compte", "Commander"], questions: [] } });
    await joinTest("kossi", "app", prisma);
    await refused(joinTest("yao", "app", prisma), "full");
    expect((await setStep("kossi", "app", 1, true, prisma)).doneSteps).toEqual([1]);
    await refused(setStep("kossi", "app", 5, true, prisma), "step");
    await refused(setStep("yao", "app", 0, true, prisma), "forbidden");
  });

  it("deux inscriptions simultanées ne prennent pas deux fois la dernière place", async () => {
    await prisma.testApp.create({ data: { id: "app", ownerId: "awa", name: "Kalo", platforms: ["WEB"], url: "https://x.tg", minutes: 10, slots: 1, pitch: "p", task: "t", steps: ["Créer"], questions: [] } });
    const results = await Promise.allSettled([joinTest("kossi", "app", prisma), joinTest("yao", "app", prisma)]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(await prisma.testParticipant.count({ where: { testAppId: "app" } })).toBe(1);
  });

  it("l’auteur ouvre le groupe de testeurs à la publication ; il suit le test dans la messagerie", async () => {
    const app = { name: "Kalo", platforms: ["WEB" as const], url: "https://kalo.tg", minutes: 10, slots: 5, pitch: "p", task: "t", steps: ["Ajouter une dépense"], questions: [] };
    const { id, conversationId } = await createTestApp("awa", app, prisma);
    expect(await listConversations("awa", prisma)).toEqual([expect.objectContaining({ id: conversationId, title: "Testeurs Kalo", kind: "GROUP", isOwner: true })]);

    expect((await joinTest("kossi", id, prisma)).conversationId).toBe(conversationId);
    expect((await listConversations("kossi", prisma)).map((c) => c.id)).toEqual([conversationId]);
    // On entre et on sort du groupe par le test, pas par la messagerie : l’auteur ne peut pas le perdre.
    await refused(leaveGroup("awa", conversationId, prisma), "community_group");
    await refused(leaveGroup("kossi", conversationId, prisma), "community_group");
    await leaveTest("kossi", id, prisma);
    expect(await listConversations("kossi", prisma)).toHaveLength(0);
    expect(await listConversations("awa", prisma)).toHaveLength(1);
  });

  it("une application publiée sans groupe en reçoit un, ouvert par son auteur, avec les testeurs déjà inscrits", async () => {
    await prisma.testApp.create({ data: { id: "ancienne", ownerId: "awa", name: "Tontine", platforms: ["WEB"], url: "https://x.tg", minutes: 10, slots: 5, pitch: "p", task: "t", steps: ["Créer"], questions: [], participants: { create: { userId: "fatou" } } } });
    const [first, again] = await Promise.all([joinTest("kossi", "ancienne", prisma), joinTest("yao", "ancienne", prisma)]);
    expect(again.conversationId).toBe(first.conversationId);
    const group = await prisma.conversation.findUniqueOrThrow({ where: { id: first.conversationId }, include: { members: true } });
    expect(group.createdById).toBe("awa");
    expect(group.members.map((m) => m.userId).sort()).toEqual(["awa", "fatou", "kossi", "yao"]);
  });
});

describe("Africa Rise-Up", () => {
  it("un projet ouvre son canal ; seuls les membres écrivent dans la discussion", async () => {
    const { id } = await createProject("yao", { name: "Forages au Sahel", domain: "WATER", summary: "Une carte des forages.", problem: "x".repeat(40), skills: [] }, prisma);
    await refused(addPost("kossi", id, { body: "Bonjour" }, prisma), "forbidden");
    await joinProject("kossi", id, {}, prisma);
    await addPost("kossi", id, { body: "Bonjour" }, prisma);
    const p = await prisma.riseProject.findUniqueOrThrow({ where: { id }, include: { conversation: { include: { members: true } } } });
    expect(p.conversation?.members.map((m) => m.userId).sort()).toEqual(["kossi", "yao"]);
  });

  it("deux appuis sur « Rejoindre » au même instant : un seul membre, pas d’erreur", async () => {
    const { id } = await createProject("yao", { name: "Forages au Sahel", domain: "WATER", summary: "Une carte des forages.", problem: "x".repeat(40), skills: [] }, prisma);
    const both = await Promise.allSettled([joinProject("kossi", id, {}, prisma), joinProject("kossi", id, {}, prisma)]);
    expect(both.every((r) => r.status === "fulfilled")).toBe(true);
    expect(await prisma.riseMember.count({ where: { projectId: id, userId: "kossi" } })).toBe(1);
  });

  it("un salon : un responsable l’ouvre sur un lien Meet, les autres sont prévenus ; un seul salon à la fois ; son auteur le ferme", async () => {
    const { id } = await createProject("yao", { name: "Forages au Sahel", domain: "WATER", summary: "Une carte des forages.", problem: "x".repeat(40), skills: [] }, prisma);
    const meet = "https://meet.google.com/abc-defg-hij";
    await refused(openRoom("kossi", id, { meetingUrl: meet }, prisma), "forbidden");
    await joinProject("kossi", id, {}, prisma);
    await joinProject("fatou", id, {}, prisma);
    // Kossi, co-responsable, ouvre le salon tout de suite (un simple membre le propose : voir le 14 novembre).
    await setCoLead("yao", id, "kossi", true, prisma);

    const room = await openRoom("kossi", id, { meetingUrl: meet }, prisma);
    expect(await prisma.notification.count({ where: { key: "roomLive", userId: { in: ["yao", "fatou"] } } })).toBe(2);
    expect(await prisma.notification.count({ where: { key: "roomLive", userId: "kossi" } })).toBe(0);
    await refused(openRoom("fatou", id, { meetingUrl: meet }, prisma), "room_open");

    // Live for the members, with the link; a visitor sees the room but not its link.
    expect((await getProject("fatou", id, prisma)).event).toMatchObject({ live: true, title: "Salon de discussion", meetingUrl: meet });
    expect((await getProject("aicha", id, prisma)).event).toMatchObject({ live: true, meetingUrl: "" });

    // Its author or a lead closes it; another member does not.
    await refused(closeRoom("fatou", id, room.id, prisma), "forbidden");
    await closeRoom("kossi", id, room.id, prisma);
    expect((await getEvent("kossi", id, room.id, prisma)).live).toBe(false);
    expect((await getProject("fatou", id, prisma)).event).toBeNull();
    await refused(closeRoom("yao", id, room.id, prisma), "over");
    await openRoom("fatou", id, { title: "Point capteurs", meetingUrl: meet }, prisma);
  });

  it("« prévenir les membres » décoché : ni notification, ni rappel une heure avant", async () => {
    const { id } = await createProject("yao", { name: "Forages au Sahel", domain: "WATER", summary: "Une carte des forages.", problem: "x".repeat(40), skills: [] }, prisma);
    await joinProject("kossi", id, {}, prisma);
    const before = await prisma.notification.count({ where: { userId: "kossi" } });
    // Deux heures avant : le rappel part une heure avant, à part de l’annonce.
    const startsAt = new Date(Date.now() + 2 * 3600_000).toISOString();
    const inAnHour = new Date(Date.now() + 70 * 60_000);
    await createEvent("yao", id, { title: "Point discret", agenda: "Entre nous.", startsAt, minutes: 30, meetingUrl: "https://meet.google.com/abc-defg-hij", notify: false }, prisma);
    expect(await remindRiseEvents(inAnHour, prisma)).toBe(0);
    await createEvent("yao", id, { title: "Point d’étape", agenda: "Avancement.", startsAt, minutes: 30, meetingUrl: "https://meet.google.com/abc-defg-hij", notify: true }, prisma);
    expect(await remindRiseEvents(inAnHour, prisma)).toBe(1);
    // One notification when the event is scheduled, one reminder: both for the second event only.
    expect((await prisma.notification.count({ where: { userId: "kossi" } })) - before).toBe(2);
  });
});

describe("profil", () => {
  it("enregistre le genre et le fuseau du membre ; un fuseau inconnu est ignoré", async () => {
    await updateProfile("kossi", { gender: "MALE", timeZone: "America/Toronto" }, prisma);
    await updateProfile("kossi", { timeZone: "Mars/Olympus" }, prisma);
    expect(await prisma.user.findUniqueOrThrow({ where: { id: "kossi" }, select: { gender: true, timeZone: true } })).toEqual({ gender: "MALE", timeZone: "America/Toronto" });
    // Le genre est facultatif : on peut le retirer.
    await updateProfile("kossi", { gender: null }, prisma);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: "kossi" } })).gender).toBeNull();
  });
});

describe("confirmation de l’e-mail par code", () => {
  it("bloque le code après cinq erreurs", async () => {
    await prisma.user.update({ where: { id: "kossi" }, data: { emailVerifiedAt: null } });
    await sendVerificationEmail("kossi", prisma);
    for (let i = 0; i < 5; i++) await refused(verifyEmailCode("kossi", "000000", prisma).catch(async (e) => {
      // The real code could be 000000: one chance in a million, skip the check then.
      if ((await prisma.user.findUniqueOrThrow({ where: { id: "kossi" } })).emailVerifiedAt) return;
      throw e;
    }), "bad_code");
    await refused(verifyEmailCode("kossi", "123456", prisma), "locked");
  });

  it("un code reste valable 10 minutes, pas plus", async () => {
    await prisma.user.update({ where: { id: "kossi" }, data: { emailVerifiedAt: null } });
    await sendVerificationEmail("kossi", prisma);
    const token = await prisma.emailToken.findFirstOrThrow({ where: { userId: "kossi", purpose: "VERIFY" } });
    const minutes = (token.expiresAt.getTime() - token.createdAt.getTime()) / 60_000;
    expect(Math.round(minutes)).toBe(10);
    await prisma.emailToken.update({ where: { id: token.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
    await expect(verifyEmailCode("kossi", "000000", prisma)).rejects.toMatchObject({ code: "bad_code", message: "Ce code est incorrect ou a expiré. Un code reste valable 10 minutes." });
  });
});
