/**
 * Expert project X6 « Le réveil » (V7.70, chantier n° 5, docs/PLAN_EXPERT_FINAL.md,
 * project A). The last project: the player wakes from stasis in a dark
 * station, reads what the terminals say, finds the badge and, later, brings
 * the power back and reaches the control room.
 *
 * V7.70 builds its first three milestones (the plan's « menu et partie » and
 * « dortoir », re-cut: at ≈ 140 nodes, two would each take well over an hour,
 * and the menu's Continuer has nothing to resume before the terminal saves):
 * 1. Regarder: E acts on what the player looks at (Line Trace, BPI_Interactif),
 *    an invite on the screen says when it can; the locker gives the badge to
 *    the inventory, an Actor Component on the player.
 * 2. Le terminal: a journal from a Data Table in a dialogue box, E and F
 *    through a dialogue Mapping Context (X1's radio, retired in V7.72, lives on
 *    here), the facts it gives noted.
 * 3. Le menu et la sauvegarde: Lvl_Menu (Nouvelle partie, Continuer greyed
 *    without a save, Quitter), the terminal saves when it closes, Continuer
 *    goes back to the saved level with the inventory, through the GameInstance.
 * V7.71 adds the last three: Le générateur and Le courant et les portes
 * (expertWakeupPower.ts), La salle de contrôle (expertWakeupControl.ts).
 * What they share is in expertWakeupKit.ts.
 *
 * The checks of milestones 1, 2, 4 and 5 play Lvl_Dortoir directly (Play from
 * the level open in the editor), so they still hold once the menu is the Game
 * Default Map; 3 and 6 play from the menu.
 */
import { levelOf, type Project } from '../../model/project';
import { VIS_COLLAPSED, VIS_VISIBLE } from '../../model/widgets';
import { implementInterface } from '../../operations/classOps';
import { addInputAction, addMapping, addMappingContext } from '../../operations/inputOps';
import { addLevel, setGameDefaultMap, setGameInstanceClass } from '../../operations/levelAssetOps';
import { placeActor } from '../../operations/levelOps';
import { addInterface, addInterfaceFunction } from '../../operations/projectOps';
import { T } from '../../types/pins';
import { edit } from '../builder';
import { countPrints, noRuntimeErrors, normText, notion, usesNode } from '../checks';
import { withMilestones } from '../milestones';
import type { Check, CheckContext, ScenarioStep } from '../types';
import type { Lesson } from '../types';
import { EXPERT_RULES } from './expertKit';
import { REDO_WAKEUP } from './expertUe5';
import { controlMilestone } from './expertWakeupControl';
import {
  BADGE,
  CASIER_AT,
  carried,
  cls,
  DORM,
  dialogueContext,
  EMPTY,
  everShown,
  FACT,
  FRONT_CASIER,
  FRONT_TERMINAL,
  inPlayer,
  inventoryOfPlayer,
  MENU,
  MENU_WBP,
  NEW,
  nodeWhere,
  NOTED,
  onScreen,
  PAGES,
  PLAY_DORM,
  pageText,
  pagesOnScreen,
  partie,
  placedNear,
  playerOnly,
  PROMPT,
  press,
  project,
  promptShown,
  QUIT,
  READ_TERMINAL,
  REACH,
  RESUME,
  SAVED,
  SLOT,
  START,
  standAt,
  TAKE_BADGE,
  TAKEN,
  TERMINAL_AT,
  v,
} from './expertWakeupKit';
import { generatorMilestone, powerMilestone } from './expertWakeupPower';
import { fnDef } from './kit';
import { addW, button, centred, drawnProp, getW, menuPanel, modeLabel, newClass, onButton } from './umgKit';

/** No error while playing. */
const noErrors = () => noRuntimeErrors();

function solveLook(p: Project): void {
  // BPI_Interactif: what E can act on.
  const r = addInterface(p, 'BPI_Interactif');
  if (!r.ok) throw new Error(r.reason);
  addInterfaceFunction(p, r.value.id, 'Interagir');
  const iface = r.value.id;
  const interagir = r.value.functions[0].id;

  // BP_Inventaire: what the player carries, a Set of names.
  const inv = newClass(p, 'BP_Inventaire', 'ActorComponent');
  const objets = inv.variable('Objets', T.set(T.name), []);
  inv.variable('Faits', T.set(T.name), []);
  const add = fnDef(p, inv, 'Ajouter', [['Objet', T.name]], []);
  const put = add.f.node('set.add', {}, {}, [360, 96]);
  add.f.link(add.entry, 'then', put, 'exec').link(add.f.node('var.get', { variable: objets }, {}, [160, 300]), 'value', put, 'set').link(add.entry, add.pin.Objet, put, 'item').link(put, 'then', add.ret, 'exec');
  const has = fnDef(p, inv, 'Possede', [['Objet', T.name]], [['Possede', T.bool]], false);
  has.graph.fn!.pure = true;
  const contains = has.f.node('set.contains', {}, {}, [360, 200]);
  has.f.link(has.f.node('var.get', { variable: objets }, {}, [160, 300]), 'value', contains, 'set').link(has.entry, has.pin.Objet, contains, 'item').link(contains, 'result', has.ret, has.pin.Possede);

  // BP_Joueur: carries the inventory; Viser says what is in front, within reach.
  const pl = edit(p, 'BP_Joueur');
  pl.logic(inv, 'Inventaire');
  const aim = fnDef(p, pl, 'Viser', [], [['Cible', T.object('Actor')]]);
  const loc = aim.f.node('actor.getLocation', {}, {}, [100, 300]);
  const fwd = aim.f.node('actor.getForward', {}, {}, [100, 440]);
  const far = aim.f.node('math.multiplyVectorFloat', {}, { b: REACH }, [300, 440]);
  const end = aim.f.node('math.addVector', {}, {}, [480, 380]);
  const trace = aim.f.node('trace.lineByChannel', {}, {}, [640, 96]);
  aim.f.link(aim.entry, 'then', trace, 'exec').link(loc, 'result', trace, 'start').link(fwd, 'result', far, 'a').link(loc, 'result', end, 'a').link(far, 'result', end, 'b').link(end, 'result', trace, 'end');
  aim.f.link(trace, 'then', aim.ret, 'exec').link(trace, 'hitActor', aim.ret, aim.pin.Cible);
  // E: Interagir, sent to what it looks at (nothing happens if it is not interactive).
  const e = pl.node('input.action', { action: p.inputActions.find((a) => a.name === 'IA_Interagir')!.id }, {}, [64, 96]);
  const look = pl.node('call.function', { graph: aim.graph.id }, {}, [340, 96]);
  const msg = pl.node('iface.message', { interface: iface, fn: interagir }, {}, [640, 96]);
  pl.link(e, 'started', look, 'exec').link(look, 'then', msg, 'exec').link(look, aim.pin.Cible, msg, 'target');

  // WBP_Invite: « E : examiner », under the middle of the screen.
  const w = newClass(p, 'WBP_Invite', 'UserWidget');
  const canvas = addW(p, w.cls, 'CanvasPanel', undefined);
  addW(p, w.cls, 'TextBlock', canvas.id, { name: 'Txt_Invite', props: { text: PROMPT, fontSize: 26, color: '#fde68a', justification: 'Center' }, slot: centred(0, 140, 360, 48) });
  // On the screen from the start, shown on each frame only when the player looks at something interactive.
  const invite = pl.variable('Invite', T.object('WBP_Invite'));
  const begin = pl.node('event.beginPlay', {}, {}, [64, 600]);
  const make = pl.node('widget.create', {}, { class: w.cls.id }, [340, 600]);
  const view = pl.node('widget.addToViewport', {}, {}, [640, 600]);
  const keep = pl.node('var.set', { variable: invite }, {}, [900, 600]);
  pl.link(begin, 'then', make, 'exec').link(pl.node('player.getController', {}, {}, [200, 800]), 'result', make, 'owner').link(make, 'then', view, 'exec').link(make, 'result', view, 'target');
  pl.link(view, 'then', keep, 'exec').link(make, 'result', keep, 'value');
  const tick = pl.node('event.tick', {}, {}, [64, 1100]);
  const look2 = pl.node('call.function', { graph: aim.graph.id }, {}, [340, 1100]);
  const can = pl.node('iface.doesImplement', { interface: iface }, {}, [560, 1300]);
  const br = pl.node('flow.branch', {}, {}, [640, 1100]);
  const show = pl.node('widget.setVisibility', {}, { visibility: VIS_VISIBLE }, [940, 1040]);
  const hide = pl.node('widget.setVisibility', {}, { visibility: VIS_COLLAPSED }, [940, 1240]);
  pl.link(tick, 'then', look2, 'exec').link(look2, 'then', br, 'exec').link(look2, aim.pin.Cible, can, 'object').link(can, 'result', br, 'condition');
  pl.link(br, 'true', show, 'exec').link(br, 'false', hide, 'exec');
  pl.link(pl.node('var.get', { variable: invite }, {}, [780, 1400]), 'value', show, 'target').link(pl.node('var.get', { variable: invite }, {}, [780, 1500]), 'value', hide, 'target');

  // BP_Casier: gives the badge, once: it asks the inventory, so it needs no memory of its own.
  const box = newClass(p, 'BP_Casier', 'Actor');
  box.component('StaticMesh', 'Caisse', { sizeX: 90, sizeY: 60, color: '#64748b' });
  implementInterface(box.cls, iface);
  const ev = box.node('event.interface', { interface: iface, fn: interagir }, {}, [64, 96]);
  const find = inventoryOfPlayer(box, inv.cls.id, [300, 320]);
  const owns = box.node('call.pureFunction', { owner: inv.cls.id, graph: has.graph.id }, { [has.pin.Objet]: BADGE }, [520, 320]);
  const already = box.node('flow.branch', {}, {}, [640, 96]);
  box.link(ev, 'then', already, 'exec').link(find, 'result', owns, 'target').link(owns, has.pin.Possede, already, 'condition');
  box.link(already, 'true', box.node('debug.printString', {}, { text: EMPTY }, [940, 0]), 'exec');
  const give = box.node('call.function', { owner: inv.cls.id, graph: add.graph.id }, { [add.pin.Objet]: BADGE }, [940, 200]);
  box.link(already, 'false', give, 'exec').link(find, 'result', give, 'target').link(give, 'then', box.node('debug.printString', {}, { text: TAKEN }, [1240, 200]), 'exec');
  placeActor(p, box.cls.id, ...CASIER_AT);
}

