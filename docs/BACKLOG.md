# Améliorations possibles

Tout ce qui pourrait améliorer BP Trainer, au même endroit : fiabilité, pédagogie, leçons, fonctions, fidélité à UE, ergonomie sur téléphone, motivation, technique. Réorganisé le 2026-11-18 (revue de Codex du 17 novembre fondue dans les sections), revu le 2026-11-19 après la V7.18 (plan du parcours livré, analyse `docs/ANALYSE_COUVERTURE_UNREAL.md` intégrée, ordre des prochains chantiers choisi), puis mis à jour le même jour après la V7.22 : le chantier n° 1, Actor Components, est terminé. Rien ne se fait sans le feu vert de Tristan.

Deux numérotations se croisent : les **lots du backlog** (1 à 8, ci-dessous) et les **lots du plan du parcours** (0 à 4, [PLAN_PARCOURS.md](PLAN_PARCOURS.md), tous faits). Ici, « lot » sans précision désigne ceux du backlog.

**Pertinence** : ★★★ change vraiment l'apprentissage ou l'usage quotidien ; ★★ utile ; ★ confort ou cas rare.
**Difficulté** : S, une passe courte ; M, une étape comme celles de la V3 ; L, plusieurs étapes ; XL, un chantier (une nouvelle version).

## Par où commencer

État au 19 novembre, après la V7.22 : le lot 1 est fait (V7.2) ; le lot 2 a été repris et dépassé par le plan du parcours (V7.10 à V7.18) ; Enhanced Input est fait (V7.4, V7.7, puis partout au lot 1 du plan) ; le lot 5 est fait (Actor Components, V7.19 à V7.22). **La suite est dans « Prochains chantiers » juste en dessous** : lots 7 et 6, puis un projet Expert final. Les lots 3 (le reste), 4 et 8 restent des propositions.

| # | Lot | Contenu | Pertinence | Difficulté |
|---|---|---|---|---|
| 1 | ~~Fiabilité~~ **fait en V7.2** (sauf H4) | Ne jamais perdre un projet ni une progression ; versionner formats, règles de simulation et leçons ; mises à jour annoncées | ★★★ | M à L |
| 2 | ~~Autonomie et transfert vers UE~~ **fait** : pilote en V7.3, puis plan du parcours (V7.10 à V7.18) | Guidé → transfert → autonomie différée ; prérequis et « Montre-moi ». La passerelle vers Unreal est passée dans « Prochains chantiers », plus tard | ★★★ | M à L |
| 3 | **Entrées et interaction** (Enhanced Input fait) | Regard indépendant du déplacement, interaction plus complète, Tick maîtrisé ; le reste d'Enhanced Input (Axis2D, modificateurs, Tap…) | ★★★ | M |
| 4 | Navigation et prise en main | Recherche et filtres dans les 124 étapes, gestes guidés | ★★★ | M |
| 5 | ~~Composition~~ **fait en V7.19 à V7.22** | Actor Components : santé, inventaire, interaction, énergie (chantier n° 1) | ★★★ | L |
| 6 | Cycle de vie et niveaux | Plusieurs niveaux, Open Level, GameInstance, GameMode léger. **Chantier n° 3** | ★★★ | L |
| 7 | Interface de jeu | Quelques widgets prédéfinis (texte, bouton, jauge), puis réévaluer un éditeur UMG complet. **Prochain chantier (n° 2)** | ★★★ | M, XL pour l'éditeur |
| 8 | Motivation et diffusion | Objectif du jour, série avec gel, rappels, défi du jour | ★★ à ★★★ | S à L |

L'objectif du jour et le gel de série sont deux petites passes (S) : ils peuvent se glisser entre deux lots sans attendre le lot 8.

