/**
 * V7.69, Projet X5 « Le réseau »: each milestone fails from where the previous
 * one ends and passes with its own part (milestones.test), the classic
 * mistakes are caught with a reason that points at them, and the test's own
 * model of the grid (the seed's draws, the walk) matches the simulator.
 */
import { describe, expect, it } from 'vitest';
import { LESSONS } from '../src/core/lessons';
import { milestoneView } from '../src/core/lessons/milestones';
import { runLesson } from '../src/core/lessons/runner';
import { G1, G2, cellAt, fixed, reached, startQuarts } from '../src/core/lessons/library/expertNetwork';
import { levelOf, type Graph, type NodeInstance, type Project } from '../src/core/model/project';
import { removeNodes } from '../src/core/operations/graphOps';
import { edit } from '../src/core/lessons/builder';
import { placeActor } from '../src/core/operations/levelOps';
import { Simulation } from '../src/core/runtime/simulation';

const network = LESSONS.find((l) => l.id === 'x5-reseau')!;

/** The project solved up to milestone `i`, then changed. */
function solved(i: number, change: (p: Project) => void = () => {}): Project {
  const p = network.setup();
  for (const m of network.milestones!.slice(0, i + 1)) m.solve(p);
  change(p);
  return p;
}
const run = (i: number, p: Project) => runLesson(milestoneView(network, i), p);
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
const linkFrom = (g: Graph, node: string, pin: string) => Object.values(g.links).find((l) => l.to.node === node && l.to.pin === pin)!.from;

