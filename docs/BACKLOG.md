# Idées notées pour plus tard

## Retours sur la qualité des solutions (noté le 6 novembre 2026)

Aujourd'hui, une leçon vérifie surtout le **résultat** dans le niveau : une solution différente de celle prévue réussit si elle produit le bon comportement. Deux leçons imposent en plus une notion (Branch en leçon 4, DoOnce en leçon 5), ce qui refuse des solutions valables.

Pistes :

1. **Séparer « ça marche » de « notion visée »** : la contrainte de notion devient un objectif à part, affiché comme tel, plus comme un échec.
2. **Scénarios de robustesse**, joués après la réussite : un autre acteur entre dans la zone, allers-retours rapides, deux instances dans le niveau… Retour du type « ça marche dans le cas prévu, mais pas si… ».
3. **Remarques de construction** (règles sur le graphe, jamais bloquantes) : Tick qui sonde au lieu d'un événement, Delay sur Tick, overlap qui ne vérifie pas Other Actor, chaîne dupliquée qui mériterait une fonction.
4. **« Une autre façon de faire »** après réussite : une ou deux solutions alternatives, avec avantages et limites.

Limites : règles sans compréhension de l'intention (fausses alertes possibles, donc conseils seulement) ; variantes et alternatives écrites leçon par leçon ; pas d'IA hors ligne.
