import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { DomainError } from "@/server/errors";
import { createTestApp, joinTest, setStep } from "@/server/community-tests";
import { answerJoinRequest, cancelTeamInvite, createHackathon, getHackathon, inviteToTeam, leaveTeam, register, submitSolution, teamDiscussion } from "@/server/hackathons";
import { getProfile, getProfilePhoto, setProfilePhoto } from "@/server/members";
import { getMentor, rateSession } from "@/server/mentoring";
import { getConversation, leaveGroup, listConversations } from "@/server/messaging";
import { makeContacts, makeUsers, prisma, resetDb } from "./helpers";

async function refused(p: Promise<unknown>, code: string) {
  await expect(p).rejects.toBeInstanceOf(DomainError);
  await expect(p).rejects.toMatchObject({ code });
}

const DAY = 86_400_000;
const solution = { projectName: "Tontine Pay", repoUrl: "https://github.com/equipe/tontine-pay", explanation: "x".repeat(40) };

beforeEach(async () => {
  await resetDb();
  await makeUsers("Kossi", "Yao", "Fatou", "Chidi", "Awa", "Nadia");
  for (const id of ["awa", "nadia"]) await prisma.user.update({ where: { id }, data: { role: "SENIOR", seniorVerifiedAt: new Date() } });
});
afterAll(() => prisma.$disconnect());

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
      teamMax: 3,
      level: "Tous niveaux",
      stack: "Web",
      description: "Un service pour les commerçants.",
      publishedAt: new Date(),
      ...extra,
    },
  });
}

const membersOf = async (conversationId: string) => (await prisma.conversationMember.findMany({ where: { conversationId }, orderBy: { joinedAt: "asc" } })).map((m) => m.userId);

