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
| `types/` | Système de types des pins (`PinType`, compatibilité, héritage des classes), valeurs littérales, Enums (`enums.ts` : ECollisionEnabled et ceux du projet), pins génériques (`wildcard.ts`) |
| `model/` | Les données du projet : `Project` → `BlueprintClass` → `Graph` → `NodeInstance` / `Link`, plus variables et composants. Du JSON pur |
| `nodes/` | La bibliothèque de nœuds : une **définition** par nœud (titre, pins, réglages, aide), rangée par catégorie dans `library/`, indexée par `registry.ts`. `palette.ts` génère les entrées de recherche (dont Get/Set par variable) |
| `graph/rules.ts` | Les règles de connexion d'UE (une source par entrée de données, une cible par sortie exec, types compatibles) |
| `operations/` | Les mutateurs : ajouter un nœud, relier, renommer une variable… Chaque fonction modifie le modèle, sans gérer l'annulation. `wildcardOps` type les nœuds génériques, `organizeOps` gère Reroute et Comment, `enumOps` les Enums et les renommages de types |
| `history/` | Annuler / rétablir par instantanés JSON du Blueprint touché (ou du projet) |
| `compiler/` | Le bouton Compile : vérifications façon UE et messages pour Compiler Results |
| `store/` | `EditorStore`, la source de vérité de la session : projet, historique, Blueprint et graphe ouverts, sélection, messages |
| `serialization/` | Format de fichier versionné et migrations |
| `templates/` | Le projet de départ du mode Simulation |
| `runtime/` | L'exécution : `interpreter.ts` (pile de frames explicite, file d'événements, appels synchrones, fonctions avec une portée par appel, nœuds purs recalculés à chaque lecture, actions latentes, breakpoints, erreurs façon UE), `behaviors/` (ce que fait chaque nœud), `simulation.ts` (orchestre une partie : BeginPlay, Tick, touches, temps en pas fixes de 1/60 s découpés en phases reprenables, Execution Trace, réponses à l'interpréteur) et ce qu'il ordonne : `actorFactory.ts` (instances, joueur), `movement.ts` (déplacement du joueur), `physics.ts` et `overlaps.ts` (formes, événements d'overlap), `timers.ts` (Set Timer by Event), `journal.ts` (Output Log, messages à l'écran), `values.ts` (copies, égalité, conversions) |
| `explain/` | Les explications, sans DOM : « Pourquoi ? » des erreurs de compilation et d'exécution, diagnostic « Pourquoi ce nœud ne s'est pas exécuté ? » à partir de `runtime/runRecord.ts`, notes Piège et Dans UE |
| `lessons/` | Le parcours : chaque leçon décrit ses explications, son projet de départ, un scénario joué automatiquement et des vérifications. `runner.ts` exécute le scénario sans affichage ; chaque leçon fournit aussi sa solution de référence, testée. `library/props.ts` regroupe les Blueprints réutilisés (joueur, clé, porte, générateur, lampe) ; `library/exercises.ts` les exercices « Prédis » (`kind: 'predict'`, réponse vérifiée par la simulation dans les tests) et « Débogue » (`kind: 'debug'`) |

### Ajouter un nœud

1. Écrire sa définition dans le fichier de `core/nodes/library/` de sa catégorie (ou un nouveau fichier).
2. Si c'est un nouveau fichier, l'ajouter à la liste de `core/nodes/registry.ts`.
3. Écrire son comportement dans `core/runtime/behaviors/` sous le même identifiant : `exec` pour un nœud impur (il renvoie les sorties exec à suivre), `pure` pour un nœud pur (il renvoie ses valeurs).

L'éditeur, la palette, Details, la compilation et l'interpréteur le prennent en compte sans autre changement. Deux tests le gardent : chaque nœud exécutable a un comportement (`tests/lessons.test.ts`), et ce comportement ne lit et n'écrit que des pins de sa définition (`tests/behaviours.test.ts`, qui l'exécute à blanc : une pin mal nommée y échoue au lieu de lire une valeur vide). Un nœud dont les pins dépendent d'un réglage y reçoit un réglage d'exemple (`CONFIG`).

### Pins génériques (Wildcard)

Comme dans UE, un nœud générique (tableaux, Select, Reroute, For Each…) prend le type du premier fil branché sur l'une de ses pins Wildcard : `adoptWildcard` l'écrit dans `node.wild[<groupe>]` (`default`, ou le `wildGroup` de la pin quand le nœud a plusieurs groupes, comme Select). Cet état interne reste hors de `config`, qui ne porte que les réglages de l'utilisateur. `resolvePins` remplace alors les pins Wildcard par ce type ; `releaseWildcards` le retire quand le dernier fil part (à chaque fin de transaction du store). `accepts` limite les types possibles (Index de Select : Integer, Boolean ou Enum). Les projets au format 3 sont typés au chargement depuis leurs fils.

### Pins par référence

