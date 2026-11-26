/**
 * Projet X6 « Le réveil », milestone 6 (V7.71): La salle de contrôle.
 * The corridor's passage opens Lvl_Controle; what the player carries goes
 * with him through the GameInstance, and so does the power, which the save
 * keeps too (Continuer finds the lights on). The code door, a third child of
 * BP_Porte_Base, opens if the player knows the code from the journal; the
 * console ends the game: the end screen, the save deleted, back to the menu.
 * Played from the menu (the Game Default Map), as a player would.
 */
import type { Project } from '../../model/project';
import { implementInterface, setInheritedDefault } from '../../operations/classOps';
import { placeActor } from '../../operations/levelOps';
import { setParentClass } from '../../operations/projectOps';
import { T } from '../../types/pins';
import { edit } from '../builder';
import { countPrints, noRuntimeErrors, notion, usesNode } from '../checks';
import type { Check, CheckContext, Milestone, ScenarioStep } from '../types';
import {
  type At,
  actorAt,
  AT_GENERATOR,
  BADGE,
  carried,
  cls,
  CODE_DOOR_AT,
  CONSOLE_AT,
  CONTROL,
  CONTROL_LAMPS_AT,
  CONTROL_START,
  DORM,
  doorwayClosed,
  FACT,
  inLevel,
  inventoryOfPlayer,
  LAMPS_AT,
  lit,
  MENU,
  MENU_WBP,
  NEW,
  nodeWhere,
  onScreen,
  PASSAGE_AT,
  POWER_UP,
  partie,
  placedNear,
  press,
  READ_TERMINAL,
  RESUME,
  SLOT,
  southOf,
  standAt,
  TAKE_BADGE,
  v,
} from './expertWakeupKit';
import { RUNNING } from './expertWakeupPower';
import { fnDef, fnOf } from './kit';
import { addW, button, drawnProp, modeLabel, newClass, onButton } from './umgKit';

export const NO_CODE = 'Code inconnu';
export const THE_END = 'La station est rétablie';
const END_WBP = 'WBP_Fin';
const TO_MENU = 'Btn_Menu';

