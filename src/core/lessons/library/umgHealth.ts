/**
 * V7.37, UMG at Confirmé (docs/PLAN_UMG.md): the widget reads the game, the
 * game does not live in the widget.
 *
 * - « La barre de vie » (chain umg, guided): BP_Joueur keeps its Sante and
 *   announces each change (OnSanteChange). WBP_Sante, in Event Construct,
 *   finds the player (Get Owning Player Pawn, Cast To), subscribes, and
 *   draws the value once at once: the player starts wounded.
 * - R6 « La jauge d'oxygène » (refactor, chain umg, modify): the same done
 *   with a Binding, that reads the player every frame. Rewrite it with an
 *   Event Dispatcher the player calls when the value changes.
 */
import type { Project } from '../../model/project';
import { addDispatcher, addDispatcherParam } from '../../operations/classOps';
import { createWidgetBinding } from '../../operations/widgetOps';
import { T } from '../../types/pins';
import { edit, ProjectBuilder, type ClassBuilder } from '../builder';
import { noRuntimeErrors, notion } from '../checks';
import type { Check, CheckContext, Lesson } from '../types';
import { ensurePlayerInput } from '../ue5Input';
import { fnDef, varId } from './kit';
import { playerBlueprint } from './props';
import { UMG_MODULE } from './umgCounter';
import { addW, controller, drawnProp, eventDriven, getW, newClass, pct, screenTexts, widgetNamed } from './umgKit';

/** In BP_PlayerController, after Add Mapping Context: Create `cls` (Owning Player = Self) → Add to Viewport. */
export function showAtStart(p: Project, cls: ClassBuilder): void {
  const { b: pc, last } = controller(p);
  const create = pc.node('widget.create', {}, { class: cls.cls.id }, [1100, 96]);
  const show = pc.node('widget.addToViewport', {}, {}, [1440, 96]);
  pc.link(last, 'then', create, 'exec').link(pc.node('actor.self', {}, {}, [1000, 300]), 'self', create, 'owner');
  pc.link(create, 'then', show, 'exec').link(create, 'result', show, 'target');
}

/** A dispatcher with one parameter, named. Returns its id and its parameter id. */
export function dispatcherWith(b: ClassBuilder, name: string, param: string, type = T.float): { id: string; param: string } {
  const d = addDispatcher(b.cls, name);
  addDispatcherParam(b.cls, d.id, type);
  d.params[0].name = param;
  return { id: d.id, param: d.params[0].id };
}

/**
 * In a Widget Blueprint, the UE way to follow a value of the player:
 * Construct → Get Owning Player Pawn → Cast To BP_Joueur → Bind Event to
 * `dispatcher` (a Custom Event of its signature) → update once with the
 * player's current value. `update(b, value, after)` draws a value after an
 * exec pin; it returns nothing.
 */
export function followPlayer(
  p: Project,
  w: ClassBuilder,
  dispatcher: { id: string; param: string },
  variable: string,
  update: (b: ClassBuilder, value: [string, string], after: [string, string], y: number) => void,
): void {
  const player = p.classes.find((c) => c.name === 'BP_Joueur')!;
  const construct = w.node('event.construct', {}, {}, [64, 96]);
  const pawn = w.node('widget.getOwningPlayerPawn', {}, {}, [64, 300]);
  const cast = w.node('cast.to', { class: player.id }, {}, [360, 96]);
  const bind = w.node('dispatcher.bind', { owner: player.id, dispatcher: dispatcher.id }, {}, [700, 96]);
  const ev = w.node('event.custom', { name: 'MettreAJour', signature: dispatcher.id, signatureOwner: player.id }, {}, [64, 560]);
  w.link(construct, 'then', cast, 'exec').link(pawn, 'result', cast, 'object').link(cast, 'then', bind, 'exec').link(cast, 'as', bind, 'target').link(ev, 'delegate', bind, 'event');
  const now = w.node('var.getExternal', { owner: player.id, variable }, {}, [760, 320]);
  w.link(cast, 'as', now, 'target');
  update(w, [now, 'value'], [bind, 'then'], 96);
  update(w, [ev, dispatcher.param], [ev, 'then'], 560);
}

