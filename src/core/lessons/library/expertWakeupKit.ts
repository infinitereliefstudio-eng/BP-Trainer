/**
 * Projet X6 « Le réveil »: what its milestones share. The names and places
 * the briefs give, the setup (the dormitory with its workshop and corridor,
 * the control room), the helpers the reference solution uses, and the
 * readings the checks make. The milestones are in expertWakeup.ts (1 to 3),
 * expertWakeupPower.ts (4 and 5) and expertWakeupControl.ts (6).
 */
import { type Level, levelOf, type Project } from '../../model/project';
import { addLevel, renameLevel } from '../../operations/levelAssetOps';
import { placeActor } from '../../operations/levelOps';
import type { ActorRT, RValue } from '../../runtime/world';
import { blockedAt } from '../../runtime/movement';
import { T } from '../../types/pins';
import { type ClassBuilder, ProjectBuilder } from '../builder';
import { normText } from '../checks';
import type { Check, CheckContext, ScenarioStep } from '../types';
import { ensurePlayerInput } from '../ue5Input';
import { expertScenery } from './expertRadio';
import { tap } from './kit';
import { playerBlueprint } from './props';
import { makeStruct, makeTable } from './tables';
import { screenTexts } from './umgKit';

export type At = [number, number];

export const DORM = 'Lvl_Dortoir';
export const MENU = 'Lvl_Menu';
export const CONTROL = 'Lvl_Controle';
export const SLOT = 'Reveil';
export const PROMPT = 'E : examiner';
export const REACH = 250;
export const BADGE = 'Badge';
export const FACT = 'CodeControle';
export const TAKEN = 'Badge récupéré';
export const EMPTY = 'Le casier est vide';
export const NOTED = `Noté : ${FACT}`;
export const SAVED = 'Partie sauvegardée';
export const MENU_WBP = 'WBP_Menu';
export const NEW = 'Btn_Nouvelle';
export const RESUME = 'Btn_Continuer';
export const QUIT = 'Btn_Quitter';

// The dormitory (y grows towards the bottom of the screen; −90 faces north).
export const CASIER_AT: At = [-450, -200];
export const TERMINAL_AT: At = [450, -200];
export const CAISSON_AT: At = [0, 60];
export const START: At = [0, 250];
/** The north wall of the dormitory and its two doorways: west to the workshop, east to the corridor. */
export const NORTH_Y = -520;
export const BADGE_DOOR_AT: At = [-450, NORTH_Y];
export const POWER_DOOR_AT: At = [450, NORTH_Y];
/** The workshop, behind the badge door: the generator and the three fuses. */
export const GENERATOR_AT: At = [-250, -850];
export const FUSES_AT: At[] = [
  [-680, -650],
  [-680, -900],
  [-450, -950],
];
/** The lamps of the dormitory. */
export const LAMPS_AT: At[] = [
  [-650, 300],
  [650, 300],
  [0, -400],
];
/** The corridor, behind the power door: the way to the control room. */
export const PASSAGE_AT: At = [450, -850];
// The control room.
export const CONTROL_START: At = [0, 300];
export const CODE_DOOR_AT: At = [0, -100];
export const CONSOLE_AT: At = [0, -450];
export const CONTROL_LAMPS_AT: At[] = [
  [-500, 150],
  [500, 150],
];

/** The journal of the dormitory's terminal: row, author, text, next page, fact given. */
export const PAGES: [string, string, string, string, string][] = [
  ['J1', 'Dr Morel', 'Jour 212. Le réacteur a lâché cette nuit. On met l’équipage en stase.', 'J2', ''],
  ['J2', 'Dr Morel', 'Si tout est noir à votre réveil : la salle de contrôle s’ouvre avec le code 4-1-7.', 'J3', FACT],
  ['J3', 'Cheffe Laurent', 'Les fusibles sont à l’atelier. Sans eux, le générateur ne repartira pas.', '', ''],
];

// -------------------------------------------------------------- the setup

/** Run `fill` with `level` open in the editor (placing actors there), then reopen the one that was. */
export function inLevel(p: Project, level: Level, fill: () => void): void {
  const was = p.editorLevelId;
  p.editorLevelId = level.id;
  try {
    fill();
  } finally {
    if (was === undefined) delete p.editorLevelId;
    else p.editorLevelId = was;
  }
}

