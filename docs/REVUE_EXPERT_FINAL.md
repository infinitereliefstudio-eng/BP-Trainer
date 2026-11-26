# Revue du chantier n° 5, projet Expert final, V7.65 à V7.72 (26 novembre 2026)

Copie du Claude Doc « BP Trainer — Revue du chantier n° 5 (V7.65 à V7.72) » : https://claude.ai/artifact/PrTvoTGE2owxrra3MESUPC. Demandée par Tristan le 26 novembre à 9 h 47 (« il faut passer à la review du dernier chantier »), en redonnant l'accès en écriture. **Rien n'est lancé** : ce fichier propose, Tristan choisit.

État de départ : lint, types et build sans erreur, 1 986 tests, smoke test sans erreur (`errors []`). Chaque constat a été reproduit par un test jetable (non versionné), se lit dans le code, ou s'appuie sur les sources citées en bas.

## Juste et à garder

- **Les jalons** (V7.65) : Vérifier rejoue les jalons dans l'ordre et s'arrête au premier qui échoue, avec ses vérifications à lui ; la progression ne baisse jamais ; un projet qui grandit après sa réussite se rouvre à son premier jalon nouveau (V7.71) ; solution fermée jusqu'au projet entier, bilan après chaque jalon.
- **Des vérifications qui regardent le comportement**, pas l'écriture : le modèle de grille du Réseau (`startQuarts`, `reached`), la position attendue des gardes (`expectedAt`, 25 cm de marge), les lignes du panneau de X2 trouvées par leur texte quel que soit l'ordre du niveau.
- **Le moteur** : une fonction redéfinie par un enfant reçoit ses entrées et rend ses sorties position par position (Compile garantit la même signature, comme UE) ; Ignore Self d'un Line Trace lancé par un Actor Component ignore son propriétaire (comme `UKismetSystemLibrary`) ; les Class Defaults d'un enfant règlent ses variables héritées ; Find Look at Rotation.
- **Les fiches « Le refaire dans UE5 »** : relues une à une, justes (Spawn Actor refusé dans un Construction Script, Maximum Loop Iteration Count à un million, points de Show 3D Widget relatifs à l'acteur, Tick Interval, Mouse Lock Mode et Hide Cursor During Capture, fichiers `.sav` dans `Saved/SaveGames`, Override d'une fonction…), sauf une précision (voir G1).
- **La reprise** : X1 retiré proprement (sa question et ses tests passés au Réveil), notions déclarées d'après les solutions avec un test qui le garde, les projets X exclus de la file « À retravailler en Blueprint ».

## Constats

