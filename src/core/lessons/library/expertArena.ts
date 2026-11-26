/**
 * Expert project X3 « L'arène de maintenance » (V7.67, chantier n° 5,
 * docs/PLAN_EXPERT_FINAL.md, project C). Defective drones come in waves from
 * four portals toward the station's core; the player, at the core, aims and
 * shoots them down with a Line Trace.
 *
 * Three milestones (the plan said two; at ≈ 115 nodes, two would each take
 * well over an hour on a phone):
 * 1. Les drones: a health Actor Component, a parent drone and two children
 *    that differ only by their Class Defaults, the shot.
 * 2. Les vagues: the GameMode reads the waves from a Data Table, spawns the
 *    drones at a portal drawn from a Random Stream, chains the waves.
 * 3. La partie: the core takes the hits, points, the end screen (UI Only,
 *    pause) and the record kept in a Save Game.
 *
 * Vérifier replays the milestones in order on the same project, so each
 * scenario still holds once the next milestones are written: drones placed
 * for milestone 1 are gone in 2, the checks of 1 read whatever drones are in
 * play. Tested at 30 frames per second.
 */
import { levelOf, type BlueprintClass, type Project } from '../../model/project';
import { inheritedView } from '../../model/inheritance';
import { setInheritedDefault } from '../../operations/classOps';
import { addDataTable, addDataTableRow } from '../../operations/dataTableOps';
import { disconnectPin } from '../../operations/graphOps';
import { placeActor, removeActor } from '../../operations/levelOps';
import { setParentClass } from '../../operations/projectOps';
import type { ActorRT } from '../../runtime/world';
import { T } from '../../types/pins';
import { ProjectBuilder, edit, type ClassBuilder } from '../builder';
import { countPrints, noRuntimeErrors, normText, notion, usesNode } from '../checks';
import { withMilestones } from '../milestones';
import type { CheckContext, Lesson, ScenarioStep } from '../types';
import { ensurePlayerInput } from '../ue5Input';
import { EXPERT_RULES } from './expertKit';
import { REDO_ARENA } from './expertUe5';
import { writeHealth } from './health';
import { fnDef, tap } from './kit';
import { playerBlueprint } from './props';
import { makeStruct } from './tables';
import { addW, modeLabel, newClass } from './umgKit';

const PORTALS: [number, number][] = [
  [0, -500],
  [500, 0],
  [0, 500],
  [-500, 0],
];
const DRONES = ['BP_Drone', 'BP_Eclaireur', 'BP_Blinde'];
const SCOUT = { speed: 160, life: 1, points: 10 };
const HEAVY = { speed: 60, life: 3, points: 30 };
const SLOT = 'Arene';
const HIT = 'Le cœur est touché';
const SAFE = 'L’arène est sauve';

function project(): Project {
  const pb = new ProjectBuilder('L’arène de maintenance');
  playerBlueprint(pb);
  const p = pb.project;
  const wall = pb.blueprint('BP_Decor');
  wall.component('StaticMesh', 'Mur', { sizeX: 40, sizeY: 1300, color: '#374151' });
  pb.place(wall, -760, 0);
  pb.place(wall, 760, 0);
  const core = pb.blueprint('BP_Coeur');
  core.component('StaticMesh', 'Noyau', { shape: 'cylinder', sizeX: 150, sizeY: 150, color: '#f59e0b', blocks: false });
  core.component('BoxCollision', 'Zone', { sizeX: 240, sizeY: 240 });
  pb.place(core, 0, 0);
  const portal = pb.blueprint('BP_Portail');
  portal.component('StaticMesh', 'Anneau', { shape: 'cylinder', sizeX: 120, sizeY: 120, color: '#334155', blocks: false });
  for (const at of PORTALS) pb.place(portal, ...at);
  // The designer's data: the waves. The drone classes are the learner's: Sorte starts at None.
  const ids = makeStruct(p, 'S_Vague', [
    ['Nombre', T.int],
    ['Sorte', T.class('Actor')],
    ['Intervalle', T.float],
  ]);
  waveTable(p, ids);
  ensurePlayerInput(p, ['E'], { E: 'IA_Tirer' });
  pb.playerStart(0, 0);
  return p;
}

/** DT_Vagues: V1 two drones every 0.5 s, V2 three every 0.8 s; Sorte left at None. */
function waveTable(p: Project, ids: Record<string, string>): void {
  const r = addDataTable(p, 'S_Vague', 'DT_Vagues');
  if (!r.ok) throw new Error(r.reason);
  for (const [row, n, every] of [
    ['V1', 2, 0.5],
    ['V2', 3, 0.8],
  ] as const) {
    addDataTableRow(p, r.value.id, row, { [ids.Nombre]: n, [ids.Sorte]: '', [ids.Intervalle]: every });
  }
}

// ------------------------------------------------------------------ reading

const isDrone = (cx: CheckContext, a: ActorRT) => DRONES.includes(a.className) || lineageOf(cx.project, a.className).includes('BP_Drone');
/** The class names of `name` and its parents. */
function lineageOf(p: Project, name: string): string[] {
  const out: string[] = [];
  let c = p.classes.find((x) => x.name === name);
  while (c && out.length < 8) {
    out.push(c.name);
    c = c.parentClassId ? p.classes.find((x) => x.id === c!.parentClassId) : undefined;
  }
  return out;
}
/** Every drone of this game: those in play, and those spawned then destroyed. */
const drones = (cx: CheckContext) => [...new Set([...cx.sim.actors, ...cx.sim.record.spawns])].filter((a) => !a.isPlayer && isDrone(cx, a));
const alive = (cx: CheckContext) => drones(cx).filter((a) => !a.destroyed);
const spawned = (cx: CheckContext, cls: string) => cx.sim.record.spawns.filter((a) => a.className === cls);
const dist = (a: { x: number; y: number }) => Math.hypot(a.x, a.y);
const onAxis = (a: { x: number; y: number }) => Math.abs(a.x) < 4 || Math.abs(a.y) < 4;

/** A variable of an actor, by name (its class and parents). */
function varOf(cx: CheckContext, a: ActorRT, name: string): unknown {
  const cls = cx.sim.classOf(a);
  const v = cls?.variables.find((x) => x.name === name);
  return v ? a.vars[v.id] : undefined;
}

/** The Vie of an actor's health component (the first Actor Component with a variable Vie). */
function lifeOf(cx: CheckContext, a: ActorRT): number | undefined {
  for (const o of cx.sim.componentsOf(a)) {
    const v = cx.sim.classOf(o)?.variables.find((x) => x.name === 'Vie');
    if (v) return Number(o.vars[v.id]);
  }
  return undefined;
}

/** A Class Default of `cls`, inherited ones included (with the child's own value). */
function classDefault(p: Project, cls: string, name: string): unknown {
  const c = p.classes.find((x) => x.name === cls);
  return c ? inheritedView(c, p, true).variables.find((v) => v.name === name)?.defaultValue : undefined;
}

/** When a message was first printed in the game playing now (seconds), or undefined. */
function printedAt(cx: CheckContext, text: string): number | undefined {
  return cx.sim.log.find((l) => l.message !== undefined && normText(l.message).includes(normText(text)))?.time;
}

/** The positions of the drones at checkpoint c1, by world (a run, or a game of it). */
const seenAt = new WeakMap<object, Map<string, { x: number; y: number }>>();

// ------------------------------------------------------------- milestone 1

