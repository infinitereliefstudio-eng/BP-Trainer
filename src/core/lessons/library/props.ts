/**
 * The station's props, shared by several lessons: the player, a key, a door,
 * a generator and a lamp. Each builder adds the class (components, variables,
 * and optionally its finished logic) to a project being built.
 */
import { setPlayerClass } from '../../operations/projectOps';
import { T } from '../../types/pins';
import type { ClassBuilder, ProjectBuilder } from '../builder';

/** BP_Joueur: the player's Pawn, with an optional bHasKey variable. */
export function playerBlueprint(pb: ProjectBuilder, withKey = false): { b: ClassBuilder; hasKey?: string } {
  const b = pb.blueprint('BP_Joueur', 'Pawn');
  setPlayerClass(pb.project, b.cls.id);
  const hasKey = withKey ? b.variable('bHasKey', T.bool, false) : undefined;
  return { b, hasKey };
}

/** BP_Cle: a small key with a pick-up zone. `logic` adds the lesson 6 solution. */
export function keyBlueprint(pb: ProjectBuilder, logic: boolean, playerCls?: ClassBuilder, hasKey?: string): ClassBuilder {
  const b = pb.blueprint('BP_Cle');
  b.component('StaticMesh', 'Cle', { shape: 'cylinder', sizeX: 26, sizeY: 26, color: '#f5c542', blocks: false });
  b.component('BoxCollision', 'Zone', { sizeX: 90, sizeY: 90 });
  if (logic && playerCls && hasKey) solveKey(b, playerCls, hasKey);
  return b;
}

/** Overlap → Cast To BP_Joueur → Set bHasKey → Destroy Actor. */
export function solveKey(b: ClassBuilder, playerCls: ClassBuilder, hasKey: string): void {
  const e = b.node('event.actorBeginOverlap', {}, {}, [64, 96]);
  const cast = b.node('cast.to', { class: playerCls.cls.id }, {}, [360, 96]);
  const set = b.node('var.setExternal', { owner: playerCls.cls.id, variable: hasKey }, { value: true }, [680, 96]);
  const kill = b.node('actor.destroy', {}, {}, [1000, 96]);
  b.link(e, 'then', cast, 'exec').link(e, 'other', cast, 'object');
  b.link(cast, 'then', set, 'exec').link(cast, 'as', set, 'target').link(set, 'then', kill, 'exec');
}

/**
 * BP_Porte placed in a doorway at x = 0 (y from -100 to 100), between two
 * walls. The door pivots on its hinge at y = -100.
 */
export function doorBlueprint(pb: ProjectBuilder, zone = { x: 100, sizeX: 300 }): ClassBuilder {
  const door = pb.blueprint('BP_Porte');
  door.component('StaticMesh', 'Porte', { shape: 'door', sizeX: 200, sizeY: 16, color: '#a0703c' });
  door.component('BoxCollision', 'Zone', { x: zone.x, y: 0, sizeX: zone.sizeX, sizeY: 360 });
  const wall = pb.blueprint('BP_Mur');
  wall.component('StaticMesh', 'Mur', { sizeX: 40, sizeY: 600, color: '#4b5563' });
  pb.place(door, 0, -100, 90);
  pb.place(wall, 0, -400);
  pb.place(wall, 0, 400);
  return door;
}

/**
 * BP_Generateur with its bEnMarche variable. With `logic`, E toggles it and
 * prints the new state (Auto Receive Input on). `zone` adds an interaction zone.
 */
export function generatorBlueprint(pb: ProjectBuilder, opts: { logic?: boolean; zone?: boolean } = {}): { b: ClassBuilder; running: string; set?: string } {
  const b = pb.blueprint('BP_Generateur');
  b.component('StaticMesh', 'Moteur', { sizeX: 120, sizeY: 80, color: '#3f6212' });
  b.component('TextRender', 'Etiquette', { y: -70, text: 'Générateur' });
  if (opts.zone) b.component('BoxCollision', 'Zone', { sizeX: 240, sizeY: 200 });
  const running = b.variable('bEnMarche', T.bool, false);
  if (opts.logic === false) return { b, running };
  b.cls.autoReceiveInput = true;
  const key = b.node('event.inputKey', { key: 'E' }, {}, [64, 96]);
  const get = b.node('var.get', { variable: running }, {}, [120, 300]);
  const not = b.node('logic.not', {}, {}, [300, 300]);
  const set = b.node('var.set', { variable: running }, {}, [420, 96]);
  const say = b.node('debug.printString', {}, {}, [760, 96]);
  b.link(key, 'pressed', set, 'exec').link(get, 'value', not, 'a').link(not, 'result', set, 'value');
  b.link(set, 'then', say, 'exec').link(set, 'out', say, 'text');
  return { b, running, set };
}

/** BP_Lampe: a pole and a light that starts off. */
export function lampBlueprint(pb: ProjectBuilder, zone = false): ClassBuilder {
  const b = pb.blueprint('BP_Lampe');
  b.component('StaticMesh', 'Pied', { shape: 'cylinder', sizeX: 40, sizeY: 40, color: '#6b7280' });
  b.component('PointLight', 'Lumiere', { visible: false, radius: 300 });
  if (zone) b.component('BoxCollision', 'Zone', { sizeX: 200, sizeY: 200 });
  return b;
}

/** An instance-editable reference variable, set on some placed instances. */
export function referenceVariable(pb: ProjectBuilder, b: ClassBuilder, name: string, target: ClassBuilder, links: [string, string | null][]): string {
  const v = b.variable(name, T.object(target.cls.name));
  b.cls.variables.find((x) => x.id === v)!.instanceEditable = true;
  for (const [from, to] of links) {
    const a = pb.project.level.actors.find((x) => x.id === from)!;
    a.overrides[v] = to ? `actor:${to}` : null;
  }
  return v;
}