| Code | Constat | Gravité | Lot |
| --- | --- | --- | --- |
| G1 | **Le mode d'entrée ne traverse pas Open Level** : chaque niveau repart en Game Only (`Simulation.inputMode`, un monde neuf par voyage). Dans UE, Set Input Mode UI Only règle le Game Viewport Client, qui survit au voyage, et lui fait ignorer les touches : un menu en UI Only qui fait Open Level laisse le niveau suivant sans commandes, tant que rien ne remet Game Only (cas reproduit par Epic sur ses forums, et l'une des questions les plus posées). Deux solutions de référence en dépendent sans le savoir : **C8 « Le personnage choisi »** et **X5 « Le réseau »** (menu en UI Only, puis Open Level, aucun Game Only). Le réveil, lui, remet Game Only avant Open Level ; sa fiche UE5 dit que le réglage « peut » suivre, il suit. La note « à vérifier dans UE » du BACKLOG est tranchée | Haute | 1 |
| V1 | **X2 refuse une variable de référence au composant** : toute variable de BP_Machine dont le nom contient « carbu », « fuel » ou « reserv » est prise pour un carburant resté dans la machine, quel que soit son type. Reproduit : la solution plus une variable `Reservoir` (référence à BP_Reservoir, un geste courant pour ne pas refaire Get Component by Class) échoue sur « le carburant dans un composant ». En Expert, sans indice, c'est un blocage | Moyenne | 1 |
| J1 | **X2 parle de « Jalon 1/1 » quand il échoue** : `runMilestones` cache les notes de jalon d'un projet à un seul jalon quand il réussit, pas quand il échoue. Reproduit : « Jalon 1/1 « L'atelier » : pas encore réussi. Les vérifications ci-dessus sont les siennes. » (contre la règle de la V7.66) | Faible | 1 |
| F1 | **« Un Static Mesh ne déclenche pas d'overlap »** (cahier du jalon 3 de L'arène et message de sa vérification) : vrai dans l'appli, où seule une Box Collision chevauche ; faux dans UE, où un Static Mesh avec un preset Overlap et Generate Overlap Events chevauche aussi. À dire comme une règle de l'appli, ou comme un conseil (une zone se fait avec une Box Collision) | Faible | 1 |
| N1 | **La ronde, jalon 2, s'appelle « La vision et l'alerte »**, et le jalon 3 « L'alerte » : deux jalons nommés par l'alerte dans la même liste (les docs l'appellent « La vision ») | Faible | 1 |
| P1 | **Les durées ne disent plus rien en Expert** : les cinq projets affichent « ≈ 120 min », le plafond. La formule de l'appli (celle des autres étapes) donne ≈ 3 h pour X2, ≈ 4 h 40 pour L'arène, ≈ 5 h 20 pour La ronde, ≈ 6 h 20 pour Le réseau et ≈ 10 h 30 pour Le réveil, soit ≈ 30 h pour l'Expert. Par jalon : de 45 min à 2 h, alors que la décision du 21 novembre visait 30 à 60 min. **X2 est un seul jalon de ≈ 3 h** (87 nœuds) | Moyenne | 2 |
| P2 | **Les solutions de référence ne suivent pas la règle « tenable au téléphone »** du plan (≈ 25 nœuds au plus par graphe) : Event Graph de BP_Reseau **142 nœuds** (13 événements), du GameMode de L'arène 71, de BP_Terminal 56, de BP_Generateur 42 (deux événements), de BP_Machine 37. Le plus net : **Recalculer** (Le réseau) est un Custom Event dont la liste de travail et le Set Visites sont des variables du Blueprint, vidées à chaque appel. Dans UE, ce calcul est une **fonction** avec des **variables locales** (l'appli les a, la leçon des fonctions les enseigne). La solution est le modèle que l'élève compare au sien après la réussite, et elle se lit au téléphone | Moyenne | 2 |
| P3 | **Le réveil oublie le monde à la sauvegarde** : après Continuer, les fusibles déjà posés réapparaissent dans le dortoir (noté au BACKLOG comme « sans effet »). C'est exactement le défaut que **D28 « L'objet ramassé réapparaît »** apprend à corriger à l'Avancé : le projet final le laisse dans sa solution. Le Player Start Tag que le plan lui donnait est aussi resté de côté (l'Avancé l'enseigne, une seule entrée dans la salle de contrôle) | Moyenne | 2 |
| P4 | **Le pion du joueur existe dans les niveaux de menu** (X5, X6 : pas de GameMode Override sur Lvl_Menu). Dans UE, le personnage apparaîtrait derrière le menu, avec son BeginPlay et son Tick. Le geste d'un vrai projet : un GameMode pour le menu, sans Default Pawn, ce que T6 enseigne. Le réveil s'en accommode en réglant Game Only dans le menu plutôt qu'au BeginPlay du joueur | Faible | 2 |
| D1 | **Docs** : la « Reprise rapide » d'HANDOFF dit « l'état réel au 2026-11-21 » et renvoie à « l'état exact après la V7.56 » ; la section V7.71 est avant la V7.70 ; « Ce qui reste à faire » propose encore « un troisième projet Expert ». BACKLOG : « l'Expert X1 » (rappel de Player Controller), « Reste Le réveil » (suite narrative), la note « à vérifier » sur le mode d'entrée (tranchée par G1) | Faible | 2 |

