# Reprise du projet

Ce fichier suffit pour reprendre le travail sans l'historique des conversations. À lire avec [PLAN_V2.md](PLAN_V2.md) (le plan en cours), [PLAN_V1.md](PLAN_V1.md) (le plan de la V1), [ARCHITECTURE.md](ARCHITECTURE.md) (le code) et [BACKLOG.md](BACKLOG.md) (ce qui est noté pour plus tard).

Dernière mise à jour : 2026-11-09, étape E de la V2 livrée (en attente de validation) : le plan V2 est entièrement livré.

## Le projet

BP Trainer est une appli Android (une PWA empaquetée en APK par PWABuilder) pour apprendre les Blueprints d'Unreal Engine 5 au doigt : un éditeur de graphes fidèle à UE, un interpréteur qui exécute réellement la logique dans un petit monde 2D vu de dessus, un parcours de leçons validées automatiquement et un mode Simulation libre. Ce n'est pas un moteur de jeu : seule la logique Blueprint est reproduite.

- Dépôt : https://github.com/infinitereliefstudio-eng/BP-Trainer, branche `main`.
- Plan V1 validé : [PLAN_V1.md](PLAN_V1.md), copie du Claude Doc https://claude.ai/artifact/RKdx8XcoCQJ1Q1bizened6.
- Page de test : https://claude.ai/artifact/BojAfVYPuqnJcK49BLzdfd, privée, republiée à chaque étape (voir « Publier la page de test »).

## Avec qui, et comment

- **Tristan** (studio Infinite Relief Studio), développeur indé UE5 sur son jeu « Station enterrée ». Il parle **français** : réponses, textes de l'appli et docs en français ; noms des nœuds, pins et panneaux **en anglais comme dans UE**.
- Il n'a **qu'un téléphone**, pas d'ordinateur. Il teste sur la page claude.ai en paysage. Il ne lance aucune commande.
- Il veut **une architecture maintenable et évolutive**, pas de gros fichiers : un fichier par responsabilité, des définitions déclaratives.
- Il veut être sûr que la **logique est simulée de façon générale**, pas seulement les cas des leçons (retour du 7 novembre, après un Set Visibility sur le mesh qui semblait sans effet : c'était l'icône de la lumière dessinée par-dessus). Le runtime ne contient aucun cas particulier de leçon : garder ce principe.
- **Une étape à la fois, avec une porte de validation** : on ne commence l'étape suivante qu'après son feu vert explicite sur son téléphone. Il a validé les étapes 1, 2 et 3.
- Il ne veut pas avancer le packaging APK avant l'étape 4.
- Les retours sur la qualité des solutions (au-delà de « ça marche ») sont notés dans BACKLOG.md ; il a demandé de **ne pas les implémenter maintenant**.

## État

| Étape | Contenu | État |
|---|---|---|
| 1 — Socle de l'éditeur | Canvas, nœuds, fils, gestes, palette, My Blueprint, Details, variables, sauvegarde, export | Validée |
| 2 — Interpréteur et monde 2D | Compilation, interpréteur, niveau, Play (joystick, E/F/Espace, vitesse, frame par frame), Output Log, leçons 1 à 5 | Validée |
| 3 — Communication et débogage | Références, Cast, dispatchers, interfaces, fonctions ; breakpoints, pas à pas, valeurs des pins, Execution Trace, fils animés ; leçons 6 à 11, Prédis P1–P3, Débogue D1–D2 | Validée le 2026-11-07 |
| 4 — Synthèse et APK | Bibliothèque complète (172 définitions, 153 dans la palette), leçon 12, Outliner en direct pendant Play, hors ligne (manifest, service worker, icônes) | **Livrée le 2026-11-07, en attente de la validation de Tristan** ; APK à faire avec lui |

### En attente côté Tristan

