/** Mutators for user functions: graphs with a signature, and their callers. */
import { newId } from '../model/ids';
import { rootParent } from '../model/inheritance';
import { createGraph, findGraph, uniqueName, type BlueprintClass, type Graph, type OverridableFunction, type Param, type Project } from '../model/project';
import { contextFor } from '../nodes/registry';
import type { PinType } from '../types/pins';
import { validateName } from './classOps';
import { addNode, connect, removeNodes, type OpResult } from './graphOps';
import { pruneProject } from './projectOps';
import { pruneBindings } from './widgetOps';

const CALLS = ['call.function', 'call.pureFunction'];

function fnGraph(cls: BlueprintClass, graphId: string): Graph | undefined {
  const g = findGraph(cls, graphId);
  return g?.kind === 'function' && g.fn ? g : undefined;
}

/** A function whose name and signature the learner may change: not an override, the engine calls those by name. */
function ownFnGraph(cls: BlueprintClass, graphId: string): Graph | undefined {
  const g = fnGraph(cls, graphId);
  return g && !g.override ? g : undefined;
}

/** Every call node of a function, in every Blueprint. */
function callers(p: Project, cls: BlueprintClass, graphId: string): { graph: Graph; ids: string[] }[] {
  const out: { graph: Graph; ids: string[] }[] = [];
  for (const c of p.classes) {
    for (const g of c.graphs) {
      const ids = Object.values(g.nodes)
        .filter((n) => CALLS.includes(n.def) && n.config.graph === graphId && (n.config.owner ?? c.id) === cls.id)
        .map((n) => n.id);
      if (ids.length) out.push({ graph: g, ids });
    }
  }
  return out;
}

export function addFunction(cls: BlueprintClass, name = 'NewFunction'): Graph {
  const g = createGraph(uniqueName(name, cls.graphs.map((x) => x.name)), 'function');
  cls.graphs.push(g);
  addNode(g, 'fn.entry', 0, 0, { graph: g.id });
  return g;
}

export function renameFunction(cls: BlueprintClass, graphId: string, name: string): OpResult {
  if (fnGraph(cls, graphId)?.override) return { ok: false, reason: 'Une fonction surchargée garde le nom de la classe parente : le moteur l’appelle par ce nom.' };
  const g = ownFnGraph(cls, graphId);
  if (!g) return { ok: false, reason: 'Fonction introuvable.' };
  if (/\s/.test(name.trim())) return { ok: false, reason: "Un nom de fonction ne peut pas contenir d'espace." };
  const err = validateName(name, cls.graphs.filter((x) => x.id !== graphId).map((x) => x.name));
  if (err) return { ok: false, reason: err };
  g.name = name.trim();
  return { ok: true, value: undefined };
}

export function setFunctionDescription(cls: BlueprintClass, graphId: string, text: string): void {
  const g = fnGraph(cls, graphId);
  if (g?.fn) g.fn.description = text;
}

/** Pure ↔ impure: call nodes change kind, and lose their exec wires. */
export function setFunctionPure(p: Project, cls: BlueprintClass, graphId: string, pure: boolean): OpResult {
  const g = ownFnGraph(cls, graphId);
  if (!g?.fn) return { ok: false, reason: 'Fonction introuvable.' };
  g.fn.pure = pure;
  for (const { graph, ids } of callers(p, cls, graphId)) {
    for (const id of ids) graph.nodes[id].def = pure ? 'call.pureFunction' : 'call.function';
  }
  pruneProject(p);
  return { ok: true, value: undefined };
}

export type ParamSide = 'inputs' | 'outputs';

/** Add a parameter. The first output also creates a Return Node, like UE. */
export function addFunctionParam(p: Project, cls: BlueprintClass, graphId: string, side: ParamSide, type: PinType = { category: 'bool' }): Param | undefined {
  const g = ownFnGraph(cls, graphId);
  if (!g?.fn) return undefined;
  const all = [...g.fn.inputs, ...g.fn.outputs];
  const param: Param = { id: newId('pa'), name: uniqueName(side === 'inputs' ? 'NewParam' : 'ReturnValue', all.map((x) => x.name)), type };
  g.fn[side].push(param);
  if (side === 'outputs' && !Object.values(g.nodes).some((n) => n.def === 'fn.return')) {
    const entry = Object.values(g.nodes).find((n) => n.def === 'fn.entry');
    const ret = addNode(g, 'fn.return', (entry?.x ?? 0) + 420, entry?.y ?? 0, { graph: g.id });
    const entryBusy = entry && Object.values(g.links).some((l) => l.from.node === entry.id && l.from.pin === 'then');
    if (ret.ok && entry && !entryBusy) connect(g, { node: entry.id, pin: 'then' }, { node: ret.value.id, pin: 'exec' }, contextFor(cls, p));
  }
  return param;
}

