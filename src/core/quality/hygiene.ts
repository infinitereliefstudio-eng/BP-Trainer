/**
 * Construction rules about what a graph carries for nothing: nodes that never
 * run, values nobody reads, detours a simpler wiring avoids. Like the other
 * rules they are tips: each says what it saw and what to do instead.
 */
import type { Level } from '../lessons/levels';
import type { NodeInstance } from '../model/project';
import { getDefinition, nodeTitle, resolvePins } from '../nodes/registry';
import { type GraphView, reach, type Rule } from './graphView';

const isExec = (p: { type: { category: string } }) => p.type.category === 'exec';

/** Nodes with white pins that no white wire reaches, and pure nodes nobody reads. */
const unusedNodes: Rule = (v, add) => {
  for (const n of Object.values(v.graph.nodes)) {
    const def = getDefinition(n.def);
    if (!def || def.kind === 'event' || def.kind === 'entry' || def.kind === 'comment' || n.def === 'timeline.node') continue;
    const pins = resolvePins(n, v.ctx);
    const execIns = pins.filter((p) => p.dir === 'in' && isExec(p));
    if (execIns.length) {
      if (execIns.some((p) => v.wiredIn.has(`${n.id}:${p.id}`))) continue;
      add(
        'dead-node',
        n,
        `${nodeTitle(n, v.ctx)} jamais exécuté`,
        'Aucun fil blanc n’arrive sur ce nœud : il ne s’exécute jamais. Relie-le à l’événement qui doit le déclencher, ou supprime-le pour alléger le graphe.',
      );
      continue;
    }
    const outs = pins.filter((p) => p.dir === 'out' && !isExec(p));
    if (!outs.length || outs.some((p) => v.wiredOut.has(`${n.id}:${p.id}`))) continue;
    add(
      'unread-node',
      n,
      `${nodeTitle(n, v.ctx)} que personne ne lit`,
      'La sortie de ce nœud n’est reliée à rien : il ne sert pas. Un nœud sans pin blanche ne calcule que lorsqu’un nœud exécuté lit sa sortie. Relie-le ou supprime-le.',
    );
  }
};

/** `bOuvert == true` before a Branch says nothing more than `bOuvert`. */
const boolCompare: Rule = (v, add) => {
  for (const n of Object.values(v.graph.nodes)) {
    if (n.def !== 'logic.equalBool') continue;
    const a = v.wiredIn.has(`${n.id}:a`);
    const b = v.wiredIn.has(`${n.id}:b`);
    if (a === b) continue;
    const literal = n.defaults[a ? 'b' : 'a'] === true;
    add(
      'bool-compare',
      n,
      'Comparer un Boolean à une case cochée',
      literal
        ? 'Un Boolean vaut déjà vrai ou faux : « == vrai » redonne la même valeur. Relie le Boolean directement à la pin Condition, sans ce nœud.'
        : 'Comparer un Boolean à « faux » revient à l’inverser : le nœud NOT Boolean le dit en un mot, ou échange les sorties True et False du Branch.',
    );
  }
};

/** A Sequence with one output in use is a plain wire. */
const loneSequence: Rule = (v, add) => {
  for (const n of Object.values(v.graph.nodes)) {
    if (n.def !== 'flow.sequence' || !v.wiredIn.has(`${n.id}:exec`)) continue;
    const used = resolvePins(n, v.ctx).filter((p) => p.dir === 'out' && isExec(p) && v.wiredOut.has(`${n.id}:${p.id}`)).length;
    if (used >= 2) continue;
    add('lone-sequence', n, 'Sequence à une seule sortie', 'Un Sequence sert à lancer plusieurs suites l’une après l’autre. Avec une seule sortie reliée, il ne fait que prolonger le fil blanc : relie directement les deux nœuds.');
  }
};

/** A variable written by Set nodes that nothing ever reads. */
const writeOnly: Rule = (v, add) => {
  const flagged = new Set<string>();
  for (const n of Object.values(v.graph.nodes)) {
    if (n.def !== 'var.set') continue;
    const id = String(n.config.variable ?? '');
    const variable = v.cls.variables.find((x) => x.id === id);
    if (!variable || flagged.has(id) || variable.instanceEditable || variable.exposeOnSpawn) continue;
    const read = v.project.classes.some((c) =>
      c.graphs.some((g) =>
        Object.values(g.nodes).some(
          (o) => o.config.variable === id && ((o.def !== 'var.set' && o.def !== 'var.setExternal') || Object.values(g.links).some((l) => l.from.node === o.id && l.from.pin === 'out')),
        ),
      ),
    );
    if (read) continue;
    flagged.add(id);
    add(
      'write-only',
      n,
      `${variable.name} : écrite, jamais lue`,
      `Des Set changent ${variable.name}, mais aucun nœud ne lit sa valeur. Si rien ne s’en sert, la variable et ses Set sont en trop ; sinon, il manque le Get qui devait décider de la suite.`,
      variable.name,
    );
  }
};

/** A Cast repeated at every frame: do it once and keep the result. */
const castOnTick: Rule = (v, add) => {
  for (const tick of Object.values(v.graph.nodes)) {
    if (tick.def !== 'event.tick') continue;
    const cast = reach(v, tick.id).find((n) => n.def === 'cast.to');
    if (cast) {
      add('cast-on-tick', cast, 'Cast To sur Tick', 'Ce Cast est refait à chaque image, alors que sa réponse ne change pas. Fais-le une fois (BeginPlay, ou l’overlap qui te donne l’acteur) et garde le résultat dans une variable du bon type.');
    }
  }
};

/** A Custom Event with logic behind it that nothing calls, binds or times. */
const orphanEvent: Rule = (v, add) => {
  const called = (name: string) =>
    v.project.classes.some((c) => c.graphs.some((g) => Object.values(g.nodes).some((n: NodeInstance) => n.def === 'call.custom' && n.config.event === name)));
  for (const n of Object.values(v.graph.nodes)) {
    if (n.def !== 'event.custom' || v.wiredOut.has(`${n.id}:delegate`)) continue;
    if (!reach(v as GraphView, n.id).length || called(String(n.config.name))) continue;
    add(
      'orphan-event',
      n,
      `${String(n.config.name)} n’est appelé nulle part`,
      'Ce Custom Event a une suite, mais rien ne le déclenche : aucun appel, aucun timer, aucun Bind. Appelle-le là où il doit partir, ou supprime-le avec sa suite.',
    );
  }
};

export const HYGIENE_RULES: { from: Level; run: Rule }[] = [
  { from: 'debutant', run: unusedNodes },
  { from: 'debutant', run: boolCompare },
  { from: 'intermediaire', run: loneSequence },
  { from: 'intermediaire', run: writeOnly },
  { from: 'intermediaire', run: orphanEvent },
  { from: 'confirme', run: castOnTick },
];
