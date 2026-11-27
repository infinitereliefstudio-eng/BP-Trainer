# Revue de la marche A (le monde en 3D), V7.77 à V7.80 (27 novembre 2026)

Demandée par Tristan le 27 novembre à 9 h 32 (« les essais sont ok pour le moment, la navigation est fluide et naturelle. On peut passer à la revue »), en redonnant l'accès en écriture. Revue de la phase 2 de la [feuille de route](FEUILLE_DE_ROUTE_3D_UI.md) : 3D-0 (V7.77), 3D-1 (V7.78), 3D-2 (V7.79, V7.80, avec UI-6). Tristan a répondu le 27 novembre à 10 h 28 (« 1 : ok pour ta reco ; 2 : on va implémenter comme dans UE maintenant ; 3 : ok pour ta reco ; 4 : ok pour ta reco ») et les corrections sont lancées : **V7.81 faite** (lot 1), **V7.82 faite** (lot 2 sans Scale : B1, V2, T1, L1, D1), **V7.83 faite** (S1, Scale comme dans UE) : **revue entièrement corrigée**.

État de départ : lint, types et build sans erreur, 2 025 tests, smoke test sans erreur (`errors []`). Chaque constat a été reproduit par un test jetable (non versionné), se lit dans le code, ou s'appuie sur les sources citées en bas.

## Juste et à garder

- **La logique n'a pas bougé** : la 3D ne fait que dessiner. Les hauteurs devinées (`heights.ts`), le calcul du gizmo (`gizmoMath.ts`, `gizmoDrag.ts`) et la caméra (`viewCamera.ts`) sont sans DOM et testés ; Top reste la vue de dessus d'avant, par défaut.
- **Sobre pour le téléphone** : dessin seulement quand quelque chose change (rien en pause), huit lumières réelles dans un réservoir fixe (pas de recompilation des shaders), objets three.js fabriqués une fois puis déplacés, libérés quand l'acteur part. Tristan trouve la navigation fluide et naturelle.
- **Les axes** : X et Y du niveau sont ceux d'UE, et la vue de dessus montre X vers la droite et Y vers le bas, **comme la vue Top d'UE**. Le sens du Yaw est le bon (un Yaw positif tourne de X vers Y). Grid Snap à 10 et Rotation Snap à 10° par défaut, comme UE.
- **La barre du niveau d'UE 5.8** (Save, Selection Mode, Quick Add, Blueprints, Cinematics, Play et ses options, Platforms, Settings) est dans le bon ordre, et ce qui n'est pas simulé est grisé au lieu d'être caché : on apprend où sont les choses.
- **Eject / Possess** : la partie continue, le pion ne reçoit plus rien, comme le F8 d'UE.

## Constats

