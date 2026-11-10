/**
 * Construction advice: rules on the shape of a graph, shown once a lesson
 * works (and on demand in free play). They do not understand intent, so they
 * are tips, never failures: each says what it saw and what would be sturdier.
 */
import type { Level } from '../lessons/levels';
import type { BlueprintClass, Graph, NodeInstance, Project } from '../model/project';
import type { NodeContext } from '../nodes/definition';
import { contextFor, findPin, getDefinition, nodeTitle } from '../nodes/registry';

export interface Advice {
  rule: string;
  classId: string;
  className: string;
  graphId: string;
  nodeId: string;
  title: string;
  text: string;
}

const LEVEL_RANK: Record<Level, number> = { debutant: 0, intermediaire: 1, confirme: 2, avance: 3 };

/** Nodes that make something move or turn a little at a time. */
const CONTINUOUS = new Set([
  'actor.addOffset',
  'actor.setLocation',
  'actor.setRotation',
  'component.addRelativeRotation',
  'component.setRelativeLocation',
  'component.setRelativeRotation',
  'component.setIntensity',
]);
const STEPPING = new Set(['actor.addOffset', 'component.addRelativeRotation']);
const DELAYS = new Set(['time.delay', 'time.retriggerableDelay']);
const SEARCHES = new Set(['actor.getAllOfClass', 'actor.getOfClass']);
const OVERLAPS = new Set(['event.actorBeginOverlap', 'event.actorEndOverlap', 'event.componentBeginOverlap', 'event.componentEndOverlap']);

interface GraphView {
  cls: BlueprintClass;
  graph: Graph;
  ctx: NodeContext;
  /** node id → exec successors, in wire order. */
  next: Map<string, string[]>;
  /** "node:pin" of every output pin that has a wire. */
  wiredOut: Set<string>;
}

function view(cls: BlueprintClass, graph: Graph, ctx: NodeContext): GraphView {
  const next = new Map<string, string[]>();
  const wiredOut = new Set<string>();
  for (const l of Object.values(graph.links)) {
    wiredOut.add(`${l.from.node}:${l.from.pin}`);
    const from = graph.nodes[l.from.node];
    if (!from || findPin(from, l.from.pin, ctx)?.type.category !== 'exec') continue;
    next.set(l.from.node, [...(next.get(l.from.node) ?? []), l.to.node]);
  }
  return { cls, graph, ctx, next, wiredOut };
}

/** Every node an event's exec wires lead to, the event excluded. */
function reach(v: GraphView, start: string): NodeInstance[] {
  const seen = new Set<string>();
  const todo = [...(v.next.get(start) ?? [])];
  while (todo.length) {
    const id = todo.pop()!;
    if (seen.has(id)) continue;
    seen.add(id);
    todo.push(...(v.next.get(id) ?? []));
  }
  return [...seen].map((id) => v.graph.nodes[id]).filter(Boolean);
}

type Rule = (v: GraphView, add: (rule: string, node: NodeInstance, title: string, text: string) => void) => void;

const tickRules: Rule = (v, add) => {
  for (const tick of Object.values(v.graph.nodes)) {
    if (tick.def !== 'event.tick') continue;
    const chain = reach(v, tick.id);
    if (!chain.length) continue;
    const usesDelta = v.wiredOut.has(`${tick.id}:delta`) || Object.values(v.graph.nodes).some((n) => n.def === 'time.getWorldDeltaSeconds');
    const delay = chain.find((n) => DELAYS.has(n.def));
    if (delay) {
      add('delay-on-tick', delay, 'Delay sur Tick', 'Un Delay ignore les appels qui arrivent pendant son attente : derrière Tick, la suite ne s’exécute qu’une fois par durée, pas à chaque image. Set Timer by Event en Looping dit la même chose clairement, et s’arrête avec Clear Timer.');
    }
    const search = chain.find((n) => SEARCHES.has(n.def));
    if (search) {
      add('search-on-tick', search, `${nodeTitle(search, v.ctx)} sur Tick`, 'Cette recherche parcourt tout le niveau à chaque image. Fais-la une fois, au BeginPlay, et garde le résultat dans une variable.');
    }
    const moving = chain.find((n) => CONTINUOUS.has(n.def));
    if (!moving && !delay) {
      add('tick-poll', tick, 'Tick qui surveille', 'Ce Tick ne déplace rien : il vérifie quelque chose 60 fois par seconde, même quand rien ne change. Un événement fait le même travail au seul moment utile : un overlap, un Event Dispatcher, un Custom Event appelé par celui qui change la valeur, ou un timer.');
    }
    const step = chain.find((n) => STEPPING.has(n.def));
    if (step && !usesDelta) {
      add('tick-no-delta', step, 'Mouvement sur Tick sans Delta Seconds', 'Une distance fixe ajoutée à chaque image donne une vitesse qui dépend du nombre d’images par seconde : deux fois plus lente sur un appareil deux fois plus lent. Multiplie la vitesse par Delta Seconds.');
    }
  }
};

