# KABAD · Guide de tests manuels

Pour chaque fonctionnalité :
- **Fonctionnement normal** : ce qui doit se passer, pas à pas ;
- **À tester** : les cas limites et les erreurs ;
- **Ça marche si** : l'indicateur qui prouve que tout va bien.

La note et les manques de chaque fonctionnalité sont dans `docs/audit-2026-11-09.md`. Un cas marqué **(bug connu)** échoue aujourd'hui : c'est attendu, il est listé dans l'audit.

## 0. Préparer le poste

1. Lancer PostgreSQL (Docker, voir `CLAUDE.md`), puis `npm run db:migrate` et `npm run db:seed`.
2. Ouvrir trois terminaux : `npm run dev` (port 3000), `npm run realtime` (port 4001) et `npm run worker`.
3. Sans `SMTP_URL`, chaque e-mail (code, lien) s'affiche dans le terminal de `npm run dev`.
4. Pour tester à deux, utiliser **deux navigateurs** (Chrome normal + fenêtre privée, ou Firefox). Deux onglets du même navigateur partagent la même session.
5. Pour regarder la base : `docker exec -it kabad-pg psql -U kabad -d kabad -c "<SQL>"`.

**Comptes de démo** (mot de passe `kabad-demo-2026`, e-mails déjà confirmés) :

| Compte | E-mail | Rôle dans la démo |
| --- | --- | --- |
| Kossi | `kossi.mensah@exemple.tg` | Dev ; capitaine de l'équipe Baobab ; séance acceptée avec Awa ; 1er du hackathon terminé |
| Yao | `yao.agbeko@exemple.tg` | Dev ; membre de Baobab ; testeur de TontineApp ; initiateur de Forages Sahel |
| Fatou | `fatou.sow@exemple.sn` | Dev ; membre de Baobab ; demande de séance en attente chez Awa |
| Chidi | `chidi.okafor@exemple.ng` | Dev ; capitaine de Kora ; auteur de TontineApp |
| Edem | `edem.amouzou@exemple.tg` | Dev ; auteur de Marché Vert ; demande de badge en attente |
| Aïcha | `aicha.kouassi@exemple.ci` | Mentore ; jurée ; instructrice |
| Awa | `awa.diop@exemple.sn` | Mentore ; jurée ; mission d'instructeur à traiter |
| Ibrahim | `ibrahim.keita@exemple.ml` | Mentor ; juré ; instructeur |
| Moussa, Nadia | `moussa.traore@exemple.ci`, `nadia.bello@exemple.ca` | Demandes de badge en attente ; Nadia est à Toronto |
| FinLab | `contact@finlab.exemple.bj` | Organisateur du hackathon `fintech-inclusion` |
| Équipe | `equipe@kabad.app` | Administrateur |

---

## 1. Comptes

### 1.1 Inscription
**Fonctionnement normal.**
1. Sans session, ouvrir `/bienvenue`, puis « Créer mon compte ».
2. Saisir un nom, une adresse neuve et `motdepasse1`.
3. Cocher les conditions : « Continuer » s'active seulement à ce moment-là.
4. Valider : on arrive sur `/verifier-email`.

**À tester.**
- Mots de passe `abcdefgh` (sans chiffre) et `abc1` (trop court) : refusés.
- L'adresse de Kossi : message « déjà utilisée » avec un lien « Se connecter ».
- Inscription depuis `/en/inscription` : le compte est en anglais.
- Onze inscriptions en une heure depuis le même poste : refus « trop d'essais ».

**Ça marche si** le terminal affiche l'e-mail « 123456 : ton code de confirmation KABAD », et si en base le nouveau `User` a `emailVerifiedAt` vide et la bonne `locale`.

### 1.2 Confirmation de l'e-mail
**Fonctionnement normal.** Recopier le code du terminal sur `/verifier-email` : on passe à `/inscription/profil`. Autre voie : ouvrir le lien de l'e-mail puis cliquer « Confirmer ».

**À tester.**
- Un code faux affiche une erreur. Après cinq codes faux : « Trop d'essais. Demande un nouveau code. »
- Un code de plus de 10 minutes est refusé. Renvoyer quatre fois en une heure est refusé.
- « Changer d'adresse » vers une adresse déjà prise est refusé.
- Rouvrir un lien déjà utilisé affiche « Ce lien a déjà servi ».
- Taper `/inscription/profil` sans avoir confirmé : la page s'ouvre **(bug connu)**.

