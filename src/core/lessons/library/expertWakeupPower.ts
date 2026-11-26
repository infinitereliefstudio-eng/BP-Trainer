/**
 * Projet X6 « Le réveil », milestones 4 and 5 (V7.71): the power.
 * 4. Le générateur: three fuses in the workshop (one Blueprint, a Nom set on
 *    each placed copy), the generator that takes the ones the player carries,
 *    a gauge over it (Widget Component), its restart.
 * 5. Le courant: the generator tells, by an Event Dispatcher, without knowing
 *    who listens; whatever carries a BP_Alimente reacts in its own way (the
 *    lamps light up, the power door can open); the doors are children of
 *    BP_Porte_Base (a Timeline) and only add their condition (PeutOuvrir).
 * Both play Lvl_Dortoir directly, like milestones 1 and 2.
 */
import type { Project } from '../../model/project';
import { addDispatcher, implementInterface, setInheritedDefault, updateVariable } from '../../operations/classOps';
import { placeActor } from '../../operations/levelOps';
import { setParentClass } from '../../operations/projectOps';
import type { ActorRT } from '../../runtime/world';
import { T } from '../../types/pins';
import { type ClassBuilder, edit } from '../builder';
import { countPrints, noRuntimeErrors } from '../checks';
import type { Check, CheckContext, Milestone, ScenarioStep } from '../types';
import {
  type At,
  AT_GENERATOR,
  actorAt,
  BADGE,
  BADGE_DOOR_AT,
  carriedNames,
  cls,
  doorwayClosed,
  FUSES_AT,
  GENERATOR_AT,
  inventoryOfPlayer,
  LAMPS_AT,
  lit,
  PLAY_DORM,
  POWER_DOOR_AT,
  POWER_UP,
  placedNear,
  press,
  southOf,
  standAt,
  TAKE_BADGE,
  takeFuse,
  v,
} from './expertWakeupKit';
import { fnDef, fnOf } from './kit';
import { addW, newClass } from './umgKit';
import { readTimeline, trackPin } from '../../nodes/library/timeline';

export const FUSE_TAKEN = 'Fusible récupéré';
export const STARTED = 'Le générateur redémarre';
export const RUNNING = 'Le générateur tourne';
export const NO_BADGE = 'Il faut un badge';
export const NO_POWER = 'Pas de courant';
export const FUSE_NAMES = ['Fusible_1', 'Fusible_2', 'Fusible_3'];
/** How far a door's leaf slides to open (cm). */
const SLIDE = 150;

const interactive = (p: Project) => p.interfaces.find((i) => i.name === 'BPI_Interactif')!;

// ------------------------------------------------------------- milestone 4

/** WBP_Jauge: a bar over all of it, and Afficher (Valeur) that sets its Percent. */
function gaugeWidget(p: Project): ClassBuilder {
  const w = newClass(p, 'WBP_Jauge', 'UserWidget');
  const canvas = addW(p, w.cls, 'CanvasPanel', undefined);
  addW(p, w.cls, 'ProgressBar', canvas.id, {
    name: 'PB_Jauge',
    isVariable: true,
    props: { percent: 0, fillColor: '#22c55e' },
    slot: { anchors: { minX: 0, minY: 0, maxX: 1, maxY: 1 }, offsets: [0, 0, 0, 0] },
  });
  const fn = fnDef(p, w, 'Afficher', [['Valeur', T.float]], []);
  const set = fn.f.node('widget.setPercent', {}, {}, [500, 96]);
  const bar = w.cls.widgets!.find((x) => x.name === 'PB_Jauge')!;
  fn.f.link(fn.entry, 'then', set, 'exec').link(fn.entry, fn.pin.Valeur, set, 'percent').link(fn.f.node('var.widget', { widget: bar.id }, {}, [300, 260]), 'value', set, 'target');
  fn.f.link(set, 'then', fn.ret, 'exec');
  return w;
}

