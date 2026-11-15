# KABAD

La plateforme d’échange des devs d’Afrique et de la diaspora. **Par les devs, pour les devs.**

Vision : créer la prochaine génération de devs africains, plus productifs et plus compétents à l’ère de l’IA. Cinq espaces y mènent : **mentorat** gratuit avec des mentors badgés, **hackathons** créés par des organisations, **tests d’apps** par la communauté, **messagerie** et **Africa Rise-Up**, des projets à impact pour l’Afrique.

Projet de l’équipe KABAD pour la Coupe d’Afrique des Développeurs (CADEV 2026) de Systalink. La vision, les décisions et les fonctionnalités de référence sont dans [`docs/point-projet.md`](point-projet.md) ; ce qui reste à faire est dans [`docs/ROADMAP.md`](ROADMAP.md).

Tout fonctionne sur de vraies données : comptes, mentorat par créneaux, badge mentor, hackathons et jury, tests d’apps, messagerie en temps réel, Africa Rise-Up, modération et tableau de bord de l’équipe. KABAD ne garde ni ne verse d’argent : les prix d’un hackathon sont annoncés et remis par son organisateur.

## Lancer KABAD sur son ordinateur

Il faut **Node.js 22**, **PostgreSQL 16 ou plus** et **Git**. Comptez 15 minutes la première fois.

### 1. Récupérer le code

