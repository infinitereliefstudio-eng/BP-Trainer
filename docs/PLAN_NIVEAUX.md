# Chantier n° 4, niveaux et GameInstance : analyse (20 novembre 2026)

Copie du Claude Doc « BP Trainer — Chantier n° 4, niveaux et GameInstance : analyse » : https://claude.ai/artifact/8jupgWRbXyTExFaxjEXqv1. Demandée par Tristan le 20 novembre au soir (« Analyse pour le chantier 4 ce qui existe dans l'App, les règles ue, et de quelle manière on pourrait implémenter le chantier »). **Décisions du 20 novembre à 22 h 58** : Tristan a pris les sept recommandations (« Ok pour tes recos »), et demandé de garder au backlog comment aller plus loin (BACKLOG.md, « Aller plus loin après le chantier n° 4 »). Donc : vrai GameMode (GameModeBase, Maps & Modes, World Settings), pas de Level Blueprint, étapes à l'Avancé après « Le checkpoint », Quit Game simulé, pin Options sans effet, autonomie A4 dans le parcours, `Lvl_Principal`. **V7.46 faite** (plusieurs niveaux, Maps & Modes), **V7.47 faite** (Open Level, Get Current Level Name, la partie `Game`), **V7.48 faite** (GameInstance, Quit Game), **V7.49 faite** (vrai GameMode) ; la suite (V7.50, étapes 1 à 4) attend son feu vert.

## En bref

Le chantier est faisable sans refaire l'interpréteur. On ajoute au-dessus de la simulation une **partie** (le jeu lancé). Elle garde le GameInstance et les slots de sauvegarde, et refait un **monde neuf** à chaque Open Level, comme UE.

- **Ce que l'élève apprend** : les trois durées de vie d'une donnée. Dans le niveau : les acteurs, le joueur, le Player Controller, le GameMode, les widgets. Pendant la session : le GameInstance. Après la fermeture : le SaveGame.
- **Ce qu'on ajoute** : plusieurs niveaux par projet, Open Level (by Name), Get Current Level Name, une classe GameInstance (Event Init, Get Game Instance), le panneau Project Settings › Maps & Modes, et un vrai GameMode si Tristan le veut (question 1).
- **Taille** : L, comme l'UMG. Cinq ou six versions, de la V7.46 à la V7.51, dont environ 8 étapes à l'Avancé (148 étapes au total).
- **Ce qui change pour l'existant** : le format de projet (un niveau devient une liste), sans rien changer aux 140 étapes ni aux sauvegardes.
- **Sept questions** en fin de document, chacune avec la recommandation.

## Ce qui existe dans l'appli aujourd'hui

L'appli n'a qu'un monde par partie, sans nom et sans GameMode, mais beaucoup de pièces du chantier sont déjà là.

| Sujet | Aujourd'hui | Utile pour le chantier |
| --- | --- | --- |
| Niveau | Un seul par projet (`Project.level` : acteurs et un Player Start), sans nom, absent du Content Drawer | À transformer en liste de niveaux nommés |
| GameMode | Aucun. Default Pawn Class et Player Controller Class sont une case « Game Mode » de Class Settings ; l'aide dit déjà que dans UE c'est le GameMode. 19 fichiers de leçons s'en servent | Question 1 |
| GameInstance, Level Blueprint | Absents ; seul le mémo « Les classes du Gameplay Framework » en parle | À créer (le Level Blueprint : question 2) |
| Save Game | Fait (V7). Les slots sont gardés avec le projet et survivent à Stop. Enseigné à « La tirelire » (Confirmé), repris à « Le checkpoint » (Avancé) | La troisième durée de vie est prête |
| Correcteur | L'étape `restart` arrête la partie et en relance une avec les mêmes slots ; les vérifications lisent la dernière partie, les Print String sont cumulés | La même mécanique sert après un Open Level |
| Fin de vie | Event End Play (V7.19, pin End Play Reason avec Level Transition), Destroy Actor, Is Valid, « Accessed None » sur une référence vide, Destruct des widgets | Ce qu'Open Level doit déclencher |
| Objets hors niveau | `sim.objects` : SaveGame, Actor Components, widgets | Le GameInstance sera l'un d'eux, gardé d'un monde à l'autre |
| Cast To | Enseigné dès l'Intermédiaire | Get Game Instance → Cast To BP_… est le geste de base |

