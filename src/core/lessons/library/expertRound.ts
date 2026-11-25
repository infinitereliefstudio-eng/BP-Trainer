/**
 * Expert project X4 « La ronde » (V7.68, chantier n° 5, docs/PLAN_EXPERT_FINAL.md,
 * project B). The security wing of the station: two guards make their rounds,
 * the player must take a file and leave without being seen.
 *
 * Four milestones (three were planned; at 160 nodes, the second would have taken well over an hour):
 * 1. Les gardes: a parent guard and two children that differ only by their
 *    Class Defaults, a round between points set in the level (Tick, Delta
 *    Seconds), the guard facing where it goes (Find Look at Rotation).
 * 2. La vision et l'alerte: a vision Actor Component (Dot Product, distance,
 *    Line Trace), the states in an Enum and a Switch, a suspicion gauge in a
 *    Widget Component.
 * 3. L'alerte: the alert of one guard passed to all by the GameMode (Event
 *    Dispatcher), « Repéré », then the level again (Open Level), the count in
 *    the GameInstance.
 * 4. Le casse: a locker to hide in (interface), the file (kept in the
 *    GameInstance, and where to start again), the way out.
 *
 * Vérifier replays the milestones in order on the same project: the scenario
 * of a milestone is the one before it, then more. Tested at 30 frames per second.
 */
import { levelOf, type Project } from '../../model/project';
import { inheritedView } from '../../model/inheritance';
import { addDispatcher, implementInterface, setInheritedDefault } from '../../operations/classOps';
import { addEnum } from '../../operations/enumOps';
import { disconnectPin } from '../../operations/graphOps';
import { renameLevel, setGameInstanceClass } from '../../operations/levelAssetOps';
import { placeActor } from '../../operations/levelOps';
import { addInterface, addInterfaceFunction, setParentClass } from '../../operations/projectOps';
import type { ActorRT } from '../../runtime/world';
import { T } from '../../types/pins';
import type { Value } from '../../types/values';
import { ProjectBuilder, edit, type ClassBuilder } from '../builder';
import { countPrints, noRuntimeErrors, normText, notion, usesNode } from '../checks';
import { withMilestones } from '../milestones';
import type { CheckContext, Lesson, ScenarioStep } from '../types';
import { ensurePlayerInput } from '../ue5Input';
import { EXPERT_RULES } from './expertRadio';
import { fnDef, fnOf, tap } from './kit';
import { playerBlueprint } from './props';
import { shownValue } from './expertArena';
import { addW, modeLabel, newClass, screenTexts } from './umgKit';
import { playerTells } from './universalLever';

export const LEVEL = 'Lvl_Aile';
const STATES = ['Patrouille', 'Suspicion', 'Alerte'];
/** The two guards: where they go, how fast, how far they see. */
export const SENTRY = { name: 'BP_Sentinelle', speed: 100, range: 600, from: [-400, -300] as [number, number], to: [400, -300] as [number, number] };
export const PROWLER = { name: 'BP_Patrouilleur', speed: 250, range: 300, from: [100, 250] as [number, number], to: [600, 250] as [number, number] };
const GUARDS = [SENTRY, PROWLER];
/** The suspicion: up 1 per second seen, down 0.5 per second unseen; at 1, the alert. */
const UP = 1;
const DOWN = 0.5;
/** dot > CONE: in front (a cone of 120°). */
const CONE = 0.5;
const PILLAR: [number, number] = [100, -150];
const LOCKER: [number, number] = [750, 250];
const FILE: [number, number] = [700, -300];
const EXIT: [number, number] = [-700, 380];
const START: [number, number] = [-700, 0];
const NO_FILE = 'Il manque le dossier';
const SPOTTED = 'Repéré';

function project(): Project {
  const pb = new ProjectBuilder('La ronde');
  playerBlueprint(pb);
  const p = pb.project;
  const r = renameLevel(p, levelOf(p).id, LEVEL);
  if (!r.ok) throw new Error(r.reason);
  const wall = pb.blueprint('BP_Mur');
  wall.component('StaticMesh', 'Mur', { sizeX: 40, sizeY: 1040, color: '#374151' });
  pb.place(wall, -850, 0);
  pb.place(wall, 850, 0);
  pb.place(wall, 0, -500, 90);
  pb.place(wall, 0, 500, 90);
  const pillar = pb.blueprint('BP_Pilier');
  pillar.component('StaticMesh', 'Pilier', { sizeX: 40, sizeY: 200, color: '#4b5563' });
  pb.place(pillar, ...PILLAR);
  // Marks on the floor where the rounds turn: the learner sets the points by their coordinates.
  const mark = pb.blueprint('BP_Repere');
  mark.component('StaticMesh', 'Marque', { shape: 'cylinder', sizeX: 36, sizeY: 36, color: '#1e3a8a', blocks: false });
  for (const [g, tag] of [
    [SENTRY, 'S'],
    [PROWLER, 'P'],
  ] as const) {
    for (const [i, at] of [g.from, g.to].entries()) {
      const id = pb.place(mark, ...at);
      levelOf(p).actors.find((a) => a.id === id)!.name = `Repere_${tag}${i + 1}`;
    }
  }
  const locker = pb.blueprint('BP_Casier');
  locker.component('StaticMesh', 'Armoire', { sizeX: 60, sizeY: 90, color: '#64748b', blocks: false });
  locker.component('BoxCollision', 'Zone', { sizeX: 140, sizeY: 150 });
  pb.place(locker, ...LOCKER);
  const file = pb.blueprint('BP_Dossier');
  file.component('StaticMesh', 'Chemise', { sizeX: 40, sizeY: 30, color: '#eab308', blocks: false });
  file.component('BoxCollision', 'Zone', { sizeX: 100, sizeY: 100 });
  pb.place(file, ...FILE);
  const exit = pb.blueprint('BP_Sortie');
  exit.component('StaticMesh', 'Tapis', { sizeX: 120, sizeY: 120, color: '#14532d', blocks: false });
  exit.component('TextRender', 'Panneau', { y: -80, text: 'Sortie' });
  exit.component('BoxCollision', 'Zone', { sizeX: 120, sizeY: 120 });
  pb.place(exit, ...EXIT);
  ensurePlayerInput(p, ['E'], { E: 'IA_Interagir' });
  pb.playerStart(...START);
  return p;
}

// ------------------------------------------------------------------ reading

const vec = (x: number, y: number): Value => ({ x, y, z: 0 });
const cls = (p: Project, name: string) => p.classes.find((c) => c.name === name);
/** The guard of a class in play now (the first). */
const guard = (cx: CheckContext, name: string) => cx.sim.actors.find((a) => a.className === name && !a.destroyed);

/** A variable of the vision component of a guard (the Actor Component with a variable of that name). */
function visionVar(cx: CheckContext, a: ActorRT | undefined, name: string): unknown {
  if (!a) return undefined;
  for (const o of cx.sim.componentsOf(a)) {
    const v = cx.sim.classOf(o)?.variables.find((x) => x.name === name);
    if (v) return o.vars[v.id];
  }
  return undefined;
}
const stateOf = (cx: CheckContext, a: ActorRT | undefined) => {
  const v = visionVar(cx, a, 'Etat');
  return v === undefined ? '?' : (STATES[Number(v)] ?? '?');
};
const suspicionOf = (cx: CheckContext, a: ActorRT | undefined) => Number(visionVar(cx, a, 'Soupcon') ?? Number.NaN);

/** The forward direction of an actor, from its yaw. */
const forward = (a: ActorRT) => ({ x: Math.cos((a.yaw * Math.PI) / 180), y: Math.sin((a.yaw * Math.PI) / 180) });
/** How much an actor faces a point (1: straight at it). */
function facing(a: ActorRT, x: number, y: number): number {
  const f = forward(a);
  const d = Math.hypot(x - a.x, y - a.y) || 1;
  return (f.x * (x - a.x) + f.y * (y - a.y)) / d;
}

/** A Class Default of `name`, inherited ones included (with the child's own value). */
function classDefault(p: Project, name: string, variable: string): unknown {
  const c = cls(p, name);
  return c ? inheritedView(c, p, true).variables.find((v) => v.name === variable)?.defaultValue : undefined;
}

// ------------------------------------------------------------- milestone 1

