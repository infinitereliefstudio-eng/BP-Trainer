# Chantier n° 5 : le projet Expert final, analyse (21 novembre 2026)

Demandée par Tristan le 21 novembre à 21 h 40 : « On va juste faire l'analyse, on peut même imaginer plusieurs exercices potentiels, on va faire un fichier dans le projet. Il faut garder en tête que ça doit être intéressant à faire et que ça permet de mobiliser un maximum de compétences acquises. » **Rien n'est lancé** : ce fichier propose, Tristan choisit.

## En bref

- Le niveau Expert compte deux projets, **X2 L'atelier des machines** (48 nœuds) et **X1 La radio de la station** (55). Ils sont plus petits que la synthèse S3 du Confirmé (58), et ne font écrire ni écran, ni Actor Component, ni niveaux, ni sauvegarde.
- L'appli a **déjà tout ce qu'il faut** pour un vrai petit jeu : les quatre projets imaginés ici n'ont besoin d'**aucun nœud nouveau**. Un seul ajout est conseillé : des **jalons**, pour qu'un projet de plusieurs séances soit vérifié et rendu par étapes.
- Quatre projets imaginés : **Le réveil** (aventure narrative, trois niveaux et un menu), **La ronde** (infiltration), **L'arène de maintenance** (arcade à vagues), **Le réseau** (casse-tête généré).
- Recommandé : un Expert en trois marches qui grandissent. **X2 enrichi** (environ 70 nœuds), puis **La ronde** (environ 90), puis **Le réveil**, le projet final, en quatre jalons (environ 200 au total). La radio de X1 entre dans Le réveil. L'arène et Le réseau vont au backlog, comme projets bonus.

## 1. Ce qui existe

| Projet | Ce qu'il fait écrire | Nœuds | Ce qui manque au regard du parcours |
| --- | --- | --- | --- |
| X2 L'atelier des machines | héritage (parent et deux enfants, Parent: Tick), interface, Sequence et Delay, Tick avec Delta Seconds, rotation | 48 | écran, Actor Components, sauvegarde, niveaux |
| X1 La radio de la station | Data Table et structure, Mapping Context de dialogue (priorité), Set de faits, deux interfaces | 55 | boîte de dialogue à l'écran, mode UI, GameInstance |

Règles du niveau Expert (V7.18) : cahier des charges et scénario de test, **aucun indice ni liste de nœuds**, « Montre-moi » après un échec, solution et bilan après la réussite, décor seul (murs et plots), travail gardé entre les séances, jusqu'à 120 minutes estimées.

**Ce que l'appli simule** et que les projets peuvent utiliser : Enhanced Input et le Player Controller ; Cast, interfaces, dispatchers, héritage, Actor Components ; Tick, vecteurs (Dot Product, Normalize, Lerp Vector, Get Distance To, Forward Vector), Timeline, timers, Delay ; Line Trace, Event Hit, overlaps ; Enum et Switch, tableaux, Map, Set, structures, Data Tables ; Spawn Actor, Random Stream, Construction Script ; UMG (Designer, boutons, listes remplies en jeu, Bindings, modes d'entrée, curseur, pause), Widget Component ; Save Game ; plusieurs niveaux, Open Level, GameInstance, GameMode, Player Start Tag. Les composants : Static Mesh (boîte ou cylindre), Point Light, Box Collision, Text Render, Widget. Les scénarios de test savent marcher, se téléporter, viser, appuyer sur E, F, Espace, toucher un bouton à l'écran, relancer Play.

**Ce qu'elle ne simule pas** et que les projets évitent : physique, navigation et IA d'UE (AI Perception, Behavior Tree), son, animation, caméra, Possess. La vue est de dessus, au joystick, avec trois touches.

## 2. Ce qui rend un projet Expert intéressant

1. **Un vrai petit jeu** : un but, un échec possible, une fin, et l'envie d'y rejouer. Pas une suite d'exercices posés côte à côte.
2. **Des systèmes qui se parlent** : chaque outil répond à un besoin du jeu (l'énergie allume les lampes *et* ouvre la porte *et* débloque le terminal), et c'est là que le choix entre Cast, dispatcher et interface prend son sens.
3. **Des choix laissés à l'apprenant** : le cahier des charges dit ce que le jeu fait, pas comment ; les vérifications regardent le comportement, plus quelques règles d'architecture qu'un vrai projet UE5 impose (personne n'écoute les touches à part le joueur, ce qui traverse un Open Level vit dans le GameInstance…).
4. **Transférable à UE5** : la même architecture qu'un projet réel (GameInstance, interfaces d'interaction, Data Tables pour les textes, composants réutilisables), avec, à la fin, ce qui changerait dans l'éditeur.
5. **Tenable au téléphone** : pas plus de 25 nœuds environ par graphe (fonctions, Custom Events et Blueprints séparés), des séances de 30 à 60 minutes, un point d'arrêt clair à chaque fin de séance.

