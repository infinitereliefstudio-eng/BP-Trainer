# Améliorations possibles

Tout ce qui pourrait améliorer BP Trainer, au même endroit : motivation, pédagogie, leçons, fonctions, fidélité à UE, ergonomie sur téléphone, technique. Mis à jour le 2026-11-17 après la V7.1 et la revue du code, de l'application et du backlog par Codex. Les remarques de cette revue sont détaillées ci-dessous, avec leur niveau de vérification. Tristan a demandé leur ajout au backlog et sa publication ; cela ne vaut pas lancement de leur implémentation. L'ordre proposé reste à valider pour les prochains travaux.

**Pertinence** : ★★★ change vraiment l'apprentissage ou l'usage quotidien ; ★★ utile ; ★ confort ou cas rare.
**Difficulté** : S, une passe courte ; M, une étape comme celles de la V3 ; L, plusieurs étapes ; XL, un chantier (une nouvelle version).

## Par où commencer

Ordre proposé après la revue du 17 novembre : consolider les données et l'apprentissage avant d'élargir encore la bibliothèque. Les fonctionnalités déjà livrées restent acquises ; les lots ci-dessous sont des travaux futurs.

| # | Lot | Contenu | Pertinence | Difficulté |
|---|---|---|---|---|
| 1 | Fiabilité | Sauvegardes, imports, migrations, cohérence des stockages, tests du hors ligne et des mises à jour | ★★★ | M à L |
| 2 | Navigation et prise en main | Recherche dans les 87 étapes, filtres, prérequis, durée, gestes guidés et diagnostic « Montre-moi » | ★★★ | M |
| 3 | Autonomie et transfert vers UE | Exercices guidés puis variantes autonomes différées, révisions variées, projets de synthèse et passerelles vers Unreal | ★★★ | M à L |
| 4 | Entrées et contrôle | Enhanced Input et regard indépendant du déplacement ; Tick maîtrisé et End Play en complément | ★★★ | M |
| 5 | Composition | Actor Components et exercices de découpage et de réutilisation (santé, inventaire, interaction, énergie) | ★★★ | L |
| 6 | Cycle de vie et niveaux | Plusieurs niveaux, Open Level, GameInstance, GameMode léger ; articulation avec Save Game déjà livré | ★★★ | L |
| 7 | Interface de jeu | D'abord quelques widgets prédéfinis (texte, bouton, jauge), puis réévaluer le besoin d'un éditeur UMG complet | ★★★ | M pour le périmètre initial, XL pour l'éditeur |
| 8 | Motivation et diffusion | Objectif du jour, séries avec gel, rappels, enrichissements secondaires et diffusion plus large | ★★ à ★★★ | Selon les fonctions retenues |

Questions ouvertes : la suite narrative pour Station enterrée passe-t-elle avant une appli plus généraliste ? Quel objectif du jour par défaut (une leçon, ou cinq questions de révision) ?

## Revue du 17 novembre 2026 — remarques et suites proposées

### Périmètre et éléments à conserver

Revue de la V7.1.0, commit `b0c2ddd4d3f9f74fd87cac86608bf0c860825336` : organisation du code, moteur, stockage, définitions de leçons, plans et backlog ; parcours de l'interface web et essai de l'exercice « Sequence et Delay ». Ce n'est pas une validation manuelle exhaustive des 87 étapes ni un essai de l'APK sur Android.

Vérifications effectuées sur cet état : **773 tests réussis dans 24 fichiers**, TypeScript et build réussis, lint sans erreur bloquante (un avertissement de simplification dans `behaviors/math.ts` et une configuration Biome dépréciée). Le dernier déploiement GitHub de ce commit était réussi. Ces résultats décrivent la version relue ; ils ne constituent pas une preuve générale de fidélité à UE ou de fonctionnement natif. Les vérifications temporaires d'audit ont été supprimées après la revue ; les régressions utiles devront être ajoutées lors des corrections.

Principes à conserver dans les évolutions :

- séparation `core` / éditeur / interface / stockage, avec un cœur sans DOM ;
- définition déclarative de chaque nœud séparée de son comportement ;
- même moteur pour Play et les scénarios de validation, sans cas particuliers de leçon ;
- solution de référence testée pour chaque leçon ; formats Prédis, Débogue, Complète et Refactor ;
- explications « Pourquoi ? » et diagnostic des nœuds non exécutés ;
- notion visée distincte de la réussite comportementale, pour accepter d'autres solutions ;
- fonctionnement local, export et sauvegarde complète.

**Pas de changement de framework proposé** : Preact, TypeScript et Canvas conviennent au projet. Le build mesuré est d'environ 1,17 Mo, soit 360 Ko compressés. Conserver le fichier autonome tant qu'une mesure sur téléphone ne démontre pas un problème de démarrage ; le découpage des téléchargements n'est pas une priorité en soi.

### Données : corrections prioritaires

« Reproduit » désigne un cas vérifié par un test temporaire sur le code. « Lecture du code » désigne un risque ou un comportement identifié, sans reproduction complète dans l'APK. Les priorités sont des propositions, pas des travaux déjà réalisés.