```bash
git clone https://github.com/200665467716/KABAD.git
cd KABAD
git checkout main
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
| 2 | `npm run dev` | L’application : http://localhost:3000 |
| 3 | `npm run worker` | Tâches planifiées : rappels de séances et d’événements, expirations, passage des hackathons au jury (facultatif en local) |

### 6. Se connecter

La page d’accueil publique (`/`) présente KABAD ; ses boutons mènent directement à l’inscription et à la connexion.

Les comptes de départ sont ceux de l’équipe, sur de vraies adresses : leurs mots de passe ne sont **pas** dans le dépôt. Chacun se met dans `.env` (`SEED_PASSWORD_KOFFI`, `SEED_PASSWORD_AMINATA`, `SEED_PASSWORD_KWAME`, `SEED_PASSWORD_AICHA`, `SEED_PASSWORD_NADIA`, `SEED_PASSWORD_SADIO`, `SEED_PASSWORD_CHIDI`, `SEED_PASSWORD_EQUIPE`) avant `npm run db:seed`. En local, un mot de passe absent vaut `kabad-demo-2026`.

| Compte | E-mail | Pour tester |
| --- | --- | --- |
| Koffi Mensah, intermédiaire (Lomé) | `success2025lord@gmail.com` | Conversations, invitations reçues, notifications, séances avec Aminata, équipe Baobab, app « Kalo » à faire tester, projet Rise-Up « Délestages » (avec Kwame co-responsable) |
| Aminata Traoré, mentor (Bamako) | `lord2025success@gmail.com` | Créneaux et demande de séance de Sadio, mission d’instructeur à accepter, jurée |
| Kwame Asante, mentor (Accra) | `emmerson.copychief.dev@gmail.com` | A proposé « Fintech pour l’inclusion » et anime le groupe de ses instructeurs, juré (notation du « Raccourcisseur ») |
| Aïcha Diallo, mentor (Ouagadougou) | `worldwide.eliteagency229@gmail.com` | Instructrice du hackathon fintech, app « Marché Vert » et ses rapports, salon proposé dans « Carnet de santé » |
| Nadia Kouassi, senior (Abidjan) | `worldwide.eliteagencyy@gmail.com` | Badge mentor à valider, responsable du projet « Carnet de santé » (salon à valider), hackathon « Santé connectée » |
| Sadio Diop, intermédiaire (Dakar) | `asukadmt@gmail.com` | Responsable du projet « Forages en panne » (salon en direct), hackathon « Eau potable pour tous » à relire |
| Chidi Okafor, intermédiaire (Lagos) | `emmersondmt.entrepreneur@gmail.com` | App « TontineApp », chef de l’équipe Kora, projet « Prix des marchés » |
| **Équipe KABAD** | `kabadteam@gmail.com` | **Tableau de bord** `/admin` : badges mentor, hackathons à publier ou refuser, signalements, membres, journal |

Le seed marque ses notifications comme déjà envoyées : le worker n’écrit pas aux vraies boîtes pour les événements de la démo.

Ouvrez deux navigateurs (ou une fenêtre privée) avec deux comptes pour voir les messages en direct.

**E-mails** : en local, les e-mails (confirmation d’adresse, mot de passe oublié) s’affichent dans le terminal de `npm run dev`. En production, renseignez `SMTP_URL`.

### Problèmes courants

- **`P1000: Authentication failed`** : l’utilisateur ou le mot de passe de `DATABASE_URL` ne correspond pas à PostgreSQL. Refaites l’étape 2, ou adaptez `DATABASE_URL`.
- **`Seed refusé`** : les données de départ ne s’installent que sur une base locale (`127.0.0.1` ou `localhost`), ou sur le serveur avec `SEED_FORCE=1` et tous les `SEED_PASSWORD_…` renseignés. Le seed vide la base avant de la remplir.
- **Pas de messages en direct** : le terminal 1 (`npm run realtime`) doit tourner.

## Ce que fait KABAD

- **Landing page** (`/`) : la vision, la mission, les cinq espaces et une présentation animée de 40 secondes, chargée seulement au clic. `/presentation` la montre en plein écran.
- **Comptes** : inscription en 5 étapes avec e-mail à confirmer, mot de passe oublié, changement de mot de passe, déconnexion de tous les appareils, export et suppression du compte. Interface en français et en anglais (`/en`).
- **Mentorat** : le dev choisit un créneau de 30 minutes dans le calendrier d’un mentor badgé, écrit son sujet ; le mentor accepte ou refuse ; la séance confirmée donne le lien de visio. Le mentor règle ses plages, ses dates bloquées et son fuseau.
- **Badge mentor** : demande en 2 étapes (expertise, liens), examinée par l’équipe KABAD, qui valide ou refuse avec un motif.
- **Hackathons** : proposés par des organisations, publiés par l’équipe ; en ligne, en présentiel ou hybrides ; seul ou en équipe ; soumission de la solution, jury, résultats ; instructeurs recrutés parmi les mentors, en option.
- **Tests d’apps** : l’auteur publie une annonce et ouvre son groupe de testeurs dans la messagerie ; les testeurs le rejoignent en prenant une place, cochent les étapes et envoient un rapport avec captures, validé ou refusé par l’auteur.
- **Messagerie** : invitation avec un premier message facultatif ; la conversation s’ouvre une fois l’invitation acceptée. Conversations à deux et groupes en temps réel ; texte, notes vocales, images et fichiers ; signalement et blocage.
- **Africa Rise-Up** : projets classés par défi (eau, santé, agriculture…), canal de discussion, fils de réponses et événements programmés avec un lien de visio.
- **Modération** : signalements traités par l’équipe (classer, retirer un message, avertir, suspendre), journal de toutes les actions.
- **Salons vocaux** : désactivés pour la CADEV (voir plus bas).

## Sécurité

- **Sessions** : cookie `httpOnly`, `SameSite=Lax` et `Secure` en production. Seule l’empreinte SHA-256 du jeton est stockée. Les mots de passe sont hachés avec bcrypt.
- **Règles côté serveur** : chaque règle est vérifiée par le serveur (`src/server/*.ts`), jamais seulement par l’écran. Les règles sensibles aux accès simultanés (dernier créneau, dernière place de test) s’appuient sur des transactions et des verrous PostgreSQL.
- **Requêtes et limites** : contrôle de l’origine des requêtes, limites de débit stockées dans PostgreSQL (communes à toutes les instances), et IP lue derrière le proxy de confiance (`TRUSTED_PROXY_HOPS`).
- **En-têtes** : politique de sécurité du contenu (CSP) et HSTS en HTTPS.
- **Envois de fichiers** : taille bornée à la lecture, type reconnu au contenu, fichiers servis aux seuls membres de la conversation, avec `nosniff`.
- **Temps réel** : jeton de 10 minutes. La connexion est fermée à son expiration, à la déconnexion et en cas de suspension.
- **Administrateurs** : il n’y a pas d’administrateur par défaut en production. On en nomme un sur le serveur : `npm run admin:promote -- adresse@exemple.org`.

## Vérifications

| Commande | Rôle |
| --- | --- |
| `npm run lint` | ESLint : règles Next.js et accessibilité |
| `npm run typecheck` | Types des routes et TypeScript strict |
| `npm test` | Tests unitaires des règles métier |
| `npm run test:integration` | Règles et failles corrigées, sur une vraie base PostgreSQL (`DATABASE_URL_TEST`, vidée par les tests) |
| `npm run test:e2e` | Playwright : chaque écran sur téléphone et ordinateur, les parcours, la messagerie en temps réel. `CHROMIUM_PATH` permet de reprendre un navigateur déjà installé. |
| `npm run messages` | Vérifie que les dictionnaires français et anglais ont les mêmes clés |
| `npm run licenses` | Échoue si une dépendance est sous GPL, AGPL ou LGPL |

La CI GitHub Actions (`.github/workflows/ci.yml`) lance tout cela avec PostgreSQL, à chaque push sur `main` et `dev/**`, et à chaque pull request.

## Vidéo de présentation

La présentation animée de la landing page est écrite en code (`src/components/features/landing/Presentation.tsx`) : quelques kilo-octets, nette sur tous les écrans, traduite. Pour l’avoir en fichier vidéo (réseaux sociaux, pitch, vote du public), l’application lancée :

```bash
npm run presentation:video
```

Le script filme `/presentation` et `/en/presentation` et écrit `dist/presentation-kabad-fr.webm` et `-en.webm` (1280 × 720). Avec `-- --vertical`, il produit le format téléphone (720 × 1280). Il utilise le navigateur de Playwright, déjà là pour les tests e2e.

## Mise en production

`compose.yaml` décrit la pile : PostgreSQL, les migrations, l’application, le service temps réel et le worker des tâches planifiées.

- **Images** : la CI construit `kabad-web`, `kabad-realtime`, `kabad-worker` et `kabad-migrate` et les publie sur GitHub Packages (`ghcr.io/200665467716/kabad-*`), seulement après le succès de toutes les vérifications et seulement pour `main`. Chaque image porte deux étiquettes : `main` et le SHA du commit. Le serveur ne compile jamais (1 vCPU) : `docker compose pull && docker compose up -d`. Pour revenir à une version précédente : `KABAD_TAG=<sha>` dans le `.env` du serveur.
- **Adresse du temps réel** : elle est fixée à la construction de l’image, et se règle dans la variable de dépôt `NEXT_PUBLIC_REALTIME_URL` (Settings > Secrets and variables > Actions > Variables). Par défaut : `https://rt.kabad.app`.
- **Accès aux images** : GitHub Packages les crée privées. Soit on les rend publiques (Package settings > Change visibility : le code est déjà sur GitHub), soit le serveur se connecte une fois avec `docker login ghcr.io`, à l’aide d’un jeton GitHub limité à `read:packages`.
- **Construire en local** : `docker compose -f compose.yaml -f compose.local.yaml up -d --build`.

- Les secrets (`POSTGRES_PASSWORD`, `REALTIME_SECRET`, `SMTP_URL`) vont dans un `.env` **sur le serveur**, jamais dans le dépôt.
- Les ports 3000 et 4001 n’écoutent que sur la machine : un reverse proxy HTTPS (Caddy ou Nginx) est placé devant.

### Salons vocaux

Ils sont désactivés pour la CADEV : le serveur Systalink n’a qu’un processeur, et le pare-feu n’ouvre que les ports 22, 80 et 443. En V1, les événements Rise-Up passent par un lien Google Meet ou Jitsi. Le code reste en place derrière un interrupteur (`src/lib/features.ts`). Pour les réactiver :

1. Construire l’image web avec `NEXT_PUBLIC_SALONS=on` et `NEXT_PUBLIC_LIVEKIT_URL` (adresse `wss://` publique).
2. Renseigner `LIVEKIT_API_KEY` et `LIVEKIT_API_SECRET` dans le `.env` du serveur.
3. Démarrer avec `docker compose --profile salons up -d` : LiveKit a besoin du port TCP 7881 et des ports UDP 50000 à 60000.

En local : `NEXT_PUBLIC_SALONS="on"` dans `.env`, puis `livekit-server --dev` (version 1.13.10, https://github.com/livekit/livekit/releases).

## Pile technique

- **Next.js 16** (App Router, Cache Components), **React 19**, **TypeScript**, **Tailwind CSS 4**, application installable (PWA).
- **Données** : PostgreSQL et Prisma 7.
- **Temps réel** : Socket.IO, alimenté par `pg_notify`.
- **Tâches planifiées** : pg-boss, dans un service `worker` à part (jamais pendant une requête web).
- **Langues** : next-intl, français par défaut et anglais sous `/en`.
- **Design** : charte « Motif » (indigo, maïs, encre, sable). Polices **Unbounded** (titres) et **Manrope** (texte), livrées dans le dépôt.
- **Audio des salons** (désactivé) : LiveKit, serveur auto-hébergé et client `livekit-client`.

## Organisation

```
src/
  app/[locale]/
    page.tsx       Landing page publique
    presentation/  Présentation animée en plein écran
    (auth)/        Inscription en 5 étapes, connexion, e-mail à confirmer, mot de passe oublié
    (app)/         Application connectée : accueil, mentorat, hackathons, Rise-Up, tests,
                   messages, membres, notifications, profil, compte, admin (et salons, désactivés)
    conditions/    Conditions d’utilisation
  app/api/         Routes de l’API : elles valident l’entrée (Zod) puis appellent src/server
  components/      Design system (ui), cadre (shell), blocs métier (features)
  server/          Côté serveur uniquement : règles de chaque module, tâches planifiées, sécurité, e-mails
  lib/             Règles partagées et pures, formats, schémas de validation, client temps réel
  i18n/            Langues et chargement des dictionnaires
  proxy.ts         Langue de la page et envoi vers la connexion des visiteurs sans session
messages/          Dictionnaires : un fichier par module, en français (fr/) et en anglais (en/)
prisma/            Schéma, migrations, données de démonstration
realtime/          Service temps réel
worker/            Service des tâches planifiées
scripts/           Nommer un administrateur, filmer la présentation
tests/integration/ Tests sur PostgreSQL
e2e/               Tests d’écrans et de parcours Playwright
docs/              Point projet (référence), feuille de route, état des lieux
```

## Licences

Le concours CADEV interdit les licences GPL, AGPL et LGPL. `npm run licenses` le vérifie à chaque CI.

### Livré avec l’application

| Licence | Composants |
| --- | --- |
| MIT | Next.js, React, Tailwind CSS, Socket.IO, next-intl, pg-boss, jose, bcryptjs, Zod, pg et la grande majorité des dépendances |
| Apache-2.0 | Prisma (client et adaptateur PostgreSQL), `livekit-client` |
| Apache-2.0 et BSD-3-Clause | `@bufbuild/protobuf` (utilisé par `livekit-client`) |
| MIT-0 | `nodemailer` (e-mails) |
| ISC, BSD-2-Clause, BSD-3-Clause, 0BSD, Unlicense | Petites dépendances |
| CC-BY-4.0 | `caniuse-lite` : données de compatibilité des navigateurs utilisées par Next.js (une licence de données, pas de code) |
| OFL-1.1 | Polices Manrope et Unbounded, livrées dans `src/app/fonts` avec leur licence |

### Services séparés, non intégrés au code

| Licence | Composants |
| --- | --- |
| Apache-2.0 | Serveur **LiveKit** (`livekit/livekit-server`), lancé à côté de l’application |
| PostgreSQL License | **PostgreSQL** |

### Outils de développement, jamais livrés

| Licence | Composants |
| --- | --- |
| Apache-2.0 | Playwright (tests e2e et enregistrement de la vidéo de présentation) |
| MPL-2.0 (copyleft faible, fichier par fichier) | `lightningcss` (compilation du CSS de Tailwind), `axe-core` (règles d’accessibilité d’ESLint) |
| EPL-2.0 (copyleft faible) | `elkjs`, utilisé par Prisma Studio, l’outil de consultation de la base |
| Python-2.0 | `argparse` (dépendance d’ESLint) |
| CC-BY-3.0 | `spdx-exceptions`, `spdx-ranges` (données de licences du vérificateur) |

Nous signalons les licences à copyleft faible (MPL-2.0, EPL-2.0) aux organisateurs, bien qu’elles ne concernent que des outils de construction.

### Remplacé pour respecter la règle

`sharp` (optimisation d’images de Next.js) dépend de libvips, sous LGPL. Il est remplacé par un module vide (`tools/no-sharp`) et l’optimisation d’images est désactivée.
