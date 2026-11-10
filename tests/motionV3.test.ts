/**
 * V3 steps C and D: Timeline, interpolation nodes, Construction Script,
 * Line Trace By Channel and Event Hit.
 */
import { describe, expect, it } from 'vitest';
import { ProjectBuilder, type ClassBuilder } from '../src/core/lessons/builder';
import { compileClass } from '../src/core/compiler/validate';
import { readTimeline, timelineConfig, trackPin, trackValue } from '../src/core/nodes/library/timeline';
import { duplicateNodes } from '../src/core/operations/graphOps';
import { setPlayerClass } from '../src/core/operations/projectOps';
import { parseProject, serializeProject } from '../src/core/serialization/serialize';
import { raycast } from '../src/core/runtime/physics';
import { Simulation, STEP } from '../src/core/runtime/simulation';
import { T } from '../src/core/types/pins';

const run = (sim: Simulation, seconds: number) => {
  for (let t = 0; t < seconds - 1e-9; t += STEP) sim.step();
};
const prints = (sim: Simulation) => sim.log.filter((l) => l.message !== undefined).map((l) => l.message!);

/** A Timeline whose Update writes the track into a variable, and whose Finished prints. */
function timelineActor(config: Record<string, unknown> = {}) {
  const pb = new ProjectBuilder('t');
  const b = pb.blueprint('BP');
  b.cls.autoReceiveInput = true;
  const v = b.variable('Valeur', T.float, 0);
  const tl = b.node('timeline.node', config as never, {}, [400, 96]);
  const track = readTimeline(b.graph.nodes[tl]).tracks[0];
  const set = b.node('var.set', { variable: v }, {}, [800, 96]);
  const done = b.node('debug.printString', {}, { text: 'fini' }, [800, 300]);
  b.link(tl, 'update', set, 'exec').link(tl, trackPin(track.id), set, 'value').link(tl, 'finished', done, 'exec');
  pb.place(b, 0, 0);
  const value = (sim: Simulation) => Number(sim.actors[0].vars[v]);
  return { pb, b, tl, value };
}

