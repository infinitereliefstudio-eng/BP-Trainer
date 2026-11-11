# BP Trainer

Apprendre les Blueprints d'Unreal Engine 5 sur téléphone : un éditeur de nœuds tactile fidèle à UE, une simulation de la logique et un parcours d'exercices.

**État : V1, V2, V3 livrées ([docs/PLAN_V3.md](docs/PLAN_V3.md)), puis V4 le 2026-11-11 (révision espacée, mémo UE, index des nœuds, objectifs visibles et Vérifier dans l’éditeur, solution ouvrable, sauvegarde complète), en attente de validation. 54 leçons et exercices sur 4 niveaux, 82 questions de révision, 22 fiches de mémo.** L'éditeur de graphes, le niveau vu de dessus, Play (joystick, touches E / F / Espace, contrôle du temps), la communication entre Blueprints (références, Cast, Event Dispatchers, Blueprint Interfaces, fonctions, héritage), les données (structures, Map, Set, Text, Name), le mouvement (Timeline avec son éditeur de piste, Lerp, FInterp To, Construction Script), l'interaction (Line Trace By Channel, Event Hit), le débogage (breakpoints, pas à pas, valeurs des pins, Execution Trace, « Pourquoi ? »), plus de 190 nœuds, et des retours sur la qualité des solutions (notion visée, robustesse, conseils de construction, autres façons de faire). L'appli est installée en APK ([docs/APK.md](docs/APK.md)) et fonctionne hors ligne.

## Utiliser l'appli

Les gestes, en paysage :

| Geste | Action | Dans UE |
| --- | --- | --- |
| Appui long sur le vide (ou double toucher) | Palette des nœuds | Clic droit |
| Tirer un fil depuis une pin, relâcher dans le vide | Palette filtrée, nœud relié automatiquement | Tirer un fil |
| Relâcher un fil sur un nœud | Branche sur la première pin compatible | — |
| Toucher une pin puis une autre | Relier sans glisser | — |
| Appui long sur un nœud, une pin ou un fil | Options (dupliquer, rompre, promouvoir en variable…) | Clic droit |
| Deux doigts | Zoom et déplacement | Molette, clic droit glissé |
| Bouton Sélection, puis glisser | Sélection multiple | Glisser sur le vide |
| Appui long sur un nœud › Ajouter un breakpoint | Pause juste avant ce nœud pendant Play | F9 |
| Onglet du graphe pendant Play | Fils qui s'allument, Debug (valeurs, trace) | Fenêtre Blueprint en PIE |
| Double toucher un fil | Ajoute un Reroute | Double-clic sur un fil |
| Appui long sur des nœuds › Entourer d’un Comment | Cadre titré, déplacé avec ses nœuds | C |
| Double toucher un Timeline | Éditeur de piste : toucher ajoute un point clé, glisser le déplace | Double-clic sur le Timeline |
| My Blueprint › Graphs › ConstructionScript | Graphe exécuté dans l’éditeur, avant le jeu | Onglet Construction Script |
| ⋮ › Conseils de construction | Pistes sur la façon dont les graphes sont bâtis | — |
| ☷ pendant Play | Outliner : acteurs et variables en direct | World Outliner en PIE |

## Développer

```bash
npm install
npm run dev        # serveur de développement
npm test           # tests du cœur
npm run build      # build dans dist/ (un seul index.html autonome)
```

Chaque push sur `main` est testé, construit et publié sur GitHub Pages par `.github/workflows/deploy.yml`.

Documentation :

- [docs/HANDOFF.md](docs/HANDOFF.md) : pour reprendre le projet (état, décisions, étape suivante, méthode).
- [docs/PLAN_V1.md](docs/PLAN_V1.md) : le plan V1 validé.
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) : l'architecture du code.
- [docs/BACKLOG.md](docs/BACKLOG.md) : les idées notées pour plus tard.
- [docs/APK.md](docs/APK.md) : installer l'appli en APK avec PWABuilder.
- `tools/` : test visuel sur téléphone simulé (`tools/e2e`) et génération de la page de test.
