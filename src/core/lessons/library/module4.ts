/**
 * Module 4 — Synthèse: lesson 12, "Remettre la station en route".
 * Three fuses to pick up, a generator to repair through the interaction
 * interface, fuel that runs down on a timer (Clamp), and lamps and a door
 * driven by the generator's Event Dispatcher.
 */
import { addDispatcher, addDispatcherParam, implementInterface } from '../../operations/classOps';
import { addInterface, addInterfaceFunction } from '../../operations/projectOps';
import { T } from '../../types/pins';
import { edit, ProjectBuilder, type ClassBuilder } from '../builder';
import { noRuntimeErrors, usesNode } from '../checks';
import type { Check, CheckContext, Lesson } from '../types';
import { playerInteracts } from './module3';
import { doorBlueprint, generatorBlueprint, lampBlueprint, playerBlueprint, referenceVariable } from './props';

const MODULE = 'Synthèse';
const LAMPS = ['BP_Lampe', 'BP_Lampe2'];
const FUSES = [
  [-950, 260],
  [-650, 380],
  [-350, 260],
] as const;
const AT_GENERATOR: [number, number] = [-500, -170];

const varId = (b: ClassBuilder, name: string) => b.cls.variables.find((v) => v.name === name)!.id;

function stationWorld() {
  const pb = new ProjectBuilder('Leçon 12');
  const { b: player } = playerBlueprint(pb);
  player.variable('Fusibles', T.int, 0);
  player.cls.variables[0].tooltip = 'Nombre de fusibles ramassés.';

  const r = addInterface(pb.project, 'BPI_Interactif');
  if (!r.ok) throw new Error(r.reason);
  addInterfaceFunction(pb.project, r.value.id, 'Interagir');
  const iface = r.value.id;
  const fn = r.value.functions[0].id;
  playerInteracts(player, iface, fn);

  const fuse = pb.blueprint('BP_Fusible');
  fuse.component('StaticMesh', 'Fusible', { shape: 'cylinder', sizeX: 28, sizeY: 28, color: '#e11d48', blocks: false });
  fuse.component('BoxCollision', 'Zone', { sizeX: 90, sizeY: 90 });

  const { b: gen } = generatorBlueprint(pb, { logic: false, zone: true });
  implementInterface(gen.cls, iface);
  gen.variable('Carburant', T.float, 0);
  gen.variable('TimerCarburant', T.struct('TimerHandle'));
  const d = addDispatcher(gen.cls, 'OnEtatChange');
  addDispatcherParam(gen.cls, d.id, T.bool);
  d.params[0].name = 'bEnMarche';

  const lamp = lampBlueprint(pb);
  const door = doorBlueprint(pb);
  const genId = pb.place(gen, -500, -300);
  const lampIds = [pb.place(lamp, 350, -220), pb.place(lamp, 350, 220)];
  for (const [x, y] of FUSES) pb.place(fuse, x, y);
  const doorId = pb.project.level.actors.find((a) => a.classId === door.cls.id)!.id;
  referenceVariable(pb, lamp, 'Generateur', gen, lampIds.map((id) => [id, genId] as [string, string]));
  referenceVariable(pb, door, 'Generateur', gen, [[doorId, genId]]);
  pb.playerStart(-800, 0);
  return { pb, iface, fn, dispatcher: d.id, param: d.params[0].id };
}

const near = (a: number, b: number) => Math.abs(a - b) < 0.01;

function generatorRunning(cx: CheckContext): boolean {
  return cx.variable('BP_Generateur', 'bEnMarche') === true;
}

function lampsAre(on: boolean, cx: CheckContext): true | string {
  const wrong = LAMPS.filter((l) => cx.component(l, 'Lumiere')?.props.visible !== on);
  if (!wrong.length) return true;
  return `${wrong.join(' et ')} : la lumière devrait être ${on ? 'allumée' : 'éteinte'}.`;
}

function doorAt(yaw: number, cx: CheckContext): true | string {
  const y = cx.component('BP_Porte', 'Porte')?.props.yaw ?? 0;
  if (Math.abs(Math.abs(y) - yaw) < 1) return true;
  return yaw ? 'La porte ne s’est pas ouverte (rotation de 90°).' : 'La porte est restée ouverte.';
}

