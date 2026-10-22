# KABAD

La communauté des développeurs d’Afrique et de la diaspora : mentorat sur projet concret, défis de code, tests communautaires, messagerie et salons vocaux.
Projet de l’équipe KABAD pour la Coupe d’Afrique des Développeurs (CADEV) de Systalink.

Tout fonctionne sur de vraies données : comptes, mentorat, défis et jury, cagnottes et versements, tests communautaires, messagerie en temps réel, salons vocaux, modération et tableau de bord de l’équipe. Seul le **paiement en ligne des contributions** n’est pas branché : le prestataire reste à choisir.

## Lancer KABAD sur son ordinateur

Il faut **Node.js 22**, **PostgreSQL 16 ou plus** et **Git**. Comptez 15 minutes la première fois.

### 1. Récupérer le code

```bash
git clone https://github.com/200665467716/KABAD.git
cd KABAD
git checkout dev/Emmerson
npm ci
```

### 2. Préparer la base de données

Créez un utilisateur et deux bases (la seconde sert aux tests). Dans `psql`, connecté avec l’utilisateur `postgres` :

```sql
CREATE ROLE kabad WITH LOGIN PASSWORD 'kabad' CREATEDB;
CREATE DATABASE kabad OWNER kabad;
CREATE DATABASE kabad_test OWNER kabad;
```

Sous Windows, `psql` se trouve dans `C:\Program Files\PostgreSQL\<version>\bin\psql.exe`. Le droit `CREATEDB` est nécessaire : `prisma migrate dev` crée une base temporaire.

### 3. Configurer

```bash
cp .env.example .env        # PowerShell : Copy-Item .env.example .env
```

Dans `.env`, remplacez `REALTIME_SECRET` par une longue chaîne aléatoire (`openssl rand -hex 32`, ou 64 caractères au hasard). Les autres valeurs conviennent pour le local.

### 4. Créer les tables et les données de démonstration

```bash
npm run db:migrate
npm run db:seed
```

### 5. Démarrer les services

Ouvrez trois terminaux :

| Terminal | Commande | Rôle |
| --- | --- | --- |
| 1 | `npm run realtime` | Messages et notifications en direct (port 4001) |
| 2 | `livekit-server --dev` | Audio des salons vocaux (port 7880) |
| 3 | `npm run dev` | L’application : http://localhost:3000 |

**LiveKit** : téléchargez `livekit-server` (version 1.13.10) depuis https://github.com/livekit/livekit/releases, ou lancez-le avec Docker :
`docker run --rm -p 7880:7880 -p 7881:7881 -p 7882:7882/udp livekit/livekit-server:v1.13.10 --dev --bind 0.0.0.0`.
Sans LiveKit, tout fonctionne sauf l’audio des salons.

### 6. Se connecter

Mot de passe **`kabad-demo-2026`** pour tous les comptes :

| Compte | E-mail | Pour tester |
| --- | --- | --- |
| Kossi Mensah, junior | `kossi.mensah@exemple.tg` | Binôme avec Awa, défis, invitations reçues, groupe « API Lomé » |
| Awa Diop, senior | `awa.diop@exemple.sn` | Mentore Kossi, app « Marché Vert » avec rapports à lire |
| Moussa Traoré, senior | `moussa.traore@exemple.fr` | Juré du défi « Raccourcisseur », demande de mentorat de Fatou, salon programmé |
| Yao Koffi, junior | `yao.koffi@exemple.tg` | Contact de Kossi |
| Chidi Okafor, junior | `chidi.okafor@exemple.ng` | Invitation en attente vers Kossi |
| Fatou Sow, junior | `fatou.sow@exemple.ci` | Invitation et demande de mentorat en attente |
| Nadia Bello, senior | `nadia.bello@exemple.ca` | Mentor disponible |
| Ibrahim Kaboré, senior | `ibrahim.kabore@exemple.bf` | Mentor complet |
| **Équipe KABAD** | `equipe@kabad.app` | **Tableau de bord** `/admin` : signalements, membres, défis, versements, journal |

Ouvrez deux navigateurs (ou une fenêtre privée) avec deux comptes pour voir les messages et les salons vocaux en direct.

**E-mails** : en local, les e-mails (confirmation d’adresse, mot de passe oublié) s’affichent dans le terminal de `npm run dev`. En production, renseignez `SMTP_URL`.

### Problèmes courants