**La contrainte technique** : une `Simulation` est un monde construit une fois. Le joueur et le Player Controller sont créés dans son constructeur, et Play comme le correcteur n'en tiennent qu'une. Changer de niveau en place serait fragile ; refaire un monde neuf est plus simple et plus fidèle.

## Comment ça marche vraiment dans UE5

Dans UE, changer de niveau détruit tout le monde du jeu ; seul le GameInstance traverse, et seul le SaveGame survit à la fermeture.

Schéma du Claude Doc : trois lignes le long d'une partie (Play, Open Level, Quitter, Relancer). Dans le niveau : Lvl_Couloir, puis Lvl_Atelier, puis Lvl_Atelier neuf après la relance. Pendant la session : BP_Jeu (Event Init) qui garde ses variables jusqu'à Quitter, puis un BP_Jeu neuf. Après la fermeture : le slot écrit par Save Game to Slot, qui traverse tout.

| Point | Règle d'UE5 |
| --- | --- |
| Open Level | **Open Level (by Name)** (Level Name sans `.umap`, Absolute, Options) ou **Open Level (by Object Reference)**, dans Gameplay Statics. Le voyage n'est **pas immédiat** : la suite de la chaîne s'exécute encore, et un acteur créé après le nœud disparaît avec l'ancien niveau. On note donc ce qu'il faut garder **avant** Open Level |
| Ce qui disparaît | Tous les acteurs du monde (posés ou créés par Spawn), le pion, le Player Controller, le GameMode, le GameState et le Level Blueprint. Event End Play reçoit End Play Reason = Level Transition. Les timers et les Delay en cours s'en vont avec leur acteur |
| Widgets | Retirés du viewport automatiquement au changement de niveau (depuis UE 4.8). Un HUD se recrée dans le nouveau niveau |
| Nouveau niveau | Le GameMode du niveau (World Settings › GameMode Override, sinon le Default GameMode du projet) crée le Player Controller et le Default Pawn au Player Start. Construction Scripts, puis BeginPlay de tous, comme au premier lancement |
| GameInstance | Un seul objet, créé au lancement et détruit à la fermeture. Sa classe se choisit dans Project Settings › Maps & Modes › **Game Instance Class** ; oubliée, le Cast To BP_… échoue. Ce n'est pas un acteur : ni BeginPlay, ni Tick, ni composants, jamais dans le niveau. **Event Init** une seule fois, avant tout niveau (ni joueur ni widget à ce moment) ; **Event Shutdown** à la fermeture, non garanti sur un plantage. On l'obtient par **Get Game Instance** (nœud pur) puis Cast To |
| Références | Une variable du GameInstance qui pointe sur un acteur ne vaut plus rien après Open Level. On garde un identifiant (un Name) et un état, puis on retrouve ou recrée l'acteur dans le nouveau niveau |
| Play dans l'éditeur | Play lance le **niveau ouvert dans l'éditeur**, pas le Game Default Map, avec un GameInstance neuf à chaque Play. Tester depuis le niveau 2 donne donc un inventaire vide |
| Get Current Level Name | Le nom du niveau en cours (cible Gameplay Statics). **Remove Prefix String** retire le préfixe ajouté en Play dans l'éditeur (`UEDPIE_0_`) |
| Project Settings › Maps & Modes | Default GameMode, Editor Startup Map, Game Default Map, Game Instance Class. Le GameMode choisi y montre ses classes par défaut : Default Pawn Class, Player Controller Class, HUD Class… |

**Hors de ce que l'appli simulera** (mémo et notes « Dans UE ») : le streaming de niveaux et World Partition, le Seamless Travel, le chargement asynchrone, le réseau. Les **GameInstance Subsystems** se créent en C++ mais s'appellent depuis un Blueprint : c'est ce que Station enterrée utilise, et la note « Dans UE » fera le lien.

**À vérifier dans UE, sans enjeu pour les étapes** : si Event Destroyed se déclenche au changement de niveau (a priori non, End Play seulement) ; si Delay est permis dans le graphe d'un GameInstance.

