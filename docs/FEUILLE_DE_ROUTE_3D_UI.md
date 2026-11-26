# Feuille de route : interface et passage en 3D

Rédigée le 26 novembre 2026, après les réponses de Tristan aux deux analyses ([ANALYSE_3D.md](ANALYSE_3D.md), [ANALYSE_UI.md](ANALYSE_UI.md)). **Rien n'est lancé** : chaque étape attend son feu vert, comme d'habitude.

## 1. Ce que Tristan a décidé

1. **La 3D, jusqu'au bout.** Ce qui compte pour lui : *jouer avec les logiques d'Unreal dans un monde 3D, avec les outils et les possibilités qui vont avec*, et *un rendu qui se rapproche de l'éditeur*. La vue de dessus est aujourd'hui l'une des plus grosses limites sur ces deux points. Elle reste bien, mais comme l'une des vues d'UE : **Perspective, plus les vues orthographiques Top, Bottom, Left, Right, Front, Back**. Objectif : les marches **A, B et C** de l'analyse 3D. Le prototype 3D-0 reste la première étape du chantier, pour vérifier la tenue et le confort sur le Pixel avant de construire dessus. Ce n'est plus une étape « pour décider si on continue ».
2. **L'ordre** : Tristan demande l'organisation la plus logique (§ 2).
3. **Les trois familles et la « Vue UE pure »** : validées (comme dans UE / ajout de l'appli en ambre / geste tactile en pointillé).
4. **L'aspect** : comme UE (boutons plats et denses, zone de toucher d'au moins 44 px).
5. **La fiche de leçon** : à essayer en tiroir latéral.

## 2. L'ordre proposé et pourquoi

Trois règles :
- **Poser les fondations avant de construire dessus.** Les jetons, les composants, les icônes et le marquage des trois familles servent à tout le reste, y compris aux centaines d'éléments que la 3D va ajouter (barre du viewport, gizmo, boutons de caméra). Les poser après, ce serait les repasser partout.
- **Ne rien faire deux fois.** La barre d'outils du niveau et du viewport n'a de sens qu'avec la 3D : elle se fait **avec** la 3D. La prise en main des gestes se fait **à la fin**, quand les gestes de la 3D (orbite, gizmo, regard) existent.
- **Garder l'appli utilisable entre deux étapes.** Chaque version laisse un ensemble complet et testé ; une revue ferme chaque phase, comme pour les chantiers précédents.