/** BP_Garde, its round in a function Ronde (Delta), and its two children, placed with their points. */
function solveGuards(p: Project): void {
  const g = newClass(p, 'BP_Garde', 'Actor');
  g.component('StaticMesh', 'Corps', { shape: 'cylinder', sizeX: 60, sizeY: 60, color: '#1d4ed8' });
  g.component('StaticMesh', 'Visiere', { x: 26, sizeX: 14, sizeY: 40, color: '#e2e8f0', blocks: false });
  const speed = g.variable('Vitesse', T.float, 150);
  const points = g.variable('Points', T.array(T.vector), []);
  g.cls.variables.find((v) => v.id === points)!.instanceEditable = true;
  const index = g.variable('Index', T.int, 0);

  // Ronde (Delta): toward Points[Index], at Vitesse; there, the next point (Index + 1, modulo the count).
  const r = fnDef(p, g, 'Ronde', [['Delta', T.float]], []);
  const f = r.f;
  const get = (v: string, at: [number, number]) => f.node('var.get', { variable: v }, {}, at);
  const target = f.node('array.get', {}, {}, [200, 300]);
  f.link(get(points, [40, 300]), 'value', target, 'array').link(get(index, [40, 400]), 'value', target, 'index');
  const here = f.node('actor.getLocation', {}, {}, [200, 520]);
  const look = f.node('math.findLookAtRotation', {}, {}, [440, 420]);
  const turn = f.node('actor.setRotation', {}, {}, [300, 0]);
  f.link(r.entry, 'then', turn, 'exec').link(here, 'result', look, 'start').link(target, 'item', look, 'target').link(look, 'result', turn, 'rotation');
  const gap = f.node('math.subtractVector', {}, {}, [440, 620]);
  const left = f.node('math.vectorLength', {}, {}, [640, 620]);
  const step = f.node('math.multiplyFloat', {}, {}, [640, 760]);
  const there = f.node('math.lessEqualFloat', {}, {}, [840, 660]);
  const arrived = f.node('flow.branch', {}, {}, [700, 0]);
  f.link(target, 'item', gap, 'a').link(here, 'result', gap, 'b').link(gap, 'result', left, 'a');
  f.link(get(speed, [440, 800]), 'value', step, 'a').link(r.entry, r.pin.Delta, step, 'b').link(left, 'result', there, 'a').link(step, 'result', there, 'b');
  f.link(turn, 'then', arrived, 'exec').link(there, 'result', arrived, 'condition');
  // There: on the point exactly, then the next one.
  const snap = f.node('actor.setLocation', {}, {}, [1000, -120]);
  const next = f.node('math.addInt', {}, { b: 1 }, [1100, 120]);
  const count = f.node('array.length', {}, {}, [1100, 220]);
  const loop = f.node('math.moduloInt', {}, {}, [1300, 160]);
  const setIndex = f.node('var.set', { variable: index }, {}, [1300, -120]);
  f.link(arrived, 'true', snap, 'exec').link(target, 'item', snap, 'location').link(snap, 'then', setIndex, 'exec');
  f.link(get(index, [940, 120]), 'value', next, 'a').link(get(points, [940, 240]), 'value', count, 'array').link(next, 'result', loop, 'a').link(count, 'result', loop, 'b').link(loop, 'result', setIndex, 'value');
  // On the way: one step toward it.
  const dir = f.node('math.normalizeVector', {}, {}, [1000, 520]);
  const move = f.node('math.multiplyVectorFloat', {}, {}, [1200, 520]);
  const go = f.node('actor.addOffset', {}, {}, [1000, 300]);
  f.link(arrived, 'false', go, 'exec').link(gap, 'result', dir, 'a').link(dir, 'result', move, 'a').link(step, 'result', move, 'b').link(move, 'result', go, 'delta');
  f.link(setIndex, 'then', r.ret, 'exec').link(go, 'then', r.ret, 'exec');

  // Tick → Ronde (Delta Seconds).
  const tick = g.node('event.tick', {}, {}, [64, 96]);
  const call = g.node('call.function', { owner: g.cls.id, graph: r.graph.id }, {}, [400, 96]);
  g.link(tick, 'then', call, 'exec').link(tick, 'delta', call, r.pin.Delta);

  // The two guards: children with their own Vitesse, placed on their first point.
  for (const [i, s] of GUARDS.entries()) {
    const c = newClass(p, s.name, 'Actor');
    const ok = setParentClass(p, c.cls.id, g.cls.id);
    if (!ok.ok) throw new Error(ok.reason);
    c.component('StaticMesh', 'Insigne', { shape: 'cylinder', sizeX: 22, sizeY: 22, color: i ? '#f97316' : '#a855f7', blocks: false });
    setInheritedDefault(c.cls, g.cls.variables.find((v) => v.id === speed)!, s.speed);
    const a = placeActor(p, c.cls.id, ...s.from);
    if (!a.ok) throw new Error(a.reason);
    a.value.overrides[points] = [vec(...s.from), vec(...s.to)];
  }
}

/** Where a guard should be at time t (seconds), back and forth from its first point, and where it goes. */
export function expectedAt(s: typeof SENTRY, t: number): { x: number; y: number; toward: [number, number] } {
  const len = Math.hypot(s.to[0] - s.from[0], s.to[1] - s.from[1]);
  const leg = len / s.speed;
  const k = t % (2 * leg);
  const out = k < leg;
  const a = k / leg;
  const along = out ? a : 2 - a;
  return { x: s.from[0] + (s.to[0] - s.from[0]) * along, y: s.from[1] + (s.to[1] - s.from[1]) * along, toward: out ? s.to : s.from };
}

/** Milestone 1: the player stays at the Player Start; the rounds at 1 s, 1.5 s (the Patrouilleur on its way back) and 2.5 s. */
const ROUND_SCENARIO: ScenarioStep[] = [{ fps: 30 }, { wait: 1 }, { checkpoint: 'r1' }, { wait: 0.5 }, { checkpoint: 'r2' }, { wait: 1 }, { checkpoint: 'r3' }];

/**
 * Milestone 2, from 2.5 s: behind the pillar, at the Sentinelle's back, then in front of it for 0.5 s (suspicion), away
 * (calm again), 400 cm in front of the Patrouilleur (too far for it), then 175 cm (the alert, for both).
 */
const VISION_SCENARIO: ScenarioStep[] = [
  ...ROUND_SCENARIO,
  { teleport: [300, -50] },
  { wait: 1 },
  { checkpoint: 'mur' },
  { teleport: [-600, -300] },
  { wait: 0.5 },
  { checkpoint: 'dos' },
  { teleport: [450, -300] },
  { wait: 0.5 },
  { checkpoint: 'soupcon' },
  { teleport: START },
  { wait: 1.5 },
  { checkpoint: 'calme' },
  { teleport: [150, 250] },
  { wait: 0.3 },
  { checkpoint: 'court' },
  { teleport: [350, 250] },
  { wait: 1.5 },
  { checkpoint: 'alerte' },
];

/** Milestone 3: after the alert, « Repéré », then the level again. */
const ALERT_SCENARIO: ScenarioStep[] = [...VISION_SCENARIO, { wait: 0.3 }, { checkpoint: 'repere' }, { wait: 2 }, { checkpoint: 'retour' }];

/**
 * Milestone 4, in the level opened again: in the locker while the Patrouilleur comes; out; at the exit without the
 * file; the file; caught again by the Sentinelle; back at the file; the exit.
 */
const HEIST_SCENARIO: ScenarioStep[] = [
  ...ALERT_SCENARIO,
  { teleport: LOCKER },
  ...tap('E'),
  { wait: 1.1 },
  { checkpoint: 'cache' },
  { wait: 1 },
  ...tap('E'),
  { wait: 0.1 },
  { checkpoint: 'sorti' },
  { teleport: EXIT },
  { wait: 0.2 },
  { checkpoint: 'sans-dossier' },
  { teleport: FILE },
  { wait: 0.2 },
  { checkpoint: 'dossier' },
  { wait: 5 },
  { checkpoint: 'reprise' },
  { teleport: EXIT },
  { wait: 0.3 },
];

// ------------------------------------------------------------- milestone 2

/** WBP_Soupcon: a bar over all of it, and Afficher (Valeur) that sets its Percent. */
function gaugeWidget(p: Project): ClassBuilder {
  const w = newClass(p, 'WBP_Soupcon', 'UserWidget');
  const canvas = addW(p, w.cls, 'CanvasPanel', undefined);
  addW(p, w.cls, 'ProgressBar', canvas.id, {
    name: 'PB_Soupcon',
    isVariable: true,
    props: { percent: 0, fillColor: '#f59e0b' },
    slot: { anchors: { minX: 0, minY: 0, maxX: 1, maxY: 1 }, offsets: [0, 0, 0, 0] },
  });
  const fn = fnDef(p, w, 'Afficher', [['Valeur', T.float]], []);
  const set = fn.f.node('widget.setPercent', {}, {}, [500, 96]);
  const bar = w.cls.widgets!.find((x) => x.name === 'PB_Soupcon')!;
  fn.f.link(fn.entry, 'then', set, 'exec').link(fn.entry, fn.pin.Valeur, set, 'percent').link(fn.f.node('var.widget', { widget: bar.id }, {}, [300, 260]), 'value', set, 'target');
  fn.f.link(set, 'then', fn.ret, 'exec');
  return w;
}

/** BP_Vision: Voit (Cible), the suspicion and the state on its Tick, OnAlerte. */
function visionComponent(p: Project): ClassBuilder {
  const e = addEnum(p, 'E_EtatGarde');
  if (!e.ok) throw new Error(e.reason);
  e.value.entries = [...STATES];
  const v = newClass(p, 'BP_Vision', 'ActorComponent');
  const range = v.variable('Portee', T.float, 400);
  v.cls.variables.find((x) => x.id === range)!.instanceEditable = true;
  const susp = v.variable('Soupcon', T.float, 0);
  const state = v.variable('Etat', T.enum('E_EtatGarde'), 0);
  const alert = addDispatcher(v.cls, 'OnAlerte').id;

  // Voit (Cible) → Vu: in front (Dot Product), close enough (Get Distance To), nothing between (Line Trace).
  const see = fnDef(p, v, 'Voit', [['Cible', T.object('Actor')]], [['Vu', T.bool]]);
  const f = see.f;
  const owner = f.node('component.getOwner', {}, {}, [40, 300]);
  const here = f.node('actor.getLocation', {}, {}, [240, 300]);
  const there = f.node('actor.getLocation', {}, {}, [240, 420]);
  f.link(owner, 'result', here, 'target').link(see.entry, see.pin.Cible, there, 'target');
  const toward = f.node('math.subtractVector', {}, {}, [440, 400]);
  const unit = f.node('math.normalizeVector', {}, {}, [640, 400]);
  const ahead = f.node('actor.getForward', {}, {}, [640, 300]);
  const dot = f.node('math.dotProduct', {}, {}, [840, 340]);
  const front = f.node('math.greaterFloat', {}, { b: CONE }, [1040, 340]);
  f.link(there, 'result', toward, 'a').link(here, 'result', toward, 'b').link(toward, 'result', unit, 'a');
  f.link(owner, 'result', ahead, 'target').link(ahead, 'result', dot, 'a').link(unit, 'result', dot, 'b').link(dot, 'result', front, 'a');
  const dist = f.node('actor.distanceTo', {}, {}, [640, 560]);
  const near = f.node('math.lessEqualFloat', {}, {}, [1040, 520]);
  f.link(owner, 'result', dist, 'target').link(see.entry, see.pin.Cible, dist, 'other').link(dist, 'result', near, 'a').link(f.node('var.get', { variable: range }, {}, [840, 620]), 'value', near, 'b');
  const trace = f.node('trace.lineByChannel', {}, {}, [400, 0]);
  const clear = f.node('logic.not', {}, {}, [1040, 700]);
  const both = f.node('logic.and', {}, {}, [1240, 420]);
  const all = f.node('logic.and', {}, {}, [1400, 500]);
  f.link(see.entry, 'then', trace, 'exec').link(here, 'result', trace, 'start').link(there, 'result', trace, 'end').link(trace, 'result', clear, 'a');
  f.link(front, 'result', both, 'a').link(near, 'result', both, 'b').link(both, 'result', all, 'a').link(clear, 'result', all, 'b');
  f.link(trace, 'then', see.ret, 'exec').link(all, 'result', see.ret, see.pin.Vu);

  // Tick: unless already in alert, the gauge follows what the guard sees, and the state follows the gauge.
  const g = (id: string, at: [number, number]) => v.node('var.get', { variable: id }, {}, at);
  const tick = v.node('event.tick', {}, {}, [64, 96]);
  const isAlert = v.node('logic.equalEnum', {}, {}, [300, 300]);
  const done = v.node('flow.branch', {}, {}, [400, 96]);
  v.link(g(state, [140, 300]), 'value', isAlert, 'a');
  v.graph.nodes[isAlert].defaults.b = 2;
  v.link(tick, 'then', done, 'exec').link(isAlert, 'result', done, 'condition');
  const look = v.node('call.function', { owner: v.cls.id, graph: see.graph.id }, {}, [680, 96]);
  v.link(done, 'false', look, 'exec').link(v.node('actor.getPlayerPawn', {}, {}, [520, 300]), 'result', look, see.pin.Cible);
  const rate = v.node('util.select', {}, {}, [900, 340]);
  v.link(look, see.pin.Vu, rate, 'index');
  Object.assign(v.graph.nodes[rate].defaults, { option0: -DOWN, option1: UP });
  const scaled = v.node('math.multiplyFloat', {}, {}, [1100, 340]);
  const sum = v.node('math.addFloat', {}, {}, [1300, 300]);
  const clamp = v.node('math.clampFloat', {}, { min: 0, max: 1 }, [1500, 300]);
  const setS = v.node('var.set', { variable: susp }, {}, [1000, 96]);
  v.link(rate, 'result', scaled, 'a').link(tick, 'delta', scaled, 'b').link(g(susp, [1100, 240]), 'value', sum, 'a').link(scaled, 'result', sum, 'b').link(sum, 'result', clamp, 'value');
  v.link(look, 'then', setS, 'exec').link(clamp, 'result', setS, 'value');
  const full = v.node('math.greaterEqualFloat', {}, { b: 1 }, [1300, 160]);
  const isFull = v.node('flow.branch', {}, {}, [1500, 96]);
  v.link(setS, 'then', isFull, 'exec').link(setS, 'out', full, 'a').link(full, 'result', isFull, 'condition');
  const toAlert = v.node('var.set', { variable: state }, { value: 2 }, [1800, 0]);
  const tell = v.node('dispatcher.call', { owner: v.cls.id, dispatcher: alert }, {}, [2100, 0]);
  v.link(isFull, 'true', toAlert, 'exec').link(toAlert, 'then', tell, 'exec');
  const some = v.node('math.greaterFloat', {}, { b: 0 }, [1700, 360]);
  const any = v.node('flow.branch', {}, {}, [1800, 200]);
  const toSusp = v.node('var.set', { variable: state }, { value: 1 }, [2100, 160]);
  const toCalm = v.node('var.set', { variable: state }, { value: 0 }, [2100, 320]);
  v.link(isFull, 'false', any, 'exec').link(setS, 'out', some, 'a').link(some, 'result', any, 'condition').link(any, 'true', toSusp, 'exec').link(any, 'false', toCalm, 'exec');

  return v;
}