## Comment s'en rapprocher dans l'appli

Recommandation : suivre UE pièce par pièce, avec des niveaux qui sont des assets, un GameInstance qui est un objet de la partie, et un monde refait à chaque Open Level.

### Le modèle (format 14)

- `Project.levels` : une liste de niveaux. Chacun a un id, un nom (`Lvl_Couloir`), ses acteurs, son Player Start et, si on fait le GameMode, son GameMode Override.
- **Maps & Modes** dans le projet : Game Default Map, Game Instance Class et, avec la question 1, Default GameMode. Le niveau ouvert dans l'éditeur est gardé avec le projet.
- **Nouvelle classe parente GameInstance** : un objet, comme SaveGame. Pas de composants, jamais posé. Ses événements sont Event Init et Event Shutdown ; la palette refuse BeginPlay, Tick et les nœuds d'acteur.
- **Migration** : le niveau d'un ancien projet devient le premier de la liste (`Lvl_Principal`), et Game Default Map le désigne. Rien ne change à l'exécution, donc aucun avis « règles changées ».

### Le moteur

- Une nouvelle classe **`Game`** (`core/runtime/game.ts`), l'équivalent du moteur et du GameInstance. Elle garde l'objet GameInstance, les slots, l'Output Log et la liste des niveaux traversés. Elle crée une `Simulation` par niveau.
- **Open Level** demande un voyage, fait au début de l'image suivante. La chaîne en cours finit, puis : End Play (Level Transition) sur tout le monde, Destruct des widgets, timers et Delay abandonnés, et un monde neuf avec le même GameInstance.
- **Une référence vers un acteur de l'ancien niveau** devient introuvable. Le moteur actuel donne déjà « Accessed None » et Is Valid faux : c'est exactement le piège à enseigner.
- **Un niveau introuvable** : comme UE, un message dans l'Output Log, et la partie continue là où elle est. À vérifier dans UE avant d'écrire le message exact.
- **Nœuds** : Open Level (by Name), Get Current Level Name, Get Game Instance, Event Init, Event Shutdown ; avec la question 1, Get Game Mode ; avec la question 4, Quit Game.

### L'éditeur

- Les niveaux deviennent des assets du **Content Drawer** (+ Add › Level). Les ouvrir change l'onglet du niveau, qui porte son nom, comme dans UE.
- **Play** lance le niveau ouvert, comme le Play dans l'éditeur d'UE.
- **Project Settings › Maps & Modes** dans le menu ⋮. **World Settings** dans les Details du niveau quand rien n'est sélectionné, pour le GameMode Override.
- **Pendant Play** : le nom du niveau en cours dans la barre de Play. L'Outliner en direct montre une ligne GameInstance, pour lire ses variables et le choisir comme objet débogué.

### Le correcteur

Aucune nouvelle étape de scénario n'est nécessaire. Le joueur marche dans une porte, Open Level se fait, et `cx.sim` devient le nouveau monde, comme après `restart`. On ajoute `cx.level()` (le niveau en cours), `cx.gameInstance(nom)` (une variable du GameInstance) et `cx.levels()` (les niveaux traversés). `restart` voudra dire quitter puis relancer le jeu : GameInstance neuf, slots gardés. Les vérifications tournent toujours dans l'ordre du niveau puis dans l'ordre inverse.

## Les étapes du parcours

Huit étapes à l'Avancé, juste après « Le checkpoint » : le Save Game vient d'y être repris, et Cast To, les Sets et les overlaps sont acquis. Le parcours passerait de 140 à 148 étapes.