| Code | Constat | Gravité | Lot |
| --- | --- | --- | --- |
| V1 | **Front, Back, Left et Right sont tournés d'un quart de tour par rapport à UE.** Dans UE 5, Front et Back regardent **le long de X** (on voit Y et Z ; `LVT_OrthoNegativeYZ` = Front, `LVT_OrthoYZ` = Back), Left et Right regardent **le long de Y** (on voit X et Z ; `LVT_OrthoNegativeXZ` = Left, `LVT_OrthoXZ` = Right). Front se place du côté +X (X sort de l'écran, +Y à gauche) et voit donc la face d'un acteur tourné vers +X. Dans l'appli, Front regarde depuis +Y (X vers la droite), ce qui correspond à la vue **Right** d'UE ; Left regarde depuis -X, ce qui correspond à la vue **Back** d'UE. Correspondance la plus probable : Front de l'appli = Right d'UE, Back = Left, Left = Back, Right = Front. La note « à vérifier dans UE » de la V7.78 est donc tranchée. C'est un réflexe que Tristan prendrait de travers | Moyenne | 1 |
| G1 | **Les poignées du gizmo se touchent sur ≈ 29 px, pas 44.** Les jumelles invisibles ont un rayon de 0,16 sur un gizmo de 90 px : ≈ 29 px de large pour les flèches, l'anneau et le cube central, ≈ 31 px pour le carré jaune. La règle d'UI-1 (au moins 44 px) et la section V7.79 (« ≈ 44 px ») ne sont pas tenues. Près du centre, la zone du carré chevauche celles des deux flèches | Moyenne | 1 |
| E1 | **Pendant Eject, toucher un acteur le clique encore** (Event ActorOnClicked), dans la vue de dessus comme en 3D. Dans UE, une fois éjecté, la souris est celle de l'éditeur : elle choisit l'acteur pour lire ses Details (la fiche de mémo de l'appli le dit), et le jeu ne reçoit rien | Faible | 1 |
| E2 | **Pendant Eject en 3D, un doigt posé sur un acteur ne tourne pas la vue** : le geste part en « glisser un acteur », qui ne fait rien pendant Play. Dans un niveau chargé, on ne trouve pas de vide pour tourner. Le niveau en 3D, lui, se replie sur la rotation | Faible | 1 |
| E3 | **Une touche tenue au moment d'Eject reste enfoncée** (plausible, lu dans le code) : Eject remet le joystick à zéro, mais les boutons E, F et Espace disparaissent sans relâcher leur touche. Tenir E d'un doigt et toucher Eject de l'autre suffit | Faible | 1 |
| C1 | **Après Open Level en 3D, la caméra glisse depuis l'ancien niveau** au lieu de sauter sur le nouveau Player Start : `follow(…, 0)` ne bouge pas une caméra déjà placée (reproduit : 360 cm parcourus à l'image suivante, ≈ 0,5 s de glissade au-dessus du vide). Si l'on est éjecté pendant le voyage, la caméra libre reste aussi sur l'ancien niveau | Faible | 1 |
| C2 | **Le niveau en 3D garde le cadrage de la leçon précédente** : la caméra de l'éditeur est partagée par tout le module (`shared.camera`) et ne cadre le niveau qu'à sa toute première ouverture. Ouvrir une autre leçon, ou un autre niveau dans Maps, en Perspective, montre l'endroit où l'on était avant, parfois du vide. Dans UE, chaque niveau garde sa caméra | Faible | 1 |
| S1 | **Scale change une taille, pas une échelle.** Dans UE, l'outil Scale change le **Scale** du composant (Transform › Scale, un facteur, 1 par défaut), et le Scale Snap est un facteur (0,25, 0,5, 1…). Il ne touche ni la taille du mesh, ni le Box Extent. Dans l'appli, Scale écrit « Taille X / Y » (Static Mesh) ou « Box Extent » (Box Collision), et le Scale Snap est en cm. C'est une adaptation de l'appli (le modèle n'a pas d'échelle), mais rien ne le signale : dans UE, Tristan chercherait sa nouvelle taille dans Scale | Moyenne | 2 |
| B1 | **Box Extent est affiché en taille entière** ; dans UE, c'est la **demi-taille** (« radii dimensions » : un Box Extent de 32 fait une boîte de 64 cm). Une zone de 200 × 200 dans l'appli se règle à 100 × 100 dans UE : recopiée telle quelle, elle serait deux fois trop grande. Antérieur à la marche A (le modèle le dit : « full size »), mais la 3D rend les tailles plus visibles | Moyenne | 2 |
| V2 | **L'ordre de la barre du viewport** : dans UE 5.6 et suivants, les outils de transformation et les accrochages viennent d'abord (en haut à gauche), puis la caméra (Perspective) et le mode (Lit). L'appli met Perspective et Lit en premier. Vu dans la documentation d'Epic et un article sur la nouvelle barre ; à confirmer sur une capture d'UE 5.8 | Faible | 2 |
| T1 | **Des descriptions de nœuds parlent encore de la vue de dessus** : « vue de dessus, seul Yaw (Z) compte » (Get / Set Actor Rotation), « En 2D, seul Yaw compte » (Set Relative Rotation), « En 2D, Z est ignoré » (Set Relative Location), Make Vector, Make Rotator, Break Rotator. La relecture de la V7.80 a couvert les étapes et le glossaire, pas la bibliothèque de nœuds | Faible | 2 |
| L1 | **Les noms posés sur la 3D ignorent Réglages › Taille du texte** et les jetons d'UI-1 : 12 px et couleurs écrites en dur, et une largeur estimée à 6,6 px par lettre pour éviter qu'ils se couvrent. En « Très grande », les noms restent petits | Faible | 2 |
| D1 | **Docs** : la section V7.79 d'HANDOFF annonce des poignées de ≈ 44 px (G1) ; le titre de « Reprise par un autre agent » dans BACKLOG dit encore « après la V7.74 » ; la note « sens des vues à vérifier dans UE » est tranchée par V1 | Faible | 2 |

**À vérifier, pas des erreurs prouvées** :

- **Chauffe et batterie** après dix minutes de Play en 3D, sur le Pixel, surtout dans un projet qui trace beaucoup (La ronde : les gardes lancent des Line Trace à chaque image, et leurs traits sont refaits à chaque image). Tristan trouve la 3D fluide ; la chauffe n'a pas encore été regardée.
- **Le démarrage de Play** : chaque passage entre l'éditeur et Play crée un nouveau contexte WebGL, et ses shaders sont recompilés. Si Play met un moment à s'afficher sur le téléphone, c'est la piste.
- **Le côté exact des vues Left et Right** (V1) : la documentation d'Epic dit le long de quel axe elles regardent, pas de quel côté. Le plus logique, par symétrie avec Front (côté +X, la face de l'acteur) : Right du côté +Y (la droite de l'acteur), Left du côté -Y.

## Lots proposés

| Lot | Contenu | Version |
| --- | --- | --- |
| 1 | **V1** : Front, Back, Left et Right comme dans UE 5 (les axes, les indications du menu Viewport Type, les tests de `viewCamera3d`), avec une note « Dans UE » sur le sens des vues. **G1** : zones de toucher d'au moins 44 px, le carré jaune prioritaire au centre, un test qui mesure la taille à l'écran. **E1, E2, E3** : en Eject, toucher choisit sans cliquer, un doigt sur un acteur tourne la vue, les touches tenues sont relâchées. **C1** : la caméra saute sur le nouveau Player Start après Open Level. **C2** : une caméra par niveau, cadrée à sa première ouverture. Un test chacun quand c'est possible | V7.81 |
| 2 | **S1** selon la réponse à la question 2. **B1** : Box Extent affiché en demi-taille dans Details (le modèle ne change pas). **V2** : la barre du viewport dans l'ordre d'UE. **T1** : descriptions des nœuds relues. **L1** : noms de la 3D à la taille du texte choisie et aux couleurs des jetons. **D1** | V7.82 |

Ensuite, d'après la feuille de route : la phase 3 (UI-2 accueil « Aujourd'hui », UI-3 fiche de leçon en tiroir, UI-5 Blueprint Editor façon UE 5.8), sur son feu vert.

