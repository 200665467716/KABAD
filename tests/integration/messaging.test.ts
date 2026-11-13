import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { DomainError } from "@/server/errors";
import {
  addGroupMembers,
  answerInvitation,
  createGroup,
  createReport,
  getConversation,
  getGroupPhoto,
  getInvitation,
  listConversations,
  listInvitations,
  markRead,
  pinMessage,
  removeGroupMember,
  BLOCKED_MESSAGE,
  block,
  REINVITE_AFTER_DAYS,
  sendAttachment,
  sendInvitation,
  sendMessage,
  setGroupPhoto,
  unreadTotal,
  updateGroup,
} from "@/server/messaging";
import { createProject } from "@/server/rise";
import { createTestApp, joinTest } from "@/server/community-tests";
import { NOTIFY_BATCH } from "@/server/realtime-events";
import { captureEvents, makeContacts, makeUsers, prisma, resetDb } from "./helpers";

async function refused(p: Promise<unknown>, code: string) {
  await expect(p).rejects.toBeInstanceOf(DomainError);
  await expect(p).rejects.toMatchObject({ code });
}

beforeEach(async () => {
  await resetDb();
  await makeUsers("Kossi", "Moussa", "Yao", "Chidi");
});
afterAll(() => prisma.$disconnect());

describe("invitations", () => {
  it("opens a conversation only once accepted, starting with the first message", async () => {
    const { id } = await sendInvitation("kossi", { toId: "moussa", message: "Bonjour Moussa" }, prisma);
    expect(await listConversations("kossi", prisma)).toHaveLength(0);
    expect((await listInvitations("moussa", prisma)).received).toHaveLength(1);

    const { conversationId } = await answerInvitation("moussa", id, true, prisma);
    const conv = await getConversation("kossi", conversationId!, {}, prisma);
    expect(conv.kind).toBe("DIRECT");
    expect(conv.messages.map((m) => m.body)).toEqual(["Bonjour Moussa", "Moussa a accepté l’invitation"]);
    expect(await prisma.contact.count()).toBe(2);
  });

  it("the invited member reads the sender's presentation, level and headline before answering (P8)", async () => {
    await prisma.user.update({ where: { id: "kossi" }, data: { bio: "Je construis un paiement régional.", headline: "Développeur web", level: "INTERMEDIAIRE" } });
    const { id } = await sendInvitation("kossi", { toId: "moussa", message: "" }, prisma);
    const i = await getInvitation("moussa", id, prisma);
    expect(i.from).toMatchObject({ name: "Kossi", bio: "Je construis un paiement régional.", headline: "Développeur web", level: "INTERMEDIAIRE", photo: null });
    expect((await listInvitations("moussa", prisma)).received[0].from.bio).toBe("Je construis un paiement régional.");
  });

  it("sends an invitation without a message, kept by the sender until it is answered", async () => {
    const { id } = await sendInvitation("kossi", { toId: "moussa", message: "" }, prisma);
    expect((await listInvitations("kossi", prisma)).sent).toEqual([expect.objectContaining({ id, toId: "moussa", message: "" })]);

    const { conversationId } = await answerInvitation("moussa", id, true, prisma);
    const conv = await getConversation("moussa", conversationId!, {}, prisma);
    // No empty bubble: only the acceptance line.
    expect(conv.messages.map((m) => m.body)).toEqual(["Moussa a accepté l’invitation"]);
    expect((await listInvitations("kossi", prisma)).sent).toHaveLength(0);
  });

  it("refuses inviting yourself, inviting twice, or inviting an existing contact", async () => {
    await refused(sendInvitation("kossi", { toId: "kossi", message: "x" }, prisma), "self");
    await sendInvitation("kossi", { toId: "moussa", message: "x" }, prisma);
    await refused(sendInvitation("kossi", { toId: "moussa", message: "x" }, prisma), "already_sent");
    await refused(sendInvitation("moussa", { toId: "kossi", message: "x" }, prisma), "invited_you");
    await makeContacts("kossi", "yao");
    await refused(sendInvitation("kossi", { toId: "yao", message: "x" }, prisma), "already_contacts");
  });

  it("two taps on « Inviter » at once give one invitation and a clear message, not an error 500", async () => {
    const both = await Promise.allSettled([sendInvitation("kossi", { toId: "moussa", message: "" }, prisma), sendInvitation("kossi", { toId: "moussa", message: "" }, prisma)]);
    expect(both.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const failed = both.find((r) => r.status === "rejected") as PromiseRejectedResult;
    expect(failed.reason).toBeInstanceOf(DomainError);
    expect(failed.reason).toMatchObject({ code: "already_sent" });
    expect(await prisma.invitation.count()).toBe(1);
  });

  it("only the recipient answers, once; a refusal is silent and final", async () => {
    const { id } = await sendInvitation("kossi", { toId: "moussa", message: "x" }, prisma);
    await refused(answerInvitation("kossi", id, true, prisma), "not_found");
    await answerInvitation("moussa", id, false, prisma);
    await refused(answerInvitation("moussa", id, true, prisma), "already_answered");
    await refused(sendInvitation("kossi", { toId: "moussa", message: "encore" }, prisma), "declined");
  });

  it("after a refusal, the same member can be invited again only after 30 days", async () => {
    const { id } = await sendInvitation("kossi", { toId: "moussa", message: "x" }, prisma);
    await answerInvitation("moussa", id, false, prisma);
    const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000);
    await prisma.invitation.update({ where: { id }, data: { answeredAt: daysAgo(REINVITE_AFTER_DAYS - 1) } });
    await refused(sendInvitation("kossi", { toId: "moussa", message: "encore" }, prisma), "declined");
    await prisma.invitation.update({ where: { id }, data: { answeredAt: daysAgo(REINVITE_AFTER_DAYS + 1) } });
    expect((await sendInvitation("kossi", { toId: "moussa", message: "encore" }, prisma)).id).toBe(id);
    expect(REINVITE_AFTER_DAYS).toBe(30);
  });

  it("notifies the recipient through PostgreSQL only after the commit", async () => {
    const { events } = await captureEvents(() => sendInvitation("kossi", { toId: "moussa", message: "x" }, prisma));
    expect(events).toEqual([expect.objectContaining({ t: "invitation", recipients: ["moussa"] }), expect.objectContaining({ t: "notification", recipients: ["moussa"] })]);
    expect(await prisma.notification.count({ where: { userId: "moussa" } })).toBe(1);
  });
});

