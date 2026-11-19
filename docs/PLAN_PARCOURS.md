# Plan du parcours (18 novembre 2026)

Copie de travail du Claude Doc « BP Trainer — Analyse du parcours et pédagogie » : https://claude.ai/artifact/3raFiT4Sfcj627iPZR56iK. Plan validé par Tristan le 2026-11-18, un lot à la fois avec son feu vert.

## Constats (mesurés sur les 93 étapes)

- L'aide augmente avec le niveau (indices médians 303 → 532 caractères) au lieu de s'estomper.
- Tout est préconstruit : 45 % des nœuds déjà posés en Débutant, 66 % en Confirmé ; l'apprenant crée un Blueprint une fois, des composants une fois.
- Près de la moitié des notions ne sont presque plus écrites après leur leçon (Timeline, Construction Script, héritage, Enhanced Input…).
- Entrées surchargées : la leçon 4 introduit 5 notions ; le Cast arrive avec deux autres.
- Pratique en blocs, pas de niveau sans aide, réflexes d'UE4 (touche E et objets qui écoutent les touches après la leçon Enhanced Input).

## Principes retenus

Une notion nouvelle par étape ; une échelle par notion (découvrir, guidé, modifier, transfert, autonomie différée) ; aide fixée par le niveau ; rappels courts dans chaque étape ; synthèse en fin de niveau ; construire soi-même de plus en plus ; notions difficiles introduites par le problème, un Prédis sur l'idée fausse, un Débogue juste après.

## Décisions de Tristan

| Décision | Choix |
|---|---|
| Aide | Ouverte en Débutant et Intermédiaire, verrouillée à partir du Confirmé |
| Rappels | Obligatoires mais petits (un ou deux nœuds) |
| Niveau Expert | Oui, projets longs sur plusieurs séances |
| Synthèses | Conseillées, jamais bloquantes |
| Ordre | Lots 0 et 1, puis lot 2 et la suite |

## Lots

| Lot | Contenu | État |
|---|---|---|
| 0 — Cadre | Règle d'aide par niveau, rappels (`Lesson.recalls`) et test d'espacement à cliquet, échelle à 5 marches, niveau Expert, type d'étape synthèse | **Fait en V7.10** |
| 1 — Remise à jour et réflexes UE5 | Textes (Content Drawer, Description, Pin Options), Find References dans les Débogue, Enhanced Input comme règle après la leçon 15 ; en deux temps (Intermédiaire et Confirmé, puis Avancé) | **Fait** : 1a en V7.11 (16 étapes), 1b en V7.12 (14 étapes Avancé) |
| 2 — Débutant et Intermédiaire | Leçon 4 scindée, Cast isolé, échelle Delay → timers, Construis ta lampe, La porte sur son gond, Prédis Où est la lumière, Une valeur par lampe, Appuyer ou fouiller, rappels, deux synthèses ; en deux temps (Débutant, puis Intermédiaire) | **Fait** : 2a en V7.13 (Débutant : Construis ta lampe, P12, compteur avant la leçon à touche recentrée, rappels, synthèse S1), 2b en V7.14 (Intermédiaire : La porte sur son gond, Les pièces, P13, Le gyrophare, Une valeur par lampe, T2 Appuyer ou fouiller, synthèse S2) |
| 3 — Confirmé | Choisis ton outil, Le menu pause, Qui a éteint la lumière (Find), Interagir comme dans UE5, rappels, synthèse ; composants et fonctions créés par l'apprenant | **Fait** : 3a en V7.15 (les quatre étapes), 3b en V7.16 (rappels, Prédis P14, synthèse S3) |
| 4 — Avancé et Expert | Cahiers des charges, Le levier universel, projets Expert (suite « jeu narratif »), entraînement mélangé | **4a fait en V7.17** (Avancé) ; 4b à faire (Expert) |

## Ce qui reste (pour la reprise)

