/*
 * Données de départ de KABAD : les premiers membres (l'équipe, sur de vraies adresses), leurs mentors, hackathons,
 * projets Africa Rise-Up et apps à tester.
 *
 * Mots de passe : chacun vient de .env (SEED_PASSWORD_KOFFI, SEED_PASSWORD_AMINATA… et SEED_PASSWORD_EQUIPE pour
 * l'équipe KABAD), jamais du dépôt, puisque ce sont de vraies adresses. Sur cette machine, un mot de passe absent
 * vaut « kabad-demo-2026 » (tests automatiques) ; sur le serveur (SEED_FORCE=1), tous sont obligatoires.
 * Le seed vide la base avant de la remplir.
 */
import "dotenv/config";
import { readFileSync } from "node:fs";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Level, type Role } from "../src/generated/prisma/client";

// Only on a database of this machine, unless SEED_FORCE=1 says it is the first filling of the server.
const seedHost = (() => {
  try {
    return new URL(process.env.DATABASE_URL ?? "").hostname;
  } catch {
    return "";
  }
})();
const forced = process.env.SEED_FORCE === "1";
if ((process.env.NODE_ENV === "production" || !["127.0.0.1", "localhost", "::1"].includes(seedHost)) && !forced) {
  console.error("Seed refusé : il ne tourne que sur une base locale (127.0.0.1 ou localhost), ou avec SEED_FORCE=1 pour remplir le serveur une première fois.");
  process.exit(1);
}

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
/** The password of an account whose SEED_PASSWORD_… is missing, on this machine only. */
const LOCAL_PASSWORD = "kabad-demo-2026";

/** An account's password, from .env. */
function passwordOf(id: string) {
  const name = `SEED_PASSWORD_${id.toUpperCase()}`;
  const own = process.env[name];
  if (own) return own;
  if (forced) {
    console.error(`Seed refusé : ${name} manque dans .env (mot de passe du compte « ${id} »).`);
    process.exit(1);
  }
  return LOCAL_PASSWORD;
}

/** Gender of the members, for the agreed texts (« Vérifiée », « il peut t’aider »). */
const GENDER: Record<string, "FEMALE" | "MALE"> = { koffi: "MALE", aminata: "FEMALE", kwame: "MALE", aicha: "FEMALE", nadia: "FEMALE", sadio: "MALE", chidi: "MALE" };
/**
 * Google Meet links of the three mentors. They are examples: before the demo, replace them with real meetings
 * created on meet.google.com, or « Rejoindre sur Google Meet » opens nothing.
 */
const MEET: Record<string, string> = {
  aminata: "https://meet.google.com/kbd-amin-dem",
  kwame: "https://meet.google.com/kbd-kwam-dem",
  aicha: "https://meet.google.com/kbd-aich-dem",
};

type SeedUser = {
  id: string;
  email: string;
  name: string;
  level: Level;
  mentor?: boolean;
  city: string;
  country: string;
  timeZone: string;
  years: number;
  headline: string;
  bio: string;
  stack: string[];
  goals?: string[];
  profileLink?: string;
};

/*
 * Seven members from seven countries: three mentors (Aminata, Kwame, Aïcha) and four members (Koffi, Sadio,
 * Chidi, and Nadia, a senior whose mentor badge waits for the KABAD team).
 */
const users: SeedUser[] = [
  { id: "koffi", email: "success2025lord@gmail.com", name: "Koffi Mensah", level: "INTERMEDIAIRE", city: "Lomé", country: "Togo", timeZone: "Africa/Lome", years: 2, headline: "Développeur web", bio: "Je construis un paiement par mobile money pour les commerçants de Lomé et je veux le rendre fiable.", stack: ["JavaScript", "React", "Node.js"], goals: ["mentor", "hackathons", "rise_up"], profileLink: "github.com/koffimensah" },
  { id: "aminata", email: "lord2025success@gmail.com", name: "Aminata Traoré", level: "SENIOR", mentor: true, city: "Bamako", country: "Mali", timeZone: "Africa/Bamako", years: 9, headline: "Lead développeuse paiements", bio: "J’aide les juniors à passer du tutoriel au vrai projet : API de paiement, mobile money, tests et revue de code.", stack: ["Node.js", "TypeScript", "PostgreSQL"], profileLink: "github.com/aminatatraore" },
  { id: "kwame", email: "emmerson.copychief.dev@gmail.com", name: "Kwame Asante", level: "SENIOR", mentor: true, city: "Accra", country: "Ghana", timeZone: "Africa/Accra", years: 11, headline: "Architecte cloud", bio: "Architecture cloud, DevOps et mise en production. J’accompagne les équipes qui passent du prototype au service fiable.", stack: ["AWS", "Kubernetes", "Terraform"], profileLink: "github.com/kwameasante" },
  { id: "aicha", email: "worldwide.eliteagency229@gmail.com", name: "Aïcha Diallo", level: "SENIOR", mentor: true, city: "Ouagadougou", country: "Burkina Faso", timeZone: "Africa/Ouagadougou", years: 7, headline: "Développeuse mobile et UX", bio: "Applications Flutter pensées pour les petits téléphones et les connexions lentes.", stack: ["Flutter", "Figma", "Firebase"], profileLink: "linkedin.com/in/aichadiallo" },
  { id: "nadia", email: "worldwide.eliteagencyy@gmail.com", name: "Nadia Kouassi", level: "SENIOR", city: "Abidjan", country: "Côte d’Ivoire", timeZone: "Africa/Abidjan", years: 6, headline: "Data scientist", bio: "Data et IA appliquées à la santé en Afrique de l’Ouest : des modèles simples, expliqués aux soignants.", stack: ["Python", "Data et IA"], profileLink: "github.com/nadiakouassi" },
  { id: "sadio", email: "asukadmt@gmail.com", name: "Sadio Diop", level: "INTERMEDIAIRE", city: "Dakar", country: "Sénégal", timeZone: "Africa/Dakar", years: 3, headline: "Développeur mobile", bio: "Mobile et cartes ouvertes. J’ai lancé le signalement des forages en panne dans la région de Louga.", stack: ["Flutter", "Kotlin", "React"], goals: ["rise_up", "hackathons", "mentor"] },
  { id: "chidi", email: "emmersondmt.entrepreneur@gmail.com", name: "Chidi Okafor", level: "INTERMEDIAIRE", city: "Lagos", country: "Nigeria", timeZone: "Africa/Lagos", years: 3, headline: "Développeur backend", bio: "Je construis TontineApp, une épargne de groupe sur le web, avec des rappels qui marchent même par SMS.", stack: ["Node.js", "TypeScript", "PostgreSQL"], goals: ["get_tested", "hackathons"] },
];

