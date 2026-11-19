# BP Trainer

Apprendre les Blueprints d'Unreal Engine 5 sur téléphone : un éditeur de nœuds tactile fidèle à UE, une simulation de la logique et un parcours d'exercices.

**État : V1, V2, V3 livrées ([docs/PLAN_V3.md](docs/PLAN_V3.md)), puis V4 le 2026-11-11 (révision espacée, mémo UE, index des nœuds, objectifs visibles, solution ouvrable, sauvegarde complète), V5 le 2026-11-12 (bilan de la solution, fiches de notions, 8 leçons et exercices), puis V6 le 2026-11-16 (16 leçons et exercices tirés du recueil d’exercices de Tristan, avec les nœuds qu’ils demandaient : Random Stream, Transform, Get Reflection Vector, Dot Product, Snap To Grid, For Each Loop with Break), puis V6.1 le 2026-11-17 (fiches « Comprendre » des 62 premières leçons et exercices réécrites sur le modèle de la V6) et V6.2 (fidélité à UE : collisions, Destroy Actor, Gate, affichage des Float…), puis V7 le 2026-11-17 (Data Tables et Save Game, avec 8 leçons et exercices) et V7.1 (Consume Input et pile des entrées, Débogue D19), puis V7.2 le 2026-11-18 (fiabilité : aucun projet ni progression écrasés, stockage unifié, imports vérifiés, slots enregistrés pendant Play, règles de simulation versionnées, avis de nouvelle version) et V7.3 (vers l'autonomie : aide utilisée mémorisée, notions et prérequis, durée, « Montre-moi », chaîne pilote Cast To avec un transfert et un exercice en autonomie différé), puis V7.4 (Enhanced Input : Input Actions, Mapping Contexts, déclencheurs Pressed, Released et Hold, trois étapes) et V7.5 et V7.6 (interface à la manière d'UE : onglets Niveau et Blueprints, barres d'outils des deux éditeurs, Class Defaults, Content Drawer avec + Add et Pick Parent Class) et V7.7 (Player Controller et vraie chaîne d'Enhanced Input jusqu'à Add Mapping Context) et V7.8 (Details à la manière d'UE avec Search Details, palette « All Actions for this Blueprint », Find Results) et V7.9 (Viewport du Blueprint, Outliner de l'éditeur de niveau), puis V7.11 et V7.12 (lot 1 : Enhanced Input dans toutes les étapes après la leçon Player Controller, textes à jour), V7.10 (lot 0 du plan du parcours : aide par niveau, rappels et espacement, niveau Expert, synthèses, voir [docs/PLAN_PARCOURS.md](docs/PLAN_PARCOURS.md)), puis V7.13 et V7.14 (lot 2 : Débutant et Intermédiaire revus, construire un acteur, pivot, Cast isolé, timers dès l'Intermédiaire, Instance Editable, synthèses S1 et S2), puis V7.15 et V7.16 (lot 3 : Confirmé revu, Choisis ton outil, Qui a éteint la lumière ?, Interagir comme dans UE5, Le menu pause avec Set Game Paused, Prédis P14, rappels, synthèse S3), puis V7.17 et V7.18 (lot 4 : l'Avancé en cahiers des charges, Le levier universel, deux entraînements mélangés, synthèse S4 avec sauvegarde ; niveau Expert avec deux projets, L'atelier des machines et La radio de la station), puis V7.19 à V7.21 (Actor Components : composants de logique en Blueprint, une copie par acteur, Get Owner, Get Component by Class, « On … (Composant) », et neuf étapes en Avancé, voir [docs/PLAN_COMPOSANTS.md](docs/PLAN_COMPOSANTS.md)), toutes en attente de validation. 124 étapes sur 5 niveaux, 154 questions de révision sur les leçons, 23 fiches de mémo.** L'éditeur de graphes, le niveau vu de dessus, Play (joystick, touches E / F / Espace, contrôle du temps), la communication entre Blueprints (références, Cast, Event Dispatchers, Blueprint Interfaces, fonctions, héritage, Actor Components), les données (structures, Map, Set, Text, Name, Data Tables), la sauvegarde (SaveGame, slots qui survivent à Stop), le mouvement (Timeline avec son éditeur de piste, Lerp, FInterp To, Construction Script), l'interaction (Line Trace By Channel, Event Hit), le débogage (breakpoints, pas à pas, valeurs des pins, Execution Trace, « Pourquoi ? »), plus de 200 nœuds, et des retours sur la qualité des solutions (notion visée, robustesse, conseils de construction, autres façons de faire). L'appli est installée en APK ([docs/APK.md](docs/APK.md)) et fonctionne hors ligne.

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
