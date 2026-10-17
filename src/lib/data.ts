/*
 * Sample data for the interface. Every name, amount and date here is an example,
 * shaped like the records the API will return once the database is wired in.
 * The signed-in member is Kossi Mensah, a junior developer in Lomé.
 */
import type { SessionConfirmation } from "./mentoring";

export type Role = "junior" | "senior";

export type Member = {
  id: string;
  name: string;
  role: Role;
  city: string;
  country: string;
  diaspora?: boolean;
  years: number;
  headline: string;
  bio: string;
  stack: string[];
  stats?: { pairs: number; hours: number; judged: number };
  openSlots?: number;
  replyTime?: string;
};

export const CURRENT_USER_ID = "kossi";

export const members: Member[] = [
  { id: "kossi", name: "Kossi Mensah", role: "junior", city: "Lomé", country: "Togo", years: 2, headline: "Développeur Node.js", bio: "Je construis une API de paiement mobile et je veux la rendre fiable.", stack: ["TypeScript", "Node.js", "React"] },
  { id: "awa", name: "Awa Diop", role: "senior", city: "Dakar", country: "Sénégal", years: 9, headline: "Lead dev chez une fintech", bio: "J’aide les juniors à passer du tutoriel au vrai projet : architecture d’API, tests et revue de code. Disponible le soir, heure de Dakar.", stack: ["TypeScript", "Node.js", "React", "PostgreSQL", "Docker"], stats: { pairs: 7, hours: 86, judged: 4 }, openSlots: 1, replyTime: "Répond en général sous 24 h" },
  { id: "moussa", name: "Moussa Traoré", role: "senior", city: "Paris", country: "France", diaspora: true, years: 11, headline: "Lead back-end", bio: "Back-end Node.js et PostgreSQL. Préparation aux entretiens techniques.", stack: ["Node.js", "PostgreSQL", "TypeScript"], stats: { pairs: 5, hours: 64, judged: 6 }, openSlots: 2, replyTime: "Répond en général sous 48 h" },
  { id: "nadia", name: "Nadia Bello", role: "senior", city: "Montréal", country: "Canada", diaspora: true, years: 7, headline: "Développeuse mobile", bio: "Applications mobiles React Native, publication sur les stores.", stack: ["React Native", "TypeScript", "Node.js"], stats: { pairs: 4, hours: 41, judged: 3 }, openSlots: 1 },
  { id: "ibrahim", name: "Ibrahim Kaboré", role: "senior", city: "Ouagadougou", country: "Burkina Faso", years: 12, headline: "Architecte mobile", bio: "Flutter et paiements mobiles. Projets à impact pour l’agriculture.", stack: ["Flutter", "Dart", "Firebase"], stats: { pairs: 9, hours: 120, judged: 5 }, openSlots: 0 },
  { id: "yao", name: "Yao Koffi", role: "junior", city: "Lomé", country: "Togo", years: 1, headline: "Développeur front-end", bio: "J’apprends React et j’adore les interfaces soignées.", stack: ["React", "CSS"] },
  { id: "chidi", name: "Chidi Okafor", role: "junior", city: "Lagos", country: "Nigeria", years: 3, headline: "Développeur TypeScript", bio: "Je construis TontineApp, une tontine sur mobile.", stack: ["TypeScript", "React"] },
  { id: "fatou", name: "Fatou Sow", role: "junior", city: "Abidjan", country: "Côte d’Ivoire", years: 2, headline: "Développeuse full-stack", bio: "Je construis SantéDirect pour prendre rendez-vous chez le médecin.", stack: ["React", "Python"] },
];

export function member(id: string): Member {
  const m = members.find((x) => x.id === id);
  if (!m) throw new Error(`Membre inconnu : ${id}`);
  return m;
}

export const seniors = () => members.filter((m) => m.role === "senior");

/* Mentoring */

export type Session = SessionConfirmation & {
  id: string;
  date: string;
  longDate: string;
  start: string;
  topic: string;
  done: string;
  next: string;
  notedBy: string;
};

