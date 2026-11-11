import { describe, expect, it } from "vitest";
import { attachmentProblem, formatSize, hasVideoTrack, safeFileName, sniffMime } from "../attachments";

const bytes = (...parts: Array<string | number[]>) => new Uint8Array(parts.flatMap((p) => (typeof p === "string" ? [...p].map((c) => c.charCodeAt(0)) : p)));

describe("sniffMime", () => {
  it("reconnaît les fichiers acceptés à leur contenu", () => {
    expect(sniffMime(bytes("%PDF-1.7"))).toBe("application/pdf");
    expect(sniffMime(bytes([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe("image/png");
    expect(sniffMime(bytes([0xff, 0xd8, 0xff, 0xe0]))).toBe("image/jpeg");
    expect(sniffMime(bytes("RIFF", [0, 0, 0, 0], "WEBP"))).toBe("image/webp");
    expect(sniffMime(bytes([0x1a, 0x45, 0xdf, 0xa3]))).toBe("audio/webm");
    expect(sniffMime(bytes("OggS"))).toBe("audio/ogg");
    expect(sniffMime(bytes([0, 0, 0, 0x20], "ftypM4A "))).toBe("audio/mp4");
  });

  it("une vidéo MP4 n’est pas une note vocale : elle est refusée", () => {
    // ftyp, puis la piste : boîte « hdlr », 8 octets, puis le type « vide » (vidéo) ou « soun » (audio).
    const track = (type: string) => bytes([0, 0, 0, 0x20], "ftypisom", [0, 0, 0, 0x21], "hdlr", [0, 0, 0, 0, 0, 0, 0, 0], type);
    expect(sniffMime(track("soun"))).toBe("audio/mp4");
    expect(sniffMime(track("vide"))).toBeNull();
    expect(hasVideoTrack(track("vide"))).toBe(true);
    expect(attachmentProblem("VOICE", sniffMime(track("vide")), 10, 5)).toMatch(/Seuls/);
  });

  it("refuse le reste, même renommé", () => {
    expect(sniffMime(bytes("<html><script>"))).toBeNull();
    expect(sniffMime(bytes("MZ"))).toBeNull();
  });
});

describe("attachmentProblem", () => {
  it("vérifie la taille, le type et la durée d’une note vocale", () => {
    expect(attachmentProblem("FILE", "application/pdf", 240_000)).toBeNull();
    expect(attachmentProblem("FILE", "application/pdf", 3 * 1024 * 1024)).toMatch(/2 Mo/);
    expect(attachmentProblem("FILE", null, 10)).toMatch(/Seuls/);
    expect(attachmentProblem("FILE", "audio/webm", 10)).toMatch(/note vocale/);
    expect(attachmentProblem("VOICE", "audio/webm", 10, 24)).toBeNull();
    expect(attachmentProblem("VOICE", "image/png", 10, 24)).toMatch(/audio/);
    expect(attachmentProblem("VOICE", "audio/ogg", 10, 600)).toMatch(/2 minutes/);
  });
});

describe("noms et tailles", () => {
  it("nettoie le nom et garde l’extension du vrai type", () => {
    expect(safeFileName("specs api paiement.pdf", "application/pdf")).toBe("specs api paiement.pdf");
    expect(safeFileName('../../etc/"passwd".exe', "image/png")).toBe("etc-passwd.png");
    expect(safeFileName("", "audio/webm")).toBe("fichier.webm");
  });

  it("affiche une taille lisible", () => {
    expect(formatSize(240 * 1024)).toBe("240 Ko");
    expect(formatSize(1.2 * 1024 * 1024)).toBe("1,2 Mo");
    expect(formatSize(1.2 * 1024 * 1024, "en")).toBe("1.2 MB");
  });
});
