/**
 * Synthesis S4 « Les fusibles », the end of the Avancé. Made again in V7.60
 * (review of the path's progression): the first version used only tools of
 * the Confirmé (Cast, Set, Save Game). It now asks for what makes the
 * Avancé, without naming the tools:
 *
 * - two levels: the fuses of the corridor must still count in the room
 *   (GameInstance, the door's Open Level is given);
 * - E acts on what the player looks at (Line Trace, an interface message);
 * - the panel tells the player on the screen (WBP_Messages, given);
 * - the panel powers every device of the room through its Actor Component
 *   (Get Component by Class), whatever the device is;
 * - the power restored is saved: a new game in the room starts powered.
 */
import { levelOf, type Project } from '../../model/project';
import { addDispatcher, implementInterface } from '../../operations/classOps';
import { addClass, addInterface, addInterfaceFunction } from '../../operations/projectOps';
import { setGameInstanceClass } from '../../operations/levelAssetOps';
import { T } from '../../types/pins';
import { ClassBuilder, edit, ProjectBuilder } from '../builder';
import { noRuntimeErrors, normText, notion, usesNode } from '../checks';
import type { CheckContext, Lesson, ScenarioStep } from '../types';
import { ensurePlayerInput } from '../ue5Input';
import { fnDef, fnOf, goTo, override, ref, tap, varId } from './kit';
import { afficherViaController, messageWidget, onScreen, ownMessages, told } from './messageHud';
import { playerBlueprint } from './props';

const SLOT = 'Station';
const CORRIDOR = 'Lvl_Couloir';
const ROOM = 'Lvl_Salle';
const NEEDED = 3;
const FUSES_CORRIDOR: [number, number][] = [
  [-250, -160],
  [0, 160],
];
const FUSE_ROOM: [number, number] = [-400, 260];
const SAS: [number, number] = [420, 0];
const AWAY: [number, number] = [-520, 0];
const PANEL: [number, number] = [0, 0];
/** Where the player stands to work the panel: 200 cm in front of it, within the 300 cm of a reach. */
const FRONT: [number, number] = [-200, 0];
const LAMPS: [number, number][] = [
  [260, -220],
  [260, 220],
];
const SCREEN: [number, number] = [420, 0];

