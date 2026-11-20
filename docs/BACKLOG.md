# Améliorations possibles

Tout ce qui pourrait améliorer BP Trainer, au même endroit : fiabilité, pédagogie, leçons, fonctions, fidélité à UE, ergonomie sur téléphone, motivation, technique. Réorganisé le 2026-11-18 (revue de Codex du 17 novembre fondue dans les sections), revu le 2026-11-19 après la V7.18 (plan du parcours livré, analyse `docs/ANALYSE_COUVERTURE_UNREAL.md` intégrée, ordre des prochains chantiers choisi), puis mis à jour le même jour après la V7.22 (chantier n° 1, Actor Components, terminé), après la revue (V7.23 à V7.26) et après l'étude de `docs/ANALYSE_APPRENTISSAGE_ADAPTATIF_ET_EXERCICES_PROCEDURAUX.md` (nouveau chantier n° 2, révisions de graphes espacées, placé avant l'UMG), puis le soir du 19 novembre après la V7.30 (chantier n° 2 terminé, ce qu'il laisse noté, liste « Déjà fait » remise dans l'ordre), après la V7.32 (chantier annexe « retouches de l'interface » terminé, ce qu'il laisse noté, ergonomie et technique remises à jour), le 20 novembre après la V7.35 (chantier n° 3, UMG, en cours : le moteur est fait, restent les leçons ; ce qu'il laisse noté), après la V7.36 (les six premières étapes UMG), après la V7.37 (chantier n° 3, UMG, terminé), le 20 novembre à 15 h 45 : pause demandée par Tristan, puis revue du chantier UMG et ses corrections (V7.38 à V7.40), à 16 h 30 : nouvelle pause demandée par Tristan (« on arrête »), puis le soir du 20 novembre après le chantier annexe Widget Component et projets (V7.41 à V7.43), à 20 h 52 : pause demandée par Tristan (« met à jour le backlog… et on termine ici »), puis le soir même : revue du chantier annexe (V7.44, V7.45), analyse du chantier n° 4 ([PLAN_NIVEAUX.md](PLAN_NIVEAUX.md)), recommandations prises et V7.46 faite, et enfin à 23 h 38 : mis en ordre pour une reprise par un autre agent (section « Reprise par un autre agent » juste en dessous). Rien ne se fait sans le feu vert de Tristan.

Deux numérotations se croisent : les **lots du backlog** (1 à 8, ci-dessous) et les **lots du plan du parcours** (0 à 4, [PLAN_PARCOURS.md](PLAN_PARCOURS.md), tous faits). Ici, « lot » sans précision désigne ceux du backlog.

**Pertinence** : ★★★ change vraiment l'apprentissage ou l'usage quotidien ; ★★ utile ; ★ confort ou cas rare.
**Difficulté** : S, une passe courte ; M, une étape comme celles de la V3 ; L, plusieurs étapes ; XL, un chantier (une nouvelle version).

## Reprise par un autre agent (20 novembre 2026, 23 h 40)

**À lire d'abord**, dans cet ordre : CLAUDE.md, [HANDOFF.md](HANDOFF.md) (« Reprise rapide », puis la section V7.46 et « Méthode de travail »), [PLAN_NIVEAUX.md](PLAN_NIVEAUX.md) (le chantier en cours, décisions comprises), puis cette section. Tristan parle français, teste sur son téléphone (APK liée au site : un push sur `main` est une mise en production) et donne son feu vert version par version.

**Où on en est** : version en ligne **7.46.0** (déployée, page de test à jour). **Chantier n° 4, niveaux et GameInstance, en cours : 1 version sur 6 faite.** Rien n'est commencé au-delà ; aucune branche, aucun fichier non poussé. Tristan a demandé où en était le chantier, puis cette mise en ordre : **la V7.47 attend son feu vert explicite** (« tu peux lancer » ou équivalent).

**Ce qui reste au chantier n° 4** (décisions de Tristan du 20 novembre : les sept recommandations de PLAN_NIVEAUX.md, « Questions à trancher ») :

| Version | Contenu | État |
| --- | --- | --- |
| V7.46 | Plusieurs niveaux : format 14, `Project.levels`, `levelOf` / `defaultLevel`, assets Level dans le Content Drawer, onglet nommé, Play du niveau ouvert, Project Settings › Maps & Modes (Game Default Map) | **fait** |
| V7.47 | Changer de niveau en jeu : la partie `Game`, Open Level (by Name), Get Current Level Name | à faire, attend le feu vert |
| V7.48 | GameInstance : classe parente `GameInstance`, Event Init, Event Shutdown, Get Game Instance, Game Instance Class dans Maps & Modes, ligne GameInstance dans l'Outliner en direct ; **Quit Game** ici (il déclenche Event Shutdown) | à faire |
| V7.49 | Vrai GameMode : classe parente `GameModeBase` (Default Pawn Class, Player Controller Class dans ses Class Defaults), Default GameMode dans Maps & Modes, World Settings › GameMode Override par niveau, Get Game Mode ; la case « Game Mode » de Class Settings disparaît, les anciens projets reçoivent un BP_GameMode qui reprend `playerClassId` / `playerControllerClassId` (19 fichiers de leçons y touchent) | à faire |
| V7.50 | Étapes 1 à 4 à l'Avancé, juste après « Le checkpoint » : « Le couloir », P17 « Le score après la porte », « Le sac qui suit », D27 « Le sac vide » | à faire |
| V7.51 | Étapes 5 à 8 : « Arriver par la bonne porte », D28 « L'objet ramassé réapparaît », T6 (GameMode Override), A4 « Reprendre la partie » (autonomie différée) ; reprise : mémo Gameplay Framework, glossaire, 8 questions de révision, notions `levels`, `game-instance`, `game-mode` (catalogue 59 → 62), smoke 140 → 148 étapes | à faire |

**Plan technique de la V7.47** (à suivre sauf meilleure idée, en le disant à Tristan) :
- `core/runtime/game.ts` (nouveau) : la classe `Game` tient la `Simulation` en cours (`world`), les slots (le même objet partagé), la liste des niveaux traversés, et une demande de voyage en attente. `Simulation` ne change presque pas : elle reçoit déjà `levelId` et expose `sim.level` (V7.46).
- Nœuds dans `core/nodes/library/levels.ts` (à ajouter au registre) et comportements dans `core/runtime/behaviors/levels.ts` : **Open Level (by Name)** (Level Name : Name, Absolute : Boolean, Options : String montrée sans effet, expliquée dans l'aide) et **Get Current Level Name** (Remove Prefix String, vrai par défaut ; faux : `UEDPIE_0_` + nom, comme en Play dans l'éditeur).
- Open Level **n'est pas immédiat** : la chaîne en cours finit, le voyage se fait au début de l'image suivante. Alors : Event End Play avec End Play Reason = Level Transition (l'enum `EEndPlayReason` existe déjà) sur tous les acteurs, leurs Actor Components, le joueur et le Player Controller ; Destruct des widgets ; puis un monde neuf (`new Simulation(project, { levelId, slots, … })`), Construction Scripts et BeginPlay comme au lancement. Timers et Delay de l'ancien monde disparaissent avec lui. Un nom introuvable : une erreur dans l'Output Log, la partie continue (message exact à vérifier dans UE, noté « à vérifier »).
- Output Log et messages à l'écran : à garder d'un monde à l'autre (le correcteur cumule déjà les Print String après `restart`, voir `runner.ts`).
- Play : `PlaySession.sim` devient le monde en cours de la `Game` (un getter) ; avertir l'interface au voyage ; nom du niveau en cours dans la barre de Play ; breakpoints toujours partagés.
- Correcteur (`lessons/runner.ts`) : `cx.sim` = le monde en cours, comme après `restart` ; ajouter `cx.level()` et `cx.levels()`. `restart` refait une `Game` (mêmes slots).
- Tests : `tests/openLevel.test.ts` (voyage à l'image suivante, nœuds après Open Level exécutés, End Play en Level Transition, widgets retirés, acteur créé après Open Level disparu, nom introuvable, Get Current Level Name avec et sans préfixe, correcteur qui suit le voyage). Smoke : captures à partir de 114.
- Aucune leçon ne change ; `rules.ts` inchangé. Format : rien à convertir, mais passer à 15 pour qu'une ancienne version de l'appli refuse ces nœuds, comme aux formats 7, 11 et 12 (étape vide dans `migrate`, un test).

**Après chaque version** : la liste « Livrer une version » de HANDOFF.md (lint, types, tests, build, e2e, smoke « errors [] », version, sections HANDOFF / BACKLOG / README / ARCHITECTURE / PLAN_NIVEAUX, commit avec les lignes d'attribution, push, déploiement, page de test), puis un résumé en français simple pour Tristan avec quoi essayer sur le téléphone, et attendre.

**Piège du 20 novembre** : le déploiement GitHub Pages a échoué deux fois côté GitHub (« Fetching artifact metadata failed »). `gh run rerun --failed` échoue ensuite (« Multiple artifacts named github-pages ») : relancer plutôt un run neuf avec `gh workflow run deploy.yml -R infinitereliefstudio-eng/BP-Trainer --ref main`, puis vérifier qu'il finit en `success`.

**Essais de Tristan en retard** (à lui rappeler une fois, sans insister) : rien n'a été essayé sur téléphone depuis la V7.33 (étapes UMG, 1280 × 720, Screen Size « Téléphone », boutons devant le joystick, menu pause sans PAUSED, Mes projets, Widget Component et ses quatre étapes, revue du chantier annexe, et la V7.46 : créer un niveau, l'ouvrir, Play, Maps & Modes).

**Après le chantier n° 4** : le chantier n° 5, projet Expert final (tableau « Prochains chantiers »), sur feu vert, analyse d'abord. Les idées hors chantier sont dans « Aller plus loin après le chantier n° 4 » (section Sauvegarde et niveaux) : ne rien en faire sans demande.

## Par où commencer

Historique des états successifs : la section « Reprise par un autre agent » ci-dessus fait foi quand ils la contredisent.

État au 20 novembre, après la V7.43 (voir aussi le paragraphe suivant) : le lot 1 est fait (V7.2) ; le lot 2 a été repris et dépassé par le plan du parcours (V7.10 à V7.18) ; Enhanced Input est fait (V7.4, V7.7, puis partout au lot 1 du plan) ; le lot 5 est fait (Actor Components, V7.19 à V7.22) ; le chantier n° 2, révisions de graphes espacées, est fait (V7.27 à V7.30) ; le chantier annexe « retouches de l'interface » est fait (V7.31, V7.32). **Le chantier n° 3, l'UMG (lot 7), est fait** : le moteur (V7.33 Designer, V7.34 widgets à l'écran et Bindings, V7.35 boutons et modes d'entrée) et les douze étapes du parcours (V7.36, V7.37), avec la reprise. **Pause au 20 novembre (demande de Tristan, « on arrête là »)**, puis **revue du chantier UMG** à sa demande ([REVUE_UMG.md](REVUE_UMG.md)), corrigée dans la foulée (V7.38 à V7.40, recommandations prises). **Nouvelle pause à 16 h 30 (« on arrête »)** : rien n'est en cours. Tristan a confirmé que la suite est un **nouveau chantier**, le n° 4 (niveaux et GameInstance, lot 6) ; il n'est pas lancé. À la reprise : d'abord ses essais sur téléphone des V7.33 à V7.40 (rien n'a encore été essayé : étapes UMG, taille 1280 × 720, Screen Size « Téléphone », boutons devant le joystick, menu pause sans PAUSED), puis, sur son feu vert, une **analyse** du chantier n° 4 (fonctionnement réel dans UE5, ce que l'appli peut simuler, étapes à ajouter, questions à trancher), comme pour les Actor Components et l'UMG. Après lui : un projet Expert final. Les lots 3 (le reste), 4 et 8 restent des propositions.

**Le soir du 20 novembre**, Tristan a lancé un **chantier annexe avant le n° 4** : le Widget Component, et plusieurs projets en simulation libre ([PLAN_ANNEXE_WIDGET_PROJETS.md](PLAN_ANNEXE_WIDGET_PROJETS.md), recommandations prises). **V7.41 faite** (Mes projets), **V7.42 faite** (moteur du Widget Component), **V7.43 faite** (quatre étapes à l'Avancé, 140 étapes au total) : **chantier annexe terminé**. **Pause demandée par Tristan à 20 h 52 (« on termine ici ») : rien n'est en cours.** À la reprise : ses essais sur téléphone, de la V7.33 à la V7.43 (étapes UMG, 1280 × 720, Screen Size « Téléphone », boutons devant le joystick, menu pause sans PAUSED, « Mes projets », Widget Component en simulation libre et ses quatre étapes), puis l'analyse du chantier n° 4 (niveaux et GameInstance) sur son feu vert explicite.

| # | Lot | Contenu | Pertinence | Difficulté |
|---|---|---|---|---|
| 1 | ~~Fiabilité~~ **fait en V7.2** (sauf H4) | Ne jamais perdre un projet ni une progression ; versionner formats, règles de simulation et leçons ; mises à jour annoncées | ★★★ | M à L |
| 2 | ~~Autonomie et transfert vers UE~~ **fait** : pilote en V7.3, puis plan du parcours (V7.10 à V7.18) | Guidé → transfert → autonomie différée ; prérequis et « Montre-moi ». La passerelle vers Unreal est passée dans « Prochains chantiers », plus tard | ★★★ | M à L |
| 3 | **Entrées et interaction** (Enhanced Input fait) | Regard indépendant du déplacement, interaction plus complète, Tick maîtrisé ; le reste d'Enhanced Input (Axis2D, modificateurs, Tap…) | ★★★ | M |
| 4 | Navigation et prise en main | Recherche et filtres dans les 136 étapes, gestes guidés | ★★★ | M |
| 5 | ~~Composition~~ **fait en V7.19 à V7.22** | Actor Components : santé, inventaire, interaction, énergie (chantier n° 1) | ★★★ | L |
| 6 | Cycle de vie et niveaux | Plusieurs niveaux, Open Level, GameInstance, vrai GameMode. **Chantier n° 4, en cours** (V7.46 faite, voir « Reprise par un autre agent ») | ★★★ | L |
| 7 | Interface de jeu | **Chantier n° 3, fait** : Designer réduit fidèle à UE, widgets à l'écran, Bindings, boutons et modes d'entrée faits (V7.33 à V7.35), douze étapes (V7.36, V7.37) : **fait** | ★★★ | L |
| 8 | Motivation et diffusion | Objectif du jour, série avec gel, rappels (le défi du jour est devenu la file « À retravailler en Blueprint », V7.28) | ★★ à ★★★ | S à L |

L'objectif du jour et le gel de série sont deux petites passes (S) : ils peuvent se glisser entre deux lots sans attendre le lot 8.

Questions ouvertes :
- Lot 3 : le composant d'interaction réutilisable est fait (« Interagir par composant », V7.21). L'invite « Appuie sur E » est faite en V7.37 (widget d'écran) ; reste à décider si l'appui maintenu et la surbrillance valent une passe.
- Chantier UMG terminé (V7.37), revu et corrigé (V7.38 à V7.40, [REVUE_UMG.md](REVUE_UMG.md)). Le Widget Component, resté au backlog après la V7.35, a été **fait** le 20 novembre au soir à la demande de Tristan (chantier annexe, V7.42 et V7.43). Chantier n° 4, niveaux et GameInstance : analysé puis lancé le 20 novembre, V7.46 faite (voir « Reprise par un autre agent »).
- Chantier UMG : la taille de référence 1280 × 720 reste à confirmer à l'œil sur le téléphone (Designer et Play) ; depuis la V7.39, le Designer montre aussi le format du téléphone (Screen Size). Le recueil complet n'est pas dans le dépôt public : seul son résumé est dans PLAN_UMG.md, faute de réponse sur ce point.
- Quel objectif du jour par défaut : une leçon, cinq questions de révision, ou une carte de la file « À retravailler en Blueprint » ? **Mise de côté par Tristan le 20 novembre.**
- Widget Component, à vérifier dans UE : le widget arrive à l'écran (Construct) à l'image qui suit le BeginPlay de l'acteur, et Get User Widget Object marche déjà dans ce BeginPlay. Restes possibles, non demandés : Set Widget, Set Draw Size, le mode World, le toucher d'un bouton de Widget Component par les scénarios des leçons.
- « Mes projets » : pas de corbeille (suppression définitive après confirmation, choix de Tristan) ; pas de bouton « Reprendre » sur l'accueil pour la simulation libre (le dernier projet ouvert est en tête de la liste).
- Tranchée le 19 novembre : la suite narrative avance avec les chantiers (X1 fait en V7.18, puis l'inventaire et le projet Expert final), sans attendre une appli plus généraliste.

## Prochains chantiers, dans l'ordre (choix du 19 novembre)

Après l'étude de `docs/ANALYSE_COUVERTURE_UNREAL.md`, Tristan a validé cet ordre le 19 novembre ; le même jour, après l'étude de `docs/ANALYSE_APPRENTISSAGE_ADAPTATIF_ET_EXERCICES_PROCEDURAUX.md`, il a placé les révisions de graphes espacées en n° 2, avant l'UMG. Chaque chantier attend son feu vert, après ses essais sur téléphone des versions V7.8 à V7.35.

| # | Chantier | Contenu | Pertinence | Difficulté |
|---|---|---|---|---|
| 1 | ~~Actor Components~~ **fait** (V7.19 à V7.22) | Blueprints de composant créés par l'apprenant, ajoutés à plusieurs acteurs ; Get Owner, Get Component by Class, BeginPlay et Tick du composant ; neuf étapes (santé, interaction réutilisable, inventaire, énergie) et le conseil « Chaîne copiée entre Blueprints » | ★★★ | L |
| 2 | ~~Révisions de graphes espacées~~ **fait** (V7.27 à V7.30) | Journal des tentatives, file « À retravailler en Blueprint » programmée en jours, trois familles de mini-exercices à variantes, hypothèse avant l'indice dans les Débogue. Détail juste en dessous | ★★★ | L |
| 3 | **UMG** (lot 7) — **fait** ([PLAN_UMG.md](PLAN_UMG.md), V7.33 à V7.37) | Fait : Widget Blueprint et Designer réduit (Palette, Hierarchy, Details, ancres, aperçu 1280 × 720), widgets à l'écran avec le cycle de vie d'UE, Set Text / Set Percent…, enfants ajoutés en jeu, Bindings simulés avec leur compteur d'appels, boutons, modes d'entrée, curseur, pause ; V7.36 : le compteur à l'écran en fin d'Intermédiaire ; P16, E10 « Le menu qui rend le contrôle », D24, « Le vrai menu pause », D25 au Confirmé ; V7.37 : la barre de vie, R6, « Appuie sur E », A3, E27 « La playlist » (C7) au Confirmé, T4 à l'Avancé, reprise (mini-exercices « Interfaces (UMG) », mémo, glossaire, révision). Le Widget Component, resté au backlog après la V7.37, a été fait ensuite (chantier annexe, V7.42 et V7.43). Détail ci-dessous | ★★★ | L |
| 4 | **Niveaux et GameInstance** (lot 6) — **en cours** ([PLAN_NIVEAUX.md](PLAN_NIVEAUX.md), recommandations prises le 20 novembre) : V7.46 faite, V7.47 à V7.51 à faire, une à la fois sur feu vert | Plusieurs niveaux, Open Level, GameInstance, vrai GameMode, huit étapes à l'Avancé ; trois durées de vie : dans le niveau, pendant la session, après la fermeture (SaveGame) | ★★★ | L |
| 5 | **Projet Expert final** | Le « mini-jeu solo » de l'analyse, à la place du troisième projet Expert : inventaire en composant (BP_Inventaire de « Le sac et le coffre » existe), interface, changement de niveau, sauvegarde | ★★★ | L |

### Chantier annexe (fait) : retouches de l'interface

Demandé par Tristan le 19 novembre au soir, avant l'UMG : améliorer l'interface et l'aspect général sans refonte. [PLAN_RETOUCHES_UI.md](PLAN_RETOUCHES_UI.md). **Terminé le même soir** : V7.31 (place pour le graphe, boutons flottants en colonne, zoom plancher 0,7, messages) et V7.32 (barre du bas en onglets, contrôles de Play dans la barre d'outils, accueil en paysage, menu, Timeline, couleurs). Tristan les a essayées : « les points sont ok » (20 novembre). L'UMG a suivi (chantier n° 3). Laissé de côté ou remarqué en chemin :

| Point | Où on en est | Pertinence | Difficulté |
|---|---|---|---|
| Lisibilité du graphe | Zoom plancher 0,7 : noms des pins à environ 8,5 px à l'ouverture. Si c'est encore petit sur le Pixel, deux voies : un réglage de taille (voir « Taille du texte réglable »), ou une police plus grande dans les nœuds, qui élargit les nœuds et oblige à revoir la place des graphes de départ des leçons | ★★ | S (réglage) à M (police) |
| Accueil en paysage | Environ une rangée et demie de cartes visible à 370 px de haut (l'objectif était deux) : les titres de niveau et la ligne « Aide ouverte… » pourraient se resserrer aussi | ★ | S |
| Icône Sélection | Le bouton « Sélection » est devenu une icône (cadre pointillé) : à voir si elle se comprend sans son nom | ★ | S |
| Barre d'outils du niveau pendant Play | Save, Place Actors, Stop et les contrôles de Play tiennent en paysage ; en portrait la barre défile. À revoir avec la lecture en portrait | ★ | S |
| Libellés qui se chevauchent dans le niveau | Des acteurs posés près les uns des autres ont des noms qui se mêlent (« BP_LampeBP_Lampe2BP_Lampe3 » dans « Le générateur prévient ») : écarter les acteurs dans les niveaux concernés, ou n'afficher le nom qu'à la sélection quand ils se touchent | ★★ | S à M |
| Nœuds cachés sous d'autres | Dans la solution de référence de « Le générateur prévient », un Get bEnMarche est dessiné sous l'événement IA_Interagir. À vérifier sur les solutions de référence et les graphes de départ : un test pourrait signaler deux nœuds qui se recouvrent | ★★ | S à M |

### Chantier n° 2 (fait) : révisions de graphes espacées

Tiré de `docs/ANALYSE_APPRENTISSAGE_ADAPTATIF_ET_EXERCICES_PROCEDURAUX.md`, étudiée le 19 novembre ; Tristan a validé l'intégration et l'ordre. Le constat : les questions de révision reviennent dans le temps (`core/review/schedule.ts`), les graphes jamais. Reconnaître ce que fait un nœud une semaine plus tard n'est pas savoir le recâbler. **Terminé le 19 novembre**, une étape par version ; Tristan les a essayées : « les points sont ok » (20 novembre).

| Étape | Livré | Version |
|---|---|---|
| A — Journal des essais | Par essai : date, étape, révision, réussi ou non, vérifications, aide, catégories d'erreur du correcteur, vérifications ratées par id. Dans la progression, versionné, exporté avec la sauvegarde complète ; Carnet › « Journal des essais », effaçable | V7.27 |
| B — File « À retravailler en Blueprint » | Échéance en jours par notion, recalculée à partir du journal (et des étapes réussies avant lui) : J+1, J+3, J+7, J+14, J+21 ; rapprochée après un échec ou la solution vue, espacée après une réussite seule quand la notion était due. Dans l'onglet Révision, sous les questions ; reprise de zéro dans un espace à part ; « Une autre étape », « Reporter à demain » | V7.28 |
| C — Mini-exercices à variantes | Trois familles (Variables et Branch, Overlaps et événements, Cast To) de trois situations, en trois formats (à compléter, à réparer, à reconstruire), tirés d'une graine reproductible ; pour 36 graines par famille, le départ échoue et la solution passe, et chaque erreur typique échoue avec une raison | V7.29 |
| D — Hypothèse avant l'indice | Dans les Débogue et les mini-exercices à réparer : « l'événement, la référence ou la condition ? » avant le premier indice, puis ce que montre la vérification ; gardée dans le journal | V7.30 |

Ce chantier a repris et remplacé : « Révision par notion », « Révision variée » et « Reprise différée des erreurs » (lot 2), « S'adapter à l'apprenant » (reste du plan du parcours), « Défi du jour » (la séance du jour est la file). Laissé de côté, à reprendre selon ce que donnent les essais :

| Point | Où on en est | Pertinence | Difficulté |
|---|---|---|---|
| Mesure : réussite différée par notion | **Pas faite.** Prévue par le chantier (« réussie seule, plusieurs jours après », dans le Carnet) et promise par « Maîtrise par notion ». Le journal a tout ce qu'il faut : `practiceEvents` et `reworkSchedule` donnent, par notion, la dernière pratique, son résultat et sa boîte | ★★★ | S à M |
| Régler le calendrier à l'usage | Hypothèses de départ, à revoir avec les retours de Tristan : intervalles 1, 3, 7, 14, 21 jours (puis 21 sans fin), réussite comptée « à l'heure » à une demi-journée près, essai laissé 2 h compté comme un échec, trois cartes affichées à la fois | ★★★ | S |
| Premier lancement | Les étapes réussies avant le journal comptent au jour de leur réussite : la file peut se remplir d'un coup. À regarder sur la progression réelle de Tristan ; au besoin, étaler les premières échéances | ★★ | S |
| Autres familles de mini-exercices | Les notions sans famille font refaire une étape entière (10 à 30 min au lieu de 3 à 5). Candidates, dans l'ordre où Tristan les rencontrera : Delay et timers, Event Dispatchers, interfaces, Enhanced Input (les familles actuelles n'utilisent que des overlaps), composants | ★★★ | M par famille |
| Diagnostic de l'hypothèse | 13 des 23 Débogue du parcours désignent une cause (Accessed None, Cast jamais réussi, Branch d'un seul côté, événement muet). Les autres (une valeur fausse, l'ordre des nœuds) laissent l'apprenant tester seul : chaque vérification pourrait désigner sa cause, comme pour « Montre-moi » | ★ | M |
| Recommandation expliquée | « Pourquoi cet exercice maintenant ? » : la phrase de chaque carte le dit en partie (dernière pratique, suite prévue) ; un profil par notion et par type de tâche (construire, réparer) reste à faire | ★★ | M |
| Autres formats | Composer deux ou trois notions dans un même mini-exercice ; exercices à réordonner (nœuds fournis à brancher, type Parsons) | ★★ | M à L |
| Écarté de l'analyse | Le plan d'évaluation statistique (un seul apprenant), les profils à six états et le knowledge tracing (des règles simples suffisent), la génération par IA | — | — |

### Chantier n° 1 (fait)

[PLAN_COMPOSANTS.md](PLAN_COMPOSANTS.md). **Terminé le 19 novembre** : V7.19 (le moteur), V7.20 (cinq étapes de découverte), V7.21 (quatre étapes d'usage), V7.22 (reprise de l'existant). Tristan n'a pas encore essayé ces quatre versions. Laissé de côté, à reprendre si une étape en a besoin :

| Point | Où on en est | Pertinence | Difficulté |
|---|---|---|---|
| Add Component by Class, Destroy Component | Hors chantier (décision 4) : les composants d'un acteur sont fixés dans son Blueprint | ★★ | M |
| Activate / Deactivate, Set Component Tick Enabled | Non simulés : un composant agit tant que son acteur existe | ★ | S à M |
| Scene Components faits en Blueprint | Non simulés : un Actor Component n'a ni position ni forme | ★ | L |
| Owner d'un acteur | Get Owner sur un acteur renvoie toujours None : Spawn Actor n'a pas de pin Owner | ★ | S |
| À vérifier dans Unreal | Ordre du Tick entre un acteur et ses composants ; événements Enhanced Input dans un Actor Component (refusés ici, comme les touches) | ★★ | S (essai dans UE) |
| Autres façons de faire | « Le levier universel » et R4 pourraient proposer la version composant en alternative (« Interagir par composant » la fait déjà juste après « Regarder et interagir ») | ★ | S à M |

### Plus tard, selon le cas

- **Passerelle « Dans Unreal »** : exercices compagnons à refaire dans le vrai éditeur, avec une liste d'observations (construction d'un acteur, Enhanced Input et Player Controller, interaction entre deux Blueprints), et graphes de référence pour comparer le simulateur à UE5 (voir « Une référence indépendante pour la fidélité »). Remonte avant le prochain chantier dès que Tristan peut ouvrir Unreal régulièrement.
- Personnage 3D, caméra, Enhanced Input Axis2D (lot 3) : après les chantiers ci-dessus.
- Animation, IA, rendu : fiches de découverte et pratique dans UE, sans les simuler.

## Reste du plan du parcours : à étudier, à faire selon l'étude

Décision de Tristan du 19 novembre, après la V7.18 : le plan du parcours (lots 0 à 4) est livré ; ce qui n'a été atteint qu'en partie est noté ici, à étudier avant de décider s'il faut le faire. Rien n'est lancé.

| Point | Où on en est | À étudier |
|---|---|---|
| Espacement des notions | 31 notions dépassent encore la cible de 15 étapes (`KNOWN_GAPS` dans `tests/spacing.test.ts`, après la V7.36) : sequence 58, data-tables 58, maps 54, structs 54, random 53, player-controller 49, timeline 46, latent 44… Les neuf étapes Actor Components ont allongé de 1 à 9 les écarts qui les traversent (héritage : 20 → 24) ; les six étapes UMG de la V7.36 de 1 à 6 (loops passe de 15 à 19). La V7.22 a ramené input, enhanced-input, loops et trace à 15 | Des rappels où ils sont naturels ; accepter une cible plus large pour certaines notions ; ou revoir l'ordre des blocs |
| Rappel de Player Controller | Depuis la V7.36, réécrit au Confirmé par Get Owning Player (les menus UMG) : écart ramené de 86 à 49. Reste un trou entre « Le vrai menu pause » et l'Expert X1 | Trouver une étape de l'Avancé où Get Player Controller sert naturellement (contexte d'entrée d'un mode, par exemple) ; les étapes UMG de la V7.37 en écriront peut-être |
| Avancé en cahier des charges | Fait : fiches de méthode après la réussite, premiers indices en questions, six objectifs réécrits. Pas fait : fiches « Ce qui est en place » réécrites, départ « niveau seul » des anciennes étapes | Réécrire les 24 étapes, ou seulement celles où le préconstruit retire l'essentiel du travail |
| Construire soi-même dans les anciennes étapes | Variables dès l'Intermédiaire, composants dès le Confirmé : seulement dans les étapes ajoutées pendant le plan | Reprendre les anciennes étapes, en vérifiant ta progression déjà faite (révision et avis de leçon changée) |
| Troisième projet Expert | Deux projets (X2, X1) | Remplacé par le chantier n° 5 (projet Expert final) |
| ~~« S'adapter à l'apprenant »~~ | Repris par le chantier n° 2 (révisions de graphes espacées) | — |
| Déclencheur Tap | Absent ; T2 utilise Hold + Canceled | L'ajouter à Enhanced Input, et voir si une étape en a besoin |
| Menu pause | Fait sans widget, sur Espace ; choix confirmé par Tristan le 20 novembre | Fait en V7.36 : « Le vrai menu pause » (widget, bouton Reprendre pendant la pause) suit « Le menu pause », qui garde son message et renvoie vers elle |

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

**Pas de changement de framework** : Preact, TypeScript et Canvas conviennent. Le build fait environ 1,7 Mo (500 Ko compressés) en V7.32 ; garder le fichier unique tant qu'une mesure sur téléphone ne montre pas un démarrage lent.

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
| ~~Révision par notion, révision variée, reprise différée des erreurs~~ | Repris par le chantier n° 2 (révisions de graphes espacées) | ★★★ | — |
| ~~Mini-projets autonomes~~ | **Fait** : synthèses S1 à S4, entraînements M1 et M2, projets Expert X1 et X2 | ★★★ | fait |
| Passerelle vers Unreal | Passée dans « Prochains chantiers », plus tard (dès que Tristan peut ouvrir Unreal) | ★★★ | M (contenu) |
| ~~Même problème, trois architectures~~ | **Fait** en V7.15 : « Choisis ton outil », puis imposé par la synthèse S3 | ★★ | fait |
| Revoir le bilan de qualité | Dans `core/quality/review.ts`, le nombre de nœuds pèse sur le verdict et les étoiles. En faire un indicateur secondaire ; critères distincts : fonctionnement, robustesse, notion travaillée, lisibilité, coût d'exécution | ★★ | M |
| Durée affinée | La durée est estimée d'après la taille de la solution ; l'affiner avec le temps réellement passé, que le journal des essais garde depuis la V7.27 (début et fin de chaque essai) | ★ | S à M |

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

Les retouches des V7.31 et V7.32 gardent ces principes : barres plus fines en paysage, barre du bas en onglets et contrôles de Play dans la barre d'outils (comme dans UE), ambre en variables CSS (`--app-*`).

## Lot 3 — Entrées et interaction

| Amélioration | Pourquoi | Pertinence | Difficulté |
|---|---|---|---|
| ~~Enhanced Input~~ **fait** (V7.4, V7.7, Trigger when Paused en V7.15, partout après la leçon Player Controller depuis le lot 1 du plan) | Reste : actions Axis2D et déplacement par Add Movement Input, modificateurs (Negate, Swizzle), déclencheurs Tap, Pulse, Chorded, déclencheurs sur l'asset Input Action | ★★★ | M |
| Regard indépendant du déplacement | Viser avec un Line Trace oblige aujourd'hui à bouger : un second manche, ou tourner sur place | ★★★ | S à M |
| Interaction plus complète (version intermédiaire) | Le schéma UE5 est en place (le joueur reçoit IA_Interagir et prévient par interface : « Interagir avec tout », R4, R3), et le composant réutilisable aussi (« Interagir par composant », V7.21). Reste : surbrillance de l'objet visé, invite « Appuie sur E » (prévue en V7.37, étape du chantier UMG), appui maintenu sur un objet | ★★★ | M |
| ~~Leçons Enhanced Input~~ **faites en V7.4** | La lampe en Enhanced Input, D20 (Add Mapping Context oublié), Maintenir pour ouvrir (Hold) | ★★★ | fait |
| Tick maîtrisé | Set Actor Tick Enabled, Tick Interval, Start with Tick Enabled, Event End Play (avec End Play Reason), Set Timer by Function Name | ★★ | S |

## Leçons à ajouter

| Leçon ou série | Contenu | Pertinence | Difficulté |
|---|---|---|---|
| ~~Synthèse de la V3~~ | **Remplacée** par les synthèses de niveau S1 à S4 (plan du parcours) | ★★★ | fait |
| Suite « jeu narratif » | Calquée sur Station enterrée. Fait : objet à examiner et dialogue en Data Table (V7), porte à code (V3), journal de faits et mode dialogue (X1, V7.18). Inventaire en composant fait (« Le sac et le coffre », V7.21). Reste le projet Expert final (chantier n° 5) | ★★★ | M à L |
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
| Widgets UMG (lot 7, chantier n° 3) | **Fait** : moteur (V7.33 à V7.35), douze étapes (V7.36, V7.37). [PLAN_UMG.md](PLAN_UMG.md). E10 et E27 du recueil y entrent ; E38 est noté à part | ★★★ | L |
| Widget Component — **fait** (chantier annexe, [PLAN_ANNEXE_WIDGET_PROJETS.md](PLAN_ANNEXE_WIDGET_PROJETS.md), V7.42 et V7.43 ; restent Set Widget, Set Draw Size, le mode World et le toucher d'un bouton de Widget Component par les scénarios) | Un widget porté par un acteur (espace Screen : suit l'acteur, toujours au-dessus), Get User Widget Object ; pour l'invite « Appuie sur E » au-dessus de l'objet et les barres de vie au-dessus des acteurs. Décision du 20 novembre : à faire en V7.37 s'il est facile une fois le runtime des widgets en place, sinon plus tard. **Jugé à la fin de la V7.35 : moyen** (nouveau type de composant avec Widget Class et Draw Size, un objet widget par acteur, dessin au-dessus de l'acteur dans la vue de dessus, Get User Widget Object, touchers). Fait le 20 novembre au soir à la demande de Tristan, revu et corrigé (V7.44, V7.45) | ★★ | M |
| Restes du moteur UMG | Laissés de côté pendant les V7.33 à V7.35, aucun n'est demandé par les étapes prévues : le Slot rendu par Add Child to Vertical Box (pour régler Padding et Size en jeu) ; Get Child At, Get All Children ; On Hovered / On Unhovered (pas de survol au doigt) ; focus clavier, In Widget to Focus (gardé sur le nœud, sans effet) et On Key Down redéfini (fermer un menu UI Only au clavier) ; Play Animation et l'onglet Animations ; Scroll Box, Widget Switcher, List View, Border, Size Box ; polices, styles de bouton, images importées ; curseur réellement dessiné (une pastille « Curseur » le signale) ; héritage entre Widget Blueprints ; Widget Reflector ; **valeurs par instance d'un User Widget placé** (ses variables Instance Editable réglées dans les Details de chaque exemplaire, lues par Pre Construct dans l'aperçu : la base des widgets réutilisables d'UE, un bouton et son libellé par exemple ; noté par la revue du chantier UMG, G1) | ★ à ★★ | S à M chacun |
| Vérifier dans UE | Choix faits d'après la documentation et les forums d'Epic, à confirmer dans l'éditeur : Text Block en Not Hit-Testable (Self Only) par défaut (Canvas Panel : confirmé par Epic), ordre On Released puis On Clicked, toucher ignoré en Game Only (décision 5), Expose on Spawn posé après On Initialized | ★★ | S |
| Glisser-déposer UMG (E38 du recueil) | Le tableau de tâches : Detect Drag if Pressed, Create Drag & Drop Operation, On Drag Detected / On Drop / On Drag Cancelled redéfinis, visuel qui suit le doigt. Écarté du chantier UMG le 20 novembre (trop lourd), à reprendre après | ★★ | L |
| Exercices en widgets | E07 (viseur), E43 (interrogatoire), E25 (régie) affichent avec des Text Render faute de widgets : les passer en UMG après le chantier n° 3 | ★ | S chacun |
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

### Étape 2 : plusieurs niveaux et GameInstance (lot 6, L, chantier n° 4)

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

**Analyse faite le 20 novembre** ([PLAN_NIVEAUX.md](PLAN_NIVEAUX.md)) ; Tristan a pris les sept recommandations (« Ok pour tes recos ») : vrai GameMode, pas de Level Blueprint, étapes à l'Avancé après « Le checkpoint », Quit Game simulé, pin Options sans effet, autonomie A4 dans le parcours, `Lvl_Principal`. Les étapes ci-dessus sont remplacées par celles du plan.

### Aller plus loin après le chantier n° 4 (demandé par Tristan : à garder, rien n'est lancé)

Ce que le chantier laisse de côté, du plus utile au moins utile pour un jeu solo comme Station enterrée :

| Idée | Ce qu'elle apprendrait | Pertinence | Difficulté |
| --- | --- | --- | --- |
| **Level Blueprint** | Un graphe par niveau, qui référence directement les acteurs posés ; ses variables meurent avec le niveau ; pourquoi la logique d'un objet va plutôt dans sa classe | ★★ | M |
| **Plusieurs Player Start et Player Start Tag** | Choisir où apparaître (Find Player Start, ChoosePlayerStart surchargé dans le GameMode) au lieu de déplacer le pion au BeginPlay | ★★ | M |
| **GameInstance Subsystems** | Ce qu'utilise Station enterrée : créés en C++, appelés depuis un Blueprint ; une fiche « Dans UE » puis, si on simule, un sous-système fourni par l'appli | ★★ | S (fiche) à M |
| **Streaming de niveaux** | Load Stream Level / Unload Stream Level, niveau persistant et sous-niveaux, World Partition (le défaut d'UE5) : ce qui reste chargé, l'attente d'un nœud latent | ★★ | L |
| **Recharger le niveau** | Open Level sur Get Current Level Name pour recommencer, et ce qui repart de zéro | ★★ | S |
| **GameState, PlayerState, HUD Class** | Le reste du Gameplay Framework : état de la partie, données du joueur, HUD créé par le GameMode | ★ | M |
| **Options d'Open Level** | `?porte=Nord`, Parse Option, Options String du GameMode : l'autre façon de passer une info au niveau suivant (pin montrée sans effet au chantier n° 4) | ★ | S à M |
| **Open Level (by Object Reference)** | Une référence au niveau au lieu d'un nom tapé (pas de faute de frappe possible) | ★ | S |
| **Écran de chargement** | Pourquoi un widget ne survit pas à Open Level, et les solutions d'UE (Seamless Travel, module de chargement) | ★ | M à L |
| **Save Game asynchrone** | Async Save Game to Slot, Async Load Game from Slot : attendre la fin avant d'enchaîner | ★ | M |
| **Seamless Travel, réseau** | Hors du solo : à expliquer seulement dans le mémo | ★ | — |

À vérifier dans UE avant d'en dépendre : Event Destroyed au changement de niveau (a priori non, End Play seulement) ; Delay et timers dans le graphe d'un GameInstance ; le message d'Open Level vers un niveau introuvable. Exercice E40 du recueil (v1.1) : à relire pour aligner les étapes 3 à 6.

## Ergonomie et design sur téléphone

| Amélioration | Pourquoi | Pertinence | Difficulté |
|---|---|---|---|
| Recherche et filtres du parcours (lot 4) | Par notion, format, durée, déjà réussi, à reprendre : cinq niveaux ne suffisent plus pour 124 étapes | ★★★ | M |
| Prise en main des gestes (lot 4) | Deux minutes qui font faire chaque geste (appui long, tirer un fil, deux doigts) avant la leçon 1 | ★★ | M |
| Plusieurs projets en Simulation libre | Créer, nommer, dupliquer, supprimer | ★★ | M |
| Modèles pour la Simulation libre | Partir d'une porte, d'un inventaire, d'un système d'interaction | ★★ | S à M |
| Rangement automatique | Straighten Connections, alignement d'une sélection | ★★ | M |
| Lecture en portrait | Adapter fiches et révisions ; le manifeste impose le paysage dans l'APK : distinguer adaptation web et orientation effective sur Android. Les barres compactes de la V7.31 ne s'appliquent qu'en paysage | ★★ | M |
| Bouton Retour d'Android | Vérifier son comportement dans chaque écran de l'APK | ★★ | S |
| Taille du texte réglable | Les valeurs sur les pins sont petites. Depuis la V7.31, le cadrage ne descend plus sous le zoom 0,7 (au lieu de 0,6) : à reprendre si ce n'est pas assez | ★ | S à M |
| Palette : favoris | Épingler ses nœuds préférés (les récents existent) | ★ | S |
| Niveau : tourner un acteur au doigt | Aujourd'hui par Details | ★ | S à M |
| Icônes des nœuds | Rapprocher encore le dessin de celui d'UE | ★ | S à M |
| Accessibilité du graphe | Le Canvas n'expose ni nœuds ni fils aux lecteurs d'écran ; une liste de nœuds navigable servirait aussi à chercher et diagnostiquer | ★ | M |
| Blueprint ouvert au départ d'une étape | Remarqué le 19 novembre (smoke, V7.30 comme V7.32) : « Débogue D15 — Les meubles sur une grille tournée » s'ouvre sur l'Event Graph vide de BP_Sol, alors que le graphe à réparer est dans BP_Poseur. Les étapes n'indiquent pas quel Blueprint montrer d'abord : vérifier les autres étapes à plusieurs Blueprints, et au besoin donner à chaque étape son Blueprint de départ | ★★ | S |
| Retouches | Save d'un projet d'essai qui enregistre pour rien ; force des vibrations. (Faits en V7.32 : menu ⋮, « 0 » du Timeline, en-tête de l'accueil en paysage, contrôles de Play qui recouvraient le niveau) | ★ | S |

## Motivation : séries, rappels, défis

La base existe depuis la V4 : l'accueil compte les jours d'affilée (`Progress.days`) et la révision sait ce qui est dû chaque jour.

| Amélioration | Pourquoi et comment | Pertinence | Difficulté |
|---|---|---|---|
| Objectif du jour | La série ne compte que si un objectif choisi est atteint (une leçon, ou cinq questions de révision). Réglable : léger, normal, soutenu | ★★★ | S |
| Gel de série | Un joker gagné tous les sept jours (deux au plus) qui sauve la série un jour sans pratique | ★★★ | S |
| ~~Défi du jour~~ | Repris par le chantier n° 2 : la séance du jour est la file « À retravailler en Blueprint » | ★★★ | — |
| Rappel dans l'appli | À l'ouverture, un bandeau dit ce que la série risque et ce qui est dû | ★★ | S |
| Rappel du jour (notification) | « Ta série de 6 jours tient encore : 4 questions à revoir. » Voir ci-dessous | ★★★ | M à L |
| Maîtrise par notion | Prévue par le chantier n° 2 mais **pas faite** : la réussite différée par notion, dans le Carnet (voir « Chantier n° 2 », laissé de côté) | ★★ | S à M |
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
| ~~Remettre `HANDOFF.md` au propre~~ | **Fait en V7.26** : sections anciennes mises à jour ; la « Reprise rapide » fait foi, la suite est l'historique des versions | ★★ | fait |
| Borner les journaux | `runtime/journal.ts` accumule les Print String ordinaires : un Print sur Tick fait grossir la mémoire. Borner l'affichage sans fausser les compteurs dont les vérifications ont besoin | ★★ | S à M |
| Découper au fil des travaux | `simulation.ts` (820 lignes), `interpreter.ts` (772), `App.tsx` (698 en V7.32 ; la barre du bas et les contrôles de Play en sont sortis, les boutons flottants pourraient suivre), `LessonSheet.tsx` (586) : découper selon leurs responsabilités quand on les modifie, pas pour la taille seule | ★★ | M par lot |
| Intégration continue | **Actions sur Node.js 24 en V7.26.** Reste : `ubuntu-latest` change d'image de temps en temps | ★ | S |
| Version de test avant la production | L'APK suit le site dès la publication : une prévisualisation séparée permettrait d'essayer avant | ★★ | M |
| Smoke test sans Python | Le réécrire avec Playwright pour Node, lançable sur la machine de Tristan (`tools/e2e/smoke.py` a 97 captures et, depuis la V7.31, une vérification de la place du graphe en paysage) | ★★ | M |
| Rappel de sauvegarde | Proposer un export quand le dernier date de plus d'un mois | ★ | S |
| CI sur les pull requests | Le workflow ne réagit qu'aux push sur `main` ; peu utile tant que tout est publié directement sur `main` | ★ | S |
| Test du joystick | Le smoke test ne déplace pas le joueur au doigt | ★ | S à M |
| Performance des grands graphes | Jamais mesurée au-delà des leçons : essayer une centaine de nœuds | ★ | M |
| Page de test claude.ai | L'APK suit le site : garder l'outil ou le retirer (toujours republiée à chaque version) | ★ | S |
| Publication sur le Play Store | Fiche, politique de confidentialité, test fermé | ★ | L (peu de code) |
| Synchronisation entre appareils | Retrouver sa progression sur téléphone et ordinateur ; demande un compte ou un stockage externe | ★★ | L |
| Version anglaise | Textes de l'appli et des leçons | ★ | L (contenu) |

## Déjà fait, noté ici auparavant

- V7.46 (20 novembre 2026), chantier n° 4 (niveaux et GameInstance), première version : plusieurs niveaux par projet (format 14, l'ancien niveau devient Lvl_Principal), assets Level dans le Content Drawer (+ Add › Level, ouvrir, renommer, supprimer), onglet du niveau à son nom, Play du niveau ouvert, Project Settings › Maps & Modes (Game Default Map, d'où partent les vérifications des leçons).
- V7.40 (20 novembre 2026), revue du chantier UMG, lot 3 (code et docs) : touchers rangés dans `core/umg/touchInput.ts`, un seul résolveur des chemins de widgets, Details d'un widget découpés par rubrique (`ui/panels/widgetDetails/`), docs à jour. La revue du chantier UMG est entièrement corrigée.
- V7.45 (20 novembre 2026), revue du chantier annexe, lot 2 : un seul export de projet (partage Android, comme la sauvegarde complète ; accents gardés dans le nom du fichier), noms de projet coupés à 60 caractères et rendus uniques après une restauration, « Une autre façon de faire » sur « Une barre par ennemi » (caster une fois à l'Event BeginPlay), taille de barre conseillée alignée (120 × 14), docs à jour. **Revue du chantier annexe corrigée.**
- V7.44 (20 novembre 2026), revue du chantier annexe, lot 1 ([REVUE_ANNEXE_WIDGET_PROJETS.md](REVUE_ANNEXE_WIDGET_PROJETS.md)) : le widget d'un Widget Component reste au-dessus de son acteur quelle que soit sa rotation (sa Location ne tourne plus avec l'acteur, en Play et dans l'éditeur) ; un projet importé garde ses règles de simulation et l'avis « règles changées » revient à son ouverture.
- V7.43 (20 novembre 2026), chantier annexe, étape 3 : quatre étapes à l'Avancé, notion `widget-component` : « La barre au-dessus de l'ennemi » (découverte, après T4), « Une barre par ennemi » (guidée), Débogue D26 « La barre figée » (après « Le checkpoint »), Transfert T5 « Les noms au-dessus des têtes » (avant S4). 140 étapes. **Chantier annexe terminé.**
- V7.42 (20 novembre 2026), chantier annexe, étape 2 : le moteur du Widget Component (composant Widget avec Widget Class et Draw Size, un widget par acteur créé avant son BeginPlay, construit à l'image suivante, détruit avec lui, dessiné au-dessus de l'acteur en Play et encadré dans l'éditeur ; Get User Widget Object ; boutons touchables selon le mode d'entrée ; conseil « Widget Component sans Widget Class »).
- V7.41 (20 novembre 2026), chantier annexe Widget Component et projets, étape 1 : « Mes projets » en simulation libre (plusieurs projets, chacun sous sa clé ; nouveau, ouvrir, renommer, dupliquer, exporter, supprimer après confirmation, importer sans rien remplacer ; le dernier ouvert en tête). [PLAN_ANNEXE_WIDGET_PROJETS.md](PLAN_ANNEXE_WIDGET_PROJETS.md).
- V7.39 (20 novembre 2026), revue du chantier UMG, lot 2 (Play et Designer au téléphone) : le mode d'entrée décide qui a le doigt comme dans UE (Game Only : joystick et touches devant ; Game and UI et UI Only : les boutons des widgets devant, et en UI Only le joystick et les touches ne prennent plus rien) ; PAUSED caché quand un widget est à l'écran ; Screen Size du Designer, 1280 × 720 ou Téléphone (le format de Play).
- V7.38 (20 novembre 2026), revue du chantier UMG, lot 1 (le moteur au plus près d'UE) : Create Widget sans Owning Player prend le premier joueur local (Get Owning Player n'est plus None), avec un conseil de construction « Create Widget sans Owning Player » ; un widget Collapsed ou Hidden ne tick plus et ses Bindings ne sont plus lus (sauf la Visibility, tant que le parent est dessiné) ; User Widgets frères construits dans l'ordre de l'arbre ; un User Widget placé, retiré, peut aller ailleurs ; une chaîne d'appels sans fin s'arrête à 250 appels imbriqués (« Infinite script recursion », comme UE) au lieu de geler l'appli. C2 « La factorielle » finit maintenant sur ce message, comme dans UE.
- V7.37 (20 novembre 2026), chantier n° 3 (UMG), cinquième et dernière version : « La barre de vie », Refactor R6 « La jauge d'oxygène » (un Binding remplacé par un Event Dispatcher), « Appuie sur E » (invite Collapsed, sur la base d'« Interagir comme dans UE5 »), Autonomie A3 « Le terminal de la station » et Complète C7 « La playlist » (E27 du recueil) au Confirmé ; Transfert T4 « La jauge d'énergie » (un Actor Component) à l'Avancé. Reprise : famille de mini-exercices « Interfaces (UMG) », fiche du mémo, glossaire (Binding ou événement, Visibility d'un widget), six questions. Étape de scénario `click` avec `nth`.
- V7.36 (20 novembre 2026), chantier n° 3 (UMG), quatrième version : les six premières étapes. « Le compteur à l'écran » (Intermédiaire, juste après le Player Controller), puis au Confirmé après « Le menu pause » : Prédis P16 « Combien de Construct ? », « Le menu qui rend le contrôle » (E10 du recueil), Débogue D24 « Le menu qui ne part pas », « Le vrai menu pause », Débogue D25 « Le bouton qui ne répond pas ». Notions `umg` et `ui-input`, glossaire, six questions de révision, fiche UMG du mémo reliée aux étapes.
- V7.35 (20 novembre 2026), chantier n° 3 (UMG), troisième version : boutons (On Clicked, On Pressed, On Released par le + des Details), Set Input Mode Game Only / UI Only / Game and UI, Show Mouse Cursor, toucher ignoré en Game Only avec « Pourquoi ? », UI Only qui coupe touches, actions et joystick, ce qui prend un toucher comme Slate (défauts Not Hit-Testable, Image qui couvre, Is Enabled), boutons et Event Tick en pause, étape `click` des scénarios.
- V7.34 (20 novembre 2026), chantier n° 3 (UMG), deuxième version : les widgets à l'écran pendant Play. Create Widget (Expose on Spawn, Owning Player), Add to Viewport, Remove from Parent, Is In Viewport, cycle de vie d'UE (On Initialized une fois, Pre Construct et Construct à chaque ajout, Destruct à chaque retrait, Warning au double ajout), Set Text, Set Percent, Set Visibility, Set Color and Opacity, Add Child to Vertical / Horizontal Box, Remove Child, Clear Children ; Event Tick du widget même en pause ; Bindings (menu Bind, Create Binding, appel à chaque image compté dans l'Outliner, arrêt par un Set) ; Event Pre Construct rejoué dans le Designer.
- V7.33 (20 novembre 2026), chantier n° 3 (UMG), première version : le Widget Blueprint (+ Add › User Interface), son Designer réduit (Palette, Hierarchy, Details, aperçu 1280 × 720 avec zoom à deux doigts, glisser dans un Canvas Panel, ancres), Canvas Panel, Vertical / Horizontal Box, Overlay, Text, Progress Bar, Button, Image, Spacer et User Widget ; son Graph (Event Construct, Pre Construct, Destruct, On Initialized, Event Tick du widget, Get Owning Player, widgets Is Variable) et ses règles de compilation. Rien à l'écran pendant Play avant la V7.34.
- V7.32 (19 novembre 2026), chantier annexe « retouches de l'interface », lot B : barre du bas en onglets (Compiler Results, Output Log, Debug, Find Results, chacun ouvre son panneau), contrôles de Play dans la barre d'outils du niveau à côté de Stop (comme dans UE : le haut du niveau reste libre), accueil en paysage sur une ligne et bandeau de révision fin, menu ⋮ plus large (indices sous les libellés, défilement), « 0 » de l'axe du Timeline dégagé, couleurs partagées en variables CSS. Chantier annexe terminé.
- V7.31 (19 novembre 2026), chantier annexe « retouches de l'interface », lot A : barres plus fines en paysage sur téléphone (le graphe passe d'environ 224 à 246 px de haut sur 370), boutons flottants en colonne au bord droit et + seul en bas, cadrage sur toute la hauteur avec un zoom plancher de 0,7 (au lieu de 0,6), messages en bas à droite (en haut pendant Play ou quand un panneau du bas est ouvert), onglet « Objectifs ▾ » replié bien placé sous la barre d'outils.
- V7.30 (19 novembre 2026), chantier n° 2, étape D : dans les Débogue et les mini-exercices à réparer, une question « l'événement, la référence ou la condition ? » (ou « Je ne sais pas encore ») remplace le premier bouton d'indice ; l'indice s'ouvre ensuite, avec ce que montre la vérification (`core/explain/hypothesis.ts` : Accessed None ou Cast jamais réussi → référence, Branch jamais sorti d'un côté → condition, événement jamais déclenché → événement ; sinon, tester soi-même). Hypothèse gardée dans l'aide de l'étape et dans le journal. Le chantier n° 2 est terminé.
- V7.29 (19 novembre 2026), chantier n° 2, étape C : mini-exercices à variantes (`core/drills/`), trois familles (Variables et Branch, Overlaps et événements, Cast To) de trois situations chacune, en trois formats (à compléter, à réparer, à reconstruire), tirés d'une graine reproductible ; pour 36 graines par famille, le départ échoue et la solution passe, et chaque erreur typique échoue avec une raison (`tests/drills.test.ts`). La file propose d'abord un mini-exercice de la famille, au format du calendrier (compléter à J+1, reconstruire, puis réparer).
- V7.28 (19 novembre 2026), chantier n° 2, étape B : file « À retravailler en Blueprint » (`core/rework/`) dans l'onglet Révision, calculée à partir du journal (et des étapes réussies avant lui) : J+1, J+3, J+7, J+14, J+21 par notion ; une étape réussie à refaire de zéro dans un espace à part (`project:practice:<id>`), notions d'une même étape réunies sur une carte, « Une autre étape », « Reporter à demain » ; compteur et bandeau de l'accueil.
- V7.27 (19 novembre 2026), chantier n° 2, étape A : journal des essais (`core/progress/attempts.ts`, `core/lessons/outcome.ts`), un essai par étape du premier Vérifier à la réussite, à Recommencer, à une mise à jour de l'étape ou après 2 h d'absence ; dans la progression, versionné, exporté avec la sauvegarde complète ; affiché dans le Carnet (« Journal des essais »), effaçable.
- V7.26 (19 novembre 2026), revue, lot 4 : barre d'outils lisible en paysage, restauration dans la file d'écriture, actions GitHub sur Node.js 24, HANDOFF.md remis au propre. La revue des V7.2 à V7.22 est terminée.
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