État au 2026-11-19 : lots 0 à 3 faits (V7.10 à V7.16), lot 4a fait (V7.17, l'Avancé). Le lot 4b (Expert) ne commence qu'avec le feu vert explicite de Tristan.

### Lot 3a — fait en V7.15

- **Choisis ton outil** (`library/chooseTool.ts`, après D2) : trois coins (borne de soin : Cast ; alarme et gyrophares : Event Dispatcher, l'alarme ne doit connaître aucun gyrophare, vérifié ; disjoncteur et trois appareils de classes différentes : Interface, pas de Cast, vérifié). Notion `choose-tool`.
- **Débogue D21 « Qui a éteint la lumière ? »** (`library/whoTurnedOff.ts`, après D12) : huit Blueprints, l'appel de trop est dans BP_Ventilation ; se trouve par Find References sur Event Eteindre. Notion `find`.
- **Refactor R4 « Interagir comme dans UE5 »** (`library/interactUe5.ts`, après P8) : les objets écoutaient IA_Interagir (Auto Receive Input, bProche) ; le joueur reçoit l'action et prévient par BPI_Interactif ; un coffre de plus réagit sans toucher au joueur.
- **Le menu pause** (`library/pauseMenu.ts`, après D11) : IA_Pause créée par l'apprenant, Trigger when Paused, Set Game Paused et Is Game Paused dans BP_PlayerController ; le « menu » est un message (pas de widgets). Notion `pause`.
- Décision prise sans réponse de Tristan (question posée le 2026-11-19) : menu pause sans widget, sur Espace.

### Lot 3b — fait en V7.16

- **Rappels** (un à trois nœuds, vérifiés, `revision` + 1) : Choisis ton outil (les gyrophares clignotent : timer), Le générateur prévient (« Premier démarrage » une fois : DoOnce), Le catalogue (chaque objet se présente une fois : DoOnce), Les badges (le lecteur ouvre sa Porte : rotation), La rangée de lampes (Puissance, Enum E_Puissance : Switch on Enum et Set Intensity dans le Construction Script), Les vagues (Éclaireur, Soldat, Boss : Switch on Int), L'ascenseur (OnArrivee déjà déclaré et BP_Quai abonné : DoOnce → Call à l'arrivée).
- **Prédis P14 « Qui parle en premier ? »** (`library/predicts3.ts`, après La clôture) : l'ordre Construction Script → BeginPlay du drone → suite du hangar dans un Spawn Actor (notion difficile « Ordre et cycle de vie » ; P5 couvrait déjà l'ordre pour un acteur posé).
- **Synthèse S3 « Le poste de garde »** (`library/synthesis3.ts`, fin du Confirmé) : badge (Cast, Destroy), pupitre prévenu par interface (le joueur ne fait aucun Cast, vérifié), alerte annoncée par Event Dispatcher (le pupitre ne connaît ni gyrophares ni porte, vérifié), Point Light à ajouter aux gyrophares, porte fermée par Timeline, « Badge requis » une fois (DoOnce).
- **Espacement** : `writtenNotions` compte maintenant par Blueprint (déplacer une chaîne dans un autre Blueprint, c'est l'écrire). Baisses : components et visibility 22 → 16, destroy 44 → 38, dispatchers 36 → 25, enhanced-input et input 27 → 20, enum 54 → 30, flow-memory 52 → 28, interfaces 28 → 22, overlap 27 → 21, rotation 40 → 17, switch 54 → 30, timeline 64 → 41, timers 47 → 27 ; loops atteint la cible. Hausses de 1 ou 2 (les deux étapes ajoutées) sur des trous qui finissent dans l'Avancé ou que le Confirmé n'écrit pas naturellement (maps, player-controller, sequence, latent, random, construction, spawn, tick…) : commentées « lot 4 » dans `KNOWN_GAPS`.

### Lot 4a — fait en V7.17 (Avancé)

