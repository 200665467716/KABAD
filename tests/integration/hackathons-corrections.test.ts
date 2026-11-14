import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { DomainError } from "@/server/errors";
import { answerJoinRequest, answerMission, cancelTeamInvite, closeHackathon, createHackathon, getHackathon, getResults, leaveTeam, publishResults, register, submitSolution, teamDiscussion } from "@/server/hackathons";
import { closeEndedHackathons } from "@/server/jobs";
import { makeContacts, makeUsers, prisma, resetDb } from "./helpers";

// Corrections du test des hackathons du 13 novembre 2026.

async function refused(p: Promise<unknown>, code: string) {
  await expect(p).rejects.toBeInstanceOf(DomainError);
  await expect(p).rejects.toMatchObject({ code });
}

const DAY = 86_400_000;
const MIN = 60_000;
const solution = { projectName: "Tontine Pay", repoUrl: "https://github.com/equipe/tontine-pay", explanation: "x".repeat(40) };

beforeEach(async () => {
  await resetDb();
  await makeUsers("Kossi", "Yao", "Fatou", "Chidi", "Nadia", "Awa", "Moussa", "Ibrahim", "Equipe");
  await prisma.user.update({ where: { id: "equipe" }, data: { isAdmin: true } });
  for (const id of ["awa", "moussa", "ibrahim"]) await prisma.user.update({ where: { id }, data: { role: "SENIOR", seniorVerifiedAt: new Date() } });
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
      teamMax: 4,
      level: "Tous niveaux",
      stack: "Web",
      description: "Un service pour les commerçants.",
      publishedAt: new Date(),
      ...extra,
    },
  });
}

describe("mission sur un hackathon pas encore publié", () => {
  it("le mentor à qui la mission est proposée voit le hackathon, avant et après sa réponse ; les autres membres non", async () => {
    const soon = Date.now() + 3 * DAY;
    const { id } = await createHackathon(
      "yao",
      {
        title: "Agritech Sahel",
        organizerName: "Yao",
        format: "ONLINE",
        startsAt: new Date(soon).toISOString(),
        endsAt: new Date(soon + DAY).toISOString(),
        closesAt: new Date(soon - DAY).toISOString(),
        teamMin: 2,
        teamMax: 5,
        level: "Tous niveaux",
        stack: "Web",
        description: "Des outils pour les coopératives agricoles du Sahel.",
        prizes: [],
        instructorFee: 50_000,
        mentorIds: ["awa"],
      },
      prisma,
    );
    const seen = await getHackathon("awa", id, prisma);
    expect(seen.published).toBe(false);
    expect(seen.canEdit).toBe(false);
    const mission = await prisma.instructorMission.findFirstOrThrow({ where: { hackathonId: id, mentorId: "awa" } });
    await answerMission("awa", mission.id, true, prisma);
    // The mentor lands on the hackathon after accepting: no "page not found".
    expect((await getHackathon("awa", id, prisma)).title).toBe("Agritech Sahel");
    await refused(getHackathon("kossi", id, prisma), "not_found");
  });
});

describe("places d’une équipe : les invitations en attente comptent", () => {
  it("une demande ne prend pas la place d’un invité ; annuler l’invitation la libère", async () => {
    await hackathon({ teamMax: 3 });
    for (const other of ["yao", "fatou"]) await makeContacts("kossi", other);
    // Kossi plus two invitations: the 3 places are held.
    const { teamId } = (await register("kossi", "h", { mode: "create", teamName: "Baobab", invite: ["yao", "fatou"] }, prisma)) as { teamId: string };

    // A team whose places are all held is no longer offered, and a request to join is refused.
    expect((await getHackathon("chidi", "h", prisma)).openTeams).toEqual([]);
    await refused(register("chidi", "h", { mode: "join", teamId }, prisma), "full");

    // A request sent before the invitations: the captain cannot accept it while the places are held.
    await prisma.teamJoinRequest.create({ data: { teamId, userId: "chidi" } });
    const request = (await getHackathon("kossi", "h", prisma)).myTeam!.requests[0];
    await refused(answerJoinRequest("kossi", request.id, true, prisma), "full");

    // Each invited member can still take the place held for them.
    const invites = (await getHackathon("kossi", "h", prisma)).myTeam!.invites;
    await answerJoinRequest("yao", invites.find((i) => i.user.id === "yao")!.id, true, prisma);
    await refused(answerJoinRequest("kossi", request.id, true, prisma), "full");

    // Once Fatou's invitation is cancelled, the request can be accepted.
    await cancelTeamInvite("kossi", invites.find((i) => i.user.id === "fatou")!.id, prisma);
    await answerJoinRequest("kossi", request.id, true, prisma);
    expect((await getHackathon("kossi", "h", prisma)).myTeam!.members.map((m) => m.id)).toEqual(["kossi", "yao", "chidi"]);
  });

  it("une invitation annulée retire sa notification", async () => {
    await hackathon();
    await makeContacts("fatou", "kossi");
    await register("fatou", "h", { mode: "create", teamName: "Alpha", invite: ["kossi"] }, prisma);
    expect(await prisma.notification.count({ where: { userId: "kossi", key: "teamInvited" } })).toBe(1);
    const [invite] = (await getHackathon("fatou", "h", prisma)).myTeam!.invites;
    await cancelTeamInvite("fatou", invite.id, prisma);
    expect(await prisma.notification.count({ where: { userId: "kossi", key: "teamInvited" } })).toBe(0);
  });
});

