/**
 * V7.67: a child Blueprint's Class Defaults for the variables it inherits, as
 * in UE: placed or spawned, the child starts with its own value; a grandchild
 * inherits it; ↺ gives the parent's back; a value set for another type is ignored.
 */
import { describe, expect, it } from 'vitest';
import { inheritedView } from '../src/core/model/inheritance';
import { levelOf } from '../src/core/model/project';
import { setInheritedDefault, setVariableType } from '../src/core/operations/classOps';
import { setParentClass } from '../src/core/operations/projectOps';
import { validateProject } from '../src/core/serialization/validate';
import { Simulation } from '../src/core/runtime/simulation';
import { T } from '../src/core/types/pins';
import { ProjectBuilder } from '../src/core/lessons/builder';

function family() {
  const pb = new ProjectBuilder('Famille');
  const base = pb.blueprint('BP_Drone');
  base.component('StaticMesh', 'Corps', {});
  const speed = base.variable('Vitesse', T.float, 100);
  const fast = pb.blueprint('BP_Eclaireur');
  const scout = pb.blueprint('BP_EclaireurElite');
  for (const [c, parent] of [
    [fast, base],
    [scout, fast],
  ] as const) {
    const r = setParentClass(pb.project, c.cls.id, parent.cls.id);
    if (!r.ok) throw new Error(r.reason);
  }
  return { pb, base, fast, scout, speed };
}

const speedOf = (sim: Simulation, cls: string, speed: string) => sim.actors.find((a) => a.className === cls)?.vars[speed];

describe('Class Defaults of a child for inherited variables', () => {
  it('a placed child starts with its own value; the parent and a sibling keep theirs; a grandchild inherits it', () => {
    const { pb, base, fast, scout, speed } = family();
    const v = base.cls.variables[0];
    setInheritedDefault(fast.cls, v, 160);
    pb.place(base, 0, 0);
    pb.place(fast, 200, 0);
    pb.place(scout, 400, 0);
    const sim = new Simulation(pb.project);
    sim.start();
    expect(speedOf(sim, 'BP_Drone', speed)).toBe(100);
    expect(speedOf(sim, 'BP_Eclaireur', speed)).toBe(160);
    expect(speedOf(sim, 'BP_EclaireurElite', speed)).toBe(160);
    setInheritedDefault(scout.cls, v, 220);
    expect(inheritedView(scout.cls, pb.project).variables.find((x) => x.id === speed)?.defaultValue).toBe(220);
    expect(inheritedView(fast.cls, pb.project).variables.find((x) => x.id === speed)?.defaultValue).toBe(160);
  });

  it('↺ gives the parent’s value back; a value set for another type is ignored; its own variables are not touched', () => {
    const { pb, base, fast, speed } = family();
    const v = base.cls.variables[0];
    setInheritedDefault(fast.cls, v, 160);
    setInheritedDefault(fast.cls, v, undefined);
    expect(fast.cls.inheritedDefaults).toBeUndefined();
    expect(inheritedView(fast.cls, pb.project).variables.find((x) => x.id === speed)?.defaultValue).toBe(100);
    setInheritedDefault(fast.cls, v, 160);
    setVariableType(base.cls, speed, T.int);
    expect(inheritedView(fast.cls, pb.project).variables.find((x) => x.id === speed)?.defaultValue).toBe(0);
    const own = fast.variable('Points', T.int, 10);
    setInheritedDefault(fast.cls, fast.cls.variables.find((x) => x.id === own)!, 99);
    expect(fast.cls.inheritedDefaults?.[own]).toBeUndefined();
  });

  it('a spawned child starts with its own value too, and the Expose on Spawn pin shows it', () => {
    const { pb, base, fast, speed } = family();
    setInheritedDefault(fast.cls, base.cls.variables[0], 160);
    const spawner = pb.blueprint('BP_Usine');
    const begin = spawner.node('event.beginPlay', {}, {}, [0, 0]);
    const spawn = spawner.node('actor.spawn', {}, { class: fast.cls.id }, [300, 0]);
    spawner.link(begin, 'then', spawn, 'exec');
    pb.place(spawner, 0, 0);
    const sim = new Simulation(pb.project);
    sim.start();
    sim.step(1 / 30);
    expect(speedOf(sim, 'BP_Eclaireur', speed)).toBe(160);
    expect(levelOf(pb.project).actors).toHaveLength(1);
  });

  it('an imported project keeps them, and drops a malformed one', () => {
    const { pb, base, fast } = family();
    setInheritedDefault(fast.cls, base.cls.variables[0], 160);
    const raw = JSON.parse(JSON.stringify(pb.project));
    raw.classes.find((c: { name: string }) => c.name === 'BP_Eclaireur').inheritedDefaults.broken = 3;
    validateProject(raw);
    const got = (raw as typeof pb.project).classes.find((c) => c.name === 'BP_Eclaireur')!;
    expect(Object.keys(got.inheritedDefaults ?? {})).toEqual([base.cls.variables[0].id]);
  });
});
