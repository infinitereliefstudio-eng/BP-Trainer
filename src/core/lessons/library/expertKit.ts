/**
 * What every Expert project shares: the scenery (walls, and a plot marking
 * where each Blueprint goes) and the card that says how an Expert project
 * works. Kept from X1 « La radio de la station », retired from the path in
 * V7.72 (its dialogue Mapping Context lives on in Le réveil's terminal).
 */
import { levelOf } from '../../model/project';
import { T } from '../../types/pins';
import type { ProjectBuilder } from '../builder';
import type { LessonCard } from '../types';

/** Scenery: walls, and a plot marking where each Blueprint goes. */
export function expertScenery(pb: ProjectBuilder, plots: [[number, number], string][]): void {
  const wall = pb.blueprint('BP_Decor');
  wall.component('StaticMesh', 'Mur', { sizeX: 40, sizeY: 900, color: '#374151' });
  pb.place(wall, -800, 0);
  pb.place(wall, 800, 0);
  const plot = pb.blueprint('BP_Plot');
  plot.component('StaticMesh', 'Marque', { shape: 'cylinder', sizeX: 90, sizeY: 90, color: '#334155', blocks: false });
  plot.component('TextRender', 'Lettre', { y: -70, text: '?' });
  const label = plot.variable('Lettre', T.string, '?');
  plot.cls.variables[0].instanceEditable = true;
  const { b: cs, entry } = plot.construction();
  const set = cs.node('component.setText', {}, {}, [360, 96]);
  cs.link(entry, 'then', set, 'exec').link(cs.node('var.get', { variable: label }, {}, [200, 300]), 'value', set, 'value').target('Lettre', set);
  for (const [at, letter] of plots) {
    const id = pb.place(plot, ...at);
    levelOf(pb.project).actors.find((a) => a.id === id)!.overrides[label] = letter;
  }
}

/** The card every Expert project shares. */
export const EXPERT_RULES: LessonCard = {
  title: 'Un projet Expert',
  body:
    'Un projet long, à faire en plusieurs séances : ton travail est gardé entre deux ouvertures. Il n’y a ni indice ni liste de nœuds. Après une vérification ratée, « Montre-moi » dit où la partie s’est arrêtée ; après la réussite, la solution de référence et le bilan s’ouvrent pour comparer.\n\n' +
    'Les vérifications cherchent les Blueprints par le nom que donne le cahier des charges, et les acteurs posés près des plots.',
};
