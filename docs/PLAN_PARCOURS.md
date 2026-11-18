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
| 1 — Remise à jour et réflexes UE5 | Textes (Content Drawer, Description, Pin Options), Find References dans les Débogue, Enhanced Input comme règle après la leçon 15, objets qui n'écoutent plus les touches ; en deux temps (Confirmé puis Avancé) | À faire |
| 2 — Débutant et Intermédiaire | Leçon 4 scindée, Cast isolé, échelle Delay → timers, Construis ta lampe, La porte sur son gond, Prédis Où est la lumière, Une valeur par lampe, Appuyer ou fouiller, rappels, deux synthèses | À faire |
| 3 — Confirmé | Choisis ton outil, Le menu pause, Qui a éteint la lumière (Find), Interagir comme dans UE5, rappels, synthèse ; composants et fonctions créés par l'apprenant | À faire |
| 4 — Avancé et Expert | Cahiers des charges, Le levier universel, projets Expert (suite « jeu narratif »), entraînement mélangé | À faire |

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
