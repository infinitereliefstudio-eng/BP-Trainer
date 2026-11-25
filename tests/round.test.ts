/**
 * V7.68, Projet X4 « La ronde »: each milestone fails from where the previous
 * one ends and passes with its own part (milestones.test), and the classic
 * mistakes are caught, with a reason that points at them. Also the two engine
 * changes it needed: Find Look at Rotation, and Ignore Self from an Actor
 * Component (the owner is ignored, as in UE).
 */
import { describe, expect, it } from 'vitest';
import { LESSONS } from '../src/core/lessons';
import { edit, ProjectBuilder } from '../src/core/lessons/builder';
import { milestoneView } from '../src/core/lessons/milestones';
import { runLesson } from '../src/core/lessons/runner';
import type { Graph, NodeInstance, Project } from '../src/core/model/project';
import { removeNodes } from '../src/core/operations/graphOps';
import { Simulation } from '../src/core/runtime/simulation';
import { T } from '../src/core/types/pins';
import { newClass } from '../src/core/lessons/library/umgKit';

const round = LESSONS.find((l) => l.id === 'x4-ronde')!;

/** The project solved up to milestone `i`, then changed. */
function solved(i: number, change: (p: Project) => void = () => {}): Project {
  const p = round.setup();
  for (const m of round.milestones!.slice(0, i + 1)) m.solve(p);
  change(p);
  return p;
}
const run = (i: number, p: Project) => runLesson(milestoneView(round, i), p);
const failed = (i: number, p: Project) => run(i, p).results.filter((r) => !r.ok).map((r) => r.check.id);
const reason = (i: number, p: Project, id: string) => run(i, p).results.find((r) => r.check.id === id)?.reason ?? '';
const graphOf = (p: Project, cls: string, name?: string): Graph => {
  const c = p.classes.find((x) => x.name === cls)!;
  return name ? c.graphs.find((g) => g.name === name)! : c.graphs[0];
};
const nodes = (g: Graph, def: string): NodeInstance[] => Object.values(g.nodes).filter((n) => n.def === def);
/** Drop the links into `pin` of `node`. */
const unlinkIn = (g: Graph, node: string, pin: string) => {
  for (const l of Object.values(g.links)) if (l.to.node === node && l.to.pin === pin) delete g.links[l.id];
};

