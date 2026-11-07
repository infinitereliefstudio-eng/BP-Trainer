# BP Trainer — consignes pour un agent

Avant toute chose, lis **docs/HANDOFF.md** : contexte, état des étapes, décisions, ce qui reste à faire, méthode de travail et pièges connus. Puis docs/PLAN_V1.md (plan validé), docs/ARCHITECTURE.md (code) et docs/BACKLOG.md (noté pour plus tard).

## Règles

- L'utilisateur, Tristan, parle français et n'a qu'un téléphone : il teste sur la page de test claude.ai, ne lance aucune commande. Réponds en français.
- Une étape à la fois : ne commence pas l'étape suivante du plan sans son feu vert explicite.
- Textes de l'appli en français ; noms des nœuds, pins et panneaux en anglais, comme dans UE.
- Architecture maintenable : petits fichiers par responsabilité. `src/core` n'utilise jamais le DOM. Un nœud = une définition déclarative (`core/nodes/library`) + un comportement (`core/runtime/behaviors`) ; une leçon = une définition testée avec sa solution de référence.
- Ne pas implémenter les idées de BACKLOG.md sans que Tristan le demande.

## Commandes

```bash
npm ci
npm run lint             # Biome
npm test                 # vitest : cœur, runtime, chaque leçon et exercice, chaque nœud
npx tsc --noEmit
npm run build            # un seul fichier dist/index.html
npx vitest run --config tools/e2e/vitest.config.ts && python3 tools/e2e/smoke.py   # captures téléphone simulé
python3 tools/make-test-page.py <sortie.html>   # page à publier sur la page de test claude.ai
```

Commits sur `main`, avec les lignes d'attribution demandées par l'environnement, puis `git push origin main`.