## 3. Quatre projets imaginés

### A. Le réveil (aventure narrative, projet final)

Le joueur sort de stase dans une station plongée dans le noir. Il doit rétablir l'énergie, lire ce que les terminaux racontent, trouver le badge et atteindre la salle de contrôle. Trois niveaux (Lvl_Menu, Lvl_Dortoir, Lvl_Controle), quatre jalons, une séance chacun.

1. **Le menu et la partie.** Lvl_Menu : Nouvelle partie, Continuer (grisé sans sauvegarde : Does Save Game Exist, Set Is Enabled), Quitter (Quit Game). UI Only et curseur au menu, Game Only en jeu. Continuer reprend au dernier terminal où l'on a sauvé (niveau, Player Start Tag, inventaire, faits).
2. **Le dortoir.** E agit sur ce que le joueur regarde (Line Trace, BPI_Interactif), avec l'invite « E : examiner » à l'écran ; un casier contient le badge, rangé dans l'inventaire (un Actor Component sur le joueur) ; un terminal affiche un journal dans une boîte de dialogue (Data Table, Mapping Context de dialogue : c'est la radio de X1) et sauvegarde la partie.
3. **L'énergie.** Trois fusibles dans le niveau, un générateur qui les attend ; quand il redémarre, tout ce qui a un composant **BP_Alimente** réagit chacun à sa façon (lampes Point Light, porte, terminal) par un dispatcher ; une jauge au-dessus du générateur (Widget Component) ; les portes héritent de BP_Porte_Base (Timeline), la porte à badge et la porte à énergie n'ajoutent que leur condition.
4. **La salle de contrôle.** La porte fait Open Level ; inventaire, faits et énergie traversent par le GameInstance ; on arrive par le bon Player Start ; une porte à code s'ouvre avec le code appris dans un journal ; l'écran de fin ramène au menu, et Continuer n'y propose plus la partie finie.

- **Fourni** : le décor (murs, plots), les textes (S_Journal, DT_Journaux), le projet UE5 de base (IMC_Joueur, BP_PlayerController). Tout le reste est à créer.
- **Taille** : environ 200 nœuds au total, 45 à 60 par jalon, une douzaine de Blueprints.
- **Ce qu'il fait le mieux** : l'architecture d'un vrai jeu, et les systèmes qui se croisent. **Ce qu'il fait peu** : Tick et vecteurs, hasard, Spawn.

### B. La ronde (infiltration)

Deux gardes font leur ronde entre des points ; le joueur doit voler un dossier et ressortir sans être vu. Un niveau, une séance longue ou deux.

- **Les gardes** : une ronde entre des points réglés dans le niveau (des positions réglées dans le niveau, Instance Editable ; Lerp Vector et Timeline, ou Tick et Delta Seconds) ; deux sortes de gardes, enfants de BP_Garde (lent qui voit loin, rapide qui voit court).
- **La vision** : un composant **BP_Vision**. Le joueur est vu s'il est devant (Dot Product entre le Forward Vector et la direction vers lui), assez près (Get Distance To), et qu'aucun mur ne le cache (Line Trace).
- **Les états** : Enum Patrouille, Suspicion, Alerte, et Switch ; une jauge de soupçon au-dessus de chaque garde (Widget Component) qui monte tant qu'il voit le joueur ; l'alerte d'un garde prévient tous les autres (dispatcher).
- **Le joueur** : un casier où se cacher (interface, il ne peut plus être vu), le dossier ramassé, la sortie ; pris, il repart du dernier point de passage (GameInstance) ; à l'écran, le temps et un écran « Repéré ».
- **Taille** : environ 90 nœuds. **Ce qu'il fait le mieux** : Tick, vecteurs et états, ce que le reste de l'Expert fait peu ; c'est le plus « jeu » des quatre. **Fidélité** : dans UE, on prendrait AI Perception et un Behavior Tree ; ici la vision s'écrit à la main, comme dans beaucoup de projets en Blueprint, et la fiche de fin dit quel outil d'UE la remplacerait.

### C. L'arène de maintenance (arcade à vagues)

Des drones défectueux arrivent par vagues ; le joueur les neutralise (E vise et tire par Line Trace) avant qu'ils n'atteignent le cœur de la station.

