import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { DomainError } from "@/server/errors";
import { getAttachment, getConversation, sendAttachment } from "@/server/messaging";
import { makeUsers, prisma, resetDb } from "./helpers";

const PDF = new TextEncoder().encode("%PDF-1.7\n1 0 obj\n");
const HTML = new TextEncoder().encode("<html><script>alert(1)</script>");
const WEBM = new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, 0x01, 0x02]);

async function refused(p: Promise<unknown>, code: string) {
  await expect(p).rejects.toBeInstanceOf(DomainError);
  await expect(p).rejects.toMatchObject({ code });
}

let conversationId = "";
beforeEach(async () => {
  await resetDb();
  await makeUsers("Kossi", "Yao", "Fatou");
  const c = await prisma.conversation.create({ data: { kind: "DIRECT", directKey: "kossi:yao", members: { create: [{ userId: "kossi" }, { userId: "yao" }] } } });
  conversationId = c.id;
});
afterAll(() => prisma.$disconnect());

describe("pièces jointes", () => {
  it("un PDF envoyé se lit par les membres de la conversation seulement", async () => {
    const msg = await sendAttachment("kossi", conversationId, { kind: "FILE", name: "specs api.pdf", data: PDF }, prisma);
    expect(msg.attachment).toMatchObject({ kind: "FILE", name: "specs api.pdf", mime: "application/pdf", size: PDF.byteLength });
    expect((await getAttachment("yao", msg.attachment!.id, prisma)).mime).toBe("application/pdf");
    await refused(getAttachment("fatou", msg.attachment!.id, prisma), "not_found");
  });

  it("refuse un fichier déguisé, et une note vocale sans durée", async () => {
    await refused(sendAttachment("kossi", conversationId, { kind: "FILE", name: "photo.png", data: HTML }, prisma), "bad_file");
    await refused(sendAttachment("kossi", conversationId, { kind: "VOICE", name: "note.webm", data: WEBM }, prisma), "bad_file");
    const voice = await sendAttachment("kossi", conversationId, { kind: "VOICE", name: "note.webm", data: WEBM, seconds: 24 }, prisma);
    expect(voice.attachment).toMatchObject({ kind: "VOICE", seconds: 24, mime: "audio/webm" });
  });

  it("un message retiré par la modération ne donne plus accès à son fichier", async () => {
    const msg = await sendAttachment("kossi", conversationId, { kind: "FILE", name: "a.pdf", data: PDF }, prisma);
    await prisma.message.update({ where: { id: msg.id }, data: { hiddenAt: new Date() } });
    await refused(getAttachment("yao", msg.attachment!.id, prisma), "not_found");
    const detail = await getConversation("yao", conversationId, {}, prisma);
    expect(detail.messages.at(-1)?.attachment).toBeNull();
  });
});
