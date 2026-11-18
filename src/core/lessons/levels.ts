/**
 * The levels of the learning path, all open from the start. Each sets how
 * much help its steps give (helpPolicy.ts): open up to Intermédiaire, then
 * less and less, down to none in Expert.
 */
export type Level = 'debutant' | 'intermediaire' | 'confirme' | 'avance' | 'expert';

export const LEVELS: { id: Level; title: string; summary: string; help: string }[] = [
  {
    id: 'debutant',
    title: 'Débutant',
    summary: 'Événements, composants, variables, collisions et touches.',
    help: 'Aide ouverte : indice, nœuds et solution quand tu veux.',
  },
  {
    id: 'intermediaire',
    title: 'Intermédiaire',
    summary: 'Rotation, Cast, attente, Switch, Enums, tableaux, Map et Timeline.',
    help: 'Aide ouverte : indice, nœuds et solution quand tu veux.',
  },
  {
    id: 'confirme',
    title: 'Confirmé',
    summary: 'Références, Event Dispatchers, interfaces, fonctions, structures et Construction Script.',
    help: 'Aide verrouillée : l’indice après un premier essai, pas de liste de nœuds, la solution après la réussite ou trois vérifications ratées.',
  },
  {
    id: 'avance',
    title: 'Avancé',
    summary: 'Héritage, visée par Line Trace, collisions, et des projets qui combinent tout.',
    help: 'Aide verrouillée : l’indice après un premier essai, pas de liste de nœuds, la solution seulement après la réussite, pour comparer.',
  },
  {
    id: 'expert',
    title: 'Expert',
    summary: 'Des projets longs, sur plusieurs séances, à construire de zéro.',
    help: 'Sans aide : le cahier des charges et le scénario de test, « Montre-moi » après un échec, la solution après la réussite.',
  },
];
