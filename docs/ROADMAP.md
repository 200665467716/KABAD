# Feuille de route KABAD → soumission CADEV

Échéance : 15 novembre 2026, 17h00 GMT. Le point de départ est le 25 octobre (voir `docs/etat-des-lieux.md`).

Chaque tâche se fait avec `/suivant <ID>`, et `/etat` donne l'avancement. Une tâche cochée a passé lint, typecheck et tests, et est commitée.

**Référence produit : `docs/point-projet.md`** (point de mise à jour du 5 novembre 2026). Quand il contredit le cahier des charges, une ancienne note ou le code, c'est lui qui fait foi. Les tâches P1 écrites avant la refonte sont à relire à sa lumière (voir l'encadré en tête du P1).

Ordre de priorité, guidé par la grille du jury :

- P0 conditionne la recevabilité et une démo stable.
- P1 couvre les exigences « Must » du cahier encore manquantes, et Africa Rise-Up.
- P2 couvre les « Should », à faire si le temps le permet.

Repères : F0 à F5 désignent les fonctionnalités du produit (ci-dessous). F1.1, F2.10, etc. désignent les exigences du cahier des charges (PDF du 15 octobre 2026).

## Périmètre produit (fixé le 27 octobre 2026)

KABAD est une plateforme d'échange catalyseur de croissance, de montée en compétences et d'impact pour l'Afrique à l'international, par les développeurs et pour les développeurs.

| # | Fonctionnalité | Contenu | Tâches |
| --- | --- | --- | --- |
| F0 | Authentification | Création de compte, profils, administrateur qui valide les Seniors vérifiés | R7, R10 |
| F1 | Mentorat | Séances de 30 min réservées sur les créneaux des mentors badgés (D9) | R12 à R14, R41, R42 |
| F2 | Hackathons | Seul ou en équipe, avec ou sans récompense, en 3 niveaux (D6, D8) | R11, R15 à R17, R40 |
| F3 | Tests communautaires | Faire tester ses applications par d'autres développeurs | R18 à R20 |
| F4 | Messagerie | Invitations, message de connexion, groupes de conversation | R21 à R23, R43 |
| F5 | Africa Rise-Up | Projets communautaires, avec un canal de discussion et des salons de réflexion par projet | R24 à R26 |

Les tâches transverses (mise en ligne, worker, langue, PWA, tests) servent toutes les fonctionnalités.

