# Les trois familles de l'interface de l'éditeur

Mis en place en V7.76 (UI-4 de la [feuille de route](FEUILLE_DE_ROUTE_3D_UI.md), décidé le 26 novembre 2026). Le but : voir tout de suite ce qui vient d'UE et ce que l'appli ajoute. Ça vaut **dans l'éditeur** (niveau, Blueprints, Play). L'accueil, les révisions et le Carnet sont l'appli elle-même : on ne les marque pas.

| Famille | Signe | Dans le code |
| --- | --- | --- |
| **Comme dans UE** | Rien : couleurs d'UE | pas d'attribut |
| **Ajout de l'appli** (pour apprendre) | Ambre, réservé à ça ; la toque sur les boutons principaux (Leçon, Vérifier) et dans l'étiquette « BP Trainer » des sections | `data-origin="app"` (`origin('app')`) ; caché par « Vue UE pure », sauf `data-pure="keep"` (`appKept()`) |
| **Geste tactile** (remplace la souris, le clavier ou un panneau fixe d'UE) | Contour pointillé ; **un appui long dit quoi faire dans UE** | `data-origin="touch"` et `data-ue` (`origin('touch', 'undo')`, textes dans `UE_HINT`, `ui/origins.ts`) |

Les **avertissements** prennent le jaune d'UE (`--warn`, comme dans l'Output Log), jamais l'ambre.

**Vue UE pure** (Réglages › Dans l'éditeur, ou menu ⋮) : cache tout ce qui est en ambre, pour voir l'éditeur tel qu'il sera dans UE. Les gestes tactiles restent ; le bouton Accueil et « Aide et gestes » aussi. En haut de l'éditeur, « Vue UE pure · revoir les ajouts de l'appli » en sort.

## Inventaire

### Ajouts de l'appli (ambre)

| Élément | Où | Fichier |
| --- | --- | --- |
| Bouton « Leçon N » (avec la toque) | barre des onglets | `editor/DocumentTabs.tsx` |
| Accueil (reste dans la vue UE pure) | barre des onglets | `editor/DocumentTabs.tsx` |
| Bande d'objectifs, « Objectifs », **Vérifier** (ambre plein, avec la toque), résultat | sous la barre d'outils | `lesson/GoalStrip.tsx` |
| Fiche de leçon (Comprendre, Objectifs, Aide) | fenêtre | `lesson/LessonSheet.tsx` |
| Vitesses ×¼ ×1 ×4, nom du niveau, temps | barre de Play | `play/PlayOverlay.tsx` |
| Sections « BP Trainer » de Details et Aide | Details | `panels/fields.tsx` (`AppTag`) |
| Textes d'aide de l'appli dans Details | Details | `panels/Details.tsx`, `panels/ClassDetails.tsx` |
| « Pourquoi ? » sous une erreur | Output Log, fiches | `widgets/Why.tsx` |
| Récents | palette All Actions | `overlays/Palette.tsx` |
| Slots de sauvegarde | Content Drawer | `content/ContentDrawer.tsx` |
| Taille « Téléphone » de l'aperçu, conseil | Designer UMG | `designer/DesignerView.tsx`, `designer/DesignerPanel.tsx` |
| Mes projets, Nouveau projet, Renommer, Exporter, Importer, Conseils de construction, Ordre des BeginPlay, Vibrations, Plein écran, Vue UE pure, Aide et gestes (les deux derniers restent) | menu ⋮ | `menus.ts` (`app`), `overlays/ContextMenu.tsx` |

Comme dans UE, dans ce menu : Class Settings, Project Settings.

### Gestes tactiles (pointillé, appui long)

| Élément | Ce que dit l'appui long (`UE_HINT`) | Fichier |
| --- | --- | --- |
| ↶ Annuler, ↷ Rétablir | Ctrl+Z, Ctrl+Y (`undo`, `redo`) | `App.tsx` |
| Sélection (cadre) | glisser sur le vide avec le bouton gauche (`select`) | `App.tsx` |
| Recentrer | Home, F pour la sélection (`fit`) | `App.tsx` |
| + Ajouter un nœud | clic droit sur le vide (`addNode`) | `App.tsx` |
| Menu ⋮ | la barre de menus d'UE (`more`) | `editor/DocumentTabs.tsx` |
| Poignées « Components · My Blueprint », « Details », « Outliner · Details » | panneaux fixes (`leftPanel`, `rightPanel`, `levelPanel`) | `editor/EditorToolbars.tsx` (`EdgeHandle`), `App.tsx` |
| ✕ des tiroirs | le panneau reste ouvert (`closePanel`) | `App.tsx` |
| Poignée du panneau du bas | panneaux accrochés en bas, Ctrl+Espace (`bottomPanel`) | `editor/BottomBar.tsx` |
| Get, Set, Appeler, Override, Event de My Blueprint | glisser dans le graphe, Ctrl ou Alt (`dragToGraph`) | `panels/MyBlueprint.tsx` |
| Outliner de Play | l'Outliner reste ouvert (`liveOutliner`) | `play/PlayOverlay.tsx` |
| Joystick, E, F, Espace | pas d'appui long (on tient ces touches pour jouer) ; leur équivalent est dans `title` (`joystick`, `keys`) | `play/PlayOverlay.tsx` |
| Sortie de la vue UE pure | — | `App.tsx` |

L'appui long sur le graphe (= clic droit d'UE) n'a pas de marque visible : il est expliqué dans « Aide et gestes ».

## Vérifications

- `tests/uiOrigins.test.ts` : plus de classe `app-only` ; chaque texte d'aide de l'appli est dans la famille app ; chaque équivalent UE de `UE_HINT` est utilisé ; avertissements sans ambre ; boutons flottants, poignées et menu ⋮ en famille tactile.
- Smoke (`AUDIT`) : dans le graphe, le niveau et Play, chaque bouton visible des barres (onglets, barres d'outils, objectifs, boutons flottants, barre du bas, Play) a une famille, ou est un bouton d'UE connu par son nom. Un nouveau bouton sans famille fait échouer le smoke. Aussi : l'appui long sur Annuler dit « Ctrl+Z » ; la vue UE pure cache la bande d'objectifs et « Leçon », garde Accueil, et sa sortie remet tout.

## Ajouter un élément

Dans l'éditeur, un nouvel élément est soit comme dans UE (rien à faire, et son nom va dans la liste de l'`AUDIT` du smoke s'il est dans une barre), soit `origin('app')`, soit `origin('touch', '<clé>')` avec une clé de `UE_HINT` (en ajouter une au besoin), puis une ligne ici.