- Valider l'étape 4 sur la page de test.
- Fait le 2026-11-07 : BP-Trainer rendu public (option A), GitHub Pages activé (source GitHub Actions), appli en ligne à https://infinitereliefstudio-eng.github.io/BP-Trainer/ (manifest et service worker vérifiés). Dépôt racine `infinitereliefstudio-eng.github.io` créé et rattaché à la session, avec `.nojekyll`, `index.html` (redirection) et un README.
- Fait le 2026-11-07 : paquet PWABuilder généré par Tristan (Package ID `com.infiniterelief.bptrainer`, clé « New », empreinte SHA-256 `CB:44:1E:…:4E:A2`, vérifiée identique dans l'APK). `assetlinks.json` publié dans le dépôt racine (copie dans `hosting/root-site/.well-known/`). Tristan garde le zip (clé et mots de passe) : ne jamais les mettre dans un dépôt.
- Reste : Tristan installe l'APK et confirme plein écran sans barre d'adresse et hors ligne.

### Après l'APK

- Publier `assetlinks.json` dans `hosting/root-site/.well-known/` puis dans le dépôt racine ; vérifier que l'URL `/.well-known/assetlinks.json` répond.
- Vérifier avec Tristan : APK installée, plein écran sans barre d'adresse, fonctionne hors ligne. C'est la livraison V1.

### Revue de la V1 (2026-11-07)

Rapport : Claude Doc « BP Trainer — Revue de la V1 », https://claude.ai/artifact/XEtLZTw2Y6C1PYwx9ytNJD. Tristan a demandé d'appliquer le plan de correction ; les trois lots sont faits :

1. Fidélité : portée par appel de fonction (récursion, macros neuves à chaque appel), composants du joueur Blueprint (overlaps et dessin), Equal (Float) exact et Nearly Equal.
2. Garde-fous : `tests/behaviours.test.ts`, Biome (`npm run lint`), smoke test dans la CI.
3. Dette : `simulation.ts` découpé, `node.wild` (format 5), utilitaires communs, cache de mise en page.

Restent pour la V2 (à décider avec lui) : héritage entre Blueprints, variables locales (la portée par appel est prête), paramètres d'interface, Construction Script, structures, Expose on Spawn, Event Hit.

## Écarts et décisions depuis le plan

- Le joueur fourni s'appelle **BP_Joueur** (le plan dit BP_Player). Leçons 1 à 5 : pion par défaut, sans Blueprint. À partir de la leçon 6 : BP_Joueur (parent Pawn) réglé comme pion du joueur (`Project.playerClassId`, case « Default Pawn » dans Class Settings). Le joueur Blueprint reçoit toujours les touches.
- Ordre du parcours (`core/lessons/index.ts`) : L1–L4, **P1**, L5–L8, **P2**, L9, **D1**, L10, **P3**, L11, **D2**. Les exercices ont `kind: 'predict' | 'debug'` et un `code` (P1, D1…).
- Les **fonctions utilisateur** sont livrées à l'étape 3 (entrées, sorties, pure ou non, appel depuis un autre Blueprint). Pas de variables locales (V2).
- Les fonctions d'interface n'ont **pas de paramètres** pour l'instant (événements simples).
- Pendant Play, le graphe et le niveau sont des **onglets** (pas d'écran partagé, trop petit sur téléphone). En pause, un tiroir Debug s'ouvre à droite du graphe.
- Les breakpoints ne sont **pas sauvegardés** (comme dans UE).
- En jeu, une Point Light n'est visible que par son halo : son icône (ampoule) n'est dessinée que dans l'éditeur, comme dans UE. Cacher le mesh d'une lampe laisse donc seulement la lumière au sol.
- La validation d'une leçon est **comportementale** (scénario joué puis vérifications) ; quelques contraintes de notion (Branch en L4, DoOnce en L5, Cast en L6, pas de Tick en L10, pas de Cast en L11).
- Hébergement : l'appli reste publiée par GitHub Pages depuis BP-Trainer, sous `/BP-Trainer/`. Le fichier `assetlinks.json` doit être à la **racine du domaine** : un second dépôt `infinitereliefstudio-eng.github.io` le sert (contenu prêt dans `hosting/root-site/`, avec `.nojekyll` pour que `.well-known` soit publié et un `index.html` qui redirige vers l'appli).
- Étape 4, choix d'implémentation :
  - Pins génériques à la manière d'UE (type adopté au premier fil, perdu au dernier) ; pins par référence en losange pour Increment / Decrement et Clear and Invalidate Timer ; les fonctions de tableau modifient le tableau de la variable reliée.
  - Valeurs : une Class Reference est l'**id** de la classe (les types, eux, nomment la classe) ; un Linear Color est une couleur `#rrggbb` ; un Enum vaut l'index de son entrée. Renommer une classe ou un Enum suit partout (variables, paramètres, nœuds génériques).
  - Spawn Actor : Spawn Transform découpé en Location et Rotation (pin de structure éclatée d'UE). Le BeginPlay du nouvel acteur s'exécute avant la suite. Destroy Actor exécute d'abord Event Destroyed.
  - Supprimer un Enum encore utilisé est refusé, comme UE refuse de supprimer un asset référencé.
  - Increment Float et Decrement Float existent en plus d'Int ; XOR, Floor, Ceil, To Upper, Random Array Item aussi.
  - Le mode Simulation était déjà libre pour placer les acteurs (+ Placer, glisser) ; l'étape 4 ajoute l'Outliner en direct pendant Play (☷).
  - La page de test claude.ai n'enregistre pas le service worker (dans un cadre) : le hors ligne ne se teste que sur GitHub Pages.

## V2 (plan validé le 2026-11-09)

Demande de Tristan : simuler précisément (il s'interrogeait sur le Set d'une variable d'un autre BP), plus de pédagogie mais seulement là où elle compte, plus de leçons à des niveaux différents. Plan : [PLAN_V2.md](PLAN_V2.md), étapes A à E, une validation entre chacune.

| Étape | État |
|---|---|
| A — Réalisme | Livrée le 2026-11-09, validée (« passe à la suite ») |
| B — Explications | Livrée le 2026-11-09, validée (« tu peux passer à l'étape c ») |
| C — Débutant et Intermédiaire | Livrée le 2026-11-09, validée (« ok tu peux passer à la suite ») |
| D — Confirmé et Avancé | Livrée le 2026-11-09, validée (« tu peux passer a la dernière étape ») |
| E — Héritage | **Livrée le 2026-11-09, en attente de validation** |

Étape A, choix d'implémentation :
- `Simulation` prend `order: 'level' | 'reversed' | 'shuffled'` (défaut `level` pour les tests). Il fixe l'ordre des acteurs de départ (niveau puis joueur) pour BeginPlay, Tick et les touches ; les acteurs créés par Spawn passent après, dans l'ordre de création. Play utilise `shuffled` (graine = l'heure) et écrit l'ordre tiré dans l'Output Log (`LogBlueprintTrainer:`) dès que deux acteurs ont un BeginPlay. Option « Ordre des BeginPlay : mélangé / fixe » dans le menu ⋮, gardée dans le navigateur (`ui/playSettings.ts`).
- `runLesson` joue le scénario dans l'ordre du niveau puis, si tout passe, dans l'ordre inverse ; un échec dans le second ordre seulement renvoie ses résultats avec la note `ORDER_NOTE`. Les 12 leçons et 5 exercices passent dans les deux ordres.
- `Variable.private` et `Variable.exposeOnSpawn` (champs optionnels : pas de changement de format). Private : Get/Set externes retirés de la palette des autres BP, erreur de compilation sur un nœud existant. Expose on Spawn exige Instance Editable (cocher l'une coche l'autre, décocher Instance Editable décoche Expose) ; les pins `expose:<varId>` n'apparaissent sur Spawn Actor que pour la classe choisie sur le nœud, comme dans UE, et sont appliquées avant le BeginPlay.

Étape B, choix d'implémentation :
- `core/explain/` (sans DOM) : `compile.ts` (un « Pourquoi ? » par `CompileCode`, posé par `validate.ts` sur chaque message), `runtime.ts` (reconnaît les messages d'erreur d'exécution ; pour Accessed None, remonte le fil de la pin jusqu'à la source : variable non réglée, Cast raté…), `diagnose.ts` + `events.ts` (« Pourquoi ce nœud ne s'est pas exécuté ? »), `notes.ts` (notes Piège sur 19 nœuds et Dans UE sur 6), `where.ts` (recherche dans les graphes).
- `runtime/runRecord.ts` : ce que la partie a fait, sans limite de taille (un compteur par nœud et par sortie), plus les événements silencieux signalés par les comportements via `world.note()` (Delay ignoré, Do Once fermé, Gate fermé, Dispatcher sans abonné, message d'interface ignoré…) et les lectures/écritures de variables entre Blueprints (`varRead`, `varWritten`, ordonnées par un compteur car plusieurs arrivent dans la même image).
- Le diagnostic remonte les fils d'exécution jusqu'au premier nœud qui s'est exécuté sans continuer, ou à l'événement jamais déclenché ; une suite de nœuds non exécutés est résumée en une étape. Il s'appuie sur la partie en cours, la dernière, ou la dernière vérification de leçon (`LessonRun.sim`).
- Interface : bouton « Pourquoi ? » sous les erreurs (Compiler Results, Output Log), groupe Exécution dans les Details d'un nœud, notes Piège / Dans UE sous la description, « À retenir » (`Lesson.remember`) à la réussite.
- Messages des leçons revus en retirant un à un chaque fil d'exécution des solutions de référence : L8 ne dit plus « déjà refermée » si la porte n'a jamais bougé ; L12 ne parle plus de Clamp ni de timer « après la panne » quand le carburant n'a pas baissé.

Étape C, choix d'implémentation :
- `Lesson.level` (`core/lessons/levels.ts` : debutant, intermediaire, confirme, avance) ; l'accueil groupe par niveau, tous ouverts. `module` reste le thème affiché à côté du libellé.
- Les leçons sont numérotées par leur place dans le parcours (`core/lessons/index.ts` fixe `number` au chargement) : l'ancienne leçon 5 est maintenant la 7, etc. Les textes ne citent plus de numéro de leçon, mais son titre. La progression est gardée par id, rien n'est perdu.
- D1 (Accessed None) est placé en Confirmé, après « Générateur et lampe » qui enseigne les références (le plan le mettait en Intermédiaire par erreur).
- Nouveaux types d'exercice : `kind: 'complete'` (C1 : graphe à trous marqués par des Comments jaunes, nœuds à placer nommés) et `kind: 'refactor'` (R2 : le projet de départ marche, une contrainte de forme échoue).
- Fichiers : `library/beginner.ts` (Le compteur, Visible caché traversable, C1 La lampe torche), `library/choices.ts` (Le digicode, Les états de la porte, R2 Les feux), `library/inventory.ts` (L'inventaire). `tests/lessonVariantsV2.test.ts` vérifie que le piège de chaque leçon échoue avec son explication.
- La caméra du graphe, quand le graphe ne tient pas à l'écran, part du coin haut gauche (là où sont les événements) au lieu du centre.

Étape D, choix d'implémentation :
- Fichiers : `library/confirmed.ts` (Qui modifie quoi, L'ordre des BeginPlay, D3 La tourelle, D4 Une partie sur deux), `library/timing.ts` (Les vagues, L'ascenseur), `library/advanced.ts` (Fonctions pures et impures, Détruire proprement, C2 La factorielle), `library/controlRoom.ts` (La salle de contrôle, R1 L'afficheur). Aides communes dans `checks.ts` (`countPrints`, `printedNumbers`, `PRESS_E`, `notUsing`, `normText`).
- Scénario : nouvelle étape `{ fps: n }` (images par seconde à partir de là). L'ascenseur est vérifié à 30 images par seconde, pour qu'un déplacement fixe par Tick échoue comme sur un appareil lent.
- L'ordre des BeginPlay et D4 s'appuient sur la double vérification de l'étape A : le projet de départ marche dans l'ordre du niveau et échoue dans l'ordre inverse, avec `ORDER_NOTE`.
- R1 compte les exécutions de Get All Actors Of Class avec `sim.record` (au plus une).
- Écarts au plan, faute de quoi la leçon aurait été fausse ou impossible : « Fonctions pures et impures » se fait sans variables locales (pas encore dans l'appli, BACKLOG) ; « Détruire proprement » porte sur une liste qui garde un acteur détruit, car UE (et le simulateur) arrête déjà les timers et retire les Bind d'un acteur détruit ; « La salle de contrôle » n'utilise pas de tableau (déjà vu dans L'inventaire et Détruire proprement).
- Corrigé au passage : 12 cartes de leçons (exercices et module 3) affichaient « \n\n » au lieu d'un saut de paragraphe ; un test l'empêche désormais.

Étape E, choix d'implémentation :
- Modèle : `BlueprintClass.parentClassId` (optionnel, pas de changement de format) ; `parent` reste la classe native en haut de la chaîne (Actor ou Pawn), tenue à jour par `setParentClass` (`operations/projectOps.ts`), qui refuse les cycles. `removeClass` refuse de supprimer un parent tant qu'un enfant l'utilise.
- `model/inheritance.ts` : `lineage`, `isA`, `rootParent`, `descendants`, `eventKey` et `inheritedView(cls, project, withPrivate)`, la vue fusionnée (composants, variables sauf Private, fonctions non redéfinies, dispatchers, interfaces du parent puis les siens). `contextFor` donne cette vue à tous les nœuds : aucune définition de nœud n'a eu à changer. Le runtime prend la vue avec les variables Private (les graphes du parent tournent sur les acteurs enfants).
- Un enfant n'a pas de racine à lui : ses composants s'attachent à celle du parent (comme dans UE). Revenir à Actor/Pawn lui en recrée une.
- Interpréteur : les événements sont cherchés de la classe vers ses parents ; un événement de même `eventKey` défini plus bas masque celui du parent (redéfinition). `call.parentEvent` (« Parent: BeginPlay ») exécute la version du parent. Fonctions : appel virtuel par nom (la redéfinition de l'enfant gagne, même appelée depuis le graphe du parent) ; `call.function` avec `config.parent` (« Parent: Allumer ») appelle exactement celle du parent.
- Cast To, Get All Actors Of Class, Get Actor Of Class et le sélecteur d'acteur du niveau acceptent les enfants (`isA`). Le diagnostic compte un acteur enfant comme une instance de ses parents.
- Compilation : variable au nom déjà hérité, redéfinition de fonction avec une autre signature, variable Private du parent utilisée par l'enfant.
- Interface : Parent Class liste les Blueprints (sauf soi-même et ses enfants) ; My Blueprint montre les membres hérités (« hérité ») ; appui long sur un événement redéfini › « Ajouter l'appel au parent » ; palette : « Parent: … » dans un enfant.
- Leçon « L'héritage » (Avancé, `library/inheritance.ts`) : BP_Clignotante, enfant de BP_LampeBase, redéfinit BeginPlay ; sans Parent: BeginPlay elle ne s'allume plus.

Toujours au BACKLOG : qualité des solutions (ne pas faire sans sa demande), variables locales, paramètres des fonctions d'interface, Text, Name, Struct, Map, Set, GameMode, GameInstance, Data Tables.

## Méthode de travail

1. Annoncer l'étape, créer une liste de tâches, travailler par petits fichiers.
2. Tests : `npm run lint` (Biome) et `npm test` (vitest, cœur sans DOM). Chaque leçon est testée automatiquement : le projet de départ échoue, la solution de référence réussit ; pour un « Prédis », la bonne réponse est vérifiée par la simulation. Ajouter des variantes de mauvaises réponses dans `tests/lessonVariants.test.ts`.
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
