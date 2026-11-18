# Améliorations possibles

Tout ce qui pourrait améliorer BP Trainer, au même endroit : fiabilité, pédagogie, leçons, fonctions, fidélité à UE, ergonomie sur téléphone, motivation, technique. Réorganisé le 2026-11-18, puis mis à jour après la V7.2 (lot 1 fait) et la V7.3 (pilote du lot 2) : la revue de Codex du 17 novembre (V7.1) est maintenant fondue dans les sections, les doublons sont fusionnés, et l'ordre des trois premiers lots a été choisi par Tristan. Chaque lot attend son feu vert.

**Pertinence** : ★★★ change vraiment l'apprentissage ou l'usage quotidien ; ★★ utile ; ★ confort ou cas rare.
**Difficulté** : S, une passe courte ; M, une étape comme celles de la V3 ; L, plusieurs étapes ; XL, un chantier (une nouvelle version).

## Par où commencer

Ordre retenu par Tristan le 18 novembre : fiabiliser d'abord, puis l'apprentissage, puis les entrées. Le lot 1 est fait (V7.2), le pilote du lot 2 aussi (V7.3, chaîne Cast To), et Enhanced Input (V7.4, première partie du lot 3). La suite du lot 2 dépendra de ce que donne le pilote ; le reste du lot 3 attend que Tristan approche des leçons du niveau Avancé. Les lots 4 à 8 restent des propositions, à trancher le moment venu.

| # | Lot | Contenu | Pertinence | Difficulté |
|---|---|---|---|---|
| 1 | ~~Fiabilité~~ **fait en V7.2** (sauf H4) | Ne jamais perdre un projet ni une progression ; versionner formats, règles de simulation et leçons ; mises à jour annoncées | ★★★ | M à L |
| 2 | ~~Autonomie et transfert vers UE~~ **pilote fait en V7.3** | Guidé → transfert → autonomie différée, d'abord sur une notion pilote ; prérequis et « Montre-moi » ; passerelle vers l'éditeur d'Unreal | ★★★ | M à L |
| 3 | **Entrées et interaction** (Enhanced Input fait en V7.4) | Enhanced Input, regard indépendant du déplacement, interaction plus complète ; Tick maîtrisé en complément | ★★★ | M |
| 4 | Navigation et prise en main | Recherche et filtres dans les 87 étapes, gestes guidés | ★★★ | M |
| 5 | Composition | Actor Components : santé, inventaire, interaction, énergie | ★★★ | L |
| 6 | Cycle de vie et niveaux | Plusieurs niveaux, Open Level, GameInstance, GameMode léger | ★★★ | L |
| 7 | Interface de jeu | Quelques widgets prédéfinis (texte, bouton, jauge), puis réévaluer un éditeur UMG complet | ★★★ | M, XL pour l'éditeur |
| 8 | Motivation et diffusion | Objectif du jour, série avec gel, rappels, défi du jour | ★★ à ★★★ | S à L |

L'objectif du jour et le gel de série sont deux petites passes (S) : ils peuvent se glisser entre deux lots sans attendre le lot 8.

Questions ouvertes :
- Lot 3 : « interaction plus complète » veut-il dire la version intermédiaire décrite plus bas (Enhanced Input, appui maintenu, surbrillance, invite), ou directement un composant réutilisable, qui demande les Actor Components (lot 5) ?
- La suite narrative pour Station enterrée passe-t-elle avant une appli plus généraliste ?
- Quel objectif du jour par défaut : une leçon, ou cinq questions de révision ?

## Cadre : ce qu'il faut garder

Issus de la revue du 17 novembre (V7.1.0, commit `b0c2ddd`, 773 tests réussis dans 24 fichiers ; ni les 87 étapes ni l'APK n'ont été essayées une à une). À respecter dans tous les lots :

