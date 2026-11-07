# Reprise du projet

Ce fichier suffit pour reprendre le travail sans l'historique des conversations. À lire avec [PLAN_V1.md](PLAN_V1.md) (le plan validé), [ARCHITECTURE.md](ARCHITECTURE.md) (le code) et [BACKLOG.md](BACKLOG.md) (ce qui est noté pour plus tard).

Dernière mise à jour : 2026-11-06, fin de l'étape 3.

## Le projet

BP Trainer est une appli Android (une PWA empaquetée en APK par PWABuilder) pour apprendre les Blueprints d'Unreal Engine 5 au doigt : un éditeur de graphes fidèle à UE, un interpréteur qui exécute réellement la logique dans un petit monde 2D vu de dessus, un parcours de leçons validées automatiquement et un mode Simulation libre. Ce n'est pas un moteur de jeu : seule la logique Blueprint est reproduite.

- Dépôt : https://github.com/infinitereliefstudio-eng/BP-Trainer, branche `main`.
- Plan V1 validé : [PLAN_V1.md](PLAN_V1.md), copie du Claude Doc https://claude.ai/artifact/RKdx8XcoCQJ1Q1bizened6.
- Page de test : https://claude.ai/artifact/BojAfVYPuqnJcK49BLzdfd, privée, republiée à chaque étape (voir « Publier la page de test »).

## Avec qui, et comment

- **Tristan** (studio Infinite Relief Studio), développeur indé UE5 sur son jeu « Station enterrée ». Il parle **français** : réponses, textes de l'appli et docs en français ; noms des nœuds, pins et panneaux **en anglais comme dans UE**.
- Il n'a **qu'un téléphone**, pas d'ordinateur. Il teste sur la page claude.ai en paysage. Il ne lance aucune commande.
- Il veut **une architecture maintenable et évolutive**, pas de gros fichiers : un fichier par responsabilité, des définitions déclaratives.
- **Une étape à la fois, avec une porte de validation** : on ne commence l'étape suivante qu'après son feu vert explicite sur son téléphone. Il a validé les étapes 1 et 2 (« Tout fonctionne parfaitement »).
- Il ne veut pas avancer le packaging APK avant l'étape 4.
- Les retours sur la qualité des solutions (au-delà de « ça marche ») sont notés dans BACKLOG.md ; il a demandé de **ne pas les implémenter maintenant**.

## État

| Étape | Contenu | État |
|---|---|---|
| 1 — Socle de l'éditeur | Canvas, nœuds, fils, gestes, palette, My Blueprint, Details, variables, sauvegarde, export | Validée |
| 2 — Interpréteur et monde 2D | Compilation, interpréteur, niveau, Play (joystick, E/F/Espace, vitesse, frame par frame), Output Log, leçons 1 à 5 | Validée |
| 3 — Communication et débogage | Références, Cast, dispatchers, interfaces, fonctions ; breakpoints, pas à pas, valeurs des pins, Execution Trace, fils animés ; leçons 6 à 11, Prédis P1–P3, Débogue D1–D2 | **Livrée le 2026-11-06, en attente de la validation de Tristan** |
| 4 — Synthèse et APK | Voir plus bas | À faire après validation |

### En attente côté Tristan

- **Activer GitHub Pages** : Settings → Pages → Source : « GitHub Actions ». Tant que ce n'est pas fait, le job `deploy` du workflow échoue (le build et les tests passent). L'API Pages n'est pas joignable depuis l'espace de travail de Claude (proxy).
- Valider l'étape 3 sur la page de test.

## Écarts et décisions depuis le plan

- Le joueur fourni s'appelle **BP_Joueur** (le plan dit BP_Player). Leçons 1 à 5 : pion par défaut, sans Blueprint. À partir de la leçon 6 : BP_Joueur (parent Pawn) réglé comme pion du joueur (`Project.playerClassId`, case « Default Pawn » dans Class Settings). Le joueur Blueprint reçoit toujours les touches.
- Ordre du parcours (`core/lessons/index.ts`) : L1–L4, **P1**, L5–L8, **P2**, L9, **D1**, L10, **P3**, L11, **D2**. Les exercices ont `kind: 'predict' | 'debug'` et un `code` (P1, D1…).
- Les **fonctions utilisateur** sont livrées à l'étape 3 (entrées, sorties, pure ou non, appel depuis un autre Blueprint). Pas encore de variables locales.
- Les fonctions d'interface n'ont **pas de paramètres** pour l'instant (événements simples).
- Pendant Play, le graphe et le niveau sont des **onglets** (pas d'écran partagé, trop petit sur téléphone). En pause, un tiroir Debug s'ouvre à droite du graphe.
- Les breakpoints ne sont **pas sauvegardés** (comme dans UE).
- La validation d'une leçon est **comportementale** (scénario joué puis vérifications) ; quelques contraintes de notion (Branch en L4, DoOnce en L5, Cast en L6, pas de Tick en L10, pas de Cast en L11).
- Hébergement : l'appli est publiée par GitHub Pages depuis le dépôt BP-Trainer. Le fichier `assetlinks.json` doit être à la **racine du domaine** : il faudra un second dépôt `infinitereliefstudio-eng.github.io` qui sert `/.well-known/assetlinks.json` (ou y déplacer l'appli). À trancher avec Tristan à l'étape 4.

