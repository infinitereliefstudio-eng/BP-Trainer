# Analyse : l'interface (UX de l'appli, éditeur au plus près d'UE5)

Demandée par Tristan le 26 novembre 2026, sur deux points :
1. **l'appli autour de l'éditeur** : aspect général, accueil, navigation facile à comprendre, une UX soignée ;
2. **l'éditeur** : au plus près de l'éditeur réel d'UE5, utilisable au téléphone, **et qu'on voie tout de suite ce que l'appli ajoute à l'éditeur d'UE**.

Analyse seulement : **rien n'est lancé**. Base : la V7.74 et les captures du smoke test (téléphone en paysage, 800 × 370). Référence UE : **UE 5.8** (juin 2026, la dernière version d'UE5 prévue), dont la barre d'outils du viewport a été refaite en 5.6.

## 1. En bref

- **L'éditeur est déjà bien parti** : onglets de documents, barres d'outils, My Blueprint, Details, Content Drawer, panneaux du bas et nœuds ont les noms et l'ordre d'UE. Ce qui manque surtout : l'**aspect** d'UE (icônes, densité, détails du graphe) et un **marquage complet et cohérent** de ce que l'appli ajoute. L'ambre existe déjà, mais seulement par endroits, et il sert aussi aux avertissements.
- **L'appli autour de l'éditeur est la partie la plus faible** : l'accueil est une longue liste de 155 cartes. Rien n'y dit « voilà ce que tu fais aujourd'hui », et la fiche de leçon cache l'éditeur pendant qu'on la lit.
- **Proposé** : sept lots, ≈ 7 versions, dans l'ordre du § 5. Les deux premiers (les bases visuelles et l'accueil « Aujourd'hui ») sont ceux que Tristan sentira tous les jours.

## 2. L'appli autour de l'éditeur

### 2.1 Constats

| Écran | Ce qui va | Ce qui gêne |
| --- | --- | --- |
| **Accueil** | Clair, lisible, sombre comme UE ; durée et notions sur chaque carte | **Pas de point d'entrée « aujourd'hui »** : la révision du jour et « À retravailler » sont dans d'autres onglets, sans compteur. Le parcours est **une seule liste de 155 cartes** : en paysage, à peine plus d'une rangée visible (au backlog). Le bouton bleu (« Continuer : … », « Reprendre : … ») suit bien la progression, mais ne dit ni le jalon ni le temps restant. « Sauvegarde · v7.74.0 » ressemble à un lien, pas à un réglage |
| **Parcours** | Niveaux, codes (P, D, C, T, A, S, M, X) avec leur libellé sur la carte (« Prédis le résultat »), étape « À suivre » en bleu | Pas de légende d'ensemble des codes ; pas de repli par niveau ni de recherche (au backlog, lot 4) ; pas de « où j'en suis » visuel (une carte du parcours) |
| **Onglets Révision, Carnet, Nœuds, Mémo UE** | Utiles, bien remplis | Placés au même niveau que le Parcours, alors que ce sont deux usages différents : **apprendre** (Parcours, Révision, À retravailler) et **consulter** (Nœuds, Mémo UE, Carnet) |
| **Dans une leçon** | Bande d'objectifs ambre « 1/4 … Vérifier » : excellente, toujours visible | La **fiche** (Comprendre, Objectifs, Aide) s'ouvre en fenêtre qui couvre tout l'éditeur : impossible de lire en regardant le graphe. La réussite s'affiche dans l'onglet Objectifs (pastille « réussie », liste cochée, bouton « Suivant » sous la liste) : tout y est, mais sans vrai moment de fin, et le bouton est loin en bas |
| **Partout** | Boutons de bonne taille, vibrations | Pas de prise en main des gestes (au backlog) ; bouton Retour d'Android non vérifié (au backlog) ; pas de taille de texte réglable (au backlog) |

### 2.2 Propositions

**a. Un accueil « Aujourd'hui ».** En tête, une seule rangée de trois cartes :
1. **Continuer** : l'étape en cours (ou la suivante), avec son jalon (« X3 La ronde · jalon 2/4 ») et le temps restant ;
2. **Révision** : « 6 questions · 3 min », un toucher pour commencer ;
3. **À retravailler** : « 2 notions · 8 min ».

