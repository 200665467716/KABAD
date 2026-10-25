# Feuille de route KABAD → soumission CADEV

**Échéance : 15 novembre 2026, 17h00 GMT.** Le point de départ est le 25 octobre (voir `docs/etat-des-lieux.md`).
Chaque tâche se fait avec `/suivant <ID>` ; `/etat` donne l'avancement.

Ordre de priorité, guidé par la grille du jury :
- **P0** conditionne la recevabilité et une démo stable ;
- **P1** couvre les exigences « Must » du cahier encore manquantes ;
- **P2** couvre les « Should », à faire si le temps le permet.

Une tâche cochée a passé lint, typecheck et tests, et est commitée.

## Décisions à prendre par l'équipe (avant le 28 octobre)

- [ ] **D1. Interface anglaise.** Le cahier promet FR + EN, or toutes les chaînes sont en dur en français. Le retrofit coûte environ 2 à 3 jours. Proposition : le faire en P1 (R30) avec next-intl, sur les pages publiques et le parcours de démo d'abord.
- [ ] **D2. Agrégateur de paiement en sandbox** : FeexPay ou XedoPay (des skills d'intégration existent pour les deux). Sans choix, R40 reste bloquée et la cagnotte reste en « bientôt ».
- [ ] **D3. Salons vocaux LiveKit.** Ils sont hors cahier, gourmands sur 1 vCPU, et ouvrent 10 001 ports UDP. Proposition : les garder (c'est un plus pour l'innovation), mais avec une plage UDP réduite et un drapeau pour les couper.
- [ ] **D4. Écarts volontaires du code.** Le code impose 7 j d'expiration au lieu de 72 h, 90 j de délai après un refus au lieu de 30, une capacité de 0 à 5 au lieu de 1 à 3, des défis créés par un admin, et laisse les 30 % au gagnant s'il n'a pas de mentor. Proposition : s'aligner sur le cahier, sauf sur le dernier point, à trancher.
- [ ] **D5. Serveur.** Prendre 4 Go de RAM (2 Go sont trop justes avec LiveKit) et acheter le produit Datacloud avec le code de -40 %.

## P0 — Recevable, en ligne, stable (objectif : 2 novembre)

- [ ] **R1. Image construite par la CI.** Un workflow GitHub Actions construit les images `web`, `realtime` et `migrate`, et les pousse sur GHCR. `compose.yaml` utilise `image:` et n'utilise plus `build:` en production.
- [ ] **R2. Caddy et déploiement.** Ajouter un service Caddy et un `Caddyfile` pour kabad.app, le temps réel en wss et LiveKit. Un workflow de déploiement par SSH lance `docker compose pull && up -d`. Ajouter un healthcheck sur `web` et réduire la plage UDP de LiveKit (D3).
- [ ] **R3. Sauvegardes.** `pg_dump` chaque nuit, copie hors du serveur, conservation 7 jours. Un script de restauration doit être testé.
- [ ] **R4. Observabilité minimale.**
  - Journaux structurés et `instrumentation.ts` (`onRequestError`).
  - Route `/api/health`.
  - Supervision externe avec alerte en moins de 5 min.
- [ ] **R5. Worker de tâches planifiées.** Ajouter pg-boss (MIT) et un service `worker` dans compose.
  - Mentorat : relance à 48 h et réaffectation à 72 h.
  - Séances : rappel 1 h avant.
  - Invitations : expiration à 30 j.
  - Défis : bascule OPEN → JURY.
  - Versements : mise à disposition 48 h après les résultats.

  Retirer les expirations faites « à la lecture ».
- [ ] **R6. Pages publiques indexables.**
  - Défis et résultats lisibles sans session, avec liens dépôt et démo des lauréats (F2.10).
  - `generateMetadata`, OpenGraph, `robots.ts` et `sitemap.ts`.
  - Page d'accueil qui reprend le thème : « la plateforme d'échange africaine, pour les devs, par les devs ».
- [ ] **R7. Points de réputation, socle commun.** Créer un modèle `ReputationEvent` et des gains pour : jalon de mentorat validé, revue rendue, test validé, défi créé, juré, victoire. Afficher le total sur le profil. Tester chaque source.
- [ ] **R8. Démo en ligne.** Déployer sur kabad.app avec des données de démonstration propres. Vérifier le parcours des 4 échanges sur un vrai téléphone Android en 4G.

## P1 — Les « Must » manquants (objectif : 11 novembre)

### Profil et socle
- [ ] **R10. Profil complet.**
  - Photo, servie en WebP côté client.
  - Pays d'origine et pays de résidence, avec leurs drapeaux (F4.7).
  - Langues, fuseau horaire.
  - Liens GitHub et LinkedIn séparés.
  - Règle des 5 ans d'expérience pour devenir Senior vérifié.
- [ ] **R11. Recherche de défis.** Par thème, niveau et texte.

### Mentorat
- [ ] **R12. Appariement (F1.1, F1.2).** Proposer 3 mentors classés par stack, écart de niveau, langue, fuseau et capacité restante (1 à 3). Un mentor complet est exclu. Écrire un test unitaire du classement.
- [ ] **R13. Fiche mentorat (F1.4).** Objectif, projet support, étapes avec statut, échéance. Le démarrage est impossible sans objectif ni projet.
- [ ] **R14. Clôture (F1.8).** Le mentor valide l'objectif, les deux se notent sur 5 avec un commentaire, le junior reçoit un badge et le mentor des points (R7).

### Défis
- [ ] **R15. Cycle de vie (F2.1, F2.2).** Un senior vérifié crée le défi : brouillon, à valider, publié, annulé. Énoncé en Markdown (avec un rendu sûr), critères pondérés, compétence évaluée. Un modérateur valide.
- [ ] **R16. Gel et notation (F2.4, F2.5).** Figer le SHA du dernier commit avant l'échéance (API GitHub), calculer une moyenne pondérée selon la grille du défi.
- [ ] **R17. Contestation et éligibilité (F2.8, F2.11, §11).** Contestation possible pendant 48 h, arbitrée par un modérateur. Les heures de mentorat sont filtrées par thème. Ajouter l'attestation de mentorat hors KABAD. Les 30 % vont au mentor attestant.

### Tests communautaires
- [ ] **R18. Rejoindre une campagne.** Réservation de place, places limitées, transaction anti-course.
- [ ] **R19. Rapport conforme.**
  - Au moins 2 captures par mission.
  - Bugs structurés : gravité, étapes de reproduction, capture.
  - Note sur 5 et suggestions.
  - Motif de refus visible par le testeur.
- [ ] **R20. Anti-abus et compteurs.** Empreinte SHA-256 des captures, avec signalement des réutilisations. Compteurs « tests réalisés » et « tests reçus » sur le profil. Points de réputation (R7).

### Messagerie
- [ ] **R21. Accusé de lecture côté expéditeur (F4.6).** Mesurer la latence de livraison (moins de 1 s).
- [ ] **R22. Groupes (F4.4, F4.5).** Renommer, supprimer, photo. Un membre bloqué ne peut plus écrire à celui qui l'a bloqué, même dans un groupe commun.
- [ ] **R23. Règles d'invitation.** Délai de 30 j après un refus, expiration à 30 j (via R5). 5 à 10 recommandations, aussi dans l'espace Conversations (F4.1).

### Langue
- [ ] **R30. Interface EN (si D1 = oui).** next-intl, avec dictionnaires `fr` et `en`, et un sélecteur de langue. Traduire d'abord les pages publiques, l'inscription et le parcours de démo.

## P2 — Les « Should » (si le temps le permet)

- [ ] **R40. Cagnotte en sandbox (F2.6, F2.7, F2.9).**
  - Agrégateur choisi en D2, avec webhook signé et idempotent.
  - Registre comptable et séquestre.
  - Remboursement si le défi est annulé.
  - Contribution sans compte depuis `/soutenir/[id]`.
- [ ] **R41. Revue de code (F1.7).** Soumission d'un lien, réponse en texte ou en vidéo MP4 (5 min et 200 Mo maximum, chargée seulement sur action).
- [ ] **R42. Capsules (F1.9).** Accord explicite du mentoré, anonymisation, classement par thème et niveau via l'API Claude.
- [ ] **R43. Messagerie enrichie (F4.10).** Images de 5 Mo maximum, coloration syntaxique avec une bibliothèque légère sous licence MIT, chargée à la demande.
- [ ] **R44. PWA hors ligne.** Service worker et coquille hors ligne, écran de démarrage iOS.
- [ ] **R45. Signalement étendu.** Capsule, défi, solution, app, rapport.
- [ ] **R46. Performance et accessibilité mesurées.** Lighthouse en CI (LCP, poids du JS), règles `jsx-a11y` recommandées, axe dans Playwright, 360 et 1 920 px testés.
- [ ] **R47. Tests manquants.** Senior vérifié, demandes de mentorat, bascule vers le jury, garde des 48 h, tests communautaires, jetons e-mail, suppression de compte.

## Soumission (du 12 au 15 novembre) : `/soumission`

- [ ] **S1. Gel des fonctionnalités le 12 novembre au soir.** Ensuite, uniquement des corrections.
- [ ] **S2.** `docs/soumission/` : composants et licences, usage de l'IA, démo, pitch.
- [ ] **S3.** Mettre à jour le README et le cahier : auth faite maison au lieu d'Auth.js, salons vocaux, écarts assumés.
- [ ] **S4.** Démo vérifiée en ligne et comptes de démonstration testés, la veille.
- [ ] **S5. Sur la plateforme Systalink** (à faire par l'équipe) :
  - équipe inscrite, clé de répartition du prix et déclaration de titularité ;
  - soumission **avant le 15 novembre à 17h GMT** ;
  - **vote des pairs par chaque membre**, du 15 novembre 18h au 16 novembre 23h59 (obligatoire, sinon le projet est exclu).
- [ ] **S6. Campagne du vote du public** (17 au 20 novembre) : messages et visuels prêts.