const LOOK_SCENARIO: ScenarioStep[] = [
  ...PLAY_DORM,
  ...standAt(START, -90),
  { checkpoint: 'caisson' },
  ...standAt([CASIER_AT[0], CASIER_AT[1] + 450], -90),
  { checkpoint: 'loin' },
  ...standAt(FRONT_CASIER, -90),
  { checkpoint: 'vise' },
  { look: 90 },
  { wait: 0.2 },
  { checkpoint: 'ailleurs' },
  { look: 0 },
  { wait: 0.1 },
  ...press('E'),
  { checkpoint: 'rate' },
  { look: -90 },
  { wait: 0.1 },
  ...press('E'),
  { checkpoint: 'casier' },
  ...press('E'),
  { checkpoint: 'vide' },
];

function invite(id: string, expected: boolean, label: string, at: string, why: string): Check {
  return {
    id,
    label,
    at,
    test: (cx) => {
      if (promptShown(cx) === expected) return true;
      if (expected && !cx.project.classes.some((c) => (c.widgets ?? []).some((w) => w.kind === 'TextBlock' && normText(String(w.props.text ?? '')) === normText(PROMPT))))
        return `Aucun Widget Blueprint n’a de Text « ${PROMPT} » : crée l’invite (un Text Block), ajoute-la à l’écran au lancement, et montre-la seulement quand le joueur regarde quelque chose d’interactif.`;
      return why;
    },
  };
}

const lookChecks: Check[] = [
  {
    id: 'placed',
    label: 'BP_Casier sur le plot C',
    test: (cx) => (placedNear(cx, 'BP_Casier', CASIER_AT) ? true : 'Pose un BP_Casier sur le plot C (à moins de 80 cm de son centre), dans Lvl_Dortoir.'),
  },
  invite('invite-on', true, `Face au casier, à 2 m : « ${PROMPT} » à l’écran`, 'vise', `Le joueur regarde le casier, à 2 m, et l’invite « ${PROMPT} » n’est pas à l’écran : elle se montre quand le rayon (${REACH} cm devant le joueur) touche un acteur qui implémente BPI_Interactif.`),
  invite('invite-pod', false, 'Face au caisson de stase (du décor) : pas d’invite', 'caisson', `Face au caisson de stase, l’invite « ${PROMPT} » est affichée : le caisson n’est pas interactif. Montre-la seulement si ce que touche le rayon implémente BPI_Interactif (Does Implement Interface).`),
  invite('invite-far', false, 'Face au casier, mais à 4,5 m : pas d’invite', 'loin', `À 4,5 m du casier, l’invite est affichée : le rayon ne va pas plus loin que ${REACH} cm devant le joueur (End = Start + Forward Vector × ${REACH}).`),
  invite('invite-off', false, 'Le joueur se détourne : l’invite disparaît', 'ailleurs', `Le joueur ne regarde plus le casier et l’invite reste à l’écran : elle suit ce qu’il regarde à chaque instant, et se cache (Collapsed) quand le rayon ne touche plus rien d’interactif.`),
  {
    id: 'aim',
    label: 'E sans regarder le casier, même tout près : rien',
    at: 'rate',
    test: (cx) => {
      if (carried(cx, BADGE) || countPrints(cx, TAKEN)) return 'Le joueur, à côté du casier mais tourné vers l’est, a eu le badge : E agit sur ce que le joueur regarde (Line Trace devant lui), pas sur ce qui est autour.';
      return countPrints(cx, EMPTY) ? `« ${EMPTY} » alors que le joueur ne regardait pas le casier.` : true;
    },
  },
  {
    id: 'take',
    label: `E face au casier : « ${TAKEN} », le badge dans l’inventaire (un Actor Component du joueur)`,
    at: 'casier',
    test: (cx) => {
      if (carried(cx, BADGE) === 1) return countPrints(cx, TAKEN) === 1 ? true : `Le badge est dans l’inventaire, mais pas de « ${TAKEN} » (une fois).`;
      if (inPlayer(cx, BADGE)) return 'Le badge est dans une variable de BP_Joueur : l’inventaire est un Actor Component (BP_Inventaire) que le joueur porte, avec ses Objets.';
      if (!cx.sim.componentsOf(cx.sim.player).length) return 'Le joueur ne porte aucun Actor Component : crée BP_Inventaire (+ Add › Blueprint Class › Actor Component, une variable Objets) et ajoute-le aux Components de BP_Joueur.';
      return countPrints(cx, TAKEN)
        ? `« ${TAKEN} », mais le badge n’est dans aucune liste de l’inventaire du joueur : le casier l’ajoute aux Objets de son BP_Inventaire (Get Player Pawn → Get Component by Class).`
        : `E face au casier, à 2 m : pas de badge. E lance un rayon devant le joueur (Line Trace, ${REACH} cm) et envoie Interagir (Message) à ce qu’il touche ; le casier implémente BPI_Interactif.`;
    },
  },
  {
    id: 'once',
    label: `Un second E : « ${EMPTY} », toujours un seul badge`,
    at: 'vide',
    test: (cx) => {
      if (carried(cx, BADGE) > 1) return `${carried(cx, BADGE)} badges dans l’inventaire : le casier ne le donne qu’une fois.`;
      if (countPrints(cx, TAKEN) > 1) return `Un second « ${TAKEN} » : le badge est déjà pris, le casier est vide.`;
      return countPrints(cx, EMPTY) === 1 ? true : `Un second E face au casier : pas de « ${EMPTY} ».`;
    },
  },
  playerOnly,
  notion(usesNode('trace', 'BP_Joueur', ['trace.lineByChannel'], 'Ce que regarde le joueur est trouvé par un Line Trace', 'Le joueur trouve ce qu’il regarde par un Line Trace By Channel, de sa position à 2,5 m devant lui.')),
  notion(usesNode('message', 'BP_Joueur', ['iface.message'], 'Le joueur envoie Interagir sans savoir à qui (interface)', 'Le joueur ne connaît ni le casier ni le terminal : il envoie Interagir (Message) à ce qu’il touche, et chacun y répond à sa façon.')),
  noErrors(),
];