| ID | Priorité / constat | Vérification et conséquence | Travail proposé et critère d'acceptation |
|---|---|---|---|
| D1 | Haute — un projet enregistré illisible ou trop récent est traité comme absent | Reproduit pour un format plus récent : `loadSavedProject()` renvoie `null`. Par lecture de `openWorkspace()`, l'absence entraîne la création puis l'enregistrement d'un projet neuf à la même clé, avec risque d'écraser l'original | Distinguer absent, incompatible et endommagé ; conserver l'original et proposer export/récupération. Aucun chargement refusé ne doit remplacer silencieusement les données |
| D2 | Haute — secours localStorage masqué par une valeur IndexedDB ancienne | Reproduit : version 1 en IndexedDB, écriture de la version 2 refusée, secours localStorage réussi, puis relecture de la version 1 | Une seule politique de stockage avec révision/date ou stockage actif explicite ; centraliser la stratégie actuellement répétée dans `persistence.ts` et `backup.ts`. Après une écriture de secours, relire et exporter la valeur la plus récente |
| D3 | Haute — imports insuffisamment validés | Reproduit : une classe avec `graphs: []` passe `parseProject()` puis échoue à la construction du store ; une progression avec `done: []` et `read: 17` passe `parseBackup()` | Valider la structure complète des projets et progressions, les types et les références nécessaires à l'ouverture, avant toute écriture. Refuser proprement un fichier mal formé sans modifier le stockage |
| D4 | Moyenne — timer de sauvegarde encore actif après fermeture d'un espace | Reproduit : le nettoyage de `startAutosave()` laisse le timer différé en attente. Risque de recharger un état ancien lors d'une réouverture rapide | Sauvegarde finale coordonnée à la sortie, nettoyage du timer et ordre des écritures maîtrisé. Tester modification, retour accueil et réouverture immédiate |
| D5 | Haute — slots Save Game persistés seulement à Stop | Lecture du code : les slots changent pendant Play, mais `store.saveSlotsChanged()` est appelé à Stop. Une fermeture par Android pendant Play risque de perdre les dernières écritures | Notifier et persister les changements de slots avec regroupement des écritures ; gérer le passage en arrière-plan. Vérifier sur Android la fermeture/reprise sans Stop et distinguer le slot simulé de sa persistance sur l'appareil |
| D6 | Moyenne — réussite IndexedDB annoncée avant validation de la transaction | Lecture du code : `idb.run()` résout à `req.onsuccess`, sans attendre explicitement `tx.oncomplete` | Attendre la transaction pour les écritures et gérer abort/error ; tester une requête réussie suivie d'une transaction avortée |
| D7 | Moyenne — erreurs de sauvegarde de progression masquées | Lecture du code : `saveProgress()` absorbe les erreurs | Conserver la progression en mémoire et signaler clairement qu'elle n'est pas enregistrée ; proposer un nouvel essai ou un export, sans donner une fausse impression de réussite |
| D8 | Moyenne — restauration complète non atomique | Lecture du code : les entrées sont écrites une par une ; un échec peut laisser une restauration partielle | Validation intégrale puis transaction groupée quand possible, ou procédure de récupération explicite ; conserver un état récupérable en cas d'échec à mi-parcours |

Fichiers concernés : `src/storage/persistence.ts`, `src/storage/idb.ts`, `src/storage/backup.ts`, `src/core/serialization/serialize.ts`, `src/ui/workspace.ts`, `src/ui/App.tsx`, `src/core/runtime/simulation.ts`.

### Hors ligne et mises à jour

Constats par lecture de `public/sw.js` et du smoke test ; à reproduire et valider sur Android :

| ID | Point à traiter | Résultat attendu |
|---|---|---|
| H1 | Une réponse HTTP 500 est renvoyée même lorsqu'une page fonctionnelle existe en cache ; le secours actuel couvre surtout erreur réseau et délai dépassé | Définir les erreurs HTTP qui doivent utiliser la dernière version fonctionnelle et tester ce comportement |
| H2 | L'activation supprime tous les caches dont le nom diffère du cache courant | Ne supprimer que les anciens caches appartenant à BP Trainer ; préserver ceux d'une autre application sur le même domaine GitHub Pages |
| H3 | Manifeste et icônes servis en cache prioritaire, avec nom de cache fixe | Prévoir leur invalidation/versionnement ; vérifier qu'une mise à jour modifie aussi ces ressources |
| H4 | `tools/e2e/smoke.py` ouvre le build en `file://`, où le service worker n'est pas enregistré | Ajouter une suite servie en HTTP localhost ou HTTPS pour vérifier service worker, cache et mises à jour ; conserver les tests d'interface existants |
| H5 | Numéro de version visible mais pas de parcours de mise à jour explicite | Message « nouvelle version disponible » ; terminer la sauvegarde avant de proposer le rechargement |

Scénarios d'acceptation : première ouverture en ligne, fermeture et réouverture hors ligne ; mise à jour d'une installation existante ; réseau lent et erreur serveur ; conservation des projets et de la progression après mise à jour ; export puis restauration sur un appareil vierge. L'essai web et le smoke test ne remplacent pas les essais dans l'APK.

### Architecture et garde-fous de simulation

