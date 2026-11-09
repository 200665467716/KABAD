# État d'avancement et plan de test manuel

Bilan du 9 novembre 2026, branche `dev/modifications`. Pour chaque fonctionnalité : une note sur 10, ce qui manque pour atteindre 10, le fonctionnement normal, puis les tests à faire à la main, avec ce qu'on doit voir quand tout va bien.

Vérifications automatiques à cette date : lint et types propres, 31 tests unitaires, 46 tests d'intégration sur PostgreSQL, 109 tests e2e (téléphone et ordinateur), aucune licence GPL, AGPL ou LGPL.

## Tableau de bord

| # | Fonctionnalité | Note | Ce qui bloque le 10 |
| --- | --- | --- | --- |
| 0 | Mise en ligne et socle technique | **2/10** | Rien n'est en ligne ; `main` n'a pas reçu la refonte ; pas de reverse proxy, de déploiement, de sauvegardes ni de supervision |
| 1 | Landing page | **9/10** | Vrais chiffres, pages Contact et Confidentialité |
| 2 | Inscription et connexion | **8,5/10** | Code e-mail en 6 cases, icônes des écrans, détails de textes |
| 3 | Accueil, profil, notifications | **7/10** | En-tête de l'accueil, carte « Tests d'apps », profil (vedette, couleurs, Paramètres), « Tout marquer comme lu » dans l'en-tête |
| 4 | Mentorat | **7/10** | Écran M2 (profil du mentor) absent, créneaux déjà pris invisibles, lien Google Meet |
| 5 | Badge mentor et validation | **7,5/10** | Technos en puces, textes |
| 6 | Hackathons | **6,5/10** | Création en 3 étapes, discussion d'équipe absente, dépôt public non vérifié, invitations de coéquipiers |
| 7 | Tests d'apps | **7/10** | Écran T4 « Groupe de testeurs » dédié absent, formulaire T3 à aligner |
| 8 | Messagerie | **8/10** | Photo de groupe absente, thème du groupe non affiché, textes |
| 9 | Africa Rise-Up | **6,5/10** | Zone d'écriture, format Meet, interrupteur de rappel, bandeau du salon |
| 10 | Administration et modération | **7,5/10** | Quelques écrans hors maquette, pas de tests manuels récents |
| 11 | Compte et sécurité | **8,5/10** | Écran « Paramètres » de la maquette absent |
| 12 | Anglais | **7,5/10** | Tous les textes passent par les dictionnaires ; relecture anglaise à faire |
| 13 | Application installable (PWA) | **3/10** | Manifeste et icônes seulement : pas de mode hors connexion, d'invitation à installer ni de notifications |
| 14 | Paiement des cagnottes | **1/10** | XedoPay pas branché : la page de soutien affiche « bientôt » |
| 15 | Tâches planifiées (worker) | **8/10** | Fonctionne et testé ; à lancer en production |
| 16 | Temps réel | **8/10** | Fonctionne et testé ; adresse `wss://` à configurer en production |

Moyenne des fonctionnalités produit (1 à 12) : **7,5/10**. Le point le plus urgent n'est pas une fonctionnalité : c'est la mise en ligne (0), condition de recevabilité.

## Préparer les tests

Sur un ordinateur, en suivant le README (« Lancer KABAD sur son ordinateur ») :

1. Récupérer la branche : `git switch dev/modifications`, puis `git pull --rebase`.
2. `npm install`, `npm run db:migrate`, `npm run db:seed` (remet les données de démo à zéro : à refaire entre deux séries de tests).
3. Lancer les trois services dans trois terminaux : `npm run realtime`, `npm run dev`, `npm run worker`.
4. Ouvrir http://localhost:3000.

Bon à savoir :

