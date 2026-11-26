/**
 * Expert project X2 « L'atelier des machines » (lot 4b of the path plan,
 * enriched in V7.66, chantier n° 5, docs/PLAN_EXPERT_FINAL.md). One
 * milestone. Inheritance taken up again: one parent machine holds everything
 * the machines share; the fan adds its blades and must call its parent's
 * Tick. V7.66 adds what the old X2 left out: the fuel lives in an Actor
 * Component (something a machine *has*, set per placed machine), and a
 * control panel on the screen, one row per machine built in game (Get All
 * Actors Of Class, Expose on Spawn), updated by an Event Dispatcher, its
 * button doing what E does, the game still played (Game and UI). Tested at
 * 30 frames per second.
 */
import type { BlueprintClass, Project } from '../../model/project';
import { levelOf } from '../../model/project';
import { addDispatcher, addDispatcherParam, implementInterface } from '../../operations/classOps';
import { disconnectPin } from '../../operations/graphOps';
import { setComponentOverride, placeActor } from '../../operations/levelOps';
import { addInterface, addInterfaceFunction, setParentClass } from '../../operations/projectOps';
import type { ActorRT } from '../../runtime/world';
import { inheritedView } from '../../model/inheritance';
import { T } from '../../types/pins';
import { ClassBuilder, edit, ProjectBuilder } from '../builder';
import { countPrints, noRuntimeErrors, normText, notion, usesNode } from '../checks';
import { withMilestones } from '../milestones';
import type { CheckContext, Lesson } from '../types';
import { ensurePlayerInput } from '../ue5Input';
import { EXPERT_RULES, expertScenery } from './expertKit';
import { REDO_WORKSHOP } from './expertUe5';
import { fnDef, goTo, tap } from './kit';
import { playerBlueprint } from './props';
import { eventDriven, ignoredTouch, made, modeLabel } from './umgKit';
import { addW, controller, getW, newClass, onButton } from './umgKit';
import { playerTells } from './universalLever';

const PUMP_AT: [number, number] = [-350, -200];
const FAN_AT: [number, number] = [350, -200];
const ROW = 'WBP_LigneMachine';
const BUTTON = 'Btn_Bascule';
const RUNNING = 'En marche';
const STOPPED = 'Arrêt';

function project(): Project {
  const pb = new ProjectBuilder('L’atelier des machines');
  playerBlueprint(pb);
  expertScenery(pb, [
    [PUMP_AT, 'M1'],
    [FAN_AT, 'M2'],
  ]);
  ensurePlayerInput(pb.project, ['E'], { E: 'IA_Interagir' });
  pb.playerStart(0, 250);
  return pb.project;
}

// ------------------------------------------------------------------ checks

const machine = (cx: CheckContext, cls: string) => cx.sim.actors.find((a) => a.className === cls && !a.destroyed);
const lightOn = (cx: CheckContext, cls: string) => !!machine(cx, cls)?.components.some((c) => c.kind === 'PointLight' && c.props.visible);
const bladesYaw = (cx: CheckContext) => machine(cx, 'BP_Ventilo')?.components.find((c) => c.name === 'Helice')?.props.yaw ?? 0;
const placed = (cx: CheckContext, name: string, at: [number, number]) =>
  levelOf(cx.project).actors.some((a) => cx.project.classes.find((c) => c.id === a.classId)?.name === name && Math.hypot(a.x - at[0], a.y - at[1]) <= 80);

/** The rows of the panel on the screen: each row widget object and the texts it draws. */
function rows(cx: CheckContext): { obj: ActorRT; texts: string[] }[] {
  const out = new Map<ActorRT, string[]>();
  for (const l of cx.sim.umg.layer(1280).flatMap((s) => s.laid)) {
    if (l.widget.kind !== 'TextBlock' || !l.drawn) continue;
    const obj = cx.sim.umg.objectOf(l.path);
    if (obj?.className !== ROW) continue;
    out.set(obj, [...(out.get(obj) ?? []), String(l.props.text ?? '')]);
  }
  return [...out].map(([obj, texts]) => ({ obj, texts }));
}

/** What the row of the machine named `name` says of its state: running, stopped, or why it cannot tell. */
function rowState(cx: CheckContext, name: string): 'running' | 'stopped' | string {
  const row = rows(cx).find((r) => r.texts.some((t) => normText(t).includes(normText(name))));
  if (!row) return `Le panneau n’a pas de ligne qui affiche « ${name} ».`;
  const all = normText(row.texts.join(' | '));
  if (all.includes(normText(RUNNING))) return 'running';
  if (all.includes(normText(STOPPED))) return 'stopped';
  return `La ligne « ${name} » affiche « ${row.texts.join(' | ')} » : on attend « ${RUNNING} » ou « ${STOPPED} ».`;
}

function rowSays(id: string, label: string, at: string, want: Record<string, 'running' | 'stopped'>, why: string) {
  return {
    id,
    label,
    at,
    test: (cx: CheckContext) => {
      for (const [name, state] of Object.entries(want)) {
        const now = rowState(cx, name);
        if (now === state) continue;
        if (now !== 'running' && now !== 'stopped') return now;
        return `La ligne « ${name} » affiche « ${now === 'running' ? RUNNING : STOPPED} », on attend « ${state === 'running' ? RUNNING : STOPPED} ». ${why}`;
      }
      return true;
    },
  };
}

/** The component classes carried by `name` or its parents (a child inherits its parent's components). */
function carriedComponents(p: Project, name: string): BlueprintClass[] {
  const cls = p.classes.find((c) => c.name === name);
  if (!cls) return [];
  const view = inheritedView(cls, p, true);
  return view.components.filter((k) => k.kind === 'ActorComponent').flatMap((k) => p.classes.filter((c) => c.id === k.classId));
}

