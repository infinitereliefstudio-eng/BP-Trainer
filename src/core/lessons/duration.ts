/**
 * A rough duration for each step, shown on the path ("≈ 10 min"): from the
 * work the reference solution does on the starting project. Nodes added
 * count fully, nodes deleted a little (a refactor rewrites as much as it
 * adds), and each asset made counts too: a Blueprint, an interface, a
 * variable, a function, an Input Action… (review of 19 November 2026, P3).
 * Debugging takes longer than its few changed nodes suggest; a « Prédis »
 * is short.
 */
import type { Project } from '../model/project';
import type { Lesson } from './types';

const FREE = new Set(['util.comment', 'util.reroute']);
const cache = new Map<string, number>();

/** Node ids of the project, by class and graph. */
function nodeIds(p: Project): Set<string> {
  const ids = new Set<string>();
  for (const c of p.classes) for (const g of c.graphs) for (const [id, node] of Object.entries(g.nodes)) if (!FREE.has(node.def)) ids.add(`${c.id}/${g.id}/${id}`);
  return ids;
}

/** Ids of what can be created besides nodes, each with its weight in nodes. */
function assetIds(p: Project): Map<string, number> {
  const out = new Map<string, number>();
  const add = (kind: string, id: string, weight: number) => out.set(`${kind}:${id}`, weight);
  for (const c of p.classes) {
    add('class', c.id, 3);
    for (const v of c.variables) add('var', `${c.id}/${v.id}`, 1);
    for (const d of c.dispatchers ?? []) add('dispatcher', `${c.id}/${d.id}`, 1);
    for (const g of c.graphs) if (g.kind === 'function') add('function', `${c.id}/${g.id}`, 1);
    for (const k of c.components) add('component', `${c.id}/${k.id}`, 1);
  }
  for (const i of p.interfaces ?? []) add('interface', i.id, 2);
  for (const e of p.enums ?? []) add('enum', e.id, 2);
  for (const s of p.structs ?? []) add('struct', s.id, 2);
  for (const t of p.dataTables ?? []) add('table', t.id, 2);
  for (const a of p.inputActions ?? []) add('action', a.id, 1);
  for (const m of p.mappingContexts ?? []) add('context', m.id, 1);
  return out;
}

/** The work from `start` to `solved`, in nodes. */
function work(start: Project, solved: Project): number {
  const before = nodeIds(start);
  const after = nodeIds(solved);
  let added = 0;
  let removed = 0;
  for (const id of after) if (!before.has(id)) added++;
  for (const id of before) if (!after.has(id)) removed++;
  const assetsBefore = assetIds(start);
  let made = 0;
  for (const [id, weight] of assetIds(solved)) if (!assetsBefore.has(id)) made += weight;
  return added + 0.3 * removed + made;
}

const roundTo5 = (m: number) => Math.round(m / 5) * 5;

export function estimatedMinutes(lesson: Lesson): number {
  const known = cache.get(lesson.id);
  if (known !== undefined) return known;
  let minutes: number;
  if (lesson.kind === 'predict') minutes = 5;
  else {
    // One starting project and its solved copy: node and asset ids match.
    const start = lesson.setup();
    const solved = structuredClone(start);
    lesson.solve(solved);
    minutes = roundTo5(4 + 1.5 * work(start, solved));
    // A bug takes time to find, but its fix is small, even when the reference solution rewrites a whole graph.
    if (lesson.kind === 'debug') minutes = Math.min(20, Math.max(minutes, 10));
    if (lesson.chain?.step === 'autonomy') minutes += 5;
    // A synthesis mixes a whole level; an Expert project takes several sittings.
    if (lesson.kind === 'synthesis') minutes += 10;
    const cap = lesson.level === 'expert' ? 120 : lesson.kind === 'synthesis' ? 45 : 30;
    minutes = Math.min(cap, Math.max(5, minutes));
  }
  cache.set(lesson.id, minutes);
  return minutes;
}