/** A straight run of wall pieces (300 cm, 40 thick) from `a` to `b`, along x or y. */
function wallRun(pb: ProjectBuilder, piece: { h: ClassBuilder; v: ClassBuilder }, a: At, b: At): void {
  const along = a[1] === b[1] ? 0 : 1;
  const len = Math.abs(b[along] - a[along]);
  const n = Math.max(1, Math.ceil(len / 300));
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1);
    const lo = Math.min(a[along], b[along]) + 150;
    const hi = Math.max(a[along], b[along]) - 150;
    const c = len <= 300 ? (a[along] + b[along]) / 2 : lo + (hi - lo) * t;
    pb.place(along === 0 ? piece.h : piece.v, along === 0 ? c : a[0], along === 0 ? a[1] : c);
  }
}

export function project(): Project {
  const pb = new ProjectBuilder('Le réveil');
  playerBlueprint(pb);
  const p = pb.project;
  const dorm = levelOf(p);
  const lv = renameLevel(p, dorm.id, DORM);
  if (!lv.ok) throw new Error(lv.reason);
  expertScenery(pb, [
    [CASIER_AT, 'C'],
    [TERMINAL_AT, 'T'],
    ...FUSES_AT.map((at) => [at, 'F'] as [At, string]),
    [GENERATOR_AT, 'G'],
    ...LAMPS_AT.map((at) => [at, 'L'] as [At, string]),
    [BADGE_DOOR_AT, 'B'],
    [POWER_DOOR_AT, 'E'],
    [PASSAGE_AT, 'P'],
  ]);
  const piece = { h: pb.blueprint('BP_MurH'), v: pb.blueprint('BP_MurV') };
  piece.h.component('StaticMesh', 'Mur', { sizeX: 300, sizeY: 40, color: '#374151' });
  piece.v.component('StaticMesh', 'Mur', { sizeX: 40, sizeY: 300, color: '#374151' });
  // The north wall, open at the two doorways (120 cm each); behind it the workshop (west) and the corridor (east).
  wallRun(pb, piece, [-820, NORTH_Y], [-510, NORTH_Y]);
  wallRun(pb, piece, [-390, NORTH_Y], [390, NORTH_Y]);
  wallRun(pb, piece, [510, NORTH_Y], [820, NORTH_Y]);
  wallRun(pb, piece, [0, -540], [0, -1000]);
  wallRun(pb, piece, [-800, -440], [-800, -1000]);
  wallRun(pb, piece, [800, -440], [800, -1000]);
  wallRun(pb, piece, [-820, -1020], [820, -1020]);
  // The stasis pod the player wakes up in: scenery, solid, not interactive.
  const pod = pb.blueprint('BP_Caisson');
  pod.component('StaticMesh', 'Cuve', { sizeX: 220, sizeY: 110, color: '#155e75' });
  pod.component('TextRender', 'Panneau', { y: -80, text: 'Caisson de stase' });
  pb.place(pod, ...CAISSON_AT);
  const ids = makeStruct(p, 'S_Journal', [
    ['Auteur', T.string],
    ['Texte', T.string],
    ['Suivante', T.name],
    ['Donne', T.name],
  ]);
  makeTable(
    p,
    'DT_Journaux',
    'S_Journal',
    ids,
    PAGES.map(([row, who, text, next, gives]) => [row, { Auteur: who, Texte: text, Suivante: next, Donne: gives }]),
  );
  ensurePlayerInput(p, ['E'], { E: 'IA_Interagir' });
  pb.playerStart(START[0], START[1], -90);

  // Lvl_Controle: the control room, its code door in a wall, the console behind it, two lamp plots.
  const control = addLevel(p, CONTROL);
  if (!control.ok) throw new Error(control.reason);
  inLevel(p, control.value, () => {
    const put = (name: string, at: At) => {
      const r = placeActor(p, cls(p, name)!.id, ...at);
      if (!r.ok) throw new Error(r.reason);
      return r.value;
    };
    put('BP_Decor', [-800, 0]);
    put('BP_Decor', [800, 0]);
    const letter = cls(p, 'BP_Plot')!.variables[0].id;
    for (const [at, l] of [[CODE_DOOR_AT, 'K'], [CONSOLE_AT, 'X'], ...CONTROL_LAMPS_AT.map((at) => [at, 'L'])] as [At, string][]) put('BP_Plot', at).overrides[letter] = l;
    wallRun(pb, piece, [-820, CODE_DOOR_AT[1]], [-60, CODE_DOOR_AT[1]]);
    wallRun(pb, piece, [60, CODE_DOOR_AT[1]], [820, CODE_DOOR_AT[1]]);
    wallRun(pb, piece, [-820, -620], [820, -620]);
    wallRun(pb, piece, [-800, -440], [-800, -620]);
    wallRun(pb, piece, [800, -440], [800, -620]);
    pb.playerStart(CONTROL_START[0], CONTROL_START[1], -90);
  });
  return p;
}

