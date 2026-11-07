/** An expected refusal, shown to the member as is. */
export class DomainError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status = 400,
    /** The form field the refusal is about, so the screen can show it next to that field. */
    public readonly field?: string,
    /** Numbers the screen needs to word the refusal (e.g. sign-in attempts left). */
    public readonly details?: Record<string, number>,
  ) {
    super(message);
    this.name = "DomainError";
  }
}

export const unauthorized = () => new DomainError("unauthorized", "Connecte-toi pour continuer.", 401);
export const forbidden = (message = "Tu n’as pas accès à cette ressource.") => new DomainError("forbidden", message, 403);
export const notFound = (message = "Introuvable.") => new DomainError("not_found", message, 404);