// ------------------------------------------------------------- milestone 2

function solveTerminal(p: Project): void {
  // The dialogue mode: E and F change meaning while a journal is open.
  const ctx = addMappingContext(p, 'IMC_Dialogue');
  const next = addInputAction(p, 'IA_Suivant');
  const quit = addInputAction(p, 'IA_Quitter');
  if (!ctx.ok || !next.ok || !quit.ok) throw new Error('input assets');
  addMapping(p, ctx.value.id, next.value.id, 'E');
  addMapping(p, ctx.value.id, quit.value.id, 'F');
  const r = addInterface(p, 'BPI_Dialogue');
  if (!r.ok) throw new Error(r.reason);
  addInterfaceFunction(p, r.value.id, 'Suivant');
  addInterfaceFunction(p, r.value.id, 'Quitter');
  const dialogue = r.value.id;
  const dfn = (n: string) => r.value.functions.find((f) => f.name === n)!.id;
  const interact = p.interfaces.find((i) => i.name === 'BPI_Interactif')!;

  // BP_Inventaire › Noter: a fact, once.
  const inv = edit(p, 'BP_Inventaire');
  const faits = v(inv, 'Faits');
  const note = fnDef(p, inv, 'Noter', [['Fait', T.name]], []);
  const knows = note.f.node('set.contains', {}, {}, [300, 300]);
  const isNew = note.f.node('flow.branch', {}, {}, [360, 96]);
  const add = note.f.node('set.add', {}, {}, [640, 96]);
  const text = note.f.node('string.append', {}, { in0: 'Noté : ' }, [800, 300]);
  const say = note.f.node('debug.printString', {}, {}, [940, 96]);
  note.f.link(note.f.node('var.get', { variable: faits }, {}, [120, 300]), 'value', knows, 'set').link(note.entry, note.pin.Fait, knows, 'item');
  note.f.link(note.entry, 'then', isNew, 'exec').link(knows, 'result', isNew, 'condition').link(isNew, 'false', add, 'exec');
  note.f.link(note.f.node('var.get', { variable: faits }, {}, [480, 300]), 'value', add, 'set').link(note.entry, note.pin.Fait, add, 'item');
  note.f.link(add, 'then', say, 'exec').link(note.entry, note.pin.Fait, text, 'in1').link(text, 'result', say, 'text');

  // BP_Joueur: in the dialogue mode, E and F go to whoever it talks to.
  const pl = edit(p, 'BP_Joueur');
  const other = pl.variable('Interlocuteur', T.object('Actor'));
  for (const [action, fn, y] of [
    [next.value.id, 'Suivant', 1700],
    [quit.value.id, 'Quitter', 1900],
  ] as const) {
    const ev = pl.node('input.action', { action }, {}, [64, y]);
    const m = pl.node('iface.message', { interface: dialogue, fn: dfn(fn) }, {}, [400, y]);
    pl.link(ev, 'started', m, 'exec').link(pl.node('var.get', { variable: other }, {}, [240, y + 140]), 'value', m, 'target');
  }

  // WBP_Journal: a box at the bottom of the screen, and Afficher (Auteur, Texte).
  const w = newClass(p, 'WBP_Journal', 'UserWidget');
  const canvas = addW(p, w.cls, 'CanvasPanel', undefined);
  addW(p, w.cls, 'Image', canvas.id, { name: 'Img_Fond', props: { color: '#052e16' }, slot: centred(0, 230, 1120, 200) });
  addW(p, w.cls, 'TextBlock', canvas.id, { name: 'Txt_Auteur', isVariable: true, props: { text: 'Auteur', fontSize: 22, color: '#86efac' }, slot: centred(0, 165, 1060, 40) });
  addW(p, w.cls, 'TextBlock', canvas.id, { name: 'Txt_Texte', isVariable: true, props: { text: 'Texte', fontSize: 22, color: '#ecfdf5' }, slot: centred(0, 235, 1060, 90) });
  const shows = fnDef(p, w, 'Afficher', [
    ['Auteur', T.string],
    ['Texte', T.string],
  ], []);
  const who = shows.f.node('widget.setText', {}, {}, [400, 96]);
  const what = shows.f.node('widget.setText', {}, {}, [760, 96]);
  const t1 = shows.f.node('conv.stringToText', {}, {}, [240, 300]);
  const t2 = shows.f.node('conv.stringToText', {}, {}, [600, 300]);
  shows.f.link(shows.entry, 'then', who, 'exec').link(getW(shows.f, 'Txt_Auteur', [240, 200]), 'value', who, 'target').link(shows.entry, shows.pin.Auteur, t1, 'in').link(t1, 'result', who, 'text');
  shows.f.link(who, 'then', what, 'exec').link(getW(shows.f, 'Txt_Texte', [600, 200]), 'value', what, 'target').link(shows.entry, shows.pin.Texte, t2, 'in').link(t2, 'result', what, 'text');
  shows.f.link(what, 'then', shows.ret, 'exec');

  // BP_Terminal: a journal from its first page; E the next one, F or the end closes it.
  const term = newClass(p, 'BP_Terminal', 'Actor');
  term.component('StaticMesh', 'Console', { sizeX: 100, sizeY: 60, color: '#1f2937' });
  term.component('PointLight', 'Ecran', { radius: 90, color: '#22c55e' });
  implementInterface(term.cls, interact.id);
  implementInterface(term.cls, dialogue);
  const premiere = term.variable('Premiere', T.name, 'J1');
  term.cls.variables.find((x) => x.id === premiere)!.instanceEditable = true;
  const page = term.variable('Page', T.name, '');
  const boite = term.variable('Boite', T.object('WBP_Journal'));
  const table = p.dataTables.find((t) => t.name === 'DT_Journaux')!.id;
  const member = (n: string) => p.structs.find((s) => s.name === 'S_Journal')!.members.find((m) => m.name === n)!.id;
  const call = (name: string, from: string, pin: string, at: [number, number]) => {
    const c = term.node('call.custom', { owner: term.cls.id, event: name }, {}, at);
    term.link(from, pin, c, 'exec');
    return c;
  };

  // Interagir: who reads, from Premiere, in the box, in dialogue controls.
  const asked = term.node('event.interface', { interface: interact.id, fn: interact.functions[0].id }, {}, [64, 96]);
  const cast = term.node('cast.to', { class: pl.cls.id }, {}, [320, 96]);
  term.link(asked, 'then', cast, 'exec').link(term.node('actor.getPlayerPawn', {}, {}, [160, 300]), 'result', cast, 'object');
  const setOther = term.node('var.setExternal', { owner: pl.cls.id, variable: other }, {}, [620, 96]);
  term.link(cast, 'then', setOther, 'exec').link(cast, 'as', setOther, 'target').link(term.node('actor.self', {}, {}, [480, 320]), 'self', setOther, 'value');
  const first = term.node('var.set', { variable: page }, {}, [920, 96]);
  term.link(setOther, 'then', first, 'exec').link(term.node('var.get', { variable: premiere }, {}, [760, 300]), 'value', first, 'value');
  const make = term.node('widget.create', {}, { class: w.cls.id }, [1200, 96]);
  const view = term.node('widget.addToViewport', {}, {}, [1500, 96]);
  const keep = term.node('var.set', { variable: boite }, {}, [1780, 96]);
  term.link(first, 'then', make, 'exec').link(term.node('player.getController', {}, {}, [1060, 300]), 'result', make, 'owner').link(make, 'then', view, 'exec').link(make, 'result', view, 'target').link(view, 'then', keep, 'exec').link(make, 'result', keep, 'value');
  const add2 = dialogueContext(term, ctx.value.id, 'input.addMappingContext', keep, 'then', [2300, 96]);
  call('Afficher', add2, 'then', [2600, 96]);
  call('Afficher', term.node('event.interface', { interface: dialogue, fn: dfn('Suivant') }, {}, [64, 600]), 'then', [400, 600]);
  call('Fermer', term.node('event.interface', { interface: dialogue, fn: dfn('Quitter') }, {}, [64, 800]), 'then', [400, 800]);

  // Afficher: the page, the fact it gives, then the next one; no page left: Fermer.
  const y = 1100;
  const shown = term.node('event.custom', { name: 'Afficher' }, {}, [64, y]);
  const row = term.node('dataTable.getRow', { table }, {}, [360, y]);
  const brk = term.node('struct.break', { struct: 'S_Journal' }, {}, [560, y + 260]);
  const put = term.node('call.function', { owner: w.cls.id, graph: shows.graph.id }, {}, [800, y]);
  term.link(shown, 'then', row, 'exec').link(term.node('var.get', { variable: page }, {}, [200, y + 200]), 'value', row, 'rowName').link(row, 'row', brk, 'struct');
  term.link(row, 'found', put, 'exec').link(term.node('var.get', { variable: boite }, {}, [640, y + 160]), 'value', put, 'target').link(brk, member('Auteur'), put, shows.pin.Auteur).link(brk, member('Texte'), put, shows.pin.Texte);
  const none = term.node('name.isNone', {}, {}, [1000, y + 260]);
  const gives = term.node('flow.branch', {}, {}, [1100, y]);
  term.link(put, 'then', gives, 'exec').link(brk, member('Donne'), none, 'in').link(none, 'result', gives, 'condition');
  const invNode = inventoryOfPlayer(term, cls(p, 'BP_Inventaire')!.id, [1300, y + 300]);
  const noteIt = term.node('call.function', { owner: inv.cls.id, graph: note.graph.id }, {}, [1400, y + 120]);
  term.link(gives, 'false', noteIt, 'exec').link(invNode, 'result', noteIt, 'target').link(brk, member('Donne'), noteIt, note.pin.Fait);
  const move = term.node('var.set', { variable: page }, {}, [1760, y]);
  term.link(gives, 'true', move, 'exec').link(noteIt, 'then', move, 'exec').link(brk, member('Suivante'), move, 'value');
  call('Fermer', row, 'notFound', [800, y + 400]);

  // Fermer: the box goes, and the controls come back.
  const yf = 1800;
  const close = term.node('event.custom', { name: 'Fermer' }, {}, [64, yf]);
  const remove = term.node('widget.removeFromParent', {}, {}, [360, yf]);
  term.link(close, 'then', remove, 'exec').link(term.node('var.get', { variable: boite }, {}, [200, yf + 200]), 'value', remove, 'target');
  dialogueContext(term, ctx.value.id, 'input.removeMappingContext', remove, 'then', [1000, yf]);
  placeActor(p, term.cls.id, ...TERMINAL_AT);
}