- **Mot de passe de tous les comptes de démo : `kabad-demo-2026`.** Les comptes et ce qu'ils permettent de tester sont dans le README.
- **E-mails** : en local, aucun e-mail ne part. Le code de confirmation et les liens (mot de passe oublié) s'affichent dans le terminal de `npm run dev`.
- **Deux personnes à la fois** : utiliser deux navigateurs, ou une fenêtre normale et une fenêtre privée, pour voir le temps réel (messages, invitations, notifications).
- **Téléphone** : tester aussi dans le navigateur en mode téléphone (outils de développement, 390 px), puisque KABAD est pensé d'abord pour le mobile.
- **Règle générale** : à chaque écran, aucune page blanche, aucune erreur « 500 », aucun défilement horizontal, et chaque bouton fait ce qu'il annonce.

---

## 0. Mise en ligne et socle technique — 2/10

**Fait** : la CI construit et publie les images (`web`, `realtime`, `worker`, `migrate`) ; `compose.yaml` décrit la pile ; salons vocaux coupés par interrupteur.

**Manque pour 10/10** :

- **Fusionner la refonte dans `main`** : `main` est restée au 27 octobre. La PR de `dev/design-motif` puis `dev/modifications` doivent y entrer, sinon la CI ne publie pas d'images à jour.
- Reverse proxy HTTPS (Caddy) pour le site et le temps réel en `wss://`, workflow de déploiement par SSH, pare-feu 22/80/443 (R2).
- Sauvegarde nocturne de la base et restauration testée (R3).
- Route `/api/health`, journaux d'erreurs, alerte si le site tombe (R4).
- Démo en ligne sur le serveur Systalink avec les données de démo, vérifiée sur un vrai téléphone Android en 4G (R8).

**Test** : une fois en ligne, ouvrir l'adresse publique sur un téléphone en 4G. **Indicateur** : la landing s'affiche en moins de 3 secondes, le cadenas HTTPS est présent, la connexion avec un compte de démo fonctionne, un message envoyé arrive en direct dans un second navigateur.

---

## 1. Landing page — 9/10

**Fonctionnement normal** : un visiteur non connecté arrive sur `/` : hero indigo animé, bande défilante, Pourquoi KABAD, Fonctionnalités (5 onglets et un téléphone), Comment ça marche, Notre vision, Organiser un hackathon, FAQ, appel final, pied de page. Un membre déjà connecté qui ouvre `/` arrive directement sur son accueil.

**Manque pour 10/10** : remplacer les chiffres d'exemple (126 devs · 7 pays, dans 12 jours) dans `src/components/features/landing/content.ts` ; vraies pages Contact et Confidentialité, et l'adresse e-mail de contact.

| Tester | Attendu, et indicateur que ça marche |
| --- | --- |
| Ouvrir `/` sans être connecté | Le titre apparaît ligne par ligne, les trois cartes arrivent, les barres lumineuses bougent derrière le hero |
| Bouger la souris sur le hero (ordinateur) | Les cartes suivent légèrement la souris ; le bouton jaune « Créer mon compte » est attiré par le pointeur |
| Bouton pause de la bande noire | La bande s'arrête, l'icône devient « lecture » ; un second clic relance |
| Section Fonctionnalités, sans rien toucher | Les onglets changent seuls toutes les 6 s, une barre jaune se remplit sous l'onglet actif, le téléphone montre l'écran correspondant |
| Cliquer un onglet, puis les flèches du clavier | La rotation automatique s'arrête pour de bon ; les flèches haut/bas passent d'un onglet à l'autre |
| FAQ | Chaque question s'ouvre et se ferme ; la première est ouverte au départ |
| « Créer mon compte » (tous) / « Se connecter » | Mènent à `/inscription` et `/connexion` |
| Langue EN (en haut, ou en bas sur téléphone) | Toute la page passe en anglais, l'adresse commence par `/en` |
| Réglage « Réduire les animations » du système | Plus rien ne bouge, tout est visible immédiatement |
| Se connecter, puis ouvrir `/` | Redirection vers `/accueil` |
| Téléphone (390 px) | Pas de défilement horizontal ; « Se connecter » et « S'inscrire » restent visibles en haut |

---

## 2. Inscription et connexion — 8,5/10

**Fonctionnement normal** : inscription en 5 étapes. (1) Nom, e-mail, mot de passe de 8 caractères minimum dont un chiffre, conditions à cocher. (2) Un code à 6 chiffres arrive par e-mail, valable 10 minutes. (3) Pays, ville, niveau. (4) Technos et objectifs. (5) Devs à rencontrer, à inviter (facultatif). La connexion bloque 15 minutes après 5 mauvais mots de passe.