// ---------------------------------------------------------- La barre de vie

const START = 60;
const HIT = 20;
const TRAPS: [number, number][] = [
  [300, 0],
  [650, 0],
];

function healthProject(): Project {
  const pb = new ProjectBuilder('La barre de vie');
  const { b: player } = playerBlueprint(pb);
  const sante = player.variable('Sante', T.float, START);
  const change = dispatcherWith(player, 'OnSanteChange', 'Sante');
  // Blesser(Degats): Sante − Degats, then the announcement.
  const hurt = fnDef(pb.project, player, 'Blesser', [['Degats', T.float]], []);
  const sub = hurt.f.node('math.subtractFloat', {}, {}, [300, 300]);
  const set = hurt.f.node('var.set', { variable: sante }, {}, [560, 96]);
  const call = hurt.f.node('dispatcher.call', { owner: player.cls.id, dispatcher: change.id }, {}, [900, 96]);
  hurt.f.link(hurt.f.node('var.get', { variable: sante }, {}, [100, 300]), 'value', sub, 'a').link(hurt.entry, hurt.pin.Degats, sub, 'b');
  hurt.f.link(hurt.entry, 'then', set, 'exec').link(sub, 'result', set, 'value').link(set, 'then', call, 'exec').link(set, 'out', call, change.param);
  hurt.f.link(call, 'then', hurt.ret, 'exec');

  const trap = pb.blueprint('BP_Piege');
  trap.component('StaticMesh', 'Plaque', { sizeX: 110, sizeY: 110, color: '#b91c1c', blocks: false });
  trap.component('BoxCollision', 'Zone', { sizeX: 120, sizeY: 120 });
  const over = trap.node('event.actorBeginOverlap', {}, {}, [64, 96]);
  const cast = trap.node('cast.to', { class: player.cls.id }, {}, [360, 96]);
  const blesse = trap.node('call.function', { owner: player.cls.id, graph: hurt.graph.id }, { [hurt.pin.Degats]: HIT }, [700, 96]);
  trap.link(over, 'then', cast, 'exec').link(over, 'other', cast, 'object').link(cast, 'then', blesse, 'exec').link(cast, 'as', blesse, 'target');
  for (const at of TRAPS) pb.place(trap, ...at);
  pb.playerStart(-300, 0);
  const p = pb.project;
  ensurePlayerInput(p, []);

  const w = newClass(p, 'WBP_Sante', 'UserWidget');
  const canvas = addW(p, w.cls, 'CanvasPanel', undefined);
  addW(p, w.cls, 'TextBlock', canvas.id, { name: 'Txt_Sante', props: { text: 'Santé', fontSize: 20 }, slot: { offsets: [40, 32, 200, 32] } });
  addW(p, w.cls, 'ProgressBar', canvas.id, { name: 'PB_Sante', isVariable: true, props: { percent: 1, fillColor: '#dc2626' }, slot: { offsets: [40, 68, 360, 28] } });
  showAtStart(p, w);
  return p;
}

const barOf = (cx: CheckContext) => drawnProp(cx, 'PB_Sante');
const near = (a: number | undefined, b: number) => a !== undefined && Math.abs(a - b) < 0.01;

function bar(id: string, health: number, label: string, at?: string): Check {
  const want = health / 100;
  return {
    id,
    label,
    at,
    test: (cx) => {
      const b = barOf(cx);
      if (!b?.drawn) return 'La barre de vie n’est pas à l’écran.';
      if (near(b.percent, want)) return true;
      if (b.percent > 1.001) return `La barre reçoit ${b.percent} : Percent va de 0 à 1. Divise la Santé par 100.`;
      if (near(b.percent, 1) && health === START)
        return `Au lancement, la barre est pleine alors que le joueur a ${START} : OnSanteChange n’a encore jamais été appelé. Mets la barre à jour une fois dans Event Construct, avec la Santé actuelle du joueur.`;
      return `La barre montre ${pct(b.percent)}, le joueur a ${health} : on attend ${pct(want)}. Chaque fois que OnSanteChange est appelé, la barre doit suivre.`;
    },
  };
}