/** The fuel lives in an Actor Component carried by BP_Machine, not in a variable of the machines. */
function fuelInComponent(cx: CheckContext): true | string {
  const p = cx.project;
  const comps = carriedComponents(p, 'BP_Machine');
  if (!comps.length) return 'Le carburant doit vivre dans un Actor Component (+ Add › Blueprint Class › Actor Component), ajouté aux Components de BP_Machine.';
  if (!comps.some((c) => c.variables.some((v) => v.type.category === 'float' && v.instanceEditable)))
    return `${comps[0].name} n’a pas de variable Float Instance Editable pour le carburant : c’est elle que chaque machine posée règle (3 pour la pompe, 1 pour le ventilateur).`;
  for (const name of ['BP_Machine', 'BP_Pompe', 'BP_Ventilo']) {
    // A number named like the fuel; a reference to the component (Reservoir, BP_Reservoir) is fine (V7.73).
    const fuel = p.classes.find((c) => c.name === name)?.variables.find((v) => (v.type.category === 'float' || v.type.category === 'int') && /carbu|fuel|reserv/i.test(v.name));
    if (fuel) return `${name} a encore une variable ${fuel.name} : le carburant est quelque chose que la machine a, il vit dans le composant, réglé machine par machine.`;
  }
  return true;
}

/** The panel: one row per machine, built in game, and the touch reaching the buttons. */
function panelBuilt(cx: CheckContext): true | string {
  const built = made(cx, ROW).length;
  const shown = rows(cx).length;
  if (!cx.project.classes.some((c) => c.name === ROW)) return `Crée le Widget Blueprint ${ROW} (une ligne : le Nom, l’état, le bouton ${BUTTON}).`;
  if (!built) return `Aucune ${ROW} créée pendant la partie : le panneau les construit en jeu, une par machine posée (Create Widget, Add Child to Vertical Box).`;
  if (shown !== 2) return `${shown} ligne${shown > 1 ? 's' : ''} à l’écran, on en attend 2 : une par machine posée. ${shown === 0 ? 'Le panneau est-il ajouté à l’écran (Add to Viewport) ?' : ''}`.trim();
  if (cx.sim.inputMode !== 'GameAndUI') return `Le jeu est en ${modeLabel(cx)} : les boutons du panneau et les touches doivent marcher ensemble, c’est Game and UI.`;
  return cx.sim.showMouseCursor ? true : 'Le panneau est là, mais le curseur est caché : Set Show Mouse Cursor (coché).';
}

// -------------------------------------------------------------- solution

