/**
 * V7.67, Projet X3 « L’arène de maintenance »: each milestone fails from
 * where the previous one ends and passes with its own part (milestones.test),
 * and the classic mistakes are caught, with a reason that points at them.
 */
import { describe, expect, it } from 'vitest';
import { LESSONS } from '../src/core/lessons';
import { edit } from '../src/core/lessons/builder';
import { milestoneView } from '../src/core/lessons/milestones';
import { runLesson } from '../src/core/lessons/runner';
import type { Project } from '../src/core/model/project';
import { removeNodes } from '../src/core/operations/graphOps';

const arena = LESSONS.find((l) => l.id === 'x3-arene')!;

/** The project solved up to milestone `i`, then changed. */
function solved(i: number, change: (p: Project) => void = () => {}): Project {
  const p = arena.setup();
  for (const m of arena.milestones!.slice(0, i + 1)) m.solve(p);
  change(p);
  return p;
}
const run = (i: number, p: Project) => runLesson(milestoneView(arena, i), p);
const failed = (i: number, p: Project) => run(i, p).results.filter((r) => !r.ok).map((r) => r.check.id);
const reason = (i: number, p: Project, id: string) => run(i, p).results.find((r) => r.check.id === id)?.reason ?? '';
const nodes = (p: Project, cls: string, def: string) => Object.values(edit(p, cls).graph.nodes).filter((n) => n.def === def);