export function solveControl(p: Project): void {
  const iface = p.interfaces.find((i) => i.name === 'BPI_Interactif')!;
  // The power lives in the GameInstance, and in the save.
  const gi = edit(p, 'BP_Partie');
  const giPower = gi.variable('Energie', T.bool, false);
  const sg = edit(p, 'BP_Sauvegarde');
  const sPower = sg.variable('Energie', T.bool, false);

  // BP_Generateur: when it restarts, the GameInstance knows; at BeginPlay, a game where the power is back finds it running.
  const gen = edit(p, 'BP_Generateur');
  const call = nodeWhere(gen, (n) => n.def === 'dispatcher.call');
  const giCast = partie(gen, p, call.id, 'then', [2600, 640]);
  const remember = gen.node('var.setExternal', { owner: gi.cls.id, variable: giPower }, { value: true }, [2900, 640]);
  gen.link(giCast, 'then', remember, 'exec').link(giCast, 'as', remember, 'target');
  const keepBar = nodeWhere(gen, (n) => n.def === 'var.set' && n.config.variable === v(gen, 'Barre'));
  const giAtStart = partie(gen, p, keepBar.id, 'then', [1000, -400]);
  const wasOn = gen.node('var.getExternal', { owner: gi.cls.id, variable: giPower }, {}, [1200, -200]);
  const back = gen.node('flow.branch', {}, {}, [1300, -400]);
  gen.link(giAtStart, 'then', back, 'exec').link(giAtStart, 'as', wasOn, 'target').link(wasOn, 'value', back, 'condition');
  const runs = gen.node('var.set', { variable: v(gen, 'Allume') }, { value: true }, [1600, -400]);
  const w = edit(p, 'WBP_Jauge');
  const afficher = fnOf(w, 'Afficher');
  const full = gen.node('call.function', { owner: w.cls.id, graph: afficher.graph.id }, { [afficher.pin.Valeur]: 1 }, [1900, -400]);
  gen.link(back, 'true', runs, 'exec').link(runs, 'then', full, 'exec').link(gen.node('var.get', { variable: v(gen, 'Barre') }, {}, [1700, -200]), 'value', full, 'target');

  // BP_Fusible (review of chantier n° 5, P3): a level opened again makes its actors anew, the fuses too. At BeginPlay, a
  // fuse already taken (its Nom in the GameInstance's Objets) or already placed (the power back) leaves (as D28).
  const fuse = edit(p, 'BP_Fusible');
  const fuseBegin = fuse.node('event.beginPlay', {}, {}, [64, -400]);
  const fCast = partie(fuse, p, fuseBegin, 'then', [300, -400]);
  const objets = fuse.node('var.getExternal', { owner: gi.cls.id, variable: v(gi, 'Objets') }, {}, [500, -240]);
  const taken = fuse.node('set.contains', {}, {}, [700, -240]);
  const powered = fuse.node('var.getExternal', { owner: gi.cls.id, variable: giPower }, {}, [700, -120]);
  const either = fuse.node('logic.or', {}, {}, [900, -200]);
  const gone = fuse.node('flow.branch', {}, {}, [900, -400]);
  fuse.link(fCast, 'as', objets, 'target').link(objets, 'value', taken, 'set').link(fuse.node('var.get', { variable: v(fuse, 'Nom') }, {}, [500, -120]), 'value', taken, 'item');
  fuse.link(fCast, 'as', powered, 'target').link(taken, 'result', either, 'a').link(powered, 'value', either, 'b');
  fuse.link(fCast, 'then', gone, 'exec').link(either, 'result', gone, 'condition').link(gone, 'true', fuse.node('actor.destroy', {}, {}, [1200, -400]), 'exec');

  // BP_Alimente: the power already back (the GameInstance says so): powered from the start.
  const alim = edit(p, 'BP_Alimente');
  const bind = nodeWhere(alim, (n) => n.def === 'dispatcher.bind');
  const valid = nodeWhere(alim, (n) => n.def === 'flow.isValid');
  const ask = alim.node('cast.to', { class: gi.cls.id }, {}, [1200, 96]);
  alim.link(bind.id, 'then', ask, 'exec').link(valid.id, 'notValid', ask, 'exec').link(alim.node('game.getGameInstance', {}, {}, [1000, 300]), 'result', ask, 'object');
  const already = alim.node('flow.branch', {}, {}, [1500, 96]);
  const giOn = alim.node('var.getExternal', { owner: gi.cls.id, variable: giPower }, {}, [1300, 300]);
  alim.link(ask, 'then', already, 'exec').link(ask, 'as', giOn, 'target').link(giOn, 'value', already, 'condition');
  alim.link(already, 'true', alim.node('call.custom', { owner: alim.cls.id, event: 'Courant' }, {}, [1800, 96]), 'exec');

  // BP_Terminal › Sauver: the power too. WBP_Menu › Continuer: back into the GameInstance.
  const term = edit(p, 'BP_Terminal');
  const write = nodeWhere(term, (n) => n.def === 'save.toSlot');
  const before = Object.values(term.graph.links).find((l) => l.to.node === write.id && l.to.pin === 'exec')!;
  delete term.graph.links[before.id];
  const fresh = nodeWhere(term, (n) => n.def === 'save.create');
  const tCast = partie(term, p, before.from.node, before.from.pin, [1600, 2700]);
  const keepPower = term.node('var.setExternal', { owner: sg.cls.id, variable: sPower }, {}, [1900, 2700]);
  const tOn = term.node('var.getExternal', { owner: gi.cls.id, variable: giPower }, {}, [1700, 2900]);
  term.link(tCast, 'then', keepPower, 'exec').link(fresh.id, 'result', keepPower, 'target').link(tCast, 'as', tOn, 'target').link(tOn, 'value', keepPower, 'value').link(keepPower, 'then', write.id, 'exec');
  const menu = edit(p, MENU_WBP);
  const launch = fnOf(menu, 'Lancer');
  const go = nodeWhere(menu, (n) => n.def === 'call.function' && n.config.graph === launch.graph.id && n.y === 800);
  const into = Object.values(menu.graph.links).find((l) => l.to.node === go.id && l.to.pin === 'exec')!;
  delete menu.graph.links[into.id];
  const giCastM = nodeWhere(menu, (n) => n.def === 'cast.to' && n.config.class === gi.cls.id);
  const asSave = nodeWhere(menu, (n) => n.def === 'cast.to' && n.config.class === sg.cls.id);
  const putPower = menu.node('var.setExternal', { owner: gi.cls.id, variable: giPower }, {}, [1760, 1000]);
  const rPower = menu.node('var.getExternal', { owner: sg.cls.id, variable: sPower }, {}, [1600, 1200]);
  menu.link(into.from.node, into.from.pin, putPower, 'exec').link(giCastM.id, 'as', putPower, 'target').link(asSave.id, 'as', rPower, 'target').link(rPower, 'value', putPower, 'value').link(putPower, 'then', go.id, 'exec');

  // BP_Passage, in the corridor: the player enters, what he carries goes to the GameInstance, then Lvl_Controle.
  const inv = edit(p, 'BP_Inventaire');
  const pass = newClass(p, 'BP_Passage', 'Actor');
  pass.component('BoxCollision', 'Zone', { sizeX: 200, sizeY: 200 });
  const enter = pass.node('event.actorBeginOverlap', {}, {}, [64, 96]);
  const who = pass.node('cast.to', { class: cls(p, 'BP_Joueur')!.id }, {}, [300, 96]);
  pass.link(enter, 'then', who, 'exec').link(enter, 'other', who, 'object');
  const pCast = partie(pass, p, who, 'then', [600, 96]);
  const pInv = inventoryOfPlayer(pass, inv.cls.id, [700, 500]);
  const sets: string[] = [];
  for (const [name, x] of [
    ['Objets', 900],
    ['Faits', 1200],
  ] as const) {
    const set = pass.node('var.setExternal', { owner: gi.cls.id, variable: v(gi, name) }, {}, [x, 96]);
    const get = pass.node('var.getExternal', { owner: inv.cls.id, variable: v(inv, name) }, {}, [x - 100, 400]);
    pass.link(pCast, 'as', set, 'target').link(pInv, 'result', get, 'target').link(get, 'value', set, 'value');
    sets.push(set);
  }
  pass.link(pCast, 'then', sets[0], 'exec').link(sets[0], 'then', sets[1], 'exec').link(sets[1], 'then', pass.node('level.open', {}, { level: CONTROL }, [1500, 96]), 'exec');
  const placed = placeActor(p, pass.cls.id, ...PASSAGE_AT);
  if (!placed.ok) throw new Error(placed.reason);

  // BP_Inventaire › Sait: a fact the player has learnt.
  const knows = fnDef(p, inv, 'Sait', [['Fait', T.name]], [['Sait', T.bool]], false);
  knows.graph.fn!.pure = true;
  const contains = knows.f.node('set.contains', {}, {}, [360, 200]);
  knows.f.link(knows.f.node('var.get', { variable: v(inv, 'Faits') }, {}, [160, 300]), 'value', contains, 'set').link(knows.entry, knows.pin.Fait, contains, 'item').link(contains, 'result', knows.ret, knows.pin.Sait);

  // BP_Porte_Code: a third door, its condition the code from the journal.
  const base = cls(p, 'BP_Porte_Base')!;
  const code = newClass(p, 'BP_Porte_Code', 'Actor');
  const r = setParentClass(p, code.cls.id, base.id);
  if (!r.ok) throw new Error(r.reason);
  setInheritedDefault(code.cls, base.variables.find((x) => x.name === 'Refus')!, NO_CODE);
  const may = fnDef(p, code, 'PeutOuvrir', [], [['Peut', T.bool]], false);
  const sait = may.f.node('call.pureFunction', { owner: inv.cls.id, graph: knows.graph.id }, { [knows.pin.Fait]: FACT }, [500, 260]);
  may.f.link(inventoryOfPlayer(may.f, inv.cls.id, [300, 300]), 'result', sait, 'target').link(sait, knows.pin.Sait, may.ret, may.pin.Peut);

  // WBP_Fin: the end, and the way back to the menu.
  const end = newClass(p, END_WBP, 'UserWidget');
  const canvas = addW(p, end.cls, 'CanvasPanel', undefined);
  const mid = { anchors: { minX: 0.5, minY: 0.5, maxX: 0.5, maxY: 0.5 }, alignX: 0.5, alignY: 0.5 };
  addW(p, end.cls, 'Image', canvas.id, { name: 'Img_Fond', props: { color: '#0f172a' }, slot: { ...mid, offsets: [0, 0, 640, 300] } });
  addW(p, end.cls, 'TextBlock', canvas.id, { name: 'Txt_Titre', props: { text: THE_END, fontSize: 40, color: '#86efac', justification: 'Center' }, slot: { ...mid, offsets: [0, -60, 600, 70] } });
  button(p, end.cls, canvas.id, TO_MENU, 'Menu', 0, 70);
  end.link(onButton(end, TO_MENU), 'then', end.node('level.open', {}, { level: MENU }, [400, 96]), 'exec');

  // BP_Console: E ends the game; the save goes (nothing to continue), the end screen comes, UI Only.
  const desk = newClass(p, 'BP_Console', 'Actor');
  desk.component('StaticMesh', 'Pupitre', { sizeX: 160, sizeY: 70, color: '#0f766e' });
  implementInterface(desk.cls, iface.id);
  const asked = desk.node('event.interface', { interface: iface.id, fn: iface.functions[0].id }, {}, [64, 96]);
  const forget = desk.node('save.delete', {}, { slot: SLOT }, [300, 96]);
  const pc = desk.node('player.getController', {}, {}, [300, 360]);
  const make = desk.node('widget.create', {}, { class: end.cls.id }, [600, 96]);
  const show = desk.node('widget.addToViewport', {}, {}, [900, 96]);
  const ui = desk.node('input.setModeUIOnly', {}, {}, [1200, 96]);
  const cursor = desk.node('input.setShowMouseCursor', {}, { show: true }, [1500, 96]);
  desk.link(asked, 'then', forget, 'exec').link(forget, 'then', make, 'exec').link(pc, 'result', make, 'owner').link(make, 'then', show, 'exec').link(make, 'result', show, 'target');
  desk.link(show, 'then', ui, 'exec').link(pc, 'result', ui, 'controller').link(make, 'result', ui, 'focus').link(ui, 'then', cursor, 'exec').link(pc, 'result', cursor, 'target');

  // Lvl_Controle: its lamps, the code door, the console.
  const control = p.levels.find((l) => l.name === CONTROL)!;
  const lamp = cls(p, 'BP_Lampe')!;
  inLevel(p, control, () => {
    for (const [id, at] of [...CONTROL_LAMPS_AT.map((a) => [lamp.id, a]), [code.cls.id, CODE_DOOR_AT], [desk.cls.id, CONSOLE_AT]] as [string, At][]) {
      const put = placeActor(p, id, ...at);
      if (!put.ok) throw new Error(put.reason);
    }
  });
}