/** Milestone 1, the machines: the interface, the reservoir, BP_Machine and its two children, placed. */
function solveMachines(p: Project): void {
  const r = addInterface(p, 'BPI_Interactif');
  if (!r.ok) throw new Error(r.reason);
  addInterfaceFunction(p, r.value.id, 'Interagir');
  const iface = r.value.id;
  const fn = r.value.functions[0].id;
  const player = new ClassBuilder(p.classes.find((c) => c.name === 'BP_Joueur')!, p);
  playerTells(player, p.inputActions.find((a) => a.name === 'IA_Interagir')!.id, iface, fn);

  // ---- BP_Reservoir: the fuel, spent by whoever owns it, and a word when empty.
  const res = newClass(p, 'BP_Reservoir', 'ActorComponent');
  const fuel = res.variable('Carburant', T.float, 2);
  res.cls.variables.find((v) => v.id === fuel)!.instanceEditable = true;
  const empty = addDispatcher(res.cls, 'OnVide').id;
  const spend = fnDef(p, res, 'Consommer', [['Secondes', T.float]], []);
  const { f } = spend;
  const sub = f.node('math.subtractFloat', {}, {}, [300, 300]);
  const floor = f.node('math.maxFloat', {}, { b: 0 }, [520, 300]);
  const set = f.node('var.set', { variable: fuel }, {}, [420, 96]);
  const zero = f.node('math.lessEqualFloat', {}, { b: 0 }, [700, 300]);
  const now = f.node('flow.branch', {}, {}, [760, 96]);
  const call = f.node('dispatcher.call', { owner: res.cls.id, dispatcher: empty }, {}, [1040, 96]);
  f.link(f.node('var.get', { variable: fuel }, {}, [100, 300]), 'value', sub, 'a').link(spend.entry, spend.pin.Secondes, sub, 'b').link(sub, 'result', floor, 'a');
  f.link(spend.entry, 'then', set, 'exec').link(floor, 'result', set, 'value').link(set, 'then', now, 'exec');
  f.link(set, 'out', zero, 'a').link(zero, 'result', now, 'condition').link(now, 'true', call, 'exec');
  f.link(call, 'then', spend.ret, 'exec').link(now, 'false', spend.ret, 'exec');

  // ---- BP_Machine: what every machine shares.
  const b = newClass(p, 'BP_Machine', 'Actor');
  const base = b.cls;
  b.component('StaticMesh', 'Socle', { sizeX: 110, sizeY: 80, color: '#475569' });
  b.component('PointLight', 'Voyant', { visible: false, radius: 160, color: '#22c55e' });
  b.component('BoxCollision', 'Zone', { sizeX: 220, sizeY: 220 });
  const tank = b.logic(res, 'Reservoir');
  const nom = b.variable('Nom', T.string, 'Machine');
  base.variables.find((v) => v.id === nom)!.instanceEditable = true;
  const on = b.variable('bEnMarche', T.bool, false);
  implementInterface(base, iface);
  const get = (v: string, at: [number, number]) => b.node('var.get', { variable: v }, {}, at);
  /** Print String « <Nom><suffix> ». */
  const said = (suffix: string, at: [number, number]) => {
    const t = b.node('string.append', {}, { in1: suffix }, [at[0], at[1] + 200]);
    b.link(get(nom, [at[0] - 200, at[1] + 260]), 'value', t, 'in0');
    const s = b.node('debug.printString', {}, {}, at);
    b.link(t, 'result', s, 'text');
    return s;
  };
  const callEvent = (event: string, from: string, pin: string, at: [number, number]) => {
    const c = b.node('call.custom', { owner: base.id, event }, {}, at);
    b.link(from, pin, c, 'exec');
    return c;
  };
  const start = b.node('event.custom', { name: 'Demarrer' }, {}, [64, 700]);
  const stop = b.node('event.custom', { name: 'Arreter' }, {}, [64, 1200]);

  // E (or the panel's button): stop if running, start if there is fuel, else say the tank is empty.
  const asked = b.node('event.interface', { interface: iface, fn }, {}, [64, 96]);
  const running = b.node('flow.branch', {}, {}, [340, 96]);
  b.link(asked, 'then', running, 'exec').link(get(on, [200, 300]), 'value', running, 'condition');
  callEvent('Arreter', running, 'true', [640, 20]);
  const hasFuel = b.node('flow.branch', {}, {}, [640, 200]);
  const more = b.node('math.greaterFloat', {}, { b: 0 }, [500, 420]);
  const left = b.node('var.getExternal', { owner: res.cls.id, variable: fuel }, {}, [300, 420]);
  b.target('Reservoir', left).link(left, 'value', more, 'a');
  b.link(running, 'false', hasFuel, 'exec').link(more, 'result', hasFuel, 'condition');
  callEvent('Demarrer', hasFuel, 'true', [940, 160]);
  b.link(hasFuel, 'false', said(' : réservoir vide', [940, 320]), 'exec');

  // Demarrer: the light now, the message after 0.5 s.
  const setOn = b.node('var.set', { variable: on }, { value: true }, [340, 700]);
  b.link(start, 'then', setOn, 'exec');
  const seq = b.node('flow.sequence', {}, {}, [940, 700]);
  const light = b.node('component.setVisibility', {}, { visible: true }, [1240, 640]);
  const wait = b.node('time.delay', {}, { duration: 0.5 }, [1240, 820]);
  b.link(setOn, 'then', seq, 'exec').link(seq, 'then0', light, 'exec').target('Voyant', light);
  b.link(seq, 'then1', wait, 'exec').link(wait, 'completed', said(' en marche', [1540, 820]), 'exec');

  // Arreter.
  const setOff = b.node('var.set', { variable: on }, { value: false }, [340, 1200]);
  const dark = b.node('component.setVisibility', {}, { visible: false }, [640, 1200]);
  b.link(stop, 'then', setOff, 'exec').link(setOff, 'then', dark, 'exec').target('Voyant', dark);

  // Tick: a running machine spends its fuel with Delta Seconds.
  const tick = b.node('event.tick', {}, {}, [64, 1500]);
  const live = b.node('flow.branch', {}, {}, [340, 1500]);
  const burn = b.node('call.function', { graph: spend.graph.id, owner: res.cls.id }, {}, [640, 1500]);
  b.link(tick, 'then', live, 'exec').link(get(on, [200, 1700]), 'value', live, 'condition');
  b.link(live, 'true', burn, 'exec').link(tick, 'delta', burn, spend.pin.Secondes).target('Reservoir', burn);

  // The reservoir says it is empty: dry, and stop.
  const dry = b.node('event.componentDispatcher', { component: tank, dispatcher: empty }, {}, [64, 1900]);
  const panne = said(' : panne sèche', [340, 1900]);
  b.link(dry, 'then', panne, 'exec');
  callEvent('Arreter', panne, 'then', [640, 1900]);

  // ---- The two machines.
  const child = (name: string) => {
    const c = newClass(p, name, 'Actor');
    const ok = setParentClass(p, c.cls.id, base.id);
    if (!ok.ok) throw new Error(ok.reason);
    return c;
  };
  const pump = child('BP_Pompe');
  const fan = child('BP_Ventilo');
  fan.component('StaticMesh', 'Helice', { sizeX: 120, sizeY: 16, color: '#0ea5e9', blocks: false });
  const fTick = fan.node('event.tick', {}, {}, [64, 96]);
  const up = fan.node('call.parentEvent', { event: 'event.tick' }, {}, [340, 96]);
  const fOn = fan.node('var.get', { variable: on }, {}, [500, 300]);
  const fBr = fan.node('flow.branch', {}, {}, [640, 96]);
  const yaw = fan.node('math.multiplyFloat', {}, { a: 360 }, [760, 360]);
  const rot = fan.node('math.makeRotator', {}, {}, [960, 360]);
  const spin = fan.node('component.addRelativeRotation', {}, {}, [960, 96]);
  fan.link(fTick, 'then', up, 'exec').link(fTick, 'delta', up, 'delta').link(up, 'then', fBr, 'exec').link(fOn, 'value', fBr, 'condition');
  fan.link(fBr, 'true', spin, 'exec').link(fTick, 'delta', yaw, 'b').link(yaw, 'result', rot, 'yaw').link(rot, 'result', spin, 'delta').target('Helice', spin);

  for (const [cls, at, name, seconds] of [
    [pump, PUMP_AT, 'Pompe', 3],
    [fan, FAN_AT, 'Ventilateur', 1],
  ] as const) {
    const a = placeActor(p, cls.cls.id, ...at);
    if (!a.ok) throw new Error(a.reason);
    Object.assign(a.value.overrides, { [nom]: name });
    setComponentOverride(p, a.value.id, tank, fuel, seconds);
  }
}

/** The node a link leaves `from`'s `pin` for. */
function nextOf(g: BlueprintClass['graphs'][number], from: string, pin: string): string {
  const l = Object.values(g.links).find((x) => x.from.node === from && x.from.pin === pin);
  if (!l) throw new Error(`Nothing after ${from}.${pin}`);
  return l.to.node;
}