| Amélioration | Constat / proposition | Pertinence | Difficulté |
|---|---|---|---|
| Découper les responsabilités lors des prochains travaux | À la revue : `interpreter.ts` 754 lignes (appels, lecture des données, exécution, débogage), `simulation.ts` 637 (cycle de vie, entrées, phases), `App.tsx` 495 (Play, vérification, navigation/panneaux), `LessonSheet.tsx` 517 (lecture, indices, résultats, qualité). Découper selon ces responsabilités quand elles sont modifiées, sans refonte motivée seulement par la taille | ★★ | M par lot |
| Versionner aussi les comportements et les leçons | Le format de fichier est versionné, mais les nouveaux défauts Gate et Consume Input peuvent changer des graphes enregistrés sans modification visible. Distinguer format, règles de simulation et révision du projet initial d'une leçon ; décider des migrations ou avertissements nécessaires | ★★★ | M à L |
| Borner les journaux de longues sessions | `runtime/journal.ts` limite les messages écran et replie les erreurs répétées, mais accumule les Print String ordinaires. Un Print sur Tick peut faire grossir la mémoire | ★★ | S à M |

Pour les journaux, dissocier la conservation bornée pour l'affichage des compteurs ou données nécessaires aux vérifications : limiter le log ne doit pas rendre les leçons faussement réussies ou échouées.

### Fidélité à UE : une référence indépendante

Les nombreux tests protègent contre les régressions internes, mais les leçons et leurs résultats reposent sur le même moteur. Une règle erronée peut donc être cohérente avec tous les tests. Construire une petite batterie de graphes exécutés dans **une version précise d'Unreal**, avec graphe UE, résultat attendu, version vérifiée et équivalent BP Trainer.

Cas à couvrir : nœuds purs et sorties utilisées plusieurs fois ; copies/références des tableaux et structures ; fonctions et locales ; Delay et timers ; dispatchers ; héritage ; destruction ; entrées et Consume Input. Conserver les mêmes noms de nœuds et pins que dans UE, et documenter les simplifications du simulateur.

Point à vérifier, **pas un bug UE tranché par la revue** : l'évaluation des nœuds purs présente des descriptions publiées différentes selon les dates et contextes. Comparer dans la version cible le même nœud lu par plusieurs consommateurs et plusieurs pins d'un même consommateur ; ne pas changer le moteur sur la seule base d'un texte général. Sources consultées : [Richard Hinckley, 2020](https://forums.unrealengine.com/t/pure-node-evaluation/146473/6), [Dave Jones / Epic, 2025](https://forums.unrealengine.com/t/new-show-exec-pin-and-what-it-does-exactly/2533784/3).

Compléter les vérifications de leçons par plusieurs permutations d'acteurs à graines fixes, en plus des ordres normal et inverse : ces deux ordres ne couvrent pas toutes les dépendances entre trois acteurs ou plus. Garder les graines dans les résultats pour reproduire un échec.

La revue n'a pas confirmé le soupçon de validation malgré des erreurs d'exécution : toutes les leçons hors Prédis comportent déjà la vérification d'absence d'erreurs. Conserver cette garantie. Les Prédis ont leurs vérifications spécifiques ; ne pas transformer ce soupçon écarté en bug à corriger.

### Apprentissage : passer de la réussite guidée à l'autonomie

Proposition de parcours pour une même notion : **guidé → transfert → autonomie différée**. Exemple : porte à Timeline avec plan détaillé ; projecteur utilisant la même notion avec moins d'aide ; nouvelle situation quelques jours plus tard sans liste de nœuds. Réutiliser les formats existants plutôt qu'augmenter seulement le nombre d'étapes.

| Amélioration | Travail proposé | Pertinence | Difficulté |
|---|---|---|---|
| Prérequis et durée visibles | Sur les cartes des 87 étapes, indiquer les acquis nécessaires et une durée indicative ; conserver l'accès libre aux niveaux | ★★★ | S à M |
| Recherche et filtres du parcours | Par notion, format, durée, déjà réussi et à reprendre ; les quatre niveaux ne suffisent plus pour retrouver un exercice | ★★★ | M |
| Révision variée | Deux ou trois questions par notion, sous des angles différents, dont de petits graphes à lire ; éviter de mesurer seulement la mémorisation d'une réponse | ★★★ | M et contenu |
| Reprise différée des erreurs | Proposer plus tard une variante ciblant l'erreur réellement commise, au-delà de la répétition immédiate de la même question | ★★★ | M |
| Mini-projets autonomes | Cahier des charges sans étapes imposées, validation comportementale et variantes de robustesse ; compléter les synthèses et défis déjà envisagés | ★★★ | M et contenu |
| Diagnostic « Montre-moi » | Depuis un échec, ouvrir et cadrer le graphe sur le nœud concerné ; exploiter les diagnostics existants | ★★★ | M |
| Corriger une formulation de la première leçon | « Un nœud qui n'est sur aucun fil blanc ne s'exécute jamais » est trop général : préciser « un nœud qui possède des pins d'exécution », puis expliquer les nœuds purs au moment approprié. Répercuter dans les supports où la même généralisation apparaît | ★★★ | S |