export function solveGenerator(p: Project): void {
  const iface = interactive(p);
  const interagir = iface.functions[0].id;
  // BP_Inventaire › Retirer: what the generator takes leaves the inventory.
  const inv = edit(p, 'BP_Inventaire');
  const take = fnDef(p, inv, 'Retirer', [['Objet', T.name]], []);
  const rm = take.f.node('set.remove', {}, {}, [360, 96]);
  take.f.link(take.entry, 'then', rm, 'exec').link(take.f.node('var.get', { variable: v(inv, 'Objets') }, {}, [160, 300]), 'value', rm, 'set').link(take.entry, take.pin.Objet, rm, 'item').link(rm, 'then', take.ret, 'exec');
  const add = fnOf(inv, 'Ajouter');
  const has = fnOf(inv, 'Possede');

  // BP_Fusible: one Blueprint, a Nom for each placed copy; E puts it in the inventory.
  const fuse = newClass(p, 'BP_Fusible', 'Actor');
  fuse.component('StaticMesh', 'Fusible', { sizeX: 40, sizeY: 60, color: '#facc15' });
  implementInterface(fuse.cls, iface.id);
  const nom = fuse.variable('Nom', T.name, 'Fusible');
  updateVariable(fuse.cls, nom, { instanceEditable: true });
  const ev = fuse.node('event.interface', { interface: iface.id, fn: interagir }, {}, [64, 96]);
  const find = inventoryOfPlayer(fuse, inv.cls.id, [300, 320]);
  const give = fuse.node('call.function', { owner: inv.cls.id, graph: add.graph.id }, {}, [400, 96]);
  fuse.link(ev, 'then', give, 'exec').link(find, 'result', give, 'target').link(fuse.node('var.get', { variable: nom }, {}, [200, 460]), 'value', give, add.pin.Objet);
  const say = fuse.node('debug.printString', {}, { text: FUSE_TAKEN }, [700, 96]);
  fuse.link(give, 'then', say, 'exec').link(say, 'then', fuse.node('actor.destroy', {}, {}, [1000, 96]), 'exec');
  FUSES_AT.forEach((at, i) => {
    const r = placeActor(p, fuse.cls.id, ...at);
    if (!r.ok) throw new Error(r.reason);
    r.value.overrides[nom] = FUSE_NAMES[i];
  });

  // BP_Generateur: takes the fuses it expects from the inventory; the gauge says how many; all three, it restarts.
  const w = gaugeWidget(p);
  const gen = newClass(p, 'BP_Generateur', 'Actor');
  gen.component('StaticMesh', 'Bloc', { sizeX: 160, sizeY: 100, color: '#475569' });
  gen.widgetComponent('Jauge', w, { y: -90, sizeX: 140, sizeY: 16 });
  implementInterface(gen.cls, iface.id);
  const expected = gen.variable('Attendus', T.array(T.name), [...FUSE_NAMES]);
  const placed = gen.variable('Poses', T.set(T.name), []);
  const on = gen.variable('Allume', T.bool, false);
  const bar = gen.variable('Barre', T.object('WBP_Jauge'));
  // BeginPlay: the gauge's widget, found once.
  const begin = gen.node('event.beginPlay', {}, {}, [64, -400]);
  const uwo = gen.node('widgetComponent.getUserWidgetObject', {}, {}, [200, -200]);
  const cast = gen.node('cast.to', { class: w.cls.id }, {}, [400, -400]);
  const keep = gen.node('var.set', { variable: bar }, {}, [700, -400]);
  gen.target('Jauge', uwo).link(begin, 'then', cast, 'exec').link(uwo, 'result', cast, 'object').link(cast, 'then', keep, 'exec').link(cast, 'as', keep, 'value');
  // PrendreFusibles (Inventaire), a function (review of chantier n° 5, P2): each fuse expected that the player carries
  // leaves the inventory and is placed.
  const takeAll = fnDef(p, gen, 'PrendreFusibles', [['Inventaire', T.object('BP_Inventaire')]], []);
  const tf = takeAll.f;
  const each = tf.node('flow.forEachLoop', {}, {}, [300, 0]);
  tf.link(takeAll.entry, 'then', each, 'exec').link(tf.node('var.get', { variable: expected }, {}, [140, 200]), 'value', each, 'array');
  const owns = tf.node('call.pureFunction', { owner: inv.cls.id, graph: has.graph.id }, {}, [600, 300]);
  const carries = tf.node('flow.branch', {}, {}, [700, 0]);
  tf.link(each, 'body', carries, 'exec').link(takeAll.entry, takeAll.pin.Inventaire, owns, 'target').link(each, 'element', owns, has.pin.Objet).link(owns, has.pin.Possede, carries, 'condition');
  const out = tf.node('call.function', { owner: inv.cls.id, graph: take.graph.id }, {}, [1000, 0]);
  const put = tf.node('set.add', {}, {}, [1300, 0]);
  tf.link(carries, 'true', out, 'exec').link(takeAll.entry, takeAll.pin.Inventaire, out, 'target').link(each, 'element', out, take.pin.Objet);
  tf.link(out, 'then', put, 'exec').link(tf.node('var.get', { variable: placed }, {}, [1100, 200]), 'value', put, 'set').link(each, 'element', put, 'item');
  Object.assign(tf.graph.nodes[takeAll.ret], { x: 700, y: 300 });
  tf.link(each, 'completed', takeAll.ret, 'exec');
  // Remplissage, a pure function: the share of the fuses placed, 0 to 1.
  const fill = fnDef(p, gen, 'Remplissage', [], [['Part', T.float]]);
  fill.graph.fn!.pure = true;
  const ff = fill.f;
  const count = ff.node('set.length', {}, {}, [300, 200]);
  const total = ff.node('array.length', {}, {}, [300, 320]);
  ff.link(ff.node('var.get', { variable: placed }, {}, [100, 200]), 'value', count, 'set').link(ff.node('var.get', { variable: expected }, {}, [100, 320]), 'value', total, 'array');
  const fCount = ff.node('conv.intToFloat', {}, {}, [500, 200]);
  const fTotal = ff.node('conv.intToFloat', {}, {}, [500, 320]);
  const ratio = ff.node('math.divideFloat', {}, {}, [700, 260]);
  ff.link(count, 'result', fCount, 'in').link(total, 'result', fTotal, 'in').link(fCount, 'result', ratio, 'a').link(fTotal, 'result', ratio, 'b');
  ff.link(fill.entry, 'then', fill.ret, 'exec').link(ratio, 'result', fill.ret, fill.pin.Part);

  // Interagir: running already, or the fuses the player carries; then the gauge, and all of them?
  const asked = gen.node('event.interface', { interface: iface.id, fn: interagir }, {}, [64, 96]);
  const running = gen.node('flow.branch', {}, {}, [300, 96]);
  gen.link(asked, 'then', running, 'exec').link(gen.node('var.get', { variable: on }, {}, [160, 260]), 'value', running, 'condition');
  gen.link(running, 'true', gen.node('debug.printString', {}, { text: RUNNING }, [600, -60]), 'exec');
  const invNode = inventoryOfPlayer(gen, inv.cls.id, [400, 300]);
  const takeCall = gen.node('call.function', { owner: gen.cls.id, graph: takeAll.graph.id }, {}, [600, 96]);
  gen.link(running, 'false', takeCall, 'exec').link(invNode, 'result', takeCall, takeAll.pin.Inventaire);
  const share = gen.node('call.pureFunction', { owner: gen.cls.id, graph: fill.graph.id }, {}, [800, 300]);
  const afficher = fnOf(w, 'Afficher');
  const show = gen.node('call.function', { owner: w.cls.id, graph: afficher.graph.id }, {}, [1000, 96]);
  gen.link(takeCall, 'then', show, 'exec').link(gen.node('var.get', { variable: bar }, {}, [800, 200]), 'value', show, 'target').link(share, fill.pin.Part, show, afficher.pin.Valeur);
  const all = gen.node('math.greaterEqualFloat', {}, { b: 1 }, [1100, 300]);
  const full = gen.node('flow.branch', {}, {}, [1300, 96]);
  gen.link(share, fill.pin.Part, all, 'a').link(show, 'then', full, 'exec').link(all, 'result', full, 'condition');
  const start = gen.node('var.set', { variable: on }, { value: true }, [1600, 96]);
  gen.link(full, 'true', start, 'exec').link(start, 'then', gen.node('debug.printString', {}, { text: STARTED }, [1900, 96]), 'exec');
  const r = placeActor(p, gen.cls.id, ...GENERATOR_AT);
  if (!r.ok) throw new Error(r.reason);
}

