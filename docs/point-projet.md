# KABAD · Point de mise à jour du projet

Version du 5 novembre 2026. Projet d’Emmerson da MATHA (ELITE AGENCY) et Amos Gabriel.

> **À lire en premier.** Ce fichier fait le point sur la vision, les décisions et les fonctionnalités de KABAD après la réunion du 28 octobre 2026 et la refonte complète du design.
>
> Quand ce fichier contredit une ancienne note, un ancien document ou du code déjà écrit, **c’est ce fichier qui fait foi**. Les décisions qui ont changé sont regroupées dans la partie 3. L’équipe peut le modifier à tout moment pour garder le projet aligné sur sa vision.

## 1. Le projet en bref

- **Nom** : KABAD, toujours avec un K et en capitales.
- **Cadre** : projet présenté à la Coupe d’Afrique des développeurs.
- **Équipe** : Emmerson da MATHA (ELITE AGENCY) et Amos Gabriel.
- **Thème** : une plateforme d’échange africaine, pour et par les développeurs.
- **Signature** : « Par les devs, pour les devs. »
- **Public** :
  - les devs d’Afrique et de la diaspora, de l’aspirant qui découvre le code au senior qui conçoit des systèmes et encadre ;
  - les organisations qui montent des hackathons (entreprises, incubateurs, communautés).

## 2. Vision et mission

### Vision

Créer la prochaine génération de développeurs africains plus productifs et plus compétents à l’ère de l’IA.

On dit « créer », pas « former ».

Accroche de l’écran de bienvenue : « Créons la prochaine génération de devs africains, plus productifs et plus compétents à l’ère de l’IA. »

### Mission, en trois temps

1. Faire grandir les devs : mentorat gratuit, hackathons, entraide, retours de la communauté sur leurs apps.
2. À travers eux, résoudre de vrais problèmes de l’Afrique : eau, santé, agriculture, éducation, énergie, finance…
3. Valoriser ces solutions à l’international.

### Ce que chaque fonctionnalité apporte à la vision

- **Mentorat** : transmettre l’expérience des seniors, vite et sans friction.
- **Hackathons** : se confronter à de vrais problèmes, en équipe, avec des organisations.
- **Tests d’apps** : livrer des apps de meilleure qualité grâce aux retours des autres devs.
- **Messagerie** : construire le réseau des devs du continent.
- **Africa Rise-Up** : unir les devs autour de projets à impact pour l’Afrique.

## 3. Ce qui a changé (décisions récentes)

- **Défis de code abandonnés, remplacés par les hackathons.** Des défis type LeetCode sont trop simples. De vrais hackathons ouverts à tous ont plus de valeur.
- **Hackathons et mentorat sont indépendants.** Aucun lien obligatoire avec un mentor. Si l’organisateur le souhaite, il peut recruter des mentors KABAD comme instructeurs rémunérés pour préparer les équipes. C’est optionnel.
- **« Africa Rise-Up », avec un trait d’union.** Pas « Raise ». Le sens : l’Afrique se relève.
- **Stack : Next.js, et non NestJS.** L’application est une PWA.
- **Authentification : e-mail et mot de passe uniquement.** Pas de connexion GitHub ni Google pour l’instant.
- **Mentorat : réservation directe.** Le dev choisit un créneau dans le calendrier du mentor, sans discussion préalable. Le mentor accepte ou refuse.
- **Visio : Google Meet en V1.** Service externe. Pas de visio développée dans KABAD pour la V1.
- **Badge mentor validé par KABAD.** On ne devient pas mentor en se déclarant. On envoie une demande avec des informations et des liens, et l’équipe KABAD valide ou refuse depuis un écran admin.
- **Design : refonte complète.** La direction « B2 · Motif amélioré » est validée et remplace l’ancien design (voir partie 6).
- **Hors périmètre.** Le scraping de contenus évoqué en réunion concerne un autre projet, pas KABAD.
- **Mis de côté.** La répartition des tâches évoquée en réunion est mise de côté pour l’instant.
- **Capsules retirées** (5 novembre). Elles venaient des premières idées du projet et ne font pas partie des priorités.
- **Plus de cagnotte** (9 novembre). Les hackathons sont organisés par des organisations, qui fixent elles-mêmes leurs prix (un ou plusieurs, ou aucun) et les remettent aux gagnants. KABAD ne collecte ni ne verse d’argent. Les prix suivent le classement du jury.