**Revoir le bilan de qualité** (`core/quality/review.ts`) : le nombre de nœuds comparé aux solutions connues influence actuellement le verdict et les étoiles. Le garder comme indicateur secondaire ; une fonction supplémentaire peut améliorer compréhension et réutilisation. Proposer des critères distincts : fonctionnement, robustesse, notion travaillée, lisibilité (nommage, organisation, duplication, avec prudence) et coût d'exécution (Tick, recherches répétées, traitements inutiles). Ne pas assimiler automatiquement « plus court » à « meilleur ».

Suivre séparément réussite autonome, réussite avec indices et solution consultée, sans transformer l'aide en sanction. La présence d'indices ne doit pas effacer la réussite comportementale ni masquer ce qui reste à retravailler.

**Rendre la passerelle vers Unreal concrète** : pour une leçon, emplacement des nœuds, réglages à effectuer, différences avec la simulation, défi à refaire dans l'éditeur, capture ou petit projet UE de référence quand utile. Ajouter une comparaison « même problème, trois architectures » : référence directe, Event Dispatcher, Blueprint Interface ; montrer qui connaît qui, qui prévient qui, le nombre de destinataires, le remplacement et la testabilité.

### Ergonomie, prochains chantiers et publication

- Tutoriel interactif d'environ deux minutes sur les gestes ; taille du texte réglable ; fiches et révisions en portrait ; vérifier le Retour Android ; alignement/rangement d'une sélection et recherche des références. Ces points prolongent les lignes des sections Pédagogie et Ergonomie.
- Le graphe Canvas n'expose pas ses nœuds et connexions dans l'arbre d'accessibilité observé. Étudier une vue textuelle ou une liste de nœuds navigable, utile aussi pour rechercher et diagnostiquer ; vérifier sur les technologies d'assistance ciblées.
- Prioriser Enhanced Input et le regard indépendant avant d'élargir les contrôles. Actor Components est ensuite une extension à forte valeur pédagogique : santé, inventaire, interaction, énergie et composition en complément de l'héritage.
- Pour UMG, commencer par texte, bouton et jauge prédéfinis, mis à jour par événements ; décider ensuite si un éditeur complet est nécessaire. Plusieurs niveaux et GameInstance restent le chantier sur le cycle de vie ; notifications et diffusion viennent après la fiabilité et l'autonomie.
- Déclencher les vérifications CI aussi sur les pull requests : le workflow relu ne réagit qu'aux push sur `main` et au lancement manuel. Prévoir une prévisualisation distincte de la production pour valider avant la publication suivie par l'APK.
- Nettoyer la documentation courante : `HANDOFF.md` conserve des indications contradictoires (téléphone seul, étape APK encore à faire, anciens éléments en attente). Séparer état actuel, décisions en vigueur et historique. Le présent backlog doit garder les éléments livrés dans l'historique, sans les présenter comme restant à faire.
- Traiter la dépréciation de configuration Biome lors de la maintenance ; examiner l'avertissement de `math.ts` en conservant la sémantique `FMath::Clamp`, sans correction automatique aveugle.

## Motivation : séries, rappels, défis

La base existe depuis la V4 : l'accueil compte les jours d'affilée (`Progress.days`) et la révision sait ce qui est dû chaque jour.

| Amélioration | Pourquoi et comment | Pertinence | Difficulté |
|---|---|---|---|
| Objectif du jour | La série ne compte que si un objectif choisi est atteint (une leçon, ou cinq questions de révision). C'est ce qui donne du sens au compteur. Réglable : léger, normal, soutenu | ★★★ | S |
| Gel de série | Un joker gagné tous les sept jours (deux au plus), qui sauve la série un jour sans pratique. Une série perdue décourage plus qu'elle ne motive | ★★★ | S |
| Rappel du jour (notification) | « Ta série de 6 jours tient encore : 4 questions à revoir. » Voir « Notifications : ce qui est possible » ci-dessous : faisable, avec des limites selon la voie choisie | ★★★ | M à L |
| Rappel dans l'appli | Sans notification : à l'ouverture, un bandeau dit ce que la série risque et ce qui est dû. Marche partout, sans autorisation à demander | ★★ | S |
| Défi du jour | Un petit exercice tiré chaque jour (un Prédis, un Débogue, un graphe à compléter), le même pour la journée (graine = la date). Meilleur moteur de retour quotidien ; réutilise les formats existants | ★★★ | M |
| Progression et bilan par leçon | Le bilan avec étoiles existe depuis V5. Reste à conserver les résultats et l'usage des aides ; distinguer autonomie, indices et solution consultée sans pénaliser l'aide. Revoir les critères de qualité avant de figer un score unique (voir la revue du 17 novembre) | ★★★ | M |
| Maîtrise par notion | Une jauge par notion (Cast, Timeline, Interfaces…) qui monte avec les leçons réussies et les révisions justes, et redescend sans révision. Dit quoi travailler, mieux qu'un total de points | ★★ | M |
| Modificateurs de défi | Rejouer une leçon avec une contrainte : sans Tick, sans Cast, en moins de N nœuds, à 30 images par seconde, ordre des BeginPlay inversé. Le moteur sait déjà vérifier la plupart | ★★ | M |
| Succès | Des badges liés à de vrais acquis (« premier Accessed None réparé », « dix refactors », « un niveau sans indice »), pas à du temps passé | ★★ | S à M |
| Bilan de la semaine | Sur l'accueil : leçons réussies, questions revues, notions qui baissent | ★ | S |
| Examen de fin de niveau | Cinq exercices tirés au hasard, sans indices, pour valider un niveau | ★★ | M |

