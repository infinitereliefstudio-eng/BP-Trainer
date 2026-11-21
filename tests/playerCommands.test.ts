/**
 * V7.58, review of the path's progression: after « Interagir comme dans UE5 »
 * (R4), no object of the level listens to the keys itself, in a starting
 * project or a reference solution; the Player Controller receives the
 * commands. Where the learner writes that line, the start fails on it with
 * a message that names the place.
 */
import { describe, expect, it } from 'vitest';
import { LESSONS } from '../src/core/lessons';
import { runLesson } from '../src/core/lessons/runner';
import type { Project } from '../src/core/model/project';
import { addNode, connect } from '../src/core/operations/graphOps';
import { contextFor } from '../src/core/nodes/registry';

const after = LESSONS.slice(LESSONS.findIndex((l) => l.id === 'r4-interagir-ue5') + 1);

function listening(p: Project): string[] {
  return p.classes
    .filter((c) => c.parent === 'Actor')
    .filter((c) => c.autoReceiveInput || c.graphs.some((g) => Object.values(g.nodes).some((n) => n.def === 'input.action' || n.def === 'event.inputKey')))
    .map((c) => c.name);
}

describe('commands through the Player Controller (V7.58)', () => {
  it('R4 is where it is taught', () => {
    expect(after.length).toBeGreaterThan(50);
  });

  it('after R4, no object of the level listens to the keys, at the start or in the solution', () => {
    const bad = after.flatMap((l) => {
      const start = l.setup();
      const solved = l.setup();
      l.solve(solved);
      return [...listening(start).map((c) => `${l.id} (départ) : ${c}`), ...listening(solved).map((c) => `${l.id} (solution) : ${c}`)];
    });
    expect(bad).toEqual([]);
  });

  it('where the learner writes the Player Controller line, the start fails on it, and says where', () => {
    for (const id of ['l-cartes', 'l-standard', 'l-miroirs', 'l-interrogatoire', 'c6-annuler', 'l-reseau']) {
      const l = LESSONS.find((x) => x.id === id)!;
      const run = runLesson(l, l.setup());
      const line = run.results.find((r) => r.check.id.startsWith('pc-'));
      expect(line?.ok, id).toBe(false);
      expect(String(line?.reason ?? ''), id).toContain('BP_PlayerController');
    }
  });

  it('a step whose line is given has it in its starting project, and only the solution adds the learner’s', () => {
    const l = LESSONS.find((x) => x.id === 'd11-four')!;
    const pc = l.setup().classes.find((c) => c.name === 'BP_PlayerController')!;
    const calls = Object.values(pc.graphs[0].nodes).filter((n) => n.def === 'call.custom').map((n) => n.config.event);
    expect(calls.sort()).toEqual(['Annuler', 'Lancer']);
  });

  it('the objects keep their logic: a converted step still fails when its trap is left in', () => {
    const l = LESSONS.find((x) => x.id === 'd18-record')!;
    expect(runLesson(l, l.setup()).passed).toBe(false);
    const p = l.setup();
    l.solve(p);
    expect(runLesson(l, p).passed).toBe(true);
  });

  it('V7.62: a line that hears the action but does not tell the object is named as such', () => {
    for (const id of ['l-cartes', 'l-miroirs', 'c6-annuler']) {
      const l = LESSONS.find((x) => x.id === id)!;
      const p = l.setup();
      l.solve(p);
      const pc = p.classes.find((c) => c.name === 'BP_PlayerController')!;
      const g = pc.graphs[0];
      const act = Object.values(g.nodes).filter((n) => n.def === 'input.action').at(-1)!;
      for (const k of Object.values(g.links)) if (k.from.node === act.id) delete g.links[k.id];
      const print = addNode(g, 'debug.printString', 400, 2000, {});
      if (!print.ok) throw new Error(print.reason);
      connect(g, { node: act.id, pin: 'started' }, { node: print.value.id, pin: 'exec' }, contextFor(pc, p));
      const line = runLesson(l, p).results.find((r) => r.check.id.startsWith('pc-'));
      expect(line?.ok, id).toBe(false);
      expect(String(line?.reason), id).toContain('mais n’appelle pas');
    }
  });

  it('V7.62: in « La tourelle », the given line checks the target, so a second E after its destruction gives no error', () => {
    const l = LESSONS.find((x) => x.id === 'd3-tourelle')!;
    const pc = l.setup().classes.find((c) => c.name === 'BP_PlayerController')!;
    expect(Object.values(pc.graphs[0].nodes).some((n) => n.def === 'flow.isValid')).toBe(true);
    const p = l.setup();
    l.solve(p);
    const twice = { ...l, scenario: [...l.scenario, { press: 'E' as const }, { release: 'E' as const }, { wait: 0.5 }], checks: [{ id: 'err', label: 'aucune erreur', test: (cx: Parameters<(typeof l.checks)[0]['test']>[0]) => (cx.errors().length ? cx.errors()[0] : true) }] };
    expect(runLesson(twice, p).results[0].reason).toBeUndefined();
  });
});