const TERMINAL_SCENARIO: ScenarioStep[] = [
  ...PLAY_DORM,
  ...standAt(FRONT_TERMINAL, -90, 0.1),
  ...press('E'),
  { checkpoint: 'p1' },
  ...press('E'),
  { checkpoint: 'p2' },
  ...press('F'),
  { checkpoint: 'ferme' },
  ...press('E'),
  { checkpoint: 'relu' },
  ...press('E'),
  ...press('E'),
  { checkpoint: 'p3' },
  ...press('E'),
  { checkpoint: 'fin' },
  ...press('E'),
  { checkpoint: 'rouvre' },
];

/** Page `i` is the one on the screen now (its text, and its author unless `author` is false). */
function pageShown(i: number, why: string) {
  return (cx: CheckContext): true | string => {
    const now = pagesOnScreen(cx);
    if (now.length === 1 && now[0] === i) return onScreen(cx, PAGES[i][1]) ? true : `La page ${PAGES[i][0]} est à l’écran, mais pas son auteur (« ${PAGES[i][1]} ») : la boîte montre l’Auteur et le Texte.`;
    if (!now.length) return `On attend la page ${PAGES[i][0]} à l’écran (« ${pageText(i)} ») : aucune page n’y est. ${why}`;
    return `À l’écran : ${now.map((k) => PAGES[k][0]).join(' et ')}. On attend ${PAGES[i][0]} seule. ${why}`;
  };
}
const noPage = (why: string) => (cx: CheckContext) => {
  const now = pagesOnScreen(cx);
  return now.length ? `${now.map((k) => PAGES[k][0]).join(' et ')} encore à l’écran : ${why}` : true;
};

const terminalChecks: Check[] = [
  {
    id: 'placed',
    label: 'BP_Terminal sur le plot T',
    test: (cx) => (placedNear(cx, 'BP_Terminal', TERMINAL_AT) ? true : 'Pose un BP_Terminal sur le plot T (à moins de 80 cm de son centre), dans Lvl_Dortoir.'),
  },
  {
    id: 'opens',
    label: `E face au terminal : la première page (${PAGES[0][0]}) dans une boîte à l’écran`,
    at: 'p1',
    test: (cx) => {
      if (everShown(cx, pageText(1)))
        return `Un seul appui sur E a montré ${PAGES[0][0]} puis aussitôt ${PAGES[1][0]} : la touche encore tenue a compté dans le contexte du dialogue. Laisse cochée Ignore All Pressed Keys Until Release sur Add Mapping Context (Details).`;
      return pageShown(0, 'E face au terminal ouvre son journal à sa première page (Premiere), lue dans DT_Journaux, dans un Widget à l’écran.')(cx);
    },
  },
  {
    id: 'next',
    label: `Pendant la lecture, E montre la page suivante (${PAGES[1][0]})`,
    at: 'p2',
    test: pageShown(1, 'Pendant la lecture, E passe à la page Suivante. Si c’est encore la première, E a rouvert le journal : un Mapping Context de plus haute priorité doit garder la touche pendant la lecture.'),
  },
  {
    id: 'fact',
    label: `${PAGES[1][0]} donne un fait : « ${NOTED} », noté dans l’inventaire`,
    at: 'p2',
    test: (cx) => {
      if (countPrints(cx, NOTED) !== 1) return `${PAGES[1][0]} donne le fait ${FACT} : « ${NOTED} », une fois.`;
      if (carried(cx, FACT) === 1) return true;
      return inPlayer(cx, FACT) ? `${FACT} est dans une variable de BP_Joueur : les Faits vivent dans son inventaire (BP_Inventaire), avec les Objets.` : `« ${NOTED} », mais ${FACT} n’est dans aucune liste de l’inventaire du joueur (ses Faits).`;
    },
  },
  { id: 'close', label: 'F ferme le journal', at: 'ferme', test: noPage('F pendant la lecture ferme la boîte (Remove from Parent).') },
  {
    id: 'again',
    label: 'Fermé, E rouvre le journal à sa première page',
    at: 'relu',
    test: pageShown(0, 'Une fois le journal fermé, E retrouve son sens habituel (le Mapping Context du dialogue est retiré), et la lecture repart de Premiere.'),
  },
  {
    id: 'last',
    label: `Jusqu’à la dernière page (${PAGES[2][0]}) ; le fait n’est pas noté deux fois`,
    at: 'p3',
    test: (cx) => {
      const r = pageShown(2, 'E avance de page en page.')(cx);
      if (r !== true) return r;
      if (carried(cx, FACT) > 1) return `${FACT} est ${carried(cx, FACT)} fois dans les Faits : un fait déjà connu n’est pas noté de nouveau.`;
      return countPrints(cx, NOTED) === 1 ? true : `« ${NOTED} » ${countPrints(cx, NOTED)} fois : la seconde lecture ne le note pas de nouveau, le joueur le sait déjà.`;
    },
  },
  { id: 'end', label: 'Après la dernière page, E ferme le journal', at: 'fin', test: noPage(`après ${PAGES[2][0]}, qui n’a pas de page Suivante, E ferme la boîte.`) },
  {
    id: 'reopen',
    label: 'Puis E interagit de nouveau',
    at: 'rouvre',
    test: pageShown(0, 'Après la dernière page, le journal est fermé comme avec F : le Mapping Context du dialogue est retiré.'),
  },
  {
    id: 'context',
    label: 'La lecture passe par un Mapping Context ajouté puis retiré',
    test: (cx) => {
      if (cx.project.mappingContexts.length < 2) return 'Il n’y a qu’un Mapping Context : pendant la lecture, E et F prennent un autre sens grâce à un second Mapping Context (IMC_Dialogue), de plus haute priorité.';
      // The game's own context (IMC_Joueur) is added once by BP_PlayerController: the dialogue's is another one, added and removed.
      const own = cx.project.mappingContexts.find((m) => m.name === 'IMC_Joueur')?.id;
      const all = cx.project.classes.flatMap((c) => cx.nodes(c.name));
      const added = new Set(all.filter((n) => n.def === 'input.addMappingContext' && n.config.context !== own).map((n) => n.config.context));
      const removed = all.some((n) => n.def === 'input.removeMappingContext' && added.has(n.config.context));
      if (!added.size) return 'Aucun Blueprint n’ajoute le Mapping Context du dialogue : à l’ouverture, Add Mapping Context (IMC_Dialogue, Priority plus haute que IMC_Joueur), par le Subsystem du Player Controller.';
      return removed ? true : 'Le Mapping Context du dialogue est ajouté, jamais retiré : à la fermeture, Remove Mapping Context, sinon E et F gardent leur sens de lecture.';
    },
  },
  playerOnly,
  {
    id: 'data',
    label: 'Les pages viennent de DT_Journaux',
    test: (cx) => (cx.project.classes.some((c) => cx.nodes(c.name).some((n) => n.def === 'dataTable.getRow')) ? true : 'Lis les pages dans DT_Journaux (Get Data Table Row) : un autre journal, ce sont d’autres lignes, sans toucher au graphe.'),
  },
  noErrors(),
];