Africa Rise-Up (« l'Afrique se relève ») réunit les développeurs d'Afrique et de la diaspora pour construire de vraies solutions, valorisées à l'international, à des problèmes concrets de l'Afrique.

Pas d'événements simples dans KABAD. Un événement n'a de valeur que s'il lance un projet communautaire où les développeurs d'Afrique sont mis à contribution. De simples événements nous rendraient remplaçables par WhatsApp, Telegram ou Google Meet. Les salons vocaux génériques restent donc coupés (R9), et les salons de réflexion n'existent qu'à l'intérieur d'un projet (R26).

F5 et les niveaux 2 et 3 de F2 ne figurent pas dans le cahier des charges : le mettre à jour (S3).

## Décisions de l'équipe

- [x] D1. Interface anglaise partielle (26 octobre).
  - next-intl avec des dictionnaires `fr` et `en`.
  - On traduit d'abord les pages publiques, l'inscription et le parcours de démo, puis le reste si le temps le permet (R30).

- [x] D2. Paiement : XedoPay en sandbox (26 octobre).
  - Mobile money et carte, checkout hébergé, webhooks signés (R40).
  - Skill `xedopay-integration`.

- [x] D3. Salons vocaux retirés pour la CADEV (26 octobre).
  - On masque la fonction et on retire LiveKit de `compose.yaml`, de la CI et des e2e (R9).
  - Le code reste en place, derrière un interrupteur. D7 dira s'il revient dans Africa Rise-Up.

- [x] D4. Écarts du code : alignement sur le cahier (26 octobre).
  - Demande de mentorat : relance à 48 h, réaffectation à 72 h (R5).
  - Délai après un refus d'invitation : 30 j (R23).
  - Capacité du mentor : 1 à 3 (R12).
  - Défis créés par un senior et validés par un modérateur (R15).
  - Le partage d'une récompense sans mentor relève désormais du niveau 2 de D6.

- [x] D5. Serveur de 4 Go de RAM (26 octobre).
  - Systalink Dakar 1, acheté avec le code promo de -40 %.
  - C'est le produit Datacloud de la condition de recevabilité.

- [x] D6. Défis en 3 niveaux (27 octobre). Le mentor reçoit 30 % au plus, KABAD 10 % au plus.
  - Niveau 1 : défi sans récompense en argent, évalué par un jury. À valider en premier ; on n'étend aux niveaux 2 et 3 que si les autres fonctionnalités sont prêtes.
  - Niveau 2 : récompense par cagnotte communautaire ou sponsor, sans mentor. 90 % au gagnant, 10 % à KABAD.
  - ~~Niveau 3 : récompense avec mentor, 60/30/10.~~ Retiré le 7 novembre (D11) : hackathons et mentorat sont indépendants.
  - Aux niveaux 2 et 3, la moitié de la part de KABAD (5 % du total) est mise en réserve pour abonder de futures cagnottes.

- [x] D7. Salons de réflexion d'Africa Rise-Up : lien visio externe (31 octobre).
  - Un événement de projet porte un lien Meet ou Jitsi ; sans lien saisi, KABAD crée une salle Jitsi.
  - LiveKit reste coupé (D3) : il pèse sur le serveur de 1 vCPU et ouvre des ports UDP.

- [x] D8. Les défis deviennent des hackathons (31 octobre), selon le design de la refonte.
  - Un organisateur propose un hackathon (format, lieu, dates, taille des équipes) ; l'équipe KABAD le publie.
  - On participe seul ou en équipe ; une équipe soumet une solution. Jury, cagnotte et D6 sont gardés.
  - Les organisateurs recrutent des mentors comme instructeurs rémunérés ; KABAD l'enregistre, l'organisateur paie.

- [x] D9. Mentorat par créneaux de 30 minutes (31 octobre), selon le design de la refonte.
  - Le mentor ouvre des plages chaque semaine ; le membre réserve un créneau avec son sujet et son problème ;
    le mentor accepte ou refuse ; la séance acceptée donne un lien visio.
  - Le binôme et le journal de séances disparaissent. Le temps de mentorat exigé par un hackathon
    (niveau 3 de D6) se compte en séances tenues.
  - Le statut de mentor vient d'un badge demandé par le membre et validé par l'équipe KABAD.

- [x] D10. Point de mise à jour du projet (5 novembre), dans `docs/point-projet.md`.
  - Il fait foi sur le cahier des charges et les anciennes notes.
  - Capsules retirées du produit : elles venaient des premières idées.
  - Authentification par e-mail et mot de passe uniquement (mot de passe de 8 caractères dont un chiffre) ; pas de GitHub ni de Google en V1 (R48).
  - Visio par Google Meet en V1 ; une landing page publique présente KABAD.
  - Questions encore ouvertes : partie 8 du point projet (visio à long terme, salon vocal Rise-Up, rémunération des instructeurs, jury des hackathons, organisations autorisées, durée des séances).

- [x] D11. Hackathons et mentorat indépendants (7 novembre).
  - Plus aucun temps de mentorat exigé pour participer à un hackathon ; le niveau 3 de D6 disparaît, une cagnotte se partage 90/10.
  - Les hackathons restent relus et publiés par l'équipe KABAD.
  - Migration `hackathons_sans_mentorat` : la colonne `mentoringMinutes` disparaît ; les anciens versements « MENTOR » restent dans l'historique.

- [x] D12. Retrait des cagnottes (9 novembre, fait le 11 novembre).
  - KABAD ne garde ni ne verse d'argent : plus de cagnotte, de contribution, de partage 90/10 ni de versement Mobile Money. D2 (XedoPay) et les niveaux d'argent de D6 n'ont plus d'objet.
  - Un hackathon annonce de 0 à 5 prix en texte libre. Ils sont donnés dans l'ordre du classement, et chaque équipe primée est notifiée du prix qu'elle a gagné. L'organisateur les remet lui-même.
  - Retirés : page publique `/soutenir`, écran `/admin/versements`, tâche `payout-announce`, numéro Mobile Money de la soumission. Migration `retrait_cagnottes`.

## P0 — Recevable, en ligne, stable (objectif : 2 novembre)

- [ ] R9. Désactivation des salons vocaux (D3), par interrupteur et sans suppression de code.
  - `NEXT_PUBLIC_SALONS` (éteint par défaut) est lu dans `src/lib/features.ts`.
  - Quand il est éteint, `/salons` et l'API `/api/rooms` répondent 404 (`src/proxy.ts`), et les salons disparaissent de la navigation, de l'accueil et du tableau de bord.
  - LiveKit est sorti de la CSP, de la CI et des e2e. Le service `livekit` de compose passe sous le profil `salons`.
  - Les tables restent en base. Un test e2e vérifie que les salons n'apparaissent nulle part.
  - Commité sur `dev/Emmerson` le 26 octobre : à cocher après une CI verte.

- [ ] R1. Image construite par la CI.
  - Un workflow GitHub Actions construit les images `web`, `realtime` et `migrate`, et les pousse sur GHCR.
  - En production, `compose.yaml` utilise `image:` et plus `build:`. `compose.local.yaml` sert à construire en local.
  - Commité sur `dev/Emmerson` le 26 octobre (job `images` de `ci.yml`, étiquettes `main` et SHA) : à cocher après une CI verte.
  - Reste à faire : rendre les paquets GHCR publics, ou créer un jeton `read:packages` pour le serveur.

- [ ] R2. Caddy et déploiement.
  - Un service Caddy et un `Caddyfile` pour kabad.app et le temps réel en wss.
  - Un workflow de déploiement par SSH lance `docker compose pull && up -d`.
  - Un healthcheck sur `web`.
  - Le pare-feu n'ouvre que les ports 22, 80 et 443.

- [ ] R3. Sauvegardes.
  - `pg_dump` chaque nuit, copie hors du serveur, conservation 7 jours.
  - Un script de restauration, testé.

- [ ] R4. Observabilité minimale.
  - Journaux structurés et `instrumentation.ts` (`onRequestError`).
  - Route `/api/health`.
  - Supervision externe avec alerte en moins de 5 min.

- [x] R5. Worker de tâches planifiées : pg-boss (MIT) et un service `worker` dans compose (1er novembre).
  - `src/server/jobs.ts` : expiration des demandes de séance non traitées, relance du mentor à 48 h, rappel 1 h avant une séance et avant un événement Rise-Up, passage des hackathons au jury, annonce des versements après 48 h, expiration des invitations à 30 j. Chaque tâche est idempotente et testée.
  - `worker/index.ts`, regroupé par esbuild dans l'image `kabad-worker` ; expirations « à la lecture » retirées (les écritures vérifient toujours les dates).
  - La réaffectation à 72 h n'a plus d'objet avec les créneaux (D9).

- [ ] R6. Pages publiques indexables.
  - Fait le 5 novembre : landing page `/` (vision, mission, cinq espaces, présentation animée), statique, avec titre, description et OpenGraph, en FR et en EN.
  - Reste : hackathons et résultats lisibles sans session, avec les liens du dépôt et de la démo des lauréats (F2.10) ; `robots.ts` et `sitemap.ts`.

- [ ] R7. Points de réputation, socle commun.
  - Un modèle `ReputationEvent`.
  - Des gains pour : jalon de mentorat validé, revue rendue, test validé, défi créé, juré, victoire.
  - Le total affiché sur le profil, et un test pour chaque source.

- [ ] R8. Démo en ligne.
  - Déployer sur kabad.app avec des données de démonstration propres.
  - Vérifier le parcours de chaque fonctionnalité sur un vrai téléphone Android en 4G.

## Refonte « Motif » (31 octobre)

- [x] Design system de la charte « Motif » (tokens, polices, composants) et coque (en-tête indigo, bandeau, barre du bas Accueil · Mentorat · Hackathons · Rise-Up · Messages).
- [x] Écrans du canvas « KABAD — Refonte » : inscription en 5 étapes, accueil, mentorat par créneaux, badge mentor, hackathons, Africa Rise-Up, tests d'apps, messagerie, profil et notifications, administration.
- [x] Tests : unitaires, intégration (10 nouveaux), e2e réécrits (99 passent, téléphone et ordinateur).
- [x] Rappels et expirations par le worker (R5) ; pièces jointes et notes vocales (R43).

## Mise à jour du 5 novembre (branche `dev/modifications`)

- [x] Invitations : le premier message devient facultatif (étape 5/5 de l'inscription et fiche d'un membre). Une invitation envoyée apparaît dans la messagerie de l'expéditeur, avec son message et le badge « En attente », jusqu'à la réponse.
- [x] Groupes de testeurs : ouverts par l'auteur à la publication, toujours visibles dans la messagerie. Une migration donne un groupe aux apps publiées avant la refonte ; on entre et on sort du groupe par le test (ou le projet Rise-Up), plus par la messagerie. Inscription au test sous verrou : la dernière place ne se prend qu'une fois.
- [x] Capsules retirées : écrans, API, schéma (migration `retrait_capsules`), navigation, dictionnaires, données de démo.
- [x] Landing page `/` et présentation animée de 40 s (chargée au clic, `/presentation` en plein écran, `npm run presentation:video` pour le fichier vidéo). L'écran A1 passe à `/bienvenue`.
- [x] `docs/point-projet.md`, README et feuille de route à jour.
- Tests : 32 unitaires, 45 d'intégration, 107 e2e.

## Maquettes du 7 novembre (branche `dev/modifications`)

Le canevas « KABAD — Refonte » a évolué : nouvelle landing page, écrans d'erreur (A2e, A3e, A7e, H5e), squelettes et états vides (P3, P4), profil du mentor (M2), groupe de testeurs (T4), corrections de l'audit. Les écarts écran par écran, les lots de travail et les questions à trancher sont dans **`docs/ecarts-maquettes.md`**. La note de chaque fonctionnalité et le plan de test manuel sont dans **`docs/etat-et-plan-de-test.md`** (9 novembre).

- [x] Landing page L1 (7 novembre).
- [x] Lot 1, socle et règles : mot de passe, code e-mail à 10 min, focus, erreurs, désactivé, feuilles de confirmation, consentement, squelettes, notifications, A2e, A3e, A7e.
- [ ] Lots 2 à 4 : écrans absents (M2, T4, discussion d'équipe, photo de groupe), parcours à reprendre, textes.

## Mise à jour du 11 novembre (branche `dev/modifications`)

Décisions du jour (Emmerson) : Google Meet pour le mentorat seulement ; genre sur le profil ; notifications par e-mail ; Africa Rise-Up reste fait de canaux de discussion, avec une fiche du projet dans chaque canal et, à préciser, des salons de discussion. Tests d'apps, hackathons et évaluation des séances : pas de changement pour le moment.

- [x] Mentorat : la visio passe par Google Meet. Le mentor colle son lien Meet dans ses disponibilités ; sans lien, il ne peut ni ouvrir de créneaux ni accepter une séance. La salle Jitsi créée par défaut disparaît du mentorat. Écran M7 : « Lien Google Meet », « Rejoindre sur Google Meet », « Copier le lien ».
- [x] Notifications par e-mail : le worker envoie chaque minute les notifications importantes (demande de séance, réponse, rappel 1 h avant, invitation, mission, résultat de hackathon…) aux membres dont l'e-mail est confirmé. Réglage dans « Mon compte ». Tâche `notification-mail`, sans doublon si elle tourne deux fois. En production : `SMTP_URL` et `MAIL_FROM` dans le `.env` du serveur (voir `.env.example`).
- [x] Profil : genre facultatif (accords « Vérifiée » / « Vérifié » sur la fiche d'un mentor) et fuseau horaire au choix ; les heures de l'accueil et des événements suivent le fuseau du membre.
- [x] Mentorat : historique « Toutes mes séances » (`/mentorat/seances`) en trois onglets, à venir, passées, annulées.
- [x] Rise-Up : onglet « Fiche » dans le canal d'un projet (défi, porteur, date de lancement, équipe, problème, compétences recherchées).
- [x] Rise-Up : salons à lancer depuis un canal. Un salon est un lien Google Meet ouvert tout de suite aux membres, prévenus aussitôt ; un seul à la fois par projet ; son auteur ou l'initiateur le ferme. Un événement exige aussi un lien Meet ; le repli Jitsi est retiré. Bandeau du salon, zone d'écriture fixée en bas, rappel relié à « Notification et rappel 1 h avant ».
- [x] Landing : corrections du document du 11 novembre (liste des fonctionnalités qui disparaissait au clic, hero, « Pourquoi rejoindre KABAD » en mentorat, Rise-Up, tests d'apps, étapes, FAQ, adresse de contact).
- [x] Hackathons : retrait des cagnottes (D12), prix en texte libre donnés selon le classement.
- [x] Messagerie : non-lus des pièces jointes, blocage dans un groupe commun, gros groupes (notifications par lots), vidéo MP4 refusée comme note vocale, invitations simultanées ; photo et renommage des groupes ; maquettes MS1, MS3, MS5, A6.
- [x] Mentorat : fiche du mentor M2 séparée du calendrier, informations du badge sur le profil public, créneaux pris barrés (M3), « Demandes reçues » dans l'en-tête (M1), badge en puces (B1) ; réservation à 30 jours, pas deux séances à la même heure, retrait de badge qui prévient les devs, plages sans chevauchement.
- [x] Logo de la CADEV dans le bandeau de la landing, à côté de « Une initiative issue de la Coupe d'Afrique des développeurs » (`public/partenaires/cadev.svg`).
- [ ] Encore ouverts côté maquettes (hors tests d'apps et hackathons, mis de côté) : accueil B2, profil P1 et écran « Paramètres », plages en pastilles (M8), états vides et écran hors connexion, code e-mail en 6 cases.
- [x] Repris du travail local du 9 novembre (branche `sauvegarde/travail-local-9-nov`) : limiteur de débit indépendant du fuseau de PostgreSQL (il ne bloquait jamais sur une base réglée hors UTC), tests d'intégration lançables sous Windows, publication des résultats refusée proprement quand aucune solution n'a de note.
- [x] `npm run db:migrate` régénère le client Prisma après la migration (Prisma 7 ne le fait plus seul) : plus d'erreur « Unknown argument » au seed après un changement de schéma.
- Tests : 41 unitaires, 68 d'intégration, 111 e2e.

## P1 — Les « Must » manquants et Africa Rise-Up (objectif : 11 novembre)

> **À réaligner sur `docs/point-projet.md`** avant de les prendre : R11 à R17 décrivent encore les défis (devenus hackathons, D8), R12 à R14 le binôme de mentorat (devenu des créneaux, D9), R24 à R26 l'ancien Africa'Raise-up. Une partie est déjà couverte par la refonte. Relire chaque tâche avec l'équipe, puis la réécrire ou la retirer.

### Socle

- [x] R48. Authentification alignée sur le point projet (D10).
  - Fait le 7 novembre : mot de passe de 8 caractères dont au moins un chiffre (inscription, réinitialisation, changement) ; code e-mail valable 10 minutes.
  - Fait le 6 novembre : connexion GitHub retirée (routes `/api/auth/github`, bouton, variables `GITHUB_CLIENT_*`). Les colonnes `githubId` et `githubLogin` restent en base, pour ne rien perdre et la remettre en V2.

### Profil et socle (F0)

- [ ] R10. Profil complet.
  - Photo, servie en WebP côté client.
  - Pays d'origine et pays de résidence, avec leurs drapeaux (F4.3).
  - Langues, fuseau horaire.
  - Liens GitHub et LinkedIn séparés.
  - Règle des 5 ans d'expérience pour devenir Senior vérifié.

### Mentorat (F1)

- [ ] R12. Appariement (F1.1, F1.2).
  - Proposer 3 mentors classés par stack, écart de niveau, langue, fuseau et capacité restante (1 à 3).
  - Un mentor complet est exclu.
  - Un test unitaire du classement.

- [ ] R13. Fiche mentorat (F1.4).
  - Objectif, projet support, étapes avec leur statut, échéance.
  - Le démarrage est impossible sans objectif ni projet.

- [ ] R14. Clôture (F1.8).
  - Le mentor valide l'objectif.
  - Les deux se notent sur 5 avec un commentaire.
  - Le junior reçoit un badge, et le mentor des points (R7).

### Défis (F2)

R11, R15 et R16 forment le niveau 1 de D6, à finir en priorité.

- [ ] R11. Recherche de défis, par thème, niveau et texte.

- [ ] R15. Cycle de vie (F2.1, F2.2).
  - Un senior vérifié crée le défi : brouillon, à valider, publié, annulé.
  - Énoncé en Markdown avec un rendu sûr, critères pondérés, compétence évaluée, niveau de récompense (1, 2 ou 3).
  - Un modérateur valide avant publication.

- [ ] R16. Gel et notation (F2.4, F2.5).
  - Figer le SHA du dernier commit avant l'échéance (API GitHub).
  - Calculer une moyenne pondérée selon la grille du défi.

- [ ] R17. Répartition, contestation et éligibilité (D6, F2.8, F2.11).
  - Répartition 90/10 (D11), avec 5 % du total mis en réserve KABAD. Testée, sans perte d'un franc à l'arrondi.
  - Contestation possible pendant 48 h, arbitrée par un modérateur.

### Tests communautaires (F3)

- [ ] R18. Rejoindre une campagne.
  - Réservation de place, dans la limite des places.
  - Transaction anti-course.

- [ ] R19. Rapport conforme.
  - Au moins 2 captures par mission.
  - Bugs structurés : gravité, étapes de reproduction, capture.
  - Note sur 5 et suggestions.
  - Motif de refus visible par le testeur.

- [ ] R20. Anti-abus et compteurs.
  - Empreinte SHA-256 des captures, avec signalement des réutilisations.
  - Compteurs « tests réalisés » et « tests reçus » sur le profil.
  - Points de réputation (R7).

### Messagerie (F4)

- [ ] R21. Accusé de lecture côté expéditeur (F4.2).
  - Mesurer la latence de livraison : moins de 1 s.

- [ ] R22. Groupes (F4.5, F4.8).
  - Renommer, supprimer, mettre une photo.
  - Un membre bloqué ne peut plus écrire à celui qui l'a bloqué, même dans un groupe commun.

- [ ] R23. Règles d'invitation.
  - Fait : délai de 30 j après un refus (`REINVITE_AFTER_DAYS`, testé le 6 novembre) et expiration à 30 j (via R5).
  - 5 à 10 recommandations, aussi dans l'espace Conversations.

### Africa Rise-Up (F5)

- [ ] R24. Projets communautaires.
  - Un membre propose un projet : problème africain concret, objectif, compétences recherchées, lien du dépôt.
  - Un modérateur le valide avant publication.
  - Page publique et indexable du projet, avec la liste des contributeurs.
  - Les membres rejoignent le projet.

- [ ] R25. Canal de discussion du projet.
  - Une conversation de groupe rattachée au projet, qui réutilise la messagerie (temps réel, signalement, blocage).
  - Tout contributeur y entre en rejoignant le projet ; le porteur modère.

- [ ] R26. Salons de réflexion.
  - Séances planifiées dans un projet, avec un sujet et un compte rendu gardé dans le projet.
  - Pas de salon en dehors d'un projet.
  - Technique selon D7.

### Langue

- [x] R30. Interface EN partielle (D1).
  - Livré le 31 octobre avec la refonte (branche `dev/design-motif`) : next-intl, routes sous `src/app/[locale]` (FR sans préfixe, EN sous `/en`), un dictionnaire par module dans `messages/fr/` et `messages/en/` (`npm run messages` vérifie que les clés concordent), sélecteur de langue, langue mémorisée sur le compte et reprise à la connexion. Tous les écrans de la refonte sont traduits.
  - Le 1er novembre : notifications stockées avec une clé et traduites à l'affichage (`messages/*/notifications.json`), messages d'erreur de l'API traduits selon la langue de la page (`src/server/error-messages.en.json`), rapports de test, conditions d'utilisation, signalements et journal traduits.
  - E-mails du compte dans la langue du membre (`src/server/emails.ts`, langue enregistrée à l'inscription). Le français tutoie partout, sauf les conditions d'utilisation qui vouvoient. Reste : la traduction anglaise des salons vocaux (coupés, D3).

## P2 — Les « Should » (si le temps le permet)

- [ ] R40. Cagnotte en sandbox, niveaux 2 et 3 de D6 (F2.6, F2.7, F2.9).
  - XedoPay en sandbox (D2), avec un webhook signé `X-Xedopay-Signature` et idempotent : une référence de paiement n'est créditée qu'une fois.
  - Registre comptable et séquestre, avec la réserve KABAD de 5 % suivie à part.
  - Remboursement si le défi est annulé.
  - Contribution sans compte depuis `/soutenir/[id]`.

- [ ] R41. Revue de code (F1.7).
  - Soumission d'un lien, réponse en texte ou en vidéo MP4.
  - Vidéo de 5 min et 200 Mo au plus, chargée seulement sur action.

- [x] R42. ~~Capsules (F1.9)~~ : retirées du produit le 5 novembre (D10). Le code reste dans l'historique Git.

- [ ] R43. Messagerie enrichie (F4.6, F4.7).
  - Fait le 1er novembre : PDF, images et notes vocales (2 Mo, 2 minutes), reconnus à leur contenu, lisibles par les seuls membres de la conversation, retirés avec le message par la modération.
  - Images de 5 Mo au plus (aujourd'hui 2 Mo, la limite commune des fichiers gardés dans PostgreSQL).
  - Coloration syntaxique avec une bibliothèque légère sous licence MIT, chargée à la demande.

- [ ] R44. PWA hors ligne.
  - Service worker et coquille hors ligne, écran de démarrage iOS.

- [ ] R45. Signalement étendu.
  - Hackathon, solution, app, rapport, projet Africa Rise-Up.

- [ ] R46. Performance et accessibilité mesurées.
  - Lighthouse en CI (LCP, poids du JS).
  - Règles `jsx-a11y` recommandées, axe dans Playwright.
  - Écrans de 360 et 1 920 px testés.

- [ ] R47. Tests manquants.
  - Senior vérifié, demandes de mentorat, bascule vers le jury, garde des 48 h, tests communautaires, jetons e-mail, suppression de compte.

## Soumission (du 12 au 15 novembre) : `/soumission`

- [ ] S1. Gel des fonctionnalités le 12 novembre au soir. Ensuite, uniquement des corrections.

- [ ] S2. Dossier `docs/soumission/` : composants et licences, usage de l'IA, démo, pitch.

- [ ] S3. Mettre à jour le README et le cahier des charges.
  - README à jour le 5 novembre (produit après la refonte, comptes de démo, landing page, vidéo de présentation). À relire juste avant la soumission.
  - Cahier des charges : l'aligner sur `docs/point-projet.md` (hackathons au lieu des défis, mentorat par créneaux, Africa Rise-Up, capsules retirées), auth faite maison au lieu d'Auth.js, salons vocaux retirés (D3) et écarts assumés.

- [ ] S4. La veille : démo vérifiée en ligne et comptes de démonstration testés.

- [ ] S5. Sur la plateforme Systalink (à faire par l'équipe).
  - Équipe inscrite, clé de répartition du prix et déclaration de titularité.
  - Soumission avant le 15 novembre à 17h GMT.
  - Vote des pairs par chaque membre, du 15 novembre 18h au 16 novembre 23h59. Obligatoire, sinon le projet est exclu.

- [ ] S6. Campagne du vote du public (17 au 20 novembre) : messages et visuels prêts.
  - La vidéo de présentation est prête à tourner : `npm run presentation:video` (format paysage, ou `-- --vertical` pour les statuts et stories).
