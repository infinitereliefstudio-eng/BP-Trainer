# Idées notées pour plus tard

## Retours sur la qualité des solutions (noté le 6 novembre 2026) — fait à l'étape E de la V3

Aujourd'hui, une leçon vérifie surtout le **résultat** dans le niveau : une solution différente de celle prévue réussit si elle produit le bon comportement. Deux leçons imposent en plus une notion (Branch en leçon 4, DoOnce en leçon 5), ce qui refuse des solutions valables.

Pistes :

1. **Séparer « ça marche » de « notion visée »** : la contrainte de notion devient un objectif à part, affiché comme tel, plus comme un échec.
2. **Scénarios de robustesse**, joués après la réussite : un autre acteur entre dans la zone, allers-retours rapides, deux instances dans le niveau… Retour du type « ça marche dans le cas prévu, mais pas si… ».
3. **Remarques de construction** (règles sur le graphe, jamais bloquantes) : Tick qui sonde au lieu d'un événement, Delay sur Tick, overlap qui ne vérifie pas Other Actor, chaîne dupliquée qui mériterait une fonction.
4. **« Une autre façon de faire »** après réussite : une ou deux solutions alternatives, avec avantages et limites.

Limites : règles sans compréhension de l'intention (fausses alertes possibles, donc conseils seulement) ; variantes et alternatives écrites leçon par leçon ; pas d'IA hors ligne.

## Laissé de côté à l'étape 3

- ~~Variables locales des fonctions, paramètres des fonctions d'interface, fonctions d'interface avec sortie.~~ Fait à l'étape A de la V3.
- ~~Remplacer un Custom Event par l'événement d'interface du même nom en un geste.~~ Fait à l'étape A de la V3.
- ~~Pendant Play : modifier une variable d'instance dans Details, choisir l'objet débogué depuis le niveau.~~ Fait à l'étape 4 avec l'Outliner en direct.
- ~~Flèches entre les acteurs du niveau qui se référencent (Details › variables Instance Editable).~~ Fait à l'étape C de la V3.

## Après la V3 (noté le 10 novembre 2026)

- Qualité : étendre les scénarios de robustesse (dix leçons aujourd'hui) et les autres façons de faire (cinq leçons) aux leçons qui s'y prêtent ; d'autres règles de conseil (Cast sur Tick, référence lue sans Is Valid, variable jamais lue).
- Timeline : points clés arrondis (Auto), pistes Vector, Color et Event, Play Rate, Set Timeline Length.
- Collisions : Sweep sur Set Actor Location et Add Actor World Offset (dans UE il ne balaie que le composant racine : il faudrait pouvoir choisir un Static Mesh comme racine), Collision Presets par composant et par canal, Sphere / Box / Multi Line Trace, Simulate Physics.
- Construction Script : créer des composants (Add Static Mesh Component), variables locales du script.
- Toujours hors périmètre : GameMode, GameInstance, Save Game, Open Level (plusieurs niveaux), Data Tables, widgets UMG, ordre des Tick entre acteurs, Enhanced Input.
- Parcours : un projet de synthèse de la V3 (porte à Timeline, visée, structure d'objet, Construction Script) en fin d'Avancé.
