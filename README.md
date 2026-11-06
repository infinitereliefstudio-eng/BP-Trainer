# BP Trainer

Apprendre les Blueprints d'Unreal Engine 5 sur téléphone : un éditeur de nœuds tactile fidèle à UE, une simulation de la logique et un parcours d'exercices.

**État : étape 1 sur 4 — socle de l'éditeur.** On crée des Blueprints, des nœuds, des fils et des variables au doigt ; l'exécution (Play) arrive à l'étape 2.

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

## Développer

```bash
npm install
npm run dev        # serveur de développement
npm test           # tests du cœur
npm run build      # build dans dist/ (un seul index.html autonome)
```

Chaque push sur `main` est testé, construit et publié sur GitHub Pages par `.github/workflows/deploy.yml`.

L'architecture est décrite dans [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