describe("noms d’équipe", () => {
  it("deux équipes ne portent pas le même nom à la casse près", async () => {
    await hackathon();
    await register("kossi", "h", { mode: "create", teamName: "Test Kora" }, prisma);
    await refused(register("yao", "h", { mode: "create", teamName: "test kora" }, prisma), "team_taken");
  });
});

describe("départ d’une équipe", () => {
  it("un départ laisse une ligne dans la discussion ; le nouveau chef, ou le chef, est prévenu", async () => {
    await hackathon();
    const { teamId } = (await register("fatou", "h", { mode: "create", teamName: "Alpha" }, prisma)) as { teamId: string };
    for (const id of ["yao", "chidi"]) {
      const { requestId } = (await register(id, "h", { mode: "join", teamId }, prisma)) as { requestId: string };
      await answerJoinRequest("fatou", requestId, true, prisma);
    }
    const { conversationId } = await teamDiscussion("fatou", teamId, prisma);

    // The captain leaves: Yao, the oldest member, takes over and is told.
    await leaveTeam("fatou", teamId, prisma);
    const lines = (await prisma.message.findMany({ where: { conversationId, kind: "SYSTEM" }, orderBy: { createdAt: "asc" } })).map((m) => m.body);
    expect(lines).toContain("Fatou a quitté le groupe");
    expect(lines).toContain("Yao est maintenant responsable du groupe");
    expect(await prisma.notification.count({ where: { userId: "yao", key: "teamCaptainHandedOver" } })).toBe(1);

    // A member leaves: the captain is told.
    await leaveTeam("chidi", teamId, prisma);
    expect(await prisma.notification.count({ where: { userId: "yao", key: "teamMemberLeft" } })).toBe(1);
  });
});

describe("jury", () => {
  it("le passage au jury prévient aussi les jurés, quand des solutions attendent leur note", async () => {
    await hackathon({ jurors: { create: [{ userId: "awa" }, { userId: "moussa" }, { userId: "ibrahim" }] } });
    await register("kossi", "h", { mode: "solo" }, prisma);
    await submitSolution("kossi", "h", solution, prisma);
    await prisma.hackathon.update({ where: { id: "h" }, data: { endsAt: new Date(Date.now() - MIN) } });
    expect(await closeEndedHackathons(new Date(), prisma)).toBe(1);
    for (const id of ["awa", "moussa", "ibrahim"]) expect(await prisma.notification.count({ where: { userId: id, key: "juryToScore" } })).toBe(1);
    expect(await prisma.notification.count({ where: { userId: "kossi", key: "hackathonEnded" } })).toBe(1);
  });

  it("« Clore maintenant » avance la fin : le worker passe le hackathon au jury et prévient", async () => {
    await hackathon();
    await register("kossi", "h", { mode: "solo" }, prisma);
    await closeHackathon("equipe", "h", prisma);
    // Registrations and solutions stop at once.
    await refused(register("yao", "h", { mode: "solo" }, prisma), "closed");
    await refused(submitSolution("kossi", "h", solution, prisma), "closed");
    await refused(closeHackathon("equipe", "h", prisma), "not_open");
    expect(await closeEndedHackathons(new Date(), prisma)).toBe(1);
    expect((await prisma.hackathon.findUniqueOrThrow({ where: { id: "h" } })).status).toBe("JURY");
    expect(await prisma.notification.count({ where: { userId: "kossi", key: "hackathonEnded" } })).toBe(1);
  });

  it("un hackathon en jury sans aucune solution se termine, sans classement", async () => {
    await hackathon({ status: "JURY", endsAt: new Date(Date.now() - MIN), closesAt: new Date(Date.now() - DAY / 2) });
    expect(await publishResults("equipe", "h", prisma)).toEqual({ winnerTeamId: null });
    const results = await getResults("h", prisma);
    expect(results.status).toBe("DONE");
    expect(results.ranking).toEqual([]);
    await refused(publishResults("equipe", "h", prisma), "not_jury");
  });
});