function solveVision(p: Project): void {
  const w = gaugeWidget(p);
  const v = visionComponent(p);
  const etat = v.cls.variables.find((x) => x.name === 'Etat')!.id;
  const susp = v.cls.variables.find((x) => x.name === 'Soupcon')!.id;
  const portee = v.cls.variables.find((x) => x.name === 'Portee')!.id;

  const g = edit(p, 'BP_Garde');
  g.logic(v, 'Vision');
  g.widgetComponent('Jauge', w, { y: -70, sizeX: 100, sizeY: 12 });
  const range = g.variable('Portee', T.float, 400);
  for (const s of GUARDS) setInheritedDefault(cls(p, s.name)!, g.cls.variables.find((x) => x.id === range)!, s.range);
  // BeginPlay: the vision sees as far as this guard.
  const begin = g.node('event.beginPlay', {}, {}, [64, -300]);
  const setRange = g.node('var.setExternal', { owner: v.cls.id, variable: portee }, {}, [400, -300]);
  g.link(begin, 'then', setRange, 'exec').link(g.node('var.get', { variable: range }, {}, [200, -100]), 'value', setRange, 'value').target('Vision', setRange);

  // Tick: by state, the round or face the player; and the gauge shows the suspicion.
  const tick = Object.values(g.graph.nodes).find((n) => n.def === 'event.tick')!;
  const round = Object.values(g.graph.nodes).find((n) => n.def === 'call.function')!;
  disconnectPin(g.graph, { node: tick.id, pin: 'then' });
  round.x = 900;
  const seq = g.node('flow.sequence', {}, {}, [300, 96]);
  const sw = g.node('flow.switchEnum', { enum: 'E_EtatGarde' }, {}, [560, 96]);
  const getState = g.node('var.getExternal', { owner: v.cls.id, variable: etat }, {}, [360, 300]);
  g.link(tick.id, 'then', seq, 'exec').link(seq, 'then0', sw, 'exec').link(getState, 'value', sw, 'selection').target('Vision', getState);
  g.link(sw, 'case0', round.id, 'exec');
  const look = g.node('math.findLookAtRotation', {}, {}, [900, 460]);
  const turn = g.node('actor.setRotation', {}, {}, [900, 300]);
  const target = g.node('actor.getLocation', {}, {}, [700, 560]);
  g.link(sw, 'case1', turn, 'exec').link(sw, 'case2', turn, 'exec');
  g.link(g.node('actor.getLocation', {}, {}, [700, 460]), 'result', look, 'start').link(g.node('actor.getPlayerPawn', {}, {}, [500, 560]), 'result', target, 'target').link(target, 'result', look, 'target').link(look, 'result', turn, 'rotation');
  // The gauge's widget, found once at BeginPlay (a Cast To on every Tick would cost for nothing); then each frame, the suspicion.
  const bar = g.variable('Barre', T.object('WBP_Soupcon'));
  const widget = g.node('widgetComponent.getUserWidgetObject', {}, {}, [500, -100]);
  const cast = g.node('cast.to', { class: w.cls.id }, {}, [700, -300]);
  const keep = g.node('var.set', { variable: bar }, {}, [1000, -300]);
  g.target('Jauge', widget).link(widget, 'result', cast, 'object').link(setRange, 'then', cast, 'exec').link(cast, 'then', keep, 'exec').link(cast, 'as', keep, 'value');
  const afficher = w.cls.graphs.find((x) => x.name === 'Afficher')!;
  const show = g.node('call.function', { owner: w.cls.id, graph: afficher.id }, {}, [900, 700]);
  const getS = g.node('var.getExternal', { owner: v.cls.id, variable: susp }, {}, [700, 900]);
  g.link(seq, 'then1', show, 'exec').link(g.node('var.get', { variable: bar }, {}, [700, 800]), 'value', show, 'target');
  g.target('Vision', getS).link(getS, 'value', show, afficher.fn!.inputs[0].id);
}

// ------------------------------------------------------------- milestone 3

/** Get Game Instance → Cast To BP_Partie, after `from`: the cast node. */
function partie(b: ClassBuilder, p: Project, from: string, pin: string, at: [number, number]): string {
  const cast = b.node('cast.to', { class: cls(p, 'BP_Partie')!.id }, {}, at);
  b.link(from, pin, cast, 'exec').link(b.node('game.getGameInstance', {}, {}, [at[0] - 160, at[1] + 200]), 'result', cast, 'object');
  return cast;
}

/** A Widget Blueprint with a dark panel and a big title. */
function screen(p: Project, name: string, title: string, color: string): ClassBuilder {
  const w = newClass(p, name, 'UserWidget');
  const canvas = addW(p, w.cls, 'CanvasPanel', undefined);
  const mid = { anchors: { minX: 0.5, minY: 0.5, maxX: 0.5, maxY: 0.5 }, alignX: 0.5, alignY: 0.5 };
  addW(p, w.cls, 'Image', canvas.id, { name: 'Img_Fond', props: { color: '#111827' }, slot: { ...mid, offsets: [0, 0, 620, 260] } });
  addW(p, w.cls, 'TextBlock', canvas.id, { name: 'Txt_Titre', props: { text: title, fontSize: 44, color }, slot: { ...mid, offsets: [0, -50, 560, 70] } });
  return w;
}

/** The GameMode passes any guard's alert to all; then « Repéré », one more in the count (the GameInstance), and the level again. */
function solveAlert(p: Project): void {
  const v = edit(p, 'BP_Vision');
  const state = v.cls.variables.find((x) => x.name === 'Etat')!.id;
  const susp = v.cls.variables.find((x) => x.name === 'Soupcon')!.id;
  const alert = v.cls.dispatchers.find((x) => x.name === 'OnAlerte')!.id;
  // PasserEnAlerte: another guard gave the alert.
  const passEv = v.node('event.custom', { name: 'PasserEnAlerte' }, {}, [64, 800]);
  const setA = v.node('var.set', { variable: state }, { value: 2 }, [360, 800]);
  const setF = v.node('var.set', { variable: susp }, { value: 1 }, [660, 800]);
  v.link(passEv, 'then', setA, 'exec').link(setA, 'then', setF, 'exec');

  // The GameMode: whoever gives the alert, every guard passes to it.
  const gm = edit(p, 'BP_GameMode');
  const gmBegin = Object.values(gm.graph.nodes).find((n) => n.def === 'event.beginPlay')?.id ?? gm.node('event.beginPlay', {}, {}, [64, 96]);
  const guardCls = cls(p, 'BP_Garde')!.id;
  const forEachVision = (from: string, pin: string, at: [number, number]) => {
    const all = gm.node('actor.getAllOfClass', {}, { class: guardCls }, at);
    const loop = gm.node('flow.forEachLoop', {}, {}, [at[0] + 300, at[1]]);
    const comp = gm.node('actor.getComponentByClass', {}, { componentClass: v.cls.id }, [at[0] + 500, at[1] + 220]);
    gm.link(from, pin, all, 'exec').link(all, 'then', loop, 'exec').link(all, 'actors', loop, 'array').link(loop, 'element', comp, 'target');
    return { loop, comp };
  };
  const heard = gm.node('event.custom', { name: 'AlerteDonnee', signature: alert, signatureOwner: v.cls.id }, {}, [64, 600]);
  const a = forEachVision(gmBegin, 'then', [400, 96]);
  const bind = gm.node('dispatcher.bind', { owner: v.cls.id, dispatcher: alert }, {}, [1000, 96]);
  gm.link(a.loop, 'body', bind, 'exec').link(a.comp, 'result', bind, 'target').link(heard, 'delegate', bind, 'event');
  const b = forEachVision(heard, 'then', [400, 600]);
  const pass = gm.node('call.custom', { owner: v.cls.id, event: 'PasserEnAlerte' }, {}, [1000, 600]);
  gm.link(b.loop, 'body', pass, 'exec').link(b.comp, 'result', pass, 'target');

  // The GameInstance: the count survives the level opened again.
  const gi = newClass(p, 'BP_Partie', 'GameInstance');
  const count = gi.variable('Reperes', T.int, 0);
  const set = setGameInstanceClass(p, gi.cls.id);
  if (!set.ok) throw new Error(set.reason);

  // Caught: one more in the count, « Repéré », and the level again 2 s later.
  const rep = screen(p, 'WBP_Repere', SPOTTED, '#f87171');
  const gc = partie(gm, p, b.loop, 'completed', [1300, 800]);
  const plus = gm.node('math.addInt', {}, { b: 1 }, [1600, 1000]);
  const more = gm.node('var.setExternal', { owner: gi.cls.id, variable: count }, {}, [1600, 800]);
  const gcount = gm.node('var.getExternal', { owner: gi.cls.id, variable: count }, {}, [1450, 1000]);
  gm.link(gc, 'then', more, 'exec').link(gc, 'as', more, 'target').link(gc, 'as', gcount, 'target').link(gcount, 'value', plus, 'a').link(plus, 'result', more, 'value');
  const shown = gm.node('widget.create', {}, { class: rep.cls.id }, [1900, 800]);
  const onScreen = gm.node('widget.addToViewport', {}, {}, [2200, 800]);
  const pause = gm.node('time.delay', {}, { duration: 2 }, [2500, 800]);
  const again = gm.node('level.open', {}, { level: LEVEL }, [2800, 800]);
  gm.link(more, 'then', shown, 'exec').link(gm.node('player.getController', {}, {}, [1700, 1100]), 'result', shown, 'owner').link(shown, 'then', onScreen, 'exec').link(shown, 'result', onScreen, 'target');
  gm.link(onScreen, 'then', pause, 'exec').link(pause, 'completed', again, 'exec');
}