// ------------------------------------------------------------------ checks

const ENTER_CONTROL: ScenarioStep[] = [{ teleport: PASSAGE_AT }, { wait: 0.5 }];
const CODE_FRONT: ScenarioStep[] = [...standAt(southOf(CODE_DOOR_AT), -90, 0.1), ...press('E'), { wait: 1.2 }];
const NEW_GAME: ScenarioStep[] = [{ click: `${MENU_WBP}/${NEW}` }, { wait: 0.3 }];

const CONTROL_SCENARIO: ScenarioStep[] = [
  { wait: 0.3 },
  ...NEW_GAME,
  ...TAKE_BADGE,
  ...POWER_UP,
  ...ENTER_CONTROL,
  { checkpoint: 'arrivee' },
  ...CODE_FRONT,
  { checkpoint: 'refus' },
  { restart: true },
  { wait: 0.3 },
  ...NEW_GAME,
  ...TAKE_BADGE,
  ...POWER_UP,
  ...READ_TERMINAL,
  ...ENTER_CONTROL,
  { checkpoint: 'arrivee2' },
  { restart: true },
  { wait: 0.3 },
  { click: `${MENU_WBP}/${RESUME}` },
  { wait: 0.3 },
  { checkpoint: 'reprise' },
  ...AT_GENERATOR,
  { checkpoint: 'tourne' },
  ...ENTER_CONTROL,
  ...CODE_FRONT,
  { checkpoint: 'code' },
  ...standAt(southOf(CONSOLE_AT), -90, 0.1),
  ...press('E'),
  { wait: 0.2 },
  { checkpoint: 'fin' },
  { click: `${END_WBP}/${TO_MENU}` },
  { wait: 0.3 },
  { checkpoint: 'menu' },
];