/**
 * Milestone 2, the panel: BP_Machine announces its state (OnEtat), a row per
 * machine listens to it and asks it what E asks, the panel builds the rows.
 */
function solvePanel(p: Project): void {
  const iface = p.interfaces.find((i) => i.name === 'BPI_Interactif')!.id;
  const fn = p.interfaces.find((i) => i.id === iface)!.functions[0].id;
  const b = edit(p, 'BP_Machine');
  const base = b.cls;
  const nom = base.variables.find((v) => v.name === 'Nom')!.id;
  const state = addDispatcher(base, 'OnEtat');
  addDispatcherParam(base, state.id, T.bool);
  state.params[0].name = 'EnMarche';
  const stateParam = state.params[0].id;
  // Demarrer and Arreter call OnEtat: after Set bEnMarche, and after the light goes off.
  const custom = (name: string) => Object.values(b.graph.nodes).find((n) => n.def === 'event.custom' && n.config.name === name)!.id;
  const setOn = nextOf(b.graph, custom('Demarrer'), 'then');
  const seq = nextOf(b.graph, setOn, 'then');
  disconnectPin(b.graph, { node: setOn, pin: 'then' });
  const told = b.node('dispatcher.call', { owner: base.id, dispatcher: state.id }, { [stateParam]: true }, [640, 860]);
  b.link(setOn, 'then', told, 'exec').link(told, 'then', seq, 'exec');
  const dark = nextOf(b.graph, nextOf(b.graph, custom('Arreter'), 'then'), 'then');
  b.link(dark, 'then', b.node('dispatcher.call', { owner: base.id, dispatcher: state.id }, { [stateParam]: false }, [940, 1200]), 'exec');

  // ---- WBP_LigneMachine: one machine's row. It shows, it asks; the machine decides.
  const row = newClass(p, ROW, 'UserWidget');
  const hbox = addW(p, row.cls, 'HorizontalBox', undefined);
  addW(p, row.cls, 'TextBlock', hbox.id, { name: 'Txt_Nom', isVariable: true, props: { text: 'Machine', fontSize: 24 }, slot: { sizeRule: 'Fill', padding: [8, 4, 8, 4], vAlign: 'Center' } });
  addW(p, row.cls, 'TextBlock', hbox.id, { name: 'Txt_Etat', isVariable: true, props: { text: STOPPED, fontSize: 22, color: '#fde68a' }, slot: { padding: [8, 4, 8, 4], vAlign: 'Center' } });
  const btn = addW(p, row.cls, 'Button', hbox.id, { name: BUTTON, slot: { padding: [8, 4, 8, 4], vAlign: 'Center' } });
  addW(p, row.cls, 'TextBlock', btn.id, { name: 'Txt_Bascule', props: { text: 'Basculer', fontSize: 20, color: '#111827' }, slot: { padding: [14, 8, 14, 8] } });
  const ref = row.variable('Machine', T.object('BP_Machine'));
  const rv = row.cls.variables.find((v) => v.id === ref)!;
  rv.instanceEditable = true;
  rv.exposeOnSpawn = true;
  const theMachine = (at: [number, number]) => row.node('var.get', { variable: ref }, {}, at);
  // Construct: the name, then listen to the machine.
  const construct = row.node('event.construct', {}, {}, [64, 96]);
  const name = row.node('var.getExternal', { owner: base.id, variable: nom }, {}, [260, 300]);
  const toText = row.node('conv.stringToText', {}, {}, [460, 300]);
  const setName = row.node('widget.setText', {}, {}, [560, 96]);
  row.link(theMachine([60, 300]), 'value', name, 'target').link(name, 'value', toText, 'in').link(toText, 'result', setName, 'text');
  row.link(construct, 'then', setName, 'exec').link(getW(row, 'Txt_Nom', [400, 200]), 'value', setName, 'target');
  const update = row.node('event.custom', { name: 'MajEtat', signature: state.id, signatureOwner: base.id }, {}, [64, 600]);
  const bind = row.node('dispatcher.bind', { owner: base.id, dispatcher: state.id }, {}, [900, 96]);
  row.link(setName, 'then', bind, 'exec').link(theMachine([700, 260]), 'value', bind, 'target').link(update, 'delegate', bind, 'event');
  // MajEtat (EnMarche): the state's word.
  const which = row.node('flow.branch', {}, {}, [360, 600]);
  const says = (text: string, pin: string, at: [number, number]) => {
    const s = row.node('widget.setText', {}, { text }, at);
    row.link(which, pin, s, 'exec').link(getW(row, 'Txt_Etat', [at[0] - 160, at[1] + 120]), 'value', s, 'target');
  };
  row.link(update, 'then', which, 'exec').link(update, stateParam, which, 'condition');
  says(RUNNING, 'true', [700, 540]);
  says(STOPPED, 'false', [700, 760]);
  // The button does what E does: it asks the machine.
  const click = onButton(row, BUTTON);
  row.graph.nodes[click].x = 64;
  row.graph.nodes[click].y = 1000;
  const ask = row.node('iface.message', { interface: iface, fn }, {}, [400, 1000]);
  row.link(click, 'then', ask, 'exec').link(theMachine([220, 1160]), 'value', ask, 'target');

  // ---- WBP_Panneau: a row per machine in the level, built in game.
  const panel = newClass(p, 'WBP_Panneau', 'UserWidget');
  const canvas = addW(p, panel.cls, 'CanvasPanel', undefined);
  const corner = { anchors: { minX: 1, minY: 0, maxX: 1, maxY: 0 }, alignX: 1, alignY: 0 };
  addW(p, panel.cls, 'Image', canvas.id, { name: 'Img_Fond', props: { color: '#111827' }, slot: { ...corner, offsets: [-16, 16, 520, 160] } });
  addW(p, panel.cls, 'TextBlock', canvas.id, { name: 'Txt_Titre', props: { text: 'Atelier', fontSize: 24, color: '#fde68a' }, slot: { ...corner, offsets: [-36, 24, 480, 36] } });
  addW(p, panel.cls, 'VerticalBox', canvas.id, { name: 'VB_Lignes', isVariable: true, slot: { ...corner, offsets: [-36, 68, 480, 100] } });
  const pc = panel.node('event.construct', {}, {}, [64, 96]);
  const all = panel.node('actor.getAllOfClass', {}, { class: base.id }, [340, 96]);
  const loop = panel.node('flow.forEachLoop', {}, {}, [660, 96]);
  const create = panel.node('widget.create', {}, { class: row.cls.id }, [980, 96]);
  const add = panel.node('widget.addChildToVerticalBox', {}, {}, [1320, 96]);
  panel.link(pc, 'then', all, 'exec').link(all, 'then', loop, 'exec').link(all, 'actors', loop, 'array');
  panel.link(loop, 'body', create, 'exec').link(loop, 'element', create, `expose:${ref}`).link(panel.node('widget.getOwningPlayer', {}, {}, [800, 360]), 'result', create, 'owner');
  panel.link(create, 'then', add, 'exec').link(getW(panel, 'VB_Lignes', [1180, 300]), 'value', add, 'target').link(create, 'result', add, 'content');

  // ---- BP_PlayerController: the panel on the screen, the game still played.
  const { b: ctl, last } = controller(p);
  const self = ctl.node('actor.self', {}, {}, [1000, 300]);
  const makePanel = ctl.node('widget.create', {}, { class: panel.cls.id }, [1100, 96]);
  const view = ctl.node('widget.addToViewport', {}, {}, [1440, 96]);
  const mode = ctl.node('input.setModeGameAndUI', {}, {}, [1740, 96]);
  const cursor = ctl.node('input.setShowMouseCursor', {}, { show: true }, [2080, 96]);
  ctl.link(last, 'then', makePanel, 'exec').link(self, 'self', makePanel, 'owner').link(makePanel, 'then', view, 'exec').link(makePanel, 'result', view, 'target');
  ctl.link(view, 'then', mode, 'exec').link(self, 'self', mode, 'controller').link(mode, 'then', cursor, 'exec');
}

