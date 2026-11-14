# Rapport de tests du 13 novembre 2026

Campagne de tests des interfaces de KABAD sur la branche `dev/main`, menée par cinq agents de test en parallèle, puis corrections par cinq agents de correction (un par domaine, chacun sur sa branche), fusionnées dans `dev/main`.

- **Périmètre** : inscription et compte, mentorat, accueil et notifications, hackathons, tests d'apps, Africa Rise-Up, messagerie, annuaire, administration.
- **Conditions** : application locale (`next dev`, temps réel, worker), Chrome piloté par Playwright, téléphone 390 × 844 et ordinateur 1440 × 900, en français et sous `/en`, souvent avec deux ou trois comptes ouverts en même temps.
- **Bilan** : 81 problèmes relevés, **aucun bloquant**, 9 majeurs, 37 mineurs, 35 détails. **Les 9 majeurs sont corrigés**, ainsi que la quasi-totalité des mineurs et des détails. Ce qui reste est listé en fin de document.
- **Vérifications après corrections** : lint et types propres, 62 tests unitaires, 107 tests d'intégration sur PostgreSQL, 112 tests e2e, aucune licence GPL, AGPL ou LGPL, build de production réussi.

Pendant la campagne, le serveur `next dev` a planté une fois (panic interne de Turbopack, erreur 500 sur toutes les pages). Il a été relancé, cache vidé ; ces erreurs ne viennent pas de l'application et ne sont pas comptées.

## Comptes de test

Ils restent en base. Mot de passe commun : **`kabad-test-2026`**. E-mail confirmé, profil complet avec photo.