À éviter : les points d'expérience et les classements, qui récompensent le volume et non la compréhension ; les séries sans gel.

### Notifications : ce qui est possible

L'appli est une PWA empaquetée en APK (Trusted Web Activity). Une page web ne peut pas programmer seule une notification pour plus tard quand elle est fermée. Trois voies :

| Voie | Comment | Limites | Difficulté |
|---|---|---|---|
| A. Synchronisation périodique | Le service worker demande à Chrome de le réveiller de temps en temps (Periodic Background Sync) ; au réveil, il lit la progression et affiche une notification si la série est en jeu | Pas de serveur. Mais Chrome choisit le moment (au mieux une fois par jour, selon l'usage de l'appli) : l'heure n'est pas garantie, et le rappel peut ne pas venir | M |
| B. Web Push | L'appli s'abonne aux notifications ; un petit service envoie un message chaque jour à l'heure choisie | Fiable et à l'heure. Demande un service en ligne (gratuit possible : une tâche planifiée qui envoie les messages) et de garder les abonnements quelque part. Le message ne connaît pas la progression : le service worker complète le texte au réveil | L |
| C. Appli native autour de la page | Remplacer l'APK PWABuilder par une enveloppe (Capacitor) qui programme de vraies notifications locales | Fiable, à l'heure, sans serveur. Mais change la façon de construire et de signer l'APK | L |

Dans les trois cas : demander l'autorisation au bon moment (après une première leçon réussie, pas au lancement), une heure de rappel réglable, un seul rappel par jour, et un réglage pour tout couper. À vérifier dans l'APK installée avant de s'engager : que l'autorisation de notification est bien transmise à l'appli (Android 13 et plus).

Proposition : commencer par le rappel dans l'appli et la voie A, qui ne coûtent aucun service ; passer à B si les rappels s'avèrent trop irréguliers.

## Leçons à ajouter

| Leçon ou série | Contenu | Pertinence | Difficulté |
|---|---|---|---|
| Synthèse de la V3 | Un projet final : porte à Timeline, visée par Line Trace, fiche d'objet en structure, Construction Script | ★★★ | M |
| Suite « jeu narratif » | Calquée sur Station enterrée. Déjà là : objet à examiner et dialogue ligne à ligne en Data Table (V7), porte à code (V3). Reste : journal de quêtes par faits acquis (Set de Name), inventaire en composant (demande les Actor Components), une synthèse qui assemble le tout | ★★★ | M à L |
| Débogue en série | Des bugs réalistes non couverts : For Each qui retire des éléments pendant le parcours, Tick qui continue sur un acteur caché. Déjà couverts : le timer jamais arrêté (D9), le Delay dans une boucle (P2). Écarté : le Bind fait deux fois, sans effet dans UE (un même événement n'est lié qu'une fois) | ★★★ | S chacun |
| Architecture | « Le Blueprint qui fait tout » à découper ; la même logique dans trois Blueprints à sortir dans un parent (puis dans un composant, quand ils existeront) | ★★★ | M |
| Lecture de graphe | Un graphe touffu, trois questions dessus (que vaut X après Y ?). On lit plus de Blueprints qu'on n'en écrit | ★★ | M |
| Performance | Remplacer un Tick par un timer ou un événement, avec un compteur de nœuds exécutés par seconde pour voir la différence | ★★ | M |
| Mini-projets libres | Un cahier des charges, pas d'étapes, validation par le comportement seul | ★★ | M (contenu) |
| Enhanced Input | Voir « Fonctions » : une leçon sur Started / Triggered / Completed, une sur l'oubli d'Add Mapping Context (Débogue) | ★★★ | avec la fonction |
| Plus de Prédis | Map sans test de Return Value, Event Hit répété, Lerp sur Tick, Select, For Loop with Break | ★★ | S chacun |
| Défis vérifiés | Chaque leçon a un défi en fin de fiche, que rien ne vérifie. En faire un second scénario, facultatif | ★★ | M |
| Robustesse et autres façons de faire | Dix leçons ont un « Et si… », cinq une alternative. Étendre aux leçons qui s'y prêtent | ★★ | M (contenu) |

## Pédagogie