/** The KABAD team's account: reviews badges and reports, publishes hackathons and their results. */
const TEAM = { id: "equipe", email: "kabadteam@gmail.com", name: "Équipe KABAD", city: "Lomé", country: "Togo" };

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
// Screens of an app under test, one per step, for the testers' reports (prisma/seed-captures).
const CAPTURES = [1, 2, 3].map((n) => readFileSync(new URL(`./seed-captures/etape-${n}.png`, import.meta.url)));
const directKey = (a: string, b: string) => [a, b].sort().join(":");
const nameOf = (id: string) => users.find((u) => u.id === id)!.name;
const firstName = (id: string) => nameOf(id).split(" ")[0];

async function main() {
  await db.$executeRawUnsafe(`TRUNCATE "User", "Hackathon", "RateLimit" CASCADE`);

  const now = new Date();
  const hashes = new Map<string, string>();
  for (const id of [...users.map((u) => u.id), TEAM.id]) hashes.set(id, await bcrypt.hash(passwordOf(id), 10));
  await db.user.createMany({
    data: [
      // Joined three days apart, 130 to 112 days ago: before every other date of the seed (badges 95 days ago,
      // Rise-Up projects 30 days ago), so the team's charts only show the real sign-ups.
      ...users.map(({ mentor, ...u }, i) => ({
        ...u,
        role: (mentor ? "SENIOR" : "JUNIOR") as Role,
        passwordHash: hashes.get(u.id)!,
        createdAt: minutesAgo(60 * 24 * (130 - i * 3)),
        emailVerifiedAt: minutesAgo(60 * 24 * (130 - i * 3) - 20),
        seniorVerifiedAt: mentor ? minutesAgo(60 * 24 * 90) : null,
        meetingUrl: MEET[u.id] ?? "",
        gender: GENDER[u.id] ?? null,
      })),
      { ...TEAM, passwordHash: hashes.get(TEAM.id)!, isAdmin: true, emailVerifiedAt: now },
    ],
  });

  /* Mentor badges: three granted, Nadia's to review (screens B5 and B6). */
  const granted = (userId: string, domains: string[], technologies: string[], experience: string, jobTitle: string, topics: string, githubUrl?: string, linkedinUrl?: string) => ({
    userId, domains, technologies, experience, jobTitle, githubUrl, linkedinUrl, topics,
    bio: users.find((u) => u.id === userId)!.bio, status: "APPROVED" as const, reviewedById: TEAM.id, createdAt: minutesAgo(60 * 24 * 95), reviewedAt: minutesAgo(60 * 24 * 90),
  });
  await db.mentorBadgeRequest.createMany({
    data: [
      granted("aminata", ["Paiements et fintech", "Backend"], ["API", "Mobile money", "Node.js"], "5-10", "Lead développeuse backend", "Interconnecter des API de mobile money\nSécuriser des webhooks de paiement\nPasser une API en production sans tout casser", "https://github.com/aminatatraore", "https://www.linkedin.com/in/aminatatraore"),
      granted("kwame", ["Cloud et DevOps"], ["AWS", "DevOps", "Kubernetes"], "10+", "Architecte cloud", "Choisir son hébergement\nDéployer sans interruption\nSurveiller la production", "https://github.com/kwameasante"),
      granted("aicha", ["Mobile", "Produit et UX"], ["Flutter", "Design"], "5-10", "Développeuse mobile et UX", "Concevoir une app mobile simple\nTester avec de vrais utilisateurs\nRendre une app utilisable en 3G", undefined, "https://www.linkedin.com/in/aichadiallo"),
      { userId: "nadia", domains: ["Data et IA"], technologies: ["Python", "Pandas", "PyTorch"], experience: "5-10", jobTitle: "Data scientist", githubUrl: "https://github.com/nadiakouassi", linkedinUrl: "https://www.linkedin.com/in/nadiakouassi", bio: "Data scientist à Abidjan, je construis des modèles simples pour les dispensaires et je les explique aux soignants.", topics: "Préparer ses données\nChoisir un modèle simple\nL’expliquer à des non-spécialistes", createdAt: minutesAgo(120) },
    ],
  });

  /* Mentor availability, in each mentor's time zone (screen M7). */
  const ranges: Record<string, Array<[number, string, string]>> = {
    aminata: [[1, "18:00", "20:00"], [2, "15:00", "18:00"], [3, "18:00", "20:00"], [4, "09:00", "10:30"], [4, "15:00", "16:30"], [5, "18:00", "20:00"], [6, "10:00", "12:00"], [7, "10:00", "12:00"]],
    kwame: [[5, "10:00", "12:00"], [2, "18:00", "19:30"]],
    aicha: [[1, "18:00", "20:00"], [3, "12:00", "13:00"]],
  };
  const min = (hm: string) => Number(hm.slice(0, 2)) * 60 + Number(hm.slice(3));
  await db.availability.createMany({ data: Object.entries(ranges).flatMap(([mentorId, list]) => list.map(([weekday, a, b]) => ({ mentorId, weekday, startMin: min(a), endMin: min(b) }))) });

  /* Mentoring: two sessions held with Aminata, one confirmed for Thursday, Sadio's request to answer. */
  const thursday = nextWeekday(4, 15, 0);
  const sadioAsks = nextWeekday(2, 16, 0, 2);
  await db.mentoringBooking.createMany({
    data: [
      { id: "seance-momo", mentorId: "aminata", menteeId: "koffi", startsAt: thursday, topic: "Interconnecter des API de mobile money", problem: "Mon paiement doit passer par trois opérateurs. Je ne sais pas comment gérer les confirmations qui arrivent en retard sans débiter deux fois.", status: "ACCEPTED", meetingUrl: MEET.aminata, createdAt: minutesAgo(60 * 30), answeredAt: minutesAgo(60 * 28) },
      { mentorId: "aminata", menteeId: "koffi", startsAt: at(-12, 15, 0), topic: "Découper le projet", problem: "Je ne sais pas par quel module commencer : encaissement, webhooks ou tableau de bord.", status: "ACCEPTED", meetingUrl: MEET.aminata, createdAt: at(-14), answeredAt: at(-14) },
      { mentorId: "aminata", menteeId: "koffi", startsAt: at(-5, 15, 30), topic: "Tester un webhook", problem: "Je veux écrire un test qui prouve qu’un webhook reçu deux fois n’est traité qu’une fois.", status: "ACCEPTED", meetingUrl: MEET.aminata, createdAt: at(-7), answeredAt: at(-7) },
      { mentorId: "aminata", menteeId: "sadio", startsAt: sadioAsks, topic: "Payer les techniciens des forages par mobile money", problem: "Les villages veulent payer la réparation d’un forage depuis l’app. Je dois vérifier le paiement avant d’envoyer le technicien, sans bloquer les paiements légitimes.", status: "PENDING", createdAt: minutesAgo(60 * 3) },
    ],
  });

  /* Contacts and conversations */
  const accepted: Array<[string, string, string, number]> = [
    ["sadio", "koffi", "Salut Koffi, on fait tous les deux du mobile money et des hackathons. On échange ?", 60 * 24 * 20],
    ["koffi", "aminata", "Merci pour la séance, je vous écris ici pour la suite.", 60 * 24 * 11],
    ["chidi", "koffi", "Salut Koffi, on fait tous les deux du backend Node.js. Ça te dit d’échanger sur les webhooks ?", 60 * 24 * 9],
  ];
  for (const [from, to, message, ago] of accepted) {
    await db.invitation.create({ data: { fromId: from, toId: to, message, status: "ACCEPTED", createdAt: minutesAgo(ago), answeredAt: minutesAgo(ago - 5) } });
    await db.contact.createMany({ data: [{ userId: from, contactId: to }, { userId: to, contactId: from }] });
  }
  await db.invitation.createMany({
    data: [
      { id: "invitation-nadia", fromId: "nadia", toId: "koffi", message: "Bonjour Koffi, j’ai vu ton projet de paiement par mobile money. Je travaille sur la détection de fraude : on en parle ?", createdAt: minutesAgo(73) },
      { id: "invitation-aicha", fromId: "aicha", toId: "koffi", message: "Salut Koffi, je cherche des testeurs pour Marché Vert. Tu aurais 15 minutes cette semaine ?", createdAt: minutesAgo(60 * 20) },
    ],
  });

  async function conversation(kind: "DIRECT" | "GROUP", memberIds: string[], lines: Array<[string | null, string, number]>, extra: { name?: string; theme?: string; createdById?: string; unreadFor?: string; description?: string } = {}) {
    const c = await db.conversation.create({
      data: {
        kind,
        name: extra.name,
        theme: extra.theme,
        description: extra.description,
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

  await conversation("DIRECT", ["koffi", "sadio"], [
    ["sadio", "Salut Koffi ! Tu as avancé sur l’écran de paiement ?", 100],
    ["koffi", "Oui, voilà où j’en suis.", 98],
    ["sadio", "Top. Je regarde ce soir et je te fais un retour.", 20],
  ], { unreadFor: "koffi" });
  await conversation("DIRECT", ["koffi", "aminata"], [
    ["koffi", accepted[1][2], 60 * 24 * 11],
    ["aminata", "Avec plaisir. Prépare ton schéma de flux pour jeudi.", 60 * 24 * 2],
  ]);
  await conversation("DIRECT", ["koffi", "chidi"], [["chidi", "Ton équipe Baobab est au complet ? Sinon Kora cherche un·e dev front.", 60 * 5]]);
  await conversation("GROUP", ["koffi", "sadio", "chidi", "aminata", "nadia"], [
    [null, "Koffi a créé le groupe et ajouté Sadio, Chidi, Aminata et Nadia", 60 * 24 * 6],
    ["chidi", "J’ai mis le schéma, dites-moi si le flux webhook vous paraît bon.", 60 * 3],
    ["sadio", "Bon pour moi. J’ajoute la gestion des doublons ce soir.", 60 * 2],
  ], { name: "Devs fintech Lomé", theme: "Fintech", createdById: "koffi", unreadFor: "koffi", description: "Entraide sur les paiements par mobile money : webhooks, opérateurs, tests." });

  /* Hackathons: three open, one with its jury, one with its results, one proposal to review. */
  const fintechStart = at(14, 8, 0);
  await db.hackathon.createMany({
    data: [
      { id: "fintech-inclusion", title: "Fintech pour l’inclusion", organizerName: "FinLab Cotonou", createdById: "kwame", format: "HYBRID", city: "Cotonou", startsAt: fintechStart, endsAt: new Date(fintechStart.getTime() + 2 * DAY), closesAt: at(10, 23, 59), teamMin: 2, teamMax: 5, level: "Tous niveaux", stack: "Web ou mobile",
        description: "Imaginer un service qui aide les commerçants sans compte bancaire à encaisser, épargner et suivre leurs ventes.", rulesUrl: "https://finlab.exemple.bj/reglement",
        prizes: ["Six mois d’incubation au FinLab", "Un ordinateur portable par membre de l’équipe", "Un an d’hébergement cloud"],
        missionText: "Préparer les équipes la veille, en visio. Répondre aux questions techniques pendant l’événement. Aider sur les paiements et les API.", instructorFee: 75_000, instructorCount: 3, publishedAt: at(-6) },
      { id: "agritech-sahel", title: "Agritech Sahel", organizerName: "Réseau Agritech Sahel", createdById: "aminata", format: "ONLINE", startsAt: at(30, 8, 0), endsAt: at(33, 8, 0), closesAt: at(28, 23, 59), teamMin: 1, teamMax: 4, level: "Intermédiaire", stack: "Au choix",
        description: "Donner aux producteurs le prix de leurs récoltes et la météo de la semaine, même sur un téléphone simple.", prizes: ["Un accompagnement de trois mois par le Réseau Agritech Sahel"], publishedAt: at(-3) },
      { id: "sante-connectee", title: "Santé connectée", organizerName: "Collectif Santé Abidjan", createdById: "nadia", format: "ONSITE", city: "Abidjan", startsAt: at(45, 8, 0), endsAt: at(46, 20, 0), closesAt: at(40, 23, 59), teamMin: 3, teamMax: 4, level: "Avancé", stack: "Web et données",
        description: "Un outil qui aide les dispensaires à suivre leurs stocks de médicaments et à prévenir les ruptures.", prizes: ["Un ordinateur portable par membre de l’équipe gagnante"], publishedAt: at(-1) },
      // Proposed by Sadio, waiting for the KABAD team: publish it, or refuse it with a reason.
      { id: "eau-potable", title: "Eau potable pour tous", organizerName: "Sadio Diop", createdById: "sadio", format: "ONLINE", startsAt: at(55, 8, 0), endsAt: at(57, 18, 0), closesAt: at(52, 23, 59), teamMin: 2, teamMax: 4, level: "Tous niveaux", stack: "Mobile, SMS et données",
        description: "Un service qui prévient les villages et les techniciens quand un forage tombe en panne, et suit sa réparation.", prizes: [] },
      { id: "raccourcisseur", title: "Raccourcisseur de liens avec statistiques", organizerName: "KABAD", format: "ONLINE", startsAt: at(-10, 8, 0), endsAt: at(-3, 8, 0), closesAt: at(-10, 8, 0), teamMin: 1, teamMax: 1, status: "JURY", level: "Intermédiaire", stack: "Au choix",
        description: "Un service qui raccourcit les liens et compte les visites par pays.", prizes: ["Un an de nom de domaine et d’hébergement", "Un livre technique au choix"], resultsAt: at(4, 18, 0), publishedAt: at(-20) },
      { id: "inscription-accessible", title: "Page d’inscription accessible", organizerName: "KABAD", format: "ONLINE", startsAt: at(-20, 8, 0), endsAt: at(-12, 8, 0), closesAt: at(-20, 8, 0), teamMin: 1, teamMax: 1, status: "DONE", level: "Débutant", stack: "HTML, CSS et JavaScript",
        description: "Une page d’inscription utilisable au clavier et par un lecteur d’écran.", prizes: ["Une formation en ligne sur l’accessibilité", "Un livre technique au choix"], resultsAt: at(-8, 12, 0), publishedAt: at(-30) },
    ],
  });
  // A juror never takes part in the hackathon they judge.
  const juries: Record<string, string[]> = {
    "fintech-inclusion": ["kwame", "aicha", "nadia"],
    "agritech-sahel": ["aminata", "aicha", "nadia"],
    raccourcisseur: ["kwame", "aminata", "aicha"],
    "inscription-accessible": ["kwame", "aicha", "aminata"],
  };
  await db.hackathonJuror.createMany({ data: Object.entries(juries).flatMap(([hackathonId, ids]) => ids.map((userId) => ({ hackathonId, userId }))) });

  // Teams of the fintech hackathon (screens H3 and H4).
  const team = async (id: string, hackathonId: string, name: string, captainId: string, members: Array<[string, string]>, extra: { solo?: boolean; lookingFor?: string } = {}) => {
    await db.team.create({ data: { id, hackathonId, name, captainId, solo: extra.solo ?? false, lookingFor: extra.lookingFor, createdAt: minutesAgo(60 * 24 * 4) } });
    await db.teamMember.createMany({ data: members.map(([userId, skill], i) => ({ teamId: id, userId, hackathonId, skill, joinedAt: minutesAgo(60 * 24 * 4 - i) })) });
  };
  await team("baobab", "fintech-inclusion", "Équipe Baobab", "koffi", [["koffi", "Front"], ["sadio", "Mobile"]], { lookingFor: "Baobab cherche un·e designer" });
  await team("kora", "fintech-inclusion", "Équipe Kora", "chidi", [["chidi", "Backend"]], { lookingFor: "Cherche un·e dev front" });

  // Instructors: Aïcha accepted, Aminata has a mission to answer (screen H9).
  await db.instructorMission.createMany({
    data: [
      { id: "mission-aminata", hackathonId: "fintech-inclusion", mentorId: "aminata", fee: 75_000, createdAt: minutesAgo(160) },
      { hackathonId: "fintech-inclusion", mentorId: "aicha", fee: 75_000, status: "ACCEPTED", answeredAt: at(-2) },
    ],
  });
  // The instructors' group her mission opened: Kwame, who proposed the hackathon, leads it.
  const instructors = await conversation(
    "GROUP",
    ["kwame", "aicha"],
    [
      [null, "Groupe des instructeurs de « Fintech pour l’inclusion » : organisation, modalités et questions des équipes.", 60 * 48 + 30],
      [null, "Aïcha a rejoint le groupe", 60 * 48],
      ["kwame", "Bienvenue Aïcha ! Tu suivras les équipes qui font du mobile : je t’envoie la répartition demain.", 60 * 20],
      ["aicha", "Parfait. Je prépare une checklist « app utilisable en 3G » pour la veille.", 60 * 19],
    ],
    { name: "Instructeurs · Fintech pour l’inclusion", theme: "Hackathon", createdById: "kwame" },
  );
  await db.hackathon.update({ where: { id: "fintech-inclusion" }, data: { instructorsConversationId: instructors } });

  // Solo entries of the judged and finished hackathons.
  for (const [hackathonId, list] of Object.entries({ raccourcisseur: ["chidi", "sadio", "nadia"], "inscription-accessible": ["koffi", "sadio", "chidi"] })) {
    for (const userId of list) await team(`${hackathonId}-${userId}`, hackathonId, nameOf(userId), userId, [[userId, ""]], { solo: true });
  }
  const solution = (who: string, repo: string, projectName: string) => ({ projectName, repoUrl: `https://github.com/${who}/${repo}`, explanation: "Chaque cas est couvert par un test. J’explique mes choix dans le README : structure, validation des entrées, gestion des erreurs." });
  await db.submission.createMany({
    data: [
      { id: "sub-short-chidi", hackathonId: "raccourcisseur", teamId: "raccourcisseur-chidi", ...solution("chidiokafor", "short", "Short"), demoUrl: "https://short.exemple.ng" },
      { id: "sub-short-sadio", hackathonId: "raccourcisseur", teamId: "raccourcisseur-sadio", ...solution("sadiodiop", "lien-court", "Lien court") },
      { id: "sub-short-nadia", hackathonId: "raccourcisseur", teamId: "raccourcisseur-nadia", ...solution("nadiakouassi", "petit-lien", "Petit lien") },
      { id: "sub-ins-koffi", hackathonId: "inscription-accessible", teamId: "inscription-accessible-koffi", ...solution("koffimensah", "inscription-a11y", "Inscription accessible"), createdAt: at(-13) },
      { id: "sub-ins-sadio", hackathonId: "inscription-accessible", teamId: "inscription-accessible-sadio", ...solution("sadiodiop", "inscription", "Inscription"), createdAt: at(-13, 14) },
      { id: "sub-ins-chidi", hackathonId: "inscription-accessible", teamId: "inscription-accessible-chidi", ...solution("chidiokafor", "signup", "Signup"), createdAt: at(-13, 16) },
    ],
  });
  const score = (submissionId: string, jurorId: string, [works, code, tests, explain]: number[]) => ({ submissionId, jurorId, works, code, tests, explain });
  await db.juryScore.createMany({
    data: [
      // Averages 17.3, 16.7 and 15.7: Koffi wins.
      score("sub-ins-koffi", "kwame", [5, 4, 4, 4]), score("sub-ins-koffi", "aicha", [5, 4, 4, 4]), score("sub-ins-koffi", "aminata", [5, 5, 4, 4]),
      score("sub-ins-sadio", "kwame", [5, 4, 4, 4]), score("sub-ins-sadio", "aicha", [4, 4, 4, 4]), score("sub-ins-sadio", "aminata", [5, 4, 4, 4]),
      score("sub-ins-chidi", "kwame", [4, 4, 4, 4]), score("sub-ins-chidi", "aicha", [4, 4, 4, 3]), score("sub-ins-chidi", "aminata", [4, 4, 4, 4]),
      // The raccourcisseur jury is still at work.
      score("sub-short-chidi", "kwame", [5, 4, 3, 4]),
    ],
  });

  /* Africa Rise-Up (screens R1 to R5): five projects on real problems of the continent. */
  type Member = [string, string, "CO_LEAD"?];
  const project = async (id: string, data: { name: string; domain: "WATER" | "HEALTH" | "AGRICULTURE" | "ENERGY" | "EDUCATION"; summary: string; problem: string; skills: string[]; initiatorId: string }, members: Member[], daysAgo: number) => {
    const conversationId = await conversation("GROUP", members.map(([u]) => u), [[null, `${firstName(data.initiatorId)} a lancé le projet « ${data.name} »`, 60 * 24 * daysAgo]], { name: data.name, theme: "Rise-Up", createdById: data.initiatorId });
    await db.riseProject.create({
      data: { id, ...data, conversationId, createdAt: minutesAgo(60 * 24 * daysAgo), members: { create: members.map(([userId, skill, role], i) => ({ userId, skill, role: role ?? "MEMBER", joinedAt: minutesAgo(60 * 24 * daysAgo - i * 60) })) } },
    });
  };
  await project(
    "forages-louga",
    {
      name: "Signaler les forages en panne par SMS",
      domain: "WATER",
      summary: "Les villages signalent un forage en panne par SMS ; les techniciens voient où intervenir en premier.",
      problem: "Dans la région de Louga, un forage en panne peut rester des semaines sans réparation : personne ne sait qu’il est cassé, ni lequel réparer d’abord. Les femmes marchent alors des kilomètres pour trouver de l’eau. Nous construisons une carte où chaque village signale l’état de son forage par un simple SMS, et où les techniciens voient les pannes classées par nombre d’habitants touchés.",
      skills: ["mobile", "SMS", "data", "backend"],
      initiatorId: "sadio",
    },
    [["sadio", "Mobile"], ["chidi", "Backend", "CO_LEAD"], ["koffi", "Front"], ["kwame", "Cloud"], ["aicha", "Mobile"], ["nadia", "Data"]],
    30,
  );
  await project(
    "carnet-sante",
    {
      name: "Carnet de santé numérique pour les dispensaires",
      domain: "HEALTH",
      summary: "Un carnet patient simple, partagé entre les dispensaires d’une même zone, qui marche hors connexion.",
      problem: "Un patient qui change de dispensaire recommence tout son historique : vaccins, allergies, traitements. Les examens sont refaits, les erreurs de dosage arrivent. Un carnet numérique partagé et sécurisé, consultable sans connexion puis synchronisé, éviterait les doublons et protégerait les patients.",
      skills: ["backend", "sécurité", "mobile hors connexion"],
      initiatorId: "nadia",
    },
    [["nadia", "Data"], ["aminata", "Backend"], ["aicha", "Mobile"]],
    24,
  );
  await project(
    "prix-recoltes",
    {
      name: "Prix des marchés agricoles par SMS",
      domain: "AGRICULTURE",
      summary: "Chaque matin, les prix du marché voisin envoyés par SMS aux producteurs.",
      problem: "Les producteurs vendent souvent leur récolte sans connaître le prix du marché voisin : les intermédiaires fixent le prix. Un SMS quotidien avec les prix des trois marchés les plus proches leur donnerait un vrai pouvoir de négociation, même sur un téléphone simple.",
      skills: ["SMS", "data", "backend"],
      initiatorId: "chidi",
    },
    [["chidi", "Backend"], ["sadio", "Mobile"], ["nadia", "Data"]],
    20,
  );
  await project(
    "delestages",
    {
      name: "Prévoir les délestages quartier par quartier",
      domain: "ENERGY",
      summary: "Une alerte avant chaque coupure de courant, pour que les commerçants protègent leurs produits frais.",
      problem: "À Lomé comme à Accra, les coupures de courant tombent souvent sans prévenir : les commerçants perdent leurs produits frais, les ateliers s’arrêtent. En croisant les annonces des compagnies d’électricité et les signalements des habitants, nous voulons prévenir chaque quartier une heure avant une coupure.",
      skills: ["data", "web", "notifications"],
      initiatorId: "koffi",
    },
    [["koffi", "Front"], ["kwame", "Cloud", "CO_LEAD"], ["nadia", "Data"]],
    12,
  );
  await project(
    "cours-hors-ligne",
    {
      name: "Cours hors connexion pour les lycées sans internet",
      domain: "EDUCATION",
      summary: "Les cours du programme, copiés une fois par mois sur les téléphones des élèves, sans données mobiles.",
      problem: "Dans beaucoup de lycées ruraux, ni internet ni bibliothèque : les élèves n’ont que leurs cahiers. Une app légère, remplie une fois par mois au lycée par Wi-Fi local, leur donnerait les cours et les exercices corrigés du programme, consultables sans connexion.",
      skills: ["mobile", "contenu pédagogique", "design"],
      initiatorId: "aicha",
    },
    [["aicha", "Mobile"], ["sadio", "Mobile"], ["aminata", "Backend"]],
    8,
  );

  const post = async (projectId: string, authorId: string, body: string, ago: number, replies: Array<[string, string]> = []) => {
    const p = await db.risePost.create({ data: { projectId, authorId, body, createdAt: minutesAgo(ago) } });
    await db.risePost.createMany({ data: replies.map(([a, b], i) => ({ projectId, authorId: a, body: b, parentId: p.id, createdAt: minutesAgo(ago - 10 * (i + 1)) })) });
  };
  await post("forages-louga", "sadio", "La carte affiche maintenant les 40 premiers forages de Louga. Qui peut relire l’API d’import des SMS ?", 120, [
    ["chidi", "Je prends. Tu as un fichier d’exemple ?"],
    ["sadio", "Oui, dans le dossier fixtures du dépôt."],
    ["nadia", "Pense à valider les coordonnées : certaines lignes ont la latitude et la longitude inversées."],
    ["chidi", "Bien vu, j’ajoute un test pour ça."],
    ["kwame", "Pour l’hébergement, une petite base PostgreSQL suffit largement au début."],
    ["sadio", "Merci à tous, je fusionne demain."],
  ]);
  await post("forages-louga", "nadia", "Proposition : classer les pannes par nombre d’habitants touchés, pour que les techniciens commencent par les plus urgentes.", 60 * 26, [["koffi", "Je peux faire l’écran de la liste triée."]]);
  await post("carnet-sante", "nadia", "Premier jet du modèle de données : patient, consultation, vaccin, allergie. Vos remarques avant jeudi ?", 60 * 6, [["aminata", "Ajoute un journal d’accès : on doit savoir qui a lu quel dossier."]]);
  await post("prix-recoltes", "chidi", "Les prix de Kano, Kaduna et Zaria arrivent maintenant chaque matin à 6 h. Prochaine étape : le SMS en haoussa.", 60 * 30);
  await post("delestages", "koffi", "J’ai récupéré six mois d’annonces de coupures. Qui m’aide à les croiser avec les signalements ?", 60 * 50, [["nadia", "Moi. Envoie le fichier, je regarde les quartiers qui reviennent le plus."]]);
  await post("cours-hors-ligne", "aicha", "Test au lycée de Koudougou la semaine prochaine : 40 élèves, 3 matières.", 60 * 70);

  await db.riseEvent.createMany({
    data: [
      // Running now: the project shows « Salon en direct ».
      { projectId: "forages-louga", createdById: "sadio", title: "Choisir les capteurs de niveau", agenda: "Comparer trois capteurs, leur prix et leur autonomie.", startsAt: minutesAgo(15), minutes: 60, meetingUrl: "https://meet.google.com/rsu-capt-eur", approvedAt: minutesAgo(60 * 24) },
      { projectId: "forages-louga", createdById: "sadio", title: "Point d’étape mensuel", agenda: "Avancement de la carte, retours des villages, prochaines tâches.", startsAt: at(12, 18, 0), minutes: 60, meetingUrl: "https://meet.google.com/rsu-poin-tet", approvedAt: minutesAgo(60 * 24 * 3) },
      { projectId: "forages-louga", createdById: "chidi", title: "Atelier avec les techniciens de Louga", agenda: "Ce qu’un technicien doit voir en premier sur la carte.", startsAt: at(20, 15, 0), minutes: 90, meetingUrl: "https://meet.google.com/abc-defg-hij", approvedAt: minutesAgo(60 * 24 * 2) },
      { projectId: "carnet-sante", createdById: "nadia", title: "Atelier sécurité des données", agenda: "Qui peut lire quoi : les règles d’accès au carnet.", startsAt: nextWeekday(4, 18, 0), minutes: 60, meetingUrl: "https://meet.google.com/rsu-secu-rit", approvedAt: minutesAgo(60 * 24) },
      { projectId: "delestages", createdById: "kwame", title: "Choisir les sources de données", agenda: "Annonces des compagnies, signalements des habitants : que croiser d’abord ?", startsAt: at(6, 19, 0), minutes: 60, meetingUrl: "https://meet.google.com/rsu-dele-sta", approvedAt: minutesAgo(60 * 24 * 2) },
      // Proposed by Aïcha, a member: it waits for Nadia, who leads the project (P5).
      { projectId: "carnet-sante", createdById: "aicha", title: "Revue des écrans du carnet", agenda: "", startsAt: minutesAgo(10), minutes: 60, meetingUrl: "https://meet.google.com/rsu-ecra-ns", remind: false, approvedAt: null },
    ],
  });

  /* Apps to test (screens T1 to T4) */
  const testApp = async (id: string, ownerId: string, data: { name: string; platforms: Array<"WEB" | "ANDROID" | "IOS">; url: string; minutes: number; slots: number; pitch: string; task: string; steps: string[] }, testers: Array<[string, number[]]>) => {
    const conversationId = await conversation("GROUP", [ownerId, ...testers.map(([u]) => u)], [
      [null, `${firstName(ownerId)} a ouvert le groupe de test. Installer l’app : ${data.url}`, 60 * 24 * 8],
    ], { name: `Testeurs ${data.name}`, theme: "Test", createdById: ownerId });
    await db.testApp.create({ data: { id, ownerId, ...data, questions: [], conversationId, createdAt: minutesAgo(60 * 24 * 8), participants: { create: testers.map(([userId, doneSteps]) => ({ userId, doneSteps })) } } });
    return conversationId;
  };
  const marche = await testApp("marche-vert", "aicha", { name: "Marché Vert", platforms: ["ANDROID"], url: "https://marche-vert.exemple.bf/apk", minutes: 15, slots: 10, pitch: "Une app pour commander des légumes aux maraîchers de Ouagadougou et se faire livrer le jour même.", task: "Passer une commande et suivre la livraison.", steps: ["Créer un compte avec ton numéro", "Passer une commande de 3 produits", "Suivre la livraison et noter le livreur"] },
    [["koffi", [0, 1]], ["sadio", [0, 1, 2]], ["chidi", []], ["nadia", [0, 1, 2]]]);
  await db.message.createMany({
    data: [
      { conversationId: marche, authorId: "aicha", body: "Merci d’être là ! Nouvelle version en ligne, le paiement devrait marcher.", createdAt: minutesAgo(160) },
      { conversationId: marche, authorId: "sadio", body: "Commande passée. Le bouton « Valider » reste gris sur mon Tecno.", createdAt: minutesAgo(132) },
      { conversationId: marche, authorId: "koffi", body: "Même chose chez moi. Je t’envoie une capture.", createdAt: minutesAgo(128) },
    ],
  });
  await testApp("tontine-app", "chidi", { name: "TontineApp", platforms: ["WEB"], url: "https://tontine.exemple.ng", minutes: 20, slots: 5, pitch: "Une épargne de groupe entre amis ou collègues, avec rappels automatiques.", task: "Créer une tontine et inviter des membres.", steps: ["Créer une tontine de 5 000 F CFA par mois", "Inviter trois personnes", "Vérifier le rappel du premier versement"] }, [["sadio", [0]], ["nadia", []]]);
  await testApp("kalo", "koffi", { name: "Kalo", platforms: ["ANDROID", "WEB"], url: "https://kalo.exemple.tg", minutes: 10, slots: 8, pitch: "Un carnet de dépenses partagé pour les colocations.", task: "Ajouter une dépense et partager le budget.", steps: ["S’inscrire avec un numéro", "Ajouter une dépense", "Partager le budget du mois"] }, [["sadio", [0, 1, 2]], ["nadia", [0, 1, 2]], ["chidi", [0, 1, 2]], ["aminata", [0, 1]]]);
  const report = async (testAppId: string, testerId: string, remarks: string, status: "SUBMITTED" | "VALIDATED", ago: number) => {
    const r = await db.testReport.create({ data: { testAppId, testerId, device: "Android", status, remarks, answers: [], createdAt: minutesAgo(ago), reviewedAt: status === "VALIDATED" ? minutesAgo(ago - 60) : null } });
    const steps = (await db.testApp.findUniqueOrThrow({ where: { id: testAppId }, select: { steps: true } })).steps.length;
    await db.screenshot.createMany({ data: Array.from({ length: steps }, (_, position) => ({ reportId: r.id, position, mime: "image/png", data: CAPTURES[position % CAPTURES.length] })) });
  };
  await report("kalo", "sadio", "Clair et rapide. Le bouton de partage est un peu caché.", "VALIDATED", 60 * 24 * 2);
  await report("kalo", "nadia", "La saisie du montant accepte les lettres.", "VALIDATED", 60 * 24 * 2 - 30);
  await report("kalo", "chidi", "Rien à signaler, tout marche sur mon Tecno.", "SUBMITTED", 60 * 5);
  await report("marche-vert", "sadio", "Le bouton « Valider » reste gris après la commande sur Tecno Spark.", "SUBMITTED", 120);
  await report("marche-vert", "nadia", "Commande simple. Les photos chargent lentement en 3G.", "VALIDATED", 60 * 24);

  /*
   * Notifications (screen P2). The text is written in the reader's language from the key. They are marked as
   * already e-mailed: the worker must not write to the members' real inboxes about the seed's own events.
   */
  const n = (userId: string, actor: string, key: string, params: Record<string, string | number> | undefined, text: string, href: string, icon: string, tone: string, ago: number, read = false) => ({ userId, actor, key, params, text, href, icon, tone, createdAt: minutesAgo(ago), readAt: read ? minutesAgo(ago - 1) : null, emailedAt: now });
  await db.notification.createMany({
    data: [
      n("koffi", "Aminata Traoré", "bookingAccepted", { at: thursday.toISOString(), tz: "Africa/Lome" }, " a accepté ta séance de jeudi à 15 h.", "/mentorat/seances/seance-momo", "check", "success", 35),
      n("koffi", "Nadia Kouassi", "invitationReceived", undefined, " t’invite à échanger.", "/messages/invitations/invitation-nadia", "user", "brand", 73),
      n("koffi", "Signaler les forages en panne par SMS", "riseEvent", { title: "Choisir les capteurs de niveau", at: minutesAgo(15).toISOString(), tz: "Africa/Lome" }, " : « Choisir les capteurs de niveau ».", "/rise-up/forages-louga", "radio", "accent", 15),
      n("koffi", "Chidi Okafor", "testJoined", { title: "Kalo" }, " a rejoint les testeurs de « Kalo ».", "/tests/kalo", "users", "brand", 60 * 26, true),
      n("koffi", "Collectif Santé Abidjan", "hackathonProposed", { title: "Santé connectée" }, " propose le hackathon « Santé connectée ».", "/hackathons/sante-connectee", "trophy", "accent", 60 * 24 * 2, true),
      // Aminata has a mission to answer and a request to read.
      n("aminata", "FinLab Cotonou", "missionProposed", undefined, " te propose une mission d’instructeur rémunérée.", "/hackathons/missions/mission-aminata", "wallet", "accent", 160),
      n("aminata", "Sadio Diop", "bookingRequested", { at: sadioAsks.toISOString(), tz: "Africa/Bamako", topic: "Payer les techniciens des forages par mobile money" }, " demande une séance.", "/mentorat/demandes", "clock", "brand", 180),
      // Nadia leads the health project: Aïcha's room waits for her.
      n("nadia", "Aïcha Diallo", "roomProposed", { title: "Revue des écrans du carnet", project: "Carnet de santé numérique pour les dispensaires" }, " propose un salon.", "/rise-up/carnet-sante", "radio", "accent", 10),
    ],
  });

  console.log(`Seed terminé : ${users.length} membres et le compte de l’équipe (${TEAM.email}). Mots de passe : SEED_PASSWORD_… dans .env${forced ? "" : `, sinon ${LOCAL_PASSWORD} sur cette machine`}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