**À vérifier, pas des erreurs prouvées** :

- **Vérifier sur téléphone** : un projet de quatre à six jalons rejoue tous ses jalons, sur le fil de l'interface. Sur un ordinateur : 1,2 à 1,7 s pour La ronde, Le réseau et Le réveil complets. Sur le Pixel, peut-être plusieurs secondes sans réponse : à essayer sur un jalon avancé.
- **Un long projet dont le décor change** : la seule issue proposée est « Recommencer la leçon », qui perd des séances de travail. Le réveil est déjà passé en `revision` 2 (V7.71, sans dégât : personne ne l'avait commencé). À garder en tête avant de toucher au décor fourni d'un projet Expert : il faudrait alors un « mettre à jour le décor » qui garde le travail de l'élève.

## Lots proposés

| Lot | Contenu | Version |
| --- | --- | --- |
| 1 | **G1** : le mode d'entrée traverse Open Level, comme le viewport d'UE (le curseur, lui, appartient au Player Controller neuf et repart caché) ; « Pourquoi ? » explique des touches ignorées après un voyage ; C8 et X5 remettent Game Only (la vérification l'exige) ; fiche UE5 du Réveil précisée ; version des règles de simulation montée (avis dans les projets déjà commencés). **V1, J1, F1, N1**. Un test chacun | V7.73 |
| 2 | **P1** : la durée du jalon en cours et le total du projet (en séances) au lieu de « ≈ 120 min » ; X2 en deux jalons. **P2** : solutions réécrites en fonctions (Recalculer en fonction à variables locales, le GameMode de L'arène, le terminal, le générateur). **P3** : un fusible posé ne revient pas après Continuer. **P4** : un GameMode de menu sans pion dans X5 et X6. **D1** | V7.74 |

## Questions à trancher

1. **G1, le mode d'entrée après Open Level** : le simuler comme UE (recommandé : c'est le piège que rencontre tout premier menu ; C8 et X5 changent un peu), ou garder le comportement actuel et l'expliquer dans une note « Dans UE » ?
2. **X2 en deux jalons** (recommandé : 1. les machines et leur carburant en composant ; 2. le panneau de contrôle), ou un seul jalon comme aujourd'hui ?
3. **Le réveil** : seulement les fusibles qui ne reviennent pas (recommandé : le projet fait déjà 285 nœuds, l'Avancé enseigne le Player Start Tag), ou aussi une seconde entrée avec Player Start Tag ?
4. **Renuméroter X2 à X6 en X1 à X5** (question ouverte depuis la V7.72) : oui, dans le lot 2 (recommandé : la progression est gardée par l'identifiant de l'étape, pas par son code, et rien n'est encore commencé), ou garder les codes ?

## Sources

- [Can't input after opening from another level?](https://forums.unrealengine.com/t/cant-input-after-opening-from-another-level/314440) : Epic reproduit le cas, UI Only coupe les entrées après Open Level ; remettre un autre mode avant le voyage
- [Controls not working in level after re-entering from main menu](https://forums.unrealengine.com/t/controls-not-working-in-level-after-re-entering-from-main-menu/415198) et [GameMode Override Not Working](https://forums.unrealengine.com/t/ue4-4-20-3-gamemode-override-not-working/640239) : le mode réglé au menu suit dans le niveau suivant ; Set Input Mode Game Only à son arrivée
- Dépôt : `src/core/runtime/simulation.ts` (`inputMode`), `src/core/runtime/game.ts`, `src/core/runtime/physics.ts` (`overlapShapes`), `src/core/lessons/milestones.ts` (`runMilestones`), `src/core/lessons/duration.ts`, `src/core/lessons/library/expertWorkshop.ts` (`fuelInComponent`), `expertArena.ts`, `expertRound.ts`, `expertNetwork.ts`, `chosenAvatar.ts`, `expertWakeup*.ts`, `src/ui/workspace.ts` (`noticesFor`)