describe('Timeline', () => {
  it('interpolates linearly between keys and holds the ends', () => {
    const track = { id: 'a', name: 'A', keys: [{ t: 0.5, v: 10 }, { t: 1.5, v: 30 }] };
    expect(trackValue(track, 0)).toBe(10);
    expect(trackValue(track, 1)).toBe(20);
    expect(trackValue(track, 9)).toBe(30);
    expect(trackValue({ ...track, keys: [] }, 1)).toBe(0);
  });

  it('Play runs to the end, fires Update each frame then Finished once', () => {
    const { pb, b, tl, value } = timelineActor();
    b.link(b.node('event.beginPlay', {}, {}, [64, 96]), 'then', tl, 'play');
    const sim = new Simulation(pb.project);
    run(sim, 0.5);
    expect(value(sim)).toBeCloseTo(0.5, 1);
    expect(prints(sim)).toEqual([]);
    run(sim, 0.7);
    expect(value(sim)).toBe(1);
    expect(prints(sim)).toEqual(['fini']);
  });

  it('Play from the end moves nothing; Play from Start replays; Reverse comes back', () => {
    const { pb, b, tl, value } = timelineActor();
    b.link(b.node('event.inputKey', { key: 'E' }, {}, [64, 96]), 'pressed', tl, 'play');
    b.link(b.node('event.inputKey', { key: 'F' }, {}, [64, 300]), 'pressed', tl, 'playFromStart');
    b.link(b.node('event.inputKey', { key: 'SpaceBar' }, {}, [64, 500]), 'pressed', tl, 'reverse');
    const sim = new Simulation(pb.project);
    sim.pressKey('E');
    run(sim, 1.2);
    expect(value(sim)).toBe(1);
    sim.pressKey('E');
    run(sim, 0.5);
    expect(value(sim)).toBe(1);
    // UE ticks a timeline played at its end once more: Finished comes again.
    expect(prints(sim)).toEqual(['fini', 'fini']);
    sim.pressKey('F');
    run(sim, 0.5);
    expect(value(sim)).toBeCloseTo(0.5, 1);
    sim.pressKey('SpaceBar');
    run(sim, 0.25);
    expect(value(sim)).toBeCloseTo(0.25, 1);
    run(sim, 0.5);
    expect(value(sim)).toBe(0);
    expect(prints(sim)).toEqual(['fini', 'fini', 'fini']);
  });

  it('Stop keeps the position, Play resumes from it', () => {
    const { pb, b, tl, value } = timelineActor();
    b.link(b.node('event.inputKey', { key: 'E' }, {}, [64, 96]), 'pressed', tl, 'play');
    b.link(b.node('event.inputKey', { key: 'F' }, {}, [64, 300]), 'pressed', tl, 'stop');
    const sim = new Simulation(pb.project);
    sim.pressKey('E');
    run(sim, 0.3);
    sim.pressKey('F');
    const held = value(sim);
    run(sim, 1);
    expect(value(sim)).toBe(held);
    sim.pressKey('E');
    run(sim, 0.2);
    expect(value(sim)).toBeGreaterThan(held);
  });

  it('Loop wraps around without Finished; Auto Play starts with the game', () => {
    const { pb, b, tl, value } = timelineActor();
    Object.assign(b.graph.nodes[tl].config, { loop: true, autoPlay: true });
    const sim = new Simulation(pb.project);
    run(sim, 1.5);
    expect(value(sim)).toBeCloseTo(0.5, 1);
    expect(prints(sim)).toEqual([]);
  });

  it('Set New Time jumps and fires Update', () => {
    const { pb, b, tl, value } = timelineActor();
    b.graph.nodes[tl].defaults.newTime = 0.25;
    b.link(b.node('event.beginPlay', {}, {}, [64, 96]), 'then', tl, 'setNewTime');
    const sim = new Simulation(pb.project);
    sim.start();
    expect(value(sim)).toBe(0.25);
  });

  it('is refused in a function and in the Construction Script; a copy is a new timeline', () => {
    const { pb, b, tl } = timelineActor();
    expect(() => b.construction().b.node('timeline.node')).toThrow(/Construction Script/);
    const set = Object.values(b.graph.nodes).find((n) => n.def === 'var.set')!.id;
    const [copy, setCopy] = duplicateNodes(b.graph, [tl, set]);
    const a = readTimeline(b.graph.nodes[tl]);
    const c = readTimeline(b.graph.nodes[copy]);
    expect(c.name).not.toBe(a.name);
    // The copy keeps its wires: Update and the track still feed the copied Set.
    const wires = Object.values(b.graph.links).filter((l) => l.from.node === copy && l.to.node === setCopy);
    expect(wires.map((l) => l.from.pin).sort()).toEqual([trackPin(c.tracks[0].id), 'update'].sort());
    expect(compileClass(b.cls, pb.project).status).not.toBe('error');
  });

  it('survives saving, with its tracks', () => {
    const { pb, b, tl } = timelineActor();
    const data = readTimeline(b.graph.nodes[tl]);
    data.length = 2;
    data.tracks[0].keys = [{ t: 0, v: 0 }, { t: 1, v: 90 }, { t: 2, v: 0 }];
    Object.assign(b.graph.nodes[tl].config, timelineConfig(data));
    const back = parseProject(serializeProject(pb.project));
    const node = Object.values(back.classes[0].graphs[0].nodes).find((n) => n.def === 'timeline.node')!;
    expect(readTimeline(node)).toEqual(data);
  });
});

describe('interpolation nodes', () => {
  const pure = (def: string, defaults: Record<string, unknown>) => {
    const pb = new ProjectBuilder('t');
    const b = pb.blueprint('BP');
    const begin = b.node('event.beginPlay');
    const n = b.node(def, {}, defaults as never);
    const conv = b.node('conv.floatToString');
    const print = b.node('debug.printString');
    b.link(begin, 'then', print, 'exec').link(n, 'result', conv, 'in').link(conv, 'result', print, 'text');
    pb.place(b, 0, 0);
    const sim = new Simulation(pb.project);
    sim.start();
    expect(sim.runtimeErrors).toBe(0);
    return Number(prints(sim)[0]);
  };

  it('Lerp, Map Range and FInterp To follow UE', () => {
    expect(pure('math.lerp', { a: 10, b: 20, alpha: 0.25 })).toBe(12.5);
    expect(pure('math.mapRangeClamped', { value: 150, inA: 0, inB: 100, outA: 0, outB: 1 })).toBe(1);
    expect(pure('math.mapRangeUnclamped', { value: 150, inA: 0, inB: 100, outA: 0, outB: 1 })).toBe(1.5);
    expect(pure('math.fInterpTo', { current: 0, target: 100, delta: 0.1, speed: 2 })).toBe(20);
    expect(pure('math.fInterpToConstant', { current: 0, target: 100, delta: 0.1, speed: 50 })).toBe(5);
    expect(pure('math.fInterpToConstant', { current: 99, target: 100, delta: 0.1, speed: 50 })).toBe(100);
  });
});