Questions ouvertes :
- Lot 3 : le composant d'interaction réutilisable est fait (« Interagir par composant », V7.21). Reste à décider si la version intermédiaire (appui maintenu, surbrillance, invite « Appuie sur E ») vaut une passe, par exemple avec l'UMG (l'invite est un widget).
- Quel objectif du jour par défaut : une leçon, ou cinq questions de révision ?
- Tranchée le 19 novembre : la suite narrative avance avec les chantiers (X1 fait en V7.18, puis l'inventaire et le projet Expert final), sans attendre une appli plus généraliste.

## Prochains chantiers, dans l'ordre (choix du 19 novembre)

Après l'étude de `docs/ANALYSE_COUVERTURE_UNREAL.md`, Tristan a validé cet ordre le 19 novembre. Chaque chantier attend son feu vert, après ses essais sur téléphone des versions V7.8 à V7.22.

| # | Chantier | Contenu | Pertinence | Difficulté |
|---|---|---|---|---|
| 1 | ~~Actor Components~~ **fait** (V7.19 à V7.22) | Blueprints de composant créés par l'apprenant, ajoutés à plusieurs acteurs ; Get Owner, Get Component by Class, BeginPlay et Tick du composant ; neuf étapes (santé, interaction réutilisable, inventaire, énergie) et le conseil « Chaîne copiée entre Blueprints » | ★★★ | L |
| 2 | **UMG minimal** (lot 7) — **le prochain** | Quelques widgets prêts (texte, jauge, bouton), Create Widget et Add to Viewport, mis à jour par événement (pas de Binding à chaque image) ; le menu pause et une barre de vie deviennent visibles. Un éditeur de widgets complet reste à réévaluer ensuite | ★★★ | M |
| 3 | **Niveaux et GameInstance** (lot 6) | Plusieurs niveaux, Open Level, GameInstance (et un GameMode léger) ; trois durées de vie : dans le niveau, pendant la session, après la fermeture (SaveGame) | ★★★ | L |
| 4 | **Projet Expert final** | Le « mini-jeu solo » de l'analyse, à la place du troisième projet Expert : inventaire en composant (BP_Inventaire de « Le sac et le coffre » existe), interface, changement de niveau, sauvegarde | ★★★ | L |

Chantier n° 1 : [PLAN_COMPOSANTS.md](PLAN_COMPOSANTS.md). **Terminé le 19 novembre** : V7.19 (le moteur), V7.20 (cinq étapes de découverte), V7.21 (quatre étapes d'usage), V7.22 (reprise de l'existant). Tristan n'a pas encore essayé ces quatre versions. Laissé de côté, à reprendre si une étape en a besoin :

| Point | Où on en est | Pertinence | Difficulté |
|---|---|---|---|
| Add Component by Class, Destroy Component | Hors chantier (décision 4) : les composants d'un acteur sont fixés dans son Blueprint | ★★ | M |
| Activate / Deactivate, Set Component Tick Enabled | Non simulés : un composant agit tant que son acteur existe | ★ | S à M |
| Scene Components faits en Blueprint | Non simulés : un Actor Component n'a ni position ni forme | ★ | L |
| Owner d'un acteur | Get Owner sur un acteur renvoie toujours None : Spawn Actor n'a pas de pin Owner | ★ | S |
| À vérifier dans Unreal | Ordre du Tick entre un acteur et ses composants ; événements Enhanced Input dans un Actor Component (refusés ici, comme les touches) | ★★ | S (essai dans UE) |
| Autres façons de faire | « Le levier universel » et R4 pourraient proposer la version composant en alternative (« Interagir par composant » la fait déjà juste après « Regarder et interagir ») | ★ | S à M |

Plus tard, selon le cas :
- **Passerelle « Dans Unreal »** : exercices compagnons à refaire dans le vrai éditeur, avec une liste d'observations (construction d'un acteur, Enhanced Input et Player Controller, interaction entre deux Blueprints), et graphes de référence pour comparer le simulateur à UE5 (voir « Une référence indépendante pour la fidélité »). Remonte avant le prochain chantier dès que Tristan peut ouvrir Unreal régulièrement.
- Personnage 3D, caméra, Enhanced Input Axis2D (lot 3) : après les quatre chantiers.
- Animation, IA, rendu : fiches de découverte et pratique dans UE, sans les simuler.
- Piste peu coûteuse : afficher dans le Carnet les mesures d'autonomie (étapes réussies sans indice et sans solution), déjà enregistrées.

## Reste du plan du parcours : à étudier, à faire selon l'étude

Décision de Tristan du 19 novembre, après la V7.18 : le plan du parcours (lots 0 à 4) est livré ; ce qui n'a été atteint qu'en partie est noté ici, à étudier avant de décider s'il faut le faire. Rien n'est lancé.

| Point | Où on en est | À étudier |
|---|---|---|
| Espacement des notions | 30 notions dépassent encore la cible de 15 étapes (`KNOWN_GAPS` dans `tests/spacing.test.ts`, après la V7.22) : player-controller 86, sequence 53, data-tables 53, maps 49, structs 49, random 48, timeline 41, tick 41… Les neuf étapes Actor Components ont allongé de 1 à 9 les écarts qui les traversent (héritage : 20 → 24). La V7.22 a ramené input, enhanced-input, loops et trace à 15 ; input et loops sont pile à 15 entre S3 et « La salle de contrôle » | Des rappels où ils sont naturels ; accepter une cible plus large pour certaines notions ; ou revoir l'ordre des blocs |
| Rappel de Player Controller | Écrit seulement dans la leçon Player Controller, puis dans l'Expert X1 | Trouver une étape du Confirmé ou de l'Avancé où Get Player Controller sert naturellement (contexte d'entrée d'un mode, par exemple) |
| Avancé en cahier des charges | Fait : fiches de méthode après la réussite, premiers indices en questions, six objectifs réécrits. Pas fait : fiches « Ce qui est en place » réécrites, départ « niveau seul » des anciennes étapes | Réécrire les 24 étapes, ou seulement celles où le préconstruit retire l'essentiel du travail |
| Construire soi-même dans les anciennes étapes | Variables dès l'Intermédiaire, composants dès le Confirmé : seulement dans les étapes ajoutées pendant le plan | Reprendre les anciennes étapes, en vérifiant ta progression déjà faite (révision et avis de leçon changée) |
| Troisième projet Expert | Deux projets (X2, X1) | Remplacé par le prochain chantier n° 4 (projet Expert final) |
| « S'adapter à l'apprenant » | Pas fait (point 6 du Doc) | Une notion fragile (solution vue, révision ratée) propose un transfert de plus par « Continuer » |
| Déclencheur Tap | Absent ; T2 utilise Hold + Canceled | L'ajouter à Enhanced Input, et voir si une étape en a besoin |
| Menu pause | Fait sans widget, sur Espace (choix par défaut, question sans réponse) | À confirmer ; à revoir avec le prochain chantier n° 2 (UMG) |

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

**Pas de changement de framework** : Preact, TypeScript et Canvas conviennent. Le build fait environ 1,6 Mo (486 Ko compressés) en V7.22 ; garder le fichier unique tant qu'une mesure sur téléphone ne montre pas un démarrage lent.

## Lot 1 — Fiabilité : fait en V7.2

D1 à D8, H1, H2, H3, H5 et le versionnement des règles et des leçons sont faits (détail dans « Déjà fait » et dans HANDOFF.md, « V7.2 »). Restent :

| Point | Travail | Pertinence | Difficulté |
|---|---|---|---|
| H4 — Tests du service worker | `tools/e2e/smoke.py` ouvre le build en `file://`, où le service worker n'existe pas. Une suite servie en HTTP dans la CI : enregistrement, cache, page servie hors ligne, bandeau de nouvelle version. Un essai manuel l'a vérifié le 18 novembre, sans l'intégrer | ★★ | M |
| Vérifications dans l'APK | Fermeture par Android pendant Play juste après une sauvegarde de slot ; export et import par le partage Android (jamais confirmés depuis la V4) ; bandeau « Nouvelle version » après une publication ; ouverture hors ligne après la mise à jour du service worker | ★★★ | S (essais de Tristan) |

## Lot 2 — Autonomie et transfert vers UE

**Fait en V7.3 (pilote)** : correction de la première leçon (nœuds purs), aide utilisée mémorisée et affichée, 46 notions de référence avec prérequis, durée indicative, « Montre-moi » (erreurs, fil blanc arrêté, événement muet), format des chaînes guidé → transfert → autonomie avec la chaîne Cast To (leçons 9 et 10, T1 « Le terminal à badge », A1 « Le piège » deux jours après).

Choix du 18 novembre : Tristan en est vers l'étape 10 et ne pratique pas encore dans Unreal. Pilote sur Cast To, qu'il rencontre tout de suite ; passerelle vers UE reportée.

Le plan du parcours (V7.10 à V7.18) a repris une bonne part de ce qui suit ; ce qui reste est à décider :

| Amélioration | Travail | Pertinence | Difficulté |
|---|---|---|---|
| Autres chaînes | **En partie fait** : échelle à cinq marches pour toutes les notions (V7.10), T2 sur Enhanced Input. Restent des transferts et autonomies différés sur d'autres notions (Interfaces, Timeline, Event Dispatchers…) | ★★★ | M par chaîne (contenu) |
| « Montre-moi » pour les autres échecs | Aujourd'hui tiré de l'exécution (erreur, fil arrêté, événement muet). Pour un comportement faux sans rien de tel, chaque vérification pourrait désigner les nœuds à montrer | ★★ | M et contenu |
| Révision par notion | Les notions existent : regrouper les questions par notion, proposer la révision d'une notion pas revue depuis longtemps | ★★★ | M |
| Révision variée | Deux ou trois questions par notion, sous des angles différents, dont de petits graphes à lire (demande un mini-éditeur en lecture seule) | ★★★ | M et contenu |
| Reprise différée des erreurs | Une étape réussie avec la solution, ou ratée, revient plus tard sous une autre forme (la donnée existe : `passedWith`) | ★★★ | M |
| ~~Mini-projets autonomes~~ | **Fait** : synthèses S1 à S4, entraînements M1 et M2, projets Expert X1 et X2 | ★★★ | fait |
| Passerelle vers Unreal | Passée dans « Prochains chantiers », plus tard (dès que Tristan peut ouvrir Unreal) | ★★★ | M (contenu) |
| ~~Même problème, trois architectures~~ | **Fait** en V7.15 : « Choisis ton outil », puis imposé par la synthèse S3 | ★★ | fait |
| Revoir le bilan de qualité | Dans `core/quality/review.ts`, le nombre de nœuds pèse sur le verdict et les étoiles. En faire un indicateur secondaire ; critères distincts : fonctionnement, robustesse, notion travaillée, lisibilité, coût d'exécution | ★★ | M |
| Durée affinée | La durée est estimée d'après la taille de la solution ; l'affiner avec le temps réellement passé | ★ | S à M |

## Plan du parcours (validé le 18 novembre)

Voir [PLAN_PARCOURS.md](PLAN_PARCOURS.md) : **terminé**, lots 0 à 4 faits de la V7.10 à la V7.18 (le détail est dans « Déjà fait »). Ce qui n'a été atteint qu'en partie est dans « Reste du plan du parcours », plus haut. Les anciens lots A, B et C (remise à jour, Enhanced Input partout, nouveaux exercices) y étaient intégrés.

## Interface à la manière d'UE (plan validé le 18 novembre)

Principe : mêmes noms, même place relative que l'éditeur d'UE, panneaux en tiroirs, appui long = clic droit ; ambre = propre à BP Trainer.

| Étape | Contenu | État |
|---|---|---|
| 1 | Les deux éditeurs : onglets Niveau + un par Blueprint, barre d'outils de chacun (Class Settings, Class Defaults, Place Actors), onglets Construction Script / Event Graph, poignées Components · My Blueprint et Details, Content Drawer en bas, ambre | **Fait en V7.5** |
| 2 | Content Drawer : + Add avec le menu d'UE (Blueprint Class, Input, Blueprint, Miscellaneous), Pick Parent Class, vignettes par type, ouverture par double toucher, poser un acteur depuis le Drawer | **Fait en V7.6** (dossiers non simulés) |
| 3 | Enhanced Input, point 1 : Player Controller, Get Player Controller / Get Controller, Cast To PlayerController, Enhanced Input Local Player Subsystem, Add Mapping Context avec Target ; leçons mises à jour | **Fait en V7.7** (une étape de plus : « Les contrôles au Player Controller ») |
| 4 | Details à la manière d'UE (sections d'UE d'abord, aide de l'appli dans un bloc ambre repliable) ; palette « All Actions for this Blueprint » avec Context Sensitive et catégories repliables ; Find (Find Results) | **Fait en V7.8** (plus : Search Details, Find References) |
| 5 | Viewport du Blueprint (composants seuls) ; Outliner permanent dans l'éditeur de niveau (tiroir Outliner / Details) | **Fait en V7.9** |

