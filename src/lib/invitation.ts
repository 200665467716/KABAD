/** A contact invitation carries one first message. The conversation opens only once it is accepted. */
export const INVITATION_MAX_LENGTH = 300;

export type InvitationCheck = { ok: true; message: string } | { ok: false; error: string };

export function checkInvitationMessage(raw: string): InvitationCheck {
  const message = raw.trim();
  if (message.length === 0) return { ok: false, error: "Écrivez un premier message pour vous présenter." };
  const length = Array.from(message).length;
  if (length > INVITATION_MAX_LENGTH) {
    return { ok: false, error: `Votre message fait ${length} caractères. Raccourcissez-le à ${INVITATION_MAX_LENGTH}.` };
  }
  return { ok: true, message };
}

export function charactersLeft(raw: string): number {
  return INVITATION_MAX_LENGTH - Array.from(raw).length;
}
