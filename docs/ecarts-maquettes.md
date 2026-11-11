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

- [x] **M2 Profil du mentor**, séparé du calendrier (M3) : poste, ville, « Vérifiée par KABAD », domaines et technos, « Sur quoi … peut t'aider », « Son travail » (liens du badge), 3 prochains créneaux, « Réserver une séance » (11 novembre). Les informations du badge s'affichent aussi sur le profil public.
- [x] **T4 Groupe de testeurs** (11 novembre) : écran dédié (consignes épinglées à cocher, « Installer l'app », « auteur de l'app », « Joindre une capture », « Écrire un retour… »).
- [x] **Espace de discussion de l'équipe** de hackathon (H4) : l'équipe est liée à une conversation de groupe (11 novembre).
- [x] **Photo de groupe** (MS4, MS1, MS5) : envoi d'image recadrée dans le navigateur, affichage dans la liste, l'en-tête et les infos du groupe ; renommage du groupe par son responsable (11 novembre).

## Lot 3 — Parcours à reprendre

- [x] **Organiser un hackathon en 3 étapes** (11 novembre) (H6 infos, H7 défi et prix avec « Pas de prix », H8 instructeurs puis « Publier le hackathon »).
- [x] **M3** : créneaux déjà réservés visibles et barrés, fuseau en nom de ville (« Heure de Lomé »), résumé « Jeu. 5 nov. · 15 h 00 – 15 h 30 » (11 novembre).
- [x] **M6** : « Accepter » mène à la séance confirmée ; état « Demande refusée · X est prévenu ».
- [x] **M7** : « Lien Google Meet », « Rejoindre sur Google Meet », « Copier le lien » (11 novembre).
- [x] **B1** : technos en puces comme à l'inscription (pré-remplies depuis le profil), domaines bloqués à 3 (11 novembre).
- [x] **H5/H5e** (11 novembre) : vérifier que le dépôt est public ; « Ce lien ne mène à aucun dépôt public… » ; `https://` ajouté tout seul.
- [x] **H3** : inviter des coéquipiers, « Demander » sur chaque équipe (11 novembre).
- [ ] **Accueil (B2)** : logo et avatar à droite dans l'en-tête, carte séance qui chevauche l'en-tête, « Tests d'apps » en carte.
- [ ] **P1 Profil** : carte d'identité en vedette, icônes colorées par fonctionnalité, « Devenir mentor » en carte pointillée, bouton « Paramètres », niveau toujours affiché.
- [x] **R2, R5** : bandeau du salon (encre, bouton maïs), zone d'écriture fixée en bas ; lien Google Meet obligatoire ; « Notification et rappel 1 h avant » relié au rappel ; « Lancer un salon » (11 novembre).

## Lot 4 — Textes et détails

Fait le 11 novembre pour la messagerie : « Écrire un message… », « Écrire au groupe… », « message vocal », bandeau des invitations en pointillés, recherche dans les conversations, bouton flottant « Nouveau groupe », thème sous le nom du groupe, « Invité » (A6) ; M1 : « Demandes reçues » dans l'en-tête. Faits le 11 novembre au soir : code e-mail en 6 cases et icônes A3, A8, œil unique en A9, plages en pastilles (M8), formulaire T3, « 2 tâches sur 3 faites », « Équipe {nom} », « Proposer / Proposée », ombre vedette du projet en direct (R1), textes de R3, photo de profil des membres. Reste : « 2 à 5 devs » ; croix « Annuler » sur les formulaires, drapeaux de pays sur les avatars, ombre vedette unique par écran, cibles de 44 px sur les liens et le contrôle segmenté.

## Questions à trancher par l'équipe

1. ~~Visio~~ : **tranché le 11 novembre**, Google Meet pour le mentorat, lien exigé du mentor (fait). Africa Rise-Up garde ses canaux de discussion ; voir la question 6.
2. ~~Publication des hackathons~~ : **tranché le 7 novembre**, l'équipe KABAD relit et publie. Le bouton de H8 dira « Proposer le hackathon ».
3. ~~Mentorat exigé pour un hackathon~~ : **tranché le 7 novembre**, plus aucune exigence ; partage 90/10 (fait).
4. **Champs en plus** de T3 (présentation, objectif, questions de contrôle), H6 (clôture, niveau, technos), R3 (le projet en une phrase) : les garder ? **Mis de côté le 11 novembre** : pas de changement sur les tests d'apps ni sur les hackathons pour le moment.
5. ~~Technologies~~ : **tranché le 11 novembre**, on garde les 12 du point projet.
6. ~~Salon Rise-Up~~ : **tranché le 11 novembre**, un salon est un lien de visio (Google Meet) lancé depuis le canal du projet (fait), en plus de la fiche du projet (faite).
7. ~~Genre~~ : **tranché le 11 novembre**, genre facultatif sur le profil (fait).