Puis le parcours. Les boutons du haut (« Continuer », « Reprendre ») deviennent la carte « Continuer ».

**b. Le parcours en carte repliable.** Un bandeau par niveau (Débutant 15/15 ✓, Intermédiaire 12/34…) : le niveau en cours ouvert, les autres repliés. Dans un niveau, les étapes en **chapitres** par notion (« Les portes », « Cast To », « UMG »…) plutôt qu'une liste plate. Une **légende des codes** (un toucher sur un code l'explique). La recherche et les filtres du backlog (notion, format, durée, à reprendre) en haut.

**c. Deux espaces au lieu de cinq onglets égaux.** En paysage, un **rail d'icônes à gauche** (il prend moins de hauteur qu'une barre d'onglets) :
- **Apprendre** : Aujourd'hui, Parcours, Révision ;
- **Consulter** : Nœuds, Mémo UE, Carnet ;
- **Créer** : Mes projets (la Simulation libre) ;
- en bas : **Réglages** (sauvegarde, version, taille du texte, vibrations, « Vue UE pure », voir § 3.4).

**d. La fiche de leçon en panneau latéral.** La fiche s'ouvre en **tiroir à droite** (comme Details), sur un tiers de l'écran, et le graphe reste visible à gauche. On peut l'agrandir en plein écran pour un long texte. En portrait, elle monte du bas.

**e. Un vrai moment de fin d'étape.** Après une réussite, un écran à part plutôt que la liste de l'onglet Objectifs : un bilan court (objectifs ✓, aide utilisée, conseils de construction), « Le refaire dans UE5 » quand il existe, et deux boutons : **Étape suivante** et **Revoir ma solution**.

**f. La prise en main des gestes** (au backlog) : deux minutes avant la leçon 1, pour faire une fois chaque geste (toucher, appui long, tirer un fil, deux doigts).

**g. Les bases visuelles.** Aujourd'hui, 854 lignes de CSS en deux fichiers, avec quelques variables de couleur. Proposé : un petit **système de design** :
- des **jetons** : couleurs, 4 tailles de texte, 4 espacements, 2 rayons ;
- des **composants communs** : Button (principal, secondaire, ambre), Card, Chip, Tiroir, Onglets ;
- un **jeu d'icônes SVG** unique (aujourd'hui un mélange de caractères ▶ ⌂ ⋮ ↶ et de SVG).

Sans changer l'aspect d'un coup, il rend le reste des lots rapide et cohérent.

## 3. L'éditeur au plus près d'UE 5.8

### 3.1 Ce qui est déjà fidèle

Onglets de documents (niveau, un par Blueprint) ; barre du Blueprint Editor dans l'ordre d'UE (Compile avec son état, Save, Find, Class Settings, Class Defaults, Play) ; onglets Viewport, Construction Script, Event Graph ; My Blueprint et Components ; Details avec Search Details et sections repliables ; palette « All Actions for this Blueprint » avec Context Sensitive ; Content Drawer et onglets du bas (Compiler Results, Output Log, Debug, Find Results) ; Outliner et Details du niveau ; couleurs des pins et des fils ; Designer UMG (Palette, Hierarchy, Details).

### 3.2 Les écarts, par écran