// ------------------------------------------------------------- milestone 3

function solveMenu(p: Project): void {
  const inv = edit(p, 'BP_Inventaire');
  const objets = v(inv, 'Objets');
  const faits = v(inv, 'Faits');
  // BP_Partie (GameInstance): what Continuer hands over to the level it opens.
  const gi = newClass(p, 'BP_Partie', 'GameInstance');
  const giObjets = gi.variable('Objets', T.set(T.name), []);
  const giFaits = gi.variable('Faits', T.set(T.name), []);
  const set = setGameInstanceClass(p, gi.cls.id);
  if (!set.ok) throw new Error(set.reason);
  // BP_Sauvegarde (SaveGame): the level, the objects, the facts.
  const sg = newClass(p, 'BP_Sauvegarde', 'SaveGame');
  const sNiveau = sg.variable('Niveau', T.name, '');
  const sObjets = sg.variable('Objets', T.set(T.name), []);
  const sFaits = sg.variable('Faits', T.set(T.name), []);

  // BP_Inventaire: at the start, what the GameInstance holds (empty for a new game).
  const begin = inv.node('event.beginPlay', {}, {}, [64, 1200]);
  const cast = partie(inv, p, begin, 'then', [300, 1200]);
  const setO = inv.node('var.set', { variable: objets }, {}, [600, 1200]);
  const setF = inv.node('var.set', { variable: faits }, {}, [900, 1200]);
  inv.link(cast, 'then', setO, 'exec').link(setO, 'then', setF, 'exec');
  inv.link(inv.node('var.getExternal', { owner: gi.cls.id, variable: giObjets }, {}, [480, 1400]), 'value', setO, 'value').link(cast, 'as', Object.values(inv.graph.nodes).find((n) => n.def === 'var.getExternal' && n.config.variable === giObjets)!.id, 'target');
  const gf = inv.node('var.getExternal', { owner: gi.cls.id, variable: giFaits }, {}, [780, 1400]);
  inv.link(cast, 'as', gf, 'target').link(gf, 'value', setF, 'value');

  // BP_Terminal: closing it saves the game.
  const term = edit(p, 'BP_Terminal');
  const removeCtx = nodeWhere(term, (n) => n.def === 'input.removeMappingContext');
  const save = term.node('call.custom', { owner: term.cls.id, event: 'Sauver' }, {}, [1300, 1800]);
  term.link(removeCtx.id, 'then', save, 'exec');
  const y = 2300;
  const ev = term.node('event.custom', { name: 'Sauver' }, {}, [64, y]);
  const fresh = term.node('save.create', {}, { saveClass: sg.cls.id }, [300, y]);
  const lvl = term.node('level.currentName', {}, {}, [400, y + 260]);
  const toName = term.node('conv.stringToName', {}, {}, [560, y + 260]);
  const setN = term.node('var.setExternal', { owner: sg.cls.id, variable: sNiveau }, {}, [700, y]);
  term.link(ev, 'then', fresh, 'exec').link(fresh, 'then', setN, 'exec').link(fresh, 'result', setN, 'target').link(lvl, 'result', toName, 'in').link(toName, 'result', setN, 'value');
  const invNode = inventoryOfPlayer(term, inv.cls.id, [900, y + 420]);
  const setSO = term.node('var.setExternal', { owner: sg.cls.id, variable: sObjets }, {}, [1000, y]);
  const setSF = term.node('var.setExternal', { owner: sg.cls.id, variable: sFaits }, {}, [1300, y]);
  const go = term.node('var.getExternal', { owner: inv.cls.id, variable: objets }, {}, [1100, y + 300]);
  const gf2 = term.node('var.getExternal', { owner: inv.cls.id, variable: faits }, {}, [1100, y + 420]);
  term.link(setN, 'then', setSO, 'exec').link(fresh, 'result', setSO, 'target').link(invNode, 'result', go, 'target').link(go, 'value', setSO, 'value');
  term.link(setSO, 'then', setSF, 'exec').link(fresh, 'result', setSF, 'target').link(invNode, 'result', gf2, 'target').link(gf2, 'value', setSF, 'value');
  const write = term.node('save.toSlot', {}, { slot: SLOT }, [1600, y]);
  term.link(setSF, 'then', write, 'exec').link(fresh, 'result', write, 'object').link(write, 'then', term.node('debug.printString', {}, { text: SAVED }, [1900, y]), 'exec');

  // WBP_Menu: three buttons; Continuer only with a save.
  const w = newClass(p, MENU_WBP, 'UserWidget');
  const canvas = menuPanel(p, w.cls, 'Le réveil', { back: '#0f172a', title: '#7dd3fc' });
  button(p, w.cls, canvas, NEW, 'Nouvelle partie', 0, -40);
  const resume = button(p, w.cls, canvas, RESUME, 'Continuer', 0, 50);
  button(p, w.cls, canvas, QUIT, 'Quitter', 0, 140);
  resume.isVariable = true;
  const construct = w.node('event.construct', {}, {}, [64, 96]);
  const exists = w.node('save.exists', {}, { slot: SLOT }, [300, 96]);
  const enable = w.node('widget.setIsEnabled', {}, {}, [600, 96]);
  w.link(construct, 'then', exists, 'exec').link(exists, 'then', enable, 'exec').link(exists, 'result', enable, 'enabled').link(getW(w, RESUME, [440, 300]), 'value', enable, 'target');
  // Lancer (Niveau): back to the game's controls, then the level (the menu leaves with its level, its UI Only may not).
  const launch = fnDef(p, w, 'Lancer', [['Niveau', T.name]], []);
  const gpc = launch.f.node('widget.getOwningPlayer', {}, {}, [160, 300]);
  const gameOnly = launch.f.node('input.setModeGameOnly', {}, {}, [360, 96]);
  const noCursor = launch.f.node('input.setShowMouseCursor', {}, { show: false }, [640, 96]);
  const travel = launch.f.node('level.open', {}, {}, [920, 96]);
  launch.f.link(launch.entry, 'then', gameOnly, 'exec').link(gpc, 'result', gameOnly, 'controller').link(gameOnly, 'then', noCursor, 'exec').link(gpc, 'result', noCursor, 'target');
  launch.f.link(noCursor, 'then', travel, 'exec').link(launch.entry, launch.pin.Niveau, travel, 'level').link(travel, 'then', launch.ret, 'exec');
  // Nouvelle partie: the dormitory, from zero (a new GameInstance holds nothing).
  w.link(onButton(w, NEW), 'then', w.node('call.function', { graph: launch.graph.id }, { [launch.pin.Niveau]: DORM }, [400, 500]), 'exec');
  // Continuer: the save, handed to the GameInstance, then its level.
  const click = onButton(w, RESUME);
  Object.assign(w.graph.nodes[click], { x: 64, y: 800 });
  const load = w.node('save.fromSlot', {}, { slot: SLOT }, [300, 800]);
  const asSave = w.node('cast.to', { class: sg.cls.id }, {}, [560, 800]);
  w.link(click, 'then', load, 'exec').link(load, 'then', asSave, 'exec').link(load, 'result', asSave, 'object');
  const wgi = partie(w, p, asSave, 'then', [860, 800]);
  const putO = w.node('var.setExternal', { owner: gi.cls.id, variable: giObjets }, {}, [1160, 800]);
  const putF = w.node('var.setExternal', { owner: gi.cls.id, variable: giFaits }, {}, [1460, 800]);
  const rO = w.node('var.getExternal', { owner: sg.cls.id, variable: sObjets }, {}, [1000, 1060]);
  const rF = w.node('var.getExternal', { owner: sg.cls.id, variable: sFaits }, {}, [1300, 1060]);
  const rN = w.node('var.getExternal', { owner: sg.cls.id, variable: sNiveau }, {}, [1600, 1060]);
  w.link(wgi, 'then', putO, 'exec').link(wgi, 'as', putO, 'target').link(asSave, 'as', rO, 'target').link(rO, 'value', putO, 'value');
  w.link(putO, 'then', putF, 'exec').link(wgi, 'as', putF, 'target').link(asSave, 'as', rF, 'target').link(rF, 'value', putF, 'value');
  const open = w.node('call.function', { graph: launch.graph.id }, {}, [1760, 800]);
  w.link(putF, 'then', open, 'exec').link(asSave, 'as', rN, 'target').link(rN, 'value', open, launch.pin.Niveau);
  // Quitter.
  const bye = w.node('game.quitGame', {}, {}, [400, 1300]);
  w.link(onButton(w, QUIT), 'then', bye, 'exec').link(w.node('widget.getOwningPlayer', {}, {}, [200, 1500]), 'result', bye, 'player');

  // Lvl_Menu: BP_Menu puts it on the screen, UI Only. It is the Game Default Map.
  const menuCls = newClass(p, 'BP_Menu', 'Actor');
  const mb = menuCls.node('event.beginPlay', {}, {}, [64, 96]);
  const mpc = menuCls.node('player.getController', {}, {}, [200, 360]);
  const mk = menuCls.node('widget.create', {}, { class: w.cls.id }, [340, 96]);
  const vp = menuCls.node('widget.addToViewport', {}, {}, [640, 96]);
  const ui = menuCls.node('input.setModeUIOnly', {}, {}, [940, 96]);
  const show = menuCls.node('input.setShowMouseCursor', {}, { show: true }, [1240, 96]);
  menuCls.link(mb, 'then', mk, 'exec').link(mpc, 'result', mk, 'owner').link(mk, 'then', vp, 'exec').link(mk, 'result', vp, 'target').link(vp, 'then', ui, 'exec').link(mpc, 'result', ui, 'controller').link(mk, 'result', ui, 'focus');
  menuCls.link(ui, 'then', show, 'exec').link(mpc, 'result', show, 'target');
  const lv = addLevel(p, MENU);
  if (!lv.ok) throw new Error(lv.reason);
  const openLevel = p.editorLevelId;
  p.editorLevelId = lv.value.id;
  const placed = placeActor(p, menuCls.cls.id, 0, 0);
  if (!placed.ok) throw new Error(placed.reason);
  levelOf(p).playerStart = { x: 0, y: 300, yaw: 0 };
  if (openLevel === undefined) delete p.editorLevelId;
  else p.editorLevelId = openLevel;
  const def = setGameDefaultMap(p, lv.value.id);
  if (!def.ok) throw new Error(def.reason);
}

