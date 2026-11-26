/**
 * Expert project X5 « Le réseau » (V7.69, chantier n° 5, docs/PLAN_EXPERT_FINAL.md,
 * project D). The station's relay room: a grid of relays to turn so that the
 * current goes from the source (west of the first relay) to the exit (east of
 * the last relay of the first row). Each grid is described in a Data Table and
 * generated from a seed.
 *
 * Four milestones (two were planned; at ≈ 190 nodes, two would each take well over an hour):
 * 1. La grille: the network spawns the relays of G1 from DT_Grilles, each
 *    turned by a draw of a Random Stream; E turns the relay under the player.
 * 2. Le courant: which relays the source reaches (a breadth-first walk, a
 *    work list and a Set), recomputed when a relay says it turned (Event Dispatcher).
 * 3. Les coups: the moves left on the screen, « Réseau rétabli » or
 *    « Plus de coups », and the relays locked after.
 * 4. Les salles: a menu level with one button per grid of the table, built in
 *    game; the grid chosen crosses the Open Level in the GameInstance; the best
 *    score of each grid in a Save Game (a Map).
 *
 * Provided: the relay's look (Dessiner) and the neighbour arithmetic (Voisin),
 * so the work is the generation, the walk, the rules and the data. The
 * checks of milestones 1 to 3 play Lvl_Reseau directly (Play from the level
 * open in the editor), so they still hold once the menu is the Game Default Map.
 */
import { levelOf, type Project } from '../../model/project';
import { addDispatcher } from '../../operations/classOps';
import { addDataTable, addDataTableRow } from '../../operations/dataTableOps';
import { addEnum } from '../../operations/enumOps';
import { disconnectPin, removeNodes } from '../../operations/graphOps';
import { addLevel, renameLevel, setGameDefaultMap, setGameInstanceClass } from '../../operations/levelAssetOps';
import { placeActor } from '../../operations/levelOps';
import type { ActorRT } from '../../runtime/world';
import { T } from '../../types/pins';
import { ProjectBuilder, edit, type ClassBuilder } from '../builder';
import { countPrints, noRuntimeErrors, normText, notion, usesNode } from '../checks';
import { withMilestones } from '../milestones';
import type { CheckContext, Lesson, ScenarioStep } from '../types';
import { ensurePlayerInput } from '../ue5Input';
import { shownValue } from './expertArena';
import { EXPERT_RULES } from './expertKit';
import { REDO_NETWORK } from './expertUe5';
import { fnDef, tap } from './kit';
import { playerBlueprint } from './props';
import { makeStruct } from './tables';
import { addW, getW, modeLabel, newClass, onButton } from './umgKit';

export const LEVEL = 'Lvl_Reseau';
export const MENU = 'Lvl_Menu';
const SLOT = 'Reseau';
const FIXED = 'Réseau rétabli';
const NO_MOVES = 'Plus de coups';
const ROW = 'WBP_LigneSalle';
const PLAY = 'Btn_Jouer';
/** Every grid is four relays wide; the first relay's centre, and the distance between two. */
const WIDTH = 4;
const ORIGIN: [number, number] = [-240, -160];
const STEP = 160;
/** E_Forme: the openings of each shape at Quart 0 (0 north, 1 east, 2 south, 3 west). */
const SHAPES = ['Droit', 'Coude', 'Te'];
const BASE: number[][] = [
  [0, 2],
  [0, 1],
  [0, 1, 2],
];

interface Grid {
  row: string;
  name: string;
  shapes: number[];
  seed: number;
  moves: number;
  /** Turns that fix it from its start (relay index, presses), in the order the tests play them. */
  plan: [number, number][];
}
/** The designer's grids: a path from the source to the exit, the rest to mislead; the seed turns them all. */
export const G1: Grid = { row: 'G1', name: 'Salle A', shapes: [1, 2, 1, 0, 1, 0, 1, 0], seed: 9, moves: 8, plan: [[2, 2], [3, 1], [5, 1], [6, 1]] };
export const G2: Grid = { row: 'G2', name: 'Salle B', shapes: [1, 2, 1, 0, 0, 2, 0, 1, 1, 0, 1, 0], seed: 9, moves: 9, plan: [[2, 2], [3, 1], [9, 1], [10, 2]] };
const GRIDS = [G1, G2];

// -------------------------------------------------------------- the model

/** FRandomStream, as the simulator draws it. */
function draws(seed: number, n: number): number[] {
  let s = seed >>> 0;
  return Array.from({ length: n }, () => {
    s = (Math.imul(s, 196314165) + 907633515) >>> 0;
    return Math.trunc(((s >>> 9) / 8388608) * 4);
  });
}
/** The Quart each relay of a grid starts with: one draw per relay, in the order of Formes. */
export const startQuarts = (g: Grid) => draws(g.seed, g.shapes.length);
export const cellAt = (i: number): [number, number] => [ORIGIN[0] + (i % WIDTH) * STEP, ORIGIN[1] + Math.floor(i / WIDTH) * STEP];
const cellName = (i: number) => `(${i % WIDTH}, ${Math.floor(i / WIDTH)})`;
const isOpen = (shape: number, quart: number, side: number) => (BASE[shape] ?? []).includes((((side - quart) % 4) + 4) % 4);
function neighbour(i: number, side: number, n: number): number {
  const c = (i % WIDTH) + [0, 1, 0, -1][side];
  const r = Math.floor(i / WIDTH) + [-1, 0, 1, 0][side];
  const j = r * WIDTH + c;
  return c >= 0 && c < WIDTH && r >= 0 && j < n ? j : -1;
}
/** The relays the source reaches, from shapes and quarters. */
export function reached(shapes: number[], quarts: number[]): Set<number> {
  const seen = new Set<number>();
  const todo: number[] = [];
  if (isOpen(shapes[0], quarts[0], 3)) {
    seen.add(0);
    todo.push(0);
  }
  while (todo.length) {
    const k = todo.shift()!;
    for (let s = 0; s < 4; s++) {
      const v = neighbour(k, s, shapes.length);
      if (v >= 0 && !seen.has(v) && isOpen(shapes[k], quarts[k], s) && isOpen(shapes[v], quarts[v], (s + 2) % 4)) {
        seen.add(v);
        todo.push(v);
      }
    }
  }
  return seen;
}
export const fixed = (shapes: number[], quarts: number[]) => reached(shapes, quarts).has(WIDTH - 1) && isOpen(shapes[WIDTH - 1], quarts[WIDTH - 1], 1);

// -------------------------------------------------------------- the setup

function project(): Project {
  const pb = new ProjectBuilder('Le réseau');
  playerBlueprint(pb);
  const p = pb.project;
  const lv = renameLevel(p, levelOf(p).id, LEVEL);
  if (!lv.ok) throw new Error(lv.reason);
  const e = addEnum(p, 'E_Forme');
  if (!e.ok) throw new Error(e.reason);
  e.value.entries = [...SHAPES];
  const ids = makeStruct(p, 'S_Grille', [
    ['Nom', T.string],
    ['Largeur', T.int],
    ['Formes', T.array(T.enum('E_Forme'))],
    ['Graine', T.int],
    ['Coups', T.int],
  ]);
  const dt = addDataTable(p, 'S_Grille', 'DT_Grilles');
  if (!dt.ok) throw new Error(dt.reason);
  for (const g of GRIDS) addDataTableRow(p, dt.value.id, g.row, { [ids.Nom]: g.name, [ids.Largeur]: WIDTH, [ids.Formes]: [...g.shapes], [ids.Graine]: g.seed, [ids.Coups]: g.moves });
  relayBlueprint(pb);
  const net = networkBlueprint(pb);
  for (const [name, at, color] of [
    ['BP_Source', [ORIGIN[0] - STEP - 60, ORIGIN[1]], '#15803d'],
    ['BP_Sortie', [ORIGIN[0] + WIDTH * STEP + 60, ORIGIN[1]], '#b45309'],
  ] as const) {
    const b = pb.blueprint(name);
    b.component('StaticMesh', 'Borne', { sizeX: 90, sizeY: 90, color, blocks: false });
    b.component('TextRender', 'Panneau', { y: -70, text: name === 'BP_Source' ? 'Source' : 'Sortie' });
    pb.place(b, at[0], at[1]);
  }
  pb.place(net, -560, 260);
  ensurePlayerInput(p, ['E'], { E: 'IA_Interagir' });
  pb.playerStart(0, 330);
  return p;
}

/** BP_Relais: its look (arms, light, turned by Quart) is the station's, written in Dessiner. */
function relayBlueprint(pb: ProjectBuilder): ClassBuilder {
  const p = pb.project;
  const b = pb.blueprint('BP_Relais');
  b.component('StaticMesh', 'Socle', { sizeX: 130, sizeY: 130, color: '#1f2937', blocks: false });
  const arm = { color: '#94a3b8', blocks: false };
  b.component('StaticMesh', 'Bras_N', { ...arm, y: -36, sizeX: 24, sizeY: 72 });
  b.component('StaticMesh', 'Bras_E', { ...arm, x: 36, sizeX: 72, sizeY: 24 });
  b.component('StaticMesh', 'Bras_S', { ...arm, y: 36, sizeX: 24, sizeY: 72 });
  // The light: a yellow dot over the arms (a Point Light's halo would be hidden under the socle, drawn on top of it).
  b.component('StaticMesh', 'Voyant', { shape: 'cylinder', sizeX: 44, sizeY: 44, color: '#facc15', visible: false, blocks: false });
  b.component('BoxCollision', 'Zone', { sizeX: 150, sizeY: 150 });
  const forme = b.variable('Forme', T.enum('E_Forme'), 0);
  const quart = b.variable('Quart', T.int, 0);
  b.variable('Alimente', T.bool, false);
  for (const id of [forme, quart]) Object.assign(b.cls.variables.find((v) => v.id === id)!, { instanceEditable: true, exposeOnSpawn: true });
  // Dessiner: the arms of its shape (at Quart 0: always north; east but for Droit; south but for Coude), turned a quarter per Quart; the light if powered.
  const d = fnDef(p, b, 'Dessiner', [], []);
  const f = d.f;
  let prev = d.entry;
  for (const [i, [armName, shape]] of (
    [
      ['Bras_E', 0],
      ['Bras_S', 1],
    ] as const
  ).entries()) {
    const y = 96 + i * 360;
    const is = f.node('logic.equalEnum', {}, { b: shape }, [200, y + 180]);
    const not = f.node('logic.not', {}, {}, [380, y + 180]);
    const vis = f.node('component.setVisibility', {}, {}, [560, y]);
    f.link(f.node('var.get', { variable: forme }, {}, [40, y + 200]), 'value', is, 'a').link(is, 'result', not, 'a').link(not, 'result', vis, 'visible');
    f.link(prev, 'then', vis, 'exec').target(armName, vis);
    prev = vis;
  }
  const toFloat = f.node('conv.intToFloat', {}, {}, [700, 1000]);
  const times = f.node('math.multiplyFloat', {}, { b: 90 }, [880, 1000]);
  const rot = f.node('math.makeRotator', {}, {}, [1060, 1000]);
  const turn = f.node('actor.setRotation', {}, {}, [1000, 800]);
  f.link(f.node('var.get', { variable: quart }, {}, [520, 1000]), 'value', toFloat, 'in').link(toFloat, 'result', times, 'a').link(times, 'result', rot, 'yaw').link(rot, 'result', turn, 'rotation');
  f.link(prev, 'then', turn, 'exec');
  const light = f.node('component.setVisibility', {}, {}, [1300, 800]);
  f.link(turn, 'then', light, 'exec').link(f.node('var.get', { variable: b.cls.variables.find((v) => v.name === 'Alimente')!.id }, {}, [1100, 1180]), 'value', light, 'visible').target('Voyant', light);
  f.link(light, 'then', d.ret, 'exec');
  // In the editor too: the Construction Script draws it (after the Expose on Spawn values, at a Spawn).
  const cs = b.construction();
  cs.b.link(cs.entry, 'then', cs.b.node('call.function', { graph: d.graph.id }, {}, [360, 96]), 'exec');
  return b;
}