// ------------------------------------------------------------------ helpers

export const cls = (p: Project, name: string) => p.classes.find((c) => c.name === name);
export const v = (b: ClassBuilder, name: string) => b.cls.variables.find((x) => x.name === name)!.id;
export const nodeWhere = (b: ClassBuilder, ok: (n: { def: string; config: Record<string, unknown>; defaults: Record<string, unknown>; x: number; y: number }) => boolean) =>
  Object.values(b.graph.nodes).find(ok)!;
export const fnGraphOf = (b: ClassBuilder, name: string) => b.cls.graphs.find((g) => g.name === name)!;

/** Get Player Pawn → Get Component by Class (BP_Inventaire): the player's inventory. */
export function inventoryOfPlayer(b: ClassBuilder, inv: string, at: At): string {
  const find = b.node('actor.getComponentByClass', {}, { componentClass: inv }, at);
  b.link(b.node('actor.getPlayerPawn', {}, {}, [at[0] - 200, at[1] + 60]), 'result', find, 'target');
  return find;
}

/** Get Player Controller → Enhanced Input Local Player Subsystem → Add or Remove IMC_Dialogue, after `from`. */
export function dialogueContext(b: ClassBuilder, ctx: string, def: 'input.addMappingContext' | 'input.removeMappingContext', from: string, pin: string, at: At): string {
  const node = b.node(def, { context: ctx }, def === 'input.addMappingContext' ? { priority: 1 } : {}, at);
  const sub = b.node('input.subsystem', {}, {}, [at[0] - 200, at[1] + 220]);
  b.link(b.node('player.getController', {}, {}, [at[0] - 420, at[1] + 220]), 'result', sub, 'controller').link(sub, 'result', node, 'target').link(from, pin, node, 'exec');
  return node;
}

/** Get Game Instance → Cast To BP_Partie, after `from`. */
export function partie(b: ClassBuilder, p: Project, from: string, pin: string, at: At): string {
  const cast = b.node('cast.to', { class: cls(p, 'BP_Partie')!.id }, {}, at);
  b.link(from, pin, cast, 'exec').link(b.node('game.getGameInstance', {}, {}, [at[0] - 160, at[1] + 200]), 'result', cast, 'object');
  return cast;
}

// ------------------------------------------------------------------ reading

/** Every list the player carries in its Actor Components (the inventory's Objets, Faits…). */
function carriedLists(cx: CheckContext): RValue[][] {
  return cx.sim.componentsOf(cx.sim.player).flatMap((o) => Object.values(o.vars).filter((x): x is RValue[] => Array.isArray(x)));
}
/** How many times `item` is in the lists the player's components carry. */
export const carried = (cx: CheckContext, item: string) => carriedLists(cx).flat().filter((x) => x === item).length;
/** Every name the player carries, once each. */
export const carriedNames = (cx: CheckContext) => [...new Set(carriedLists(cx).flat().filter((x): x is string => typeof x === 'string'))];
/** The player itself keeps it, in a variable of BP_Joueur. */
export const inPlayer = (cx: CheckContext, item: string) => Object.values(cx.sim.player.vars).some((x) => x === item || (Array.isArray(x) && x.includes(item)));

export const promptShown = (cx: CheckContext) => screenTexts(cx).some((t) => normText(t) === normText(PROMPT));
export const onScreen = (cx: CheckContext, text: string) => screenTexts(cx).some((t) => normText(t).includes(normText(text)));
export const everShown = (cx: CheckContext, text: string) => cx.shown().some((t) => normText(t).includes(normText(text)));
export const pageText = (i: number) => PAGES[i][2];
export const pagesOnScreen = (cx: CheckContext) => PAGES.map((_, i) => i).filter((i) => onScreen(cx, pageText(i)));