**Ça marche si** `emailVerifiedAt` est rempli, si le bandeau jaune disparaît, et si le compteur « non vérifiés » de `/admin` baisse.

### 1.3 Profil, intérêts et devs à rencontrer
**Fonctionnement normal.**
1. Sur `/inscription/profil`, choisir Sénégal, Dakar et Intermédiaire.
2. Sur `/inscription/interets`, choisir React, Python et « un mentor ».
3. Sur `/inscription/recommandations`, jusqu'à six devs sont proposés, avec la raison du choix.
4. « Inviter » un dev : le bouton passe à « Envoyée ».

**À tester.**
- Une ville vide est refusée. « Autre pays » fait du membre un membre de la diaspora.
- Le retour arrière garde les choix.
- Avec un compte non confirmé, « Inviter » est refusé.
- Sur `/en`, la raison du choix reste en français **(bug connu)**.

**Ça marche si** `/profil` affiche le niveau et les technologies, et si l'invitation apparaît « En attente » dans `/messages/invitations` de l'expéditeur, onglet « Envoyées ».

### 1.4 Connexion
**Fonctionnement normal.**
- Se connecter avec Kossi sur `/connexion` : on arrive sur `/accueil`.
- Ouvrir `/messages` sans session : on est envoyé vers `/connexion?suite=/messages`, et la connexion ramène sur `/messages`.

**À tester.**
- Un mauvais mot de passe affiche le nombre d'essais restants. Au sixième échec : « Réessaie dans N min ».
- `?suite=//evil.com` mène à `/accueil`.
- Un compte suspendu par l'admin est refusé.
- Sur `/en/connexion`, l'erreur est en anglais.

**Ça marche si** le cookie `kabad_session` est posé et si une ligne `Session` existe en base.

### 1.5 Mot de passe oublié
**Fonctionnement normal.**
1. Sur `/connexion`, cliquer « Mot de passe oublié », puis saisir l'adresse de Yao.
2. Ouvrir le lien affiché dans le terminal.
3. Saisir deux fois `nouveau2026` : on arrive sur `/accueil`, connecté.

**À tester.**
- Une adresse inconnue donne le même écran qu'une adresse connue.
- Quatre demandes pour la même adresse sont refusées.
- Un lien déjà utilisé ou de plus d'une heure est refusé. Deux saisies différentes sont refusées.
- Une session de Yao ouverte dans l'autre navigateur doit être déconnectée.

**Ça marche si** l'ancien mot de passe est refusé, le nouveau accepté, et s'il ne reste qu'une session pour Yao.

### 1.6 Paramètres du compte (`/compte`)
**Fonctionnement normal.** Avec Yao :
- changer le mot de passe ;
- exporter ses données (fichier `kabad-mes-donnees.json`) ;
- passer l'interface en anglais.

**À tester.**
- Un mot de passe actuel faux est refusé.
- « Se déconnecter partout » coupe l'autre navigateur.
- La suppression du compte exige le mot de passe et le mot `SUPPRIMER`.
- Supprimer le compte `equipe` est refusé : « dernier administrateur ».

**Ça marche si**, après la suppression, le compte n'existe plus et ses messages restent chez les autres, sans auteur.

---

## 2. Profil

### 2.1 Mon profil et édition
**Fonctionnement normal.**
1. Avec Kossi, ouvrir `/profil`, puis « Modifier ».
2. Changer l'accroche, ajouter « Go », puis enregistrer : retour sur `/profil` avec « Go ».
3. Ouvrir `/profil/awa` : badge mentor et statistiques.

**À tester.**
- Un lien `gitlab.com/x` affiche une erreur sous le champ.
- Une bio trop longue doit afficher une erreur ; aujourd'hui, aucune erreur ne s'affiche sur un champ **(bug connu)**.
- Le drapeau « Signaler », avec « Bloquer » coché, marque le membre comme bloqué.
- `/profil/inconnu` affiche une page introuvable.

**Ça marche si** les champs changent en base, et si le blocage crée une ligne `Block` et supprime le contact.

---

## 3. Pages publiques

### 3.1 Landing
**Fonctionnement normal.** Sans session, ouvrir `/` :
- parcourir le menu, changer d'onglet de fonctionnalité, mettre la bande défilante en pause ;
- passer en anglais (`/en`) ;
- cliquer « Rejoindre » : on arrive sur `/inscription`.