/** BP_Reseau: Largeur, Relais, and the neighbour arithmetic (Voisin), written. */
function networkBlueprint(pb: ProjectBuilder): ClassBuilder {
  const p = pb.project;
  const b = pb.blueprint('BP_Reseau');
  b.component('StaticMesh', 'Console', { sizeX: 120, sizeY: 70, color: '#334155' });
  b.component('TextRender', 'Panneau', { y: -60, text: 'Réseau' });
  const largeur = b.variable('Largeur', T.int, WIDTH);
  const relais = b.variable('Relais', T.array(T.object('BP_Relais')), []);
  // Voisin (Index, Cote): the index of the relay next to Index on that side (0 north, 1 east, 2 south, 3 west), or −1 at the edge.
  const v = fnDef(p, b, 'Voisin', [
    ['Index', T.int],
    ['Cote', T.int],
  ], [['Voisin', T.int]], false);
  v.graph.fn!.pure = true;
  const f = v.f;
  const L = (at: [number, number]) => f.node('var.get', { variable: largeur }, {}, at);
  const col = f.node('math.moduloInt', {}, {}, [300, 200]);
  const row = f.node('math.divideInt', {}, {}, [300, 400]);
  f.link(v.entry, v.pin.Index, col, 'a').link(L([120, 260]), 'value', col, 'b').link(v.entry, v.pin.Index, row, 'a').link(L([120, 460]), 'value', row, 'b');
  const step = (options: number[], at: [number, number]) => {
    const s = f.node('util.select', { options: 4 }, {}, at);
    f.link(v.entry, v.pin.Cote, s, 'index');
    Object.assign(f.graph.nodes[s].defaults, Object.fromEntries(options.map((o, i) => [`option${i}`, o])));
    return s;
  };
  const c2 = f.node('math.addInt', {}, { b: 0 }, [700, 200]);
  const r2 = f.node('math.addInt', {}, { b: 0 }, [700, 420]);
  f.link(col, 'result', c2, 'a').link(step([0, 1, 0, -1], [480, 260]), 'result', c2, 'b');
  f.link(row, 'result', r2, 'a').link(step([-1, 0, 1, 0], [480, 500]), 'result', r2, 'b');
  const rl = f.node('math.multiplyInt', {}, {}, [900, 460]);
  const j = f.node('math.addInt', {}, { b: 0 }, [1080, 400]);
  f.link(r2, 'result', rl, 'a').link(L([760, 560]), 'value', rl, 'b').link(rl, 'result', j, 'a').link(c2, 'result', j, 'b');
  const cmp = (def: string, a: string, bPin: string | number, at: [number, number]) => {
    const n = f.node(def, {}, typeof bPin === 'number' ? { b: bPin } : {}, at);
    f.link(a, 'result', n, 'a');
    if (typeof bPin === 'string') f.link(bPin, bPin === largeurNode ? 'value' : 'result', n, 'b');
    return n;
  };
  const largeurNode = L([900, 80]);
  const len = f.node('array.length', {}, {}, [1080, 640]);
  f.link(f.node('var.get', { variable: relais }, {}, [900, 680]), 'value', len, 'array');
  const okC = cmp('math.greaterEqualInt', c2, 0, [1100, 120]);
  const inC = cmp('math.lessInt', c2, largeurNode, [1100, 220]);
  const okR = cmp('math.greaterEqualInt', r2, 0, [1100, 320]);
  const inJ = f.node('math.lessInt', {}, {}, [1260, 520]);
  f.link(j, 'result', inJ, 'a').link(len, 'result', inJ, 'b');
  const and1 = f.node('logic.and', {}, {}, [1300, 160]);
  const and2 = f.node('logic.and', {}, {}, [1460, 260]);
  const and3 = f.node('logic.and', {}, {}, [1620, 360]);
  f.link(okC, 'result', and1, 'a').link(inC, 'result', and1, 'b').link(and1, 'result', and2, 'a').link(okR, 'result', and2, 'b').link(and2, 'result', and3, 'a').link(inJ, 'result', and3, 'b');
  const pick = f.node('util.select', {}, { option0: -1 }, [1800, 400]);
  f.link(and3, 'result', pick, 'index').link(j, 'result', pick, 'option1').link(pick, 'result', v.ret, v.pin.Voisin);
  return b;
}

// ------------------------------------------------------------------ reading

const cls = (p: Project, name: string) => p.classes.find((c) => c.name === name);
/** A variable of an actor, by name (its class and parents). */
function varOf(cx: CheckContext, a: ActorRT, name: string): unknown {
  const v = cx.sim.classOf(a)?.variables.find((x) => x.name === name);
  return v ? a.vars[v.id] : undefined;
}
/** The relays in play, by their cell index (from where they stand); undefined where none stands. */
function relays(cx: CheckContext, n: number): (ActorRT | undefined)[] {
  const all = cx.sim.actors.filter((a) => a.className === 'BP_Relais' && !a.destroyed);
  return Array.from({ length: n }, (_, i) => {
    const [x, y] = cellAt(i);
    return all.find((a) => Math.hypot(a.x - x, a.y - y) < 6);
  });
}
const relayCount = (cx: CheckContext) => cx.sim.actors.filter((a) => a.className === 'BP_Relais' && !a.destroyed).length;
const quartOf = (cx: CheckContext, a: ActorRT | undefined) => (a ? ((Number(varOf(cx, a, 'Quart')) % 4) + 4) % 4 : Number.NaN);
const shapeOf = (cx: CheckContext, a: ActorRT | undefined) => (a ? Number(varOf(cx, a, 'Forme')) : Number.NaN);
const list = (s: Iterable<number>) => [...s].sort((a, b) => a - b).map(cellName).join(', ') || 'aucun';

/** The grid in play is `g`, as generated from its row: every relay in its cell, its shape, its first Quart. */
function generated(g: Grid, quarts = startQuarts(g)) {
  return (cx: CheckContext): true | string => {
    const n = g.shapes.length;
    const placed = levelOf(cx.project).actors.filter((a) => cx.project.classes.find((c) => c.id === a.classId)?.name === 'BP_Relais');
    if (placed.length) return `${placed.length} BP_Relais posé${placed.length > 1 ? 's' : ''} à la main dans le niveau : la grille se fabrique en jeu, par le réseau (Spawn Actor), à partir de la ligne ${g.row}.`;
    const count = relayCount(cx);
    if (!count) return `Aucun relais en jeu : au lancement, BP_Reseau lit la ligne ${g.row} de DT_Grilles et fait apparaître un BP_Relais par élément de Formes (Spawn Actor from Class).`;
    if (count !== n) return `${count} relais en jeu : la ligne ${g.row} en décrit ${n} (un par élément de Formes), sur ${n / WIDTH} lignes de ${WIDTH}.`;
    const rs = relays(cx, n);
    const miss = rs.findIndex((a) => !a);
    if (miss >= 0) {
      const [x, y] = cellAt(miss);
      return `Pas de relais en (${x}, ${y}), la case ${cellName(miss)}. L’élément i de Formes va en colonne i % Largeur, ligne i / Largeur ; la première case est en (${ORIGIN[0]}, ${ORIGIN[1]}), et deux cases sont à ${STEP} cm l’une de l’autre.`;
    }
    for (let i = 0; i < n; i++) {
      const s = shapeOf(cx, rs[i]);
      if (s !== g.shapes[i]) return `Le relais ${cellName(i)} est un ${SHAPES[s] ?? '?'} : Formes[${i}] dit ${SHAPES[g.shapes[i]]}. Donne-lui sa Forme au Spawn (pin Forme, Expose on Spawn).`;
    }
    const bad = rs.findIndex((a, i) => quartOf(cx, a) !== quarts[i]);
    if (bad >= 0)
      return `Le relais ${cellName(bad)} part avec Quart ${quartOf(cx, rs[bad])}, on attend ${quarts[bad]} : avec la graine ${g.seed} (Make Random Stream gardé dans une variable), un seul tirage Random Integer in Range from Stream (0 à 3) par relais, dans l’ordre de Formes, et aucun autre tirage avant.`;
    return true;
  };
}

/** Each relay's Quart now is its start plus `turns` presses (mod 4): only the relay under the player turned, one quarter a press. */
function turned(g: Grid, turns: Record<number, number>, why: string) {
  return (cx: CheckContext): true | string => {
    const start = startQuarts(g);
    const rs = relays(cx, g.shapes.length);
    const gone = rs.findIndex((a) => !a);
    if (gone >= 0) return `Pas de relais dans la case ${cellName(gone)} : la grille du jalon 1 doit être là.`;
    for (let i = 0; i < rs.length; i++) {
      const want = (start[i] + (turns[i] ?? 0)) % 4;
      const got = quartOf(cx, rs[i]);
      if (got === want) continue;
      if (!turns[i]) return `Le relais ${cellName(i)} a tourné (Quart ${got}, au départ ${start[i]}) alors que le joueur n’était pas dessus : E tourne seulement le relais sous le joueur.`;
      return `Le relais ${cellName(i)} a Quart ${got} ; ${why} on attend ${want}.`;
    }
    const off = rs.find((a) => a && Math.abs((((a.yaw - quartOf(cx, a) * 90) % 360) + 360) % 360) > 1 && Math.abs((((a.yaw - quartOf(cx, a) * 90) % 360) + 360) % 360 - 360) > 1);
    return off ? `Un relais a Quart ${quartOf(cx, off)} mais il est dessiné tourné de ${Math.round(off.yaw)}° : après avoir changé Quart, appelle Dessiner.` : true;
  };
}

// ------------------------------------------------------------- milestone 1

/** No error while playing; an endless walk (from milestone 2 on, it runs at BeginPlay) is explained. */
function noErrors() {
  const base = noRuntimeErrors();
  return {
    ...base,
    test: (cx: CheckContext) => {
      const loop = cx.errors().find((e) => /Infinite loop detected/i.test(e));
      return loop ? `« ${loop} » : la grille a des boucles, et le parcours de Recalculer y tourne sans fin. Avant d’ajouter un voisin à la liste de travail, vérifie qu’il n’est pas déjà dans Visites.` : base.test(cx);
    },
  };
}

const playAt = (i: number): ScenarioStep[] => [{ teleport: cellAt(i) }, { wait: 0.1 }];
const presses = (n: number): ScenarioStep[] => Array.from({ length: n }, () => [...tap('E'), { wait: 0.05 }]).flat();
/** Stop, Play again, in Lvl_Reseau: the checks of milestones 1 to 3 play the grid's level directly, as Play from the level open in the editor. */
const PLAY_GRID: ScenarioStep[] = [{ restart: true, level: LEVEL }, { wait: 0.3 }];

