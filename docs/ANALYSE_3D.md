# Analyse : passer le monde de la 2D à la 3D

Demandée par Tristan le 26 novembre 2026 (« le coût du passage de la 2D à la 3D : en termes d'implémentation, et pour trouver des solutions de navigation agréables sur téléphone »). Analyse seulement : **rien n'est lancé**. Base : le code de la V7.74.

## 1. En bref

- **Le monde est en 2D vu de dessus d'un bout à l'autre** : le modèle (X, Y, Yaw), la physique (formes au sol), le rendu (Canvas 2D) et les 155 étapes (183 positions de scénario en X, Y). Les pins Vector ont déjà un Z, qui est ignoré à l'exécution.
- **L'éditeur de graphe, le cœur de l'appli, n'est pas touché.** La 3D ne concerne que ce qui est autour : le niveau, le Viewport d'un Blueprint, Play et le correcteur.
- **Il n'y a pas « une » 3D mais trois marches**, de coût très différent :

| Marche | Ce que ça donne | Coût | Effet sur les 155 étapes |
| --- | --- | --- | --- |
| **A. Un monde dessiné en 3D** | Le même monde, vu en 3D : murs, portes, lampes en volume, caméra qui suit le joueur. La logique reste au sol | **L**, ≈ 3 versions | Aucun sur les vérifications ; une cinquantaine de textes à relire (« en haut de l'écran ») |
| **B. La hauteur dans la logique** | Z compte : Location Z, étages, sauter, tomber, Line Trace en 3D, monte-charge vertical | **L à XL**, ≈ 4 versions | Restent justes tant que tout est à Z = 0 ; à revérifier une par une par les tests ; nouvelles étapes possibles |
| **C. Le personnage et la caméra d'UE** | Character Movement, Spring Arm, Camera, regarder avec le doigt (Axis2D), déplacement relatif à la caméra, Possess, rotations Pitch et Roll | **XL**, ≈ 5 versions ou plus | Les étapes qui supposent « le joueur regarde où il marche » (≈ 20 scénarios avec `look`, 9 fichiers avec Forward Vector, Find Look at Rotation ou Line Trace) sont à reprendre |

- **Recommandation** : commencer par **un prototype de la marche A** (une version, derrière un réglage « Vue 3D (essai) »), à essayer sur le Pixel, avant de décider d'aller plus loin. C'est la seule façon fiable de juger du confort au doigt et de la tenue sur téléphone.

## 2. Ce qui existe aujourd'hui

| Couche | Aujourd'hui | Fichiers |
| --- | --- | --- |
| Modèle | Acteurs et composants : `x`, `y`, `yaw`, `sizeX`, `sizeY`. Pas de Z, de hauteur, de Pitch ni de Roll | `core/model/project.ts` (`ComponentProps`), `core/runtime/world.ts` (`ActorRT`) |
| Valeurs | `Vec3 { x, y, z }` existe ; les nœuds de position et de rotation ne gardent que X, Y et la Yaw (`rot.z`) | `core/runtime/behaviors/actors.ts`, `actions.ts` |
| Physique | Boîtes orientées et cercles au sol, test des axes séparateurs ; le joueur est un cercle de 34 cm poussé hors des murs ; Line Trace dans le plan | `core/runtime/physics.ts` (197 lignes), `movement.ts` (65), `trace.ts` (70), `overlaps.ts` (85) |
| Rendu | Canvas 2D vu de dessus, une seule caméra (déplacement et zoom) | `editor/world/worldRender.ts` (443), `WorldCanvas.tsx` (332), `viewport/ViewportCanvas.tsx` (272) |
| Play | Joystick à gauche, boutons E, F, Espace à droite ; le joueur se tourne vers où il marche | `ui/play/PlayOverlay.tsx`, `core/runtime/movement.ts` |
| Leçons | Positions de départ, `teleport` et `walk` en X, Y (183 pas dans 59 fichiers), `look` en degrés de Yaw (20) | `core/lessons/library/*` |

Le moteur de simulation (interpréteur, événements, timers, UMG, niveaux, GameInstance) ne dépend pas de la géométrie : il ne bouge dans aucune des trois marches.

## 3. Le coût par partie

### 3.1 Le rendu 3D

Deux voies :

| Voie | Pour | Contre |
| --- | --- | --- |
| **three.js** (bibliothèque libre, la plus répandue) | Lumières, caméras, sélection au doigt (Raycaster), textes en sprites : tout est prêt. Mesuré le 26 novembre avec ce qu'il faudrait (rendu, caméras, boîtes, cylindres, matériaux, Point Light, Raycaster, lignes, sprites) : **552 Ko, 137 Ko compressés** | L'appli passe de 2,39 Mo à ≈ 2,94 Mo (+ 23 %) ; première dépendance après Preact |
| Moteur maison en WebGL | Rien à ajouter au poids ; seulement ce qu'il faut | 1 500 à 2 500 lignes à écrire et maintenir (ombrage, lumières, sélection) : plus long, sans gain pour l'apprentissage |

**Recommandé : three.js.** Le poids reste raisonnable pour une appli qui fonctionne hors ligne, et le temps gagné va aux leçons.

Ce qu'il faut dessiner : un sol à grille, les Static Mesh (cube, cylindre, porte) avec une hauteur par défaut, les Point Light (halo et éclairage), les Box Collision en fil de fer dans l'éditeur, les Text Render et les noms en sprites face à la caméra, le Player Start, la capsule du joueur, les lignes de débogage des Line Trace, la sélection. Les Widget Component restent dessinés par-dessus, à la position projetée de l'acteur (un calcul).

**Tenue sur téléphone** : quelques dizaines d'objets simples, c'est léger pour un Pixel 9 Pro. Le point à surveiller, ce sont les lumières : en rendu direct, chaque Point Light coûte sur chaque objet. Les niveaux actuels en ont peu (trois dans le dortoir du Réveil, deux dans la salle de contrôle), mais la Simulation libre n'a pas de limite. Solution prévue : un vrai éclairage pour les huit lampes les plus proches, un halo dessiné pour les autres. Batterie : ne redessiner que quand quelque chose bouge, comme aujourd'hui.

### 3.2 Le modèle et la logique (marche B)

| À faire | Taille |
| --- | --- |
| `z`, `sizeZ` (et plus tard `pitch`, `roll`) dans les composants et les acteurs ; format 20 ; migration (Z = 0, hauteur par défaut selon le type : mur 300 cm, porte 210, lampe sur pied…) ; Details : Location Z, Scale Z | M |
| Nœuds de position et de rotation qui gardent Z ; Get Actor Up Vector, Get Up Vector ; Add Actor World Offset en 3D ; nouvelle version des règles de simulation (`RULES_VERSION`) | S à M |
| Collisions : formes au sol « extrudées » (un intervalle de hauteur en plus) : chevauchement = au sol **et** en hauteur. Line Trace en 3D contre ces volumes. Reste simple tant que les volumes ne tournent qu'autour de Z | M |
| Le personnage : gravité, sol, saut (Jump, Is Falling, On Landed), marches basses, Kill Z. **Un sol par défaut dans chaque niveau**, comme le Floor du niveau de base d'UE : sans lui, le pion tomberait | M à L |
| Le correcteur : `teleport` et `walk` acceptent un Z ; vérifications de hauteur | S |
| Revoir les 155 étapes : les tests les rejouent toutes ; celles qui échouent sont à reprendre. Attendu : très peu, puisque tout est à Z = 0 sur un sol plat | M (surtout du test) |

**Attention, fidélité** : une fois Z en jeu, le simulateur doit se comporter comme UE dans des cas où il ne pouvait pas se tromper jusqu'ici (tomber d'un rebord, un overlap qui dépend de la hauteur, un Line Trace qui passe au-dessus d'un muret). Ce sont de nouveaux points « à vérifier dans UE ».

### 3.3 Le personnage et la caméra d'UE (marche C)

C'est la marche qui rapproche le plus de ce que Tristan trouvera dans UE (le modèle Third Person), et la plus chère :
- composants Spring Arm et Camera (dans le Viewport du Blueprint et en jeu) ;
- Add Controller Yaw Input et Add Controller Pitch Input, Get Control Rotation, déplacement relatif à la caméra (Add Movement Input avec Forward et Right) ;
- Enhanced Input en Axis2D pour bouger et regarder (au backlog, lot 3) ;
- Possess (au backlog) ;
- rotations Pitch et Roll des objets, donc collisions en boîtes orientées en 3D (calcul plus lourd).

Cette marche change la façon de jouer de toutes les étapes à touche : « le joueur regarde où il marche » n'est plus vrai. À ne lancer que si les marches A et B ont convaincu.

## 4. Naviguer au doigt

C'est la vraie difficulté, plus que le code. Trois situations, qui ne demandent pas les mêmes gestes.

### 4.1 Jouer (Play)

| Caméra | Au doigt | Fidélité UE | Avis |
| --- | --- | --- | --- |
| **Suiveuse en hauteur** (3/4 de dessus, angle fixe, suit le joueur) | Rien ne change : joystick à gauche, boutons à droite. Le joystick pousse dans le sens de l'écran | Comme un jeu vu de dessus fait dans UE (modèle Top Down) | **Pour la marche A** : aucune étape ne change de sens |
| Troisième personne (derrière l'épaule, Spring Arm) | Joystick à gauche ; **glisser sur la moitié droite pour regarder** ; boutons E, F, Espace en bas à droite, hors de la zone de regard | Le modèle Third Person d'UE | Pour la marche C : l'agencement standard des jeux mobiles, il marche bien sur un 6,3 pouces |
| Première personne | Comme la troisième personne | Modèle First Person | Utile au Réveil (« Regarder ») ; même coût que la troisième personne |

Quelle que soit la caméra, un bouton « Vue de dessus » (ajout de l'appli, en ambre) garde l'ancienne vue pour comprendre une étape : on voit tout le niveau d'un coup, ce qu'aucune caméra de jeu ne permet.

### 4.2 Éditer le niveau

C'est l'écran le plus délicat : au doigt, choisir une profondeur est ambigu et les flèches de déplacement sont petites. Propositions, toutes tirées d'UE :

1. **Garder la vue de dessus comme vue d'édition par défaut.** UE a les mêmes vues orthographiques (Top, Front, Left) que la vue Perspective, dans le menu du viewport. La vue de dessus actuelle devient donc la vue « Top » d'UE : fidèle et déjà au point au doigt.
2. **Vue Perspective** à côté, dans le même menu. Gestes :
   - un doigt sur le vide : tourner autour du point visé (orbite) ;
   - deux doigts : glisser pour se déplacer, pincer pour zoomer ;
   - toucher : sélectionner ; toucher deux fois, ou le bouton « F » : cadrer l'acteur (la touche F d'UE) ;
   - glisser un acteur sélectionné : il se déplace **sur le sol**, Z ne change pas.
3. **Poser un acteur** : depuis Place Actors ou le Content Drawer, il tombe sur la surface touchée (sol ou dessus d'un objet), comme quand on fait glisser un asset dans UE.
4. **Gizmo** : les trois outils d'UE (Move, Rotate, Scale, les touches W, E et R) dans la barre du viewport. Des poignées épaisses (au moins 44 pixels touchables) ; la flèche bleue (Z) sert à monter ou descendre. Pour les valeurs exactes, il reste les Details.
5. **Accrochage à la grille** (10 cm, 10°) activé par défaut, comme dans UE : au doigt, il évite les valeurs du genre 213,47.

### 4.3 Le Viewport d'un Blueprint

Les mêmes gestes que le niveau, autour d'un seul acteur. Le Viewport d'UE est en Perspective par défaut : la vue de dessus reste un choix du menu.

## 5. Découpage proposé

| Version | Contenu | Marche |
| --- | --- | --- |
| **3D-0** | **Prototype** : Play dessiné en 3D avec three.js, caméra suiveuse, derrière le réglage « Vue 3D (essai) ». Hauteurs par défaut, aucune donnée nouvelle. À essayer sur le Pixel : confort, lisibilité, chauffe | A |
| 3D-1 | Éditeur de niveau : menu Perspective / Top / Front / Left, gestes d'orbite, sélection, déplacement au sol, pose sur une surface, « F » | A |
| 3D-2 | Viewport du Blueprint en 3D, gizmo Move / Rotate / Scale, accrochage ; relecture des textes des étapes | A |
| 3D-3 | Z dans le modèle et les nœuds ; format 20 ; Details | B |
| 3D-4 | Collisions et Line Trace en 3D ; sol par défaut ; toutes les étapes revérifiées | B |
| 3D-5 | Gravité, saut, chute, Kill Z ; deux ou trois étapes nouvelles (sauter sur une plateforme, un étage, un monte-charge vertical) | B |
| 3D-6 et suivantes | Spring Arm, Camera, regard au doigt, Axis2D, déplacement relatif à la caméra, Possess, Pitch et Roll ; reprise des étapes à touche | C |

Ordre de grandeur : **3 versions pour la marche A**, **3 de plus pour la B**, **5 ou plus pour la C**. Chaque marche s'arrête proprement : l'appli reste complète et cohérente après A seule, ou après A et B.

## 6. Risques

- **Le poids** : + 23 % pour three.js. Acceptable, à surveiller.
- **La batterie et la chaleur** : à mesurer sur le prototype (3D-0), pas à deviner.
- **La lisibilité** : en 3D, un objet peut en cacher un autre, ce qui n'arrive pas vu de dessus. D'où la vue de dessus gardée partout.
- **Le temps de Vérifier** : il ne change pas, le correcteur ne dessine rien.
- **Les captures du smoke test** : celles du niveau et de Play changeront d'aspect, sans casser le test (il cherche des boutons et des textes, pas des pixels).
- **La fidélité** : chaque marche ajoute des cas où le simulateur pourrait différer d'UE (§ 3.2). La passerelle « Dans Unreal » prend encore plus de valeur.

## 7. Questions pour Tristan

1. **Jusqu'où viser ?** Le visuel seul (A), la hauteur dans la logique (B), ou le personnage et la caméra d'UE (C) ? *Recommandé : décider après le prototype 3D-0.*
2. **La caméra de Play par défaut** : suiveuse en hauteur (rien ne change dans les étapes) ou troisième personne (plus proche d'UE, mais toutes les étapes à touche changent) ? *Recommandé : suiveuse pour A et B ; troisième personne seulement avec C.*
3. **L'ordre avec l'interface** ([ANALYSE_UI.md](ANALYSE_UI.md)) : la barre d'outils du viewport d'UE (Perspective, Lit, outils de transformation) n'a de sens qu'avec la 3D. *Recommandé : faire d'abord l'interface hors niveau, puis la barre du viewport en même temps que la marche A, pour ne pas la refaire deux fois.*