**À tester.**
- À 360 px de large, aucun défilement horizontal.
- Navigation complète au clavier.
- Connecté, `/` redirige vers `/accueil`.
- Les liens « Contact » et « Confidentialité » sont morts **(bug connu)**.

**Ça marche si** la page s'affiche sans erreur dans la console, et si Lighthouse mobile donne un LCP inférieur à 2,5 s.

### 3.2 Bienvenue, présentation, conditions
- `/bienvenue` : « Créer mon compte » mène à `/inscription`, et « Se connecter » à `/connexion`.
- `/presentation` : l'animation d'environ 40 s tourne jusqu'au bout.
- `/conditions` : la clause « Les hackathons et leurs prix » dit que l'organisateur fixe et remet ses prix. **Ça marche si** le texte ne parle plus nulle part de cagnotte, de 90 % ou de Mobile Money.

---

## 4. Socle

### 4.1 Accueil
**Fonctionnement normal.** Avec Kossi, `/accueil` affiche :
- « Bonjour Kossi » ;
- la séance de jeudi avec Awa et le bouton « Rejoindre » ;
- un projet Rise-Up ;
- les hackathons avec leur compte à rebours.

**À tester.** Avec Awa, la demande de Fatou apparaît dans « À traiter ». Avec Nadia (Toronto), l'heure affichée est celle de Lomé **(bug connu)**.

**Ça marche si** chaque carte ouvre le bon écran et si la cloche montre le nombre de notifications non lues.

### 4.2 Notifications
**Fonctionnement normal.**
- Avec Kossi, `/notifications` montre les notifications groupées.
- Un clic ouvre l'écran concerné et marque la notification comme lue.
- « Tout marquer comme lu » vide le compteur.

**À tester (temps réel).** Navigateur A : Kossi sur `/notifications`. Navigateur B : Awa annule la séance de Kossi. La notification apparaît chez Kossi sans recharger.

**Ça marche si** le compteur de non-lus vaut 0 en base après « Tout marquer comme lu ».

### 4.3 Tâches planifiées
**Fonctionnement normal.** `npm run worker` affiche « 5 tâches planifiées ». Une ligne `[worker] <tâche> : N` apparaît chaque fois qu'une tâche traite quelque chose.

**À tester** (worker lancé, SQL en base) :
- Relance du mentor : `UPDATE "MentoringBooking" SET "createdAt"=now()-interval '49 hours' WHERE status='PENDING';`. Dans les 15 min, Awa reçoit une relance, une seule fois.
- Rappel de séance : `UPDATE "MentoringBooking" SET "startsAt"=now()+interval '40 minutes', "remindedAt"=NULL WHERE status='ACCEPTED' AND "menteeId"='kossi';`. Dans les 5 min, Kossi et Awa reçoivent « dans environ 40 min ».
- Fin d'un hackathon : mettre `endsAt` dans le passé sur `fintech-inclusion`. Il passe « au jury » et ses participants sont prévenus.
- Arrêter le worker (Ctrl+C) : il s'arrête proprement.

**Ça marche si** chaque cible ne reçoit qu'une notification, même après plusieurs passages, et si `nudgedAt` et `remindedAt` sont remplis.

### 4.4 Langues
**Fonctionnement normal.** Avec Kossi, passer en anglais, puis aller sur Mentorat, Messages et Profil : le préfixe `/en` reste. Se déconnecter, puis se reconnecter : l'interface revient en anglais.

**Ça marche si** `User.locale` vaut `en`, si `<html lang="en">` est posé, et si `npm run messages` affiche « Dictionnaires FR et EN alignés ».

### 4.5 PWA
**Fonctionnement normal.** Dans Chrome Android, menu « Installer l'application » : l'icône KABAD s'installe et ouvre `/accueil`.

**Ça marche si** DevTools, onglet Application, section Manifest, n'affiche aucun avertissement. Hors ligne, rien n'est prévu pour l'instant.

---

## 5. Mentorat

### 5.1 Demander le badge mentor
**Fonctionnement normal.**
1. Avec Yao, ouvrir `/mentorat/badge`.
2. Étape 1 : choisir 1 à 3 domaines, des technologies, l'expérience et le poste.
3. Étape 2 : un lien https, une présentation de 30 à 280 caractères et les sujets.
4. Envoyer : l'écran « en examen » s'affiche.

**À tester.**
- Sans aucun lien : refusé. Un lien GitHub qui pointe vers un autre site : refusé. Une adresse en `http://` : refusée.
- Une présentation trop courte : refusée.
- « Modifier » met à jour la même demande.
- Après un refus, « Réessayer » ouvre le formulaire déjà rempli.