**Manque pour 10/10** : code en 6 cases séparées et carrés d'icône des écrans A3 et A8, bouton œil unique en A9, petits écarts de textes (« Invité » au lieu de « Envoyée » en A6).

| Tester | Attendu, et indicateur que ça marche |
| --- | --- |
| A2 sans cocher la case des conditions | Le bouton « Continuer » reste grisé (texte gris, non cliquable) ; il s'active dès qu'on coche |
| Mot de passe `kabad` puis `motdepasse` | Messages sous le champ, en rouge avec une icône : « au moins 8 caractères », puis « au moins un chiffre » |
| E-mail d'un compte existant (`kossi.mensah@exemple.tg`) | Sous le champ : « Un compte existe déjà avec cet e-mail. » avec un lien « Se connecter » qui y mène |
| Inscription valide | Arrivée sur « Confirme ton e-mail » ; le code apparaît dans le terminal de `npm run dev` |
| Saisir un faux code (`000000`) | Sous le champ : « Ce code est incorrect ou a expiré. Un code reste valable 10 minutes. » ; l'encart passe en bordure rouge avec « Demande un nouveau code » |
| Saisir le bon code | Étape suivante (profil) ; plus de bandeau « e-mail non confirmé » dans l'app |
| « Renvoyer le code » plusieurs fois de suite | Au-delà de 3 demandes dans l'heure : « Tu as déjà demandé plusieurs e-mails. » |
| Étapes 3, 4, 5 | Le profil est enregistré ; à l'étape 5, « Inviter » ouvre une feuille avec un message **facultatif** ; envoyer sans message fonctionne |
| Compte sans autres membres à suggérer | État vide « Tu fais partie des premiers » avec un bouton pour inviter des devs |
| Connexion avec un mauvais mot de passe | Bandeau rouge « **E-mail ou mot de passe incorrect.** Vérifie ton mot de passe, ou choisis-en un nouveau. » et, sous le champ, « Il reste 4 essais avant un blocage de 15 min » (puis 3, 2, 1) |
| 6e essai raté | « Trop d'essais de connexion. Réessaie dans 15 min. » |
| Mot de passe oublié | Message de confirmation ; le lien s'affiche dans le terminal ; il ouvre A9 avec 3 règles qui passent au vert (8 caractères, un chiffre, identiques) ; après enregistrement, on est connecté |
| Navigation au clavier (Tab) | Un contour indigo épais est visible sur chaque élément ; sur fond indigo, il est jaune |

---

## 3. Accueil, profil, notifications — 7/10

**Fonctionnement normal** : l'accueil montre la prochaine séance de mentorat (avec le bouton de visio), un projet Rise-Up en direct, le prochain hackathon avec son compte à rebours, et ce qui attend une réponse. La barre du bas mène aux 5 espaces et compte les messages non lus. Le profil résume séances, hackathons, tests et projets. Les notifications sont groupées par jour.

**Manque pour 10/10** : en-tête de l'accueil (logo, avatar à droite, carte séance qui chevauche l'en-tête), carte « Tests d'apps » de la maquette ; profil : carte d'identité en vedette, icônes colorées, « Devenir mentor » en carte pointillée, bouton « Paramètres », niveau toujours affiché ; « Tout marquer comme lu » en bouton d'en-tête ; écran « hors connexion ».