/** The Percent of the gauge over this actor (its Widget Component), or undefined. */
function gaugeOf(cx: CheckContext, a: ActorRT | undefined): number | undefined {
  const id = a?.components.find((k) => k.kind === 'Widget' && k.widget)?.widget;
  const obj = id ? cx.sim.objectById(id) : undefined;
  const bar = obj && cx.sim.classOf(obj)?.widgets?.find((x) => x.kind === 'ProgressBar');
  return obj && bar ? Number(cx.sim.umg.prop({ obj, id: bar.id }, 'percent')) : undefined;
}
const generator = (cx: CheckContext) => actorAt(cx, 'BP_Generateur', GENERATOR_AT);
const fusesLeft = (cx: CheckContext) => cx.sim.actors.filter((a) => !a.destroyed && cx.sim.classOf(a)?.name === 'BP_Fusible').length;
const fuseNames = (cx: CheckContext) => carriedNames(cx).filter((x) => x !== 'Badge' && x !== 'CodeControle');

/** The gauge over the generator reads `want` (within 0.02). */
function gaugeReads(cx: CheckContext, want: number, what: string): true | string {
  const g = generator(cx);
  if (!g) return 'Pas de BP_Generateur sur le plot G.';
  const got = gaugeOf(cx, g);
  if (got === undefined) return 'Pas de jauge au-dessus du générateur : un Widget Component dont le Widget Class a une Progress Bar.';
  return Math.abs(got - want) <= 0.02 ? true : `La jauge du générateur est à ${Math.round(got * 100)} %, on attend ${Math.round(want * 100)} % (${what}).`;
}

const GENERATOR_SCENARIO: ScenarioStep[] = [
  ...PLAY_DORM,
  ...AT_GENERATOR,
  { checkpoint: 'rien' },
  ...takeFuse(0),
  ...takeFuse(1),
  { checkpoint: 'deux' },
  ...AT_GENERATOR,
  { checkpoint: 'partiel' },
  ...takeFuse(2),
  ...AT_GENERATOR,
  { checkpoint: 'demarre' },
  ...press('E'),
  { checkpoint: 'tourne' },
];