/** BP_Lampe whose Construction Script shows the light when Allumee is true. */
function lamps() {
  const pb = new ProjectBuilder('t');
  const b = pb.blueprint('BP_Lampe');
  b.component('PointLight', 'Lumiere', { visible: false });
  const on = b.variable('Allumee', T.bool, false);
  b.cls.variables[0].instanceEditable = true;
  const { b: cs, entry } = b.construction();
  const set = cs.node('component.setVisibility', {}, {}, [400, 96]);
  cs.link(entry, 'then', set, 'exec').link(cs.node('var.get', { variable: on }, {}, [200, 300]), 'value', set, 'visible');
  cs.target('Lumiere', set);
  const first = pb.place(b, 0, 0);
  pb.place(b, 300, 0);
  pb.project.level.actors.find((a) => a.id === first)!.overrides[on] = true;
  return { pb, b, on };
}

describe('Construction Script', () => {
  it('runs before the game starts, per instance: the editor preview shows it', () => {
    const { pb } = lamps();
    const preview = new Simulation(pb.project);
    expect(preview.actors.map((a) => a.components.find((c) => c.name === 'Lumiere')!.props.visible)).toEqual([true, false]);
  });

  it('does not run again during the game', () => {
    const { pb, b, on } = lamps();
    b.cls.autoReceiveInput = true;
    const key = b.node('event.inputKey', { key: 'E' }, {}, [64, 96]);
    const set = b.node('var.set', { variable: on }, { value: true }, [400, 96]);
    b.link(key, 'pressed', set, 'exec');
    const sim = new Simulation(pb.project);
    sim.pressKey('E');
    run(sim, 0.2);
    expect(sim.actors[1].vars[on]).toBe(true);
    expect(sim.actors[1].components.find((c) => c.name === 'Lumiere')!.props.visible).toBe(false);
  });

  it('runs for a spawned actor after its exposed values are set, before its BeginPlay', () => {
    const { pb, b, on } = lamps();
    b.cls.variables[0].exposeOnSpawn = true;
    b.link(b.node('event.beginPlay', {}, {}, [64, 96]), 'then', b.node('debug.printString', {}, { text: 'begin' }, [400, 96]), 'exec');
    const { b: cs } = b.construction();
    const setNode = Object.values(cs.graph.nodes).find((n) => n.def === 'component.setVisibility')!.id;
    cs.link(setNode, 'then', cs.node('debug.printString', {}, { text: 'construction' }, [800, 96]), 'exec');
    const sp = pb.blueprint('BP_Spawner');
    const spawn = sp.node('actor.spawn', {}, { class: b.cls.id, [`expose:${on}`]: true }, [400, 96]);
    sp.cls.autoReceiveInput = true;
    sp.link(sp.node('event.inputKey', { key: 'E' }, {}, [64, 96]), 'pressed', spawn, 'exec');
    pb.project.level.actors = [];
    pb.place(sp, 0, 0);
    const sim = new Simulation(pb.project);
    sim.pressKey('E');
    expect(prints(sim)).toEqual(['construction', 'begin']);
    expect(sim.actors[1].components.find((c) => c.name === 'Lumiere')!.props.visible).toBe(true);
  });

  it('runs the parent script, then the child one', () => {
    const { pb, b } = lamps();
    const child = pb.blueprint('BP_Enfant');
    child.cls.parentClassId = b.cls.id;
    const { b: cs, entry } = child.construction();
    cs.link(entry, 'then', cs.node('debug.printString', {}, { text: 'enfant' }, [400, 96]), 'exec');
    const { b: pcs } = b.construction();
    const setNode = Object.values(pcs.graph.nodes).find((n) => n.def === 'component.setVisibility')!.id;
    pcs.link(setNode, 'then', pcs.node('debug.printString', {}, { text: 'parent' }, [800, 96]), 'exec');
    pb.project.level.actors = [];
    pb.place(child, 0, 0);
    expect(prints(new Simulation(pb.project))).toEqual(['parent', 'enfant']);
  });

  it('refuses events and waiting nodes', () => {
    const { b } = lamps();
    expect(() => b.construction().b.node('time.delay')).toThrow(/Construction Script/);
    expect(() => b.construction().b.node('event.beginPlay')).toThrow(/Construction Script/);
  });
});