Une pin `byRef` (losange, comme dans UE) attend un Get de variable : le comportement écrit dans cette variable avec `cx.writeRef` (Increment Int, Clear and Invalidate Timer). Les fonctions de tableau modifient le tableau en place : un Get transmet le tableau de la variable lui-même. Set copie les tableaux et vecteurs (`runtime/values.ts`). Le compilateur refuse une pin par référence qui n'est pas reliée à une variable.

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
- Reroute (style `knot`) : un point, saisi par son centre ; ses pins sont de part et d'autre. Comment (style `comment`) : dessiné derrière les fils, saisi par sa barre de titre (déplace les nœuds qu'il contient entièrement) ou sa poignée (redimensionne) ; son intérieur reste du vide.
- `world/playSession.ts` garde l'acteur choisi (`selected`) : surligné dans le niveau, montré dans l'Outliner en direct (`ui/play/LiveOutliner.tsx`), et objet débogué.

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
- Appeler un Custom Event, un Event Dispatcher ou une fonction exécute la chaîne appelée tout de suite, puis l'appelant continue (les frames appelées sont empilées au-dessus).
- Chaque frame porte une portée (`Scope`) : sorties des nœuds et mémoire des macros. Un Event Graph utilise celle de l'acteur, gardée d'un événement à l'autre ; chaque appel de fonction en reçoit une neuve, comme les variables locales d'UE. Une fonction peut donc s'appeler elle-même, et un DoOnce dans une fonction repart à zéro à chaque appel.
- Equal (Float) est exact, comme le == d'UE ; Nearly Equal (Float) prend une tolérance.
- Les composants d'un joueur Blueprint comptent comme ceux de tout acteur : ses Box Collision déclenchent des overlaps, ses meshes, lumières et textes sont dessinés sous sa capsule. Un Interface Message vers un acteur qui n'implémente pas l'interface ne fait rien, sans erreur ; Cast Failed n'est pas une erreur non plus.
- Une fonction pure est exécutée jusqu'au bout à chaque lecture de ses sorties.
- Au-delà de 100 000 nœuds pour un seul événement : « Infinite loop detected ».
- Set Timer by Event garde un timer par événement (`Simulation.timers`), décompté après les actions latentes ; relancer le même événement remplace son timer, Time à 0 l'arrête. Un timer en Looping peut se déclencher plusieurs fois dans une longue frame.
- L'ordre des acteurs pour BeginPlay, Tick et les touches n'est pas garanti dans UE : `Simulation` le prend en option (`level`, `reversed`, `shuffled`). Play le mélange ; `runLesson` vérifie chaque leçon dans l'ordre du niveau puis l'ordre inverse.
- Une variable Private n'est accessible que depuis son Blueprint (palette et compilation). Une variable Expose on Spawn (et Instance Editable) devient une pin `expose:<varId>` de Spawn Actor quand la classe est choisie sur le nœud ; sa valeur est posée avant le BeginPlay.
- Spawn Actor exécute le BeginPlay du nouvel acteur avant que la chaîne continue ; Destroy Actor exécute d'abord son Event Destroyed.
- Collision Enabled (ECollisionEnabled) : Query déclenche les overlaps (Box Collision), Physics bloque le joueur (Static Mesh). Set Actor Hidden In Game ne touche pas la collision, comme dans UE.
- Une Point Light n'a pas d'icône en jeu : seul son halo est dessiné.

## Format de sauvegarde

Un fichier `*.bptrainer.json` : `{ kind, format, project }`. Format actuel : 5 (le type adopté par les nœuds génériques passe de `config` à `node.wild`). Le format 4 avait ajouté les Enums du projet, Collision Enabled des composants et le type adopté par les nœuds génériques. Le format 3 avait ajouté les Event Dispatchers, les interfaces implémentées, les Blueprint Interfaces du projet, le pion du joueur et les signatures des fonctions. Le format 2 avait ajouté le niveau, les propriétés de composants et Auto Receive Input. Toute évolution du modèle incrémente `PROJECT_FORMAT` et ajoute une étape à `migrate()` dans `serialization/serialize.ts`, pour que les anciens projets restent lisibles.

## Outils

- `tools/e2e/solved.gen.ts` écrit les projets résolus de quelques leçons ; `tools/e2e/smoke.py` les charge dans l'appli construite et parcourt les écrans principaux sur un téléphone simulé (800×370, tactile), jusqu'à la leçon 12 en Play avec l'Outliner ; captures dans `tools/e2e/out/shots/`, code de sortie en échec au moindre problème.
- `npm run lint` : Biome (`biome.jsonc`), règles recommandées, formatage non imposé ; les règles coupées le sont avec leur raison.
- CI (`.github/workflows/deploy.yml`) : `build` (lint, tests, build), puis `e2e` (smoke sur téléphone simulé, captures en artefact `phone-screenshots`), puis `deploy` (GitHub Pages) qui seul dépend de l'activation de Pages.
- `tools/make-test-page.py` transforme `dist/index.html` en page publiable sur claude.ai.
- `tools/icons/make_icons.py` dessine les icônes de `public/icons/`.

## Hors ligne et APK

`public/` est copié tel quel dans `dist/` : manifest (plein écran, paysage), service worker (`sw.js` : page en réseau d'abord, cache sinon), icônes. `src/offline.ts` enregistre le service worker en HTTPS hors d'un cadre (pas dans la page de test claude.ai). Le dépôt `infinitereliefstudio-eng.github.io` servira `/.well-known/assetlinks.json` (contenu dans `hosting/root-site/`). Marche à suivre : [APK.md](APK.md).