export const lessonHealthBar: Lesson = {
  id: 'l-barre-vie',
  module: UMG_MODULE,
  level: 'confirme',
  number: 0,
  title: 'La barre de vie',
  situation:
    'Le joueur commence blessé et chaque piège lui retire 20 points de santé. La barre de vie est à l’écran, mais elle reste pleine. Fais-la suivre la santé du joueur, sans qu’elle la relise à chaque image.',
  chain: { notion: 'umg', step: 'guided' },
  recalls: ['dispatchers', 'cast'],
  notions: ['Get Owning Player Pawn', 'Event Construct', 'Event Dispatcher', 'Set Percent'],
  remember:
    'Le widget lit le jeu, il ne le contient pas : la santé vit dans le joueur, qui annonce chaque changement par un Event Dispatcher. Dans Event Construct, le widget trouve le joueur (Get Owning Player Pawn), s’abonne, puis se met à jour une fois tout de suite. Percent va de 0 à 1.',
  cards: [
    {
      title: 'Ce qui est en place',
      body:
        '- **BP_Joueur** a une **Sante** (Float, **60** au départ) et un Event Dispatcher **OnSanteChange** (paramètre Sante). Sa fonction **Blesser** retire les dégâts puis appelle OnSanteChange.\n' +
        '- Deux **BP_Piege** appellent Blesser (20) quand le joueur marche dessus.\n' +
        '- **WBP_Sante** : un texte et **PB_Sante**, une Progress Bar cochée Is Variable, pleine. **BP_PlayerController** la crée (Owning Player = Self) et l’ajoute à l’écran. Son Graph est vide.\n\n' +
        'Le test attend la barre à 60 %, puis 40 % après le premier piège, puis 20 % après le second.',
    },
    {
      title: 'Ce qui est nouveau : le widget suit le joueur',
      body:
        'Le widget ne garde pas la santé : il **l’affiche**. Pour savoir quand elle change, il s’abonne à OnSanteChange, comme les lampes de « La salle de contrôle » s’abonnaient à la console.\n\n' +
        '**Où s’abonner ?** Dans **Event Construct**, qui passe quand le widget arrive à l’écran. **Get Owning Player Pawn** donne le pion du joueur à qui appartient le widget (celui de son Owning Player) : un **Cast To BP_Joueur** ouvre son dispatcher et sa Sante.\n\n' +
        '**Le piège.** S’abonner ne dessine rien : la barre ne bouge qu’au prochain changement. Le joueur commence à 60, alors la barre doit se mettre à jour **une fois tout de suite**, avec la Sante actuelle.',
    },
    {
      title: 'Pas à pas, dans le Graph de WBP_Sante',
      body:
        '1. **Event Construct** → **Cast To BP_Joueur** (Object = **Get Owning Player Pawn**).\n' +
        '2. → **Bind Event to OnSanteChange** (Target = As BP_Joueur). Sur sa pin Event, tire un **Custom Event** : `MettreAJour`, qui reçoit la Sante.\n' +
        '3. `MettreAJour` → **Set Percent** (Target = Get PB_Sante, In Percent = Sante **÷ 100**).\n' +
        '4. Après le Bind : un second **Set Percent**, avec la Sante lue sur As BP_Joueur.\n\n' +
        'Le **Binding** (menu Bind de Percent) marcherait aussi, mais relirait la santé à chaque image : c’est le sujet de l’étape suivante.',
    },
  ],
  objectives: [
    'Au lancement, la barre montre la santé du joueur : 60 %.',
    'Elle suit chaque piège : 40 %, puis 20 %.',
    'WBP_Sante s’abonne à OnSanteChange, sans Binding ni Event Tick.',
  ],
  hints: [
    'Qui sait quand la santé change ? Le joueur l’annonce déjà. Et au lancement, que montre la barre tant que personne n’a rien annoncé ?',
    'Event Construct, Get Owning Player Pawn, Cast To BP_Joueur, Bind Event to OnSanteChange, Custom Event, Set Percent, ÷ (Float), Get Sante.',
    'Solution, dans WBP_Sante : Event Construct → Cast To BP_Joueur (Object = Get Owning Player Pawn) → Bind Event to OnSanteChange (Target = As BP_Joueur, Event = MettreAJour) → Set Percent (PB_Sante, Sante de As BP_Joueur ÷ 100). Custom Event MettreAJour (Sante) → Set Percent (PB_Sante, Sante ÷ 100).',
  ],
  challenge: 'Fais passer la barre au rouge vif sous 30 % (Set Fill Color and Opacity), et en vert au-dessus. Où mettre ce choix pour qu’il marche aussi au lancement ?',
  setup: healthProject,
  scenario: [{ wait: 0.3 }, { checkpoint: 'debut' }, { teleport: TRAPS[0] }, { wait: 0.2 }, { checkpoint: 'piege1' }, { teleport: [-300, 0] }, { wait: 0.2 }, { teleport: TRAPS[1] }, { wait: 0.2 }],
  checks: [
    bar('start', START, 'Au lancement : 60 %', 'debut'),
    bar('first', START - HIT, 'Après le premier piège : 40 %', 'piege1'),
    bar('second', START - 2 * HIT, 'Après le second : 20 %'),
    notion({ id: 'event-driven', label: 'Mise à jour sur l’événement, sans Binding ni Tick', test: (cx) => eventDriven(cx, 'WBP_Sante') }),
    notion({
      id: 'bind',
      label: 'WBP_Sante s’abonne à OnSanteChange',
      test: (cx) => (cx.nodes('WBP_Sante').some((n) => n.def === 'dispatcher.bind') ? true : 'Bind Event to OnSanteChange, dans Event Construct.'),
    }),
    noRuntimeErrors(),
  ],
  solve(p) {
    const w = edit(p, 'WBP_Sante');
    const player = edit(p, 'BP_Joueur');
    const d = player.cls.dispatchers.find((x) => x.name === 'OnSanteChange')!;
    followPlayer(p, w, { id: d.id, param: d.params[0].id }, varId(player, 'Sante'), (b, value, after, y) => {
      const div = b.node('math.divideFloat', {}, { b: 100 }, [1100, y + 220]);
      const set = b.node('widget.setPercent', {}, {}, [1300, y]);
      b.link(value[0], value[1], div, 'a').link(div, 'result', set, 'percent').link(after[0], after[1], set, 'exec').link(getW(b, 'PB_Sante', [1100, y + 120]), 'value', set, 'target');
    });
  },
};