- séparation `core` / éditeur / interface / stockage, avec un cœur sans DOM ;
- définition déclarative de chaque nœud séparée de son comportement ;
- même moteur pour Play et les scénarios de validation, sans cas particuliers de leçon ;
- solution de référence testée pour chaque leçon ; formats Prédis, Débogue, Complète et Refactor ;
- explications « Pourquoi ? » et diagnostic des nœuds non exécutés ;
- notion visée distincte de la réussite comportementale, pour accepter d'autres solutions ;
- toutes les leçons hors Prédis vérifient l'absence d'erreurs d'exécution (le soupçon contraire n'a pas été confirmé) ;
- fonctionnement local, export et sauvegarde complète.

**Pas de changement de framework** : Preact, TypeScript et Canvas conviennent. Le build fait environ 1,17 Mo (360 Ko compressés) ; garder le fichier unique tant qu'une mesure sur téléphone ne montre pas un démarrage lent.

## Lot 1 — Fiabilité : fait en V7.2

D1 à D8, H1, H2, H3, H5 et le versionnement des règles et des leçons sont faits (détail dans « Déjà fait » et dans HANDOFF.md, « V7.2 »). Restent :

| Point | Travail | Pertinence | Difficulté |
|---|---|---|---|
| H4 — Tests du service worker | `tools/e2e/smoke.py` ouvre le build en `file://`, où le service worker n'existe pas. Une suite servie en HTTP dans la CI : enregistrement, cache, page servie hors ligne, bandeau de nouvelle version. Un essai manuel l'a vérifié le 18 novembre, sans l'intégrer | ★★ | M |
| Vérifications dans l'APK | Fermeture par Android pendant Play juste après une sauvegarde de slot ; export et import par le partage Android (jamais confirmés depuis la V4) ; bandeau « Nouvelle version » après une publication ; ouverture hors ligne après la mise à jour du service worker | ★★★ | S (essais de Tristan) |

## Lot 2 — Autonomie et transfert vers UE

**Fait en V7.3 (pilote)** : correction de la première leçon (nœuds purs), aide utilisée mémorisée et affichée, 46 notions de référence avec prérequis, durée indicative, « Montre-moi » (erreurs, fil blanc arrêté, événement muet), format des chaînes guidé → transfert → autonomie avec la chaîne Cast To (leçons 9 et 10, T1 « Le terminal à badge », A1 « Le piège » deux jours après).

Choix du 18 novembre : Tristan en est vers l'étape 10 et ne pratique pas encore dans Unreal. Pilote sur Cast To, qu'il rencontre tout de suite ; passerelle vers UE reportée.