**Ça marche si** une ligne `MentorBadgeRequest` est en attente et si le compte `equipe` reçoit une notification.

### 5.2 Valider ou refuser un badge (admin)
**Fonctionnement normal.**
1. Avec Équipe, ouvrir `/admin/badges`, puis la demande de Moussa.
2. Cliquer « Valider le badge ».
3. Avec Moussa, `/mentorat/badge` affiche « Tu es mentor KABAD ».

**À tester.**
- Refuser Nadia sans motif : bouton désactivé. Avec un motif : Nadia voit ce motif.
- Valider deux fois depuis deux onglets : « déjà traitée ».
- Retirer le badge d'Awa depuis `/admin/membres` : la séance de Kossi est annulée, mais Kossi n'est pas prévenu **(bug connu)**.

**Ça marche si** Moussa apparaît dans l'annuaire `/mentorat`, avec le rôle SENIOR en base, et si `/admin/journal` affiche la validation.

### 5.3 Annuaire et fiche mentor
**Fonctionnement normal.**
- Avec Kossi, sur `/mentorat`, taper « flutter » : Aïcha apparaît.
- La puce « Cloud et DevOps » ne laisse qu'Ibrahim.
- `/mentorat/mentors/awa` affiche la bio, les sujets, les technologies et le calendrier.

**À tester.**
- « keita » trouve Keïta.
- Un domaine sans mentor affiche un message vide.
- Awa sur sa propre fiche : pas de calendrier.
- Un identifiant inconnu donne une page introuvable.

**Ça marche si** chaque carte affiche le prochain créneau dans le fuseau du visiteur, et si la fiche d'Awa indique « 2 séances tenues ».

### 5.4 Disponibilités du mentor
**Fonctionnement normal.**
1. Avec Aïcha, ouvrir `/mentorat/disponibilites`.
2. Activer le mardi de 9 h à 11 h, puis ajouter une plage de 14 h à 15 h.
3. Bloquer mercredi prochain, puis enregistrer.
4. Avec Yao, sur `/mentorat/mentors/aicha`, le mardi propose 6 créneaux de 30 min et le mercredi est grisé.

**À tester.**
- Deux plages qui se chevauchent : refusées.
- Kossi, qui n'est pas mentor, voit un lien vers le badge.
- Passer le fuseau en Europe/Paris : les créneaux vus par Yao se décalent d'une heure.

**Ça marche si** les créneaux côté dev correspondent exactement aux plages découpées en 30 min.

### 5.5 Réserver, accepter, refuser
**Fonctionnement normal** (navigateur A : Yao, navigateur B : Aïcha).
1. Yao choisit un jour puis une heure sur `/mentorat/mentors/aicha`, et clique « Continuer ».
2. Il saisit le sujet, le problème (20 caractères ou plus) et un lien https, puis envoie : « Demande envoyée ».
3. Aïcha reçoit une notification. Sur `/mentorat/demandes`, elle clique « Accepter » : la séance est confirmée.
4. Yao reçoit « a accepté ta séance ».

**À tester.**
- Yao et Chidi réservent le même créneau au même moment : le second reçoit « Ce créneau vient d'être réservé ».
- Une 4e demande en attente est refusée.
- Refuser avec le motif « Pas dispo » : Yao voit ce motif sur la fiche de la séance.
- Accepter deux fois : la seconde fois est refusée.
- Nadia (Toronto) voit les créneaux d'Aïcha décalés, avec le fuseau « UTC−5 ».

**Ça marche si** le créneau disparaît du calendrier des autres devs et si le statut passe de PENDING à ACCEPTED ou DECLINED en base.

### 5.6 Lien visio, agenda, annulation
**Fonctionnement normal.**
- Kossi et Awa ouvrent `/mentorat/seances/seance-momo` : même lien, bouton « Rejoindre la visio » et « Ajouter au calendrier » (fichier `.ics`).
- Kossi clique « Annuler », puis confirme : Awa est prévenue et le créneau redevient libre.

**À tester.**
- Une séance en attente n'affiche aucun lien.
- Yao, qui ne participe pas, obtient une page introuvable.
- L'`.ics` importé dans Google Agenda tombe à la bonne heure.
- Annuler deux fois est refusé.
- Le lien est Jitsi et non Google Meet **(bug connu)**.