/** Take the badge, read the terminal up to the fact, close it with F. */
const PLAY_THROUGH: ScenarioStep[] = [...TAKE_BADGE, ...READ_TERMINAL];

const MENU_SCENARIO: ScenarioStep[] = [
  { wait: 0.3 },
  { checkpoint: 'menu' },
  { click: `${MENU_WBP}/${RESUME}` },
  { wait: 0.3 },
  { checkpoint: 'grise' },
  { click: `${MENU_WBP}/${NEW}` },
  { wait: 0.3 },
  { checkpoint: 'nouvelle' },
  ...PLAY_THROUGH,
  { checkpoint: 'sauve' },
  { restart: true },
  { wait: 0.3 },
  { checkpoint: 'menu2' },
  { click: `${MENU_WBP}/${RESUME}` },
  { wait: 0.3 },
  { checkpoint: 'reprise' },
  ...standAt(FRONT_CASIER, -90, 0.1),
  ...press('E'),
  { checkpoint: 'casier' },
  { restart: true },
  { wait: 0.3 },
  { click: `${MENU_WBP}/${NEW}` },
  { wait: 0.3 },
  { checkpoint: 'nouvelle2' },
  { restart: true },
  { wait: 0.3 },
  { click: `${MENU_WBP}/${QUIT}` },
  { wait: 0.3 },
  { checkpoint: 'quitte' },
];

/** The menu on the screen in Lvl_Menu, UI Only, the cursor shown; Continuer enabled or not. */
function menuShown(resumable: boolean, why: string) {
  return (cx: CheckContext): true | string => {
    if (cx.level() !== MENU) return `Le jeu est dans ${cx.level()} : au lancement, on attend le menu, ${MENU} (Game Default Map, dans Project Settings › Maps & Modes).`;
    for (const [name, label] of [
      [NEW, 'Nouvelle partie'],
      [RESUME, 'Continuer'],
      [QUIT, 'Quitter'],
    ]) {
      const b = drawnProp(cx, name);
      if (!b?.drawn) return `Pas de bouton ${name} (« ${label} ») à l’écran : ${MENU_WBP} a trois boutons, ${NEW}, ${RESUME} et ${QUIT}.`;
    }
    if (cx.sim.inputMode !== 'UIOnly') return `Le menu est en ${modeLabel(cx)} : on ne joue pas encore, c’est UI Only.`;
    if (!cx.sim.showMouseCursor) return 'Le menu est là, mais le curseur est caché : Set Show Mouse Cursor (coché).';
    const on = drawnProp(cx, RESUME)!.enabled;
    if (on === resumable) return true;
    return resumable ? `${RESUME} est grisé alors qu’une partie est sauvée : ${why}` : `${RESUME} est actif alors qu’il n’y a encore aucune sauvegarde : ${why}`;
  };
}