function project(): Project {
  const pb = new ProjectBuilder('Synthèse S4');
  const p = pb.project;
  levelOf(p).name = CORRIDOR;
  playerBlueprint(pb);
  const r = addInterface(p, 'BPI_Interactif');
  if (!r.ok) throw new Error(r.reason);
  addInterfaceFunction(p, r.value.id, 'Interagir');
  ensurePlayerInput(p, ['E'], { E: 'IA_Interagir' });
  ownMessages(edit(p, 'BP_PlayerController'), messageWidget(p));

  // The device's power: an Actor Component, written; each device answers its own way to OnRecharge.
  const energy = pb.blueprint('BP_Energie', 'ActorComponent');
  const charge = energy.variable('Charge', T.int, 0);
  const powered = addDispatcher(energy.cls, 'OnRecharge').id;
  const recharge = fnDef(p, energy, 'Recharger', [], [], false);
  const full = recharge.f.node('var.set', { variable: charge }, { value: 100 }, [340, 96]);
  const call = recharge.f.node('dispatcher.call', { owner: energy.cls.id, dispatcher: powered }, {}, [660, 96]);
  recharge.f.link(recharge.entry, 'then', full, 'exec').link(full, 'then', call, 'exec').link(call, 'then', recharge.ret, 'exec');

  const lamp = pb.blueprint('BP_Lampe');
  lamp.component('StaticMesh', 'Pied', { shape: 'cylinder', sizeX: 40, sizeY: 40, color: '#6b7280' });
  lamp.component('PointLight', 'Lumiere', { visible: false, radius: 220, color: '#fde68a' });
  const lc = lamp.logic(energy, 'BP_Energie');
  const lon = lamp.node('component.setVisibility', {}, { visible: true }, [400, 96]);
  lamp.link(lamp.node('event.componentDispatcher', { component: lc, dispatcher: powered }, {}, [64, 96]), 'then', lon, 'exec').target('Lumiere', lon);

  const screen = pb.blueprint('BP_Ecran');
  screen.component('StaticMesh', 'Moniteur', { sizeX: 40, sizeY: 120, color: '#1e293b' });
  screen.component('TextRender', 'Etat', { x: 60, text: 'Hors ligne' });
  const sc = screen.logic(energy, 'BP_Energie');
  const son = screen.node('component.setText', {}, { value: 'En ligne' }, [400, 96]);
  screen.link(screen.node('event.componentDispatcher', { component: sc, dispatcher: powered }, {}, [64, 96]), 'then', son, 'exec').target('Etat', son);

  const fuse = pb.blueprint('BP_Fusible');
  fuse.component('StaticMesh', 'Fusible', { shape: 'cylinder', sizeX: 30, sizeY: 30, color: '#f97316', blocks: false });
  fuse.component('BoxCollision', 'Zone', { sizeX: 100, sizeY: 100 });

  // The way to the room is given: the levels are not this synthesis's question, what survives them is.
  const sas = pb.blueprint('BP_Sas');
  sas.component('StaticMesh', 'Cadre', { sizeX: 40, sizeY: 150, color: '#c08a3e', blocks: false });
  sas.component('BoxCollision', 'Zone', { sizeX: 120, sizeY: 170 });
  sas.link(sas.node('event.actorBeginOverlap', {}, {}, [64, 96]), 'then', sas.node('level.open', {}, { level: ROOM }, [400, 96]), 'exec');

  const panel = pb.blueprint('BP_Tableau');
  panel.component('StaticMesh', 'Socle', { sizeX: 80, sizeY: 80, color: '#334155' });
  panel.component('PointLight', 'Voyant', { visible: false, radius: 140, color: '#22c55e' });
  const devices = panel.variable('Appareils', T.array(T.object('Actor')), []);
  panel.cls.variables.find((v) => v.id === devices)!.instanceEditable = true;

  for (const at of FUSES_CORRIDOR) pb.place(fuse, ...at);
  pb.place(sas, ...SAS);
  pb.playerStart(...AWAY);
  pb.level(ROOM, (q) => {
    q.place(fuse, ...FUSE_ROOM);
    const board = q.place(panel, ...PANEL);
    const list = [...LAMPS.map((at) => q.place(lamp, ...at)), q.place(screen, ...SCREEN)];
    override(q, board, devices, list.map(ref));
    q.playerStart(-400, 0);
  });
  return p;
}

// ------------------------------------------------------------------ checks

const alive = (cx: CheckContext, label: string) => !!cx.actor(label) && !cx.actor(label)!.destroyed;
const lampsOn = (cx: CheckContext) => ['BP_Lampe', 'BP_Lampe2'].filter((l) => cx.component(l, 'Lumiere')?.props.visible);
const screenOn = (cx: CheckContext) => normText(String(cx.component('BP_Ecran', 'Etat')?.props.text ?? '')) === 'en ligne';
const ledOn = (cx: CheckContext) => !!cx.component('BP_Tableau', 'Voyant')?.props.visible;
const said = (cx: CheckContext, text: string) => told(cx).some((t) => normText(t).includes(normText(text)));

/** Every device of the room powered, or what is not. */
function powered(cx: CheckContext, when: string): true | string {
  const lamps = lampsOn(cx).length;
  if (lamps === 2 && screenOn(cx)) return true;
  if (!lamps && !screenOn(cx)) return `${when}, aucun appareil n’est alimenté : le tableau doit appeler Recharger sur le BP_Energie de chacun de ses Appareils (Get Component by Class).`;
  return `${when}, ${lamps} lampe(s) sur 2 et l’écran ${screenOn(cx) ? 'en ligne' : 'hors ligne'} : chaque appareil a son BP_Energie, quel que soit son type. Ne t’adresse qu’au composant.`;
}

