# Améliorations possibles

Tout ce qui pourrait améliorer BP Trainer, au même endroit : motivation, pédagogie, leçons, fonctions, fidélité à UE, ergonomie sur téléphone, technique. Mis à jour le 2026-11-11, après la V4 et une discussion d'idées avec Tristan (séries avec notifications, nouvelles leçons, Enhanced Input et ce qui n'est pas encore géré). Rien ici n'est décidé : une idée ne se réalise que si Tristan la demande.

**Pertinence** : ★★★ change vraiment l'apprentissage ou l'usage quotidien ; ★★ utile ; ★ confort ou cas rare.
**Difficulté** : S, une passe courte ; M, une étape comme celles de la V3 ; L, plusieurs étapes ; XL, un chantier (une nouvelle version).

## Par où commencer

Un ordre proposé, par lots cohérents. À trancher avec Tristan.

| # | Lot | Contenu | Pertinence | Difficulté |
|---|---|---|---|---|
| 1 | Motivation | Objectif du jour, série avec gel, défi du jour, étoiles par leçon, rappels | ★★★ | M |
| 2 | Entrées et contrôle | Enhanced Input, regard indépendant du déplacement, Tick maîtrisé et End Play, avec leurs leçons | ★★★ | M |
| 3 | Synthèse | Leçon de synthèse de la V3, Débogue en série, « Montre-moi » après un échec | ★★★ | M |
| 4 | Données d'un jeu | Data Tables, Actor Components, puis la suite « jeu narratif » pour Station enterrée | ★★★ | L |
| 5 | Au-delà d'un niveau | GameInstance, GameMode, Open Level, Save Game | ★★ | XL |
| 6 | Interface | Widgets (UMG), comme une version à part | ★★★ | XL |

Questions ouvertes : la suite narrative pour Station enterrée passe-t-elle avant une appli plus généraliste ? Quel objectif du jour par défaut (une leçon, ou cinq questions de révision) ?

## Motivation : séries, rappels, défis

La base existe depuis la V4 : l'accueil compte les jours d'affilée (`Progress.days`) et la révision sait ce qui est dû chaque jour.

| Amélioration | Pourquoi et comment | Pertinence | Difficulté |
|---|---|---|---|
| Objectif du jour | La série ne compte que si un objectif choisi est atteint (une leçon, ou cinq questions de révision). C'est ce qui donne du sens au compteur. Réglable : léger, normal, soutenu | ★★★ | S |
| Gel de série | Un joker gagné tous les sept jours (deux au plus), qui sauve la série un jour sans pratique. Une série perdue décourage plus qu'elle ne motive | ★★★ | S |
| Rappel du jour (notification) | « Ta série de 6 jours tient encore : 4 questions à revoir. » Voir « Notifications : ce qui est possible » ci-dessous : faisable, avec des limites selon la voie choisie | ★★★ | M à L |
| Rappel dans l'appli | Sans notification : à l'ouverture, un bandeau dit ce que la série risque et ce qui est dû. Marche partout, sans autorisation à demander | ★★ | S |
| Défi du jour | Un petit exercice tiré chaque jour (un Prédis, un Débogue, un graphe à compléter), le même pour la journée (graine = la date). Meilleur moteur de retour quotidien ; réutilise les formats existants | ★★★ | M |
| Étoiles par leçon | Une étoile : réussie. Deux : sans indice. Trois : avec la notion visée et les tests de robustesse. Tout est déjà mesuré ; il manque le compte des indices par leçon | ★★★ | S à M |
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
| Suite « jeu narratif » | Calquée sur Station enterrée : objet à examiner, dialogue ligne à ligne, porte à code, journal de quêtes par faits acquis (Set de Name), inventaire en composant. Demande les Data Tables | ★★★ | L |
| Débogue en série | Des bugs réalistes non couverts : timer jamais arrêté, Bind fait deux fois, For Each qui retire des éléments pendant le parcours, Delay dans une boucle, Tick qui continue sur un acteur caché | ★★★ | S chacun |
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
| Autres règles de conseil | Cast sur Tick, référence lue sans Is Valid, variable jamais lue, Custom Event jamais appelé | ★★ | S chacune |
| Plus de questions de révision | Une seule question par leçon aujourd'hui : deux ou trois, sous des angles différents, pour qu'on ne retienne pas la réponse par cœur | ★★ | S (contenu) |
| Questions de révision sur un graphe | Montrer un petit graphe dans la question, au lieu d'un texte seul | ★★ | M |
| Mémo : autres fiches | Réplication (multijoueur), Blueprint ou C++, Gameplay Tags, sous-systèmes, packaging | ★ | S chacune |
| Durée et prérequis par leçon | « 10 min · après Cast To » sur chaque carte du parcours | ★ | S |
| Défi partageable | Exporter un projet comme exercice, avec son énoncé, pour quelqu'un d'autre | ★ | M |

## Fonctions et fidélité à UE