// ------------------------------------------------------------- milestone 4

function solveHeist(p: Project): void {
  // The GameInstance keeps the file and where it was taken too.
  const gi = edit(p, 'BP_Partie');
  const hasFile = gi.variable('Dossier', T.bool, false);
  const point = gi.variable('Point', T.vector, vec(0, 0));
  const count = gi.cls.variables.find((x) => x.name === 'Reperes')!.id;
  const ext = (b: ClassBuilder, variable: string, at: [number, number], write = false) => b.node(write ? 'var.setExternal' : 'var.getExternal', { owner: gi.cls.id, variable }, {}, at);

  // E: the player asks what it stands in (BPI_Interactif).
  const r = addInterface(p, 'BPI_Interactif');
  if (!r.ok) throw new Error(r.reason);
  addInterfaceFunction(p, r.value.id, 'Interagir');
  const iface = r.value.id;
  const fn = r.value.functions[0].id;
  const pl = edit(p, 'BP_Joueur');
  playerTells(pl, p.inputActions.find((a) => a.name === 'IA_Interagir')!.id, iface, fn);
  const hidden = pl.variable('Cache', T.bool, false);
  // BeginPlay: back where the file was taken, if it was.
  const begin = pl.node('event.beginPlay', {}, {}, [64, 500]);
  const c = partie(pl, p, begin, 'then', [360, 500]);
  const was = pl.node('flow.branch', {}, {}, [660, 500]);
  const back = pl.node('actor.setLocation', {}, {}, [960, 500]);
  const pFile = ext(pl, hasFile, [560, 700]);
  const pPoint = ext(pl, point, [760, 700]);
  pl.link(c, 'then', was, 'exec').link(c, 'as', pFile, 'target').link(pFile, 'value', was, 'condition');
  pl.link(was, 'true', back, 'exec').link(c, 'as', pPoint, 'target').link(pPoint, 'value', back, 'location');

  // The locker: E in it hides the player, E again lets him out.
  const lk = edit(p, 'BP_Casier');
  implementInterface(lk.cls, iface);
  const asked = lk.node('event.interface', { interface: iface, fn }, {}, [64, 96]);
  const who = lk.node('cast.to', { class: pl.cls.id }, {}, [360, 96]);
  const flip = lk.node('var.setExternal', { owner: pl.cls.id, variable: hidden }, {}, [660, 96]);
  const not = lk.node('logic.not', {}, {}, [560, 300]);
  const hide = lk.node('actor.setHidden', {}, {}, [960, 96]);
  const cache = lk.node('var.getExternal', { owner: pl.cls.id, variable: hidden }, {}, [400, 300]);
  lk.link(asked, 'then', who, 'exec').link(lk.node('actor.getPlayerPawn', {}, {}, [200, 260]), 'result', who, 'object');
  lk.link(who, 'then', flip, 'exec').link(who, 'as', flip, 'target').link(who, 'as', cache, 'target').link(cache, 'value', not, 'a').link(not, 'result', flip, 'value');
  lk.link(flip, 'then', hide, 'exec').link(who, 'as', hide, 'target').link(flip, 'out', hide, 'hidden');

  // The vision does not see a hidden player.
  const v = edit(p, 'BP_Vision');
  const voit = fnOf(v, 'Voit');
  const vf = voit.f;
  const trace = Object.values(voit.graph.nodes).find((n) => n.def === 'trace.lineByChannel')!.id;
  disconnectPin(voit.graph, { node: voit.entry, pin: 'then' });
  const isPlayer = vf.node('cast.to', { class: pl.cls.id }, {}, [200, -200]);
  const inLocker = vf.node('flow.branch', {}, {}, [500, -200]);
  const nope = vf.node('fn.return', { graph: voit.graph.id }, { [voit.pin.Vu]: false }, [800, -300]);
  const isHidden = vf.node('var.getExternal', { owner: pl.cls.id, variable: hidden }, {}, [400, -40]);
  vf.link(voit.entry, 'then', isPlayer, 'exec').link(voit.entry, voit.pin.Cible, isPlayer, 'object').link(isPlayer, 'then', inLocker, 'exec').link(isPlayer, 'as', isHidden, 'target').link(isHidden, 'value', inLocker, 'condition');
  vf.link(inLocker, 'true', nope, 'exec').link(inLocker, 'false', trace, 'exec').link(isPlayer, 'failed', trace, 'exec');

  // The file: taken, it is the new point to start from.
  const fl = edit(p, 'BP_Dossier');
  const over = fl.node('event.actorBeginOverlap', {}, {}, [64, 96]);
  const byPlayer = fl.node('cast.to', { class: pl.cls.id }, {}, [340, 96]);
  fl.link(over, 'then', byPlayer, 'exec').link(over, 'other', byPlayer, 'object');
  const oc = partie(fl, p, byPlayer, 'then', [640, 96]);
  const keep = fl.node('var.setExternal', { owner: gi.cls.id, variable: hasFile }, { value: true }, [940, 96]);
  const where = fl.node('var.setExternal', { owner: gi.cls.id, variable: point }, {}, [1240, 96]);
  const bye = fl.node('actor.destroy', {}, {}, [1540, 96]);
  fl.link(oc, 'then', keep, 'exec').link(oc, 'as', keep, 'target').link(keep, 'then', where, 'exec').link(oc, 'as', where, 'target').link(fl.node('actor.getLocation', {}, {}, [1100, 300]), 'result', where, 'value').link(where, 'then', bye, 'exec');

  // The exit: with the file, the end screen; without, a word.
  const fin = screen(p, 'WBP_Fin', 'Dossier sorti', '#86efac');
  const canvas = fin.cls.widgets!.find((x) => x.kind === 'CanvasPanel')!.id;
  const mid = { anchors: { minX: 0.5, minY: 0.5, maxX: 0.5, maxY: 0.5 }, alignX: 0.5, alignY: 0.5 };
  addW(p, fin.cls, 'TextBlock', canvas, { name: 'Txt_ReperesLabel', props: { text: 'Repéré :', fontSize: 30 }, slot: { ...mid, offsets: [-80, 40, 200, 50] } });
  addW(p, fin.cls, 'TextBlock', canvas, { name: 'Txt_Reperes', isVariable: true, props: { text: '0', fontSize: 30, color: '#fde68a' }, slot: { ...mid, offsets: [110, 40, 120, 50] } });
  const fr = fin.variable('Reperes', T.int, 0);
  Object.assign(fin.cls.variables.find((x) => x.id === fr)!, { instanceEditable: true, exposeOnSpawn: true });
  const construct = fin.node('event.construct', {}, {}, [64, 96]);
  const toText = fin.node('conv.intToText', {}, {}, [400, 300]);
  const setText = fin.node('widget.setText', {}, {}, [600, 96]);
  fin.link(fin.node('var.get', { variable: fr }, {}, [200, 300]), 'value', toText, 'in').link(toText, 'result', setText, 'text');
  fin.link(construct, 'then', setText, 'exec').link(fin.node('var.widget', { widget: fin.cls.widgets!.find((x) => x.name === 'Txt_Reperes')!.id }, {}, [400, 200]), 'value', setText, 'target');
  const ex = edit(p, 'BP_Sortie');
  const eo = ex.node('event.actorBeginOverlap', {}, {}, [64, 96]);
  const ep = ex.node('cast.to', { class: pl.cls.id }, {}, [340, 96]);
  ex.link(eo, 'then', ep, 'exec').link(eo, 'other', ep, 'object');
  const ec = partie(ex, p, ep, 'then', [640, 96]);
  const got = ex.node('flow.branch', {}, {}, [940, 96]);
  const egot = ex.node('var.getExternal', { owner: gi.cls.id, variable: hasFile }, {}, [780, 300]);
  ex.link(ec, 'then', got, 'exec').link(ec, 'as', egot, 'target').link(egot, 'value', got, 'condition');
  ex.link(got, 'false', ex.node('debug.printString', {}, { text: NO_FILE }, [1240, 300]), 'exec');
  const pc = ex.node('player.getController', {}, {}, [1100, 700]);
  const make = ex.node('widget.create', {}, { class: fin.cls.id }, [1240, 96]);
  const ecount = ex.node('var.getExternal', { owner: gi.cls.id, variable: count }, {}, [1100, 560]);
  const view = ex.node('widget.addToViewport', {}, {}, [1540, 96]);
  const ui = ex.node('input.setModeUIOnly', {}, {}, [1840, 96]);
  const cursor = ex.node('input.setShowMouseCursor', {}, { show: true }, [2140, 96]);
  const paused = ex.node('game.setGamePaused', {}, { paused: true }, [2440, 96]);
  ex.link(got, 'true', make, 'exec').link(pc, 'result', make, 'owner').link(ec, 'as', ecount, 'target').link(ecount, 'value', make, `expose:${fr}`);
  ex.link(make, 'then', view, 'exec').link(make, 'result', view, 'target').link(view, 'then', ui, 'exec').link(pc, 'result', ui, 'controller').link(make, 'result', ui, 'focus');
  ex.link(ui, 'then', cursor, 'exec').link(pc, 'result', cursor, 'target').link(cursor, 'then', paused, 'exec');
}