// -------------------------------------------------------------- the project

const BRIEF_MACHINES =
  'Déjà là : le projet UE5 (IMC_Joueur : E → IA_Interagir, BP_PlayerController), un BP_Joueur au graphe vide, deux plots **M1** et **M2**. Tout le reste est à créer.\n\n' +
  '**Les machines**\n' +
  '1. **BP_Machine**, le parent : un socle, un **Voyant** (Point Light, éteint), une Zone. Chaque machine posée a un **Nom**, réglable dans le niveau.\n' +
  '2. **BP_Pompe** et **BP_Ventilo** sont des **enfants** de BP_Machine. Pompe posée sur M1 (Nom `Pompe`), ventilateur sur M2 (Nom `Ventilateur`).\n' +
  '3. E près d’une machine à l’arrêt : elle **démarre**. Son Voyant s’allume **tout de suite**, et **0,5 s plus tard** elle affiche `<Nom> en marche`. E près d’une machine en marche : elle s’arrête, Voyant éteint.\n' +
  '4. **BP_Ventilo** a en plus une **Helice** (un Static Mesh) qui tourne quand il est en marche.\n\n' +
  '**Le carburant**\n' +
  '5. Le carburant est une chose que la machine **a** : il vit dans un **Actor Component**, que BP_Machine porte, réglé **machine par machine** dans le niveau : 3 secondes pour la pompe, 1 pour le ventilateur.\n' +
  '6. En marche, une machine le **consomme** au rythme du temps qui passe (1 par seconde), quel que soit le nombre d’images par seconde, sans passer sous 0. À 0 : `<Nom> : panne sèche`, et elle s’arrête.\n' +
  '7. E près d’une machine sans carburant : `<Nom> : réservoir vide`, elle ne démarre pas.\n\n' +
  'Contraintes : **démarrer, arrêter, consommer s’écrivent une seule fois**. Les enfants n’ont pas leur propre réaction à E.';

const BRIEF_PANEL =
  '**Le panneau de contrôle**\n' +
  `1. Au lancement, un panneau à l’écran : **une ligne par machine posée**, construite pendant la partie (une troisième machine posée aurait sa ligne sans rien changer au panneau). La ligne est un Widget Blueprint **${ROW}** : le Nom de la machine, son état (\`${RUNNING}\` ou \`${STOPPED}\`) et un bouton **${BUTTON}**.\n` +
  `2. ${BUTTON} fait **exactement ce que fait E** près de cette machine.\n` +
  '3. La ligne change quand l’état change, et seulement alors : ni Binding, ni Event Tick dans les widgets.\n' +
  '4. Le jeu continue avec le panneau : le joystick et E marchent, les boutons aussi, le curseur est visible.\n\n' +
  'Tout ce que faisait le jalon 1 doit marcher encore : il est vérifié de nouveau.';

const SCENARIO_MACHINES =
  'À **30 images par seconde** : E à la pompe ; 0,2 s plus tard le Voyant est allumé mais pas encore « Pompe en marche » ; 0,5 s plus tard il l’est. Le joueur va au ventilateur et appuie sur E ; 0,5 s plus tard son Hélice a tourné. Le test attend que les deux tombent en panne sèche (la pompe pas avant 2 s de marche), puis revient à la pompe : E dit « Pompe : réservoir vide ».';

