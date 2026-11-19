/**
 * V7.22, construction advice « parent ou composant » : the same chain of
 * nodes written in several Blueprints. Within one graph, `copied-chain`
 * already suggests a function; across Blueprints, the answer is where the
 * shared logic should live: in their common parent when they are of one
 * family (what they are), in an Actor Component carried by each when they
 * are not (what they have). Nodes are compared by what they show (their
 * title, so « Set Vie » matches in two Blueprints that each have a Vie)
 * and their typed values, texts aside.
 */
import type { BlueprintClass, NodeInstance, Project } from '../model/project';
import { contextFor, getDefinition, nodeTitle } from '../nodes/registry';
import type { NodeContext } from '../nodes/definition';
import type { Advice } from './advice';
import { view } from './graphView';

const CHAIN = 3;

interface Found {
  cls: BlueprintClass;
  graphId: string;
  node: NodeInstance;
  first: string;
}

/** Texts aside: two copies that only print different messages are still the same logic. */
const signature = (n: NodeInstance, cls: BlueprintClass, ctx: NodeContext) =>
  `${n.def}|${label(n, cls, ctx)}|${JSON.stringify(Object.entries(n.defaults).filter(([, v]) => typeof v !== 'string'))}`;

/** What a node shows, with the variable's name for Get and Set (UE titles a Set « SET »). */
function label(n: NodeInstance, cls: BlueprintClass, ctx: NodeContext): string {
  if (n.def === 'var.set' || n.def === 'var.get') {
    const v = cls.variables.find((x) => x.id === n.config.variable);
    if (v) return `${n.def === 'var.set' ? 'Set' : 'Get'} ${v.name}`;
  }
  return nodeTitle(n, ctx);
}

/** The Blueprint ancestors of a class, itself first. */
function lineage(p: Project, cls: BlueprintClass): BlueprintClass[] {
  const out: BlueprintClass[] = [];
  for (let c: BlueprintClass | undefined = cls; c && !out.includes(c); c = c.parentClassId ? p.classes.find((x) => x.id === c!.parentClassId) : undefined) out.push(c);
  return out;
}

/** The nearest Blueprint every class descends from (one of them, possibly), or undefined. */
function commonParent(p: Project, classes: BlueprintClass[]): BlueprintClass | undefined {
  const [first, ...rest] = classes.map((c) => lineage(p, c));
  return first.find((a) => rest.every((l) => l.includes(a)));
}

export function copiedAcross(project: Project, classNames?: string[]): Advice[] {
  const byKey = new Map<string, Found[]>();
  for (const cls of project.classes) {
    const ctx = contextFor(cls, project);
    for (const graph of cls.graphs) {
      const v = view(cls, graph, ctx, project);
      for (const n of Object.values(graph.nodes)) {
        const kind = getDefinition(n.def)?.kind;
        if (kind !== 'function' && kind !== 'flow' && kind !== 'variable') continue;
        const run: NodeInstance[] = [n];
        while (run.length < CHAIN) {
          const succ = v.next.get(run[run.length - 1].id) ?? [];
          const next = succ.length === 1 ? graph.nodes[succ[0]] : undefined;
          if (!next || run.includes(next)) break;
          run.push(next);
        }
        if (run.length < CHAIN) continue;
        const key = run.map((x) => signature(x, cls, ctx)).join(' → ');
        byKey.set(key, [...(byKey.get(key) ?? []), { cls, graphId: graph.id, node: n, first: label(n, cls, ctx) }]);
      }
    }
  }
  const out: Advice[] = [];
  const told = new Set<string>();
  for (const found of byKey.values()) {
    const classes = [...new Set(found.map((f) => f.cls))];
    if (classes.length < 2) continue;
    const pairKey = classes.map((c) => c.id).sort().join('|');
    if (told.has(pairKey)) continue;
    told.add(pairKey);
    const names = classes.map((c) => c.name);
    const list = names.length === 2 ? `${names[0]} et ${names[1]}` : `${names.slice(0, -1).join(', ')} et ${names[names.length - 1]}`;
    const parent = commonParent(project, classes);
    const text = parent
      ? `La même suite de ${CHAIN} nœuds (à partir de ${found[0].first}) est écrite dans ${list}, qui sont de la même famille (${parent.name}). Écrite une fois dans ${parent.name}, elle serait héritée ; un enfant qui doit faire plus redéfinit et appelle la version du parent (Parent: …).`
      : `La même suite de ${CHAIN} nœuds (à partir de ${found[0].first}) est écrite dans ${list}, qui ne sont pas de la même famille. Si c’est un comportement qu’ils ont (une santé, un verrou, une réserve), un Actor Component posé sur chacun la garderait à un seul endroit ; si c’est ce qu’ils sont, un parent commun.`;
    for (const cls of classes.slice(1)) {
      if (classNames && !classNames.includes(cls.name)) continue;
      const at = found.find((f) => f.cls === cls)!;
      out.push({ rule: 'copied-across', classId: cls.id, className: cls.name, graphId: at.graphId, nodeId: at.node.id, title: 'Chaîne copiée entre Blueprints', text });
    }
  }
  return out;
}