function solveGrid(p: Project): void {
  const net = edit(p, 'BP_Reseau');
  const relay = edit(p, 'BP_Relais');
  const s = p.structs.find((x) => x.name === 'S_Grille')!;
  const m = (n: string) => s.members.find((x) => x.name === n)!.id;
  const table = p.dataTables.find((t) => t.name === 'DT_Grilles')!.id;
  const flux = net.variable('Flux', T.struct('RandomStream'), { initial: 0, seed: 0 });
  const largeur = net.cls.variables.find((v) => v.name === 'Largeur')!.id;
  const relais = net.cls.variables.find((v) => v.name === 'Relais')!.id;
  const forme = relay.cls.variables.find((v) => v.name === 'Forme')!.id;
  const quart = relay.cls.variables.find((v) => v.name === 'Quart')!.id;
  // BeginPlay: the row G1, its width, its seed; then one relay per shape.
  const begin = net.node('event.beginPlay', {}, {}, [64, 96]);
  const row = net.node('dataTable.getRow', { table }, { rowName: G1.row }, [340, 96]);
  const brk = net.node('struct.break', { struct: 'S_Grille' }, {}, [620, 340]);
  const setL = net.node('var.set', { variable: largeur }, {}, [700, 96]);
  const stream = net.node('random.makeStream', {}, {}, [900, 340]);
  const setF = net.node('var.set', { variable: flux }, {}, [1000, 96]);
  const loop = net.node('flow.forEachLoop', {}, {}, [1300, 96]);
  net.link(begin, 'then', row, 'exec').link(row, 'row', brk, 'struct').link(row, 'found', setL, 'exec').link(brk, m('Largeur'), setL, 'value');
  net.link(setL, 'then', setF, 'exec').link(brk, m('Graine'), stream, 'seed').link(stream, 'result', setF, 'value');
  net.link(setF, 'then', loop, 'exec').link(brk, m('Formes'), loop, 'array');
  // Where: column Index % Largeur, row Index / Largeur, 160 cm apart from the first cell.
  const L = (at: [number, number]) => net.node('var.get', { variable: largeur }, {}, at);
  const col = net.node('math.moduloInt', {}, {}, [1400, 500]);
  const line = net.node('math.divideInt', {}, {}, [1400, 640]);
  const fx = net.node('conv.intToFloat', {}, {}, [1560, 500]);
  const fy = net.node('conv.intToFloat', {}, {}, [1560, 640]);
  const vec = net.node('math.makeVector', {}, {}, [1720, 560]);
  const scaled = net.node('math.multiplyVectorFloat', {}, { b: STEP }, [1900, 560]);
  const where = net.node('math.addVector', {}, { b: { x: ORIGIN[0], y: ORIGIN[1], z: 0 } }, [2080, 520]);
  net.link(loop, 'index', col, 'a').link(L([1240, 560]), 'value', col, 'b').link(loop, 'index', line, 'a').link(L([1240, 700]), 'value', line, 'b');
  net.link(col, 'result', fx, 'in').link(line, 'result', fy, 'in').link(fx, 'result', vec, 'x').link(fy, 'result', vec, 'y').link(vec, 'result', scaled, 'a').link(scaled, 'result', where, 'a');
  // The relay: its shape, and a quarter drawn from the stream.
  const draw = net.node('random.intInRangeFromStream', {}, { min: 0, max: 3 }, [2100, 760]);
  net.link(net.node('var.get', { variable: flux }, {}, [1900, 820]), 'value', draw, 'stream');
  const spawn = net.node('actor.spawn', {}, { class: relay.cls.id }, [2300, 96]);
  net.link(loop, 'body', spawn, 'exec').link(where, 'result', spawn, 'location').link(loop, 'element', spawn, `expose:${forme}`).link(draw, 'result', spawn, `expose:${quart}`);
  const add = net.node('array.add', {}, {}, [2700, 96]);
  net.link(spawn, 'then', add, 'exec').link(net.node('var.get', { variable: relais }, {}, [2500, 300]), 'value', add, 'array').link(spawn, 'result', add, 'item');

  // BP_Relais › Tourner: a quarter more (back to 0 after 3), and draw it again.
  const dessiner = relay.cls.graphs.find((g) => g.name === 'Dessiner')!;
  const ev = relay.node('event.custom', { name: 'Tourner' }, {}, [64, 96]);
  const plus = relay.node('math.addInt', {}, { b: 1 }, [300, 300]);
  const mod = relay.node('math.moduloInt', {}, { b: 4 }, [460, 300]);
  const set = relay.node('var.set', { variable: quart }, {}, [600, 96]);
  const draw2 = relay.node('call.function', { graph: dessiner.id }, {}, [900, 96]);
  relay.link(relay.node('var.get', { variable: quart }, {}, [120, 300]), 'value', plus, 'a').link(plus, 'result', mod, 'a').link(mod, 'result', set, 'value');
  relay.link(ev, 'then', set, 'exec').link(set, 'then', draw2, 'exec');

  // The player: E turns the relay it stands on.
  const pl = edit(p, 'BP_Joueur');
  const press = pl.node('input.action', { action: p.inputActions.find((a) => a.name === 'IA_Interagir')!.id }, {}, [64, 96]);
  const over = pl.node('actor.getOverlappingActors', {}, {}, [340, 96]);
  const each = pl.node('flow.forEachLoop', {}, {}, [640, 96]);
  const cast = pl.node('cast.to', { class: relay.cls.id }, {}, [940, 96]);
  const call = pl.node('call.custom', { owner: relay.cls.id, event: 'Tourner' }, {}, [1240, 96]);
  pl.link(press, 'started', over, 'exec').link(over, 'then', each, 'exec').link(over, 'actors', each, 'array');
  pl.link(each, 'body', cast, 'exec').link(each, 'element', cast, 'object').link(cast, 'then', call, 'exec').link(cast, 'as', call, 'target');
}

/** Milestone 1: the grid at the start; E four times on (1, 0), then once on (3, 1). */
const GRID_SCENARIO: ScenarioStep[] = [...PLAY_GRID, { checkpoint: 'grille' }, ...playAt(1), ...presses(1), { checkpoint: 'tour1' }, ...presses(3), { checkpoint: 'tour4' }, ...playAt(7), ...presses(1), { checkpoint: 'tour5' }];

const gridChecks = [
  { id: 'grid', label: `Au lancement, la grille ${G1.row} : ${G1.shapes.length} relais, chacun dans sa case, avec sa Forme et le Quart tiré de la graine`, at: 'grille', test: generated(G1) },
  { id: 'turn', label: 'E sur un relais le tourne d’un quart, et lui seul', at: 'tour1', test: turned(G1, { 1: 1 }, 'un appui (Started) le tourne d’un quart :') },
  { id: 'cycle', label: 'Quatre appuis le ramènent comme au départ (Quart revient à 0 après 3)', at: 'tour4', test: turned(G1, {}, 'après 3, Quart revient à 0 (% 4) :') },
  { id: 'other', label: 'Sur un autre relais, E tourne celui-là', at: 'tour5', test: turned(G1, { 7: 1 }, 'E tourne le relais que le joueur chevauche :') },
  {
    id: 'player-only',
    label: 'Seul le joueur réagit à IA_Interagir',
    test: (cx: CheckContext) => {
      const own = cx.project.classes.filter((c) => c.name !== 'BP_Joueur' && cx.nodes(c.name).some((n) => n.def === 'input.action' || n.def === 'event.inputKey'));
      return own.length ? `${own.map((c) => c.name).join(', ')} écoute${own.length > 1 ? 'nt' : ''} une entrée : c’est le joueur qui appuie sur E ; un relais sait seulement tourner.` : true;
    },
  },
  notion(usesNode('stream', 'BP_Reseau', ['random.intInRangeFromStream'], 'Les quarts sont tirés d’un Random Stream', 'Tire les quarts d’un Random Stream (Make Random Stream avec la Graine de la ligne) : la même graine redonne la même grille.')),
  notion(usesNode('data', 'BP_Reseau', ['dataTable.getRow'], 'La grille vient de DT_Grilles', 'Lis la grille dans DT_Grilles (Get Data Table Row) : une nouvelle grille, c’est une ligne de plus, sans toucher au graphe.')),
  noErrors(),
];


// ------------------------------------------------------------- milestone 2

function solveCurrent(p: Project): void {
  const net = edit(p, 'BP_Reseau');
  const relay = edit(p, 'BP_Relais');
  const quart = relay.cls.variables.find((v) => v.name === 'Quart')!.id;
  const forme = relay.cls.variables.find((v) => v.name === 'Forme')!.id;
  const alimente = relay.cls.variables.find((v) => v.name === 'Alimente')!.id;
  const dessiner = relay.cls.graphs.find((g) => g.name === 'Dessiner')!;

  // BP_Relais › Ouvert (Cote): is this side open, given its shape and how far it is turned?
  const o = fnDef(p, relay, 'Ouvert', [['Cote', T.int]], [['Ouvert', T.bool]]);
  o.graph.fn!.pure = true;
  const f = o.f;
  const minus = f.node('math.subtractInt', {}, {}, [200, 400]);
  const plus = f.node('math.addInt', {}, { b: 4 }, [380, 400]);
  const local = f.node('math.moduloInt', {}, { b: 4 }, [560, 400]);
  f.link(o.entry, o.pin.Cote, minus, 'a').link(f.node('var.get', { variable: quart }, {}, [40, 460]), 'value', minus, 'b').link(minus, 'result', plus, 'a').link(plus, 'result', local, 'a');
  const sw = f.node('flow.switchEnum', { enum: 'E_Forme' }, {}, [300, 96]);
  f.link(o.entry, 'then', sw, 'exec').link(f.node('var.get', { variable: forme }, {}, [100, 200]), 'value', sw, 'selection');
  // Droit: north and south (an even side once turned back); Coude: north and east (0 or 1); Te: all but west (not 3).
  const ret = (pin: string, at: [number, number], value: string) => {
    const r = pin === 'case0' ? o.ret : f.node('fn.return', { graph: o.graph.id }, {}, at);
    if (pin === 'case0') Object.assign(f.graph.nodes[r], { x: at[0], y: at[1] });
    f.link(sw, pin, r, 'exec').link(value, 'result', r, o.pin.Ouvert);
  };
  const even = f.node('math.moduloInt', {}, { b: 2 }, [760, 300]);
  const zero = f.node('math.equalInt', {}, { b: 0 }, [920, 300]);
  f.link(local, 'result', even, 'a').link(even, 'result', zero, 'a');
  ret('case0', [1100, 0], zero);
  const low = f.node('math.lessEqualInt', {}, { b: 1 }, [920, 480]);
  f.link(local, 'result', low, 'a');
  ret('case1', [1100, 240], low);
  const notWest = f.node('math.notEqualInt', {}, { b: 3 }, [920, 640]);
  f.link(local, 'result', notWest, 'a');
  ret('case2', [1100, 480], notWest);

  // BP_Relais › OnTourne: told after each turn; it does not know who listens.
  const onTurn = addDispatcher(relay.cls, 'OnTourne');
  const drawn = Object.values(relay.graph.nodes).find((n) => n.def === 'call.function' && n.config.graph === dessiner.id && n.y === 96)!;
  relay.link(drawn.id, 'then', relay.node('dispatcher.call', { owner: relay.cls.id, dispatcher: onTurn.id }, {}, [1200, 96]), 'exec');

  // BP_Reseau: the walk's variables.
  const visites = net.variable('Visites', T.set(T.int), []);
  const afaire = net.variable('AFaire', T.array(T.int), []);
  const courant = net.variable('Courant', T.int, 0);
  const relaisVar = net.cls.variables.find((v) => v.name === 'Relais')!.id;
  const get = (id: string, at: [number, number]) => net.node('var.get', { variable: id }, {}, at);
  const voisin = net.cls.graphs.find((g) => g.name === 'Voisin')!;
  const ouvert = (target: string, tPin: string, side: string | number, sPin: string, at: [number, number]) => {
    const n = net.node('call.pureFunction', { owner: relay.cls.id, graph: o.graph.id }, typeof side === 'number' ? { [o.pin.Cote]: side } : {}, at);
    net.link(target, tPin, n, 'target');
    if (typeof side === 'string') net.link(side, sPin, n, o.pin.Cote);
    return n;
  };

  // Each new relay is listened to; once all are there, a first walk.
  const spawn = Object.values(net.graph.nodes).find((n) => n.def === 'actor.spawn')!;
  const add = Object.values(net.graph.nodes).find((n) => n.def === 'array.add')!;
  const loop = Object.values(net.graph.nodes).find((n) => n.def === 'flow.forEachLoop')!;
  disconnectPin(net.graph, { node: spawn.id, pin: 'then' });
  const heard = net.node('event.custom', { name: 'Tourne', signature: onTurn.id, signatureOwner: relay.cls.id }, {}, [64, 1000]);
  const bind = net.node('dispatcher.bind', { owner: relay.cls.id, dispatcher: onTurn.id }, {}, [2500, -100]);
  net.link(spawn.id, 'then', bind, 'exec').link(spawn.id, 'result', bind, 'target').link(heard, 'delegate', bind, 'event').link(bind, 'then', add.id, 'exec');
  add.x = 2800;
  net.link(loop.id, 'completed', net.node('call.custom', { event: 'Recalculer' }, {}, [1600, -160]), 'exec');
  net.link(heard, 'then', net.node('call.custom', { event: 'Recalculer' }, {}, [400, 1000]), 'exec');

  // Recalculer: from the first relay (if its west side is open), relay to relay, each one once.
  const y0 = 1400;
  const ev = net.node('event.custom', { name: 'Recalculer' }, {}, [64, y0]);
  const clearV = net.node('set.clear', {}, {}, [300, y0]);
  const clearA = net.node('array.clear', {}, {}, [540, y0]);
  const first = net.node('array.get', {}, { index: 0 }, [600, y0 + 260]);
  const firstOpen = ouvert(first, 'item', 3, '', [800, y0 + 260]);
  const startB = net.node('flow.branch', {}, {}, [800, y0]);
  const seeFirst = net.node('set.add', {}, { item: 0 }, [1040, y0]);
  const queueFirst = net.node('array.add', {}, { item: 0 }, [1280, y0]);
  net.link(ev, 'then', clearV, 'exec').link(get(visites, [160, y0 + 200]), 'value', clearV, 'set');
  net.link(clearV, 'then', clearA, 'exec').link(get(afaire, [400, y0 + 200]), 'value', clearA, 'array');
  net.link(get(relaisVar, [440, y0 + 300]), 'value', first, 'array').link(clearA, 'then', startB, 'exec').link(firstOpen, o.pin.Ouvert, startB, 'condition');
  net.link(startB, 'true', seeFirst, 'exec').link(get(visites, [900, y0 + 180]), 'value', seeFirst, 'set').link(seeFirst, 'then', queueFirst, 'exec').link(get(afaire, [1140, y0 + 180]), 'value', queueFirst, 'array');
  const whileL = net.node('flow.whileLoop', {}, {}, [1560, y0]);
  const left = net.node('array.length', {}, {}, [1300, y0 + 260]);
  const more = net.node('math.greaterInt', {}, { b: 0 }, [1440, y0 + 260]);
  net.link(queueFirst, 'then', whileL, 'exec').link(get(afaire, [1140, y0 + 300]), 'value', left, 'array').link(left, 'result', more, 'a').link(more, 'result', whileL, 'condition');
  // Take the first of the list, look at its four sides.
  const head = net.node('array.get', {}, { index: 0 }, [1700, y0 + 400]);
  const take = net.node('var.set', { variable: courant }, {}, [1840, y0]);
  const pop = net.node('array.removeIndex', {}, { index: 0 }, [2100, y0]);
  const sides = net.node('flow.forLoop', {}, { first: 0, last: 3 }, [2360, y0]);
  net.link(whileL, 'body', take, 'exec').link(get(afaire, [1560, y0 + 420]), 'value', head, 'array').link(head, 'item', take, 'value');
  net.link(take, 'then', pop, 'exec').link(get(afaire, [1960, y0 + 200]), 'value', pop, 'array').link(pop, 'then', sides, 'exec');
  const next = net.node('call.pureFunction', { graph: voisin.id }, {}, [2500, y0 + 300]);
  net.link(get(courant, [2340, y0 + 300]), 'value', next, voisin.fn!.inputs[0].id).link(sides, 'index', next, voisin.fn!.inputs[1].id);
  const vOut = voisin.fn!.outputs[0].id;
  const exists = net.node('math.greaterEqualInt', {}, { b: 0 }, [2700, y0 + 300]);
  const hasV = net.node('flow.branch', {}, {}, [2700, y0]);
  net.link(sides, 'body', hasV, 'exec').link(next, vOut, exists, 'a').link(exists, 'result', hasV, 'condition');
  // The current relay open on that side, the neighbour open on the side facing it, and not seen yet.
  const here = net.node('array.get', {}, {}, [2800, y0 + 500]);
  net.link(get(relaisVar, [2620, y0 + 560]), 'value', here, 'array').link(get(courant, [2620, y0 + 640]), 'value', here, 'index');
  const hereOpen = ouvert(here, 'item', sides, 'index', [3000, y0 + 500]);
  const there = net.node('array.get', {}, {}, [2800, y0 + 720]);
  net.link(get(relaisVar, [2620, y0 + 780]), 'value', there, 'array').link(next, vOut, there, 'index');
  const facing = net.node('math.addInt', {}, { b: 2 }, [2800, y0 + 900]);
  const facingMod = net.node('math.moduloInt', {}, { b: 4 }, [2960, y0 + 900]);
  net.link(sides, 'index', facing, 'a').link(facing, 'result', facingMod, 'a');
  const thereOpen = ouvert(there, 'item', facingMod, 'result', [3140, y0 + 720]);
  const seen = net.node('set.contains', {}, {}, [3140, y0 + 940]);
  const fresh = net.node('logic.not', {}, {}, [3320, y0 + 940]);
  net.link(get(visites, [2960, y0 + 1020]), 'value', seen, 'set').link(next, vOut, seen, 'item').link(seen, 'result', fresh, 'a');
  const both = net.node('logic.and', {}, {}, [3360, y0 + 560]);
  const all = net.node('logic.and', {}, {}, [3520, y0 + 700]);
  net.link(hereOpen, o.pin.Ouvert, both, 'a').link(thereOpen, o.pin.Ouvert, both, 'b').link(both, 'result', all, 'a').link(fresh, 'result', all, 'b');
  const passes = net.node('flow.branch', {}, {}, [3000, y0]);
  const see = net.node('set.add', {}, {}, [3300, y0]);
  const queue = net.node('array.add', {}, {}, [3600, y0]);
  net.link(hasV, 'true', passes, 'exec').link(all, 'result', passes, 'condition');
  net.link(passes, 'true', see, 'exec').link(get(visites, [3140, y0 + 180]), 'value', see, 'set').link(next, vOut, see, 'item');
  net.link(see, 'then', queue, 'exec').link(get(afaire, [3440, y0 + 180]), 'value', queue, 'array').link(next, vOut, queue, 'item');
  // Then every relay: powered if the walk reached it.
  const apply = net.node('flow.forEachLoop', {}, {}, [1800, y0 + 1300]);
  const setOn = net.node('var.setExternal', { owner: relay.cls.id, variable: alimente }, {}, [2100, y0 + 1300]);
  const isIn = net.node('set.contains', {}, {}, [1980, y0 + 1500]);
  const redraw = net.node('call.function', { owner: relay.cls.id, graph: dessiner.id }, {}, [2400, y0 + 1300]);
  net.link(whileL, 'completed', apply, 'exec').link(startB, 'false', apply, 'exec').link(get(relaisVar, [1600, y0 + 1500]), 'value', apply, 'array');
  net.link(apply, 'body', setOn, 'exec').link(apply, 'element', setOn, 'target').link(get(visites, [1800, y0 + 1560]), 'value', isIn, 'set').link(apply, 'index', isIn, 'item').link(isIn, 'result', setOn, 'value');
  net.link(setOn, 'then', redraw, 'exec').link(apply, 'element', redraw, 'target');
}

