/**
 * The pages of the home screen and the spaces of its rail (UI-2, V7.84): « Apprendre » (Aujourd'hui, Parcours,
 * Révision), « Consulter » (Nœuds, Mémo UE, Carnet) and « Créer » (Mes projets). Réglages sits at the bottom of the
 * rail, apart: it is a dialog, not a page.
 */
import type { IconName } from '../widgets/icons';

export type Page = 'today' | 'path' | 'review' | 'nodes' | 'memo' | 'notebook' | 'projects';
export type SpaceId = 'learn' | 'consult' | 'create';

export interface Space {
  id: SpaceId;
  label: string;
  icon: IconName;
  pages: { id: Page; label: string }[];
}

export const SPACES: readonly Space[] = [
  {
    id: 'learn',
    label: 'Apprendre',
    icon: 'cap',
    pages: [
      { id: 'today', label: 'Aujourd’hui' },
      { id: 'path', label: 'Parcours' },
      { id: 'review', label: 'Révision' },
    ],
  },
  {
    id: 'consult',
    label: 'Consulter',
    icon: 'book',
    pages: [
      { id: 'nodes', label: 'Nœuds' },
      { id: 'memo', label: 'Mémo UE' },
      { id: 'notebook', label: 'Carnet' },
    ],
  },
  { id: 'create', label: 'Créer', icon: 'cube', pages: [{ id: 'projects', label: 'Mes projets' }] },
];

export function spaceOf(page: Page): Space {
  return SPACES.find((s) => s.pages.some((p) => p.id === page)) ?? SPACES[0];
}