function solveDrones(p: Project): void {
  const health = writeHealth(newClass(p, 'BP_Sante', 'ActorComponent'), p, 1);
  const d = newClass(p, 'BP_Drone', 'Actor');
  d.component('StaticMesh', 'Corps', { shape: 'cylinder', sizeX: 60, sizeY: 60, color: '#64748b' });
  const sante = d.logic(health.b, 'Sante');
  const speed = d.variable('Vitesse', T.float, 100);
  const pv = d.variable('PV', T.int, 1);
  const dir = d.variable('Direction', T.vector, { x: 0, y: 0, z: 0 });
  // BeginPlay: the component starts with this drone's PV; the way to the core, once.
  const begin = d.node('event.beginPlay', {}, {}, [64, 96]);
  const setLife = d.node('var.setExternal', { owner: health.b.cls.id, variable: health.vie }, {}, [340, 96]);
  d.link(begin, 'then', setLife, 'exec').link(d.node('var.get', { variable: pv }, {}, [200, 300]), 'value', setLife, 'value').target('Sante', setLife);
  const core = d.node('actor.getOfClass', {}, { class: p.classes.find((c) => c.name === 'BP_Coeur')!.id }, [640, 96]);
  const there = d.node('actor.getLocation', {}, {}, [900, 300]);
  const here = d.node('actor.getLocation', {}, {}, [900, 420]);
  const toward = d.node('math.subtractVector', {}, {}, [1100, 320]);
  const unit = d.node('math.normalizeVector', {}, {}, [1300, 320]);
  const keep = d.node('var.set', { variable: dir }, {}, [1200, 96]);
  d.link(setLife, 'then', core, 'exec').link(core, 'then', keep, 'exec').link(core, 'result', there, 'target');
  d.link(there, 'result', toward, 'a').link(here, 'result', toward, 'b').link(toward, 'result', unit, 'a').link(unit, 'result', keep, 'value');
  // Tick: Direction × Vitesse × Delta Seconds.
  const tick = d.node('event.tick', {}, {}, [64, 600]);
  const step = d.node('math.multiplyFloat', {}, {}, [340, 800]);
  const move = d.node('math.multiplyVectorFloat', {}, {}, [560, 760]);
  const go = d.node('actor.addOffset', {}, {}, [760, 600]);
  d.link(tick, 'then', go, 'exec').link(d.node('var.get', { variable: speed }, {}, [160, 820]), 'value', step, 'a').link(tick, 'delta', step, 'b');
  d.link(d.node('var.get', { variable: dir }, {}, [360, 700]), 'value', move, 'a').link(step, 'result', move, 'b').link(move, 'result', go, 'delta');
  // Its health says it is at 0: gone.
  const dead = d.node('event.componentDispatcher', { component: sante, dispatcher: health.mort }, {}, [64, 1000]);
  d.link(dead, 'then', d.node('actor.destroy', {}, {}, [400, 1000]), 'exec');

  // The two drones: children that differ only by their Class Defaults (and a mark to tell them apart).
  for (const [name, stats, color, size] of [
    ['BP_Eclaireur', SCOUT, '#facc15', 30],
    ['BP_Blinde', HEAVY, '#dc2626', 50],
  ] as const) {
    const c = newClass(p, name, 'Actor');
    const ok = setParentClass(p, c.cls.id, d.cls.id);
    if (!ok.ok) throw new Error(ok.reason);
    c.component('StaticMesh', 'Marque', { shape: 'cylinder', sizeX: size, sizeY: size, color, blocks: false });
    setInheritedDefault(c.cls, d.cls.variables.find((v) => v.id === speed)!, stats.speed);
    setInheritedDefault(c.cls, d.cls.variables.find((v) => v.id === pv)!, stats.life);
  }

  // The player shoots: whatever has a health component in front of it loses one point.
  const pl = edit(p, 'BP_Joueur');
  const fire = pl.node('input.action', { action: p.inputActions.find((a) => a.name === 'IA_Tirer')!.id }, {}, [64, 96]);
  const from = pl.node('actor.getLocation', {}, {}, [200, 320]);
  const ahead = pl.node('actor.getForward', {}, {}, [200, 440]);
  const reach = pl.node('math.multiplyVectorFloat', {}, { b: 1000 }, [400, 440]);
  const end = pl.node('math.addVector', {}, {}, [600, 380]);
  const trace = pl.node('trace.lineByChannel', {}, {}, [760, 96]);
  const touched = pl.node('flow.branch', {}, {}, [1060, 96]);
  const comp = pl.node('actor.getComponentByClass', {}, { componentClass: health.b.cls.id }, [1260, 300]);
  const valid = pl.node('util.isValid', {}, {}, [1460, 300]);
  const br = pl.node('flow.branch', {}, {}, [1500, 96]);
  const hit = pl.node('call.function', { owner: health.b.cls.id, graph: health.hit.graph.id }, { [health.hit.pin.Montant]: 1 }, [1800, 96]);
  pl.link(fire, 'started', trace, 'exec').link(from, 'result', trace, 'start').link(from, 'result', end, 'a').link(ahead, 'result', reach, 'a').link(reach, 'result', end, 'b').link(end, 'result', trace, 'end');
  // Nothing hit: nothing to ask (Get Component by Class on None is an Accessed None).
  pl.link(trace, 'then', touched, 'exec').link(trace, 'result', touched, 'condition').link(touched, 'true', br, 'exec');
  pl.link(trace, 'hitActor', comp, 'target').link(comp, 'result', valid, 'object').link(valid, 'result', br, 'condition');
  pl.link(br, 'true', hit, 'exec').link(comp, 'result', hit, 'target');

  // For the test: a scout on the east portal, a heavy one on the south portal.
  for (const [name, at] of [
    ['BP_Eclaireur', PORTALS[1]],
    ['BP_Blinde', PORTALS[2]],
  ] as const) {
    const a = placeActor(p, p.classes.find((c) => c.name === name)!.id, ...at);
    if (!a.ok) throw new Error(a.reason);
  }
}

/** One turn of fire: north, east, south, west, one shot each. */
const volley = (): ScenarioStep[] => [-90, 0, 90, 180].flatMap((look) => [{ look }, ...tap('E'), { wait: 0.15 }]);
const volleys = (n: number): ScenarioStep[] => Array.from({ length: n }, volley).flat();

/** Milestone 1, replayed as is once the waves exist: at 0.8 s and 1.2 s the drones move, then six volleys. */
const DRONE_SCENARIO: ScenarioStep[] = [{ fps: 30 }, { wait: 0.8 }, { checkpoint: 'c1' }, { wait: 0.4 }, { checkpoint: 'c2' }, ...volley(), { checkpoint: 'un-tir' }, ...volleys(5), { checkpoint: 'abattus' }];