describe('X4 (x5-reseau) Le réseau', () => {
  it('V7.74: Recalculer is a function; its working list and current relay are local variables; the event graph stays short', () => {
    const p = solved(4);
    const net = p.classes.find((c) => c.name === 'BP_Reseau')!;
    const fn = net.graphs.find((g) => g.name === 'Recalculer')!;
    expect(fn.kind).toBe('function');
    expect(fn.fn!.locals!.map((l) => l.name).sort()).toEqual(['AFaire', 'Courant']);
    expect(net.variables.map((v) => v.name)).not.toContain('AFaire');
    expect(Object.keys(net.graphs.find((g) => g.kind === 'event')!.nodes).length).toBeLessThan(110);
  });

  it('five milestones, after La ronde; the whole project passes', { timeout: 30000 }, () => {
    expect(network.milestones?.map((m) => m.id)).toEqual(['grille', 'courant', 'coups', 'menu', 'records']);
    const ids = LESSONS.map((l) => l.id);
    expect(ids.indexOf('x5-reseau')).toBe(ids.indexOf('x4-ronde') + 1);
    const r = runLesson(network, solved(4));
    expect(r.passed, JSON.stringify(r.results.filter((x) => !x.ok))).toBe(true);
  });

  it('the test’s model: the seed’s draws are the simulator’s, each plan fixes its grid at its last turn only', () => {
    const p = solved(0);
    const sim = new Simulation(p, {});
    sim.start();
    sim.step(1 / 60);
    const quarts = G1.shapes.map((_, i) => {
      const a = sim.actors.find((x) => x.className === 'BP_Relais' && Math.hypot(x.x - cellAt(i)[0], x.y - cellAt(i)[1]) < 1)!;
      return Number(a.vars[sim.classOf(a)!.variables.find((v) => v.name === 'Quart')!.id]);
    });
    expect(quarts).toEqual(startQuarts(G1));
    for (const g of [G1, G2]) {
      const q = startQuarts(g);
      expect(fixed(g.shapes, q)).toBe(false);
      g.plan.forEach(([i, k], n) => {
        q[i] = (q[i] + k) % 4;
        expect(fixed(g.shapes, q)).toBe(n === g.plan.length - 1);
      });
      expect(reached(g.shapes, q).has(3)).toBe(true);
    }
  });

  it('milestone 1: a relay placed by hand is told the grid is made in game', () => {
    const p = solved(0, (p) => {
      placeActor(p, p.classes.find((c) => c.name === 'BP_Relais')!.id, 600, 300);
    });
    expect(failed(0, p)).toContain('grid');
    expect(reason(0, p, 'grid')).toContain('posé');
  });

  it('milestone 1: a stream that is not made from the row’s Graine is told about the draws', () => {
    const p = solved(0, (p) => {
      const g = graphOf(p, 'BP_Reseau');
      const make = nodes(g, 'random.makeStream')[0];
      unlinkIn(g, make.id, 'seed');
      make.defaults.seed = 7;
    });
    expect(failed(0, p)).toContain('grid');
    expect(reason(0, p, 'grid')).toMatch(/graine 9/);
  });

  it('milestone 2: a neighbour tested on the same side, not the facing one, is told about (Cote + 2) % 4', () => {
    const p = solved(1, (p) => {
      // V7.74: the test of both sides lives in the pure function Passe (De, Vers, Cote).
      const g = graphOf(p, 'BP_Reseau', 'Passe');
      const facing = nodes(g, 'math.moduloInt').find((n) => n.defaults.b === 4 && Object.values(g.links).some((l) => l.to.node === n.id && l.to.pin === 'a' && g.nodes[l.from.node].def === 'math.addInt' && g.nodes[l.from.node].defaults.b === 2))!;
      const call = Object.values(g.links).find((l) => l.from.node === facing.id)!.to;
      const entry = nodes(g, 'fn.entry')[0];
      unlinkIn(g, call.node, call.pin);
      edit(p, 'BP_Reseau').inGraph(g.id).link(entry.id, g.fn!.inputs.find((x) => x.name === 'Cote')!.id, call.node, call.pin);
    });
    const ids = failed(1, p);
    expect(ids.some((id) => id === 'start' || id.startsWith('turn-'))).toBe(true);
    const why = run(1, p).results.find((r) => !r.ok)!.reason ?? '';
    expect(why).toMatch(/Cote \+ 2|devrai/);
  });

  it('milestone 2: a walk without its Set of relays seen is stopped, and told why', { timeout: 60000 }, () => {
    const p = solved(1, (p) => {
      const g = graphOf(p, 'BP_Reseau', 'Recalculer');
      const not = nodes(g, 'logic.not')[0];
      const and = Object.values(g.links).find((l) => l.from.node === not.id)!.to;
      unlinkIn(g, and.node, and.pin);
      g.nodes[and.node].defaults[and.pin] = true;
    });
    // The first walk runs at BeginPlay: milestone 1 already stops on it, and says why.
    expect(failed(1, p)).toContain('no-errors');
    expect(reason(1, p, 'no-errors')).toContain('Visites');
  });

  it('milestone 2: a network that does not listen to its relays is wrong once a turn changes the current', () => {
    const p = solved(1, (p) => {
      const g = graphOf(p, 'BP_Reseau');
      const bind = nodes(g, 'dispatcher.bind')[0];
      const spawn = nodes(g, 'actor.spawn')[0];
      const add = Object.values(g.links).find((l) => l.from.node === bind.id && l.from.pin === 'then')!.to;
      removeNodes(g, [bind.id]);
      edit(p, 'BP_Reseau').link(spawn.id, 'then', add.node, add.pin);
    });
    const ids = failed(1, p);
    expect(ids).not.toContain('start');
    expect(ids.some((id) => id.startsWith('turn-'))).toBe(true);
  });

  it('milestone 3: relays that still turn once the network is fixed are caught', () => {
    const p = solved(2, (p) => {
      const g = graphOf(p, 'BP_Relais');
      const br = nodes(g, 'flow.branch')[0];
      const ev = linkFrom(g, br.id, 'exec');
      const set = Object.values(g.links).find((l) => l.from.node === br.id && l.from.pin === 'false')!.to;
      removeNodes(g, [br.id]);
      edit(p, 'BP_Relais').link(ev.node, ev.pin, set.node, set.pin);
    });
    expect(failed(2, p)).toContain('locked');
    expect(reason(2, p, 'locked')).toContain('bloqué');
  });

  it('milestone 4: a network that always reads G1 is told the choice must cross Open Level', () => {
    const p = solved(3, (p) => {
      const g = graphOf(p, 'BP_Reseau');
      const row = nodes(g, 'dataTable.getRow')[0];
      unlinkIn(g, row.id, 'rowName');
      row.defaults.rowName = 'G1';
    });
    expect(failed(3, p)).toContain('other');
    expect(reason(3, p, 'other')).toContain('GameInstance');
  });

  it('milestone 5: a worse score written over the record is caught', () => {
    const p = solved(4, (p) => {
      const g = graphOf(p, 'BP_Reseau');
      const or = nodes(g, 'logic.or')[0];
      const br = Object.values(g.links).find((l) => l.from.node === or.id)!.to;
      unlinkIn(g, br.node, br.pin);
      g.nodes[br.node].defaults[br.pin] = true;
    });
    expect(failed(4, p)).toEqual(expect.arrayContaining(['worse']));
    expect(reason(4, p, 'worse')).toContain('meilleur');
  });

  it('milestones 1 to 3 are played in Lvl_Reseau, whatever the Game Default Map', () => {
    const p = solved(4);
    expect(p.levels.map((l) => l.name)).toEqual(expect.arrayContaining(['Lvl_Reseau', 'Lvl_Menu']));
    expect(levelOf(p).name).toBe('Lvl_Reseau');
    for (const i of [0, 1, 2]) expect(run(i, p).passed).toBe(true);
  });
});
