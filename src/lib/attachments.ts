/**
 * Files sent in a conversation: PDF, images and voice notes, 2 MB at most.
 * The real type is read from the first bytes of the file, never from what the browser declares.
 */
export const ATTACHMENT_MAX_BYTES = 2 * 1024 * 1024;
export const VOICE_MAX_SECONDS = 120;
/** What the file picker offers, and what the browser checks before sending (the server reads the bytes). */
export const ACCEPTED_TYPES = ["application/pdf", "image/png", "image/jpeg", "image/webp"];

export type AttachmentKind = "FILE" | "VOICE";

const startsWith = (b: Uint8Array, bytes: number[], offset = 0) => bytes.every((x, i) => b[offset + i] === x);
const ascii = (s: string) => [...s].map((c) => c.charCodeAt(0));

/** The type of a file from its content, or null when it is not one KABAD accepts. */
export function sniffMime(b: Uint8Array): string | null {
  if (startsWith(b, ascii("%PDF-"))) return "application/pdf";
  if (startsWith(b, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (startsWith(b, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (startsWith(b, ascii("RIFF")) && startsWith(b, ascii("WEBP"), 8)) return "image/webp";
  // Voice notes recorded by the browser: WebM/Opus (Chrome, Firefox), Ogg/Opus, MP4/AAC (Safari).
  if (startsWith(b, [0x1a, 0x45, 0xdf, 0xa3])) return "audio/webm";
  if (startsWith(b, ascii("OggS"))) return "audio/ogg";
  // MP4 holds audio or video alike: a voice note has no video track, and a video is not accepted.
  if (startsWith(b, ascii("ftyp"), 4)) return hasVideoTrack(b) ? null : "audio/mp4";
  return null;
}

/**
 * True when an MP4 file declares a video track. Each track has a « hdlr » box whose handler type,
 * 8 bytes after the box name, is « vide » for video and « soun » for audio.
 */
export function hasVideoTrack(b: Uint8Array): boolean {
  const hdlr = ascii("hdlr");
  const vide = ascii("vide");
  for (let i = 4; i + 16 <= b.length; i++) {
    if (b[i] === hdlr[0] && startsWith(b, hdlr, i) && startsWith(b, vide, i + 12)) return true;
  }
  return false;
}

/** Checks a file against the kind of message: a voice note is audio, a file is a PDF or an image. */
export function attachmentProblem(kind: AttachmentKind, mime: string | null, size: number, seconds?: number): string | null {
  if (size === 0) return "Le fichier est vide.";
  if (size > ATTACHMENT_MAX_BYTES) return "Le fichier fait 2 Mo au plus.";
  if (!mime) return "Seuls les PDF, les images (PNG, JPEG, WebP) et les notes vocales sont acceptés.";
  if (kind === "VOICE") {
    if (!mime.startsWith("audio/")) return "Une note vocale doit être un enregistrement audio.";
    if (!seconds || seconds < 1 || seconds > VOICE_MAX_SECONDS) return "Une note vocale dure de 1 seconde à 2 minutes.";
  } else if (mime.startsWith("audio/")) {
    return "Envoie l’audio comme note vocale.";
  }
  return null;
}

/** The photo of a group: a small image. The browser resizes it to 256 px before sending, so it weighs a few dozen KB. */
export const GROUP_PHOTO_MAX_BYTES = 300 * 1024;
export const GROUP_PHOTO_SIZE = 256;

export function groupPhotoProblem(mime: string | null, size: number): string | null {
  if (size === 0) return "Le fichier est vide.";
  if (!mime || !mime.startsWith("image/")) return "La photo du groupe est une image PNG, JPEG ou WebP.";
  if (size > GROUP_PHOTO_MAX_BYTES) return "La photo du groupe fait 300 Ko au plus.";
  return null;
}

/** A profile photo follows the same limits as a group photo: an image already reduced by the browser. */
export function profilePhotoProblem(mime: string | null, size: number): string | null {
  if (size === 0) return "Le fichier est vide.";
  if (!mime || !mime.startsWith("image/")) return "Ta photo est une image PNG, JPEG ou WebP.";
  if (size > GROUP_PHOTO_MAX_BYTES) return "Ta photo fait 300 Ko au plus.";
  return null;
}

/** A file name safe to show and to send back in a download header. */
export function safeFileName(name: string, mime: string): string {
  const ext: Record<string, string> = { "application/pdf": "pdf", "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "audio/webm": "webm", "audio/ogg": "ogg", "audio/mp4": "m4a" };
  const base =
    name
      .replace(/\.[^.]*$/, "")
      .normalize("NFC")
      .replace(/[^\p{L}\p{N} _-]+/gu, "-")
      .replace(/-+/g, "-")
      .replace(/\s+/g, " ")
      .replace(/^[\s-]+|[\s-]+$/g, "")
      .slice(0, 80) || "fichier";
  return `${base}.${ext[mime] ?? "bin"}`;
}

/** "240 Ko", "1,2 Mo". */
export function formatSize(bytes: number, locale = "fr"): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} ${locale.startsWith("fr") ? "Ko" : "KB"}`;
  return `${(bytes / 1024 / 1024).toLocaleString(locale, { maximumFractionDigits: 1 })} ${locale.startsWith("fr") ? "Mo" : "MB"}`;
}