| Tester | Attendu, et indicateur que ça marche |
| --- | --- |
| Accueil avec Kossi | Séance confirmée avec Awa, carte maïs Rise-Up « En direct », billet de hackathon « DANS N JOURS » |
| Barre du bas | Chaque entrée mène à son espace et reste mise en évidence ; le compteur de Messages baisse quand on lit |
| Écran en cours de chargement (réseau lent : outils de dév, « Slow 3G ») | Des blocs gris qui scintillent (squelette) au lieu d'un texte « Chargement… » |
| Profil → « Se déconnecter » | Une feuille s'ouvre : « Se déconnecter ? » avec « Rester connecté » et « Se déconnecter » (rouge) ; Échap la ferme |
| Confirmer la déconnexion | Retour à la connexion ; les pages de l'app redemandent la connexion |
| Notifications | Groupées « Aujourd'hui », « Cette semaine », « Plus tôt » ; une non-lue a un fond bleuté, un point rouge et le mot « Non lue » ; la vignette prend la couleur de l'espace (indigo mentorat, encre hackathons, maïs Rise-Up, vert tests) |
| Toucher une notification | Elle ouvre le bon écran et passe en lue |
| « Tout marquer comme lu » | Toutes les lignes perdent « Non lue » |

---

## 4. Mentorat — 7/10

**Fonctionnement normal** : seuls les mentors badgés apparaissent. Le dev choisit un mentor, un jour, un créneau de 30 minutes (fuseau affiché), puis écrit son sujet et son problème. La demande part, le mentor l'accepte ou la refuse. Acceptée, la séance donne un lien de visio aux deux et un fichier calendrier. Une demande sans réponse expire ; le mentor reçoit une relance à 48 h ; un rappel part 1 h avant la séance. Un membre a 3 demandes en attente au plus.

**Manque pour 10/10** : écran M2 « Profil du mentor » séparé du calendrier (liens GitHub/LinkedIn, sujets, prochains créneaux) ; créneaux déjà réservés affichés barrés ; fuseau en nom de ville ; textes « Google Meet » et bouton « Copier le lien » en M7 ; lien Meet obligatoire (aujourd'hui, une salle Jitsi est créée si le mentor n'a pas de lien) ; état « Demande refusée » visible côté demandeur.

| Tester | Attendu, et indicateur que ça marche |
| --- | --- |
| Kossi → Mentorat | Liste de mentors vérifiés seulement (Awa, Ibrahim, Aïcha), filtres par domaine, recherche |
| Ouvrir Aïcha, choisir un jour puis une heure | Les jours ouverts sont marqués ; les heures du jour s'affichent ; « Continuer » s'active |
| Réserver sans sujet | Erreur sous le champ « Sujet » |
| Envoyer la demande | Écran « Demande envoyée » et « Et ensuite ? » en 3 étapes |
| Faire 4 demandes en attente | La 4e est refusée (3 au plus) |
| Aïcha → Demandes reçues | La demande de Kossi apparaît avec son sujet et son problème |
| Aïcha → « Refuser » | Une feuille s'ouvre : « Refuser la demande de Kossi ? », motif facultatif, « Annuler » / « Refuser » ; après refus : « Demande refusée · Kossi est prévenu » ; Kossi reçoit une notification |
| Aïcha → « Accepter » (autre demande) | Arrivée sur « Séance confirmée » ; Kossi est notifié ; les deux voient le lien de visio |
| « Ajouter à mon calendrier » | Un fichier `.ics` se télécharge et s'ouvre dans l'agenda |
| « Annuler la séance » | Une feuille « Annuler la séance ? » ; après confirmation, l'autre est prévenu |
| Aïcha → Disponibilités | Modifier une plage, bloquer une date, enregistrer ; les créneaux côté Kossi suivent |
| Deux comptes qui prennent le même créneau en même temps | Un seul l'obtient (testé automatiquement) |

---

## 5. Badge mentor et validation — 7,5/10

**Fonctionnement normal** : un dev demande le badge en 2 étapes : expertise (1 à 3 domaines, technos, années d'expérience, poste, entreprise facultative), puis liens (au moins un : GitHub, LinkedIn ou portfolio) et présentation de 280 caractères au plus. L'équipe KABAD valide, ou refuse avec un motif envoyé au candidat. Validé, il apparaît dans la liste des mentors et peut ouvrir ses créneaux.

**Manque pour 10/10** : technos en puces comme à l'inscription (aujourd'hui, un texte séparé par des virgules), domaines grisés au-delà de 3, titre « Devenir mentor », grand bouclier de l'écran B4, textes.

