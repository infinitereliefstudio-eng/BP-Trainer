/**
 * Plan V2, step A: what UE leaves undefined or forbids. BeginPlay order
 * between actors (not guaranteed), Private variables, Expose on Spawn.
 */
import { describe, expect, it } from 'vitest';
import { compileClass } from '../src/core/compiler/validate';
import { ProjectBuilder, type ClassBuilder } from '../src/core/lessons/builder';
import { ORDER_NOTE, runLesson } from '../src/core/lessons/runner';
import type { Lesson } from '../src/core/lessons/types';
import { contextFor } from '../src/core/nodes/registry';
import { paletteEntries } from '../src/core/nodes/palette';
import { resolvePins } from '../src/core/nodes/registry';
import { updateVariable } from '../src/core/operations/classOps';
import { Simulation } from '../src/core/runtime/simulation';
import { T } from '../src/core/types/pins';

const prints = (s: Simulation) => s.log.filter((l) => l.message !== undefined).map((l) => l.message);
const errorsOf = (pb: ProjectBuilder, b: ClassBuilder) =>
  compileClass(b.cls, pb.project)
    .messages.filter((m) => m.severity === 'error')
    .map((m) => m.text);

/** BP_A sets BP_B.Valeur to 5 in its BeginPlay; BP_B prints Valeur in its own. */
function orderProbe() {
  const pb = new ProjectBuilder('t');
  const a = pb.blueprint('BP_A');
  const b = pb.blueprint('BP_B');
  const valeur = b.variable('Valeur', T.int, 0);
  const aId = pb.place(a, 0, 0);
  const bId = pb.place(b, 400, 0);
  const cible = a.variable('Cible', T.object('BP_B'));
  a.cls.variables.find((v) => v.id === cible)!.instanceEditable = true;
  pb.project.level.actors.find((x) => x.id === aId)!.overrides[cible] = `actor:${bId}`;
  const evA = a.node('event.beginPlay');
  const get = a.node('var.get', { variable: cible });
  const set = a.node('var.setExternal', { owner: b.cls.id, variable: valeur }, { value: 5 });
  a.link(evA, 'then', set, 'exec').link(get, 'value', set, 'target');
  const evB = b.node('event.beginPlay');
  const read = b.node('var.get', { variable: valeur });
  const pr = b.node('debug.printString');
  b.link(evB, 'then', pr, 'exec').link(read, 'value', pr, 'text');
  return pb;
}

describe('BeginPlay order between actors', () => {
  it('level order runs the first placed actor first, reversed the other way', () => {
    const s1 = new Simulation(orderProbe().project, { order: 'level' });
    s1.step();
    expect(prints(s1)).toEqual(['5']);
    const s2 = new Simulation(orderProbe().project, { order: 'reversed' });
    s2.step();
    expect(prints(s2)).toEqual(['0']);
  });

  it('shuffled order changes with the seed and says so in the Output Log', () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 20; seed++) {
      const s = new Simulation(orderProbe().project, { order: 'shuffled', seed });
      s.step();
      seen.add(String(prints(s)[0]));
      expect(s.log.some((l) => l.text.includes('Ordre des BeginPlay pour cette partie'))).toBe(true);
    }
    expect([...seen].sort()).toEqual(['0', '5']);
  });

  it('a lesson solution that depends on the order fails, with the reason', () => {
    const lesson = {
      id: 'probe',
      checks: [{ id: 'five', label: 'BP_B affiche 5', test: (cx) => (cx.prints().includes('5') ? true : 'BP_B affiche 0.') }],
      scenario: [{ wait: 0.1 }],
    } as Pick<Lesson, 'id' | 'checks' | 'scenario'> as Lesson;
    const run = runLesson(lesson, orderProbe().project);
    expect(run.passed).toBe(false);
    expect(run.notes[0]).toBe(ORDER_NOTE);
    expect(run.results[0].reason).toBe('BP_B affiche 0.');
  });
});

describe('Private variables', () => {
  it('are hidden from other Blueprints and refuse to compile there', () => {
    const pb = orderProbe();
    const [a, b] = pb.project.classes;
    const valeur = b.variables[0];
    const entries = () => paletteEntries(contextFor(a, pb.project), a.graphs[0]).map((e) => e.key);
    expect(entries()).toContain(`xset:${b.id}:${valeur.id}`);
    updateVariable(b, valeur.id, { private: true });
    expect(entries()).not.toContain(`xset:${b.id}:${valeur.id}`);
    const errs = compileClass(a, pb.project).messages.filter((m) => m.severity === 'error');
    expect(errs.map((m) => m.text).join()).toContain('Valeur est Private');
    expect(compileClass(b, pb.project).messages.filter((m) => m.severity === 'error')).toEqual([]);
  });
});

describe('Expose on Spawn', () => {
  function spawner(expose: boolean) {
    const pb = new ProjectBuilder('t');
    const spawnerBp = pb.blueprint('BP_Spawner');
    const ennemi = pb.blueprint('BP_Ennemi');
    const vie = ennemi.variable('Vie', T.int, 10);
    updateVariable(ennemi.cls, vie, { exposeOnSpawn: expose });
    pb.place(spawnerBp, 0, 0);
    const ev = spawnerBp.node('event.beginPlay');
    const spawn = spawnerBp.node('actor.spawn', {}, { class: ennemi.cls.id });
    spawnerBp.link(ev, 'then', spawn, 'exec');
    const evE = ennemi.node('event.beginPlay');
    const read = ennemi.node('var.get', { variable: vie });
    const pr = ennemi.node('debug.printString');
    ennemi.link(evE, 'then', pr, 'exec').link(read, 'value', pr, 'text');
    return { pb, spawnerBp, ennemi, vie, spawn };
  }

  it('turns the variable into a Spawn Actor pin, set before BeginPlay', () => {
    const { pb, spawnerBp, ennemi, vie, spawn } = spawner(true);
    expect(ennemi.cls.variables[0].instanceEditable).toBe(true);
    const node = spawnerBp.graph.nodes[spawn];
    const pin = resolvePins(node, contextFor(spawnerBp.cls, pb.project)).find((p) => p.id === `expose:${vie}`);
    expect(pin?.name).toBe('Vie');
    node.defaults[`expose:${vie}`] = 3;
    expect(errorsOf(pb, spawnerBp)).toEqual([]);
    const s = new Simulation(pb.project);
    s.step();
    expect(prints(s)).toEqual(['3']);
  });

  it('without it, a Set after Spawn comes after the new actor’s BeginPlay', () => {
    const { pb, spawnerBp, ennemi, vie, spawn } = spawner(false);
    const node = spawnerBp.graph.nodes[spawn];
    expect(resolvePins(node, contextFor(spawnerBp.cls, pb.project)).some((p) => p.id.startsWith('expose:'))).toBe(false);
    const set = spawnerBp.node('var.setExternal', { owner: ennemi.cls.id, variable: vie }, { value: 3 });
    const pr = spawnerBp.node('debug.printString', {}, { text: 'après le Set' });
    spawnerBp.link(spawn, 'then', set, 'exec').link(spawn, 'result', set, 'target').link(set, 'then', pr, 'exec');
    expect(errorsOf(pb, spawnerBp)).toEqual([]);
    const s = new Simulation(pb.project);
    s.step();
    expect(prints(s)).toEqual(['10', 'après le Set']);
    expect(s.actors.find((a) => a.classId === ennemi.cls.id)!.vars[vie]).toBe(3);
  });
});
