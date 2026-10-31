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

export const GROUP_THEMES = ["Fintech", "Hackathon", "Entraide", "Mobile", "Data et IA"] as const;

export const createGroupSchema = z.object({
  name: trimmed(1, GROUP_NAME_MAX, "Donnez un nom au groupe.", `Le nom du groupe fait ${GROUP_NAME_MAX} caractères au plus.`),
  theme: z.enum(GROUP_THEMES).optional(),
  memberIds: z.array(id).min(1, "Choisissez au moins un participant.").max(GROUP_MAX_MEMBERS - 1, `Un groupe compte ${GROUP_MAX_MEMBERS} membres au plus.`),
});

export const addMembersSchema = z.object({
  memberIds: z.array(id).min(1, "Choisissez au moins un participant.").max(GROUP_MAX_MEMBERS),
});

export const REPORT_REASONS = ["Spam ou arnaque", "Harcèlement ou propos haineux", "Faux profil ou faux statut Senior", "Plagiat dans un défi", "Autre"] as const;

export const reportSchema = z.object({
  targetType: z.enum(["USER", "MESSAGE", "CONVERSATION", "INVITATION", "ROOM"]),
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

export const LEVELS = ["ASPIRANT", "DEBUTANT", "INTERMEDIAIRE", "SENIOR"] as const;
/** Technologies offered at sign-up (profile step 2). Members can add others later. */
export const TECH_CHOICES = ["JavaScript", "TypeScript", "Python", "PHP", "Java", "Kotlin", "Flutter", "React", "Node.js", "Django", "Laravel", "Data et IA"] as const;
/** What a member comes for (profile step 2). */
export const GOALS = ["mentor", "hackathons", "get_tested", "test_apps", "rise_up", "meet_devs"] as const;

/** Every field is optional: sign-up sends steps 1 and 2 separately, the profile page sends what changed. */
export const profileSchema = z.object({
  country: trimmed(2, 60, "Choisissez votre pays.", "Ce pays est trop long.").optional(),
  city: trimmed(2, 60, "Indiquez votre ville.", "Ce nom de ville est trop long.").optional(),
  diaspora: z.boolean().optional(),
  level: z.enum(LEVELS, "Choisissez votre niveau.").optional(),
  stack: z.array(z.string().trim().min(1).max(30)).max(12, "12 technologies au plus.").optional(),
  goals: z.array(z.enum(GOALS)).max(GOALS.length).optional(),
  profileLink: profileUrl.optional(),
  headline: z.string().trim().max(80).optional(),
  bio: z.string().trim().max(600).optional(),
  years: z.number().int().min(0).max(50).optional(),
  timeZone: z.string().max(40).optional(),
});

export const localeSchema = z.object({ locale: z.enum(["fr", "en"]) });

/* Mentoring by time slots */

export const bookingSchema = z.object({
  mentorId: id,
  startsAt: z.iso.datetime({ offset: true, message: "Choisissez un créneau." }),
  topic: trimmed(3, 120, "Indiquez le sujet de la séance.", "Le sujet fait 120 caractères au plus."),
  problem: trimmed(20, 1000, "Décrivez ton problème précis (20 caractères au moins).", "1 000 caractères au plus."),
  link: z.union([z.literal(""), z.url({ protocol: /^https$/, message: "Le lien doit commencer par https://." }).max(200)]).optional(),
});

export const answerBookingSchema = z.object({ accept: z.boolean(), reason: z.string().trim().max(300).optional() });

const minuteOfDay = z.number().int().min(0).max(24 * 60);
export const availabilitySchema = z.object({
  timeZone: z.string().min(3).max(40),
  meetingUrl: z.union([z.literal(""), z.url({ protocol: /^https$/, message: "Le lien de visio doit commencer par https://." }).max(200)]).optional(),
  ranges: z.array(z.object({ weekday: z.number().int().min(1).max(7), startMin: minuteOfDay, endMin: minuteOfDay })).max(40, "40 plages au plus."),
  blocked: z.array(z.object({ day: z.iso.date("Date invalide."), reason: z.string().trim().max(80).optional() })).max(60, "60 dates bloquées au plus."),
});

/* Mentor badge */

const optionalUrl = (host: RegExp | null, message: string) =>
  z.union([z.literal(""), z.url({ protocol: /^https$/, message: "Le lien doit commencer par https://." }).max(200).refine((u) => !host || host.test(new URL(u).hostname), message)]).optional();

export const badgeRequestSchema = z.object({
  domains: z.array(z.string().min(1).max(40)).min(1, "Choisissez au moins un domaine.").max(3, "3 domaines au plus."),
  technologies: z.array(trimmed(1, 30, "Technologie vide.", "30 caractères au plus.")).min(1, "Indiquez au moins une technologie.").max(12, "12 technologies au plus."),
  experience: z.enum(["3-5", "5-10", "10+"], "Indiquez ton expérience."),
  jobTitle: trimmed(2, 80, "Indiquez ton poste actuel.", "80 caractères au plus."),
  company: z.string().trim().max(80).optional(),
  githubUrl: optionalUrl(/(^|\.)github\.com$/, "Indique un lien github.com."),
  linkedinUrl: optionalUrl(/(^|\.)linkedin\.com$/, "Indique un lien linkedin.com."),
  portfolioUrl: optionalUrl(null, ""),
  bio: trimmed(30, 280, "Présente-toi en quelques phrases (30 caractères au moins).", "280 caractères au plus."),
  topics: trimmed(10, 300, "Dis sur quoi tu peux aider.", "300 caractères au plus."),
});

export const reviewBadgeSchema = z.object({ approve: z.boolean(), reason: z.string().trim().max(500).optional() });

export const capsuleSchema = z.object({
  title: trimmed(8, 120, "Donnez un titre clair (8 caractères au moins).", "Le titre fait 120 caractères au plus."),
  theme: z.enum(["BACKEND", "MOBILE", "CAREER"], "Choisissez un thème."),
  body: trimmed(80, 6000, "Une capsule fait au moins 80 caractères.", "Une capsule se lit en moins de 5 minutes : 6 000 caractères au plus."),
  code: z.string().max(2000, "L’extrait de code fait 2 000 caractères au plus.").optional(),
  tags: z.array(trimmed(2, 20, "Mot-clé trop court.", "Mot-clé trop long.")).max(3, "3 mots-clés au plus.").default([]),
});

/* Hackathons */

export const OPERATORS = ["Moov Money", "MTN MoMo", "Orange Money", "Wave", "Airtel Money", "Flooz", "T-Money"] as const;
export const SUBMISSION_MAX = 800;

export const submissionSchema = z.object({
  projectName: trimmed(2, 60, "Donnez le nom du projet.", "60 caractères au plus."),
  repoUrl: z.string().trim().regex(/^https:\/\/(github\.com|gitlab\.com|codeberg\.org)\/[\w.-]+\/[\w.-]+\/?$/, "Indiquez l’adresse d’un dépôt public GitHub, GitLab ou Codeberg."),
  demoUrl: z.union([z.literal(""), z.url({ protocol: /^https$/, message: "La démo doit être une adresse https." }).max(200)]).optional(),
  explanation: trimmed(40, SUBMISSION_MAX, "Décrivez ce que fait votre solution (40 caractères au moins).", `${SUBMISSION_MAX} caractères au plus.`),
  payoutOperator: z.enum(OPERATORS).optional(),
  payoutPhone: z.string().trim().regex(/^\+?[\d\s]{8,20}$/, "Indiquez le numéro Mobile Money qui recevra le gain.").optional(),
  teamAgrees: z.literal(true, "Confirmez que toute l’équipe a relu la soumission."),
});

export const registerSchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("solo"), skill: z.string().trim().max(30).optional(), rules: z.literal(true, "Acceptez le règlement du hackathon.") }),
  z.object({
    mode: z.literal("create"),
    teamName: trimmed(2, 40, "Donnez un nom à votre équipe.", "40 caractères au plus."),
    lookingFor: z.string().trim().max(80).optional(),
    skill: z.string().trim().max(30).optional(),
    rules: z.literal(true, "Acceptez le règlement du hackathon."),
  }),
  z.object({ mode: z.literal("join"), teamId: id, skill: z.string().trim().max(30).optional(), rules: z.literal(true, "Acceptez le règlement du hackathon.") }),
]);

