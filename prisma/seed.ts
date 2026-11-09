/*
 * Demo data: the members, mentors, hackathons, Rise-Up projects and apps shown in the design.
 * Every account uses the password "kabad-demo-2026". Never run against production.
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Level, type Role } from "../src/generated/prisma/client";

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

type SeedUser = {
  id: string;
  email: string;
  name: string;
  level: Level;
  mentor?: boolean;
  city: string;
  country: string;
  timeZone?: string;
  diaspora?: boolean;
  years: number;
  headline: string;
  bio: string;
  stack: string[];
  goals?: string[];
  profileLink?: string;
};

const users: SeedUser[] = [
  { id: "kossi", email: "kossi.mensah@exemple.tg", name: "Kossi Mensah", level: "INTERMEDIAIRE", city: "Lomé", country: "Togo", years: 2, headline: "Développeur web", bio: "Je construis un paiement régional par mobile money et je veux le rendre fiable.", stack: ["JavaScript", "React", "Node.js"], goals: ["mentor", "hackathons", "rise_up"], profileLink: "github.com/kmensah" },
  { id: "awa", email: "awa.diop@exemple.sn", name: "Awa Diop", level: "SENIOR", mentor: true, city: "Dakar", country: "Sénégal", timeZone: "Africa/Dakar", years: 9, headline: "Lead dev paiements", bio: "J’aide les juniors à passer du tutoriel au vrai projet : API de paiement, mobile money, tests et revue de code.", stack: ["Node.js", "TypeScript", "PostgreSQL"], profileLink: "github.com/awadiop" },
  { id: "ibrahim", email: "ibrahim.keita@exemple.ml", name: "Ibrahim Keïta", level: "SENIOR", mentor: true, city: "Bamako", country: "Mali", timeZone: "Africa/Bamako", years: 11, headline: "Architecte cloud", bio: "Architecture cloud, DevOps et mise en production. J’accompagne les équipes qui passent du prototype au service fiable.", stack: ["AWS", "Kubernetes", "Terraform"], profileLink: "github.com/ikeita" },
  { id: "aicha", email: "aicha.kouassi@exemple.ci", name: "Aïcha Kouassi", level: "SENIOR", mentor: true, city: "Abidjan", country: "Côte d’Ivoire", timeZone: "Africa/Abidjan", years: 7, headline: "Développeuse mobile et UX", bio: "Applications Flutter pensées pour les petits téléphones et les connexions lentes.", stack: ["Flutter", "Figma", "Firebase"], profileLink: "linkedin.com/in/aichakouassi" },
  { id: "moussa", email: "moussa.traore@exemple.ci", name: "Moussa Traoré", level: "SENIOR", city: "Abidjan", country: "Côte d’Ivoire", timeZone: "Africa/Abidjan", years: 8, headline: "Lead développeur backend", bio: "Lead backend à Abidjan.", stack: ["Node.js", "PostgreSQL", "Docker", "AWS"], profileLink: "github.com/mtraore" },
  { id: "nadia", email: "nadia.bello@exemple.ca", name: "Nadia Bello", level: "SENIOR", city: "Montréal", country: "Canada", timeZone: "America/Toronto", diaspora: true, years: 6, headline: "Data scientist", bio: "Data et IA appliquées à la santé.", stack: ["Python", "Data et IA"], profileLink: "github.com/nbello" },
  { id: "edem", email: "edem.amouzou@exemple.tg", name: "Edem Amouzou", level: "SENIOR", city: "Lomé", country: "Togo", years: 6, headline: "Développeur mobile", bio: "Je construis Marché Vert pour les maraîchers de Lomé.", stack: ["Flutter", "Kotlin"], profileLink: "github.com/eamouzou" },
  { id: "yao", email: "yao.agbeko@exemple.tg", name: "Yao Agbeko", level: "INTERMEDIAIRE", city: "Lomé", country: "Togo", years: 3, headline: "Développeur mobile", bio: "Mobile et cartes ouvertes. Initiateur du suivi des forages au Sahel.", stack: ["Flutter", "Kotlin", "React"], goals: ["rise_up", "hackathons"] },
  { id: "fatou", email: "fatou.sow@exemple.sn", name: "Fatou Sow", level: "INTERMEDIAIRE", city: "Dakar", country: "Sénégal", timeZone: "Africa/Dakar", years: 2, headline: "Data analyst", bio: "Données ouvertes et tableaux de bord pour les villages.", stack: ["Python", "Data et IA"], goals: ["mentor", "rise_up"] },
  { id: "chidi", email: "chidi.okafor@exemple.ng", name: "Chidi Okafor", level: "INTERMEDIAIRE", city: "Lagos", country: "Nigeria", timeZone: "Africa/Lagos", years: 3, headline: "Développeur backend", bio: "Je construis TontineApp, une épargne de groupe sur le web.", stack: ["Node.js", "TypeScript", "PostgreSQL"], goals: ["get_tested", "hackathons"] },
  { id: "finlab", email: "contact@finlab.exemple.bj", name: "FinLab Cotonou", level: "SENIOR", city: "Cotonou", country: "Bénin", years: 0, headline: "Incubateur fintech", bio: "Incubateur qui organise des hackathons pour l’inclusion financière.", stack: [] },
];

const DAY = 86_400_000;
const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000);
/** A day relative to today, at a given UTC time (Lomé is on UTC). */
const at = (days: number, hour = 12, minute = 0) => {
  const x = new Date(Date.now() + days * DAY);
  x.setUTCHours(hour, minute, 0, 0);
  return x;
};
/** The next given weekday (1 = Monday) at least `minDays` from today, at a UTC time. */
const nextWeekday = (weekday: number, hour: number, minute = 0, minDays = 1) => {
  for (let d = minDays; d < minDays + 7; d++) {
    const x = at(d, hour, minute);
    if (((x.getUTCDay() + 6) % 7) + 1 === weekday) return x;
  }
  throw new Error("unreachable");
};
// A 1×1 PNG, enough to stand for a tester's screenshot.
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");
const directKey = (a: string, b: string) => [a, b].sort().join(":");

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  await db.$executeRawUnsafe(`TRUNCATE "User", "Hackathon", "RateLimit" CASCADE`);

  const now = new Date();
  await db.user.createMany({
    data: [
      ...users.map(({ mentor, ...u }) => ({
        ...u,
        diaspora: u.diaspora ?? false,
        role: (mentor ? "SENIOR" : "JUNIOR") as Role,
        passwordHash,
        emailVerifiedAt: minutesAgo(60 * 24 * 100),
        seniorVerifiedAt: mentor ? minutesAgo(60 * 24 * 90) : null,
      })),
      // The team account: reviews badges, publishes hackathons and results, records transfers.
      { id: "equipe", email: "equipe@kabad.app", name: "Équipe KABAD", city: "Lomé", country: "Togo", passwordHash, isAdmin: true, emailVerifiedAt: now },
    ],
  });

  /* Mentor badges: three granted, three to review (screens B5 and B6). */
  const granted = (userId: string, domains: string[], technologies: string[], experience: string, jobTitle: string, topics: string, githubUrl?: string, linkedinUrl?: string) => ({
    userId, domains, technologies, experience, jobTitle, githubUrl, linkedinUrl, topics,
    bio: users.find((u) => u.id === userId)!.bio, status: "APPROVED" as const, reviewedById: "equipe", createdAt: minutesAgo(60 * 24 * 95), reviewedAt: minutesAgo(60 * 24 * 90),
  });
  await db.mentorBadgeRequest.createMany({
    data: [
      granted("awa", ["Paiements et fintech", "Backend"], ["API", "Mobile money", "Node.js"], "5-10", "Lead dev paiements", "Concevoir une API de paiement, gérer les webhooks, tester ce qui touche à l’argent.", "https://github.com/awadiop"),
      granted("ibrahim", ["Cloud et DevOps"], ["AWS", "DevOps", "Kubernetes"], "10+", "Architecte cloud", "Choisir son hébergement, déployer, surveiller la production.", "https://github.com/ikeita"),
      granted("aicha", ["Mobile", "Produit et UX"], ["Flutter", "Design"], "5-10", "Développeuse mobile et UX", "Concevoir une app mobile simple, tester avec de vrais utilisateurs.", undefined, "https://www.linkedin.com/in/aichakouassi"),
      { userId: "moussa", domains: ["Backend", "Cloud et DevOps"], technologies: ["Node.js", "PostgreSQL", "Docker", "AWS"], experience: "5-10", jobTitle: "Lead développeur backend", githubUrl: "https://github.com/mtraore", bio: "Lead backend à Abidjan. J’aide les juniors à passer du code qui marche au code qui tient en production.", topics: "Concevoir une API, passer en production, choisir son hébergement.", createdAt: minutesAgo(120) },
      { userId: "nadia", domains: ["Data et IA"], technologies: ["Python", "Pandas", "PyTorch"], experience: "5-10", jobTitle: "Data scientist", githubUrl: "https://github.com/nbello", linkedinUrl: "https://www.linkedin.com/in/nadiabello", portfolioUrl: "https://nadiabello.exemple.ca", bio: "Data scientist à Montréal, je travaille sur des modèles appliqués à la santé en Afrique de l’Ouest.", topics: "Préparer ses données, choisir un modèle simple, l’expliquer.", createdAt: minutesAgo(60 * 26) },
      { userId: "edem", domains: ["Mobile", "Produit et UX"], technologies: ["Flutter", "Kotlin"], experience: "5-10", jobTitle: "Développeur mobile", githubUrl: "https://github.com/eamouzou", portfolioUrl: "https://edem.exemple.tg", bio: "Développeur mobile à Lomé, je publie des apps utilisées par des commerçants.", topics: "Publier sur le Play Store, gérer le hors-connexion.", createdAt: minutesAgo(60 * 24 * 3) },
    ],
  });

  /* Mentor availability, in each mentor's time zone (screen M7). */
  const ranges: Record<string, Array<[number, string, string]>> = {
    awa: [[1, "18:00", "20:00"], [2, "15:00", "18:00"], [3, "18:00", "20:00"], [4, "09:00", "10:30"], [4, "15:00", "16:30"], [5, "18:00", "20:00"], [6, "10:00", "12:00"], [7, "10:00", "12:00"]],
    ibrahim: [[5, "10:00", "12:00"], [2, "18:00", "19:30"]],
    aicha: [[1, "18:00", "20:00"], [3, "12:00", "13:00"]],
  };
  const min = (hm: string) => Number(hm.slice(0, 2)) * 60 + Number(hm.slice(3));
  await db.availability.createMany({ data: Object.entries(ranges).flatMap(([mentorId, list]) => list.map(([weekday, a, b]) => ({ mentorId, weekday, startMin: min(a), endMin: min(b) }))) });

  /* Mentoring sessions: two held with Awa, one confirmed for Thursday, Fatou's request to answer. */
  const thursday = nextWeekday(4, 15, 0);
  await db.mentoringBooking.createMany({
    data: [
      { id: "seance-momo", mentorId: "awa", menteeId: "kossi", startsAt: thursday, topic: "Interconnecter des API de mobile money", problem: "Je construis un paiement régional qui doit passer par trois opérateurs. Je ne sais pas comment gérer les confirmations qui arrivent en retard sans débiter deux fois.", status: "ACCEPTED", meetingUrl: "https://meet.jit.si/kabad-demo-momo", createdAt: minutesAgo(60 * 30), answeredAt: minutesAgo(60 * 28) },
      { mentorId: "awa", menteeId: "kossi", startsAt: at(-12, 15, 0), topic: "Découper le projet", problem: "Je ne sais pas par quel module commencer : encaissement, webhooks ou tableau de bord.", status: "ACCEPTED", meetingUrl: "https://meet.jit.si/kabad-demo-1", createdAt: at(-14), answeredAt: at(-14) },
      { mentorId: "awa", menteeId: "kossi", startsAt: at(-5, 15, 30), topic: "Tester un webhook", problem: "Je veux écrire un test qui prouve qu’un webhook reçu deux fois n’est traité qu’une fois.", status: "ACCEPTED", meetingUrl: "https://meet.jit.si/kabad-demo-2", createdAt: at(-7), answeredAt: at(-7) },
      { mentorId: "awa", menteeId: "fatou", startsAt: nextWeekday(2, 16, 0, 2), topic: "Sécuriser les webhooks d’un agrégateur de paiement", problem: "Mon agrégateur reçoit des webhooks de deux opérateurs. Je veux vérifier les signatures sans bloquer les paiements légitimes.", status: "PENDING", createdAt: minutesAgo(60 * 3) },
    ],
  });

  /* Contacts and conversations */
  const accepted: Array<[string, string, string, number]> = [
    ["yao", "kossi", "Salut Kossi, on est tous les deux à Lomé et dans le mobile. On échange ?", 60 * 24 * 20],
    ["kossi", "awa", "Merci pour la séance, je vous écris ici pour la suite.", 60 * 24 * 11],
    ["fatou", "kossi", "Bonjour Kossi, je cherche une équipe pour le hackathon fintech. Partant ?", 60 * 24 * 9],
  ];
  for (const [from, to, message, ago] of accepted) {
    await db.invitation.create({ data: { fromId: from, toId: to, message, status: "ACCEPTED", createdAt: minutesAgo(ago), answeredAt: minutesAgo(ago - 5) } });
    await db.contact.createMany({ data: [{ userId: from, contactId: to }, { userId: to, contactId: from }] });
  }
  await db.invitation.createMany({
    data: [
      { fromId: "nadia", toId: "kossi", message: "Bonjour Kossi, j’ai vu ton projet de paiement régional. Je travaille sur la détection de fraude : on en parle ?", createdAt: minutesAgo(73) },
      { fromId: "edem", toId: "kossi", message: "Salut, je cherche des testeurs à Lomé pour Marché Vert. Tu aurais 15 minutes cette semaine ?", createdAt: minutesAgo(60 * 20) },
      { fromId: "kossi", toId: "chidi", message: "Salut Chidi, on fait tous les deux du backend Node.js. Ça te dit d’échanger sur les webhooks ?", createdAt: minutesAgo(60 * 30) },
    ],
  });

  async function conversation(kind: "DIRECT" | "GROUP", memberIds: string[], lines: Array<[string | null, string, number]>, extra: { name?: string; theme?: string; createdById?: string; unreadFor?: string } = {}) {
    const c = await db.conversation.create({
      data: {
        kind,
        name: extra.name,
        theme: extra.theme,
        createdById: extra.createdById,
        directKey: kind === "DIRECT" ? directKey(memberIds[0], memberIds[1]) : null,
        createdAt: minutesAgo(lines[0][2] + 1),
        lastMessageAt: minutesAgo(lines[lines.length - 1][2]),
        members: { create: memberIds.map((userId) => ({ userId, role: userId === extra.createdById ? "OWNER" : "MEMBER", lastReadAt: userId === extra.unreadFor ? minutesAgo(9999) : new Date() })) },
      },
    });
    await db.message.createMany({ data: lines.map(([author, body, ago]) => ({ conversationId: c.id, authorId: author, kind: author ? "TEXT" : "SYSTEM", body, createdAt: minutesAgo(ago) })) });
    return c.id;
  }

  await conversation("DIRECT", ["kossi", "yao"], [
    ["yao", "Salut Kossi ! Tu as avancé sur l’écran de paiement ?", 100],
    ["kossi", "Oui, voilà où j’en suis.", 98],
    ["yao", "Top. Je regarde ce soir et je te fais un retour.", 20],
  ], { unreadFor: "kossi" });
  await conversation("DIRECT", ["kossi", "awa"], [
    ["kossi", accepted[1][2], 60 * 24 * 11],
    ["awa", "Avec plaisir. Prépare ton schéma de flux pour jeudi.", 60 * 24 * 2],
  ]);
  await conversation("DIRECT", ["kossi", "fatou"], [["fatou", "On garde le nom Baobab pour l’équipe ?", 60 * 5]]);
  await conversation("GROUP", ["kossi", "fatou", "yao", "chidi", "awa", "edem"], [
    [null, "Kossi a créé le groupe et ajouté Fatou, Yao, Chidi, Awa et Edem", 60 * 24 * 6],
    ["fatou", "J’ai mis le schéma, dites-moi si le flux webhook vous paraît bon.", 60 * 3],
    ["yao", "Bon pour moi. J’ajoute la gestion des doublons ce soir.", 60 * 2],
  ], { name: "Devs fintech Lomé", theme: "Fintech", createdById: "kossi", unreadFor: "kossi" });

  /* Hackathons */
  const fintechStart = at(14, 8, 0);
  await db.hackathon.createMany({
    data: [
      { id: "fintech-inclusion", title: "Fintech pour l’inclusion", organizerName: "FinLab Cotonou", createdById: "finlab", format: "HYBRID", city: "Cotonou", startsAt: fintechStart, endsAt: new Date(fintechStart.getTime() + 2 * DAY), closesAt: at(10, 23, 59), teamMin: 2, teamMax: 5, level: "Tous niveaux", stack: "Web ou mobile",
        description: "Imaginer un service qui aide les commerçants sans compte bancaire à encaisser, épargner et suivre leurs ventes.", rulesUrl: "https://finlab.exemple.bj/reglement",
        prizes: ["1er prix : 500 000 F CFA", "2e prix : six mois d’incubation"],
        missionText: "Préparer les équipes la veille, en visio. Répondre aux questions techniques pendant l’événement. Aider sur les paiements et les API.", instructorFee: 75_000, instructorCount: 3, publishedAt: at(-6) },
      { id: "agritech-sahel", title: "Agritech Sahel", organizerName: "Réseau Agritech Sahel", createdById: "ibrahim", format: "ONLINE", startsAt: at(30, 8, 0), endsAt: at(33, 8, 0), closesAt: at(28, 23, 59), teamMin: 1, teamMax: 4, level: "Intermédiaire", stack: "Au choix",
        description: "Donner aux producteurs le prix de leurs récoltes et la météo de la semaine, même sur un téléphone simple.", prizes: ["1er prix : 300 000 F CFA", "2e prix : 100 000 F CFA"], publishedAt: at(-3) },
      { id: "sante-connectee", title: "Santé connectée", organizerName: "Collectif Santé Dakar", createdById: "nadia", format: "ONSITE", city: "Dakar", startsAt: at(45, 8, 0), endsAt: at(46, 20, 0), closesAt: at(40, 23, 59), teamMin: 3, teamMax: 4, level: "Avancé", stack: "Web et données",
        description: "Un outil qui aide les dispensaires à suivre leurs stocks de médicaments et à prévenir les ruptures.", prizes: ["Un ordinateur portable par membre de l’équipe gagnante"], publishedAt: at(-1) },
      { id: "raccourcisseur", title: "Raccourcisseur de liens avec statistiques", organizerName: "KABAD", format: "ONLINE", startsAt: at(-10, 8, 0), endsAt: at(-3, 8, 0), closesAt: at(-10, 8, 0), teamMin: 1, teamMax: 1, status: "JURY", level: "Intermédiaire", stack: "Au choix",
        description: "Un service qui raccourcit les liens et compte les visites par pays.", prizes: ["Un an d’hébergement offert"], resultsAt: at(4, 18, 0), publishedAt: at(-20) },
      { id: "inscription-accessible", title: "Page d’inscription accessible", organizerName: "KABAD", format: "ONLINE", startsAt: at(-20, 8, 0), endsAt: at(-12, 8, 0), closesAt: at(-20, 8, 0), teamMin: 1, teamMax: 1, status: "DONE", level: "Débutant", stack: "HTML, CSS et JavaScript",
        description: "Une page d’inscription utilisable au clavier et par un lecteur d’écran.", prizes: ["1er prix : un clavier mécanique", "2e prix : un livre sur l’accessibilité"], resultsAt: at(-8, 12, 0), publishedAt: at(-30) },
    ],
  });
  const juries: Record<string, string[]> = {
    "fintech-inclusion": ["moussa", "nadia", "ibrahim"],
    "agritech-sahel": ["awa", "aicha", "moussa"],
    raccourcisseur: ["awa", "ibrahim", "aicha"],
    "inscription-accessible": ["ibrahim", "aicha", "nadia"],
  };
  await db.hackathonJuror.createMany({ data: Object.entries(juries).flatMap(([hackathonId, ids]) => ids.map((userId) => ({ hackathonId, userId }))) });

  // Teams of the fintech hackathon (screens H3 and H4).
  const team = async (id: string, hackathonId: string, name: string, captainId: string, members: Array<[string, string]>, extra: { solo?: boolean; lookingFor?: string } = {}) => {
    await db.team.create({ data: { id, hackathonId, name, captainId, solo: extra.solo ?? false, lookingFor: extra.lookingFor, createdAt: minutesAgo(60 * 24 * 4) } });
    await db.teamMember.createMany({ data: members.map(([userId, skill], i) => ({ teamId: id, userId, hackathonId, skill, joinedAt: minutesAgo(60 * 24 * 4 - i) })) });
  };
  await team("baobab", "fintech-inclusion", "Équipe Baobab", "kossi", [["kossi", "Front"], ["yao", "Mobile"], ["fatou", "Data"]], { lookingFor: "Baobab cherche un·e designer" });
  await team("kora", "fintech-inclusion", "Équipe Kora", "chidi", [["chidi", "Backend"]], { lookingFor: "Cherche un·e dev backend" });
  await team("nyota", "fintech-inclusion", "Équipe Nyota", "edem", [["edem", "Mobile"]], { lookingFor: "Cherche un·e designer" });

  // Instructors: Ibrahim and Aïcha accepted, Awa has a mission to answer (screen H9).
  await db.instructorMission.createMany({
    data: [
      { id: "mission-awa", hackathonId: "fintech-inclusion", mentorId: "awa", fee: 75_000, createdAt: minutesAgo(160) },
      { hackathonId: "fintech-inclusion", mentorId: "ibrahim", fee: 75_000, status: "ACCEPTED", answeredAt: at(-2) },
      { hackathonId: "fintech-inclusion", mentorId: "aicha", fee: 75_000, status: "ACCEPTED", answeredAt: at(-2) },
    ],
  });

  // Solo entries of the finished and judged hackathons.
  for (const [hackathonId, list] of Object.entries({ raccourcisseur: ["chidi", "fatou", "yao"], "inscription-accessible": ["kossi", "fatou", "chidi"] })) {
    for (const userId of list) await team(`${hackathonId}-${userId}`, hackathonId, users.find((u) => u.id === userId)!.name, userId, [[userId, ""]], { solo: true });
  }
  const solution = (who: string, repo: string, projectName: string) => ({ projectName, repoUrl: `https://github.com/${who}/${repo}`, explanation: "Chaque cas est couvert par un test. J’explique mes choix dans le README : structure, validation des entrées, gestion des erreurs." });
  await db.submission.createMany({
    data: [
      { id: "sub-short-chidi", hackathonId: "raccourcisseur", teamId: "raccourcisseur-chidi", ...solution("chidiokafor", "short", "Short"), demoUrl: "https://short.exemple.ng" },
      { id: "sub-short-fatou", hackathonId: "raccourcisseur", teamId: "raccourcisseur-fatou", ...solution("fatousow", "lien-court", "Lien court") },
      { id: "sub-short-yao", hackathonId: "raccourcisseur", teamId: "raccourcisseur-yao", ...solution("yaoagbeko", "petit-lien", "Petit lien") },
      { id: "sub-ins-kossi", hackathonId: "inscription-accessible", teamId: "inscription-accessible-kossi", ...solution("kmensah", "inscription-a11y", "Inscription accessible"), createdAt: at(-13) },
      { id: "sub-ins-fatou", hackathonId: "inscription-accessible", teamId: "inscription-accessible-fatou", ...solution("fatousow", "inscription", "Inscription"), createdAt: at(-13, 14) },
      { id: "sub-ins-chidi", hackathonId: "inscription-accessible", teamId: "inscription-accessible-chidi", ...solution("chidiokafor", "signup", "Signup"), createdAt: at(-13, 16) },
    ],
  });
  const score = (submissionId: string, jurorId: string, [works, code, tests, explain]: number[]) => ({ submissionId, jurorId, works, code, tests, explain });
  await db.juryScore.createMany({
    data: [
      // Averages 17.3, 16.7 and 15.7: Kossi wins.
      score("sub-ins-kossi", "ibrahim", [5, 4, 4, 4]), score("sub-ins-kossi", "aicha", [5, 4, 4, 4]), score("sub-ins-kossi", "nadia", [5, 5, 4, 4]),
      score("sub-ins-fatou", "ibrahim", [5, 4, 4, 4]), score("sub-ins-fatou", "aicha", [4, 4, 4, 4]), score("sub-ins-fatou", "nadia", [5, 4, 4, 4]),
      score("sub-ins-chidi", "ibrahim", [4, 4, 4, 4]), score("sub-ins-chidi", "aicha", [4, 4, 4, 3]), score("sub-ins-chidi", "nadia", [4, 4, 4, 4]),
      // The raccourcisseur jury is still at work.
      score("sub-short-chidi", "ibrahim", [5, 4, 3, 4]),
    ],
  });

  /* Africa Rise-Up (screens R1 to R5) */
  const project = async (id: string, data: { name: string; domain: "WATER" | "HEALTH" | "AGRICULTURE"; summary: string; problem: string; skills: string[]; initiatorId: string }, members: Array<[string, string]>) => {
    const conversationId = await conversation("GROUP", members.map(([u]) => u), [[null, `${users.find((u) => u.id === data.initiatorId)!.name.split(" ")[0]} a lancé le projet « ${data.name} »`, 60 * 24 * 30]], { name: data.name, theme: "Rise-Up", createdById: data.initiatorId });
    await db.riseProject.create({ data: { id, ...data, conversationId, createdAt: minutesAgo(60 * 24 * 30), members: { create: members.map(([userId, skill], i) => ({ userId, skill, joinedAt: minutesAgo(60 * 24 * 30 - i * 60) })) } } });
  };
  await project("forages-sahel", { name: "Suivre les forages d’eau potable au Sahel", domain: "WATER", summary: "Une carte ouverte des forages et de leur état, mise à jour par les villages.", problem: "Dans les villages du Sahel, un forage en panne peut rester des semaines sans réparation, faute d’information. Nous construisons une carte ouverte où les villages signalent l’état de leur forage par SMS ou depuis l’app, et où les techniciens voient où intervenir en priorité.", skills: ["mobile", "data", "SMS"], initiatorId: "yao" }, [["yao", "Mobile"], ["fatou", "Data"], ["chidi", "Backend"], ["kossi", "Front"], ["ibrahim", "Cloud"], ["aicha", "Mobile"], ["nadia", "Data"]]);
  await project("dossier-medical", { name: "Dossier médical partagé pour les dispensaires", domain: "HEALTH", summary: "Un dossier patient simple, partagé entre dispensaires d’une même zone.", problem: "Un patient qui change de dispensaire recommence tout son historique. Un dossier partagé et sécurisé éviterait les examens en double.", skills: ["backend", "sécurité"], initiatorId: "nadia" }, [["nadia", "Data"], ["moussa", "Backend"], ["edem", "Mobile"], ["awa", "Backend"]]);
  await project("prix-recoltes", { name: "Prix des récoltes en temps réel par SMS", domain: "AGRICULTURE", summary: "Les prix des marchés envoyés par SMS aux producteurs.", problem: "Les producteurs vendent souvent sans connaître le prix du marché voisin. Un SMS quotidien leur donnerait un meilleur pouvoir de négociation.", skills: ["mobile", "data"], initiatorId: "edem" }, [["edem", "Mobile"], ["fatou", "Data"], ["chidi", "Backend"]]);

  const post = async (projectId: string, authorId: string, body: string, ago: number, replies: Array<[string, string]> = []) => {
    const p = await db.risePost.create({ data: { projectId, authorId, body, createdAt: minutesAgo(ago) } });
    await db.risePost.createMany({ data: replies.map(([a, b], i) => ({ projectId, authorId: a, body: b, parentId: p.id, createdAt: minutesAgo(ago - 10 * (i + 1)) })) });
  };
  await post("forages-sahel", "yao", "La carte affiche maintenant les 40 premiers forages de Tillabéri. Qui peut relire l’API d’import ?", 120, [
    ["chidi", "Je prends. Tu as un fichier d’exemple ?"],
    ["yao", "Oui, dans le dossier fixtures du dépôt."],
    ["fatou", "Pense à valider les coordonnées : certaines lignes ont la latitude et la longitude inversées."],
    ["chidi", "Bien vu, j’ajoute un test pour ça."],
    ["ibrahim", "Pour l’hébergement, une petite base PostgreSQL suffit largement au début."],
    ["yao", "Merci à tous, je fusionne demain."],
  ]);
  await post("forages-sahel", "fatou", "Proposition : un mode SMS pour les villages sans données mobiles.", 60 * 26, [["kossi", "Je peux m’occuper de l’envoi via une passerelle SMS."]]);

  await db.riseEvent.createMany({
    data: [
      // Running now: the project shows "Salon en direct".
      { projectId: "forages-sahel", createdById: "yao", title: "Choisir les capteurs de niveau", agenda: "Comparer trois capteurs, leur prix et leur autonomie.", startsAt: minutesAgo(15), minutes: 60, meetingUrl: "https://meet.jit.si/kabad-riseup-capteurs" },
      { projectId: "forages-sahel", createdById: "yao", title: "Point d’étape mensuel", agenda: "Avancement de la carte, retours des villages, prochaines tâches.", startsAt: at(12, 18, 0), minutes: 60, meetingUrl: "https://meet.jit.si/kabad-riseup-point" },
      { projectId: "forages-sahel", createdById: "fatou", title: "Atelier capteurs avec Niamey", agenda: "Installation des premiers capteurs avec l’équipe de Niamey.", startsAt: at(20, 15, 0), minutes: 90, meetingUrl: "https://meet.google.com/abc-defg-hij" },
      { projectId: "dossier-medical", createdById: "nadia", title: "Atelier sécurité des données", agenda: "Qui peut lire quoi : les règles d’accès au dossier.", startsAt: nextWeekday(4, 18, 0), minutes: 60, meetingUrl: "https://meet.jit.si/kabad-riseup-securite" },
    ],
  });

  /* Community tests (screens T1 to T4) */
  const testApp = async (id: string, ownerId: string, data: { name: string; platforms: Array<"WEB" | "ANDROID" | "IOS">; url: string; minutes: number; slots: number; pitch: string; task: string; steps: string[] }, testers: Array<[string, number[]]>) => {
    const owner = users.find((u) => u.id === ownerId)!;
    const conversationId = await conversation("GROUP", [ownerId, ...testers.map(([u]) => u)], [
      [null, `${owner.name.split(" ")[0]} a ouvert le groupe de test. Installer l’app : ${data.url}`, 60 * 24 * 8],
    ], { name: `Testeurs ${data.name}`, theme: "Test", createdById: ownerId });
    await db.testApp.create({ data: { id, ownerId, ...data, questions: [], conversationId, createdAt: minutesAgo(60 * 24 * 8), participants: { create: testers.map(([userId, doneSteps]) => ({ userId, doneSteps })) } } });
    return conversationId;
  };
  const marche = await testApp("marche-vert", "edem", { name: "Marché Vert", platforms: ["ANDROID"], url: "https://marche-vert.exemple.tg/apk", minutes: 15, slots: 10, pitch: "Une app pour commander des légumes aux maraîchers de Lomé et se faire livrer le jour même.", task: "Passer une commande et suivre la livraison.", steps: ["Créer un compte avec ton numéro", "Passer une commande de 3 produits", "Suivre la livraison et noter le livreur"] },
    [["kossi", [0, 1]], ["yao", [0]], ["fatou", [0, 1, 2]], ["chidi", []], ["moussa", [0]], ["nadia", []], ["aicha", [0, 1, 2]]]);
  await db.message.createMany({
    data: [
      { conversationId: marche, authorId: "edem", body: "Merci d’être là ! Nouvelle version en ligne, le paiement devrait marcher.", createdAt: minutesAgo(160) },
      { conversationId: marche, authorId: "fatou", body: "Commande passée. Le bouton « Valider » reste gris sur mon Tecno.", createdAt: minutesAgo(132) },
      { conversationId: marche, authorId: "kossi", body: "Même chose chez moi. Je t’envoie une capture.", createdAt: minutesAgo(128) },
    ],
  });
  await testApp("tontine-app", "chidi", { name: "TontineApp", platforms: ["WEB"], url: "https://tontine.exemple.ng", minutes: 20, slots: 5, pitch: "Une épargne de groupe entre amis ou collègues, avec rappels automatiques.", task: "Créer une tontine et inviter des membres.", steps: ["Créer une tontine de 5 000 F CFA par mois", "Inviter trois personnes", "Vérifier le rappel du premier versement"] }, [["yao", [0]], ["fatou", []]]);
  await testApp("kalo", "kossi", { name: "Kalo", platforms: ["ANDROID", "WEB"], url: "https://kalo.exemple.tg", minutes: 10, slots: 8, pitch: "Un carnet de dépenses partagé pour les colocations.", task: "Ajouter une dépense et partager le budget.", steps: ["S’inscrire avec un numéro", "Ajouter une dépense", "Partager le budget du mois"] }, [["yao", [0, 1, 2]], ["fatou", [0, 1, 2]], ["chidi", [0, 1]], ["edem", [0, 1, 2]]]);
  const report = async (testAppId: string, testerId: string, remarks: string, status: "SUBMITTED" | "VALIDATED", ago: number) => {
    const r = await db.testReport.create({ data: { testAppId, testerId, device: "Android", status, remarks, answers: [], createdAt: minutesAgo(ago), reviewedAt: status === "VALIDATED" ? minutesAgo(ago - 60) : null } });
    const steps = (await db.testApp.findUniqueOrThrow({ where: { id: testAppId }, select: { steps: true } })).steps.length;
    await db.screenshot.createMany({ data: Array.from({ length: steps }, (_, position) => ({ reportId: r.id, position, mime: "image/png", data: PNG })) });
  };
  await report("kalo", "yao", "Clair et rapide. Le bouton de partage est un peu caché.", "VALIDATED", 60 * 24 * 2);
  await report("kalo", "fatou", "La saisie du montant accepte les lettres.", "VALIDATED", 60 * 24 * 2 - 30);
  await report("kalo", "edem", "Rien à signaler, tout marche sur mon Tecno.", "SUBMITTED", 60 * 5);
  await report("marche-vert", "fatou", "Le bouton « Valider » reste gris après la commande sur Tecno Spark.", "SUBMITTED", 120);
  await report("marche-vert", "aicha", "Commande simple. Les photos chargent lentement en 3G.", "VALIDATED", 60 * 24);

  /* Kossi's notifications (screen P2). The text is written in the reader's language from the key. */
  const n = (userId: string, actor: string, key: string, params: Record<string, string | number> | undefined, text: string, href: string, icon: string, tone: string, ago: number, read = false) => ({ userId, actor, key, params, text, href, icon, tone, createdAt: minutesAgo(ago), readAt: read ? minutesAgo(ago - 1) : null });
  await db.notification.createMany({
    data: [
      n("kossi", "Awa Diop", "bookingAccepted", { at: thursday.toISOString(), tz: "Africa/Lome" }, " a accepté ta séance de jeudi à 15 h.", "/mentorat/seances/seance-momo", "check", "success", 35),
      n("kossi", "Nadia Bello", "invitationReceived", undefined, " t’invite à échanger.", "/messages/invitations", "user", "brand", 73),
      n("kossi", "Suivre les forages d’eau potable au Sahel", "riseEvent", { title: "Choisir les capteurs de niveau", at: minutesAgo(15).toISOString(), tz: "Africa/Lome" }, " : « Choisir les capteurs de niveau ».", "/rise-up/forages-sahel", "radio", "accent", 15),
      n("kossi", "Edem Amouzou", "testJoined", { title: "Kalo" }, " a rejoint les testeurs de « Kalo ».", "/tests/kalo", "users", "brand", 60 * 26, true),
      n("kossi", "Collectif Santé Dakar", "hackathonProposed", { title: "Santé connectée" }, " propose le hackathon « Santé connectée ».", "/hackathons/sante-connectee", "trophy", "accent", 60 * 24 * 2, true),
      // Awa has a mission to answer and a request to read.
      n("awa", "FinLab Cotonou", "missionProposed", undefined, " te propose une mission d’instructeur rémunérée.", "/hackathons/missions/mission-awa", "wallet", "accent", 160),
      n("awa", "Fatou Sow", "bookingRequested", { at: nextWeekday(2, 16, 0, 2).toISOString(), tz: "Africa/Dakar", topic: "Sécuriser les webhooks d’un agrégateur de paiement" }, " demande une séance.", "/mentorat/demandes", "clock", "brand", 180),
    ],
  });

  console.log(`Seed terminé : ${users.length} membres et le compte equipe@kabad.app. Mot de passe : ${DEMO_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