describe("messages", () => {
  async function pair() {
    const { id } = await sendInvitation("kossi", { toId: "moussa", message: "Bonjour" }, prisma);
    return (await answerInvitation("moussa", id, true, prisma)).conversationId!;
  }

  it("lets members write, refuses everyone else", async () => {
    const c = await pair();
    const m = await sendMessage("moussa", c, { body: "Avec plaisir." }, prisma);
    expect(m.authorName).toBe("Moussa");
    await refused(sendMessage("yao", c, { body: "Je m’incruste" }, prisma), "not_found");
    await refused(getConversation("yao", c, {}, prisma), "not_found");
  });

  it("never stores the same message twice when the client retries", async () => {
    const c = await pair();
    const a = await sendMessage("kossi", c, { body: "Salut", clientId: "client-123456" }, prisma);
    const b = await sendMessage("kossi", c, { body: "Salut", clientId: "client-123456" }, prisma);
    expect(b.id).toBe(a.id);
    expect(await prisma.message.count({ where: { body: "Salut" } })).toBe(1);
  });

  it("counts unread messages and clears them when read", async () => {
    const c = await pair();
    await markRead("kossi", c, prisma);
    await sendMessage("moussa", c, { body: "Un" }, prisma);
    await sendMessage("moussa", c, { body: "Deux" }, prisma);
    expect(await unreadTotal("kossi", prisma)).toBe(2);
    expect(await unreadTotal("moussa", prisma)).toBe(0);
    await markRead("kossi", c, prisma);
    expect(await unreadTotal("kossi", prisma)).toBe(0);
  });

  it("a file or a voice note received counts as unread, like a text", async () => {
    const c = await pair();
    await markRead("kossi", c, prisma);
    await sendAttachment("moussa", c, { kind: "FILE", name: "specs.pdf", data: new TextEncoder().encode("%PDF-1.7\n") }, prisma);
    await sendAttachment("moussa", c, { kind: "VOICE", name: "note.webm", data: new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, 1]), seconds: 5 }, prisma);
    expect(await unreadTotal("kossi", prisma)).toBe(2);
    expect(await unreadTotal("moussa", prisma)).toBe(0);
  });

  it("sends the new message to every member in real time", async () => {
    const c = await pair();
    const { result, events } = await captureEvents(() => sendMessage("kossi", c, { body: "Temps réel" }, prisma));
    expect(events).toEqual([{ t: "message", conversationId: c, messageId: result.id, recipients: expect.arrayContaining(["kossi", "moussa"]) }]);
  });

  it("stops direct messages after a block", async () => {
    const c = await pair();
    await createReport("moussa", { targetType: "CONVERSATION", targetId: c, reason: "Spam ou arnaque", block: true }, prisma);
    await refused(sendMessage("kossi", c, { body: "Tu es là ?" }, prisma), "forbidden");
    await refused(sendMessage("moussa", c, { body: "Non" }, prisma), "forbidden");
    expect(await prisma.report.count()).toBe(1);
  });

  it("pages older messages", async () => {
    const c = await pair();
    for (let i = 0; i < 5; i++) {
      await prisma.message.create({ data: { conversationId: c, authorId: "kossi", body: `m${i}`, createdAt: new Date(Date.now() + (i + 1) * 1000) } });
    }
    const page = await getConversation("kossi", c, { limit: 3 }, prisma);
    expect(page.messages.map((m) => m.body)).toEqual(["m2", "m3", "m4"]);
    expect(page.hasMore).toBe(true);
    const older = await getConversation("kossi", c, { limit: 3, before: page.messages[0].createdAt }, prisma);
    expect(older.messages.map((m) => m.body)).toEqual(["Moussa a accepté l’invitation", "m0", "m1"]);
  });
});

