/**
 * A rough duration for each step, shown on the path ("≈ 10 min"): from how
 * many nodes the reference solution adds to the starting project. Debugging
 * takes longer than its few changed nodes suggest; a « Prédis » is short.
 */
import type { Project } from '../model/project';
import type { Lesson } from './types';

const FREE = new Set(['util.comment', 'util.reroute']);
const cache = new Map<string, number>();

function nodeCount(p: Project): number {
  let n = 0;
  for (const c of p.classes) for (const g of c.graphs) for (const node of Object.values(g.nodes)) if (!FREE.has(node.def)) n++;
  return n;
}

const roundTo5 = (m: number) => Math.round(m / 5) * 5;

export function estimatedMinutes(lesson: Lesson): number {
  const known = cache.get(lesson.id);
  if (known !== undefined) return known;
  let minutes: number;
  if (lesson.kind === 'predict') minutes = 5;
  else {
    const start = lesson.setup();
    const solved = lesson.setup();
    lesson.solve(solved);
    const added = Math.abs(nodeCount(solved) - nodeCount(start));
    minutes = roundTo5(4 + 1.5 * added);
    if (lesson.kind === 'debug') minutes = Math.max(minutes, 10);
    if (lesson.chain?.step === 'autonomy') minutes += 5;
    // A synthesis mixes a whole level; an Expert project takes several sittings.
    if (lesson.kind === 'synthesis') minutes += 10;
    const cap = lesson.level === 'expert' ? 120 : lesson.kind === 'synthesis' ? 45 : 30;
    minutes = Math.min(cap, Math.max(5, minutes));
  }
  cache.set(lesson.id, minutes);
  return minutes;
}
