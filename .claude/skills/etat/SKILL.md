---
name: etat
description: Point d'avancement de KABAD vers la soumission CADEV du 15 novembre 2026 — jours restants, tâches faites et restantes de la feuille de route, risques.
---

# Point d'avancement

1. Calculer le nombre de jours restants avant le **15 novembre 2026 à 17h00 GMT**.
2. Lire `docs/ROADMAP.md` : compter les tâches cochées et restantes par lot (P0, P1, P2).
3. `git log --oneline main..HEAD` et `git status --short` : ce qui est en cours et non fusionné.
4. Signaler les risques :
   - une tâche P0 non faite à moins de 7 jours de l'échéance ;
   - une démo pas encore en ligne sur le serveur Systalink ;
   - une étape de la checklist de soumission (section « Soumission » de la feuille de route) non cochée à moins de 3 jours.

Réponse courte :
- une ligne avec les jours restants et le pourcentage fait ;
- un tableau par lot ;
- les 3 prochaines tâches recommandées ;
- les risques.