const lampsLit = (cx: CheckContext, where: At[]) => where.filter((at) => lit(actorAt(cx, 'BP_Lampe', at))).length;

/** In the control room, at its Player Start, the lamps lit, carrying these. */
function arrived(items: string[], why: string) {
  return (cx: CheckContext): true | string => {
    if (cx.level() !== CONTROL) return `Le joueur est entré dans le passage du couloir, et le jeu est encore dans ${cx.level()} : BP_Passage ouvre ${CONTROL} (Open Level) quand le joueur y entre.`;
    const pl = cx.sim.player;
    if (Math.hypot(pl.x - CONTROL_START[0], pl.y - CONTROL_START[1]) > 120) return `Le joueur n’est pas au Player Start de ${CONTROL}.`;
    const on = lampsLit(cx, CONTROL_LAMPS_AT);
    if (on < CONTROL_LAMPS_AT.length)
      return `${CONTROL_LAMPS_AT.length - on} lampe${on < CONTROL_LAMPS_AT.length - 1 ? 's' : ''} éteinte${on < CONTROL_LAMPS_AT.length - 1 ? 's' : ''} dans la salle de contrôle, alors que le générateur tourne : un nouveau niveau, ce sont de nouveaux acteurs. Le courant se garde dans le GameInstance ; BP_Alimente le lit à son BeginPlay.`;
    for (const it of [BADGE, FACT]) {
      const want = items.includes(it) ? 1 : 0;
      if (carried(cx, it) !== want) return want ? `${it} n’est plus dans l’inventaire en arrivant : ${why}` : `${it} est dans l’inventaire alors que le joueur ne l’a pas pris.`;
    }
    return true;
  };
}

