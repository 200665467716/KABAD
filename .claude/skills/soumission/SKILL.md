---
name: soumission
description: Prépare et contrôle le dossier de soumission CADEV de KABAD — démo en ligne sur Datacloud, déclaration des composants et licences, déclaration de l'usage de l'IA, comptes de démonstration, pitch. À lancer dans la dernière semaine avant le 15 novembre 2026.
---

# Dossier de soumission CADEV

Le règlement est dans la mémoire du projet (`cadev-competition`) ; le résumer si besoin. Vérifier puis produire, dans `docs/soumission/` :

1. **Recevabilité** : chaque point est vérifié réellement, pas supposé.
   - La démo répond en HTTPS sur kabad.app, hébergée sur un produit Datacloud acheté par l'équipe (code promo de 40 %).
   - `npm run licenses` passe.
   - Le projet a été créé pendant le concours : le premier commit date du 17 octobre 2026, ce qui est postérieur au 29 septembre.
2. **`composants-et-licences.md`** : la liste des dépendances de production avec leur licence, générée depuis `npm run licenses` ou `license-checker-rseidelsohn --production`, plus les services séparés (PostgreSQL, LiveKit, Caddy) et les polices.
3. **`usage-ia.md`** : les outils utilisés (Claude Code, Claude Opus) et les parties concernées. La liste vient de `git log --format='%h %ad %s' --date=short` en filtrant les commits co-signés par Claude, regroupés par module. Ajouter un paragraphe sur la manière dont l'équipe a relu et maîtrise le code.
4. **`demo.md`** : l'URL, les comptes de démonstration (sans mot de passe réel de production) et un parcours de 3 minutes qui montre les quatre formes d'échange du thème : savoir-faire (mentorat), richesse (hackathon et ses prix), services (tests), communication (messagerie et salons).
5. **`pitch.md`** : en 10 lignes, comment KABAD répond au thème « la plateforme d'échange africaine, pour les devs, par les devs ».

Terminer par une checklist de ce que l'équipe doit faire elle-même sur la plateforme Systalink :
- l'inscription de l'équipe et la clé de répartition du prix ;
- la déclaration de titularité de chaque membre ;
- la soumission avant le 15 novembre à 17h GMT ;
- le **vote des pairs obligatoire pour chaque membre**, du 15 novembre à 18h au 16 novembre à 23h59.