## Étape 4 — à faire (après le feu vert)

1. **Leçon 12 « Remettre la station en route »** (module 4 « Synthèse », voir le tableau du plan) : ramasser 3 fusibles, réparer le générateur qui alimente lampes et porte, carburant qui baisse avec le temps. Notions : tableau ou compteur, **Set Timer by Event**, **Clamp**, plus interface et dispatcher. Les briques réutilisables sont dans `core/lessons/library/props.ts`.
2. **Compléter la bibliothèque** vers la centaine de nœuds du plan. Manquent notamment :
   - Events : Event Destroyed.
   - Flow : DoN, MultiGate, ForLoopWithBreak, WhileLoop, Switch on Int / String / Enum, Select.
   - Temps : Set Timer by Event, Clear and Invalidate Timer by Handle, Is Timer Active by Handle (+ type Timer Handle).
   - Variables : Increment / Decrement Int.
   - Maths et logique : toutes les opérations pour Int et Float (÷, %, −, ×, comparaisons !=, <=, >=…), Clamp, Min, Max, Abs, Truncate, Round, Random Float in Range, Random Bool.
   - Texte : Append, Contains, Len, Equal (String).
   - Tableaux : Add, Remove Index, Get, Set Array Elem, Contains, Find, Clear (Length et For Each existent).
   - Acteurs : Spawn Actor from Class, Get All Actors of Class, Get Actor of Class, Get Display Name, Set Actor Hidden In Game, Get / Set Actor Location.
   - Composants : Set Light Color, Set Collision Enabled.
   - Organisation : Reroute (l'entrée « Ajouter un Reroute » du menu d'un fil est désactivée), Comment.
   - Types : Enum (et création d'Enums), Class Reference, Timer Handle.
3. **Mode Simulation complet** : Outliner et Details en direct pendant Play (variables de chaque instance, modifiables), placement libre des acteurs.
4. **Hors ligne et APK** : manifest, service worker, icônes, paysage forcé ; GitHub Pages actif ; APK via PWABuilder ; `assetlinks.json` (Tristan envoie celui du zip PWABuilder). Étapes détaillées dans PLAN_V1.md, section « Packaging APK via PWABuilder et hébergement ».
5. Selon le temps : les points de BACKLOG.md marqués « étape 3 ».

## Méthode de travail

1. Annoncer l'étape, créer une liste de tâches, travailler par petits fichiers.
2. Tests : `npm test` (vitest, cœur sans DOM). Chaque leçon est testée automatiquement : le projet de départ échoue, la solution de référence réussit ; pour un « Prédis », la bonne réponse est vérifiée par la simulation. Ajouter des variantes de mauvaises réponses dans `tests/lessonVariants.test.ts`.
3. `npx tsc --noEmit` et `npm run build`.
4. **Vérification visuelle sur téléphone simulé** (800×370, tactile) :
   ```bash
   npm run build
   npx vitest run --config tools/e2e/vitest.config.ts   # projets résolus dans tools/e2e/out/
   python3 tools/e2e/smoke.py                            # captures dans tools/e2e/out/shots/
   ```
   Le script attend « errors [] ». L'appli expose son store en `window.bpStore` quand l'URL contient `?e2e`. Pour des gestes précis (glisser, appui long), utiliser `Input.dispatchTouchEvent` via une session CDP Playwright.
5. **Publier la page de test** : `python3 tools/make-test-page.py <fichier.html>`, puis publier ce fichier avec l'outil Artifact sur l'URL de la page de test (`url` = https://claude.ai/artifact/BojAfVYPuqnJcK49BLzdfd) pour garder le même lien. Le bouton Exporter ne télécharge rien dans la page claude.ai (limite connue, il marchera dans l'APK).
6. Mettre à jour README.md (« État : étape N »), ARCHITECTURE.md, ce fichier et BACKLOG.md.
7. Commit sur `main` avec, en fin de message, les lignes d'attribution demandées par l'environnement (Co-Authored-By / Claude-Session), puis `git push origin main`.
8. Résumer à Tristan en français : ce qui est livré, quoi tester sur son téléphone, ce qui est reporté. Puis attendre sa validation.

## Pièges techniques déjà rencontrés

- TypeScript 7 : pas de `baseUrl` ; chemins relatifs (`./src/...`) dans `tsconfig.json`. `vite.config.ts` et `tools/` sont hors du `include` de tsconfig.
- `vite-plugin-singlefile` : tout le build est un seul `dist/index.html` (base `./`).
- Tactile : un appui long ouvre un panneau, et le « clic fantôme » qui suit le fermait. `ui/widgets/useOwnTap.ts` protège les fonds et éléments de menus et de palette.
- `GraphCanvas.focusNode` appelé juste après le montage (taille 0) est différé jusqu'au premier redimensionnement.
- Play tourne sur une copie du projet (`structuredClone`) : modifier le graphe pendant Play n'a d'effet qu'au Play suivant ; les breakpoints, eux, sont partagés.
- Sauvegarde : IndexedDB `bp-trainer`, magasin `kv`, clés `project:sandbox`, `project:lesson:<id>`, `progress`. Format de projet versionné : `PROJECT_FORMAT` et `migrate()` dans `core/serialization/serialize.ts`.