// ------------------------------------------------------------------ checks

const near = (a: { x: number; y: number }, x: number, y: number, tol: number) => Math.hypot(a.x - x, a.y - y) <= tol;
const pos = (a: { x: number; y: number }) => `(${Math.round(a.x)}, ${Math.round(a.y)})`;
/** Where each guard was at a checkpoint, by world. */
const seenAt = new WeakMap<object, Map<string, { x: number; y: number }>>();
const remember = (cx: CheckContext, key: string, a: ActorRT) => {
  const m = seenAt.get(cx.sim) ?? new Map<string, { x: number; y: number }>();
  m.set(key, { x: a.x, y: a.y });
  seenAt.set(cx.sim, m);
};
const recalled = (cx: CheckContext, key: string) => seenAt.get(cx.sim)?.get(key);
const missingGuard = (name: string) => `Aucun ${name} en jeu : pose-le dans le niveau, sur son premier point.`;

/** At time `t` of the first game, each guard where its round puts it, facing its next point. */
function onRound(t: number) {
  return (cx: CheckContext): true | string => {
    for (const s of GUARDS) {
      const a = guard(cx, s.name);
      if (!a) return missingGuard(s.name);
      remember(cx, `${s.name}@${t}`, a);
      const st = stateOf(cx, a);
      if (st !== '?' && st !== 'Patrouille')
        return `À ${t} s, ${s.name} est en ${st} : le joueur, au départ, est dans son dos ou loin, il ne devrait rien voir. Vérifie Voit (Cible) : devant, assez près, rien entre.`;
      const want = expectedAt(s, t);
      if (Math.abs(a.y - want.y) > 5 && s.from[1] === s.to[1]) return `${s.name} est en ${pos(a)} : sa ronde va de ${pos({ x: s.from[0], y: s.from[1] })} à ${pos({ x: s.to[0], y: s.to[1] })}, il quitte la ligne.`;
      if (Math.abs(a.x - want.x) > 25)
        return `À ${t} s, ${s.name} est en ${pos(a)} ; à ${s.speed} cm/s depuis son premier point, on l’attend vers ${pos(want)}. Il va vers Points[Index], et passe au point suivant une fois arrivé.`;
      if (facing(a, ...want.toward) < 0.95) return `À ${t} s, ${s.name} ne regarde pas où il va (vers ${pos({ x: want.toward[0], y: want.toward[1] })}) : tourne-le vers son point (Find Look at Rotation, Set Actor Rotation). Sa vision en dépendra.`;
    }
    return true;
  };
}

const guardChecks = [
  {
    id: 'family',
    label: 'BP_Sentinelle et BP_Patrouilleur héritent de BP_Garde',
    test: (cx: CheckContext) => {
      const p = cx.project;
      const base = cls(p, 'BP_Garde');
      if (!base) return 'Crée le Blueprint parent BP_Garde (Actor).';
      for (const s of GUARDS) {
        const c = cls(p, s.name);
        if (!c) return `Crée ${s.name}, enfant de BP_Garde.`;
        if (c.parentClassId !== base.id) return `${s.name} n’hérite pas de BP_Garde (Class Settings › Parent Class).`;
      }
      const v = (n: string) => base.variables.find((x) => x.name === n);
      if (v('Vitesse')?.type.category !== 'float') return 'BP_Garde a une variable Vitesse (Float, en cm/s).';
      const pts = v('Points');
      if (pts?.type.category !== 'vector' || pts.type.container !== 'array') return 'BP_Garde a une variable Points : un tableau de Vector (Variable Type Vector, puis l’icône de tableau).';
      return pts.instanceEditable ? true : 'Points doit être Instance Editable : chaque garde posé a sa ronde, réglée dans le Details du niveau.';
    },
  },
  {
    id: 'defaults',
    label: 'Les deux gardes ne diffèrent que par leurs Class Defaults : Vitesse',
    test: (cx: CheckContext) => {
      for (const s of GUARDS) {
        const got = Number(classDefault(cx.project, s.name, 'Vitesse'));
        if (got !== s.speed) return `${s.name} a Vitesse ${Number.isNaN(got) ? '?' : got} : on attend ${s.speed}, réglée dans ses Class Defaults (rubrique Hérité).`;
      }
      return true;
    },
  },
  {
    id: 'placed',
    label: 'Un garde de chaque sorte posé sur son premier point, avec ses deux points',
    test: (cx: CheckContext) => {
      const p = cx.project;
      const pts = cls(p, 'BP_Garde')?.variables.find((x) => x.name === 'Points');
      for (const s of GUARDS) {
        const c = cls(p, s.name);
        const placed = levelOf(p).actors.filter((a) => a.classId === c?.id);
        if (placed.length !== 1) return `${placed.length} ${s.name} dans le niveau : on en attend un.`;
        const a = placed[0];
        if (!near(a, ...s.from, 5)) return `${s.name} est posé en ${pos(a)} : pose-le sur son premier point, ${pos({ x: s.from[0], y: s.from[1] })}.`;
        const got = (pts && (a.overrides[pts.id] as { x: number; y: number }[] | undefined)) ?? [];
        const ok = got.length === 2 && near(got[0], ...s.from, 5) && near(got[1], ...s.to, 5);
        if (!ok) return `Les Points de ${s.name} (Details du niveau) sont ${got.length ? got.map(pos).join(', ') : 'vides'} : on attend ${pos({ x: s.from[0], y: s.from[1] })} puis ${pos({ x: s.to[0], y: s.to[1] })}.`;
      }
      return true;
    },
  },
  { id: 'round-a', label: 'À 1 s, chaque garde est sur sa ronde, tourné vers où il va', at: 'r1', test: onRound(1) },
  {
    id: 'speed',
    label: 'Chaque garde avance à sa Vitesse, quel que soit le nombre d’images par seconde',
    at: 'r2',
    test: (cx: CheckContext) => {
      for (const s of GUARDS) {
        const a = guard(cx, s.name);
        const was = recalled(cx, `${s.name}@1`);
        if (!a || !was) return missingGuard(s.name);
        const went = Math.hypot(a.x - was.x, a.y - was.y);
        if (Math.abs(went - s.speed * 0.5) > 10) return `${s.name} a fait ${Math.round(went)} cm en 0,5 s ; à ${s.speed} cm/s, on attend ${s.speed / 2} (le test tourne à 30 images par seconde : Delta Seconds).`;
      }
      return true;
    },
  },
  {
    id: 'turn',
    label: 'Arrivé au bout, le garde repart vers l’autre point',
    at: 'r3',
    test: (cx: CheckContext) => {
      const a = guard(cx, PROWLER.name);
      if (!a) return missingGuard(PROWLER.name);
      if (a.x > PROWLER.to[0] + 5) return `À 2,5 s, ${PROWLER.name} est en ${pos(a)} : il a dépassé son second point, ${pos({ x: PROWLER.to[0], y: PROWLER.to[1] })}. Quand le pas de cette image l’y amène, il s’y pose et passe au point suivant.`;
      if (a.x > 560 || a.x < 420) return `À 2,5 s, ${PROWLER.name} est en ${pos(a)} : arrivé à son second point vers 2 s, il doit revenir vers le premier (Index + 1, modulo le nombre de points), vers (475, 250).`;
      return facing(a, ...PROWLER.from) < 0.95 ? `À 2,5 s, ${PROWLER.name} revient vers son premier point, mais regarde ailleurs : tourne-le vers son point à chaque image (Find Look at Rotation, Set Actor Rotation).` : true;
    },
  },
  notion(usesNode('look', 'BP_Garde', ['math.findLookAtRotation'], 'Le garde se tourne vers son point', 'Find Look at Rotation (du garde vers son point) donne la rotation à passer à Set Actor Rotation.')),
  noRuntimeErrors(),
];

/** A guard's suspicion and state, as the check messages say them. */
const said = (cx: CheckContext, a: ActorRT | undefined) => `${stateOf(cx, a)}, Soupcon ${Number.isNaN(suspicionOf(cx, a)) ? '?' : suspicionOf(cx, a).toFixed(2)}`;
/** The gauge's Percent over a guard (its Widget Component), or undefined. */
function gaugeOf(cx: CheckContext, a: ActorRT | undefined): number | undefined {
  const id = a?.components.find((k) => k.kind === 'Widget' && k.widget)?.widget;
  const obj = id ? cx.sim.objectById(id) : undefined;
  const bar = obj && cx.sim.classOf(obj)?.widgets?.find((w) => w.kind === 'ProgressBar');
  return obj && bar ? Number(cx.sim.umg.prop({ obj, id: bar.id }, 'percent')) : undefined;
}

/** The guard does not see the player now: calm, gauge empty. `why` says why it should not. */
function unseen(name: string, why: string, sanity: (a: ActorRT, cx: CheckContext) => string | undefined) {
  return (cx: CheckContext): true | string => {
    const a = guard(cx, name);
    if (!a) return missingGuard(name);
    const off = sanity(a, cx);
    if (off) return off;
    return stateOf(cx, a) === 'Patrouille' && suspicionOf(cx, a) === 0 ? true : `${name} : ${said(cx, a)}. ${why}`;
  };
}