/** In the dormitory, Game Only, with these lists in the inventory. */
function inGame(items: string[], why: string) {
  return (cx: CheckContext): true | string => {
    if (cx.level() !== DORM) return `Le jeu est dans ${cx.level()} : on attend ${DORM} (Open Level).`;
    if (cx.sim.inputMode !== 'GameOnly') return `En jeu, le mode d’entrée est ${modeLabel(cx)} : remets Game Only au début de la partie.`;
    if (cx.sim.showMouseCursor) return 'En jeu, le curseur est encore affiché : Set Show Mouse Cursor (décoché) au début de la partie.';
    for (const it of [BADGE, FACT]) {
      const want = items.includes(it) ? 1 : 0;
      const got = carried(cx, it);
      if (got !== want) return want ? `${it} n’est pas dans l’inventaire du joueur. ${why}` : `${it} est déjà dans l’inventaire du joueur. ${why}`;
    }
    return true;
  };
}

const menuChecks: Check[] = [
  { id: 'menu', label: `Au lancement, le menu (${MENU}) : trois boutons, UI Only ; Continuer grisé sans sauvegarde`, at: 'menu', test: menuShown(false, 'Is Enabled suit Does Save Game Exist (slot Reveil), en ouvrant le menu.') },
  {
    id: 'greyed',
    label: 'Continuer grisé ne fait rien',
    at: 'grise',
    test: (cx) => (cx.level() === MENU ? true : `Continuer, sans sauvegarde, a ouvert ${cx.level()} : il reste grisé (Is Enabled décoché) tant qu’il n’y a rien à reprendre.`),
  },
  { id: 'new', label: `Nouvelle partie : ${DORM}, Game Only, l’inventaire vide`, at: 'nouvelle', test: inGame([], 'Une nouvelle partie part de zéro.') },
  {
    id: 'save',
    label: `Le terminal refermé : « ${SAVED} »`,
    at: 'sauve',
    test: (cx) => {
      const n = countPrints(cx, SAVED);
      if (n === 1) return true;
      return n ? `${n} « ${SAVED} » : une sauvegarde quand le terminal se referme.` : `Le joueur a lu le terminal puis l’a refermé (F) : pas de « ${SAVED} ». Refermer le terminal sauve la partie (Save Game to Slot, slot ${SLOT}).`;
    },
  },
  { id: 'resumable', label: 'Stop, Play : Continuer est actif', at: 'menu2', test: menuShown(true, 'Is Enabled suit Does Save Game Exist, lu à chaque ouverture du menu.') },
  {
    id: 'resume',
    label: 'Continuer : le niveau sauvé, avec le badge et le code dans l’inventaire',
    at: 'reprise',
    test: inGame([BADGE, FACT], 'Continuer reprend la sauvegarde : le niveau (Niveau), et l’inventaire, qui passe par le GameInstance (le joueur du menu disparaît avec Open Level), relu par BP_Inventaire à son BeginPlay.'),
  },
  {
    id: 'locker',
    label: 'Après Continuer, le casier ne redonne pas le badge',
    at: 'casier',
    test: (cx) => {
      if (carried(cx, BADGE) !== 1) return `${carried(cx, BADGE)} badge${carried(cx, BADGE) > 1 ? 's' : ''} dans l’inventaire après Continuer et E au casier : on en attend un.`;
      if (countPrints(cx, TAKEN) > 1) return `« ${TAKEN} » de nouveau après Continuer : le casier ne se souvient de rien d’une partie à l’autre, mais l’inventaire, si. Demande-lui (Possede) si le joueur a déjà le badge.`;
      return countPrints(cx, EMPTY) === 1 ? true : `E au casier après Continuer : pas de « ${EMPTY} ».`;
    },
  },
  { id: 'new-again', label: 'Nouvelle partie, même avec une sauvegarde : l’inventaire vide', at: 'nouvelle2', test: inGame([], 'Une nouvelle partie ne lit pas la sauvegarde : seul Continuer la reprend.') },
  { id: 'quit', label: 'Quitter ferme le jeu', at: 'quitte', test: (cx) => (cx.quitted() ? true : 'Quitter ne ferme pas le jeu : Quit Game.') },
  notion(usesNode('gi', 'BP_Inventaire', ['game.getGameInstance'], 'L’inventaire repris passe par le GameInstance', 'Ce qui doit traverser Open Level vit dans le GameInstance : Continuer y dépose l’inventaire sauvé, BP_Inventaire l’y relit à son BeginPlay.')),
  {
    id: 'slot',
    label: `La partie est écrite dans une Save Game (slot ${SLOT})`,
    test: (cx) => (cx.project.classes.some((c) => cx.nodes(c.name).some((n) => n.def === 'save.toSlot')) ? true : `Écris la partie dans le slot ${SLOT} (Save Game to Slot) ; Does Save Game Exist et Load Game from Slot le relisent.`),
  },
  noErrors(),
];

// -------------------------------------------------------------- the project

const SETUP =
  `Déjà là : le projet UE5 (IMC_Joueur : E → **IA_Interagir**, BP_PlayerController), un BP_Joueur au graphe vide, le niveau **${DORM}** : le caisson de stase où le joueur se réveille (du décor), deux plots **C** et **T**. La structure **S_Journal** (Auteur, Texte, Suivante, Donne) et la Data Table **DT_Journaux** (J1, J2, J3 : la page J2 donne le fait \`${FACT}\`). Tout le reste est à créer.`;