export type Pair = { id: string; mentorId: string; menteeId: string; project: string; repo: string; since: string; sessions: Session[]; nextSession: { when: string; inHours: number } };

export const pair: Pair = {
  id: "awa-kossi",
  mentorId: "awa",
  menteeId: "kossi",
  project: "API de paiement mobile money",
  repo: "github.com/kmensah/momo-api",
  since: "2 septembre",
  nextSession: { when: "Aujourd’hui · 19 h 00", inHours: 2 },
  sessions: [
    { id: "s4", date: "17 oct.", longDate: "17 octobre", start: "19 h 00", topic: "Webhooks idempotents", minutes: 90, confirmedByMentor: true, confirmedByMentee: false, notedBy: "awa", done: "Ajout d’une table des événements reçus avec une clé unique. Un webhook reçu deux fois n’est traité qu’une fois. Premier test Vitest qui le vérifie.", next: "Vérifier la signature du webhook avant tout traitement." },
    { id: "s3", date: "10 oct.", longDate: "10 octobre", start: "19 h 00", topic: "Tests avec Vitest", minutes: 75, confirmedByMentor: true, confirmedByMentee: true, notedBy: "awa", done: "Premiers tests unitaires du calcul des frais.", next: "Gérer les webhooks en double." },
    { id: "s2", date: "3 oct.", longDate: "3 octobre", start: "19 h 30", topic: "Schéma de la base", minutes: 105, confirmedByMentor: true, confirmedByMentee: true, notedBy: "kossi", done: "Tables des paiements et des événements, montants en entiers.", next: "Écrire les premiers tests." },
    { id: "s1", date: "26 sept.", longDate: "26 septembre", start: "19 h 00", topic: "Découpage du projet", minutes: 90, confirmedByMentor: true, confirmedByMentee: true, notedBy: "awa", done: "Découpage en trois modules : encaissement, webhooks, tableau de bord.", next: "Dessiner le schéma de la base." },
  ],
};

/* Capsules */

export type Capsule = { id: string; title: string; authorId: string; minutes: number; reads: number; tags: string[]; theme: "Back-end" | "Mobile" | "Carrière"; code?: string };

export const capsules: Capsule[] = [
  { id: "webhook-deux-fois", title: "Recevoir un webhook deux fois sans payer deux fois", authorId: "awa", minutes: 3, reads: 212, theme: "Back-end", tags: ["Paiement"], code: "const seen = await db.event.findUnique({\n  where: { id: req.headers['x-event-id'] }\n})\nif (seen) return res.sendStatus(200) // déjà traité" },
  { id: "entretien-paris", title: "Réussir un entretien technique avec une équipe à Paris, depuis Cotonou", authorId: "moussa", minutes: 5, reads: 1048, theme: "Carrière", tags: [] },
  { id: "flutter-3g", title: "Une app Flutter qui marche avec une connexion 3G instable", authorId: "ibrahim", minutes: 4, reads: 387, theme: "Mobile", tags: ["Réseau"] },
];

/* Challenges */

export type ChallengeKind = "cagnotte" | "sponsorise" | "lot";
export type ChallengeStatus = "open" | "jury" | "done";

export type Challenge = {
  id: string;
  title: string;
  kind: ChallengeKind;
  status: ChallengeStatus;
  level: "Débutant" | "Intermédiaire" | "Avancé";
  stack: string;
  closes: string;
  closesIn: string;
  participants: number;
  pot?: number;
  prizeLabel?: string;
  contributors?: number;
  companies?: number;
  sponsor?: string;
  description: string;
  juryIds: string[];
  requiresMentoring: boolean;
  ranking?: { memberId: string; mark: number }[];
  payout?: { publishedOn: string; contestEndsOn: string; paidOn: string; reference: string; phone: string; operator: string };
};