## Lot 3 — Entrées et interaction

| Amélioration | Pourquoi | Pertinence | Difficulté |
|---|---|---|---|
| ~~Enhanced Input~~ **fait** (V7.4, V7.7, Trigger when Paused en V7.15, partout après la leçon Player Controller depuis le lot 1 du plan) | Reste : actions Axis2D et déplacement par Add Movement Input, modificateurs (Negate, Swizzle), déclencheurs Tap, Pulse, Chorded, déclencheurs sur l'asset Input Action | ★★★ | M |
| Regard indépendant du déplacement | Viser avec un Line Trace oblige aujourd'hui à bouger : un second manche, ou tourner sur place | ★★★ | S à M |
| Interaction plus complète (version intermédiaire) | Le schéma UE5 est en place (le joueur reçoit IA_Interagir et prévient par interface : « Interagir avec tout », R4, R3), et le composant réutilisable aussi (« Interagir par composant », V7.21). Reste : surbrillance de l'objet visé, invite « Appuie sur E » (un widget : avec l'UMG), appui maintenu sur un objet | ★★★ | M |
| ~~Leçons Enhanced Input~~ **faites en V7.4** | La lampe en Enhanced Input, D20 (Add Mapping Context oublié), Maintenir pour ouvrir (Hold) | ★★★ | fait |
| Tick maîtrisé | Set Actor Tick Enabled, Tick Interval, Start with Tick Enabled, Event End Play (avec End Play Reason), Set Timer by Function Name | ★★ | S |