// ---------------------------------------------------- R6 : la jauge d'oxygène

const BREATH = 5;

function oxygenProject(): Project {
  const pb = new ProjectBuilder('La jauge d’oxygène');
  const { b: player } = playerBlueprint(pb);
  const oxygen = player.variable('Oxygene', T.int, 100);
  // Every 0.5 s the suit uses 5 % of its oxygen.
  const begin = player.node('event.beginPlay', {}, {}, [64, 96]);
  const timer = player.node('time.setTimerByEvent', {}, { time: 0.5, looping: true }, [360, 96]);
  const breathe = player.node('event.custom', { name: 'Respirer' }, {}, [64, 360]);
  const sub = player.node('math.subtractInt', {}, { b: BREATH }, [380, 560]);
  const set = player.node('var.set', { variable: oxygen }, {}, [640, 360]);
  player.link(begin, 'then', timer, 'exec').link(breathe, 'delegate', timer, 'event');
  player.link(breathe, 'then', set, 'exec').link(player.node('var.get', { variable: oxygen }, {}, [200, 560]), 'value', sub, 'a').link(sub, 'result', set, 'value');
  const crate = pb.blueprint('BP_Bouteille');
  crate.component('StaticMesh', 'Bouteille', { shape: 'cylinder', sizeX: 40, sizeY: 40, color: '#0ea5e9' });
  pb.place(crate, 400, -200);
  pb.playerStart(0, 0);
  const p = pb.project;
  ensurePlayerInput(p, []);

  // WBP_Oxygene: Txt_Oxygene bound to GetText_0, which reads the player every frame.
  const w = newClass(p, 'WBP_Oxygene', 'UserWidget');
  const canvas = addW(p, w.cls, 'CanvasPanel', undefined);
  const text = addW(p, w.cls, 'TextBlock', canvas.id, { name: 'Txt_Oxygene', isVariable: true, props: { text: 'Oxygène : 100', fontSize: 26, color: '#7dd3fc' }, slot: { offsets: [40, 32, 360, 44] } });
  const r = createWidgetBinding(p, w.cls, text.id, 'text');
  if (!r.ok) throw new Error(r.reason);
  const g = r.value;
  const f = w.inGraph(g.id);
  const entry = Object.values(g.nodes).find((n) => n.def === 'fn.entry')!.id;
  const ret = Object.values(g.nodes).find((n) => n.def === 'fn.return')!.id;
  const out = g.fn!.outputs[0].id;
  const cast = f.node('cast.to', { class: player.cls.id }, {}, [300, 96]);
  const read = f.node('var.getExternal', { owner: player.cls.id, variable: oxygen }, {}, [520, 320]);
  const toText = f.node('conv.intToText', {}, {}, [760, 320]);
  const fmt = f.node('text.format', {}, { format: 'Oxygène : {O}' }, [960, 320]);
  f.link(entry, 'then', cast, 'exec').link(f.node('widget.getOwningPlayerPawn', {}, {}, [100, 300]), 'result', cast, 'object');
  f.link(cast, 'then', ret, 'exec').link(cast, 'as', read, 'target').link(read, 'value', toText, 'in').link(toText, 'result', fmt, 'arg:O').link(fmt, 'result', ret, out);
  showAtStart(p, w);
  return p;
}