## 4. Technique et règles de travail

- Next.js, en PWA : une app web responsive et installable, pensée d’abord pour le téléphone, qui doit aussi bien fonctionner sur tablette et sur ordinateur.
- Format de référence des maquettes : téléphone, 390 × 844.
- Visio : Google Meet. Le lien est transmis aux deux participants d’une séance confirmée, et aux membres d’un événement Rise-Up au format Meet.
- Git : une branche par fonctionnalité, puis fusion sur la branche principale.
- Données : jamais de fausses données présentées comme réelles.
  - Une information inconnue s’affiche comme un placeholder visible : [Montant], [Organisateur], [Prix annoncés par l’organisateur], github.com/[pseudo].
  - Les noms des maquettes (Kossi Mensah, Awa Diop, FinLab Cotonou, etc.) sont des exemples.
- Ton de l’interface : français, tutoiement, phrases courtes. On parle de « devs ».
- Monnaie affichée dans les maquettes : F CFA.

## 5. Fonctionnalités

Les codes entre parenthèses (A1, M2, H6…) renvoient aux écrans du canevas de design (partie 6).

### 5.0 Authentification (A1 à A9)

Règles :

- E-mail et mot de passe : 8 caractères minimum, dont au moins un chiffre.
- Acceptation des conditions d’utilisation.
- Confirmation de l’adresse e-mail obligatoire.

Inscription en 5 étapes :

- **A1 Bienvenue** : accroche de la vision, « Créer mon compte », « Se connecter ».
- **A2 (1/5) Créer un compte** : nom complet, e-mail, mot de passe.
- **A3 (2/5) Confirmer l’e-mail.**
- **A4 (3/5) Profil** : pays et ville ; niveau :
  - Aspirant : découvre le code ;
  - Débutant : a fait ses premiers projets ;
  - Intermédiaire : travaille sur des projets réels ;
  - Senior : conçoit des systèmes et encadre.
- **A5 (4/5) Intérêts** :
  - technologies : JavaScript, TypeScript, Python, PHP, Java, Kotlin, Flutter, React, Node.js, Django, Laravel, Data et IA ;
  - ce que le dev vient chercher : un mentor, des hackathons, faire tester son app, tester des apps, des projets Rise-Up, rencontrer des devs.

  Tout reste modifiable plus tard.
- **A6 (5/5) Devs à rencontrer** :
  - suggestions de membres, à qui on envoie une invitation, avec un message facultatif ;
  - étape facultative ;
  - A6b, état vide : « Tu fais partie des premiers », avec un bouton pour inviter des devs qu’on connaît.

Connexion :

- **A7** Connexion.
- **A8** Mot de passe oublié : lien envoyé par e-mail.
- **A9** Nouveau mot de passe.

### 5.1 Mentorat (M1 à M7)

Objectif : n’importe quel dev peut réserver une séance gratuite et ponctuelle avec un mentor vérifié, sur un problème précis.

Règles :

- Gratuit et ponctuel : une séance, un sujet.
- Seuls les mentors badgés par KABAD apparaissent.
- Réservation directe façon Calendly. Le dev voit le calendrier du mentor et choisit un créneau libre. Pas d’échange de messages avant.
- En réservant, le dev écrit le sujet et les points à aborder.
- Le mentor lit la demande. Il peut accepter, ou refuser pour n’importe quelle raison.
- Une fois la séance acceptée, les deux reçoivent la confirmation et le lien Google Meet, et peuvent l’ajouter à leur calendrier.
- Le mentor définit ses plages hebdomadaires. KABAD les découpe en créneaux de 30 min (durée retenue dans les maquettes).
- Le fuseau horaire est toujours affiché.

Parcours du dev :

- **M1 Trouver un mentor** : recherche par sujet, techno ou nom ; filtres par domaine ; cartes mentor (domaine, ville, technos, prochain créneau) ; encart « Demande le badge mentor ».
- **M2 Choisir un créneau** : calendrier du mois, jours disponibles, créneaux du jour.
- **M3 Réserver** : sujet de la séance, problème précis, lien utile facultatif (dépôt, maquette, document).
- **M4 Demande envoyée** : en attente de la réponse du mentor.
- **M6 Séance confirmée** : lien Google Meet, ajout au calendrier.

