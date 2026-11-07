# Écarts entre les maquettes et le code (7 novembre 2026)

Comparaison des 62 écrans du canevas « KABAD — Refonte » (version du 7 novembre, avec la landing L1 et les corrections de l'audit) au code de `dev/modifications`. Chaque ligne cochée est faite et commitée. Les textes des maquettes sont définitifs : on les reprend mot pour mot.

## Fait

- [x] **L1 Landing page** : refaite d'après la maquette (7 novembre).

## Lot 1 — Socle et règles (transverse)

- [x] **Mot de passe** : 8 caractères minimum dont au moins un chiffre (A2, A9 avec ses 3 règles, changement de mot de passe). Le code demande 12 caractères.
- [x] **Code e-mail valable 10 minutes** (A3, A3e) au lieu de 48 h ; erreur posée sur le champ : « Ce code est incorrect ou a expiré. Un code reste valable 10 minutes. »
- [x] **Focus visible** : 3 px indigo décalé de 2 px ; maïs sur fond indigo ou encre (en-têtes, bouton principal, barre du bas).
- [x] **Erreurs de formulaire** : bordure argile renforcée, message 13/18 gras avec icône ; bandeau `.kb-alert` (fond blanc, bordure argile, icône).
- [x] **Désactivé** : texte ardoise en graisse 400 au lieu d'une opacité ; placeholders en ardoise `#4B5172`.
- [x] **Feuille de confirmation** (dialog, focus piégé, Échap, deux boutons dont un rouge) pour : se déconnecter (P1), refuser une invitation (MS2), refuser une demande de séance (M6), annuler une séance (M5, aujourd'hui `window.confirm`), refuser une mission (H9).
- [x] **Consentement** : « Continuer » désactivé tant que la case des conditions n'est pas cochée (A2).
- [x] **Squelettes** (P3) à la place des « Chargement… » sur 43 écrans ; composant **état vide** (P4), posé sur la liste des tests.
- [ ] État vide sur les autres listes et écran **hors connexion** (« Réessayer »).
- [x] **Notifications** (P2) : non-lues signalées par un fond, une pastille et le mot « Non lue » ; couleur par fonctionnalité ; plus de maïs hors Rise-Up ; filtre retiré.
- [ ] « Tout marquer comme lu » en bouton d'en-tête (aujourd'hui dans la page).
- [x] **A7e** : bandeau en deux phrases et, sous le mot de passe, « Mot de passe incorrect. Il reste N essais avant un blocage de 15 min. »
- [x] **A2e** : « Un compte existe déjà avec cet e-mail. » avec un lien « Se connecter ».

## Lot 2 — Écrans absents

- [ ] **M2 Profil du mentor**, séparé du calendrier (M3) : poste, ville, « Vérifiée par KABAD », domaines et technos, « Sur quoi … peut t'aider », « Son travail » (liens du badge), 3 prochains créneaux, « Réserver une séance ».
- [ ] **T4 Groupe de testeurs** : écran dédié (consignes épinglées à cocher, « Installer l'app », « auteur de l'app », « Joindre une capture », « Écrire un retour… »).
- [ ] **Espace de discussion de l'équipe** de hackathon (H4) : lier l'équipe à une conversation de groupe.
- [ ] **Photo de groupe** (MS4, MS1, MS5) : champ en base, envoi d'image, affichage.

## Lot 3 — Parcours à reprendre

- [ ] **Organiser un hackathon en 3 étapes** (H6 infos, H7 défi et prix avec « Pas de prix », H8 instructeurs puis « Publier le hackathon »).
- [ ] **M3** : créneaux déjà réservés visibles et barrés, fuseau en nom de ville (« Heure de Lomé »), résumé « Jeu. 5 nov. · 15 h 00 – 15 h 30 ».
- [ ] **M6** : « Accepter » mène à la séance confirmée ; état « Demande refusée · X est prévenu ».
- [ ] **M7** : « Lien Google Meet », « Rejoindre sur Google Meet », « Copier le lien ».
- [ ] **B1** : technos en puces comme à l'inscription (pré-remplies depuis le profil), domaines bloqués à 3.
- [ ] **H5/H5e** : vérifier que le dépôt est public ; « Ce lien ne mène à aucun dépôt public… » ; `https://` ajouté tout seul.
- [ ] **H3** : inviter des coéquipiers, « Demander » sur chaque équipe.
- [ ] **Accueil (B2)** : logo et avatar à droite dans l'en-tête, carte séance qui chevauche l'en-tête, « Tests d'apps » en carte.
- [ ] **P1 Profil** : carte d'identité en vedette, icônes colorées par fonctionnalité, « Devenir mentor » en carte pointillée, bouton « Paramètres », niveau toujours affiché.
- [ ] **R2, R5** : bandeau du salon (encre, bouton maïs), zone d'écriture fixée en bas ; format Google Meet ; interrupteur « Notification et rappel 1 h avant » relié au rappel.

## Lot 4 — Textes et détails

Reprise mot pour mot des textes (messagerie : « Écrire un message… », « message vocal » ; tests : « 2 tâches sur 3 faites » ; hackathons : « 2 à 5 devs », « Équipe {nom} », « Proposer / Proposée » ; croix « Annuler » sur les formulaires), drapeaux de pays sur les avatars, ombre vedette unique par écran, cibles de 44 px sur les liens et le contrôle segmenté.

## Questions à trancher par l'équipe

1. **Visio** : la maquette dit Google Meet. Aujourd'hui, si le mentor n'a pas de lien, KABAD crée une salle Jitsi (D7). Garder ce repli, ou exiger un lien Meet du mentor ?
2. ~~Publication des hackathons~~ : **tranché le 7 novembre**, l'équipe KABAD relit et publie. Le bouton de H8 dira « Proposer le hackathon ».
3. ~~Mentorat exigé pour un hackathon~~ : **tranché le 7 novembre**, plus aucune exigence ; partage 90/10 (fait).
4. **Champs en plus** de T3 (présentation, objectif, questions de contrôle), H6 (clôture, niveau, technos), R3 (le projet en une phrase) : les garder ?
5. **Technologies** : 12 dans le point projet, 15 dans la maquette A5 (avec PostgreSQL, Docker, AWS).
6. **Salon Rise-Up** : « Rejoindre le salon » ou « Rejoindre la visio » en V1 ?
7. **Genre** : M2 écrit « Vérifiée », « Sur quoi elle peut t'aider ». Formulation neutre, ou genre sur le profil ?