| Tester | Attendu, et indicateur que ça marche |
| --- | --- |
| Kossi → Profil → « Devenir mentor » | Formulaire en 2 étapes |
| Choisir 4 domaines | Impossible : 3 au plus |
| Étape 2 sans aucun lien | Erreur « Ajoute au moins un lien : GitHub, LinkedIn ou portfolio. » |
| Présentation de plus de 280 caractères | Le compteur l'empêche |
| Envoyer | Écran « Demande en examen » avec les étapes ; la demande reste modifiable |
| `equipe@kabad.app` → Admin → Badges | La demande apparaît dans « À examiner » avec tout le dossier |
| Refuser sans motif | Impossible : le motif est obligatoire |
| Valider | Le candidat reçoit une notification ; écran « Badge accordé » ; il apparaît dans la liste des mentors |

---

## 6. Hackathons — 6,5/10

**Fonctionnement normal** : n'importe quel dev connecté propose un hackathon, en indiquant l'organisateur en texte libre. L'équipe KABAD le relit et le publie. Les devs s'inscrivent seuls, créent une équipe ou demandent à en rejoindre une ; le capitaine accepte. Aucun mentorat n'est exigé. Chaque équipe soumet une solution (dépôt, démo facultative, description), modifiable jusqu'à la fin. À la fin, le hackathon passe au jury (3 mentors notent chaque solution sur 4 critères, sans jamais noter quelqu'un qu'ils ont accompagné). L'équipe publie les résultats. Avec une cagnotte ou une dotation : 90 % à l'équipe gagnante, 10 % à KABAD, versés après 48 h de contestation. L'organisateur peut proposer des missions d'instructeur rémunérées à des mentors, qui acceptent ou refusent.

**Manque pour 10/10** : création en 3 étapes de la maquette (infos, défi et prix avec « Pas de prix », instructeurs) ; espace de discussion de chaque équipe ; vérification que le dépôt est public (et l'erreur de H5e) ; inviter des coéquipiers ; « Demander » sur chaque équipe ; placeholder « [Prix annoncés par l'organisateur] » ; paiement des cagnottes (voir 14).

| Tester | Attendu, et indicateur que ça marche |
| --- | --- |
| Hackathons, filtres Tous / En ligne / Présentiel / Hybride | La liste se filtre ; chaque billet montre un compte à rebours |
| Ouvrir « Fintech pour l'inclusion » | Dates, durée, taille des équipes, défi, prix, organisateur |
| Participer seul | Case du règlement obligatoire ; inscription confirmée ; le billet affiche « Ton équipe » |
| Créer une équipe, puis, avec un autre compte, demander à la rejoindre | Le capitaine reçoit la demande et l'accepte ; le membre apparaît dans « Mon équipe » ; une équipe pleine refuse |
| Membre du jury qui veut participer | Refusé |
| Soumettre la solution avec un lien de dépôt faux (`abc`) | Erreur rouge sous le champ |
| Soumettre correctement | Confirmation ; la solution est modifiable jusqu'à la fin |
| Proposer un hackathon (Organiser) | Fin avant début refusée ; une fois envoyé, il n'est pas public tant que l'équipe KABAD ne l'a pas publié |
| `equipe@kabad.app` → Admin → Hackathons → Publier | Le hackathon apparaît dans la liste de tous |
| Jury : Ibrahim sur « Raccourcisseur » | Il note les solutions sans voir qui les a faites, 4 critères de 1 à 5 |
| Publier les résultats (équipe KABAD) | Gagnant affiché ; avec une cagnotte : versement de 90 % au gagnant et 10 % à KABAD dans Admin → Versements, disponible après 48 h |
| Mission d'instructeur → « Refuser » | Feuille « Refuser la mission ? » ; après refus, retour aux notifications ; l'organisateur est prévenu |
| Mission → « Accepter » | Arrivée sur le hackathon |

---

## 7. Tests d'apps — 7/10