export const expertWakeup: Lesson = withMilestones(
  {
    id: 'x6-reveil',
    code: 'X6',
    module: 'Projet Expert',
    level: 'expert',
    number: 0,
    title: 'Le réveil',
    situation:
      'Le joueur sort de stase dans le dortoir d’une station plongée dans le noir. Il regarde autour de lui, fouille un casier, lit ce que racontent les terminaux, remet le générateur en marche avec les fusibles de l’atelier, et gagne la salle de contrôle. Un menu lance une nouvelle partie ou reprend la dernière sauvegarde.',
    recalls: ['trace', 'interfaces', 'tick', 'actor-components', 'functions', 'sets', 'cast', 'umg', 'enhanced-input', 'player-controller', 'data-tables', 'structs', 'save-game', 'game-instance', 'levels', 'ui-input', 'dispatchers', 'inheritance', 'timeline', 'loops', 'destroy', 'widget-component', 'overlap'],
    notions: ['Projet Expert', 'Line Trace By Channel', 'Blueprint Interface', 'Actor Component', 'Mapping Context de dialogue', 'Data Table', 'SaveGame', 'GameInstance', 'Open Level (by Name)', 'Event Dispatcher', 'Classe parente', 'Timeline', 'Widget Component'],
    remember:
      'Le joueur regarde et envoie Interagir, sans savoir à qui ; chaque objet y répond à sa façon. Ce qu’il porte vit dans un composant. Le générateur annonce sans savoir qui écoute, et un composant fait réagir ce qui le porte. Une famille de portes écrit le mouvement une fois. La Save Game garde la partie d’une séance à l’autre, le GameInstance la porte d’un niveau à l’autre, et chaque niveau relit en commençant ce qui doit durer.',
    cards: [EXPERT_RULES, REDO_WAKEUP],
    hints: [
      'Qui regarde, qui répond, qui se souvient de quoi, et pendant combien de temps (une image, un niveau, une partie) ?',
      'Line Trace By Channel, Get Actor Forward Vector, Blueprint Interface (Message), Does Implement Interface, Set Visibility ; Actor Component, Set (Add, Contains), Get Component by Class ; Get Data Table Row, Add / Remove Mapping Context ; Save Game, Does Save Game Exist, Set Is Enabled, GameInstance, Open Level, Quit Game ; Instance Editable, Destroy Actor, For Each Loop, Widget Component, Event Dispatcher, Parent Class, Timeline, Delete Game in Slot.',
      'Solution : voir la solution de référence, ouverte une fois le projet réussi.',
    ],
    challenge:
      'Pose un second terminal dans la salle de contrôle, avec son propre journal, sans toucher au graphe (Premiere et de nouvelles lignes de DT_Journaux) ; fais que l’invite dise « E : lire » devant un terminal et « E : ouvrir » devant une porte, sans que le joueur les connaisse ; et allume l’écran des terminaux quand le courant revient, avec un BP_Alimente de plus.',
    revision: 2,
    setup: project,
  },
  [
    {
      id: 'regarder',
      title: 'Regarder',
      cards: [
        {
          title: 'Cahier des charges',
          body:
            `${SETUP}\n\n` +
            `1. **E agit sur ce que le joueur regarde** : ce que touche un rayon parti du joueur, jusqu’à **${REACH} cm** devant lui. Ce qui peut répondre implémente l’interface **BPI_Interactif** (Interagir) ; le joueur ne connaît pas les objets.\n` +
            `2. **L’invite** : « ${PROMPT} » à l’écran tant que le joueur regarde quelque chose d’interactif à portée, cachée sinon (le caisson, du décor, ne compte pas).\n` +
            `3. Le joueur porte un **inventaire**, un Actor Component **BP_Inventaire** : ses **Objets** (et bientôt ses **Faits**), sans doublon.\n` +
            `4. **BP_Casier**, posé sur le plot C. E face à lui : le badge (\`${BADGE}\`) entre dans l’inventaire, et \`${TAKEN}\`. Ensuite : \`${EMPTY}\`.`,
        },
        {
          title: 'Le scénario de test',
          body: `Play dans ${DORM}. Face au caisson : pas d’invite. Face au casier à 4,5 m : pas d’invite ; à 2 m : l’invite. Le joueur se tourne vers le sud : plus d’invite. Tourné vers l’est, tout près du casier, E : rien. Face au casier, E : le badge ; E encore : « ${EMPTY} ».`,
        },
        {
          title: 'Pour aller plus loin',
          body:
            '**Regarder plutôt que toucher** : avec un chevauchement, deux objets proches répondraient ensemble, et E agirait dans le dos du joueur. Le rayon dit ce qu’il regarde, lui seul, et s’arrête au premier obstacle.\n\n' +
            '**Une fonction pour viser** : E et l’invite posent la même question. Écrite une fois (une fonction qui rend l’acteur touché), elle ne peut pas diverger.\n\n' +
            '**Le casier demande à l’inventaire** s’il a déjà le badge, au lieu de se souvenir lui-même qu’il l’a donné : tu verras au jalon 3 pourquoi c’est le bon réflexe.',
        },
      ],
      objectives: [`E agit sur ce que le joueur regarde (${REACH} cm), l’invite « ${PROMPT} » le suit.`, 'Le casier donne le badge une fois, rangé dans l’inventaire (Actor Component).'],
      scenario: LOOK_SCENARIO,
      checks: lookChecks,
      solve: solveLook,
    },
    {
      id: 'terminal',
      title: 'Le terminal',
      cards: [
        {
          title: 'Cahier des charges',
          body:
            '1. **BP_Terminal**, posé sur le plot T, avec une variable **Premiere** (Name, Instance Editable) : la page où commence son journal. Celui du plot T commence à **J1**.\n' +
            '2. E face au terminal : une **boîte** à l’écran montre la page, son **Auteur** et son **Texte**, lus dans DT_Journaux.\n' +
            '3. **Pendant la lecture**, E montre la page **Suivante**, F **ferme**. E ne fait rien d’autre (ni rouvrir, ni agir sur autre chose).\n' +
            `4. Une page qui **donne un fait** le note dans les **Faits** de l’inventaire et affiche \`Noté : ${FACT}\`, seulement si le joueur ne le savait pas déjà.\n` +
            '5. Après la dernière page, E ferme la boîte, comme F. Fermé, E interagit de nouveau ; la lecture repart de Premiere.\n\n' +
            'Contrainte UE5 : **le changement de sens de E et F passe par un Mapping Context** (IMC_Dialogue) ajouté à l’ouverture, retiré à la fermeture.',
        },
        {
          title: 'Le scénario de test',
          body: `Play dans ${DORM}, face au terminal. E : J1. E : J2 et « ${NOTED} ». F : la boîte se ferme. E : J1 de nouveau ; E, E : J3, et le fait n’est pas noté une seconde fois. E : la boîte se ferme. E : J1.`,
        },
        {
          title: 'Pour aller plus loin',
          body:
            '**Le terminal ne sait pas qui lit** : il reçoit Interagir, puis Suivant et Quitter, d’une seconde interface (BPI_Dialogue) que le joueur envoie à son interlocuteur.\n\n' +
            '**Premiere** : le même Blueprint fera tous les terminaux de la station, chacun son journal, réglé dans le niveau.',
        },
      ],
      objectives: ['Le journal du terminal page par page dans une boîte à l’écran (E suivante, F ferme), par un Mapping Context.', `Le fait ${FACT} noté une fois dans l’inventaire.`],
      scenario: TERMINAL_SCENARIO,
      checks: terminalChecks,
      solve: solveTerminal,
    },
    {
      id: 'menu',
      title: 'Le menu et la sauvegarde',
      cards: [
        {
          title: 'Cahier des charges',
          body:
            `1. Un niveau **${MENU}**, la Game Default Map : un menu **${MENU_WBP}** avec trois boutons, **${NEW}** (Nouvelle partie), **${RESUME}** (Continuer) et **${QUIT}** (Quitter). UI Only, curseur visible.\n` +
            `2. **Continuer est grisé** (Is Enabled) tant qu’aucune partie n’est sauvée (slot \`${SLOT}\`).\n` +
            `3. **Nouvelle partie** ouvre ${DORM}, l’inventaire vide, même s’il existe une sauvegarde. En jeu : Game Only, pas de curseur.\n` +
            '4. **Quitter** ferme le jeu.\n' +
            `5. **Refermer le terminal sauve la partie** (F ou après la dernière page) : le niveau, les Objets et les Faits, dans une Save Game, et \`${SAVED}\`.\n` +
            '6. **Continuer** rouvre le niveau sauvé, avec l’inventaire sauvé. Et le casier ne redonne pas le badge à qui l’a déjà.',
        },
        {
          title: 'Le scénario de test',
          body: `Play : le menu, Continuer grisé (le toucher ne fait rien). Nouvelle partie : ${DORM}, l’inventaire vide. Le joueur prend le badge, lit J1 et J2, ferme : « ${SAVED} ». Stop, Play : Continuer est actif ; il rouvre ${DORM}, le badge et ${FACT} dans l’inventaire ; E au casier : « ${EMPTY} ». Stop, Play, Nouvelle partie : l’inventaire vide. Stop, Play, Quitter. Les jalons 1 et 2 se vérifient toujours en jouant ${DORM} directement.`,
        },
        {
          title: 'Pour aller plus loin',
          body:
            '**Trois mémoires, trois durées** : une variable d’acteur vit le temps du niveau, le GameInstance le temps du jeu (de Play à Stop, à travers Open Level), la Save Game d’une séance à l’autre. Continuer va de la plus longue à la plus courte : la Save Game au GameInstance, puis le GameInstance à l’inventaire du nouveau niveau.\n\n' +
            '**Le mode d’entrée** : un niveau règle le sien en commençant. Dans UE, ce que le menu a réglé (UI Only) peut suivre jusque dans le niveau suivant, et le joueur ne répond plus.\n\n' +
            '**Ce que la sauvegarde ne contient pas** : le casier n’y est pas. S’il se souvenait lui-même d’avoir donné le badge, Continuer l’oublierait ; parce qu’il demande à l’inventaire, il a raison sans rien sauver de plus.',
        },
      ],
      objectives: [`${MENU} : Nouvelle partie, Continuer (grisé sans sauvegarde), Quitter, UI Only.`, 'Le terminal refermé sauve la partie ; Continuer la reprend (Save Game, GameInstance).'],
      scenario: MENU_SCENARIO,
      checks: menuChecks,
      solve: solveMenu,
    },
    generatorMilestone,
    powerMilestone,
    controlMilestone,
  ],
);