const visionChecks = [
  {
    id: 'component',
    label: 'BP_Vision, un Actor Component porté par BP_Garde : Soupcon, Etat (E_EtatGarde), OnAlerte',
    test: (cx: CheckContext) => {
      const p = cx.project;
      const v = cls(p, 'BP_Vision');
      if (!v || v.parent !== 'ActorComponent') return 'La vision est un Actor Component, BP_Vision (+ Add › Blueprint Class › Actor Component).';
      const base = cls(p, 'BP_Garde');
      if (!base || !inheritedView(base, p).components.some((k) => k.kind === 'ActorComponent' && k.classId === v.id)) return 'Ajoute BP_Vision aux Components de BP_Garde : ses enfants l’ont alors aussi.';
      const e = (p.enums ?? []).find((x) => x.name === 'E_EtatGarde');
      if (!e || STATES.some((s, i) => e.entries[i] !== s)) return `Crée l’Enum E_EtatGarde avec trois entrées, dans cet ordre : ${STATES.join(', ')}.`;
      const has = (n: string, check: (t: { category: string; subtype?: string }) => boolean) => v.variables.some((x) => x.name === n && check(x.type));
      if (!has('Soupcon', (t) => t.category === 'float')) return 'BP_Vision a une variable Soupcon (Float, de 0 à 1).';
      if (!has('Etat', (t) => t.category === 'enum' && t.subtype === 'E_EtatGarde')) return 'BP_Vision a une variable Etat, de type E_EtatGarde.';
      return v.dispatchers.some((d) => d.name === 'OnAlerte') ? true : 'BP_Vision a un Event Dispatcher OnAlerte, appelé quand ce garde donne l’alerte.';
    },
  },
  {
    id: 'ranges',
    label: 'La Sentinelle voit loin (600), le Patrouilleur court (300) : leurs Class Defaults',
    test: (cx: CheckContext) => {
      if (cls(cx.project, 'BP_Garde')?.variables.find((x) => x.name === 'Portee')?.type.category !== 'float') return 'BP_Garde a une variable Portee (Float, en cm) : jusqu’où ce garde voit.';
      for (const s of GUARDS) {
        const got = Number(classDefault(cx.project, s.name, 'Portee'));
        if (got !== s.range) return `${s.name} a Portee ${Number.isNaN(got) ? '?' : got} : on attend ${s.range}, dans ses Class Defaults.`;
      }
      return true;
    },
  },
  {
    id: 'gauge',
    label: 'Une jauge au-dessus de chaque garde : un Widget Component qui montre WBP_Soupcon',
    test: (cx: CheckContext) => {
      const p = cx.project;
      const w = cls(p, 'WBP_Soupcon');
      if (!w || w.parent !== 'UserWidget') return 'Crée le Widget Blueprint WBP_Soupcon, avec une Progress Bar.';
      if (!(w.widgets ?? []).some((x) => x.kind === 'ProgressBar')) return 'WBP_Soupcon a besoin d’une Progress Bar (Palette › Progress Bar).';
      const base = cls(p, 'BP_Garde');
      const comp = base && inheritedView(base, p).components.find((k) => k.kind === 'Widget');
      if (!comp) return 'BP_Garde n’a pas de Widget Component : Components › + Add › Widget.';
      if (comp.classId !== w.id) return `Le Widget Component ${comp.name} de BP_Garde doit afficher WBP_Soupcon (Details › User Interface › Widget Class).`;
      return comp.props.sizeX > 300 || comp.props.sizeY > 100 ? `Draw Size ${comp.props.sizeX} × ${comp.props.sizeY} : la jauge couvre le garde et ses voisins. Réduis-la, vers 100 × 12.` : true;
    },
  },
  {
    id: 'wall',
    label: 'Derrière le pilier, la Sentinelle ne voit pas le joueur (Line Trace)',
    at: 'mur',
    test: unseen(SENTRY.name, 'Le joueur est devant elle et assez près, mais le pilier le cache : un Line Trace du garde au joueur touche le pilier, et la vision ne voit rien.', (a) =>
      facing(a, 300, -50) < CONE || Math.hypot(a.x - 300, a.y + 50) > SENTRY.range ? `${SENTRY.name} est en ${pos(a)} à 3,5 s : sa ronde n’est pas celle du jalon 1.` : undefined,
    ),
  },
  {
    id: 'back',
    label: 'Dans son dos, la Sentinelle ne voit pas le joueur (Dot Product)',
    at: 'dos',
    test: unseen(SENTRY.name, 'Le joueur est derrière elle : la direction vers lui et sa Forward Vector vont en sens contraire, le Dot Product est négatif.', (a, cx) => {
      // Where she is when the player steps in front of her: in Suspicion, she must not move from there.
      remember(cx, 'avant', a);
      return undefined;
    }),
  },
  {
    id: 'suspicion',
    label: 'Vu 0,5 s : la Sentinelle passe en Suspicion, sa jauge monte (0,5)',
    at: 'soupcon',
    test: (cx: CheckContext) => {
      const a = guard(cx, SENTRY.name);
      if (!a) return missingGuard(SENTRY.name);
      const sus = suspicionOf(cx, a);
      if (stateOf(cx, a) !== 'Suspicion') return `Le joueur est 4,5 m devant la Sentinelle depuis 0,5 s : ${said(cx, a)}. Elle le voit (Portee 600) : sa jauge monte et elle passe en Suspicion.`;
      if (!(sus > 0.35 && sus < 0.7)) return `Soupcon vaut ${sus.toFixed(2)} après 0,5 s vu : elle monte de ${UP} par seconde (× Delta Seconds), on attend 0,5 environ.`;
      const bar = gaugeOf(cx, a);
      if (bar === undefined) return 'La Sentinelle n’a pas de jauge à l’écran (Widget Component qui montre WBP_Soupcon).';
      return Math.abs(bar - sus) < 0.06 ? true : `La jauge de la Sentinelle montre ${Math.round(bar * 100)} % alors que son Soupcon vaut ${sus.toFixed(2)} : Get User Widget Object, Cast To WBP_Soupcon, et son Percent prend le Soupcon.`;
    },
  },
  {
    id: 'stop',
    label: 'En Suspicion, le garde s’arrête et se tourne vers le joueur',
    at: 'soupcon',
    test: (cx: CheckContext) => {
      const a = guard(cx, SENTRY.name);
      const was = recalled(cx, 'avant');
      if (!a || !was) return missingGuard(SENTRY.name);
      if (Math.hypot(a.x - was.x, a.y - was.y) > 8) return `La Sentinelle a continué sa ronde (${Math.round(Math.hypot(a.x - was.x, a.y - was.y))} cm) en Suspicion : un Switch on E_EtatGarde ne fait la ronde qu’en Patrouille.`;
      return facing(a, 450, -300) > 0.95 ? true : 'En Suspicion, la Sentinelle ne regarde pas le joueur : tourne-la vers lui (Find Look at Rotation, Set Actor Rotation).';
    },
  },
  {
    id: 'calm',
    label: 'Plus vu : la jauge redescend, la Sentinelle reprend sa ronde',
    at: 'calme',
    test: (cx: CheckContext) => {
      const a = guard(cx, SENTRY.name);
      const was = recalled(cx, 'avant');
      if (!a || !was) return missingGuard(SENTRY.name);
      if (stateOf(cx, a) !== 'Patrouille' || suspicionOf(cx, a) !== 0)
        return `1,5 s après le départ du joueur : ${said(cx, a)}. Sa jauge redescend de ${DOWN} par seconde jusqu’à 0 (Clamp), et à 0 elle repasse en Patrouille.`;
      return a.x > was.x + 20 ? true : 'La Sentinelle est revenue en Patrouille mais ne bouge plus : en Patrouille, le Switch refait la ronde.';
    },
  },
  {
    id: 'short',
    label: 'À 3,7 m, le Patrouilleur ne voit pas le joueur : il voit court',
    at: 'court',
    test: unseen(PROWLER.name, `Il ne voit qu’à ${PROWLER.range} cm (sa Portee) : à 3,7 m, il ne voit pas. La vision prend la Portee de son garde au BeginPlay.`, (a) =>
      facing(a, 150, 250) < 0.9 ? `${PROWLER.name} est en ${pos(a)} à 6,4 s, tourné ailleurs : sa ronde n’est pas celle du jalon 1.` : undefined,
    ),
  },
  {
    id: 'alert',
    label: 'Vu 1 s par le Patrouilleur : il passe en Alerte, et y reste',
    at: 'alerte',
    test: (cx: CheckContext) => {
      const a = guard(cx, PROWLER.name);
      if (!a) return missingGuard(PROWLER.name);
      if (stateOf(cx, a) !== 'Alerte') return `Le joueur est devant le Patrouilleur, à moins de 2 m, depuis 1,5 s : ${said(cx, a)}. À Soupcon 1, il passe en Alerte et appelle OnAlerte.`;
      return facing(a, 350, 250) > 0.95 ? true : 'En Alerte, le garde se tourne vers le joueur, comme en Suspicion.';
    },
  },
  notion(usesNode('dot', 'BP_Vision', ['math.dotProduct'], 'Devant, c’est un Dot Product', 'Dot Product entre la Forward Vector du garde et la direction vers le joueur (normalisée) : plus de 0,5, il est dans le cône.')),
  notion(usesNode('switch', 'BP_Garde', ['flow.switchEnum'], 'Un Switch on E_EtatGarde choisit quoi faire', 'Un Switch on E_EtatGarde a une sortie par état : la ronde en Patrouille, se tourner vers le joueur sinon.')),
  noRuntimeErrors(),
];

/** The end screen's value next to « Repéré : », as in L’arène. */
function endScreen(cx: CheckContext): true | string {
  const n = shownValue(cx, 'Repéré');
  if (n === undefined) return 'Pas d’écran de fin à la sortie avec le dossier : on attend un widget qui montre « Repéré : » et, à sa droite, le nombre de fois.';
  if (n !== '2') return `L’écran de fin dit Repéré ${n || '(vide)'} : on attend 2 (une fois avant le casier, une fois après le dossier). Le compte vit dans le GameInstance : un Open Level remet tout le reste à zéro.`;
  if (cx.sim.inputMode !== 'UIOnly') return `Le jeu est en ${modeLabel(cx)} : la mission est finie, c’est UI Only.`;
  if (!cx.sim.showMouseCursor) return 'L’écran de fin est là, mais le curseur est caché : Set Show Mouse Cursor (coché).';
  return cx.sim.gamePaused ? true : 'L’écran de fin est là, mais le jeu continue derrière : Set Game Paused (coché).';
}

const fileInPlay = (cx: CheckContext) => cx.sim.actors.some((a) => a.className === 'BP_Dossier' && !a.destroyed);

