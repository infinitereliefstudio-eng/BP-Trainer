# Reprise du projet

Ce fichier suffit pour reprendre le travail sans l'historique des conversations. **Commencer par « Reprise rapide » ci-dessous** : c'est l'état réel au 2026-11-18. Les sections suivantes (« État », V2 à V7.x) sont l'historique, gardé pour les décisions qu'il explique ; quand elles contredisent la reprise rapide, c'est la reprise rapide qui fait foi.

À lire ensuite : [PLAN_PARCOURS.md](PLAN_PARCOURS.md) (le plan en cours, lots 3 et 4 détaillés), [ARCHITECTURE.md](ARCHITECTURE.md) (le code), [BACKLOG.md](BACKLOG.md) (noté pour plus tard, à ne pas faire sans demande). Les anciens plans ([PLAN_V3.md](PLAN_V3.md), [PLAN_V2.md](PLAN_V2.md), [PLAN_V1.md](PLAN_V1.md)) sont terminés.

## Reprise rapide (2026-11-18, après la V7.14)

### Où on en est

- **Version en ligne : 7.14.0**, commit `17cd9bd` sur `main`, déployée (GitHub Pages → l'APK de Tristan se met à jour seule) et publiée sur la page de test.
- **Plan en cours : « Plan du parcours »** ([PLAN_PARCOURS.md](PLAN_PARCOURS.md), copie du Claude Doc https://claude.ai/artifact/3raFiT4Sfcj627iPZR56iK, validé par Tristan le 2026-11-18). Cinq lots, un à la fois, avec son feu vert entre chaque :
  - lot 0 (le cadre) : fait, V7.10 ;
  - lot 1 (réflexes UE5, Enhanced Input partout après la leçon Player Controller) : fait, V7.11 et V7.12 ;
  - lot 2 (Débutant et Intermédiaire) : fait, V7.13 (2a, Débutant) et V7.14 (2b, Intermédiaire) ;
  - **lot 3 (Confirmé) : à faire, prochain**, seulement quand Tristan le demande ;
  - lot 4 (Avancé et Expert) : à faire ensuite.
- **En attente de Tristan** : sa validation de la V7.14 sur son téléphone (il a lancé 2b par « tu peux passer à la suite » sans retour sur 2a ; aucune version depuis V7.8 n'a de retour explicite). Points à lui faire tester : « La porte sur son gond » (Scene, Attach Parent, Viewport), le Transfert T2 (déclencheur Hold dans IMC_Joueur), les synthèses S1 et S2 sans aide, « Construis ta lampe ».
- **Ne rien commencer du lot 3 sans son feu vert explicite** (règle du CLAUDE.md : une étape à la fois).

### Le parcours aujourd'hui

103 étapes : Débutant 15 (fin : synthèse S1), Intermédiaire 32 (fin : A1 puis synthèse S2), Confirmé 32, Avancé 24, Expert 0 (le niveau existe, vide jusqu'au lot 4). 133 questions de révision. L'ordre est dans `src/core/lessons/index.ts` (`LESSONS`) ; les numéros de leçon sont calculés (seules les leçons `build` hors transfert/autonomie en ont), les exercices ont un code (P, D, C, R, T, A, S).

Cadre posé au lot 0 et à respecter dans toute nouvelle étape :
- **Aide par niveau** (`core/lessons/helpPolicy.ts`) : ouverte en Débutant et Intermédiaire ; à partir du Confirmé, indice après un premier essai, pas de liste des nœuds, solution après réussite (ou 3 vérifications ratées en Confirmé) ; Expert sans indice. Un Prédis garde tout ouvert ; transfert : tout après un essai ; autonomie et synthèse : pas de liste des nœuds. Concrètement, `hints[0]` = piste, `hints[1]` = liste des nœuds, `hints[2]` = solution.
- **Échelle par notion** (`Lesson.chain` : discover, guided, modify, transfer, autonomy ; `LADDER`) ; l'autonomie est différée (`chain.after`).
- **Rappels** (`Lesson.recalls`) : notions anciennes que la solution de référence réécrit vraiment (vérifié par `tests/spacing.test.ts`).
- **Espacement** : cible 15 étapes ; `KNOWN_GAPS` dans `tests/spacing.test.ts` est un cliquet. Le test dit la valeur exacte à mettre quand un écart baisse. En V7.14, six écarts ont dû **monter** (commentés `V7.14` dans le fichier : timers 44, enum 50, switch 50, maps 43, player-controller 66, timeline 60) : à faire redescendre au lot 3 par des rappels dans les étapes Confirmé (index 47 à 78 environ).
- **Synthèse** (`kind: 'synthesis'`, `library/synthesis.ts`) : cahier des charges en fin de niveau, conseillé (Home.tsx le propose avant le niveau suivant), jamais bloquant ; elle n'enseigne rien (`teaches: []`) et peut durer 45 min.
- **Projets UE5 après « Les contrôles au Player Controller »** (`l-ei-controleur`) : plus aucun événement de touche. Une leçon écrite avec la touche E passe par `UE5_INPUT` dans `index.ts` (`asEnhancedInput`, `core/lessons/ue5Input.ts`) ; une leçon native appelle `ensurePlayerInput(p, ['E'], { E: 'IA_…' })` dans son setup (exemple : `library/chest.ts`). `tests/ue5Input.test.ts` le vérifie.

### Ce qui reste à faire

Détail et contenu des lots dans [PLAN_PARCOURS.md](PLAN_PARCOURS.md) (« Ce qui reste »). En résumé :

1. **Lot 3 — Confirmé** : aide réduite (déjà en place par la règle), « Choisis ton outil » (Cast, Dispatcher ou Interface), « Le menu pause », « Qui a éteint la lumière ? » (Find), « Interagir comme dans UE5 » (le joueur reçoit l'action et prévient l'objet visé, au lieu de l'Auto Receive Input des objets), composants et fonctions créés par l'apprenant, rappels (faire redescendre les six écarts montés en V7.14), synthèse S3. Probablement en deux temps, comme le lot 2.
2. **Lot 4 — Avancé et Expert** : cahiers des charges en Avancé, « Le levier universel », projets Expert sur plusieurs séances (dont la suite « jeu narratif » calquée sur Station enterrée, au backlog), entraînement mélangé, synthèse S4.
3. Dettes connues : pas de déclencheur Tap (T2 utilise Hold + Canceled) ; D1 (Accessed None) reste en Confirmé ; le plan voulait que l'apprenant crée ses variables dès l'Intermédiaire, ce n'est fait que dans les nouvelles étapes.

### Ajouter ou modifier une étape : la liste à cocher

Une étape oubliée dans un de ces fichiers fait échouer un test (c'est voulu) :
1. La définition dans `src/core/lessons/library/<thème>.ts` (petits fichiers par thème) : `setup` (le projet doit contenir au moins un Blueprint, sinon `validateProject` le refuse), `scenario`, `checks` (messages qui disent quoi faire), `solve` (solution de référence), `hints` (3), `cards`, `remember` (> 30 caractères, pas de `\n` littéral dans les fiches). Un Prédis passe par `predictLesson` (`library/predicts.ts`) avec `predict.verify`.
2. Sa place dans `LESSONS` (`index.ts`).
3. `LESSON_NOTIONS` (`core/notions/lessonNotions.ts`) : `teaches` non vide (sauf synthèse), `requires` déjà enseigné plus tôt. Nouvelle notion : `core/notions/catalogue.ts`.
4. Chaque libellé de `Lesson.notions` doit exister dans le glossaire (`core/reference/glossaryData.ts`, champ `names`).
5. Une question de révision (`core/review/bank/lessons.ts`, bonne réponse en premier).
6. `recalls` si la solution réécrit une notion ancienne ; relancer `tests/spacing.test.ts` et suivre ses messages.
7. Si la leçon change le projet de départ d'une étape existante : `revision` + 1 (l'appli signale alors la leçon comme changée).
8. Tests à ajuster selon le cas : `tests/lot2.test.ts` (numéros de « La porte verrouillée » et « La porte qui se referme », durées), `tests/reviewV5.test.ts` (`firstSeen`), `tools/e2e/smoke.py` ligne ~255 (nombre d'étapes attendu) et les sélecteurs `has_text` qui pourraient devenir ambigus (`.first`).
9. Les textes qui renvoient à une leçon la nomment par son **titre**, jamais par son numéro (les numéros bougent).

### Livrer une version

Commandes dans « Méthode de travail » plus bas. Récapitulatif :
`npm run lint && npx tsc --noEmit && npm test && npm run build && npx vitest run --config tools/e2e/vitest.config.ts && python3 tools/e2e/smoke.py` (attendre `errors []`), puis version dans `package.json`, une section `V7.x` ici, une ligne dans BACKLOG.md (« Déjà fait »), README.md (nombre d'étapes et de questions), PLAN_PARCOURS.md (état du lot), ARCHITECTURE.md si nouveaux fichiers. Commit sur `main` avec les lignes d'attribution, `git -c push.negotiate=true push origin main`, `gh run watch` (déploiement Pages). Page de test : `python3 tools/make-test-page.py /home/claude/publish/index.html`, puis l'outil Artifact `publish_files` sur le slug `5781960b-ee1f-4517-a493-be206fea22a8` (lien https://claude.ai/artifact/BojAfVYPuqnJcK49BLzdfd) avec la version en cours en `base_version` (la lire avec `get_artifact` ; dernière connue : `1795017603-1b0e`). Résumer à Tristan en français, sans jargon, avec quoi tester.

Tristan teste surtout sur son téléphone (APK) ; depuis le 2026-11-11 il a aussi l'appli de bureau Claude sur Windows (Node, pas de Python). Les sections plus bas qui disent qu'il n'a qu'un téléphone datent d'avant.

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

## État (historique : étapes du plan V1, toutes livrées depuis)

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
| E — Héritage | Livrée le 2026-11-09, validée (« oui ça me convient ») |

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

Toujours au BACKLOG après la V2 : qualité des solutions, variables locales, paramètres des fonctions d'interface, Text, Name, Struct, Map, Set, GameMode, GameInstance, Data Tables. La V3 reprend la plupart de ces points.

## V3 (plan lancé le 2026-11-09)

Tristan a demandé un plan V3 (« prépare moi un plan pour la v3 »), puis l'a lancé (« tu peux lancer ») sans trancher les quatre questions : les propositions du plan sont retenues (Data Tables plus tard, Qualité en dernier, Timeline à points clés, Line Trace depuis l'avant du joueur). Plan : [PLAN_V3.md](PLAN_V3.md), Claude Doc https://claude.ai/artifact/GDZsZN9sGLDfTNSH8TJeuW. Étapes A à E, une validation entre chacune. L'étape E (qualité des solutions) reprend les idées de BACKLOG.md : Tristan l'a acceptée avec le plan.

| Étape | État |
|---|---|
| A — Fonctions | Livrée le 2026-11-09, validée (« tu peux passer à la suite ») |
| B — Données | Livrée le 2026-11-09 (pas de retour explicite ; Tristan a enchaîné le 2026-11-10 avec « carte blanche ») |
| C — Mouvement | **Livrée le 2026-11-10, en attente de validation** |
| D — Interaction | **Livrée le 2026-11-10, en attente de validation** |
| E — Qualité | **Livrée le 2026-11-10, en attente de validation** |

Le 2026-11-10, Tristan a écrit : « Regarde où on en était, analyse l'existant et améliore l'app […] Tu as carte blanche », avec pour but une appli complète, fidèle à UE, un vrai parcours de difficulté croissante, pratique sur téléphone. Les étapes C, D et E ont donc été faites à la suite, sans porte de validation entre elles : c'est une exception demandée par lui, la règle « une étape à la fois » reste la règle par défaut pour la suite.

Étape A, choix d'implémentation :
- Variables locales : `FunctionSignature.locals` (`LocalVariable` : id, nom, type, valeur par défaut), champ optionnel, pas de changement de format. Nœuds `var.getLocal` / `var.setLocal` (réservés aux fonctions, `allowedIn`), trouvés par `findLocal(cls, id)` dans les graphes de la classe. Opérations dans `operations/localOps.ts` ; le nom ne peut pas reprendre une autre locale, un paramètre de la fonction, une variable ou un composant du Blueprint.
- Runtime : `Scope.locals`, remplies aux valeurs par défaut par `callScope(graph)` à chaque appel (récursion comprise). `var.getLocal` est lu par l'interpréteur ; `var.setLocal` passe par `ExecCx.setLocal`. Increment Int et les pins par référence acceptent un Get local.
- Compilation : `localScope` (une locale utilisée hors de sa fonction), `interfaceFunction` (Event d'une fonction d'interface qui a une sortie), avertissement `interfaceName` (Custom Event qui porte le nom d'une fonction d'interface implémentée : le message ne le déclenche pas). Chacun a son « Pourquoi ? ».
- Interfaces : `InterfaceFunction.inputs` / `outputs` (optionnels). Sans sortie, l'implémentation reste un Event (avec les entrées en pins de sortie) ; avec une sortie, c'est un graphe fonction marqué `Graph.iface`, dont `syncInterfaceGraphs` (`operations/interfaceOps.ts`) garde la signature égale à celle de l'interface. Le store l'appelle à chaque fin de transaction (classes concernées) ; les opérations de paramètres d'interface l'appellent pour tout le projet. Un graphe d'implémentation est supprimé quand l'interface, la fonction ou sa dernière sortie disparaît, ou quand la classe ne l'implémente plus.
- Message : ses sorties repartent de leur valeur par défaut à chaque envoi (sinon un acteur qui n'implémente pas l'interface laissait la réponse du précédent) ; il appelle la fonction d'implémentation de la cible (`interfaceImplementation`, la plus proche dans la lignée, une redéfinition de l'enfant gagne) ou ses Events.
- Interface : My Blueprint › Local Variables (fonction ouverte), Interfaces (« · fonction » ouvre le graphe d'implémentation, absent de Functions et de la palette des appels) ; Details de la locale (`LocalDetails.tsx`), de l'interface avec Inputs / Outputs par fonction (`InterfaceDetails.tsx`, séparé de SignatureDetails), d'une implémentation (lecture seule) ; appui long sur un Custom Event › « Convertir en événement d'interface ». Notes Piège sur Get local et sur le Message.
- Leçons : « Le ticket de caisse » (Confirmé, après « Qui modifie quoi » : sous-total en locale, total du ticket en variable du Blueprint ; piège : total en locale → 10, 10, 8, 8), « Prédis P4 — Locale ou pas » (Increment Int sur une locale), « Le terminal » (Avancé, après C2 : Interagir gagne Niveau et Reponse, implémentation en fonction, réponse vide du rocher). Le plan nommait la première « Les locales » ; le titre a changé pour dire la situation. « Fonctions pures et impures » ajoute à Soigner une sortie Soin et une locale Avant (80, 15, 5, 100). Tests : `tests/functionsV3.test.ts`, `tests/lessonVariantsV3.test.ts` ; smoke : captures 24 à 30.

Étape B, choix d'implémentation :
- Types : catégories `text` et `name` ; `PinType.container` vaut `array`, `set` ou `map`, et `PinType.value` est le type des valeurs d'une Map (la clé est le type lui-même). Set et clé de Map limités aux types hachables (`KEY_CATEGORIES` : Integer, String, Name, Enum, références). Valeurs : un Set est un tableau sans doublon, une Map un tableau de paires `[clé, valeur]`.
- Structures : `Project.structs` (format 6, migration qui ajoute `[]`). Un membre a un id, un nom, un type et une valeur par défaut ; une valeur de structure est un objet indexé par id de membre, où un membre absent a sa valeur par défaut (`types/structs.ts` : `memberValue`, `fullStruct`). Le type nomme la structure (`struct:S_Objet`), comme un Enum ; un renommage suit partout (`renameTypeRefs`, qui parcourt aussi les membres et les valeurs de Map). Une structure ne peut pas se contenir ; une structure utilisée ne se supprime pas. Opérations dans `operations/structOps.ts`.
- Nœuds (`nodes/library/structs.ts`) : Make, Break, Set Members in (les membres changés sont ceux cochés dans Details, `config.fields`, comme les pins qu'on affiche dans UE). Set Members travaille sur une copie puis l'écrit par sa pin en losange ; relié à une copie (Get (a copy), Array Element de For Each), seule la copie change, sans erreur, comme dans UE : le compilateur ne l'exige donc pas relié à une variable. Nouveau nœud Get (a ref) : l'interpréteur écrit l'élément du tableau à travers lui (`writeRef`).
- Set et Map (`nodes/library/containers.ts`, comportements dans `runtime/behaviors/data.ts`) : pins génériques ; une pin Map a deux groupes (`wildGroup` pour la clé, `valueGroup` pour les valeurs), adoptés ensemble quand on relie une Map typée (`adoptMap`). Les clés String et Name ignorent la casse, comme le hachage d'UE ; les fonctions de tableau (Contains, Find, Remove Item, Add Unique) aussi (`behaviors/equality.ts`). Find sur une clé absente : Return Value faux, Value à sa valeur par défaut, sans erreur.
- Text et Name : conversions automatiques (String ↔ Text, Integer / Float / Boolean / Name → Text, String ↔ Name), Format Text (une pin par `{Nom}` du texte tapé dans Format), Equal (Text) sensible à la casse, Equal (Name) qui l'ignore, Is None (Name). Set Text reste en String (écart noté).
- Interface : sélecteur de type avec le conteneur (Single, Array, Set, Map) et, pour une Map, le type des valeurs ; éditeur des valeurs par défaut des tableaux, Sets, Maps (paires) et structures (un champ par membre) ; Content Browser › + Structure, `StructDetails.tsx` ; Details de Set Members (membres à changer). Pins Set et Map dessinées en accolades. Notes Piège : Find (Map), To Array (Set), Set Members, Equal (Text) ; Dans UE : Format Text.
- Leçons : « Les codes des portes » (Intermédiaire, après L'inventaire : Find sans tester Return Value ouvre la Cave), « La fiche de l'objet » (Confirmé : ajouter le membre Charge, Set Members in ; piège : un Make qui ne relie que Charge vide le Nom), « Débogue D5 — Le chargeur qui ne charge pas » (Set Members sur Array Element), « Les badges » (Confirmé : passer Badges d'Array à Set of Name ; le second badge « rouge » ne compte plus). Le plan nommait la première « Le trousseau » ; elle porte sur une Map de codes. Plus de « Le trousseau » distinct. Tests : `tests/dataV3.test.ts`, suite de `tests/lessonVariantsV3.test.ts` ; smoke : captures 31 à 37. 43 leçons et exercices.

Étape C, choix d'implémentation :
- Timeline : le nœud `timeline.node` porte tout le timeline dans ses réglages (`config` : nom, durée, Loop, Auto Play, pistes Float avec leurs points clés), lu et écrit par `nodes/library/timeline.ts` (`readTimeline`, `timelineConfig`). Dupliquer ou supprimer le nœud copie ou supprime le timeline, comme dans UE ; une copie reçoit un nom libre et garde les identifiants de ses pistes (ses fils restent valides). Pins : Play, Play from Start, Stop, Reverse, Reverse from End, Set New Time ; Update, Finished, Direction, une sortie Float par piste. Interdit dans une fonction et dans le Construction Script.
- Exécution : un état par nœud et par acteur (`ActorRT.timelines`), avancé une fois par image après les actions latentes (`Interpreter.tickTimelines`, `runtime/timelines.ts`), calqué sur `FTimeline::TickTimeline` : Update à chaque image, Finished en bout de course dans les deux sens. Play depuis la fin ne déplace rien mais ressort une fois Update et Finished (comme UE) ; la note `timeline.atEnd` l'explique dans « Pourquoi ce nœud ne s'est pas exécuté ? ». Entre deux points clés la valeur varie en ligne droite (écart noté dans « Dans UE » : pas de point arrondi, pas de piste Vector, Color ou Event).
- Éditeur de piste (`ui/overlays/TimelineEditor.tsx`) : double toucher le nœud, ou Details › « Éditer la piste ». Toucher la courbe ajoute un point clé, un doigt le déplace (l'échelle reste figée pendant le geste), champs Time et Value pour la précision ; pistes ajoutées, renommées, supprimées. Opérations dans `operations/timelineOps.ts`.
- Interpolation : Lerp, Lerp (Vector), Map Range Clamped / Unclamped, FInterp To, FInterp To Constant, VInterp To, Normalize, Get World Delta Seconds (`WorldApi.deltaSeconds`).
- Construction Script : un graphe de type `construction` par classe (`GraphKind`), créé à sa première ouverture (`operations/constructionOps.ts`), avec le nœud d'entrée `cs.entry`. Il s'exécute dans le constructeur de `Simulation`, avant tout BeginPlay : comme l'aperçu du niveau dans l'éditeur est une `Simulation` non démarrée, le niveau montre son résultat sans Play et le relance à chaque changement du modèle. Spawn Actor l'exécute après les valeurs Expose on Spawn et avant BeginPlay. Avec un parent : script du parent, puis de l'enfant. Il ne tourne plus pendant la partie. `CheckContext.preview()` donne aux leçons le niveau tel que l'éditeur le montre.
- Flèches de références : dans le niveau (hors Play), une flèche relie un acteur à ceux que ses variables Instance Editable désignent ; le nom de la variable s'affiche pour l'acteur sélectionné.
- Format 7 : rien à convertir, le numéro empêche seulement une version plus ancienne d'ouvrir des nœuds qu'elle ne connaît pas.
- Leçons : « La porte qui glisse » (Intermédiaire : Play / Reverse ; pièges testés : Play à la sortie, Play from Start à l'entrée), « Complète C3 — Le projecteur » (Timeline à trous), « La rangée de lampes » (Confirmé : Construction Script ; fait au BeginPlay, c'est bon en jeu mais pas dans l'éditeur), « Prédis P5 — Avant ou après ? » (ordre Construction, BeginPlay, Tick, Finished ; ajoutée, hors plan).

Étape D, choix d'implémentation :
- Line Trace By Channel (`nodes/library/trace.ts`, `runtime/trace.ts`, `raycast` dans `runtime/physics.ts`) : rayon dans le plan, Out Hit éclaté (Hit Actor, Hit Component, Location, Normal, Distance), Actors to Ignore, Ignore Self coché par défaut comme dans UE. Ce qui bloque suit les presets d'UE : un Static Mesh qui bloque arrête Visibility et Camera, une Box Collision aucun des deux, la capsule du joueur ignore Visibility et bloque Camera (preset Pawn) ; être caché ne change rien. Un rayon qui part de l'intérieur d'une forme la touche à la distance 0. Draw Debug Type : None, For One Frame, For Duration (5 s), Persistent ; `Simulation.debugLines`, dessinées en Play (rouge jusqu'au point touché, vert après).
- Event Hit : quand le joueur bute contre un Static Mesh qui bloque, l'acteur du mesh et le joueur (s'il est un Blueprint) reçoivent Event Hit à chaque image du contact (`movement.ts` renvoie les contacts, `Simulation.fireHit`). Hit Normal suit `ReceiveHit` d'UE : la normale de la surface pour celui qui s'est déplacé, son opposé pour l'autre (le sens de la poussée). Seul le joueur balaie le décor : pas de Sweep sur Set Actor Location / Add Actor World Offset (dans UE il ne balaie que le composant racine, ici une Scene sans collision ; noté au BACKLOG).
- Scénarios : nouvelle étape `{ look: yaw }` (oriente le joueur).
- Leçons : « Regarder et interagir » (Avancé : E → Line Trace 300 cm devant → message d'interface ; piège testé : End donné comme une direction), « Débogue D6 — La tourelle aveugle » (Ignore Self décoché : le rayon touche la tourelle elle-même ; ajoutée, hors plan), « Refactor R3 — Le bon bouton » (overlap et Cast remplacés par Line Trace et interface), « La caisse qu'on pousse » (Event Hit à chaque image : Do Once rouvert par un Retriggerable Delay, vitesse par Get World Delta Seconds, vérifiée à 30 images par seconde).

Étape E, choix d'implémentation :
- Notion visée : `Check.notion` (aide `notion(...)` de `lessons/checks.ts`). Une leçon est réussie quand le comportement est bon ; la notion (Branch, Do Once, Cast, pas de Tick, Timeline, Line Trace…) est affichée à part, cochée ou non, sans bloquer. Les contraintes des exercices Refactor et de « Qui modifie quoi » restent bloquantes : elles sont l'exercice.
- Robustesse : `Lesson.robustness` (`RobustnessCase` : situation, modification du projet, scénario, vérifications, conseil), jouée après la réussite par `runRobustness`, dans les deux ordres d'acteurs. Résultat : « Marche aussi si… » ou « Ne marche pas si… », avec la raison et le conseil. Dix leçons en ont une. Celle de « Le générateur prévient » échoue avec la solution de référence elle-même (Bind sans Is Valid sur une lampe sans générateur) : le retour le dit, et un test vérifie que la version avec Is Valid tient.
- Conseils de construction : `core/quality/advice.ts`, des règles sur la forme des graphes, filtrées par niveau : Tick qui surveille, Delay sur Tick, recherche d'acteurs sur Tick, mouvement sur Tick sans Delta Seconds, overlap sans regarder Other Actor, chaîne de trois nœuds copiée. `quality/lessonAdvice.ts` retire ce que le projet de départ de la leçon déclenche déjà. Affichés après la réussite, et à la demande par le menu ⋮ › Conseils de construction (tout le projet).
- Une autre façon de faire : `Lesson.alternatives` (titre, ce qu'elle gagne, ce qu'elle perd, construction sur le projet de départ). Chacune passe les vérifications de sa leçon (testé). « Ouvrir ce graphe » l'ouvre dans un projet d'essai (`WorkspaceRef` de type `alternative`, jamais enregistré, bandeau « Revenir à ma solution »). Sept alternatives sur cinq leçons.
- Le contenu des leçons écrites avant la V3 est dans `lessons/library/quality.ts`, rattaché par identifiant dans `lessons/index.ts` ; les leçons de la V3 portent le leur.

Parcours et accueil (2026-11-10, hors plan, dans la carte blanche) :
- 51 leçons et exercices (le plan en visait 49 ; P5 et D6 en plus).
- Accueil : barre de progression, compte par niveau, prochaine étape mise en avant (« À suivre »), et un onglet Carnet : la phrase « À retenir » de chaque étape réussie, les notions de toutes, avec une recherche (« timeline », « cast »…).
- Aide et gestes (menu ⋮) remise à jour.
- Retours haptiques (`editor/haptics.ts`, Vibration API) : appui long, fil relié ou refusé, nœud ajouté, touches de Play, point clé d'un Timeline, breakpoint atteint, leçon réussie ou non. Menu ⋮ › Vibrations pour les couper (choix gardé dans le navigateur).
- La page de test claude.ai n'a pas été republiée le 2026-11-10 : l'APK installée charge le site GitHub Pages, mis à jour par le push sur `main`. Elle reste utile pour montrer une étape avant de la pousser.

## V4 (2026-11-11, carte blanche)

Tristan a écrit le 2026-11-11, depuis l'appli de bureau Claude sur Windows (il a donc maintenant un ordinateur, en plus du téléphone) : « Tu as carte blanche pour améliorer cette application que ce soit l'interface, la pédagogie, les leçons, les fonctionnalités ou tout ce qui pourrait permettre d'avoir une application complète d'apprentissage des blueprints unreal engine et ce qui va autour ». Fait d'un bloc, **en attente de sa validation** ; la règle « une étape à la fois » reste la règle par défaut.

Choix : prendre le haut de BACKLOG.md (« Par où commencer ») et ce qui répond à « ce qui va autour ».

- **Révision espacée** (`core/review/`) : une question à choix par leçon et par fiche de mémo (`bank/lessons.ts`, `bank/memo.ts` ; la première option est la bonne, l'affichage mélange). `schedule.ts` : boîtes de Leitner (1, 3, 7, 16, 35, 90 jours), une question se débloque quand sa leçon est réussie ou sa fiche lue, elle est due un jour après la leçon (tout de suite pour les leçons réussies avant la V4, qui n'ont pas de date). Une réponse fausse la ramène au lendemain et la repose en fin de séance. Onglet Révision de l'accueil (`ui/home/Review.tsx`), compteur sur l'onglet, bandeau dans le parcours. Séances de 8 questions ; « S'entraîner quand même » ne touche pas au calendrier.
- **Mémo UE** (`core/reference/memo.ts`, `ui/home/Memo.tsx`) : 22 fiches sur ce que le simulateur n'exécute pas (sortes de Blueprints, cycle de vie, fonction / macro / événement, composants, Gameplay Framework, Enhanced Input, UMG, niveaux et sauvegarde, choisir comment communiquer, obtenir une référence, références dures et souples, Data Tables, conteneurs, String / Name / Text, collisions, Tick / Timer / Timeline / Delay, briques d'un jeu narratif, performance, nommage, déboguer dans UE, raccourcis, autres éditeurs à nœuds). Chaque fiche renvoie aux leçons qui la pratiquent. `RichText` rend maintenant les blocs de lignes « - » en liste.
- **Index des nœuds** (`core/reference/nodeIndex.ts`, `ui/home/NodeIndex.tsx`) : tous les nœuds hors de la palette, avec description, Piège, Dans UE et les leçons dont le projet de départ ou la solution l'utilise (calculé à la première ouverture). Filtre « Avec un piège ».
- **Objectifs visibles** (`ui/lesson/GoalStrip.tsx`) : une bande sous la barre d'outils, en leçon, hors Play et hors Prédis : l'objectif en vue (toucher pour passer au suivant), Vérifier, et le résultat de la dernière vérification (toucher pour ouvrir la fiche sur Objectifs). Repliable (choix gardé dans le navigateur). La vérification vit maintenant dans `App.tsx` (`verify`, `LessonCheck`) et la fiche la reçoit.
- **Solution ouvrable** : après le troisième indice, « Ouvrir la solution dans l'éditeur » ouvre `setup()` + `solve()` dans un projet d'essai (`WorkspaceRef` de type `solution`, jamais enregistré, bandeau « Revenir à mon travail »), sur le Blueprint que la solution a le plus modifié.
- **Sauvegarde complète** (`storage/backup.ts`, `ui/home/BackupDialog.tsx`) : accueil › « Sauvegarde · v4.0.0 » : tout exporter (progression, révision, tous les projets) dans un fichier, restaurer. L'export passe par le partage Android quand il existe (téléphone), sinon par un téléchargement. À confirmer dans l'APK.
- **Progression** (`ui/workspace.ts`) : `doneAt`, `review`, `read`, `days` (champs optionnels, les anciennes progressions restent lisibles). Jours d'affilée sur l'accueil. `Root.tsx` applique les changements à la dernière progression (`changeProgress`), pour que deux changements de suite ne s'écrasent pas.
- **Accueil** : cinq onglets (Parcours, Révision, Carnet, Nœuds, Mémo UE), bouton « Reprendre » quand la dernière leçon ouverte n'est pas celle que « Continuer » propose.
- **Petites choses** : écran allumé pendant Play (Wake Lock), nœuds récents en tête de la palette (`ui/overlays/recentNodes.ts`), numéro de version et date de construction (`src/version.ts`, `define` de `vite.config.ts`, version 4.0.0 dans `package.json`) dans Sauvegarde et dans Aide et gestes.
- **Trois Prédis** (`lessons/library/predicts.ts`) : P6 « Sept divisé par deux » (Débutant, division entière), P7 « Le Gate » (Intermédiaire), P8 « Deux tableaux, ou un seul ? » (Confirmé, Set copie un tableau). 54 leçons et exercices.
- Tests : `tests/review.test.ts` (banque de questions, calendrier, mémo, index), `tests/backup.test.ts`. Le smoke test a une suite (captures 53 à 57) **écrite sans pouvoir être lancée** (pas de Python sur la machine de Tristan) : la CI la jouera au premier push ; si elle échoue, le déploiement est bloqué et l'APK garde l'ancienne version.

Remarqué alors : le Gate avait Start Closed décoché par défaut, alors que la macro d'UE le coche. Corrigé en V6.2.

Reste du haut du backlog : regard du joueur indépendant du déplacement, leçon de synthèse de la V3, plusieurs projets en Simulation libre, sons, Data Tables.

## V5 (2026-11-12)

Demande de Tristan : de nouvelles leçons (autres sujets ou variations), une meilleure explication des notions à connaître, et un moyen pour l’appli de dire s’il y a mieux que la solution trouvée (nombre de nœuds, nœuds mal choisis pour le contexte…). Fait d’un bloc, **en attente de sa validation**.

- **Bilan de la solution** (`core/quality/review.ts`, affiché après la réussite à la place de « Pour aller plus loin ») : une note sur trois étoiles et ses points (notion visée, robustesse, taille, nœuds déconseillés, conseils), jamais bloquante. `sizeReport` compte les nœuds (hors Comment et Reroute) et compare à la solution connue la plus proche (référence ou alternative) : compact, proche, lourd (plus de 25 % ou de 2 nœuds en trop), avec ce qu’il y a en plus par titre de nœud et un bouton vers la solution de référence. Les tailles affichées retirent les nœuds du projet de départ quand la solution ne fait qu’en ajouter. La bande des objectifs montre les étoiles.
- **Nœuds déconseillés par leçon** : `Lesson.avoid` (`Avoid` : nœuds, Blueprint, libellé, pourquoi et quoi à la place), dans `lessons/library/avoid.ts` pour les leçons existantes (21 leçons : Tick qui surveille, recherche d’acteurs, Delay pour répéter, Cast dans « Regarder et interagir »…). Seuls les nœuds ajoutés par l’élève comptent. Testé : aucune solution connue n’en utilise.
- **Six règles de conseil de plus** (`core/quality/hygiene.ts`, helpers communs dans `graphView.ts`) : nœud jamais exécuté, nœud pur que personne ne lit, Boolean comparé à une case, Sequence à une sortie, variable écrite jamais lue (ignorée si la leçon fournit la variable), Custom Event jamais appelé, Cast sur Tick. Deux solutions de référence laissaient un nœud orphelin (R1, Le terminal) : corrigées.
- **Notions à connaître** : dans l’onglet Comprendre, chaque notion est une puce ; la toucher ouvre sa fiche (ce que c’est, quand s’en servir, piège, schéma type, leçon où elle a été vue ; « nouveau » sinon). `core/reference/glossaryData.ts` (39 fiches d’idées) et `glossary.ts` (à défaut, la description et le Piège du nœud du même nom). Testé : toute notion d’une leçon a une fiche.
- **Huit leçons et exercices** (62 au total) : « La jauge d’énergie » (Débutant, Clamp ; alternative Min / Max), « Prédis P9 — Le Set oublié », « Débogue D7 — La lampe qui ne s’éteint plus » (premier Débogue du niveau Débutant), « Débogue D8 — La porte d’un seul passage » (DoOnce sans Reset), « Le ventilateur » (Intermédiaire, modulo, variation de l’interrupteur à touche), « Prédis P10 — Sortir d’une boucle », « Débogue D9 — Le compte à rebours sans fin » (timer jamais arrêté ; un DoOnce qui masque échoue), « La clôture » (Confirmé, For Loop et Spawn ; cinq Spawn copiés passent puis échouent au « Et si Nombre vaut 8 »). Fichiers `library/gauges.ts`, `fence.ts`, `debugs.ts`, `predicts2.ts`. Neuf questions de révision. Tests : `tests/reviewV5.test.ts`.
- Écarté : « Bind fait deux fois » du backlog, car dans UE Bind Event n’ajoute pas deux fois le même événement (AddUnique) : le bug ne serait pas réaliste.
- Version 5.0.0. `smoke.py` attend 62 étapes ; il n’a pas pu être lancé en local (pas de Python) : la CI le jouera au push. Vérifié à la main dans le navigateur à 800×400 : fiche de notion, bilan avec une solution alourdie.
- Le dépôt cloné sous Windows avait `core.autocrlf=true` : le passer à `false` (les fichiers sont en LF, Biome et les scripts s’y attendent).

Pistes non faites : garder les étoiles dans la progression et les montrer sur l’accueil ; « Montre-moi » après un échec ; listes `avoid` et robustesse pour les leçons restantes.

## V6 (2026-11-16) : le recueil d’exercices

Tristan a fourni un recueil de 44 exercices écrits pour le vrai UE5 (`Recueil_exercices_Blueprints_UE5.md`, E01 à E44, sans corrigés) et demandé : trier ceux qui valent d’être ajoutés, vérifier ce qu’il faut dans l’appli, puis « commence par faire les modifications nécessaires pour intégrer les exercices qui en ont besoin et intègre l’ensemble des exercices retenus », avec de bonnes explications pour chaque leçon (nœuds, objectif, moyens), jugées trop légères sur certaines leçons existantes.

Tri : 13 faisables tels quels, 3 de plus grâce à de petites évolutions (faites), 11 qui demandent un chantier (non faits, voir plus bas), 9 doublons de leçons existantes, 8 hors de ce que l’appli simule (physique, matériaux, IA, performance, packaging, animation, chargement asynchrone).

Évolutions de l’appli :

- Nœuds : **Dot Product**, **Get Reflection Vector**, **Snap To Grid (Float)** (le titre exact d’UE ; le recueil disait « Grid Snap »), **For Each Loop with Break**.
- **Random Stream** : structure du moteur, variable avec Initial Seed dans Details, nœuds Make Random Stream, Random Integer / Float in Range from Stream, Set Random Stream Seed, Reset Random Stream. Générateur de `FRandomStream` (pas congruentiel 32 bits) ; les nombres ne sont pas garantis identiques à ceux d’UE, la reproductibilité l’est. Un tirage relié directement à Make Random Stream redonne toujours le premier nombre, comme dans UE.
- **Transform** : structure du moteur, nœuds Get Actor Transform, Make / Break Transform, Transform Location, Inverse Transform Location (vue de dessus : seul Yaw tourne).
- Une variable Instance Editable de type tableau de références peut désigner des acteurs du niveau (`actorFactory.instanceValue`) ; le niveau dessinait déjà les flèches. Pas encore d’éditeur dans Details pour remplir un tel tableau à la main : les leçons le préremplissent.

Seize leçons et exercices (78 au total), chacun avec quatre ou cinq cartes : ce qui est en place, ce que fait chaque nœud et ses pins, le plan, le piège, et le lien avec UE.

| Recueil | Dans l’appli | Niveau | Fichier |
|---|---|---|---|
| E04 | Débogue D10 — Le compteur qui ment | Débutant | `counterLie.ts` |
| E09 | Débogue D11 — Le four qui oublie son annulation | Confirmé | `oven.ts` |
| E25 | Débogue D12 — La régie et ses panneaux (premier Unbind) | Confirmé | `stage.ts` |
| E22 | Ajouter un objectif sans tout casser | Confirmé | `objective.ts` |
| E36 | Les cartes tirées sans remise, puis La même donne (Random Stream) | Confirmé | `cards.ts` |
| E26 | Le standard téléphonique (registre en Map) | Avancé | `switchboard.ts` |
| E37 | Débogue D13 — Les vagues qui se terminent trop tôt | Avancé | `waveEnd.ts` |
| E42 | Le réseau en boucle (parcours avec Set) | Avancé | `powerGrid.ts` |
| E43 | L’interrogatoire (dialogue par les données, Map au lieu d’une Data Table) | Avancé | `interrogation.ts` |
| E13 | Complète C5 — Le sac de randonnée | Avancé | `backpack.ts` |
| E20 | Débogue D14 — L’atelier de fabrication (transaction) | Avancé | `workshop.ts` |
| E41 | Complète C6 — Annuler et refaire | Avancé | `undo.ts` |
| E07 | Complète C4 — La bonne cible dans le viseur | Avancé | `crosshair.ts` |
| E34 | Le rayon et les miroirs | Avancé | `mirrors.ts` |
| E29 | Débogue D15 — Les meubles sur une grille tournée | Avancé | `gridFloor.ts` |

Adaptations par rapport au recueil, à connaître : les widgets sont remplacés par des Text Render ou des Print String ; E20 est simplifié en Map de quantités (la « place libérée » est le défi) ; E41 garde une position (Vector) au lieu d’un Transform, sans la limite de 10 actions (défi) ; E37 passe par un dispatcher de la cible, l’appli n’ayant pas le dispatcher natif OnDestroyed ; E25 remplace les fenêtres par des panneaux (spectacle déjà en cours au lancement, panneau qui change de régie).

Tests : `tests/v6.test.ts` (les nouveaux nœuds, et pour sept leçons la mauvaise réponse tentante, qui doit échouer avec l’explication de la leçon : Random lu deux fois, Make Random Stream à chaque tirage, segment qui repart de la surface du miroir, Add sans Contains, pas d’Unbind, parcours sans Set, second appui qui relance le timer). 17 questions de révision et 12 fiches de notions en plus. `smoke.py` attend 78 étapes et a une suite V6 (captures 58 à 63), lancée ici avec « errors [] ».

Non fait, chacun de la taille d’une version : Enhanced Input (E30), Save Game (E15, E24 : faits en V7), Data Tables (E16, variante d’E43 : faits en V7), Actor Components (E14), plusieurs niveaux et GameInstance (E40), widgets UMG (E10, E27, E38), Attach / Detach (E32), caméras (E31), Spline et instances de mesh (E28, E44). Idées tirées des doublons, non faites : un « Et si… » à deux couples sur « Le générateur prévient », une porte tournée sur « La porte qui glisse », un écart nul ou négatif sur « La clôture ».

Vérification d’une leçon : après un « Infinite loop detected », `runner.playScenario` ne joue plus la suite du scénario (les points de contrôle restent évalués). Sans cela, chaque événement suivant repartait pour 100 000 nœuds : plusieurs secondes de gel sur téléphone pour « Le réseau en boucle », et un test trop lent pour la CI (le premier push de la V6 a échoué là-dessus, sans rien publier).

Version 6.0.0. Travail fait dans une session Claude en ligne, sur la branche `exercices-recueil` (demande de fusion n° 1), puis poussé sur `main` le 2026-11-16 avec l’accord de Tristan.

## V6.1 (2026-11-17) : les fiches « Comprendre » des anciennes leçons

Tristan a validé la longueur des fiches de la V6 (« c’est mieux avec les nouvelles fiches ») et demandé de faire la même chose pour les fiches d’avant. Les 62 leçons et exercices antérieurs à la V6 ont été réécrits : environ 700 caractères en moyenne avant, 1 300 à 2 700 maintenant, 3 à 6 cartes par leçon.

- Modèle suivi (celui de la V6) : **Ce qui est en place** (le projet de départ, ce que le test va faire), **les nœuds et leurs pins**, **le plan** (l’ordre sur le fil blanc), **le piège** (la mauvaise réponse tentante, celle que la vérification reconnaît), et souvent **Dans UE** (ce qui diffère ou ce qu’on fait dans un vrai projet).
- **Prédis** : les cartes décrivent le graphe et le rôle de chaque nœud, et posent les questions à se poser, **sans donner la réponse**. Une carte commune `PREDICT_METHOD` (`library/kit.ts`) les termine.
- **Débogue** : tous ouvrent par la carte commune `DEBUG_METHOD` (la constante locale `METHOD` de `debugs.ts` a disparu), puis décrivent ce qui est en place, la notion en cause et où regarder, sans écrire la correction.
- Seuls les `cards` ont changé : objectifs, indices, scénarios et vérifications sont les mêmes.
- Les textes ont été relus contre le code : noms de pins et de nœuds tels que l’appli les affiche (SpawnActor, Utilities › Map, Promouvoir en variable…), couleurs de pins tirées de `editor/theme.ts`, Content Browser ouvert par le nom du Blueprint dans la barre d’outils.
- `RichText` ne fait une liste que d’un bloc dont **toutes** les lignes commencent par « - » ou « 1. » : une phrase d’introduction doit être séparée de sa liste par une ligne vide.

Remarqué : `Physics Only` bloquait le joueur et `Query Only` non. Corrigé en V6.2.

Version 6.1.0.

## V6.2 (2026-11-17) : fidélité à UE

Demande de Tristan : corriger l’écart Query Only / Physics Only, « et en profiter pour faire d’autres vérifications de ce type ». Les points douteux ont été vérifiés sur la documentation d’UE ou ses forums avant d’être changés ; chaque correction a son test dans `tests/fidelity.test.ts`.

Corrigé :

- **Collision Enabled** : le déplacement d’un pion est un balayage (une requête). Un Static Mesh qui bloque arrête le joueur avec **Query Only** ou **Query and Physics** ; **Physics Only** le laisse passer (il ne sert qu’aux corps simulés, absents ici). `collisionBlocks` vaut maintenant `collisionQueries` (`types/enums.ts`) ; description de Set Collision Enabled, aide de Details, explication d’Event Hit et fiche « Visible, caché, traversable » mises à jour.
- **Destroy Actor** : dans UE l’acteur ne disparaît qu’en fin d’image, la suite du fil en cours s’exécute donc encore (note d’Epic sur UE-10329). L’interpréteur compte les chaînes d’exécution (`Interpreter.run`) ; `ActorRT.destroyedInRun` garde celle de la destruction, et seules les frames des chaînes suivantes (Delay, timers, événements) sont abandonnées. Is Valid le dit invalide tout de suite, comme avant.
- **Gate** : Start Closed coché par défaut, comme la macro d’UE. Les graphes enregistrés qui n’avaient pas touché la case passent donc à « fermé » (les valeurs par défaut ne sont pas copiées dans les nœuds).
- **Float affiché** (To String (Float), donc Print String) : `FString::SanitizeFloat`, soit 1.5, 3.0, 0.333333 au lieu de 1.500000 (`sanitizeFloat` dans `behaviors/pure.ts`). Vector (`X=1.000 …`) et Rotator (`P=0.000000 …`) gardent leur format, qui était déjà celui d’UE.
- **Nearly Equal (Float)** : tolérance par défaut 1e-6 (UE 5) au lieu de 1e-4, et comparaison stricte (|A − B| < tolérance).
- **Clamp** avec Min > Max (`FMath::Clamp` : Min sous Min, sinon Max), **Random Integer in Range** avec Max < Min (rend Min), **String to Float** sur « 3,5 » (rend 3, comme `Atof`).
- L’avertissement « relié à aucun fil d’exécution » dit maintenant que c’est une aide de l’appli : UE ne le signale pas. Textes de P9 et du compteur alignés.

Vérifié et déjà fidèle : overlaps (un seul Begin/End par acteur), Cast sur None, boucles (For Loop vide, Index après la boucle), débordement des Integer, division et modulo par zéro, arrondis, égalité des String (casse ignorée) et des Text, Delay / Retriggerable Delay, timers (remplacement, Time ≤ 0, Handle), Switch on String, Line Trace et le pion (Visibility ignorée, Camera bloquée), fonctions de tableau hors limites.

Non changé, à savoir :
- Map et Set : après un Remove, UE réutilise la place libérée pour l’ajout suivant, l’ordre de Keys ou To Array peut donc différer de celui de l’appli. UE ne garantit aucun ordre ; ne pas écrire de leçon qui en dépende.
- To Text (Integer / Float) : UE groupe les milliers selon la langue (« 1,234 » ou « 1 234 ») ; l’appli ne le fait pas.
- Un Static Mesh ne déclenche jamais d’overlap dans l’appli (seules les Box Collision et le joueur), simplification assumée.

Version 6.2.0.

## V7 (2026-11-17) : Data Tables et Save Game

Demande de Tristan, après la revue du backlog : « oui ok pour data table et save game, + implémentation des exercices et corrige le backlog ». Format de projet 8 (migration : `dataTables: []`).

**Data Tables**
- Modèle : `Project.dataTables` (`DataTable { id, name, struct, rows: { name, value }[] }`), la structure désignée par son nom. Opérations dans `operations/dataTableOps.ts` (Row Names uniques sans tenir compte de la casse, table en usage non supprimable, changer la Row Structure remet les valeurs à zéro). `structOps` suit les renommages et refuse de supprimer une structure utilisée par une table.
- Nœuds (`nodes/library/dataTables.ts`) : Get Data Table Row (Row Found / Row Not Found, Out Row du type de la structure), Get Data Table Row Names, Does Data Table Row Exist. La table est un réglage du nœud (`config.table`) : la palette propose les trois nœuds par table, sous Utilities › Data Table › DT_….
- Recherche d’une ligne sans tenir compte de la casse, comme un FName dans UE. Ligne introuvable : Row Not Found, Out Row aux valeurs par défaut, sans erreur.
- Interface : + Data Table dans le Content Browser (demande une structure), `DataTableDetails.tsx` (nom, Row Structure, lignes : nom, ↑ ↓ ✕, valeur).

**Save Game**
- Une classe de parent **SaveGame** (`ParentClass`) : pas de composants, jamais posée dans le niveau, parents limités à la famille SaveGame. + SaveGame dans le Content Browser.
- Nœuds (`nodes/library/saveGame.ts`) : Create Save Game Object, Save Game to Slot, Load Game from Slot, Does Save Game Exist, Delete Game in Slot. Les objets créés sont des `ActorRT` rangés dans `Simulation.objects` : Cast To, Get / Set d’un autre Blueprint et Is Valid marchent sans changement.
- Slots : `Project.saveSlots`, clé « slot|user index », valeurs rangées par nom de variable (Load retrouve la classe par id, sinon par nom). Gardés avec le projet (survivent à Stop, partent avec l’export), exclus de l’historique (Annuler ne ramène pas une vieille sauvegarde), enregistrés à Stop par `store.saveSlotsChanged()`. Le Content Browser les montre et permet de les effacer.
- Leçons : `Lesson.slots` donne les slots de départ (sinon aucun) ; l’étape de scénario `{ restart: true }` arrête la partie et en lance une nouvelle avec les mêmes slots. `prints()` et `errors()` cumulent les parties.

**Leçons et exercices** (`library/tables.ts`, `library/saves.ts`)

| Leçon | Niveau | Ce qu’elle apprend |
|---|---|---|
| Le catalogue | Confirmé | Get Data Table Row, Row Not Found relié (E16) |
| Débogue D16 — Le terminal muet | Confirmé | Un Row Name absent de la table : ligne vide sans erreur |
| La tirelire | Confirmé | Créer, remplir, sauver ; charger au BeginPlay (E15) |
| Débogue D17 — La première partie plante | Confirmé | Pas de slot : Load renvoie None, il faut créer une sauvegarde neuve |
| Prédis P11 — Load, Cast, lecture | Confirmé | Le slot garde la classe écrite ; Cast vers une autre classe : Cast Failed |
| Débogue D18 — Le record à zéro | Confirmé | Save Game to Slot avant le Set : le slot est une copie à l’instant |
| Le dialogue en Data Table | Avancé | Lignes chaînées par Suivante, fin sur None après l’affichage |
| Le checkpoint | Avancé | Sauver au passage la position du point de reprise ; replacer le joueur au lancement (E24) |

Tests : `tests/v7.test.ts` (opérations sur les tables, migration, pièges du catalogue et du dialogue, D17 qui plante, D18 à zéro, slots de départ d’une leçon, Annuler qui ne touche pas les slots). Questions de révision et fiches de notions pour chaque leçon ; mémos « Data Tables » et « Niveaux et sauvegarde » reliés aux leçons. `smoke.py` attend 86 étapes, captures 64 (Details d’une Data Table) et 65 (slot écrit par Play), lancé ici avec « errors [] ».

Non simulé : import CSV, Data Assets, versions Async, plusieurs niveaux et GameInstance (étape 2 de « Sauvegarde et niveaux » dans le backlog).

Version 7.0.0.

## V7.1 (2026-11-17) : Consume Input

Question de Tristan : l’event E des leçons est-il simplifié, alors que dans un vrai jeu on passe par une BPI ? Réponse : l’event est celui d’UE ; c’est le schéma « chaque objet écoute E » qui est un raccourci des premières leçons (le vrai schéma, joueur → Line Trace ou overlap → interface, est enseigné dans « Interagir avec tout » et « Regarder et interagir »). En vérifiant, un écart réel : l’appli envoyait la touche à tous les acteurs. Tristan a validé la correction.

- **Consume Input** (`config.consumeInput`, case dans Details, cochée par défaut ; absente = cochée, comme les anciens projets) sur l’événement de touche. `ConfigField` accepte `kind: 'bool'` et un texte `help`.
- **Pile des entrées** (`Simulation.inputStack`) : les acteurs qui reçoivent les entrées, le dernier enregistré en haut (le dernier posé, puis les acteurs créés par Spawn), le pion possédé tout en bas. L’ordre n’est plus mélangé par l’option d’ordre des acteurs. `Interpreter.fireKey` : une sortie Pressed ou Released reliée est une liaison ; avec Consume Input, elle arrête la touche (une sortie non reliée ne garde rien, comme l’expansion de K2Node_InputKey).
- Leçons revues : les touches de test écoutées par plusieurs acteurs ont Consume Input décoché, avec une phrase dans la première carte (`SHARED_KEYS`) : D12, le standard, C4, les miroirs, le réseau. « Les états de la porte » pose l’événement E (décoché) et l’explique.
- Vérification d’une leçon (sauf Débogue) : une note dit quel acteur a gardé la touche et lesquels ne l’ont pas reçue (`Simulation.keyKeptFrom`).
- **Débogue D19 — Seule la dernière porte s’ouvre** (Intermédiaire, `library/inputs.ts`) : trois portes qui testent la distance au joueur ; la dernière posée garde E. Correction attendue : décocher Consume Input ; les cartes montrent aussi la correction d’un vrai jeu.
- Fiche « Consume Input », fiche « Touches » complétée (Auto Receive Input), piège dans le Details du nœud, mémo Enhanced Input complété, une question de révision. Tests : `tests/consumeInput.test.ts`. `smoke.py` attend 87 étapes, capture 66.

Version 7.1.0.

## V7.2 (2026-11-18) : fiabilité des sauvegardes et des mises à jour

Le 18 novembre, Tristan a réorganisé le backlog avec Claude (revue de Codex du 17 novembre fondue dans les sections, trois premiers lots choisis : fiabilité, autonomie et transfert vers UE, entrées et interaction), puis lancé le lot 1. Constats D1 à D8 et H1 à H5 de BACKLOG.md ; chacun a son test dans `tests/storage.test.ts`.

- **D1** : un projet illisible ou d'un format plus récent n'est plus pris pour un projet absent. `loadSavedProject` rend `absent`, `ok`, `damaged`, `newer` ou `unavailable` ; `openWorkspace` rend `{ ok: false, blocked }` sans rien écrire, et `RecoveryDialog` (`ui/status/`) propose Exporter l'original, Recharger l'appli (`newer`), Réessayer (`unavailable`) ou Repartir de zéro (l'original est d'abord copié sous `rescue:<clé>:<date>`, gardé dans la sauvegarde complète).
- **D2 et D6** : `storage/storage.ts` est la seule politique de stockage (révisions croissantes, la copie la plus récente gagne, écritures d'une clé dans l'ordre, lecture qui attend les écritures en cours, échec de lecture = erreur). `idb.ts` attend `oncomplete`, rouvre la base après une fermeture ou un échec, et `putMany` écrit tout ou rien. Les valeurs IndexedDB sont maintenant `{ text, rev }` ; les anciennes chaînes se lisent toujours.
- **D3** : `core/serialization/validate.ts` vérifie tout le projet après migration (refus avec une raison, ou réparation sûre : fil vers un nœud disparu, acteur d'une classe supprimée, pion introuvable). Test : tous les projets de départ, solutions et alternatives des 87 étapes passent la vérification sans changer d'un octet. La progression a son modèle dans `core/progress/progress.ts` (`checkProgress` strict pour une restauration, `sanitizeProgress` pour une progression stockée).
- **D4** : fermer un espace sauvegarde à l'instant ; `pagehide` aussi ; `flushSaves()` vide tout (avant un rechargement).
- **D5** : la `Simulation` prévient (`onSlotsChanged`) à chaque écriture ou suppression de slot ; `EditorStore.slotsWritten()` émet le changement `slots`, que l'autosave enregistre même pendant Play.
- **D7** : `saveProgress` rejette en cas d'échec ; bandeau persistant avec Réessayer (`ui/status/StatusBar.tsx`). Une progression en partie illisible est copiée sous `rescue:progress:<date>` et le reste repris ; une progression impossible à lire n'est pas réécrite de la session.
- **D8** : restauration complète vérifiée en entier (progression comprise : `done: []` avec `read: 17` est refusé), puis écrite d'un bloc.
- **Règles de simulation et leçons versionnées** : `core/model/rules.ts` (`RULES_VERSION` = 3 : V6.2 et V7.1). `Project.rules` ; un projet plus ancien (déduit de sa date d'enregistrement s'il n'a pas le champ) affiche une fois ce qui a changé (`NoticeDialog`), à l'ouverture ou à l'import. `Lesson.revision` et `Project.lessonRevision` : prévenir quand une leçon a été revue depuis qu'on l'a commencée. Aucun changement de format (champs facultatifs).
- **H1, H2, H3** : `sw.js` sert la dernière copie si le serveur répond 5xx ; ne supprime que les caches `bp-trainer-*` (le domaine est partagé par tous les sites du compte) ; manifest et icônes en « cache puis rafraîchissement » ; cache renommé `bp-trainer-v2`.
- **H5** : le build écrit `version.json` (plugin dans `vite.config.ts`), jamais mis en cache ; `src/updates.ts` le lit au lancement, au retour au premier plan et toutes les 30 min ; bandeau « Nouvelle version disponible » avec Recharger, qui termine les sauvegardes avant.
- Tests ajustés : deux tests de migration ouvraient un projet sans Blueprint, désormais refusé (l'éditeur ne pouvait pas l'ouvrir).
- Vérifié aussi en HTTP local avec Chrome (hors dépôt) : service worker enregistré, cache `bp-trainer-v2`, dialogue de récupération sur un projet d'un format futur, bandeau de nouvelle version.

Reste du lot 1, non fait : H4 (suite de tests du service worker servie en HTTP dans la CI). À vérifier par Tristan dans l'APK : fermeture par Android pendant Play après une sauvegarde de slot, export et import par le partage Android, bandeau de mise à jour après la prochaine publication.

Version 7.2.0.

## V7.3 (2026-11-18) : vers l'autonomie (lot 2)

Cadrage avec Tristan avant de lancer : il en est vers l'étape 10 du parcours (fin du niveau Débutant) et ne pratique pas encore dans Unreal. D'où une notion pilote qu'il va rencontrer tout de suite (Cast To, leçons 9 et 10) plutôt que les interfaces, et pas de passerelle vers UE pour l'instant. Reportés après le pilote : reprise différée des erreurs, révision variée avec graphes, bilan de qualité, passerelle UE. Tests : `tests/lot2.test.ts`.

- **Leçon 1 corrigée** : « un nœud sur aucun fil blanc ne s'exécute jamais » vaut pour les nœuds à pins blanches ; les nœuds purs sont annoncés en leçon 1 et expliqués en leçon 4 (Get bEstAllumee). « À retenir » de P9 corrigé de même.
- **Aide mémorisée** (`core/progress/progress.ts`) : `Progress.help[leçon]` = indices montrés (3 = la solution), `solution` (solution ouverte dans l'éditeur, posé par `Root`), `tried` (Vérifier touché). `Progress.passedWith[leçon]` : `alone`, `hints` ou `solution`, au moment de la réussite ; une réussite ultérieure avec moins d'aide (après « Recommencer », qui remet l'aide à zéro) le remplace. Affiché sur les cartes (« réussie seul », « avec indices », « solution vue »), jamais comme une pénalité. Les indices de la fiche sont maintenant ceux de la progression (ils restent ouverts d'une visite à l'autre).
- **Notions** (`core/notions/`) : 46 notions de référence (`catalogue.ts`) ; chaque étape dit ce qu'elle enseigne et ce qu'elle suppose (`lessonNotions.ts`). Test : toute notion supposée est enseignée par une étape antérieure, toute notion est enseignée quelque part. `Lesson.notions` reste le texte libre affiché dans la fiche.
- **Cartes du parcours** : durée indicative (`core/lessons/duration.ts` : nœuds ajoutés par la solution, arrondi à 5 min, Débogue 10 min au moins, Prédis 5 min), notions demandées pas encore acquises, aide utilisée, date à partir de laquelle une étape différée est conseillée.
- **« Montre-moi »** (`core/explain/stops.ts`) : après une vérification ratée, jusqu'à trois endroits, tirés de l'exécution et non de la leçon : le nœud d'une erreur d'exécution (le journal garde maintenant le nœud, `SimLogEntry.site`), le nœud que le fil blanc n'a jamais atteint après un nœud exécuté (Cast toujours raté, Branch toujours du même côté), un événement relié qui ne s'est jamais déclenché. Bouton « Montre-moi » qui ouvre le graphe sur le nœud.
- **Chaînes guidé → transfert → autonomie** (`Lesson.chain`, `core/lessons/chain.ts`) : `guided` (leçons 9 et 10, inchangées), `transfer` et `autonomy` (indices fermés tant que Vérifier n'a pas été touché, pas de liste de nœuds dans les fiches, code T/A et pas de numéro de leçon : les numéros des leçons ne bougent pas). `chain.after` : étape différée, conseillée N jours après une autre ; avant, elle reste ouverte, mais « Continuer » ne la propose pas.
- **T1 — Le terminal à badge** (`library/chainCast.ts`, après la leçon 10) : deux terminaux (NiveauRequis 1 et 3, Instance Editable) et le badge du joueur (2) ; vert ou rouge ; une caisse dans la zone du second ne doit rien allumer. Robustesse : badge de niveau 3 (attrape un niveau écrit en dur).
- **A1 — Le piège** (fin du niveau Intermédiaire, deux jours après T1) : cahier des charges seul ; écrire la Vie du joueur à travers As BP_Joueur, un point par entrée, rien pour la caisse. Robustesse : un second piège.
- Deux questions de révision (T1, A1) ; « Écrire la variable d'un autre Blueprint » ajouté à la fiche de notion du Cast. `smoke.py` attend 89 étapes.

À observer avec Tristan : s'il passe les leçons 9 et 10, puis T1 sans indice, puis A1 deux jours plus tard. Ce qui dira si le format mérite d'être étendu aux autres notions (les interfaces en deuxième chaîne).

Version 7.3.0.

## V7.4 (2026-11-18) : Enhanced Input

Première partie du lot 3, choisie avec Tristan : Enhanced Input seul, parce qu'il manipule déjà des touches (leçon 4) et qu'il y arrivera dans une quinzaine d'étapes. Le reste du lot 3 (regard indépendant, interaction plus complète, Tick maîtrisé) attend qu'il approche des leçons du niveau Avancé. Tests : `tests/enhancedInput.test.ts`.

- **Assets** (format 9 : `Project.inputActions`, `Project.mappingContexts`) : Input Action (Value Type Digital (bool) seulement) ; Input Mapping Context, des lignes action + touche (E, F, Space Bar) + déclencheur. `core/operations/inputOps.ts` (créer, renommer, supprimer, refusé si encore utilisé, comme UE). Content Browser : + Input Action, + Mapping Context ; Details : `panels/InputDetails.tsx` (lignes, déclencheur, Hold Time Threshold, Is One Shot). Les noms partagent l'espace des autres assets (`takenNames`).
- **Nœuds** (`nodes/library/enhancedInput.ts`) : l'événement d'une action (une entrée de palette par action, Input › Enhanced Action Events) avec Triggered, Started, Ongoing, Canceled, Completed, Action Value, Elapsed Seconds, Triggered Seconds, et Consume Input ; Add Mapping Context (Priority) et Remove Mapping Context (une entrée par contexte). Simplification documentée : dans UE, Add Mapping Context se branche sur l'Enhanced Input Local Player Subsystem obtenu depuis Get Player Controller ; ici le nœud n'avait pas de Target (levée en V7.7). Compile demande de choisir l'asset (`pickInputAsset`).
- **Exécution** (`runtime/enhancedInput.ts`) : à chaque image, en premier (comme le PlayerController d'UE avant le pion), les contextes actifs par Priority décroissante (une touche utilisée par un contexte est consommée pour ceux du dessous), l'état de chaque ligne selon son déclencheur (aucun = Down, Pressed, Released, Hold avec seuil et One Shot), l'état de l'action (le plus haut de ses lignes), et les événements selon la table d'UE (None→Triggered : Started puis Triggered ; Ongoing→None : Canceled ; Triggered→None : Completed…). Un appui plus court qu'une image compte. Chaque événement descend la pile des entrées comme une touche : le premier acteur qui écoute l'action la garde si Consume Input est coché. Les contextes repartent de zéro à chaque Play. Non simulé : actions Axis2D, modificateurs, déclencheurs sur l'asset Input Action, Tap, Pulse, Chorded.
- **Trois étapes** (`library/enhancedInput.ts`, après D19, niveau Intermédiaire) : « La lampe en Enhanced Input » (la lampe de la leçon 4 passée sur IA_Interagir ; piège : Triggered sans déclencheur bascule à chaque image, la raison de l'échec le dit ; le test tient E 0,45 s pour que ce piège échoue) ; Débogue D20 « La touche qui ne répond plus » (Add Mapping Context oublié, rien dans l'Output Log) ; « Maintenir pour ouvrir » (déclencheur Hold 1 s, Triggered ouvre, Canceled affiche « Maintiens E pour ouvrir »). Ces trois étapes renumérotent les leçons qui suivent (+2).
- Notion `enhanced-input`, trois questions de révision, trois fiches de glossaire, mémo Enhanced Input mis à jour. `smoke.py` attend 92 étapes.

Version 7.4.0.

## V7.5 (2026-11-18) : interface à la manière d'UE, étape 1

Demande de Tristan : se rapprocher visuellement de l'éditeur d'UE tout en restant utilisable au téléphone, pour prendre les bons réflexes. Analyse faite avec captures des écrans actuels ; principe retenu : mêmes noms, même place relative (barre d'outils en haut, Components et My Blueprint à gauche, Details à droite, journaux et Content Drawer en bas), panneaux en tiroirs, appui long = clic droit, **ambre = propre à BP Trainer**. Plan en cinq étapes, validé (voir BACKLOG.md, « Interface à la manière d'UE ») ; une étape à la fois, avec son feu vert. Avant l'étape 3, le point 1 d'Enhanced Input (Player Controller) attend.

Étape 1, les deux éditeurs (`src/ui/editor/`) :
- **Onglets de documents** (`DocumentTabs.tsx`) : « Niveau », puis un onglet par Blueprint ouvert (fermable), comme les onglets d'UE. Remplacent le nom de classe déroulant et les onglets Niveau / Event Graph. Le Blueprint édité est toujours dans un onglet (`App`, état `tabs`). Accueil, leçon et menu ⋮ en ambre.
- **Barre d'outils de l'éditeur montré** (`EditorToolbars.tsx`) : Blueprint : Compile, Save, Class Settings, **Class Defaults** (nouveau : `panels/ClassDefaults.tsx`, valeurs par défaut des variables par Category, héritées en lecture seule), Play, puis les onglets de graphes **Construction Script**, Event Graph, la fonction ouverte. Niveau : Save, **+ Place Actors** (remplace le bouton flottant « + Placer »), Play. Le bouton flottant Play du niveau est retiré (Play est dans la barre, comme dans UE).
- **Poignées nommées** sur les bords du canevas : « Components · My Blueprint » à gauche (éditeur de Blueprint seulement, comme dans UE), « Details » à droite ; elles gardent les aria-label « Ouvrir My Blueprint » et « Ouvrir Details ». Le tiroir de gauche montre Components puis un titre My Blueprint.
- **Barre du bas** : bouton **Content Drawer** (ouvre l'actuel Content Browser, refait à l'étape 2), puis Compiler Results · Output Log · Debug. Toucher un Blueprint dans le Content Browser l'ouvre dans son onglet.
- **Ambre** (`.app-only`) : accueil, leçon, menu ⋮, vitesses de Play. Aide et gestes, et les fiches qui disaient « touche le nom du Blueprint » ou « menu ⋮ » pour le Content Browser, mis à jour.
- `smoke.py` : fonction `graph(page)` (ouvre l'onglet du Blueprint courant puis Event Graph), Content Drawer à la place du nom de classe.

Version 7.5.0.

## V7.6 (2026-11-18) : interface à la manière d'UE, étape 2

Le Content Drawer (`src/ui/content/`, remplace `overlays/ContentBrowser.tsx`) :
- monte du bas comme celui d'UE5 ; « Content », un champ **Search Content**, les assets en **vignettes** (glyphe et bande de couleur par type, libellé d'UE : Blueprint Class, Blueprint Interface, Enumeration, Structure, Data Table, Input Action, Input Mapping Context), triés par nom (`content/assets.ts`) ;
- toucher sélectionne (barre du bas : **Ouvrir**, **Placer dans le niveau** pour un Actor ou un Pawn, **Supprimer** avec confirmation, refusé si l'asset est utilisé), toucher deux fois ouvre (le double-clic d'UE) : un Blueprint dans son onglet, les autres dans Details ;
- **+ Add** avec le menu d'UE : Create Basic Asset › Blueprint Class ; Create Advanced Asset › Blueprint (Blueprint Interface, Enumeration, Structure), Input (Input Action, Input Mapping Context), Miscellaneous (Data Table) ;
- **Pick Parent Class** : Common Classes (Actor, Pawn, avec la description d'UE) et All Classes (SaveGame, et chaque Blueprint du projet pour créer un Blueprint enfant). « + SaveGame » disparaît : un SaveGame se crée comme dans UE. **Pick Row Structure** pour une Data Table quand le projet a plusieurs structures ;
- les slots de sauvegarde restent en bas, en ambre (propres à l'appli).
- Placer depuis le Drawer pose l'acteur à côté du Player Start, passe sur le niveau et ouvre son Details (`App.placeFromDrawer`).
- Textes mis à jour (fiches, explications de compilation, mémo, messages d'erreur) : « + Add › … » au lieu des anciens boutons. Tests : `tests/contentDrawer.test.ts` ; `smoke.py` ouvre DT_Objets par sélection puis Ouvrir.

Version 7.6.0.

## V7.7 (2026-11-18) : interface à la manière d'UE, étape 3 (Player Controller)

Le point 1 d'Enhanced Input, que Tristan jugeait le plus important : la vraie chaîne d'UE jusqu'à Add Mapping Context, sans la simplification de la V7.4. Tests : `tests/playerController.test.ts`.

- **Player Controller** : nouvelle classe parente native (`ParentClass` « PlayerController », Pick Parent Class › Common Classes › Player Controller, Parent Class dans Class Settings). Jamais posé ni créé par Spawn (`isPlaceableParent`), ses instances quittent le niveau s'il le devient. Class Settings › Joueur : case **Player Controller Class** (Game Mode › Player Controller Class dans UE, `setPlayerControllerClass`, `project.playerControllerClassId`). À chaque Play, le jeu crée le contrôleur (ce Blueprint, ou le PlayerController natif sans graphe) : BeginPlay, Tick, place sur la pile des entrées entre les acteurs et le pion (BuildInputStack d'UE).
- **Nœuds** : Get Player Controller (Game), Get Controller (Pawn ; Target = self dans un Pawn, à relier ailleurs ; None pour un pion que personne ne possède), Cast To PlayerController (Cast To d'une classe native, sortie « As Player Controller »), Enhanced Input Local Player Subsystem (pin Player Controller obligatoire, None si elle vaut None). Add / Remove Mapping Context ont maintenant la pin **Target** (le Subsystem), obligatoire comme dans UE (« Target must have a connection ») ; sur None : Accessed None, la chaîne continue.
- **Format 10** : un projet plus ancien reçoit Get Player Controller → Enhanced Input Local Player Subsystem sur chaque Add / Remove Mapping Context (il continue de marcher, et montre le chemin).
- **Leçons** : « La lampe en Enhanced Input » fait la chaîne avec Get Player Controller, nouvelle fiche « Le Player Controller » (le chemin du template Third Person y est expliqué) ; D20 part du BeginPlay du template (Get Controller → Cast To PlayerController → Subsystem) sans Add Mapping Context (révision 2 : une partie commencée est signalée) ; « Maintenir pour ouvrir » inchangée sauf la chaîne de départ ; **nouvelle étape « Les contrôles au Player Controller »** (créer BP_PlayerController, cocher Player Controller Class, y déplacer le contexte avec Self → Subsystem ; pièges détectés : case oubliée, contexte encore ajouté par le pion). Elle renumérote les leçons qui suivent (+1). Notion `player-controller`, une question de révision, fiche de glossaire « Player Controller », mémo Enhanced Input, notes « Piège » et « Dans UE » des nouveaux nœuds. `smoke.py` attend 93 étapes.

Version 7.7.0.

## V7.8 (2026-11-18) : interface à la manière d'UE, étape 4

Revue des étapes 1 à 3 d'abord (demandée par Tristan) : lint, 876 tests, tsc, build, smoke et CI verts sur V7.5 à V7.7 ; `assetlinks.json` en ligne conforme (package `com.infiniterelief.bptrainer`, empreinte `CB:44:…:4E:A2`). Corrigé au passage : Get Player Controller et Get Player Pawn ignoraient Player Index (un index autre que 0 renvoie maintenant None, comme UE avec un seul joueur) ; config Biome migrée (`preset`), suggestion Math.min/max écartée sur Clamp (elle changerait le cas Min > Max).

- **Details** (`panels/fields.tsx`) : sections d'UE repliables (barre de titre ▾), champ **Search Details** qui filtre les lignes par libellé, sections ambre « BP Trainer » (`Group app`) pour ce qu'UE met ailleurs (Utilisation, supprimer, Pin Values, Exécution, Game Mode), et un bloc **Aide** ambre en fin de panneau (ouvert ou fermé partout, gardé sur l'appareil) qui reçoit les explications. Libellés d'UE : Class Settings en Class Options / Input / Interfaces (Implemented Interfaces, + Add) ; variable : Variable (Variable Name, Variable Type, Description, Instance Editable, Expose on Spawn, Private, Category) puis Default Value ; fonction : Graph (Function Name, Description, Pure), Inputs, Outputs ; composant : Variable, Transform ; acteur du niveau : nom et Edit Blueprint en tête, Transform, variables Instance Editable sous leur Category. Sélectionner un Get / Set montre la variable, comme UE. Les réglages d'un nœud vont dans Graph (événements), Input, Pin Options, Comment ou Default. Fiches : « + Implemented Interface » devient « Interfaces › Add ».
- **Palette** (`overlays/Palette.tsx`, `buildTree` dans `core/nodes/palette.ts`) : titre « All Actions for this Blueprint », Context Sensitive toujours affiché (décoché : membres des autres Blueprints listés sans recherche), catégories et sous-catégories repliables (repliées en navigation, ouvertes pendant une recherche ou depuis une pin), icône d'UE devant chaque action (◆ événement, ƒ bleu ou vert, pastille de la couleur du type). Récents en ambre.
- **Find Results** (`core/search/find.ts`, `panels/FindResults.tsx`) : bouton **Find** dans la barre d'outils, onglet Find Results du panneau du bas, bouton « All Blueprints » (Find in all Blueprints), arbre Blueprint › graphe › nœud avec ce qui a correspondu (pin, valeur tapée, nom référencé). Toucher un résultat ouvre le nœud et referme le panneau (l'écran est trop petit pour les deux). **Find References** dans le menu d'un nœud et dans les Details d'une variable. Tests : `tests/find.test.ts`.
- `smoke.py` : captures 13b (All Actions replié), 13c (Find Results), 13d (saut vers le nœud).

Version 7.8.0.

## V7.9 (2026-11-18) : interface à la manière d'UE, étape 5

Dernière étape du plan. Tests : `tests/viewport.test.ts`.

- **Viewport** (`editor/viewport/ViewportCanvas.tsx`, `core/operations/viewportOps.ts`) : premier onglet de l'éditeur de Blueprint, avant Construction Script, comme dans UE (absent pour un SaveGame, désactivé pendant Play). La classe est dessinée vue de dessus comme un acteur posé à l'origine, avec l'axe +X (là où regarde un Yaw de 0) sous les composants. Toucher un composant le sélectionne (ses Details, contour bleu) ; double toucher ou appui long ouvre Details ; le glisser change sa Location, relative au parent : le geste est ramené dans le repère du parent, même tourné, puis arrondi au centimètre à la fin, en une seule annulation. La racine reste à l'origine ; un composant hérité est affiché mais se modifie dans le parent (message). Choix de test : les petits composants (lumières, textes, Scene) d'abord, puis les meshes, puis les Box Collision qui entourent souvent le reste. Bouton ⌖ pour recadrer. Un autre Blueprint, une recherche Find ou un nœud ouvert ramènent au graphe ; revenir sur l'onglet du même Blueprint garde le Viewport.
- **Outliner du niveau** (`panels/LevelOutliner.tsx`, `core/model/outliner.ts`) : le tiroir de droite de l'éditeur de niveau a deux onglets, Outliner et Details (poignée « Outliner · Details »). Colonnes Item Label et Type, tri par libellé, champ Search..., nombre d'acteurs. Toucher une ligne sélectionne l'acteur (même sélection que le niveau) et le recentre ; « Details › » passe à ses Details. La poignée ouvre les Details s'il y a une sélection, sinon l'Outliner. Pendant Play, l'Outliner en direct de l'étape 4 de la V1 reste celui du bouton ☷.
- `smoke.py` : captures 13e à 13h (Viewport, composant glissé et ses Details, Outliner, Details de l'acteur) ; le glissé d'un composant est vérifié.

Version 7.9.0.

## V7.10 (2026-11-18) : plan du parcours, lot 0 (le cadre)

Après l'interface, Tristan a demandé une analyse du parcours (points forts, points faibles, meilleure façon d'apprendre). Analyse et plan : [PLAN_PARCOURS.md](PLAN_PARCOURS.md) (copie du Claude Doc). Ses décisions : aide ouverte jusqu'à l'Intermédiaire puis verrouillée, rappels obligatoires mais petits, niveau Expert à projets longs, synthèses conseillées, lots 0 et 1 d'abord. Le lot 0 pose le cadre sans toucher au contenu des leçons. Tests : `tests/helpPolicy.test.ts`, `tests/spacing.test.ts`.

- **Règle d'aide par niveau** (`core/lessons/helpPolicy.ts`) : `HELP_RULES` par niveau, `ruleFor` (plus stricte en transfert et autonomie, ouverte pour un Prédis), `helpOffers(lesson, {tried, fails, done})` donne les aides du niveau, ouvertes ou avec la raison. La fiche (onglet Aide) n'affiche plus que ces aides, avec la règle du niveau en tête ; l'accueil l'affiche sous chaque niveau. `LessonHelp.fails` (vérifications ratées depuis le départ ou « Recommencer ») est compté dans `App.verify` et validé avec la progression.
- **Rappels et espacement** (`core/notions/practice.ts`) : notions lues dans les nœuds que la solution ajoute (`writtenNotions`, `practisedBy`), `spacing` (écart maximal par notion), `SPACED_NOTIONS`. `Lesson.recalls` (notions anciennes à réécrire en petit) ; le test vérifie qu'un rappel est réel et déjà enseigné, et que chaque notion revient au plus tous les 15 pas, avec `KNOWN_GAPS` comme cliquet (aujourd'hui : 35 notions au-dessus de la cible).
- **Échelle à 5 marches** : `ChainStep` = discover, guided, modify, transfer, autonomy (`LADDER`) ; `isChainExercise` = transfert ou autonomie seulement. Test : les marches d'une notion arrivent dans l'ordre, l'autonomie est différée.
- **Niveau Expert** (`levels.ts`, avec un texte `help` par niveau) : caché à l'accueil tant qu'il n'a pas d'étape. Durée jusqu'à 120 min.
- **Synthèse** : `LessonKind` « synthesis », code S…, non numérotée, libellé « Synthèse S1 », +10 min (45 au plus). L'accueil la conseille en tête du niveau suivant tant qu'elle n'est pas réussie et que ce niveau n'est pas commencé ; rien n'est bloqué.
- `smoke.py` : captures 67 (aide verrouillée d'une leçon Confirmé) et 68 (règle d'aide sous le niveau).

Version 7.10.0.

## V7.11 (2026-11-18) : plan du parcours, lot 1a (réflexes UE5, Intermédiaire et Confirmé)

Tests : `tests/ue5Input.test.ts`.

- **Enhanced Input après la leçon « Les contrôles au Player Controller »** (`core/lessons/ue5Input.ts`) : `asEnhancedInput(lesson, names)` présente une étape écrite avec des événements de touche comme un projet UE5 (template Third Person) : une Input Action par touche (`DEFAULT_ACTIONS` : E → IA_Interagir, F → IA_Utiliser, Espace → IA_Sauter, ou le nom donné par la leçon), IMC_Joueur sans déclencheur (Started = l'ancien Pressed, Completed = Released), BP_PlayerController (Player Controller Class) qui ajoute IMC_Joueur par Self → Subsystem → Add Mapping Context. Consume Input est gardé. Les acteurs qui écoutaient une touche gardent Auto Receive Input (dans UE ils entendent aussi les actions) ; la fiche générée « Les touches, comme dans UE5 » le dit, et renvoie au vrai schéma (le joueur prévient l'objet, « Interagir avec tout »). La solution, les autres façons de faire et les mutations de robustesse de la leçon tournent sur la forme à touches puis sont converties : le code des leçons n'a pas changé. La révision de l'étape monte de 1.
- **Table** `UE5_INPUT` (`core/lessons/index.ts`) : les 16 étapes concernées (Intermédiaire et Confirmé) et leurs noms d'actions (Le four : IA_Lancer, IA_Annuler ; les cartes : IA_Tirer, IA_NouvellePartie ; la régie : IA_Regie1, IA_Regie2, IA_ChangerDeRegie ; le record : IA_Marquer, IA_Sauvegarder). Test : plus aucun événement de touche dans ces étapes, réglage du template présent, révision montée.
- **Textes** : consignes de graphe des 16 étapes réécrites (IA_… (Started) au lieu de **E** (Pressed)) ; ce qui décrit le jeu (« appuie sur E ») est resté. `SHARED_KEYS` vaut pour touches et actions. Content Browser → Content Drawer (36 mentions), Tooltip → Description (mémo), Réglages → Details › Pin Options (Switch). Find References dans les indices de D12 et de « Qui modifie quoi », l'Outliner dans ceux de D1.
- **Espacement** : un événement d'action compte aussi pour la notion `input` (Auto Receive Input, Consume Input) ; `enhanced-input` passe de 65 à 53 dans `KNOWN_GAPS`.
- `tools/e2e/solved.gen.ts` écrit `lessonRevision` comme l'appli, sans quoi l'avis « leçon revue » bloquait le smoke test.

Écart au plan, à dire à Tristan : les objets écoutent toujours eux-mêmes leur action (Auto Receive Input). Les faire passer par le joueur (overlap ou Line Trace + interface) change le sujet de ces leçons et suppose les interfaces, vues plus tard ; c'est l'objet de l'exercice « Interagir comme dans UE5 » (lot 3).

Version 7.11.0.

## V7.12 (2026-11-18) : plan du parcours, lot 1b (réflexes UE5, Avancé)

Fin du lot 1 : toutes les étapes après « Les contrôles au Player Controller » sont des projets UE5 (`tests/ue5Input.test.ts` couvre maintenant tous les niveaux, Expert compris quand il aura des étapes).

- 14 étapes Avancé ajoutées à `UE5_INPUT`. Les cinq où le joueur interagit (Le terminal, Remettre la station en route, La salle de contrôle, Regarder et interagir, R3) gardent IA_Interagir sur BP_Joueur : c'est déjà le schéma d'UE (le joueur prévient l'objet). Noms d'actions donnés par la leçon : le standard (IA_Appeler, IA_Demonter, IA_Appeler103), C4 (IA_Detruire), les miroirs (IA_Pivoter), D15 (IA_Poser), D14 (IA_Fabriquer, IA_AjouterBatterie), l'interrogatoire (IA_Choix1, IA_Choix2, IA_Parler), C6 (IA_Deplacer, IA_Annuler, IA_Refaire), le réseau (IA_Recalculer, IA_Basculer).
- Consignes de graphe réécrites (IA_… (Started) au lieu de E ; défis « ajoute la touche E » devenus « ajoute une action IA_… sur E dans IMC_Joueur »).
- Espacement : `enhanced-input` passe de 53 à 48 dans `KNOWN_GAPS`.

Version 7.12.0.

## V7.13 (2026-11-18) : plan du parcours, lot 2a (Débutant)

Le lot 2 est fait en deux temps, avec la validation de Tristan entre les deux : le Débutant ici, l'Intermédiaire ensuite (2b).

- **Construis ta lampe** (`library/building.ts`, après « Allumer une lampe ») : premier acteur construit de zéro. Content Drawer › + Add › Blueprint Class › Actor, un Static Mesh et une Point Light, la lumière écartée d'au moins 40 cm dans le Viewport, deux instances posées. Vérifié sur le projet (`componentInActor`) puis en Play. Le niveau de départ a un `BP_Mur` : un projet sans Blueprint n'est pas valide (`validateProject`). Nouvelle notion du catalogue `build-actor`, fiche de glossaire « Construire un acteur ».
- **Prédis P12 « Où est la lumière ? »** : une Point Light à X = 100 sur un composant Scene tourné de 90° ; nouveau nœud **Get World Location** (`component.getWorldLocation`, pur). Enseigne `transform` dès le Débutant.
- **Le compteur passe avant « Interrupteur à touche »**, qui est recentrée sur les touches : la variable et le Branch y deviennent un rappel (fiche « Rappel : se souvenir »), le paragraphe sur les nœuds purs est retiré (D10 l'enseigne), FlipFlop n'est plus qu'une remarque (la porte l'enseigne). Notions : `input` seulement. C'est la « leçon 4 scindée » du plan : plutôt que deux leçons, la partie variable vient de la leçon d'avant. Les renvois « leçon 4 » de « La lampe en Enhanced Input » nomment désormais la leçon par son titre (les numéros bougent).
- **Synthèse S1 « Le passage »** (`library/synthesis.ts`, fin du Débutant, conseillée) : cahier des charges sans liste de nœuds, lampe sur E, barrière qui affiche un message au lancement, compte les passages et s'ouvre au 3e (cachée et traversable). `helpPolicy.ruleFor` traite une synthèse comme une marche d'autonomie (indices après un premier essai, pas de liste de nœuds). Une synthèse n'enseigne rien de neuf : `tests/lot2.test.ts` l'accepte sans `teaches`, et lui donne jusqu'à 45 min.
- **Rappels** : le compteur (`overlap`, `print`), Interrupteur à touche (`components`), la barrière (`input`). Espacement : `events` atteint la cible (le BeginPlay de S1), retiré de `KNOWN_GAPS`.
- Révision : trois questions (Construis ta lampe, P12, S1). 96 étapes, 126 questions.

Version 7.13.0.

## V7.14 (2026-11-18) : plan du parcours, lot 2b (Intermédiaire)

Fin du lot 2. Sept étapes de plus (103 au total), toutes dans l'Intermédiaire :

- **La porte sur son gond** (`library/hinge.ts`, après « Ouvrir une porte ») : un battant qui tourne autour de son milieu ; l'apprenant ajoute un Scene `Gond` au bout du battant dans le Viewport, y accroche la Porte (Attach Parent, X = 100) et fait tourner le Gond. Vérifié dans le monde (`componentTransform`) : fermée en travers du passage, ouverte à côté, le joueur passe. Fiche de glossaire « Pivot et Attach Parent ».
- **Le Cast isolé** (`library/pickups.ts`) : **Les pièces** enseigne Destroy Actor seul (self, une instance à la fois) ; **Prédis P13 « Qui est entré ? »** (`chain: cast, discover`) met l'idée fausse « le Cast cherche le joueur » face à une caisse qui fait échouer le Cast ; **Ramasser un objet** n'enseigne plus que Cast To et la variable d'un autre Blueprint (Destroy devient un rappel).
- **Le gyrophare** (`library/blinker.ts`, après P2) : Set Timer by Event en boucle, Timer Handle, Clear and Invalidate. Échelle du temps : Delay (P1, la porte qui se referme), Delay dans une boucle (P2), timer.
- **Une valeur par lampe** (`library/perInstance.ts`) : Instance Editable, réglé dans les Details de chaque lampe posée ; la solution de référence passe par un Branch (rappel), la fiche donne la version courte.
- **Transfert T2 « Appuyer ou fouiller »** (`library/chest.ts`, `chain: enhanced-input, transfer`) : un projet UE5 (IMC_Joueur, BP_PlayerController) où l'apprenant règle lui-même le déclencheur Hold ; Triggered fouille, Canceled ouvre. `tests/ue5Input.test.ts` autorise un déclencheur dans une étape dont la chaîne est Enhanced Input.
- **Synthèse S2 « La réserve »** (fin de l'Intermédiaire) : clé (Cast, variable du joueur, Destroy), porte qui ne s'ouvre qu'avec la clé, message une seule fois sans elle (DoOnce), refermeture après 2 s (Delay).
- Révision : 7 questions (133 au total).
- **Espacement** : branch atteint la cible ; destroy 45 → 40, latent 40 → 27, flow-memory 49 → 48. Mais **six écarts montent** dans `KNOWN_GAPS`, notés en commentaire : T2 et S2 tombent dans des trous déjà longs (enum, switch, maps, player-controller +2, timeline +1), et les timers, enseignés 44 étapes plus tôt, ne sont réécrits qu'à « Les vagues » (16 → 44). Les rappels du lot 3 (Confirmé) sont le bon endroit pour les faire redescendre.

Écart au plan : « Appuyer ou fouiller » utilise Hold et Canceled sur une seule action, faute de déclencheur Tap dans l'appli (c'est aussi un schéma courant dans UE). D1 (Accessed None) reste en Confirmé : il suppose les références d'objet, enseignées là ; P13 joue le rôle de l'« erreur en face » juste avant le Cast.

Version 7.14.0.

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

L'APK étant installée et liée au site, un push sur `main` est une mise en production : ne pousser que ce qui passe lint, tests, build et smoke.

## Pièges techniques déjà rencontrés

- TypeScript 7 : pas de `baseUrl` ; chemins relatifs (`./src/...`) dans `tsconfig.json`. `vite.config.ts` et `tools/` sont hors du `include` de tsconfig.
- `vite-plugin-singlefile` : tout le build est un seul `dist/index.html` (base `./`).
- Tactile : un appui long ouvre un panneau, et le « clic fantôme » qui suit le fermait. `ui/widgets/useOwnTap.ts` protège les fonds et éléments de menus et de palette.
- `GraphCanvas.focusNode` appelé juste après le montage (taille 0) est différé jusqu'au premier redimensionnement.
- Play tourne sur une copie du projet (`structuredClone`) : modifier le graphe pendant Play n'a d'effet qu'au Play suivant ; les breakpoints, eux, sont partagés.
- Sauvegarde : IndexedDB `bp-trainer`, magasin `kv`, clés `project:sandbox`, `project:lesson:<id>`, `progress`, `rescue:*` ; valeurs `{ text, rev }` (anciennes : chaînes). Toujours passer par `storage/storage.ts`, jamais par `kv` ou localStorage directement. Format de projet versionné : `PROJECT_FORMAT` et `migrate()` dans `core/serialization/serialize.ts`.