À décider après le pilote (selon ce qu'en dit Tristan) :

| Amélioration | Travail | Pertinence | Difficulté |
|---|---|---|---|
| Autres chaînes | Interfaces en deuxième chaîne (transfert naturel : remplacer un Cast par un message d'interface), puis Branch et variables, Timeline, Event Dispatchers… | ★★★ | M par chaîne (contenu) |
| « Montre-moi » pour les autres échecs | Aujourd'hui tiré de l'exécution (erreur, fil arrêté, événement muet). Pour un comportement faux sans rien de tel, chaque vérification pourrait désigner les nœuds à montrer | ★★ | M et contenu |
| Révision par notion | Les notions existent : regrouper les questions par notion, proposer la révision d'une notion pas revue depuis longtemps | ★★★ | M |
| Révision variée | Deux ou trois questions par notion, sous des angles différents, dont de petits graphes à lire (demande un mini-éditeur en lecture seule) | ★★★ | M et contenu |
| Reprise différée des erreurs | Une étape réussie avec la solution, ou ratée, revient plus tard sous une autre forme (la donnée existe : `passedWith`) | ★★★ | M |
| Mini-projets autonomes | Un cahier des charges sans étapes, validé par le comportement seul, avec variantes de robustesse | ★★★ | M et contenu |
| Passerelle vers Unreal | Pour chaque leçon : où trouver les nœuds dans l'éditeur, réglages, différences avec la simulation, défi à refaire dans UE. Quand Tristan pratiquera dans UE | ★★★ | M (contenu) |
| Même problème, trois architectures | Référence directe, Event Dispatcher, Blueprint Interface : qui connaît qui, qui prévient qui | ★★ | M |
| Revoir le bilan de qualité | Dans `core/quality/review.ts`, le nombre de nœuds pèse sur le verdict et les étoiles. En faire un indicateur secondaire ; critères distincts : fonctionnement, robustesse, notion travaillée, lisibilité, coût d'exécution | ★★ | M |
| Durée affinée | La durée est estimée d'après la taille de la solution ; l'affiner avec le temps réellement passé | ★ | S à M |

## Interface à la manière d'UE (plan validé le 18 novembre)

Principe : mêmes noms, même place relative que l'éditeur d'UE, panneaux en tiroirs, appui long = clic droit ; ambre = propre à BP Trainer.

| Étape | Contenu | État |
|---|---|---|
| 1 | Les deux éditeurs : onglets Niveau + un par Blueprint, barre d'outils de chacun (Class Settings, Class Defaults, Place Actors), onglets Construction Script / Event Graph, poignées Components · My Blueprint et Details, Content Drawer en bas, ambre | **Fait en V7.5** |
| 2 | Content Drawer : + Add avec le menu d'UE (Blueprint Class, Input, Blueprint, Miscellaneous), Pick Parent Class, vignettes par type, ouverture par double toucher, poser un acteur depuis le Drawer | **Fait en V7.6** (dossiers non simulés) |
| 3 | Enhanced Input, point 1 : Player Controller, Get Player Controller / Get Controller, Cast To PlayerController, Enhanced Input Local Player Subsystem, Add Mapping Context avec Target ; leçons mises à jour | À faire |
| 4 | Details à la manière d'UE (sections d'UE d'abord, aide de l'appli dans un bloc ambre repliable) ; palette « All Actions for this Blueprint » avec Context Sensitive et catégories repliables ; Find (Find Results) | À faire |
| 5 | Viewport du Blueprint (composants seuls) ; Outliner permanent dans l'éditeur de niveau (tiroir Outliner / Details) | À faire |

## Lot 3 — Entrées et interaction

| Amélioration | Pourquoi | Pertinence | Difficulté |
|---|---|---|---|
| ~~Enhanced Input~~ **fait en V7.4** | Input Actions (Bool), Mapping Contexts, Add / Remove Mapping Context, déclencheurs Down, Pressed, Released, Hold, cinq sorties, Consume Input, trois étapes. Reste : actions Axis2D et déplacement par Add Movement Input, modificateurs (Negate, Swizzle), déclencheurs Tap, Pulse, Chorded, déclencheurs sur l'asset Input Action, Enhanced Input dans d'autres leçons | ★★★ | M |
| Regard indépendant du déplacement | Viser avec un Line Trace oblige aujourd'hui à bouger : un second manche, ou tourner sur place | ★★★ | S à M |
| Interaction plus complète (version intermédiaire) | Prolonge « Regarder et interagir » (Line Trace + BPI_Interactif) : action IA_Interagir, appui maintenu (déclencheur Hold), surbrillance de l'objet visé, invite « Appuie sur E ». Le composant réutilisable viendra avec les Actor Components (lot 5) | ★★★ | M |
| ~~Leçons Enhanced Input~~ **faites en V7.4** | La lampe en Enhanced Input, D20 (Add Mapping Context oublié), Maintenir pour ouvrir (Hold) | ★★★ | fait |
| Tick maîtrisé | Set Actor Tick Enabled, Tick Interval, Start with Tick Enabled, Event End Play (avec End Play Reason), Set Timer by Function Name | ★★ | S |

## Leçons à ajouter

| Leçon ou série | Contenu | Pertinence | Difficulté |
|---|---|---|---|
| Synthèse de la V3 | Un projet final : porte à Timeline, visée par Line Trace, fiche d'objet en structure, Construction Script | ★★★ | M |
| Suite « jeu narratif » | Calquée sur Station enterrée. Déjà là : objet à examiner et dialogue en Data Table (V7), porte à code (V3). Reste : journal de quêtes par faits acquis (Set de Name), inventaire en composant (demande les Actor Components), une synthèse qui assemble le tout | ★★★ | M à L |
| Débogue en série | For Each qui retire des éléments pendant le parcours, Tick qui continue sur un acteur caché. Déjà couverts : timer jamais arrêté (D9), Delay dans une boucle (P2). Écarté : le Bind fait deux fois, sans effet dans UE | ★★★ | S chacun |
| Architecture | « Le Blueprint qui fait tout » à découper ; la même logique dans trois Blueprints à sortir dans un parent, puis dans un composant | ★★★ | M |
| Lecture de graphe | Un graphe touffu, trois questions dessus (que vaut X après Y ?) | ★★ | M |
| Performance | Remplacer un Tick par un timer ou un événement, avec un compteur de nœuds exécutés par seconde | ★★ | M |
| Plus de Prédis | Map sans test de Return Value, Event Hit répété, Lerp sur Tick, Select, For Loop with Break | ★★ | S chacun |
| Défis vérifiés | Le défi de fin de fiche n'est vérifié par rien : en faire un second scénario, facultatif | ★★ | M |
| Robustesse et autres façons de faire | Dix leçons ont un « Et si… », cinq une alternative : étendre à celles qui s'y prêtent | ★★ | M (contenu) |

Les leçons liées à une fonction (Enhanced Input, Save Game, niveaux) sont rangées avec elle.

## Pédagogie

| Amélioration | Pourquoi | Pertinence | Difficulté |
|---|---|---|---|
| Autres règles de conseil | Cast sur Tick, variable jamais lue et Custom Event jamais appelé existent depuis V5. Étudier la référence lue sans Is Valid, sans conseils automatiques hors contexte | ★★ | S chacune |
| Mémo : autres fiches | Réplication, Blueprint ou C++, Gameplay Tags, sous-systèmes, packaging | ★ | S chacune |
| Défi partageable | Exporter un projet comme exercice, avec son énoncé | ★ | M |

## Fonctions et fidélité à UE

| Amélioration | Pourquoi | Pertinence | Difficulté |
|---|---|---|---|
| Actor Components (lot 5) | Logique réutilisable ajoutée à plusieurs Blueprints (santé, inventaire, interaction, énergie) : la vraie réponse à la logique copiée, en complément de l'héritage. Nouveau type de classe, Get Owner, Get Component by Class. Exercice E14 du recueil | ★★★ | L |
| Widgets UMG (lot 7) | D'abord texte, bouton et jauge prédéfinis, mis à jour par événement ; réévaluer ensuite un éditeur complet. Exercices E10, E27, E38 | ★★★ | M, XL pour l'éditeur |
| Sons | Play Sound 2D avec quelques sons intégrés | ★★ | S à M |
| Macros et Collapse | Macros de l'utilisateur, Collapse to Function, Collapse to Macro | ★★ | M à L |
| Copier-coller entre graphes | Aujourd'hui seulement dans un même graphe | ★★ | M |
| Find References | Où cette variable, cette fonction est-elle utilisée ? | ★★ | S à M |
| Timeline complet | Points clés Auto, pistes Vector, Color et Event, Play Rate, Set Timeline Length | ★★ | M |
| Sweep et racine au choix | Sweep sur Set Actor Location et Add Actor World Offset ; choisir un Static Mesh comme racine | ★★ | M |
| Collision Presets | Block, Overlap, Ignore par composant et par canal | ★★ | M |
| Attach / Detach, caméras | Exercices E32 et E31 du recueil | ★★ | M |
| Spline, instances de mesh | Exercices E28 et E44 du recueil | ★ | M à L |
| Data Tables : la suite | Import CSV, Data Assets, Get Data Table Column as String | ★ | S à M |
| Autres traces | Sphere Trace, Box Trace, Multi Line Trace, Line Trace For Objects | ★ | S à M |
| Autres composants | Sphere Collision, Arrow, Spot Light, Audio | ★ | S chacun |
| Construction Script complet | Add Static Mesh Component, variables locales du script | ★ | L |
| Débogage avancé | Watch permanent, breakpoint conditionnel | ★ | M |
| Déplacement d'IA | AI MoveTo simple, sans navigation réelle | ★ | L |
| Physique simulée | Simulate Physics, impulsions | ★ | XL |
| Export collable dans UE | Nœuds collés sous forme de texte ; la fidélité du format n'est pas acquise | ★★ | XL |

Notés pendant la V6 : un éditeur dans Details pour remplir un tableau de références sur une instance ; le dispatcher natif OnDestroyed ; Set Actor Transform ; des « Et si… » de plus (deux couples, porte tournée, écart nul).

### Une référence indépendante pour la fidélité

Les tests protègent contre les régressions, mais leçons et résultats reposent sur le même moteur : une règle fausse peut passer tous les tests. Construire une petite batterie (10 à 15 graphes) exécutés dans **une version précise d'Unreal** sur l'ordinateur de Tristan : graphe UE, résultat observé, version, équivalent BP Trainer. Cas : nœuds purs lus plusieurs fois, copies et références de tableaux et structures, fonctions et locales, Delay et timers, dispatchers, héritage, destruction, entrées et Consume Input. Documenter les simplifications du simulateur.

L'évaluation des nœuds purs est décrite différemment selon les sources ([Richard Hinckley, 2020](https://forums.unrealengine.com/t/pure-node-evaluation/146473/6) ; [Dave Jones / Epic, 2025](https://forums.unrealengine.com/t/new-show-exec-pin-and-what-it-does-exactly/2533784/3)) : ne changer le moteur qu'après comparaison dans UE.

Compléter aussi les vérifications de leçons par quelques permutations d'acteurs à graines fixes, en plus des ordres normal et inverse, et garder la graine dans le résultat pour reproduire un échec (★★, S).

## Sauvegarde et niveaux

### Étape 1 : Save Game — faite (V7)

Les slots sont gardés avec le projet (`Project.saveSlots`) : ils survivent à Stop et partent avec l'export. Depuis la V7.2, ils sont aussi enregistrés pendant Play, sans attendre Stop. Restent :

| Exercice | Ce qu'il apprend |
|---|---|
| La porte ouverte qui le reste | On ne sauve pas une référence d'acteur, mais un identifiant et un état |
| Refactor : un seul objet de sauvegarde | Trois Blueprints qui écrivent chacun leur slot, à regrouper |
| Save Game : la suite | Versions Async des nœuds, Delete Game in Slot dans un exercice |

### Étape 2 : plusieurs niveaux et GameInstance (lot 6, L)

- Plusieurs niveaux par projet (`Project.level` devient une liste : changement de format et migration), un sélecteur dans l'onglet Niveau, Open Level (by Name).
- **GameInstance** : une classe choisie dans les réglages du projet, obtenue par Get Game Instance, seule à garder ses variables d'un niveau à l'autre.
- **GameMode** léger : la classe du pion par défaut, par niveau.
- Scénarios : les vérifications doivent pouvoir porter sur le niveau courant après un Open Level.
- Exercice E40 du recueil.

| Exercice | Ce qu'il apprend |
|---|---|
| Le couloir : passer une porte charge le niveau suivant | Open Level détruit tous les acteurs du niveau |
| Prédis : que vaut le score après Open Level ? | Les variables du joueur repartent de leur valeur par défaut |
| Garder l'inventaire entre deux niveaux | GameInstance comme mémoire de la session |
| Arriver par la bonne porte | Dire au niveau suivant d'où l'on vient (un Name dans le GameInstance) |
| Débogue : l'objet ramassé réapparaît | L'état du monde doit être gardé hors du niveau |
| Synthèse : quitter, relancer, reprendre au bon niveau | GameInstance pour la session, SaveGame pour le disque |

Non simulés, à expliquer dans le mémo : versions Async des nœuds de sauvegarde, chargement de niveaux en streaming.

## Ergonomie et design sur téléphone

| Amélioration | Pourquoi | Pertinence | Difficulté |
|---|---|---|---|
| Recherche et filtres du parcours (lot 4) | Par notion, format, durée, déjà réussi, à reprendre : quatre niveaux ne suffisent plus pour 87 étapes | ★★★ | M |
| Prise en main des gestes (lot 4) | Deux minutes qui font faire chaque geste (appui long, tirer un fil, deux doigts) avant la leçon 1 | ★★ | M |
| Plusieurs projets en Simulation libre | Créer, nommer, dupliquer, supprimer | ★★ | M |
| Modèles pour la Simulation libre | Partir d'une porte, d'un inventaire, d'un système d'interaction | ★★ | S à M |
| Rangement automatique | Straighten Connections, alignement d'une sélection | ★★ | M |
| Lecture en portrait | Adapter fiches et révisions ; le manifeste impose le paysage dans l'APK : distinguer adaptation web et orientation effective sur Android | ★★ | M |
| Bouton Retour d'Android | Vérifier son comportement dans chaque écran de l'APK | ★★ | S |
| Taille du texte réglable | Les valeurs sur les pins sont petites | ★ | S à M |
| Palette : favoris | Épingler ses nœuds préférés (les récents existent) | ★ | S |
| Niveau : tourner un acteur au doigt | Aujourd'hui par Details | ★ | S à M |
| Icônes des nœuds | Rapprocher encore le dessin de celui d'UE | ★ | S à M |
| Accessibilité du graphe | Le Canvas n'expose ni nœuds ni fils aux lecteurs d'écran ; une liste de nœuds navigable servirait aussi à chercher et diagnostiquer | ★ | M |
| Retouches | Menu ⋮ trop étroit (« Ordre des BeginPlay » sur trois lignes) ; le « 0 » de l'axe sous le premier point clé du Timeline ; Save d'un projet d'essai qui enregistre pour rien ; force des vibrations ; en révision, l'en-tête de l'accueil prend la moitié de l'écran en paysage | ★ | S |

## Motivation : séries, rappels, défis

La base existe depuis la V4 : l'accueil compte les jours d'affilée (`Progress.days`) et la révision sait ce qui est dû chaque jour.

| Amélioration | Pourquoi et comment | Pertinence | Difficulté |
|---|---|---|---|
| Objectif du jour | La série ne compte que si un objectif choisi est atteint (une leçon, ou cinq questions de révision). Réglable : léger, normal, soutenu | ★★★ | S |
| Gel de série | Un joker gagné tous les sept jours (deux au plus) qui sauve la série un jour sans pratique | ★★★ | S |
| Défi du jour | Un petit exercice tiré chaque jour (Prédis, Débogue, graphe à compléter), le même pour la journée (graine = la date) | ★★★ | M |
| Rappel dans l'appli | À l'ouverture, un bandeau dit ce que la série risque et ce qui est dû | ★★ | S |
| Rappel du jour (notification) | « Ta série de 6 jours tient encore : 4 questions à revoir. » Voir ci-dessous | ★★★ | M à L |
| Maîtrise par notion | Une jauge par notion qui monte avec les réussites et redescend sans révision | ★★ | M |
| Modificateurs de défi | Rejouer une leçon sans Tick, sans Cast, en moins de N nœuds, à 30 images par seconde, BeginPlay inversés | ★★ | M |
| Succès | Badges liés à de vrais acquis (« premier Accessed None réparé »), pas au temps passé | ★★ | S à M |
| Examen de fin de niveau | Cinq exercices tirés au hasard, sans indices | ★★ | M |
| Bilan de la semaine | Leçons réussies, questions revues, notions qui baissent | ★ | S |

À éviter : points d'expérience et classements, qui récompensent le volume ; séries sans gel.

### Notifications : ce qui est possible

L'appli est une PWA empaquetée en APK (Trusted Web Activity) : une page fermée ne peut pas programmer seule une notification.

| Voie | Comment | Limites | Difficulté |
|---|---|---|---|
| A. Synchronisation périodique | Chrome réveille le service worker de temps en temps (Periodic Background Sync), qui lit la progression et notifie si la série est en jeu | Pas de serveur, mais Chrome choisit le moment : heure non garantie | M |
| B. Web Push | Un petit service envoie un message chaque jour à l'heure choisie | Fiable, mais demande un service en ligne et de garder les abonnements | L |
| C. Enveloppe native (Capacitor) | Vraies notifications locales | Fiable, sans serveur, mais change la construction et la signature de l'APK | L |

Dans tous les cas : demander l'autorisation après une première leçon réussie, heure réglable, un rappel par jour au plus, un réglage pour tout couper ; vérifier que l'autorisation passe bien à l'APK (Android 13 et plus). Proposition : rappel dans l'appli et voie A d'abord, B si c'est trop irrégulier.

## Code, publication et technique

| Amélioration | Pourquoi | Pertinence | Difficulté |
|---|---|---|---|
| Remettre `HANDOFF.md` au propre | Les agents le lisent en premier (CLAUDE.md) et il se contredit : téléphone seul, étape APK encore à faire, anciens éléments en attente. Séparer état actuel, décisions en vigueur et historique | ★★ | S |
| Borner les journaux | `runtime/journal.ts` accumule les Print String ordinaires : un Print sur Tick fait grossir la mémoire. Borner l'affichage sans fausser les compteurs dont les vérifications ont besoin | ★★ | S à M |
| Découper au fil des travaux | `interpreter.ts` (754 lignes), `simulation.ts` (637), `App.tsx` (495), `LessonSheet.tsx` (517) : découper selon leurs responsabilités quand on les modifie, pas pour la taille seule | ★★ | M par lot |
| Intégration continue | Les actions GitHub ciblent Node 20, déprécié ; `ubuntu-latest` change d'image. Monter les versions avant que le déploiement casse | ★★ | S |
| Version de test avant la production | L'APK suit le site dès la publication : une prévisualisation séparée permettrait d'essayer avant | ★★ | M |
| Smoke test sans Python | Le réécrire avec Playwright pour Node, lançable sur la machine de Tristan | ★★ | M |
| Rappel de sauvegarde | Proposer un export quand le dernier date de plus d'un mois | ★ | S |
| Maintenance du lint | Configuration Biome dépréciée ; avertissement de `behaviors/math.ts` à examiner en gardant la sémantique de `FMath::Clamp` | ★ | S |
| CI sur les pull requests | Le workflow ne réagit qu'aux push sur `main` ; peu utile tant que tout est publié directement sur `main` | ★ | S |
| Test du joystick | Le smoke test ne déplace pas le joueur au doigt | ★ | S à M |
| Performance des grands graphes | Jamais mesurée au-delà des leçons : essayer une centaine de nœuds | ★ | M |
| Page de test claude.ai | L'APK suit le site : garder l'outil ou le retirer | ★ | S |
| Publication sur le Play Store | Fiche, politique de confidentialité, test fermé | ★ | L (peu de code) |
| Synchronisation entre appareils | Retrouver sa progression sur téléphone et ordinateur ; demande un compte ou un stockage externe | ★★ | L |
| Version anglaise | Textes de l'appli et des leçons | ★ | L (contenu) |

## Déjà fait, noté ici auparavant

- V7.6 (18 novembre 2026), interface à la manière d'UE, étape 2 : Content Drawer (vignettes, + Add avec le menu d'UE, Pick Parent Class, Pick Row Structure, ouvrir, placer, supprimer).
- V7.5 (18 novembre 2026), interface à la manière d'UE, étape 1 : onglets Niveau et Blueprints, barres d'outils des deux éditeurs, Class Defaults, poignées nommées, Content Drawer en bas, ambre pour ce qui est propre à l'appli.
- V7.4 (18 novembre 2026), Enhanced Input : Input Actions, Input Mapping Contexts, Add / Remove Mapping Context, déclencheurs Down, Pressed, Released et Hold, événements Started, Ongoing, Triggered, Canceled, Completed, Consume Input ; trois étapes (la lampe, D20, maintenir pour ouvrir).
- V7.3 (18 novembre 2026), pilote du lot 2 : première leçon corrigée (nœuds purs), aide utilisée mémorisée (seul, avec indices, solution vue), notions de référence et prérequis sur les cartes, durée indicative, « Montre-moi » après un échec, chaîne Cast To avec T1 « Le terminal à badge » et A1 « Le piège » (différé de deux jours).
- V7.2 (18 novembre 2026), lot 1 Fiabilité : un projet illisible, d'un format plus récent ou que le stockage ne rend pas n'est plus jamais remplacé (dialogue de récupération, copie `rescue:*` gardée dans la sauvegarde complète) ; une seule politique de stockage avec révisions (la copie la plus récente gagne, écritures ordonnées par clé) ; transactions IndexedDB attendues jusqu'au bout ; projets et progressions vérifiés en entier avant toute écriture ; sauvegarde immédiate à la fermeture d'un espace ; slots Save Game enregistrés pendant Play ; échec d'enregistrement de la progression signalé, avec Réessayer ; restauration écrite d'un bloc ; règles de simulation et révisions de leçon versionnées, avec un avis une fois ; service worker : copie en cache sur erreur 5xx, seuls ses propres caches supprimés, manifest et icônes rafraîchis ; avis « Nouvelle version disponible ».
- Réorganisation du backlog (18 novembre 2026) : revue Codex intégrée, doublons fusionnés, lots 1 à 3 retenus par Tristan.
- V7.1 (17 novembre 2026) : Consume Input sur les événements de touche et pile des entrées comme dans UE, Débogue D19 (seule la dernière porte s'ouvre).
- V7 (17 novembre 2026) : Data Tables (asset, éditeur de lignes, Get Data Table Row, Get Data Table Row Names, Does Data Table Row Exist) et Save Game (classe SaveGame, slots gardés avec le projet, Create Save Game Object, Save / Load Game to/from Slot, Does Save Game Exist, Delete Game in Slot, étape « relancer la partie » dans les scénarios) ; huit leçons : le catalogue, D16, le dialogue en Data Table, la tirelire, D17, P11, D18, le checkpoint. Du recueil : E15, E16 et E24. Avant, en V6.2 : Gate Start Closed coché par défaut.
- V6 (16 novembre 2026) : 16 leçons tirées du recueil de Tristan (Unbind, registre en Map, vagues, timer annulable, parcours de réseau, dialogue par les données, sac, transaction, annuler / refaire, viseur, miroirs, grille tournée, tirage sans remise, Random Stream), et les nœuds Dot Product, Get Reflection Vector, Snap To Grid, For Each Loop with Break, Random Stream, Transform. Les exercices du recueil qui restent sont rangés avec leur chantier (E30, E14, E40, E10, E27, E38, E32, E31, E28, E44).
- V5 (12 novembre 2026) : bilan de la solution (étoiles, taille comparée, nœuds déconseillés), règles de conseil (nœud jamais exécuté, variable jamais lue, Custom Event jamais appelé, Cast sur Tick…), fiches de notions, Débogue D7 à D9, Prédis P9 et P10, trois leçons (Clamp, modulo, For Loop).
- V4 (11 novembre 2026) : objectifs visibles et Vérifier sans ouvrir la fiche, sauvegarde complète dans un fichier, solution de référence ouvrable, écran allumé pendant Play, révision espacée, index des nœuds, mémo UE, numéro de version visible, reprendre où on en était, récents dans la palette, jours d'affilée, trois Prédis.
- Retours sur la qualité des solutions (6 novembre 2026) : notion visée non bloquante, scénarios de robustesse, conseils de construction, autres façons de faire. Étape E de la V3.
- Variables locales, paramètres et sorties des fonctions d'interface, conversion d'un Custom Event en événement d'interface. Étape A de la V3.
- Structures, Map, Set, Text, Name. Étape B de la V3.
- Timeline, Lerp, Construction Script, flèches de références dans le niveau. Étape C de la V3.
- Line Trace By Channel, Event Hit. Étape D de la V3.
- Variable d'instance modifiable pendant Play, objet débogué choisi dans le niveau : étape 4 de la V1.
- Retours haptiques (10 novembre 2026).