const SCENARIO_PANEL =
  'À **30 images par seconde** : au lancement, le panneau montre les deux machines à l’arrêt. E à la pompe ; 0,7 s plus tard sa ligne dit En marche. Le bouton de la ligne « Ventilateur » ; 0,5 s plus tard son Hélice a tourné et sa ligne dit En marche. Le test attend que les deux tombent en panne sèche et que leurs lignes repassent à l’arrêt, puis E à la pompe, puis son bouton : deux fois « Pompe : réservoir vide ».';

/** Milestone 1's checks: the family, the fuel, starting and stopping, played by E alone. */
const machineChecks = [
  {
    id: 'family',
    label: 'BP_Pompe et BP_Ventilo héritent de BP_Machine, posés sur M1 et M2',
    test: (cx: CheckContext) => {
      const base = cx.project.classes.find((c) => c.name === 'BP_Machine');
      if (!base) return 'Crée le Blueprint parent BP_Machine.';
      for (const name of ['BP_Pompe', 'BP_Ventilo']) {
        const c = cx.project.classes.find((x) => x.name === name);
        if (!c) return `Crée ${name}, enfant de BP_Machine.`;
        if (c.parentClassId !== base.id) return `${name} n’hérite pas de BP_Machine (Class Settings › Parent Class).`;
      }
      if (!placed(cx, 'BP_Pompe', PUMP_AT)) return 'Pose une BP_Pompe sur le plot M1.';
      return placed(cx, 'BP_Ventilo', FAN_AT) ? true : 'Pose un BP_Ventilo sur le plot M2.';
    },
  },
  {
    id: 'once',
    label: 'Les enfants n’ont pas leur propre réaction à E',
    test: (cx: CheckContext) => {
      const dup = ['BP_Pompe', 'BP_Ventilo'].filter((n) => cx.nodes(n).some((x) => x.def === 'event.interface' || x.def === 'input.action'));
      return dup.length ? `${dup.join(' et ')} réagi(ssen)t eux-mêmes à E : cette logique est commune, elle s’écrit une fois dans BP_Machine.` : true;
    },
  },
  { id: 'component', label: 'Le carburant vit dans un Actor Component porté par BP_Machine', test: fuelInComponent },
  {
    id: 'light-now',
    label: 'Démarrer : le Voyant tout de suite, pas encore le message',
    at: 'p-mi',
    test: (cx: CheckContext) => {
      if (!lightOn(cx, 'BP_Pompe')) return '0,2 s après E, le Voyant de la pompe est éteint.';
      return countPrints(cx, 'Pompe en marche') ? '« Pompe en marche » est arrivé tout de suite : il doit attendre 0,5 s, pendant que le Voyant, lui, s’allume aussitôt.' : true;
    },
  },
  {
    id: 'message-later',
    label: '0,5 s plus tard : « Pompe en marche »',
    at: 'p-ok',
    test: (cx: CheckContext) => (countPrints(cx, 'Pompe en marche') === 1 ? true : '0,7 s après E, aucun « Pompe en marche ».'),
  },
  {
    id: 'fan',
    label: 'E au ventilateur le démarre ; son Hélice tourne',
    at: 'f-run',
    test: (cx: CheckContext) => {
      if (!machine(cx, 'BP_Ventilo')?.components.some((c) => c.name === 'Helice')) return 'BP_Ventilo n’a pas de composant Helice.';
      if (!lightOn(cx, 'BP_Ventilo')) return 'E au ventilateur n’a pas allumé son Voyant. Son Tick appelle-t-il celui du parent ?';
      return Math.abs(bladesYaw(cx)) > 1 ? true : 'Le ventilateur est en marche, et son Hélice ne tourne pas.';
    },
  },
  {
    id: 'not-yet',
    label: 'Après 2 s de marche, la pompe tourne encore (Carburant 3)',
    at: 'p-avant',
    test: (cx: CheckContext) =>
      countPrints(cx, 'Pompe : panne sèche') ? 'La pompe est tombée en panne avant 3 s de marche : son Reservoir est-il réglé à 3 dans le niveau ?' : lightOn(cx, 'BP_Pompe') ? true : 'La pompe s’est arrêtée avant d’avoir consommé son carburant.',
  },
  {
    id: 'dry',
    label: 'Au bout du carburant : panne sèche et arrêt, pour les deux',
    at: 'pannes',
    test: (cx: CheckContext) => {
      for (const [cls, name] of [
        ['BP_Pompe', 'Pompe'],
        ['BP_Ventilo', 'Ventilateur'],
      ] as const) {
        if (countPrints(cx, `${name} : panne sèche`) !== 1)
          return `Aucun « ${name} : panne sèche » une fois son carburant consommé (le test tourne à 30 images par seconde : le carburant doit s’user avec Delta Seconds).`;
        if (lightOn(cx, cls)) return `${name} est en panne sèche, et son Voyant reste allumé.`;
      }
      return true;
    },
  },
  {
    id: 'empty',
    label: 'Sans carburant : « Pompe : réservoir vide »',
    test: (cx: CheckContext) => {
      if (lightOn(cx, 'BP_Pompe') || countPrints(cx, 'Pompe en marche') !== 1) return 'Sans carburant, la pompe a redémarré : elle doit rester éteinte.';
      return countPrints(cx, 'Pompe : réservoir vide') === 1 ? true : 'E à la pompe vide : « Pompe : réservoir vide », et elle reste éteinte.';
    },
  },
  notion({
    id: 'parent',
    label: 'BP_Ventilo appelle Parent: Tick',
    test: (cx: CheckContext) => {
      const baseTicks = cx.nodes('BP_Machine').some((n) => n.def === 'event.tick');
      if (!baseTicks || cx.nodes('BP_Ventilo').some((n) => n.def === 'call.parentEvent')) return true;
      return 'BP_Ventilo redéfinit Tick : il doit appeler Parent: Tick pour que la logique commune tourne aussi chez lui.';
    },
  }),
  notion(usesNode('sequence', 'BP_Machine', ['flow.sequence'], 'Le démarrage passe par un Sequence', 'Deux suites au démarrage, l’une immédiate et l’autre qui attend : c’est le travail d’un Sequence.')),
  noRuntimeErrors(),
];

