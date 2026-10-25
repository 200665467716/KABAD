---
name: verifier
description: Lance toute la chaîne de vérification de KABAD (lint, types, tests unitaires, intégration, licences, build) comme la CI, et résume ce qui échoue.
---

# Vérification complète

Reproduire la CI (`.github/workflows/ci.yml`) en local, dans cet ordre, en s'arrêtant pour diagnostiquer au premier échec :

1. `npm run licenses` : aucune licence GPL, AGPL ou LGPL (règle éliminatoire de la CADEV).
2. `npm run lint`
3. `npm run typecheck`
4. `npm test`
5. `npm run test:integration` : il faut PostgreSQL et `DATABASE_URL_TEST`. Si la base ne répond pas, proposer `docker start kabad-pg`, ou la commande `docker run` de `CLAUDE.md`.
6. `npm run build`
7. Si l'argument `e2e` est passé : `npm run test:e2e`, ce qui suppose `npm run realtime` et LiveKit lancés.

Les sorties longues passent par les outils context-mode, pour ne remonter que les erreurs.

Rendre un tableau : étape | OK / échec | cause en une ligne. Pour chaque échec, indiquer le fichier:ligne et la correction proposée. Ne corriger que si l'utilisateur le demande.