## Leçons à ajouter

| Leçon ou série | Contenu | Pertinence | Difficulté |
|---|---|---|---|
| ~~Synthèse de la V3~~ | **Remplacée** par les synthèses de niveau S1 à S4 (plan du parcours) | ★★★ | fait |
| Suite « jeu narratif » | Calquée sur Station enterrée. Fait : objet à examiner et dialogue en Data Table (V7), porte à code (V3), journal de faits et mode dialogue (X1, V7.18). Inventaire en composant fait (« Le sac et le coffre », V7.21). Reste le projet Expert final (chantier n° 4) | ★★★ | M à L |
| Débogue en série | For Each qui retire des éléments pendant le parcours, Tick qui continue sur un acteur caché. Déjà couverts : timer jamais arrêté (D9), Delay dans une boucle (P2). Écarté : le Bind fait deux fois, sans effet dans UE | ★★★ | S chacun |
| Architecture | « Le Blueprint qui fait tout » à découper. Fait : la même logique sortie dans un parent (L'héritage, Expert X2) ou dans un composant (R5 « La santé est partout », V7.20) | ★★★ | M |
| Lecture de graphe | Un graphe touffu, trois questions dessus (que vaut X après Y ?) | ★★ | M |
| Performance | Remplacer un Tick par un timer ou un événement, avec un compteur de nœuds exécutés par seconde | ★★ | M |
| Plus de Prédis | Map sans test de Return Value, Event Hit répété, Lerp sur Tick, Select, For Loop with Break | ★★ | S chacun |
| Défis vérifiés | Le défi de fin de fiche n'est vérifié par rien : en faire un second scénario, facultatif | ★★ | M |
| Robustesse et autres façons de faire | 20 étapes ont un « Et si… », 6 une alternative : étendre à celles qui s'y prêtent | ★★ | M (contenu) |

Les leçons liées à une fonction (Enhanced Input, Save Game, niveaux) sont rangées avec elle.

## Pédagogie

| Amélioration | Pourquoi | Pertinence | Difficulté |
|---|---|---|---|
| Autres règles de conseil | Cast sur Tick, variable jamais lue et Custom Event jamais appelé existent depuis V5 ; « Chaîne copiée entre Blueprints » (parent ou composant) depuis la V7.22. Étudier la référence lue sans Is Valid, sans conseils automatiques hors contexte | ★★ | S chacune |
| Mémo : autres fiches | Réplication, Blueprint ou C++, Gameplay Tags, sous-systèmes, packaging | ★ | S chacune |
| Défi partageable | Exporter un projet comme exercice, avec son énoncé | ★ | M |

## Fonctions et fidélité à UE

| Amélioration | Pourquoi | Pertinence | Difficulté |
|---|---|---|---|
| ~~Actor Components~~ (lot 5) | **Fait en V7.19 à V7.22** (exercice E14 du recueil couvert). La suite laissée de côté est sous « Prochains chantiers » | ★★★ | fait |
| Widgets UMG (lot 7, **prochain chantier**, n° 2) | D'abord texte, bouton et jauge prédéfinis, mis à jour par événement ; réévaluer ensuite un éditeur complet. Exercices E10, E27, E38 | ★★★ | M, XL pour l'éditeur |
| Sons | Play Sound 2D avec quelques sons intégrés | ★★ | S à M |
| Macros et Collapse | Macros de l'utilisateur, Collapse to Function, Collapse to Macro | ★★ | M à L |
| Copier-coller entre graphes | Aujourd'hui seulement dans un même graphe | ★★ | M |
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

Demande d'ouvrir Unreal : rangée avec la passerelle, dans « Prochains chantiers », plus tard. Les tests protègent contre les régressions, mais leçons et résultats reposent sur le même moteur : une règle fausse peut passer tous les tests. Construire une petite batterie (10 à 15 graphes) exécutés dans **une version précise d'Unreal** sur l'ordinateur de Tristan : graphe UE, résultat observé, version, équivalent BP Trainer. Cas : nœuds purs lus plusieurs fois, copies et références de tableaux et structures, fonctions et locales, Delay et timers, dispatchers, héritage, destruction, entrées et Consume Input. Documenter les simplifications du simulateur.

L'évaluation des nœuds purs est décrite différemment selon les sources ([Richard Hinckley, 2020](https://forums.unrealengine.com/t/pure-node-evaluation/146473/6) ; [Dave Jones / Epic, 2025](https://forums.unrealengine.com/t/new-show-exec-pin-and-what-it-does-exactly/2533784/3)) : ne changer le moteur qu'après comparaison dans UE.

Compléter aussi les vérifications de leçons par quelques permutations d'acteurs à graines fixes, en plus des ordres normal et inverse, et garder la graine dans le résultat pour reproduire un échec (★★, S).

## Sauvegarde et niveaux

### Étape 1 : Save Game — faite (V7)

Les slots sont gardés avec le projet (`Project.saveSlots`) : ils survivent à Stop et partent avec l'export. Depuis la V7.2, ils sont aussi enregistrés pendant Play, sans attendre Stop. Restent :

Depuis, la synthèse S4 (V7.17) fait sauver un Set de Name à chaque fusible et le relire au BeginPlay.

| Exercice | Ce qu'il apprend |
|---|---|
| La porte ouverte qui le reste | On ne sauve pas une référence d'acteur, mais un identifiant et un état |
| Refactor : un seul objet de sauvegarde | Trois Blueprints qui écrivent chacun leur slot, à regrouper |
| Save Game : la suite | Versions Async des nœuds, Delete Game in Slot dans un exercice |

### Étape 2 : plusieurs niveaux et GameInstance (lot 6, L, prochain chantier n° 3)

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
| Recherche et filtres du parcours (lot 4) | Par notion, format, durée, déjà réussi, à reprendre : cinq niveaux ne suffisent plus pour 124 étapes | ★★★ | M |
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
| Remettre `HANDOFF.md` au propre | **En partie fait** : une « Reprise rapide » en tête fait foi depuis le 18 novembre. Restent les sections historiques qui se contredisent (téléphone seul, étape APK à faire, éléments en attente) : séparer état actuel, décisions en vigueur et historique | ★★ | S |
| Borner les journaux | `runtime/journal.ts` accumule les Print String ordinaires : un Print sur Tick fait grossir la mémoire. Borner l'affichage sans fausser les compteurs dont les vérifications ont besoin | ★★ | S à M |
| Découper au fil des travaux | `simulation.ts` (839 lignes, +200 avec les Actor Components), `interpreter.ts` (775), `App.tsx` (643), `LessonSheet.tsx` (573) : découper selon leurs responsabilités quand on les modifie, pas pour la taille seule | ★★ | M par lot |
| Intégration continue | Les actions GitHub ciblent Node 20, déprécié (avertissements à chaque déploiement, encore en V7.22) ; `ubuntu-latest` change d'image. Monter les versions avant que le déploiement casse | ★★ | S |
| Version de test avant la production | L'APK suit le site dès la publication : une prévisualisation séparée permettrait d'essayer avant | ★★ | M |
| Smoke test sans Python | Le réécrire avec Playwright pour Node, lançable sur la machine de Tristan (`tools/e2e/smoke.py` a 82 captures en V7.22) | ★★ | M |
| Rappel de sauvegarde | Proposer un export quand le dernier date de plus d'un mois | ★ | S |
| CI sur les pull requests | Le workflow ne réagit qu'aux push sur `main` ; peu utile tant que tout est publié directement sur `main` | ★ | S |
| Test du joystick | Le smoke test ne déplace pas le joueur au doigt | ★ | S à M |
| Performance des grands graphes | Jamais mesurée au-delà des leçons : essayer une centaine de nœuds | ★ | M |
| Page de test claude.ai | L'APK suit le site : garder l'outil ou le retirer (toujours republiée à chaque version) | ★ | S |
| Publication sur le Play Store | Fiche, politique de confidentialité, test fermé | ★ | L (peu de code) |
| Synchronisation entre appareils | Retrouver sa progression sur téléphone et ordinateur ; demande un compte ou un stockage externe | ★★ | L |
| Version anglaise | Textes de l'appli et des leçons | ★ | L (contenu) |

## Déjà fait, noté ici auparavant

- V7.25 (19 novembre 2026), revue, lot 3 : la première marche d'une notion (découverte, guidée) garde sa méthode et ouvre sa solution après 3 échecs, même en Avancé (R5, L'héritage) ; libellés Entraînement M1/M2 et Projet X1/X2 ; durées calculées sur le travail réel.
- V7.24 (19 novembre 2026), revue, lot 2 : l'événement d'une Input Action n'a plus de Consume Input (comme dans UE, tous les acteurs qui l'écoutent la reçoivent) ; textes de R4 et du défi Player Controller corrigés ; pile des entrées dans `runtime/inputStack.ts`.
- V7.23 (19 novembre 2026), revue des V7.2 à V7.22 ([REVUE_V7.md](REVUE_V7.md)), lot 1 : Ignore All Pressed Keys Until Release sur Add / Remove Mapping Context (cochée par défaut, comme dans UE) ; le correcteur rejoue chaque solution avec des appuis tenus 0,1 s ; X1 vérifie qu'aucune réplique n'est sautée.
- V7.22 (19 novembre 2026), chantier Actor Components, étape 4 : rappels (La salle de contrôle, M2 avec un Line Trace), conseil « Chaîne copiée entre Blueprints » (parent ou composant), fiches sur L'héritage, X2 et S4, glossaire et mémo « Interface ou composant ». Chantier terminé.
- V7.21 (19 novembre 2026), chantier Actor Components, étape 3 : quatre étapes d'usage en Avancé : « Interagir par composant », Débogue D23 « La batterie qui ne sait pas où elle est », « Le sac et le coffre », Autonomie A2 « L'énergie de la station ». 124 étapes.
- V7.20 (19 novembre 2026), chantier Actor Components, étape 2 : cinq étapes en Avancé après « L'héritage » : Prédis P15 « Qui commence ? », Refactor R5 « La santé est partout », Débogue D22 « Le scanner et le chariot », Transfert T3 « Le piège qui blesse tout », « Le verrou à badge » (parent ou composant). 120 étapes.
- V7.19 (19 novembre 2026), chantier Actor Components, étape 1 : classe ActorComponent, une copie par acteur (valeurs par classe d'acteur et par acteur posé), BeginPlay des composants avant l'acteur, Tick, End Play à la destruction, Get Owner, Get Component(s) by Class, « On … (Composant) », Bind Event to On Actor Begin / End Overlap, règles de compilation d'UE (self n'est pas un Actor, pas d'overlap, d'entrée ni de Timeline), interface (Pick Parent Class, + Add, Details, Debug, Outliner en direct), format 11.
- Backlog revu (19 novembre 2026) : prochains chantiers choisis après l'analyse de couverture, reste du plan du parcours noté à étudier, entrées faites retirées (Find References en V7.8, maintenance du lint en V7.8, mini-projets autonomes, trois architectures, synthèse de la V3).
- V7.18 (19 novembre 2026), plan du parcours, lot 4b : niveau Expert, projets X2 L'atelier des machines (héritage, Parent: Tick, Delta Seconds, Sequence, Delay) et X1 La radio de la station (dialogue en Data Table, journal de faits, Mapping Context de dialogue par le Player Controller, porte à code). Le plan du parcours est terminé.
- V7.17 (19 novembre 2026), plan du parcours, lot 4a : l'Avancé en cahiers des charges (fiches de méthode après la réussite, premiers indices en questions, objectifs sans recette), Le levier universel, entraînements M1 Le sas et M2 Le distributeur, synthèse S4 Les fusibles. Reste le lot 4b (Expert).
- V7.16 (19 novembre 2026), plan du parcours, lot 3b : rappels dans sept étapes Confirmé, Prédis P14 « Qui parle en premier ? », synthèse S3 « Le poste de garde » ; le lot 3 est fini.
- V7.15 (19 novembre 2026), plan du parcours, lot 3a : quatre étapes Confirmé (Choisis ton outil, Débogue D21 « Qui a éteint la lumière ? », Refactor R4 « Interagir comme dans UE5 », Le menu pause) ; nœuds Set Game Paused et Is Game Paused, Trigger when Paused sur les Input Actions. Reste le lot 3b (rappels, synthèse S3).
- V7.14 (18 novembre 2026), plan du parcours, lot 2b : Intermédiaire revu (La porte sur son gond, Les pièces, Prédis P13, Le gyrophare, Une valeur par lampe, Transfert T2, synthèse S2) ; le lot 2 est fini.
- V7.13 (18 novembre 2026), plan du parcours, lot 2a : Débutant revu (Construis ta lampe, Prédis P12 avec Get World Location, compteur avant la leçon à touche, rappels, synthèse S1).
- V7.12 (18 novembre 2026), plan du parcours, lot 1b : 14 étapes Avancé en Enhanced Input ; le lot 1 est fini.
- V7.11 (18 novembre 2026), plan du parcours, lot 1a : 16 étapes Intermédiaire et Confirmé en Enhanced Input (template UE5 : IA, IMC_Joueur, BP_PlayerController), textes à jour (Content Drawer, Description, Pin Options), Find References et Outliner dans les indices de Débogue.
- V7.10 (18 novembre 2026), plan du parcours, lot 0 : règle d'aide par niveau (ouverte jusqu'à l'Intermédiaire, verrouillée ensuite), rappels et test d'espacement à cliquet, échelle à cinq marches, niveau Expert, étape de synthèse conseillée.
- V7.9 (18 novembre 2026), interface à la manière d'UE, étape 5 : onglet Viewport du Blueprint (composants vus de dessus, sélection, déplacement au doigt dans le repère du parent) ; Outliner permanent de l'éditeur de niveau (tiroir Outliner / Details, Item Label et Type, recherche, sélection partagée). Plan « Interface à la manière d'UE » terminé.
- V7.8 (18 novembre 2026), interface à la manière d'UE, étape 4 : Details en sections d'UE repliables avec Search Details et aide ambre, palette « All Actions for this Blueprint » en arbre de catégories, Find Results (Find, Find in all Blueprints, Find References) ; revue des étapes 1 à 3 : Player Index de Get Player Controller et Get Player Pawn.
- V7.7 (18 novembre 2026), interface à la manière d'UE, étape 3 : Player Controller (classe parente, Player Controller Class, sur la pile des entrées), Get Player Controller, Get Controller, Cast To PlayerController, Enhanced Input Local Player Subsystem, Target d'Add / Remove Mapping Context (format 10) ; leçons Enhanced Input mises à jour et nouvelle étape « Les contrôles au Player Controller ».
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
