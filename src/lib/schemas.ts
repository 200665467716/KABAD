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
