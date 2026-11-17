/**
 * Small helpers shared by the lessons added from the exercise collection
 * (V6): find a variable, declare a function with its parameters, mark a gap
 * to fill, and the texts every "Débogue" starts with.
 */
import type { Graph, NodeInstance, Project } from '../../model/project';
import { addFunctionParam, addFunction } from '../../operations/functionOps';
import { disconnectPin, removeNodes } from '../../operations/graphOps';
import type { PinType } from '../../types/pins';
import type { Value } from '../../types/values';
import type { ClassBuilder, ProjectBuilder } from '../builder';
import type { CheckContext, LessonCard, ScenarioStep } from '../types';

export const varId = (b: ClassBuilder, name: string): string => {
  const v = b.cls.variables.find((x) => x.name === name);
  if (!v) throw new Error(`No variable ${name} in ${b.cls.name}`);
  return v.id;
};

/** A variable shown in Details of each instance (Instance Editable). */
export function editable(b: ClassBuilder, name: string, type: PinType, value?: Value): string {
  const id = b.variable(name, type, value);
  b.cls.variables.find((v) => v.id === id)!.instanceEditable = true;
  return id;
}

/** Value of an Instance Editable variable on one placed actor. `actor:<id>` is a reference to another placed actor. */
export function override(pb: ProjectBuilder, actorId: string, variable: string, value: Value): void {
  pb.project.level.actors.find((a) => a.id === actorId)!.overrides[variable] = value;
}

export const ref = (actorId: string): Value => `actor:${actorId}`;

export const getVar = (b: ClassBuilder, name: string, at: [number, number]): string => b.node('var.get', { variable: varId(b, name) }, {}, at);
export const setVar = (b: ClassBuilder, name: string, at: [number, number], value?: Value): string =>
  b.node('var.set', { variable: varId(b, name) }, value === undefined ? {} : { value }, at);
export const say = (b: ClassBuilder, at: [number, number], text?: string): string => b.node('debug.printString', {}, text === undefined ? {} : { text }, at);

export interface Fn {
  graph: Graph;
  /** Builder inside the function's graph. */
  f: ClassBuilder;
  entry: string;
  ret: string;
  /** Parameter ids by name. */
  pin: Record<string, string>;
}

/** A function with named inputs and outputs. With `open`, its entry is left unwired (a body to write). */
export function fnDef(p: Project, b: ClassBuilder, name: string, ins: [string, PinType][], outs: [string, PinType][], open = true): Fn {
  const graph = addFunction(b.cls, name);
  const pin: Record<string, string> = {};
  for (const [side, list] of [
    ['inputs', ins],
    ['outputs', outs],
  ] as const) {
    for (const [n, t] of list) {
      const prm = addFunctionParam(p, b.cls, graph.id, side, t)!;
      prm.name = n;
      pin[n] = prm.id;
    }
  }
  const f = b.inGraph(graph.id);
  const entry = Object.values(graph.nodes).find((n) => n.def === 'fn.entry')!.id;
  // A function without outputs has no Return Node yet: give it one, so every body ends the same way.
  const ret = Object.values(graph.nodes).find((n) => n.def === 'fn.return')?.id ?? f.node('fn.return', { graph: graph.id }, {}, [1200, 0]);
  if (open) disconnectPin(graph, { node: entry, pin: 'then' });
  return { graph, f, entry, ret, pin };
}

/** An existing function of a class, as `fnDef` returns it. */
export function fnOf(b: ClassBuilder, name: string): Fn {
  const graph = b.cls.graphs.find((g) => g.name === name && g.fn);
  if (!graph?.fn) throw new Error(`No function ${name} in ${b.cls.name}`);
  const pin: Record<string, string> = {};
  for (const prm of [...graph.fn.inputs, ...graph.fn.outputs]) pin[prm.name] = prm.id;
  const entry = Object.values(graph.nodes).find((n) => n.def === 'fn.entry')!.id;
  const ret = Object.values(graph.nodes).find((n) => n.def === 'fn.return')!.id;
  return { graph, f: b.inGraph(graph.id), entry, ret, pin };
}

/** A yellow frame naming what is missing there ("Complète" exercises). */
export const gap = (b: ClassBuilder, text: string, at: [number, number], w = 300, h = 220): string =>
  b.node('util.comment', { text, w, h, color: '#f2c014' }, {}, at);

export const nodesOf = (g: Graph, def: string): NodeInstance[] => Object.values(g.nodes).filter((n) => n.def === def);
export const nodeOf = (g: Graph, def: string): string => {
  const n = nodesOf(g, def)[0];
  if (!n) throw new Error(`No ${def} node`);
  return n.id;
};

/** Remove every node of a graph that `keep` does not accept (reference solutions that rebuild a chain). */
export function wipe(g: Graph, keep: (n: NodeInstance) => boolean = () => false): void {
  removeNodes(g, Object.values(g.nodes).filter((n) => !keep(n)).map((n) => n.id));
}

/** Press then release a key, as scenario steps. */
export const tap = (key: 'E' | 'F' | 'SpaceBar'): ScenarioStep[] => [{ press: key }, { release: key }];

/** The player walks into a spot and stays a moment. */
export const goTo = (x: number, y: number, wait = 0.2): ScenarioStep[] => [{ teleport: [x, y] }, { wait }];

/** A variable of the first actor of a class, by name (lessons with one such actor). */
export function varOf(cx: CheckContext, className: string, name: string) {
  const a = cx.sim.actors.find((x) => x.className === className && !x.destroyed);
  const cls = a ? cx.sim.classOf(a) : undefined;
  const v = cls?.variables.find((x) => x.name === name);
  return a && v ? a.vars[v.id] : undefined;
}

/** The method every "Prédis" ends with. */
/** For the cards of lessons whose test keys are heard by several actors. */
export const SHARED_KEYS =
  'Les événements de touche posés par la leçon ont **Consume Input** décoché : plusieurs acteurs écoutent la même touche. Coché, le réglage par défaut d’UE, seul le dernier acteur posé la recevrait.';

export const PREDICT_METHOD: LessonCard = {
  title: 'Méthode pour prédire',
  body:
    '- Trouve l’événement : c’est le départ.\n- Avance d’un nœud à la fois le long du fil blanc, sans sauter de nœud.\n- À chaque nœud qui lit une valeur (un Print String, une Condition), remonte ses fils de données pour savoir ce qu’il lit **à ce moment-là**, pas à la fin.\n- Note sur un coin de papier ce que valent les variables après chaque nœud.\n- Ignore ce que le fil blanc ne touche pas.\n\n' +
    'Choisis ta réponse **avant** de lancer Play. Si Play te donne tort, cherche le nœud où ton tableau et la réalité se séparent : c’est là qu’est la notion à retenir.',
};

/** The method every "Débogue" opens with. */
export const DEBUG_METHOD: LessonCard = {
  title: 'La méthode',
  body:
    '**Reproduis** le problème avec ▶ Play, **observe** (le niveau, l’Output Log), puis **formule une hypothèse** avant de toucher au graphe : « je pense que tel nœud fait telle chose, je vais le vérifier là ».\n\n' +
    'Pour vérifier : un **Print String** de la valeur suspecte, un **breakpoint** (appui long sur un nœud), ou Details › « Pourquoi ce nœud ne s’est pas exécuté ? ».\n\n' +
    'Corrige **une seule chose**, la plus petite possible, puis revérifie. Un graphe refait en entier ne t’apprend pas où était l’erreur.',
};