describe("équipe de hackathon : discussion et invitations (H3, H4)", () => {
  it("créer une équipe ouvre sa discussion ; le coéquipier invité y entre en acceptant", async () => {
    await hackathon();
    await makeContacts("kossi", "yao");
    const { teamId } = (await register("kossi", "h", { mode: "create", teamName: "Baobab", invite: ["yao"] }, prisma)) as { teamId: string };

    const team = (await getHackathon("kossi", "h", prisma)).myTeam!;
    expect(team.invites.map((i) => i.user.id)).toEqual(["yao"]);
    expect(team.conversationId).not.toBeNull();
    const group = await getConversation("kossi", team.conversationId!, {}, prisma);
    expect(group.title).toBe("Équipe Baobab");
    expect(group.linked).toEqual({ kind: "team", id: "h" });
    expect(await membersOf(team.conversationId!)).toEqual(["kossi"]);

    // Yao reads the invitation on the "Participer" screen and joins.
    const invited = await getHackathon("yao", "h", prisma);
    expect(invited.invitations).toEqual([{ id: team.invites[0].id, team: "Baobab", captain: "Kossi", members: 1 }]);
    expect(await prisma.notification.count({ where: { userId: "yao", key: "teamInvited" } })).toBe(1);
    await answerJoinRequest("yao", team.invites[0].id, true, prisma);

    expect((await getHackathon("yao", "h", prisma)).myTeam?.id).toBe(teamId);
    expect(await membersOf(team.conversationId!)).toEqual(["kossi", "yao"]);
    expect(await prisma.notification.count({ where: { userId: "kossi", key: "teamInviteAccepted" } })).toBe(1);
    // The discussion follows the team: it is not left from the messaging.
    await refused(leaveGroup("yao", team.conversationId!, prisma), "community_group");
  });

  it("on n’invite que ses contacts, jamais un juré ni plus de membres que de places ; l’invité seul répond", async () => {
    await hackathon({ teamMax: 2, jurors: { create: [{ userId: "nadia" }] } });
    for (const other of ["yao", "fatou", "nadia"]) await makeContacts("kossi", other);
    const { teamId } = (await register("kossi", "h", { mode: "create", teamName: "Baobab" }, prisma)) as { teamId: string };

    await refused(inviteToTeam("kossi", teamId, ["chidi"], prisma), "forbidden");
    await refused(inviteToTeam("kossi", teamId, ["nadia"], prisma), "juror");
    await refused(inviteToTeam("kossi", teamId, ["yao", "fatou"], prisma), "full");
    await refused(inviteToTeam("yao", teamId, ["fatou"], prisma), "not_found");

    expect(await inviteToTeam("kossi", teamId, ["yao"], prisma)).toEqual({ invited: 1 });
    // Asking again does not invite twice, and the only place left is already promised.
    expect(await inviteToTeam("kossi", teamId, ["yao"], prisma)).toEqual({ invited: 0 });
    await refused(inviteToTeam("kossi", teamId, ["fatou"], prisma), "full");

    const [invite] = (await getHackathon("kossi", "h", prisma)).myTeam!.invites;
    // The captain cannot accept in the member's place.
    await refused(answerJoinRequest("kossi", invite.id, true, prisma), "not_found");
    await answerJoinRequest("yao", invite.id, false, prisma);
    expect((await getHackathon("yao", "h", prisma)).myTeam).toBeNull();
    expect(await prisma.notification.count({ where: { userId: "kossi", key: "teamInviteDeclined" } })).toBe(1);
  });

  it("le chef d’équipe annule une invitation ; une demande acceptée fait entrer dans la discussion", async () => {
    await hackathon();
    await makeContacts("kossi", "yao");
    const { teamId } = (await register("kossi", "h", { mode: "create", teamName: "Baobab", invite: ["yao"] }, prisma)) as { teamId: string };
    const team = (await getHackathon("kossi", "h", prisma)).myTeam!;
    await refused(cancelTeamInvite("yao", team.invites[0].id, prisma), "not_found");
    await cancelTeamInvite("kossi", team.invites[0].id, prisma);
    expect((await getHackathon("yao", "h", prisma)).invitations).toEqual([]);

    // "Demander": Fatou asks, the captain accepts, she enters the team's discussion.
    const { requestId } = (await register("fatou", "h", { mode: "join", teamId }, prisma)) as { requestId: string };
    await answerJoinRequest("kossi", requestId, true, prisma);
    expect(await membersOf(team.conversationId!)).toEqual(["kossi", "fatou"]);
  });

  it("la discussion suit l’équipe : le chef qui part la confie au plus ancien, la dernière sortie la ferme", async () => {
    await hackathon();
    const { teamId } = (await register("kossi", "h", { mode: "create", teamName: "Baobab" }, prisma)) as { teamId: string };
    const { requestId } = (await register("yao", "h", { mode: "join", teamId }, prisma)) as { requestId: string };
    await answerJoinRequest("kossi", requestId, true, prisma);
    const { conversationId } = await teamDiscussion("yao", teamId, prisma);

    await leaveTeam("kossi", teamId, prisma);
    expect(await membersOf(conversationId)).toEqual(["yao"]);
    expect((await getConversation("yao", conversationId, {}, prisma)).isOwner).toBe(true);
    expect((await listConversations("kossi", prisma)).map((c) => c.id)).not.toContain(conversationId);

    await leaveTeam("yao", teamId, prisma);
    expect(await prisma.conversation.count({ where: { id: conversationId } })).toBe(0);
  });

  it("une équipe créée avant les discussions reçoit la sienne au premier appel, avec tous ses membres ; pas en solo", async () => {
    await hackathon();
    await prisma.team.create({ data: { id: "t", hackathonId: "h", name: "Équipe Kora", captainId: "chidi", members: { create: [{ userId: "chidi", hackathonId: "h" }, { userId: "fatou", hackathonId: "h" }] } } });
    const [a, b] = await Promise.all([teamDiscussion("fatou", "t", prisma), teamDiscussion("chidi", "t", prisma)]);
    expect(a.conversationId).toBe(b.conversationId);
    expect((await membersOf(a.conversationId)).sort()).toEqual(["chidi", "fatou"]);
    // The name already says "Équipe": it is not said twice.
    expect((await getConversation("chidi", a.conversationId, {}, prisma)).title).toBe("Équipe Kora");
    await refused(teamDiscussion("kossi", "t", prisma), "not_found");

    await register("kossi", "h", { mode: "solo" }, prisma);
    const solo = (await getHackathon("kossi", "h", prisma)).myTeam!;
    expect(solo.conversationId).toBeNull();
    await refused(teamDiscussion("kossi", solo.id, prisma), "solo");
  });
});