| Adresse | Niveau | Rôle | Ville |
| --- | --- | --- | --- |
| test.aspirant@kabad-test.dev | Aspirant | membre | Lomé |
| test.debutant@kabad-test.dev | Débutant | membre | Cotonou |
| test.intermediaire@kabad-test.dev | Intermédiaire | membre | Dakar |
| test.senior@kabad-test.dev | Senior | membre | Lagos |
| test.mentor@kabad-test.dev | Senior | mentor (badge validé par l'équipe) | Abidjan |
| test.organisateur@kabad-test.dev | Senior | organisateur de hackathons | Bamako |
| test.admin@kabad-test.dev | Intermédiaire | administrateur | Ouagadougou |
| test.english@kabad-test.dev | Intermédiaire | membre, interface en anglais | Accra |

Attention : `npm run db:seed` et les tests e2e vident la table des comptes. Ces comptes sont alors à recréer (script `creer-comptes.mjs` de la campagne, qui passe par le vrai parcours d'inscription).

## Problèmes majeurs (tous corrigés)

| Domaine | Problème | Correction |
| --- | --- | --- |
| Inscription | `npm run admin:promote` échouait (await de premier niveau compilé en CommonJS) : impossible de nommer un administrateur comme le dit le README | Le corps du script est dans une fonction `main()` ; `package.json` inchangé |
| Inscription | Sous `/en/inscription`, les erreurs vérifiées dans le navigateur restaient en français | Hook `useErrorText` qui reprend la table de traduction de l'API ; branché aussi sur la réservation et le badge |
| Mentorat | Un mentor pouvait avoir deux séances à la même heure (une comme dev, une comme mentor) | Contrôle des deux personnes, dans leurs deux rôles, à la réservation et à l'acceptation, dans la transaction, avec verrou sur les deux comptes ; le calendrier ne propose plus ces heures |
| Hackathons | Sur téléphone, le bouton principal (« Participer »…) passait sous la barre d'onglets | La barre d'action se colle au-dessus de la barre d'onglets sur tous les écrans qui en ont une |
| Hackathons | Accepter une mission sur un hackathon pas encore publié menait à « Page introuvable » | Le mentor en mission voit le hackathon, avec un bandeau « pas encore publié » |
| Hackathons | Formulaire « Organiser » : erreurs seulement à l'étape 3, une par une, sans focus | Chaque étape est vérifiée avec les règles du serveur ; toutes les erreurs à la fois, focus sur le premier champ fautif ; une erreur du serveur ramène à la bonne étape |
| Hackathons | Accepter une demande pouvait prendre la place d'une personne invitée, laissée en attente sur une équipe complète | Une invitation en attente garde sa place jusqu'à la réponse ou l'annulation ; une équipe pleine n'est plus proposée |
| Tests d'apps | Chaque envoi refusé du formulaire consommait la limite de 5 publications par jour : 5 fautes de saisie bloquaient l'auteur 24 h | Le compteur n'avance qu'à une publication réussie, dans la même transaction ; l'attente s'affiche en heures |
| Tests d'apps | Deux tâches cochées en même temps : une coche se perdait | Mise à jour verrouillée côté serveur (`SELECT … FOR UPDATE`) ; l'écran part toujours de l'état courant |

## Problèmes mineurs et détails corrigés

**Inscription et compte**
- Raisons des recommandations, pays et puce « Data et IA » traduits sous `/en`.
- Plus de niveau précoché à l'étape 3 ; `/inscription` renvoie un membre connecté vers son accueil.
- « Mentore vérifiée », « Mentor vérifié » ou « Badge mentor vérifié » selon le genre renseigné.
- Messages de validation bruts (anglais, Zod) remplacés par des messages français traduisibles.
- Cibles tactiles portées à 44 px dans les composants partagés (bouton `sm`, onglets, cases à cocher, liens seuls).

**Mentorat, accueil, notifications**
- Le pavé horaire garde les minutes (« 18:30 ») ; la carte de l'accueil donne le jour.
- Les mentors sans créneau passent en fin de catalogue ; domaines traduits sous `/en`.
- Disponibilités : le chevauchement s'affiche sous le jour fautif, pastilles bordées de rouge, défilement jusqu'à l'erreur ; interrupteurs de 44 × 44 px.
- Le mentor qui ouvre une séance refusée lit un texte qui le concerne ; une séance passée s'intitule « Séance terminée », sans lien de visio.
- Après un retrait de badge, l'écran du badge l'explique, avec le motif.
- Un seul bouton indigo sur « Demandes reçues ».

**Hackathons**
- Tranché le 14 novembre : l’organisateur ne participe pas à son propre hackathon. Le serveur refuse son inscription, seul ou en équipe, et son invitation dans une équipe ; l’écran affiche « Tu organises ce hackathon » au lieu de « Participer ».
- Un départ laisse « X a quitté le groupe » dans la discussion, et la passation au nouveau chef d'équipe ; la personne concernée est prévenue.
- Les jurés sont prévenus au passage au jury ; « Clore maintenant » passe par le même chemin que la fin normale.
- Un hackathon en jury sans solution peut se terminer, sans classement.
- Charte : un seul bouton indigo par écran, maïs retiré hors Rise-Up.
- Champs Début et Fin l'un sous l'autre sur téléphone ; compteur du jury lisible ; « Pas encore publié » au lieu de « Inscriptions closes ».
- La notification d'une invitation annulée disparaît ; noms d'équipe comparés sans tenir compte de la casse.
- Pluriels, tutoiement, niveau traduit sous `/en`.

**Tests d'apps et Africa Rise-Up**
- Puce « Autre » dans les filtres Rise-Up.
- Un événement programmé peut être annulé (rappel supprimé, membres prévenus), avec des textes qui parlent d'événement et non de salon.
- Les erreurs du formulaire de test ne s'affichent plus deux fois ; plus d'erreur d'hydratation sur la page des rapports.
- Heures d'un événement dans le fuseau du profil partout.
- Plus de notification en double après quitter puis rejoindre ; pour un événement à moins d'une heure, l'annonce tient lieu de rappel.
- Le serveur n'accepte plus que les valeurs proposées par le formulaire (5, 8, 10 ou 20 testeurs ; 10, 15 ou 30 min).

**Messagerie, annuaire, administration**
- Lignes système, message retiré par la modération, motifs de signalement et journal d'administration traduits sous `/en`, y compris les anciennes lignes, sans toucher aux messages des membres ; journal sans codes bruts.
- En direct : tous les membres voient un ajout au groupe ; la personne bloquée est prévenue, sans « Réessayer » inutile ; un membre suspendu est renvoyé vers la connexion.
- Après un déblocage, les deux membres redeviennent contacts.
- La boîte de réception relit les non-lus en revenant d'une conversation.
- Pièces jointes : fichier de plus de 2 Mo refusé avant l'envoi, fichiers envoyés dans l'ordre, erreur effacée après un envoi réussi.
- « Signaler ce message », « Réessayer » et « Annuler » à 44 px ; puces technos sur plusieurs lignes sur ordinateur ; photos dans les invitations ; accepter depuis la liste ouvre la conversation.

## Ce qui reste

**Reporté (gel des fonctionnalités)**
- Modifier un projet Rise-Up : rien n'existe côté serveur, c'est une fonctionnalité nouvelle.
- Dire qui a annulé une séance de mentorat : la base ne garde pas cette information (migration nécessaire).

**Non reproduit**
- Erreurs d'hydratation vues une fois sur `/mentorat/badge` et sur une conversation (téléphone) : aucune cause trouvée dans le code.

**Questions à trancher par l'équipe**
- Pastille de non-lus sur téléphone : évolution de la barre du bas, hors correctif.
- Formats d'heure : « 18:30 » dans le pavé et le calendrier, « 18 h 30 » dans les phrases.

**Non testé pendant la campagne**
- Verrouillage après 5 essais (connexion, code), « Déconnecter tous mes appareils », changement d'adresse sur `/verifier-email`.
- Contenu du fichier `.ics`, tâches du worker (rappels, expirations) au-delà du passage au jury.
- Décisions « Avertir », « Suspendre » et « Classer sans suite » d'un signalement.
- Vrai Safari iOS et vraie note vocale enregistrée au micro.
