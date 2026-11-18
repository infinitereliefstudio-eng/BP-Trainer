/**
 * « Montre-moi » : after a failed check, the nodes worth looking at first.
 * Taken from the run itself, never from what the lesson expects:
 *
 * - a runtime error: the node that failed;
 * - where the white wire stopped: a node that ran, whose exec output leading
 *   on was never taken (a Cast that always failed, a Branch that always went
 *   the other way);
 * - an event that has wires but never fired during the check.
 *
 * Errors first, then where the wire stopped, then silent events; three at most.
 */
import type { Project } from '../model/project';
import { contextFor, getDefinition, nodeTitle, resolvePins } from '../nodes/registry';
import type { Simulation } from '../runtime/simulation';
import { locate } from './where';

export interface Stop {
  kind: 'error' | 'stopped' | 'silent';
  classId: string;
  graphId: string;
  nodeId: string;
  /** What was found, for the learner. */
  text: string;
}

const MAX = 3;
const SKIP = new Set(['util.reroute', 'util.comment']);

function stoppedText(def: string, pin: string, from: string, to: string): string {
  if (def === 'cast.to' && pin === 'then') return `${from} n’a jamais réussi pendant la vérification : ${to} n’a pas été atteint. L’objet testé n’était-il jamais du bon type ?`;
  if (def === 'flow.branch') return `Le Branch n’est jamais sorti par ${pin === 'true' ? 'True' : 'False'} : ${to} ne s’est pas exécuté. Regarde ce que vaut la Condition.`;
  return `${from} s’est exécuté, mais le fil blanc n’est jamais arrivé à ${to}.`;
}

export function whereItStopped(project: Project, sim: Simulation): Stop[] {
  const out: Stop[] = [];
  const seen = new Set<string>();
  const add = (s: Stop) => {
    const key = `${s.graphId}:${s.nodeId}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push(s);
  };

  for (const entry of sim.log) {
    if (entry.level !== 'error' || !entry.site) continue;
    const site = locate(project, entry.site.graphId, entry.site.nodeId);
    if (site) add({ kind: 'error', classId: site.cls.id, graphId: site.graph.id, nodeId: site.node.id, text: `Erreur ici : ${entry.text}` });
  }

  const silent: Stop[] = [];
  for (const cls of project.classes) {
    const ctx = contextFor(cls, project);
    for (const graph of cls.graphs) {
      for (const link of Object.values(graph.links)) {
        const from = graph.nodes[link.from.node];
        const to = graph.nodes[link.to.node];
        if (!from || !to || SKIP.has(from.def) || SKIP.has(to.def)) continue;
        const pin = resolvePins(from, ctx).find((p) => p.id === link.from.pin);
        if (pin?.type.category !== 'exec') continue;
        const ran = sim.record.runsOf(graph.id, from.id)?.count ?? 0;
        if (!ran) {
          if (getDefinition(from.def)?.kind === 'event') {
            silent.push({
              kind: 'silent',
              classId: cls.id,
              graphId: graph.id,
              nodeId: from.id,
              text: `${nodeTitle(from, ctx)} ne s’est jamais déclenché pendant la vérification.`,
            });
          }
          continue;
        }
        if (sim.record.takenCount(graph.id, from.id, link.from.pin) > 0) continue;
        if (sim.record.runsOf(graph.id, to.id)?.count) continue;
        add({ kind: 'stopped', classId: cls.id, graphId: graph.id, nodeId: to.id, text: stoppedText(from.def, link.from.pin, nodeTitle(from, ctx), nodeTitle(to, ctx)) });
      }
    }
  }
  for (const s of silent) add(s);
  return out.slice(0, MAX);
}