Parcours du mentor :

- **M5 Demandes reçues** : onglets « À traiter » et « Acceptées » ; accepter ou refuser.
- **M7 Disponibilités** : plages par jour de la semaine, dates bloquées (voyage, congés, examens), fuseau horaire.

### 5.1 bis Badge mentor (B1 à B6)

Demande en 2 étapes, côté candidat :

- **B1 Expertise** : jusqu’à 3 domaines (Backend, Frontend, Mobile, Cloud et DevOps, Data et IA, Paiements et fintech, Sécurité, Produit et UX) ; technologies maîtrisées ; expérience (3 à 5 ans, 5 à 10 ans, 10 ans et +) ; poste actuel ; entreprise, facultative.
- **B2 Liens et présentation** : au moins un lien parmi GitHub, LinkedIn et portfolio ; présentation publique, 280 caractères maximum ; sujets sur lesquels le mentor peut aider.
- **B3 Demande en examen** : statut et étapes. La demande reste modifiable.
- **B4 Badge accordé** : le mentor ouvre ses premiers créneaux.

Côté équipe KABAD (admin) :

- **B5** Liste des demandes de badge.
- **B6 Examiner une demande** : tout le dossier est visible ; « Valider le badge » ; ou « Refuser », avec un motif envoyé au candidat.

Les informations de la demande s’affichent ensuite sur le profil public du mentor.

### 5.2 Hackathons (H1 à H9)

Objectif : de vrais hackathons, ouverts à tous, créés par des organisations.

Règles :

- Formats : en ligne, présentiel ou hybride.
- Participation seul ou en équipe. La taille des équipes est fixée par l’organisateur.
- Les équipes se forment librement : créer son équipe et inviter des coéquipiers ; rejoindre une équipe qui cherche un profil ; publier une annonce de recrutement.
- Chaque équipe a son espace de discussion.
- Les prix sont facultatifs : un ou plusieurs prix, ou aucun. L’organisateur fournit le règlement.
- Instructeurs, en option : l’organisateur peut recruter des mentors KABAD pour préparer et guider les équipes. La mission est rémunérée, et le mentor l’accepte ou la refuse.

Parcours du participant :

- **H1 Hackathons** : liste filtrable (tous, en ligne, présentiel, hybride) ; compte à rebours ; rappel de son équipe en cours.
- **H2 Détail** : dates, durée, taille des équipes ; date limite d’inscription ; le défi et les prix ; mentors KABAD présents.
- **H3 Participer** : seul, créer une équipe ou rejoindre une équipe ; acceptation du règlement.
- **H4 Mon équipe** : compte à rebours avant le rendu ; membres et rôles ; publier une annonce pour un profil manquant.
- **H5 Soumettre la solution** : nom du projet ; lien du dépôt ; démo ou vidéo, facultative ; description ; validation par toute l’équipe.

Parcours de l’organisateur (3 étapes) :

- **H6 (1/3) Infos** : nom du hackathon, organisateur, format, lieu, début, fin, taille des équipes.
- **H7 (2/3) Défi et prix** : le défi, les prix (ou aucun), le règlement.
- **H8 (3/3) Instructeurs** : mission ; rémunération par instructeur ; nombre d’instructeurs ; mentors suggérés à inviter ; publication du hackathon.

Parcours du mentor :

- **H9 Mission proposée** : organisateur et hackathon ; rémunération ; ce qui est attendu ; accepter ou refuser.

### 5.3 Tests d’applications (T1 à T4)

Objectif : un dev fait tester son app par la communauté, avec une méthode claire.

Principe : une annonce, puis un groupe de testeurs. Le groupe est créé par l’auteur de l’annonce, à la publication, et apparaît dans la messagerie.

- **T3 Publier une annonce** : nom de l’app ; lien d’installation (Play Store, TestFlight, site web) ; plateformes (Android, iOS, Web) ; nombre de testeurs voulus (5, 8, 10 ou 20) ; durée du test (10, 15 ou 30 min) ; liste des tâches à tester.
- **T1 Tests d’apps**, en deux onglets : « Annonces » ; « Mes tests » (les apps que je teste, avec ma progression ; mes annonces, avec le nombre de testeurs et de retours).
- **T2 Détail d’une annonce** : description, tâches à tester, places restantes, « Rejoindre le groupe de testeurs ». Le lien d’installation est partagé dans le groupe.
- **T4 Groupe de testeurs** : consignes épinglées, sous forme de liste de tâches à cocher ; discussion entre l’auteur et les testeurs ; retours avec captures d’écran.