const generatorChecks: Check[] = [
  {
    id: 'placed',
    label: 'Trois BP_Fusible sur les plots F, un BP_Generateur sur le plot G',
    test: (cx) => {
      const missing = FUSES_AT.filter((at) => !placedNear(cx, 'BP_Fusible', at)).length;
      if (missing) return `${missing} plot${missing > 1 ? 's' : ''} F sans BP_Fusible (à moins de 80 cm de son centre), dans l’atelier de Lvl_Dortoir.`;
      return placedNear(cx, 'BP_Generateur', GENERATOR_AT) ? true : 'Pose un BP_Generateur sur le plot G, dans l’atelier.';
    },
  },
  {
    id: 'empty',
    label: 'E au générateur sans fusible : la jauge vide, il ne démarre pas',
    at: 'rien',
    test: (cx) => (countPrints(cx, STARTED) ? `« ${STARTED} » sans aucun fusible.` : gaugeReads(cx, 0, 'aucun fusible posé')),
  },
  {
    id: 'fuses',
    label: `Deux fusibles ramassés : « ${FUSE_TAKEN} », ils quittent le niveau et entrent dans l’inventaire, chacun sous son nom`,
    at: 'deux',
    test: (cx) => {
      if (countPrints(cx, FUSE_TAKEN) !== 2) return `E face à deux fusibles : ${countPrints(cx, FUSE_TAKEN)} « ${FUSE_TAKEN} » au lieu de 2.`;
      if (fusesLeft(cx) !== 1) return `${fusesLeft(cx)} fusibles encore dans le niveau après en avoir ramassé deux : un fusible ramassé disparaît (Destroy Actor).`;
      const n = fuseNames(cx).length;
      if (n === 2) return true;
      return n === 1
        ? 'Deux fusibles ramassés, un seul nom dans l’inventaire : les Objets sont un Set, deux fois le même nom n’y compte qu’une fois. Donne à chaque fusible posé son propre Nom (Instance Editable : Fusible_1, Fusible_2, Fusible_3).'
        : `${n} noms de fusible dans l’inventaire, on en attend 2 (Ajouter, comme le badge).`;
    },
  },
  {
    id: 'partial',
    label: 'E au générateur avec deux fusibles : il les prend, la jauge aux deux tiers, pas encore de démarrage',
    at: 'partiel',
    test: (cx) => {
      if (countPrints(cx, STARTED)) return `« ${STARTED} » avec deux fusibles sur trois.`;
      if (fuseNames(cx).length) return `Le générateur a pris les fusibles, mais ils sont encore dans l’inventaire (${fuseNames(cx).join(', ')}) : il les en retire.`;
      return gaugeReads(cx, 2 / 3, 'deux fusibles sur trois');
    },
  },
  {
    id: 'start',
    label: `Le troisième : la jauge pleine, « ${STARTED} »`,
    at: 'demarre',
    test: (cx) => {
      const n = countPrints(cx, STARTED);
      if (n !== 1) return n ? `${n} « ${STARTED} » : une fois, quand le dernier fusible est posé.` : `Les trois fusibles posés : pas de « ${STARTED} ».`;
      return fuseNames(cx).length ? 'Un fusible reste dans l’inventaire après le démarrage.' : gaugeReads(cx, 1, 'les trois fusibles posés');
    },
  },
  {
    id: 'running',
    label: `E encore : « ${RUNNING} », pas un second démarrage`,
    at: 'tourne',
    test: (cx) => (countPrints(cx, STARTED) > 1 ? `Un second « ${STARTED} » : il tourne déjà.` : countPrints(cx, RUNNING) === 1 ? true : `E au générateur qui tourne : pas de « ${RUNNING} ».`),
  },
  {
    id: 'gauge',
    label: 'La jauge est un Widget Component du générateur',
    test: (cx) => (cls(cx.project, 'BP_Generateur')?.components.some((c) => c.kind === 'Widget' && c.classId) ? true : 'La jauge vit au-dessus du générateur : un Widget Component (Widget Class réglé) dans BP_Generateur, pas un widget à l’écran.'),
  },
  noRuntimeErrors(),
];