describe("solution d’un hackathon : dépôt public (H5e)", () => {
  it("refuse un dépôt privé ou introuvable sous le champ, accepte un dépôt public ou une forge muette", async () => {
    await hackathon();
    await register("kossi", "h", { mode: "solo" }, prisma);
    const asked: string[] = [];
    const answer = (value: boolean | null) => async (url: string) => {
      asked.push(url);
      return value;
    };

    const privateRepo = submitSolution("kossi", "h", solution, prisma, answer(false));
    await refused(privateRepo, "repo_private");
    await expect(privateRepo).rejects.toMatchObject({ field: "repoUrl" });
    expect(await prisma.submission.count()).toBe(0);

    await submitSolution("kossi", "h", solution, prisma, answer(true));
    // The forge does not answer: the team is not blocked at the deadline.
    await submitSolution("kossi", "h", { ...solution, projectName: "Tontine Pay 2" }, prisma, answer(null));
    expect((await prisma.submission.findFirstOrThrow()).projectName).toBe("Tontine Pay 2");
    expect(asked).toEqual([solution.repoUrl, solution.repoUrl, solution.repoUrl]);
  });
});

describe("organiser un hackathon : instructeurs dès la proposition (H8)", () => {
  const input = {
    title: "Fintech pour l’inclusion",
    organizerName: "FinLab Cotonou",
    format: "ONLINE" as const,
    startsAt: new Date(Date.now() + 3 * DAY).toISOString(),
    endsAt: new Date(Date.now() + 5 * DAY).toISOString(),
    closesAt: new Date(Date.now() + 2 * DAY).toISOString(),
    teamMin: 2,
    teamMax: 5,
    level: "Tous niveaux",
    stack: "Web ou mobile",
    description: "Un service pour les commerçants sans compte bancaire.",
    prizes: [],
  };

  it("propose la mission aux mentors choisis, une seule fois, et seulement avec une rémunération", async () => {
    await refused(createHackathon("kossi", { ...input, mentorIds: ["awa"] }, prisma), "fee");
    await refused(createHackathon("kossi", { ...input, instructorFee: 75_000, mentorIds: ["yao"] }, prisma), "not_mentor");
    expect(await prisma.hackathon.count()).toBe(0);

    const { id } = await createHackathon("kossi", { ...input, instructorFee: 75_000, instructorCount: 2, mentorIds: ["awa", "nadia"] }, prisma);
    const missions = await prisma.instructorMission.findMany({ where: { hackathonId: id }, orderBy: { mentorId: "asc" } });
    expect(missions.map((m) => [m.mentorId, m.fee, m.status])).toEqual([["awa", 75_000, "PROPOSED"], ["nadia", 75_000, "PROPOSED"]]);
    expect(await prisma.notification.count({ where: { key: "missionProposed" } })).toBe(2);
  });
});