export const answerJoinSchema = z.object({ accept: z.boolean() });
export const teamUpdateSchema = z.object({ lookingFor: z.string().trim().max(80).nullable().optional() });

export const hackathonSchema = z.object({
  title: trimmed(5, 120, "Donnez un nom au hackathon.", "120 caractères au plus."),
  organizerName: trimmed(2, 80, "Indiquez l’organisateur.", "80 caractères au plus."),
  format: z.enum(["ONLINE", "ONSITE", "HYBRID"]),
  city: z.string().trim().max(60).optional(),
  startsAt: z.iso.datetime({ offset: true, message: "Indiquez le début." }),
  endsAt: z.iso.datetime({ offset: true, message: "Indiquez la fin." }),
  closesAt: z.iso.datetime({ offset: true, message: "Indiquez la clôture des inscriptions." }),
  teamMin: z.number().int().min(1).max(10),
  teamMax: z.number().int().min(1).max(10),
  level: z.enum(["Débutant", "Intermédiaire", "Avancé", "Tous niveaux"]),
  stack: trimmed(2, 60, "Indiquez les technologies attendues.", "60 caractères au plus."),
  description: trimmed(30, 2000, "Décrivez le défi (30 caractères au moins).", "2 000 caractères au plus."),
  rulesUrl: z.union([z.literal(""), z.url({ protocol: /^https$/, message: "Le règlement doit être un lien https." }).max(200)]).optional(),
  prizeKind: z.enum(["CAGNOTTE", "SPONSORISE", "LOT"]).optional(),
  prizes: z.array(trimmed(2, 120, "Prix vide.", "120 caractères au plus.")).max(5, "5 prix au plus.").default([]),
  sponsorName: z.string().trim().max(120).optional(),
  sponsorAmount: z.number().int().min(0).max(100_000_000).optional(),
  mentoringMinutes: z.number().int().min(0).max(20 * 60).optional(),
  missionText: z.string().trim().max(600).optional(),
  instructorFee: z.number().int().min(0).max(10_000_000).optional(),
  instructorCount: z.number().int().min(0).max(20).optional(),
});