const checks: Check[] = [
  {
    id: 'locked',
    label: 'Sans fusible, E sur le générateur ne le démarre pas',
    at: 'sansFusibles',
    test: (cx) => (generatorRunning(cx) ? 'Le générateur a démarré sans les 3 fusibles.' : true),
  },
  {
    id: 'fuses',
    label: 'Les 3 fusibles sont ramassés et comptés par le joueur',
    at: 'fusibles',
    test: (cx) => {
      const left = cx.sim.actors.filter((a) => a.className === 'BP_Fusible').length;
      if (left) return `${left} fusible(s) encore dans le niveau : ils doivent disparaître une fois ramassés.`;
      const n = cx.variable('Joueur', 'Fusibles');
      return n === 3 ? true : `Fusibles vaut ${n ?? '?'} sur le joueur au lieu de 3.`;
    },
  },
  {
    id: 'start',
    label: 'Avec 3 fusibles, E démarre le générateur : lampes et porte réagissent aussitôt',
    at: 'demarre',
    test: (cx) => {
      if (!generatorRunning(cx)) return 'bEnMarche vaut toujours false après E avec les 3 fusibles.';
      const lamps = lampsAre(true, cx);
      if (lamps !== true) return lamps;
      return doorAt(90, cx);
    },
  },
  {
    id: 'full',
    label: 'Au démarrage, le réservoir est plein (Carburant = 100)',
    at: 'demarre',
    test: (cx) => {
      const f = Number(cx.variable('BP_Generateur', 'Carburant'));
      return near(f, 100) ? true : `Carburant vaut ${f} juste après le démarrage.`;
    },
  },
  {
    id: 'fuel',
    label: 'Le carburant baisse avec le temps (10 par seconde)',
    at: 'consomme',
    test: (cx) => {
      const f = Number(cx.variable('BP_Generateur', 'Carburant'));
      if (near(f, 100)) return 'Le carburant ne baisse pas : le timer est-il lancé, en Looping ?';
      return f > 50 && f < 90 ? true : `Carburant vaut ${f.toFixed(1)} après 3,5 s : il devrait être autour de 70.`;
    },
  },
  {
    id: 'empty',
    label: 'Réservoir vide : Carburant reste à 0, jamais en dessous',
    test: (cx) => {
      const f = Number(cx.variable('BP_Generateur', 'Carburant'));
      if (near(f, 0)) return true;
      if (f < 0) return `Carburant est descendu à ${f.toFixed(1).replace('.', ',')} : utilise Clamp pour le garder entre 0 et 100.`;
      if (near(f, 100)) return 'Carburant n’a jamais baissé : la consommation n’a pas démarré (timer lancé au démarrage, en Looping ?).';
      return `Carburant vaut ${f.toFixed(1).replace('.', ',')} à la fin : il n’est pas descendu jusqu’à 0.`;
    },
  },
  {
    id: 'stop',
    label: 'À sec, le générateur s’arrête : lampes éteintes, porte refermée',
    test: (cx) => {
      const f = Number(cx.variable('BP_Generateur', 'Carburant'));
      if (generatorRunning(cx) && f > 0.5) return `Le réservoir ne s’est pas vidé (Carburant vaut ${f.toFixed(1).replace('.', ',')} à la fin) : la panne n’a pas pu avoir lieu.`;
      if (generatorRunning(cx)) return 'Le générateur tourne encore avec un réservoir vide.';
      const lamps = lampsAre(false, cx);
      if (lamps !== true) return lamps;
      return doorAt(0, cx);
    },
  },
  {
    id: 'timer',
    label: 'Le carburant est consommé par un timer, arrêté à la panne',
    test: (cx) => {
      if (!cx.nodes('BP_Generateur').some((n) => n.def === 'time.setTimerByEvent')) return 'BP_Generateur doit utiliser Set Timer by Event.';
      if (cx.sim.timers.size === 0) return true;
      const f = Number(cx.variable('BP_Generateur', 'Carburant'));
      if (f > 0.5) return `Le timer tourne encore, mais la panne n’a pas eu lieu (Carburant vaut ${f.toFixed(1).replace('.', ',')} à la fin) : vérifie d’abord que le carburant baisse.`;
      return 'Le timer tourne encore après la panne : arrête-le avec Clear and Invalidate Timer by Handle.';
    },
  },
  usesNode('clamp', 'BP_Generateur', ['math.clampFloat', 'math.clampInt'], 'Le carburant passe par Clamp', 'Utilise Clamp pour borner le carburant entre 0 et 100.'),
  usesNode('iface', 'BP_Generateur', ['event.interface'], 'Le générateur répond à Interagir (interface)', 'Le générateur doit réagir à Event Interagir de BPI_Interactif.'),
  usesNode('call', 'BP_Generateur', ['dispatcher.call'], 'Le générateur prévient avec son Event Dispatcher', 'Le générateur doit annoncer ses changements avec Call OnEtatChange.'),
  {
    id: 'bind',
    label: 'Les lampes et la porte s’abonnent au dispatcher',
    test: (cx) => {
      const missing = ['BP_Lampe', 'BP_Porte'].filter((c) => !cx.nodes(c).some((n) => n.def === 'dispatcher.bind'));
      return missing.length ? `${missing.join(' et ')} : il manque Bind Event to OnEtatChange.` : true;
    },
  },
  noRuntimeErrors(),
];