## Questions à trancher

1. **V1, le sens des vues** : les remettre comme dans UE (recommandé : c'est un réflexe d'éditeur, et rien n'en dépend dans les étapes), ou garder l'ordre actuel avec une note ?
2. **S1, l'outil Scale** : (a) garder les tailles en cm, mais marquer le Scale Snap comme un ajout de l'appli (ambre) et dire dans une note « Dans UE » que Scale change l'échelle du composant, pas sa taille ; puis ajouter un vrai Scale au modèle avec la marche B, qui touche déjà le format pour Z (recommandé : un seul changement de format) ; ou (b) ajouter le Scale tout de suite (changement de format, Details, nœuds) ?
3. **B1, Box Extent en demi-taille** : l'afficher comme UE (recommandé : les nombres qu'on lit dans Details changent, une zone de 200 affichera 100, mais aucun texte d'étape ne cite de Box Extent), ou garder la taille entière et le dire dans une note ?
4. **V2, l'ordre de la barre du viewport** : suivre UE (recommandé), ou garder Perspective et Lit en premier, plus faciles à trouver au téléphone ?

**Réponses (27 novembre, 10 h 28)** : 1. comme UE ; 2. **Scale comme dans UE dès maintenant** (b) : une vraie échelle dans le modèle, sans attendre la marche B ; 3. Box Extent en demi-taille ; 4. l'ordre d'UE.

## Sources

- [ELevelViewportType](https://dev.epicgames.com/documentation/unreal-engine/API/Editor/UnrealEd/ELevelViewportType) (API d'Epic) : `LVT_OrthoXY` Top, `LVT_OrthoXZ` Right, `LVT_OrthoNegativeXZ` Left, `LVT_OrthoYZ` Back, `LVT_OrthoNegativeYZ` Front, `LVT_OrthoNegativeXY` Bottom
- [Is my front (orthographic) view supposed to be showing me the y and z axis?](https://forums.unrealengine.com/t/is-my-front-orthographic-view-supposed-to-be-showing-me-the-y-and-z-axis/450427) et [Viewport axes](https://forums.unrealengine.com/t/viewport-axes/457007) : en vue Front, X sort de l'écran, +Y à gauche, Z en haut
- [Viewport top view's axis orientation](https://forums.unrealengine.com/t/viewport-top-views-axis-orientation/1973842) : en vue Top, X vers la droite et Y vers le bas (comme l'appli)
- [Viewport Toolbar](https://dev.epicgames.com/documentation/en-us/unreal-engine/viewport-toolbar) (UE 5.6+) : outils de transformation et accrochages, puis caméra, puis mode d'affichage ; [UI Changes in Unreal Engine 5.6](https://www.versluis.com/2025/09/ui-changes-in-unreal-engine-5-6/) : les outils et les accrochages passent en haut à gauche
- [UBoxComponent](https://docs.unrealengine.com/4.27/en-US/API/Runtime/Engine/Components/UBoxComponent/) et [Set Box Extent](https://dev.epicgames.com/documentation/unreal-engine/BlueprintAPI/Components/Box/SetBoxExtent) : Box Extent = demi-dimensions, avant l'échelle du composant
- Dépôt : `src/editor/world3d/viewCamera.ts` (`ORTHO`), `gizmo.ts` (jumelles invisibles), `World3DCanvas.tsx` (Eject, Open Level), `followCamera.ts` (`follow`), `Level3DEditor.tsx` (`shared.camera`), `gizmoDrag.ts` (Scale), `src/ui/editor/ViewportBar.tsx`, `src/ui/viewportSettings.ts` (`SCALE_SNAPS`), `src/ui/panels/ComponentDetails.tsx` (Box Extent), `src/editor/world/WorldCanvas.tsx` (toucher pendant Play), `src/editor/world/playSession.ts` (`setEjected`), `src/core/nodes/library/actor.ts`, `components.ts`, `math.ts`, `src/ui/styles/app.css` (`.w3-label`)