const droneChecks = [
  {
    id: 'family',
    label: 'BP_Eclaireur et BP_Blinde héritent de BP_Drone, qui porte BP_Sante',
    test: (cx: CheckContext) => {
      const p = cx.project;
      const base = p.classes.find((c) => c.name === 'BP_Drone');
      if (!base) return 'Crée le Blueprint parent BP_Drone.';
      for (const name of ['BP_Eclaireur', 'BP_Blinde']) {
        const c = p.classes.find((x) => x.name === name);
        if (!c) return `Crée ${name}, enfant de BP_Drone.`;
        if (c.parentClassId !== base.id) return `${name} n’hérite pas de BP_Drone (Class Settings › Parent Class).`;
      }
      const health = p.classes.find((c) => c.name === 'BP_Sante');
      if (!health || health.parent !== 'ActorComponent') return 'La santé est un Actor Component, BP_Sante (+ Add › Blueprint Class › Actor Component), avec sa variable Vie.';
      if (!inheritedView(base, p).components.some((k) => k.kind === 'ActorComponent' && k.classId === health.id)) return 'Ajoute BP_Sante aux Components de BP_Drone : ses enfants l’ont alors aussi.';
      return true;
    },
  },
  {
    id: 'defaults',
    label: 'Les deux drones ne diffèrent que par leurs Class Defaults : Vitesse et PV',
    test: (cx: CheckContext) => {
      const p = cx.project;
      const base = p.classes.find((c) => c.name === 'BP_Drone');
      const has = (n: string, cat: string) => base?.variables.some((v) => v.name === n && v.type.category === cat);
      if (!has('Vitesse', 'float') || !has('PV', 'int')) return 'BP_Drone a deux variables : Vitesse (Float, en cm/s) et PV (Integer, les points de vie de départ).';
      for (const [name, s] of [
        ['BP_Eclaireur', SCOUT],
        ['BP_Blinde', HEAVY],
      ] as const) {
        const speed = Number(classDefault(p, name, 'Vitesse'));
        const life = Number(classDefault(p, name, 'PV'));
        if (speed !== s.speed || life !== s.life) return `${name} a Vitesse ${speed} et PV ${life} : on attend ${s.speed} et ${s.life}, réglés dans ses Class Defaults (rubrique Hérité).`;
      }
      return true;
    },
  },
  {
    id: 'move-a',
    label: 'Des drones sont en jeu, sur les axes des portails',
    at: 'c1',
    test: (cx: CheckContext) => {
      const now = alive(cx);
      if (!now.length) return 'Aucun drone en jeu à 0,8 s. Pour l’essai, pose un BP_Eclaireur sur le portail Est et un BP_Blinde sur le portail Sud.';
      seenAt.set(cx.sim, new Map(now.map((a) => [a.id, { x: a.x, y: a.y }])));
      const off = now.find((a) => !onAxis(a));
      return off ? `${off.label} est en (${Math.round(off.x)}, ${Math.round(off.y)}) : un drone part d’un portail, sur l’axe qui mène au cœur.` : true;
    },
  },
  {
    id: 'move',
    label: 'Chaque drone avance droit vers le cœur, à sa Vitesse',
    at: 'c2',
    test: (cx: CheckContext) => {
      const before = seenAt.get(cx.sim);
      const both = alive(cx).filter((a) => before?.has(a.id));
      if (!both.length) return 'Les drones vus à 0,8 s ont disparu sans qu’on tire.';
      for (const a of both) {
        const was = before!.get(a.id)!;
        const speed = Number(varOf(cx, a, 'Vitesse'));
        const went = dist(was) - dist(a);
        if (!onAxis(a)) return `${a.label} quitte son axe : il doit aller droit vers le cœur (Direction = vers le cœur, normalisée).`;
        if (Math.abs(went - speed * 0.4) > 10)
          return `${a.label} s’est rapproché de ${Math.round(went)} cm en 0,4 s ; à Vitesse ${speed}, on attend ${Math.round(speed * 0.4)} (le test tourne à 30 images par seconde : Delta Seconds).`;
      }
      return true;
    },
  },
  {
    id: 'hit',
    label: 'Un tir enlève un point de vie, et un seul',
    at: 'un-tir',
    test: (cx: CheckContext) => {
      const now = alive(cx).map((a) => ({ a, life: lifeOf(cx, a), pv: Number(varOf(cx, a, 'PV')) }));
      const under = now.find((x) => x.life !== undefined && x.life < x.pv - 1);
      if (under) return `${under.a.label} a perdu ${under.pv - (under.life ?? 0)} points de vie en un seul tour de tirs : un tir (Started) en enlève un.`;
      if (!now.some((x) => x.life === x.pv - 1)) return 'Un tour de tirs (nord, est, sud, ouest) et aucun drone touché n’a perdu un point de vie : le tir part-il du joueur, vers l’avant (Get Actor Forward Vector), assez loin ?';
      return true;
    },
  },
  {
    id: 'down',
    label: 'À 0 point de vie, le drone disparaît : tous ceux en jeu sont abattus',
    at: 'abattus',
    test: (cx: CheckContext) => {
      const placed = levelOf(cx.project).actors.some((a) => DRONES.includes(cx.project.classes.find((c) => c.id === a.classId)?.name ?? ''));
      if (placed && cx.sim.record.spawns.some((a) => isDrone(cx, a)))
        return 'Les drones posés pour l’essai sont encore dans le niveau alors que les vagues arrivent : retire-les (jalon 2), c’est la partie qui amène les drones.';
      if (countPrints(cx, HIT)) return 'Un drone a atteint le cœur pendant qu’on tirait : le tir doit l’arrêter avant.';
      const left = drones(cx).filter((a) => !a.destroyed && (a.spawnedAt ?? 0) <= 1.2);
      return left.length ? `${left.map((a) => `${a.label} (${lifeOf(cx, a)} PV)`).join(', ')} encore en jeu après six tours de tirs : à 0, la santé prévient (OnMort) et le drone se détruit.` : true;
    },
  },
  {
    id: 'shooter',
    label: 'Seul le joueur réagit à IA_Tirer',
    test: (cx: CheckContext) => {
      const own = cx.project.classes.filter((c) => c.name !== 'BP_Joueur' && cx.nodes(c.name).some((n) => n.def === 'input.action'));
      return own.length ? `${own.map((c) => c.name).join(', ')} réagi(ssen)t à une Input Action : le tir est au joueur ; un drone ne sait que perdre de la vie.` : true;
    },
  },
  notion(
    usesNode(
      'any-health',
      'BP_Joueur',
      ['actor.getComponentByClass'],
      'Le tir cherche la santé de ce qu’il touche',
      'Le tir peut chercher BP_Sante sur ce qu’il touche (Get Component by Class) plutôt que d’attendre un drone : tout ce qui a une santé pourra être abattu.',
    ),
  ),
  noRuntimeErrors(),
];

// ------------------------------------------------------------- milestone 2

/** The GameMode's variables of the waves. */
function waves(gm: ClassBuilder, p: Project) {
  const v = (name: string) => gm.cls.variables.find((x) => x.name === name)!.id;
  return { v, table: p.dataTables.find((t) => t.name === 'DT_Vagues')!.id };
}