**Ça marche si** `meetingUrl` est rempli dès l'acceptation et identique chez les deux participants, et si une annulation donne CANCELLED avec une notification chez l'autre.

### 5.7 Rappels et expirations
**Fonctionnement normal** (worker lancé). Une séance acceptée qui commence dans l'heure déclenche un rappel chez les deux participants. Une demande sans réponse à l'heure prévue expire : le dev est prévenu.

**Ça marche si** une seule notification de chaque type existe par séance (voir 4.3).

---

## 6. Hackathons

### 6.1 Liste et détail
**Fonctionnement normal.**
1. Avec Kossi, ouvrir `/hackathons`. La carte « Équipe Baobab » est en haut.
2. Les groupes s'affichent : « Inscriptions ouvertes » (3), « Au jury » (raccourcisseur), « Terminés » (inscription accessible).
3. Ouvrir `/hackathons/fintech-inclusion`. On y lit les dates, la durée de 48 h, les équipes de 2 à 5, le défi et le règlement.
4. Les **prix** apparaissent numérotés (« 1er prix : 500 000 F CFA », « 2e prix : six mois d'incubation »), avec la mention « Prix remis par FinLab Cotonou ».

**À tester.**
- Le filtre « Présentiel » ne laisse que Santé connectée.
- Un hackathon sans prix affiche « Pas de prix pour ce hackathon ».
- Le bouton principal change selon le rôle : juré (Ibrahim), organisateur (FinLab), admin (Équipe).
- Un hackathon non publié ouvert par un tiers : page introuvable.

**Ça marche si** aucune mention de cagnotte, de 90 %, de « Soutenir » ou de Mobile Money n'apparaît, et si la page `/soutenir/agritech-sahel` est introuvable.

### 6.2 Participer
**Fonctionnement normal.**
- **Seul** : Chidi, sur `/hackathons/agritech-sahel/participer`, choisit « Seul », coche le règlement et arrive sur « Ma participation ».
- **Créer** : Kossi, sur le même hackathon, crée l'équipe « Sahel Dev ».
- **Rejoindre** : Aïcha (ou un compte neuf), sur `/hackathons/fintech-inclusion/participer`, choisit « Rejoindre une équipe » puis Kora : « Demande envoyée ». Chidi accepte depuis `/hackathons/fintech-inclusion/equipe`.

**À tester.**
- Envoyer sans cocher le règlement : refusé.
- Le nom « Équipe Baobab » est déjà pris : refusé.
- Moussa, juré de fintech, est refusé.
- Sur Santé connectée (3 personnes au moins), le mode « Seul » est absent.
- Une équipe complète est refusée ; une double inscription aussi.

**Ça marche si**, après l'acceptation, Aïcha figure parmi les membres de Kora et a reçu une notification, et si ses autres demandes sont passées à refusées.

### 6.3 Mon équipe
**Fonctionnement normal.**
- Kossi, sur `/hackathons/fintech-inclusion/equipe`, voit Baobab 3/5, le temps restant avant le rendu, et les membres avec leur rôle.
- Il modifie l'annonce de recrutement : un autre compte la lit sur la page « Participer ».

**À tester.**
- Yao, qui n'est pas capitaine, n'a pas de bouton de modification.
- Kossi quitte l'équipe : Yao devient capitaine.
- Une fois les inscriptions closes, l'équipe est figée.

**Ça marche si** `captainId` passe à Yao en base, et si une équipe quittée par son dernier membre disparaît. La discussion d'équipe n'existe pas encore **(bug connu)**.

### 6.4 Soumettre la solution
**Préparer** : `UPDATE "Hackathon" SET "startsAt" = now() - interval '1 hour' WHERE id = 'fintech-inclusion';`

**Fonctionnement normal.**
1. Kossi ouvre `/hackathons/fintech-inclusion/soumettre`.
2. Il saisit le nom du projet, le dépôt `https://github.com/kmensah/momo` et une description de 40 caractères ou plus. **Aucun champ Mobile Money n'est demandé.**
3. Il coche la case et envoie : retour sur « Mon équipe » avec « Soumis ».
4. Yao et Fatou sont prévenus.

**À tester.**
- Un dépôt Bitbucket est refusé ; une démo en http aussi.
- Chidi (Kora, seul alors que 2 membres sont exigés) ne peut pas soumettre.
- Avant le début ou après la fin, la soumission est refusée.

**Ça marche si** une seule ligne `Submission` existe pour l'équipe et si `updatedAt` change à chaque modification.

### 6.5 Organiser un hackathon
**Fonctionnement normal.**
1. FinLab ouvre `/hackathons/organiser`.
2. Étape 1 : nom, format hybride à Cotonou, début, fin, clôture, équipes de 2 à 5.
3. Étape 2 : le défi, puis **les prix** : saisir « 1er prix : 300 000 F CFA » et « 2e prix : un ordinateur ». Le texte d'aide rappelle que l'organisateur remet lui-même ses prix.
4. Ajouter un règlement https et, si besoin, une mission d'instructeur (rémunération, nombre).
5. Envoyer. Équipe reçoit une notification, puis publie depuis `/admin/hackathons`.
6. FinLab est prévenu, et le hackathon apparaît pour tous avec ses deux prix.

**À tester.**
- Une fin avant le début, une clôture après le début, une clôture passée : refusées.
- Un format présentiel sans ville : refusé.
- Un défi de moins de 30 caractères : bouton désactivé.
- Le bouton d'ajout de prix disparaît au 5e prix.
- Laisser les prix vides : le hackathon affiche « Pas de prix ».

**Ça marche si** le hackathon est créé non publié, avec `prizes` dans l'ordre saisi, et s'il n'est visible d'un tiers qu'après la publication.

### 6.6 Instructeurs
**Fonctionnement normal.**
1. FinLab ouvre `/hackathons/fintech-inclusion/instructeurs` : Ibrahim et Aïcha « Accepté », Awa « Proposée ».
2. Awa, sur `/hackathons/missions/mission-awa`, voit 75 000 F CFA et clique « Accepter ».
3. FinLab est prévenu, et Awa apparaît parmi les instructeurs du hackathon.

**À tester.**
- Répondre deux fois : refusé.
- Proposer Kossi, qui n'est pas mentor : refusé.
- Un compte qui n'est pas l'organisateur : refusé.
- Proposer plus d'instructeurs que prévu : accepté à tort **(bug connu)**.

**Ça marche si** la mission passe à ACCEPTED en base et si le compteur d'instructeurs augmente.

### 6.7 Jury, résultats et prix
**Fonctionnement normal.**
1. **Noter.** Awa ouvre `/hackathons/raccourcisseur/jury`. Elle voit « Solution n° 1 sur 3 », sans nom d'équipe. Elle note 4/4/4/4 (« 16 / 20 »), puis passe aux suivantes jusqu'à « Toutes les solutions sont notées ». Aïcha et Ibrahim font de même.
2. **Publier.** Équipe ouvre `/hackathons/raccourcisseur` et clique « Publier les résultats ». La confirmation dit que les équipes primées savent que l'organisateur va les contacter.
3. **Prix.** La 1re équipe reçoit « ton équipe finit 1re et gagne « Un an d'hébergement offert ». L'organisateur vous contacte pour le remettre. » Les autres reçoivent « les résultats sont publiés ».
4. **Lire.** Sur `/hackathons/inscription-accessible/resultats` :
   - avec Kossi (1er) : bandeau « Ton équipe a gagné » avec « 1er prix : un clavier mécanique », puis le classement, la liste des prix et « Prix remis par KABAD » ;
   - avec Fatou (2e) : bandeau avec « 2e prix : un livre sur l'accessibilité » ;
   - avec Chidi (3e) : pas de bandeau, seulement sa note et les commentaires du jury.

**À tester.**
- Publier avant que tout le jury ait noté : « N solutions n'ont pas encore été notées ».
- Double clic sur « Publier » : une seule publication, une seule série de notifications.
- Un non-juré sur `/jury` : page introuvable.
- Un hackathon sans prix : seule la 1re équipe est prévenue « ton équipe a gagné ».
- Remplacer un juré après une note : son ancienne note compte encore **(bug connu)**.

**Ça marche si** le statut passe à DONE avec `resultsAt` rempli, si le classement suit la moyenne des trois jurés, si chaque équipe primée a une notification qui nomme son prix, et si aucune trace de versement, de 90/10 ou de délai de contestation n'apparaît.

### 6.8 Administration des hackathons
**Fonctionnement normal.** Le tableau de bord `/admin` affiche les tuiles « à publier » et « au jury ». Il n'y a plus de tuile ni de menu « Versements ».

**À tester.** `/admin/versements` donne une page introuvable. Un `POST /api/payouts/x` répond 404.

**Ça marche si** le menu admin ne contient que : Vue d'ensemble, Badges, Signalements, Membres, Hackathons, Journal.

---

## 7. Tests d'applications

### 7.1 Publier une app à tester
**Fonctionnement normal.**
1. Chidi ouvre `/tests/nouveau` et saisit un nom, un lien https, Android, 8 testeurs, 15 min, une présentation, une tâche et deux étapes.
2. Il publie et arrive sur la page de l'app.
3. Dans `/messages`, le groupe « Testeurs … » apparaît, avec le message « Installer l'app : … ».

**À tester.**
- Un lien en http est refusé. Aucune étape, ou plus de 5 : refusé.
- La 6e publication de la journée est refusée.

**Ça marche si** l'annonce apparaît dans « Mes tests » avec 0 testeur, et si le groupe apparaît dans la messagerie sans recharger.

### 7.2 Rejoindre un test et cocher les étapes
**Fonctionnement normal** (A : Aïcha, B : Edem).
1. Aïcha ouvre `/tests/marche-vert` et clique « Rejoindre le groupe de testeurs ».
2. Edem est prévenu, et le groupe annonce « Aïcha a rejoint le groupe ».
3. Aïcha coche l'étape 1, puis recharge : l'étape reste cochée.

**À tester.**
- Edem ne peut pas tester sa propre app.
- Sur TontineApp (5 places), la 6e personne est refusée. Deux clics simultanés sur la dernière place : un seul réussit.
- Quitter un test après avoir envoyé un rapport est refusé.

**Ça marche si** le nombre de places baisse de 1 et si le testeur apparaît dans les membres du groupe.

### 7.3 Envoyer et relire un rapport
**Fonctionnement normal** (A : Yao, B : Chidi).
1. Yao coche les 3 étapes de `/tests/tontine-app`.
2. Sur `/tests/tontine-app/rapport`, il saisit l'appareil, joint 3 captures PNG et envoie.
3. Chidi ouvre `/tests/tontine-app/rapports`, voit les captures et refuse avec le motif « Captures floues ».
4. Yao est prévenu, renvoie un rapport, et Chidi le valide.

**À tester.**
- Deux captures pour trois étapes : refusé. Un `.txt` renommé en `.png` : refusé. Une image de plus de 2 Mo : refusée.
- Un autre compte qui ouvre l'adresse d'une capture obtient une page introuvable.
- Double clic sur « Envoyer » : erreur 500 possible **(bug connu)**.

**Ça marche si** le statut passe de SUBMITTED à REFUSED puis VALIDATED, et si le profil de Yao compte un test validé de plus.

---

## 8. Messagerie

### 8.1 Invitations
**Fonctionnement normal** (A : Kossi, B : Nadia).
1. Kossi voit le bandeau « 2 invitations » dans `/messages`.
2. Il ouvre celle de Nadia et l'accepte : la conversation s'ouvre avec le message de Nadia, suivi de « Kossi a accepté l'invitation ».
3. Il refuse celle d'Edem, après confirmation.
4. Dans « Envoyées », l'invitation à Chidi est « En attente ».

**À tester.**
- Inviter Yao, qui est déjà un contact : refusé.
- Edem réinvite Kossi juste après le refus : « Tu pourras réessayer dans quelques semaines ».
- S'inviter soi-même : refusé. Une invitation sans message : acceptée.

**Ça marche si** l'invitation passe à ACCEPTED ou DECLINED, et si deux lignes `Contact` sont créées après une acceptation.

### 8.2 Conversations et temps réel
**Fonctionnement normal** (A : Kossi, B : Yao, sur leur conversation). Kossi écrit « Test temps réel » : le message apparaît chez Yao en moins d'une seconde, sans recharger.

**À tester.**
- Un message vide ou de plus de 4 000 caractères est refusé.
- Le 31e message en une minute est refusé.
- Couper le réseau pendant un envoi : le message passe en « échec », puis peut être renvoyé.
- Yao bloque Kossi : Kossi ne peut plus lui écrire.
- Arrêter `npm run realtime`, envoyer un message, puis relancer : le message apparaît après la reconnexion.

**Ça marche si**, après rechargement, chaque message n'existe qu'une fois, et si `http://localhost:4001/health` renvoie `{ok:true}`.

### 8.3 Pièces jointes
**Fonctionnement normal.** Kossi envoie à Fatou une image PNG, un PDF et une note vocale de 5 s. Fatou voit l'image, télécharge le PDF et écoute la note.

**À tester.**
- Un fichier de 2,1 Mo est refusé ; un `.exe` renommé en `.pdf` aussi.
- Fatou, sur `/accueil` pendant l'envoi d'une image, ne voit pas la pastille « Messages » bouger **(bug connu)**.

**Ça marche si** chaque fichier arrive avec le bon type, et si un compte qui n'est pas membre obtient une page introuvable sur l'adresse du fichier.

### 8.4 Groupes
**Fonctionnement normal.**
1. Kossi ouvre `/messages/groupes/nouveau`, saisit « Équipe Baobab », choisit le thème Hackathon et ajoute Fatou et Yao.
2. Fatou et Yao voient le groupe apparaître en direct.
3. Kossi retire Yao, puis quitte le groupe : « Fatou gère maintenant le groupe ».

**À tester.**
- Ajouter un membre qui n'est pas un contact : refusé.
- Un nom de 61 caractères : refusé.
- Fatou, qui n'est pas créatrice, ne peut pas ajouter de membre.

**Ça marche si** les messages système apparaissent en direct chez chacun.

---

## 9. Africa Rise-Up

### 9.1 Projets
**Fonctionnement normal.**
- Avec Aïcha, `/rise-up` liste 3 projets, et `/rise-up?defi=WATER` ne laisse que Forages Sahel.
- Sur `/rise-up/nouveau`, elle lance un projet. Elle arrive sur sa page, et le canal du projet apparaît dans `/messages`.

**À tester.** Un problème décrit en moins de 30 caractères est refusé, plus de 8 compétences aussi.

**Ça marche si** la carte du projet affiche « 1 dev · 1 pays ».

### 9.2 Rejoindre et discuter
**Fonctionnement normal** (A : Aïcha, B : Nadia).
1. Aïcha ouvre `/rise-up/dossier-medical` et rejoint le projet avec la compétence Mobile.
2. Nadia est prévenue.
3. Aïcha publie une idée, Nadia y répond : le fil affiche la réponse.

**À tester.**
- Un non-membre ne peut pas écrire.
- On ne peut pas répondre à une réponse.
- Nadia ne peut pas quitter son projet tant qu'il a des membres.
- Quitter le projet fait disparaître le canal de `/messages`.

**Ça marche si** le nombre de devs et de pays augmente sur la carte du projet.

### 9.3 Événements
**Fonctionnement normal** (worker lancé).
1. Yao crée sur `/rise-up/forages-sahel/evenements/nouveau` un événement dans 50 min.
2. Kossi est prévenu tout de suite, puis reçoit le rappel dans les 5 min.
3. La page de l'événement montre le lien visio et « Ajouter au calendrier ».

**À tester.**
- Une date passée est refusée, un lien en http aussi.
- Aïcha, qui n'est pas membre, ne voit pas le lien.
- Décocher la notification : le rappel arrive quand même **(bug connu)**.

**Ça marche si** `remindedAt` est rempli et si chaque membre ne reçoit qu'un rappel.

---

## 10. Administration

### 10.1 Signalements
**Fonctionnement normal.**
1. Kossi signale Yao depuis `/profil/yao`.
2. Équipe voit le signalement dans `/admin/signalements` et choisit « Avertir », avec une note.
3. Yao reçoit l'avertissement.

**À tester.**
- Signaler un message, puis « Retirer le message » : le message est masqué chez les deux membres.
- « Suspendre » : Yao est déconnecté et ne peut plus se connecter.
- Signaler deux fois la même chose ne crée qu'une ligne.

**Ça marche si** le signalement passe à REVIEWED, et si `/admin/journal` affiche l'action.

### 10.2 Membres
**Fonctionnement normal.** Équipe cherche « Yao » dans `/admin/membres`, le suspend avec un motif, puis le réintègre.

**À tester.** Se suspendre soi-même : refusé. Suspendre un admin : refusé. Un motif trop court : refusé.

**Ça marche si** `suspendedAt` est rempli puis revient à vide, et si le journal affiche les deux actions.

---

## 11. Salons vocaux (désactivés)

**Fonctionnement normal.** Avec `NEXT_PUBLIC_SALONS="off"` puis un redémarrage de `npm run dev` :
- `/salons` et `/en/salons` affichent une page introuvable ;
- l'API `/api/rooms` répond 404 ;
- aucun lien « Salons » n'apparaît dans le menu.

**Ça marche si** `npm run test:e2e -- --grep "salons vocaux désactivés"` passe.