/** The relays powered now: each one's Alimente, by cell. */
const poweredNow = (cx: CheckContext, n: number) => new Set(relays(cx, n).flatMap((a, i) => (a && varOf(cx, a, 'Alimente') === true ? [i] : [])));
/** What the source reaches in the grid as it stands now (its shapes and quarters, read from the relays in play). */
function expectedNow(cx: CheckContext, n: number): Set<number> {
  const rs = relays(cx, n);
  return reached(
    rs.map((a) => shapeOf(cx, a)),
    rs.map((a) => quartOf(cx, a)),
  );
}

function current(g: Grid, when: string) {
  return (cx: CheckContext): true | string => {
    const errs = cx.errors();
    if (errs.some((e) => /infinite|boucle/i.test(e)))
      return 'Le jeu s’est arrêté sur « Infinite loop detected » : la grille a des boucles, et le parcours y tourne sans fin. Avant d’ajouter un voisin à la liste de travail, vérifie qu’il n’est pas déjà dans Visites.';
    const n = g.shapes.length;
    if (relays(cx, n).some((a) => !a)) return 'La grille du jalon 1 n’est plus là.';
    const got = poweredNow(cx, n);
    const want = expectedNow(cx, n);
    if ([...want].every((i) => got.has(i)) && got.size === want.size) return true;
    const extra = [...got].filter((i) => !want.has(i));
    const missing = [...want].filter((i) => !got.has(i));
    const why = extra.length
      ? `${list(extra)} ${extra.length > 1 ? 'sont alimentés' : 'est alimenté'} sans que le courant puisse y arriver : il passe d’un relais à son voisin seulement si le côté de l’un et le côté d’en face de l’autre sont ouverts (Ouvert (Cote) sur le premier, Ouvert ((Cote + 2) % 4) sur le voisin).`
      : `${list(missing)} ${missing.length > 1 ? 'devraient être alimentés' : 'devrait être alimenté'}. Le courant entre par l’ouest du relais (0, 0) s’il y est ouvert, puis de voisin en voisin.`;
    return `${when} : alimentés ${list(got)} ; attendu ${list(want)}. ${why}`;
  };
}

/** Milestone 2: the grid as it starts, then each relay of the path turned in place. */
function fixScenario(g: Grid): ScenarioStep[] {
  return g.plan.flatMap(([i, k], n) => [...playAt(i), ...presses(k), { wait: 0.05 }, { checkpoint: `${g.row}-${n + 1}` } as ScenarioStep]);
}
const CURRENT_SCENARIO: ScenarioStep[] = [...PLAY_GRID, { checkpoint: 'c0' }, ...fixScenario(G1)];

const currentChecks = [
  { id: 'start', label: 'Au lancement, seuls les relais que la source atteint sont alimentés', at: 'c0', test: current(G1, 'Au lancement') },
  ...G1.plan.map(([i], n) => ({
    id: `turn-${n + 1}`,
    label: n === 0 ? 'Après chaque relais tourné, le courant est recalculé aussitôt' : `Puis le relais ${cellName(i)} tourné : le courant suit`,
    at: `${G1.row}-${n + 1}`,
    test: current(G1, `Après le relais ${cellName(i)}`),
  })),
  {
    id: 'exit',
    label: `Une fois la grille réparée, le courant atteint le relais ${cellName(WIDTH - 1)}, devant la sortie`,
    at: `${G1.row}-${G1.plan.length}`,
    test: (cx: CheckContext) => (poweredNow(cx, G1.shapes.length).has(WIDTH - 1) ? true : `Le relais ${cellName(WIDTH - 1)} n’est pas alimenté alors que le chemin est fait.`),
  },
  notion(usesNode('seen', 'BP_Reseau', ['set.contains'], 'Le parcours se souvient des relais déjà vus', 'Teste « déjà dans Visites ? » (Contains) avant d’ajouter un relais à la liste de travail.')),
  notion(usesNode('told', 'BP_Relais', ['dispatcher.call'], 'Le relais prévient qu’il a tourné (Event Dispatcher)', 'Le relais ne connaît pas le réseau : il appelle son Event Dispatcher OnTourne, et le réseau, qui l’a créé, s’y abonne (Bind Event).')),
  noErrors(),
];


// ------------------------------------------------------------- milestone 3