export const generatorMilestone: Milestone = {
  id: 'generateur',
  title: 'Le générateur',
  cards: [
    {
      title: 'Cahier des charges',
      body:
        'Derrière la porte ouest du dortoir, l’**atelier** : trois plots **F** et un plot **G** (le passage est libre tant qu’il n’y a pas de porte).\n\n' +
        '1. **BP_Fusible**, posé sur chaque plot F. E face à lui : il entre dans l’inventaire, sous **son propre nom** (`Fusible_1`, `Fusible_2`, `Fusible_3`), `' +
        FUSE_TAKEN +
        '`, et il disparaît du niveau. Un seul Blueprint pour les trois.\n' +
        '2. **BP_Generateur**, posé sur G. E face à lui : il prend dans l’inventaire les fusibles qu’il attend et que le joueur porte (ils en sortent).\n' +
        '3. Une **jauge au-dessus du générateur** (une barre, dans le monde, pas sur l’écran) montre la part des fusibles posés : 0, un tiers, deux tiers, plein.\n' +
        `4. Les trois posés : \`${STARTED}\`, une fois. Ensuite, E : \`${RUNNING}\`.`,
    },
    {
      title: 'Le scénario de test',
      body: `Play dans Lvl_Dortoir. E au générateur : la jauge vide. Deux fusibles ramassés : deux « ${FUSE_TAKEN} », il en reste un dans le niveau. E au générateur : la jauge aux deux tiers, les fusibles ne sont plus dans l’inventaire. Le troisième, E : la jauge pleine, « ${STARTED} ». E : « ${RUNNING} ».`,
    },
    {
      title: 'Pour aller plus loin',
      body:
        '**Un Blueprint, trois réglages** : ce qui change d’un fusible à l’autre (son nom) se règle sur chaque acteur posé ; le graphe ne change pas. Et l’inventaire est un Set : trois fois le même nom n’y ferait qu’un fusible.\n\n' +
        '**La jauge dans le monde** : un Widget Component dessine un widget au-dessus de son acteur. Le générateur trouve une fois son widget (Get User Widget Object, Cast) et lui dit sa valeur quand elle change, pas à chaque image.',
    },
  ],
  objectives: ['Trois fusibles, un Blueprint, chacun son nom ; le générateur les prend dans l’inventaire.', 'La jauge au-dessus du générateur (Widget Component) ; tous posés, il redémarre une fois.'],
  scenario: GENERATOR_SCENARIO,
  checks: generatorChecks,
  solve: solveGenerator,
};

// ------------------------------------------------------------- milestone 5