export const missionsSchema = z.object({ mentorIds: z.array(id).min(1, "Choisissez au moins un mentor.").max(20) });
export const answerMissionSchema = z.object({ accept: z.boolean() });

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
  hackathonId: id,
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
  platforms: z.array(z.enum(["WEB", "ANDROID", "IOS"])).min(1, "Choisissez au moins une plateforme.").max(3),
  url: z.url({ protocol: /^https$/, message: "Indiquez le lien https de l’application." }).max(300),
  minutes: z.number().int().min(5, "5 minutes au moins.").max(30, "Un test dure 30 minutes au plus."),
  slots: z.number().int().min(1).max(50, "50 testeurs au plus."),
  pitch: trimmed(20, 500, "Présentez l’application en une ou deux phrases.", "500 caractères au plus."),
  task: trimmed(10, 200, "Décrivez la tâche à accomplir.", "200 caractères au plus."),
  steps: z.array(trimmed(5, 200, "Chaque étape fait 5 caractères au moins.", "200 caractères au plus.")).min(1, "Ajoutez au moins une étape.").max(5, "5 étapes au plus."),
  questions: z.array(testQuestionSchema).max(3, "3 questions au plus.").default([]),
});

export const testStepSchema = z.object({ index: z.number().int().min(0).max(10), done: z.boolean() });

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
export const verifyCodeSchema = z.object({ code: z.string().trim().regex(/^\d{6}$/, "Le code compte 6 chiffres.") });
export const changeEmailSchema = z.object({ email: z.email("Cette adresse e-mail n’est pas valide.").max(200) });
export const changePasswordSchema = z.object({ current: z.string().max(200).default(""), next: newPassword });
export const deleteAccountSchema = z.object({ password: z.string().max(200).optional(), confirm: z.literal("SUPPRIMER", "Écrivez SUPPRIMER pour confirmer.") });

/* Team tools */

export const adminReportSchema = z.object({
  decision: z.enum(["dismiss", "hide", "warn", "suspend"]),
  note: z.string().trim().max(250).optional(),
});

export const adminMemberSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("reinstate") }),
  z.object({ action: z.literal("revoke"), reason: trimmed(5, 250, "Expliquez en quelques mots.", "250 caractères au plus.") }),
  z.object({ action: z.literal("suspend"), reason: trimmed(5, 250, "Indiquez le motif de la suspension.", "250 caractères au plus.") }),
]);

export const jurySchema = z.object({ jurorIds: z.array(id).length(3, "Choisissez exactement trois jurés.") });

/* Africa Rise-Up */

export const RISE_DOMAINS = ["WATER", "HEALTH", "AGRICULTURE", "EDUCATION", "ENERGY", "FINANCE", "OTHER"] as const;

export const riseProjectSchema = z.object({
  name: trimmed(5, 80, "Donnez un nom au projet.", "80 caractères au plus."),
  domain: z.enum(RISE_DOMAINS, "Choisissez le défi visé."),
  summary: trimmed(10, 200, "Résumez le projet en une phrase.", "200 caractères au plus."),
  problem: trimmed(30, 1500, "Décrivez le problème à résoudre (30 caractères au moins).", "1 500 caractères au plus."),
  skills: z.array(trimmed(2, 30, "Compétence vide.", "30 caractères au plus.")).max(8, "8 compétences au plus.").default([]),
  skill: z.string().trim().max(30).optional(),
});

export const risePostSchema = z.object({ body: trimmed(2, 2000, "Écrivez votre message.", "2 000 caractères au plus."), parentId: id.optional() });

export const riseEventSchema = z.object({
  title: trimmed(3, 100, "Donnez un titre à l’événement.", "100 caractères au plus."),
  agenda: trimmed(5, 600, "Indiquez l’ordre du jour.", "600 caractères au plus."),
  startsAt: z.iso.datetime({ offset: true, message: "Indiquez la date et l’heure." }),
  minutes: z.number().int().min(15, "15 minutes au moins.").max(240, "4 heures au plus."),
  meetingUrl: z.union([z.literal(""), z.url({ protocol: /^https$/, message: "Le lien de visio doit commencer par https://." }).max(200)]).optional(),
  notify: z.boolean().default(true),
});

export const joinSchema = z.object({ skill: z.string().trim().max(30).optional() });

/* Voice rooms */

export const roomSchema = z.object({
  title: trimmed(5, 100, "Donnez un titre au salon (5 caractères au moins).", "100 caractères au plus."),
  description: trimmed(10, 600, "Dites en une phrase de quoi vous allez parler.", "600 caractères au plus."),
  now: z.boolean(),
  startsAt: z.iso.datetime({ offset: true, message: "Indiquez la date et l’heure." }).optional(),
});
export const roomHandSchema = z.object({ up: z.boolean() });
export const roomSpeakerSchema = z.object({ userId: id, speak: z.boolean() });
export const roomMemberSchema = z.object({ userId: id });