| Écran | Dans UE 5.8 | Dans l'appli | Proposé | Taille |
| --- | --- | --- | --- | --- |
| **Barre du Blueprint Editor** | Boutons **icône + libellé**, sans cadre ; Compile avec sa pastille (vert, jaune « ? », rouge) ; Browse, Diff, Hide Unrelated ; Play avec un menu ⋮ ; à droite, le choix de l'objet débogué (« No debug object selected ») | Boutons texte encadrés ; pas d'objet débogué dans la barre (il est dans Debug) | Icône + libellé court, sans cadre ; sélecteur d'objet débogué à droite ; Browse (ouvre le Content Drawer sur l'asset) ; Diff et Hide Unrelated grisés | S à M |
| **Onglets de graphes** | Onglets de document sous la barre (« Event Graph », « MaFonction »), avec leur croix | À droite de la barre d'outils | Sous la barre, comme UE (gagne aussi de la place en largeur) | S |
| **Graphe** | En haut à gauche, le **fil d'Ariane** « BP_Lampe › Event Graph » ; en haut à droite, « **Zoom 1:1** » ; en bas à droite, le filigrane **BLUEPRINT** ; grille plus sombre ; en-têtes de nœuds avec une **icône** (f pour une fonction, ◆ pour un événement, macro…), un léger dégradé, coins arrondis | Rien de tout ça ; en-têtes unis sans icône | Les trois repères d'UE ; icônes d'en-tête ; grille et dégradés réglés sur UE (au backlog : « Icônes des nœuds ») | S à M |
| **My Blueprint** | Sections GRAPHS, FUNCTIONS, MACROS, VARIABLES, EVENT DISPATCHERS, chacune avec son **+** ; barre de recherche ; Components : « **+ Add** », recherche, « BP_Lampe (Self) » en tête | Les sections y sont ; « Get » à droite de chaque composant (ajout de l'appli, non marqué) | + et recherche comme UE ; ligne (Self) ; « Get » marqué en ambre (ou passé dans l'appui long, comme le glisser-déposer d'UE) | S |
| **Barre de l'éditeur de niveau** | Save ; **Selection Mode** ; **+ (Quick Add)** ; Blueprints ; Cinematics ; ▶ Play et ⋮ ; Platforms ; Settings | Save, + Place Actors, Play | Ordre et icônes d'UE ; Place Actors dans le + ; Blueprints, Cinematics, Platforms en gris (présents mais sans effet, avec « pas simulé dans l'appli ») | S |
| **Barre du viewport (5.6+)** | Outils Select, Move, Rotate, Scale ; espace World / Local ; accrochage (grille, angle, échelle) ; vitesse de la caméra ; **Perspective** ; **Lit** ; Show | Rien (vue de dessus seule) | **À faire avec la 3D** ([ANALYSE_3D.md](ANALYSE_3D.md)). Sans 3D : seulement « Top » et l'accrochage | M |
| **Play (PIE)** | Barre : Pause, Stop, **Eject**, Frame Skip ; le niveau joué dans le viewport | Pause, image suivante, ×¼ ×1 ×4 (déjà en ambre), temps, liste | Ajouter Eject (sortir du pion pour regarder) ; l'Outliner en direct est un ajout à marquer | S |
| **Barre d'état du bas** | Content Drawer, Output Log, **Cmd** (console) ; à droite, le contrôle de source | Content Drawer et les onglets du Blueprint Editor | Fidèle pour l'essentiel ; Cmd seulement si un jour il sert (stat fps, slomo) | — |
| **Aspect général** | Thème « Starship » : gris très sombres, accent bleu, textes petits et denses | Gris et bleu proches, mais textes et boutons **deux fois plus gros**, coins très arrondis, contours partout : on dirait une appli web | Garder les tailles tactiles (au moins 44 px touchables) mais **réduire les cadres** : boutons plats comme dans UE, séparateurs fins, couleurs d'UE pour les fonds de panneaux | M |

### 3.3 Les panneaux au téléphone : une adaptation assumée

UE est un bureau à panneaux accrochés ; sur 6,3 pouces, l'appli les met dans des **tiroirs** (gauche : Components et My Blueprint ; droite : Details ; bas : Content Drawer et onglets). C'est le bon choix, et il faut le **dire** plutôt que le cacher : la poignée de chaque tiroir porte le nom exact du panneau d'UE, et un toucher long sur la poignée explique « Dans UE : panneau fixe à gauche de l'éditeur ».

### 3.4 Voir ce que l'appli ajoute à UE

Aujourd'hui, l'ambre marque une partie des ajouts (la bande d'objectifs, « Leçon 28 », certaines sections de Details, les vitesses de Play, les Slots de sauvegarde, les Récents de la palette). Mais :
- beaucoup d'ajouts ne sont pas marqués : **Vérifier est bleu**, comme un bouton d'UE ; les boutons flottants (+, annuler, sélection, centrer), le joystick et les touches E, F, Espace, les « Get » des composants ;
- **l'ambre sert aussi aux avertissements** (messages `warning`, toasts) : on ne sait plus si l'ambre veut dire « ajout de l'appli » ou « attention ».

Proposé : **trois familles, trois signes**, appliqués à tout l'écran :

| Famille | Exemples | Signe |
| --- | --- | --- |
| **Comme dans UE** | Barres d'outils, panneaux, nœuds, Details, Output Log | Aucun : les couleurs d'UE |
| **Ajout de l'appli** (apprendre) | Leçon, objectifs, **Vérifier**, fiches, indices, « Pourquoi ? », « Montre-moi », conseils, vitesses de Play, Outliner en direct, Récents, Slots | **Ambre**, réservé à ça, avec un petit pictogramme commun (une toque) sur les boutons |
| **Geste tactile** (remplace la souris ou le clavier) | +, annuler et rétablir, sélection, centrer, appui long = clic droit, joystick, E, F, Espace, tiroirs | **Contour pointillé gris clair** ; un appui long dit l'équivalent dans UE (« Dans UE : clic droit dans le graphe », « Dans UE : touche E du clavier ») |

Les avertissements reprennent le **jaune d'UE** (celui de l'Output Log), distinct de l'ambre.

Et un interrupteur **« Vue UE pure »** (Réglages, et un bouton dans le menu ⋮) : il cache tout ce qui est en ambre, pour voir l'éditeur tel qu'il sera dans UE et s'entraîner à s'y retrouver sans les aides. Les gestes tactiles restent, puisqu'on en a besoin pour travailler.

Pour que le marquage tienne dans le temps : une **liste de tous les éléments** de l'interface avec leur famille, et un test qui vérifie que chaque bouton de l'appli déclare la sienne (un attribut `data-origin="ue|app|touch"`).

## 4. Taille et risques

- **Taille** : surtout du CSS et des composants d'interface ; `src/core` n'est pas touché. Le smoke test (qui cherche des boutons par leur texte) est à suivre lot par lot.
- **Risque principal** : changer les habitudes de Tristan en cours de parcours. D'où des lots courts, essayés un à un sur le Pixel.
- **Le paysage** : tout est pensé en paysage (le manifeste de l'APK l'impose). La lecture en portrait des fiches et des révisions reste une question à part (au backlog).

## 5. Découpage proposé

| Lot | Contenu | Taille |
| --- | --- | --- |
| **UI-1** | Bases visuelles : jetons, composants communs, jeu d'icônes, réglage de taille du texte. Rien ne change de place | M |
| **UI-2** | Accueil « Aujourd'hui », rail Apprendre / Consulter / Créer / Réglages, parcours repliable en chapitres, légende des codes, recherche et filtres | M à L |
| **UI-3** | Fiche de leçon en tiroir latéral, écran de fin d'étape | M |
| **UI-4** | Les trois familles (ambre réservé, contour tactile, jaune des avertissements), « Vue UE pure », liste des éléments et le test `data-origin` | M |
| **UI-5** | Le Blueprint Editor façon UE 5.8 : barre en icônes, onglets de graphes dessous, fil d'Ariane, Zoom, filigrane, icônes des nœuds, My Blueprint, aspect plus plat | M |
| **UI-6** | L'éditeur de niveau et Play façon UE 5.8 : barre principale, Eject ; la barre du viewport attend la 3D | S à M |
| **UI-7** | Prise en main des gestes, bouton Retour d'Android | M |

## 6. Questions pour Tristan

1. **Par où commencer ?** *Recommandé : UI-1 puis UI-2 (l'accueil « Aujourd'hui ») : c'est ce que tu vois chaque jour, et ça ne touche pas à tes habitudes dans l'éditeur.*
2. **Les trois familles et la « Vue UE pure »** te conviennent-elles ? Une toque pour l'ambre, ou un autre signe ?
3. **Jusqu'où aller vers l'aspect d'UE** : boutons plats et denses comme UE (plus fidèle, un peu moins confortable au doigt), ou garder des boutons encadrés plus visibles ? *Recommandé : plats comme UE, mais avec une zone de toucher d'au moins 44 px.*
4. **La fiche de leçon** : tiroir latéral (graphe visible) ou garder la fenêtre plein écran ?
5. **L'ordre avec la 3D** : voir [ANALYSE_3D.md](ANALYSE_3D.md), question 3.
