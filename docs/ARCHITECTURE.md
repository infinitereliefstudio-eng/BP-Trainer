# Architecture

Quatre couches, chacune ne dépend que de celles du dessous :

```
ui/        écrans et panneaux Preact (accueil, toolbar, My Blueprint, Details, Play, leçons)
editor/    canvas du graphe et du niveau : rendu, caméra, gestes, hit-test, session Play
storage/   sauvegarde IndexedDB, export / import de fichier
core/      modèle, nœuds, règles, opérations, historique, compilation, interpréteur, leçons
```

`core/` ne connaît ni le DOM ni le canvas : il est testé seul (`tests/`), y compris l'exécution des Blueprints et la réussite de chaque leçon.

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
| `templates/` | Le projet de départ du mode Simulation |
| `runtime/` | L'exécution : `interpreter.ts` (pile de frames explicite, file d'événements, appels synchrones, fonctions, nœuds purs recalculés à chaque lecture, actions latentes, breakpoints, erreurs façon UE), `behaviors/` (ce que fait chaque nœud), `physics.ts` (boîtes orientées, overlaps, collisions du joueur), `simulation.ts` (le niveau en jeu : acteurs, joueur éventuellement Blueprint, BeginPlay, Tick, touches, temps en pas fixes de 1/60 s découpés en phases reprenables, Execution Trace) |
| `lessons/` | Le parcours : chaque leçon décrit ses explications, son projet de départ, un scénario joué automatiquement et des vérifications. `runner.ts` exécute le scénario sans affichage ; chaque leçon fournit aussi sa solution de référence, testée. `library/props.ts` regroupe les Blueprints réutilisés (joueur, clé, porte, générateur, lampe) ; `library/exercises.ts` les exercices « Prédis » (`kind: 'predict'`, réponse vérifiée par la simulation dans les tests) et « Débogue » (`kind: 'debug'`) |

### Ajouter un nœud

1. Écrire sa définition dans le fichier de `core/nodes/library/` de sa catégorie (ou un nouveau fichier).
2. Si c'est un nouveau fichier, l'ajouter à la liste de `core/nodes/registry.ts`.
3. Écrire son comportement dans `core/runtime/behaviors/` sous le même identifiant : `exec` pour un nœud impur (il renvoie les sorties exec à suivre), `pure` pour un nœud pur (il renvoie ses valeurs).

L'éditeur, la palette, Details, la compilation et l'interpréteur le prennent en compte sans autre changement. Un test vérifie que chaque nœud exécutable a un comportement.

### Nœuds liés au projet

Certains nœuds dépendent d'autre chose que leur Blueprint : `Cast To`, variables d'un autre Blueprint, Event Dispatchers, appels de Custom Events et de fonctions, messages d'interface. Leur `config` désigne la cible par identifiant (`owner` = classe, `dispatcher`, `graph`, `interface`, `fn`), et leurs pins sont calculées à partir du projet (`NodeContext.project`). Le compilateur signale toute cible disparue ; les opérations de suppression retirent les nœuds qui en dépendent, dans tous les Blueprints.

### Ajouter une leçon

Créer un objet `Lesson` dans `core/lessons/library/` (explications, `setup`, `scenario`, `checks`, `solve`) et l'ajouter à la liste de `core/lessons/index.ts`. Les tests vérifient automatiquement que le projet de départ échoue et que la solution réussit.

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

## Débogage

- `EditorStore.breakpoints` est partagé avec la `Simulation` de Play : un breakpoint ajouté pendant la partie compte aussitôt. Il n'est pas sauvegardé, comme dans UE.
- Quand l'interpréteur atteint un nœud marqué, il s'arrête **avant** lui en gardant sa pile ; la simulation garde les phases restantes de la frame. `resume()` et `stepNode()` reprennent exactement là.
- `Simulation.trace` garde les derniers nœuds exécutés avec le fil emprunté ; `editor/debug/execHeat.ts` en tire l'éclat des fils et des nœuds.
- Les valeurs affichées pour un nœud sont celles de sa dernière exécution, par acteur (`Interpreter.lastValues`) ; un nœud jamais exécuté n'en a pas.

## Exécution, en bref

- Une chaîne exec s'exécute jusqu'au bout (ou jusqu'à un nœud latent) avant que quoi que ce soit d'autre se passe.
- Sequence empile ses sorties : Then 0 et toute sa chaîne passent avant Then 1.
- Les boucles se rappellent elles-mêmes après leur corps (`resume`) : une boucle entière tient dans une frame.
- Delay ignore un nouvel appel pendant son attente ; Retriggerable Delay repart de zéro.
- Une référence vide produit « Accessed None trying to read property… » dans l'Output Log, le nœud est sauté et la suite continue.
- Appeler un Custom Event, un Event Dispatcher ou une fonction exécute la chaîne appelée tout de suite, puis l'appelant continue (les frames appelées sont empilées au-dessus). Un Interface Message vers un acteur qui n'implémente pas l'interface ne fait rien, sans erreur ; Cast Failed n'est pas une erreur non plus.
- Une fonction pure est exécutée jusqu'au bout à chaque lecture de ses sorties.
- Au-delà de 100 000 nœuds pour un seul événement : « Infinite loop detected ».

## Format de sauvegarde

Un fichier `*.bptrainer.json` : `{ kind, format, project }`. Format actuel : 3 (Event Dispatchers, interfaces implémentées, Blueprint Interfaces du projet, pion du joueur, signatures des fonctions). Le format 2 avait ajouté le niveau, les propriétés de composants et Auto Receive Input. Toute évolution du modèle incrémente `PROJECT_FORMAT` et ajoute une étape à `migrate()` dans `serialization/serialize.ts`, pour que les anciens projets restent lisibles.
