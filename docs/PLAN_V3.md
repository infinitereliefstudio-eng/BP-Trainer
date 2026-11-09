# Plan V3

Copie du Claude Doc « BP Trainer — Plan V3 » (https://claude.ai/artifact/GDZsZN9sGLDfTNSH8TJeuW), lancé par Tristan le 2026-11-09 (« tu peux lancer »), avec les quatre propositions retenues par défaut.

La V3 ajoute les outils Blueprint d'un vrai jeu narratif : fonctions complètes, données structurées, mouvements fluides, interaction par visée. Elle apprend aussi à juger une solution, pas seulement à la faire marcher. Le parcours passe de 36 à 49 leçons et exercices, en cinq étapes, chacune validée sur le téléphone de Tristan avant la suivante.

## Fonctions complètes (étape A)

| Ajout | Dans UE | Avant | Ce qui change |
|---|---|---|---|
| Variables locales | Section Local Variables de My Blueprint, quand une fonction est ouverte ; remises à leur valeur par défaut à chaque appel | Absentes | Section Local Variables, Get / Set locaux ; erreur de compilation hors de leur fonction |
| Paramètres d'interface | Entrées et sorties, comme une fonction | Événements sans paramètre | Entrées et sorties sur chaque fonction d'interface ; pins sur le nœud Message |
| Implémentation | Sans sortie : un événement. Avec sortie : une fonction | Toujours un événement | Même règle qu'UE ; valeur par défaut si l'acteur n'implémente pas |
| Custom Event du même nom | UE propose de le convertir | Rien | Appui long › « Convertir en événement d'interface » |

« Fonctions pures et impures » est réécrite avec une variable locale.

## Données (étape B)

| Ajout | Nœuds | Piège expliqué |
|---|---|---|
| Structures (asset Structure) | Make, Break, Set Members in | Get d'un tableau de Struct donne une copie |
| Map | Add, Find, Remove, Contains, Keys, Values, Length | Find renvoie une valeur par défaut si la clé manque |
| Set | Add, Remove, Contains, Length, To Array | Pas d'ordre |
| Text et Name | Types, conversions, Format Text | Comparer des Text ; Name pour les identifiants |

## Mouvement et interaction (étapes C et D)

| Ajout | Dans le simulateur 2D | Piège expliqué |
|---|---|---|
| Timeline | Piste Float au doigt (points clés, durée, boucle) ; Play, Play from Start, Reverse, Stop ; Update, Finished | Play depuis la fin ne fait rien |
| Lerp, Map Range Clamped | Nœuds purs | Lerp dans Tick avec Alpha fixe n'arrive jamais |
| Line Trace By Channel | Rayon dans le plan, Out Hit éclaté, Draw Debug en Play | Le rayon touche d'abord l'acteur qui le lance |
| Event Hit | Collisions bloquantes entre acteurs | Se déclenche à chaque image tant qu'on pousse |
| Construction Script | Graphe exécuté dans l'éditeur à chaque placement ou réglage | Ne tourne pas en jeu ; pas encore de BeginPlay des autres |
| Flèches de références | Acteur → acteurs désignés par ses variables Instance Editable | — |

## Qualité des solutions (étape E)

Objectif « notion » séparé (non bloquant), scénarios de robustesse, conseils de construction, « une autre façon de faire » sur une quinzaine de leçons. Jamais bloquant.

## Parcours

| Niveau | Avant | Nouveau | Étape |
|---|---|---|---|
| Débutant | 7 | — | — |
| Intermédiaire | 11 | La porte qui glisse ; Les codes des portes (livrée à la place du « trousseau ») ; C3 | B, C |
| Confirmé | 11 | Les locales (livrée sous le titre « Le ticket de caisse ») ; La fiche de l'objet ; Les badges ; La rangée de lampes ; P4 ; D5 | A, B, C |
| Avancé | 7 | Le terminal ; Regarder et interagir ; La caisse qu'on pousse ; R3 | A, D |

## Étapes

| Étape | Contenu | Leçons et exercices |
|---|---|---|
| A — Fonctions | Variables locales, paramètres et sorties d'interface, conversion d'un Custom Event | Le ticket de caisse, Le terminal, P4 ; « Fonctions pures et impures » réécrite |
| B — Données | Asset Structure, Make / Break / Set Members, Map, Set, Text, Name | Les codes des portes, La fiche de l'objet, Les badges, D5 |
| C — Mouvement | Timeline, Lerp, Map Range Clamped, Construction Script, flèches de références | La porte qui glisse, La rangée de lampes, C3 |
| D — Interaction | Line Trace By Channel, Out Hit, Draw Debug, Event Hit | Regarder et interagir, La caisse qu'on pousse, R3 |
| E — Qualité | Notion visée, robustesse, conseils, autres façons de faire | Leçons existantes |

## Hors V3

GameMode, GameInstance, Save Game, Open Level, Data Tables, widgets UMG, ordre des Tick entre acteurs.

## Décisions (2026-11-09, propositions retenues par défaut au lancement)

1. Data Tables : plus tard.
2. Qualité en dernier (étape E).
3. Timeline : éditeur de piste avec points clés.
4. Line Trace en 2D : rayon depuis l'avant du joueur, visible en Play (Draw Debug Type For Duration par défaut dans les leçons).