describe("note d’une séance de mentorat", () => {
  const session = (data: Record<string, unknown> = {}) =>
    prisma.mentoringBooking.create({ data: { mentorId: "awa", menteeId: "kossi", topic: "Webhooks", problem: "Je bloque sur les confirmations en retard.", startsAt: new Date(Date.now() - DAY), status: "ACCEPTED", ...data } });

  it("le dev note une séance terminée, une seule fois ; le mentor est prévenu et sa fiche montre la moyenne", async () => {
    const soon = await session({ startsAt: new Date(Date.now() + DAY) });
    await refused(rateSession("kossi", soon.id, { rating: 5 }, prisma), "not_over");
    const declined = await session({ status: "DECLINED" });
    await refused(rateSession("kossi", declined.id, { rating: 5 }, prisma), "not_held");

    const held = await session();
    // Only the dev who attended rates: not the mentor, not someone else.
    await refused(rateSession("awa", held.id, { rating: 5 }, prisma), "not_found");
    await refused(rateSession("yao", held.id, { rating: 5 }, prisma), "not_found");
    expect((await getMentor("awa", prisma)).rating).toBeNull();

    await rateSession("kossi", held.id, { rating: 4, comment: "Très clair, merci." }, prisma);
    await refused(rateSession("kossi", held.id, { rating: 1 }, prisma), "rated");
    const other = await session({ menteeId: "yao", startsAt: new Date(Date.now() - 2 * DAY) });
    await rateSession("yao", other.id, { rating: 5 }, prisma);

    expect((await getMentor("awa", prisma)).rating).toEqual({ average: 4.5, count: 2 });
    const note = await prisma.notification.findFirstOrThrow({ where: { userId: "awa", key: "sessionRated", actor: "Kossi" } });
    expect(note.params).toEqual({ topic: "Webhooks", rating: 4 });
    expect((await prisma.mentoringBooking.findUniqueOrThrow({ where: { id: held.id } })).ratingComment).toBe("Très clair, merci.");
  });
});

describe("photo de profil", () => {
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);

  it("s’enregistre si c’est bien une image, s’affiche sur le profil et dans la messagerie, puis se retire", async () => {
    await refused(setProfilePhoto("kossi", new TextEncoder().encode("<script>alert(1)</script>"), prisma), "bad_file");
    await refused(setProfilePhoto("kossi", new Uint8Array([...png, ...new Uint8Array(301 * 1024)]), prisma), "bad_file");
    await refused(getProfilePhoto("kossi", prisma), "not_found");

    const { photo } = await setProfilePhoto("kossi", png, prisma);
    expect(photo).toMatch(/^\/api\/members\/kossi\/photo\?v=\d+$/);
    expect((await getProfilePhoto("kossi", prisma)).mime).toBe("image/png");
    expect((await getProfile("yao", "kossi", prisma)).photo).toBe(photo);

    // In a direct conversation, Yao sees Kossi's photo in the list and in the header.
    const conversation = await prisma.conversation.create({ data: { kind: "DIRECT", directKey: "kossi:yao", members: { create: [{ userId: "kossi" }, { userId: "yao" }] } } });
    expect((await listConversations("yao", prisma))[0].photo).toBe(photo);
    expect((await getConversation("yao", conversation.id, {}, prisma)).other?.photo).toBe(photo);
    expect((await getConversation("yao", conversation.id, {}, prisma)).members.find((m) => m.id === "yao")?.photo).toBeNull();

    expect(await setProfilePhoto("kossi", null, prisma)).toEqual({ photo: null });
    expect((await getProfile("yao", "kossi", prisma)).photo).toBeNull();
    expect(await prisma.userPhoto.count()).toBe(0);
  });
});

describe("groupe de testeurs (T4)", () => {
  it("donne les tâches, le lien d’installation et ce que le testeur a coché ; rien à cocher pour l’auteur", async () => {
    const { id, conversationId } = await createTestApp(
      "chidi",
      { name: "TontineApp", platforms: ["ANDROID"], url: "https://exemple.app/tontine", minutes: 10, slots: 5, pitch: "Une app pour épargner en groupe.", task: "Créer une tontine.", steps: ["Créer un compte", "Créer une tontine"], questions: [] },
      prisma,
    );
    await joinTest("kossi", id, prisma);
    await setStep("kossi", id, 1, true, prisma);

    const tester = await getConversation("kossi", conversationId!, {}, prisma);
    expect(tester.test).toEqual({ id, url: "https://exemple.app/tontine", steps: ["Créer un compte", "Créer une tontine"], platforms: ["ANDROID"], ownerId: "chidi", doneSteps: [1] });
    expect((await getConversation("chidi", conversationId!, {}, prisma)).test?.doneSteps).toBeNull();
  });
});