- Vagues par timers et Spawn Actor, positions au hasard (Random Stream), vagues décrites dans une Data Table (nombre, sorte, vitesse) ; trois drones enfants de BP_Drone ; santé en Actor Component, barre au-dessus (Widget Component) ; score, combo et record (Save Game) ; pause et Game Over (UMG, modes d'entrée), menu dans son niveau.
- **Taille** : environ 80 nœuds. **Ce qu'il fait le mieux** : le plus de familles de notions pour la taille, très rejouable. **Moins** : peu d'architecture à plusieurs niveaux, pas d'histoire.

### D. Le réseau (casse-tête généré)

Une grille de relais à faire pivoter pour amener l'énergie de la source à la sortie ; chaque grille est générée.

- Grille faite par Spawn (ou Construction Script) à partir d'une graine (Random Stream), propagation de l'énergie (While, file d'attente et liste des visités, comme « Le réseau en boucle »), grilles décrites dans une Data Table (taille, graine, coups permis), choix du niveau dans une liste de boutons remplie en jeu, meilleur score par grille (Save Game, Map), coups restants à l'écran.
- **Taille** : environ 90 nœuds. **Ce qu'il fait le mieux** : l'algorithmique et les données. **Moins** : héritage, composants, Tick ; plus proche d'un exercice que d'un jeu.

## 4. Comparaison

✓ : le projet fait écrire la notion ; ~ : en partie ; vide : non.

| Familles de notions | X2 | X1 | A Le réveil | B La ronde | C L'arène | D Le réseau |
| --- | --- | --- | --- | --- | --- | --- |
| Enhanced Input, Player Controller | ~ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Interfaces | ✓ | ✓ | ✓ | ✓ | ~ | ~ |
| Event Dispatchers | | | ✓ | ✓ | ✓ | ~ |
| Cast To | | ✓ | ✓ | ✓ | ✓ | ~ |
| Héritage | ✓ | | ✓ | ✓ | ✓ | |
| Actor Components | | | ✓ | ✓ | ✓ | |
| Tick, Delta Seconds, vecteurs | ✓ | | | ✓ | ✓ | |
| Timeline | | | ✓ | ✓ | ~ | |
| Timers, Delay | ✓ | | ~ | ✓ | ✓ | |
| Line Trace | | | ✓ | ✓ | ✓ | |
| Enum et Switch | | | ~ | ✓ | ✓ | ~ |
| Tableaux, Map, Set | | ✓ | ✓ | ✓ | ~ | ✓ |
| Structures, Data Tables | | ✓ | ✓ | | ✓ | ✓ |
| Spawn, hasard | | | | | ✓ | ✓ |
| UMG et modes d'entrée | | | ✓ | ✓ | ✓ | ✓ |
| Widget Component | | | ✓ | ✓ | ✓ | |
| Save Game | | | ✓ | | ✓ | ✓ |
| Niveaux, GameInstance, GameMode | | | ✓ | ~ | ~ | ✓ |
| **Total (✓ = 1, ~ = ½)** | **4,5** | **6** | **15,5** | **15,5** | **15,5** | **10** |
| Intérêt de jeu | moyen | moyen | fort (histoire) | fort (tension) | fort (score) | moyen |
| Taille | 48 | 55 | ≈ 200 (4 jalons) | ≈ 90 | ≈ 80 | ≈ 90 |

A, B et C se valent en nombre de notions, mais pas sur les mêmes : **A et B se complètent presque parfaitement** (B apporte Tick, vecteurs, états ; A apporte niveaux, sauvegarde, Data Tables, menu). C recoupe les deux ; D est le plus étroit.

## 5. Recommandation

Un niveau Expert en trois marches, chacune plus grande que la précédente et que toute synthèse :

| Ordre | Projet | Nœuds | Rôle |
| --- | --- | --- | --- |
| 1 | **X2 L'atelier des machines**, enrichi | ≈ 70 | Entrée de l'Expert. Ajout : un panneau de contrôle à l'écran (une ligne et un bouton par machine, remplis en jeu, Game and UI) et le carburant dans un Actor Component, pour qu'il ne reste pas en dessous de S3. |
| 2 | **X3 La ronde** | ≈ 90 | Tick, vecteurs, états, vision : un vrai défi de logique de jeu. |
| 3 | **X4 Le réveil**, projet final | ≈ 200 | Quatre jalons, quatre séances, presque tout le parcours. Le dialogue de X1 (le Mapping Context de dialogue) en devient le terminal du jalon 2. |

- **X1** : fondu dans Le réveil. Son meilleur morceau y reste, et l'Expert ne garde pas deux projets de dialogue.
- **L'arène et Le réseau** : au backlog, comme projets bonus à faire plus tard (ou à proposer en simulation libre, avec leur cahier des charges sans correcteur).

## 6. Ce qu'il faut ajouter à l'appli

Aucun nœud. Un seul ajout de moteur, conseillé pour Le réveil (et utile à La ronde) :

**Les jalons d'un projet Expert.** Un projet a une liste de jalons ; chacun a son cahier des charges, son scénario de test et ses vérifications. Vérifier les rejoue dans l'ordre jusqu'au premier qui échoue : « Jalon 2 réussi ; jalon 3 : la porte à énergie ne s'ouvre pas ». Le jalon le plus loin atteint est gardé dans la progression, et le cahier du jalon suivant s'ouvre quand le précédent est réussi, comme un vrai projet qu'on découvre par étapes. Après chaque jalon : sa solution de référence et son bilan. Côté tests : le départ d'un jalon est la solution du précédent, il doit échouer sur ses propres vérifications, et la solution complète doit tout réussir.

Le reste existe : menu et boutons (V7.35), Does Save Game Exist et Set Is Enabled, Quit Game simulé, Player Start Tag (V7.53), Widget Component (V7.42), vecteurs et Dot Product (V6).

## 7. Versions proposées, une à la fois

1. **V7.65, les jalons** : le moteur, l'affichage dans la fiche et après Vérifier, la progression gardée, les tests.
2. **V7.66, X2 enrichi** : le panneau de contrôle et le composant de carburant.
3. **V7.67, X3 La ronde.**
4. **V7.68, X4 Le réveil, jalons 1 et 2** (menu et sauvegarde ; dortoir, interaction, inventaire, terminal).
5. **V7.69, X4 Le réveil, jalons 3 et 4** (énergie ; salle de contrôle, fin).
6. **V7.70, la reprise** : X1 retiré du parcours, notions déclarées, questions de révision, mémo, espacement, fiches « Le refaire dans UE5 », README.

## 8. Questions à trancher

1. **Le parcours Expert** : X2 enrichi, La ronde, puis Le réveil (recommandé) ? Ou une autre combinaison, par exemple L'arène à la place de La ronde ?
2. **X1** : fondu dans Le réveil (recommandé), gardé tel quel, ou gardé comme projet bonus ?
3. **Les jalons** : un cahier dévoilé jalon par jalon (recommandé), ou tout visible dès le début ?
4. **L'univers** : la station de l'appli, avec des textes écrits pour l'occasion (recommandé, le dépôt est public), ou des éléments que tu fournirais ?
5. **Les projets non retenus** : au backlog comme projets bonus ?

## Décisions du 21 novembre (font foi)

Tristan trouve les quatre projets intéressants et a demandé les recommandations sur les cinq points (21 h 47), puis a lancé la mise en place (21 h 48, « Si c'est un petit chantier en terme de mise en place alors lance le ») :

1. **Le parcours Expert** : cinq projets, du plus petit au plus gros : **X2 enrichi** (≈ 70 nœuds), **L'arène de maintenance** (≈ 80), **La ronde** (≈ 90), **Le réseau** (≈ 90, la grande version du « Réseau en boucle »), **Le réveil** en dernier (≈ 200). Rien ne part au backlog.
2. **X1** : fondu dans Le réveil (son Mapping Context de dialogue devient le terminal du jalon 2).
3. **Les jalons** : pour tous les projets, cahier dévoilé jalon par jalon : un jalon pour X2, deux pour L'arène, La ronde et Le réseau, quatre pour Le réveil ; 30 à 60 minutes par jalon.
4. **L'univers** : la station de l'appli, textes écrits pour l'occasion, les cinq projets dans la même station (l'atelier, le cœur attaqué par les drones, l'aile de sécurité, la salle des relais, le dortoir).
5. Sans objet : tout entre dans le parcours.

Versions, une à la fois : **V7.65 les jalons** (la mise en place, lancée), puis X2 enrichi, L'arène, La ronde, Le réseau, Le réveil (deux versions), la reprise (X1 retiré, notions, révision, mémo, README). Chaque version attend son feu vert.

## Suivi

- **V7.65** (21 novembre) : les jalons.
- **25 novembre** : Tristan confirme que ses essais sur téléphone sont bons, et prend la recommandation sur la question laissée ouverte à la V7.65 : la solution de référence d’un projet en jalons reste fermée jusqu’au projet entier ; le bilan s’affiche après chaque jalon.
- **V7.66** (25 novembre, « ok pour ta reco ») : **X2 enrichi**, un jalon. Le carburant vit dans un Actor Component (**BP_Reservoir**, réglé machine par machine, fonction Consommer, OnVide) ; un **panneau de contrôle** à l’écran (WBP_Panneau, une **WBP_LigneMachine** par machine trouvée par Get All Actors Of Class, Expose on Spawn, Add Child to Vertical Box), qui suit l’état par un Event Dispatcher (OnEtat) et dont le bouton envoie le même message d’interface que E ; Game and UI et curseur. **87 nœuds** dans la solution de référence, au lieu des ≈ 70 estimés (le panneau et sa ligne en font 24, le composant 9) : X2 dépasse l’estimation de L’arène (≈ 80), à revoir au moment de la dimensionner.