function oxygen(id: string, value: number, label: string, at?: string): Check {
  return {
    id,
    label,
    at,
    test: (cx) => {
      const t = screenTexts(cx).find((x) => /oxyg/i.test(x));
      if (t === undefined) return 'La jauge d’oxygène n’est plus à l’écran.';
      if (new RegExp(`(^|\\D)${value}(\\D|$)`).test(t)) return true;
      return `La jauge affiche « ${t} », l’oxygène vaut ${value}.${value === 100 ? ' Au lancement, mets-la à jour une fois dans Event Construct.' : ' À chaque Respirer, BP_Joueur doit annoncer la nouvelle valeur, et la jauge s’y abonner.'}`;
    },
  };
}

export const refactor6: Lesson = {
  id: 'r6-oxygene',
  kind: 'refactor',
  code: 'R6',
  module: UMG_MODULE,
  level: 'confirme',
  number: 0,
  title: 'La jauge d’oxygène',
  situation:
    'La jauge d’oxygène marche : elle affiche la réserve du scaphandre, qui baisse toutes les demi-secondes. Mais elle est liée par un Binding : sa fonction relit le joueur à chaque image, 60 fois par seconde, pour une valeur qui change deux fois. Réécris-la sur un Event Dispatcher.',
  chain: { notion: 'umg', step: 'modify' },
  recalls: ['dispatchers'],
  notions: ['Binding', 'Event Dispatcher', 'Event Construct', 'SetText (Text)'],
  remember:
    'Un Binding est appelé à chaque image, qu’il y ait du nouveau ou non : pratique pour essayer, coûteux dès que l’interface grossit. Piloté par événement, le jeu annonce le changement (Event Dispatcher) et le widget, abonné dans Event Construct, ne travaille qu’à ce moment-là.',
  cards: [
    {
      title: 'Ce qui est en place',
      body:
        '- **BP_Joueur** a un **Oxygene** (Integer, 100). Au BeginPlay, un timer appelle **Respirer** toutes les 0,5 s, qui retire 5.\n' +
        '- **WBP_Oxygene** : **Txt_Oxygene**, dont le Text est lié (**Bind**) à **GetText_0**. Cette fonction fait Cast To BP_Joueur (Get Owning Player Pawn) et rend « Oxygène : N ».\n' +
        '- **BP_PlayerController** crée la jauge et l’ajoute à l’écran.\n\n' +
        'Pendant Play, le **Live Outliner** (☷) montre combien de fois GetText_0 a été appelée.',
    },
    {
      title: 'Le cahier des charges',
      body:
        '- La jauge affiche toujours la bonne valeur : 100 au lancement, 90 après une seconde, 80 après deux.\n' +
        '- **Plus de Binding** sur Txt_Oxygene (Details › menu Bind à côté de Text › **Remove Binding**), et pas d’Event Tick dans le widget.\n' +
        '- C’est **BP_Joueur** qui annonce chaque changement d’Oxygene, par un Event Dispatcher que tu crées (`OnOxygeneChange`, avec un paramètre Integer).\n\n' +
        'La méthode est celle de « La barre de vie ». GetText_0 peut rester dans le projet ou partir, une fois déliée.',
    },
  ],
  objectives: ['La jauge affiche 100, puis 90, puis 80.', 'Plus de Binding ni d’Event Tick dans WBP_Oxygene.', 'BP_Joueur annonce chaque changement d’Oxygene.'],
  hints: [
    'Qui sait quand l’oxygène change ? Respirer. Il lui manque une façon de le dire, et à la jauge une façon de l’entendre, plus une première mise à jour.',
    'Event Dispatcher (avec un paramètre), Call, Event Construct, Get Owning Player Pawn, Cast To BP_Joueur, Bind Event, Custom Event, To Text (Integer), Format Text, SetText (Text), Remove Binding.',
    'Solution : BP_Joueur : Event Dispatcher OnOxygeneChange (Oxygene, Integer) ; Respirer → Set Oxygene → Call OnOxygeneChange (Oxygene). WBP_Oxygene : Remove Binding sur Txt_Oxygene ; Event Construct → Cast To BP_Joueur (Get Owning Player Pawn) → Bind Event to OnOxygeneChange (MettreAJour) → SetText (Txt_Oxygene, « Oxygène : {O} » avec l’Oxygene de As BP_Joueur). MettreAJour (Oxygene) → SetText de la même façon.',
  ],
  challenge: 'Sous 50, fais clignoter la jauge en rouge. Le clignotement a besoin d’un temps qui passe, l’annonce ne vient que deux fois par seconde : où mettre le timer ?',
  setup: oxygenProject,
  scenario: [{ wait: 0.2 }, { checkpoint: 'debut' }, { wait: 0.9 }, { checkpoint: 'une' }, { wait: 1 }],
  checks: [
    oxygen('start', 100, 'Au lancement : 100', 'debut'),
    oxygen('one', 90, 'Après une seconde : 90', 'une'),
    oxygen('two', 80, 'Après deux secondes : 80'),
    { id: 'no-binding', label: 'Ni Binding ni Event Tick dans WBP_Oxygene', test: (cx) => eventDriven(cx, 'WBP_Oxygene') },
    {
      id: 'announce',
      label: 'BP_Joueur annonce le changement',
      test: (cx) =>
        cx.nodes('BP_Joueur').some((n) => n.def === 'dispatcher.call')
          ? true
          : 'BP_Joueur n’appelle aucun Event Dispatcher : crée OnOxygeneChange et appelle-le dans Respirer, après le Set.',
    },
    noRuntimeErrors(),
  ],
  solve(p) {
    const player = edit(p, 'BP_Joueur');
    const d = dispatcherWith(player, 'OnOxygeneChange', 'Oxygene', T.int);
    const g = player.graph;
    const set = Object.values(g.nodes).find((n) => n.def === 'var.set')!.id;
    const call = player.node('dispatcher.call', { owner: player.cls.id, dispatcher: d.id }, {}, [960, 360]);
    player.link(set, 'then', call, 'exec').link(set, 'out', call, d.param);

    const w = edit(p, 'WBP_Oxygene');
    delete widgetNamed(w.cls, 'Txt_Oxygene').bindings;
    followPlayer(p, w, d, varId(player, 'Oxygene'), (b, value, after, y) => {
      const toText = b.node('conv.intToText', {}, {}, [1000, y + 220]);
      const fmt = b.node('text.format', {}, { format: 'Oxygène : {O}' }, [1200, y + 220]);
      const st = b.node('widget.setText', {}, {}, [1400, y]);
      b.link(value[0], value[1], toText, 'in').link(toText, 'result', fmt, 'arg:O').link(fmt, 'result', st, 'text');
      b.link(after[0], after[1], st, 'exec').link(getW(b, 'Txt_Oxygene', [1200, y + 120]), 'value', st, 'target');
    });
  },
};