export const lesson12: Lesson = {
  id: 'l12-station',
  module: MODULE,
  level: 'avance',
  number: 12,
  title: 'Remettre la station en route',
  situation:
    'Le courant est coupé. Ramasse les 3 fusibles, répare le générateur, et il rallume les lampes et ouvre la porte. Mais son carburant s’épuise : à sec, tout s’éteint.',
  notions: ['Increment Int', 'Set Timer by Event', 'Clamp', 'Interface', 'Event Dispatcher'],
  remember: 'Un projet complet combine ces outils : une variable pour l’état, un timer pour le temps, une interface pour agir, un Dispatcher pour prévenir.',
  cards: [
    {
      title: 'Ce qui est prêt',
      body:
        'Le joueur envoie déjà **Interagir (Message)** de `BPI_Interactif` sur **E**, comme dans « Interagir avec tout ». Le générateur **implémente** l’interface et déclare l’Event Dispatcher `OnEtatChange` (paramètre `bEnMarche`).\n\n' +
        'Les lampes et la porte ont une variable `Generateur` déjà réglée dans le niveau. Le joueur a `Fusibles` (Integer), le générateur `Carburant` (Float) et `TimerCarburant` (Timer Handle).',
    },
    {
      title: 'Compter les fusibles',
      body:
        'Dans **BP_Fusible** : au **Begin Overlap**, **Cast To BP_Joueur**, puis **Increment Int** sur `Fusibles` du joueur, et **Destroy Actor**.\n\n' +
        'La pin Value d’Increment Int est un **losange** : elle est passée **par référence**. Relie-y un **Get Fusibles** (tiré depuis As BP_Joueur) : c’est cette variable qui augmente.',
    },
    {
      title: 'Réparer',
      body:
        'Dans **BP_Generateur**, **Event Interagir** : **Get Player Pawn** → **Cast To BP_Joueur** → `Fusibles` **>=** 3 → **Branch**.\n\n' +
        'Si oui : `bEnMarche` à true, `Carburant` à 100, **Call OnEtatChange** (true), puis **Set Timer by Event** : Time 1, **Looping** coché, Event relié à un **Custom Event** `Consommer`. Garde le **Return Value** dans `TimerCarburant`.',
    },
    {
      title: 'Le carburant',
      body:
        '`Consommer` s’exécute chaque seconde : `Carburant` ← **Clamp (Float)** (Carburant − 10, Min 0, Max 100). Clamp empêche de descendre sous 0.\n\n' +
        'Puis, si `Carburant` **<=** 0 : `bEnMarche` à false, **Clear and Invalidate Timer by Handle** (`TimerCarburant`) et **Call OnEtatChange** (false).',
    },
    {
      title: 'Lampes et porte',
      body:
        'Dans **BP_Lampe** et **BP_Porte**, au **BeginPlay** : **Bind Event to OnEtatChange** (Target `Generateur`) avec un Custom Event, comme dans « Le générateur prévient ».\n\n' +
        'La lampe règle **Set Visibility** de sa Lumière avec le paramètre. La porte prend 90° ou 0° : **Select** (Index = bEnMarche) dans un **Make Rotator**, puis **Set Relative Rotation**.',
    },
  ],
  objectives: [
    'Chaque fusible ramassé disparaît et augmente Fusibles du joueur.',
    'E sur le générateur le démarre seulement avec 3 fusibles : Carburant à 100, Call OnEtatChange.',
    'Un timer retire 10 de Carburant chaque seconde, avec Clamp ; à 0, le générateur s’arrête et le timer aussi.',
    'Lampes et porte suivent le générateur grâce au dispatcher.',
  ],
  hints: [
    'Quatre Blueprints à remplir : BP_Fusible (compter), BP_Generateur (réparer et consommer), BP_Lampe et BP_Porte (écouter).',
    'Nœuds : Cast To BP_Joueur, Increment Int, Destroy Actor ; Event Interagir, Get Player Pawn, >= (Integer), Branch, Set Timer by Event, Custom Event, Clamp (Float), <= (Float), Clear and Invalidate Timer by Handle, Call OnEtatChange ; Bind Event, Set Visibility, Select, Make Rotator, Set Relative Rotation.',
    'Solution : voir les cartes Comprendre, dans l’ordre : fusible → générateur (Interagir) → Consommer → lampes et porte.',
  ],
  challenge: 'Affiche le carburant sur l’Etiquette du générateur avec Set Text, et fais clignoter les lampes sous 30 %.',
  setup: () => stationWorld().pb.project,
  scenario: [
    { wait: 0.2 },
    { teleport: AT_GENERATOR },
    { wait: 0.1 },
    { press: 'E' },
    { release: 'E' },
    { wait: 0.1 },
    { checkpoint: 'sansFusibles' },
    ...FUSES.flatMap(([x, y]) => [{ teleport: [x, y] as [number, number] }, { wait: 0.15 }]),
    { checkpoint: 'fusibles' },
    { teleport: AT_GENERATOR },
    { wait: 0.1 },
    { press: 'E' },
    { checkpoint: 'demarre' },
    { release: 'E' },
    { wait: 3.5 },
    { checkpoint: 'consomme' },
    { wait: 8 },
  ],
  checks,
  solve(p) {
    const iface = p.interfaces.find((i) => i.name === 'BPI_Interactif')!;
    const fn = iface.functions[0].id;
    const player = edit(p, 'BP_Joueur');
    const gen = edit(p, 'BP_Generateur');
    const d = gen.cls.dispatchers[0];
    const param = d.params[0].id;
    const fusibles = varId(player, 'Fusibles');

    // BP_Fusible: overlap → Cast To BP_Joueur → Increment Fusibles → Destroy Actor.
    const fuse = edit(p, 'BP_Fusible');
    const ov = fuse.node('event.actorBeginOverlap', {}, {}, [64, 96]);
    const cast = fuse.node('cast.to', { class: player.cls.id }, {}, [340, 96]);
    const getN = fuse.node('var.getExternal', { owner: player.cls.id, variable: fusibles }, {}, [600, 300]);
    const inc = fuse.node('var.incrementInt', {}, {}, [700, 96]);
    const kill = fuse.node('actor.destroy', {}, {}, [1000, 96]);
    fuse.link(ov, 'then', cast, 'exec').link(ov, 'other', cast, 'object');
    fuse.link(cast, 'then', inc, 'exec').link(cast, 'as', getN, 'target').link(getN, 'value', inc, 'value').link(inc, 'then', kill, 'exec');

    // BP_Generateur: Event Interagir → enough fuses? → start, fill, announce, timer.
    const running = varId(gen, 'bEnMarche');
    const fuel = varId(gen, 'Carburant');
    const handle = varId(gen, 'TimerCarburant');
    const call = (on: boolean, at: [number, number]) => {
      const c = gen.node('dispatcher.call', { owner: gen.cls.id, dispatcher: d.id }, { [param]: on }, at);
      return c;
    };
    const ev = gen.node('event.interface', { interface: iface.id, fn }, {}, [64, 96]);
    const pawn = gen.node('actor.getPlayerPawn', {}, {}, [64, 300]);
    const gcast = gen.node('cast.to', { class: player.cls.id }, {}, [320, 96]);
    const count = gen.node('var.getExternal', { owner: player.cls.id, variable: fusibles }, {}, [560, 300]);
    const enough = gen.node('math.greaterEqualInt', {}, { b: 3 }, [760, 300]);
    const branch = gen.node('flow.branch', {}, {}, [900, 96]);
    gen.link(ev, 'then', gcast, 'exec').link(pawn, 'result', gcast, 'object');
    gen.link(gcast, 'then', branch, 'exec').link(gcast, 'as', count, 'target').link(count, 'value', enough, 'a').link(enough, 'result', branch, 'condition');
    const on = gen.node('var.set', { variable: running }, { value: true }, [1180, 96]);
    const fill = gen.node('var.set', { variable: fuel }, { value: 100 }, [1420, 96]);
    const tell = call(true, [1660, 96]);
    const consume = gen.node('event.custom', { name: 'Consommer' }, {}, [64, 620]);
    const timer = gen.node('time.setTimerByEvent', {}, { time: 1, looping: true }, [1900, 96]);
    const keep = gen.node('var.set', { variable: handle }, {}, [2200, 96]);
    const missing = gen.node('debug.printString', {}, { text: 'Il manque des fusibles.' }, [1180, 360]);
    gen.link(branch, 'true', on, 'exec').link(on, 'then', fill, 'exec').link(fill, 'then', tell, 'exec').link(tell, 'then', timer, 'exec');
    gen.link(consume, 'delegate', timer, 'event').link(timer, 'then', keep, 'exec').link(timer, 'handle', keep, 'value');
    gen.link(branch, 'false', missing, 'exec');

    // Consommer: Carburant ← Clamp(Carburant − 10, 0, 100); at 0, stop everything.
    const read = gen.node('var.get', { variable: fuel }, {}, [200, 820]);
    const minus = gen.node('math.subtractFloat', {}, { b: 10 }, [360, 820]);
    const clamp = gen.node('math.clampFloat', {}, { min: 0, max: 100 }, [520, 820]);
    const write = gen.node('var.set', { variable: fuel }, {}, [700, 620]);
    const empty = gen.node('math.lessEqualFloat', {}, { b: 0 }, [880, 820]);
    const dry = gen.node('flow.branch', {}, {}, [1000, 620]);
    const off = gen.node('var.set', { variable: running }, { value: false }, [1260, 620]);
    const stop = gen.node('time.clearTimer', {}, {}, [1500, 620]);
    const tellOff = call(false, [1800, 620]);
    gen.link(consume, 'then', write, 'exec').link(read, 'value', minus, 'a').link(minus, 'result', clamp, 'value').link(clamp, 'result', write, 'value');
    gen.link(write, 'then', dry, 'exec').link(write, 'out', empty, 'a').link(empty, 'result', dry, 'condition');
    gen.link(dry, 'true', off, 'exec').link(off, 'then', stop, 'exec').link(gen.node('var.get', { variable: handle }, {}, [1400, 820]), 'value', stop, 'handle');
    gen.link(stop, 'then', tellOff, 'exec');

    // Lamps and door: BeginPlay → Bind → Custom Event reacting to bEnMarche.
    const listen = (b: ClassBuilder, react: (ev: string) => void) => {
      const ref = varId(b, 'Generateur');
      const bp = b.node('event.beginPlay', {}, {}, [64, 96]);
      const bind = b.node('dispatcher.bind', { owner: gen.cls.id, dispatcher: d.id }, {}, [400, 96]);
      const ce = b.node('event.custom', { name: 'OnEtatChange_Event', signature: d.id, signatureOwner: gen.cls.id }, {}, [64, 480]);
      b.link(bp, 'then', bind, 'exec').link(b.node('var.get', { variable: ref }, {}, [160, 300]), 'value', bind, 'target').link(ce, 'delegate', bind, 'event');
      react(ce);
    };
    const lamp = edit(p, 'BP_Lampe');
    listen(lamp, (ce) => {
      const vis = lamp.node('component.setVisibility', {}, {}, [440, 480]);
      lamp.link(ce, 'then', vis, 'exec').link(ce, param, vis, 'visible').target('Lumiere', vis);
    });
    const door = edit(p, 'BP_Porte');
    listen(door, (ce) => {
      const sel = door.node('util.select', {}, {}, [380, 700]);
      const rot = door.node('math.makeRotator', {}, {}, [640, 700]);
      const set = door.node('component.setRelativeRotation', {}, {}, [900, 480]);
      door.link(ce, param, sel, 'index').link(sel, 'result', rot, 'yaw').link(rot, 'result', set, 'rotation');
      Object.assign(door.graph.nodes[sel].defaults, { option0: 0, option1: 90 });
      door.link(ce, 'then', set, 'exec').target('Porte', set);
    });
  },
};