| Amélioration | Pourquoi | Pertinence | Difficulté |
|---|---|---|---|
| Enhanced Input | UE5 passe par des Input Actions. Assets Input Action (Bool, Axis2D) et Input Mapping Context dans le Content Browser ; nœud Add Mapping Context ; événement de l'action avec Started, Triggered, Completed et Action Value. Les touches et le joystick de Play deviennent des entrées du Mapping Context. Les événements de touche directs restent pour les premières leçons | ★★★ | M |
| Regard indépendant du déplacement | Le joueur regarde là où il marche : viser avec un Line Trace oblige à bouger. Un second manche, ou tourner sur place | ★★★ | S à M |
| Tick maîtrisé | Set Actor Tick Enabled, Tick Interval, Start with Tick Enabled, Event End Play (avec End Play Reason), Set Timer by Function Name | ★★ | S |
| Data Tables | Dialogues, fiches d'objets, quêtes : la base d'un jeu narratif. Asset avec des lignes d'une structure, Get Data Table Row (Row Found / Not Found), Get Data Table Row Names | ★★★ | M à L |
| Actor Components | Un morceau de logique réutilisable ajouté à plusieurs Blueprints (santé, inventaire) : la vraie réponse à la logique copiée. Un nouveau type de classe, avec Get Owner et Get Component by Class | ★★★ | L |
| Gate : Start Closed | Dans l'appli il est décoché par défaut ; la macro d'UE le coche, sauf erreur. À vérifier dans UE puis corriger (aucune leçon n'en dépend, P7 le coche explicitement) | ★★ | S |
| Sons | Play Sound 2D avec quelques sons intégrés. Rend les retours perceptibles et sert dans presque tous les vrais Blueprints | ★★ | S à M |
| Macros et Collapse | Macros de l'utilisateur, « Collapse to Function », « Collapse to Macro » : ranger un graphe qui grossit | ★★ | M à L |
| Copier-coller entre graphes | Aujourd'hui on duplique dans un même graphe seulement | ★★ | M |
| Find References | Où cette variable, cette fonction est-elle utilisée ? La recherche existe déjà pour les explications | ★★ | S à M |
| Timeline complet | Points clés arrondis (Auto), pistes Vector, Color et Event, Play Rate, Set Timeline Length | ★★ | M |
| Sweep et racine au choix | Sweep sur Set Actor Location et Add Actor World Offset. Dans UE il ne balaie que le composant racine : il faut pouvoir choisir un Static Mesh comme racine | ★★ | M |
| Collision Presets | Réglage par composant et par canal (Block, Overlap, Ignore), au lieu de la seule case « bloque » | ★★ | M |
| Plusieurs niveaux | GameMode, GameInstance, Open Level, Save Game : ce qui survit à un changement de niveau, et ce qui repart de zéro | ★★ | XL |
| Widgets (UMG) | Créer un widget, un texte, un bouton, le mettre à jour par événement : l'interface d'un jeu narratif. Un éditeur à part entière | ★★★ | XL |
| Autres traces | Sphere Trace, Box Trace, Multi Line Trace, Line Trace For Objects | ★ | S à M |
| Autres composants | Sphere Collision, Arrow, Spot Light, Audio | ★ | S chacun |
| Construction Script complet | Créer des composants (Add Static Mesh Component), variables locales du script | ★ | L |
| Débogage avancé | Valeurs surveillées en permanence (Watch), breakpoint sous condition | ★ | M |
| Déplacement d'IA | AI MoveTo simple, sans navigation réelle | ★ | L |
| Physique simulée | Simulate Physics, impulsions | ★ | XL |
| Export collable dans UE | UE accepte des nœuds collés sous forme de texte. À étudier : la fidélité du format n'est pas acquise | ★★ | XL |

## Ergonomie et design sur téléphone

| Amélioration | Pourquoi | Pertinence | Difficulté |
|---|---|---|---|
| Plusieurs projets en Simulation libre | Un seul projet libre aujourd'hui : en créer, nommer, dupliquer, supprimer | ★★ | M |
| Modèles pour la Simulation libre | Partir d'une porte, d'un inventaire, d'un système d'interaction plutôt que d'un projet vide | ★★ | S à M |
| Palette : favoris | Les récents existent (V4) ; épingler ses nœuds préférés | ★ | S |
| Rangement automatique | « Straighten Connections », alignement d'une sélection : les fils se croisent vite au doigt | ★★ | M |
| Lecture en portrait | L'accueil, le carnet, la révision et le mémo se lisent en portrait ; la fiche de leçon pourrait aussi | ★ | M |
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

- V4 (11 novembre 2026) : objectifs visibles et Vérifier sans ouvrir la fiche, sauvegarde complète dans un fichier, solution de référence ouvrable, écran allumé pendant Play, révision espacée, fiches de nœuds consultables (index des nœuds), mémo UE, numéro de version visible, reprendre où on en était, récents dans la palette, jours d'affilée, trois Prédis de plus.
- Retours sur la qualité des solutions (noté le 6 novembre 2026) : notion visée non bloquante, scénarios de robustesse, conseils de construction, autres façons de faire. Étape E de la V3.
- Variables locales, paramètres et sorties des fonctions d'interface, conversion d'un Custom Event en événement d'interface. Étape A de la V3.
- Structures, Map, Set, Text, Name. Étape B de la V3.
- Timeline, Lerp, Construction Script, flèches de références dans le niveau. Étape C de la V3.
- Line Trace By Channel, Event Hit. Étape D de la V3.
- Variable d'instance modifiable pendant Play, objet débogué choisi dans le niveau : Outliner en direct, étape 4 de la V1.
- Retours haptiques (10 novembre 2026).