export function updateFunctionParam(
  p: Project,
  cls: BlueprintClass,
  graphId: string,
  paramId: string,
  patch: { name?: string; type?: PinType },
): OpResult {
  const g = ownFnGraph(cls, graphId);
  const list = g?.fn ? [...g.fn.inputs, ...g.fn.outputs] : [];
  const param = list.find((x) => x.id === paramId);
  if (!param) return { ok: false, reason: 'Paramètre introuvable.' };
  if (patch.name !== undefined) {
    const err = validateName(patch.name, list.filter((x) => x.id !== paramId).map((x) => x.name));
    if (err) return { ok: false, reason: err };
    param.name = patch.name.trim();
  }
  if (patch.type) {
    param.type = patch.type;
    pruneProject(p);
  }
  return { ok: true, value: undefined };
}

export function removeFunctionParam(p: Project, cls: BlueprintClass, graphId: string, paramId: string): void {
  const g = ownFnGraph(cls, graphId);
  if (!g?.fn) return;
  g.fn.inputs = g.fn.inputs.filter((x) => x.id !== paramId);
  g.fn.outputs = g.fn.outputs.filter((x) => x.id !== paramId);
  pruneProject(p);
}

/** Delete a function and every node that calls it. */
export function removeFunction(p: Project, cls: BlueprintClass, graphId: string): void {
  for (const { graph, ids } of callers(p, cls, graphId)) removeNodes(graph, ids);
  cls.graphs = cls.graphs.filter((g) => g.id !== graphId);
  // A widget property bound to it goes back to its own value.
  pruneBindings(cls);
}

/** The signature of each overridable function, as UE declares it on AGameModeBase. */
const OVERRIDES: Record<OverridableFunction, { inputs: Omit<Param, 'id'>[]; outputs: Omit<Param, 'id'>[]; description: string }> = {
  ChoosePlayerStart: {
    inputs: [{ name: 'Player', type: { category: 'object', subtype: 'Controller' } }],
    outputs: [{ name: 'Return Value', type: { category: 'object', subtype: 'Actor' } }],
    description: 'Choisit l’acteur où le joueur apparaît (souvent un Player Start). Appelée par le GameMode à chaque niveau, avant les BeginPlay.',
  },
  GetDefaultPawnClassForController: {
    inputs: [{ name: 'In Controller', type: { category: 'object', subtype: 'Controller' } }],
    outputs: [{ name: 'Return Value', type: { category: 'class', subtype: 'Pawn' } }],
    description: 'Choisit la classe du pion que le GameMode fait apparaître pour ce joueur (sinon sa Default Pawn Class). Appelée à chaque niveau, avant les BeginPlay.',
  },
};

/** What a Blueprint can override, by its native root: a GameMode chooses where the player appears, and as what. */
export function overridableFunctions(p: Project, cls: BlueprintClass): OverridableFunction[] {
  return rootParent(p, cls) === 'GameModeBase' ? ['ChoosePlayerStart', 'GetDefaultPawnClassForController'] : [];
}

/**
 * Functions › Override, as UE's: a function graph with the parent's name and
 * signature (Choose Player Start: Player → an Actor; Get Default Pawn Class
 * For Controller: In Controller → a Pawn class), already wired from its entry
 * to its Return Node. The engine calls it when the GameMode makes the player
 * appear (core/runtime/simulation.ts).
 */
export function overrideFunction(p: Project, cls: BlueprintClass, which: OverridableFunction): OpResult<Graph> {
  if (!overridableFunctions(p, cls).includes(which)) return { ok: false, reason: `${cls.name} n’a pas de fonction ${which} à surcharger : c’est une fonction des GameMode.` };
  if (cls.graphs.some((g) => g.override === which)) return { ok: false, reason: `${which} est déjà surchargée dans ${cls.name}.` };
  if (cls.graphs.some((g) => g.name === which)) return { ok: false, reason: `${cls.name} a déjà une fonction nommée ${which} : renomme-la d’abord.` };
  const sig = OVERRIDES[which];
  const g = createGraph(which, 'function');
  g.override = which;
  g.fn = {
    inputs: sig.inputs.map((x) => ({ ...x, id: newId('pa') })),
    outputs: sig.outputs.map((x) => ({ ...x, id: newId('pa') })),
    pure: false,
    description: sig.description,
  };
  cls.graphs.push(g);
  const entry = addNode(g, 'fn.entry', 0, 0, { graph: g.id });
  const ret = addNode(g, 'fn.return', 900, 0, { graph: g.id });
  if (entry.ok && ret.ok) connect(g, { node: entry.value.id, pin: 'then' }, { node: ret.value.id, pin: 'exec' }, contextFor(cls, p));
  return { ok: true, value: g };
}
