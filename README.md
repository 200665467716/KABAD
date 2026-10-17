# KABAD

La communauté des développeurs d’Afrique et de la diaspora : mentorat sur projet concret, défis de code, tests communautaires et messagerie.
Projet de l’équipe KABAD pour la Coupe d’Afrique des Développeurs (CADEV) de Systalink.

> **État actuel : interfaces.** Les 32 écrans du design sont codés et fonctionnent avec des données d’exemple (`src/lib/data.ts`).
> La base de données, les comptes, le temps réel et le paiement viennent à l’étape suivante.

## Démarrer

```bash
npm ci
npm run dev          # http://localhost:3000
```

Compte de démonstration sur `/connexion` : `kossi.mensah@exemple.tg` / `kabad-demo-2026`.
Quelques actions (confirmer une séance, accepter une invitation) sont gardées dans le navigateur pour que les écrans restent cohérents entre eux.

## Vérifications

| Commande | Rôle |
| --- | --- |
| `npm run lint` | ESLint (règles Next.js et accessibilité) |
| `npm run typecheck` | Types des routes et TypeScript strict |
| `npm test` | Tests unitaires Vitest des règles métier (partage 60/30/10, éligibilité au mentorat, jury, invitations) |
| `npm run test:e2e` | Playwright, sur téléphone et sur ordinateur : chaque écran sans défilement horizontal ni erreur, et les parcours principaux |
| `npm run licenses` | Échoue si une dépendance est sous GPL, AGPL ou LGPL |

La CI GitHub Actions (`.github/workflows/ci.yml`) lance tout cela à chaque push et pull request.

## Pile technique

- **Next.js 16** (App Router, Cache Components), **React 19**, **TypeScript**, **Tailwind CSS 4**. Toutes sous licence MIT.
- **Polices** servies par `next/font` : Ojuju (titres), Fira Sans (texte), Overpass Mono (code), Danfo (grands moments). Toutes sous OFL et complètes pour les langues d’Afrique de l’Ouest et centrale (ɛ ɔ ŋ ɓ ɗ ƙ ẹ ọ ṣ ɖ ƒ ɣ ʋ).
- **PWA** : `src/app/manifest.ts` et icônes dans `public/icons/`.
- **Déploiement** : `Dockerfile` (sortie `standalone`) pour le serveur cloud Systalink. L’image se construit dans la CI, jamais sur le serveur.

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
  components/
    ui/                      Design system : boutons, champs, badges, avatars, alertes, partage 60/30/10…
    shell/                   Barre de titre, navigation, cadre d’inscription
    features/                Invitation, signalement, fil de messages, progression du mentorat…
  lib/                       Règles métier testées, formats, données d’exemple
```

## Design system

Les couleurs, l’échelle de texte et les rayons sont des variables CSS dans `src/app/globals.css`, exposées à Tailwind.
Tout est calé sur une grille de 4 px : chaque interligne est un multiple de 4. Le thème sombre suit le réglage du téléphone.

## Licences

- `sharp` (optimisation d’images de Next.js) dépend de libvips, sous LGPL. Il est remplacé par un module vide (`tools/no-sharp`) et l’optimisation d’images est désactivée.
- Deux outils de construction sont sous MPL-2.0, une licence à copyleft faible : `lightningcss` (Tailwind) et `axe-core` (règles d’accessibilité d’ESLint). Ils ne sont pas livrés avec l’application, mais nous le signalons aux organisateurs.