const controlChecks: Check[] = [
  {
    id: 'placed',
    label: `BP_Passage sur P ; dans ${CONTROL} : BP_Porte_Code sur K, BP_Console sur X, une BP_Lampe sur chaque plot L`,
    test: (cx) => {
      if (!placedNear(cx, 'BP_Passage', PASSAGE_AT)) return 'Pose un BP_Passage sur le plot P, au bout du couloir de Lvl_Dortoir.';
      if (!placedNear(cx, 'BP_Porte_Code', CODE_DOOR_AT, CONTROL)) return `Pose une BP_Porte_Code sur le plot K de ${CONTROL}.`;
      if (!placedNear(cx, 'BP_Console', CONSOLE_AT, CONTROL)) return `Pose une BP_Console sur le plot X de ${CONTROL}.`;
      const missing = CONTROL_LAMPS_AT.filter((at) => !placedNear(cx, 'BP_Lampe', at, CONTROL)).length;
      return missing ? `${missing} plot${missing > 1 ? 's' : ''} L de ${CONTROL} sans BP_Lampe.` : true;
    },
  },
  {
    id: 'arrive',
    label: `Le passage mène à ${CONTROL} : les lampes allumées, le badge dans l’inventaire`,
    at: 'arrivee',
    test: arrived([BADGE], 'Open Level fait un monde neuf, le composant aussi. Avant d’ouvrir, le passage dépose les Objets et les Faits dans le GameInstance ; BP_Inventaire les y relit (jalon 3).'),
  },
  {
    id: 'refuse',
    label: `Sans le code : « ${NO_CODE} », la porte reste fermée`,
    at: 'refus',
    test: (cx) => {
      if (!doorwayClosed(cx, CODE_DOOR_AT)) return 'La porte à code s’est ouverte alors que le joueur n’a pas lu le code.';
      return countPrints(cx, NO_CODE) === 1 ? true : `E à la porte à code, sans le code : pas de « ${NO_CODE} ».`;
    },
  },
  {
    id: 'resume-power',
    label: 'Continuer, après une sauvegarde le courant revenu : les lampes du dortoir sont allumées',
    at: 'reprise',
    test: (cx) => {
      if (cx.level() !== DORM) return `Continuer a mené dans ${cx.level()}, on attend ${DORM}.`;
      const on = lampsLit(cx, LAMPS_AT);
      return on === LAMPS_AT.length ? true : 'Le joueur a sauvé après avoir redémarré le générateur ; après Continuer, le dortoir est dans le noir : la sauvegarde garde aussi le courant, rendu au GameInstance par Continuer.';
    },
  },
  {
    id: 'resume-generator',
    label: `Et le générateur tourne : « ${RUNNING} »`,
    at: 'tourne',
    test: (cx) =>
      countPrints(cx, RUNNING) === 1 ? true : `E au générateur après Continuer : pas de « ${RUNNING} ». Ses fusibles sont posés depuis la partie sauvée : à son BeginPlay, il lit le courant dans le GameInstance.`,
  },
  {
    id: 'fuses-gone',
    label: 'Après Continuer, les fusibles déjà posés ne sont plus par terre',
    at: 'reprise',
    test: (cx) => {
      const back = cx.sim.actors.filter((a) => a.className === 'BP_Fusible' && !a.destroyed).length;
      if (!back) return true;
      return `Après Continuer, ${back} fusible${back > 1 ? 's' : ''} déjà posé${back > 1 ? 's sont' : ' est'} de nouveau par terre : Open Level refait tous les acteurs du niveau (comme « L’objet ramassé réapparaît »). À son BeginPlay, un fusible déjà pris (son Nom dans les Objets du GameInstance) ou déjà posé (le courant revenu) se retire : Destroy Actor.`;
    },
  },
  { id: 'arrive-fact', label: 'Le code lu dans le journal arrive aussi', at: 'arrivee2', test: arrived([BADGE, FACT], 'le passage dépose aussi les Faits dans le GameInstance.') },
  {
    id: 'code',
    label: 'Avec le code, la porte s’ouvre',
    at: 'code',
    test: (cx) => (doorwayClosed(cx, CODE_DOOR_AT) ? `Le joueur sait ${FACT} (le journal J2), et la porte à code reste fermée : sa condition, le fait dans l’inventaire (ses Faits).` : true),
  },
  {
    id: 'end',
    label: `La console : « ${THE_END} » à l’écran, UI Only, le curseur`,
    at: 'fin',
    test: (cx) => {
      if (!onScreen(cx, THE_END)) return `E à la console : pas de « ${THE_END} » à l’écran (${END_WBP}).`;
      if (!drawnProp(cx, TO_MENU)?.drawn) return `Pas de bouton ${TO_MENU} sur l’écran de fin.`;
      if (cx.sim.inputMode !== 'UIOnly') return `L’écran de fin est en ${modeLabel(cx)} : la partie est finie, UI Only.`;
      return cx.sim.showMouseCursor ? true : 'L’écran de fin est là, mais le curseur est caché.';
    },
  },
  {
    id: 'back',
    label: 'Retour au menu : Continuer ne propose plus la partie finie',
    at: 'menu',
    test: (cx) => {
      if (cx.level() !== MENU) return `${TO_MENU} a mené dans ${cx.level()}, on attend ${MENU}.`;
      const b = drawnProp(cx, RESUME);
      if (!b?.drawn) return `Le menu n’est pas à l’écran.`;
      return b.enabled ? 'La partie est finie, et Continuer est encore actif : la console efface la sauvegarde (Delete Game in Slot).' : true;
    },
  },
  {
    id: 'family',
    label: 'BP_Porte_Code est un troisième enfant de BP_Porte_Base',
    test: (cx) => {
      const base = cls(cx.project, 'BP_Porte_Base');
      const c = cls(cx.project, 'BP_Porte_Code');
      if (!c || c.parentClassId !== base?.id) return 'BP_Porte_Code a BP_Porte_Base pour Parent Class : une porte de plus, c’est une condition de plus, rien d’autre.';
      return cx.nodes('BP_Porte_Code').some((n) => n.def === 'timeline.node') ? 'BP_Porte_Code a son propre Timeline : le mouvement est hérité.' : true;
    },
  },
  notion(usesNode('gi', 'BP_Passage', ['game.getGameInstance'], 'Ce qui traverse Open Level passe par le GameInstance', 'Le passage dépose l’inventaire dans le GameInstance avant Open Level : le joueur du dortoir disparaît avec son niveau.')),
  noRuntimeErrors(),
];