describe('X3 L’arène de maintenance', () => {
  it('three milestones; the whole project passes, in both orders of the level', () => {
    expect(arena.milestones?.map((m) => m.id)).toEqual(['drones', 'vagues', 'partie']);
    const r = runLesson(arena, solved(2));
    expect(r.passed, JSON.stringify(r.results.filter((x) => !x.ok))).toBe(true);
  });

  it('milestone 1: children left with the parent’s values are told where to set theirs', () => {
    const p = solved(0, (p) => {
      for (const c of p.classes) if (c.name === 'BP_Eclaireur' || c.name === 'BP_Blinde') delete c.inheritedDefaults;
    });
    expect(failed(0, p)).toContain('defaults');
    expect(reason(0, p, 'defaults')).toContain('Class Defaults');
  });

  it('milestone 1: a drone that moves a fixed step per frame (no Delta Seconds) fails at 30 fps', () => {
    const p = solved(0, (p) => {
      const tick = nodes(p, 'BP_Drone', 'event.tick')[0];
      const g = edit(p, 'BP_Drone').graph;
      for (const l of Object.values(g.links)) if (l.from.node === tick.id && l.from.pin === 'delta') delete g.links[l.id];
      nodes(p, 'BP_Drone', 'math.multiplyFloat')[0].defaults.b = 1 / 60;
    });
    expect(failed(0, p)).toContain('move');
    expect(reason(0, p, 'move')).toContain('Delta Seconds');
  });

  it('milestone 1: a shot that asks for a component on nothing is an Accessed None', () => {
    const p = solved(0, (p) => {
      const g = edit(p, 'BP_Joueur').graph;
      const [first] = nodes(p, 'BP_Joueur', 'flow.branch').sort((a, b) => a.x - b.x);
      const trace = nodes(p, 'BP_Joueur', 'trace.lineByChannel')[0];
      const second = nodes(p, 'BP_Joueur', 'flow.branch').find((n) => n.id !== first.id)!;
      removeNodes(g, [first.id]);
      edit(p, 'BP_Joueur').link(trace.id, 'then', second.id, 'exec');
    });
    expect(failed(0, p)).toContain('no-errors');
    expect(reason(0, p, 'no-errors')).toContain('Accessed None');
  });

  it('milestone 1: a shot by Cast To BP_Drone still passes (only the notion asks for Get Component by Class)', () => {
    const p = solved(0, (p) => {
      const pl = edit(p, 'BP_Joueur');
      const comp = nodes(p, 'BP_Joueur', 'actor.getComponentByClass')[0];
      const drone = p.classes.find((c) => c.name === 'BP_Drone')!;
      const cast = pl.node('cast.to', { class: drone.id }, {}, [1200, 500]);
      const g = pl.graph;
      const trace = nodes(p, 'BP_Joueur', 'trace.lineByChannel')[0];
      const valid = nodes(p, 'BP_Joueur', 'util.isValid')[0];
      const [, second] = nodes(p, 'BP_Joueur', 'flow.branch').sort((a, b) => a.x - b.x);
      const hit = nodes(p, 'BP_Joueur', 'call.function')[0];
      removeNodes(g, [comp.id, valid.id]);
      const sante = pl.node('var.getExternal', { owner: drone.id, variable: '' }, {}, [1400, 600]);
      removeNodes(g, [sante]);
      const getComp = pl.node('actor.getComponentByClass', {}, { componentClass: p.classes.find((c) => c.name === 'BP_Sante')!.id }, [1500, 600]);
      // Cast To BP_Drone, then its health.
      for (const l of Object.values(g.links)) if (l.to.node === second.id && l.to.pin === 'exec') delete g.links[l.id];
      pl.link(trace.id, 'hitActor', cast, 'object');
      const firstBranch = nodes(p, 'BP_Joueur', 'flow.branch').sort((a, b) => a.x - b.x)[0];
      pl.link(firstBranch.id, 'true', cast, 'exec').link(cast, 'then', hit.id, 'exec').link(cast, 'as', getComp, 'target').link(getComp, 'result', hit.id, 'target');
      removeNodes(g, [second.id]);
    });
    const r = run(0, p);
    expect(r.results.filter((x) => !x.ok && !x.check.notion).map((x) => x.check.id)).toEqual([]);
    expect(nodes(p, 'BP_Joueur', 'cast.to')).toHaveLength(1);
  });

  it('milestone 2: the drones of the test left in the level are refused', () => {
    const p = solved(1);
    const q = solved(0);
    p.levels[0].actors.push(...q.levels[0].actors.filter((a) => ['BP_Eclaireur', 'BP_Blinde'].includes(q.classes.find((c) => c.id === a.classId)?.name ?? '')).map((a) => ({ ...a, classId: p.classes.find((c) => c.name === q.classes.find((x) => x.id === a.classId)!.name)!.id })));
    // Milestone 1 is replayed first: it fails there, and says what is wrong.
    expect(failed(1, p)).toContain('down');
    expect(reason(1, p, 'down')).toContain('retire');
  });

  it('milestone 2: every drone from the first portal is refused, with the Random Stream named', () => {
    const p = solved(1, (p) => {
      const pick = nodes(p, 'BP_GameMode', 'random.intInRangeFromStream')[0];
      pick.defaults.max = 0;
      const g = edit(p, 'BP_GameMode').graph;
      for (const l of Object.values(g.links)) if (l.to.node === pick.id && l.to.pin === 'max') delete g.links[l.id];
    });
    expect(failed(1, p)).toContain('portals');
    expect(reason(1, p, 'portals')).toContain('Random');
  });

  it('milestone 2: a next wave launched without waiting for the drones of the last one is refused', () => {
    const p = solved(1, (p) => {
      // « The wave is over » no longer asks Restants: each drone gone opens the next wave.
      const g = edit(p, 'BP_GameMode').graph;
      const over = nodes(p, 'BP_GameMode', 'flow.branch').find((n) => Object.values(g.links).some((l) => l.to.node === n.id && l.to.pin === 'condition' && g.nodes[l.from.node]?.def === 'math.lessEqualInt' && g.nodes[l.from.node].y === 1800))!;
      for (const l of Object.values(g.links)) if (l.to.node === over.id && l.to.pin === 'condition') delete g.links[l.id];
      over.defaults.condition = true;
    });
    expect(failed(1, p)).toContain('wave2');
  });

  it('milestone 3: a record written even when lower is refused (the second game says Record 0)', () => {
    const p = solved(2, (p) => {
      const gm = edit(p, 'BP_GameMode');
      const best = nodes(p, 'BP_GameMode', 'math.greaterInt')[0];
      const g = gm.graph;
      for (const l of Object.values(g.links)) if (l.from.node === best.id) delete g.links[l.id];
      const br = Object.values(g.nodes).find((n) => n.def === 'flow.branch' && Object.values(g.links).some((l) => l.from.node === n.id && l.from.pin === 'true' && g.nodes[l.to.node]?.def === 'var.set' && g.nodes[l.to.node].x === 1120))!;
      br.defaults.condition = true;
    });
    expect(failed(2, p)).toContain('end-lost');
    expect(reason(2, p, 'end-lost')).toContain('Record 0');
  });

  it('milestone 3: a drone without a Box Collision never hurts the core, and is told why', () => {
    const p = solved(2, (p) => {
      const d = edit(p, 'BP_Drone');
      d.cls.components = d.cls.components.filter((c) => c.kind !== 'BoxCollision');
    });
    expect(failed(2, p)).toContain('core');
    expect(reason(2, p, 'core')).toContain('Box Collision');
  });
});