/** Milestone 2's checks: the panel, played by E and by its buttons. */
const panelChecks = [
  { id: 'panel', label: 'Au lancement, un panneau : une ligne par machine, construite en jeu ; Game and UI', at: 'panneau', test: panelBuilt },
  rowSays('rows-start', 'Les deux lignes disent Arrêt au lancement', 'panneau', { Pompe: 'stopped', Ventilateur: 'stopped' }, 'Au lancement, aucune machine ne tourne.'),
  rowSays('row-on', 'La ligne de la pompe passe à En marche', 'p-ok', { Pompe: 'running', Ventilateur: 'stopped' }, 'La machine doit annoncer son changement d’état, et la ligne l’écouter.'),
  {
    id: 'button',
    label: 'Le bouton de la ligne « Ventilateur » le démarre ; son Hélice tourne',
    at: 'f-run',
    test: (cx: CheckContext) => {
      const ignored = ignoredTouch(cx, BUTTON);
      if (ignored) return ignored;
      if (!lightOn(cx, 'BP_Ventilo')) return `Le bouton ${BUTTON} de la ligne « Ventilateur » n’a pas allumé son Voyant. Le bouton demande-t-il à sa machine ce que demande E ?`;
      return Math.abs(bladesYaw(cx)) > 1 ? true : 'Le ventilateur est en marche, et son Hélice ne tourne pas.';
    },
  },
  rowSays('row-fan', 'Sa ligne suit : En marche', 'f-run', { Ventilateur: 'running' }, 'Démarré par le bouton ou par E, c’est la même machine qui annonce son état.'),
  rowSays('rows-dry', 'En panne, les deux lignes repassent à Arrêt', 'pannes', { Pompe: 'stopped', Ventilateur: 'stopped' }, 'Une panne sèche arrête la machine : sa ligne doit le dire.'),
  {
    id: 'empty-both',
    label: 'Sans carburant : « Pompe : réservoir vide », par E comme par le bouton',
    test: (cx: CheckContext) => {
      if (lightOn(cx, 'BP_Pompe') || countPrints(cx, 'Pompe en marche') !== 1) return 'Sans carburant, la pompe a redémarré : elle doit rester éteinte.';
      const n = countPrints(cx, 'Pompe : réservoir vide');
      if (n === 2) return true;
      return n === 1
        ? `E à la pompe vide dit « Pompe : réservoir vide », mais pas son bouton ${BUTTON} : il doit faire exactement ce que fait E.`
        : 'E à la pompe vide, puis son bouton : chacun doit afficher « Pompe : réservoir vide », et elle reste éteinte.';
    },
  },
  notion({ id: 'event-driven', label: 'La ligne se met à jour sur un événement', test: (cx: CheckContext) => eventDriven(cx, ROW) }),
  noRuntimeErrors(),
];

