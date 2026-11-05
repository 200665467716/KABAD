/**
 * A contact invitation can carry a first message of 300 characters at most. The message is optional:
 * on sign-up, a member can invite in one tap. The conversation opens only once the invitation is accepted.
 */
export const INVITATION_MAX_LENGTH = 300;

export type InvitationCheck = { ok: true; message: string } | { ok: false; error: string };

export function checkInvitationMessage(raw: string): InvitationCheck {
  const message = raw.trim();
  const length = Array.from(message).length;
  if (length > INVITATION_MAX_LENGTH) {
    return { ok: false, error: `Ton message fait ${length} caractères. Raccourcis-le à ${INVITATION_MAX_LENGTH}.` };
  }
  return { ok: true, message };
}

export function charactersLeft(raw: string): number {
  return INVITATION_MAX_LENGTH - Array.from(raw).length;
}