| Amélioration | Pourquoi | Pertinence | Difficulté |
|---|---|---|---|
| Montrer le nœud en cause après un échec | Un échec dit quoi, pas où. Bouton « Montre-moi » qui ouvre le graphe sur le nœud concerné (le diagnostic sait déjà le trouver) | ★★★ | M |
| Prise en main guidée des gestes | Un premier écran qui fait faire chaque geste (appui long, tirer un fil, deux doigts) avant la leçon 1 | ★★ | M |
| Pas à pas vers le vrai UE | Pour chaque leçon, où cliquer dans l'éditeur d'UE pour la refaire. Plus utile maintenant que Tristan a un ordinateur | ★★ | M (contenu) |
| Autres règles de conseil | Cast sur Tick, variable jamais lue et Custom Event jamais appelé sont déjà couverts depuis V5. Étudier les compléments pertinents, dont la référence lue sans Is Valid, en évitant les conseils automatiques sans contexte | ★★ | S chacune |
| Plus de questions de révision | Une seule question par leçon aujourd'hui : deux ou trois, sous des angles différents, pour qu'on ne retienne pas la réponse par cœur | ★★ | S (contenu) |
| Questions de révision sur un graphe | Montrer un petit graphe dans la question, au lieu d'un texte seul | ★★ | M |
| Mémo : autres fiches | Réplication (multijoueur), Blueprint ou C++, Gameplay Tags, sous-systèmes, packaging | ★ | S chacune |
| Durée et prérequis par leçon | « 10 min · après Cast To » sur chaque carte du parcours ; complétés par recherche et filtres (revue du 17 novembre) | ★★★ | S à M |
| Défi partageable | Exporter un projet comme exercice, avec son énoncé, pour quelqu'un d'autre | ★ | M |

## Fonctions et fidélité à UE

| Amélioration | Pourquoi | Pertinence | Difficulté |
|---|---|---|---|
| Enhanced Input | UE5 passe par des Input Actions. Assets Input Action (Bool, Axis2D) et Input Mapping Context dans le Content Browser ; nœud Add Mapping Context ; événement de l'action avec Started, Triggered, Completed et Action Value. Les touches et le joystick de Play deviennent des entrées du Mapping Context. Les événements de touche directs restent pour les premières leçons | ★★★ | M |
| Regard indépendant du déplacement | Le joueur regarde là où il marche : viser avec un Line Trace oblige à bouger. Un second manche, ou tourner sur place | ★★★ | S à M |
| Tick maîtrisé | Set Actor Tick Enabled, Tick Interval, Start with Tick Enabled, Event End Play (avec End Play Reason), Set Timer by Function Name | ★★ | S |
| Actor Components | Un morceau de logique réutilisable ajouté à plusieurs Blueprints (santé, inventaire) : la vraie réponse à la logique copiée. Un nouveau type de classe, avec Get Owner et Get Component by Class | ★★★ | L |
| Sons | Play Sound 2D avec quelques sons intégrés. Rend les retours perceptibles et sert dans presque tous les vrais Blueprints | ★★ | S à M |
| Macros et Collapse | Macros de l'utilisateur, « Collapse to Function », « Collapse to Macro » : ranger un graphe qui grossit | ★★ | M à L |
| Copier-coller entre graphes | Aujourd'hui on duplique dans un même graphe seulement | ★★ | M |
| Find References | Où cette variable, cette fonction est-elle utilisée ? La recherche existe déjà pour les explications | ★★ | S à M |
| Timeline complet | Points clés arrondis (Auto), pistes Vector, Color et Event, Play Rate, Set Timeline Length | ★★ | M |
| Sweep et racine au choix | Sweep sur Set Actor Location et Add Actor World Offset. Dans UE il ne balaie que le composant racine : il faut pouvoir choisir un Static Mesh comme racine | ★★ | M |
| Collision Presets | Réglage par composant et par canal (Block, Overlap, Ignore), au lieu de la seule case « bloque » | ★★ | M |
| Data Tables : la suite | Import d'un CSV dans une table, Data Assets, Get Data Table Column as String | ★ | S à M |
| Save Game : la suite | Versions Async des nœuds, Delete Game in Slot dans un exercice, les deux exercices restants de l'étape 1 | ★★ | S |
| Plusieurs niveaux | Open Level, GameInstance, GameMode léger : ce qui survit à un changement de niveau, et ce qui repart de zéro. Voir « Sauvegarde et niveaux », étape 2 | ★★★ | L |
| Widgets (UMG) | Commencer par quelques widgets prédéfinis (texte, bouton, jauge), mis à jour par événement, puis réévaluer la nécessité d'un éditeur complet | ★★★ | M initialement, XL pour l'éditeur |
| Autres traces | Sphere Trace, Box Trace, Multi Line Trace, Line Trace For Objects | ★ | S à M |
| Autres composants | Sphere Collision, Arrow, Spot Light, Audio | ★ | S chacun |
| Construction Script complet | Créer des composants (Add Static Mesh Component), variables locales du script | ★ | L |
| Débogage avancé | Valeurs surveillées en permanence (Watch), breakpoint sous condition | ★ | M |
| Déplacement d'IA | AI MoveTo simple, sans navigation réelle | ★ | L |
| Physique simulée | Simulate Physics, impulsions | ★ | XL |
| Export collable dans UE | UE accepte des nœuds collés sous forme de texte. À étudier : la fidélité du format n'est pas acquise | ★★ | XL |

## Sauvegarde et niveaux

Demandé par Tristan le 2026-11-11 : des exercices sur Save Game, le chargement d'un niveau, etc.

### Étape 1 : Save Game seul — fait (V7, 2026-11-17)

Les slots sont gardés avec le projet (`Project.saveSlots`) : ils survivent à Stop, partent avec un export, et Annuler ne les touche pas. Faits : la tirelire, D17, D18, P11, le checkpoint. Restent les deux dernières lignes du tableau.