function solveMoves(p: Project): void {
  const net = edit(p, 'BP_Reseau');
  const relay = edit(p, 'BP_Relais');
  const s = p.structs.find((x) => x.name === 'S_Grille')!;
  const m = (n: string) => s.members.find((x) => x.name === n)!.id;
  const ouvert = relay.cls.graphs.find((g) => g.name === 'Ouvert')!;
  const largeur = net.cls.variables.find((v) => v.name === 'Largeur')!.id;
  const relaisVar = net.cls.variables.find((v) => v.name === 'Relais')!.id;
  const visites = net.cls.variables.find((v) => v.name === 'Visites')!.id;
  const get = (id: string, at: [number, number]) => net.node('var.get', { variable: id }, {}, at);
  const nodeWhere = (b: ClassBuilder, ok: (n: { def: string; config: Record<string, unknown>; x: number; y: number }) => boolean) => Object.values(b.graph.nodes).find(ok)!;

  // BP_Relais: a locked relay no longer turns.
  const bloque = relay.variable('Bloque', T.bool, false);
  const turnEv = nodeWhere(relay, (n) => n.def === 'event.custom' && n.config.name === 'Tourner');
  const firstSet = nodeWhere(relay, (n) => n.def === 'var.set' && n.config.variable === relay.cls.variables.find((v) => v.name === 'Quart')!.id);
  disconnectPin(relay.graph, { node: turnEv.id, pin: 'then' });
  const locked = relay.node('flow.branch', {}, {}, [300, -100]);
  relay.link(turnEv.id, 'then', locked, 'exec').link(relay.node('var.get', { variable: bloque }, {}, [140, -40]), 'value', locked, 'condition').link(locked, 'false', firstSet.id, 'exec');

  // WBP_Coups: the moves left, at the top left of the screen.
  const w = newClass(p, 'WBP_Coups', 'UserWidget');
  const canvas = addW(p, w.cls, 'CanvasPanel', undefined);
  addW(p, w.cls, 'TextBlock', canvas.id, { name: 'Txt_Coups', isVariable: true, props: { text: 'Coups : 0', fontSize: 30, color: '#fde68a' }, slot: { offsets: [32, 24, 320, 50] } });
  const maj = fnDef(p, w, 'MettreAJour', [['Restants', T.int]], []);
  const toText = maj.f.node('conv.intToText', {}, {}, [200, 300]);
  const fmt = maj.f.node('text.format', {}, { format: 'Coups : {N}' }, [400, 300]);
  const setText = maj.f.node('widget.setText', {}, {}, [600, 96]);
  maj.f.link(maj.entry, maj.pin.Restants, toText, 'in').link(toText, 'result', fmt, 'arg:N').link(fmt, 'result', setText, 'text');
  maj.f.link(maj.entry, 'then', setText, 'exec').link(getW(maj.f, 'Txt_Coups', [400, 180]), 'value', setText, 'target').link(setText, 'then', maj.ret, 'exec');

  // BP_Reseau: Coups from the row, on the screen from the start.
  const coups = net.variable('Coups', T.int, 0);
  const ecran = net.variable('Ecran', T.object('WBP_Coups'));
  const setF = nodeWhere(net, (n) => n.def === 'var.set' && n.config.variable === net.cls.variables.find((v) => v.name === 'Flux')!.id);
  const brk = nodeWhere(net, (n) => n.def === 'struct.break');
  const loop = nodeWhere(net, (n) => n.def === 'flow.forEachLoop' && n.x === 1300);
  disconnectPin(net.graph, { node: setF.id, pin: 'then' });
  const setC = net.node('var.set', { variable: coups }, {}, [1000, -300]);
  const make = net.node('widget.create', {}, { class: w.cls.id }, [1250, -300]);
  const view = net.node('widget.addToViewport', {}, {}, [1500, -300]);
  const keep = net.node('var.set', { variable: ecran }, {}, [1750, -300]);
  const show = net.node('call.function', { owner: w.cls.id, graph: maj.graph.id }, {}, [2000, -300]);
  net.link(setF.id, 'then', setC, 'exec').link(brk.id, m('Coups'), setC, 'value').link(setC, 'then', make, 'exec').link(net.node('player.getController', {}, {}, [1100, -120]), 'result', make, 'owner');
  net.link(make, 'then', view, 'exec').link(make, 'result', view, 'target').link(view, 'then', keep, 'exec').link(make, 'result', keep, 'value');
  net.link(keep, 'then', show, 'exec').link(keep, 'out', show, 'target').link(setC, 'out', show, maj.pin.Restants).link(show, 'then', loop.id, 'exec');

  // A relay turned: one move less, on the screen, then the walk.
  const heard = nodeWhere(net, (n) => n.def === 'event.custom' && n.config.name === 'Tourne');
  const recalc = nodeWhere(net, (n) => n.def === 'call.custom' && n.config.event === 'Recalculer' && n.y === 1000);
  disconnectPin(net.graph, { node: heard.id, pin: 'then' });
  const less = net.node('var.decrementInt', {}, {}, [300, 1100]);
  const show2 = net.node('call.function', { owner: w.cls.id, graph: maj.graph.id }, {}, [560, 1100]);
  net.link(heard.id, 'then', less, 'exec').link(get(coups, [160, 1260]), 'value', less, 'value').link(less, 'then', show2, 'exec').link(get(ecran, [400, 1260]), 'value', show2, 'target').link(less, 'result', show2, maj.pin.Restants);
  net.link(show2, 'then', recalc.id, 'exec');
  recalc.x = 860;
  recalc.y = 1100;

  // After the walk: the exit reached, or no move left. Then every relay is locked.
  const apply = nodeWhere(net, (n) => n.def === 'flow.forEachLoop' && n.x === 1800);
  const y = 3000;
  const last = net.node('math.subtractInt', {}, { b: 1 }, [1900, y + 200]);
  const reachedLast = net.node('set.contains', {}, {}, [2100, y + 200]);
  const lastRelay = net.node('array.get', {}, {}, [2100, y + 360]);
  const eastOpen = net.node('call.pureFunction', { owner: relay.cls.id, graph: ouvert.id }, { [ouvert.fn!.inputs[0].id]: 1 }, [2300, y + 360]);
  const out = net.node('logic.and', {}, {}, [2500, y + 260]);
  net.link(get(largeur, [1740, y + 220]), 'value', last, 'a').link(get(visites, [1900, y + 120]), 'value', reachedLast, 'set').link(last, 'result', reachedLast, 'item');
  net.link(get(relaisVar, [1900, y + 420]), 'value', lastRelay, 'array').link(last, 'result', lastRelay, 'index').link(lastRelay, 'item', eastOpen, 'target');
  net.link(reachedLast, 'result', out, 'a').link(eastOpen, ouvert.fn!.outputs[0].id, out, 'b');
  const done = net.node('flow.branch', {}, {}, [2200, y]);
  const win = net.node('debug.printString', {}, { text: FIXED }, [2500, y - 100]);
  const lockA = net.node('call.custom', { event: 'Verrouiller' }, {}, [2800, y - 100]);
  const none = net.node('math.lessEqualInt', {}, { b: 0 }, [2500, y + 500]);
  const out2 = net.node('flow.branch', {}, {}, [2500, y + 100]);
  const lose = net.node('debug.printString', {}, { text: NO_MOVES }, [2800, y + 100]);
  const lockB = net.node('call.custom', { event: 'Verrouiller' }, {}, [3100, y + 100]);
  net.link(apply.id, 'completed', done, 'exec').link(out, 'result', done, 'condition').link(done, 'true', win, 'exec').link(win, 'then', lockA, 'exec');
  net.link(done, 'false', out2, 'exec').link(get(coups, [2340, y + 560]), 'value', none, 'a').link(none, 'result', out2, 'condition').link(out2, 'true', lose, 'exec').link(lose, 'then', lockB, 'exec');
  const lockEv = net.node('event.custom', { name: 'Verrouiller' }, {}, [64, y + 800]);
  const each = net.node('flow.forEachLoop', {}, {}, [360, y + 800]);
  const setB = net.node('var.setExternal', { owner: relay.cls.id, variable: bloque }, { value: true }, [700, y + 800]);
  net.link(lockEv, 'then', each, 'exec').link(get(relaisVar, [200, y + 1000]), 'value', each, 'array').link(each, 'body', setB, 'exec').link(each, 'element', setB, 'target');
}

/** The number shown after « Coups » on the screen. */
function movesShown(n: number, why: string) {
  return (cx: CheckContext): true | string => {
    const v = shownValue(cx, 'Coups');
    if (v === undefined) return `Pas de « Coups » à l’écran : un widget montre les coups restants dès le lancement (par exemple « Coups : ${G1.moves} »).`;
    return v === String(n) ? true : `L’écran montre Coups ${v || '(vide)'} : on attend ${n}. ${why}`;
  };
}

/** Milestone 3: the grid fixed in 5 moves, then E refused; a second game spends all 8 moves on (3, 1). */
const MOVES_SCENARIO: ScenarioStep[] = [
  ...PLAY_GRID,
  { checkpoint: 'm0' },
  ...fixScenario(G1),
  ...playAt(7),
  ...presses(2),
  { wait: 0.1 },
  { checkpoint: 'apres' },
  ...PLAY_GRID,
  ...playAt(7),
  ...presses(G1.moves),
  { wait: 0.1 },
  { checkpoint: 'vide' },
  ...presses(1),
  { wait: 0.1 },
  { checkpoint: 'vide2' },
];
const spent = (k: number) => G1.plan.slice(0, k).reduce((a, [, n]) => a + n, 0);

const moveChecks = [
  { id: 'screen', label: `Au lancement, les coups de la ligne à l’écran : Coups ${G1.moves}`, at: 'm0', test: movesShown(G1.moves, 'Coups vient de la ligne de la grille (colonne Coups).') },
  { id: 'count', label: 'Chaque relais tourné coûte un coup, aussitôt à l’écran', at: `${G1.row}-2`, test: movesShown(G1.moves - spent(2), 'Un appui qui tourne un relais enlève un coup, et l’écran suit.') },
  {
    id: 'fixed',
    label: `Le courant atteint la sortie : « ${FIXED} », une fois`,
    at: `${G1.row}-${G1.plan.length}`,
    test: (cx: CheckContext) => {
      const n = countPrints(cx, FIXED);
      if (n !== 1) return n ? `${n} « ${FIXED} » : on n’en attend qu’un, quand le courant atteint la sortie.` : `Pas de « ${FIXED} » alors que le courant sort : le relais ${cellName(WIDTH - 1)} est atteint et ouvert à l’est (Ouvert (1)).`;
      if (countPrints(cx, NO_MOVES)) return `« ${NO_MOVES} » alors qu’il en reste : seulement quand Coups tombe à 0 sans que le réseau soit rétabli.`;
      return movesShown(G1.moves - spent(G1.plan.length), '')(cx);
    },
  },
  {
    id: 'locked',
    label: 'Le réseau rétabli, E ne tourne plus rien et ne coûte plus de coup',
    at: 'apres',
    test: (cx: CheckContext) => {
      const r = relays(cx, G1.shapes.length)[7];
      if (!r) return 'La grille du jalon 1 n’est plus là.';
      if (quartOf(cx, r) !== startQuarts(G1)[7]) return `Le relais ${cellName(7)} a encore tourné après « ${FIXED} » : une fois le réseau rétabli, chaque relais est bloqué.`;
      return movesShown(G1.moves - spent(G1.plan.length), 'Un relais bloqué ne tourne pas, et ne coûte rien.')(cx);
    },
  },
  {
    id: 'empty',
    label: `Coups à 0 sans réseau rétabli : « ${NO_MOVES} »`,
    at: 'vide',
    test: (cx: CheckContext) => {
      const n = countPrints(cx, NO_MOVES);
      if (n !== 1) return n ? `${n} « ${NO_MOVES} » : un seul, quand le dernier coup est joué.` : `${G1.moves} relais tournés sans réparer la grille, et pas de « ${NO_MOVES} » : quand Coups tombe à 0, la partie est perdue.`;
      return movesShown(0, '')(cx);
    },
  },
  {
    id: 'locked2',
    label: 'Plus de coups : E ne tourne plus rien',
    at: 'vide2',
    test: (cx: CheckContext) => {
      const r = relays(cx, G1.shapes.length)[7];
      const q = quartOf(cx, r);
      if (q !== startQuarts(G1)[7]) return `Le relais ${cellName(7)} a tourné une ${G1.moves + 1}e fois alors qu’il ne restait plus de coup : à 0, chaque relais est bloqué.`;
      return movesShown(0, 'Coups ne descend pas sous 0.')(cx);
    },
  },
  noErrors(),
];

// ------------------------------------------------------------- milestone 4

/** Shared by milestones 4 and 5: the S_Grille member, the variable, the GameInstance cast. */
function roomKit(p: Project) {
  const s = p.structs.find((x) => x.name === 'S_Grille')!;
  const m = (n: string) => s.members.find((x) => x.name === n)!.id;
  const table = p.dataTables.find((t) => t.name === 'DT_Grilles')!.id;
  const nodeWhere = (b: ClassBuilder, ok: (n: { def: string; config: Record<string, unknown>; x: number; y: number }) => boolean) => Object.values(b.graph.nodes).find(ok)!;
  const v = (b: ClassBuilder, name: string) => b.cls.variables.find((x) => x.name === name)!.id;
  const partie = (b: ClassBuilder, from: string, pin: string, at: [number, number]) => {
    const cast = b.node('cast.to', { class: cls(p, 'BP_Partie')!.id }, {}, at);
    b.link(from, pin, cast, 'exec').link(b.node('game.getGameInstance', {}, {}, [at[0] - 160, at[1] + 200]), 'result', cast, 'object');
    return cast;
  };
  return { m, table, nodeWhere, v, partie };
}