**Fonctionnement normal** : un dev publie une annonce (nom, lien d'installation, plateformes, nombre de testeurs, durée, étapes). À la publication, il ouvre son groupe de testeurs dans la messagerie, avec le lien d'installation. Les testeurs prennent une place (dans la limite des places), entrent dans le groupe, cochent les étapes, puis envoient un rapport avec une capture par étape. L'auteur valide ou refuse chaque rapport, avec un motif.

**Manque pour 10/10** : écran T4 « Groupe de testeurs » dédié (consignes épinglées à cocher, « Installer l'app », « auteur de l'app ») ; formulaire T3 aligné sur la maquette (une seule zone pour les tâches, 10 min par défaut) ; « 1 testeurs » à corriger en « 1 testeur ».

| Tester | Attendu, et indicateur que ça marche |
| --- | --- |
| Tests d'apps, onglets « Annonces » / « Mes tests » | Annonces des autres d'un côté ; mes tests et mes annonces de l'autre |
| Liste vide (après avoir tout rejoint) | Carte pointillée « Aucune annonce pour l'instant » et bouton « Publier une annonce » |
| Publier une annonce | Le message « En publiant, tu ouvres ton groupe de testeurs… » ; après publication, « Testeurs {app} » apparaît dans la messagerie de l'auteur |
| Avec un autre compte : « Rejoindre le groupe de testeurs » | Arrivée dans le groupe ; l'auteur est notifié ; le groupe apparaît dans sa messagerie |
| Dans le groupe, ouvrir « Participants » | Message « Ce groupe suit l'annonce de test… » et bouton « Voir l'annonce de test » ; pas de bouton « Quitter le groupe » |
| Remplir toutes les places, puis essayer avec un compte de plus | « Toutes les places de test sont prises. » |
| Cocher les étapes, envoyer un rapport avec moins de captures que d'étapes | Refusé : une capture par étape |
| Envoyer un rapport complet | L'auteur le voit dans « Lire les retours » ; il valide ou refuse avec un motif ; le testeur voit le résultat |
| « Rendre ma place » avant d'avoir envoyé un rapport | La place se libère et le testeur quitte le groupe |

---

## 8. Messagerie — 8/10

**Fonctionnement normal** : un premier contact passe par une invitation, avec un message facultatif de 300 caractères au plus. Tant qu'elle n'est pas acceptée, l'expéditeur la voit dans sa messagerie avec « En attente » ; personne ne peut écrire. Acceptée, la conversation s'ouvre avec le message d'invitation. Messages en temps réel : texte, notes vocales (2 minutes), images et PDF (2 Mo). Groupes privés avec un thème, créés parmi ses contacts (50 membres au plus). Signalement et blocage. Après un refus, on peut réinviter la même personne au bout de 30 jours.

**Manque pour 10/10** : photo de groupe ; thème affiché sous le nom du groupe ; recherche dans les conversations ; textes de la maquette (« Écrire un message… », « message vocal ») ; confirmation pour retirer un membre d'un groupe.

| Tester | Attendu, et indicateur que ça marche |
| --- | --- |
| Inviter un membre sans écrire de message | L'invitation part ; elle apparaît chez moi dans Messages avec « Invitation envoyée » et le badge « En attente » |
| Le destinataire voit le bandeau « 1 invitation reçue » | Il s'affiche en direct, sans recharger |
| Refuser l'invitation | Feuille « Refuser l'invitation ? … ne sera pas prévenu » ; après refus, l'expéditeur n'est pas prévenu ; une nouvelle invitation est refusée pendant 30 jours |
| Accepter une invitation (avec message) | La conversation s'ouvre, le message d'invitation en premier, puis « … a accepté l'invitation » |
| Deux navigateurs : écrire dans une conversation | Le message arrive chez l'autre en moins d'une seconde ; le compteur de non-lus monte puis redescend à la lecture |
| Joindre un PDF ou une image de moins de 2 Mo | Il s'affiche et se télécharge chez l'autre |
| Fichier de plus de 2 Mo | « Le fichier fait 2 Mo au plus. » |
| Note vocale | Enregistrement, envoi, lecture chez l'autre ; au-delà de 2 minutes, refusé |
| Nouveau groupe avec un thème et 2 contacts | Le groupe apparaît chez tous en direct |
| Quitter un groupe | Feuille de confirmation ; si le créateur part, le plus ancien membre prend le relais |
| Bloquer un membre | Il ne peut plus écrire ni inviter |
| Signaler un message | Le signalement arrive chez l'équipe KABAD (Admin → Signalements) |

---

## 9. Africa Rise-Up — 6,5/10

**Fonctionnement normal** : un dev lance un projet (nom, défi visé parmi Eau, Santé, Agriculture, Éducation, Énergie, Finance, Autre, problème, compétences recherchées). Le projet a son canal : discussion avec fils de réponses, événements, membres. Les devs rejoignent le projet et entrent dans son canal. Le porteur programme des événements avec un lien de visio ; les membres sont prévenus et reçoivent un rappel 1 h avant. Pas de salon audio intégré en V1.

**Manque pour 10/10** : zone d'écriture fixée en bas du canal ; choix du format (Google Meet) et interrupteur « Notification et rappel 1 h avant » relié au rappel ; bandeau du salon en direct (« Rejoindre la visio ») ; ombre vedette sur le projet en direct ; textes des champs ; lien Meet obligatoire (aujourd'hui, une salle Jitsi par défaut).