export function solvePower(p: Project): void {
  const iface = interactive(p);
  const interagir = iface.functions[0].id;
  // BP_Generateur: OnDemarre, called when it restarts. It does not know who listens.
  const gen = edit(p, 'BP_Generateur');
  const restarted = addDispatcher(gen.cls, 'OnDemarre');
  const said = Object.values(gen.graph.nodes).find((n) => n.def === 'debug.printString' && n.defaults.text === STARTED)!;
  gen.link(said.id, 'then', gen.node('dispatcher.call', { owner: gen.cls.id, dispatcher: restarted.id }, {}, [2300, 640]), 'exec');

  // BP_Alimente (Actor Component): listens to the generator, then tells its owner (Alimente) and remembers it.
  const alim = newClass(p, 'BP_Alimente', 'ActorComponent');
  const powered = alim.variable('SousTension', T.bool, false);
  const fed = addDispatcher(alim.cls, 'Alimente');
  const begin = alim.node('event.beginPlay', {}, {}, [64, 96]);
  const find = alim.node('actor.getOfClass', {}, { class: gen.cls.id }, [300, 96]);
  const valid = alim.node('flow.isValid', {}, {}, [600, 96]);
  const bind = alim.node('dispatcher.bind', { owner: gen.cls.id, dispatcher: restarted.id }, {}, [900, 96]);
  const cb = alim.node('event.custom', { name: 'Courant', signature: restarted.id, signatureOwner: gen.cls.id }, {}, [64, 500]);
  alim.link(begin, 'then', find, 'exec').link(find, 'then', valid, 'exec').link(find, 'result', valid, 'object').link(valid, 'valid', bind, 'exec').link(find, 'result', bind, 'target').link(cb, 'delegate', bind, 'event');
  const yes = alim.node('var.set', { variable: powered }, { value: true }, [400, 500]);
  alim.link(cb, 'then', yes, 'exec').link(yes, 'then', alim.node('dispatcher.call', { owner: alim.cls.id, dispatcher: fed.id }, {}, [700, 500]), 'exec');

  // BP_Lampe: a light, off until the power comes back.
  const lamp = newClass(p, 'BP_Lampe', 'Actor');
  lamp.component('StaticMesh', 'Plafonnier', { shape: 'cylinder', sizeX: 40, sizeY: 40, color: '#e5e7eb', blocks: false });
  lamp.component('PointLight', 'Lumiere', { visible: false, radius: 260, color: '#fde68a' });
  const lampComp = lamp.logic(alim, 'Alimentation');
  const lampEv = lamp.node('event.componentDispatcher', { component: lampComp, dispatcher: fed.id }, {}, [64, 96]);
  const light = lamp.node('component.setVisibility', {}, { visible: true }, [400, 96]);
  lamp.link(lampEv, 'then', light, 'exec').target('Lumiere', light);
  for (const at of LAMPS_AT) {
    const r = placeActor(p, lamp.cls.id, ...at);
    if (!r.ok) throw new Error(r.reason);
  }

  // BP_Porte_Base: E opens it if PeutOuvrir says so (a Timeline slides the leaf); else Refus.
  const base = newClass(p, 'BP_Porte_Base', 'Actor');
  base.component('StaticMesh', 'Battant', { sizeX: 140, sizeY: 30, color: '#78716c' });
  implementInterface(base.cls, iface.id);
  const open = base.variable('Ouverte', T.bool, false);
  const refusal = base.variable('Refus', T.string, 'La porte est verrouillée');
  const may = fnDef(p, base, 'PeutOuvrir', [], [['Peut', T.bool]], false);
  Object.values(may.graph.nodes).find((n) => n.id === may.ret)!.defaults[may.pin.Peut] = true;
  const asked = base.node('event.interface', { interface: iface.id, fn: interagir }, {}, [64, 96]);
  const already = base.node('flow.branch', {}, {}, [300, 96]);
  base.link(asked, 'then', already, 'exec').link(base.node('var.get', { variable: open }, {}, [160, 260]), 'value', already, 'condition');
  const check = base.node('call.function', { graph: may.graph.id }, {}, [560, 96]);
  const allowed = base.node('flow.branch', {}, {}, [860, 96]);
  base.link(already, 'false', check, 'exec').link(check, 'then', allowed, 'exec').link(check, may.pin.Peut, allowed, 'condition');
  const nowOpen = base.node('var.set', { variable: open }, { value: true }, [1160, 40]);
  const tl = base.node('timeline.node', {}, {}, [1460, 40]);
  const alpha = readTimeline(base.graph.nodes[tl]).tracks[0].id;
  const far = base.node('math.multiplyFloat', {}, { b: SLIDE }, [1700, 300]);
  const offset = base.node('math.makeVector', {}, {}, [1900, 300]);
  const slide = base.node('component.setRelativeLocation', {}, {}, [1900, 40]);
  base.link(allowed, 'true', nowOpen, 'exec').link(nowOpen, 'then', tl, 'play').link(tl, 'update', slide, 'exec').link(tl, trackPin(alpha), far, 'a').link(far, 'result', offset, 'x').link(offset, 'result', slide, 'location').target('Battant', slide);
  const refuse = base.node('debug.printString', {}, {}, [1160, 260]);
  base.link(allowed, 'false', refuse, 'exec').link(base.node('var.get', { variable: refusal }, {}, [1000, 400]), 'value', refuse, 'text');

  // The children add only their condition (PeutOuvrir) and their refusal (Class Defaults).
  const refusalVar = base.cls.variables.find((x) => x.id === refusal)!;
  const child = (name: string, why: string, condition: (b: ClassBuilder, f: ReturnType<typeof fnDef>) => void, at: At) => {
    const b = newClass(p, name, 'Actor');
    const r = setParentClass(p, b.cls.id, base.cls.id);
    if (!r.ok) throw new Error(r.reason);
    setInheritedDefault(b.cls, refusalVar, why);
    const f = fnDef(p, b, 'PeutOuvrir', [], [['Peut', T.bool]], false);
    condition(b, f);
    const placed = placeActor(p, b.cls.id, ...at);
    if (!placed.ok) throw new Error(placed.reason);
  };
  const inv = edit(p, 'BP_Inventaire');
  const has = fnOf(inv, 'Possede');
  child(
    'BP_Porte_Badge',
    NO_BADGE,
    (_b, f) => {
      const owns = f.f.node('call.pureFunction', { owner: inv.cls.id, graph: has.graph.id }, { [has.pin.Objet]: BADGE }, [500, 260]);
      f.f.link(inventoryOfPlayer(f.f, inv.cls.id, [300, 300]), 'result', owns, 'target').link(owns, has.pin.Possede, f.ret, f.pin.Peut);
    },
    BADGE_DOOR_AT,
  );
  child(
    'BP_Porte_Energie',
    NO_POWER,
    (b, f) => {
      b.logic(alim, 'Alimentation');
      const get = f.f.node('var.getExternal', { owner: alim.cls.id, variable: powered }, {}, [400, 260]);
      f.f.target('Alimentation', get).link(get, 'value', f.ret, f.pin.Peut);
    },
    POWER_DOOR_AT,
  );
}

const doorFront = (at: At) => standAt(southOf(at), -90, 0.1);
const POWER_SCENARIO: ScenarioStep[] = [
  ...PLAY_DORM,
  { checkpoint: 'noir' },
  ...doorFront(POWER_DOOR_AT),
  ...press('E'),
  { wait: 1.2 },
  { checkpoint: 'sans-courant' },
  ...doorFront(BADGE_DOOR_AT),
  ...press('E'),
  { wait: 1.2 },
  { checkpoint: 'sans-badge' },
  ...TAKE_BADGE,
  ...doorFront(BADGE_DOOR_AT),
  ...press('E'),
  { checkpoint: 'badge-debut' },
  { wait: 1.2 },
  { checkpoint: 'badge' },
  ...POWER_UP,
  { checkpoint: 'lumiere' },
  ...doorFront(POWER_DOOR_AT),
  ...press('E'),
  { wait: 1.2 },
  { checkpoint: 'courant' },
];

const lamps = (cx: CheckContext) => LAMPS_AT.map((at) => actorAt(cx, 'BP_Lampe', at));
const hasLight = (cx: CheckContext) => !!cls(cx.project, 'BP_Lampe')?.components.some((c) => c.kind === 'PointLight');

