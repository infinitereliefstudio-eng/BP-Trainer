# Revue du chantier UMG, V7.33 à V7.37 (20 novembre 2026)

Copie du Claude Doc « BP Trainer — Revue du chantier UMG (V7.33 à V7.37) » : https://claude.ai/artifact/CrkTaiJba82iawUak3Nwfy. Demandée par Tristan le 20 novembre (« fait une phase de review sur le chantier umg »), après lui avoir donné l'accès en écriture au dépôt. Tristan a pris les recommandations et lancé les corrections le même jour (« ok pour tes recos, tu peux passer aux corrections ») : les trois lots s'enchaînent, une version chacun.

État de départ : lint, types et build sans erreur, 1 690 tests, smoke test sans erreur (captures 83 à 98 relues). Rien ne casse une sauvegarde ni une progression. Chaque constat a été reproduit par un test jetable (non versionné) ou se lit dans le code ou une capture.

Juste et à garder : cycle de vie (On Initialized une fois avant Expose on Spawn, Pre Construct puis Construct à chaque ajout, intérieurs d'abord, Destruct, avertissements d'UE au mot près), toucher à la Slate (défauts Not Hit-Testable, Image qui couvre, ordre Pressed / Released / Clicked de SButton), UI Only = SetIgnoreInput (joystick compris), widgets en pause et Delay de widget qui attend, Bindings comptés et arrêtés par un Set, aperçu Pre Construct, aucun cas de leçon dans le moteur, pièges des leçons testés.

## Constats

| Code | Constat | Gravité | Lot |
| --- | --- | --- | --- |
| F1 | Create Widget sans Owning Player : Get Owning Player (Pawn) renvoie None ici ; UE prend le premier joueur local (GameInstance GetFirstGamePlayer). Le test `umgRuntime` « Get Owning Player Pawn is None… » affirme le comportement faux | Moyenne | 1 |
| F2 | Un widget Collapsed ou Hidden continue son Event Tick et ses Bindings ; dans UE, un widget non dessiné ne tick pas | Moyenne | 1 |
| F3 | Deux User Widgets placés frères se construisent à l'envers (`Umg.sync` inverse tout `subtree`) ; UE suit l'ordre de l'arbre | Faible | 1 |
| F4 | Un User Widget placé, retiré par Remove from Parent, garde `placedIn` : Add to Viewport dit « already has a parent widget » | Faible | 1 |
| R1 | Event Construct qui fait Create Widget de sa propre classe puis Add to Viewport : 33 333 objets, 5,5 s sur ordinateur avant « Infinite loop detected ». Pas de limite de profondeur des événements en chaîne ; `viewport()` et `sync` reparcourent tous les objets | Moyenne | 1 |
| I1 | Le joystick et E / F / Espace sont dessinés devant le calque des widgets et prennent le doigt (presque la moitié basse de l'écran sur le Pixel), même en UI Only (seulement `opacity: 0.35`). Le correcteur (`tapButton`) touche le bouton quand même | Haute | 2 |
| I2 | PAUSED (`.game-paused`) est dessiné devant les widgets, au centre : il traverse un menu pause (capture 96) | Moyenne | 2 |
| I3 | Designer en 1280 × 720 ; en Play, 720 de haut et la largeur du téléphone (environ 2 100 sur le Pixel) : un widget ancré au centre se décale d'environ 400, à droite d'environ 800, sans aperçu possible | Faible | 2 |
| C1 | `simulation.ts` à 991 lignes : les touchers (touchDown, touchUp, tapButton, objectOfPath, fireButton) iraient dans `core/umg` ; tapButton répète sa recherche | Faible | 3 |
| C2 | Parcours des chemins `@objet/…` écrit quatre fois (override, extra, resolve, objectOfPath) | Faible | 3 |
| C3 | `WidgetDetails.tsx` : un composant de 230 lignes, à découper par rubrique | Faible | 3 |
| D1 | HANDOFF « Reprise rapide » : « En cours : corrections de la revue du 19 novembre » périmé ; BACKLOG « Déjà fait » : V7.33 à V7.37 dans le désordre | Faible | 3 |

Manque noté (G1, lot 3, au backlog seulement) : valeurs par instance d'un User Widget placé (variables Instance Editable réglées dans les Details de chaque exemplaire, lues par Pre Construct).

À vérifier dans Unreal, pas des erreurs prouvées : Visibility par défaut des Vertical / Horizontal Box, Overlay, Spacer (Visible ici) ; Is Variable par défaut de l'Image et de la Progress Bar ; Set Percent sur une Progress Bar liée (masque-t-il le Binding seulement jusqu'à la reconstruction ?) ; toucher en Game Only sur Android (D25 vaut pour un projet PC).

## Lots proposés

| Lot | Contenu | Version | État |
| --- | --- | --- | --- |
| 1 | F1 à F4, R1 : le moteur au plus près d'UE (Owning Player vide = premier joueur, avec un conseil de construction ; ni Tick ni Binding pour un widget non dessiné ; ordre des frères ; parent oublié au retrait ; limite de profondeur et objets indexés) | V7.38 | fait |
| 2 | I1 à I3 : Play et Designer au téléphone (boutons des widgets devant les contrôles virtuels, contrôles inertes en UI Only ; PAUSED et aperçu selon les questions) | V7.39 | proposé |
| 3 | C1 à C3, D1, G1 : rangement du code, docs, backlog | V7.40 | proposé |

## Questions à trancher

1. PAUSED quand un widget est à l'écran : le cacher (recommandé) ou le passer en pastille en haut. **Réponse : le cacher.**
2. Aperçu du Designer : ajouter un choix « Téléphone » à côté de 1280 × 720, comme le menu Screen Size d'UE (recommandé), ou garder un seul format. **Réponse : ajouter « Téléphone ».**

Sources : [Owning Player vide (forum Epic)](https://forums.unrealengine.com/t/creating-widgets-in-the-playercontroller-and-widget-ownership/136507), [widgets cachés sans Tick (forum Epic)](https://forums.unrealengine.com/t/umg-widget-disappearing-outside-of-camera-view/40798), [Tick d'un widget Collapsed (forum Epic)](https://forums.unrealengine.com/t/umg-tick-function-removed-when-set-to-collapsed/324532).
