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
| 3 — Confirmé | Choisis ton outil, Le menu pause, Qui a éteint la lumière (Find), Interagir comme dans UE5, rappels, synthèse ; composants et fonctions créés par l'apprenant | **3a fait en V7.15** (les quatre étapes) ; 3b à faire (rappels, synthèse S3) |
| 4 — Avancé et Expert | Cahiers des charges, Le levier universel, projets Expert (suite « jeu narratif »), entraînement mélangé | À faire |

## Ce qui reste (pour la reprise)

État au 2026-11-19 : lots 0, 1 et 2 faits (V7.10 à V7.14), lot 3a fait (V7.15, quatre nouvelles étapes Confirmé, lancé par Tristan le 2026-11-19). Le lot 3b (rappels et synthèse S3) ne commence qu'avec son feu vert explicite, après son retour sur la V7.15.

### Lot 3a — fait en V7.15

- **Choisis ton outil** (`library/chooseTool.ts`, après D2) : trois coins (borne de soin : Cast ; alarme et gyrophares : Event Dispatcher, l'alarme ne doit connaître aucun gyrophare, vérifié ; disjoncteur et trois appareils de classes différentes : Interface, pas de Cast, vérifié). Notion `choose-tool`.
- **Débogue D21 « Qui a éteint la lumière ? »** (`library/whoTurnedOff.ts`, après D12) : huit Blueprints, l'appel de trop est dans BP_Ventilation ; se trouve par Find References sur Event Eteindre. Notion `find`.
- **Refactor R4 « Interagir comme dans UE5 »** (`library/interactUe5.ts`, après P8) : les objets écoutaient IA_Interagir (Auto Receive Input, bProche) ; le joueur reçoit l'action et prévient par BPI_Interactif ; un coffre de plus réagit sans toucher au joueur.
- **Le menu pause** (`library/pauseMenu.ts`, après D11) : IA_Pause créée par l'apprenant, Trigger when Paused, Set Game Paused et Is Game Paused dans BP_PlayerController ; le « menu » est un message (pas de widgets). Notion `pause`.
- Décision prise sans réponse de Tristan (question posée le 2026-11-19) : menu pause sans widget, sur Espace.

### Lot 3b — Confirmé, ce qui reste (36 étapes aujourd'hui, de « Générateur et lampe » à D18)

Repères du Claude Doc, colonne « Confirmé » : fiche = situation + ce qui est nouveau ; pas de liste des nœuds ; indices après un essai ; solution après réussite ou trois échecs (déjà dans `helpPolicy.ts`) ; **niveau et Blueprints vides** au départ ; solutions de 8 à 15 nœuds ; l'apprenant crée **ses composants dans le Viewport et ses fonctions**.

Étapes prévues (les quatre premières sont faites, voir 3a) :
- **« Choisis ton outil »** : un même besoin (prévenir d'autres acteurs), trois variantes ; l'apprenant choisit Cast, Event Dispatcher ou Interface selon la variante. Idée fausse visée : « ils font la même chose ».
- **« Le menu pause »** : contenu à préciser avec Tristan (le Doc ne donne que le titre ; le nœud Set Game Paused n'existe pas encore dans l'appli : il faudrait l'ajouter, définition et comportement).
- **« Qui a éteint la lumière ? »** : un Débogue qui se résout avec Find References / Find in all Blueprints (outils livrés en V7.8).
- **« Interagir comme dans UE5 »** : le joueur reçoit IA_Interagir (overlap ou Line Trace) et prévient l'objet visé par une interface, au lieu des objets qui écoutent eux-mêmes l'action (Auto Receive Input, gardé dans les étapes converties au lot 1 ; voir l'écart noté en V7.11 dans HANDOFF.md).
- **Rappels** dans les étapes Confirmé existantes : faire redescendre les écarts montés en V7.14 et V7.15 (`KNOWN_GAPS` commentés `V7.14` et `V7.15` : les quatre étapes du 3a allongent de 1 à 4 les trous qui traversent le Confirmé), plus ceux au-dessus de la cible.
- Notions difficiles du Doc concernées : « Ordre et cycle de vie » (un Prédis Construction Script ou BeginPlay, des rappels de Construction Script et de Tick) ; « Choisir Cast, Dispatcher ou Interface ».
- **Synthèse S3** en fin de Confirmé, qui impose le choix de l'outil.

### Lot 4 — Avancé et Expert

Repères : Avancé = cahier des charges, aucune liste des nœuds, indices sous forme de questions (où regarder), solution après réussite, **niveau seul** au départ (l'apprenant crée ses Blueprints et ses assets), 12 à 25 nœuds. Expert = cahier des charges + scénario de test, aucun indice (« Montre-moi » après un échec), bilan après réussite, **décor seul**, 25 nœuds et plus, sur plusieurs séances (décision de Tristan).

Étapes prévues : cahiers des charges pour les étapes Avancé ; « Le levier universel » ; projets Expert, dont la suite « jeu narratif » calquée sur Station enterrée (déjà au BACKLOG) ; entraînement mélangé (étapes qui mélangent plusieurs notions sans dire laquelle utiliser) ; rappels de tableaux et copies dans les étapes qui manipulent des listes ; une sauvegarde dans la synthèse Avancé (S4) ; héritage repris en Expert.

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
