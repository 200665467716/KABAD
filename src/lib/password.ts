/**
 * Règle du mot de passe (point projet, A2 et A9) : 8 caractères au moins, dont au moins un chiffre.
 * Partagée par les formulaires (règles qui passent au vert) et par la validation du serveur.
 */
export const PASSWORD_MIN_LENGTH = 8;

export const passwordRules = (password: string) => ({
  length: Array.from(password).length >= PASSWORD_MIN_LENGTH,
  digit: /\p{Nd}/u.test(password),
});

export const PASSWORD_TOO_SHORT = `Le mot de passe doit faire au moins ${PASSWORD_MIN_LENGTH} caractères.`;
export const PASSWORD_NO_DIGIT = "Le mot de passe doit contenir au moins un chiffre.";