/** The doorway at `at` is closed (`closed`) or free, with the message if not. */
function doorway(at: At, closed: boolean, name: string, why: string) {
  return (cx: CheckContext): true | string => (doorwayClosed(cx, at) === closed ? true : `${name} est ${closed ? 'ouverte' : 'encore fermée'} : ${why}`);
}

/** The classes a graph of `c` names (in its nodes’ settings and defaults). */
function namesClasses(cx: CheckContext, c: string, others: string[]): string[] {
  const ids = others.map((n) => cls(cx.project, n)?.id).filter((x): x is string => !!x);
  const text = JSON.stringify(cx.nodes(c).map((n) => [n.config, n.defaults]));
  return others.filter((_, i) => ids[i] && text.includes(ids[i]));
}

const powerChecks: Check[] = [
  {
    id: 'placed',
    label: 'BP_Porte_Badge sur B, BP_Porte_Energie sur E, un BP_Lampe sur chaque plot L',
    test: (cx) => {
      if (!placedNear(cx, 'BP_Porte_Badge', BADGE_DOOR_AT)) return 'Pose une BP_Porte_Badge sur le plot B (la porte de l’atelier).';
      if (!placedNear(cx, 'BP_Porte_Energie', POWER_DOOR_AT)) return 'Pose une BP_Porte_Energie sur le plot E (la porte du couloir).';
      const missing = LAMPS_AT.filter((at) => !placedNear(cx, 'BP_Lampe', at)).length;
      return missing ? `${missing} plot${missing > 1 ? 's' : ''} L sans BP_Lampe.` : true;
    },
  },
  {
    id: 'dark',
    label: 'Au lancement, les lampes sont éteintes',
    at: 'noir',
    test: (cx) => {
      if (!hasLight(cx)) return 'BP_Lampe n’a pas de Point Light : c’est elle qui éclaire.';
      const on = lamps(cx).filter(lit).length;
      return on ? `${on} lampe${on > 1 ? 's' : ''} allumée${on > 1 ? 's' : ''} au lancement : la station est dans le noir tant que le générateur ne tourne pas (Point Light, Visible décoché).` : true;
    },
  },
  {
    id: 'no-power',
    label: `Porte du couloir sans courant : « ${NO_POWER} », elle reste fermée`,
    at: 'sans-courant',
    test: (cx) => {
      const r = doorway(POWER_DOOR_AT, true, 'La porte du couloir', 'sans courant, elle ne s’ouvre pas.')(cx);
      if (r !== true) return r;
      return countPrints(cx, NO_POWER) === 1 ? true : `E à la porte du couloir, sans courant : pas de « ${NO_POWER} » (son Refus, réglé dans ses Class Defaults).`;
    },
  },
  {
    id: 'no-badge',
    label: `Porte de l’atelier sans badge : « ${NO_BADGE} », elle reste fermée`,
    at: 'sans-badge',
    test: (cx) => {
      const r = doorway(BADGE_DOOR_AT, true, 'La porte de l’atelier', 'sans le badge, elle ne s’ouvre pas.')(cx);
      if (r !== true) return r;
      return countPrints(cx, NO_BADGE) === 1 ? true : `E à la porte de l’atelier, sans badge : pas de « ${NO_BADGE} ».`;
    },
  },
  {
    id: 'smooth',
    label: 'Avec le badge, la porte glisse (elle n’est pas encore ouverte un instant après E)',
    at: 'badge-debut',
    test: doorway(BADGE_DOOR_AT, true, 'La porte de l’atelier', 'ouverte d’un coup, un dixième de seconde après E. Elle glisse en douceur : un Timeline (sa piste de 0 à 1) fait avancer le Battant (Set Relative Location).'),
  },
  {
    id: 'badge-open',
    label: 'Puis elle est ouverte',
    at: 'badge',
    test: (cx) => {
      if (countPrints(cx, NO_BADGE) > 1) return `« ${NO_BADGE} » alors que le joueur a le badge.`;
      return doorway(BADGE_DOOR_AT, false, 'La porte de l’atelier', `1,2 s après E, avec le badge, le passage est encore bouché : le Battant s’écarte d’au moins ${SLIDE} cm.`)(cx);
    },
  },
  {
    id: 'lights',
    label: `Le générateur redémarre : les trois lampes s’allument`,
    at: 'lumiere',
    test: (cx) => {
      if (countPrints(cx, STARTED) !== 1) return `Pas de « ${STARTED} » : le générateur du jalon 4 ne démarre plus.`;
      const off = lamps(cx).filter((a) => !lit(a)).length;
      return off ? `${off} lampe${off > 1 ? 's' : ''} encore éteinte${off > 1 ? 's' : ''} après le redémarrage : le générateur le dit (Event Dispatcher), et chaque BP_Alimente le répète à son acteur.` : true;
    },
  },
  {
    id: 'power-open',
    label: 'Avec le courant, la porte du couloir s’ouvre',
    at: 'courant',
    test: (cx) => {
      if (countPrints(cx, NO_POWER) > 1) return `« ${NO_POWER} » alors que le générateur tourne : la porte le sait par son BP_Alimente.`;
      return doorway(POWER_DOOR_AT, false, 'La porte du couloir', 'le courant est revenu, E l’ouvre.')(cx);
    },
  },
  {
    id: 'family',
    label: 'Les deux portes sont des enfants de BP_Porte_Base, qui seul fait glisser le battant',
    test: (cx) => {
      const base = cls(cx.project, 'BP_Porte_Base');
      if (!base) return 'Il n’y a pas de BP_Porte_Base : le parent des portes, avec ce qu’elles ont en commun (E, le Timeline, le refus).';
      for (const name of ['BP_Porte_Badge', 'BP_Porte_Energie']) {
        const c = cls(cx.project, name);
        if (c?.parentClassId !== base.id) return `${name} n’a pas BP_Porte_Base pour Parent Class : elle en hérite le battant, E et le Timeline, et n’ajoute que sa condition.`;
        if (cx.nodes(name).some((n) => n.def === 'timeline.node')) return `${name} a son propre Timeline : le mouvement est écrit une fois, dans BP_Porte_Base ; l’enfant ne dit que s’il peut s’ouvrir.`;
      }
      return true;
    },
  },
  {
    id: 'dispatch',
    label: 'Le générateur prévient sans savoir qui écoute (Event Dispatcher), et un même composant fait réagir lampes et porte',
    test: (cx) => {
      const gen = cls(cx.project, 'BP_Generateur');
      if (!gen?.dispatchers.length || !cx.nodes('BP_Generateur').some((n) => n.def === 'dispatcher.call')) return 'BP_Generateur n’appelle aucun Event Dispatcher : quand il redémarre, il le dit (Call), et ceux qui écoutent réagissent.';
      const known = namesClasses(cx, 'BP_Generateur', ['BP_Lampe', 'BP_Porte_Energie', 'BP_Porte_Base']);
      if (known.length) return `BP_Generateur nomme ${known.join(', ')} : il ne connaît pas ceux qui réagissent. Une lampe de plus doit marcher sans toucher au générateur.`;
      const logic = (name: string) => (cls(cx.project, name)?.components ?? []).filter((c) => c.kind === 'ActorComponent').map((c) => c.classId);
      const lampComps = new Set(logic('BP_Lampe'));
      const doorComps = logic('BP_Porte_Energie');
      return doorComps.some((c) => lampComps.has(c)) ? true : 'Les lampes et la porte du couloir réagissent au courant par le même Actor Component (BP_Alimente), posé sur chacune.';
    },
  },
  noRuntimeErrors(),
];

