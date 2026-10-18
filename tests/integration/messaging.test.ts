import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { DomainError } from "@/server/errors";
import {
  addGroupMembers,
  answerInvitation,
  createGroup,
  createReport,
  getConversation,
  listConversations,
  listInvitations,
  markRead,
  sendInvitation,
  sendMessage,
  unreadTotal,
} from "@/server/messaging";
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

  it("refuses inviting yourself, inviting twice, or inviting an existing contact", async () => {
    await refused(sendInvitation("kossi", { toId: "kossi", message: "x" }, prisma), "self");
    await sendInvitation("kossi", { toId: "moussa", message: "x" }, prisma);
    await refused(sendInvitation("kossi", { toId: "moussa", message: "x" }, prisma), "already_sent");
    await refused(sendInvitation("moussa", { toId: "kossi", message: "x" }, prisma), "invited_you");
    await makeContacts("kossi", "yao");
    await refused(sendInvitation("kossi", { toId: "yao", message: "x" }, prisma), "already_contacts");
  });

  it("only the recipient answers, once; a refusal is silent and final", async () => {
    const { id } = await sendInvitation("kossi", { toId: "moussa", message: "x" }, prisma);
    await refused(answerInvitation("kossi", id, true, prisma), "not_found");
    await answerInvitation("moussa", id, false, prisma);
    await refused(answerInvitation("moussa", id, true, prisma), "already_answered");
    await refused(sendInvitation("kossi", { toId: "moussa", message: "encore" }, prisma), "declined");
  });

  it("notifies the recipient through PostgreSQL only after the commit", async () => {
    const { events } = await captureEvents(() => sendInvitation("kossi", { toId: "moussa", message: "x" }, prisma));
    expect(events).toEqual([expect.objectContaining({ t: "invitation", recipients: ["moussa"] })]);
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