describe('X4 La ronde', () => {
  it('four milestones, after L’arène; the whole project passes', { timeout: 20000 }, () => {
    expect(round.milestones?.map((m) => m.id)).toEqual(['gardes', 'vision', 'alerte', 'casse']);
    const ids = LESSONS.map((l) => l.id);
    expect(ids.indexOf('x4-ronde')).toBe(ids.indexOf('x3-arene') + 1);
    const r = runLesson(round, solved(3));
    expect(r.passed, JSON.stringify(r.results.filter((x) => !x.ok))).toBe(true);
  });

  it('milestone 1: children left with the parent’s Vitesse are told where to set theirs', () => {
    const p = solved(0, (p) => {
      for (const c of p.classes) if (c.name === 'BP_Sentinelle' || c.name === 'BP_Patrouilleur') delete c.inheritedDefaults;
    });
    expect(failed(0, p)).toContain('defaults');
    expect(reason(0, p, 'defaults')).toContain('Class Defaults');
  });

  it('milestone 1: a fixed step per frame (no Delta Seconds) fails at 30 fps', () => {
    const p = solved(0, (p) => {
      const tick = nodes(graphOf(p, 'BP_Garde'), 'event.tick')[0];
      const call = nodes(graphOf(p, 'BP_Garde'), 'call.function')[0];
      const g = graphOf(p, 'BP_Garde');
      for (const l of Object.values(g.links)) if (l.from.node === tick.id && l.from.pin === 'delta') delete g.links[l.id];
      call.defaults[Object.keys(call.defaults).find((k) => k !== 'target') ?? ''] = 1 / 60;
      const param = p.classes.find((c) => c.name === 'BP_Garde')!.graphs.find((x) => x.name === 'Ronde')!.fn!.inputs[0].id;
      call.defaults[param] = 1 / 60;
    });
    expect(failed(0, p)).toContain('round-a');
    expect(reason(0, p, 'round-a') + reason(0, p, 'speed')).toMatch(/Delta Seconds|on l’attend/);
  });

  it('milestone 1: a guard that does not turn is told to face its point', () => {
    const p = solved(0, (p) => {
      const g = graphOf(p, 'BP_Garde', 'Ronde');
      const turn = nodes(g, 'actor.setRotation')[0];
      // The function goes straight to the Branch.
      const entry = nodes(g, 'fn.entry')[0];
      for (const l of Object.values(g.links)) {
        if (l.to.node === turn.id && l.to.pin === 'exec') l.to = { ...l.to };
        if (l.from.node === turn.id && l.from.pin === 'then') l.from = { node: entry.id, pin: 'then' };
      }
      removeNodes(g, [turn.id]);
    });
    expect(failed(0, p)).toContain('turn');
    expect(reason(0, p, 'turn')).toContain('Find Look at Rotation');
  });

  it('milestone 1: a guard that never takes the next point overshoots or stops, and is told', () => {
    const p = solved(0, (p) => {
      const g = graphOf(p, 'BP_Garde', 'Ronde');
      const set = nodes(g, 'var.set')[0];
      unlinkIn(g, set.id, 'value');
      set.defaults.value = 1;
    });
    expect(failed(0, p)).toContain('turn');
    expect(reason(0, p, 'turn')).toContain('modulo');
  });

  it('milestone 2: without the Line Trace, the guard sees through the pillar', () => {
    const p = solved(1, (p) => {
      const g = graphOf(p, 'BP_Vision', 'Voit');
      const and = nodes(g, 'logic.and').find((n) => Object.values(g.links).some((l) => l.from.node === n.id && nodes(g, 'fn.return').some((r) => r.id === l.to.node)))!;
      unlinkIn(g, and.id, 'b');
      and.defaults.b = true;
    });
    expect(failed(1, p)).toContain('wall');
    expect(reason(1, p, 'wall')).toContain('Line Trace');
  });

  it('milestone 2: without the Dot Product, the guard sees behind its back', () => {
    const p = solved(1, (p) => {
      const g = graphOf(p, 'BP_Vision', 'Voit');
      const gt = nodes(g, 'math.greaterFloat')[0];
      const and = Object.values(g.links).find((l) => l.from.node === gt.id)!.to;
      unlinkIn(g, and.node, and.pin);
      g.nodes[and.node].defaults[and.pin] = true;
    });
    // The player at the start is behind the Sentinelle: seen anyway, she leaves her round from milestone 1.
    expect(failed(1, p)).toContain('round-a');
    expect(reason(1, p, 'round-a')).toContain('Voit');
  });

  it('milestone 2: a vision that keeps its own Portee (not the guard’s) lets the Patrouilleur see too far', () => {
    const p = solved(1, (p) => {
      const g = graphOf(p, 'BP_Garde');
      const set = nodes(g, 'var.setExternal')[0];
      const begin = nodes(g, 'event.beginPlay')[0];
      const cast = nodes(g, 'cast.to')[0];
      for (const l of Object.values(g.links)) if (l.from.node === set.id && l.from.pin === 'then') l.from = { node: begin.id, pin: 'then' };
      void cast;
      removeNodes(g, [set.id]);
    });
    expect(failed(1, p)).toContain('short');
    expect(reason(1, p, 'short')).toContain('Portee');
  });

  it('milestone 3: an alert the GameMode does not pass on leaves the other guard on patrol', () => {
    const p = solved(2, (p) => {
      const g = graphOf(p, 'BP_GameMode');
      removeNodes(g, nodes(g, 'call.custom').map((n) => n.id));
    });
    expect(failed(2, p)).toContain('all');
    expect(reason(2, p, 'all')).toContain('GameMode');
  });

  it('milestone 2: a guard that keeps walking in Suspicion is told about the Switch', () => {
    const p = solved(1, (p) => {
      const g = graphOf(p, 'BP_Garde');
      const sw = nodes(g, 'flow.switchEnum')[0];
      for (const l of Object.values(g.links)) if (l.from.node === sw.id && l.from.pin !== 'case0') delete g.links[l.id];
      const round = nodes(g, 'call.function').find((n) => Object.values(g.links).some((l) => l.from.node === sw.id && l.to.node === n.id))!;
      for (const pin of ['case1', 'case2']) g.links[`x-${pin}`] = { id: `x-${pin}`, from: { node: sw.id, pin }, to: { node: round.id, pin: 'exec' } };
    });
    expect(failed(1, p)).toContain('stop');
    expect(reason(1, p, 'stop')).toContain('Switch');
  });

  it('milestone 4: a vision that ignores the locker sees the hidden player', () => {
    const p = solved(3, (p) => {
      const g = graphOf(p, 'BP_Vision', 'Voit');
      const br = nodes(g, 'flow.branch')[0];
      unlinkIn(g, br.id, 'condition');
      br.defaults.condition = false;
    });
    expect(failed(3, p)).toContain('hidden');
    expect(reason(3, p, 'hidden')).toContain('Cache');
  });

  it('milestone 4: a file that does not keep where it was taken sends the player back to the start', () => {
    const p = solved(3, (p) => {
      const g = graphOf(p, 'BP_Dossier');
      const point = p.classes.find((c) => c.name === 'BP_Partie')!.variables.find((v) => v.name === 'Point')!.id;
      const set = nodes(g, 'var.setExternal').find((n) => n.config.variable === point)!;
      const before = Object.values(g.links).find((l) => l.to.node === set.id && l.to.pin === 'exec')!.from;
      for (const l of Object.values(g.links)) if (l.from.node === set.id && l.from.pin === 'then') l.from = before;
      removeNodes(g, [set.id]);
    });
    expect(failed(3, p)).toContain('checkpoint');
    expect(reason(3, p, 'checkpoint')).toContain('GameInstance');
  });

  it('milestone 3: a count kept in the GameMode is lost at each Open Level', () => {
    const p = solved(2, (p) => {
      const gm = edit(p, 'BP_GameMode');
      const count = gm.variable('Reperes', T.int, 0);
      const g = gm.graph;
      for (const n of [...nodes(g, 'var.getExternal'), ...nodes(g, 'var.setExternal')]) {
        if (p.classes.find((c) => c.id === n.config.owner)?.name !== 'BP_Partie') continue;
        n.def = n.def === 'var.getExternal' ? 'var.get' : 'var.set';
        n.config = { variable: count };
        for (const l of Object.values(g.links)) if (l.to.node === n.id && l.to.pin === 'target') delete g.links[l.id];
      }
    });
    expect(failed(2, p)).toContain('again');
    expect(reason(2, p, 'again')).toContain('GameInstance');
  });

  it('Find Look at Rotation turns toward the target; the same point gives no rotation', () => {
    const pb = new ProjectBuilder('t');
    const b = pb.blueprint('BP_A');
    const begin = b.node('event.beginPlay');
    const look = b.node('math.findLookAtRotation', {}, { start: { x: 0, y: 0, z: 0 }, target: { x: 0, y: 200, z: 0 } });
    const same = b.node('math.findLookAtRotation', {}, { start: { x: 5, y: 5, z: 0 }, target: { x: 5, y: 5, z: 0 } });
    const turn = b.node('actor.setRotation');
    const p1 = b.node('debug.printString');
    const toStr = b.node('conv.rotatorToString');
    b.link(begin, 'then', turn, 'exec').link(look, 'result', turn, 'rotation').link(turn, 'then', p1, 'exec').link(same, 'result', toStr, 'in').link(toStr, 'result', p1, 'text');
    pb.place(b, 0, 0);
    const sim = new Simulation(pb.project);
    sim.start();
    sim.step(1 / 60);
    const a = sim.actors.find((x) => x.className === 'BP_A')!;
    expect(a.yaw).toBeCloseTo(90);
    expect(sim.log.find((l) => l.message !== undefined)?.message).toMatch(/P=0(\.0+)? Y=0(\.0+)? R=0/);
  });

  it('Ignore Self in an Actor Component ignores the actor that carries it, as in UE', () => {
    const pb = new ProjectBuilder('t');
    const p = pb.project;
    const comp = newClass(p, 'BP_Oeil', 'ActorComponent');
    const begin = comp.node('event.beginPlay', {}, {}, [0, 0]);
    const owner = comp.node('component.getOwner', {}, {}, [0, 200]);
    const at = comp.node('actor.getLocation', {}, {}, [200, 200]);
    const end = comp.node('math.addVector', {}, { b: { x: 500, y: 0, z: 0 } }, [400, 200]);
    const trace = comp.node('trace.lineByChannel', {}, {}, [300, 0]);
    const say = comp.node('debug.printString', {}, {}, [600, 0]);
    const str = comp.node('conv.boolToString', {}, {}, [500, 200]);
    comp.link(begin, 'then', trace, 'exec').link(owner, 'result', at, 'target').link(at, 'result', trace, 'start').link(at, 'result', end, 'a').link(end, 'result', trace, 'end');
    comp.link(trace, 'then', say, 'exec').link(trace, 'result', str, 'in').link(str, 'result', say, 'text');
    const body = pb.blueprint('BP_Corps');
    body.component('StaticMesh', 'Corps', { shape: 'cylinder', sizeX: 80, sizeY: 80 });
    body.logic(comp, 'Oeil');
    pb.place(body, 0, 0);
    pb.playerStart(0, 400);
    const sim = new Simulation(p);
    sim.start();
    sim.step(1 / 60);
    expect(sim.log.filter((l) => l.message !== undefined).map((l) => l.message)).toContain('false');
  });
});
