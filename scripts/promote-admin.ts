/*
 * Gives (or removes) the team role to an existing account. Run on the server, never from the app:
 *   npm run admin:promote -- awa.diop@exemple.sn
 *   npm run admin:promote -- awa.diop@exemple.sn --retirer
 * The person creates their account normally first, with their own password.
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const [email, flag] = process.argv.slice(2);
if (!email || !email.includes("@")) {
  console.error("Usage : npm run admin:promote -- adresse@exemple.org [--retirer]");
  process.exit(1);
}
const revoke = flag === "--retirer";
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

// tsx compile ce fichier en CommonJS (pas de "type": "module" dans package.json) :
// l’await de premier niveau y est interdit, d’où la fonction main().
async function main() {
  try {
    const user = await db.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (!user) {
      console.error(`Aucun compte avec l’adresse ${email}. La personne doit d’abord s’inscrire.`);
      process.exit(1);
    }
    if (revoke && (await db.user.count({ where: { isAdmin: true } })) <= 1 && user.isAdmin) {
      console.error("C’est le dernier administrateur : nommez-en un autre avant.");
      process.exit(1);
    }
    await db.user.update({ where: { id: user.id }, data: { isAdmin: !revoke } });
    console.log(revoke ? `${user.name} n’est plus administrateur.` : `${user.name} est maintenant administrateur. Tableau de bord : /admin`);
  } finally {
    await db.$disconnect();
  }
}

void main();