describe("private groups", () => {
  beforeEach(async () => {
    await makeContacts("kossi", "moussa");
    await makeContacts("kossi", "yao");
  });

  it("are created with the creator's contacts only", async () => {
    await refused(createGroup("kossi", { name: "API Lomé", memberIds: ["chidi"] }, prisma), "forbidden");
    const { id } = await createGroup("kossi", { name: "API Lomé", memberIds: ["moussa", "yao"] }, prisma);
    const g = await getConversation("yao", id, {}, prisma);
    expect(g.members.map((m) => m.id).sort()).toEqual(["kossi", "moussa", "yao"]);
    expect(g.messages[0]).toMatchObject({ system: true, body: "Kossi a créé le groupe et ajouté Moussa et Yao" });
  });

  it("let every member write and everyone receives it", async () => {
    const { id } = await createGroup("kossi", { name: "API Lomé", memberIds: ["moussa", "yao"] }, prisma);
    const { events } = await captureEvents(() => sendMessage("yao", id, { body: "Vous pouvez relire ?" }, prisma));
    expect(events[0].recipients).toEqual(expect.arrayContaining(["kossi", "moussa", "yao"]));
    expect(await unreadTotal("moussa", prisma)).toBe(1);
  });

  it("in a shared group, the messages of a blocked member are masked for whoever blocked them, and not pushed to them", async () => {
    const { id } = await createGroup("kossi", { name: "API Lomé", memberIds: ["moussa", "yao"] }, prisma);
    await block("moussa", "yao", prisma);
    await markRead("moussa", id, prisma);
    const { events } = await captureEvents(() => sendMessage("yao", id, { body: "Tu me lis ?" }, prisma));
    // Yao still writes to the group; Moussa, who blocked Yao, is not told and reads nothing of it.
    expect((events[0].recipients as string[]).sort()).toEqual(["kossi", "yao"]);
    expect(await unreadTotal("moussa", prisma)).toBe(0);
    expect(await unreadTotal("kossi", prisma)).toBe(1);
    expect((await getConversation("moussa", id, {}, prisma)).messages.at(-1)).toMatchObject({ body: BLOCKED_MESSAGE, hidden: true, attachment: null });
    expect((await getConversation("kossi", id, {}, prisma)).messages.at(-1)).toMatchObject({ body: "Tu me lis ?", hidden: false });
    expect((await listConversations("moussa", prisma))[0].last?.body).toBe(BLOCKED_MESSAGE);
  });

  it("a big group is told in several events, each under PostgreSQL's 8 000-byte limit", async () => {
    const { id } = await createGroup("kossi", { name: "Grand groupe", memberIds: ["moussa"] }, prisma);
    const extra = Array.from({ length: 2 * NOTIFY_BATCH }, (_, i) => `membre-du-grand-groupe-${String(i).padStart(4, "0")}`);
    await prisma.user.createMany({ data: extra.map((u) => ({ id: u, name: u, email: `${u}@test.kabad`, passwordHash: "x" })) });
    await prisma.conversationMember.createMany({ data: extra.map((userId) => ({ conversationId: id, userId })) });
    const { events } = await captureEvents(() => sendMessage("kossi", id, { body: "Bonjour à tous" }, prisma));
    expect(events).toHaveLength(3);
    for (const e of events) expect(JSON.stringify(e).length).toBeLessThan(8000);
    expect(new Set(events.flatMap((e) => e.recipients as string[])).size).toBe(extra.length + 2);
  });

  it("only the owner renames a private group and sets its photo; the photo is for its members", async () => {
    const { id } = await createGroup("kossi", { name: "API Lomé", memberIds: ["moussa"] }, prisma);
    await refused(updateGroup("moussa", id, { name: "Autre nom" }, prisma), "forbidden");
    await updateGroup("kossi", id, { name: "API Lomé et Cotonou", theme: "Fintech" }, prisma);
    const renamed = await getConversation("moussa", id, {}, prisma);
    expect(renamed).toMatchObject({ title: "API Lomé et Cotonou", theme: "Fintech", photo: null });
    expect(renamed.messages.at(-1)).toMatchObject({ system: true, body: "Kossi a renommé le groupe « API Lomé et Cotonou »" });
    // The same name and theme again: nothing is written.
    await updateGroup("kossi", id, { name: "API Lomé et Cotonou", theme: "Fintech" }, prisma);
    expect((await getConversation("moussa", id, {}, prisma)).messages).toHaveLength(renamed.messages.length);

    const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
    await refused(setGroupPhoto("kossi", id, new TextEncoder().encode("%PDF-1.7"), prisma), "bad_file");
    await refused(setGroupPhoto("moussa", id, PNG, prisma), "forbidden");
    const { photo } = await setGroupPhoto("kossi", id, PNG, prisma);
    expect(photo).toContain(`/api/groups/${id}/photo?v=`);
    expect((await listConversations("moussa", prisma))[0].photo).toBe(photo);
    expect((await getGroupPhoto("moussa", id, prisma)).mime).toBe("image/png");
    await refused(getGroupPhoto("yao", id, prisma), "not_found");

    await setGroupPhoto("kossi", id, null, prisma);
    expect((await getConversation("moussa", id, {}, prisma)).photo).toBeNull();
    await refused(getGroupPhoto("moussa", id, prisma), "not_found");
  });

  it("the owner of a linked group renames and describes it; its members still follow the project", async () => {
    const project = await createProject("kossi", { name: "Forages au Sahel", domain: "WATER", summary: "Une carte des forages.", problem: "x".repeat(40), skills: [] }, prisma);
    const { conversationId } = await prisma.riseProject.findUniqueOrThrow({ where: { id: project.id } });
    await updateGroup("kossi", conversationId!, { name: "Forages : l’équipe", description: "On avance le jeudi." }, prisma);
    expect(await getConversation("kossi", conversationId!, {}, prisma)).toMatchObject({ title: "Forages : l’équipe", description: "On avance le jeudi.", theme: "Rise-Up" });
    // Members still come and go through the project, not the messaging.
    await refused(addGroupMembers("kossi", conversationId!, ["moussa"], prisma), "community_group");
  });

  it("a group gets a description at its creation and when its owner edits it", async () => {
    const { id } = await createGroup("kossi", { name: "API Lomé", description: "Revue de code chaque vendredi.", memberIds: ["moussa"] }, prisma);
    expect((await getConversation("moussa", id, {}, prisma)).description).toBe("Revue de code chaque vendredi.");
    await updateGroup("kossi", id, { name: "API Lomé", description: "" }, prisma);
    const g = await getConversation("moussa", id, {}, prisma);
    expect(g.description).toBeNull();
    expect(g.messages.at(-1)?.body).toBe("Kossi a changé la description du groupe");
  });

  it("a reply quotes a message of the same conversation only", async () => {
    const { id } = await createGroup("kossi", { name: "API Lomé", memberIds: ["moussa", "yao"] }, prisma);
    const first = await sendMessage("moussa", id, { body: "Qui relit ma PR sur les webhooks ?" }, prisma);
    const reply = await sendMessage("yao", id, { body: "Moi, ce soir.", replyToId: first.id }, prisma);
    expect(reply.replyTo).toMatchObject({ id: first.id, authorName: "Moussa", body: "Qui relit ma PR sur les webhooks ?", kind: "TEXT" });
    expect((await getConversation("kossi", id, {}, prisma)).messages.at(-1)?.replyTo?.id).toBe(first.id);
    // A message of another conversation cannot be quoted.
    const { id: other } = await createGroup("kossi", { name: "Autre", memberIds: ["yao"] }, prisma);
    await refused(sendMessage("yao", other, { body: "Hop", replyToId: first.id }, prisma), "not_found");
  });

  it("a mention notifies the member mentioned, not the author nor a member who is not mentioned", async () => {
    const { id } = await createGroup("kossi", { name: "API Lomé", memberIds: ["moussa", "yao"] }, prisma);
    await sendMessage("kossi", id, { body: "Bienvenue @Moussa ! Et merci @Kossi" }, prisma);
    const mentioned = await prisma.notification.findMany({ where: { key: "mentioned" } });
    expect(mentioned.map((n) => n.userId)).toEqual(["moussa"]);
    expect(mentioned[0]).toMatchObject({ actor: "Kossi", href: `/messages/${id}` });
  });

  it("only the owner pins a message; pinned messages are listed above the others", async () => {
    const { id } = await createGroup("kossi", { name: "Testeurs", memberIds: ["moussa"] }, prisma);
    const rules = await sendMessage("kossi", id, { body: "Consigne : testez sur un vrai téléphone." }, prisma);
    await refused(pinMessage("moussa", id, rules.id, true, prisma), "forbidden");
    await pinMessage("kossi", id, rules.id, true, prisma);
    const g = await getConversation("moussa", id, {}, prisma);
    expect(g.pinned.map((m) => m.id)).toEqual([rules.id]);
    expect(g.messages.find((m) => m.id === rules.id)?.pinned).toBe(true);
    expect(g.messages.at(-1)).toMatchObject({ system: true, body: "Kossi a épinglé un message" });
    await pinMessage("kossi", id, rules.id, false, prisma);
    expect((await getConversation("moussa", id, {}, prisma)).pinned).toEqual([]);
  });

  it("the author of a test edits its testers' group and removes a tester, who leaves the test too", async () => {
    const app = await createTestApp("kossi", { name: "Marché Vert", platforms: ["ANDROID"], url: "https://x.tg", minutes: 10, slots: 3, pitch: "p", task: "t", steps: ["Créer un compte"], questions: [] }, prisma);
    await joinTest("moussa", app.id, prisma);
    const { conversationId } = await prisma.testApp.findUniqueOrThrow({ where: { id: app.id } });
    await updateGroup("kossi", conversationId!, { name: "Testeurs du jeudi" }, prisma);
    await refused(removeGroupMember("moussa", conversationId!, "kossi", prisma), "forbidden");
    await removeGroupMember("kossi", conversationId!, "moussa", prisma);
    expect(await prisma.testParticipant.count({ where: { testAppId: app.id } })).toBe(0);
    expect((await getConversation("kossi", conversationId!, {}, prisma)).messages.at(-1)?.body).toBe("Kossi a retiré Moussa du test");
  });

  it("only the creator adds participants, and only among their contacts", async () => {
    const { id } = await createGroup("kossi", { name: "API Lomé", memberIds: ["moussa"] }, prisma);
    await makeContacts("moussa", "chidi");
    await refused(addGroupMembers("moussa", id, ["chidi"], prisma), "forbidden");
    await refused(addGroupMembers("kossi", id, ["chidi"], prisma), "forbidden");
    await refused(addGroupMembers("kossi", id, ["moussa"], prisma), "no_new_members");
    await addGroupMembers("kossi", id, ["yao"], prisma);
    const g = await getConversation("yao", id, {}, prisma);
    expect(g.messages.at(-1)?.body).toBe("Kossi a ajouté Yao");
  });
});
