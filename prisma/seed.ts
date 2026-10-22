/*
 * Demo data: the members shown in the design, their contacts, conversations and invitations.
 * Every account uses the password "kabad-demo-2026". Never run against production.
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Role } from "../src/generated/prisma/client";

// Demo data, with public passwords and a team account: only on a database of this machine.
const seedHost = (() => {
  try {
    return new URL(process.env.DATABASE_URL ?? "").hostname;
  } catch {
    return "";
  }
})();
if ((process.env.NODE_ENV === "production" || !["127.0.0.1", "localhost", "::1"].includes(seedHost)) && process.env.SEED_FORCE !== "1") {
  console.error("Seed refusé : il ne tourne que sur une base locale (127.0.0.1 ou localhost), jamais en production.");
  process.exit(1);
}

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
export const DEMO_PASSWORD = "kabad-demo-2026";

type SeedUser = { id: string; email: string; name: string; role: Role; city: string; country: string; diaspora?: boolean; years: number; headline: string; bio: string; stack: string[]; mentorCapacity?: number; replyTime?: string; profileLink?: string };

const users: SeedUser[] = [
  { id: "kossi", email: "kossi.mensah@exemple.tg", name: "Kossi Mensah", role: "JUNIOR", city: "Lomé", country: "Togo", years: 2, headline: "Développeur Node.js", bio: "Je construis une API de paiement mobile et je veux la rendre fiable.", stack: ["TypeScript", "Node.js", "React"], profileLink: "github.com/kmensah" },
  { id: "awa", email: "awa.diop@exemple.sn", name: "Awa Diop", role: "SENIOR", city: "Dakar", country: "Sénégal", years: 9, headline: "Lead dev chez une fintech", bio: "J’aide les juniors à passer du tutoriel au vrai projet : architecture d’API, tests et revue de code. Disponible le soir, heure de Dakar.", stack: ["TypeScript", "Node.js", "React", "PostgreSQL", "Docker"], mentorCapacity: 2, replyTime: "Répond en général sous 24 h", profileLink: "github.com/awadiop" },
  { id: "moussa", email: "moussa.traore@exemple.fr", name: "Moussa Traoré", role: "SENIOR", city: "Paris", country: "France", diaspora: true, years: 11, headline: "Lead back-end", bio: "Back-end Node.js et PostgreSQL. Préparation aux entretiens techniques.", stack: ["Node.js", "PostgreSQL", "TypeScript"], mentorCapacity: 2, replyTime: "Répond en général sous 48 h", profileLink: "linkedin.com/in/moussatraore" },
  { id: "nadia", email: "nadia.bello@exemple.ca", name: "Nadia Bello", role: "SENIOR", city: "Montréal", country: "Canada", diaspora: true, years: 7, headline: "Développeuse mobile", bio: "Applications mobiles React Native, publication sur les stores.", stack: ["React Native", "TypeScript", "Node.js"], mentorCapacity: 1, profileLink: "github.com/nadiabello" },
  { id: "ibrahim", email: "ibrahim.kabore@exemple.bf", name: "Ibrahim Kaboré", role: "SENIOR", city: "Ouagadougou", country: "Burkina Faso", years: 12, headline: "Architecte mobile", bio: "Flutter et paiements mobiles. Projets à impact pour l’agriculture.", stack: ["Flutter", "Dart", "Firebase"], mentorCapacity: 0, profileLink: "github.com/ikabore" },
  { id: "yao", email: "yao.koffi@exemple.tg", name: "Yao Koffi", role: "JUNIOR", city: "Lomé", country: "Togo", years: 1, headline: "Développeur front-end", bio: "J’apprends React et j’adore les interfaces soignées.", stack: ["React", "CSS"] },
  { id: "chidi", email: "chidi.okafor@exemple.ng", name: "Chidi Okafor", role: "JUNIOR", city: "Lagos", country: "Nigeria", years: 3, headline: "Développeur TypeScript", bio: "Je construis TontineApp, une tontine sur mobile.", stack: ["TypeScript", "React"] },
  { id: "fatou", email: "fatou.sow@exemple.ci", name: "Fatou Sow", role: "JUNIOR", city: "Abidjan", country: "Côte d’Ivoire", years: 2, headline: "Développeuse full-stack", bio: "Je construis SantéDirect pour prendre rendez-vous chez le médecin.", stack: ["React", "Python"] },
];

const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000);
const daysFromNow = (d: number, hourUtc = 23, minute = 59) => {
  const x = new Date(Date.now() + d * 86_400_000);
  x.setUTCHours(hourUtc, minute, 0, 0);
  return x;
};
// A 1×1 PNG, enough to stand for a tester's screenshot.
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");
const directKey = (a: string, b: string) => [a, b].sort().join(":");

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  await db.$executeRawUnsafe(
    `TRUNCATE "User", "Challenge", "RateLimit" CASCADE`,
  );

  const now = new Date();
  await db.user.createMany({
    data: [
      ...users.map((u) => ({ ...u, diaspora: u.diaspora ?? false, passwordHash, emailVerifiedAt: minutesAgo(60 * 24 * 100), seniorVerifiedAt: u.role === "SENIOR" ? minutesAgo(60 * 24 * 90) : null })),
      // The team account: verifies seniors, closes challenges, publishes results and records transfers.
      { id: "equipe", email: "equipe@kabad.app", name: "Équipe KABAD", role: "JUNIOR" as Role, city: "Lomé", country: "Togo", passwordHash, isAdmin: true, emailVerifiedAt: now },
    ],
  });

  // Contacts come from accepted invitations.
  const accepted: Array<[string, string, string, number]> = [
    ["kossi", "moussa", "Bonjour Moussa, je suis développeur Node.js à Lomé. Je prépare une API de paiement mobile et j’aimerais avoir votre avis sur la structure de la base. Seriez-vous ouvert à un échange ?", 300],
    ["awa", "kossi", "Bonjour Kossi, j’ai vu votre demande de mentorat. Parlons de votre projet.", 60 * 24 * 40],
    ["yao", "kossi", "Salut Kossi, on est tous les deux à Lomé. On se suit ?", 60 * 24 * 20],
  ];
  for (const [from, to, message, ago] of accepted) {
    await db.invitation.create({ data: { fromId: from, toId: to, message, status: "ACCEPTED", createdAt: minutesAgo(ago), answeredAt: minutesAgo(ago - 5) } });
    await db.contact.createMany({ data: [{ userId: from, contactId: to }, { userId: to, contactId: from }] });
  }

  await db.invitation.createMany({
    data: [
      { fromId: "chidi", toId: "kossi", message: "Salut Kossi ! On participe au même défi. Ça te dirait d’échanger sur la gestion des webhooks ? J’ai galéré avec les doublons et j’ai vu que tu avais avancé dessus.", createdAt: minutesAgo(140) },
      { fromId: "fatou", toId: "kossi", message: "Bonjour, je cherche un testeur Android pour SantéDirect. Vous auriez 10 minutes cette semaine ?", createdAt: minutesAgo(60 * 26) },
    ],
  });

  async function direct(a: string, b: string, lines: Array<[string | null, string, number]>, readUpToAll = true) {
    const c = await db.conversation.create({
      data: {
        kind: "DIRECT",
        directKey: directKey(a, b),
        createdAt: minutesAgo(lines[0][2] + 1),
        lastMessageAt: minutesAgo(lines[lines.length - 1][2]),
        members: { create: [{ userId: a, lastReadAt: readUpToAll ? new Date() : minutesAgo(9999) }, { userId: b, lastReadAt: readUpToAll ? new Date() : minutesAgo(9999) }] },
      },
    });
    await db.message.createMany({
      data: lines.map(([author, body, ago]) => ({ conversationId: c.id, authorId: author, kind: author ? "TEXT" : "SYSTEM", body, createdAt: minutesAgo(ago) })),
    });
    return c;
  }

  await direct("kossi", "moussa", [
    ["kossi", accepted[0][2], 300],
    [null, "Moussa a accepté l’invitation", 295],
    ["moussa", "Avec plaisir. Envoyez-moi le schéma de la base.", 160],
    ["kossi", "Voici la table des paiements :\n\nmodel Payment {\n  id       String @id\n  eventId  String @unique\n  amount   Int\n}", 149],
    ["moussa", "Bien vu pour le @unique sur eventId : c’est ce qui vous protège des doublons. Gardez le montant en entier, en F CFA.", 140],
  ]);
  await direct("kossi", "awa", [
    ["awa", "Bonne séance ! Pense à confirmer la durée dans le journal.", 60 * 20 + 7],
    ["kossi", "Merci pour la séance, à jeudi !", 60 * 20],
  ]);
  await direct("kossi", "yao", [["yao", "Tu viens au meetup samedi ?", 60 * 24 * 3]]);

  const group = await db.conversation.create({
    data: {
      kind: "GROUP",
      name: "API Lomé",
      createdById: "kossi",
      createdAt: minutesAgo(60 * 24 * 2),
      lastMessageAt: minutesAgo(30),
      members: {
        create: [
          { userId: "kossi", role: "OWNER", lastReadAt: minutesAgo(60) },
          { userId: "yao", lastReadAt: new Date() },
          { userId: "moussa", lastReadAt: new Date() },
        ],
      },
    },
  });
  await db.message.createMany({
    data: [
      { conversationId: group.id, authorId: null, kind: "SYSTEM", body: "Kossi a créé le groupe et ajouté Yao et Moussa", createdAt: minutesAgo(60 * 24 * 2) },
      { conversationId: group.id, authorId: "yao", body: "J’ai poussé la correction des doublons sur la branche fix/webhooks, vous pouvez relire ?", createdAt: minutesAgo(48) },
      { conversationId: group.id, authorId: "moussa", body: "Je regarde ce soir. Tu as ajouté un test pour le cas où la signature est fausse ?", createdAt: minutesAgo(45) },
      { conversationId: group.id, authorId: "yao", body: "Pas encore. Kossi, Awa t’a montré comment faire ?", createdAt: minutesAgo(30) },
    ],
  });


  /* Mentoring: Awa mentors Kossi. Three sessions confirmed (4 h 30), the last one waits for Kossi. */
  let nextSession = new Date(now);
  nextSession.setUTCHours(19, 0, 0, 0);
  if (nextSession <= now) nextSession = new Date(nextSession.getTime() + 86_400_000);
  await db.pair.create({
    data: { id: "awa-kossi", mentorId: "awa", menteeId: "kossi", project: "API de paiement mobile money", repo: "github.com/kmensah/momo-api", createdAt: minutesAgo(60 * 24 * 45), nextSessionAt: nextSession },
  });
  const sessions: Array<[string, number, number, string, string, string, string, boolean]> = [
    ["s1", 21, 90, "Découpage du projet", "Découpage en trois modules : encaissement, webhooks, tableau de bord.", "Dessiner le schéma de la base.", "awa", true],
    ["s2", 14, 105, "Schéma de la base", "Tables des paiements et des événements, montants en entiers.", "Écrire les premiers tests.", "kossi", true],
    ["s3", 7, 75, "Tests avec Vitest", "Premiers tests unitaires du calcul des frais.", "Gérer les webhooks en double.", "awa", true],
    ["s4", 0, 90, "Webhooks idempotents", "Ajout d’une table des événements reçus avec une clé unique. Un webhook reçu deux fois n’est traité qu’une fois. Premier test Vitest qui le vérifie.", "Vérifier la signature du webhook avant tout traitement.", "awa", false],
  ];
  for (const [id, daysAgo, minutes, topic, done, next, notedById, both] of sessions) {
    const startsAt = daysFromNow(-daysAgo - 1, 19, 0);
    await db.mentoringSession.create({ data: { id, pairId: "awa-kossi", startsAt, minutes, topic, done, next, notedById, confirmedByMentor: true, confirmedByMentee: both, createdAt: startsAt } });
  }
  await db.mentorRequest.create({
    data: { menteeId: "fatou", mentorId: "moussa", project: "SantéDirect", situation: "Mon API Django répond lentement quand il y a beaucoup de rendez-vous. Je veux apprendre à mesurer et à optimiser les requêtes.", repo: "github.com/fatousow/sante-direct", topics: ["Architecture", "Tests"], createdAt: minutesAgo(60 * 5) },
  });

  /* Capsules */
  await db.capsule.createMany({
    data: [
      { id: "webhook-deux-fois", authorId: "awa", title: "Recevoir un webhook deux fois sans payer deux fois", theme: "BACKEND", tags: ["Paiement"], minutes: 3, reads: 212, createdAt: minutesAgo(60 * 24 * 6),
        body: "Un opérateur de paiement renvoie un webhook tant qu’il n’a pas reçu de réponse 200. Votre serveur le recevra donc parfois deux fois, ou plus.\n\nLa parade : enregistrer l’identifiant de l’événement avec une contrainte d’unicité avant de traiter quoi que ce soit. Si l’insertion échoue, l’événement est déjà traité : répondez 200 et arrêtez-vous là.\n\nVérifiez aussi la signature avant tout, sinon n’importe qui peut vous envoyer un faux paiement.",
        code: "const seen = await db.event.findUnique({\n  where: { id: req.headers['x-event-id'] }\n})\nif (seen) return res.sendStatus(200) // déjà traité" },
      { id: "entretien-paris", authorId: "moussa", title: "Réussir un entretien technique avec une équipe à Paris, depuis Cotonou", theme: "CAREER", tags: [], minutes: 5, reads: 1048, createdAt: minutesAgo(60 * 24 * 12),
        body: "Les équipes européennes regardent d’abord comment vous raisonnez à voix haute. Préparez trois projets que vous pouvez expliquer en détail : le problème, vos choix, ce que vous referiez autrement.\n\nTestez votre connexion et votre micro la veille, ayez un plan B (partage de connexion). Annoncez votre fuseau horaire et proposez des créneaux clairs.\n\nPendant l’exercice de code, posez des questions avant d’écrire, écrivez un test simple, puis améliorez. Un code qui marche et que vous savez expliquer vaut mieux qu’un code brillant et confus." },
      { id: "flutter-3g", authorId: "ibrahim", title: "Une app Flutter qui marche avec une connexion 3G instable", theme: "MOBILE", tags: ["Réseau"], minutes: 4, reads: 387, createdAt: minutesAgo(60 * 24 * 20),
        body: "Partez du principe que le réseau va couper. Gardez les données en local d’abord (SQLite ou Hive), affichez-les tout de suite, puis synchronisez en arrière-plan.\n\nMettez les envois dans une file avec un identifiant unique : si l’envoi échoue, il repartira plus tard sans créer de doublon côté serveur.\n\nRéduisez la taille des réponses : pagination, images compressées, et des délais d’attente courts avec de nouvelles tentatives espacées." },
    ],
  });

  /* Challenges */
  await db.challenge.createMany({
    data: [
      { id: "api-mobile-money", title: "API de paiement mobile money", kind: "CAGNOTTE", level: "Intermédiaire", stack: "Node.js ou Python", closesAt: daysFromNow(6), requiresMentoring: true,
        description: "Construire une API qui encaisse un paiement mobile money, reçoit la confirmation par webhook et ne débite jamais deux fois. Dépôt public, tests inclus." },
      { id: "tableau-cooperatives", title: "Tableau de bord hors ligne pour coopératives", kind: "SPONSORISE", level: "Avancé", stack: "PWA", closesAt: daysFromNow(13), sponsorName: "Une entreprise de Cotonou", sponsorAmount: 400000,
        description: "Une application qui fonctionne sans connexion et synchronise les ventes d’une coopérative dès que le réseau revient." },
      { id: "formulaire-wolof", title: "Formulaire accessible en wolof et en français", kind: "LOT", level: "Débutant", stack: "HTML et CSS", closesAt: daysFromNow(20), prizeLabel: "Un ordinateur portable",
        description: "Un formulaire d’inscription utilisable au clavier, lisible par un lecteur d’écran, en wolof et en français." },
      { id: "raccourcisseur", title: "Raccourcisseur de liens avec statistiques", kind: "CAGNOTTE", status: "JURY", level: "Intermédiaire", stack: "Au choix", closesAt: daysFromNow(-3), resultsAt: daysFromNow(7, 18, 0), requiresMentoring: true,
        description: "Un service qui raccourcit les liens et compte les visites par pays." },
      { id: "inscription-accessible", title: "Page d’inscription accessible", kind: "CAGNOTTE", status: "DONE", level: "Débutant", stack: "HTML, CSS et JavaScript", closesAt: daysFromNow(-9), requiresMentoring: true,
        publishedAt: daysFromNow(-8, 12, 0), resultsAt: daysFromNow(-8, 12, 0), description: "Une page d’inscription utilisable au clavier et par un lecteur d’écran." },
    ],
  });
  const juries: Record<string, string[]> = {
    "api-mobile-money": ["moussa", "nadia", "ibrahim"],
    "tableau-cooperatives": ["awa", "moussa", "nadia"],
    "formulaire-wolof": ["awa", "ibrahim", "nadia"],
    raccourcisseur: ["moussa", "awa", "ibrahim"],
    "inscription-accessible": ["awa", "nadia", "ibrahim"],
  };
  await db.challengeJuror.createMany({ data: Object.entries(juries).flatMap(([challengeId, ids]) => ids.map((userId) => ({ challengeId, userId }))) });

  // Paid contributions that make up each pot.
  type Contrib = { name: string; amount: number; company?: boolean; anonymous?: boolean };
  const pot = (big: Contrib[], count: number, each: number, last: number): Contrib[] => [
    ...big,
    ...Array.from({ length: count }, (_, i) => ({ name: `Contributeur ${i + 1}`, amount: i === count - 1 ? last : each, anonymous: i % 3 === 0 })),
  ];
  const pots: Record<string, Contrib[]> = {
    "api-mobile-money": pot(
      [{ name: "Une entreprise de Cotonou", amount: 100000, company: true }, { name: "Moussa Traoré", amount: 25000 }, { name: "Anonyme", amount: 10000, anonymous: true }, { name: "Atelier Numérique de Lomé", amount: 20000, company: true }, { name: "Studio Baobab", amount: 20000, company: true }],
      37, 2000, 3000,
    ),
    raccourcisseur: pot([], 18, 6000, 18000),
    "inscription-accessible": pot([], 12, 2500, 2500),
  };
  for (const [challengeId, list] of Object.entries(pots)) {
    await db.contribution.createMany({
      data: list.map((c, i) => ({
        challengeId,
        amount: c.amount,
        displayName: c.name,
        email: `sponsor${i}@exemple.org`,
        anonymous: c.anonymous ?? false,
        company: c.company ?? false,
        status: "PAID" as const,
        createdAt: minutesAgo(60 * 24 * (i < 5 ? 2 + i : 6) + i),
        paidAt: minutesAgo(60 * 24 * (i < 5 ? 2 + i : 6) + i),
      })),
    });
  }

  const solution = (who: string, repo: string) => ({ repoUrl: `https://github.com/${who}/${repo}`, explanation: "Chaque cas est couvert par un test. J’explique mes choix dans le README : structure, validation des entrées, gestion des erreurs.", payoutOperator: "Moov Money", payoutPhone: "+228 96 12 34 56" });
  await db.submission.createMany({
    data: [
      { challengeId: "api-mobile-money", userId: "chidi", ...solution("chidiokafor", "momo-pay") },
      { challengeId: "api-mobile-money", userId: "fatou", ...solution("fatousow", "paiement-api") },
      { id: "sub-short-chidi", challengeId: "raccourcisseur", userId: "chidi", ...solution("chidiokafor", "short"), demoUrl: "https://short.exemple.ng" },
      { id: "sub-short-fatou", challengeId: "raccourcisseur", userId: "fatou", ...solution("fatousow", "lien-court") },
      { id: "sub-short-yao", challengeId: "raccourcisseur", userId: "yao", ...solution("yaokoffi", "petit-lien") },
      { id: "sub-ins-kossi", challengeId: "inscription-accessible", userId: "kossi", ...solution("kmensah", "inscription-a11y"), createdAt: daysFromNow(-12) },
      { id: "sub-ins-fatou", challengeId: "inscription-accessible", userId: "fatou", ...solution("fatousow", "inscription"), createdAt: daysFromNow(-11) },
      { id: "sub-ins-chidi", challengeId: "inscription-accessible", userId: "chidi", ...solution("chidiokafor", "signup"), createdAt: daysFromNow(-10) },
    ],
  });
  const score = (submissionId: string, jurorId: string, [works, code, tests, explain]: number[]) => ({ submissionId, jurorId, works, code, tests, explain });
  await db.juryScore.createMany({
    data: [
      // Averages 17.3, 16.7 and 15.7: Kossi wins.
      score("sub-ins-kossi", "awa", [5, 4, 4, 4]), score("sub-ins-kossi", "nadia", [5, 4, 4, 4]), score("sub-ins-kossi", "ibrahim", [5, 5, 4, 4]),
      score("sub-ins-fatou", "awa", [5, 4, 4, 4]), score("sub-ins-fatou", "nadia", [4, 4, 4, 4]), score("sub-ins-fatou", "ibrahim", [5, 4, 4, 4]),
      score("sub-ins-chidi", "awa", [4, 4, 4, 4]), score("sub-ins-chidi", "nadia", [4, 4, 4, 3]), score("sub-ins-chidi", "ibrahim", [4, 4, 4, 4]),
      // The raccourcisseur jury is still at work.
      score("sub-short-chidi", "awa", [5, 4, 3, 4]),
    ],
  });
  await db.payout.createMany({
    data: [
      { challengeId: "inscription-accessible", role: "WINNER", beneficiaryId: "kossi", amount: 18000, operator: "Moov Money", phone: "+228 96 12 34 56", reference: "PO-2610-0482", status: "SENT", sentAt: daysFromNow(-5, 10, 0) },
      { challengeId: "inscription-accessible", role: "MENTOR", beneficiaryId: "awa", amount: 9000, operator: "Wave", phone: "+221 77 000 00 00", reference: "PO-2610-0483", status: "SENT", sentAt: daysFromNow(-5, 10, 5) },
      { challengeId: "inscription-accessible", role: "PLATFORM", amount: 3000, reference: "PO-2610-0484", status: "SENT", sentAt: daysFromNow(-5, 10, 10) },
    ],
  });

  /* Community tests */
  await db.testApp.createMany({
    data: [
      { id: "marche-vert", ownerId: "awa", name: "Marché Vert", platform: "WEB", url: "https://marche-vert.exemple.sn", minutes: 15, slots: 10, createdAt: minutesAgo(60 * 24 * 8),
        pitch: "Une boutique en ligne pour les maraîchers de Thiès. Awa veut savoir si la commande est simple sur un petit téléphone.",
        task: "Passer une commande de légumes jusqu’au paiement, sur un petit écran.",
        steps: ["Ouvrez l’app sur votre téléphone, pas sur un ordinateur.", "Ajoutez trois légumes au panier, dont un en promotion.", "Allez jusqu’au paiement. Le paiement est en mode test, rien n’est débité."],
        questions: [{ q: "Quel légume était en promotion ?", options: ["Les tomates", "Le gombo", "Les oignons"], answer: "Le gombo" }, { q: "Quel total s’affichait avant le paiement ?", answer: "3 850 F CFA" }] },
      { id: "tontine-app", ownerId: "chidi", name: "TontineApp", platform: "ANDROID", url: "https://tontine.exemple.ng/apk", minutes: 20, slots: 8, createdAt: minutesAgo(60 * 24 * 5),
        pitch: "Une tontine sur mobile entre amis ou collègues.", task: "Créer une tontine, inviter 3 personnes et vérifier les rappels.",
        steps: ["Installez l’application depuis le lien.", "Créez une tontine de 5 000 F CFA par mois.", "Invitez trois personnes et vérifiez les rappels."],
        questions: [{ q: "Quel jour tombe le premier rappel ?", answer: "Le 1er du mois" }] },
      { id: "sante-direct", ownerId: "fatou", name: "SantéDirect", platform: "WEB", url: "https://sante-direct.exemple.ci", minutes: 10, slots: 12, createdAt: minutesAgo(60 * 24 * 2),
        pitch: "Prendre rendez-vous chez le médecin en quelques gestes.", task: "Prendre un rendez-vous et l’annuler. Signaler tout texte peu clair.",
        steps: ["Ouvrez le site sur votre téléphone.", "Prenez un rendez-vous pour la semaine prochaine.", "Annulez-le depuis votre compte."],
        questions: [{ q: "Combien de créneaux étaient libres le mardi ?", answer: "4" }] },
    ],
  });
  const report = async (testAppId: string, testerId: string, status: "SUBMITTED" | "VALIDATED", answers: Array<[string, string, boolean]>, remarks: string, ago: number) => {
    const r = await db.testReport.create({
      data: { testAppId, testerId, device: "Android", status, remarks, createdAt: minutesAgo(ago), reviewedAt: status === "VALIDATED" ? minutesAgo(ago - 60) : null, answers: answers.map(([question, answer, correct]) => ({ question, answer, correct })) },
    });
    const steps = (await db.testApp.findUniqueOrThrow({ where: { id: testAppId }, select: { steps: true } })).steps.length;
    await db.screenshot.createMany({ data: Array.from({ length: steps }, (_, position) => ({ reportId: r.id, position, mime: "image/png", data: PNG })) });
  };
  const mv = (a: string, b: string): Array<[string, string, boolean]> => [["Quel légume était en promotion ?", a, a === "Le gombo"], ["Quel total s’affichait avant le paiement ?", b, b === "3 850 F CFA"]];
  await report("marche-vert", "kossi", "SUBMITTED", mv("Le gombo", "3 850 F CFA"), "Le bouton « Payer » est caché sous le clavier quand je saisis mon numéro. Le reste est clair.", 90);
  await report("marche-vert", "yao", "SUBMITTED", mv("Le gombo", "3 800 F CFA"), "Les photos des légumes chargent lentement en 3G.", 60 * 6);
  for (const [i, tester] of ["chidi", "fatou", "moussa", "nadia", "ibrahim"].entries()) {
    await report("marche-vert", tester, "VALIDATED", mv("Le gombo", "3 850 F CFA"), "Commande simple, rien à signaler.", 60 * 24 * (i + 2));
  }
  await report("tontine-app", "kossi", "VALIDATED", [["Quel jour tombe le premier rappel ?", "Le 1er du mois", true]], "Clair. Le rappel arrive bien.", 60 * 24 * 3);

  /* Voice rooms */
  await db.voiceRoom.create({
    data: { id: "salon-entretiens", title: "Réussir son premier entretien tech à l’étranger", description: "Moussa raconte ses entretiens à Paris et répond à vos questions. Levez la main pour parler.", hostId: "moussa", startsAt: daysFromNow(1, 19, 0), participants: { create: { userId: "moussa", role: "HOST", leftAt: now } }, interests: { create: [{ userId: "yao" }, { userId: "chidi" }] } },
  });
  await db.voiceRoom.create({
    data: { id: "salon-webhooks", title: "Webhooks : les erreurs qui coûtent cher", description: "Retour d’expérience d’Awa sur les paiements mobile money.", hostId: "awa", status: "ENDED", startsAt: daysFromNow(-3, 18, 0), startedAt: daysFromNow(-3, 18, 0), endedAt: daysFromNow(-3, 19, 10), participants: { create: { userId: "awa", role: "HOST", leftAt: daysFromNow(-3, 19, 10) } } },
  });

  /* Kossi's notifications */
  const n = (actor: string, text: string, href: string, icon: string, tone: string, ago: number, read = false) => ({ userId: "kossi", actor, text, href, icon, tone, createdAt: minutesAgo(ago), readAt: read ? minutesAgo(ago - 1) : null });
  await db.notification.createMany({
    data: [
      n("Awa Diop", "a noté une séance de 1 h 30. Confirmez-la pour qu’elle compte.", "/mentorat/seances/s4", "clock", "brand", 12),
      n("Chidi Okafor", "vous invite à échanger.", "/messages?onglet=invitations", "user", "brand", 140),
      n("Défi « API de paiement mobile money »", " : la cagnotte atteint 250 000 F CFA.", "/defis/api-mobile-money", "trophy", "accent", 60 * 9),
      n("Chidi Okafor", "a validé votre rapport de test sur « TontineApp ».", "/tests/tontine-app", "check", "success", 60 * 24 * 3 - 60, true),
      n("KABAD", "a versé 18 000 F CFA sur votre Mobile Money pour le défi « Page d’inscription accessible ».", "/defis/inscription-accessible/resultats", "wallet", "accent", 60 * 24 * 5, true),
    ],
  });

  console.log(`Seed terminé : ${users.length} membres et le compte équipe@kabad.app. Mot de passe : ${DEMO_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