const alertChecks = [
  {
    id: 'gi',
    label: 'Un GameInstance, BP_Partie, choisi dans Maps & Modes',
    test: (cx: CheckContext) => {
      const id = cx.project.mapsModes?.gameInstanceClass;
      const c = cx.project.classes.find((x) => x.id === id);
      return c?.parent === 'GameInstance' ? true : 'Ce qui doit survivre à un Open Level vit dans un GameInstance : crée BP_Partie (parent GameInstance) et choisis-le dans Project Settings › Maps & Modes › Game Instance Class.';
    },
  },
  {
    id: 'all',
    label: 'L’alerte du Patrouilleur met aussi la Sentinelle en Alerte',
    at: 'alerte',
    test: (cx: CheckContext) => {
      const b = guard(cx, SENTRY.name);
      if (!b) return missingGuard(SENTRY.name);
      if (stateOf(cx, b) !== 'Alerte') return `Le Patrouilleur a donné l’alerte, mais la Sentinelle est en ${stateOf(cx, b)} : le GameMode s’abonne à OnAlerte de chaque garde (Bind Event), et passe alors tous les gardes en Alerte.`;
      return facing(b, 350, 250) > 0.95 ? true : 'En Alerte, la Sentinelle se tourne vers le joueur, comme le Patrouilleur.';
    },
  },
  {
    id: 'spotted',
    label: 'L’alerte donnée : « Repéré » à l’écran',
    at: 'repere',
    test: (cx: CheckContext) =>
      screenTexts(cx).some((t) => normText(t).includes(normText(SPOTTED))) ? true : `Après l’alerte, aucun « ${SPOTTED} » à l’écran : le GameMode, qui entend l’alerte, crée WBP_Repere et l’ajoute à l’écran (Add to Viewport).`,
  },
  {
    id: 'again',
    label: '2 s plus tard, le niveau recommence : gardes en Patrouille, joueur au départ',
    at: 'retour',
    test: (cx: CheckContext) => {
      const lv = cx.levels();
      if (lv.length < 2) return `Le niveau n’a pas recommencé 2 s après « ${SPOTTED} » : Delay 2 s, puis Open Level (${LEVEL}). Un niveau rouvert repart de zéro, gardes compris.`;
      if (lv.length > 2) return `${lv.length - 1} Open Level depuis le début : un seul est attendu après la première alerte.`;
      if (cx.level() !== LEVEL) return `Open Level a ouvert ${cx.level()} : on rouvre ${LEVEL}.`;
      const pl = cx.sim.player;
      if (!near(pl, ...START, 15)) return `Après le premier « ${SPOTTED} », le joueur repart du Player Start, ${pos({ x: START[0], y: START[1] })}, pas de ${pos(pl)} : il n’a pas encore pris le dossier.`;
      const g = GUARDS.map((s) => guard(cx, s.name)).find((a) => a && stateOf(cx, a) !== 'Patrouille');
      if (g) return `${g.label} est en ${stateOf(cx, g)} dans le niveau rouvert : il devrait repartir en Patrouille.`;
      const n = cx.gameInstance('Reperes');
      if (n === undefined) return 'Le GameInstance (BP_Partie) n’a pas de variable Reperes (Integer) : le compte des fois où le joueur a été repéré.';
      return Number(n) === 1 ? true : `Reperes vaut ${String(n)} dans le GameInstance après la première alerte : on attend 1 (+1 à chaque alerte, avant l’Open Level).`;
    },
  },
  notion(usesNode('bind', 'BP_GameMode', ['dispatcher.bind'], 'Le GameMode s’abonne à l’alerte de chaque garde', 'Au BeginPlay du GameMode : Get All Actors Of Class (BP_Garde), Get Component by Class (BP_Vision), Bind Event to OnAlerte.')),
  noRuntimeErrors(),
];

const heistChecks = [
  {
    id: 'interface',
    label: 'Le casier répond à BPI_Interactif ; seul le joueur écoute IA_Interagir',
    test: (cx: CheckContext) => {
      const p = cx.project;
      const lk = cls(p, 'BP_Casier');
      if (!lk?.interfaces.length) return 'BP_Casier implémente une interface (Class Settings › Implemented Interfaces › BPI_Interactif), et le joueur lui envoie Interagir.';
      const own = p.classes.filter((c) => c.name !== 'BP_Joueur' && Object.values(c.graphs).some((g) => Object.values(g.nodes).some((n) => n.def === 'input.action')));
      return own.length ? `${own.map((c) => c.name).join(', ')} réagi(ssen)t à une Input Action : E appartient au joueur, qui envoie Interagir à ce qu’il touche.` : true;
    },
  },
  {
    id: 'hidden',
    label: 'Caché dans le casier, le joueur passe sous le nez du Patrouilleur',
    at: 'cache',
    test: (cx: CheckContext) => {
      const pl = cx.sim.player;
      const a = guard(cx, PROWLER.name);
      if (!a) return missingGuard(PROWLER.name);
      if (!pl.hidden) return 'E dans le casier : le joueur se cache (Set Actor Hidden In Game). Le joueur envoie Interagir (BPI_Interactif) aux acteurs qu’il chevauche ; le casier, lui, répond.';
      if (facing(a, ...LOCKER) < CONE || Math.hypot(a.x - LOCKER[0], a.y - LOCKER[1]) > PROWLER.range) return `${PROWLER.name} est en ${pos(a)} à 2 s du niveau rouvert : il devrait être au bout de sa ronde, face au casier.`;
      return stateOf(cx, a) === 'Patrouille' && suspicionOf(cx, a) === 0
        ? true
        : `Le Patrouilleur est face au casier, à 1,5 m : ${said(cx, a)}. Caché, le joueur ne se voit pas : Voit (Cible) répond non quand le joueur est dans le casier (sa variable Cache), avant même le Line Trace (qui, lui, ne regarde pas Hidden In Game).`;
    },
  },
  {
    id: 'out',
    label: 'E à nouveau : il ressort',
    at: 'sorti',
    test: (cx: CheckContext) => (cx.sim.player.hidden ? 'Un second E dans le casier fait ressortir le joueur : la même action, dans l’autre sens.' : true),
  },
  {
    id: 'no-file',
    label: `Sans le dossier, la sortie dit « ${NO_FILE} »`,
    at: 'sans-dossier',
    test: (cx: CheckContext) => {
      if (shownValue(cx, 'Repéré') !== undefined || cx.sim.gamePaused) return 'L’écran de fin s’affiche sans le dossier : la sortie vérifie d’abord qu’il a été pris (dans le GameInstance).';
      return countPrints(cx, NO_FILE) ? true : `Le joueur sur la sortie sans le dossier : aucun « ${NO_FILE} ».`;
    },
  },
  {
    id: 'file',
    label: 'Le dossier ramassé disparaît',
    at: 'dossier',
    test: (cx: CheckContext) => (fileInPlay(cx) ? 'Le joueur est sur le dossier, qui est toujours là : en le chevauchant, il le prend (le GameInstance le note), et le dossier se détruit.' : true),
  },
  {
    id: 'checkpoint',
    label: 'Repéré avec le dossier : on reprend là où il a été pris',
    at: 'reprise',
    test: (cx: CheckContext) => {
      const lv = cx.levels().length;
      if (lv < 3) return 'Le joueur attend près du dossier jusqu’à ce que la Sentinelle le voie : l’alerte, puis le niveau recommence. Ici, il n’a pas recommencé une seconde fois.';
      const pl = cx.sim.player;
      return near(pl, ...FILE, 15) ? true : `Le niveau recommencé, le joueur est en ${pos(pl)} : il reprend là où il a pris le dossier, ${pos({ x: FILE[0], y: FILE[1] })} (le point gardé dans le GameInstance, posé au BeginPlay du joueur).`;
    },
  },
  { id: 'end', label: 'Avec le dossier, la sortie : l’écran de fin dit Repéré 2 (UI Only, pause)', test: endScreen },
  noRuntimeErrors(),
];

// -------------------------------------------------------------- the project

const SETUP =
  `Déjà là : le projet UE5 (IMC_Joueur : E → **IA_Interagir**, BP_PlayerController, **BP_GameMode**), un BP_Joueur au graphe vide sur le Player Start ${pos({ x: START[0], y: START[1] })}, le niveau **${LEVEL}** : ses murs, un **pilier** en ${pos({ x: PILLAR[0], y: PILLAR[1] })}, quatre repères au sol (S1, S2, P1, P2) là où les rondes tournent, **BP_Casier**, **BP_Dossier** et **BP_Sortie** (chacun avec sa Zone, graphe vide). Tout le reste est à créer.`;