- **`P1000: Authentication failed`** : l’utilisateur ou le mot de passe de `DATABASE_URL` ne correspond pas à PostgreSQL. Refaites l’étape 2, ou adaptez `DATABASE_URL`.
- **`Seed refusé`** : les données de démonstration ne s’installent que sur une base locale (`127.0.0.1` ou `localhost`).
- **Pas de messages en direct** : le terminal 1 (`npm run realtime`) doit tourner.

## Ce que fait KABAD

- **Comptes** : inscription avec e-mail à confirmer, connexion GitHub (facultative), mot de passe oublié, changement de mot de passe, déconnexion de tous les appareils, export et suppression du compte.
- **Membres** : annuaire avec recherche par nom, ville, pays et technologie ; invitation avec un premier message ; la conversation s’ouvre si l’invitation est acceptée.
- **Messagerie** : conversations à deux et groupes privés en temps réel ; participants, départ et retrait ; signalement d’un message ; blocage et déblocage.
- **Mentorat** : demande à un senior vérifié, binôme, séances notées et confirmées à deux, prochaine séance, fin de binôme. Les défis à cagnotte demandent 6 h confirmées.
- **Défis** : soumission, jury anonyme de trois seniors (un juré ne note jamais son propre mentoré), résultats, partage 60/30/10 et versements après 48 h de contestation.
- **Tests communautaires** : publier son app avec un scénario et des questions de contrôle ; rapports avec captures, validés ou refusés par le porteur.
- **Salons vocaux** : salons en direct ou programmés, avec scène et auditoire ; lever la main ; l’hôte fait monter sur scène, renvoie dans l’auditoire ou retire. Seuls l’hôte et les intervenants peuvent parler, et c’est le serveur audio qui l’impose.
- **Modération** : signalements traités par l’équipe (classer, retirer un message, fermer un salon, avertir, suspendre), vérification des seniors, journal de toutes les actions.

## Sécurité

- **Sessions** : cookie `httpOnly`, `SameSite=Lax` et `Secure` en production. Seule l’empreinte SHA-256 du jeton est stockée. Les mots de passe sont hachés avec bcrypt.
- **Règles côté serveur** : chaque règle est vérifiée par le serveur (`src/server/*.ts`), jamais seulement par l’écran.
- **Requêtes et limites** : contrôle de l’origine des requêtes, limites de débit stockées dans PostgreSQL (communes à toutes les instances), et IP lue derrière le proxy de confiance (`TRUSTED_PROXY_HOPS`).
- **En-têtes** : politique de sécurité du contenu (CSP) et HSTS en HTTPS.
- **Envois de fichiers** : leur taille est bornée à la lecture, et les captures sont servies avec `nosniff`.
- **Temps réel** : jeton de 10 minutes. La connexion est fermée à son expiration, à la déconnexion et en cas de suspension.
- **Administrateurs** : il n’y a pas d’administrateur par défaut en production. On en nomme un sur le serveur : `npm run admin:promote -- adresse@exemple.org`.

## Vérifications

| Commande | Rôle |
| --- | --- |
| `npm run lint` | ESLint : règles Next.js et accessibilité |
| `npm run typecheck` | Types des routes et TypeScript strict |
| `npm test` | Tests unitaires des règles métier |
| `npm run test:integration` | Règles et failles corrigées, sur une vraie base PostgreSQL (`DATABASE_URL_TEST`, vidée par les tests) |
| `npm run test:e2e` | Playwright : chaque écran sur téléphone et ordinateur, les parcours, la messagerie en temps réel, les salons vocaux avec un vrai serveur audio. Il faut `LIVEKIT_BIN` (chemin de `livekit-server`), ou `livekit-server` dans le `PATH`. |
| `npm run licenses` | Échoue si une dépendance est sous GPL, AGPL ou LGPL |

La CI GitHub Actions (`.github/workflows/ci.yml`) lance tout cela avec PostgreSQL et LiveKit, à chaque push sur `main` et `dev/**`, et à chaque pull request.

## Mise en production

`compose.yaml` décrit la pile : PostgreSQL, les migrations, l’application, le service temps réel et LiveKit.