function solveWaves(p: Project): void {
  // The test drones go: the game brings them now.
  for (const a of [...levelOf(p).actors]) {
    const name = p.classes.find((c) => c.id === a.classId)?.name;
    if (name && DRONES.includes(name)) removeActor(p, a.id);
  }
  // The designer's table, filled with the learner's drones.
  const s = p.structs.find((x) => x.name === 'S_Vague')!;
  const sorte = s.members.find((m) => m.name === 'Sorte')!.id;
  const dt = p.dataTables.find((t) => t.name === 'DT_Vagues')!;
  dt.rows.find((r) => r.name === 'V1')!.value[sorte] = p.classes.find((c) => c.name === 'BP_Blinde')!.id;
  dt.rows.find((r) => r.name === 'V2')!.value[sorte] = p.classes.find((c) => c.name === 'BP_Eclaireur')!.id;

  const gm = edit(p, 'BP_GameMode');
  gm.variable('Flux', T.struct('RandomStream'), { initial: 7, seed: 7 });
  gm.variable('Vague', T.int, 0);
  gm.variable('AFaire', T.int, 0);
  gm.variable('Restants', T.int, 0);
  gm.variable('Sorte', T.class('Actor'));
  gm.variable('Minuteur', T.struct('TimerHandle'));
  const { v, table } = waves(gm, p);
  const get = (name: string, at: [number, number]) => gm.node('var.get', { variable: v(name) }, {}, at);
  const names = (at: [number, number]) => gm.node('dataTable.getRowNames', { table }, {}, at);

  // BeginPlay: the first wave.
  const begin = gm.node('event.beginPlay', {}, {}, [64, 96]);
  const first = gm.node('call.custom', { owner: gm.cls.id, event: 'LancerVague' }, {}, [400, 96]);
  gm.link(begin, 'then', first, 'exec');

  // LancerVague: the row of the wave, then a drone every Intervalle.
  const launch = gm.node('event.custom', { name: 'LancerVague' }, {}, [64, 400]);
  const rowName = gm.node('array.get', {}, {}, [300, 640]);
  const row = gm.node('dataTable.getRow', { table }, {}, [400, 400]);
  const brk = gm.node('struct.break', { struct: 'S_Vague' }, {}, [700, 640]);
  const m = (n: string) => s.members.find((x) => x.name === n)!.id;
  const setTodo = gm.node('var.set', { variable: v('AFaire') }, {}, [740, 400]);
  const setLeft = gm.node('var.set', { variable: v('Restants') }, {}, [1000, 400]);
  const setKind = gm.node('var.set', { variable: v('Sorte') }, {}, [1260, 400]);
  const timer = gm.node('time.setTimerByEvent', {}, { looping: true }, [1840, 400]);
  const keep = gm.node('var.set', { variable: v('Minuteur') }, {}, [2160, 400]);
  const spawnEvent = gm.node('event.custom', { name: 'NouveauDrone' }, {}, [64, 1000]);
  gm.link(names([100, 640]), 'names', rowName, 'array').link(get('Vague', [100, 720]), 'value', rowName, 'index').link(rowName, 'item', row, 'rowName');
  gm.link(launch, 'then', row, 'exec').link(row, 'found', setTodo, 'exec').link(row, 'row', brk, 'struct');
  gm.link(brk, m('Nombre'), setTodo, 'value').link(setTodo, 'then', setLeft, 'exec').link(brk, m('Nombre'), setLeft, 'value');
  gm.link(setLeft, 'then', setKind, 'exec').link(brk, m('Sorte'), setKind, 'value');
  gm.link(setKind, 'then', timer, 'exec').link(spawnEvent, 'delegate', timer, 'event').link(brk, m('Intervalle'), timer, 'time').link(timer, 'then', keep, 'exec').link(timer, 'handle', keep, 'value');

  // NouveauDrone: at a portal drawn from the stream, the wave's drone.
  const portals = gm.node('actor.getAllOfClass', {}, { class: p.classes.find((c) => c.name === 'BP_Portail')!.id }, [300, 1000]);
  const last = gm.node('array.lastIndex', {}, {}, [560, 1240]);
  const pick = gm.node('random.intInRangeFromStream', {}, { min: 0 }, [760, 1240]);
  const portal = gm.node('array.get', {}, {}, [960, 1200]);
  const where = gm.node('actor.getLocation', {}, {}, [1140, 1200]);
  const spawn = gm.node('actor.spawn', {}, {}, [1260, 1000]);
  const less = gm.node('var.decrementInt', {}, {}, [1600, 1000]);
  const none = gm.node('math.lessEqualInt', {}, { b: 0 }, [1800, 1200]);
  const done = gm.node('flow.branch', {}, {}, [1900, 1000]);
  const stop = gm.node('time.clearTimer', {}, {}, [2200, 1000]);
  gm.link(spawnEvent, 'then', portals, 'exec').link(portals, 'then', spawn, 'exec');
  gm.link(portals, 'actors', last, 'array').link(last, 'result', pick, 'max').link(get('Flux', [560, 1360]), 'value', pick, 'stream');
  gm.link(portals, 'actors', portal, 'array').link(pick, 'result', portal, 'index').link(portal, 'item', where, 'target').link(where, 'result', spawn, 'location');
  gm.link(get('Sorte', [1100, 1100]), 'value', spawn, 'class').link(spawn, 'then', less, 'exec').link(get('AFaire', [1440, 1200]), 'value', less, 'value');
  gm.link(less, 'then', done, 'exec').link(less, 'result', none, 'a').link(none, 'result', done, 'condition').link(done, 'true', stop, 'exec').link(get('Minuteur', [2040, 1200]), 'value', stop, 'handle');

  // DroneParti: a drone is gone; the last of its wave opens the next one, 2 s later.
  const gone = gm.node('event.custom', { name: 'DroneParti' }, {}, [64, 1600]);
  const dec = gm.node('var.decrementInt', {}, {}, [300, 1600]);
  const empty = gm.node('math.lessEqualInt', {}, { b: 0 }, [460, 1800]);
  const over = gm.node('flow.branch', {}, {}, [600, 1600]);
  const next = gm.node('var.incrementInt', {}, {}, [880, 1600]);
  const count = gm.node('array.length', {}, {}, [1000, 1840]);
  const more = gm.node('math.lessInt', {}, {}, [1160, 1800]);
  const again = gm.node('flow.branch', {}, {}, [1200, 1600]);
  const pause = gm.node('time.delay', {}, { duration: 2 }, [1500, 1520]);
  const relaunch = gm.node('call.custom', { owner: gm.cls.id, event: 'LancerVague' }, {}, [1780, 1520]);
  const safe = gm.node('debug.printString', {}, { text: SAFE }, [1500, 1720]);
  gm.link(gone, 'then', dec, 'exec').link(get('Restants', [140, 1800]), 'value', dec, 'value').link(dec, 'then', over, 'exec').link(dec, 'result', empty, 'a').link(empty, 'result', over, 'condition');
  gm.link(over, 'true', next, 'exec').link(get('Vague', [720, 1800]), 'value', next, 'value').link(next, 'then', again, 'exec');
  gm.link(next, 'result', more, 'a').link(names([820, 1900]), 'names', count, 'array').link(count, 'result', more, 'b').link(more, 'result', again, 'condition');
  gm.link(again, 'true', pause, 'exec').link(pause, 'completed', relaunch, 'exec').link(again, 'false', safe, 'exec');

  // The drone tells the GameMode when it goes, whatever the reason.
  const d = edit(p, 'BP_Drone');
  const bye = d.node('event.destroyed', {}, {}, [64, 1300]);
  const mode = d.node('game.getGameMode', {}, {}, [200, 1500]);
  const cast = d.node('cast.to', { class: gm.cls.id }, {}, [400, 1300]);
  const tell = d.node('call.custom', { owner: gm.cls.id, event: 'DroneParti' }, {}, [760, 1300]);
  d.link(bye, 'then', cast, 'exec').link(mode, 'result', cast, 'object').link(cast, 'then', tell, 'exec').link(cast, 'as', tell, 'target');
}

/** Milestone 2: shoot all the time; the waves come and go. */
const WAVES_SCENARIO: ScenarioStep[] = [...DRONE_SCENARIO, ...volleys(10), { wait: 0.5 }, { checkpoint: 'fin-1' }];

const classIdOf = (p: Project, name: string) => p.classes.find((c) => c.name === name)?.id;