const LOOK = (yaw: number): ScenarioStep[] => [{ teleport: FRONT }, { look: yaw }, { wait: 0.1 }];

export const synthesis4: Lesson = {
  id: 's4-fusibles',
  code: 'S4',
  kind: 'synthesis',
  module: 'Synthèse',
  level: 'avance',
  number: 0,
  title: 'Les fusibles',
  // V7.60: made again for the Avancé (two levels, GameInstance, Line Trace, Actor Component, screen, save).
  revision: 2,
  situation:
    'Deux fusibles dans le couloir, le troisième dans la salle des machines, derrière le sas. Avec les trois, le tableau électrique rallume tous les appareils de la salle, et le courant reste rétabli à la partie suivante.',
  recalls: ['game-instance', 'save-game', 'trace', 'interfaces', 'actor-components', 'loops', 'cast', 'overlap', 'destroy'],
  notions: ['GameInstance', 'Line Trace By Channel', 'Get Component by Class', 'SaveGame', 'Blueprint Interface'],
  remember:
    'Chaque valeur a sa durée de vie : ce que le joueur porte d’un niveau à l’autre vit dans le GameInstance, ce qui doit survivre à la fermeture du jeu dans une sauvegarde, et ce qu’un appareil sait faire dans son composant. Le tableau ne connaît ni les lampes ni l’écran : seulement leur BP_Energie.',
  cards: [
    {
      title: 'Cahier des charges',
      body:
        'Deux niveaux : **Lvl_Couloir** (le départ) et **Lvl_Salle**. Le **BP_Sas** du couloir mène à la salle (Open Level, déjà écrit). Déjà là aussi : **BPI_Interactif** (Interagir), **IA_Interagir** (E) ; **BP_PlayerController** crée **WBP_Messages** (variable **Messages**, fonction **Afficher**) ; **BP_Energie**, un Actor Component dont la fonction **Recharger** prévient son acteur, posé sur deux **BP_Lampe** et un **BP_Ecran** de la salle, qui y réagissent chacun à leur façon. **BP_Tableau** a une liste **Appareils** (réglée dans le niveau : les deux lampes et l’écran). BP_Joueur, BP_Fusible et BP_Tableau ont des graphes vides.\n\n' +
        '1. Un fusible touché par le joueur **disparaît** et **compte pour toute la partie** : ceux du couloir comptent encore dans la salle.\n' +
        '2. **E** agit sur ce que le joueur **regarde**, à 3 m au plus. Dos au tableau, rien ne se passe.\n' +
        '3. Le tableau, sans trois fusibles, dit **à l’écran** combien il en manque : `Il manque 1 fusible`.\n' +
        '4. Avec les trois : son **Voyant** s’allume, il **recharge chacun de ses Appareils** sans savoir ce qu’ils sont, et dit `Courant rétabli` à l’écran.\n' +
        '5. Le courant rétabli est **sauvé** (slot `Station`) : une nouvelle partie dans la salle démarre avec le Voyant et les appareils allumés, sans fusible.',
    },
    {
      title: 'Comment t’y prendre',
      body:
        'Une synthèse reprend l’Avancé et ce qui le précède, sans liste de nœuds. Pour chaque règle, demande-toi **combien de temps vit la valeur** (le niveau, la partie, ou au-delà de la fermeture) et **qui connaît qui** (le tableau connaît-il les lampes ?).\n\n' +
        'Le test prend les deux fusibles du couloir, passe le sas, appuie sur E dos au tableau, puis face à lui ; prend le troisième fusible, revient au tableau ; enfin relance une partie directement dans la salle. Conseillée, pas obligatoire : rien n’est bloqué si tu passes à l’Expert sans elle.',
    },
    {
      title: 'Pour aller plus loin',
      body:
        'Le compte des fusibles est ici un Integer du GameInstance. Avec le **BP_Inventaire** de « Le sac et le coffre », le joueur porterait un vrai inventaire en Actor Component : il faudrait alors le recopier dans le GameInstance avant le sas et le remplir de nouveau après. C’est le cœur du projet Expert final.',
    },
  ],
  objectives: [
    'Un fusible touché disparaît ; les deux du couloir comptent encore dans la salle.',
    'E agit sur ce que le joueur regarde : dos au tableau, rien.',
    'Sans trois fusibles, l’écran dit « Il manque 1 fusible ».',
    'Avec les trois : Voyant allumé, lampes et écran rechargés par leur BP_Energie, « Courant rétabli » à l’écran.',
    'Le courant rétabli est sauvé : une nouvelle partie dans la salle démarre alimentée.',
  ],
  hints: [
    'Trois durées de vie : celle d’un niveau, celle de la partie, celle d’après la fermeture. Où vit chaque valeur du cahier des charges ? Et comment le tableau parle-t-il à un appareil dont il ignore le type ?',
    'GameInstance (Maps & Modes › Game Instance Class), Get Game Instance, Cast To ; Line Trace By Channel, Get Actor Forward Vector, Interagir (Message) ; For Each Loop, Get Component by Class, Is Valid, Recharger ; SaveGame, Create Save Game Object, Save Game to Slot, Load Game from Slot ; Get Player Controller, Cast To BP_PlayerController, Afficher.',
    'Solution. BP_Jeu (GameInstance, Fusibles : Integer), choisi dans Maps & Modes. BP_Fusible : ActorBeginOverlap → Cast To BP_Joueur → Cast To BP_Jeu (Get Game Instance) → Fusibles + 1 → Destroy Actor. BP_Joueur : IA_Interagir (Started) → Line Trace By Channel (Start = Get Actor Location, End = Start + Forward × 300) → Interagir (Message, Target = Hit Actor).\n' +
      'BP_Sauvegarde (SaveGame, bCourant : Boolean). BP_Tableau implémente BPI_Interactif ; Custom Event Retablir → Set Visibility (Voyant) → For Each Loop (Appareils) → Get Component by Class (BP_Energie) → Is Valid → Recharger. Event Interagir → Cast To BP_Jeu (Get Game Instance) → Branch (Fusibles >= 3) : True → Retablir → Create Save Game Object → Set bCourant → Save Game to Slot (Station) → Afficher « Courant rétabli » ; False → Afficher (« Il manque » + (3 − Fusibles) + « fusible »). BeginPlay → Load Game from Slot (Station) → Cast To BP_Sauvegarde → Branch (bCourant) → Retablir.',
  ],
  challenge: 'Ajoute dans la salle un ventilateur dont les pales tournent quand il est alimenté : que faut-il changer dans BP_Tableau ? (Rien : un BP_Energie, et l’ajouter aux Appareils.)',
  setup: project,
  scenario: [
    { wait: 0.2 },
    ...goTo(...FUSES_CORRIDOR[0]),
    ...goTo(...AWAY),
    ...goTo(...FUSES_CORRIDOR[1]),
    ...goTo(...AWAY),
    { checkpoint: 'deux' },
    { teleport: SAS },
    { wait: 0.4 },
    { checkpoint: 'salle' },
    ...LOOK(180),
    ...tap('E'),
    { wait: 0.1 },
    { checkpoint: 'dos' },
    { look: 0 },
    { wait: 0.1 },
    ...tap('E'),
    { wait: 0.1 },
    { checkpoint: 'manque' },
    ...goTo(...FUSE_ROOM),
    ...LOOK(0),
    ...tap('E'),
    { wait: 0.2 },
    { checkpoint: 'retabli' },
    { restart: true, level: ROOM },
    { wait: 0.3 },
    { checkpoint: 'reprise' },
  ],
  checks: [
    {
      id: 'taken',
      label: 'Un fusible touché disparaît',
      at: 'deux',
      test: (cx) => (alive(cx, 'BP_Fusible') || alive(cx, 'BP_Fusible2') ? 'Le joueur est passé sur les deux fusibles du couloir, et au moins l’un des deux est toujours là.' : true),
    },
    {
      id: 'room',
      label: 'Le sas mène à la salle',
      at: 'salle',
      test: (cx) => (cx.level() === ROOM ? true : `La partie est restée dans ${cx.level()} : le sas (déjà écrit) fait Open Level vers ${ROOM}. L’as-tu modifié ?`),
    },
    {
      id: 'aim',
      label: 'Dos au tableau, E ne fait rien',
      at: 'dos',
      test: (cx) =>
        said(cx, 'manque') || said(cx, 'courant') ? 'Le joueur tourne le dos au tableau, et le tableau a répondu à E : n’envoie Interagir qu’à ce que le joueur regarde (Line Trace By Channel, devant lui).' : true,
    },
    {
      id: 'missing',
      label: 'Avec deux fusibles, l’écran dit qu’il en manque 1',
      at: 'manque',
      test: (cx) => {
        if (ledOn(cx)) return 'Le tableau s’est allumé avec deux fusibles seulement.';
        if (onScreen(cx, 'manque 1')) return true;
        if (said(cx, 'manque 1')) return 'Le tableau répond par Print String : le joueur ne le verrait pas dans un jeu livré. Envoie la réponse à Afficher (Messages, sur BP_PlayerController).';
        if (said(cx, 'manque 3')) return 'Le tableau compte 0 fusible : les deux du couloir ont été comptés dans un objet du couloir, refait à neuf derrière le sas. Garde le compte dans le GameInstance.';
        if (said(cx, 'manque')) return 'Le tableau ne dit pas qu’il en manque 1 : le joueur en a pris 2 dans le couloir.';
        return 'Face au tableau, E n’a rien donné : BP_Joueur envoie Interagir à ce qu’il regarde, et BP_Tableau implémente BPI_Interactif.';
      },
    },
    {
      id: 'restored',
      label: 'Avec les trois : le Voyant s’allume, « Courant rétabli » à l’écran',
      at: 'retabli',
      test: (cx) => {
        if (!ledOn(cx)) return 'Le joueur a les trois fusibles, et le Voyant du tableau est resté éteint.';
        return onScreen(cx, 'Courant rétabli') ? true : said(cx, 'Courant rétabli') ? '« Courant rétabli » passe par Print String : envoie-le à Afficher.' : 'Le Voyant est allumé, mais l’écran ne dit pas « Courant rétabli ».';
      },
    },
    { id: 'devices', label: 'Les lampes et l’écran sont rechargés par leur BP_Energie', at: 'retabli', test: (cx) => powered(cx, 'Courant rétabli') },
    {
      id: 'saved',
      label: 'Le courant rétabli est sauvé, dans le slot « Station »',
      at: 'retabli',
      test: (cx) => (cx.sim.slots[`${SLOT}|0`] ? true : 'Le courant est rétabli, mais aucun slot « Station » : sauve-le à ce moment-là.'),
    },
    {
      id: 'resume',
      label: 'Nouvelle partie dans la salle : tout est alimenté, sans fusible',
      at: 'reprise',
      test: (cx) => {
        if (!ledOn(cx)) return 'Après Stop et Play dans la salle, le Voyant est éteint : le tableau doit relire la sauvegarde à son BeginPlay.';
        return powered(cx, 'Après Stop et Play');
      },
    },
    notion(usesNode('trace', 'BP_Joueur', ['trace.lineByChannel'], 'Le joueur vise avec un Line Trace', 'E doit agir sur ce que le joueur regarde : Line Trace By Channel.')),
    notion(usesNode('component', 'BP_Tableau', ['actor.getComponentByClass'], 'Le tableau ne connaît que le composant', 'Le tableau doit trouver le BP_Energie de chaque appareil (Get Component by Class), pas son type.')),
    notion(usesNode('instance', 'BP_Fusible', ['game.getGameInstance'], 'Les fusibles comptent dans le GameInstance', 'Le compte qui traverse le sas vit dans le GameInstance (Get Game Instance).')),
    noRuntimeErrors(),
  ],
  solve(p) {
    const cls = (n: string) => p.classes.find((c) => c.name === n)!;
    // The GameInstance, chosen in Maps & Modes.
    const r0 = addClass(p, 'BP_Jeu', 'GameInstance');
    if (!r0.ok) throw new Error(r0.reason);
    const jeu = new ClassBuilder(r0.value, p);
    const count = jeu.variable('Fusibles', T.int, 0);
    const gi = setGameInstanceClass(p, jeu.cls.id);
    if (!gi.ok) throw new Error(gi.reason);
    const toGame = (b: ClassBuilder, at: [number, number]) => {
      const cast = b.node('cast.to', { class: jeu.cls.id }, {}, at);
      b.link(b.node('game.getGameInstance', {}, {}, [at[0] - 120, at[1] + 220]), 'result', cast, 'object');
      return cast;
    };
    const fuses = (b: ClassBuilder, cast: string, at: [number, number]) => {
      const g = b.node('var.getExternal', { owner: jeu.cls.id, variable: count }, {}, at);
      b.link(cast, 'as', g, 'target');
      return g;
    };

    // The fuse: the player's, counted for the whole game, then gone.
    const fuse = edit(p, 'BP_Fusible');
    const touch = fuse.node('event.actorBeginOverlap', {}, {}, [64, 96]);
    const isPlayer = fuse.node('cast.to', { class: cls('BP_Joueur').id }, {}, [340, 96]);
    const castF = toGame(fuse, [660, 96]);
    const plus = fuse.node('math.addInt', {}, { b: 1 }, [1000, 320]);
    const set = fuse.node('var.setExternal', { owner: jeu.cls.id, variable: count }, {}, [1000, 96]);
    const gone = fuse.node('actor.destroy', {}, {}, [1320, 96]);
    fuse.link(touch, 'then', isPlayer, 'exec').link(touch, 'other', isPlayer, 'object').link(isPlayer, 'then', castF, 'exec').link(castF, 'then', set, 'exec');
    fuse.link(castF, 'as', set, 'target').link(fuses(fuse, castF, [820, 420]), 'value', plus, 'a').link(plus, 'result', set, 'value').link(set, 'then', gone, 'exec');

    // The player: E on what he looks at.
    const iface = p.interfaces.find((i) => i.name === 'BPI_Interactif')!;
    const player = edit(p, 'BP_Joueur');
    const ev = player.node('input.action', { action: p.inputActions.find((a) => a.name === 'IA_Interagir')!.id }, {}, [64, 96]);
    const loc = player.node('actor.getLocation', {}, {}, [64, 330]);
    const fwd = player.node('actor.getForward', {}, {}, [64, 470]);
    const mul = player.node('math.multiplyVectorFloat', {}, { b: 300 }, [330, 470]);
    const add = player.node('math.addVector', {}, {}, [540, 400]);
    const trace = player.node('trace.lineByChannel', {}, {}, [760, 96]);
    const msg = player.node('iface.message', { interface: iface.id, fn: iface.functions[0].id }, {}, [1180, 96]);
    player.link(ev, 'started', trace, 'exec').link(loc, 'result', trace, 'start').link(fwd, 'result', mul, 'a');
    player.link(loc, 'result', add, 'a').link(mul, 'result', add, 'b').link(add, 'result', trace, 'end');
    player.link(trace, 'then', msg, 'exec').link(trace, 'hitActor', msg, 'target');

    // The save.
    const r1 = addClass(p, 'BP_Sauvegarde', 'SaveGame');
    if (!r1.ok) throw new Error(r1.reason);
    const save = new ClassBuilder(r1.value, p);
    const on = save.variable('bCourant', T.bool, false);

    // The panel: powers what it does not know, through the component.
    const panel = edit(p, 'BP_Tableau');
    implementInterface(panel.cls, iface.id);
    const energy = cls('BP_Energie');
    const recharge = fnOf(new ClassBuilder(energy, p), 'Recharger');
    const restore = panel.node('event.custom', { name: 'Retablir' }, {}, [64, 1000]);
    const led = panel.node('component.setVisibility', {}, { visible: true }, [360, 1000]);
    const loop = panel.node('flow.forEachLoop', {}, {}, [680, 1000]);
    const find = panel.node('actor.getComponentByClass', {}, { componentClass: energy.id }, [1000, 1200]);
    const valid = panel.node('flow.isValid', {}, {}, [1000, 1000]);
    const charge = panel.node('call.function', { owner: energy.id, graph: recharge.graph.id }, {}, [1320, 1000]);
    panel.link(restore, 'then', led, 'exec').target('Voyant', led).link(led, 'then', loop, 'exec').link(panel.node('var.get', { variable: varId(panel, 'Appareils') }, {}, [500, 1200]), 'value', loop, 'array');
    panel.link(loop, 'element', find, 'target').link(loop, 'body', valid, 'exec').link(find, 'result', valid, 'object').link(valid, 'valid', charge, 'exec').link(find, 'result', charge, 'target');

    const asked = panel.node('event.interface', { interface: iface.id, fn: iface.functions[0].id }, {}, [64, 96]);
    const castT = toGame(panel, [340, 96]);
    const enough = panel.node('math.greaterEqualInt', {}, { b: NEEDED }, [600, 320]);
    const br = panel.node('flow.branch', {}, {}, [700, 96]);
    panel.link(asked, 'then', castT, 'exec').link(castT, 'then', br, 'exec').link(fuses(panel, castT, [440, 420]), 'value', enough, 'a').link(enough, 'result', br, 'condition');
    const go = panel.node('call.custom', { event: 'Retablir' }, {}, [1000, 0]);
    const create = panel.node('save.create', {}, { saveClass: save.cls.id }, [1300, 0]);
    const fill = panel.node('var.setExternal', { owner: save.cls.id, variable: on }, { value: true }, [1600, 0]);
    const write = panel.node('save.toSlot', {}, { slot: SLOT }, [1900, 0]);
    panel.link(br, 'true', go, 'exec').link(go, 'then', create, 'exec').link(create, 'then', fill, 'exec').link(create, 'result', fill, 'target');
    panel.link(fill, 'then', write, 'exec').link(create, 'result', write, 'object');
    const ok = afficherViaController(p, panel, [2200, 0]);
    panel.graph.nodes[ok.call].defaults[ok.pin] = 'Courant rétabli';
    panel.link(write, 'then', ok.first, 'exec');
    const left = panel.node('math.subtractInt', {}, { a: NEEDED }, [1000, 520]);
    const str = panel.node('conv.intToString', {}, {}, [1200, 520]);
    const text = panel.node('string.append', { inputs: 3 }, { in0: 'Il manque ', in2: ' fusible' }, [1400, 520]);
    const no = afficherViaController(p, panel, [1700, 320]);
    panel.link(fuses(panel, castT, [800, 620]), 'value', left, 'b').link(left, 'result', str, 'in').link(str, 'result', text, 'in1').link(text, 'result', no.call, no.pin);
    panel.link(br, 'false', no.first, 'exec');

    // A new game: the panel reads the save itself.
    const begin = panel.node('event.beginPlay', {}, {}, [64, 1500]);
    const load = panel.node('save.fromSlot', {}, { slot: SLOT }, [360, 1500]);
    const castS = panel.node('cast.to', { class: save.cls.id }, {}, [680, 1500]);
    const read = panel.node('var.getExternal', { owner: save.cls.id, variable: on }, {}, [880, 1700]);
    const was = panel.node('flow.branch', {}, {}, [1000, 1500]);
    const again = panel.node('call.custom', { event: 'Retablir' }, {}, [1300, 1500]);
    panel.link(begin, 'then', load, 'exec').link(load, 'then', castS, 'exec').link(load, 'result', castS, 'object').link(castS, 'as', read, 'target');
    panel.link(castS, 'then', was, 'exec').link(read, 'value', was, 'condition').link(was, 'true', again, 'exec');
  },
};
