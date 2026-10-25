# État des lieux du code par rapport au cahier des charges

Le 25 octobre 2026, branche `dev/Emmerson` (commit `da5c169`). Légende :
- ✅ fait ;
- 🟡 partiel ou différent du cahier ;
- ❌ absent.

## Vue d'ensemble

| Zone | État | En une phrase |
| --- | --- | --- |
| Sécurité, comptes, modération | ✅ | Solide : sessions hachées, bcrypt, contrôle d'origine, limites de débit, suspension, journal d'audit, tests d'intégration. |
| Messagerie | ✅ / 🟡 | Invitations, conversations, groupes, blocage et temps réel marchent. Il manque les drapeaux, le « Lu » côté expéditeur, l'expiration des invitations, renommer ou supprimer un groupe, les images et la coloration syntaxique. |
| Mentorat | 🟡 | Binômes et journal des séances confirmé à deux : bon. Il manque l'appariement des 3 mentors, la relance et la réaffectation, le cadrage (objectif, étapes), l'évaluation mutuelle et la revue de code. |
| Défis et jury | 🟡 | Jury de 3 seniors, récusation mentor/juré, classement, partage 60/30/10. Le défi est créé par un admin, sans validation, sans Markdown ni gel du commit. La page de résultats n'est pas publique. |
| Cagnottes et paiements | ❌ | Aucun paiement en ligne (page « bientôt »), ni registre, ni remboursement, ni contestation. Les versements sont manuels. |
| Tests communautaires | 🟡 | Campagne, rapport avec captures et questions de contrôle, validation ou refus motivé. Il manque les bugs structurés, la note /5, les 2 captures par mission, la réputation et la détection des captures réutilisées. |
| Socle | 🟡 | Il manque l'interface EN, les points de réputation, la photo, les langues, les deux pays, LinkedIn séparé, la recherche de défis et la règle des 5 ans pour un senior. |
| Tâches planifiées | ❌ | Pas de worker. Les expirations sont faites « à la lecture » : 7 jours au lieu de 72 h. |
| Exploitation | ❌ | Ni image construite en CI, ni déploiement, ni Caddy, ni sauvegardes, ni suivi des erreurs. Les pages publiques ne sont pas indexables. |
| Hors cahier | ➕ | Salons vocaux LiveKit, annuaire des membres, export et suppression du compte, tableau de bord admin. |

## Détail par module

### Mentorat (§4)
- ✅ F1.6 journal des séances, avec double confirmation et garde-fous anti-fraude. ✅ Ouverture de la conversation à l'acceptation.
- 🟡 F1.1 profil mentor : pas de langues, fuseau ni disponibilités ; capacité de 0 à 5 au lieu de 1 à 3.
- 🟡 F1.2 : le junior choisit un mentor dans un annuaire, au lieu de recevoir 3 suggestions classées.
- 🟡 F1.3 : expiration à 7 j à la lecture, sans relance à 48 h ni passage au mentor suivant.
- 🟡 F1.4 : pas d'objectif, d'étapes ni d'échéance. 🟡 F1.5 : lien Jitsi fixe, sans rappel 1 h avant.
- ❌ F1.7 revue de code. ❌ F1.8 évaluation mutuelle, badge et réputation.
- 🟡 F1.9 : les capsules sont écrites librement par un senior, sans accord du mentoré ni classement automatique.

### Défis (§5, §11)
- ✅ F2.3 soumission. ✅ Juré participant bloqué. ✅ Partage 60/30/10 testé. ✅ Récompense physique (LOT).
- 🟡 F2.1 et F2.2 : défi créé par un admin, sans brouillon ni validation, sans Markdown, avec une grille fixe non pondérée.
- 🟡 F2.4 : clôture à l'échéance, mais sans SHA de commit figé. 🟡 F2.5 : moyenne simple. 🟡 F2.10 : résultats réservés aux membres connectés, sans liens vers les projets.
- 🟡 F2.11 : les 6 h de mentorat sont comptées tous thèmes confondus. Le mentor payé est celui qui a le plus de minutes. Sans mentor, les 30 % vont au gagnant.
- ❌ F2.6 paiement, ❌ F2.7 registre, ❌ F2.8 versement automatique et contestation, ❌ F2.9 remboursement, ❌ attestation de mentorat hors KABAD, ❌ défis en équipe.

### Tests communautaires (§6)
- ✅ Création gratuite. ✅ Questions de contrôle, corrigées automatiquement. ✅ Pas de test de sa propre app. ✅ Refus motivé.
- 🟡 1 capture par étape au lieu d'au moins 2 par mission. 🟡 Pas d'étape « rejoindre » : la place n'est prise qu'à l'envoi du rapport. 🟡 Le motif du refus n'apparaît que dans la notification.
- ❌ Rapport de bugs structuré, note /5 et suggestions. ❌ Réputation. ❌ Compteur « tests reçus ». ❌ Détection des captures réutilisées.

### Messagerie (§7)
- ✅ F4.2, F4.3, F4.6 (temps réel), F4.8 (invitations), F4.9. ✅ Règles : 1 invitation en attente, 20 par jour, refus non signalé.
- 🟡 F4.1 : 6 recommandations au plus, uniquement à l'inscription. 🟡 Délai après un refus : 90 j au lieu de 30. 🟡 Un membre bloqué peut encore écrire dans un groupe commun.
- ❌ F4.7 drapeaux. ❌ « Lu » côté expéditeur. ❌ Expiration des invitations à 30 j. ❌ Renommer, supprimer ou mettre une photo sur un groupe. ❌ F4.10 images de 5 Mo et coloration syntaxique.

### Socle et exigences non fonctionnelles (§8, §9, §10)
- Auth faite maison (pas Auth.js), propre. Le cahier et le README sont à aligner.
- ❌ Interface EN. ❌ Réputation. ❌ Photo de profil. ❌ Langues. ❌ Recherche de défis. 🟡 Signalement impossible sur une capsule, un défi ou une app.
- ❌ Coquille PWA hors ligne (pas de service worker). ❌ Pages publiques indexables (`src/proxy.ts`), robots et sitemap.
- ❌ Suivi des erreurs et alertes. ❌ Healthcheck sur `web`. Aucune mesure de LCP ni du poids du JS.
- 🟡 Images non converties en WebP (`sharp` retiré à cause de sa licence LGPL). Les captures sont stockées en base (bytea).
- ⚠️ LiveKit publie 10 001 ports UDP via Docker : démarrage lent sur 1 vCPU, et contradiction avec la règle de pare-feu 22/80/443.
- ⚠️ `compose.yaml` construit l'image sur le serveur, ce que le §10 interdit.
- Licences : `npm run licenses` couvre les dépendances transitives. Les paquets `UNKNOWN` passent sans alerte.

## Règles métier sans test
Senior vérifié, demandes de mentorat (expiration, capacité), bascule OPEN → JURY, garde des 48 h avant versement, tests communautaires (quota, validation), capsules, jetons e-mail et réinitialisation, export et suppression du compte.