const className = (cx: CheckContext, classId: string) => cx.project.classes.find((c) => c.id === classId)?.name;
/** The actors of class `name` (or a child of it) placed in `level`, within 80 cm of `at`. */
export const placedAt = (cx: CheckContext, name: string, at: At, level = DORM) =>
  (cx.project.levels.find((l) => l.name === level) ?? levelOf(cx.project)).actors.filter((a) => className(cx, a.classId) === name && Math.hypot(a.x - at[0], a.y - at[1]) <= 80);
export const placedNear = (cx: CheckContext, name: string, at: At, level = DORM) => placedAt(cx, name, at, level).length > 0;
/** The playing actor of class `name` nearest to `at` (within 80 cm), in the world now. */
export function actorAt(cx: CheckContext, name: string, at: At): ActorRT | undefined {
  return cx.sim.actors.find((a) => !a.destroyed && cx.sim.classOf(a)?.name === name && Math.hypot(a.x - at[0], a.y - at[1]) <= 80);
}
/** The player could not stand in the doorway at `at`: something solid fills it. */
export const doorwayClosed = (cx: CheckContext, at: At) => blockedAt(at[0], at[1], cx.sim.actors);
/** A Point Light of this actor is lit (visible, with some intensity). */
export const lit = (a: ActorRT | undefined) => !!a?.components.some((c) => c.kind === 'PointLight' && c.props.visible !== false && (c.props.intensity === undefined || Number(c.props.intensity) > 0));

/** Only the player (and the Player Controller the project came with) listens to the inputs. */
export const playerOnly: Check = {
  id: 'player-only',
  label: 'Seul le joueur écoute les touches',
  test: (cx) => {
    const own = cx.project.classes.filter((c) => !['BP_Joueur', 'BP_PlayerController'].includes(c.name) && cx.nodes(c.name).some((n) => n.def === 'input.action' || n.def === 'event.inputKey'));
    return own.length
      ? `${own.map((c) => c.name).join(', ')} écoute${own.length > 1 ? 'nt' : ''} une entrée : c’est le joueur qui appuie sur E ; ce qu’il regarde reçoit seulement Interagir.`
      : true;
  },
};

// ------------------------------------------------------------------ playing

/** Stop, Play again, in Lvl_Dortoir: the checks of milestones 1, 2, 4 and 5 play the dormitory directly. */
export const PLAY_DORM: ScenarioStep[] = [{ restart: true, level: DORM }, { wait: 0.3 }];
/** Stand at `at`, turned to `yaw` (−90: north, towards the top of the screen; 180: west). */
export const standAt = (at: At, yaw: number, wait = 0.2): ScenarioStep[] => [{ teleport: at }, { look: yaw }, { wait }];
export const press = (key: 'E' | 'F'): ScenarioStep[] => [...tap(key), { wait: 0.1 }];
/** 200 cm south of a thing, facing it: within reach. */
export const southOf = (at: At): At => [at[0], at[1] + 200];
export const FRONT_CASIER = southOf(CASIER_AT);
export const FRONT_TERMINAL = southOf(TERMINAL_AT);
export const FRONT_GENERATOR = southOf(GENERATOR_AT);
/** Where to stand, and facing where, to act on each fuse (two from the east, the last from the south). */
export const FUSE_FRONTS: [At, number][] = [
  [[FUSES_AT[0][0] + 200, FUSES_AT[0][1]], 180],
  [[FUSES_AT[1][0] + 200, FUSES_AT[1][1]], 180],
  [southOf(FUSES_AT[2]), -90],
];
/** Take the badge from the locker. */
export const TAKE_BADGE: ScenarioStep[] = [...standAt(FRONT_CASIER, -90, 0.1), ...press('E')];
/** Read the terminal up to the fact, then close it with F. */
export const READ_TERMINAL: ScenarioStep[] = [...standAt(FRONT_TERMINAL, -90, 0.1), ...press('E'), ...press('E'), ...press('F')];
/** Take fuse `i`. */
export const takeFuse = (i: number): ScenarioStep[] => [...standAt(FUSE_FRONTS[i][0], FUSE_FRONTS[i][1], 0.1), ...press('E')];
/** E at the generator. */
export const AT_GENERATOR: ScenarioStep[] = [...standAt(FRONT_GENERATOR, -90, 0.1), ...press('E')];
/** The three fuses, then the generator: the power comes back. */
export const POWER_UP: ScenarioStep[] = [...takeFuse(0), ...takeFuse(1), ...takeFuse(2), ...AT_GENERATOR];