describe('raycast', () => {
  it('hits a box face with its normal', () => {
    const h = raycast({ kind: 'obb', cx: 100, cy: 0, hx: 10, hy: 50, angle: 0 }, 0, 0, 1, 0, 500)!;
    expect(h.t).toBeCloseTo(90);
    expect(h.nx).toBeCloseTo(-1);
    expect(h.ny).toBeCloseTo(0);
  });
  it('misses when too short or aside, and hits at once from inside', () => {
    const box = { kind: 'obb' as const, cx: 100, cy: 0, hx: 10, hy: 50, angle: 0 };
    expect(raycast(box, 0, 0, 1, 0, 50)).toBeUndefined();
    expect(raycast(box, 0, 80, 1, 0, 500)).toBeUndefined();
    expect(raycast(box, 100, 0, 1, 0, 500)!.t).toBe(0);
  });
  it('hits a circle', () => {
    const h = raycast({ kind: 'circle', cx: 0, cy: 100, r: 20 }, 0, 0, 0, 1, 500)!;
    expect(h.t).toBeCloseTo(80);
    expect(h.ny).toBeCloseTo(-1);
  });
});

/** The player traces 300 cm ahead on E and prints what it hit. */
function tracer(opts: { channel?: number; debug?: number; fromWall?: boolean; ignoreSelf?: boolean } = {}) {
  const pb = new ProjectBuilder('t');
  const wall = pb.blueprint('BP_Mur');
  wall.component('StaticMesh', 'Mur', { sizeX: 40, sizeY: 200 });
  const zone = pb.blueprint('BP_Zone');
  zone.component('BoxCollision', 'Zone', { sizeX: 100, sizeY: 200 });
  const who: ClassBuilder = opts.fromWall ? wall : pb.blueprint('BP_Joueur', 'Pawn');
  if (!opts.fromWall) setPlayerClass(pb.project, who.cls.id);
  who.cls.autoReceiveInput = true;
  const key = who.node('event.inputKey', { key: 'E' }, {}, [64, 96]);
  const loc = who.node('actor.getLocation', {}, {}, [64, 300]);
  const fwd = who.node('actor.getForward', {}, {}, [64, 420]);
  const mul = who.node('math.multiplyVectorFloat', {}, { b: 300 }, [300, 420]);
  const add = who.node('math.addVector', {}, {}, [500, 360]);
  const trace = who.node('trace.lineByChannel', {}, { channel: opts.channel ?? 0, debug: opts.debug ?? 0, ignoreSelf: opts.ignoreSelf ?? true }, [700, 96]);
  const name = who.node('debug.printString', {}, {}, [1100, 96]);
  const dist = who.node('debug.printString', {}, {}, [1400, 96]);
  const conv = who.node('conv.floatToString', {}, {}, [1250, 300]);
  who.link(key, 'pressed', trace, 'exec').link(loc, 'result', trace, 'start').link(loc, 'result', add, 'a');
  who.link(fwd, 'result', mul, 'a').link(mul, 'result', add, 'b').link(add, 'result', trace, 'end');
  who.link(trace, 'then', name, 'exec').link(trace, 'hitActor', name, 'text').link(name, 'then', dist, 'exec');
  who.link(trace, 'distance', conv, 'in').link(conv, 'result', dist, 'text');
  return { pb, wall, zone, who };
}

