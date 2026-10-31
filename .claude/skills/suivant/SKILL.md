---
name: suivant
description: Prend la prochaine tâche de docs/ROADMAP.md (ou celle passée en argument), l'implémente, la vérifie et met la feuille de route à jour. À utiliser pour avancer KABAD vers la soumission CADEV.
---

# Avancer d'une tâche

Argument facultatif : l'identifiant d'une tâche de `docs/ROADMAP.md` (par exemple `R3`). Sans argument, prendre la première tâche non cochée du lot le plus prioritaire.

1. **Choisir** : lire `docs/ROADMAP.md`, annoncer en une ligne la tâche retenue et pourquoi elle passe en premier.
2. **Comprendre** :
   - relire l'exigence dans `../KABAD — Cahier des charges.md` (les ID F1.x, F2.x, F4.x et les critères d'acceptation) ;
   - lire le code existant du module (`src/server/<module>.ts`, routes `src/app/api/...`, écrans `src/app/(app)/...`, `prisma/schema.prisma`) ;
   - avant toute API Next.js, lire le guide correspondant dans `node_modules/next/dist/docs/`.
3. **Créer une branche** : `git switch -c dev/<sujet-court>` depuis `main`, si l'on n'est pas déjà sur une branche dédiée.
4. **Implémenter** en suivant `CLAUDE.md` :
   - les règles vont dans `src/server` et sont validées par Zod ;
   - toute nouvelle dépendance a une licence permissive ;
   - les changements de schéma passent par une migration ;
   - les textes d'interface sont en français.
5. **Tester** : ajouter ou adapter les tests qui prouvent les critères d'acceptation de l'exigence.
6. **Vérifier** : `npm run lint && npm run typecheck && npm test`. Si le serveur ou le schéma a changé, lancer aussi `npm run test:integration`, et `npm run licenses` si `package.json` a changé. Corriger jusqu'à ce que tout passe ; ne jamais désactiver un test pour passer.
7. **Mettre à jour** `docs/ROADMAP.md` : cocher la tâche, noter en une ligne ce qui a été fait et ce qui reste éventuellement.
8. **Committer** avec un message en français qui explique le pourquoi, terminé par la ligne `Co-Authored-By` de Claude. Ne pas pousser sans demande explicite.
9. **Rendre compte** en quelques lignes :
   - ce qui marche maintenant, et comment le voir dans l'app (compte de démo, écran) ;
   - les tests ajoutés ;
   - la prochaine tâche suggérée.
