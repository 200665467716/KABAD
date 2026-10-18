/** An expected refusal, shown to the member as is. */
export class DomainError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status = 400,
  ) {
    super(message);
    this.name = "DomainError";
  }
}

export const unauthorized = () => new DomainError("unauthorized", "Connectez-vous pour continuer.", 401);
export const forbidden = (message = "Vous n’avez pas accès à cette ressource.") => new DomainError("forbidden", message, 403);
export const notFound = (message = "Introuvable.") => new DomainError("not_found", message, 404);