### 5.4 Messagerie (MS1 à MS5)

Règles :

- Invitations : la discussion s’ouvre une fois l’invitation acceptée. Le message d’invitation est facultatif ; une invitation envoyée reste visible dans la messagerie de l’expéditeur, avec son message, jusqu’à la réponse.
- Suggestions de devs à l’inscription, avec un état vide s’il n’y a encore personne.
- Messages : texte, audio, images et fichiers.
- Groupes : nom, photo, thème (Fintech, Hackathon, Entraide, Mobile, Data et IA…) et membres.
- La messagerie sert aussi de base aux espaces d’équipe des hackathons et aux groupes de testeurs.

Écrans :

- **MS1 Conversations** : onglets Tout, Personnes, Groupes ; bandeau des invitations reçues ; bouton « Nouveau groupe ».
- **MS2 Invitations** : reçues (accepter ou refuser) et envoyées (en attente).
- **MS3 Conversation** : texte, note vocale, image, fichier.
- **MS4 Nouveau groupe** : photo, nom, thème, membres.
- **MS5 Discussion de groupe.**

### 5.5 Africa Rise-Up (R1 à R5)

Cette fonctionnalité sera développée en dernier.

Sens : l’Afrique se relève.

Objectif : unir des devs de plusieurs pays autour de projets qui répondent à de vrais défis africains.

Règles :

- Chaque projet a son canal.
- Les projets sont classés par défi : Eau, Santé, Agriculture, Éducation, Énergie, Finance, Autre.
- Salons virtuels en direct.
- Événements programmés.

Écrans :

- **R1 Projets Africa Rise-Up** : liste filtrable par défi ; nombre de devs et de pays ; compétences recherchées ; projets en direct.
- **R2 Canal d’un projet** : onglets Discussion, Événements, Membres ; idées et fils de réponses ; bandeau du salon en cours.
- **R3 Lancer un projet** : nom ; défi visé ; problème à résoudre (qui est touché, où, pourquoi c’est important) ; compétences recherchées.
- **R4 Salon en direct, en audio** : intervenants, auditeurs, lever la main, chat, quitter.
- **R5 Programmer un événement** : format (salon vocal dans KABAD ou Google Meet) ; titre, date, heure, ordre du jour ; prévenir les membres, avec un rappel 1 h avant.

### 5.6 Écrans transverses

- **Landing page** (`/`) : la page publique de KABAD. Vision, mission, les cinq espaces, une présentation animée (lancée au clic) et le bouton « Rejoindre la communauté », qui mène à A1.
- **Accueil** : salutation ; prochaine séance de mentorat, avec le bouton pour rejoindre la visio ; projet Rise-Up en direct, avec le bouton pour rejoindre le salon ; prochain hackathon, avec un compte à rebours.
- **Barre du bas** : Accueil, Mentorat, Hackathons, Rise-Up, Messages (avec le compteur de non-lus).
- **P1 Mon profil** : nom, rôle, ville, niveau, technos ; modifier mon profil ; mes séances, mes hackathons, mes tests, mes projets Rise-Up ; « Devenir mentor » ; se déconnecter.
- **P2 Notifications** : regroupées par jour ; chaque notification a la couleur de sa fonctionnalité et ouvre l’écran concerné ; « Tout marquer comme lu ».

## 6. Design : direction « B2 · Motif amélioré » (validée)

Principe : une identité franche et énergique, pensée d’abord pour le téléphone. Chaque fonctionnalité a sa couleur, et chaque écran a une seule action qui ressort.

### Couleurs

Couleur de chaque fonctionnalité :

- **Indigo `#283588`** : la marque, le mentorat, le bouton principal.
- **Maïs `#F2B705`** : réservé à Africa Rise-Up. Ailleurs, seulement en petite touche, par exemple la pastille de notification.
- **Encre `#0D1020`** : les hackathons, le texte et toutes les bordures.

Autres teintes :