| Phase | Versions | Contenu | Pourquoi à ce moment |
| --- | --- | --- | --- |
| **1. Fondations** | UI-1, UI-4 | Jetons (couleurs UE, tailles, espacements), composants communs, jeu d'icônes SVG, aspect plat « comme UE », taille du texte réglable ; puis les trois familles (`data-origin`, ambre réservé, pointillé tactile, jaune des avertissements), la « Vue UE pure », la liste des éléments et son test | Tout ce qui suit s'appuie dessus |
| **2. Le monde en 3D (marche A)** | 3D-0, 3D-1, 3D-2 (+ UI-6) | Prototype : Play dessiné en 3D (three.js), caméra suiveuse, réglage « Vue 3D (essai) », essai sur le Pixel ; puis l'éditeur de niveau avec **Perspective, Top, Bottom, Left, Right, Front, Back**, gestes d'orbite, sélection, pose sur une surface, « F » ; la barre du niveau et la barre du viewport d'UE 5.8 (Select, Move, Rotate, Scale, World / Local, accrochage, Lit) ; le Viewport du Blueprint en 3D et le gizmo ; relecture des textes des étapes | Avancée à la demande de Tristan (26 nov., 14 h 17), pour la tester tôt sur le téléphone ; la barre du viewport arrive avec ce qu'elle commande |
| *Revue* | | Revue de la marche A | |
| **3. L'appli et l'éditeur de graphe** | UI-2, UI-3, UI-5 | Accueil « Aujourd'hui », rail Apprendre / Consulter / Créer / Réglages, parcours repliable en chapitres ; fiche de leçon en tiroir et écran de fin d'étape ; Blueprint Editor façon UE 5.8 (barre en icônes, onglets de graphes dessous, fil d'Ariane, Zoom, filigrane, icônes des nœuds, My Blueprint) | Indépendant de la 3D : pendant ce temps, Tristan teste la marche A sur son téléphone, avant qu'on construise la marche B dessus |
| *Revue* | | Revue de l'interface | |
| **4. La hauteur dans la logique (marche B)** | 3D-3, 3D-4, 3D-5 | Z dans le modèle et les nœuds (format 20) ; collisions et Line Trace en 3D ; sol par défaut ; gravité, saut, chute, Kill Z ; toutes les étapes revérifiées ; premières étapes 3D (sauter sur une plateforme, un étage, un monte-charge vertical) | Construite sur la marche A, une fois qu'elle a été testée sur le téléphone |
| *Revue* | | Revue de la marche B | |
| **5. Le personnage et la caméra d'UE (marche C)** | 3D-6 et suivantes | Spring Arm et Camera, Enhanced Input en Axis2D (bouger et regarder), Add Controller Yaw / Pitch Input, déplacement relatif à la caméra, Possess, Pitch et Roll ; reprise des étapes à touche ; nouvelles étapes | S'appuie sur la gravité et les collisions 3D |
| *Revue* | | Revue de la marche C | |
| **6. Finitions** | UI-7 | Prise en main des gestes (ceux de la 3D compris), bouton Retour d'Android | Quand tous les gestes existent |

Ordre de grandeur : **5 versions d'interface, 6 de 3D pour A et B, 5 ou plus pour C, 1 de finitions**, plus une revue par phase.

**Choix de Tristan (26 nov., 14 h 17)** : la marche A passe juste après les fondations, pour pouvoir tester la 3D tôt sur le téléphone ; le reste de l'ordre est validé.

## 3. La caméra de Play, une fois la marche C faite

Dans UE, la caméra n'est pas un réglage du jeu : c'est un **composant du Blueprint du pion** (Spring Arm et Camera dans le Character du modèle Third Person). La marche C fera pareil :
- pendant les marches A et B : la caméra suiveuse en hauteur, plus le bouton « Vue de dessus » (ajout de l'appli, en ambre) ;
- avec C : le pion du joueur reçoit un Spring Arm et une Camera, comme le modèle Third Person ; les étapes pourront changer de caméra en changeant le Blueprint, comme dans UE.

Bonne nouvelle pour les étapes à touche : le modèle Third Person d'UE fait tourner le personnage dans le sens où il marche (Orient Rotation to Movement). « Le joueur regarde où il marche » reste donc vrai. Ce qui change, c'est que le joystick pousse par rapport à la caméra. À confirmer étape par étape pendant la marche C.

## 4. Avancement

| Étape | Version | État |
| --- | --- | --- |
| UI-1, bases visuelles (jetons, aspect plat comme UE, icônes, taille du texte) | V7.75 | **fait** (lancée le 26 nov. à 14 h 21) |
| UI-4, les trois familles et la « Vue UE pure » ([INTERFACE_FAMILLES.md](INTERFACE_FAMILLES.md)) | V7.76 | **fait** (lancée à 15 h 01) |
| 3D-0, prototype de Play en 3D (three.js, caméra suiveuse, Réglages › Play › Vue 3D (essai), bouton « Dessus ») | V7.77 | **fait** (lancée le 26 nov. à 15 h 41) ; à essayer sur le Pixel |
| 3D-1, éditeur de niveau en 3D (Viewport Type : Perspective, Top, Bottom, Left, Right, Front, Back ; Lit, Unlit, Wireframe ; orbite, sélection, glisser au sol, poser sous le doigt, « F ») | V7.78 | **fait** (lancée le 26 nov. à 17 h 09) |
| 3D-2, Viewport du Blueprint en 3D, gizmo Move / Rotate / Scale, World / Local, accrochage ; relecture des textes des étapes | | prochaine, sur le feu vert de Tristan |