- Un nouveau type d'asset : une classe **SaveGame**, qui ne contient que des variables (pas de graphe, pas de composants), créée depuis le Content Browser.
- Les nœuds d'UE : Create Save Game Object, Save Game to Slot, Load Game from Slot, Does Save Game Exist, Delete Game in Slot ; Cast To vers la classe SaveGame.
- Les slots survivent à Stop : ce qu'une partie a sauvé est là à la suivante. Un panneau « Slots de sauvegarde » montre leur contenu et permet de les vider (n'existe pas dans UE, mais aide à comprendre). Décision livrée en V7 : ils sont gardés avec le projet et partent avec l'export. Reste la persistance si l'application est fermée pendant Play (D5).
- Scénario des leçons : une nouvelle étape « arrêter et relancer la partie », qui garde les slots ; les vérifications portent sur ce que la seconde partie a retrouvé.

| Exercice | Ce qu'il apprend |
|---|---|
| ~~Le compteur de pièces qui survit~~ (la tirelire) | Créer, remplir, sauver ; charger au BeginPlay |
| ~~Débogue : la première partie plante~~ (D17) | Load sans Does Save Game Exist renvoie None, puis Accessed None |
| ~~Débogue : la sauvegarde vide~~ (D18, le record à zéro) | Save Game to Slot appelé avant d'avoir rempli les variables |
| ~~Prédis : Load, Cast, lecture~~ (P11) | Le Cast raté quand le slot contient une autre classe |
| ~~Le checkpoint~~ | Sauver la position et l'état à un endroit précis, pas à chaque Tick |
| La porte ouverte qui le reste | On ne sauve pas une référence d'acteur, mais un identifiant et un état |
| Refactor : un seul objet de sauvegarde | Trois Blueprints qui écrivent chacun leur slot, à regrouper |

### Étape 2 : plusieurs niveaux et GameInstance (L)

- Plusieurs niveaux par projet (`Project.level` devient une liste : changement de format et migration), un sélecteur dans l'onglet Niveau, le nœud Open Level (by Name).
- **GameInstance** : une classe choisie dans les réglages du projet, obtenue par Get Game Instance, seule à garder ses variables d'un niveau à l'autre.
- **GameMode** en version légère : la classe du pion par défaut, par niveau.
- Scénario des leçons : les vérifications doivent pouvoir porter sur le niveau courant après un Open Level.

| Exercice | Ce qu'il apprend |
|---|---|
| Le couloir : passer une porte charge le niveau suivant | Open Level détruit tous les acteurs du niveau |
| Prédis : que vaut le score après Open Level ? | Les variables du joueur repartent de leur valeur par défaut |
| Garder l'inventaire entre deux niveaux | GameInstance comme mémoire de la session |
| Arriver par la bonne porte | Dire au niveau suivant d'où l'on vient (un Name dans le GameInstance) |
| Débogue : l'objet ramassé réapparaît | L'état du monde doit être gardé hors du niveau |
| Synthèse : quitter, relancer, reprendre au bon niveau | GameInstance pour la session, SaveGame pour le disque |

Non simulés actuellement, expliqués ou à expliquer dans le mémo : les versions Async des nœuds de sauvegarde (évolution possible ci-dessus) et le chargement de niveaux en streaming.

## Ergonomie et design sur téléphone

| Amélioration | Pourquoi | Pertinence | Difficulté |
|---|---|---|---|
| Plusieurs projets en Simulation libre | Un seul projet libre aujourd'hui : en créer, nommer, dupliquer, supprimer | ★★ | M |
| Modèles pour la Simulation libre | Partir d'une porte, d'un inventaire, d'un système d'interaction plutôt que d'un projet vide | ★★ | S à M |
| Palette : favoris | Les récents existent (V4) ; épingler ses nœuds préférés | ★ | S |
| Rangement automatique | « Straighten Connections », alignement d'une sélection : les fils se croisent vite au doigt | ★★ | M |
| Lecture en portrait | Adapter les fiches et révisions, et vérifier leur accès dans l'APK dont le manifeste impose actuellement le paysage ; distinguer adaptation web et orientation effective sur Android | ★★ | M |
| Niveau : tourner un acteur au doigt | Aujourd'hui la rotation passe par Details | ★ | S à M |
| Icônes des nœuds | Le « f » des fonctions, l'horloge existe déjà : rapprocher encore le dessin de celui d'UE | ★ | S à M |
| Taille du texte réglable | Les valeurs sur les pins sont petites sur un écran de téléphone | ★ | S à M |
| Retouches | Menu ⋮ trop étroit (« Ordre des BeginPlay » sur trois lignes) ; le « 0 » de l'axe sous le premier point clé du Timeline ; le bouton Save d'un projet d'essai enregistre pour rien ; force des vibrations à régler sur l'appareil ; pendant une séance de révision, l'en-tête de l'accueil prend la moitié de l'écran en paysage | ★ | S |

## Données, publication et technique