export const expertWorkshop: Lesson = withMilestones(
  {
    id: 'x2-atelier',
    code: 'X1',
    module: 'Projet Expert',
    level: 'expert',
    number: 0,
    revision: 3,
    title: 'L’atelier des machines',
    situation:
      'Une pompe et un ventilateur, deux machines qui se ressemblent : E les démarre et les arrête, elles brûlent leur carburant, tombent en panne sèche. Le ventilateur fait en plus tourner ses pales. Au mur, un panneau de contrôle les montre et les commande. Tout ce qui est commun s’écrit une seule fois.',
    recalls: ['inheritance', 'tick', 'sequence', 'latent', 'visibility', 'rotation', 'interfaces', 'loops', 'actor-components', 'functions', 'dispatchers', 'umg', 'ui-input', 'player-controller', 'other-bp'],
    notions: ['Projet Expert', 'Classe parente', 'Redéfinir un événement', 'Delta Seconds', 'Sequence', 'Actor Component', 'Expose on Spawn', 'Add Child to Vertical Box', 'Event Dispatcher'],
    remember:
      'Ce qu’une famille de Blueprints **est** vit dans le parent ; ce qu’elle **a** (un réservoir) vit dans un composant, réglé acteur par acteur. Un enfant qui redéfinit un événement appelle la version du parent. Et une interface ne décide rien : elle montre l’état qu’on lui annonce, et demande à l’objet d’agir.',
    cards: [EXPERT_RULES, REDO_WORKSHOP],
    hints: [
      'Qu’est-ce que les machines sont, qu’est-ce qu’elles ont, et qui doit savoir qu’une machine a changé d’état ?',
      'Blueprint Class › Parent BP_Machine ; Actor Component, Instance Editable ; Sequence, Delay ; Event Tick, Delta Seconds, Parent: Tick ; Event Dispatcher ; Get All Actors Of Class, Create Widget (Expose on Spawn), Add Child to Vertical Box, Bind Event ; Set Input Mode Game and UI.',
      'Solution : BPI_Interactif (Interagir) ; le joueur : IA_Interagir → Get Overlapping Actors → For Each → Interagir. BP_Reservoir (Actor Component) : Carburant (Instance Editable), OnVide ; fonction Consommer (Secondes) : Set Carburant = Max (Carburant − Secondes, 0) → Branch (Carburant <= 0) → Call OnVide.\n' +
        'BP_Machine : Reservoir (BP_Reservoir), Nom (Instance Editable), bEnMarche, OnEtat (EnMarche). Interagir → Branch (bEnMarche) : True → Arreter ; False → Branch (Reservoir › Carburant > 0) : True → Demarrer, False → Print « Nom : réservoir vide ». Demarrer → Set bEnMarche → Call OnEtat (vrai) → Sequence : Set Visibility (Voyant) ; Delay 0,5 → Print « Nom en marche ». Arreter → Set bEnMarche (faux) → Set Visibility (décoché) → Call OnEtat (faux). Tick → Branch (bEnMarche) → Consommer (Reservoir, Delta Seconds). On OnVide (Reservoir) → Print « Nom : panne sèche » → Arreter.\n' +
        'BP_Pompe : parent BP_Machine, rien d’autre. BP_Ventilo : Helice ; Event Tick → Parent: Tick → Branch (bEnMarche) → Add Relative Rotation (Yaw = 360 × Delta Seconds). Dans le niveau : Nom et Reservoir › Carburant de chaque machine posée.\n' +
        `${ROW} : Machine (BP_Machine, Expose on Spawn) ; Construct → Set Text (Txt_Nom, Machine › Nom) → Bind Event to OnEtat (Machine, MajEtat) ; MajEtat → Branch (EnMarche) → Set Text (Txt_Etat). On Clicked (${BUTTON}) → Interagir (Message, Machine). WBP_Panneau : Construct → Get All Actors Of Class (BP_Machine) → For Each → Create ${ROW} (Machine = Array Element, Owning Player = Get Owning Player) → Add Child to Vertical Box. BP_PlayerController, après Add Mapping Context : Create WBP_Panneau → Add to Viewport → Set Input Mode Game and UI → Set Show Mouse Cursor.`,
    ],
    challenge: 'Ajoute un BP_Groupe (enfant de BP_Machine), sans rien changer au panneau : il a sa ligne. Puis montre le carburant restant de chaque machine dans sa ligne, sans Binding : qui doit l’annoncer, et quand ?',
    setup: project,
  },
  [
    {
      id: 'machines',
      title: 'Les machines',
      cards: [
        { title: 'Cahier des charges', body: BRIEF_MACHINES },
        { title: 'Le scénario de test', body: SCENARIO_MACHINES },
        {
          title: 'Pour aller plus loin',
          body: 'La pompe et le ventilateur **sont** des machines : le parent BP_Machine est le bon choix. Le carburant, lui, est quelque chose qu’elles **ont** : le jour où un groupe électrogène ou un véhicule, qui ne sont pas des machines de l’atelier, consomment aussi, ils portent le même composant. Les deux se combinent : le parent pour ce qu’ils sont, des composants pour ce qu’ils ont.',
        },
      ],
      objectives: [
        'BP_Pompe et BP_Ventilo héritent de BP_Machine, qui seul réagit à E.',
        'Démarrer : Voyant tout de suite, « <Nom> en marche » 0,5 s plus tard ; l’Hélice du ventilateur tourne en marche.',
        'Le carburant vit dans un Actor Component réglé machine par machine, et s’use avec le temps réel ; à 0, panne sèche et arrêt ; ensuite, réservoir vide.',
      ],
      scenario: [
        { fps: 30 },
        { wait: 0.2 },
        ...goTo(...PUMP_AT, 0.05),
        ...tap('E'),
        { wait: 0.2 },
        { checkpoint: 'p-mi' },
        { wait: 0.5 },
        { checkpoint: 'p-ok' },
        ...goTo(...FAN_AT, 0.05),
        ...tap('E'),
        { wait: 0.5 },
        { checkpoint: 'f-run' },
        { wait: 0.6 },
        { checkpoint: 'p-avant' },
        { wait: 1.6 },
        { checkpoint: 'pannes' },
        ...goTo(...PUMP_AT, 0.05),
        ...tap('E'),
        { wait: 0.7 },
      ],
      checks: machineChecks,
      solve: solveMachines,
    },
    {
      id: 'panneau',
      title: 'Le panneau',
      cards: [
        { title: 'Cahier des charges', body: BRIEF_PANEL },
        { title: 'Le scénario de test', body: SCENARIO_PANEL },
        {
          title: 'Pour aller plus loin',
          body:
            '**Le panneau** ne connaît aucune machine par son nom : il les trouve dans le niveau, et chaque ligne garde une référence vers **sa** machine. Elle ne décide rien : elle demande (le même message d’interface que E) et écoute (l’Event Dispatcher). Dans UE, c’est la forme de la plupart des listes d’un HUD : inventaire, objectifs, équipe.\n\n' +
            '**Dans UE5**, Get All Actors Of Class dans un widget est acceptable à sa construction, une fois ; pour un atelier qui change en cours de partie, les machines s’enregistreraient plutôt auprès d’un gestionnaire (le GameMode, ou un sous-système).',
        },
      ],
      objectives: ['Un panneau à l’écran, une ligne par machine construite en jeu, qui suit l’état (sans Binding ni Tick).', 'Le bouton d’une ligne fait ce que fait E ; le jeu continue (Game and UI, curseur).'],
      scenario: [
        { fps: 30 },
        { wait: 0.2 },
        { checkpoint: 'panneau' },
        ...goTo(...PUMP_AT, 0.05),
        ...tap('E'),
        { wait: 0.7 },
        { checkpoint: 'p-ok' },
        { click: `${ROW}/${BUTTON}`, row: 'Ventilateur' },
        { wait: 0.5 },
        { checkpoint: 'f-run' },
        { wait: 2.4 },
        { checkpoint: 'pannes' },
        ...tap('E'),
        { wait: 0.2 },
        { click: `${ROW}/${BUTTON}`, row: 'Pompe' },
        { wait: 0.7 },
      ],
      checks: panelChecks,
      solve: solvePanel,
    },
  ],
);