export const challenges: Challenge[] = [
  { id: "api-mobile-money", title: "API de paiement mobile money", kind: "cagnotte", status: "open", level: "Intermédiaire", stack: "Node.js ou Python", closes: "23 octobre à 23 h 59", closesIn: "6 jours", participants: 38, pot: 250000, contributors: 42, companies: 3, description: "Construire une API qui encaisse un paiement mobile money, reçoit la confirmation par webhook et ne débite jamais deux fois. Dépôt public, tests inclus.", juryIds: ["moussa", "nadia", "ibrahim"], requiresMentoring: true },
  { id: "tableau-cooperatives", title: "Tableau de bord hors ligne pour coopératives", kind: "sponsorise", status: "open", level: "Avancé", stack: "PWA", closes: "30 octobre à 23 h 59", closesIn: "13 jours", participants: 21, pot: 400000, sponsor: "Une entreprise de Cotonou", contributors: 1, companies: 1, description: "Une application qui fonctionne sans connexion et synchronise les ventes d’une coopérative dès que le réseau revient.", juryIds: ["awa", "moussa", "nadia"], requiresMentoring: false },
  { id: "formulaire-wolof", title: "Formulaire accessible en wolof et en français", kind: "lot", status: "open", level: "Débutant", stack: "HTML et CSS", closes: "6 novembre à 23 h 59", closesIn: "20 jours", participants: 64, prizeLabel: "Un ordinateur portable", description: "Un formulaire d’inscription utilisable au clavier, lisible par un lecteur d’écran, en wolof et en français.", juryIds: ["awa", "ibrahim", "nadia"], requiresMentoring: false },
  { id: "raccourcisseur", title: "Raccourcisseur de liens avec statistiques", kind: "cagnotte", status: "jury", level: "Intermédiaire", stack: "Au choix", closes: "15 octobre", closesIn: "", participants: 29, pot: 120000, contributors: 18, companies: 0, description: "Un service qui raccourcit les liens et compte les visites par pays.", juryIds: ["moussa", "awa", "ibrahim"], requiresMentoring: true },
  { id: "inscription-accessible", title: "Page d’inscription accessible", kind: "cagnotte", status: "done", level: "Débutant", stack: "HTML, CSS et JavaScript", closes: "9 octobre", closesIn: "", participants: 41, pot: 30000, contributors: 12, companies: 0, description: "Une page d’inscription utilisable au clavier et par un lecteur d’écran.", juryIds: ["awa", "nadia", "ibrahim"], requiresMentoring: true,
    ranking: [{ memberId: "kossi", mark: 17.3 }, { memberId: "fatou", mark: 16.8 }, { memberId: "chidi", mark: 15.9 }],
    payout: { publishedOn: "9 octobre", contestEndsOn: "11 octobre", paidOn: "12 octobre", reference: "PO-2610-0482", phone: "+228 •• •• 34 56", operator: "Moov Money" } },
];

export const challenge = (id: string) => challenges.find((c) => c.id === id);

export const recentContributions = [
  { who: "Une entreprise de Cotonou", amount: 100000, when: "il y a 2 jours" },
  { who: "Moussa Traoré", amount: 25000, when: "il y a 3 jours" },
  { who: "Anonyme", amount: 10000, when: "il y a 4 jours" },
];

/* Community tests */

export type TestApp = {
  id: string;
  name: string;
  letter: string;
  tone: "success" | "accent" | "brand";
  ownerId: string;
  platform: "Web" | "Android";
  minutes: number;
  slots: number;
  slotsLeft: number;
  pitch: string;
  task: string;
  steps: string[];
  questions: { q: string; options?: string[]; answer: string }[];
  reportsCount: number;
  toRead: number;
};