const waveChecks = [
  {
    id: 'no-placed',
    label: 'Plus de drone posé dans le niveau : c’est la partie qui les amène',
    test: (cx: CheckContext) => {
      const left = levelOf(cx.project).actors.filter((a) => DRONES.includes(cx.project.classes.find((c) => c.id === a.classId)?.name ?? ''));
      return left.length ? `${left.length} drone${left.length > 1 ? 's' : ''} encore posé${left.length > 1 ? 's' : ''} dans le niveau : ceux de l’essai du jalon 1 s’en vont, les vagues les remplacent.` : true;
    },
  },
  {
    id: 'table',
    label: 'DT_Vagues dit quelle sorte de drone vient : V1 des Blindés, V2 des Éclaireurs',
    test: (cx: CheckContext) => {
      const p = cx.project;
      const dt = p.dataTables.find((t) => t.name === 'DT_Vagues');
      const sorte = p.structs.find((s) => s.name === 'S_Vague')?.members.find((m) => m.name === 'Sorte')?.id;
      if (!dt || !sorte) return 'DT_Vagues ou sa colonne Sorte a disparu.';
      for (const [row, cls] of [
        ['V1', 'BP_Blinde'],
        ['V2', 'BP_Eclaireur'],
      ]) {
        const v = dt.rows.find((r) => r.name === row)?.value[sorte];
        if (v !== classIdOf(p, cls)) return `Dans DT_Vagues, la ligne ${row} a Sorte = ${p.classes.find((c) => c.id === v)?.name ?? 'None'} : choisis ${cls}.`;
      }
      return true;
    },
  },
  {
    id: 'wave1',
    label: 'Au lancement, la vague 1 : 2 Blindés, le premier à 0,5 s, puis 0,5 s plus tard',
    at: 'c2',
    test: (cx: CheckContext) => {
      const heavy = spawned(cx, 'BP_Blinde');
      if (spawned(cx, 'BP_Eclaireur').length || heavy.length !== 2) return `${heavy.length} Blindé${heavy.length > 1 ? 's' : ''} et ${spawned(cx, 'BP_Eclaireur').length} Éclaireur(s) à 1,2 s : V1, c’est 2 BP_Blinde, un toutes les 0,5 s (Nombre et Intervalle de la ligne), dès le BeginPlay du GameMode.`;
      const [a, b] = heavy.map((x) => x.spawnedAt ?? 0);
      if (Math.abs(a - 0.5) > 0.05) return `Le premier Blindé arrive à ${a.toFixed(2)} s : la vague se lance au BeginPlay, et le premier drone vient après un Intervalle (0,5 s), comme le premier tour d’un Set Timer by Event.`;
      if (Math.abs(b - a - 0.5) > 0.05) return `Les deux Blindés arrivent à ${(b - a).toFixed(2)} s d’écart : l’Intervalle de V1 est 0,5 s.`;
      return true;
    },
  },
  {
    id: 'wave2',
    label: '2 s après le dernier Blindé parti, la vague 2 : 3 Éclaireurs à 0,8 s d’écart',
    at: 'fin-1',
    test: (cx: CheckContext) => {
      const heavy = spawned(cx, 'BP_Blinde');
      if (heavy.length !== 2) return `${heavy.length} Blindés en tout : la première vague s’arrête après les 2 de sa ligne (Clear Timer).`;
      const cleared = Math.max(...heavy.map((a) => a.destroyedAt ?? Number.POSITIVE_INFINITY));
      const scouts = spawned(cx, 'BP_Eclaireur');
      if (!scouts.length) return 'Aucun Éclaireur : quand le dernier drone d’une vague est parti, la suivante (V2) se lance 2 s plus tard.';
      // The wave starts 2 s after the last drone went; its first drone comes one Intervalle (0.8 s) later.
      const first = scouts[0].spawnedAt ?? 0;
      if (first < cleared + 2.8 - 0.05) return `Le premier Éclaireur arrive ${(first - cleared).toFixed(2)} s après le départ du dernier Blindé : la vague 2 attend que tous les drones de la vague 1 soient partis, puis 2 s (Delay), puis un Intervalle.`;
      if (first > cleared + 2.8 + 0.1) return `Le premier Éclaireur arrive ${(first - cleared).toFixed(2)} s après le départ du dernier Blindé : on attend 2 s de pause, puis l’Intervalle de V2 (0,8 s).`;
      if (scouts.length !== 3) return `${scouts.length} Éclaireur(s) en tout dans la vague 2 : sa ligne en demande 3.`;
      const gaps = scouts.slice(1).map((a, i) => (a.spawnedAt ?? 0) - (scouts[i].spawnedAt ?? 0));
      return gaps.every((g) => Math.abs(g - 0.8) < 0.05) ? true : 'Les Éclaireurs n’arrivent pas toutes les 0,8 s : l’Intervalle vient de la ligne V2.';
    },
  },
  {
    id: 'portals',
    label: 'Chaque drone part d’un portail tiré au hasard',
    at: 'fin-1',
    test: (cx: CheckContext) => {
      const all = drones(cx).filter((a) => a.spawnedAt !== undefined);
      const used = new Set<number>();
      // Where each drone was going from: the axis it travels on, and its side.
      for (const a of all) {
        const side = Math.abs(a.x) < 4 ? (a.y < 0 ? 0 : 2) : a.x > 0 ? 1 : 3;
        if (!onAxis(a)) return `${a.label} n’est sur aucun axe : un drone apparaît sur un portail (Get Actor Location du portail tiré).`;
        used.add(side);
      }
      return used.size >= 2 ? true : 'Tous les drones viennent du même portail : tire le portail au hasard (Random Integer in Range from Stream, de 0 au Last Index des portails).';
    },
  },
  {
    id: 'safe',
    label: '« L’arène est sauve » quand la dernière vague est finie',
    at: 'fin-1',
    test: (cx: CheckContext) => {
      const at = printedAt(cx, SAFE);
      if (at === undefined) return 'Aucun « L’arène est sauve » après la dernière vague (DT_Vagues n’a plus de ligne).';
      const lastGone = Math.max(...drones(cx).map((a) => a.destroyedAt ?? Number.POSITIVE_INFINITY));
      return at + 1e-6 >= lastGone && countPrints(cx, SAFE) === 1 ? true : '« L’arène est sauve » s’affiche alors qu’un drone est encore en jeu, ou plusieurs fois.';
    },
  },
  notion(usesNode('stream', 'BP_GameMode', ['random.intInRangeFromStream'], 'Le portail est tiré d’un Random Stream', 'Un Random Stream (une graine) rend les vagues rejouables à l’identique : pratique pour tester, et pour un mode « défi du jour ».')),
  notion(usesNode('data', 'BP_GameMode', ['dataTable.getRow'], 'Les vagues viennent de DT_Vagues', 'Lis chaque vague dans DT_Vagues (Get Data Table Row) : ajouter une vague, c’est ajouter une ligne, sans toucher au graphe.')),
  noRuntimeErrors(),
];

// ------------------------------------------------------------- milestone 3

