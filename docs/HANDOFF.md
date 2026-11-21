# Reprise du projet

Ce fichier suffit pour reprendre le travail sans l'historique des conversations. **Commencer par « Reprise rapide » ci-dessous** : c'est l'état réel au 2026-11-21. Les sections suivantes (« État », V2 à V7.x) sont l'historique, gardé pour les décisions qu'il explique ; quand elles contredisent la reprise rapide, c'est la reprise rapide qui fait foi.

À lire ensuite : [ARCHITECTURE.md](ARCHITECTURE.md) (le code), [BACKLOG.md](BACKLOG.md) (noté pour plus tard, à ne pas faire sans demande, avec l'ordre des prochains chantiers), [REVUE_PROGRESSION_V7_61.md](REVUE_PROGRESSION_V7_61.md) (la dernière revue, celle des V7.57 à V7.61, rien de lancé), [REVUE_PARCOURS_EXERCICES.md](REVUE_PARCOURS_EXERCICES.md), [REVUE_NIVEAUX.md](REVUE_NIVEAUX.md), [REVUE_ANNEXE_WIDGET_PROJETS.md](REVUE_ANNEXE_WIDGET_PROJETS.md), [REVUE_UMG.md](REVUE_UMG.md) et [REVUE_V7.md](REVUE_V7.md). Les plans ([PLAN_PARCOURS.md](PLAN_PARCOURS.md), [PLAN_COMPOSANTS.md](PLAN_COMPOSANTS.md), [PLAN_V3.md](PLAN_V3.md), [PLAN_V2.md](PLAN_V2.md), [PLAN_V1.md](PLAN_V1.md)) sont terminés.

## Reprise rapide (2026-11-21, après la V7.56)

**Reprise par un autre agent : lire d'abord la section « Reprise par un autre agent » de [BACKLOG.md](BACKLOG.md)** (état exact après la V7.56, ce qui attend Tristan, ce qui reste à vérifier dans UE, piège du déploiement). Les puces ci-dessous sont l'historique de la journée du 20 novembre ; la plus récente est celle du chantier n° 4.

### Où on en est

- **Chantier n° 5, projet Expert final : analyse (21 novembre, 21 h 40)**, demandée par Tristan (« On va juste faire l'analyse, on peut même imaginer plusieurs exercices potentiels, on va faire un fichier dans le projet… intéressant à faire… mobiliser un maximum de compétences acquises ») : [PLAN_EXPERT_FINAL.md](PLAN_EXPERT_FINAL.md), fichier du dépôt seulement (pas de Claude Doc). Quatre projets imaginés (Le réveil, La ronde, L'arène de maintenance, Le réseau), comparés sur 18 familles de notions ; recommandé : X2 enrichi (≈ 70 nœuds) → X3 La ronde (≈ 90) → X4 Le réveil en quatre jalons (≈ 200), X1 fondu dans Le réveil, L'arène et Le réseau au backlog ; un seul ajout de moteur, les jalons ; six versions V7.65 à V7.70 ; cinq questions. **Rien n'est lancé** : attendre ses réponses et son feu vert.
- **Revue du chantier « progression des exercices » (21 novembre, 21 h 03)** : demandée par Tristan (« fait une review du dernier chantier »), après lui avoir redonné l'accès en écriture. [REVUE_PROGRESSION_V7_61.md](REVUE_PROGRESSION_V7_61.md), copie du Claude Doc https://claude.ai/artifact/GsxbLwNZekagbKpLrtFyQj. Tout est vert (1 891 tests, CI). Constats en trois lots : V7.62 (D3 : Accessed None dans la ligne fournie du Player Controller au 2e E ; vérification `pc-<action>` qui passe sans appel de l'objet ; `lessonNotions` de S2, S3, S4, L67 et autres pas à jour ; Sequence jamais écrit avant S2), V7.63 (S3 58 nœuds et M4 57 au-dessus des Expert ; masquage Flip Flop de M4 à retirer ; menus absents de l'Avancé, proposés pour le projet final), V7.64 (`Umg.textLog` sans limite, `shown()` qui ne regarde pas la visibilité, retouches). Quatre questions. Tristan a lancé les corrections à 21 h 14 (« Ok passe aux corrections ») : recommandations prises, V7.62 à V7.64 dans l'ordre. **V7.62 faite** (lot 1), **V7.63 faite** (lot 2), **V7.64 faite** (lot 3) : **revue entièrement corrigée**. À la reprise : ses essais sur téléphone (D3 avec deux appuis sur E, L36 avec une ligne du Player Controller incomplète, M4 sans masquage, et ceux des V7.57 à V7.61), puis le chantier n° 5 (projet Expert final, analyse d'abord, avec les notes du BACKLOG sur la taille de X1 et X2 et les menus) sur son feu vert.
- **Revue de la progression des exercices (21 novembre, 19 h 10)** : demandée par Tristan (« regarder la progression des exercices, […] ceux créés avant les ajouts, qu’ils soient à jour et utilisent les outils existants, des exercices qui mélangent plusieurs notions, progressif »). [REVUE_PARCOURS_EXERCICES.md](REVUE_PARCOURS_EXERCICES.md), copie du Claude Doc https://claude.ai/artifact/U6hg99KCDJburANewm3nwZ. Cinq constats (décor qui écoute les touches après R4 dans 16 étapes, Print String pour parler au joueur, synthèses et Expert qui ne couvrent pas leur niveau, peu d’entraînements mélangés, UMG non suivi par le test d’espacement) et cinq versions proposées (V7.57 à V7.61) avec cinq questions. Tristan a pris les recommandations à 19 h 18 (« Ok pour tes recos, tu peux lancer ») : V7.57 à V7.61 dans l’ordre, une version chacune. **V7.57 faite** (outillage), **V7.58 faite** (commandes par le Player Controller), **V7.59 faite** (messages à l’écran), **V7.60 faite** (synthèses), **V7.61 faite** (trois entraînements mélangés) : **revue entièrement faite**. À la reprise : ses essais sur téléphone (les 16 étapes aux commandes par le Player Controller, le terminal, M2, la boîte de dialogue, S2, S3, S4, M3, M4, M5), puis le chantier n° 5 (projet Expert final, analyse d’abord, où X1 et X2 seront décidés) sur son feu vert.
- **Revue du chantier n° 4 (21 novembre, 17 h)** : corrections lancées à 17 h 28 (« Ok pour 1 et 2, pour trois on simule maintenant ») : **V7.52 faite** (lot 1), **V7.53 faite** (plusieurs Player Start), **V7.54 faite** (lot 2) : **revue entièrement corrigée**. À la reprise : ses essais (dont les trois Player Start de l'atelier et Choose Player Start), puis le chantier n° 5 (projet Expert final, analyse d'abord) sur son feu vert. E40 : Tristan a renvoyé le recueil le 21 novembre à 18 h 26 (« il est pas à jour, et si on peut faire mieux c'est pas obligé de coller à celui-ci ») ; le fichier reçu s'arrête au milieu d'E12, seule la ligne d'E40 du tableau y est (« Le personnage choisi dans une autre carte », Compléter, GameInstance, changement de niveau, initialisation). Il a ensuite renvoyé le recueil complet (18 h 28). Proposé : une étape Complète C8 « Le personnage choisi » (Lvl_Menu, vitrines, piège d'une référence d'acteur du menu, Class Reference gardée dans le GameInstance, surcharge Get Default Pawn Class For Controller) ; lancée à 18 h 31 (« Ok lance, ajoute au backlog le possess si intéressant ») : **V7.55 faite** (moteur), **V7.56 faite** (l'étape C8, lancée à 18 h 48 : « Tu peux lancer »). À la reprise : ses essais (dont C8), puis le chantier n° 5 (projet Expert final, analyse d'abord) sur son feu vert. Possess est au BACKLOG (« Aller plus loin après le chantier n° 4 »). Demandée par Tristan (« fait une review du dernier chantier »), [REVUE_NIVEAUX.md](REVUE_NIVEAUX.md), copie du Claude Doc https://claude.ai/artifact/7kzFMMAK2ZHTviw3rudRSW. Dix constats en deux lots (V7.52 moteur : « Pourquoi ? » après Open Level, Event Init trop tard, timers du GameInstance, double End Play, SaveGame gardés ; V7.53 étapes et docs : A4 et Event Shutdown sur Android, rappels manquants, T6, note Player Start Tag, docs) et trois questions. Réponses : 1 et 2 recommandés, 3 : simuler maintenant.
- **Version en ligne : 7.61.0** sur `main`, déployée (GitHub Pages → l'APK de Tristan se met à jour seule) et publiée sur la page de test.
- **Revue du chantier UMG (20 novembre, après la pause)** : Tristan a demandé une phase de revue des V7.33 à V7.37 ([REVUE_UMG.md](REVUE_UMG.md), copie du Claude Doc https://claude.ai/artifact/CrkTaiJba82iawUak3Nwfy). Douze constats en trois lots (V7.38 moteur, V7.39 Play et Designer au téléphone, V7.40 code et docs). Tristan a pris les recommandations (« ok pour tes recos, tu peux passer aux corrections ») : PAUSED caché quand un widget est à l'écran, aperçu « Téléphone » dans le Designer. **Les trois lots sont faits** (V7.38 à V7.40, voir leurs sections). À la reprise : ses essais sur téléphone des V7.33 à V7.40 (rien n'a encore été essayé, dont le Screen Size et les boutons sous le joystick), puis l'analyse du chantier n° 4 (niveaux et GameInstance) sur son feu vert explicite, avant toute version. **Pause demandée par Tristan le 20 novembre à 16 h 30 (« met à jour le backlog et on arrête ») : rien n'est en cours.** La revue précédente ([REVUE_V7.md](REVUE_V7.md), 19 novembre) est entièrement corrigée (V7.23 à V7.26).
- **Chantier annexe en cours (20 novembre au soir), avant le n° 4** : le Widget Component, avec plusieurs projets en simulation libre. Plan : [PLAN_ANNEXE_WIDGET_PROJETS.md](PLAN_ANNEXE_WIDGET_PROJETS.md) (V7.41 Mes projets, V7.42 moteur du Widget Component, V7.43 étapes à l'Avancé). Tristan a pris les trois recommandations (« Ok pour tes recos, tu peux lancer »). **V7.41**, **V7.42** et **V7.43** faites (voir leurs sections) : **chantier annexe terminé**. **Pause demandée par Tristan le 20 novembre à 20 h 52 (« on termine ici ») : rien n'est en cours.** À la reprise : ses essais (Mes projets, Widget Component en simulation libre, les quatre étapes de l'Avancé), puis l'analyse du chantier n° 4 (niveaux et GameInstance) sur son feu vert explicite.
- **Revue du chantier annexe (20 novembre au soir)** : Tristan a demandé une phase de revue des V7.41 à V7.43 ([REVUE_ANNEXE_WIDGET_PROJETS.md](REVUE_ANNEXE_WIDGET_PROJETS.md), copie du Claude Doc https://claude.ai/artifact/138H1RP5QSDFRbmznHPFyu). Sept constats et deux notes en deux lots (V7.44 : widget qui tourne avec son acteur, avis de règles perdu à l'import ; V7.45 : export, noms, autre façon de faire, docs). Tristan a pris les recommandations (« Ok pour tes recos, lance les corrections ») : ne jamais tourner, ajouter l'autre façon de faire. **V7.44** (lot 1) et **V7.45** (lot 2) faites, voir leurs sections : **revue entièrement corrigée**. À la reprise : ses essais sur téléphone des V7.33 à V7.45, puis l'analyse du chantier n° 4 (niveaux et GameInstance) sur son feu vert explicite.
- **Chantier n° 4, niveaux et GameInstance : lancé le 20 novembre à 22 h 58** (« Ok pour tes recos »). **V7.46 faite** (plusieurs niveaux, voir sa section). **V7.47 faite** le 21 novembre à 0 h 30 (« Lance ») : Open Level, la partie `Game`, voir sa section. **V7.48 faite** le 21 novembre à 9 h 39 (« Tu peux passer à la suite ») : GameInstance et Quit Game, voir sa section. **V7.49 faite** à 9 h 57 (« Tu peux lancer ») : le vrai GameMode, voir sa section ; le moteur du chantier est terminé. **V7.50 faite** à 10 h 45 (« Tu peux lancer la suite ») : les étapes 1 à 4, voir sa section. **V7.51 faite** à 13 h 25 (« Tu peux lancer ») : les étapes 5 à 8, le mémo, la révision ; **le chantier n° 4 est terminé**. À la reprise : ses essais (créer un niveau, l'ouvrir, Play, Maps & Modes ; une porte qui fait Open Level ; un compteur dans un GameInstance qui survit à la porte ; un autre pion dans un niveau par GameMode Override ; les huit nouvelles étapes), puis la suite selon son choix : chantier n° 5 (projet Expert final, analyse d'abord) ou une revue du chantier n° 4. Analyse d'origine :, à la demande de Tristan (« Analyse pour le chantier 4 ce qui existe dans l'App, les règles ue, et de quelle manière on pourrait implémenter le chantier ») : [PLAN_NIVEAUX.md](PLAN_NIVEAUX.md), copie du Claude Doc https://claude.ai/artifact/8jupgWRbXyTExFaxjEXqv1. Proposé : une `Game` au-dessus de `Simulation` (un monde neuf par Open Level, le GameInstance et les slots gardés), format 14 (`Project.levels`), Maps & Modes, six versions V7.46 à V7.51, huit étapes à l'Avancé après « Le checkpoint » (148 au total). Les sept recommandations sont prises (vrai GameMode, pas de Level Blueprint, étapes à l'Avancé après « Le checkpoint », Quit Game simulé, pin Options sans effet, autonomie A4, `Lvl_Principal`). Ses essais sur téléphone des V7.33 à V7.45 restent à faire.
- **Faits avant la revue** : le plan du parcours ([PLAN_PARCOURS.md](PLAN_PARCOURS.md), copie du Claude Doc https://claude.ai/artifact/3raFiT4Sfcj627iPZR56iK ; lots 0 à 4, V7.10 à V7.18) et le chantier Actor Components ([PLAN_COMPOSANTS.md](PLAN_COMPOSANTS.md), V7.19 à V7.22).
- **Retours de Tristan du 20 novembre** : « les points sont ok » pour ce qu'on lui avait fait essayer (interface des V7.31 et V7.32, file « À retravailler en Blueprint » et mini-exercices, étapes Actor Components) ; il confirme aussi le menu pause sans widget, sur Espace. Aucun retour détaillé étape par étape.
- **Chantier n° 2 terminé : les révisions de graphes espacées** (BACKLOG.md, « Chantier n° 2 », tiré de [ANALYSE_APPRENTISSAGE_ADAPTATIF_ET_EXERCICES_PROCEDURAUX.md](ANALYSE_APPRENTISSAGE_ADAPTATIF_ET_EXERCICES_PROCEDURAUX.md)), lancé par Tristan le 19 novembre (« tu peux lancer »). **Étape A faite en V7.27** (journal des essais), **B en V7.28** (file « À retravailler en Blueprint », lancée par « tu peux lancer l'étape b »), **C en V7.29** (mini-exercices à variantes, « tu peux lancer c »), **D en V7.30** (hypothèse avant l'indice ; Tristan a écrit « lancer l'étape c » une seconde fois, puis confirmé D quand on le lui a demandé). **Le prochain chantier est l'UMG minimal** (n° 3) : il attend son feu vert explicite (règle du CLAUDE.md : une étape à la fois), après ses essais des V7.27 à V7.30.
- **Chantier annexe « retouches de l'interface » terminé** (V7.31 et V7.32), lancé par Tristan (« Fait les deux, fait 0.7 ») après avoir été **proposé le 19 novembre au soir** ([PLAN_RETOUCHES_UI.md](PLAN_RETOUCHES_UI.md), copie du Claude Doc https://claude.ai/artifact/WRanWML2cVLLUVDQUMChJx). Réponses : les deux lots, zoom plancher 0,7. À lui faire essayer sur téléphone : la place du graphe et la lisibilité à l'ouverture, la colonne de boutons, la barre du bas en onglets, les contrôles de Play dans la barre d'outils.
- **Chantier n° 3, UMG : plan validé le 20 novembre** ([PLAN_UMG.md](PLAN_UMG.md), copie du Claude Doc https://claude.ai/artifact/FuxBJZTiJ2ifCMDb1TpzPn). Tristan a demandé une analyse du fonctionnement réel dans UE, puis a répondu aux six questions (section « Décisions du 20 novembre », qui fait foi) : Designer réduit, étapes au Confirmé (et le compteur en fin d'Intermédiaire), Bindings simulés dès la V7.34, Widget Component au backlog sauf s'il est facile (V7.37), toucher ignoré en Game Only, aperçu 1280 × 720 à confirmer à l'œil. Recueil retrouvé (Tristan l'a renvoyé le 20 novembre) : E10 et E27 entrent dans le chantier, E38 (glisser-déposer) part au backlog ; douze étapes UMG. **V7.33 faite** (« tu peux lancer », 20 novembre) : le Widget Blueprint et son Designer, voir la section V7.33. **V7.34 faite** (« tu peux passer à la suite », 20 novembre) : les widgets à l'écran pendant Play, leur cycle de vie, les nœuds Set, les enfants ajoutés en jeu et les Bindings, voir la section V7.34. **V7.35 faite** (« tu peux enchainer », 20 novembre) : boutons, modes d'entrée, curseur, pause, voir la section V7.35. **V7.36 faite** (« tu peux lancer », 20 novembre, après qu'il a donné l'accès en écriture au dépôt) : les six premières étapes UMG, voir la section V7.36. **V7.37 faite** (« tu peux passer a la prochaine étape », 20 novembre) : les six dernières étapes et la reprise, voir la section V7.37. **Le chantier UMG est terminé.** Il n'a pas encore donné de retour d'essai sur les V7.33 à V7.37 (dont la taille 1280 × 720, à confirmer à l'œil). Widget Component : jugé « moyen » à la fin de la V7.35, resté au backlog faute de décision, puis fait le soir même à sa demande (chantier annexe, V7.42 et V7.43). **Prochain chantier : n° 4, niveaux et GameInstance** (BACKLOG.md), confirmé par Tristan comme un nouveau chantier ; il a ensuite demandé une **pause** (« on arrête là », 20 novembre à 15 h 45). À la reprise : ses essais des V7.33 à V7.37, puis une analyse du chantier n° 4 sur son feu vert explicite, avant toute version.

### Le parcours aujourd'hui

152 étapes : Débutant 15 (fin : synthèse S1), Intermédiaire 34 (fin : M3, A1 puis synthèse S2), Confirmé 49 (fin : A3, C7 puis synthèse S3), Avancé 52 (fin : A2, T5 puis synthèse S4 ; le bloc niveaux et GameInstance après « Le checkpoint », C8 compris), Expert 2 (Projet X2, Projet X1). 182 questions de révision sur les leçons (et 3 sur la fiche de mémo Actor Components). L'ordre est dans `src/core/lessons/index.ts` (`LESSONS`) ; les numéros de leçon sont calculés (`isNumbered` : les leçons `build` sans code, hors transfert/autonomie), les exercices et les étapes à code ont un libellé à eux (P, D, C, R, T, A, S ; M pour Entraînement, X pour Projet).

Cadre posé au lot 0 et à respecter dans toute nouvelle étape :
- **Aide par niveau** (`core/lessons/helpPolicy.ts`) : ouverte en Débutant et Intermédiaire ; à partir du Confirmé, indice après un premier essai, pas de liste des nœuds, solution après réussite (ou 3 vérifications ratées en Confirmé) ; Expert sans indice. Une première marche (`discover`, `guided`) garde sa méthode visible et ouvre sa solution après 3 échecs, à tout niveau (V7.25). Un Prédis garde tout ouvert ; transfert : tout après un essai ; autonomie et synthèse : pas de liste des nœuds. Concrètement, `hints[0]` = piste, `hints[1]` = liste des nœuds, `hints[2]` = solution.
- **Échelle par notion** (`Lesson.chain` : discover, guided, modify, transfer, autonomy ; `LADDER`) ; l'autonomie est différée (`chain.after`).
- **Rappels** (`Lesson.recalls`) : notions anciennes que la solution de référence réécrit vraiment (vérifié par `tests/spacing.test.ts`).
- **Espacement** : cible 15 étapes ; `KNOWN_GAPS` dans `tests/spacing.test.ts` est un cliquet. Le test dit la valeur exacte à mettre quand un écart baisse. Le lot 3b a fait redescendre ce qui traversait le Confirmé ; les écarts commentés « lot 4 » finissent dans l'Avancé, ou sont des notions que le Confirmé n'écrit pas naturellement (maps, player-controller, sequence…). Depuis la V7.16, `writtenNotions` compte par Blueprint.
- **Synthèse** (`kind: 'synthesis'`, `library/synthesis.ts`) : cahier des charges en fin de niveau, conseillé (Home.tsx le propose avant le niveau suivant), jamais bloquant ; elle n'enseigne rien (`teaches: []`) et peut durer 45 min.
- **Projets UE5 après « Les contrôles au Player Controller »** (`l-ei-controleur`) : plus aucun événement de touche. Une leçon écrite avec la touche E passe par `UE5_INPUT` dans `index.ts` (`asEnhancedInput`, `core/lessons/ue5Input.ts`) ; une leçon native appelle `ensurePlayerInput(p, ['E'], { E: 'IA_…' })` dans son setup (exemple : `library/chest.ts`). `tests/ue5Input.test.ts` le vérifie.

### Ce qui reste à faire

Prochains chantiers, dans l'ordre choisi par Tristan le 19 novembre (détail dans BACKLOG.md) : révisions de graphes espacées (fait, V7.27 à V7.30), UMG (fait, V7.33 à V7.37), puis niveaux et GameInstance (fait, V7.46 à V7.51, [PLAN_NIVEAUX.md](PLAN_NIVEAUX.md) ; revu et corrigé, V7.52 à V7.54, [REVUE_NIVEAUX.md](REVUE_NIVEAUX.md)), puis le projet Expert final. Chaque version attend son feu vert.

Restes du plan du parcours, à étudier (BACKLOG.md, « Reste du plan du parcours ») :

1. **Après le plan** (à proposer, rien n'est lancé) : un troisième projet Expert qui assemble la suite narrative avec une sauvegarde (et l'inventaire, s'il faut ajouter les Actor Components) ; réécrire en cahier des charges les fiches « Ce qui est en place » des étapes Avancé existantes ; « S'adapter à l'apprenant » ; un rappel de Player Controller au Confirmé ou à l'Avancé.
2. Dettes connues : pas de déclencheur Tap (T2 utilise Hold + Canceled) ; D1 (Accessed None) reste en Confirmé ; le plan voulait que l'apprenant crée ses variables dès l'Intermédiaire, ce n'est fait que dans les nouvelles étapes.

### Ajouter ou modifier une étape : la liste à cocher

Une étape oubliée dans un de ces fichiers fait échouer un test (c'est voulu) :
1. La définition dans `src/core/lessons/library/<thème>.ts` (petits fichiers par thème) : `setup` (le projet doit contenir au moins un Blueprint, sinon `validateProject` le refuse), `scenario`, `checks` (messages qui disent quoi faire), `solve` (solution de référence), `hints` (3), `cards`, `remember` (> 30 caractères, pas de `\n` littéral dans les fiches). Un Prédis passe par `predictLesson` (`library/predicts.ts`) avec `predict.verify`.
2. Sa place dans `LESSONS` (`index.ts`).
3. `LESSON_NOTIONS` (`core/notions/lessonNotions.ts`) : `teaches` non vide (sauf synthèse), `requires` déjà enseigné plus tôt. Nouvelle notion : `core/notions/catalogue.ts`.
4. Chaque libellé de `Lesson.notions` doit exister dans le glossaire (`core/reference/glossaryData.ts`, champ `names`).
5. Une question de révision (`core/review/bank/lessons.ts`, bonne réponse en premier).
6. `recalls` si la solution réécrit une notion ancienne ; relancer `tests/spacing.test.ts` et suivre ses messages.
7. Si la leçon change le projet de départ d'une étape existante : `revision` + 1 (l'appli signale alors la leçon comme changée).
8. Tests à ajuster selon le cas : `tests/lot2.test.ts` (numéros de « La porte verrouillée » et « La porte qui se referme », durées), `tests/reviewV5.test.ts` (`firstSeen`), `tools/e2e/smoke.py` ligne ~297 (nombre d'étapes attendu, 152 depuis la V7.61) et les sélecteurs `has_text` qui pourraient devenir ambigus (`.first`).
9. Les textes qui renvoient à une leçon la nomment par son **titre**, jamais par son numéro (les numéros bougent).
10. Le correcteur rejoue chaque solution avec des appuis tenus 0,1 s (V7.23) : une étape à touche doit passer quand la touche reste enfoncée quelques images (Started plutôt que Triggered sans déclencheur).

### Livrer une version

Commandes dans « Méthode de travail » plus bas. Récapitulatif :
`npm run lint && npx tsc --noEmit && npm test && npm run build && npx vitest run --config tools/e2e/vitest.config.ts && python3 tools/e2e/smoke.py` (attendre `errors []`), puis version dans `package.json`, une section `V7.x` ici, une ligne dans BACKLOG.md (« Déjà fait »), README.md (nombre d'étapes et de questions), PLAN_PARCOURS.md (état du lot), ARCHITECTURE.md si nouveaux fichiers. Commit sur `main` avec les lignes d'attribution, `git -c push.negotiate=true push origin main`, `gh run watch` (déploiement Pages). Page de test : `python3 tools/make-test-page.py /home/claude/publish/index.html`, puis l'outil Artifact `publish_files` sur le slug `5781960b-ee1f-4517-a493-be206fea22a8` (lien https://claude.ai/artifact/BojAfVYPuqnJcK49BLzdfd) avec la version en cours en `base_version` (la lire avec `get_artifact`). Résumer à Tristan en français, sans jargon, avec quoi tester.

Tristan teste surtout sur son téléphone (Pixel 9 Pro, APK) ; depuis le 2026-11-11 il a aussi l'appli de bureau Claude sur Windows (Node, pas de Python). Il ne pratique pas encore les Blueprints dans Unreal, seulement dans l'appli.

## Le projet

BP Trainer est une appli Android (une PWA empaquetée en APK par PWABuilder) pour apprendre les Blueprints d'Unreal Engine 5 au doigt : un éditeur de graphes fidèle à UE, un interpréteur qui exécute réellement la logique dans un petit monde 2D vu de dessus, un parcours de leçons validées automatiquement et un mode Simulation libre. Ce n'est pas un moteur de jeu : seule la logique Blueprint est reproduite.

- Dépôt : https://github.com/infinitereliefstudio-eng/BP-Trainer, branche `main`.
- Plan V1 validé : [PLAN_V1.md](PLAN_V1.md), copie du Claude Doc https://claude.ai/artifact/RKdx8XcoCQJ1Q1bizened6.
- Page de test : https://claude.ai/artifact/BojAfVYPuqnJcK49BLzdfd, privée, republiée à chaque étape (voir « Publier la page de test »).

## Avec qui, et comment

- **Tristan** (studio Infinite Relief Studio), développeur indé UE5 sur son jeu « Station enterrée ». Il parle **français** : réponses, textes de l'appli et docs en français ; noms des nœuds, pins et panneaux **en anglais comme dans UE**.
- Il teste sur son téléphone (APK, en paysage) et, depuis le 2026-11-11, peut aussi utiliser l'appli de bureau Claude sur Windows. Il ne lance pas de commandes lui-même.
- Il veut **une architecture maintenable et évolutive**, pas de gros fichiers : un fichier par responsabilité, des définitions déclaratives.
- Il veut être sûr que la **logique est simulée de façon générale**, pas seulement les cas des leçons (retour du 7 novembre, après un Set Visibility sur le mesh qui semblait sans effet : c'était l'icône de la lumière dessinée par-dessus). Le runtime ne contient aucun cas particulier de leçon : garder ce principe.
- **Une étape à la fois, avec une porte de validation** : on ne commence l'étape suivante qu'après son feu vert explicite. Quand il lance plusieurs lots d'un coup (« dans l'ordre le plus logique »), on les livre l'un après l'autre, une version chacun.
- Les idées de BACKLOG.md ne se font que sur sa demande.

## État (historique : étapes du plan V1, toutes livrées depuis)

| Étape | Contenu | État |
|---|---|---|
| 1 — Socle de l'éditeur | Canvas, nœuds, fils, gestes, palette, My Blueprint, Details, variables, sauvegarde, export | Validée |
| 2 — Interpréteur et monde 2D | Compilation, interpréteur, niveau, Play (joystick, E/F/Espace, vitesse, frame par frame), Output Log, leçons 1 à 5 | Validée |
| 3 — Communication et débogage | Références, Cast, dispatchers, interfaces, fonctions ; breakpoints, pas à pas, valeurs des pins, Execution Trace, fils animés ; leçons 6 à 11, Prédis P1–P3, Débogue D1–D2 | Validée le 2026-11-07 |
| 4 — Synthèse et APK | Bibliothèque complète (172 définitions, 153 dans la palette), leçon 12, Outliner en direct pendant Play, hors ligne (manifest, service worker, icônes) | Livrée le 2026-11-07 ; APK en place le 2026-11-10 |

### L'APK (en place depuis le 2026-11-10)

- BP-Trainer est public, GitHub Pages publie l'appli (source GitHub Actions) à https://infinitereliefstudio-eng.github.io/BP-Trainer/. Le dépôt racine `infinitereliefstudio-eng.github.io` sert `.nojekyll`, `index.html` (redirection) et `/.well-known/assetlinks.json` (copie dans `hosting/root-site/`).
- Paquet PWABuilder généré par Tristan : Package ID `com.infiniterelief.bptrainer`, empreinte SHA-256 `CB:44:1E:…:4E:A2`, identique dans l'APK et dans `assetlinks.json`. Tristan garde le zip (clé et mots de passe) : ne jamais les mettre dans un dépôt.
- L'APK ouvre le site en plein écran et suit chaque publication sur `main` : un push est une mise en production. Détail dans [APK.md](APK.md).

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

## V7.15 (2026-11-19) : plan du parcours, lot 3a (Confirmé, nouvelles étapes)

Tristan a lancé le lot 3 (« ok on peut passer au lot 3 ») sans répondre à la question du menu pause : choix par défaut, dit à Tristan (pas de widget, Espace). Fait en deux temps comme le lot 2 ; ici les quatre étapes, 107 au total. Tests : `tests/gamePaused.test.ts`, `tests/lot3.test.ts`.

- **Pause du jeu** (runtime) : nœuds **Set Game Paused** (`game.setGamePaused`, Return Value) et **Is Game Paused** (`game.isGamePaused`) dans `nodes/library/controller.ts`, comportements dans `behaviors/controller.ts`, `WorldApi.gamePaused` / `setGamePaused`. `Simulation.gamePaused` (distinct de `paused`, le débogueur) : en pause, une frame ne fait que les Input Actions et le ménage ; ni déplacement, ni overlaps, ni Tick, ni latents, ni Timelines, ni timers, et le temps de jeu ne bouge pas. Les événements de touche ne s'exécutent pas (Execute when Paused décoché, défaut d'UE). Une Input Action n'arrive que si **Trigger when Paused** (`InputAction.triggerWhenPaused`, case dans ses Details, section Action, `setTriggerWhenPaused` dans `inputOps.ts`) ; sinon elle est notée dans `RunRecord.pausedActions` et « Pourquoi ce nœud ne s'est pas exécuté ? » le dit. Play affiche **PAUSED** au centre. Notes Piège et Dans UE. Champ optionnel : pas de changement de format.
- **Choisis ton outil** (`library/chooseTool.ts`, après D2) : trois coins, un outil chacun (borne : Cast To BP_Joueur et Set Sante ; alarme : Event Dispatcher, vérification bloquante « l'alarme ne connaît aucun gyrophare » : pas de variable objet, pas de Get All Actors, pas de nœud qui vise BP_Gyrophare ; disjoncteur : liste `Appareils` déjà réglée, trois classes, interface, vérification bloquante sans Cast). Notion de catalogue `choose-tool`, fiche de glossaire « Cast, Dispatcher ou Interface ».
- **Débogue D21 « Qui a éteint la lumière ? »** (`library/whoTurnedOff.ts`, après D12) : huit Blueprints ; BP_Lampe a les Custom Events Eteindre et Allumer, appelés par BP_Interrupteur (légitime, à la sortie), BP_Detecteur (Allumer) et BP_Ventilation (reste d'un test, 2 s après le lancement). Find References sur Event Eteindre + All Blueprints donne les deux appelants (testé). Une variable `Lumiere` dans BP_Generateur montre la différence avec une recherche par mot. Notion `find`, fiche « Find References ».
- **Refactor R4 « Interagir comme dans UE5 »** (`library/interactUe5.ts`, après P8) : le départ est le réflexe UE4 gardé au lot 1 (Auto Receive Input, `bProche` par overlaps, IA_Interagir → Branch) dans la lampe, la porte et le générateur ; le coffre ne réagit pas. Bloquant : plus aucun objet n'écoute une entrée ; notions : message d'interface, Auto Receive Input retiré, plus de `bProche`. R3 (Avancé) reprend ensuite avec le Line Trace.
- **Le menu pause** (`library/pauseMenu.ts`, après D11) : BP_Minuteur (timer d'une seconde, « Tic ») ; l'apprenant crée IA_Pause, la met sur Espace dans IMC_Joueur, coche Trigger when Paused, et dans BP_PlayerController bascule la pause (NOT Is Game Paused) avec un message « pause » / « reprise ». Sans Trigger when Paused, la vérification dit pourquoi le jeu reste figé. Notion `pause` (pas dans `SPACED_NOTIONS` : les nœuds `game.*` ne sont pas lus comme une notion).
- Rappels déclarés : Choisis ton outil (overlap, loops, other-bp), R4 (loops), menu pause (enhanced-input, branch).
- **Espacement** : cast 29 → 27, enhanced-input et input 48 → 27, interfaces 35 → 28, loops 22 → 21. Vingt-quatre écarts montent de 1 à 4 (commentés `V7.15`) : les quatre étapes tombent dans les trous qui traversent le Confirmé. C'est le travail du 3b.
- Révision : 4 questions (137). `smoke.py` attend 107 étapes, captures 69 (Trigger when Paused) et 70 (PAUSED), vérifie qu'Espace met en pause et relance.

Version 7.15.0.

## V7.16 (2026-11-19) : plan du parcours, lot 3b (Confirmé, rappels et synthèse)

Lancé par « tu peux passer a 3b ». Fin du lot 3 : 109 étapes. Tests : `tests/lot3.test.ts` (section 3b).

- **Rappels** dans sept étapes Confirmé, chacun dans le cahier des charges (fiche « Rappel : … », un objectif, une vérification), révision + 1 : Choisis ton outil (clignotement par timer), Le générateur prévient (DoOnce « Premier démarrage », scénario avec un 3e appui), Le catalogue (DoOnce, le test repasse devant la lampe), Les badges (composant Porte du lecteur, Set Relative Rotation), La rangée de lampes (Enum `E_Puissance`, variable Puissance, Switch on Enum et Set Intensity dans le Construction Script, vérifiés dans l'éditeur et en jeu), Les vagues (Switch on Int : Éclaireur, Soldat, Boss), L'ascenseur (`OnArrivee` déclaré, BP_Quai déjà abonné ; l'apprenant fait DoOnce → Call ; `liftArrives` dans `timing.ts`, utilisé par la solution et `tests/quality.test.ts` ; les deux autres façons de faire préviennent aussi le quai).
- **Prédis P14 « Qui parle en premier ? »** (`library/predicts3.ts`, après La clôture) : Spawn Actor construit et lance l'acteur avant de rendre la main. Notion `begin-order`.
- **Synthèse S3 « Le poste de garde »** (`library/synthesis3.ts`) : cahier des charges, graphes vides, aucune variable. Vérifications bloquantes : « Badge requis » une fois, badge détruit, Point Light ajoutée aux gyrophares et éteinte au départ, alerte et fin d'alerte, porte fermée en douceur (pas encore fermée à 0,3 s, fermée à 1,3 s), BP_Joueur sans Cast, BP_Pupitre qui ne connaît ni gyrophares ni porte.
- **Espacement** : `writtenNotions` (`notions/practice.ts`) compte les nœuds par Blueprint (un refactor qui déplace une chaîne l'écrit). Détail des baisses et des hausses dans PLAN_PARCOURS.md, « Lot 3b ».
- Révision : 2 questions (139). `smoke.py` attend 109 étapes.

Version 7.16.0.

## V7.17 (2026-11-19) : plan du parcours, lot 4a (l'Avancé)

Lancé par « tu peux passer au lot 4 » ; fait en deux temps comme les lots 2 et 3 (4b = Expert). 113 étapes. Tests : `tests/lot4.test.ts`.

- **Cahier des charges** : `cardsFor(lesson, done)` dans `helpPolicy.ts` garde jusqu'à la réussite, en Avancé et Expert, les fiches dont le titre est dans `PLAN_CARD_TITLES` ; `LessonSheet` dit combien attendent (`.held-cards`). Premier indice des 24 étapes Avancé réécrit en questions (le test l'exige : un « ? » dans `hints[0]` hors Prédis). Objectifs réécrits sans recette pour six étapes (texte seulement, pas de `revision`). Les étapes Complète et Refactor gardent leurs objectifs (leur format est de dire quoi modifier).
- **Le levier universel** (`universalLever.ts`) : niveau avec BPI_Interactif, IMC_Joueur, cibles (porte, lampe, pont au Tablier caché) et deux BP_Plot (Construction Script qui écrit A et B) ; l'apprenant écrit le côté joueur (`playerTells`, exporté), crée BPI_Activable (entrée Etat), BP_Levier, et pose deux leviers. Vérifications : deux BP_Levier à moins de 80 cm des plots, comportement A / B / A, pas de Cast ni de variable typée cible dans BP_Levier.
- **Entraînement mélangé** (`mixed.ts`) : M1 Le sas (aperçu éditeur « Sas : 3 s », porte qui se ferme en 0,5 s vérifiée à mi-course, 3 / 2 malgré un aller-retour, « Ouvert ») ; M2 Le distributeur (BP_Objet créé par l'apprenant, Expose on Spawn, compte par sorte dans une Map, « Vide »). Fiche commune « Un entraînement mélangé », fiche de glossaire.
- **Synthèse S4 « Les fusibles »** (`synthesis4.ts`) : scénario avec `restart` ; un fusible qui lit la liste du joueur au lieu de la sauvegarde échoue dans un des deux ordres (testé).
- Révision : 4 questions (143). `smoke.py` attend 113 étapes, capture 71 (fiche de méthode retenue).

Version 7.17.0.

## V7.18 (2026-11-19) : plan du parcours, lot 4b (Expert)

Lancé par « tu peux enchainer ». Fin du plan du parcours : 115 étapes. Tests : `tests/lot4.test.ts` (section 4b).

- **Niveau Expert** visible à l'accueil (il a des étapes). Aide : seulement la solution, après la réussite (`HELP_RULES.expert`, testé). `cardsFor` garde aussi les fiches de méthode en Expert (il n'y en a pas). Durée estimée jusqu'à 120 min (`tests/lot2.test.ts` l'accepte pour l'Expert).
- **X2 « L'atelier des machines »** (`expertWorkshop.ts`) et **X1 « La radio de la station »** (`expertRadio.ts`, qui exporte `expertScenery` et `EXPERT_RULES`) : voir PLAN_PARCOURS.md, « Lot 4b ». Pièges testés : un contexte de dialogue de même priorité laisse E relancer la conversation ; un ventilateur sans Parent: Tick ne tombe jamais en panne.
- `tests/ue5Input.test.ts` : une action peut être mappée dans un autre Mapping Context que IMC_Joueur (un mode de jeu), toujours sans déclencheur.
- Notion de catalogue `input-mode` ; fiches de glossaire « Projet Expert », « Modes de contrôle », « Journal de faits » ; 2 questions de révision (145). `smoke.py` attend 115 étapes, capture 72 (aide d'un projet Expert).

Version 7.18.0.

## V7.19 (2026-11-19) : chantier Actor Components, étape 1 (le moteur)

Lancé par « tu peux lancer » après l'analyse [PLAN_COMPOSANTS.md](PLAN_COMPOSANTS.md) (Claude Doc https://claude.ai/artifact/XDjSV8p3shFJUTwkwDfzmX) et la validation des cinq recommandations. Aucune leçon : le moteur, les nœuds, la compilation et l'interface. Tests : `tests/actorComponents.test.ts` (14).

- **Modèle** : classe native `ActorComponent` (`ParentClass`, `NATIVE_PARENTS`, `familyOf` : acteurs, SaveGame et composants ne se mélangent pas, `setParentClass` refuse et `FAMILY_REFUSAL` dit pourquoi). Dans un acteur, un composant de type `'ActorComponent'` pointe vers sa classe (`Component.classId`) et garde les valeurs de ses variables Instance Editable pour cette classe d'acteur (`Component.values`, `setComponentValue`) ; un acteur posé peut les changer (`LevelActor.componentOverrides`, `setComponentOverride`). `isSceneComponent` distingue les composants avec une place (racine, Viewport, rendu, collision) des Actor Components, jamais attachés. `addActorComponent` (nom = celui de la classe, comme UE). Supprimer un Blueprint utilisé comme composant est refusé ; le poser ou le faire apparaître aussi. **Format 11** (rien à convertir) ; `validate.ts` retire un composant dont la classe a disparu.
- **Moteur** : `Simulation.attachComponents` crée un objet (`ActorRT` avec `owner`, `componentId`) par Actor Component, pour les acteurs du niveau, le joueur, le contrôleur et les Spawn ; l'acteur garde `logic` (composant → objet). `scripted()` met chaque composant juste avant son acteur : **BeginPlay des composants avant celui de l'acteur** (comme `AActor::BeginPlay`), Tick, latents, timers. Le Get du composant (`var.component`) renvoie l'objet (`{ ref: 'actor' }`), typé par sa classe : Cast, appels de fonctions, Get / Set, dispatchers marchent sans changement. Destroy Actor : **Event End Play** de l'acteur, puis de ses composants, puis Event Destroyed (comme `AActor::Destroyed`) ; les composants partent avec lui. Un message d'interface envoyé à l'acteur ne va pas à ses composants (testé).
- **Nœuds** (`nodes/library/actorComponents.ts`, `runtime/behaviors/actorComponents.ts`) : Get Owner (composant), Get Owner (acteur, toujours None ici), Get Component by Class et Get Components by Class (pin Component Class : Blueprints composants et classes natives StaticMeshComponent…, sortie typée), Event End Play (End Play Reason, enum `EEndPlayReason`), « On … (Composant) » (`event.componentDispatcher`, le + vert d'UE : appelé par `dispatcher.call` sur l'acteur porteur, sans Bind), Bind / Unbind Event to On Actor Begin / End Overlap (`dispatcher.bindNative`, `nodes/library/nativeDispatchers.ts` ; diffusés par `overlaps.ts` après l'événement d'overlap, Custom Event avec Overlapped Actor et Other Actor).
- **Compilation** : `selfType` (Target laissé à self alors que self n'est pas de la bonne classe : « self is not a Actor », avec Get Owner proposé) ; `notInComponent` (`NOT_IN_COMPONENT` : overlap, Hit, clic, Event Destroyed, entrées, Timeline, Construction Script). La palette d'un composant les cache aussi ; chaque Get Owner n'est listé que là où il a un sens (l'autre en recherche ou en tirant un fil).
- **Interface** : Pick Parent Class › Actor Component ; l'éditeur d'un composant n'a ni Viewport, ni Construction Script, ni section Components (« My Blueprint ») ; Class Settings du composant (Parent Class de sa famille, interfaces, « Utilisé par », aide « est un / a un ») ; Components › + Add d'un acteur propose d'abord les Actor Components du projet, listés sous l'arbre ; leurs Details (`LogicComponentDetails.tsx` : nom, classe, Edit Blueprint, variables Instance Editable, Events avec le + vert) ; Details d'un acteur posé : une section par composant ; Debug : la copie déboguée « BP_Sante (BP_Lampe) » (`Simulation.instancesOf`, `objectById`) ; Outliner en direct : les variables de chaque composant.
- Mémo « Actor Components » (`m-actor-components`, 2 questions), glossaire « Actor Component », notes Piège et Dans UE des nouveaux nœuds. `smoke.py` : captures 73 à 75.

Non fait, prévu ou hors chantier : Start with Tick Enabled (le Tick tourne s'il y a un Event Tick), Scene Components en Blueprint, Add Component by Class / Destroy Component, Activate / Deactivate. À vérifier dans UE avant d'en faire une leçon : l'ordre de Tick entre un acteur et ses composants (ici, le composant d'abord), les événements Enhanced Input dans un composant (refusés ici).

Version 7.19.0.

## V7.20 (2026-11-19) : chantier Actor Components, étape 2 (leçons de découverte)

Lancé par « tu peux lancer la suite ». Cinq étapes en Avancé, juste après « L'héritage » (120 étapes, 150 questions de révision sur les leçons). Tests : `tests/actorComponentLessons.test.ts` (mauvaises solutions typiques refusées, place dans le parcours), et les tests génériques de chaque étape.

| Étape | Fichier | Ce qu'elle fait travailler |
|---|---|---|
| Prédis P15 « Qui commence ? » | `componentOrder.ts` | Le BeginPlay d'un composant passe avant celui de son acteur (contrairement à deux acteurs). Échelle `actor-components` : discover |
| Refactor R5 « La santé est partout » | `healthEverywhere.ts` | Trois acteurs sans parenté recopient la santé : BP_Sante (Actor Component) créé par l'apprenant, Vie réglée par composant, « On OnMort (BP_Sante) ». Échelle : guided. Fiche « La réécriture » gardée jusqu'à la réussite |
| Débogue D22 « Le scanner et le chariot » | `scanner.ts` | Get Component by Class sur un acteur sans santé : None, puis Accessed None et une « Vie : 0 » inventée ; correction Is Valid + « Rien à mesurer » |
| Transfert T3 « Le piège qui blesse tout » | `trapAll.ts` | Écrire le piège : Get Component by Class + Is Valid, aucun Cast ; caisse détruite, drone à 30, mur intact, joueur à 50. Échelle : transfer |
| Leçon « Le verrou à badge » | `badgeLock.ts` | Parent ou composant : les portes ont un parent, le verrou (BP_Verrou) est un composant posé sur la porte blindée et sur le terminal ; Bind Event to On Actor Begin Overlap sur Get Owner, Event Dispatcher, valeurs par acteur ; la porte blindée redéfinit Ouvrir (Parent: Ouvrir). Cas « Et si… » : badge 3 au terminal |

- `library/health.ts` : BP_Sante fini (`healthComponent`, `writeHealth`), `lifeOf` (Vie d'un acteur pendant le scénario), `carries`, `isComponentClass`.
- Notion de catalogue `actor-components` (nœuds Get Owner, Get Component(s) by Class, « On … (Composant) », Bind Event to On Actor Begin Overlap dans `practice.ts`) ; fiches de glossaire « Parent ou composant », « Les événements d'un composant », « Is Valid » ; 5 questions de révision.
- Espacement : l'insertion a allongé de 5 les écarts qui la traversent (`KNOWN_GAPS` mis à jour) ; `actor-components` (22, jusqu'à la fin du parcours), `input`, `enhanced-input` et `loops` (16) sont notés pour la V7.21 et la V7.22. Rappels déclarés : R5 (functions, dispatchers), D22 (print), T3 (overlap, functions), verrou (cast, dispatchers, inheritance).
- `smoke.py` attend 120 étapes, captures 76 à 78.

Version 7.20.0.

## V7.21 (2026-11-19) : chantier Actor Components, étape 3 (usages)

Lancé par « ok tu peux passer à la suite ». Quatre étapes en Avancé, chacune après l'étape sur laquelle elle s'appuie (124 étapes, 154 questions de révision sur les leçons). Tests : `tests/actorComponentLessons.test.ts` (mauvaises solutions typiques, place dans le parcours), et les tests génériques de chaque étape.

| Étape | Fichier | Place | Ce qu'elle fait travailler |
|---|---|---|---|
| Leçon « Interagir par composant » | `componentInteraction.ts` | après « Regarder et interagir » | BP_Interaction (Action Instance Editable, Interagir, OnInteragir) créé par l'apprenant et posé sur lampe, porte, coffre ; E (IA_Interagir, via `UE5_INPUT`) → Get Overlapping Actors → For Each → Get Component by Class → Is Valid → Interagir ; chaque acteur réagit par « On OnInteragir ». Pas de Cast. Cas « Et si… » : un terminal reçoit le composant. Fiche « Interface ou composant ? » |
| Débogue D23 « La batterie qui ne sait pas où elle est » | `battery.ts` | après D6 | Le graphe de BP_Drone déplacé dans BP_Batterie ne compile plus : Get Distance To sans Target (self est le composant). Correction : Get Owner. Cas « Et si… » : chargeur déplacé |
| Leçon « Le sac et le coffre » | `componentInventory.ts` | après C5 | BP_Inventaire donné (Objets, Ajouter, Vider) ; l'apprenant écrit Retirer (Remove Item), l'ajoute au joueur, fait donner le coffre (For Each sur son propre Inventaire, Ajouter sur l'inventaire trouvé, Vider) et prendre le fusible par le boîtier. Cas « Et si… » : trois objets dans le coffre |
| Autonomie A2 « L'énergie de la station » | `stationEnergy.ts` | après « Le réseau en boucle », avant S4 ; 2 jours après T3 | Cahier des charges seul : une réserve qui se vide (Tick dans le composant), réglée par lampe posée (3 et 1), porte à 2, prévenir une fois, jamais sous 0. Échelle `actor-components` : autonomy |

- `health.ts` : `componentVar` (une variable du composant d'un acteur pendant le scénario), `lifeOf` passe par lui.
- Espacement : `actor-components` revient désormais au moins toutes les 8 étapes (retiré de `KNOWN_GAPS`) ; l'insertion a allongé de 1 à 4 les écarts qui la traversent (`KNOWN_GAPS` mis à jour) ; `trace` passe à 16 (jusqu'à la fin du parcours) et rejoint `input`, `enhanced-input` et `loops` (16) pour la V7.22. Rappels déclarés : interaction (input, enhanced-input, loops), sac (arrays, loops, functions), A2 (tick, dispatchers).
- `smoke.py` attend 124 étapes, captures 79 à 81 (fiche de l'interaction, erreur de compilation de la batterie, Objets de l'inventaire du coffre dans les Details).

Version 7.21.0.

## V7.22 (2026-11-19) : chantier Actor Components, étape 4 (reprise de l'existant)

Lancé par « tu peux lancer la suite ». Le chantier est terminé.

- **Rappels dans l'Avancé** (plus aucun écart à 16) : « La salle de contrôle » (`controlRoom.ts`, `revision: 2`) donne un BP_Joueur au graphe vide ; l'apprenant y réécrit IA_Interagir → Get Overlapping Actors → For Each → Interagir (rappels input, enhanced-input, loops, interfaces ; nouvelle fiche « Le joueur »). M2 « Le distributeur » (`mixed.ts`, `revision: 2`) : BP_Joueur vide, et une **BP_Poubelle** à portée, derrière le joueur, qui répond « Poubelle » ; E doit agir sur ce que le joueur regarde : Line Trace (rappels trace, input, enhanced-input ; check `aim`). `input`, `enhanced-input`, `loops` et `trace` sortent de `KNOWN_GAPS` (toutes à 15 au plus ; input et loops sont pile à 15 entre S3 et la salle de contrôle : une étape insérée là les ferait repasser au-dessus).
- **Conseil « Chaîne copiée entre Blueprints »** (`core/quality/copiedAcross.ts`, appelé par `adviceFor` à partir de l'Avancé) : la même suite de 3 nœuds dans plusieurs Blueprints (comparés par titre, Get/Set avec le nom de la variable, valeurs hors textes). Même famille : l'écrire dans le parent commun ; sinon : un Actor Component (ce qu'ils ont) ou un parent (ce qu'ils sont). Aucune solution connue d'étape ne le déclenche ; il apparaît sur le projet de départ de R5 (capture 82).
- **Fiches** : « L'héritage » a une fiche « Est un, ou a un ? » (annonce des étapes suivantes) ; X2 et S4 ont une fiche **« Pour aller plus loin »** (le carburant en composant ; les fusibles dans BP_Inventaire), gardée jusqu'à la réussite comme les fiches de méthode (`PLAN_CARD_TITLES` dans `helpPolicy.ts` ; texte de l'avis dans `LessonSheet.tsx` élargi).
- **Étude de S4** : la synthèse ne change pas (elle porte sur la sauvegarde et l'ordre des BeginPlay ; les composants ont déjà leur autonomie A2 juste avant). La version composant est proposée en fiche « Pour aller plus loin ».
- **Glossaire, mémo, révision** : entrée « Interface ou composant » (notion de « Interagir par composant ») ; paragraphe « Interface ou composant ? » dans la fiche de mémo Actor Components ; une troisième question de mémo.
- Tests : `tests/quality.test.ts` (le conseil, famille ou non, niveau), `tests/actorComponentLessons.test.ts` (« V7.22 recalls »). `smoke.py` : capture 82.

Version 7.22.0.

## V7.23 (2026-11-19) : revue, lot 1 (changer de contexte comme dans UE)

Lancé par « tu peux lancer les corrections dans l'ordre que tu considères le plus logique ».

- **Ignore All Pressed Keys Until Release** (`runtime/enhancedInput.ts`) : option de Add et Remove Mapping Context (config `ignorePressed`, cochée par défaut comme dans UE, dans Details). Un changement de contextes calcule les associations accessibles avant et après (`liveMappings`) ; celles qui deviennent actives sur une touche tenue sont ignorées jusqu'au relâchement, tout en gardant la touche aux contextes du dessous. Règles de simulation version 4 (`model/rules.ts`).
- **Appui tenu dans le correcteur** (`lessons/runner.ts`, `heldTaps`) : une solution qui passe dans l'ordre du niveau et dans l'ordre inverse est rejouée avec chaque appui tenu 0,1 s (pris sur l'attente qui suit quand il y en a une) ; un échec donne `HOLD_NOTE` (Triggered se répète tant que la touche est tenue). Toutes les solutions de référence passent ; c'est ce qui révélait X1.
- **X1** : le check `opens` refuse R2 dès le premier appui, avec un message qui nomme l'option.
- Glossaire « Modes de contrôle » : le piège de l'option décochée. Note d'explication de Add Mapping Context à jour.
- Tests : `tests/heldKeys.test.ts`, `tests/enhancedInput.test.ts` (« Ignore All Pressed Keys Until Release »).

Version 7.23.0.

## V7.24 (2026-11-19) : revue, lot 2 (actions reçues par tous)

- **Plus de Consume Input sur l'événement d'une Input Action** (`nodes/library/enhancedInput.ts`, `Interpreter.fireAction`) : dans UE, K2Node_EnhancedInputAction n'a pas cette propriété ; tous les acteurs de la pile qui écoutent l'action la reçoivent, du haut vers le bas. La priorité entre Mapping Contexts reste le seul arbitrage (déjà en place). Les événements de touche gardent leur Consume Input. Une ancienne config `consumeInput` sur un `input.action` est simplement ignorée. Règles de simulation version 5.
- Les 40 étapes qui utilisent des actions passaient déjà sans cette consommation (vérifié pendant la revue) : aucune solution ne change.
- **Textes** : R4 « Interagir comme dans UE5 » (fiches « Ce qui est en place » et « Ce qui cloche »), défi de « Les contrôles au Player Controller », glossaire Consume Input (les actions n'ont pas la case), note « Dans UE » de l'événement d'action.
- **`runtime/inputStack.ts`** : la pile des entrées sortie de `simulation.ts` (`buildInputStack`, `sendKey`, `sendAction`, `keyKept`).
- Tests : `tests/enhancedInput.test.ts`, `tests/playerController.test.ts` (le pion entend aussi l'action).

Version 7.24.0.

## V7.25 (2026-11-19) : revue, lot 3 (aide et repères)

- **Première marche d'une notion** (`helpPolicy.ts`, `isFirstRung`) : une étape `discover` ou `guided` d'une chaîne garde ses fiches de méthode visibles et ouvre sa solution après 3 vérifications ratées, quel que soit le niveau. Concerne en Avancé R5 « La santé est partout » et « L'héritage », qui reçoit `chain: { notion: 'inheritance', step: 'guided' }` (pas d'autre marche pour cette notion). Texte d'aide de l'Avancé (`levels.ts`) à jour. Les autres étapes de l'Avancé gardent leur cahier des charges.
- **Libellés** (`types.ts`, `isNumbered`) : une étape `build` avec un code n'est plus une leçon numérotée. **Entraînement M1** « Le sas », **Entraînement M2** « Le distributeur », **Projet X2** « L'atelier des machines », **Projet X1** « La radio de la station » (codes = début de l'id ; l'ordre X2 puis X1 est gardé pour ne pas désaccorder ids et docs). Les leçons qui suivaient M1 perdent un numéro (Leçon 57 → 56…) ; les textes nomment les leçons par leur titre. Bandeaux sur l'accueil.
- **Durées** (`duration.ts`) : comptées sur le travail réel, sur une copie du projet de départ (nœuds ajoutés, nœuds retirés à 0,3, assets créés : Blueprint 3, interface, enum, structure, table 2, variable, dispatcher, fonction, composant, action, contexte 1) ; Débogue entre 10 et 20 min. R5 : 5 → 30 min ; « Les contrôles au Player Controller » : 5 → 20 min ; 29 étapes changent, total 2 095 → 2 370 min.
- Renumérotage des codes (P, D…) dans l'ordre du parcours : laissé de côté (optionnel).
- Tests : `tests/helpPolicy.test.ts` (« lot 3 »). `smoke.py` : R5 montre « La réécriture » avant la réussite.

Version 7.25.0.

## V7.26 (2026-11-19) : revue, lot 4 (retouches)

- **Barre d'outils** (`app.css`) : les boutons ne rétrécissent plus (`.toolbar > * { flex-shrink: 0 }`), libellés entiers (« Class Settings », pas « Class Settinc ») ; marges resserrées sous 960 px ; la barre défile si elle est trop étroite. À 800 × 370, tout tient (capture 02).
- **Restauration** (`storage.ts`, `enqueueAll`) : `writeMany` passe par la file d'écriture de ses clés, inscrit dès l'appel ; une sauvegarde demandée pendant une restauration s'écrit après elle, une lecture l'attend.
- **CI** (`.github/workflows/deploy.yml`) : actions sur Node.js 24 (checkout v5, setup-node v5, upload-artifact v6, download-artifact v7, configure-pages v6, upload-pages-artifact v5, deploy-pages v5).
- **HANDOFF.md** : sections anciennes remises à jour (téléphone seul, APK à faire, validations d'étapes) ; la reprise rapide reflète la fin de la revue.
- Tests : `tests/storage.test.ts` (« a restore goes through the write queue »).

Version 7.26.0. La revue est terminée.

## V7.27 (2026-11-19) : révisions de graphes espacées, étape A (journal des essais)

Tristan a lancé le chantier n° 2 le 19 novembre (« tu peux lancer ») ; livré une étape à la fois.

- **Modèle** (`core/progress/attempts.ts`) : `Progress.log = { v: 1, attempts: Attempt[] }`. Un essai = une étape (`lesson`, `rev` = `Lesson.revision ?? 1`), `start` / `end`, `checks` (nombre de Vérifier), `passed`, `again` (étape déjà réussie au début de l'essai), `help` et `hints` (l'aide au dernier Vérifier ; elle ne fait que croître jusqu'à Recommencer), `errors` (nombre de Vérifier par catégorie), `failed` (par id de vérification bloquante), `missed` (notions visées manquées), `closed` (Recommencer). Un Vérifier rejoint l'essai ouvert de l'étape, sinon en ouvre un : nouvel essai après une réussite, Recommencer, un changement de `rev` ou 2 h sans Vérifier (`ATTEMPT_GAP`). 1 500 essais gardés au plus (`MAX_ATTEMPTS`). Ni gestes, ni graphes.
- **Catégories** (`core/lessons/outcome.ts`, `checkOutcome`) : `compile`, `accessed-none`, `runtime`, `never-fired` et `not-reached` (tirés de `whereItStopped`, comme « Montre-moi »), `order` (`ORDER_NOTE`), `hold` (`HOLD_NOTE`).
- **Branchement** : `App.verify` appelle `onChecked(checkOutcome(run))` avant `onHelp` et `onLessonPassed` ; `Root` en fait `withCheck` (qui compte aussi le jour comme actif). `withHelpReset` (Recommencer) ferme l'essai ouvert. Seules les étapes du parcours sont notées (pas les autres façons de faire ni la solution ouverte).
- **Stockage** : dans la clé `progress`, donc dans la sauvegarde complète sans autre changement. `checkProgress` refuse une restauration dont une ligne est mal formée ; `sanitizeProgress` écarte seulement les lignes mal formées ; un journal d'une version plus récente est gardé tel quel et jamais réécrit (`readableLog`). `HelpLevel` passe dans `core/progress/helpLevel.ts` (réexporté par `progress.ts`).
- **Interface** : Carnet › « Journal des essais » (`ui/home/AttemptLog.tsx`), replié en tête de l'onglet (caché pendant une recherche) : les 30 derniers essais (Tout afficher), statut, vérifications, aide, catégories d'erreur et vérifications ratées par libellé ; « Effacer le journal » (`withoutLog`, après confirmation). C'est une vue de contrôle : la file de l'étape B s'en servira.
- **Tests** : `tests/attempts.test.ts` (18 : regroupement, nouvel essai, Recommencer, aide, plafond, stockage, version plus récente, catégories, et pour chacune des 124 étapes : le départ échoue avec des ids connus, la solution passe sans vérification ratée). `tools/e2e/smoke.py` garde le journal écrit par les Vérifier quand il remplace la progression, puis vérifie l'essai réussi dans le Carnet (capture `51b_attempt_log`).

Version 7.27.0. Suite : étape B (file « À retravailler en Blueprint »), sur feu vert.

## V7.28 (2026-11-19) : révisions de graphes espacées, étape B (file « À retravailler en Blueprint »)

Lancée par Tristan le 19 novembre (« tu peux lancer l'étape b »).

- **Calendrier** (`core/rework/schedule.ts`) : par notion, en jours, **recalculé à chaque fois** à partir du journal des essais ; rien n'est stocké que les choix de l'élève. Événements (`practiceEvents`) : chaque essai terminé (réussi, Recommencer, ou laissé 2 h sans Vérifier : `attemptOver`), plus, pour une étape réussie dont la réussite n'est pas dans le journal (avant la V7.27), une réussite à `doneAt` (0 si absent : dû tout de suite) avec `passedWith`. Une notion entre à la première réussite d'une étape qui l'enseigne (`LESSON_NOTIONS.teaches`) : J+1. Ensuite : réussite sans aide alors qu'elle était due (à 12 h près) → boîte suivante (1, 3, 7, 14, 21 jours, puis 21) ; sans aide avant l'échéance → rien ne bouge ; avec indices → même intervalle ; solution vue ou essai sans réussite → J+1. Comptent les étapes où l'on construit ou répare (`countsForRework` : ni Prédis, ni synthèses, ni projets Expert). Une autre étape qui enseigne la notion compte comme une pratique.
- **Choix de l'élève** (`Progress.rework`, vérifié par `checkProgress`) : `postponed[notion] = { at, until }` (« Reporter à demain » ; tient jusqu'à la prochaine pratique de la notion) et `open` (reprises commencées et pas encore réussies : rouvertes telles quelles ; sinon une reprise repart du projet de départ).
- **Étape proposée** (`core/rework/suggest.ts`) : parmi les étapes réussies qui comptent et enseignent la notion, pas celle pratiquée la dernière fois s'il y en a une autre ; boîtes 0 et 1 : la plus courte ; ensuite une étape Débogue, Complète, Refactor, transfert ou autonomie avant une construction simple. Les notions dues qu'une même étape pratique sont réunies sur une carte (`reworkCards`), les étapes qui les couvrent toutes en premier. `whyNow` : une phrase sur la dernière pratique et la suite.
- **Reprise de zéro** : espace de travail `{ kind: 'practice', lessonId }` (`ui/workspace.ts`), clé `project:practice:<id>` (dans la sauvegarde complète), ouvert avec `fresh` sauf si la reprise est dans `rework.open`. Aide comptée sous `practice:<id>`, essais du journal marqués `practice: true` (séparés de ceux de la leçon), jamais `withPassed` ni `last`. Dans l'éditeur : bandeau « Reprise de zéro » (ambre, comme les autres espaces à part) avec « Retour à la file », pas de bouton Suivant ; la fiche de la leçon se comporte comme avant réussite (fiches de méthode cachées en Avancé). Retour : onglet Révision (`Home.initialTab`).
- **Interface** : Révision › « À retravailler en Blueprint » (`ui/home/ReworkQueue.tsx`) sous les questions : trois cartes, puis « Voir les N autres » ; par carte, notions, raison, étape et durée, « Refaire de zéro » (ou « Reprendre où j'en étais »), « Une autre étape », « Reporter à demain ». Le compteur de l'onglet Révision et le bandeau de l'accueil comptent aussi les cartes (« 3 questions à revoir et 2 Blueprints à refaire »).
- **Tests** : `tests/rework.test.ts` (21 : étapes qui comptent, intervalles, à l'avance, indices, solution, Recommencer, essai abandonné, étapes d'avant le journal, report, reprise à part, sauvegarde, étape proposée, cartes). `tools/e2e/smoke.py` : file présente, reprise ouverte avec son bandeau, retour à Révision (captures `52b_rework_queue`, `52c_practice`).

Hypothèses à revoir à l'usage : les intervalles (point de départ de l'analyse), la tolérance d'une demi-journée, l'abandon compté comme un échec après 2 h. Les familles de mini-exercices (étape C) remplaceront « une étape à refaire » comme pratique proposée.

Version 7.28.0. Suite : étape C, sur feu vert.

## V7.29 (2026-11-19) : révisions de graphes espacées, étape C (mini-exercices à variantes)

Lancée par Tristan le 19 novembre (« tu peux lancer c »).

- **Modèle** (`core/drills/`) : une famille réunit des **situations** ; une situation sait construire son niveau (`base`, variables comprises, graphe vide), sa **chaîne de référence** (`chain`, qui rend ses nœuds par rôle), vérifier le comportement (`scenario`, `checks`, messages qui disent quoi faire), et l'abîmer de façon typique (`mistakes`, avec `applies` quand une erreur ne se voit que dans une variante). Un mini-exercice est une `Lesson` ordinaire (`Lesson.drill`), donc l'éditeur, le correcteur, l'aide, le journal et l'espace de reprise marchent sans changement. Formats : **complete** (deux ou trois nœuds retirés, leur place marquée d'un cadre jaune nommé, `kit.gap`), **repair** (`kind: 'debug'`, une erreur typique, fiche « La méthode »), **rebuild** (graphe vide). La solution vide le graphe et reconstruit la chaîne.
- **Graine** (`make.ts`, `rng.ts` = mulberry32) : id `drill:<famille>:<graine>` ; situation = graine % S, format = ⌊graine / S⌋ % 3, puis nombres, variante, trous ou erreur tirés de la graine. Le même id redonne toujours le même exercice (`getLesson` le résout).
- **Familles pilotes** (Tristan est vers l'étape 10) :
  - **Variables et Branch** (`variables`, `branch`, Débutant) : le compteur de passages (alerte **à partir du** Ne passage ou **seulement au** Ne : >= ou ==), le distributeur (crédits, Branch à deux sorties), l'interrupteur (NOT, lumière allumée ou éteinte au départ). Erreurs : Increment ou Decrement à côté du fil, affichage avant l'Increment, seuil décalé d'un, == et >= inversés, alerte sur False, condition >= 0, True et False inversés, sans NOT, lumière réglée avant l'inversion, mauvais composant visé.
  - **Overlaps et événements** (`overlap`, `events`, Débutant) : la plaque de pression (ou l'inverse : la lumière s'éteint quand on marche dessus), le portique (BeginPlay, entrée, sortie ; ou rien à l'entrée), « Qui est dans la zone ? » (avec une **caisse** déjà dedans : un overlap compte tout acteur). Erreurs : pas d'End Overlap, même valeur aux deux Set Visibility, Begin et End inversés, « Prêt » sur un overlap, sortie sur Begin Overlap, Print hors du fil, sortie qui ajoute.
  - **Cast To** (`cast`, `other-bp`, Intermédiaire) : le bonus (une **caisse** le touche dès le lancement, ou **deux** bonus : ajouter, pas remplacer), le terminal à badge (le joueur l'a ou non ; caisse devant), le levier et son sas (**deux** leviers et deux sas : le sien seulement). Erreurs : Object non relié, suite sur Cast Failed, Set au lieu d'ajouter, le terminal lit **son propre** bBadge, Cast Failed qui répond, premier sas trouvé (Get Actor Of Class), case décochée.
- **Aide** : un mini-exercice est traité comme un transfert (`helpPolicy`) : indices après un premier Vérifier. Durée : 3 min à compléter, 5 sinon (`duration.ts`).
- **File** (`core/rework/suggest.ts`) : les notions d'une même famille partagent une carte, et sa première proposition est un mini-exercice (`drillFor` : celui laissé en cours, sinon le suivant), au format de la notion la moins avancée (`formatForBox` : J+1 compléter, puis reconstruire, puis réparer, ensuite l'un ou l'autre) ; la situation change à chaque mini-exercice tenté (`nextDrillId`). Les étapes réussies restent proposées ensuite (« Une autre étape »). Un mini-exercice compte pour toutes les notions de sa famille (`reworkNotions`). Carte : « Mini-exercice · <situation> · à compléter », bouton Commencer ; bandeau « Mini-exercice » dans l'éditeur.
- **Tests** : `tests/drills.test.ts` (286 : pour 36 graines par famille, projet de départ valide et qui échoue, solution qui passe ; pour chaque situation, six tirages et chacune de leurs erreurs typiques échoue avec une raison ; textes, glossaire, formats, situations qui changent). `tests/rework.test.ts` (+6 : cartes par famille, mini-exercice réussi, raté, id qui le reconstruit). Smoke : mini-exercice ouvert depuis la file, cadres jaunes dans le graphe (capture `52d_drill_graph`).

À étendre plus tard (BACKLOG, après un pilote réussi) : Dispatchers, interfaces, composants ; exercices à réordonner. Version 7.29.0. Suite : étape D (hypothèse avant l'indice), sur feu vert.

## V7.30 (2026-11-19) : révisions de graphes espacées, étape D (hypothèse avant l'indice)

Tristan a demandé « l'étape c » une seconde fois ; la question lui a été posée, il a choisi l'étape D. Le chantier n° 2 est terminé.

- **Cœur** (`core/explain/hypothesis.ts`) : trois causes (`HYPOTHESES` : l'événement, la référence, la condition ou une valeur) et « Je ne sais pas encore ». `asksHypothesis` : les étapes `kind: 'debug'`, donc les Débogue et les mini-exercices à réparer. `diagnose(run)` part de la course seule : Accessed None → référence ; puis `whereItStopped` (qui donne maintenant `Stop.after`, la définition du nœud qui s'est exécuté sans continuer) : événement jamais déclenché → événement, Cast jamais réussi → référence, Branch jamais sorti d'un côté → condition ; sinon rien (une valeur, l'ordre des nœuds). Sur les 23 Débogue du parcours, 13 sont diagnostiqués. `hypothesisFeedback` : « Bien vu, c'est … » / « Ça désigne plutôt … » / « La vérification ne tranche pas : teste ton hypothèse (Print String, breakpoint) ».
- **Interface** : dans l'onglet Aide de la fiche, tant que le premier indice est ouvert mais pas montré et qu'aucune hypothèse n'est donnée, la question (`ui/lesson/HypothesisAsk.tsx`) remplace le bouton « Afficher un indice ». Au choix, `App` diagnostique (la dernière vérification si elle a échoué, sinon une vérification lancée pour cela), garde l'hypothèse et ouvre le premier indice ; une carte « Ton hypothèse » reste au-dessus des indices. Aux niveaux où l'indice s'ouvre après un essai (Confirmé et au-delà, mini-exercices), la question vient après le premier Vérifier.
- **Progression** : `LessonHelp.hypothesis = { choice, found?, evidence? }` (vérifié par `checkProgress`, effacé par Recommencer avec le reste de l'aide) ; l'essai du journal garde la première hypothèse (`Attempt.hypothesis = { choice, found? }`), affichée dans Carnet › Journal des essais.
- **Mini-exercices Cast** : l'erreur « Object non relié » (refusée dès la compilation, sans diagnostic) devient « Object du Cast est Self » pour le bonus et le terminal : le Cast ne réussit jamais, ce que la vérification montre.
- **Tests** : `tests/hypothesis.test.ts` (9 : quelles étapes demandent, diagnostics sur D1, D4, D20 et un mini-exercice Cast, réponses, progression). Smoke : D1, Vérifier, question, réponse « la référence » confirmée, premier indice ouvert (captures `16b_hypothesis_ask`, `16c_hypothesis_answer`).

Version 7.30.0. Suite : le chantier n° 3 (UMG minimal), sur feu vert.

## V7.31 (2026-11-19) : retouches de l'interface, lot A (place et lisibilité)

Chantier annexe proposé le 19 novembre au soir ([PLAN_RETOUCHES_UI.md](PLAN_RETOUCHES_UI.md)) ; Tristan a répondu « Fait les deux, fait 0.7 » : les deux lots, un par version, zoom plancher 0,7. Pas de refonte : noms et places de l'interface à la manière d'UE inchangés.

- **Barres** : leurs hauteurs sont des variables CSS (`--doc-h` 36, `--tb-h` 40, `--goal-h` 36, `--bottom-h` 34, `--fab` 40). Media query « Compact landscape » (`orientation: landscape` et `max-height: 480px`, donc un téléphone en paysage) : 32, 34, 30, 28, 36. À 800 × 370, le graphe passe d'environ 224 à 246 px de haut.
- **Boutons flottants** (`App.tsx`, `.fabs`) : une colonne `.fab-rail` en haut à droite (↶ ↷, Sélection en icône SVG `ui/widgets/icons.tsx` avec aria-label, aria-pressed et title, ⌖) et le + seul en bas à droite, au-dessus de la barre du bas. Le niveau et le Viewport ont la même colonne.
- **Cadrage** (`editor/framing.ts`) : il ne réserve plus 80 px en bas (`FAB_BAND`) mais 52 px à droite (`FAB_RAIL`) et la barre du bas (`BOTTOM_BAR`), marge 32 au lieu de 56 ; plancher `READABLE_ZOOM` 0,6 → 0,7 (choix de Tristan). Les noms des pins passent d'environ 7 à 8,5 px à l'ouverture. Le niveau et le Viewport cadrent pareil.
- **Messages** (toasts) : en bas à droite, à gauche de la colonne, plus petits ; en haut pendant Play (joystick et touches en bas) et quand un panneau du bas est ouvert (`.workspace.bottom-open`).
- **Objectifs repliés** : l'onglet « Objectifs ▾ » était placé à 46 px du haut de l'appli, trop haut depuis les deux barres de la V7.5 ; il est maintenant ancré sous la barre d'outils (`.goal-tab-anchor`).
- **Smoke** : après `02_lamp_graph`, vérifie que le graphe garde au moins 240 px de haut en paysage et que la colonne et le + ne se chevauchent pas. Écart constaté sans lien avec ce chantier : D15 (« Les meubles sur une grille tournée ») ouvre un Event Graph vide, comme en V7.30.

Version 7.31.0.

## V7.32 (2026-11-19) : retouches de l'interface, lot B (cohérence et retouches)

Suite directe de la V7.31 (Tristan a lancé les deux lots). Le chantier annexe est terminé.

- **Barre du bas** (`ui/editor/BottomBar.tsx`) : Content Drawer, puis les onglets Compiler Results, Output Log, Debug, Find Results (rôle tab) ; toucher un onglet ouvre son panneau, le retoucher le ferme ; ▴/▾ au bout ouvre Compiler Results ou ferme. Le badge « erreurs » est sur Compiler Results. `BottomPanel` reçoit `tab` et n'a plus sa rangée d'onglets (34 px de plus pour le panneau ouvert).
- **Contrôles de Play** : `PlayControls` (pause, image suivante, vitesses en ambre, temps, erreurs, ☷ Outliner) est rendu dans `LevelToolbar` après Stop, comme la barre Play d'UE ; le « ■ Stop » en double de l'ancienne barre flottante a disparu. Les Print String et les messages remontent en haut de l'écran (10 px au lieu de 56). Smoke : Stop par `.tb`.
- **Accueil en paysage** (même media query) : titre et chips à gauche, Continuer et Simulation libre à droite sur une ligne (la phrase d'accroche est masquée), onglets 32 px, bandeau de révision sur une ligne (texte coupé).
- **Menu** (`overlays/ContextMenu.tsx`) : 280 px de large au lieu de 230, indice sous le libellé, hauteur estimée par item, défilement s'il dépasse l'écran.
- **Timeline** : marges du tracé élargies (`PAD` 52 / 28), libellés de valeurs à 14 px du bord : le « 0 » n'est plus sous un point clé.
- **Couleurs** : variables `--app-*` (ambre propre à l'appli), `--ok-*`, `--err-*` dans `:root` ; 51 couleurs en dur remplacées, sans changement visible (#8a2b2b fondu dans #8a2a2a).

Version 7.32.0.

## V7.33 (2026-11-20) : chantier UMG, le Widget Blueprint et son Designer

Lancé par Tristan (« tu peux lancer ») après ses réponses au plan ([PLAN_UMG.md](PLAN_UMG.md), « Décisions du 20 novembre »). Aucune étape du parcours ne change.

- **Modèle** : `ParentClass` `UserWidget`, famille `widget` (`familyOf`) : pas de composants, jamais posé (`placeActor` refuse en citant Create Widget), pas d'héritage entre Widget Blueprints (`setParentClass`, simplification de l'appli, dite dans Class Settings). `BlueprintClass.widgets` : l'arbre du Designer, à plat, dans l'ordre de l'arbre (`core/model/widgets.ts` : `WidgetNode` avec `kind`, `parent`, `isVariable`, `props`, `slot`, `classId` pour un User Widget ; défauts, libellés, préréglages d'ancres). Un Widget Blueprint neuf n'a pas de racine, comme UE5. `PROJECT_FORMAT` 12 (rien à convertir) ; `serialization/validate.ts` vérifie l'arbre (type inconnu refusé ; orphelin, seconde racine et User Widget dont la classe a disparu écartés ; propriétés manquantes remises).
- **Opérations** (`core/operations/widgetOps.ts`) : `addWidget` (la racine d'abord ; ensuite dans le panneau visé, ou à côté d'une feuille ; un Button prend un seul enfant ; un User Widget ne peut pas se contenir, `widgetClassContains`), `removeWidget` (avec les nœuds `var.widget` qui le lisaient), `renameWidget` (noms uniques avec variables et composants : `namesInUse` de classOps les compte), `setWidgetIsVariable`, `updateWidgetProps`, `updateWidgetSlot`, `setWidgetAnchors` (garde le widget en place), `moveWidgetBy` et `roundWidgetOffsets` (glisser dans un Canvas Panel), `moveWidgetOrder`, `wrapWidget` (Wrap With), `moveWidgetInto`, `widgetUsers` (un Widget Blueprint placé ailleurs ne se supprime pas). Un Button est Is Variable d'office, les autres non.
- **Mise en page** (`core/umg/layout.ts`, sans DOM) : taille voulue puis placement, comme Slate. Canvas Panel (ancres en point ou étirées, Position/Size ou marges, Alignment, Size To Content, ZOrder pour l'ordre de dessin), Vertical et Horizontal Box (Auto / Fill avec ratio, Padding, alignements), Overlay, Button (contenu centré avec son padding), User Widget (la classe placée dessinée dans son slot, chemins `w1/w7`). Collapsed ne prend pas de place, Hidden la garde ; ni l'un ni l'autre n'est dessiné. Écran du Designer : `DESIGN_W` × `DESIGN_H` = 1280 × 720 ; polices en points (× 4/3), largeur de texte estimée (`CHAR_W`). `PropsOverride` servira au jeu (Set Text…).
- **Designer** (`ui/designer/DesignerView.tsx`) : l'écran mis à l'échelle (environ ×0,34 sur le téléphone en paysage), widgets dessinés en HTML par `ui/umg/WidgetSurface.tsx` (servira aussi en Play), pointillés autour des panneaux comme UE, sélection avec étiquette. Toucher sélectionne (dans un User Widget : le User Widget), deux touchers ou un appui long ouvrent les Details, glisser déplace un enfant de Canvas Panel (sinon la vue), deux doigts zooment (jusqu'à ×5) ; ⌖ recadre. Vide : un message renvoie à la Palette.
- **Palette et Hierarchy** (`ui/designer/DesignerPanel.tsx`, tiroir de gauche « Palette · Hierarchy » en mode Designer) : Palette par catégories d'UE (Common, Panel, Primitive, User Created), toucher place le widget dans le panneau sélectionné (à défaut la racine) au lieu du glisser-déposer ; Hierarchy en arbre avec `[WBP_…]` en tête, menu ⋯ : Details, Rename, Wrap With…, Monter, Descendre, Déplacer dans…, Delete.
- **Details d'un widget** (`ui/panels/WidgetDetails.tsx`, focus `widget` dans le store) : Name, Is Variable, Class ; Slot (Canvas Panel Slot : grille des 16 ancres, Position/Offset, Size, Alignment, Size To Content, ZOrder ; sinon Padding, Size Auto/Fill, alignements) ; Content et Appearance (Text : texte, couleur, Font Size, Justification), Progress (Percent 0 à 1, Fill Color), Button (Background Color), Image (couleur, Image Size), Spacer (Size) ; Behavior › Visibility (ESlateVisibility, libellés d'UE). Class Settings d'un Widget Blueprint : Parent Class UserWidget, interfaces, « Placé dans ».
- **Éditeur** : un Widget Blueprint s'ouvre sur son Designer (`App.tsx` : l'état `viewport` sert au Designer ; `wantGraph` quand on saute à un nœud) ; barre d'outils : onglets Designer, Event Graph (et la fonction ouverte). Content Drawer : + Add › User Interface › Widget Blueprint (`WBP_NewWidget`), vignette verte « Widget Blueprint » ; Pick Parent Class ne propose pas les Widget Blueprints.
- **Graph** (`core/nodes/library/widgets.ts`) : Event Pre Construct (Is Design Time), Event Construct, Event Destruct, Event On Initialized, Event Tick du widget (In Delta Time ; My Geometry absent), Get Owning Player et Get Owning Player Pawn (Target self dans un widget, à relier ailleurs), `var.widget` (Get d'un widget Is Variable, typé par sa classe : TextBlock, ProgressBar… ; entrées « Get … » de la palette et rangée « widget · Designer » dans My Blueprint › Variables). `NOT_IN_WIDGET` (BeginPlay, Tick d'acteur, End Play, overlaps, Hit, clic, touches, Input Actions, Timeline, Construction Script) : absents de la palette, refusés par Compile (`notInWidget`) ; `WIDGET_ONLY` : les événements de widget, refusés hors d'un Widget Blueprint (`widgetOnly`) ; `widgetGone` : widget supprimé ou Is Variable décoché. Types : Visual, Widget, UserWidget, PanelWidget, CanvasPanel… dans `BUILTIN_HIERARCHY`. Runtime : rien encore (V7.34) ; `var.widget` lit `ActorRT.widgetRefs`, les deux Get Owning renvoient le contrôleur et le joueur.
- **Écart au plan** : le rejeu d'Event Pre Construct dans l'aperçu du Designer passe en V7.34, avec Set Text et les autres nœuds qui le rendent utile.
- **Tests** : `tests/umg.test.ts` (22 : modèle, refus, mise en page chiffrée, graph, sauvegarde et réparation, une partie avec un Widget Blueprint dans le projet). Smoke : suite UMG, captures 83 à 88 (Designer vide, widgets, Hierarchy, Details, ancres, My Blueprint), avec un glisser vérifié.

Version 7.33.0.

## V7.34 (2026-11-20) : chantier UMG, les widgets à l'écran

Lancé par Tristan (« tu peux passer à la suite »). Aucune étape du parcours ne change ; le recueil complet n'est toujours pas versionné (la question de le mettre dans le dépôt public est restée sans réponse : seul son résumé est dans PLAN_UMG.md).

- **Runtime** (`core/umg/runtime.ts`, classe `Umg`, `Simulation.umg`, sans DOM) : un widget est un objet (`ActorRT` avec `widget: WidgetRT`, dans `sim.objects`), comme un SaveGame. Create Widget en fait un, plus un par User Widget placé dans son Designer (`nested`, `placedIn`) et un objet léger par widget Is Variable (`widgetEl` : son objet hôte et son id), pour servir de Target et de Cast. Ce que le jeu change vit dans `widget.state[idDuWidget]` ('' : l'objet lui-même), par-dessus les valeurs du Designer. Viewport : `inViewport`, `zOrder`, ordre d'ajout ; enfants ajoutés en jeu : `children[idDuPanneau]`, `parent`.
- **Cycle de vie, comme UE** : Event On Initialized une fois à Create Widget, **avant** les valeurs Expose on Spawn (le nœud reprend après l'événement pour les poser, comme le K2Node d'UE) ; Pre Construct (Is Design Time faux) puis Construct à chaque arrivée à l'écran, les widgets intérieurs d'abord ; Destruct à chaque départ, l'extérieur d'abord. `sync()` compare « à l'écran » avant et après chaque changement. Ces événements s'exécutent comme des appels synchrones du nœud (Add to Viewport, Remove from Parent, Add Child…), avant que sa sortie continue. Un 2e Add to Viewport écrit le Warning d'UE (« The widget '…' was already added to the screen. », `Journal.warning`) ; un widget déjà dans un panneau aussi. Remove from Parent d'un widget qui n'est nulle part : rien.
- **Chaque image** (`widgetPhases` de la Simulation, aussi pendant Set Game Paused) : Event Tick des widgets à l'écran, puis les **Bindings** (`pollBindings`) : la fonction liée est appelée par `Interpreter.evaluate` (hors chaîne, sans breakpoint) et sa Return Value affichée ; `bindingCalls` compte les appels. Un Set sur la propriété liée arrête la liaison (`broken`), comme dans UE.
- **Nœuds** (`core/nodes/library/widgets.ts`, comportements `runtime/behaviors/widgets.ts`) : Create Widget (titre « Create WBP_… Widget », Class, Owning Player, pins Expose on Spawn, Return Value typée), Add to Viewport (ZOrder), Remove from Parent, Is In Viewport, Set / Get Visibility (enum `ESlateVisibility`, ajoutée à `BUILTIN_ENUMS`), Is Visible, SetText (Text) / GetText (Text), Set Color and Opacity, Set Percent / Get Percent (la valeur est gardée telle quelle, 1,5 compris ; la barre dessine de 0 à 1), Set Fill Color and Opacity, Add Child to Vertical Box et to Horizontal Box (un widget créé par Create Widget ; le Slot rendu par UE est absent, dit dans la description), Remove Child, Clear Children (vide aussi les enfants du Designer, comme UE), Get Children Count. Get Owning Player (Pawn) renvoie None si Create Widget n'a pas reçu d'Owning Player. Compile demande un Widget Blueprint sur la pin Class de Create Widget ; notes de pièges (Create à chaque fois, Construct qui revient, Remove qui ne détruit pas, Set qui casse un Binding, Percent de 0 à 1).
- **Bindings** (`WidgetNode.bindings`, `BindableProp` et `bindableProps` dans `model/widgets.ts`) : Text, Color and Opacity, Percent, Fill Color and Opacity, Visibility. `widgetOps` : `createWidgetBinding` (fonction pure GetText_0, GetPercent_0…, Return Value du bon type, partant de la valeur du Designer), `bindingCandidates` (fonctions sans entrée, Return Value du type), `setWidgetBinding`, `pruneBindings` (fonction supprimée ou sans sortie : la liaison tombe ; appelé par `pruneProject` et `removeFunction` ; `serialization/validate.ts` fait de même au chargement). Pas de changement de format (champ optionnel).
- **Mise en page** : `layoutWidgets(…, override, prefix, extra)` ; `override` peut dire `removed`, `extra` ajoute les enfants posés en jeu (nœuds factices `@idObjet`, de kind UserWidget). Chemins en jeu : `@objet/…`, un segment par saut d'objet (User Widget placé ou enfant ajouté), puis l'id du widget ; `Umg.override` et `Umg.extra` les résolvent.
- **Play** (`ui/play/WidgetLayer.tsx`, dans `PlayOverlay`) : les widgets du viewport par-dessus le niveau, de l'arrière vers l'avant, sur un écran de 720 de haut (la largeur suit le téléphone) ; redessiné seulement quand `umg.version` change. Pas encore de toucher (V7.35). Live Outliner : rubrique « Widgets (UMG) », avec où est le widget, son Owning Player, ses Bindings (fonction et nombre d'appels, ou « arrêtée par un Set ») et ses variables ; Debug : les widgets sont des objets débogables (`instancesOf`), avec les mêmes infos.
- **Designer** : Event Pre Construct rejoué dans l'aperçu (`core/umg/preview.ts`, `Simulation.designTime` : une simulation jamais démarrée, objet créé sans On Initialized, Pre Construct avec Is Design Time vrai) ; « · Pre Construct » s'ajoute à l'étiquette de taille, et le nombre d'erreurs s'il y en a. Rejoué seulement quand les graphes ou les propriétés des widgets changent (pas pendant un glisser). Les Bindings ne sont pas évalués dans le Designer, comme UE. Details d'un widget : menu **Bind** à côté de Text, Color and Opacity, Percent, Fill Color et Visibility (Create Binding ouvre la fonction dans le Graph ; une propriété liée montre « ƒ GetText_0 »). Content Drawer : la pin Class de Create Widget ne propose que les Widget Blueprints.
- **Mémo** : la fiche UMG décrit le cycle de vie, Is Variable, le menu Bind et l'aperçu.
- **Tests** : `tests/umgRuntime.test.ts` (16 : cycle de vie, double ajout, Expose on Spawn et On Initialized, User Widget placé, Owning Player absent, Set Text et Set Percent à 1,5, Set Visibility, Accessed None, Add Child et Clear Children, Event Tick pendant la pause, Binding appelé à chaque image puis arrêté par un Set, aperçu Pre Construct, menu Bind, sauvegarde, Compile). Smoke : captures 89 à 92 (Create Binding, aperçu Pre Construct, HUD en Play avec la barre liée à 60 %, Outliner du widget).

Version 7.34.0.

## V7.35 (2026-11-20) : chantier UMG, boutons et modes d'entrée

Lancé par Tristan (« tu peux enchainer »). Aucune étape du parcours ne change.

- **Boutons** : événement `event.widgetButton` (config `widget`, `event` : clicked, pressed, released ; titre « On Clicked (Btn_OK) »), réservé aux Widget Blueprints (`WIDGET_ONLY`), un seul par bouton et par événement (`addNode` refuse, Compile dit `duplicateEvent` ; `eventKey` les distingue), refusé par Compile si le bouton n'existe plus ou n'est plus Is Variable (`widgetGone`), supprimé avec son widget. Il s'ajoute par le + de la rubrique **Events** des Details d'un Button (`addButtonEvent` dans `widgetOps`, ouvre l'Event Graph sur le nœud), ou par la palette (« On Clicked (Btn_OK) », catégorie Add Event|Btn_OK). En jeu : On Pressed au toucher, puis au relâcher On Released, et On Clicked si le doigt est encore sur le bouton (ordre de SButton).
- **Ce qui prend un toucher** (`Umg.hit`, `LaidOutWidget.hit`, `enabled`, `parent`) : comme Slate, le widget Visible le plus haut sous le doigt, puis on remonte ses parents jusqu'à un Button (un Text dans un Button lui passe le toucher). Défauts d'UE (vérifiés sur les forums d'Epic) : Canvas Panel, Text Block et User Widget en Not Hit-Testable (Self Only), les autres Visible ; une Image restée Visible par-dessus un bouton lui prend ses touchers ; Not Hit-Testable (Self & All Children) coupe tout le contenu ; un widget passé Visible par Set Visibility couvre tout l'écran et prend les touchers des widgets derrière lui. **Format 13** : les Canvas Panels, Texts et User Widgets restés à Visible (l'ancien défaut) passent en Not Hit-Testable (Self Only). Nouvelle propriété **Is Enabled** (Behavior ; Set Is Enabled, Get Is Enabled) : un bouton désactivé, ou dans un panneau désactivé, prend le toucher sans répondre, dessiné grisé.
- **Modes d'entrée** (`core/nodes/library/inputMode.ts`, `runtime/behaviors/inputMode.ts`) : Set Input Mode Game Only, UI Only, Game and UI (pins d'UE : Player Controller requis, In Widget to Focus, In Mouse Lock Mode avec l'enum `EMouseLockMode`, Hide Cursor During Capture, Flush Input qui relâche toutes les touches), Set / Get Show Mouse Cursor (Target Player Controller, self dans un Player Controller). `Simulation.inputMode` (Game Only au départ), `showMouseCursor`. En **Game Only**, un toucher sur un bouton est ignoré ; en **UI Only**, ni touche, ni Input Action, ni joystick n'arrive au jeu (`record.uiOnlyBlocked`) ; **Game and UI** laisse passer les deux.
- **Toucher en Play** (`Simulation.touchDown`, `touchUp`, `tapButton` ; `ui/play/WidgetLayer.tsx`) : seules les boîtes des boutons qui prennent les touchers captent le doigt (classe `hit`), le reste passe au niveau. Un toucher ignoré (Game Only, bouton désactivé, couvert par un widget Visible) affiche 4 s un message en haut avec **Pourquoi ?** (`core/umg/touch.ts`) et s'inscrit dans `record.ignoredTouches`. Bouton enfoncé assombri. Pastilles « UI Only : le jeu ne reçoit rien » ou « Game and UI », et « Curseur » ; joystick et touches estompés en UI Only.
- **Pause** : les boutons et l'Event Tick des widgets marchent pendant Set Game Paused ; le Delay d'un widget attend la fin de la pause (latents des widgets avancés avec ceux des acteurs). Description de Set Game Paused complétée.
- **Leçons** : étape de scénario `{ click: 'WBP_Pause/Btn_Reprendre' }` (`runner.ts`, par `Simulation.tapButton` : appui au centre du bouton, une image, relâcher ; ce qui couvre le bouton prend le toucher, comme pour un doigt). `record.buttons` garde les boutons qui ont répondu.
- **Mémo et notes** : la fiche UMG dit les modes, ce qui prend un clic et la pause ; notes de pièges sur On Clicked, UI Only et Game Only.
- **Widget Component** (décision 4 : juger à la fin de la V7.35) : faisable mais **moyen**, pas « facile » : un nouveau type de composant (Widget Class, Draw Size, Space Screen), un objet widget créé par acteur, son dessin au-dessus de l'acteur dans la vue de dessus (projection monde → écran de `WorldCanvas`), Get User Widget Object, et ses touchers. À proposer à Tristan pour la V7.37 ou le backlog.
- **Tests** : `tests/umgInput.test.ts` (15 : ordre des événements, relâcher ailleurs, Game Only, pause et Delay, Is Enabled, défauts de Visibility, Text dans un Button, Image qui couvre, Not Hit-Testable, HUD passé Visible, UI Only et Game and UI, Show Mouse Cursor et Player Controller vide, étape `click` d'un scénario, événements dans le Graph, format 13). Smoke : captures 93 à 95 (On Clicked par le +, toucher ignoré en Game Only avec Pourquoi, bouton qui répond en Game and UI avec les pastilles).

Version 7.35.0.

## V7.36 (2026-11-20) : chantier UMG, les six premières étapes

Lancé par Tristan (« tu peux lancer »), après lui avoir fait le point et obtenu l'accès en écriture au dépôt. Le parcours passe de 124 à 130 étapes ; aucune étape existante ne change de règle ni de solution.

- **Les étapes** (`core/lessons/library/umgCounter.ts`, `umgMenu.ts`, `umgPause.ts`, aides communes dans `umgKit.ts`) :
  - **Le compteur à l'écran** (`l-compteur-ecran`, Intermédiaire, juste après « Les contrôles au Player Controller », chaîne `umg` discover) : part du projet résolu de la leçon précédente. L'apprenant crée WBP_Compteur (Canvas Panel, Text Is Variable), BP_PlayerController le crée (Owning Player = Self), le garde dans une variable et l'ajoute à l'écran ; IA_Interagir appelle un Custom Event du widget, qui fait Increment Int puis SetText. Vérifié : un widget à l'écran dès le lancement, 0, puis 1, puis 3 lus sur l'écran (`screenTexts`, n'importe quel texte qui contient le nombre), un seul widget. Messages selon ce qui manque : pas de Widget Blueprint, pas de Create Widget, pas d'Add to Viewport.
  - **P16 « Combien de Construct ? »** (`p16-construct`, Confirmé, après « Le menu pause ») : WBP_Accueil ajouté, retiré, réajouté (avec des Delay) ; réponse On Initialized, Construct, Destruct, Construct.
  - **Le menu qui rend le contrôle** (`l-menu-controle`, E10 du recueil, chaîne `ui-input` guided) : F (IA_Menu) ouvre WBP_Menu (fourni dessiné, Graph vide) en UI Only avec le curseur ; Fermer (On Clicked) fait Remove from Parent, Game Only (Get Owning Player), curseur caché. Le test marche pendant que le menu est ouvert (le personnage doit rester immobile : Game and UI échoue avec son explication), rappuie sur F (un seul menu), ferme, remarche, puis rouvre et referme deux fois. Notion (non bloquante) : le menu est créé une seule fois (Is Valid).
  - **D24 « Le menu qui ne part pas »** (`d24-menu-reste`) : F → FlipFlop ; le côté B fait Create Widget puis Remove from Parent sur ce widget neuf. Correction : la variable du côté A. Les messages comptent les widgets créés depuis le lancement.
  - **Le vrai menu pause** (`l-vrai-menu-pause`) : part du projet résolu du « Menu pause » avec WBP_Pause fourni ; Espace met en pause et affiche le menu (UI Only, curseur), Reprendre (On Clicked) le retire, relance le jeu, remet Game Only et cache le curseur ; deux cycles. Vérifie aussi que le minuteur est figé pendant la pause et repart.
  - **D25 « Le bouton qui ne répond pas »** (`d25-bouton-muet`) : F ouvre et ferme WBP_Terminal (Is In Viewport), avec le curseur mais sans mode d'entrée : le bouton est ignoré (Game Only). « Réparer » en UI Only ouvre la porte mais F ne referme plus (message tiré de `record.uiOnlyBlocked`) ; Game and UI est la bonne correction (notion non bloquante).
  - Les menus sont centrés (ancres au centre, `centred` ; titre au-dessus du centre pour ne pas croiser le libellé PAUSED de Play).
- **Notions** : `umg` et `ui-input` dans le catalogue (`ui-input` est distinct d'`input-mode`, qui désigne les Mapping Contexts). `core/notions/practice.ts` compte Get Owning Player comme pratique du Player Controller : l'écart de `player-controller` passe de 86 à 49. Les autres écarts qui traversent les nouvelles étapes grandissent de 1 à 6 (`KNOWN_GAPS` mis à jour avec un commentaire ; loops y entre à 19).
- **Reprise** : glossaire (Widget Blueprint, Boutons d'un widget, Modes d'entrée), six questions de révision, fiche UMG du mémo reliée aux six étapes ; la fiche « Cahier des charges » du « Menu pause » renvoie au « Vrai menu pause » au lieu de dire que l'appli n'a pas de widgets.
- **Tests** : `tests/umgLessons.test.ts` (12 : place dans le parcours, aide de chaque notion, Create Widget sans Add to Viewport, Text jamais mis à jour, Game and UI qui laisse marcher, fermeture sans Game Only, bouton jamais relié, D24 tel quel, Reprendre sans Set Game Paused, menu ouvert en Game Only, D25 tel quel puis « réparé » en UI Only). Smoke : 130 étapes, sélecteur « Le menu pause » rendu non ambigu (`.first`), captures 96 et 97 (le vrai menu pause en Play, puis la reprise).

Version 7.36.0.

## V7.37 (2026-11-20) : chantier UMG, les six dernières étapes et la reprise

Lancé par Tristan (« tu peux passer a la prochaine étape »). Le parcours passe de 130 à 136 étapes ; aucune étape existante ne change de règle ni de solution. Le Widget Component reste au backlog (pas de décision de Tristan, c'était le choix par défaut).

- **Les étapes** :
  - **La barre de vie** (`l-barre-vie`, Confirmé après D25, chaîne `umg` guided, `library/umgHealth.ts`) : BP_Joueur a Sante (60 au départ), OnSanteChange et une fonction Blesser ; deux BP_Piege l'appellent. WBP_Sante (PB_Sante) est fourni et affiché par BP_PlayerController. L'apprenant écrit Event Construct → Cast To BP_Joueur (Get Owning Player Pawn) → Bind Event → Set Percent ÷ 100, plus la mise à jour immédiate (sans elle, la barre reste pleine au lancement : message dédié). Notions non bloquantes : ni Binding ni Tick (`eventDriven`), Bind présent.
  - **R6 « La jauge d'oxygène »** (`r6-oxygene`, Refactor, chaîne `umg` modify) : Txt_Oxygene lié par un Binding (GetText_0, Cast vers le joueur) ; Oxygene baisse de 5 toutes les 0,5 s. Contrainte bloquante : plus de Binding ni de Tick, et BP_Joueur appelle un Event Dispatcher (à créer). Le message donne le nombre d'appels du Binding pendant le test.
  - **Appuie sur E** (`l-appuie-sur-e`, `library/umgPrompt.ts`) : part d'« Interagir comme dans UE5 » résolu ; WBP_Invite fourni (Txt_Invite Collapsed). BP_Joueur annonce OnPortee (Boolean) sur ses overlaps avec Does Implement Interface (BPI_Interactif) ; l'invite s'abonne et passe Visible / Collapsed. Notion : Collapsed plutôt que Hidden.
  - **A3 « Le terminal de la station »** (`a3-terminal`, autonomie différée de deux jours après « Le menu qui rend le contrôle », chaîne `ui-input`, `library/umgTerminal.ts`) : cahier des charges seul ; l'apprenant crée WBP_Terminal (Btn_Nord, Btn_Sud, Btn_Quitter, noms imposés), E près de la console l'ouvre (personnage immobile), chaque bouton ouvre sa porte, Quitter rend le contrôle. La solution de référence passe par BP_Joueur (Get Overlapping Actors, Cast To BP_Console, Get Player Controller).
  - **C7 « La playlist »** (`c7-playlist`, Complète, E27 du recueil, `library/umgPlaylist.ts`) : WBP_Ligne (Expose on Spawn Titre, OnLire, OnRetirer) et WBP_Playlist (Morceaux, Rafraichir avec Clear Children, Create Widget et Add Child to Vertical Box, Inverser et Rafraîchir écrits). Trois trous : Call OnLire dans la ligne, Bind Event to OnLire dans Rafraichir (la chaîne reste reliée autour, les lignes s'affichent dès le départ), Remove Item dans Retirer. Le test suit le recueil : lire le 2e, retirer le 1er, relire le 2e, inverser, rafraîchir trois fois puis un clic (une seule lecture, comptée dans l'Output Log), retirer le morceau en cours. Lignes agrandies pour le doigt.
  - **T4 « La jauge d'énergie »** (`t4-energie`, Transfert, Avancé, chaîne `umg` transfer) : BP_Batterie (Actor Component du joueur, 70 au départ) annonce OnChargeChange ; WBP_Energie le trouve par Get Component by Class sur Get Owning Player Pawn (notion : pas de Cast vers le joueur). Placé après M2 : plus tôt, il faisait dépasser 15 à input ou events ; là, seul `hit` passe à 16.
  - Ordre : A3 avant C7, juste avant S3 (A3 après C7 faisait dépasser 15 à input).
- **Moteur** : étape de scénario `{ click, nth }` et `Simulation.tapButton(classe, bouton, nth)` (le nième bouton de ce nom, de haut en bas) pour toucher une ligne précise d'une liste.
- **Reprise** : famille de mini-exercices **« Interfaces (UMG) »** (`core/drills/families/widget.ts`, notions `umg` et `ui-input`) : fermer un menu (variante en pause), le compteur (2 à 4 appuis, « Appuis : N » ou non), le bandeau d'accueil (Construct → Delay → Remove from Parent, affiché une ou deux fois : On Initialized échoue au second). Fiche UMG du mémo reliée aux douze étapes (listes de widgets, Collapsed). Glossaire : « Binding ou événement », « Visibility d'un widget ». Six questions de révision. `KNOWN_GAPS` mis à jour (cast, dispatchers, interfaces, other-bp, overlap et player-controller baissent ; la plupart des autres montent de 3 à 6 ; hit entre à 16).
- **Tests** : `tests/umgLessons.test.ts` (21 : place et échelles des chaînes `umg` et `ui-input`, barre sans mise à jour immédiate, Percent sans ÷ 100, R6 tel quel, Hidden au lieu de Collapsed, playlist sans Remove Item, `nth` sur la 5e ligne, A3 en Game and UI, T4 sans mise à jour immédiate) ; `tests/drills.test.ts` couvre la nouvelle famille (36 graines, chaque erreur typique). Smoke : 136 étapes, sélecteur de « Le terminal » rendu non ambigu, capture 98 (la playlist en Play, Lire sur la 2e ligne).

Version 7.37.0.

## V7.38 (2026-11-20) : revue du chantier UMG, lot 1 (le moteur au plus près d'UE)

Lancé par Tristan (« ok pour tes recos, tu peux passer aux corrections ») après la revue ([REVUE_UMG.md](REVUE_UMG.md)). Il a pris les recommandations des deux questions (PAUSED caché quand un widget est à l'écran ; aperçu « Téléphone » dans le Designer), qui sont pour la V7.39. Les trois lots s'enchaînent, une version chacun.

- **F1, Owning Player vide** : Create Widget sans Owning Player donne le widget au contrôleur du joueur (UE prend le premier joueur local, GameInstance GetFirstGamePlayer). Seul l'aperçu du Designer fait un widget sans propriétaire (Get Owning Player = None en Pre Construct, comme UE). Conseil de construction `widget-no-owner` (« Create Widget sans Owning Player », dès l'Intermédiaire, `quality/advice.ts`). Descriptions de Create Widget et Get Owning Player complétées.
- **F2, widget non dessiné** : `Umg.drawn(o)` (à l'écran, ni lui, ni sa racine, ni ce qui le contient Collapsed ou Hidden ou retiré), `Umg.ticking()`. L'Event Tick ne tourne que pour eux ; les Bindings d'un widget ne sont lus que s'il est dessiné, sauf celui de sa Visibility, lu tant que son parent l'est (c'est ce qui lui permet de revenir).
- **F3** : `Umg.built` (post-ordre, frères dans l'ordre de l'arbre) pour Pre Construct et Construct ; `innerOf` partagé avec `subtree`.
- **F4** : Remove from Parent d'un User Widget placé l'enlève de l'arbre (`nested` et `placedIn` effacés) : il peut aller au viewport ou dans un panneau.
- **R1, récursion** : `Frame.depth` dans l'interpréteur (un événement ou une fonction appelés ajoutent 1) ; au-delà de `MAX_CALL_DEPTH` (250), « Infinite script recursion (250 calls) detected - aborting! », pile vidée, avec son « Pourquoi ? » (`explain/runtime.ts`). Le Construct qui recrée son widget s'arrête en quelques millisecondes (5,5 s et 33 333 objets avant). Le correcteur (`runner.ts`) arrête le scénario sur ce message comme sur Infinite loop detected. **C2 « La factorielle »** finit maintenant sur ce message, comme dans UE : textes, notion « Infinite script recursion » (glossaire, fiche Fonction), question de révision mis à jour ; la règle et la solution ne changent pas.
- **Tests** : `tests/umgFidelity.test.ts` (8) ; `umgRuntime` dit maintenant que Get Owning Player Pawn vaut le joueur sans Owning Player ; `lessonVariantsV2` attend le message de récursion pour C2.

Version 7.38.0.

## V7.39 (2026-11-20) : revue du chantier UMG, lot 2 (Play et Designer au téléphone)

Suite des corrections lancées par Tristan. Réponses aux deux questions de la revue : les recommandations.

- **I1, qui a le doigt** (`ui/play/PlayOverlay.tsx`, classes `game-only`, `game-and-ui`, `ui-only` ; `app.css`) : comme dans UE, le mode d'entrée décide. Game Only : le joystick et E / F / Espace restent devant les widgets (le toucher part au jeu). Game and UI : le calque des widgets passe devant (z-index 2), donc un bouton sous le joystick ou les touches répond, et le reste de l'écran va toujours aux contrôles (le calque ne prend que les boutons, `.umg-Button.hit`). UI Only : idem, et le joystick et les touches ne prennent plus rien (`pointer-events: none`, en plus de l'estompe).
- **I2, PAUSED** : caché dès qu'un widget est dessiné à l'écran (`Umg.drawn`) : le menu dit lui-même que le jeu est en pause. Réponse de Tristan : la recommandation.
- **I3, Screen Size du Designer** (`ui/designer/screenSize.ts`) : l'étiquette sous l'écran est un bouton qui bascule entre **1280 × 720** et **Téléphone** (720 de haut, la largeur de Play : mesurée par `WidgetLayer` à chaque Play, sinon la zone du Designer). Choix gardé dans le navigateur (`bp-trainer.designerScreen`). Les Details gardent un widget en place sur l'écran affiché quand ses ancres changent (`currentDesignerWidth`). Les leçons et le correcteur restent en 1280 × 720.
- **Smoke** : capture 99 (Designer en Téléphone), le vrai menu pause sans PAUSED (96), joystick et touches traversables en UI Only (après 98).

Version 7.39.0.

## V7.40 (2026-11-20) : revue du chantier UMG, lot 3 (code et docs)

Dernier lot des corrections de la revue ([REVUE_UMG.md](REVUE_UMG.md)) : rien ne change pour l'apprenant.

- **C1** : les touchers quittent `simulation.ts` (991 → 924 lignes) pour `core/umg/touchInput.ts` (classe `TouchInput` avec son `TouchHost`, types `InputMode` et `TouchOutcome`, réexportés par `simulation.ts`) ; `tap` n'a plus qu'une recherche, avec ou sans `nth`. `Simulation.touchDown`, `touchUp`, `tapButton` délèguent.
- **C2** : un seul résolveur des chemins `@objet/…` (`Umg.holder`), utilisé par `override`, `extra`, `resolve` et `objectOf` (qui remplace `Simulation.objectOfPath`).
- **C3** : `WidgetDetails.tsx` (405 → 79 lignes) compose des rubriques rangées dans `ui/panels/widgetDetails/` : `controls.tsx` (Select, Color, Pair, menu Bind), `slots.tsx` (CanvasSlot, BoxSlot), `sections.tsx` (KindSections, BehaviorSection, ButtonEvents, WidgetHelp).
- **D1** : « Reprise rapide » remise à jour ; liste « Déjà fait » du BACKLOG dans l'ordre (fait dès la V7.38). **G1** au BACKLOG (valeurs par instance d'un User Widget placé, dans « Restes du moteur UMG »).
- La revue du chantier UMG est entièrement corrigée (V7.38 à V7.40).

Version 7.40.0.

## V7.41 (2026-11-20) : chantier annexe, Mes projets

Lancé par Tristan (« Ok pour tes recos, tu peux lancer ») : [PLAN_ANNEXE_WIDGET_PROJETS.md](PLAN_ANNEXE_WIDGET_PROJETS.md), première version.

- **Plusieurs projets en simulation libre** (`storage/projects.ts`, `core/projects/list.ts`) : un projet par clé, `project:sandbox` (le projet d'avant, id `main`) et `project:sandbox:<id>`. La liste se lit dans les clés stockées (pas d'index) ; la sauvegarde complète les emporte tous (préfixe `project:`). `storage.ts` gagne `removeStored`.
- **« Simulation libre » ouvre « Mes projets »** (`ui/home/ProjectsDialog.tsx`) : Nouveau projet (nom proposé « Projet N »), Importer un fichier (ajouté à la liste, nom rendu unique), et par projet, sous ⋮ : Renommer, Dupliquer, Exporter (partage sur téléphone, comme la sauvegarde complète), Supprimer (confirmation qui nomme le projet, définitif). Le dernier ouvert est en tête. Noms uniques, 60 caractères au plus.
- **Menu ⋮ de l'éditeur en simulation libre** : Mes projets (retour à la liste), Nouveau projet (créé à côté, ouvert ; plus rien n'est remplacé), Renommer le projet (annulable), Importer un projet (ajouté à la liste et ouvert). Dans une leçon, Importer remplace toujours le projet de la leçon, comme avant.
- `WorkspaceRef` `sandbox` et `progress.last` portent `projectId` (absent : `main`).
- **Tests** : `tests/projects.test.ts` (10). Smoke : helper `free_play` (ouvre le premier projet de la liste, ou en crée un), captures 100 à 104 (liste, menu de l'éditeur, actions, confirmation de suppression).

Version 7.41.0.

## V7.42 (2026-11-20) : chantier annexe, le moteur du Widget Component

Lancé par Tristan (« Passe a la suite ») : [PLAN_ANNEXE_WIDGET_PROJETS.md](PLAN_ANNEXE_WIDGET_PROJETS.md), deuxième version.

- **Modèle** : `ComponentKind` `Widget` (`COMPONENT_CLASS` WidgetComponent, sous PrimitiveComponent), Widget Class dans `Component.classId` (`setWidgetClass` de `classOps.ts`), Draw Size dans `sizeX` × `sizeY` (500 × 500 par défaut). Dans + Add des Components. Un Widget Class introuvable redevient None au chargement ; un Widget Blueprint utilisé par un Widget Component ne se supprime pas. Builder : `widgetComponent(nom, wbp, props)`.
- **Runtime** : un widget par acteur, fait avant l'Event BeginPlay de l'acteur (et des acteurs apparus par Spawn Actor), On Initialized à ce moment ; Pre Construct et Construct à l'image suivante ; Destruct avec Destroy Actor ; caché (sans Tick ni Bindings) avec Set Visibility du composant ou Set Actor Hidden In Game. Pas dans le viewport (Is In Viewport faux ; Add to Viewport dessus : le Warning « already has a parent widget »). **Get User Widget Object** (pur, User Widget, None sans Widget Class).
- **Play** : chaque widget sur sa Draw Size, centré sur son composant, suit la caméra (`ui/play/ComponentWidgets.tsx`), sous les widgets du viewport ; ses boutons répondent selon le mode d'entrée (le « Pourquoi ? » de Game Only compris).
- **Éditeur** : Details › User Interface (Space Screen seul, grisé, Widget Class, Draw Size X / Y) et Rendering (Visible), aide ; cadre pointillé de la Draw Size avec le nom du Widget Blueprint dans le niveau et le Viewport.
- **Reprise** : glossaire « Widget Component », mémo UMG complété, conseil `widget-component-no-class` (à partir de l'Avancé).
- **Tests** : `tests/widgetComponent.test.ts` (8). Smoke : projet `widget-component.json` (`solved.gen.ts`), captures 105 (cadres dans le niveau), 106 (Details), 107 (deux barres en Play).

Version 7.42.0.

## V7.43 (2026-11-20) : chantier annexe, les étapes du Widget Component

Lancé par Tristan (« Tu peux passer a la suite ») : [PLAN_ANNEXE_WIDGET_PROJETS.md](PLAN_ANNEXE_WIDGET_PROJETS.md), dernière version du chantier annexe. Le parcours passe de 136 à 140 étapes ; aucune étape existante ne change de règle ni de solution (les numéros des leçons suivantes avancent d'un ou deux).

- **Notion `widget-component`** (catalogue, `practice.ts` : nœuds `widgetComponent.*`), échelle découverte → guidée → transfert.
- **« La barre au-dessus de l'ennemi »** (`l-barre-ennemi`, découverte, après T4), **« Une barre par ennemi »** (`l-barre-par-ennemi`, guidée), **D26 « La barre figée »** (`d26-barre-figee`, après « Le checkpoint ») : `lessons/library/widgetBars.ts`. **T5 « Les noms au-dessus des têtes »** (`t5-noms`, avant S4) : `widgetNames.ts`. Détail dans le plan.
- Quatre questions de révision ; `KNOWN_GAPS` remonté de 2 à 4 pour data-tables, hit, inheritance, player-controller, save-game et tick (étapes insérées dans leur écart) ; `widget-component` reste sous 15.
- **Tests** : `tests/widgetComponentLessons.test.ts` (5 : place dans le parcours, pièges de la découverte, barres figées, D26 et ses deux corrections, l'hypothèse « référence », T5 avec un seul nom pour tous). Smoke : 140 étapes, captures 108 (accueil) et 109 (trois barres en Play, « Une barre par ennemi » résolue).

Version 7.43.0.

## V7.44 (2026-11-20) : revue du chantier annexe, lot 1

Lancé par Tristan (« Ok pour tes recos, lance les corrections ») : [REVUE_ANNEXE_WIDGET_PROJETS.md](REVUE_ANNEXE_WIDGET_PROJETS.md), lot 1 (W1, P1).

- **W1** : `componentTransform` (`runtime/world.ts`) n'applique plus le yaw au décalage d'un composant `Widget` : le widget reste au-dessus de son acteur (Location Y négative), en Play (`ComponentWidgets.tsx`), dans le cadre de l'éditeur et la sélection du Viewport, qui passent tous par cette fonction. Aide des Details complétée.
- **P1** : l'import (Mes projets, menu ⋮ de l'éditeur) n'écrit plus `rules` : le projet garde les règles de son fichier, et `noticesFor` affiche l'avis « règles changées » à son ouverture, comme avant la V7.41.
- **Tests** : `widgetComponent.test.ts` (yaw 0, 90, 180, −45), `projects.test.ts` (import d'un projet en règles 1 : avis à la première ouverture, plus à la seconde).

Version 7.44.0.

## V7.45 (2026-11-20) : revue du chantier annexe, lot 2

Suite du lot 1, sans nouveau feu vert à attendre (Tristan a lancé les deux lots) : [REVUE_ANNEXE_WIDGET_PROJETS.md](REVUE_ANNEXE_WIDGET_PROJETS.md), lot 2 (P2, P3, L1, L2, D1). **La revue est entièrement corrigée.**

- **P2** : `storage/shareFile.ts` (nouveau) porte `saveFile` et `pickTextFile` (réexportés par `backup.ts`). « Exporter le projet » du menu ⋮ passe par `exportProject`, qui appelle `saveFile` : partage Android sur téléphone, comme Mes projets et la sauvegarde complète, avec un message. `projectFileName` (`core/projects/list.ts`) garde les accents (« Élise » → `Élise.bptrainer.json`).
- **P3** : `uniqueName` coupe à 60 caractères, suffixe compris ; `dedupeProjectNames` (`storage/projects.ts`), appelé par `restoreBackup`, renomme les doublons (le plus récent garde son nom, la date des autres ne bouge pas).
- **L1** : « Une barre par ennemi » a une autre façon de faire, « Caster une fois, à l'Event BeginPlay » (variable BarreVie de type WBP_BarreVie), testée avec les vérifications de la leçon comme les autres.
- **L2** : aide des Details alignée sur les étapes (120 × 14). **D1** : HANDOFF et BACKLOG ne disent plus le Widget Component « au backlog ».
- **Tests** : `projects.test.ts` (nom coupé à 60, doublon après restauration, nom de fichier avec accents).

Version 7.45.0.

## V7.46 (2026-11-20) : chantier n° 4, plusieurs niveaux

Lancé par Tristan (« Ok pour tes recos, mais gardes en mémoire dans le backlog ou autre comment aller plus loin ») : [PLAN_NIVEAUX.md](PLAN_NIVEAUX.md), première version. Les sept recommandations sont prises ; « Aller plus loin après le chantier n° 4 » est noté dans BACKLOG.md.

- **Modèle, format 14** : `Project.levels` (id, nom, acteurs, Player Start), `editorLevelId`, `mapsModes.gameDefaultMap`. Migration : l'ancien `level` devient `Lvl_Principal` (`MAIN_LEVEL_ID` = `lvl-principal`), Game Default Map. `validate.ts` : au moins un niveau, ids et noms uniques (casse ignorée), niveau ouvert ou Game Default Map perdus réparés. Les noms de niveau partagent l'espace des noms d'assets (`takenNames`), sans espace.
- **Lectures** : `levelOf(p)` (niveau ouvert) partout où l'on lisait `p.level` (une cinquantaine de fichiers, leçons comprises ; aucune leçon ne change). `removeClass` et `setParentClass` nettoient tous les niveaux.
- **Moteur** : `Simulation` reçoit `levelId` (niveau ouvert par défaut, comme Play in Editor) et expose `sim.level` ; le correcteur part du Game Default Map (`defaultLevel`), quel que soit le niveau montré dans l'éditeur. Pas encore d'Open Level (V7.47).
- **Éditeur** : `operations/levelAssetOps.ts` (addLevel, renameLevel, removeLevel : jamais le dernier ni le niveau ouvert, Game Default Map déplacé ; setGameDefaultMap) ; `EditorStore.openLevel` (sauvé, pas annulable). Content Drawer : + Add › Level (Create Basic Asset, comme UE), tuiles Level, ouvrir par deux touches, Renommer, Supprimer. L'onglet du niveau porte son nom. Menu ⋮ › Project Settings : Maps & Modes avec Game Default Map (`ui/overlays/ProjectSettings.tsx`).
- **Tests** : `tests/levels.test.ts` (10 : format, migration, sauvegarde, noms, suppression, Blueprint supprimé, ouverture sans annulation, Play du niveau ouvert, correcteur au Game Default Map). Smoke : sélecteur `.doc-tab.level` (l'onglet ne dit plus « Niveau »), captures 110 à 113 (+ Add › Level, nouveau niveau ouvert, Content Drawer, Maps & Modes).

Version 7.46.0.

## V7.47 (2026-11-21) : chantier n° 4, changer de niveau en jeu

Lancée par Tristan (« Lance »), selon le plan technique de BACKLOG.md (« Reprise par un autre agent »), suivi sans écart notable.

- **La partie, `core/runtime/game.ts`** : `Game` tient le monde en cours (`world`, une `Simulation` par niveau) et ce qui traverse les niveaux : le `Journal` (Output Log et messages à l'écran, passé à chaque monde par `SimulationOptions.journal` ; `Journal.rebase` recale les messages encore affichés sur le temps du nouveau monde, qui repart de 0), les slots (le même objet), le joystick (`game.move`), `visited` (niveaux joués), `slotsChanged` cumulé. Chaque monde a sa graine (`seed + n × 7919`).
- **Open Level (by Name)** (`level.open` : Level Name, Absolute, Options sans effet) et **Get Current Level Name** (`level.currentName`, pur ; Remove Prefix String décoché : `UEDPIE_0_` + nom), catégorie Game, dans `core/nodes/library/levels.ts` et `runtime/behaviors/levels.ts`. Open Level note `sim.travel` (le dernier appel gagne), refusé dans un Construction Script (`allowedIn`).
- **Le voyage** : `Simulation.advance` s'arrête après l'image qui a demandé le voyage ; `Game.settle()` (au début de `step`, `advance`, et de chaque pas du scénario du correcteur) le fait : nom introuvable (casse ignorée) → erreur « Travel Failure: PackageMissing, Failed to load package '/Game/…' » et la partie continue ; sinon `Simulation.endForTravel()` en phases reprenables : `Umg.tearDown()` (Destruct de tous les widgets, viewport et Widget Components), puis Event End Play (Level Transition = 1) sur chaque acteur puis ses Actor Components, Player Controller et joueur compris. Un breakpoint dans End Play arrête tout : le voyage attend `sim.ended`. Puis un monde neuf (Construction Scripts, BeginPlay), une ligne « LogLoad: LoadMap: /Game/… » dans l'Output Log, `onTravel`.
- **Play** : `PlaySession.game`, `sim` devient un getter sur `game.world` ; au voyage, la sélection de l'Outliner est oubliée. Nom du niveau en cours dans la barre de Play (`.pb-level`), Player Start du niveau joué dans la vue, `WidgetLayer` redessine quand l'UMG change d'objet.
- **Correcteur** : `runner.ts` tient une `Game` ; `cx.sim` est le monde en cours ; `cx.level()`, `cx.levels()` ; `restart` refait une `Game` (mêmes slots). Aucune leçon ne change ; `rules.ts` inchangé.
- **Format 15** (étape vide de `migrate`) : une ancienne appli refuse un projet qui pourrait contenir ces nœuds.
- **Tests** : `tests/openLevel.test.ts` (9 : pas immédiat, ordre Destruct puis End Play puis BeginPlay, acteur créé après Open Level disparu, Delay abandonné, Output Log et messages gardés, nom introuvable, casse, breakpoint dans End Play, correcteur, format 15). Smoke : projet « Deux niveaux » (`tools/e2e/solved.gen.ts`), captures 114 et 115, vérifie la barre de Play et le message à l'écran.
- **À vérifier dans UE** : voir BACKLOG.md (« Reprise par un autre agent »).

Version 7.47.0.

## V7.48 (2026-11-21) : chantier n° 4, le GameInstance

Lancée par Tristan (« Tu peux passer à la suite »), selon PLAN_NIVEAUX.md et le plan noté au BACKLOG.

- **Classe parente `GameInstance`** (`ParentClass`, famille `instance`) : un objet comme SaveGame. Jamais posé (`placeActor`, `SpawnActor` refusent), pas de composants, pas de Viewport ni de Construction Script ; héritage seulement entre GameInstance. Content Drawer › + Add › Blueprint Class › All Classes › GameInstance (nom proposé `BP_GameInstance`). Class Settings : parent, et si c'est la Game Instance Class.
- **Maps & Modes › Game Instance Class** (`MapsModes.gameInstanceClass`, `setGameInstanceClass` dans `levelAssetOps`) ; supprimer le Blueprint la vide ; une classe perdue est retirée au chargement (`serialization/validate.ts`).
- **Nœuds** (`core/nodes/library/gameInstance.ts`, `behaviors/gameInstance.ts`) : Event Init, Event Shutdown (seulement dans un GameInstance, `GAME_INSTANCE_ONLY`), Get Game Instance (pur, renvoie toujours un objet), Quit Game (Specific Player, Quit Preference avec l'enum `EQuitPreference`, Ignore Platform Restrictions ; Background ne fait rien en Play). `NOT_IN_GAME_INSTANCE` : la palette les cache et Compile refuse (codes `notInGameInstance`, `gameInstanceOnly`, expliqués dans `explain/compile.ts`).
- **Runtime** : la `Game` crée le GameInstance (`createGameInstance`, id `gameInstance`, `BP_Jeu_C_0` ou `GameInstance_0` sans classe) et le passe à chaque `Simulation` (`opts.gameInstance`) ; le premier monde lance Event Init dans `start()`, avant les BeginPlay (après les Construction Scripts). Au voyage, `Game.forgetOldWorld` met à None les références du GameInstance vers l'ancien monde (acteurs, composants, widgets, événements liés ; le joueur et le Player Controller aussi, même si leur id se répète) et retire les liaisons de ses Event Dispatchers ; les objets SaveGame passent au nouveau monde.
- **Fin du jeu** : `Game.shutdown()` → `Simulation.endGame()` : script en pause abandonné (`Interpreter.abandon`), Destruct des widgets, Event End Play (End Play In Editor) sur chaque acteur et ses composants, puis Event Shutdown ; breakpoints ignorés, plus rien après (`game.over`). Appelé au **Stop** (`App.stop`) et par **Quit Game** (noté dans `sim.quit`, fait au début de l'image suivante par `Game.settle`, puis `PlaySession.onQuit` arrête Play comme Stop, message « Quit Game : la partie s'est fermée »).
- **Play** : ligne « Toute la partie » › GameInstance dans l'Outliner en direct (niveaux joués, variables modifiables) ; le GameInstance compte parmi les instances déboguables (`instancesOf`).
- **Correcteur** : `cx.gameInstance(nom)`, `cx.quitted()` ; `restart` refait une `Game`, donc un GameInstance neuf.
- **Format 16** (étape vide de `migrate`).
- **Tests** : `tests/gameInstance.test.ts` (13). Smoke : BP_Jeu dans le projet « Deux niveaux », capture 116 (le GameInstance dans l'Outliner après Open Level).
- **À vérifier dans UE** : BACKLOG.md (« Reprise par un autre agent »).

Version 7.48.0.

## V7.49 (2026-11-21) : chantier n° 4, le vrai GameMode

Lancée par Tristan (« Tu peux lancer »), selon la recommandation 1 de PLAN_NIVEAUX.md.

- **Modèle** : classe parente `GameModeBase` (famille `mode` : jamais posée, ni Spawn, sans composants ni Viewport ; `BUILTIN_HIERARCHY` : GameModeBase → Info → Actor). `BlueprintClass.gameMode` (`GameModeDefaults` : `defaultPawnClass`, `playerControllerClass` ; absent = hérité du GameMode parent ; `''` = la classe native DefaultPawn ou PlayerController). `MapsModes.defaultGameMode`, `Level.gameModeOverride`. **`Project.playerClassId` et `playerControllerClassId` n'existent plus.**
- **`core/model/gameMode.ts`** : `gameModeOf(p, level)` (override, sinon Default GameMode), `gameModeDefault` (suit la lignée), `playerClassesFor(p, level)` (le GameMode, le pion, le Player Controller), `pruneGameModes` (oublie ce qui ne convient plus ; appelé par `removeClass`, `setParentClass` et au chargement), `isPlayerPawnClass`, `isPlayerControllerClass`.
- **`core/operations/gameModeOps.ts`** : `setGameModeDefault`, `setDefaultGameMode`, `setGameModeOverride`, `ensureDefaultGameMode` (crée BP_GameMode), `setDefaultGameModeClass`. `setPlayerClass` et `setPlayerControllerClass` (projectOps) gardent leur nom pour les leçons et écrivent dans le Default GameMode, créé au besoin : les projets de départ des leçons ont donc un BP_GameMode, comme les modèles d'UE.
- **Format 17** (`serialize.ts`) : un projet qui avait un pion ou un Player Controller reçoit un `BP_GameMode` (nom libre si pris) qui les reprend, comme Default GameMode. `validate.ts` retire les anciens champs et les références perdues.
- **Runtime** : chaque `Simulation` crée son GameMode (`createGameMode`, id `gameMode`, `BP_…_C_0` ou `GameModeBase_0`) et prend pion et Player Controller dans ses Class Defaults (`playerClassesFor` sur le niveau joué) ; s'il est un Blueprint, il est dans `scripted()` après les acteurs posés et avant le Player Controller et le pion (ordre de la liste d'acteurs d'UE). Destroy Actor et SpawnActor le refusent. Au voyage, une référence du GameInstance vers lui passe à None (même id d'un monde à l'autre).
- **Nœud** Get Game Mode (`nodes/library/gameMode.ts`, catégorie Game, pur). `NOT_IN_GAME_MODE` (overlaps, Hit, clic, entrées, Construction Script) filtre la palette et Compile (`notInGameMode`).
- **Éditeur** : Pick Parent Class › Game Mode Base (nom proposé BP_GameMode) ; Class Settings d'un GameMode (parent, « Utilisé par ») ; Class Defaults › Classes (`ui/panels/GameModeFields.tsx`, aussi dans Maps & Modes et World Settings) ; Maps & Modes › Default Modes (Default GameMode) et Selected GameMode (+ Créer BP_GameMode) ; ligne WorldSettings dans l'Outliner du niveau → Details › Game Mode › GameMode Override (focus `worldSettings`). La case « Game Mode » de Class Settings d'un pion ou d'un Player Controller devient une ligne « Default Pawn Class de… » avec un bouton vers Maps & Modes. Pendant Play, un GameMode Blueprint est dans l'Outliner en direct.
- **Leçon** « Les contrôles au Player Controller » : textes, indices et messages des vérifications passent par BP_GameMode › Class Defaults › Player Controller Class ; mémo, glossaire et notes à jour.
- **Tests** : `tests/gameMode.test.ts` (13) ; tests du Player Controller, du stockage, d'ue5Input et de l'Outliner mis à jour. Smoke : GameMode Override dans « Deux niveaux » (BP_Robot dans Lvl_Atelier), captures 117 (World Settings) et 118 (Maps & Modes).

Version 7.49.0.

## V7.50 (2026-11-21) : chantier n° 4, les étapes 1 à 4

Lancée par Tristan (« Tu peux lancer la suite »), selon le tableau des étapes de PLAN_NIVEAUX.md. **E40 du recueil** (à relire pour les étapes 3 à 6) n'est pas dans le dépôt : les étapes suivent le plan sans lui ; à aligner si Tristan le renvoie.

- **`core/lessons/library/travel.ts`** (module « Niveaux et GameInstance »), insérées juste après « Le checkpoint » (`index.ts`) :
  - **« Le couloir »** (`l-couloir`, chaîne `levels` › discover) : BP_Porte (overlap → Open Level vers Lvl_Atelier), BP_Panneau dans l'atelier (BeginPlay → Print String de Get Current Level Name). Vérifications : le jeu commence dans Lvl_Principal (Open Level au BeginPlay est signalé), arrive dans Lvl_Atelier (une faute de Level Name est expliquée d'après le « Travel Failure »), le panneau affiche Lvl_Atelier (préfixe UEDPIE signalé).
  - **P17 « Le score après la porte »** (`p17-score-porte`) : Score = 10 puis Open Level puis Print ; réponse « Score : 0, Porte franchie, Score : 0 ».
  - **« Le sac qui suit »** (`l-sac-qui-suit`, chaîne `game-instance` › guided) : départ avec le compte dans le pion (le comptoir affiche 0) ; créer BP_Jeu (GameInstance), le choisir dans Maps & Modes, compter et relire par Get Game Instance → Cast To. Vérifications : la Game Instance Class (absente ou pas choisie, deux messages), l'atelier atteint, le comptoir affiche 2 (0 : le compte est resté dans le couloir), notion : la variable Integer du GameInstance vaut 2, le comptoir lit Get Game Instance. N'importe quel nom de Blueprint ou de variable passe.
  - **D27 « Le sac vide »** (`d27-sac-vide`) : la solution précédente sans Game Instance Class ; les pièces restent, le comptoir dit « Le sac est vide » (Cast Failed). « Montre-moi » désigne la référence.
- **Builder** : `ProjectBuilder.level(nom, remplir)` crée un niveau et y pose acteurs et Player Start.
- **Notions** : `levels` et `game-instance` au catalogue (`NODE_NOTIONS` : `level.*`, Get Game Instance, Event Init / Shutdown), `LESSON_NOTIONS` des quatre étapes ; trois fiches de glossaire (Niveaux et Open Level, GameInstance, Pion du joueur et GameMode) ; fiche Player Controller mise à jour ; quatre questions de révision.
- **Espacement** (`tests/spacing.test.ts`) : les quatre étapes allongent de quatre au plus les écarts qui les traversent (hit, inheritance, player-controller, tick, timers) ; trace entre dans la liste (19). Pas de rappel : la solution du « Sac qui suit » réécrit un Cast et un Destroy déjà présents, ce qui ne compte pas comme écrit.
- **Tests** : `tests/levelLessons.test.ts` (10) ; `tests/widgetComponentLessons.test.ts` suit le nouvel ordre (D26 après D27). Smoke : 144 étapes, « Le sac qui suit » résolu passe Vérifier dans l'appli (captures 119, 120).

Version 7.50.0.

## V7.51 (2026-11-21) : chantier n° 4, les étapes 5 à 8 (fin du chantier)

Lancée par Tristan (« Tu peux lancer »). Toujours sans E40 du recueil (voir V7.50).

- **`core/lessons/library/travel.ts`**, après D27 (`index.ts`), avant D26 :
  - **« Arriver par la bonne porte »** (`l-bonne-porte`, chaîne `levels` › guided, rappel `other-bp`) : deux BP_Porte (Sortie : Nord, Sud, Instance Editable), deux BP_Arrivee dans l'atelier (Porte : Nord, Sud), BP_Jeu avec Arrivee (Name). La porte écrit Arrivee avant Open Level ; l'arrivée compare au BeginPlay et place le pion (Get Player Pawn, Set Actor Location). Scénario : porte sud, `restart`, porte nord. Messages : resté sur le Player Start, mauvais côté.
  - **D28 « L'objet ramassé réapparaît »** (`d28-objet-revient`) : CleRamassee (référence d'acteur) dans BP_Jeu, Is Valid au BeginPlay de la clé ; après l'aller-retour (BP_PorteRetour dans l'atelier), la référence vaut None et la clé revient. Solution : Ramasses (Set of Name), Add (Id) puis Contains (Id).
  - **T6 « Le pion de l'atelier »** (`t6-pion-atelier`, chaîne `game-mode` › transfer) : BP_Drone dans l'atelier par un GameMode Override, BP_Joueur gardé au couloir (le Default GameMode ne doit pas changer).
  - **A4 « Reprendre la partie »** (`a4-reprendre`, chaîne `game-instance` › autonomy, deux jours après « Le sac qui suit ») : départ = solution du « Sac qui suit ». Scénario : une pièce, la porte, `restart` (Stop puis Play). Référence : BP_Sauvegarde (Niveau, Pieces) ; Event Shutdown écrit le slot « Partie », Event Init le relit (Pieces, et un Name Reprendre) ; le BeginPlay de BP_GameMode fait Open Level (Reprendre) puis le vide. N'importe quelle autre façon de sauver (à la porte, par exemple) passe.
- **Correcteur** : le pas `restart` appelle d'abord `game.shutdown()` (Stop : Destruct, End Play, Event Shutdown), comme Play dans l'appli. Aucune leçon existante ne change de résultat.
- **Reprise** : notion `game-mode` au catalogue (`NODE_NOTIONS` : Get Game Mode) ; `LESSON_NOTIONS` des quatre étapes ; mémos « Les classes du Gameplay Framework » (trois durées de vie, ce que l'appli simule) et « Niveaux et sauvegarde » (Open Level, GameInstance, Event Init / Shutdown ; « pas simulés » retiré) ; fiche de glossaire GameMode (GameMode Override, World Settings) ; quatre questions de révision.
- **Espacement** : les huit étapes allongent les écarts qui les traversent ; `KNOWN_GAPS` relevé (actor-components 17, enhanced-input 16, input 16, widget-component 16 entrent dans la liste).
- **Tests** : `tests/levelLessons.test.ts` (14). Smoke : 148 étapes, « Arriver par la bonne porte » résolu passe Vérifier (capture 121).

Version 7.51.0.

## V7.52 (2026-11-21) : revue du chantier n° 4, lot 1 (le moteur après Open Level)

Lancée par Tristan (« Ok pour 1 et 2, pour trois on simule maintenant, on peut passer à la correction »), selon [REVUE_NIVEAUX.md](REVUE_NIVEAUX.md). Réponses : timers du GameInstance qui survivent (1), A4 sauve à la porte et à Shutdown (2), plusieurs Player Start simulés maintenant (3, V7.53).

- **R1** : la `Game` tient un seul `RunRecord`, une seule Execution Trace (`SimulationOptions.record`, `trace`) pour tous ses mondes. « Pourquoi ? » et « Montre-moi » voient le couloir après Open Level (D27 : le Cast To de BP_Piece).
- **G1** : Event Init part avec `Simulation.beforePlayers` vrai ; le BeginPlay de tous passe dans une phase après lui. Pendant Init, Get Player Pawn, Get Player Controller et Get Game Mode rendent None (`WorldApi.beforePlayers`), comme dans UE où Init précède le GameMode et le login.
- **G2** : la `Game` tient le `TimerSet` (`SimulationOptions.timers`) ; au voyage, `keepOwners` ne garde que ceux du GameInstance. Ses Delay sont comptés à chaque image (`tickLatents(gameInstance)` : avant, un Delay dans un GameInstance ne finissait jamais).
- **E1** : `Simulation.endPlayed` : un acteur ou un composant ne reçoit End Play qu'une fois (Stop pendant un End Play de voyage).
- **E2** : `Game.savesKept` : seuls les SaveGame que le GameInstance atteint (par ses variables, ou par un autre SaveGame gardé) passent au monde suivant.
- **Règles** : changement n° 6 (`model/rules.ts`), avis à l'ouverture d'un projet plus ancien.
- **Tests** : `tests/reviewNiveaux.test.ts` (9) ; `tests/gameMode.test.ts` suit G1 (Get Game Mode vaut None dans Init).

Version 7.52.0.

## V7.53 (2026-11-21) : plusieurs Player Start, Player Start Tag, Choose Player Start

Réponse 3 de Tristan à la revue (« pour trois on simule maintenant ») : le constat L2 de [REVUE_NIVEAUX.md](REVUE_NIVEAUX.md) devient une version.

- **Modèle, format 18** : `Level.otherStarts` (PlayerStart2, PlayerStart3…, ids `ps_…`), `PlayerStartSpot.tag` (Player Start Tag), `playerStartsOf`, `MAIN_START_ID`, `isPlayerStartId`. `Graph.override` (`'ChoosePlayerStart'`) : une fonction surchargée, nom et signature fixes (renommer, changer les paramètres ou la rendre pure est refusé). `validate.ts` répare les deux.
- **Moteur** : les Player Starts sont des acteurs de la classe native `PlayerStart` (`BUILTIN_HIERARCHY`), trouvés par Get All Actors Of Class (valeur `PlayerStart` acceptée par Compile, refusée pour Spawn Actor) ; nœud **Get Player Start Tag** (`playerStart.getTag`). `Simulation.placePlayer`, après Event Init et avant les BeginPlay : la surcharge Choose Player Start du GameMode (appelée avec Player = le Player Controller) ou, sans elle, un Player Start libre au hasard (`blockedAt`, graine de la partie). None : « RestartPlayer: Player start not found » (le joueur reste au premier, alors qu'UE ne le ferait pas apparaître).
- **Éditeur** : Place Actors › Placer un Player Start ; tous dessinés avec leur tag ; Outliner (PlayerStart, PlayerStart2…) ; Details : Location, Rotation, **Player Start Tag**, Supprimer (sauf le premier) ; My Blueprint d'un GameMode : Functions › **Override › ChoosePlayerStart** ; ses Details en lecture seule (`OverrideFunctionDetails`). Le cadrage du niveau inclut tous les Player Starts.
- **« Arriver par la bonne porte » refaite** (`revision: 2`) : l'atelier a trois Player Starts (milieu, Nord, Sud) ; BP_Arrivee disparaît ; la solution surcharge Choose Player Start dans BP_GameMode (Get All Actors Of Class › PlayerStart, Cast To BP_Jeu, For Each Loop, Get Player Start Tag == Arrivee, Return Node ; Completed : Get index 0). Nouvelle vérification de notion `choose` ; Set Actor Location sur le pion passe en « à éviter ». Glossaire « Player Start et Choose Player Start », mémos à jour.
- **Tests** : `tests/playerStarts.test.ts` (9) ; `tests/levelLessons.test.ts` suit la nouvelle étape ; smoke : captures 122 (les trois Player Starts, Details de PlayerStart3) et 123 (Choose Player Start dans BP_GameMode).

Version 7.53.0.

## V7.54 (2026-11-21) : revue du chantier n° 4, lot 2 (les étapes et les docs)

Suite des corrections lancées par Tristan ([REVUE_NIVEAUX.md](REVUE_NIVEAUX.md), réponse 2 : sauver à la porte et à Shutdown).

- **P1, A4** : la solution de référence a une fonction **Sauver (Niveau)** dans BP_Jeu ; BP_Porte l'appelle avec Lvl_Atelier juste avant Open Level, Event Shutdown avec Get Current Level Name. « À retenir », questions de « Comment t'y prendre », indices et défi le disent (sur un téléphone, fermer l'appli ne déclenche pas Shutdown ; Event Init vient avant le GameMode). Note Piège sur Event Shutdown (`explain/notes.ts`, Application Will Enter Background), description du nœud et mémo « Niveaux et sauvegarde » à jour. Les vérifications acceptent toujours toute façon de sauver.
- **P2 et L1, T6** (`revision: 2`) : le drone a ses commandes, IMC_Drone (E → IA_Monter), qu'il ajoute lui-même à son BeginPlay (Get Player Controller → Enhanced Input Local Player Subsystem → Add Mapping Context) : rappels `player-controller` et `enhanced-input`. Le projet a le BP_PlayerController du template (`ensurePlayerInput`). Nouvelle vérification `controls` (E après la porte). La vérification `override` regarde le Default GameMode sur un niveau sans override (avant : le pion du couloir, qu'un override pouvait cacher). `KNOWN_GAPS` : enhanced-input sort de la liste, player-controller 54 → 45.
- **D1** : HANDOFF (reprise rapide, parcours à 148 étapes et 178 questions, liste à cocher), BACKLOG (essais en retard). E40 du recueil n'est toujours pas dans le dépôt.
- **Tests** : `tests/reviewNiveaux.test.ts` (12 au total : A4 sauve à la porte avant Stop, T6 avec Default GameMode changé, T6 sans Mapping Context).

Version 7.54.0.

## V7.55 (2026-11-21) : E40, le pion choisi par le GameMode (moteur)

Lancée par Tristan (« Ok lance (ajoute au backlog le possess si intéressant) ») après la relecture d'E40 du recueil (v1.1, renvoyé en entier le 21 novembre). L'étape C8 viendra en V7.56.

- **Surcharge Get Default Pawn Class For Controller** (`OverridableFunction`, `functionOps.overrideFunction`, table `OVERRIDES` : In Controller → Return Value, Class Reference Pawn). `Simulation.choosePawnClass`, dans `placePlayer` après Choose Player Start (ordre d'UE : FindPlayerStart puis SpawnDefaultPawnFor) : la classe rendue remplace la Default Pawn Class, le pion préparé est refait en place (même id `player`, ses Actor Components de logique refaits, position gardée). None ou une classe qui n'est pas un Pawn : avertissement « SpawnDefaultPawnFor », la Default Pawn Class reste (dans UE, pas de pion).
- **Le Construction Script du pion** part maintenant dans `placePlayer`, après Event Init et le choix du GameMode (`construct()` le saute) : le pion n'existe qu'une fois, de la bonne classe, comme le Spawn du login d'UE.
- **Correcteur** : `{ restart: true, level: 'Lvl_…' }` relance la partie dans ce niveau (le lancement direct d'une carte de jeu).
- **Éditeur** : les deux surcharges dans My Blueprint d'un GameMode ; Details de la surcharge selon laquelle.
- **Backlog** : Possess et Unpossess (« Aller plus loin après le chantier n° 4 »).
- **Tests** : `tests/pawnClass.test.ts` (6).

Version 7.55.0.

## V7.56 (2026-11-21) : Complète C8 « Le personnage choisi » (E40 du recueil)

Lancée par Tristan (« Tu peux lancer »), après la V7.55.

- **`core/lessons/library/chosenAvatar.ts`**, juste après T6 : `Lvl_Menu` (Game Default Map, renommé depuis Lvl_Principal ; BP_GameModeMenu en override, son Player Controller BP_PCMenu affiche WBP_Choix en UI Only), deux vitrines BP_Agent et BP_Drone ; WBP_Choix : chaque bouton trouve sa vitrine (Get Actor Of Class) et appelle **Choisir (Vitrine : Pawn)** ; `Lvl_Jeu` (Default GameMode BP_GameMode, pion BP_Agent, une porte vers le menu). BP_Jeu : **Choix** (référence d'acteur, le piège d'E40) et **Avatar** (Class Reference de Pawn, BP_Agent par défaut). Deux trous : Trou 1, la surcharge **GetDefaultPawnClassForController** de BP_GameMode (faite, vide) doit rendre Avatar ; Trou 2, Choisir doit écrire Avatar = **Get Class** (Vitrine) au lieu de Choix = Vitrine.
- **Scénario** : Drone, la porte, Agent, puis `restart` dans Lvl_Jeu. **Vérifications** : le Drone joué (messages : la vitrine vaut None derrière la porte ; la classe gardée mais Trou 1 vide), un seul pion (un Spawn Actor en plus est le doublon), l'Agent au retour, le lancement direct (pas de « SpawnDefaultPawnFor »), notion : Avatar vaut BP_Drone. Spawn Actor en « à éviter ».
- **Get Class** suit le type de l'objet relié (le DeterminesOutputType d'UE) : entrée générique limitée aux objets (`wildGroup: 'object'`), sortie Class Reference de ce type. **Format 19** : les Get Class déjà reliés sont typés par leur fil (`adoptFromLinks`, seulement sur un projet bien formé).
- **Reprise** : notions de C8 (`game-mode`, `game-instance`), glossaire (Get Default Pawn Class For Controller dans « Pion du joueur et GameMode »), une question de révision (et celle d'A4 alignée sur la V7.54), `KNOWN_GAPS` + 1 pour les écarts qui traversent C8. **Pas de mini-exercice** « Niveaux et GameInstance » dans la file « À retravailler en Blueprint » : une nouvelle famille est un travail à part, noté au BACKLOG.
- **Tests** : `tests/chosenAvatar.test.ts` (6) ; `tests/levelLessons.test.ts` (149 étapes, C8 après T6). Smoke : 149 étapes, C8 résolue passe Vérifier dans l'appli (capture 124).

Version 7.56.0.

## V7.57 (2026-11-21) : revue de la progression, outillage

Revue de la progression des exercices ([REVUE_PARCOURS_EXERCICES.md](REVUE_PARCOURS_EXERCICES.md)) ; Tristan a pris les recommandations (« Ok pour tes recos, tu peux lancer ») : les cinq versions V7.57 à V7.61, dans l'ordre, une version chacune.

- **`core/notions/practice.ts`** : les nœuds de widget comptent enfin. `umg` : `widget.*` (sauf Get Owning Player, qui reste `player-controller`), `var.widget`, Construct, Destruct, Pre Construct, On Initialized, Tick du widget, On Clicked ; `ui-input` : Set Input Mode (Game Only, UI Only, Game and UI), Set Show Mouse Cursor, On Clicked. Set Input Mode et le curseur ne comptent plus comme `enhanced-input` (aucun écart n'a bougé).
- **`tests/spacing.test.ts`** : `umg: 40` (de L23 à « Le menu qui rend le contrôle ») et `ui-input: 56` (rien après A3) entrent dans `KNOWN_GAPS`, comme cliquet. Les V7.58 à V7.61 doivent les faire baisser.
- **Conseil de construction `decor-input`** (`quality/advice.ts`, dès le Confirmé) : « Un objet du décor écoute les touches », une fois par graphe d'un Blueprint de classe Actor qui contient une Input Action ou un événement de touche. Le pion et le Player Controller n'en ont pas. Comme les autres conseils, il est retiré quand le projet de départ de la leçon le déclenche déjà.
- **Tests** : `tests/quality.test.ts` (le conseil, et le cas « chaîne copiée » écrit dans un Pawn pour ne pas le déclencher).

Version 7.57.0.

## V7.58 (2026-11-21) : revue de la progression, les commandes par le Player Controller

Deuxième version de la revue ([REVUE_PARCOURS_EXERCICES.md](REVUE_PARCOURS_EXERCICES.md), constat 1).

- **`core/lessons/playerCommands.ts`** (`asPlayerCommands`, appliqué dans `index.ts` après `asEnhancedInput`, table `PLAYER_COMMANDS`) : dans les 16 étapes après R4 dont un objet du niveau écoutait une Input Action, l'événement d'action de l'objet devient un **Custom Event** (IA_Tirer → Tirer ; `events` renomme quand le nom ne dit rien : IA_Interagir → AjouterPiece, Abattre, Parler ; IA_Recalculer → DemanderRecalcul, car BP_Source a déjà un Custom Event Recalculer), l'objet perd Auto Receive Input, et **BP_PlayerController** reçoit l'action : Get Actor Of Class → l'événement, ou Get All Actors Of Class → For Each Loop → l'événement quand le niveau en a plusieurs (téléphones, miroirs, coffres, bornes du réseau : chacun entendait la touche). Même principe qu'`asEnhancedInput` : la solution, les autres façons de faire et la robustesse tournent sur la forme « action » puis sont reconverties ; les textes (situation, objectifs, indices, fiches) sont réécrits (IA_Tirer → Event Tirer) ; la fiche « Les touches, comme dans UE5 » devient « Les commandes, comme dans UE5 », qui liste chaque commande. `revision` + 1 pour les 16.
- **`learnerWrites`** : l'apprenant écrit lui-même la ligne du Player Controller dans six étapes (L36 Les cartes tirées sans remise, L53 Le standard téléphonique, L61 Le rayon et les miroirs, L66 L'interrogatoire, C6 Annuler et refaire, L72 Le réseau en boucle). Elle manque au départ ; une vérification bloquante `pc-<action>` dit où l'écrire (« Dans BP_PlayerController, IA_Tirer (Started) doit prévenir BP_Paquet : … »). Un événement que seule la solution écoutait (Choix1, Choix2 de l'interrogatoire) est posé vide dans le projet de départ.
- **Écart à la revue** : L49, D17 et L67 devaient passer par l'Event Interagir de R4, et L61 par le Line Trace. Leurs scénarios appuient sur E sans s'approcher ni viser : ils passent par le Player Controller comme les autres. L67 est reprise en V7.59 (boîte de dialogue).
- **`core/notions/practice.ts`** : écrire des nœuds dans un Blueprint de classe PlayerController compte comme `player-controller`. Écarts : `player-controller` 45 → 28, `input` revient sous 15 (retiré de `KNOWN_GAPS`).
- **Tests** : `tests/playerCommands.test.ts` (aucun objet n'écoute de touche après R4, au départ ni dans la solution ; la ligne à écrire fait échouer le départ avec un message qui nomme BP_PlayerController) ; `tests/v6.test.ts` (le piège du four part de l'Event Lancer).

Version 7.58.0.

## V7.59 (2026-11-21) : revue de la progression, les messages à l'écran

Troisième version de la revue ([REVUE_PARCOURS_EXERCICES.md](REVUE_PARCOURS_EXERCICES.md), constat 2). Réponse de Tristan prise : écran exigé dans L67 (et S4, en V7.60), notion non bloquante dans L51 et M2.

- **Moteur** : `Umg.textLog` garde chaque texte écrit par Set Text (pas les Bindings), passé d'un monde à l'autre par Open Level ; `CheckContext.shown()` le donne aux vérifications, à travers un `restart` comme `prints()`.
- **`core/lessons/library/messageHud.ts`** : **WBP_Messages** (un Text en bas de l'écran, fonction **Afficher (Texte)**), `ownMessages` (l'acteur le crée au BeginPlay : Create Widget, Owning Player = Self dans un Player Controller, Get Player Controller ailleurs, Set Messages, Add to Viewport), `afficher` et `afficherViaController` pour les solutions, `told` / `countTold` (Output Log et écran) et `onScreen` pour les vérifications.
- **L51 Le terminal** : BP_Joueur crée WBP_Messages ; la réponse s'affiche par Afficher. Les vérifications acceptent encore Print String ; notion « La réponse s'affiche à l'écran ». `revision` 2.
- **M2 Le distributeur** : BP_PlayerController crée WBP_Messages ; le cahier des charges demande le compte et « Vide » à l'écran (le nom que dit un objet à sa naissance reste une trace, en Print String). Notion « Le joueur lit le compte à l'écran ». `revision` 3.
- **L67 Le dialogue en Data Table** devient une vraie boîte de dialogue : **WBP_Dialogue** fourni (fond, Txt_Nom, Txt_Replique, fonction **Montrer**), créé par la radio à la première réplique (Is Valid sur **Boite**, sinon Create Widget → Set Boite → Add to Viewport), retiré à la fin (Remove from Parent). Vérifications bloquantes : la boîte à l'écran avec Oren au 1er appui, les trois répliques dans une seule boîte, la boîte partie au 4e. Rappels `umg` et `player-controller`. `revision` 2.
- **S4** n'est pas touchée ici : elle est refaite en V7.60, avec l'écran.
- **Tests** : `tests/screenMessages.test.ts` (la boîte, le piège de la fin trop tôt, l'ancienne solution en Print String refusée dans L67 et acceptée sans la notion dans L51 et M2).

Version 7.59.0.

## V7.60 (2026-11-21) : revue de la progression, les synthèses

Quatrième version de la revue ([REVUE_PARCOURS_EXERCICES.md](REVUE_PARCOURS_EXERCICES.md), constat 3). Réponse de Tristan prise : S4 refaite entièrement.

- **S2 La réserve** (`library/synthesis.ts`, `revision` 2) : la porte pivote en douceur (Timeline 0,5 s, vérifiée à mi-course), se referme en douceur 2 s après ; un texte à l'écran dit `Clé : non` puis `Clé : oui` (Widget Blueprint créé par BP_PlayerController, que la clé prévient). Le projet est réglé comme le template UE5 (`ensurePlayerInput` sans touche). Le message « clé » peut être un Print String ou un texte à l'écran.
- **S3 Le poste de garde** (`library/synthesis3.ts`, `revision` 2) : l'alerte ne finit plus par un second E mais par le bouton **Fin d'alerte** de **WBP_Alerte** (dessiné, graphe vide) : le pupitre le crée au début de l'alerte (Pupitre = Self par Expose on Spawn), Game and UI et curseur ; le bouton appelle FinAlerte, qui remet tout, retire le panneau, Game Only, curseur caché. Rappels `umg` et `ui-input`.
- **S4 Les fusibles** (`library/synthesis4.ts`, refaite, `revision` 2) : deux niveaux (Lvl_Couloir, Lvl_Salle ; le sas fait Open Level, donné) ; les fusibles comptent dans le GameInstance ; E agit sur ce que le joueur regarde (Line Trace, BPI_Interactif) ; le tableau répond à l'écran (WBP_Messages, exigé) ; avec trois fusibles, il recharge chacun de ses Appareils par son Actor Component **BP_Energie** (deux lampes et un écran qui y réagissent chacun à leur façon) ; le courant rétabli est sauvé (slot Station) et une nouvelle partie dans la salle démarre alimentée. Question de révision réécrite (le GameInstance).
- **Écarts** : `umg` 40 → 31, `ui-input` 56 → 54, `player-controller` 28 → 19, `timeline` 51 → 48, `trace` 24 → 21, `interfaces` 22 → 21.
- **Tests** : `tests/lot4.test.ts` (S4 : sans Game Instance Class, sans relecture de la sauvegarde, avec un E envoyé à tout ce qui est à portée).

Version 7.60.0.

## V7.61 (2026-11-21) : revue de la progression, trois entraînements mélangés

Dernière version de la revue ([REVUE_PARCOURS_EXERCICES.md](REVUE_PARCOURS_EXERCICES.md), constat 4) : **la revue est entièrement faite** (V7.57 à V7.61).

- **`core/lessons/library/mixed2.ts`**, un cahier des charges sans nom d'outil à chaque fois :
  - **M3 Le monte-charge**, fin de l'Intermédiaire (avant A1) : E envoie le plateau à l'étage suivant d'une liste de hauteurs, en douceur (1 s), et ignore E pendant le trajet (Enhanced Input, tableau et modulo, Timeline, Branch).
  - **M4 Le stand de tir**, Confirmé (après D18) : trois cibles qui annoncent leurs points sans savoir qui compte (Event Dispatcher), score et record à l'écran (UMG), record gardé d'une partie à l'autre (Save Game), E cache et remontre le tableau (Flip Flop, Remove from Parent, Add to Viewport).
  - **M5 Le marché de la station**, Avancé (après A4) : une caisse et un bidon, deux Blueprints, ramassés par un même Actor Component ; les crédits traversent la porte (GameInstance) ; le total s'affiche au-dessus du comptoir (Widget Component).
- **Reprise** : notions (`mixed`), trois questions de révision, `KNOWN_GAPS` (les écarts qui traversent les trois étapes ont grandi d'un ou deux ; actor-components et widget-component passent sous 15 ; destroy, functions, save-game baissent), smoke à 152 étapes.
- **152 étapes** : Débutant 15, Intermédiaire 34, Confirmé 49, Avancé 52, Expert 2. 182 questions de révision.

Version 7.61.0.

## V7.62 (2026-11-21) : revue du chantier « progression », lot 1 (ce que voit l'apprenant)

Lancée par Tristan (« Ok passe aux corrections ») après [REVUE_PROGRESSION_V7_61.md](REVUE_PROGRESSION_V7_61.md) : les recommandations sont prises (les trois lots dans l'ordre, masquage de M4 retiré, menus de l'Avancé pour le projet Expert final, journal des textes rempli seulement pendant Vérifier).

- **A1, D3 La tourelle** : `CommandSpec.guard` (`playerCommands.ts`) met un **Is Valid** entre Get Actor Of Class et l'appel dans la ligne fournie du Player Controller ; la fiche des commandes l'explique quand une étape en a un. Un second E après la destruction ne donne plus d'Accessed None. `revision` 2 (3 avec la conversion).
- **A2, la vérification `pc-<action>`** suit les fils depuis l'action jusqu'à l'appel du Custom Event sur la bonne classe (`reachesCall`). Une action reliée à autre chose a son propre message : « IA_Tirer arrive dans BP_PlayerController, mais n'appelle pas Tirer sur BP_Paquet ».
- **A3, notions déclarées** (`lessonNotions.ts`) remises à jour : S2, S3, S4 (sets, begin-order et rotation retirés ; GameInstance, Line Trace, interfaces, Actor Components ajoutés), M2 à M5, L36, L53, L61, L66, L67, C6, L72. Nouveau test (`tests/lot2.test.ts`) : une synthèse ou un entraînement mélangé déclare chaque notion que sa solution écrit (sauf celles de tout le Débutant : variables, calcul, Branch, événements, Print String, composants).
- **A4, S2 et Sequence** : **écart à la revue**. La solution par Timeline Finished → Delay → Reverse ne convient pas : Finished revient quand la porte a fini de se refermer, et l'attente repartirait en boucle. Sequence reste, et c'est bien celui du Prédis P1 « Sequence et Delay » (même usage : lancer une chose et une attente côte à côte) : l'indice y renvoie, et la notion est déclarée.
- **Tests** : `tests/playerCommands.test.ts` (ligne branchée sur un Print String dans L36, L61, C6 ; D3 sans erreur au second E).

Version 7.62.0.

## V7.63 (2026-11-21) : revue du chantier « progression », lot 2 (la taille)

Suite des corrections ([REVUE_PROGRESSION_V7_61.md](REVUE_PROGRESSION_V7_61.md), B1 et B2). Réponses prises : retirer le masquage de M4, garder les menus de l'Avancé pour le projet Expert final.

- **M4 Le stand de tir** (`mixed2.ts`, `revision` 2) : E ne cache plus le tableau (Flip Flop, Remove from Parent, Add to Viewport), ajouté seulement pour l'écart des entrées. IA_Score disparaît du projet de départ ; les deux vérifications, l'objectif et le point 5 du cahier des charges sont retirés, les rappels `enhanced-input` et `flow-memory` aussi. 57 → 51 nœuds à écrire.
- **`tests/spacing.test.ts`** : `input: 16` et `'enhanced-input': 16` entrent dans `KNOWN_GAPS` (16, un au-dessus de la cible).
- **S3** reste telle quelle (58 nœuds).
- **BACKLOG.md**, chantier n° 5 : X1 et X2 à refaire les plus gros ; un menu et un mode d'entrée à faire écrire, l'Avancé n'en ayant plus après S3.

Version 7.63.0.

## V7.64 (2026-11-21) : revue du chantier « progression », lot 3 (code)

Dernier lot des corrections ([REVUE_PROGRESSION_V7_61.md](REVUE_PROGRESSION_V7_61.md), C1 à C3) : **la revue est entièrement corrigée** (V7.62 à V7.64). Réponse prise : le journal des textes n'est rempli que pendant Vérifier.

- **C1, `Umg.textLog`** : rempli seulement quand l'hôte le demande (`SimulationOptions.logTexts`, que le correcteur passe à chaque `Game`). Play en simulation libre ne garde plus rien, même avec un Tick qui écrit un texte à chaque image.
- **C2, ce qui est à l'écran** : chaque entrée garde son objet widget et `seen` ; `Umg.markSeen()` (après les Bindings, à chaque image) la marque vue si le widget est peint (`drawn`) ; `shownTexts()` (lu par `CheckContext.shown()`) ne rend que les textes vus. Open Level ne garde que les textes vus. M5 lit le texte du WBP_Total au-dessus du comptoir, plus n'importe quel texte écrit.
- **C3** : « que BP_PlayerController appelle quand on appuie sur IA_Interagir » (L49, D17, L67) ; Get Show Mouse Cursor compte comme `ui-input`.
- **Tests** : `tests/screenMessages.test.ts` (L51 avec un WBP_Messages jamais ajouté à l'écran : la notion « à l'écran » échoue ; M4 en simulation libre : journal vide, avec `logTexts` : le score y est).

Version 7.64.0.

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
