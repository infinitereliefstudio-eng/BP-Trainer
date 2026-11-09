/** The four levels of the learning path, all open from the start. */
export type Level = 'debutant' | 'intermediaire' | 'confirme' | 'avance';

export const LEVELS: { id: Level; title: string; summary: string }[] = [
  { id: 'debutant', title: 'Débutant', summary: 'Événements, composants, variables, collisions et touches.' },
  { id: 'intermediaire', title: 'Intermédiaire', summary: 'Rotation, Cast, attente, Switch, Enums et tableaux.' },
  { id: 'confirme', title: 'Confirmé', summary: 'Références entre Blueprints, Event Dispatchers et interfaces.' },
  { id: 'avance', title: 'Avancé', summary: 'Des projets complets qui combinent tout.' },
];