function solveGame(p: Project): void {
  const gm = edit(p, 'BP_GameMode');
  const { v } = waves(gm, p);
  gm.variable('Score', T.int, 0);
  gm.variable('Record', T.int, 0);
  const get = (name: string, at: [number, number]) => gm.node('var.get', { variable: v(name) }, {}, at);
  const health = p.classes.find((c) => c.name === 'BP_Sante')!;
  const vie = health.variables.find((x) => x.name === 'Vie')!.id;
  const mort = health.dispatchers.find((x) => x.name === 'OnMort')!.id;
  const hitFn = health.graphs.find((g) => g.name === 'InfligerDegats')!;

  // The record: a Save Game.
  const rec = newClass(p, 'BP_Record', 'SaveGame');
  const recVar = rec.variable('Record', T.int, 0);

  // AjouterPoints (Points).
  const add = fnDef(p, gm, 'AjouterPoints', [['Points', T.int]], []);
  const sum = add.f.node('math.addInt', {}, {}, [300, 300]);
  const set = add.f.node('var.set', { variable: v('Score') }, {}, [500, 96]);
  add.f.link(add.f.node('var.get', { variable: v('Score') }, {}, [100, 300]), 'value', sum, 'a').link(add.entry, add.pin.Points, sum, 'b').link(sum, 'result', set, 'value');
  add.f.link(add.entry, 'then', set, 'exec').link(set, 'then', add.ret, 'exec');

  // BeginPlay: the record of earlier games first, then the first wave.
  const begin = Object.values(gm.graph.nodes).find((n) => n.def === 'event.beginPlay')!;
  const first = Object.values(gm.graph.nodes).find((n) => n.def === 'call.custom' && n.config.event === 'LancerVague' && n.y === 96)!;
  disconnectPin(gm.graph, { node: begin.id, pin: 'then' });
  const seq = gm.node('flow.sequence', {}, {}, [240, -200]);
  const exists = gm.node('save.exists', {}, { slot: SLOT }, [520, -300]);
  const was = gm.node('flow.branch', {}, {}, [780, -300]);
  const load = gm.node('save.fromSlot', {}, { slot: SLOT }, [1040, -300]);
  const cast = gm.node('cast.to', { class: rec.cls.id }, {}, [1300, -300]);
  const read = gm.node('var.getExternal', { owner: rec.cls.id, variable: recVar }, {}, [1500, -120]);
  const keep = gm.node('var.set', { variable: v('Record') }, {}, [1640, -300]);
  gm.link(begin.id, 'then', seq, 'exec').link(seq, 'then0', exists, 'exec').link(seq, 'then1', first.id, 'exec');
  gm.link(exists, 'then', was, 'exec').link(exists, 'result', was, 'condition').link(was, 'true', load, 'exec').link(load, 'then', cast, 'exec').link(load, 'result', cast, 'object');
  gm.link(cast, 'then', keep, 'exec').link(cast, 'as', read, 'target').link(read, 'value', keep, 'value');

  // The last wave ends the game too.
  const safe = Object.values(gm.graph.nodes).find((n) => n.def === 'debug.printString' && n.defaults.text === SAFE)!;
  const won = gm.node('call.custom', { owner: gm.cls.id, event: 'FinDePartie' }, {}, [1800, 1720]);
  gm.link(safe.id, 'then', won, 'exec');

  // FinDePartie: no more drones, the record, the end screen, the game paused.
  const end = gm.node('event.custom', { name: 'FinDePartie' }, {}, [64, 2200]);
  const stop = gm.node('time.clearTimer', {}, {}, [300, 2200]);
  const seq2 = gm.node('flow.sequence', {}, {}, [560, 2200]);
  const better = gm.node('math.greaterInt', {}, {}, [700, 2440]);
  const best = gm.node('flow.branch', {}, {}, [860, 2120]);
  const setRec = gm.node('var.set', { variable: v('Record') }, {}, [1120, 2120]);
  const create = gm.node('save.create', {}, { saveClass: rec.cls.id }, [1380, 2120]);
  const fill = gm.node('var.setExternal', { owner: rec.cls.id, variable: recVar }, {}, [1640, 2120]);
  const write = gm.node('save.toSlot', {}, { slot: SLOT }, [1900, 2120]);
  gm.link(end, 'then', stop, 'exec').link(get('Minuteur', [160, 2400]), 'value', stop, 'handle').link(stop, 'then', seq2, 'exec');
  gm.link(seq2, 'then0', best, 'exec').link(get('Score', [540, 2440]), 'value', better, 'a').link(get('Record', [540, 2520]), 'value', better, 'b').link(better, 'result', best, 'condition');
  gm.link(best, 'true', setRec, 'exec').link(get('Score', [980, 2300]), 'value', setRec, 'value').link(setRec, 'then', create, 'exec');
  gm.link(create, 'then', fill, 'exec').link(create, 'result', fill, 'target').link(setRec, 'out', fill, 'value').link(fill, 'then', write, 'exec').link(create, 'result', write, 'object');

  // The end screen: WBP_Fin with the score and the record (Expose on Spawn).
  const w = newClass(p, 'WBP_Fin', 'UserWidget');
  const canvas = addW(p, w.cls, 'CanvasPanel', undefined);
  const mid = { anchors: { minX: 0.5, minY: 0.5, maxX: 0.5, maxY: 0.5 }, alignX: 0.5, alignY: 0.5 };
  addW(p, w.cls, 'Image', canvas.id, { name: 'Img_Fond', props: { color: '#111827' }, slot: { ...mid, offsets: [0, 0, 620, 320] } });
  addW(p, w.cls, 'TextBlock', canvas.id, { name: 'Txt_Titre', props: { text: 'Fin de partie', fontSize: 40, color: '#fde68a' }, slot: { ...mid, offsets: [0, -90, 520, 60] } });
  for (const [label, name, y] of [
    ['Score', 'Txt_Score', 0],
    ['Record', 'Txt_Record', 70],
  ] as const) {
    addW(p, w.cls, 'TextBlock', canvas.id, { name: `Txt_${label}Label`, props: { text: `${label} :`, fontSize: 30 }, slot: { ...mid, offsets: [-90, y, 200, 50] } });
    addW(p, w.cls, 'TextBlock', canvas.id, { name, isVariable: true, props: { text: '0', fontSize: 30, color: '#fde68a' }, slot: { ...mid, offsets: [110, y, 160, 50] } });
  }
  const ws = w.variable('Score', T.int, 0);
  const wr = w.variable('Record', T.int, 0);
  for (const id of [ws, wr]) Object.assign(w.cls.variables.find((x) => x.id === id)!, { instanceEditable: true, exposeOnSpawn: true });
  const construct = w.node('event.construct', {}, {}, [64, 96]);
  let prev = construct;
  for (const [i, [name, varId]] of (
    [
      ['Txt_Score', ws],
      ['Txt_Record', wr],
    ] as const
  ).entries()) {
    const y = 96 + i * 300;
    const toText = w.node('conv.intToText', {}, {}, [400, y + 200]);
    const set = w.node('widget.setText', {}, {}, [600, y]);
    w.link(w.node('var.get', { variable: varId }, {}, [200, y + 200]), 'value', toText, 'in').link(toText, 'result', set, 'text');
    w.link(prev, 'then', set, 'exec').link(w.node('var.widget', { widget: w.cls.widgets!.find((x) => x.name === name)!.id }, {}, [400, y + 100]), 'value', set, 'target');
    prev = set;
  }
  const pc = gm.node('player.getController', {}, {}, [700, 2700]);
  const make = gm.node('widget.create', {}, { class: w.cls.id }, [1000, 2560]);
  const view = gm.node('widget.addToViewport', {}, {}, [1340, 2560]);
  const ui = gm.node('input.setModeUIOnly', {}, {}, [1640, 2560]);
  const cursor = gm.node('input.setShowMouseCursor', {}, { show: true }, [1940, 2560]);
  const paused = gm.node('game.setGamePaused', {}, { paused: true }, [2240, 2560]);
  gm.link(seq2, 'then1', make, 'exec').link(pc, 'result', make, 'owner').link(get('Score', [800, 2800]), 'value', make, `expose:${ws}`).link(get('Record', [800, 2880]), 'value', make, `expose:${wr}`);
  gm.link(make, 'then', view, 'exec').link(make, 'result', view, 'target').link(view, 'then', ui, 'exec').link(pc, 'result', ui, 'controller').link(make, 'result', ui, 'focus');
  gm.link(ui, 'then', cursor, 'exec').link(pc, 'result', cursor, 'target').link(cursor, 'then', paused, 'exec');

  // The drone: a Box Collision, for the core to feel it (a Static Mesh makes no overlap); its points before it goes.
  const d = edit(p, 'BP_Drone');
  d.component('BoxCollision', 'Zone', { sizeX: 70, sizeY: 70 });
  const points = d.variable('Points', T.int, 10);
  const pointsVar = d.cls.variables.find((x) => x.id === points)!;
  for (const [name, s] of [
    ['BP_Eclaireur', SCOUT],
    ['BP_Blinde', HEAVY],
  ] as const)
    setInheritedDefault(p.classes.find((c) => c.name === name)!, pointsVar, s.points);
  const dead = Object.values(d.graph.nodes).find((n) => n.def === 'event.componentDispatcher')!;
  const destroy = Object.values(d.graph.nodes).find((n) => n.def === 'actor.destroy')!;
  disconnectPin(d.graph, { node: dead.id, pin: 'then' });
  const mode = d.node('game.getGameMode', {}, {}, [160, 1200]);
  const asGm = d.node('cast.to', { class: gm.cls.id }, {}, [300, 1000]);
  const give = d.node('call.function', { owner: gm.cls.id, graph: add.graph.id }, {}, [600, 1000]);
  d.link(dead.id, 'then', asGm, 'exec').link(mode, 'result', asGm, 'object').link(asGm, 'then', give, 'exec').link(asGm, 'as', give, 'target');
  d.link(d.node('var.get', { variable: points }, {}, [440, 1200]), 'value', give, add.pin.Points).link(give, 'then', destroy.id, 'exec');
  destroy.x = 900;

  // The core: three points of health; a drone that reaches it is gone, and hurts it; at 0, the end.
  const core = edit(p, 'BP_Coeur');
  const sante = core.logic(edit(p, 'BP_Sante'), 'Sante', { [vie]: 3 });
  const over = core.node('event.actorBeginOverlap', {}, {}, [64, 96]);
  const isDrone = core.node('cast.to', { class: d.cls.id }, {}, [340, 96]);
  const kill = core.node('actor.destroy', {}, {}, [640, 96]);
  const say = core.node('debug.printString', {}, { text: HIT }, [900, 96]);
  const hurt = core.node('call.function', { owner: health.id, graph: hitFn.id }, { [hitFn.fn!.inputs[0].id]: 1 }, [1180, 96]);
  core.link(over, 'then', isDrone, 'exec').link(over, 'other', isDrone, 'object').link(isDrone, 'then', kill, 'exec').link(isDrone, 'as', kill, 'target');
  core.link(kill, 'then', say, 'exec').link(say, 'then', hurt, 'exec').target('Sante', hurt);
  const fallen = core.node('event.componentDispatcher', { component: sante, dispatcher: mort }, {}, [64, 500]);
  const cmode = core.node('game.getGameMode', {}, {}, [200, 700]);
  const cgm = core.node('cast.to', { class: gm.cls.id }, {}, [400, 500]);
  const lost = core.node('call.custom', { owner: gm.cls.id, event: 'FinDePartie' }, {}, [760, 500]);
  core.link(fallen, 'then', cgm, 'exec').link(cmode, 'result', cgm, 'object').link(cgm, 'then', lost, 'exec').link(cgm, 'as', lost, 'target');
}

/** Milestone 3: a game shooting everything (victory), then a game without a shot (defeat). */
const GAME_SCENARIO: ScenarioStep[] = [...WAVES_SCENARIO, { restart: true }, { wait: 14 }, { checkpoint: 'fin-2' }];

/**
 * The end screen's value for `label`: the number on the text that says it (« Score : 90 »), or on the
 * text drawn just right of it, on the same line (a label « Score : » and its value, as in UE).
 */