| # | Étape | Format | Ce qu'elle apprend |
| --- | --- | --- | --- |
| 1 | Le couloir | Découverte | Une porte qui fait Open Level (by Name) vers le niveau suivant ; Get Current Level Name pour savoir où l'on est |
| 2 | P17 Le score après la porte | Prédis | Les variables du joueur repartent de leur valeur par défaut ; un Print String placé après Open Level s'affiche quand même |
| 3 | Le sac qui suit | Guidée | Créer BP_Jeu (GameInstance), le choisir dans Maps & Modes, puis Get Game Instance, Cast To BP_Jeu et ses variables |
| 4 | D27 Le sac vide | Débogue | Game Instance Class oubliée : le Cast To échoue. Avec l'hypothèse avant l'indice (cause : la référence) |
| 5 | Arriver par la bonne porte | Guidée | Dire au niveau suivant d'où l'on vient : un Name dans le GameInstance, lu au BeginPlay pour placer le joueur |
| 6 | D28 L'objet ramassé réapparaît | Débogue | L'état du monde se garde hors du niveau (un Set de Name dans le GameInstance), pas une référence d'acteur qui devient None |
| 7 | T6 Le pion de l'atelier | Transfert | Un autre niveau, un autre pion : GameMode Override dans World Settings (avec la question 1, sinon une autre situation de GameInstance) |
| 8 | A4 Reprendre la partie | Autonomie, différée | Cahier des charges : quitter, relancer, reprendre au bon niveau avec son sac. GameInstance pour la session, SaveGame pour le disque |