export const expertRound: Lesson = withMilestones(
  {
    id: 'x4-ronde',
    code: 'X4',
    module: 'Projet Expert',
    level: 'expert',
    number: 0,
    title: 'La ronde',
    situation:
      'L’aile de sécurité de la station. Deux gardes font leur ronde ; ce qu’ils voient fait monter leur soupçon, et l’alerte de l’un réveille l’autre. Le joueur doit prendre un dossier et ressortir. Repéré, il recommence, depuis le dernier point atteint.',
    recalls: ['inheritance', 'actor-components', 'dispatchers', 'tick', 'trace', 'enum', 'switch', 'widget-component', 'interfaces', 'cast', 'umg', 'ui-input', 'game-instance', 'levels', 'arrays', 'functions'],
    notions: ['Projet Expert', 'Find Look at Rotation', 'Dot Product', 'Line Trace By Channel', 'Switch on Enum', 'Widget Component', 'GameInstance', 'Open Level (by Name)'],
    remember:
      'Un garde ne sait faire que sa ronde ; ce qu’il voit est l’affaire de son composant de vision, qui dit seulement « alerte ». Le GameMode, l’arbitre, entend l’alerte et décide de la suite. Et tout ce qui doit survivre au niveau rouvert (le compte, le dossier, le point de reprise) vit dans le GameInstance.',
    cards: [EXPERT_RULES],
    hints: [
      'Qui sait où va un garde, qui sait ce qu’il voit, et qui décide de ce qui arrive quand il voit ?',
      'Class Defaults (Hérité) ; Find Look at Rotation, Set Actor Rotation ; Get Owner, Dot Product, Get Distance To, Line Trace By Channel ; Enum, Switch on Enum ; Widget Component, Get User Widget Object ; Event Dispatcher, Bind Event ; BPI_Interactif ; GameInstance, Open Level.',
      'Solution : voir la solution de référence, ouverte une fois le projet réussi.',
    ],
    challenge: 'Ajoute un troisième garde qui tourne entre quatre points sans toucher à aucun graphe (seulement le niveau), puis une caméra fixe : un acteur qui ne bouge pas, mais qui porte BP_Vision. Qu’est-ce qui marche tout seul, et que faut-il changer ?',
    setup: project,
  },
  [
    {
      id: 'gardes',
      title: 'Les gardes',
      cards: [
        {
          title: 'Cahier des charges',
          body:
            `${SETUP}\n\n` +
            '1. **BP_Garde**, le parent : un Static Mesh (le corps), une variable **Vitesse** (Float, cm/s) et **Points**, un **tableau de Vector**, **Instance Editable**.\n' +
            '2. Sa ronde : il va droit vers le point en cours, à sa Vitesse, quel que soit le nombre d’images par seconde ; arrivé, il passe au **point suivant**, et après le dernier, il revient au premier. Il est toujours **tourné vers où il va**.\n' +
            `3. **BP_Sentinelle** et **BP_Patrouilleur**, enfants de BP_Garde, **sans aucun nœud** : Sentinelle Vitesse ${SENTRY.speed}, Patrouilleur Vitesse ${PROWLER.speed}.\n` +
            `4. Dans le niveau : une Sentinelle sur S1 ${pos({ x: SENTRY.from[0], y: SENTRY.from[1] })}, Points S1 puis S2 ${pos({ x: SENTRY.to[0], y: SENTRY.to[1] })} ; un Patrouilleur sur P1 ${pos({ x: PROWLER.from[0], y: PROWLER.from[1] })}, Points P1 puis P2 ${pos({ x: PROWLER.to[0], y: PROWLER.to[1] })}.`,
        },
        {
          title: 'Le scénario de test',
          body: 'À **30 images par seconde**, le joueur reste au départ. À 1 s, 1,5 s et 2,5 s, le test regarde où sont les gardes et vers où ils regardent : chacun sur sa ligne, à sa Vitesse ; le Patrouilleur, arrivé à P2 vers 2 s, revient vers P1.',
        },
        {
          title: 'Pour aller plus loin',
          body:
            '**Les points dans le niveau** : Points est Instance Editable, chaque garde posé a la sienne, réglée dans le Details du niveau. Le Blueprint ne connaît aucune position : un troisième garde, c’est un acteur posé de plus, pas un graphe de plus. Dans UE, on coche aussi **Show 3D Widget** sur un Vector : chaque point se déplace à la souris dans le viewport.\n\n' +
            '**Find Look at Rotation** donne la rotation pour regarder d’une position vers une autre ; Set Actor Rotation la prend. Sa Forward Vector suit : c’est elle que la vision du jalon 2 utilisera.\n\n' +
            '**Range la ronde dans une fonction** (Ronde, avec Delta en entrée) : le Tick ne fait que l’appeler, et le jalon 2 y ajoutera un choix selon l’état.',
        },
      ],
      objectives: ['BP_Garde (Vitesse, Points), et deux enfants qui ne changent que leur Vitesse.', 'La ronde : vers le point en cours, puis le suivant, en boucle, tourné vers où il va.', 'Les deux gardes posés avec leurs points.'],
      scenario: ROUND_SCENARIO,
      checks: guardChecks,
      solve: solveGuards,
    },
    {
      id: 'vision',
      title: 'La vision et l’alerte',
      cards: [
        {
          title: 'Cahier des charges',
          body:
            `1. **BP_Vision**, un Actor Component porté par BP_Garde. Une fonction **Voit (Cible)** répond Vrai si la cible est **devant** le garde (Dot Product entre sa Forward Vector et la direction vers la cible, normalisée : plus de ${CONE}), **assez près** (sa **Portee**), et si **rien ne la cache** (un Line Trace du garde à la cible ne touche rien).\n` +
            `2. BP_Garde a une **Portee** (Float) : Sentinelle **${SENTRY.range}**, Patrouilleur **${PROWLER.range}**, dans les Class Defaults. Au départ, sa vision la prend.\n` +
            `3. Une Enum **E_EtatGarde** : ${STATES.join(', ')}. BP_Vision a un **Soupcon** (Float, de 0 à 1) et un **Etat**. À chaque image : vu, le Soupcon monte de **${UP} par seconde** ; pas vu, il descend de **${DOWN} par seconde** (jamais sous 0 ni au-dessus de 1). À 0 : Patrouille ; entre les deux : Suspicion ; à 1 : **Alerte**, et le composant appelle son Event Dispatcher **OnAlerte**. Une fois en Alerte, il y reste.\n` +
            '4. Le garde, selon son Etat (**Switch on E_EtatGarde**) : en Patrouille, sa ronde ; en Suspicion ou en Alerte, il s’arrête et **se tourne vers le joueur**.\n' +
            '5. Au-dessus de chaque garde, une **jauge** (Widget Component, WBP_Soupcon avec une Progress Bar) qui montre son Soupcon.',
        },
        {
          title: 'Le scénario de test',
          body: 'Celui du jalon 1, puis le joueur se place : derrière le pilier, devant la Sentinelle (elle ne doit rien voir) ; dans son dos ; 4,5 m devant elle pendant 0,5 s (Suspicion, jauge vers 0,5, elle s’arrête et le regarde) ; parti, 1,5 s plus tard elle est calme et reprend sa ronde. Puis à 3,7 m devant le Patrouilleur (trop loin pour lui), et à moins de 2 m pendant 1,5 s : il passe en Alerte.',
        },
        {
          title: 'Pour aller plus loin',
          body:
            '**La vision ne connaît pas les gardes** : elle demande à son propriétaire (Get Owner) où il est et où il regarde. Une caméra fixe qui porte BP_Vision verrait de la même façon.\n\n' +
            '**Dans UE**, on écrirait rarement la vision à la main : **AI Perception** (un composant de perception, avec ses sens et ses cônes) et un **Behavior Tree** (les états et leurs actions) font ce travail, avec la navigation. Les écrire une fois en Blueprint montre ce qu’ils font à ta place.',
        },
      ],
      objectives: ['BP_Vision : Voit (devant, assez près, rien entre).', 'Soupcon et Etat (E_EtatGarde) ; à 1, Alerte et OnAlerte.', 'Le garde selon son état (Switch) : la ronde, ou face au joueur ; une jauge au-dessus.'],
      scenario: VISION_SCENARIO,
      checks: visionChecks,
      solve: solveVision,
    },
    {
      id: 'alerte',
      title: 'L’alerte',
      cards: [
        {
          title: 'Cahier des charges',
          body:
            '1. **L’alerte d’un garde met tous les gardes en Alerte** : le **GameMode** s’abonne à OnAlerte de chaque garde, et quand l’un la donne, il passe tous les autres en Alerte.\n' +
            `2. **Repéré** : à l’alerte, \`${SPOTTED}\` s’affiche à l’écran ; **2 s plus tard**, le niveau recommence (**Open Level** ${LEVEL}).\n` +
            '3. Un **GameInstance**, **BP_Partie**, choisi dans Maps & Modes, compte les fois où le joueur a été repéré : une variable **Reperes** (Integer), +1 à chaque alerte.',
        },
        {
          title: 'Le scénario de test',
          body: 'Celui du jalon 2, qui finit sur l’alerte du Patrouilleur : la Sentinelle passe en Alerte aussi, « Repéré » est à l’écran ; 2 s plus tard, le niveau recommence : les gardes en Patrouille, le joueur au départ, Reperes à 1.',
        },
        {
          title: 'Pour aller plus loin',
          body:
            '**Le GameMode est l’arbitre** : un garde ne connaît pas les autres. Il crie « alerte » (OnAlerte) ; le GameMode, abonné à tous, décide de la suite : tout le monde en Alerte, puis on recommence.\n\n' +
            '**Pourquoi rouvrir le niveau ?** Open Level remet tout à zéro : les gardes, leur soupçon, l’écran « Repéré ». Pas besoin de tout remettre en place à la main. Le revers : ce qui doit rester (le compte, et au jalon 4 le dossier) vit ailleurs que dans le niveau, dans le **GameInstance**.',
        },
      ],
      objectives: ['Le GameMode passe tous les gardes en Alerte quand l’un la donne.', '« Repéré » à l’écran, puis Open Level 2 s plus tard.', 'Le compte (Reperes) dans le GameInstance BP_Partie.'],
      scenario: ALERT_SCENARIO,
      checks: alertChecks,
      solve: solveAlert,
    },
    {
      id: 'casse',
      title: 'Le casse',
      cards: [
        {
          title: 'Cahier des charges',
          body:
            '1. **E** (IA_Interagir) : le joueur envoie **Interagir** (une interface, BPI_Interactif) à ce qu’il chevauche. Dans **BP_Casier**, E le cache (Set Actor Hidden In Game) ; E encore, il ressort. Caché, **aucun garde ne le voit**.\n' +
            '2. **BP_Dossier** : le joueur qui le chevauche le prend, et le dossier disparaît. C’est aussi le **point de reprise** : repéré ensuite, le joueur recommence là où il l’a pris, le dossier toujours en poche.\n' +
            `3. **BP_Sortie** : sans le dossier, \`${NO_FILE}\` ; avec, un **écran de fin** qui montre « Repéré : » et, à sa droite, le nombre de fois, en **UI Only**, curseur visible, jeu en **pause**.`,
        },
        {
          title: 'Le scénario de test',
          body: 'Celui du jalon 3, puis, dans le niveau recommencé : le joueur se cache dans le casier pendant que le Patrouilleur arrive face à lui, ressort, va à la sortie sans le dossier, prend le dossier, attend que la Sentinelle le voie : « Repéré » encore, le niveau recommence, il est au dossier. Il va à la sortie : l’écran de fin dit Repéré 2.',
        },
        {
          title: 'Pour aller plus loin',
          body:
            '**Le dossier et le point de reprise** vivent dans le GameInstance, à côté du compte : le niveau rouvert ne sait plus rien, le joueur et la sortie le lui redemandent.\n\n' +
            '**Le Line Trace ne voit pas « caché »** : Hidden In Game ne change que l’affichage ; le rayon touche toujours (dans UE aussi). La vision doit donc savoir que le joueur est dans le casier : sa variable Cache. Dans UE, AI Perception a la même limite : on désactive le stimulus du joueur.',
        },
      ],
      objectives: ['Le casier (interface) cache le joueur à la vision.', 'Le dossier, gardé dans le GameInstance : c’est aussi le point de reprise.', 'La sortie et son écran de fin (Repéré : 2).'],
      scenario: HEIST_SCENARIO,
      checks: heistChecks,
      solve: solveHeist,
    },
  ],
);