| Amélioration | Pourquoi | Pertinence | Difficulté |
|---|---|---|---|
| Vérifier export et import dans l'APK | La sauvegarde complète (V4) passe par le partage Android : jamais confirmé dans l'APK installée | ★★ | S |
| Message « nouvelle version » | Le numéro de version est visible (V4) ; prévenir quand le site a changé et proposer de recharger | ★★ | S |
| Rappel de sauvegarde | Proposer un export quand le dernier date de plus d'un mois | ★ | S |
| Intégration continue | Les actions GitHub utilisées ciblent Node 20, déprécié (avertissement à chaque exécution) ; `ubuntu-latest` change d'image. Monter les versions avant que ça casse le déploiement | ★★ | S |
| Smoke test sans Python | Le test sur téléphone simulé ne tourne que dans la CI (pas de Python sur la machine de Tristan) : le réécrire avec Playwright pour Node le rendrait lançable partout | ★★ | M |
| Découper `interpreter.ts` | Plus de 700 lignes : séparer fonctions, données et débogueur, comme `simulation.ts` l'a été | ★ | M |
| Test du joystick | Le test sur téléphone simulé ne déplace pas le joueur au doigt | ★ | S à M |
| Performance des grands graphes | Jamais mesurée au-delà des leçons ; à vérifier avec une centaine de nœuds | ★ | M |
| Page de test claude.ai | L'APK suit le site : décider de la garder ou de retirer l'outil et sa mention | ★ | S |
| Publication sur le Play Store | L'APK s'installe à la main. Une fiche, une politique de confidentialité, une période de test fermée | ★ | L (peu de code) |
| Synchronisation entre appareils | Retrouver sa progression ailleurs (téléphone et ordinateur). Demande un compte ou un stockage externe ; la sauvegarde complète le fait à la main | ★★ | L |
| Version anglaise | Textes de l'appli et des leçons | ★ | L (contenu) |

## Déjà fait, noté ici auparavant

- V7.1 (17 novembre 2026) : Consume Input sur les événements de touche et pile des entrées comme dans UE, Débogue D19 (seule la dernière porte s’ouvre).
- V7 (17 novembre 2026) : Data Tables (asset, éditeur de lignes, Get Data Table Row, Get Data Table Row Names, Does Data Table Row Exist) et Save Game (classe SaveGame, slots gardés avec le projet, Create Save Game Object, Save / Load Game to/from Slot, Does Save Game Exist, Delete Game in Slot, étape « relancer la partie » dans les scénarios) ; huit leçons et exercices : le catalogue, D16, le dialogue en Data Table, la tirelire, D17, P11, D18, le checkpoint. Du recueil : E16, E15 et E24 faits. Corrigé avant, en V6.2 : Gate Start Closed coché par défaut.
- V6 (16 novembre 2026) : 16 leçons et exercices tirés du recueil de Tristan (Unbind, registre en Map, vagues, timer annulable, parcours de réseau, dialogue par les données, sac, transaction, annuler / refaire, viseur, miroirs, grille tournée, tirage sans remise, Random Stream), et les nœuds Dot Product, Get Reflection Vector, Snap To Grid, For Each Loop with Break, Random Stream, Transform. E15 et E24 (Save Game) et E16 (Data Tables), encore en attente à la livraison V6, ont depuis été livrés en V7. Du recueil, restent à faire avec leur chantier : E30 (Enhanced Input), E14 (Actor Components), E40 (niveaux, GameInstance), E10, E27, E38 (UMG), E32 (Attach / Detach), E31 (caméras), E28 et E44 (Spline, instances de mesh). Noté au passage : un éditeur dans Details pour remplir un tableau de références sur une instance ; le dispatcher natif OnDestroyed ; Set Actor Transform ; des « Et si… » de plus (deux couples, porte tournée, écart nul).

- V5 (12 novembre 2026) : bilan de la solution (étoiles, taille comparée aux solutions connues, nœuds déconseillés par leçon), autres règles de conseil (nœud jamais exécuté, variable jamais lue, Custom Event jamais appelé, Cast sur Tick…), fiches de notions dans les leçons, Débogue D7 à D9 (dont le timer jamais arrêté), Prédis P9 et P10 (For Loop with Break), trois leçons (Clamp, modulo, For Loop). Reste de ces lignes : étoiles gardées dans la progression, modificateurs de défi.

- V4 (11 novembre 2026) : objectifs visibles et Vérifier sans ouvrir la fiche, sauvegarde complète dans un fichier, solution de référence ouvrable, écran allumé pendant Play, révision espacée, fiches de nœuds consultables (index des nœuds), mémo UE, numéro de version visible, reprendre où on en était, récents dans la palette, jours d'affilée, trois Prédis de plus.
- Retours sur la qualité des solutions (noté le 6 novembre 2026) : notion visée non bloquante, scénarios de robustesse, conseils de construction, autres façons de faire. Étape E de la V3.
- Variables locales, paramètres et sorties des fonctions d'interface, conversion d'un Custom Event en événement d'interface. Étape A de la V3.
- Structures, Map, Set, Text, Name. Étape B de la V3.
- Timeline, Lerp, Construction Script, flèches de références dans le niveau. Étape C de la V3.
- Line Trace By Channel, Event Hit. Étape D de la V3.
- Variable d'instance modifiable pendant Play, objet débogué choisi dans le niveau : Outliner en direct, étape 4 de la V1.
- Retours haptiques (10 novembre 2026).
