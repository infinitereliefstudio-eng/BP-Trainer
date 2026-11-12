# Reprise du projet

Ce fichier suffit pour reprendre le travail sans l'historique des conversations. À lire avec [PLAN_V3.md](PLAN_V3.md) (le plan en cours), [PLAN_V2.md](PLAN_V2.md) et [PLAN_V1.md](PLAN_V1.md) (les plans précédents), [ARCHITECTURE.md](ARCHITECTURE.md) (le code) et [BACKLOG.md](BACKLOG.md) (ce qui est noté pour plus tard).

Dernière mise à jour : 2026-11-12, V5 faite et testée en local, **commit local non poussé** au moment d’écrire (voir « V5 »). Avant : 2026-11-11, V4 livrée d’un bloc (voir « V4 »), en attente de la validation de Tristan. Avant : 2026-11-10, V3 complète livrée d'un bloc (étapes C, D et E, plus le parcours et l'accueil), en attente de la validation de Tristan sur son téléphone. APK : Tristan a confirmé le 2026-11-10 qu'elle est signée avec l'empreinte d'`assetlinks.json`, qu'elle ouvre https://infinitereliefstudio-eng.github.io/BP-Trainer/ et que son Package ID est `com.infiniterelief.bptrainer` : chaque push sur `main` met donc à jour l'appli installée.

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

Remarqué, non changé : le Gate de l'appli a Start Closed décoché par défaut, alors que la macro d'UE le coche. À vérifier puis corriger (aucune leçon n'en dépend ; P7 le coche explicitement).

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
- Sauvegarde : IndexedDB `bp-trainer`, magasin `kv`, clés `project:sandbox`, `project:lesson:<id>`, `progress`. Format de projet versionné : `PROJECT_FORMAT` et `migrate()` dans `core/serialization/serialize.ts`.