function solveMenu(p: Project): void {
  const net = edit(p, 'BP_Reseau');
  const gi = newClass(p, 'BP_Partie', 'GameInstance');
  const grille = gi.variable('Grille', T.name, G1.row);
  const set = setGameInstanceClass(p, gi.cls.id);
  if (!set.ok) throw new Error(set.reason);
  const { m, table, nodeWhere, partie } = roomKit(p);

  // BP_Reseau: the row is the GameInstance's Grille (G1 when the grid's level is played directly).
  const begin = nodeWhere(net, (n) => n.def === 'event.beginPlay');
  const row = nodeWhere(net, (n) => n.def === 'dataTable.getRow');
  disconnectPin(net.graph, { node: begin.id, pin: 'then' });
  const myGrid = net.variable('Grille', T.name, G1.row);
  const cast = partie(net, begin.id, 'then', [200, -500]);
  const keepGrid = net.node('var.set', { variable: myGrid }, {}, [500, -500]);
  const read = net.node('var.getExternal', { owner: gi.cls.id, variable: grille }, {}, [400, -300]);
  net.link(cast, 'then', keepGrid, 'exec').link(cast, 'as', read, 'target').link(read, 'value', keepGrid, 'value').link(keepGrid, 'then', row.id, 'exec').link(keepGrid, 'out', row.id, 'rowName');
  // Fixed or out of moves: back to the menu 2 s later.
  for (const x of [2800, 3100]) {
    const lock = nodeWhere(net, (n) => n.def === 'call.custom' && n.config.event === 'Verrouiller' && n.x === x);
    net.link(lock.id, 'then', net.node('call.custom', { event: 'Retour' }, {}, [x + 300, x === 2800 ? 2900 : 3100]), 'exec');
  }
  const retour = net.node('event.custom', { name: 'Retour' }, {}, [64, 5200]);
  const wait = net.node('time.delay', {}, { duration: 2 }, [300, 5200]);
  const menu = net.node('level.open', {}, { level: MENU }, [560, 5200]);
  net.link(retour, 'then', wait, 'exec').link(wait, 'completed', menu, 'exec');

  // WBP_LigneSalle: one grid of the table, and Jouer.
  const line = newClass(p, ROW, 'UserWidget');
  const hbox = addW(p, line.cls, 'HorizontalBox', undefined);
  addW(p, line.cls, 'TextBlock', hbox.id, { name: 'Txt_Nom', isVariable: true, props: { text: 'Salle', fontSize: 26 }, slot: { sizeRule: 'Fill', padding: [8, 6, 8, 6], vAlign: 'Center' } });
  const btn = addW(p, line.cls, 'Button', hbox.id, { name: PLAY, slot: { padding: [8, 6, 8, 6], vAlign: 'Center' } });
  addW(p, line.cls, 'TextBlock', btn.id, { name: 'Txt_Jouer', props: { text: 'Jouer', fontSize: 22, color: '#111827' }, slot: { padding: [16, 8, 16, 8] } });
  const ligne = line.variable('Ligne', T.name, '');
  Object.assign(line.cls.variables.find((x) => x.id === ligne)!, { instanceEditable: true, exposeOnSpawn: true });
  const L = (at: [number, number]) => line.node('var.get', { variable: ligne }, {}, at);
  const construct = line.node('event.construct', {}, {}, [64, 96]);
  const lrow = line.node('dataTable.getRow', { table }, {}, [300, 96]);
  const lbrk = line.node('struct.break', { struct: 'S_Grille' }, {}, [560, 300]);
  const nameText = line.node('conv.stringToText', {}, {}, [760, 300]);
  const setName = line.node('widget.setText', {}, {}, [820, 96]);
  line.link(construct, 'then', lrow, 'exec').link(L([140, 260]), 'value', lrow, 'rowName').link(lrow, 'row', lbrk, 'struct').link(lbrk, m('Nom'), nameText, 'in').link(nameText, 'result', setName, 'text');
  line.link(lrow, 'found', setName, 'exec').link(getW(line, 'Txt_Nom', [660, 200]), 'value', setName, 'target');
  // Jouer: the grid for the next level, kept by the GameInstance, then the grid's level.
  const click = onButton(line, PLAY);
  Object.assign(line.graph.nodes[click], { x: 64, y: 700 });
  const lgi = partie(line, click, 'then', [340, 700]);
  const choose = line.node('var.setExternal', { owner: gi.cls.id, variable: grille }, {}, [640, 700]);
  // The menu's UI Only would follow Open Level (V7.73, as UE's viewport): the game's controls back first.
  const owner = line.node('widget.getOwningPlayer', {}, {}, [900, 900]);
  const gameOnly = line.node('input.setModeGameOnly', {}, {}, [940, 700]);
  const go = line.node('level.open', {}, { level: LEVEL }, [1240, 700]);
  line.link(lgi, 'then', choose, 'exec').link(lgi, 'as', choose, 'target').link(L([480, 900]), 'value', choose, 'value').link(choose, 'then', gameOnly, 'exec');
  line.link(owner, 'result', gameOnly, 'controller').link(gameOnly, 'then', go, 'exec');

  // WBP_Salles: one line per row of DT_Grilles, built in game.
  const rooms = newClass(p, 'WBP_Salles', 'UserWidget');
  const canvas = addW(p, rooms.cls, 'CanvasPanel', undefined);
  const mid = { anchors: { minX: 0.5, minY: 0.5, maxX: 0.5, maxY: 0.5 }, alignX: 0.5, alignY: 0.5 };
  addW(p, rooms.cls, 'Image', canvas.id, { name: 'Img_Fond', props: { color: '#111827' }, slot: { ...mid, offsets: [0, 0, 760, 460] } });
  addW(p, rooms.cls, 'TextBlock', canvas.id, { name: 'Txt_Titre', props: { text: 'Salle des relais', fontSize: 36, color: '#fde68a' }, slot: { ...mid, offsets: [0, -170, 680, 56] } });
  addW(p, rooms.cls, 'VerticalBox', canvas.id, { name: 'VB_Lignes', isVariable: true, slot: { ...mid, offsets: [0, 30, 680, 300] } });
  const rc = rooms.node('event.construct', {}, {}, [64, 96]);
  const names = rooms.node('dataTable.getRowNames', { table }, {}, [200, 300]);
  const each = rooms.node('flow.forEachLoop', {}, {}, [400, 96]);
  const create = rooms.node('widget.create', {}, { class: line.cls.id }, [700, 96]);
  const addChild = rooms.node('widget.addChildToVerticalBox', {}, {}, [1040, 96]);
  rooms.link(rc, 'then', each, 'exec').link(names, 'names', each, 'array').link(each, 'body', create, 'exec').link(each, 'element', create, `expose:${ligne}`).link(rooms.node('widget.getOwningPlayer', {}, {}, [520, 360]), 'result', create, 'owner');
  rooms.link(create, 'then', addChild, 'exec').link(getW(rooms, 'VB_Lignes', [900, 300]), 'value', addChild, 'target').link(create, 'result', addChild, 'content');

  // Lvl_Menu: BP_Menu puts the list on the screen, UI Only. It is the Game Default Map.
  const menuCls = newClass(p, 'BP_Menu', 'Actor');
  const mb = menuCls.node('event.beginPlay', {}, {}, [64, 96]);
  const pc = menuCls.node('player.getController', {}, {}, [200, 360]);
  const mk = menuCls.node('widget.create', {}, { class: rooms.cls.id }, [340, 96]);
  const vp = menuCls.node('widget.addToViewport', {}, {}, [640, 96]);
  const ui = menuCls.node('input.setModeUIOnly', {}, {}, [940, 96]);
  const cursor = menuCls.node('input.setShowMouseCursor', {}, { show: true }, [1240, 96]);
  menuCls.link(mb, 'then', mk, 'exec').link(pc, 'result', mk, 'owner').link(mk, 'then', vp, 'exec').link(mk, 'result', vp, 'target').link(vp, 'then', ui, 'exec').link(pc, 'result', ui, 'controller').link(mk, 'result', ui, 'focus');
  menuCls.link(ui, 'then', cursor, 'exec').link(pc, 'result', cursor, 'target');
  const lv = addLevel(p, MENU);
  if (!lv.ok) throw new Error(lv.reason);
  const open = p.editorLevelId;
  p.editorLevelId = lv.value.id;
  const placed = placeActor(p, menuCls.cls.id, 0, 0);
  if (!placed.ok) throw new Error(placed.reason);
  levelOf(p).playerStart = { x: 0, y: 300, yaw: 0 };
  if (open === undefined) delete p.editorLevelId;
  else p.editorLevelId = open;
  const def = setGameDefaultMap(p, lv.value.id);
  if (!def.ok) throw new Error(def.reason);
}

function solveRecords(p: Project): void {
  const net = edit(p, 'BP_Reseau');
  const line = edit(p, ROW);
  const { m, nodeWhere, v } = roomKit(p);
  // The records: a Save Game with a Map from the grid's row to its best score (the fewest moves).
  const rec = newClass(p, 'BP_Records', 'SaveGame');
  const best = rec.variable('Meilleurs', T.map(T.name, T.int), []);

  // BP_Reseau: the moves it started with, to count the score.
  const depart = net.variable('Depart', T.int, 0);
  const setC = nodeWhere(net, (n) => n.def === 'var.set' && n.config.variable === v(net, 'Coups'));
  const make = nodeWhere(net, (n) => n.def === 'widget.create');
  const brk = nodeWhere(net, (n) => n.def === 'struct.break');
  disconnectPin(net.graph, { node: setC.id, pin: 'then' });
  const setD = net.node('var.set', { variable: depart }, {}, [1100, -500]);
  net.link(setC.id, 'then', setD, 'exec').link(brk.id, m('Coups'), setD, 'value').link(setD, 'then', make.id, 'exec');

  // Fixed: the score, kept if better; then back to the menu.
  const lockA = nodeWhere(net, (n) => n.def === 'call.custom' && n.config.event === 'Verrouiller' && n.x === 2800);
  const back = nodeWhere(net, (n) => n.def === 'call.custom' && n.config.event === 'Retour' && n.x === 3100);
  disconnectPin(net.graph, { node: lockA.id, pin: 'then' });
  net.link(lockA.id, 'then', net.node('call.custom', { event: 'Enregistrer' }, {}, [3100, 2900]), 'exec');
  const y = 4400;
  const get = (id: string, at: [number, number]) => net.node('var.get', { variable: id }, {}, at);
  const myGrid = v(net, 'Grille');
  const meilleurs = net.variable('Meilleurs', T.map(T.name, T.int), []);
  const save = net.node('event.custom', { name: 'Enregistrer' }, {}, [64, y]);
  const exists = net.node('save.exists', {}, { slot: SLOT }, [300, y]);
  const had = net.node('flow.branch', {}, {}, [560, y]);
  const load = net.node('save.fromSlot', {}, { slot: SLOT }, [800, y - 160]);
  const asRec = net.node('cast.to', { class: rec.cls.id }, {}, [1060, y - 160]);
  const copy = net.node('var.set', { variable: meilleurs }, {}, [1320, y - 160]);
  const theirs = net.node('var.getExternal', { owner: rec.cls.id, variable: best }, {}, [1200, y + 20]);
  net.link(save, 'then', exists, 'exec').link(exists, 'then', had, 'exec').link(exists, 'result', had, 'condition').link(had, 'true', load, 'exec').link(load, 'then', asRec, 'exec').link(load, 'result', asRec, 'object');
  net.link(asRec, 'then', copy, 'exec').link(asRec, 'as', theirs, 'target').link(theirs, 'value', copy, 'value');
  const score = net.node('math.subtractInt', {}, {}, [1500, y + 300]);
  net.link(get(depart, [1340, y + 300]), 'value', score, 'a').link(get(v(net, 'Coups'), [1340, y + 380]), 'value', score, 'b');
  const find = net.node('map.find', {}, {}, [1500, y + 140]);
  net.link(get(meilleurs, [1340, y + 140]), 'value', find, 'map').link(get(myGrid, [1340, y + 220]), 'value', find, 'key');
  const worse = net.node('math.lessInt', {}, {}, [1700, y + 260]);
  const none = net.node('logic.not', {}, {}, [1700, y + 140]);
  const better = net.node('logic.or', {}, {}, [1880, y + 200]);
  net.link(score, 'result', worse, 'a').link(find, 'value', worse, 'b').link(find, 'result', none, 'a').link(none, 'result', better, 'a').link(worse, 'result', better, 'b');
  const isBest = net.node('flow.branch', {}, {}, [1700, y]);
  net.link(copy, 'then', isBest, 'exec').link(had, 'false', isBest, 'exec').link(better, 'result', isBest, 'condition');
  const put = net.node('map.add', {}, {}, [1980, y - 100]);
  const fresh = net.node('save.create', {}, { saveClass: rec.cls.id }, [2240, y - 100]);
  const fill = net.node('var.setExternal', { owner: rec.cls.id, variable: best }, {}, [2500, y - 100]);
  const write = net.node('save.toSlot', {}, { slot: SLOT }, [2760, y - 100]);
  net.link(isBest, 'true', put, 'exec').link(get(meilleurs, [1840, y + 40]), 'value', put, 'map').link(get(myGrid, [1840, y + 100]), 'value', put, 'key').link(score, 'result', put, 'value');
  net.link(put, 'then', fresh, 'exec').link(fresh, 'then', fill, 'exec').link(fresh, 'result', fill, 'target').link(get(meilleurs, [2340, y + 60]), 'value', fill, 'value');
  net.link(fill, 'then', write, 'exec').link(fresh, 'result', write, 'object');
  // The Retour that followed Verrouiller now follows Enregistrer.
  removeNodes(net.graph, [back.id]);
  const backAfter = net.node('call.custom', { event: 'Retour' }, {}, [3000, y]);
  net.link(write, 'then', backAfter, 'exec').link(isBest, 'false', backAfter, 'exec');

  // WBP_LigneSalle: its record, read from the slot.
  const hbox = line.cls.widgets!.find((w) => w.kind === 'HorizontalBox')!;
  const recText = addW(p, line.cls, 'TextBlock', hbox.id, { name: 'Txt_Record', isVariable: true, props: { text: 'Record : —', fontSize: 22, color: '#fde68a' }, slot: { padding: [8, 6, 8, 6], vAlign: 'Center' } });
  // Between the name and Jouer, as dragged there in the Hierarchy.
  const ws = line.cls.widgets!;
  ws.splice(ws.indexOf(recText), 1);
  ws.splice(
    ws.findIndex((w) => w.name === PLAY),
    0,
    recText,
  );
  const ligne = v(line, 'Ligne');
  const setName = nodeWhere(line, (n) => n.def === 'widget.setText');
  const lex = line.node('save.exists', {}, { slot: SLOT }, [1100, 96]);
  const lhad = line.node('flow.branch', {}, {}, [1360, 96]);
  const lload = line.node('save.fromSlot', {}, { slot: SLOT }, [1600, 96]);
  const lcast = line.node('cast.to', { class: rec.cls.id }, {}, [1860, 96]);
  const lfind = line.node('map.find', {}, {}, [2000, 300]);
  const lbest = line.node('var.getExternal', { owner: rec.cls.id, variable: best }, {}, [1840, 300]);
  const lgot = line.node('flow.branch', {}, {}, [2160, 96]);
  const ltext = line.node('conv.intToText', {}, {}, [2200, 400]);
  const lfmt = line.node('text.format', {}, { format: 'Record : {N}' }, [2360, 400]);
  const lset = line.node('widget.setText', {}, {}, [2440, 96]);
  line.link(setName.id, 'then', lex, 'exec').link(lex, 'then', lhad, 'exec').link(lex, 'result', lhad, 'condition').link(lhad, 'true', lload, 'exec').link(lload, 'then', lcast, 'exec').link(lload, 'result', lcast, 'object');
  line.link(lcast, 'as', lbest, 'target').link(lbest, 'value', lfind, 'map').link(line.node('var.get', { variable: ligne }, {}, [1840, 420]), 'value', lfind, 'key').link(lcast, 'then', lgot, 'exec').link(lfind, 'result', lgot, 'condition');
  line.link(lgot, 'true', lset, 'exec').link(lfind, 'value', ltext, 'in').link(ltext, 'result', lfmt, 'arg:N').link(lfmt, 'result', lset, 'text').link(getW(line, 'Txt_Record', [2280, 200]), 'value', lset, 'target');
}