- **Notions nouvelles** : `levels` (Open Level, ce qui disparaît), `game-instance` et, avec la question 1, `game-mode`. Échelle découverte → guidée → transfert → autonomie.
- **Rappels** que les solutions réécrivent vraiment : cast, overlap, sets, save-game, player-controller (un rappel du Player Controller manquait après le Confirmé : il trouverait sa place à l'étape 5).
- **Aide** : celle de l'Avancé (indice après un essai, pas de liste des nœuds) ; les deux premières marches gardent leur méthode visible.
- **E40 du recueil** : son texte n'est pas dans le dépôt. À relire dans la v1.1 renvoyée par Tristan le 20 novembre, pour y aligner les étapes 3 à 6.

## Effets sur l'existant

Aucune des 140 étapes ne change de règle ni de solution ; le gros du travail invisible est le passage à une liste de niveaux.

- **Format de projet 13 → 14**, avec sa migration : projets de leçon, Mes projets, fichiers exportés et sauvegarde complète. `validate.ts` apprend les niveaux et le GameInstance.
- **42 lectures de `project.level`** dans une quarantaine de fichiers, surtout des leçons. Elles passent par une petite fonction (le premier niveau, ou le niveau ouvert). Les leçons ne changent pas de révision, donc pas d'avis « leçon changée ».
- **`Simulation`** reçoit le niveau à jouer et le GameInstance au lieu de les créer. Play (`PlaySession`) et le correcteur tiennent une `Game` au lieu d'une `Simulation`.
- **La case « Game Mode » de Class Settings** dépend de la question 1. Si on fait le vrai GameMode, elle laisse la place à Maps & Modes, et 19 fichiers de leçons passent par le nouveau réglage.
- **Tests et reprise** : smoke 140 → 148 étapes, `KNOWN_GAPS` remonté pour les notions où l'on insère le bloc, 3 notions au catalogue (59 → 62), glossaire, mémo Gameplay Framework réécrit (il dira ce qui est simulé), 8 questions de révision.
- **Projets déjà commencés et sauvegardes** : rien n'est perdu ; la migration est testée sur un projet de chaque format.

## Découpage en versions et taille

Six versions, chacune essayable seule sur le téléphone ; cinq si le GameMode reste un raccourci.

| Version | Contenu | Ce que Tristan peut essayer |
| --- | --- | --- |
| V7.46 | Plusieurs niveaux : format 14 et migration, niveaux dans le Content Drawer, onglet du niveau nommé, Play du niveau ouvert, Maps & Modes (Game Default Map) | Créer deux niveaux en simulation libre, passer de l'un à l'autre dans l'éditeur |
| V7.47 (**faite**) | Le moteur : la partie (`Game`), Open Level, Get Current Level Name, End Play en Level Transition, widgets retirés, références perdues ; correcteur | Une porte qui change de niveau en Play |
| V7.48 (**faite**) | GameInstance : la classe, Event Init et Shutdown, Get Game Instance, Game Instance Class, ligne GameInstance dans l'Outliner en direct | Un compteur qui survit à la porte |
| V7.49 (**faite**) | GameMode (question 1) : la classe GameModeBase, ses Class Defaults, Default GameMode, World Settings › GameMode Override, Get Game Mode, reprise de l'ancien réglage | Un pion différent dans chaque niveau |
| V7.50 | Étapes 1 à 4 | Le couloir, le Prédis, le sac, le sac vide |
| V7.51 | Étapes 5 à 8, mémo, glossaire, conseils, révision | La bonne porte, l'objet qui réapparaît, le transfert, l'autonomie |

**Taille** : L, du même ordre que le chantier UMG (V7.33 à V7.37). Le risque principal est la migration du format ; il est couvert par les tests de chargement et de restauration déjà en place.

## Questions à trancher

Sept choix, chacun avec la recommandation en premier. Un « ok pour tes recos » suffit pour lancer la V7.46.

1. **Le GameMode.** Recommandé : un vrai Blueprint GameModeBase, avec Default Pawn Class et Player Controller Class dans ses Class Defaults, choisi dans Maps & Modes et modifiable par niveau dans World Settings. Les anciens projets reçoivent un BP_GameMode qui reprend leur réglage, comme le BP_ThirdPersonGameMode des modèles d'UE. Autre choix : garder la case de Class Settings et ne faire que le GameInstance (une version de moins, mais un réflexe d'UE en moins).
2. **Le Level Blueprint.** Recommandé : pas maintenant, au backlog. Le mémo enseigne déjà que la logique d'un objet va dans sa classe. Autre choix : un graphe par niveau, pour montrer que ses variables meurent avec lui.
3. **La place des étapes.** Recommandé : un bloc à l'Avancé, après « Le checkpoint ». Autre choix : à la fin du Confirmé, après « La tirelire », plus tôt mais avec moins d'outils pour les exercices.
4. **Quit Game.** Recommandé : le simuler (Play s'arrête, Event Shutdown se déclenche) ; c'est petit et l'autonomie A4 s'en sert. Autre choix : laisser le correcteur relancer seul.
5. **Les Options d'Open Level** (`?porte=Nord`). Recommandé : montrer la pin sans effet, et l'expliquer dans le mémo ; le GameInstance fait mieux la même chose. Autre choix : simuler Parse Option.
6. **La dernière étape.** Recommandé : l'autonomie A4 « Reprendre la partie » dans le parcours, différée de quelques jours. Autre choix : la garder pour le projet Expert final (chantier n° 5).
7. **Le nom du niveau d'un ancien projet.** Recommandé : `Lvl_Principal`. Autre choix : un nom par leçon, plus parlant mais 140 noms à écrire.

## Sources

- [« Open Level » Blueprint Node Executes After Following Nodes?](https://forums.unrealengine.com/t/open-level-blueprint-node-executes-after-following-nodes/317018) — forum Epic : la suite de la chaîne s'exécute, les acteurs créés après disparaissent
- [Carrying Data with Game Instance](https://uhiyama-lab.com/en/notes/ue/gameinstance-persistent-data/) — Game Instance Class dans Maps & Modes, Cast qui échoue sans elle, Init et Shutdown, ne pas garder de références d'acteurs
- [UGameInstance](https://dev.epicgames.com/documentation/unreal-engine/API/Runtime/Engine/UGameInstance) — documentation Epic
- [UE-192012](https://issues.unrealengine.com/issue/UE-192012) — Epic : les widgets sont retirés du viewport à la destruction du monde
- [Custom mouse cursor resets after calling RemoveAllViewportWidgets()](https://forums.unrealengine.com/t/custom-mouse-cursor-resets-after-calling-removeallviewportwidgets/329154) — tous les widgets retirés au changement de niveau depuis UE 4.8
- [Get Current Level Name](https://dev.epicgames.com/documentation/unreal-engine/BlueprintAPI/Game/GetCurrentLevelName) — documentation Epic, Remove Prefix String
- [How to save a variable](https://forums.unrealengine.com/t/how-to-save-a-variable/443645/2) — le GameInstance se choisit dans Project Settings › Maps and Modes
- Dépôt : `src/core/model/project.ts`, `src/core/runtime/simulation.ts`, `src/core/lessons/runner.ts`, `src/ui/panels/ClassDetails.tsx`, `src/core/reference/memo.ts`, `docs/BACKLOG.md` (« Étape 2 : plusieurs niveaux et GameInstance »)
