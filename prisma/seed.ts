/*
 * Demo data: the members shown in the design, their contacts, conversations and invitations.
 * Every account uses the password "kabad-demo-2026". Never run against production.
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Role } from "../src/generated/prisma/client";

if (process.env.NODE_ENV === "production" && process.env.SEED_FORCE !== "1") {
  console.error("Seed refusé en production.");
  process.exit(1);
}

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
export const DEMO_PASSWORD = "kabad-demo-2026";

type SeedUser = { id: string; email: string; name: string; role: Role; city: string; country: string; diaspora?: boolean; years: number; headline: string; bio: string; stack: string[] };

const users: SeedUser[] = [
  { id: "kossi", email: "kossi.mensah@exemple.tg", name: "Kossi Mensah", role: "JUNIOR", city: "Lomé", country: "Togo", years: 2, headline: "Développeur Node.js", bio: "Je construis une API de paiement mobile et je veux la rendre fiable.", stack: ["TypeScript", "Node.js", "React"] },
  { id: "awa", email: "awa.diop@exemple.sn", name: "Awa Diop", role: "SENIOR", city: "Dakar", country: "Sénégal", years: 9, headline: "Lead dev chez une fintech", bio: "J’aide les juniors à passer du tutoriel au vrai projet.", stack: ["TypeScript", "Node.js", "React", "PostgreSQL", "Docker"] },
  { id: "moussa", email: "moussa.traore@exemple.fr", name: "Moussa Traoré", role: "SENIOR", city: "Paris", country: "France", diaspora: true, years: 11, headline: "Lead back-end", bio: "Back-end Node.js et PostgreSQL. Préparation aux entretiens techniques.", stack: ["Node.js", "PostgreSQL", "TypeScript"] },
  { id: "nadia", email: "nadia.bello@exemple.ca", name: "Nadia Bello", role: "SENIOR", city: "Montréal", country: "Canada", diaspora: true, years: 7, headline: "Développeuse mobile", bio: "Applications mobiles React Native.", stack: ["React Native", "TypeScript"] },
  { id: "ibrahim", email: "ibrahim.kabore@exemple.bf", name: "Ibrahim Kaboré", role: "SENIOR", city: "Ouagadougou", country: "Burkina Faso", years: 12, headline: "Architecte mobile", bio: "Flutter et paiements mobiles.", stack: ["Flutter", "Dart"] },
  { id: "yao", email: "yao.koffi@exemple.tg", name: "Yao Koffi", role: "JUNIOR", city: "Lomé", country: "Togo", years: 1, headline: "Développeur front-end", bio: "J’apprends React.", stack: ["React", "CSS"] },
  { id: "chidi", email: "chidi.okafor@exemple.ng", name: "Chidi Okafor", role: "JUNIOR", city: "Lagos", country: "Nigeria", years: 3, headline: "Développeur TypeScript", bio: "Je construis TontineApp.", stack: ["TypeScript", "React"] },
  { id: "fatou", email: "fatou.sow@exemple.ci", name: "Fatou Sow", role: "JUNIOR", city: "Abidjan", country: "Côte d’Ivoire", years: 2, headline: "Développeuse full-stack", bio: "Je construis SantéDirect.", stack: ["React", "Python"] },
];

const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000);
const directKey = (a: string, b: string) => [a, b].sort().join(":");

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  await db.$transaction([
    db.report.deleteMany(),
    db.block.deleteMany(),
    db.message.deleteMany(),
    db.conversationMember.deleteMany(),
    db.conversation.deleteMany(),
    db.contact.deleteMany(),
    db.invitation.deleteMany(),
    db.session.deleteMany(),
    db.user.deleteMany(),
  ]);

  await db.user.createMany({ data: users.map((u) => ({ ...u, diaspora: u.diaspora ?? false, passwordHash })) });

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

  console.log(`Seed terminé : ${users.length} membres. Mot de passe : ${DEMO_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