/** The lines of the menu on the screen: each one's texts, by line. */
function lines(cx: CheckContext): string[][] {
  const out = new Map<unknown, string[]>();
  for (const l of cx.sim.umg.layer(1280).flatMap((s) => s.laid)) {
    if (l.widget.kind !== 'TextBlock' || !l.drawn) continue;
    const obj = cx.sim.umg.objectOf(l.path);
    if (obj?.className !== ROW) continue;
    out.set(obj, [...(out.get(obj) ?? []), String(l.props.text ?? '')]);
  }
  return [...out.values()];
}
/** The record a line of the menu shows (its number), '' if none, undefined if no line names that grid. */
function recordShown(cx: CheckContext, g: Grid): string | undefined {
  const line = lines(cx).find((t) => t.some((x) => normText(x).includes(normText(g.name))));
  return line ? (line.filter((x) => !normText(x).includes(normText(g.name))).join(' ').match(/\d+/)?.[0] ?? '') : undefined;
}

/** `null`: the record of that line does not matter (milestone 4, replayed once records exist). */
function menuShows(records: [Grid, number | undefined | null][], why: string) {
  return (cx: CheckContext): true | string => {
    if (cx.level() !== MENU) return `Le jeu est dans ${cx.level()} : on attend le menu, ${MENU}${cx.levels().length > 1 ? ' (2 s après la fin d’une grille, Open Level)' : ' (Game Default Map, dans Project Settings › Maps & Modes)'}.`;
    const ls = lines(cx);
    if (!ls.length) return `Aucune ligne ${ROW} à l’écran : le menu en construit une par ligne de DT_Grilles, en jeu (Get Data Table Row Names, Create Widget, Add Child to Vertical Box).`;
    if (ls.length !== GRIDS.length) return `${ls.length} ligne${ls.length > 1 ? 's' : ''} dans le menu : DT_Grilles en a ${GRIDS.length}, une ligne par grille.`;
    for (const [g, n] of records) {
      const r = recordShown(cx, g);
      if (r === undefined) return `Aucune ligne du menu n’affiche « ${g.name} » : chaque ligne montre le Nom de sa grille (colonne Nom).`;
      if (n === null) continue;
      if (n === undefined && r !== '') return `La ligne « ${g.name} » affiche le record ${r} alors qu’elle n’a jamais été réussie : sans record, rien (« — »).`;
      if (n !== undefined && r !== String(n)) return `La ligne « ${g.name} » affiche ${r ? `le record ${r}` : 'aucun record'} : on attend ${n}. ${why}`;
    }
    return true;
  };
}

/** Milestone 4: the menu; Salle A, fixed; back to the menu; Salle B. */
const MENU_SCENARIO: ScenarioStep[] = [
  { wait: 0.3 },
  { checkpoint: 'menu' },
  { click: `${ROW}/${PLAY}`, row: G1.name },
  { wait: 0.3 },
  { checkpoint: 'salleA' },
  ...fixScenario(G1),
  { wait: 2.5 },
  { checkpoint: 'retour1' },
  { click: `${ROW}/${PLAY}`, row: G2.name },
  { wait: 0.3 },
  { checkpoint: 'salleB' },
];
/** Milestone 5: the same, Salle B fixed too; Stop and Play; Salle A again, worse. */
const RECORDS_SCENARIO: ScenarioStep[] = [
  ...MENU_SCENARIO,
  ...fixScenario(G2),
  { wait: 2.5 },
  { checkpoint: 'records' },
  { restart: true },
  { wait: 0.3 },
  { checkpoint: 'relance' },
  { click: `${ROW}/${PLAY}`, row: G1.name },
  { wait: 0.3 },
  ...playAt(7),
  ...presses(2),
  ...fixScenario(G1),
  { wait: 2.5 },
  { checkpoint: 'pire' },
];
const total = (g: Grid) => g.plan.reduce((a, [, n]) => a + n, 0);

const menuChecks = [
  {
    id: 'menu',
    label: `Au lancement, le menu (${MENU}) : une ligne par grille de DT_Grilles, en UI Only`,
    at: 'menu',
    test: (cx: CheckContext) => {
      const r = menuShows(
        GRIDS.map((g) => [g, null]),
        '',
      )(cx);
      if (r !== true) return r;
      if (cx.sim.inputMode !== 'UIOnly') return `Le menu est en ${modeLabel(cx)} : on ne joue pas encore, c’est UI Only.`;
      return cx.sim.showMouseCursor ? true : 'Le menu est là, mais le curseur est caché : Set Show Mouse Cursor (coché).';
    },
  },
  {
    id: 'choose',
    label: `Jouer sur « ${G1.name} » ouvre ${LEVEL} avec la grille ${G1.row}`,
    at: 'salleA',
    test: (cx: CheckContext) => {
      if (cx.level() !== LEVEL) return `Après Jouer sur « ${G1.name} », le jeu est dans ${cx.level()} : le bouton ouvre ${LEVEL} (Open Level).`;
      if (cx.sim.inputMode !== 'GameOnly')
        return `${LEVEL} est en ${modeLabel(cx)} : le mode du menu a suivi Open Level, comme dans UE (il appartient au viewport, pas au niveau), et E n’y tourne rien. Set Input Mode Game Only avant Open Level.`;
      return generated(G1)(cx);
    },
  },
  {
    id: 'back',
    label: `Réseau rétabli : 2 s plus tard, le menu`,
    at: 'retour1',
    test: (cx: CheckContext) => {
      if (cx.level() === LEVEL && countPrints(cx, FIXED)) return `Toujours dans ${LEVEL} 2,5 s après « ${FIXED} » : 2 s après la fin d’une grille (rétablie ou perdue), le jeu rouvre ${MENU}.`;
      return menuShows(GRIDS.map((g) => [g, null]), '')(cx);
    },
  },
  {
    id: 'other',
    label: `Jouer sur « ${G2.name} » ouvre la grille ${G2.row} : le choix traverse Open Level dans le GameInstance`,
    at: 'salleB',
    test: (cx: CheckContext) => {
      if (cx.level() !== LEVEL) return `Après Jouer sur « ${G2.name} », le jeu est dans ${cx.level()} : le bouton ouvre ${LEVEL}.`;
      if (relayCount(cx) === G1.shapes.length) return `C’est encore la grille ${G1.row} : la ligne choisie doit traverser Open Level. Un acteur du menu disparaît avec son niveau ; le GameInstance, lui, reste (une variable Grille, lue par BP_Reseau à son BeginPlay).`;
      return generated(G2)(cx);
    },
  },
  notion(usesNode('gi', 'BP_Reseau', ['game.getGameInstance'], 'La grille choisie est lue dans le GameInstance', 'Ce qui doit traverser un Open Level vit dans le GameInstance : BP_Reseau y lit la grille choisie.')),
  noErrors(),
];

const recordChecks = [
  { id: 'first', label: `« ${G1.name} » réussie : sa ligne affiche son record (${total(G1)} coups)`, at: 'retour1', test: menuShows([[G1, total(G1)], [G2, undefined]], 'Le score d’une grille, ce sont les coups joués (Coups de la ligne moins ceux qui restent).') },
  { id: 'records', label: 'Chaque grille garde son propre record', at: 'records', test: menuShows([[G1, total(G1)], [G2, total(G2)]], 'Un record par grille : une Map de la ligne (Name) vers son score.') },
  { id: 'kept', label: 'Stop puis Play : les records sont toujours là (Save Game)', at: 'relance', test: menuShows([[G1, total(G1)], [G2, total(G2)]], 'Les records survivent à la fermeture du jeu : une Save Game, écrite à chaque record et relue par le menu.') },
  { id: 'worse', label: 'Un moins bon score ne remplace pas le record', at: 'pire', test: menuShows([[G1, total(G1)], [G2, total(G2)]], 'Le record ne change que si le nouveau score est meilleur (moins de coups), ou s’il n’y en avait pas.') },
  notion(usesNode('map', 'BP_Reseau', ['map.find', 'map.add'], 'Les records sont une Map de la grille vers son score', 'Range les records dans une Map (Name → Integer) : Find dit s’il y en a déjà un, Add le remplace.')),
  notion(usesNode('save', 'BP_Reseau', ['save.toSlot'], 'Les records sont écrits dans une Save Game', 'Écris les records dans un slot (Save Game to Slot), relu par le menu.')),
  noErrors(),
];

// -------------------------------------------------------------- the project

const SETUP =
  'Déjà là : le projet UE5 (IMC_Joueur : E → **IA_Interagir**, BP_PlayerController), un BP_Joueur au graphe vide, le niveau **Lvl_Reseau** avec la source (à l’ouest) et la sortie (à l’est), l’Enum **E_Forme** (Droit, Coude, Te), la structure **S_Grille** (Nom, Largeur, Formes, Graine, Coups) et la Data Table **DT_Grilles** (G1 « Salle A », G2 « Salle B »).\n\n' +
  '**BP_Relais** a son apparence (un socle, ses bras, un voyant, une Zone), ses variables **Forme** et **Quart** (Instance Editable, Expose on Spawn) et **Alimente**, et sa fonction **Dessiner**, écrite : les bras de sa Forme, tournés de Quart × 90°, le voyant allumé s’il est alimenté. **BP_Reseau** est posé, avec **Largeur**, **Relais** (un tableau de BP_Relais) et sa fonction pure **Voisin (Index, Cote)**, écrite : l’index du relais d’à côté, de ce côté-là, ou −1 au bord. Les côtés : 0 nord, 1 est, 2 sud, 3 ouest. Tout le reste est à créer.';

