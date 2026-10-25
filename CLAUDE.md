@AGENTS.md

# KABAD — consignes pour Claude Code

KABAD est la plateforme d'échange des développeurs d'Afrique et de la diaspora : mentorat, défis de code, tests communautaires, messagerie (et salons vocaux). C'est le projet de l'équipe pour la **CADEV 2026** (Coupe d'Afrique des Développeurs, Systalink).

- **Thème officiel** : « Construire la plateforme d'échange africaine, pour les devs, par les devs. »
- **Date limite de soumission : 15 novembre 2026, 17h00 GMT.** Rien n'est accepté après.
- **Cahier des charges** : `../KABAD — Cahier des charges.md` (source de vérité produit, priorités Must / Should / V2).
- **Feuille de route** : `docs/ROADMAP.md` (ce qui reste à faire, dans l'ordre). La tenir à jour à chaque tâche terminée.
- **Équipe** : Emmerson Michel da MATHA (produit), Koffi Amos Sivitra (tech lead), Claude (développement).

## Règles du concours qui s'imposent au code

1. **Licences** : aucune dépendance GPL, AGPL ou LGPL, même transitive, sinon le projet est irrecevable. Avant d'ajouter un paquet, vérifier sa licence ; `npm run licenses` doit passer. `sharp` est neutralisé par `tools/no-sharp` (libvips est sous LGPL) : ne pas le réactiver.
2. **Déploiement sur Datacloud (Systalink)** : la démo doit tourner en ligne sur le serveur Systalink (Dakar). Condition de recevabilité.
3. **Usage de l'IA à déclarer** : chaque commit fait avec Claude garde la ligne `Co-Authored-By`. Le jury vérifie que l'équipe maîtrise et sait expliquer le code : écrire du code simple, lisible, et expliquer les choix dans les messages de commit ou de PR.
4. **Grille du jury** : qualité technique 30 % (architecture, robustesse, sécurité, code, licences), pertinence au thème 25 %, UX 20 %, innovation 15 %, vote du public 10 %. À chaque arbitrage, privilégier ce qui marche de bout en bout et proprement plutôt que de multiplier les fonctionnalités.

## Stack et conventions

- **Next.js 16** (App Router, Cache Components), React 19, TypeScript strict, Tailwind CSS 4. Cette version de Next.js diffère de ce que tu connais : lire `node_modules/next/dist/docs/` avant d'utiliser une API Next.js (voir `AGENTS.md`).
- **Données** : PostgreSQL 16 + Prisma 7 (`prisma/schema.prisma`). Toute modification du schéma passe par une migration (`npm run db:migrate -- --name <nom>`), jamais par `db push`.
- **Temps réel** : `realtime/server.mjs` (Socket.IO alimenté par `pg_notify`). Salons vocaux : LiveKit.
- **Organisation** :
  - `src/server/*.ts` porte les règles métier, vérifiées côté serveur ;
  - `src/app/api/**` contient des routes fines qui valident l'entrée (Zod, `src/lib/schemas.ts`) puis appellent `src/server` ;
  - `src/lib` regroupe les règles partagées et pures (testées unitairement).
- **Argent** (cagnottes, répartition 60/30/10, versements, remboursements) : uniquement dans la couche serveur, dans une transaction PostgreSQL, avec une clé d'idempotence. Le paiement réel reste en **sandbox**.
- **Tâches différées** (relance à 48 h, réaffectation à 72 h, versement à 48 h, rappels) : jamais pendant une requête web.
- **Langue** : interface, messages de commit, commentaires et documentation en **français**, dans le style déjà présent (phrases courtes, termes simples). Respecter la densité de commentaires du fichier modifié.
- **Cible mobile** : Android d'entrée de gamme en 4G lente. LCP < 2,5 s, JS initial < 200 Ko gzip, images WebP, pas de vidéo chargée sans action, 360 à 1 920 px, WCAG 2.1 AA.

## Commandes

| Commande | Rôle |
| --- | --- |
| `npm run dev` / `npm run realtime` | Application (3000) / temps réel (4001) |
| `npm run db:migrate` / `npm run db:seed` | Migrations / données de démonstration (mot de passe `kabad-demo-2026`) |
| `npm run lint` · `npm run typecheck` · `npm test` | Vérifications rapides : à lancer avant chaque commit |
| `npm run test:integration` | Règles sur une vraie base (`DATABASE_URL_TEST`, vidée par les tests) |
| `npm run test:e2e` | Parcours Playwright (nécessite LiveKit pour les salons) |
| `npm run licenses` | Échoue si une licence GPL/AGPL/LGPL est présente |

Poste local : Node 22 est attendu (la CI l'utilise). PostgreSQL n'est pas installé sur la machine : le lancer avec Docker, par exemple `docker run -d --name kabad-pg -e POSTGRES_USER=kabad -e POSTGRES_PASSWORD=kabad -e POSTGRES_DB=kabad -p 5432:5432 postgres:16-alpine`, puis créer `kabad_test`.

## Façon de travailler

- Une tâche = une entrée de `docs/ROADMAP.md`. Commencer par relire l'exigence correspondante dans le cahier des charges, puis le code existant du module.
- Toute règle métier nouvelle ou corrigée reçoit un test (unitaire dans `src/lib/__tests__` si elle est pure, sinon d'intégration dans `tests/integration`).
- Avant de déclarer une tâche finie : `npm run lint && npm run typecheck && npm test` doivent passer. Lancer aussi les tests d'intégration si le serveur ou le schéma a changé.
- Branches : travailler sur une branche `dev/<sujet>` partant de `dev/Emmerson`. Ne jamais pousser, fusionner ni forcer sans demande explicite.
- Ne jamais committer de secret : `.env*` est ignoré, et les secrets de production restent sur le serveur.