export const tests: TestApp[] = [
  { id: "marche-vert", name: "Marché Vert", letter: "M", tone: "success", ownerId: "awa", platform: "Web", minutes: 15, slots: 10, slotsLeft: 6, pitch: "Une boutique en ligne pour les maraîchers de Thiès. Awa veut savoir si la commande est simple sur un petit téléphone.", task: "Passer une commande de légumes jusqu’au paiement, sur un petit écran.", steps: ["Ouvrez l’app sur votre téléphone, pas sur un ordinateur.", "Ajoutez trois légumes au panier, dont un en promotion.", "Allez jusqu’au paiement. Le paiement est en mode test, rien n’est débité."], questions: [{ q: "Quel légume était en promotion ?", options: ["Les tomates", "Le gombo", "Les oignons"], answer: "Le gombo" }, { q: "Quel total s’affichait avant le paiement ?", answer: "3 850 F CFA" }], reportsCount: 7, toRead: 2 },
  { id: "tontine-app", name: "TontineApp", letter: "T", tone: "accent", ownerId: "chidi", platform: "Android", minutes: 20, slots: 8, slotsLeft: 3, pitch: "Une tontine sur mobile entre amis ou collègues.", task: "Créer une tontine, inviter 3 personnes et vérifier les rappels.", steps: ["Installez l’application depuis le lien.", "Créez une tontine de 5 000 F CFA par mois.", "Invitez trois personnes et vérifiez les rappels."], questions: [{ q: "Quel jour tombe le premier rappel ?", answer: "Le 1er du mois" }], reportsCount: 5, toRead: 0 },
  { id: "sante-direct", name: "SantéDirect", letter: "S", tone: "brand", ownerId: "fatou", platform: "Web", minutes: 10, slots: 12, slotsLeft: 9, pitch: "Prendre rendez-vous chez le médecin en quelques gestes.", task: "Prendre un rendez-vous et l’annuler. Signaler tout texte peu clair.", steps: ["Ouvrez le site sur votre téléphone.", "Prenez un rendez-vous pour la semaine prochaine.", "Annulez-le depuis votre compte."], questions: [{ q: "Combien de créneaux étaient libres le mardi ?", answer: "4" }], reportsCount: 3, toRead: 0 },
];

export const test = (id: string) => tests.find((t) => t.id === id);

export const receivedReport = {
  testId: "marche-vert",
  testerId: "kossi",
  device: "Android",
  at: "aujourd’hui à 16 h 12",
  duration: "14 min",
  answers: [
    { label: "Légume en promotion", value: "Le gombo", correct: true },
    { label: "Total avant paiement", value: "3 850 F CFA", correct: true },
  ],
  remarks: "Le bouton « Payer » est caché sous le clavier quand je saisis mon numéro. Le reste est clair.",
};

/* Messaging */

export type Message = { id: string; authorId: string; text: string; code?: string; time: string; system?: boolean };
export type Conversation = { id: string; kind: "direct" | "group"; name: string; memberIds: string[]; createdBy?: string; unread: number; when: string; messages: Message[] };

export const conversations: Conversation[] = [
  { id: "api-lome", kind: "group", name: "API Lomé", memberIds: ["kossi", "yao", "chidi"], createdBy: "kossi", unread: 3, when: "14:02", messages: [
    { id: "g0", authorId: "kossi", text: "Vous avez créé le groupe et ajouté Yao et Chidi", time: "", system: true },
    { id: "g1", authorId: "yao", text: "J’ai poussé la correction des doublons sur la branche fix/webhooks, vous pouvez relire ?", time: "14:02" },
    { id: "g2", authorId: "chidi", text: "Je regarde ce soir. Tu as ajouté un test pour le cas où la signature est fausse ?", time: "14:05" },
    { id: "g3", authorId: "yao", text: "Pas encore. Kossi, Awa t’a montré comment faire ?", time: "14:06" },
    { id: "g4", authorId: "kossi", text: "Oui, on l’a vu en séance avec Awa. Je vous partage l’exemple.", time: "14:10" },
  ] },
  { id: "moussa", kind: "direct", name: "Moussa Traoré", memberIds: ["kossi", "moussa"], unread: 0, when: "13:40", messages: [
    { id: "m1", authorId: "kossi", text: "Bonjour Moussa, je suis développeur Node.js à Lomé. Je prépare une API de paiement mobile et j’aimerais avoir votre avis sur la structure de la base. Seriez-vous ouvert à un échange ?", time: "11:02" },
    { id: "m2", authorId: "moussa", text: "Moussa a accepté votre invitation", time: "", system: true },
    { id: "m3", authorId: "moussa", text: "Avec plaisir. Envoyez-moi le schéma de la base.", time: "13:20" },
    { id: "m4", authorId: "kossi", text: "Voici la table des paiements :", code: "model Payment {\n  id       String @id\n  eventId  String @unique\n  amount   Int\n  status   Status\n}", time: "13:31" },
    { id: "m5", authorId: "moussa", text: "Bien vu pour le @unique sur eventId : c’est ce qui vous protège des doublons. Gardez le montant en entier, en F CFA.", time: "13:40" },
  ] },
  { id: "awa", kind: "direct", name: "Awa Diop", memberIds: ["kossi", "awa"], unread: 0, when: "Hier", messages: [
    { id: "a1", authorId: "awa", text: "Bonne séance ! Pense à confirmer la durée dans le journal.", time: "20:34" },
    { id: "a2", authorId: "kossi", text: "Merci pour la séance, à jeudi !", time: "20:41" },
  ] },
  { id: "yao", kind: "direct", name: "Yao Koffi", memberIds: ["kossi", "yao"], unread: 0, when: "Mer.", messages: [
    { id: "y1", authorId: "yao", text: "Tu viens au meetup samedi ?", time: "18:12" },
  ] },
];