| Nom | Code | Usage |
| --- | --- | --- |
| Indigo foncé | `#1F296B` | Bandeau, survol |
| Indigo clair | `#6F7DD0` | Motif seulement |
| Brume | `#DFE3F7` | Texte secondaire sur fond indigo |
| Maïs profond | `#2E2203` | Texte sur fond maïs |
| Ardoise | `#4B5172` | Texte secondaire |
| Gris clair | `#B6BACD` | Libellés sur fond encre |
| Sable | `#F3F1EC` | Fond des écrans |
| Blanc | `#FFFFFF` | Cartes, barre du bas |
| Palme | `#13724B` sur `#DDF2E7` | Statuts réussis (« Confirmée ») |
| Argile | `#A3281B` | Compteur de non-lus, erreurs |
| Argile clair | `#EE8E80` | Point « En direct » |

### Typographie

- **Unbounded**, graisses 600 à 800 : titres d’écran et de section en capitales, chiffres en vedette. Titre d’écran 24/30 ; titre de section 17/22 ; titre de carte 700, 16/21 ; chiffre en vedette 28/30.
- **Manrope**, graisses 400 à 800 : tout le reste. Texte courant 600, 14/20 ; sur-titres 800, 12/16, en capitales ; barre du bas 700, 12/15.

Les deux polices sont livrées dans le dépôt (`src/app/fonts`, licence SIL OFL 1.1).

### Formes et espacements

- Rayons : 8 badges ; 12 boutons ; 14 action ; 18 cartes ; 20 carte vedette ; avatars ronds.
- Toutes les cartes ont une bordure encre de 2 px.
- L’ombre décalée (5 px 5 px, encre) est réservée à la carte vedette : une seule par écran.
- Espacements : 16 marges de l’écran ; 22 entre deux sections ; 16 à 18 intérieur des cartes.
- Zones tactiles : 44 px minimum.
- Motif signature : un bandeau de barres (indigo foncé, maïs, indigo clair, blanc) sous l’en-tête, qui évoque des lignes de code.

### Pictogrammes

- Mentorat : des personnes.
- Hackathons : une coupe.
- Africa Rise-Up : une pousse, c’est-à-dire une jeune tige qui sort du code.
- Messages : une bulle.

### Maquettes

Canevas de design (privé, à partager avec Amos depuis le menu Partager) : <https://claude.ai/code/artifact/eb7008bd-a946-4ccb-9e16-6e3d610bdc77>

On y trouve la charte graphique, l’écran d’accueil B2 et 48 écrans de parcours au format téléphone, reliés entre eux en mode Lecture.

## 7. Perspectives

### Pour finir la V1

- Relier la barre du bas de l’accueil aux écrans de chaque fonctionnalité.
- Concevoir l’écran Paramètres, accessible depuis le profil.
- Concevoir les écrans propres à la PWA : invitation à installer l’app, hors connexion, autorisation des notifications, écran de démarrage.
- Adapter les mises en page à la tablette et à l’ordinateur.
- Étudier le déploiement de l’application sur un serveur.

### Plus tard (V2 et au-delà)

- Remplacer Google Meet par une visio intégrée à KABAD, par exemple une solution installable sur son propre serveur.
- Ajouter la connexion avec GitHub ou Google.
- Faire de KABAD l’endroit où l’on trouve, rejoint et organise les hackathons en Afrique, ouvert aux entreprises et organisations internationales.
- Piste : une vitrine des projets Africa Rise-Up et des solutions issues des hackathons, pour les valoriser à l’international, comme le prévoit la vision.

## 8. Questions encore ouvertes

- Visio à long terme : rester sur Google Meet ou intégrer une solution ? La décision a été reportée en réunion.
- Salon vocal Rise-Up : la maquette montre un salon audio dans KABAD. Il faut l’arbitrer avec la règle « pas de live développé en V1 ». Sinon, en V1, les événements passent par Google Meet.
- Rémunération des instructeurs de hackathon : montant ou pourcentage, et mode de paiement, à définir.
- Hackathons : qui juge les solutions et selon quels critères n’est pas encore défini.
- Création de hackathons : ouverte à toute organisation, ou réservée aux organisations vérifiées par KABAD ?
- Durée des séances de mentorat : 30 min dans les maquettes, à confirmer.
