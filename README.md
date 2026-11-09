# BP Trainer

Apprendre les Blueprints d'Unreal Engine 5 sur téléphone : un éditeur de nœuds tactile fidèle à UE, une simulation de la logique et un parcours d'exercices.

**État : V1 livrée ; V2 en cours, toutes les étapes livrées (réalisme, explications, 36 leçons et exercices sur 4 niveaux, héritage entre Blueprints), E en attente de validation ([docs/PLAN_V2.md](docs/PLAN_V2.md)).** L'éditeur de graphes, le niveau vu de dessus, Play (joystick, touches E / F / Espace, contrôle du temps), la communication entre Blueprints (références, Cast, Event Dispatchers, Blueprint Interfaces, fonctions), le débogage (breakpoints, pas à pas, valeurs des pins, Execution Trace, fils animés), les 12 leçons avec les exercices « Prédis » et « Débogue », une bibliothèque de plus de 150 nœuds (timers, tableaux, Spawn, Switch, Enums…), l'Outliner en direct pendant Play, et le mode hors ligne prêt pour l'APK ([docs/APK.md](docs/APK.md)).

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