const overlapRule: Rule = (v, add) => {
  for (const ev of Object.values(v.graph.nodes)) {
    if (!OVERLAPS.has(ev.def) || v.wiredOut.has(`${ev.id}:other`)) continue;
    if (!reach(v, ev.id).length) continue;
    add('overlap-anyone', ev, 'Overlap sans regarder Other Actor', 'N’importe quel acteur qui traverse la zone déclenche la suite : un ennemi, une caisse, un projectile. Si seul le joueur doit compter, vérifie Other Actor : Cast To, ou == avec Get Player Pawn.');
  }
};

/** What makes two nodes "the same" for a copied chain: definition, settings and typed values. */
const signature = (n: NodeInstance) => `${n.def}|${JSON.stringify(n.config)}|${JSON.stringify(n.defaults)}`;
const CHAIN = 3;

const copiedChainRule: Rule = (v, add) => {
  const starts = new Map<string, NodeInstance[]>();
  for (const n of Object.values(v.graph.nodes)) {
    const kind = getDefinition(n.def)?.kind;
    if (kind !== 'function' && kind !== 'flow' && kind !== 'variable') continue;
    const run: NodeInstance[] = [n];
    while (run.length < CHAIN) {
      const succ = v.next.get(run[run.length - 1].id) ?? [];
      const nextNode = succ.length === 1 ? v.graph.nodes[succ[0]] : undefined;
      if (!nextNode || run.includes(nextNode)) break;
      run.push(nextNode);
    }
    if (run.length < CHAIN) continue;
    const key = run.map(signature).join(' → ');
    starts.set(key, [...(starts.get(key) ?? []), n]);
  }
  const flagged = new Set<string>();
  for (const [, nodes] of starts) {
    if (nodes.length < 2 || nodes.some((n) => flagged.has(n.id))) continue;
    for (const n of nodes) flagged.add(n.id);
    add('copied-chain', nodes[1], 'Chaîne copiée', `La même suite de ${CHAIN} nœuds (à partir de ${nodeTitle(nodes[0], v.ctx)}) existe ${nodes.length} fois à l’identique. Une fonction ou un Custom Event la garderait à un seul endroit : une correction se ferait une fois, pas ${nodes.length}.`);
  }
};

/** Rules, with the level from which a learner has met what they talk about. */
const RULES: { from: Level; run: Rule }[] = [
  { from: 'intermediaire', run: tickRules },
  { from: 'intermediaire', run: overlapRule },
  { from: 'confirme', run: copiedChainRule },
];

/**
 * Advice for every graph of the project. `level` keeps only the rules a
 * learner of that level can act on (all of them when absent).
 */
export function adviceFor(project: Project, level?: Level, classNames?: string[]): Advice[] {
  const out: Advice[] = [];
  const rank = level ? LEVEL_RANK[level] : 99;
  for (const cls of project.classes) {
    if (classNames && !classNames.includes(cls.name)) continue;
    const ctx = contextFor(cls, project);
    for (const graph of cls.graphs) {
      const v = view(cls, graph, ctx);
      for (const r of RULES) {
        if (LEVEL_RANK[r.from] > rank) continue;
        r.run(v, (rule, node, title, text) => out.push({ rule, classId: cls.id, className: cls.name, graphId: graph.id, nodeId: node.id, title, text }));
      }
    }
  }
  return out;
}
