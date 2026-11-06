# Architecture

Quatre couches, chacune ne dépend que de celles du dessous :

```
ui/        panneaux Preact (toolbar, My Blueprint, Details, palette, menus)
editor/    canvas du graphe : rendu, caméra, gestes, hit-test
storage/   sauvegarde IndexedDB, export / import de fichier
core/      modèle, nœuds, règles, opérations, historique, compilation
```

`core/` ne connaît ni le DOM ni le canvas : il est testé seul (`tests/`) et sera réutilisé tel quel par l'interpréteur de l'étape 2.

## core/

| Dossier | Rôle |
| --- | --- |
| `types/` | Système de types des pins (`PinType`, compatibilité, héritage des classes) et valeurs littérales |
| `model/` | Les données du projet : `Project` → `BlueprintClass` → `Graph` → `NodeInstance` / `Link`, plus variables et composants. Du JSON pur |
| `nodes/` | La bibliothèque de nœuds : une **définition** par nœud (titre, pins, réglages, aide), rangée par catégorie dans `library/`, indexée par `registry.ts`. `palette.ts` génère les entrées de recherche (dont Get/Set par variable) |
| `graph/rules.ts` | Les règles de connexion d'UE (une source par entrée de données, une cible par sortie exec, types compatibles) |
| `operations/` | Les mutateurs : ajouter un nœud, relier, renommer une variable… Chaque fonction modifie le modèle, sans gérer l'annulation |
| `history/` | Annuler / rétablir par instantanés JSON du Blueprint touché (ou du projet) |
| `compiler/` | Le bouton Compile : vérifications façon UE et messages pour Compiler Results |
| `store/` | `EditorStore`, la source de vérité de la session : projet, historique, Blueprint et graphe ouverts, sélection, messages |
| `serialization/` | Format de fichier versionné et migrations |
| `templates/` | Le projet de départ |

### Ajouter un nœud

1. Écrire sa définition dans le fichier de `core/nodes/library/` de sa catégorie (ou un nouveau fichier).
2. Si c'est un nouveau fichier, l'ajouter à la liste de `core/nodes/registry.ts`.

L'éditeur, la palette, Details et la compilation le prennent en compte sans autre changement. À l'étape 2, son comportement sera enregistré séparément dans l'interpréteur, sous le même identifiant.

### Modifier le modèle

Toujours via le store :

```ts
store.apply('Libellé pour Annuler', (cls, graph) => addNode(graph, 'flow.branch', x, y));
```

`apply` prend un instantané avant et après : l'annulation fonctionne pour toute nouvelle opération, sans code supplémentaire. Pour un geste long (glisser un nœud), utiliser `begin()` / `touch()` / `commit()`.

## editor/

- `layout.ts` calcule la géométrie de chaque nœud (taille, position des pins, champs de valeur) ; le rendu et le hit-test s'en servent tous les deux.
- `render/` dessine la grille, les fils (courbes de Bézier) et les nœuds, aux couleurs d'UE (`theme.ts`), plus la loupe pendant qu'on tire un fil.
- `gestures.ts` reconnaît les gestes (toucher, double toucher, appui long, glisser, pincer) ; `GraphCanvas.tsx` leur donne un sens et appelle le store.

## Format de sauvegarde

Un fichier `*.bptrainer.json` : `{ kind, format, project }`. Toute évolution du modèle incrémente `PROJECT_FORMAT` et ajoute une étape à `migrate()` dans `serialization/serialize.ts`, pour que les anciens projets restent lisibles.