| Tester | Attendu, et indicateur que ça marche |
| --- | --- |
| Rise-Up, filtres par défi | La liste se filtre ; les projets en direct viennent en premier |
| Lancer un projet | Le canal est créé ; le projet apparaît dans la liste et dans la messagerie du porteur |
| Avec un autre compte : rejoindre le projet | Il entre dans le canal et la liste des membres ; le porteur est notifié |
| Écrire une idée, y répondre | Le fil s'ouvre avec le nombre de réponses |
| Non-membre qui veut écrire | Impossible |
| Programmer un événement | Les membres reçoivent une notification ; la page de l'événement montre l'ordre du jour, « Rejoindre la visio », l'ajout au calendrier |
| Quitter le projet | Il sort aussi du canal |

---

## 10. Administration et modération — 7,5/10

**Fonctionnement normal** : le compte de l'équipe KABAD a un tableau de bord : badges à examiner, hackathons à publier et à juger, signalements, membres (suspendre, réintégrer, retirer un badge), versements à faire, et le journal de toutes les actions. Un membre ordinaire n'a accès à rien de tout cela.

**Manque pour 10/10** : passe de design sur ces écrans (étiquette « Admin » de la maquette B5) ; tests manuels complets.

| Tester | Attendu, et indicateur que ça marche |
| --- | --- |
| `equipe@kabad.app` → `/admin` | Tableau de bord avec les compteurs |
| Kossi → `/admin` | Page introuvable |
| Signalements → retirer un message | Le message devient « Message retiré par la modération. » chez tous |
| Membres → suspendre Moussa | Moussa est déconnecté partout et ne peut plus se connecter ; réintégrer lui rend l'accès |
| Versements → marquer comme envoyé avec une référence | Le bénéficiaire est notifié ; le versement passe à « Envoyé » |
| Journal | Chaque action ci-dessus y figure, avec son auteur |

---

## 11. Compte et sécurité — 8,5/10

**Fonctionnement normal** : « Mon compte » permet de changer de mot de passe, de se déconnecter de tous les appareils, d'exporter ses données en JSON et de supprimer son compte (mot de passe et le mot « SUPPRIMER »). Les sessions sont protégées (cookie `httpOnly`, empreinte du jeton seulement), les requêtes d'un autre site sont refusées, les limites de débit sont partagées par toutes les instances.

**Manque pour 10/10** : écran « Paramètres » de la maquette (accessible depuis le profil) ; liste des membres bloqués à faire relire.

| Tester | Attendu, et indicateur que ça marche |
| --- | --- |
| Changer de mot de passe avec un mot de passe sans chiffre | Refusé : « au moins un chiffre » |
| « Déconnecter tous mes appareils » | L'autre navigateur connecté au même compte est déconnecté |
| Exporter mes données | Un fichier JSON se télécharge avec profil, messages, séances, etc. |
| Supprimer le compte sans écrire SUPPRIMER | Refusé ; avec, le compte disparaît et la connexion échoue ensuite |

---

## 12. Anglais — 7,5/10