export const expertNetwork: Lesson = withMilestones(
  {
    id: 'x5-reseau',
    code: 'X5',
    module: 'Projet Expert',
    level: 'expert',
    number: 0,
    title: 'Le réseau',
    situation:
      'La salle des relais de la station. Une grille de relais à faire pivoter pour amener le courant de la source à la sortie, en un nombre de coups limité. Chaque grille est décrite dans une table et tournée au hasard d’après sa graine ; un menu propose les grilles, et le meilleur score de chacune reste d’une partie à l’autre.',
    recalls: ['sets', 'arrays', 'maps', 'loops', 'random', 'spawn', 'data-tables', 'structs', 'dispatchers', 'switch', 'enum', 'cast', 'umg', 'ui-input', 'save-game', 'game-instance', 'levels', 'functions'],
    notions: ['Projet Expert', 'Parcours de graphe', 'File de travail', 'Random Stream', 'Spawn Actor', 'Data Table', 'Event Dispatcher', 'Map', 'SaveGame', 'GameInstance', 'Open Level (by Name)'],
    remember:
      'La table décrit les grilles, la graine les fabrique, le parcours (une liste de travail et un Set des déjà vus) dit où va le courant, et le réseau arbitre : les coups, la fin. Le relais, lui, sait seulement tourner et le dire. Le GameInstance se souvient d’un niveau à l’autre ; la Save Game, d’une partie à l’autre.',
    cards: [EXPERT_RULES, REDO_NETWORK],
    hints: [
      'Qui sait où est un relais, qui sait s’il est ouvert, qui sait où passe le courant, et qui décide qu’un coup compte ?',
      'Get Data Table Row, Break S_Grille, Make Random Stream, Random Integer in Range from Stream, Spawn Actor from Class (Expose on Spawn) ; fonction pure, Switch on E_Forme ; Set, Array, While Loop, For Loop ; Event Dispatcher, Bind Event ; Create Widget, Text Format ; GameInstance, Open Level ; Get Data Table Row Names, Add Child to Vertical Box ; Save Game, Map (Find, Add).',
      'Solution : voir la solution de référence, ouverte une fois le projet réussi.',
    ],
    challenge:
      'Ajoute une grille G3 « Salle C » de quatre lignes, sans toucher à aucun graphe ; puis une forme Croix, ouverte des quatre côtés : qu’est-ce qui change, et où ? Enfin, montre dans le menu le nombre de coups permis de chaque grille.',
    setup: project,
  },
  [
    {
      id: 'grille',
      title: 'La grille',
      cards: [
        {
          title: 'Cahier des charges',
          body:
            `${SETUP}\n\n` +
            `1. Au lancement, **BP_Reseau** lit la ligne **${G1.row}** de DT_Grilles et fabrique la grille : un **BP_Relais** par élément de **Formes**, l’élément i en colonne i % Largeur et en ligne i / Largeur. La case (0, 0) est en (${ORIGIN[0]}, ${ORIGIN[1]}), deux cases voisines sont à ${STEP} cm. Il règle **Largeur** et garde chaque relais dans **Relais**, dans l’ordre de Formes.\n` +
            '2. Chaque relais naît avec sa **Forme** et un **Quart** tiré entre 0 et 3 d’un **Random Stream** fait avec la **Graine** de la ligne : un tirage par relais, dans l’ordre de Formes, et aucun autre. Même graine, même grille.\n' +
            '3. Dans BP_Relais, un événement **Tourner** : un quart de plus (après 3, retour à 0), puis Dessiner.\n' +
            '4. **IA_Interagir** (E), dans BP_Joueur : le relais que le joueur chevauche tourne. Les relais ne bloquent pas le joueur.',
        },
        {
          title: 'Le scénario de test',
          body: `Play dans Lvl_Reseau. Au lancement, le test compare chaque relais à la ligne ${G1.row} : sa case, sa Forme, et le Quart que donne la graine ${G1.seed}. Puis le joueur se place sur la case (1, 0) : un appui sur E, puis trois de plus (le relais revient comme au départ) ; enfin un appui sur la case (3, 1).`,
        },
        {
          title: 'Pour aller plus loin',
          body:
            '**Pourquoi une graine ?** Avec Random Integer in Range, chaque partie aurait sa grille : impossible de comparer deux scores. Un Random Stream redonne la même suite à partir de la même graine. Mais un tirage de plus, n’importe où avant, décale toute la suite : c’est pour ça que le test exige un tirage par relais, et seulement ça.\n\n' +
            '**Le relais ne sait pas qu’il est dans une grille** : il a une Forme, un Quart, et sait tourner. Où il est, combien ils sont, qui est à côté : c’est le réseau qui le sait.',
        },
      ],
      objectives: [`La grille ${G1.row} fabriquée en jeu : chaque relais dans sa case, sa Forme, un Quart tiré de la graine.`, 'E tourne d’un quart le relais sous le joueur, et lui seul.'],
      scenario: GRID_SCENARIO,
      checks: gridChecks,
      solve: solveGrid,
    },
    {
      id: 'courant',
      title: 'Le courant',
      cards: [
        {
          title: 'Cahier des charges',
          body:
            '1. Dans BP_Relais, une fonction pure **Ouvert (Cote) → Boolean** : ce côté du relais est-il ouvert ? Au Quart 0, un **Droit** est ouvert au nord et au sud, un **Coude** au nord et à l’est, un **Te** partout sauf à l’ouest. Chaque quart le tourne d’un cran dans le sens des aiguilles d’une montre : nord → est → sud → ouest.\n' +
            '2. Dans BP_Reseau, **Recalculer** : le courant entre par l’**ouest** du relais (0, 0), s’il y est ouvert. Il passe d’un relais à son voisin quand le côté de l’un **et** le côté d’en face de l’autre sont ouverts. Chaque relais atteint est **Alimente**, les autres non, et chacun est redessiné. La grille peut faire des boucles : le calcul doit finir quand même.\n' +
            '3. Recalculer une fois la grille faite, puis **chaque fois qu’un relais tourne**. Le relais le dit par un **Event Dispatcher** (OnTourne), sans rien savoir du réseau ; le réseau s’abonne à chaque relais qu’il crée.',
        },
        {
          title: 'Le scénario de test',
          body: `Play dans Lvl_Reseau. Au lancement, le test calcule lui-même ce que la source atteint, d’après les relais tels qu’ils sont, et le compare aux voyants. Puis il tourne quatre relais, ceux du chemin, un par un, et recompare après chacun. À la fin, le relais ${cellName(WIDTH - 1)}, devant la sortie, est alimenté.`,
        },
        {
          title: 'Pour aller plus loin',
          body:
            '**Le parcours de « Le réseau en boucle »**, sur une grille : une liste de travail (les relais à regarder) et un **Set** des relais déjà vus. Voisin donne la case d’à côté ; c’est Ouvert, sur les deux relais, qui dit si le courant passe.\n\n' +
            '**Le côté d’en face** : ce qui sort par l’est d’un relais entre par l’ouest du suivant. (Cote + 2) % 4 donne le côté opposé.\n\n' +
            '**Calculer, puis appliquer** : on remplit Visites d’abord, puis on dit à chaque relais s’il y est. Éteindre tout pour rallumer au fur et à mesure ferait clignoter la grille à chaque coup.',
        },
      ],
      objectives: ['Ouvert (Cote) selon la Forme et le Quart.', 'Seuls les relais que la source atteint sont alimentés, recalculé à chaque relais tourné (Event Dispatcher).'],
      scenario: CURRENT_SCENARIO,
      checks: currentChecks,
      solve: solveCurrent,
    },
    {
      id: 'coups',
      title: 'Les coups',
      cards: [
        {
          title: 'Cahier des charges',
          body:
            `1. Les **Coups** de la ligne, à l’écran dès le lancement (« Coups : ${G1.moves} ») ; chaque relais tourné en coûte un, et l’écran suit aussitôt.\n` +
            `2. Le courant atteint la sortie (le relais ${cellName(WIDTH - 1)} est alimenté et ouvert à l’est) : \`${FIXED}\`, une fois.\n` +
            `3. Les coups tombent à 0 sans que le réseau soit rétabli : \`${NO_MOVES}\`.\n` +
            '4. Dans les deux cas, plus rien ne tourne : E ne fait plus rien, et ne coûte rien.',
        },
        {
          title: 'Le scénario de test',
          body: `Play dans Lvl_Reseau. Le test répare la grille en ${total(G1)} coups (il en reste ${G1.moves - total(G1)}), puis appuie encore sur E : rien ne bouge. Puis Stop, Play : ${G1.moves} appuis sur la case (3, 1), qui ne répare rien : « ${NO_MOVES} », Coups 0, et un appui de plus ne tourne rien.`,
        },
        {
          title: 'Pour aller plus loin',
          body:
            '**Qui décide qu’un coup compte ?** Le réseau, qui entend OnTourne : c’est lui l’arbitre de la partie. Le relais ne sait que tourner, ou refuser s’il est bloqué.\n\n' +
            '**L’écran suit les événements** : on met à jour le texte quand les coups changent, pas à chaque image (ni Tick ni Binding).',
        },
      ],
      objectives: ['Les coups restants à l’écran, un de moins par relais tourné.', `« ${FIXED} » ou « ${NO_MOVES} », puis plus rien ne tourne.`],
      scenario: MOVES_SCENARIO,
      checks: moveChecks,
      solve: solveMoves,
    },
    {
      id: 'menu',
      title: 'Le menu',
      cards: [
        {
          title: 'Cahier des charges',
          body:
            `1. Un niveau **${MENU}**, la Game Default Map : au lancement, un menu avec une ligne **${ROW}** par ligne de DT_Grilles, construite en jeu ; chaque ligne montre le **Nom** de sa grille et un bouton **${PLAY}**. UI Only, curseur visible.\n` +
            `2. ${PLAY} ouvre **${LEVEL}** avec la grille de sa ligne : BP_Reseau ne lit plus ${G1.row}, mais la grille choisie. Le choix doit traverser Open Level : il vit dans le **GameInstance** (BP_Partie, une variable Grille, ${G1.row} par défaut, pour qu’un Play dans ${LEVEL} marche encore). Dans la grille, E tourne les relais comme avant.\n` +
            `3. 2 s après « ${FIXED} » ou « ${NO_MOVES} », retour au menu.`,
        },
        {
          title: 'Le scénario de test',
          body: `Play : le menu et ses deux lignes. ${PLAY} sur « ${G1.name} » : ${LEVEL}, la grille ${G1.row}, réparée ; 2 s plus tard, le menu. ${PLAY} sur « ${G2.name} » : la grille ${G2.row}, ${G2.shapes.length} relais sur ${G2.shapes.length / WIDTH} lignes. Les jalons 1 à 3 se vérifient toujours en jouant ${LEVEL} directement.`,
        },
        {
          title: 'Pour aller plus loin',
          body:
            '**Ce qui survit à Open Level** : le niveau, ses acteurs et ses widgets disparaissent ; le GameInstance reste. Le menu y dépose la grille choisie, le réseau l’y lit. Le **mode d’entrée** reste aussi : il appartient au viewport. Un menu en UI Only qui ouvre un niveau le laisse sans touches ; on remet Game Only juste avant Open Level.\n\n' +
            '**Une ligne par donnée** : ajouter une grille à DT_Grilles ajoute une ligne au menu, sans toucher à aucun graphe.',
        },
      ],
      objectives: [`${MENU} : une ligne par grille de la table, construite en jeu, UI Only.`, 'Jouer ouvre la grille choisie (GameInstance) ; 2 s après la fin, retour au menu.'],
      scenario: MENU_SCENARIO,
      checks: menuChecks,
      solve: solveMenu,
    },
    {
      id: 'records',
      title: 'Les records',
      cards: [
        {
          title: 'Cahier des charges',
          body:
            '1. Le **score** d’une grille réparée : les coups joués (les Coups de la ligne, moins ceux qui restent). Moins, c’est mieux.\n' +
            `2. Le meilleur score de chaque grille dans une **Save Game** (slot \`${SLOT}\`) : une **Map** de la ligne (Name) vers son record. Il ne change que si le nouveau score est meilleur, ou s’il n’y en avait pas.\n` +
            '3. Chaque ligne du menu affiche le record de sa grille (« Record : 5 »), rien (« — ») tant qu’elle n’a pas été réussie.',
        },
        {
          title: 'Le scénario de test',
          body: `Celui du jalon 4, puis la suite : « ${G1.name} » réparée en ${total(G1)} coups, et au menu elle affiche ${total(G1)}, « ${G2.name} » rien. « ${G2.name} » en ${total(G2)} : ${total(G1)} et ${total(G2)}. Stop, Play : toujours ${total(G1)} et ${total(G2)}. « ${G1.name} » rejouée en ${total(G1) + 2} coups : toujours ${total(G1)}.`,
        },
        {
          title: 'Pour aller plus loin',
          body:
            '**Une Map plutôt qu’un tableau** : on cherche le record d’une grille par son nom (Find), sans parcourir une liste ; Add remplace la valeur si la clé existe déjà.\n\n' +
            '**La Save Game est une photo** : on la lit au besoin (le menu, la fin d’une grille), on la réécrit en entier quand un record tombe.',
        },
      ],
      objectives: ['Le meilleur score de chaque grille dans une Save Game (une Map), seulement s’il est meilleur.', 'Le menu affiche le record de chaque grille.'],
      scenario: RECORDS_SCENARIO,
      checks: recordChecks,
      solve: solveRecords,
    },
  ],
);