export const controlMilestone: Milestone = {
  id: 'controle',
  title: 'La salle de contrôle',
  cards: [
    {
      title: 'Cahier des charges',
      body:
        `Déjà là : le niveau **${CONTROL}**, la salle de contrôle : un mur et son passage (plot **K**), derrière lui un plot **X**, deux plots **L**, son Player Start.\n\n` +
        `1. **BP_Passage**, au bout du couloir (plot P) : quand le joueur y entre, ${CONTROL} s’ouvre. Il y arrive avec ce qu’il porte (Objets et Faits).\n` +
        `2. **Le courant suit** : dans ${CONTROL}, les lampes (des BP_Lampe, sur les plots L) sont allumées si le générateur a redémarré. Et une partie sauvée le courant revenu se reprend avec les lampes allumées et le générateur qui tourne.\n` +
        `3. **BP_Porte_Code**, sur K, une troisième porte : elle s’ouvre si le joueur connaît \`${FACT}\` (le journal), sinon \`${NO_CODE}\`.\n` +
        '4. **Les fusibles ne reviennent pas** : après Continuer, un fusible déjà pris ou déjà posé n’est plus par terre.\n' +
        `5. **BP_Console**, sur X : E finit la partie. Un écran de fin **${END_WBP}** (« ${THE_END} », un bouton **${TO_MENU}** qui ramène au menu), UI Only et curseur. Au menu, Continuer ne propose plus la partie finie.`,
    },
    {
      title: 'Le scénario de test',
      body:
        `Joué depuis le menu. Nouvelle partie : le badge, les fusibles, le générateur, le passage : ${CONTROL}, les lampes allumées, le badge dans l’inventaire. E à la porte à code : « ${NO_CODE} ». ` +
        `Stop, Play, Nouvelle partie : le badge, le générateur, le journal lu et refermé (la partie est sauvée), le passage : le badge et le code arrivent. Stop, Play, Continuer : le dortoir éclairé ; E au générateur : « ${RUNNING} ». Le passage, puis la porte à code : elle s’ouvre ; E à la console : l’écran de fin ; ${TO_MENU} : le menu, Continuer grisé.`,
    },
    {
      title: 'Pour aller plus loin',
      body:
        '**Une seule vérité par durée** : le courant vit dans le GameInstance (la partie en cours) et dans la sauvegarde (d’une séance à l’autre) ; le générateur et les lampes de chaque niveau le relisent en commençant. Le casier faisait déjà pareil avec l’inventaire.\n\n' +
        '**Une porte de plus** : BP_Porte_Code ne fait que redéfinir PeutOuvrir et régler son Refus. C’est tout l’intérêt de la famille de portes.\n\n' +
        '**Finir une partie**, c’est aussi effacer ce qui la reprendrait : sinon Continuer ramènerait le joueur devant une porte déjà franchie.',
    },
  ],
  objectives: [`Le passage ouvre ${CONTROL} ; inventaire et courant traversent par le GameInstance, le courant se sauve aussi.`, 'La porte à code (un troisième enfant), la console et l’écran de fin ; Continuer ne propose plus la partie finie.'],
  scenario: CONTROL_SCENARIO,
  checks: controlChecks,
  solve: solveControl,
};
