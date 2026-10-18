# KABAD

La communauté des développeurs d’Afrique et de la diaspora : mentorat sur projet concret, défis de code, tests communautaires et messagerie.
Projet de l’équipe KABAD pour la Coupe d’Afrique des Développeurs (CADEV) de Systalink.

> **État actuel.** La messagerie est réelle : comptes, invitations, conversations à deux, groupes privés et signalements sont enregistrés dans PostgreSQL et arrivent en temps réel.
> Le mentorat, les défis et les tests communautaires utilisent encore des données d’exemple (`src/lib/data.ts`).

## Démarrer

Il faut Node.js 22 et PostgreSQL 16.

```bash
cp .env.example .env          # puis mettre un REALTIME_SECRET long et aléatoire : openssl rand -hex 32
npm ci
npm run db:migrate            # crée les tables
npm run db:seed               # 8 membres de démonstration, conversations et un groupe
npm run realtime              # service temps réel sur http://localhost:4001 (laisser tourner)
npm run dev                   # dans un autre terminal : http://localhost:3000
```

Comptes de démonstration (mot de passe `kabad-demo-2026` pour tous) : `kossi.mensah@exemple.tg`, `moussa.traore@exemple.fr`, `yao.koffi@exemple.tg`, `chidi.okafor@exemple.ng`…
Ouvrez deux navigateurs (ou une fenêtre privée), connectez-vous avec deux comptes : les messages arrivent sans recharger.

## Messagerie

- **Invitation d’abord** : on écrit à quelqu’un en lui envoyant une invitation avec un premier message (300 caractères au plus). La conversation s’ouvre quand il accepte ; vous devenez contacts. Un refus est discret et définitif.
- **Groupes privés** : seul le créateur ajoute des participants, choisis parmi ses contacts (50 membres au plus).
- **Règles vérifiées par le serveur** (`src/server/messaging.ts`) : seuls les membres lisent et écrivent, un blocage coupe les messages et les invitations, un message envoyé deux fois n’est enregistré qu’une fois.
- **Temps réel** : l’application écrit dans PostgreSQL et envoie `pg_notify` dans la même transaction. Le service `realtime/server.mjs` (Socket.IO) écoute, relit le message et le pousse aux membres concernés. Il n’écrit jamais dans la base. Le navigateur s’y connecte avec un jeton de 10 minutes signé par l’application.
- **Sessions** : cookie `httpOnly` et `SameSite=Lax`, seule l’empreinte SHA-256 du jeton est stockée ; mots de passe hachés avec bcrypt.

## Vérifications

| Commande | Rôle |
| --- | --- |
| `npm run lint` | ESLint (règles Next.js et accessibilité) |
| `npm run typecheck` | Types des routes et TypeScript strict |
| `npm test` | Tests unitaires Vitest des règles métier (partage 60/30/10, éligibilité au mentorat, jury, invitations) |
| `npm run test:integration` | Règles de la messagerie sur une vraie base PostgreSQL (`DATABASE_URL_TEST`, vidée par les tests) |
| `npm run test:e2e` | Playwright : chaque écran sur téléphone et ordinateur, et la messagerie à plusieurs navigateurs en temps réel. Remet les données de démonstration à zéro |
| `npm run licenses` | Échoue si une dépendance est sous GPL, AGPL ou LGPL |

La CI GitHub Actions (`.github/workflows/ci.yml`) lance tout cela, avec un PostgreSQL, à chaque push et pull request.

## Mise en production

`compose.yaml` décrit la pile complète : PostgreSQL, les migrations, l’application web et le service temps réel.
Les secrets (`POSTGRES_PASSWORD`, `REALTIME_SECRET`) se mettent dans un fichier `.env` sur le serveur, jamais dans le dépôt.
`NEXT_PUBLIC_REALTIME_URL` (adresse publique du service temps réel) est fixée à la construction de l’image web.

## Pile technique

- **Next.js 16** (App Router, Cache Components), **React 19**, **TypeScript**, **Tailwind CSS 4**. Toutes sous licence MIT.
- **Polices** servies par `next/font` : Ojuju (titres), Fira Sans (texte), Overpass Mono (code), Danfo (grands moments). Toutes sous OFL et complètes pour les langues d’Afrique de l’Ouest et centrale (ɛ ɔ ŋ ɓ ɗ ƙ ẹ ọ ṣ ɖ ƒ ɣ ʋ).
- **PWA** : `src/app/manifest.ts` et icônes dans `public/icons/`.
- **Données** : PostgreSQL 16 et Prisma 7 (Apache-2.0). **Temps réel** : Socket.IO (MIT). Jetons : jose (MIT), mots de passe : bcryptjs (MIT), validation : Zod (MIT).
- **Déploiement** : `Dockerfile` (cibles `web`, `realtime`, `migrate`) et `compose.yaml` pour le serveur cloud Systalink. Les images se construisent dans la CI, jamais sur le serveur.

## Organisation

```
src/
  app/
    page.tsx                 Bienvenue
    (auth)/                  Inscription en 3 étapes, connexion
    (app)/                   Application connectée (navigation latérale + barre du bas)
      accueil, notifications, profil/[id]
      mentorat, mentorat/mentors, mentorat/demande/[id], mentorat/seances/[id], capsules
      defis, defis/[id], defis/[id]/soumettre, defis/[id]/jury, defis/[id]/resultats
      tests, tests/[id], tests/[id]/rapport, tests/[id]/rapports
      messages, messages/[id], messages/invitations/[id], messages/groupes/nouveau
    soutenir/[id]            Page publique du sponsor (sans compte)
    api/                     Routes de l’API : comptes, conversations, invitations, groupes, signalements
  components/
    ui/                      Design system : boutons, champs, badges, avatars, alertes, partage 60/30/10…
    shell/                   Barre de titre, navigation, cadre d’inscription
    features/                Invitation, signalement, fil de messages, progression du mentorat…
  proxy.ts                   Envoie vers la connexion les visiteurs sans session
  server/                    Côté serveur uniquement : base, sessions, règles de la messagerie
  lib/                       Règles métier testées, formats, schémas de validation, client temps réel
prisma/                      Schéma, migrations, données de démonstration
realtime/server.mjs          Service temps réel (Socket.IO)
tests/integration/           Tests de la messagerie sur PostgreSQL
e2e/                         Tests de parcours Playwright
```

## Design system

Les couleurs, l’échelle de texte et les rayons sont des variables CSS dans `src/app/globals.css`, exposées à Tailwind.
Tout est calé sur une grille de 4 px : chaque interligne est un multiple de 4. Le thème sombre suit le réglage du téléphone.

## Licences

- `sharp` (optimisation d’images de Next.js) dépend de libvips, sous LGPL. Il est remplacé par un module vide (`tools/no-sharp`) et l’optimisation d’images est désactivée.
- Deux outils de construction sont sous MPL-2.0, une licence à copyleft faible : `lightningcss` (Tailwind) et `axe-core` (règles d’accessibilité d’ESLint). Ils ne sont pas livrés avec l’application, mais nous le signalons aux organisateurs.
