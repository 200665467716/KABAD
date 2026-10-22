import { z } from "zod";
import { INVITATION_MAX_LENGTH } from "./invitation";

/* Shared by the API (server-side validation) and the forms (same messages). */

const id = z.string().min(1).max(64);
const trimmed = (min: number, max: number, tooShort: string, tooLong: string) =>
  z
    .string()
    .transform((s) => s.trim())
    .pipe(z.string().min(min, tooShort).max(max, tooLong));

export const MESSAGE_MAX_LENGTH = 4000;
export const GROUP_NAME_MAX = 60;
export const GROUP_MAX_MEMBERS = 50;

export const loginSchema = z.object({
  email: z.email("Cette adresse e-mail n’est pas valide."),
  password: z.string().min(1, "Indiquez votre mot de passe.").max(200),
});

export const signupSchema = z.object({
  name: trimmed(2, 80, "Indiquez votre nom complet.", "Ce nom est trop long."),
  email: z.email("Cette adresse e-mail n’est pas valide.").max(200),
  password: z.string().min(12, "Le mot de passe doit faire au moins 12 caractères.").max(200),
});

export const invitationSchema = z.object({
  toId: id,
  message: z
    .string()
    .transform((s) => s.trim())
    .pipe(
      z
        .string()
        .min(1, "Écrivez un premier message pour vous présenter.")
        .refine((s) => Array.from(s).length <= INVITATION_MAX_LENGTH, `Le premier message fait ${INVITATION_MAX_LENGTH} caractères au plus.`),
    ),
});

export const answerInvitationSchema = z.object({ accept: z.boolean() });

export const sendMessageSchema = z.object({
  body: trimmed(1, MESSAGE_MAX_LENGTH, "Le message est vide.", `Un message fait ${MESSAGE_MAX_LENGTH} caractères au plus.`),
  clientId: z.string().min(8).max(64).optional(),
});

export const createGroupSchema = z.object({
  name: trimmed(1, GROUP_NAME_MAX, "Donnez un nom au groupe.", `Le nom du groupe fait ${GROUP_NAME_MAX} caractères au plus.`),
  memberIds: z.array(id).min(1, "Choisissez au moins un participant.").max(GROUP_MAX_MEMBERS - 1, `Un groupe compte ${GROUP_MAX_MEMBERS} membres au plus.`),
});

export const addMembersSchema = z.object({
  memberIds: z.array(id).min(1, "Choisissez au moins un participant.").max(GROUP_MAX_MEMBERS),
});

export const REPORT_REASONS = ["Spam ou arnaque", "Harcèlement ou propos haineux", "Faux profil ou faux statut Senior", "Plagiat dans un défi", "Autre"] as const;