export function shownValue(cx: CheckContext, label: string): string | undefined {
  const laid = cx.sim.umg.layer(1280).flatMap((s) => s.laid).filter((l) => l.widget.kind === 'TextBlock' && l.drawn);
  const text = (l: (typeof laid)[number]) => String(l.props.text ?? '');
  const own = laid.find((l) => normText(text(l)).startsWith(normText(label)));
  if (!own) return undefined;
  const inline = text(own).match(/-?\d+/)?.[0];
  if (inline !== undefined) return inline;
  const mid = own.rect.y + own.rect.h / 2;
  const right = laid.filter((l) => l !== own && l.rect.x >= own.rect.x + own.rect.w - 4 && Math.abs(l.rect.y + l.rect.h / 2 - mid) < own.rect.h).sort((a, b) => a.rect.x - b.rect.x)[0];
  return right ? text(right).trim() : '';
}

function endScreen(score: number, record: number, why: string) {
  return (cx: CheckContext): true | string => {
    const s = shownValue(cx, 'Score');
    const r = shownValue(cx, 'Record');
    if (s === undefined || r === undefined) return `Pas d’écran de fin : ${why} On attend un widget qui montre « Score » et « Record », chacun avec sa valeur.`;
    if (s !== String(score)) return `L’écran de fin montre Score ${s || '(vide)'} : on attend ${score}.`;
    if (r !== String(record)) return `L’écran de fin montre Record ${r || '(vide)'} : on attend ${record}.`;
    if (cx.sim.inputMode !== 'UIOnly') return `Le jeu est en ${modeLabel(cx)} : la partie est finie, c’est UI Only.`;
    if (!cx.sim.showMouseCursor) return 'L’écran de fin est là, mais le curseur est caché : Set Show Mouse Cursor (coché).';
    return cx.sim.gamePaused ? true : 'L’écran de fin est là, mais le jeu continue derrière : Set Game Paused (coché).';
  };
}

const gameChecks = [
  {
    id: 'end-won',
    label: 'Toutes les vagues abattues : l’écran de fin, Score 90 et Record 90',
    at: 'fin-1',
    test: endScreen(90, 90, 'après la dernière vague, FinDePartie montre l’écran de fin.'),
  },
  {
    id: 'points',
    label: 'Chaque drone abattu rapporte ses Points (Blindé 30, Éclaireur 10)',
    test: (cx: CheckContext) => {
      const p = cx.project;
      for (const [name, s] of [
        ['BP_Eclaireur', SCOUT],
        ['BP_Blinde', HEAVY],
      ] as const) {
        const got = Number(classDefault(p, name, 'Points'));
        if (got !== s.points) return `${name} rapporte ${Number.isNaN(got) ? 'des points inconnus' : got} : on attend ${s.points} (variable Points de BP_Drone, réglée dans ses Class Defaults).`;
      }
      return true;
    },
  },
  {
    id: 'core',
    label: 'Sans un tir : trois drones atteignent le cœur, chacun disparaît, « Le cœur est touché »',
    test: (cx: CheckContext) => {
      const n = countPrints(cx, HIT);
      if (n === 0) return `Aucun « ${HIT} » dans la partie sans tir : les drones arrivent au cœur sans qu’il le sente. Dans l’appli, seule une Box Collision chevauche (dans UE, un Static Mesh le peut aussi, avec un preset Overlap, mais une zone se fait d’habitude avec une Box Collision) : donne au drone une Box Collision, et au cœur son On Actor Begin Overlap.`;
      if (n !== 3) return `${n} « ${HIT} » dans la partie sans tir : on en attend 3, un par drone arrivé, jusqu’à ce que le cœur (Vie 3) tombe.`;
      const stuck = alive(cx).filter((a) => dist(a) < 150);
      return stuck.length ? `${stuck[0].label} est sur le cœur et toujours là : arrivé, il disparaît.` : true;
    },
  },
  {
    id: 'end-lost',
    label: 'Le cœur tombe : l’écran de fin, Score 0, Record 90 gardé de la partie d’avant',
    at: 'fin-2',
    test: endScreen(0, 90, 'à 0 point de vie, la santé du cœur prévient, et FinDePartie montre l’écran de fin.'),
  },
  {
    id: 'stopped',
    label: 'La partie finie, plus aucun drone n’apparaît',
    at: 'fin-2',
    test: (cx: CheckContext) => {
      // The third hit of this game is when the core fell.
      const end = cx.sim.log.filter((l) => l.message !== undefined && normText(l.message).includes(normText(HIT)))[2]?.time;
      if (end === undefined) return true;
      const late = drones(cx).filter((a) => (a.spawnedAt ?? 0) > end + 0.05);
      return late.length ? `${late.length} drone(s) apparu(s) après la chute du cœur : FinDePartie arrête le minuteur de la vague (Clear Timer).` : true;
    },
  },
  notion(usesNode('record', 'BP_GameMode', ['save.toSlot'], 'Le record est gardé dans une Save Game', 'Le record survit d’une partie à l’autre dans un slot (Save Game to Slot), relu au lancement.')),
  noRuntimeErrors(),
];

// -------------------------------------------------------------- the project

const SETUP =
  'Déjà là : le projet UE5 (IMC_Joueur : E → **IA_Tirer**, BP_PlayerController, **BP_GameMode**), un BP_Joueur au graphe vide posé au centre, **BP_Coeur** au centre, quatre **BP_Portail** (nord, est, sud, ouest, à 5 m), la structure **S_Vague** (Nombre, Sorte, Intervalle) et la Data Table **DT_Vagues** (V1 et V2, colonne Sorte à None). Tout le reste est à créer.';