- **L'Avancé comme cahier des charges** : `helpPolicy.cardsFor` garde les fiches de méthode (titres `PLAN_CARD_TITLES` : Le plan, La réécriture, Les nœuds, Par où commencer) jusqu'à la réussite, en Avancé et en Expert ; la fiche dit combien attendent. Premier indice de chaque étape Avancé réécrit en questions (où regarder). Objectifs sans recette pour six étapes (L'héritage, Regarder et interagir, Le rayon et les miroirs, La caisse qu'on pousse, Le dialogue en Data Table, Le checkpoint). Les fiches « Ce qui est en place » des étapes existantes restent : les réécrire toutes en cahier des charges n'a pas été fait.
- **Le levier universel** (`library/universalLever.ts`, après La salle de contrôle) : construit depuis le niveau (BP_Levier, BPI_Activable avec un paramètre, côté joueur, deux leviers posés sur les plots A et B, cibles en tableau d'Actor Instance Editable). Bloquant : aucune variable typée cible ni Cast dans le levier.
- **Entraînement mélangé** (`library/mixed.ts`, module « Entraînement mélangé », consigne sans outil désigné) : **M1 Le sas** (Construction Script, Timeline, timer, DoOnce, rotation ; après Regarder et interagir) et **M2 Le distributeur** (tirage au hasard, tableau, Spawn Actor et Expose on Spawn, Map ; après Le sac de randonnée). Notion de catalogue `mixed`.
- **Synthèse S4 « Les fusibles »** (`library/synthesis4.ts`, fin de l'Avancé) : SaveGame et Set of Name créés par l'apprenant, sauvegarde à chaque fusible, nouvelle partie où les fusibles pris ne reviennent pas (piège de l'ordre des BeginPlay : chaque fusible relit la sauvegarde), porte qui compte.
- **Espacement** : enhanced-input et input atteignent la cible ; construction 41 → 29, random 43 → 40, spawn 33 → 30. Ce qui court jusqu'à la fin du parcours (player-controller, tick, inheritance, sequence, latent, structs, data-tables, save-game, visibility) est commenté « Expert projects (lot 4b) » dans `KNOWN_GAPS`.

### Lot 4b — Expert, à faire

Repères : cahier des charges + scénario de test, aucun indice (« Montre-moi » après un échec), bilan après réussite, **décor seul**, 25 nœuds et plus, sur plusieurs séances (décision de Tristan). Prévu : projets Expert, dont la suite « jeu narratif » calquée sur Station enterrée (au BACKLOG : journal de quêtes par faits acquis, inventaire, dialogue en Data Table, porte à code) ; héritage repris en Expert ; faire revenir player-controller (par exemple un Mapping Context de dialogue ajouté et retiré par le Player Controller), Tick, Sequence, Delay, structures et Data Tables.

### Non attribué à un lot (demander à Tristan avant)

- « S'adapter à l'apprenant » (point 6 du Doc) : une notion fragile (solution vue, révision ratée) déclencherait un transfert de plus proposé par « Continuer ».
- L'apprenant crée ses variables dès l'Intermédiaire : fait seulement dans les étapes ajoutées au lot 2.
- Déclencheur Tap d'Enhanced Input (absent ; T2 utilise Hold + Canceled).

## Règle d'aide (core/lessons/helpPolicy.ts)

| Niveau | Indice | Liste des nœuds | Solution |
|---|---|---|---|
| Débutant, Intermédiaire | ouvert | ouverte | ouverte |
| Confirmé | après un premier essai | aucune | après réussite ou 3 vérifications ratées |
| Avancé | après un premier essai | aucune | après réussite |
| Expert | aucun | aucune | après réussite |

Un Prédis garde son aide ouverte. Transfert : tout après un premier essai ; autonomie : pas de liste de nœuds.

## Espacement (tests/spacing.test.ts)

Cible : une notion visible dans un graphe (`SPACED_NOTIONS`) est réécrite au plus 15 étapes après la précédente, de l'étape qui l'enseigne à la fin du parcours. `KNOWN_GAPS` garde les écarts d'aujourd'hui et sert de cliquet : un écart ne peut que baisser, et le test dit quelle valeur mettre ou retirer. Les rappels déclarés comptent, à condition que la solution de référence écrive vraiment la notion.