- Les secrets (`POSTGRES_PASSWORD`, `REALTIME_SECRET`, `LIVEKIT_API_SECRET`, `SMTP_URL`) vont dans un `.env` **sur le serveur**, jamais dans le dépôt.
- Les ports 3000, 4001 et 7880 n’écoutent que sur la machine : un reverse proxy HTTPS (Caddy ou Nginx) est placé devant.
- LiveKit a aussi besoin du port TCP 7881 et des ports UDP 50000 à 60000 ouverts.
- `NEXT_PUBLIC_REALTIME_URL` et `NEXT_PUBLIC_LIVEKIT_URL` (adresses publiques en `https://` et `wss://`) sont fixées à la construction de l’image web.

## Pile technique

- **Next.js 16** (App Router, Cache Components), **React 19**, **TypeScript**, **Tailwind CSS 4**.
- **Données** : PostgreSQL et Prisma 7.
- **Temps réel** : Socket.IO, alimenté par `pg_notify`.
- **Audio des salons** : LiveKit, serveur auto-hébergé et client `livekit-client`.
- **Polices** : Inter (texte et titres) et JetBrains Mono (code), servies par `next/font`. Elles couvrent les lettres des langues d’Afrique de l’Ouest et centrale (ɛ ɔ ŋ ɓ ɗ ƙ ẹ ọ ṣ ɖ ƒ ɣ ʋ).
- **PWA** : `src/app/manifest.ts` et `public/icons/`.

## Organisation

```
src/
  app/
    (auth)/        Inscription, connexion, e-mail à confirmer, mot de passe oublié
    (app)/         Application connectée : accueil, membres, messages, mentorat, capsules,
                   défis, tests, salons, notifications, profil, compte, admin
    soutenir/[id]  Page publique d’une cagnotte
    conditions/    Conditions d’utilisation et charte (version de travail)
    api/           Routes de l’API
  components/      Design system (ui), cadre (shell), blocs métier (features)
  server/          Côté serveur uniquement : règles de chaque module, sécurité, LiveKit, e-mails
  lib/             Règles partagées, formats, schémas de validation, client temps réel
  proxy.ts         Envoie vers la connexion les visiteurs sans session
prisma/            Schéma, migrations, données de démonstration
realtime/          Service temps réel
scripts/           Nommer un administrateur
tests/integration/ Tests sur PostgreSQL
e2e/               Tests de parcours Playwright
```

## Licences

Le concours CADEV interdit les licences GPL, AGPL et LGPL. `npm run licenses` le vérifie à chaque CI.

### Livré avec l’application

| Licence | Composants |
| --- | --- |
| MIT | Next.js, React, Tailwind CSS, Socket.IO, jose, bcryptjs, Zod, pg et la grande majorité des dépendances |
| Apache-2.0 | Prisma (client et adaptateur PostgreSQL), `livekit-client` |
| Apache-2.0 et BSD-3-Clause | `@bufbuild/protobuf` (utilisé par `livekit-client`) |
| MIT-0 | `nodemailer` (e-mails) |
| ISC, BSD-2-Clause, BSD-3-Clause, 0BSD, Unlicense | Petites dépendances |
| CC-BY-4.0 | `caniuse-lite` : données de compatibilité des navigateurs utilisées par Next.js (une licence de données, pas de code) |
| OFL-1.1 | Polices Inter et JetBrains Mono |

### Services séparés, non intégrés au code

| Licence | Composants |
| --- | --- |
| Apache-2.0 | Serveur **LiveKit** (`livekit/livekit-server`), lancé à côté de l’application |
| PostgreSQL License | **PostgreSQL** |

### Outils de développement, jamais livrés

| Licence | Composants |
| --- | --- |
| MPL-2.0 (copyleft faible, fichier par fichier) | `lightningcss` (compilation du CSS de Tailwind), `axe-core` (règles d’accessibilité d’ESLint) |
| EPL-2.0 (copyleft faible) | `elkjs`, utilisé par Prisma Studio, l’outil de consultation de la base |
| Python-2.0 | `argparse` (dépendance d’ESLint) |
| CC-BY-3.0 | `spdx-exceptions`, `spdx-ranges` (données de licences du vérificateur) |

Nous signalons les licences à copyleft faible (MPL-2.0, EPL-2.0) aux organisateurs, bien qu’elles ne concernent que des outils de construction.

### Remplacé pour respecter la règle

`sharp` (optimisation d’images de Next.js) dépend de libvips, sous LGPL. Il est remplacé par un module vide (`tools/no-sharp`) et l’optimisation d’images est désactivée.