export const expertArena: Lesson = withMilestones(
  {
    id: 'x3-arene',
    code: 'X3',
    module: 'Projet Expert',
    level: 'expert',
    number: 0,
    title: 'L’arène de maintenance',
    situation:
      'Des drones défectueux arrivent par vagues des quatre portails, droit sur le cœur de la station. Le joueur, au centre, les vise et les abat avant qu’ils ne l’atteignent. Les vagues sont écrites dans une table ; le meilleur score reste d’une partie à l’autre.',
    recalls: ['inheritance', 'actor-components', 'dispatchers', 'tick', 'trace', 'data-tables', 'structs', 'random', 'spawn', 'timers', 'cast', 'umg', 'ui-input', 'save-game', 'player-controller'],
    notions: ['Projet Expert', 'Class Defaults d’un enfant', 'Get Component by Class', 'Random Stream', 'Spawn Actor', 'Data Table', 'SaveGame', 'GameMode'],
    remember:
      'Une famille d’ennemis : un parent qui sait tout faire, des enfants qui ne changent que des valeurs (leurs Class Defaults). Les règles de la partie (vagues, score, fin) vivent dans le GameMode ; chaque acteur ne fait que prévenir. Et les données (les vagues) sont dans une table : on règle le jeu sans toucher aux graphes.',
    cards: [EXPERT_RULES, REDO_ARENA],
    hints: [
      'Qui sait ce qu’est un drone, qui décide quand il en vient, et qui sait que la partie est finie ?',
      'Actor Component ; Class Settings › Parent Class, Class Defaults (Hérité) ; Line Trace By Channel, Get Component by Class ; Get Data Table Row, Random Integer in Range from Stream, Spawn Actor from Class, Set Timer by Event ; Get Game Mode, Cast To ; Save Game ; Create Widget, Set Input Mode UI Only, Set Game Paused.',
      'Solution : voir la solution de référence, ouverte une fois le projet réussi.',
    ],
    challenge: 'Ajoute une troisième vague mêlée (une ligne V3 de plus, sans toucher au graphe), puis un drone « Bouclier » qui ne perd de la vie que touché de face : qu’est-ce qui change dans BP_Sante, et qu’est-ce qui reste ?',
    setup: project,
  },
  [
    {
      id: 'drones',
      title: 'Les drones',
      cards: [
        {
          title: 'Cahier des charges',
          body:
            `${SETUP}\n\n` +
            '1. **BP_Sante**, un Actor Component : une **Vie** (Integer, Instance Editable), une fonction **InfligerDegats (Montant)** qui l’enlève, et un Event Dispatcher **OnMort** appelé quand elle tombe à 0 ou moins.\n' +
            '2. **BP_Drone**, le parent : un Static Mesh **qui bloque** (pour que le tir le touche), BP_Sante, deux variables **Vitesse** (Float, cm/s) et **PV** (Integer). Au départ, sa santé prend ses PV.\n' +
            '3. Un drone avance **droit vers le cœur**, à sa Vitesse, quel que soit le nombre d’images par seconde. À 0 point de vie, il disparaît.\n' +
            `4. **BP_Eclaireur** et **BP_Blinde**, enfants de BP_Drone, **sans aucun nœud** : seulement leurs Class Defaults. Éclaireur : Vitesse ${SCOUT.speed}, PV ${SCOUT.life}. Blindé : Vitesse ${HEAVY.speed}, PV ${HEAVY.life}.\n` +
            '5. **IA_Tirer** (E), dans BP_Joueur : un rayon de 10 m devant le joueur ; ce qu’il touche, s’il a une santé, perd **1** point de vie.\n' +
            '6. Pour l’essai : un BP_Eclaireur sur le portail **Est**, un BP_Blinde sur le portail **Sud**.',
        },
        {
          title: 'Le scénario de test',
          body: 'À **30 images par seconde**, le joueur au centre. À 0,8 s puis 1,2 s, le test regarde où sont les drones : chacun s’est rapproché du cœur, droit, à sa Vitesse. Puis six tours de tirs (nord, est, sud, ouest, un tir chacun) : après le premier, le Blindé a perdu un point de vie et un seul ; après le sixième, plus aucun drone.',
        },
        {
          title: 'Pour aller plus loin',
          body:
            '**Les Class Defaults d’un enfant** : ouvre BP_Blinde › Class Defaults, rubrique Hérité, et règle Vitesse et PV. Le parent et l’autre enfant ne bougent pas. Dans UE, c’est la façon courante de faire une famille d’ennemis : un enfant par sorte, souvent sans un seul nœud.\n\n' +
            '**Le tir ne connaît pas les drones** : il cherche une santé sur ce qu’il touche (Get Component by Class). Le jour où une caisse ou une tourelle porte BP_Sante, elle s’abat aussi, sans changer le tir. Un Cast To BP_Drone marcherait, mais pour les drones seulement.',
        },
      ],
      objectives: [
        'BP_Sante (Vie, InfligerDegats, OnMort) porté par BP_Drone.',
        'BP_Eclaireur et BP_Blinde, enfants sans nœud : Vitesse et PV dans leurs Class Defaults.',
        'Les drones vont droit au cœur à leur Vitesse ; un tir enlève un point de vie ; à 0, le drone disparaît.',
      ],
      scenario: DRONE_SCENARIO,
      checks: droneChecks,
      solve: solveDrones,
    },
    {
      id: 'vagues',
      title: 'Les vagues',
      cards: [
        {
          title: 'Cahier des charges',
          body:
            '1. Retire les drones de l’essai : désormais, c’est la partie qui les amène.\n' +
            '2. Dans **DT_Vagues**, la colonne Sorte : **V1 → BP_Blinde**, **V2 → BP_Eclaireur**.\n' +
            '3. **BP_GameMode** mène les vagues. Au lancement, la vague 1 : il lit sa ligne, puis fait apparaître **Nombre** drones de la **Sorte** de la ligne, un toutes les **Intervalle** secondes (le premier après un Intervalle).\n' +
            '4. Chaque drone apparaît sur un **portail tiré au hasard** parmi ceux du niveau, avec un **Random Stream** (graine 7).\n' +
            '5. Quand le dernier drone d’une vague a disparu (abattu ou autre), la vague suivante se lance **2 s plus tard**. Après la dernière ligne de la table : `L’arène est sauve`.\n' +
            '6. Ajouter une vague = ajouter une ligne à DT_Vagues, sans toucher à aucun graphe.',
        },
        {
          title: 'Le scénario de test',
          body: 'Celui du jalon 1 (les drones en jeu à 0,8 s et 1,2 s, six tours de tirs), puis dix tours de plus : le test regarde quand chaque drone apparaît et disparaît, d’où il vient, et quand s’affiche « L’arène est sauve ».',
        },
        {
          title: 'Pour aller plus loin',
          body:
            '**Qui sait qu’un drone est parti ?** Le drone, lui seul : il prévient le GameMode quand il disparaît (Event Destroyed), quelle qu’en soit la raison. Le GameMode tient le compte de la vague sans jamais chercher les drones.\n\n' +
            '**Un Random Stream** donne les mêmes tirages à partir de la même graine : les vagues sont rejouables à l’identique (pour tester, ou un « défi du jour » où tout le monde a les mêmes vagues). Change la graine, et les drones viennent d’ailleurs.',
        },
      ],
      objectives: [
        'Les vagues lues dans DT_Vagues, un drone toutes les Intervalle secondes.',
        'Chaque drone sur un portail tiré d’un Random Stream.',
        'La vague suivante 2 s après la fin de la précédente ; « L’arène est sauve » après la dernière.',
      ],
      scenario: WAVES_SCENARIO,
      checks: waveChecks,
      solve: solveWaves,
    },
    {
      id: 'partie',
      title: 'La partie',
      cards: [
        {
          title: 'Cahier des charges',
          body:
            '1. Le **cœur** porte lui aussi BP_Sante, avec **3** points de vie. Un drone qui l’atteint (sa Zone) disparaît, affiche `Le cœur est touché`, et lui enlève 1 point de vie. Pour être senti, le drone a besoin d’une **Box Collision** : dans l’appli, seule elle chevauche (dans UE, un Static Mesh le pourrait avec un preset Overlap, mais une zone de contact se fait d’habitude avec une Box Collision).\n' +
            `2. Chaque drone abattu rapporte ses **Points** au GameMode : une variable de BP_Drone, réglée dans les Class Defaults (Éclaireur ${SCOUT.points}, Blindé ${HEAVY.points}). Un drone arrivé au cœur ne rapporte rien.\n` +
            '3. La partie finit quand le cœur tombe, ou après `L’arène est sauve`. Alors : plus aucun drone n’apparaît, et un écran de fin montre le **Score** et le **Record** (un texte « Score : » et, à sa droite, la valeur), en **UI Only**, curseur visible, jeu en **pause**.\n' +
            `4. Le **record** est le meilleur score de toutes les parties : gardé dans une **Save Game** (slot \`${SLOT}\`), relu au lancement.`,
        },
        {
          title: 'Le scénario de test',
          body: 'Une première partie où le joueur tire tout le temps (celle du jalon 2) : à la fin, l’écran dit Score 90 et Record 90. Puis Stop, Play, et une seconde partie **sans un tir** : les drones atteignent le cœur, il tombe au troisième ; l’écran dit Score 0 et Record 90.',
        },
        {
          title: 'Pour aller plus loin',
          body:
            '**Le GameMode est l’arbitre** : il tient le score, sait quand la partie finit et l’annonce. Les drones et le cœur ne font que le prévenir (Get Game Mode, Cast To BP_GameMode). Dans UE, le score d’un joueur irait plutôt dans son **Player State**, et l’écran de fin serait créé par le Player Controller ou le HUD ; l’appli ne simule pas le Player State.\n\n' +
            '**La même santé** sert au drone et au cœur : un composant écrit une fois, réglé différemment (1, 3, ou les PV d’un drone). Le cœur ne sait pas ce qu’est un drone… sauf pour savoir qui l’a atteint.',
        },
      ],
      objectives: [
        'Le cœur a 3 points de vie ; un drone qui l’atteint disparaît et le touche.',
        'Les Points de chaque drone abattu s’ajoutent au score du GameMode.',
        'Écran de fin (UI Only, pause) avec le score et le record, gardé dans une Save Game.',
      ],
      scenario: GAME_SCENARIO,
      checks: gameChecks,
      solve: solveGame,
    },
  ],
);

/** The classes of the drone family, for the tests. */
export const droneClasses = (p: Project): BlueprintClass[] => p.classes.filter((c) => DRONES.includes(c.name));