export const reportSchema = z.object({
  targetType: z.enum(["USER", "MESSAGE", "CONVERSATION", "INVITATION"]),
  targetId: id,
  reason: z.enum(REPORT_REASONS, "Choisissez un motif."),
  details: z.string().max(1000).optional(),
  block: z.boolean().default(false),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;

/* Profile */

export const STACK_CHOICES = ["TypeScript", "React", "Node.js", "Python", "PostgreSQL", "Flutter", "PHP", "Java"] as const;
export const COUNTRIES = ["Bénin", "Burkina Faso", "Cameroun", "Côte d’Ivoire", "Ghana", "Mali", "Niger", "Nigeria", "RD Congo", "Sénégal", "Togo", "Autre pays"] as const;

const profileUrl = z
  .string()
  .transform((s) => s.trim().replace(/^https?:\/\//, ""))
  .pipe(z.string().max(200).regex(/^$|^(www\.)?(github\.com|linkedin\.com)\/\S+$/, "Indiquez un profil GitHub ou LinkedIn (github.com/… ou linkedin.com/…)."));

export const profileSchema = z
  .object({
    role: z.enum(["JUNIOR", "SENIOR"]),
    country: trimmed(2, 60, "Choisissez votre pays.", "Ce pays est trop long."),
    city: trimmed(2, 60, "Indiquez votre ville.", "Ce nom de ville est trop long."),
    diaspora: z.boolean().default(false),
    stack: z.array(z.string().min(1).max(30)).max(12, "12 technologies au plus."),
    profileLink: profileUrl,
    headline: z.string().trim().max(80).optional(),
    bio: z.string().trim().max(600).optional(),
    years: z.number().int().min(0).max(50).optional(),
  })
  .refine((p) => p.role !== "SENIOR" || p.profileLink.length > 0, { message: "Un profil GitHub ou LinkedIn est obligatoire pour vérifier votre statut Senior.", path: ["profileLink"] });

/* Mentoring */

export const MENTOR_TOPICS = ["Tests", "Webhooks", "Architecture", "Déploiement", "Revue de code"] as const;

const repoField = z
  .string()
  .transform((s) => s.trim().replace(/^https?:\/\//, ""))
  .pipe(z.string().max(200).regex(/^$|^(github\.com|gitlab\.com|codeberg\.org)\/[\w.-]+\/[\w.-]+\/?$/, "Indiquez un dépôt GitHub, GitLab ou Codeberg."));

export const mentorRequestSchema = z.object({
  mentorId: id,
  project: trimmed(3, 120, "Indiquez le projet sur lequel vous voulez travailler.", "Le nom du projet fait 120 caractères au plus."),
  situation: trimmed(10, 1000, "Dites en quelques mots où vous en êtes.", "1 000 caractères au plus."),
  repo: repoField.optional(),
  topics: z.array(z.enum(MENTOR_TOPICS)).max(MENTOR_TOPICS.length),
});

export const answerRequestSchema = z.object({ accept: z.boolean() });

export const sessionSchema = z.object({
  pairId: id,
  startsAt: z.iso.datetime({ offset: true, message: "Indiquez la date et l’heure de la séance." }),
  minutes: z.number({ message: "Indiquez la durée." }).int().min(15, "Une séance dure 15 minutes au moins.").max(240, "Une séance dure 4 heures au plus."),
  topic: trimmed(3, 120, "Indiquez le sujet de la séance.", "Le sujet fait 120 caractères au plus."),
  done: trimmed(10, 1000, "Décrivez ce que vous avez fait.", "1 000 caractères au plus."),
  next: trimmed(3, 500, "Indiquez la prochaine étape.", "500 caractères au plus."),
});

export const nextSessionSchema = z.object({ at: z.iso.datetime({ offset: true, message: "Indiquez la date et l’heure." }).nullable() });

export const capsuleSchema = z.object({
  title: trimmed(8, 120, "Donnez un titre clair (8 caractères au moins).", "Le titre fait 120 caractères au plus."),
  theme: z.enum(["BACKEND", "MOBILE", "CAREER"], "Choisissez un thème."),
  body: trimmed(80, 6000, "Une capsule fait au moins 80 caractères.", "Une capsule se lit en moins de 5 minutes : 6 000 caractères au plus."),
  code: z.string().max(2000, "L’extrait de code fait 2 000 caractères au plus.").optional(),
  tags: z.array(trimmed(2, 20, "Mot-clé trop court.", "Mot-clé trop long.")).max(3, "3 mots-clés au plus.").default([]),
});

/* Challenges */

export const OPERATORS = ["Moov Money", "MTN MoMo", "Orange Money", "Wave", "Airtel Money", "Flooz", "T-Money"] as const;
export const SUBMISSION_MAX = 800;

export const submissionSchema = z.object({
  repoUrl: z.string().trim().regex(/^https:\/\/(github\.com|gitlab\.com|codeberg\.org)\/[\w.-]+\/[\w.-]+\/?$/, "Indiquez l’adresse d’un dépôt public GitHub, GitLab ou Codeberg."),
  demoUrl: z.union([z.literal(""), z.url({ protocol: /^https$/, message: "La démo doit être une adresse https." }).max(200)]).optional(),
  explanation: trimmed(40, SUBMISSION_MAX, "Expliquez vos choix en quelques phrases (40 caractères au moins).", `${SUBMISSION_MAX} caractères au plus.`),
  payoutOperator: z.enum(OPERATORS).optional(),
  payoutPhone: z.string().trim().regex(/^\+?[\d\s]{8,20}$/, "Indiquez le numéro Mobile Money qui recevra votre gain.").optional(),
  solo: z.literal(true, "Cochez les deux engagements pour soumettre."),
  explainable: z.literal(true, "Cochez les deux engagements pour soumettre."),
});

const mark = z.number().int().min(1).max(5);
export const juryScoreSchema = z.object({
  submissionId: id,
  works: mark,
  code: mark,
  tests: mark,
  explain: mark,
  comment: z.string().trim().max(1000).optional(),
});

export const contributionSchema = z.object({
  challengeId: id,
  amount: z.number().int().positive(),
  displayName: trimmed(2, 80, "Indiquez le nom à afficher.", "80 caractères au plus."),
  email: z.email("Indiquez une adresse e-mail valide pour recevoir le reçu.").max(200),
  phone: z.string().trim().regex(/^\+?[\d\s]{8,20}$/, "Indiquez un numéro de téléphone valide, avec l’indicatif (+228…)."),
  anonymous: z.boolean().default(false),
  company: z.boolean().default(false),
});

export const payoutSentSchema = z.object({ reference: trimmed(3, 60, "Indiquez la référence du transfert.", "60 caractères au plus.") });

/* Community tests */

export const testQuestionSchema = z.object({
  q: trimmed(5, 160, "Chaque question fait 5 caractères au moins.", "160 caractères au plus."),
  options: z.array(trimmed(1, 60, "Option vide.", "60 caractères au plus.")).min(2).max(5).optional(),
  answer: trimmed(1, 60, "Indiquez la bonne réponse.", "60 caractères au plus."),
});

export const testAppSchema = z.object({
  name: trimmed(2, 40, "Donnez le nom de l’application.", "40 caractères au plus."),
  platform: z.enum(["WEB", "ANDROID"]),
  url: z.url({ protocol: /^https$/, message: "Indiquez le lien https de l’application." }).max(300),
  minutes: z.number().int().min(5, "5 minutes au moins.").max(30, "Un test dure 30 minutes au plus."),
  slots: z.number().int().min(1).max(50, "50 testeurs au plus."),
  pitch: trimmed(20, 500, "Présentez l’application en une ou deux phrases.", "500 caractères au plus."),
  task: trimmed(10, 200, "Décrivez la tâche à accomplir.", "200 caractères au plus."),
  steps: z.array(trimmed(5, 200, "Chaque étape fait 5 caractères au moins.", "200 caractères au plus.")).min(1, "Ajoutez au moins une étape.").max(5, "5 étapes au plus."),
  questions: z.array(testQuestionSchema).min(1, "Ajoutez au moins une question de contrôle.").max(3, "3 questions au plus."),
});

export const testReportSchema = z.object({
  device: trimmed(2, 40, "Indiquez l’appareil utilisé.", "40 caractères au plus."),
  answers: z.array(z.string().trim().min(1, "Répondez aux questions de contrôle.").max(60)).min(1),
  remarks: z.string().trim().max(2000, "2 000 caractères au plus.").default(""),
});

export const reviewReportSchema = z.discriminatedUnion("validate", [
  z.object({ validate: z.literal(true) }),
  z.object({ validate: z.literal(false), reason: trimmed(5, 500, "Expliquez pourquoi en quelques mots.", "500 caractères au plus.") }),
]);

/* Account */

const newPassword = z.string().min(12, "Le mot de passe doit faire au moins 12 caractères.").max(200);
export const forgotPasswordSchema = z.object({ email: z.email("Cette adresse e-mail n’est pas valide.").max(200) });
export const resetPasswordSchema = z.object({ token: z.string().min(20).max(100), password: newPassword });
export const verifyEmailSchema = z.object({ token: z.string().min(20).max(100) });
export const changePasswordSchema = z.object({ current: z.string().max(200).default(""), next: newPassword });
export const deleteAccountSchema = z.object({ password: z.string().max(200).optional(), confirm: z.literal("SUPPRIMER", "Écrivez SUPPRIMER pour confirmer.") });