export const powerMilestone: Milestone = {
  id: 'courant',
  title: 'Le courant et les portes',
  cards: [
    {
      title: 'Cahier des charges',
      body:
        '1. Quand le générateur redémarre, **tout ce qui porte un composant BP_Alimente** réagit, chacun à sa façon. Le générateur ne connaît pas ceux qui réagissent.\n' +
        '2. **BP_Lampe**, sur chaque plot L : une Point Light, éteinte au lancement, allumée quand le courant revient.\n' +
        '3. **BP_Porte_Base** : E face à elle, si elle **peut s’ouvrir**, son battant glisse sur le côté (en une seconde, pas d’un coup) ; sinon elle dit son **refus**. Ouverte, elle le reste.\n' +
        `4. Deux enfants, qui n’ajoutent que leur condition et leur refus : **BP_Porte_Badge** sur B (le joueur a le badge, sinon \`${NO_BADGE}\`), **BP_Porte_Energie** sur E (le courant est revenu, sinon \`${NO_POWER}\`).`,
    },
    {
      title: 'Le scénario de test',
      body: `Play dans Lvl_Dortoir : les lampes éteintes. E à la porte du couloir : « ${NO_POWER} ». E à la porte de l’atelier : « ${NO_BADGE} ». Le badge pris, E : un instant après, la porte est encore en train de glisser ; puis elle est ouverte. Les trois fusibles au générateur : les trois lampes allumées. E à la porte du couloir : elle s’ouvre.`,
    },
    {
      title: 'Pour aller plus loin',
      body:
        '**Qui connaît qui** : le générateur annonce (Event Dispatcher) ; le composant BP_Alimente écoute et répète à son acteur. Une lampe de plus, un terminal qui s’allume : rien à changer au générateur, un composant à poser.\n\n' +
        '**Une famille de portes** : le parent fait ce qui est commun (E, le battant, le Timeline, le refus) ; l’enfant redéfinit **PeutOuvrir**, une fonction qui rend un Boolean, et règle son Refus dans ses Class Defaults. Le parent appelle PeutOuvrir sans savoir quelle version répondra.',
    },
  ],
  objectives: ['Le générateur prévient par un Event Dispatcher ; BP_Alimente fait réagir lampes et porte.', 'BP_Porte_Base (Timeline) et deux enfants qui redéfinissent PeutOuvrir.'],
  scenario: POWER_SCENARIO,
  checks: powerChecks,
  solve: solvePower,
};

