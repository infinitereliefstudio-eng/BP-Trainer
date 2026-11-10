/** The four levels of the learning path, all open from the start. */
export type Level = 'debutant' | 'intermediaire' | 'confirme' | 'avance';

export const LEVELS: { id: Level; title: string; summary: string }[] = [
  { id: 'debutant', title: 'Débutant', summary: 'Événements, composants, variables, collisions et touches.' },
  { id: 'intermediaire', title: 'Intermédiaire', summary: 'Rotation, Cast, attente, Switch, Enums, tableaux, Map et Timeline.' },
  { id: 'confirme', title: 'Confirmé', summary: 'Références, Event Dispatchers, interfaces, fonctions, structures et Construction Script.' },
  { id: 'avance', title: 'Avancé', summary: 'Héritage, visée par Line Trace, collisions, et des projets qui combinent tout.' },
];