export const conversation = (id: string) => conversations.find((c) => c.id === id);

export type Invitation = { id: string; fromId: string; message: string; at: string; stats: string[] };

export const invitations: Invitation[] = [
  { id: "chidi", fromId: "chidi", at: "Aujourd’hui, 11:48", stats: ["2 défis", "5 tests validés"], message: "Salut Kossi ! On participe au même défi. Ça te dirait d’échanger sur la gestion des webhooks ? J’ai galéré avec les doublons et j’ai vu que tu avais avancé dessus." },
  { id: "fatou", fromId: "fatou", at: "Hier, 09:15", stats: ["1 défi", "3 tests validés"], message: "Bonjour, je cherche un testeur Android pour SantéDirect. Vous auriez 10 minutes cette semaine ?" },
];

/* Recommendations shown at the end of sign-up, then in the messaging space */

export const recommendations = [
  { memberId: "awa", why: "Mentore en TypeScript" },
  { memberId: "moussa", why: "Même stack que vous" },
  { memberId: "yao", why: "Même ville" },
  { memberId: "nadia", why: "Disponible pour un binôme" },
  { memberId: "chidi", why: "Participe au même défi" },
  { memberId: "fatou", why: "Cherche un testeur" },
];

/* Notifications */

export type NotificationItem = { id: string; who: string; what: string; when: string; tone: "brand" | "success" | "accent" | "neutral"; icon: "clock" | "user" | "message" | "trophy" | "check" | "wallet"; href: string; unread?: boolean; group: "today" | "week" };

export const notifications: NotificationItem[] = [
  { id: "n1", who: "Awa Diop", what: "a noté une séance de 1 h 30. Confirmez-la pour qu’elle compte.", when: "Il y a 12 min", tone: "brand", icon: "clock", href: "/mentorat/seances/s4", unread: true, group: "today" },
  { id: "n2", who: "Moussa Traoré", what: "a accepté votre invitation. Vous pouvez discuter.", when: "Il y a 1 h", tone: "success", icon: "user", href: "/messages/moussa", unread: true, group: "today" },
  { id: "n3", who: "Groupe API Lomé", what: " : Yao a envoyé 3 messages.", when: "Il y a 2 h", tone: "neutral", icon: "message", href: "/messages/api-lome", unread: true, group: "today" },
  { id: "n4", who: "Défi API mobile money", what: " : la cagnotte atteint 250 000 F CFA.", when: "08:14", tone: "accent", icon: "trophy", href: "/defis/api-mobile-money", unread: true, group: "today" },
  { id: "n5", who: "Awa Diop", what: "a validé votre rapport de test sur « Marché Vert ».", when: "Mardi", tone: "success", icon: "check", href: "/tests/marche-vert", group: "week" },
  { id: "n6", who: "KABAD", what: "a versé 18 000 F CFA sur votre Mobile Money pour le défi « Page d’inscription accessible ».", when: "Lundi", tone: "accent", icon: "wallet", href: "/defis/inscription-accessible/resultats", group: "week" },
];
