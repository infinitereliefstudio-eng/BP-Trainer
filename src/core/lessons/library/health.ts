/**
 * The health component of the Actor Components steps (V7.20): BP_Sante, an
 * Actor Component with a Vie (Instance Editable), InfligerDegats(Montant)
 * that lowers it and calls OnMort at 0. Built finished for the steps that
 * use it, written by the learner in « La santé est partout ».
 */
import type { Project } from '../../model/project';
import { addDispatcher } from '../../operations/classOps';
import { T } from '../../types/pins';
import { ClassBuilder, type ProjectBuilder } from '../builder';
import type { CheckContext } from '../types';
import { fnDef, type Fn } from './kit';

export interface Health {
  b: ClassBuilder;
  vie: string;
  mort: string;
  hit: Fn;
}

/** BP_Sante, finished: Vie (Instance Editable, `max`), OnMort, InfligerDegats(Montant). */
export function healthComponent(pb: ProjectBuilder, max = 100): Health {
  return writeHealth(pb.blueprint('BP_Sante', 'ActorComponent'), pb.project, max);
}

/** The logic of BP_Sante, written in an existing component class. */
export function writeHealth(b: ClassBuilder, p: Project, max = 100): Health {
  const vie = b.variable('Vie', T.int, max);
  b.cls.variables.find((v) => v.id === vie)!.instanceEditable = true;
  const mort = addDispatcher(b.cls, 'OnMort').id;
  const hit = fnDef(p, b, 'InfligerDegats', [['Montant', T.int]], []);
  const sub = hit.f.node('math.subtractInt', {}, {}, [300, 300]);
  const set = hit.f.node('var.set', { variable: vie }, {}, [560, 96]);
  const le = hit.f.node('math.lessEqualInt', {}, {}, [760, 300]);
  const branch = hit.f.node('flow.branch', {}, {}, [900, 96]);
  const call = hit.f.node('dispatcher.call', { owner: b.cls.id, dispatcher: mort }, {}, [1200, 60]);
  hit.f
    .link(hit.f.node('var.get', { variable: vie }, {}, [100, 300]), 'value', sub, 'a')
    .link(hit.entry, hit.pin.Montant, sub, 'b')
    .link(sub, 'result', set, 'value')
    .link(hit.entry, 'then', set, 'exec')
    .link(set, 'out', le, 'a')
    .link(le, 'result', branch, 'condition')
    .link(set, 'then', branch, 'exec')
    .link(branch, 'true', call, 'exec');
  return { b, vie, mort, hit };
}

/** The Vie of an actor's BP_Sante while the scenario plays (the player is « Joueur »), or undefined. */
export function lifeOf(cx: CheckContext, label: string): number | undefined {
  const sim = cx.sim;
  const a = label === 'Joueur' ? sim.player : sim.actors.find((x) => x.label === label);
  if (!a) return undefined;
  for (const o of sim.componentsOf(a)) {
    const cls = sim.classOf(o);
    const v = cls?.variables.find((x) => x.name === 'Vie');
    if (cls && v && cls.name === 'BP_Sante') return Number(o.vars[v.id]);
  }
  return undefined;
}

/** Does this class carry a component made from the Blueprint named `name`? */
export function carries(p: Project, className: string, name: string): boolean {
  const cls = p.classes.find((c) => c.name === className);
  const comp = p.classes.find((c) => c.name === name);
  return !!cls && !!comp && cls.components.some((k) => k.kind === 'ActorComponent' && k.classId === comp.id);
}

/** Is `name` a Blueprint whose parent is ActorComponent? */
export const isComponentClass = (p: Project, name: string): boolean => p.classes.find((c) => c.name === name)?.parent === 'ActorComponent';

/** Builder over a class of the project (reference solutions). */
export const classBuilder = (p: Project, name: string): ClassBuilder => new ClassBuilder(p.classes.find((c) => c.name === name)!, p);