describe('Line Trace By Channel', () => {
  it('returns the first blocking mesh ahead, with its distance', () => {
    const { pb, wall } = tracer();
    pb.place(wall, 200, 0);
    pb.place(wall, 260, 0);
    const sim = new Simulation(pb.project);
    sim.pressKey('E');
    expect(prints(sim)).toEqual(['BP_Mur', '180.000000']);
    expect(sim.runtimeErrors).toBe(0);
  });

  it('goes through a Box Collision and a mesh that does not block', () => {
    const { pb, wall, zone } = tracer();
    pb.place(zone, 150, 0);
    wall.cls.components.find((c) => c.name === 'Mur')!.props.blocks = false;
    pb.place(wall, 250, 0);
    const sim = new Simulation(pb.project);
    sim.pressKey('E');
    expect(prints(sim)).toEqual(['None', '0.000000']);
  });

  it('finds nothing beyond its length, or behind', () => {
    const { pb, wall } = tracer();
    pb.place(wall, 400, 0);
    pb.place(wall, -100, 0);
    const sim = new Simulation(pb.project);
    sim.pressKey('E');
    expect(prints(sim)[0]).toBe('None');
  });

  it('a mesh tracing from its own centre hits itself unless Ignore Self is checked', () => {
    for (const [ignoreSelf, expected] of [[false, ['BP_Mur', '0.000000']], [true, ['BP_Mur2', '180.000000']]] as const) {
      const { pb, wall } = tracer({ fromWall: true, ignoreSelf });
      pb.place(wall, 0, 0);
      pb.place(wall, 200, 0);
      const sim = new Simulation(pb.project);
      sim.pressKey('E');
      // Both walls trace: keep what the first one printed.
      expect(prints(sim).slice(0, 2)).toEqual(expected);
    }
  });

  it('the player capsule ignores Visibility and blocks Camera', () => {
    for (const [channel, expected] of [[0, 'None'], [1, 'Joueur']] as const) {
      const { pb, wall } = tracer({ fromWall: true, channel });
      pb.place(wall, 0, 0);
      pb.playerStart(200, 0);
      const sim = new Simulation(pb.project);
      sim.pressKey('E');
      expect(prints(sim)[0]).toBe(expected);
    }
  });

  it('Draw Debug Type keeps the line for a frame, five seconds, or for good', () => {
    for (const [debug, at1, at6] of [[0, 0, 0], [1, 0, 0], [2, 1, 0], [3, 1, 1]] as const) {
      const { pb, wall } = tracer({ debug });
      pb.place(wall, 200, 0);
      const sim = new Simulation(pb.project);
      sim.pressKey('E');
      expect(sim.debugLines.length).toBe(debug === 0 ? 0 : 1);
      if (debug) expect(sim.debugLines[0].hit).toEqual({ x: 180, y: 0 });
      run(sim, 1);
      expect(sim.debugLines.length).toBe(at1);
      run(sim, 5);
      expect(sim.debugLines.length).toBe(at6);
    }
  });
});

describe('Event Hit', () => {
  function crate() {
    const pb = new ProjectBuilder('t');
    const b = pb.blueprint('BP_Caisse');
    b.component('StaticMesh', 'Caisse', { sizeX: 100, sizeY: 100 });
    const hit = b.node('event.hit', {}, {}, [64, 96]);
    const print = b.node('debug.printString', {}, {}, [400, 96]);
    b.link(hit, 'then', print, 'exec').link(hit, 'other', print, 'text');
    pb.place(b, 200, 0);
    pb.playerStart(0, 0);
    return { pb, b, hit };
  }

  it('fires every frame while the player pushes against a blocking mesh, never without contact', () => {
    const { pb } = crate();
    const sim = new Simulation(pb.project);
    sim.move = { x: 1, y: 0 };
    run(sim, 0.1);
    expect(prints(sim)).toEqual([]);
    run(sim, 0.4);
    const n = prints(sim).length;
    expect(n).toBeGreaterThan(10);
    expect(prints(sim)[0]).toBe('Joueur');
    sim.move = { x: 0, y: 0 };
    run(sim, 0.5);
    expect(prints(sim).length).toBe(n);
  });

  it('gives the pushed actor the direction of the push', () => {
    const { pb, b, hit } = crate();
    const move = b.node('actor.addOffset', {}, {}, [700, 96]);
    const mul = b.node('math.multiplyVectorFloat', {}, { b: 5 }, [500, 300]);
    const print = Object.values(b.graph.nodes).find((n) => n.def === 'debug.printString')!.id;
    b.link(print, 'then', move, 'exec').link(hit, 'normal', mul, 'a').link(mul, 'result', move, 'delta');
    const sim = new Simulation(pb.project);
    sim.move = { x: 1, y: 0 };
    run(sim, 1);
    expect(sim.actors[0].x).toBeGreaterThan(300);
    expect(sim.actors[0].y).toBeCloseTo(0);
  });

  it('does not fire for a mesh that does not block', () => {
    const { pb, b } = crate();
    b.cls.components.find((c) => c.name === 'Caisse')!.props.blocks = false;
    const sim = new Simulation(pb.project);
    sim.move = { x: 1, y: 0 };
    run(sim, 1);
    expect(prints(sim)).toEqual([]);
  });
});
