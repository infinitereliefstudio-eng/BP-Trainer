/**
 * Set Game Paused (lot 3a): game time stops (Tick, Delay, timers, movement),
 * key events are not heard, and only the Input Actions marked Trigger when
 * Paused reach the graphs, as in UE.
 */
import { describe, expect, it } from 'vitest';
import { diagnoseNode } from '../src/core/explain/diagnose';
import { edit, ProjectBuilder } from '../src/core/lessons/builder';
import { ensurePlayerInput } from '../src/core/lessons/ue5Input';
import { setPlayerClass } from '../src/core/operations/projectOps';
import { setTriggerWhenPaused } from '../src/core/operations/inputOps';
import { Simulation } from '../src/core/runtime/simulation';
import { parseProject, serializeProject } from '../src/core/serialization/serialize';
import { T } from '../src/core/types/pins';

const prints = (sim: Simulation) => sim.log.filter((l) => l.message !== undefined).map((l) => l.message);

/** BP_PlayerController toggles the pause on IA_Pause (Space); BP_Compteur counts its Ticks. */
function project(whenPaused: boolean) {
  const pb = new ProjectBuilder('pause');
  const pawn = pb.blueprint('BP_Joueur', 'Pawn');
  setPlayerClass(pb.project, pawn.cls.id);
  const counter = pb.blueprint('BP_Compteur');
  counter.component('StaticMesh', 'Socle');
  const ticks = counter.variable('Ticks', T.int, 0);
  const tick = counter.node('event.tick');
  const get = counter.node('var.get', { variable: ticks });
  const inc = counter.node('var.incrementInt');
  counter.link(tick, 'then', inc, 'exec').link(get, 'value', inc, 'value');
  pb.place(counter, 200, 0);
  const p = pb.project;
  const ids = ensurePlayerInput(p, ['SpaceBar'], { SpaceBar: 'IA_Pause' });
  const action = ids.get('SpaceBar')!;
  if (whenPaused) setTriggerWhenPaused(p, action, true);
  const pc = edit(p, 'BP_PlayerController');
  const ev = pc.node('input.action', { action }, {}, [64, 500]);
  const is = pc.node('game.isGamePaused', {}, {}, [200, 700]);
  const not = pc.node('logic.not', {}, {}, [400, 700]);
  const pause = pc.node('game.setGamePaused', {}, {}, [500, 500]);
  pc.link(ev, 'started', pause, 'exec').link(is, 'result', not, 'a').link(not, 'result', pause, 'paused');
  return { p, action };
}

function tap(sim: Simulation) {
  sim.pressKey('SpaceBar');
  sim.step();
  sim.releaseKey('SpaceBar');
  sim.step();
}

const ticksOf = (sim: Simulation) => {
  const a = sim.actors.find((x) => x.label === 'BP_Compteur')!;
  const cls = sim.classOf(a)!;
  return a.vars[cls.variables.find((v) => v.name === 'Ticks')!.id];
};

describe('Set Game Paused', () => {
  it('stops Tick and game time, and Trigger when Paused lets the pause end', () => {
    const { p } = project(true);
    const sim = new Simulation(p);
    sim.start();
    for (let i = 0; i < 10; i++) sim.step();
    tap(sim);
    expect(sim.gamePaused).toBe(true);
    const t = sim.time;
    const n = ticksOf(sim);
    for (let i = 0; i < 30; i++) sim.step();
    expect(sim.time).toBe(t);
    expect(ticksOf(sim)).toBe(n);
    tap(sim);
    expect(sim.gamePaused).toBe(false);
    for (let i = 0; i < 5; i++) sim.step();
    expect(ticksOf(sim)).toBeGreaterThan(n as number);
    expect(sim.time).toBeGreaterThan(t);
  });

  it('without Trigger when Paused, the action no longer arrives: the game stays paused, and the diagnosis says why', () => {
    const { p, action } = project(false);
    const sim = new Simulation(p);
    sim.start();
    sim.step();
    tap(sim);
    expect(sim.gamePaused).toBe(true);
    tap(sim);
    expect(sim.gamePaused).toBe(true);
    expect(sim.record.pausedActions.has(action)).toBe(true);
  });

  it('a Delay waits during the pause, and key events are not heard', () => {
    const pb = new ProjectBuilder('delay');
    const pawn = pb.blueprint('BP_Joueur', 'Pawn');
    setPlayerClass(pb.project, pawn.cls.id);
    const b = pb.blueprint('BP_Minuterie');
    b.component('StaticMesh', 'Socle');
    b.cls.autoReceiveInput = true;
    const begin = b.node('event.beginPlay');
    const pause = b.node('game.setGamePaused', {}, { paused: true });
    const delay = b.node('time.delay', {}, { duration: 0.5 });
    const say = b.node('debug.printString', {}, { text: 'fini' });
    b.link(begin, 'then', delay, 'exec').link(delay, 'completed', say, 'exec');
    const key = b.node('event.inputKey', { key: 'F' });
    const heard = b.node('debug.printString', {}, { text: 'F entendu' });
    b.link(key, 'pressed', heard, 'exec');
    const key2 = b.node('event.inputKey', { key: 'E' });
    b.link(key2, 'pressed', pause, 'exec');
    pb.place(b, 0, 0);
    const sim = new Simulation(pb.project);
    sim.start();
    sim.pressKey('E');
    sim.releaseKey('E');
    for (let i = 0; i < 60; i++) sim.step();
    expect(prints(sim)).not.toContain('fini');
    sim.pressKey('F');
    sim.releaseKey('F');
    expect(prints(sim)).not.toContain('F entendu');
    sim.setGamePaused(false);
    for (let i = 0; i < 40; i++) sim.step();
    expect(prints(sim)).toContain('fini');
  });

  it('Trigger when Paused is saved with the project', () => {
    const { p, action } = project(true);
    const back = parseProject(serializeProject(p));
    expect(back.inputActions.find((a) => a.id === action)?.triggerWhenPaused).toBe(true);
  });

  it('explains an action that never arrived because the game was paused', () => {
    const pb = new ProjectBuilder('why');
    const pawn = pb.blueprint('BP_Joueur', 'Pawn');
    setPlayerClass(pb.project, pawn.cls.id);
    const p = pb.project;
    const ids = ensurePlayerInput(p, ['E', 'SpaceBar'], { E: 'IA_Reprendre', SpaceBar: 'IA_Pause' });
    const pc = edit(p, 'BP_PlayerController');
    const ev = pc.node('input.action', { action: ids.get('SpaceBar')! }, {}, [64, 500]);
    const pause = pc.node('game.setGamePaused', {}, { paused: true }, [400, 500]);
    pc.link(ev, 'started', pause, 'exec');
    const resume = pc.node('input.action', { action: ids.get('E')! }, {}, [64, 800]);
    const off = pc.node('game.setGamePaused', {}, { paused: false }, [400, 800]);
    pc.link(resume, 'started', off, 'exec');
    const sim = new Simulation(p);
    sim.start();
    sim.step();
    tap(sim);
    sim.pressKey('E');
    sim.step();
    expect(sim.gamePaused).toBe(true);
    const d = diagnoseNode({ project: p, record: sim.record, label: (id) => id }, pc.graph.id, off);
    expect(d.steps.map((s) => s.text).join(' ')).toContain('Trigger when Paused');
  });
});