**Fonctionnement normal** : le français est la langue par défaut ; tout l'écran passe en anglais sous `/en`, la langue est mémorisée sur le compte, les e-mails et les erreurs du serveur suivent la langue.

**Manque pour 10/10** : relecture par une personne anglophone ; quelques textes récents traduits rapidement.

| Tester | Attendu, et indicateur que ça marche |
| --- | --- |
| Passer en EN puis naviguer partout | Aucun texte français ne reste (sauf les contenus écrits par les membres) |
| Erreur de connexion en EN | « Incorrect email or password. » |
| Se reconnecter sur un autre navigateur | La langue choisie revient |

---

## 13. Application installable (PWA) — 3/10

**Fait** : manifeste, nom, couleurs et icônes (192, 512, masquable).

**Manque pour 10/10** : service worker et page hors connexion (« Hors connexion… Réessayer »), invitation à installer, autorisation des notifications, écran de démarrage iOS (R44).

| Tester | Attendu, et indicateur que ça marche |
| --- | --- |
| Chrome Android → menu → « Installer l'application » | KABAD s'installe avec son icône et s'ouvre sans barre d'adresse |
| Couper le réseau | Aujourd'hui : page d'erreur du navigateur (à corriger) |

---

## 14. Paiement des cagnottes — 1/10

**Fait** : modèle de contributions en base, page publique de soutien `/soutenir/[id]`, répartition 90/10 calculée et testée.

**Manque pour 10/10** : branchement de XedoPay en mode test (paiement hébergé, webhook signé, crédit une seule fois par référence), remboursement si le hackathon est annulé (R40). Aujourd'hui, la page de soutien affiche « bientôt » et aucun paiement n'est possible.

| Tester | Attendu, et indicateur que ça marche |
| --- | --- |
| Ouvrir `/soutenir/agritech-sahel` sans compte | La page s'affiche, explique la répartition 90/10 et annonce que le paiement arrive bientôt |

---

## 15. Tâches planifiées — 8/10

**Fonctionnement normal** : le service `worker` lance, sans jamais ralentir une page : expiration des demandes de séance sans réponse, relance du mentor à 48 h, rappel 1 h avant une séance ou un événement Rise-Up, passage des hackathons au jury à la fin, annonce des versements après 48 h, expiration des invitations à 30 jours. Chaque tâche est testée automatiquement et sans effet si elle tourne deux fois.

**Manque pour 10/10** : le faire tourner en production (service `worker` de `compose.yaml`) et le surveiller.

| Tester | Attendu, et indicateur que ça marche |
| --- | --- |
| Avec `npm run worker` lancé, réserver une séance qui commence dans un peu plus d'une heure, la faire accepter | Les deux reçoivent une notification de rappel environ 1 h avant |
| Terminal du worker | Pas d'erreur en boucle |

---

## 16. Temps réel — 8/10

**Fonctionnement normal** : messages, invitations, notifications et compteurs arrivent sans recharger la page, grâce au service `realtime` alimenté par PostgreSQL. La connexion se referme à la déconnexion ou en cas de suspension.

**Manque pour 10/10** : configuration `wss://` derrière le reverse proxy en production.

| Tester | Attendu, et indicateur que ça marche |
| --- | --- |
| Arrêter `npm run realtime`, envoyer un message | Le message est enregistré ; l'autre le voit en rechargeant |
| Relancer `npm run realtime` | Le direct reprend tout seul |

---

## Ordre de travail proposé jusqu'au 15 novembre

1. **Mise en ligne** (0) : fusion dans `main`, Caddy, déploiement, sauvegardes, `/api/health`, démo sur le serveur Systalink. Condition de recevabilité.
2. **Écrans absents qui se voient en démo** : M2 profil du mentor, T4 groupe de testeurs, discussion d'équipe en hackathon.
3. **Parcours à reprendre** : création de hackathon en 3 étapes, accueil et profil, Rise-Up.
4. **Si le temps le permet** : PWA hors connexion, paiement en sandbox.

Le 12 novembre au soir, gel des fonctionnalités : ensuite, uniquement des corrections, et ce plan de test sur la version en ligne.
