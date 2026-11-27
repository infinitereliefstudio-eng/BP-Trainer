/** Scale comme dans UE (S1, V7.83) : Relative Scale 3D des composants, Scale des acteurs posés, nœuds. */
import { describe, expect, it } from 'vitest';
import { type ClassBuilder, ProjectBuilder } from '../src/core/lessons/builder';
import { levelOf } from '../src/core/model/project';
import { actorScale, setActorScale } from '../src/core/operations/levelOps';
import { componentInActor } from '../src/core/operations/viewportOps';
import { componentShape } from '../src/core/runtime/physics';
import { Simulation } from '../src/core/runtime/simulation';
import { componentTransform } from '../src/core/runtime/world';

function world(setup: (b: ClassBuilder) => void) {
  const pb = new ProjectBuilder('t');
  const b = pb.blueprint('BP_Test');
  setup(b);
  pb.place(b, 0, 0);
  pb.playerStart(2000, 0);
  return { b, p: pb.project };
}

function run(p: ProjectBuilder['project']) {
  const s = new Simulation(p);
  s.start();
  for (let i = 0; i < 6; i++) s.step();
  return s;
}

const comp = (s: Simulation, name: string) => s.actors[0].components.find((c) => c.name === name)!;

describe('Scale (V7.83)', () => {
  it('a parent’s scale stretches its children: their Location and their size', () => {
    const { b, p } = world((b) => {
      const socle = b.component('StaticMesh', 'Socle', { sizeX: 100, sizeY: 100, scaleX: 2, scaleY: 2 });
      const zone = b.component('BoxCollision', 'Zone', { x: 50, y: 0, sizeX: 40, sizeY: 40 });
      // Zone under Socle (Attach Parent).
      b.cls.components.find((c) => c.id === zone)!.parent = socle;
    });
    const s = run(p);
    const a = s.actors[0];
    const t = componentTransform(a, comp(s, 'Zone'));
    expect([t.x, t.y, t.sx, t.sy, t.sz]).toEqual([100, 0, 2, 2, 1]);
    const zone = componentShape(a, comp(s, 'Zone'));
    expect(zone?.kind === 'obb' && [zone.hx, zone.hy]).toEqual([40, 40]);
    const socle = componentShape(a, comp(s, 'Socle'));
    expect(socle?.kind === 'obb' && socle.hx).toBe(100);
    // The Blueprint's Viewport sees the same.
    const inActor = componentInActor(b.cls.components, b.cls.components.find((c) => c.name === 'Zone')!.id);
    expect([inActor.x, inActor.sx]).toEqual([100, 2]);
  });

  it('Set Actor Scale 3D scales the root; Set Relative Scale 3D a component; Get World Scale multiplies them', () => {
    const { p } = world((b) => {
      b.component('StaticMesh', 'Socle', { sizeX: 100, sizeY: 100 });
      b.component('BoxCollision', 'Zone', { sizeX: 40, sizeY: 40 });
      const begin = b.node('event.beginPlay');
      const scale = b.node('actor.setScale3D', {}, { scale: { x: 2, y: 2, z: 1 } });
      const rel = b.node('component.setRelativeScale3D', {}, { scale: { x: 1.5, y: 1, z: 1 } });
      b.link(begin, 'then', scale, 'exec').link(scale, 'then', rel, 'exec').target('Zone', rel);
    });
    const s = run(p);
    // The class's root is its DefaultSceneRoot: the actor's Scale is its.
    expect([comp(s, 'DefaultSceneRoot').props.scaleX, comp(s, 'DefaultSceneRoot').props.scaleY]).toEqual([2, 2]);
    const t = componentTransform(s.actors[0], comp(s, 'Zone'));
    expect([t.sx, t.sy]).toEqual([3, 2]);
  });

  it('a placed actor’s Scale is its root’s, for this actor only; equal to the Blueprint’s, it is not written', () => {
    const { b, p } = world((b) => {
      b.component('StaticMesh', 'Socle', { sizeX: 100, sizeY: 100 });
    });
    const la = levelOf(p).actors[0];
    setActorScale(p, la.id, { x: 3, y: 1, z: 1 });
    expect(actorScale(p, la)).toEqual({ x: 3, y: 1, z: 1 });
    expect(['scaleX' in la, 'scaleY' in la]).toEqual([true, false]);
    const s = run(p);
    expect(comp(s, 'DefaultSceneRoot').props.scaleX).toBe(3);
    const sh = componentShape(s.actors[0], comp(s, 'Socle'));
    expect(sh?.kind === 'obb' && sh.hx).toBe(150);
    // The Blueprint itself is not changed.
    expect(b.cls.components.every((c) => c.props.scaleX === undefined)).toBe(true);
    setActorScale(p, la.id, { x: 1, y: 1, z: 1 });
    expect('scaleX' in la).toBe(false);
  });
});
