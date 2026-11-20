/**
 * Lot 3a of the path plan: « Choisis ton outil ». One need (tell another
 * actor something) in three corners of the level, each calling for a
 * different tool: Cast To (an Actor whose class is known, whose variable is
 * needed), an Event Dispatcher (listeners the sender must not know), a
 * Blueprint Interface (known targets of different classes). The idea it
 * aims at: « they all do the same thing ».
 */
import type { Project } from '../../model/project';
import { addDispatcher, implementInterface } from '../../operations/classOps';
import { addInterface, addInterfaceFunction } from '../../operations/projectOps';
import { T } from '../../types/pins';
import { edit, ProjectBuilder, type ClassBuilder } from '../builder';
import { noRuntimeErrors, notion, notUsing, usesNode } from '../checks';
import type { Check, CheckContext, Lesson } from '../types';
import { editable, goTo, override, ref, varId } from './kit';
import { playerBlueprint } from './props';
import { levelOf } from '../../model/project';

const MODULE = 'Faire communiquer les Blueprints';

/** A pad the player steps on: a flat mesh and its trigger zone. */
function pad(b: ClassBuilder, color: string): void {
  b.component('StaticMesh', 'Socle', { sizeX: 90, sizeY: 90, color, blocks: false });
  b.component('BoxCollision', 'Zone', { sizeX: 160, sizeY: 160 });
}

/** Spots the player walks to, one per corner. */
const BORNE: [number, number] = [-600, -300];
const ALARME: [number, number] = [600, -300];
const DISJONCTEUR: [number, number] = [0, 300];

export function toolsProject(): Project {
  const pb = new ProjectBuilder('Choisis ton outil');
  const { b: player } = playerBlueprint(pb);
  player.variable('Sante', T.int, 40);

  // A: the healing post.
  const borne = pb.blueprint('BP_Borne');
  pad(borne, '#16a34a');
  pb.place(borne, ...BORNE);

  // B: the alarm and its beacons.
  const alarm = pb.blueprint('BP_Alarme');
  pad(alarm, '#dc2626');
  pb.place(alarm, ...ALARME);
  const beacon = pb.blueprint('BP_Gyrophare');
  beacon.component('StaticMesh', 'Pied', { shape: 'cylinder', sizeX: 30, sizeY: 30, color: '#6b7280' });
  beacon.component('PointLight', 'Lumiere', { visible: false, radius: 160, color: '#f97316' });
  for (const x of [400, 600, 800]) pb.place(beacon, x, -620);

  // C: the main breaker and three appliances of different classes.
  const breaker = pb.blueprint('BP_Disjoncteur');
  pad(breaker, '#ca8a04');
  const lamp = pb.blueprint('BP_Lampe');
  lamp.component('StaticMesh', 'Pied', { shape: 'cylinder', sizeX: 40, sizeY: 40, color: '#6b7280' });
  lamp.component('PointLight', 'Lumiere', { visible: true, radius: 220 });
  const fan = pb.blueprint('BP_Ventilateur');
  fan.component('StaticMesh', 'Helice', { shape: 'cylinder', sizeX: 70, sizeY: 70, color: '#0ea5e9' });
  fan.variable('bTourne', T.bool, true);
  const screen = pb.blueprint('BP_Ecran');
  screen.component('StaticMesh', 'Cadre', { sizeX: 120, sizeY: 20, color: '#111827' });
  screen.component('TextRender', 'Texte', { y: -40, text: 'EN LIGNE' });
  const breakerId = pb.place(breaker, ...DISJONCTEUR);
  const devices = [pb.place(lamp, -400, 620), pb.place(fan, 0, 680), pb.place(screen, 400, 620)];
  const list = editable(breaker, 'Appareils', T.array(T.object('Actor')), []);
  override(pb, breakerId, list, devices.map(ref));

  pb.playerStart(0, -200);
  return pb.project;
}

// ------------------------------------------------------------------ checks

const beacons = ['BP_Gyrophare', 'BP_Gyrophare2', 'BP_Gyrophare3'];
const lit = (cx: CheckContext) => beacons.filter((l) => cx.component(l, 'Lumiere')?.props.visible === true);

/** Does the alarm hold or look for references to other actors? Then it knows its listeners. */
function alarmKnowsListeners(cx: CheckContext): string | undefined {
  const alarm = cx.project.classes.find((c) => c.name === 'BP_Alarme');
  const beacon = cx.project.classes.find((c) => c.name === 'BP_Gyrophare');
  if (!alarm) return 'BP_Alarme est introuvable (renommé ou supprimé ?).';
  const refVar = alarm.variables.find((v) => v.type.category === 'object');
  if (refVar) return `BP_Alarme garde une référence (${refVar.name}) : l’alarme ne doit connaître aucun gyrophare. Ce sont eux qui viennent l’écouter.`;
  const nodes = cx.nodes('BP_Alarme');
  if (nodes.some((n) => n.def === 'actor.getAllOfClass'))
    return 'BP_Alarme cherche des acteurs (Get All Actors Of Class) : l’alarme ne doit connaître aucun gyrophare. Ce sont eux qui viennent l’écouter.';
  if (beacon && nodes.some((n) => Object.values(n.config).includes(beacon.id)))
    return 'BP_Alarme s’adresse à BP_Gyrophare : l’alarme ne doit pas savoir qui l’écoute. Ce sont les gyrophares qui viennent s’abonner.';
  return undefined;
}

const offAt = (at: string): Check => ({
  id: `devices-on-${at}`,
  label: 'Avant le disjoncteur, les appareils restent en marche',
  at,
  test: (cx) =>
    cx.component('BP_Lampe', 'Lumiere')?.props.visible === true && cx.component('BP_Ecran', 'Texte')?.props.text === 'EN LIGNE'
      ? true
      : 'Un appareil s’est arrêté alors que le joueur n’était pas encore allé au disjoncteur.',
});

// ----------------------------------------------------------------- lesson

export const lessonChooseTool: Lesson = {
  id: 'l-choisis-outil',
  module: MODULE,
  level: 'confirme',
  number: 0,
  title: 'Choisis ton outil',
  situation:
    'Trois coins du niveau, un même besoin : prévenir un autre acteur. La borne soigne le joueur, l’alarme allume les gyrophares, le disjoncteur coupe les appareils. Cast, Event Dispatcher ou Interface : à toi de choisir, coin par coin.',
  recalls: ['overlap', 'loops', 'other-bp', 'timers'],
  revision: 2,
  notions: ['Choisir Cast, Dispatcher ou Interface', 'Cast To', 'Event Dispatcher', 'Blueprint Interface'],
  remember:
    'Cast : j’ai un acteur, je connais sa classe, j’ai besoin de ce qu’il a. Dispatcher : j’annonce, sans savoir qui écoute. Interface : je connais mes cibles, mais pas leur classe, et chacune réagit à sa façon.',
  cards: [
    {
      title: 'Cahier des charges',
      body:
        'Tous les graphes sont vides. Le niveau a trois coins, chacun avec une dalle et sa **Zone**.\n\n' +
        '**A. La borne de soin** (BP_Borne, en vert) : quand le joueur entre dans sa Zone, sa variable **Sante** (dans BP_Joueur, 40 au départ) passe à **100**.\n\n' +
        '**B. L’alarme** (BP_Alarme, en rouge) : quand le joueur entre dans sa Zone, les trois **BP_Gyrophare** allument leur Lumiere, puis la font **clignoter** toutes les 0,5 s (rappel : un timer). L’alarme ne doit **rien savoir** des gyrophares : on en ajoutera d’autres sans la toucher.\n\n' +
        '**C. Le disjoncteur** (BP_Disjoncteur, en jaune) : quand le joueur entre dans sa Zone, il coupe les appareils de sa liste **Appareils** (déjà remplie dans ses Details) : la **BP_Lampe** s’éteint, le **BP_Ventilateur** passe **bTourne** à false, le **BP_Ecran** affiche `HORS LIGNE`. Trois classes différentes : le disjoncteur ne doit pas avoir à les reconnaître une par une (pas de Cast).',
    },
    {
      title: 'Ce qui est nouveau : choisir',
      body:
        'Tu connais les trois outils. La difficulté, maintenant, c’est de savoir lequel prendre. Trois questions, dans l’ordre :\n\n' +
        '1. **Qui connaît qui ?** L’émetteur a-t-il une référence vers celui qu’il prévient (une variable, Other Actor) ? Ou est-ce aux autres de venir l’écouter ?\n' +
        '2. **Combien de classes ?** Une seule, connue d’avance, ou plusieurs qui réagissent chacune à leur manière ?\n' +
        '3. **Que faut-il faire chez l’autre ?** Lire ou écrire une de **ses** variables, ou lui dire « à toi de jouer » ?\n\n' +
        'Les trois outils « font passer un message », mais pas dans la même direction ni au même prix : un Cast lie l’émetteur à une classe, un Dispatcher inverse le lien (ce sont les abonnés qui connaissent l’émetteur), une Interface ne lie personne à personne.',
    },
    {
      title: 'Pour vérifier',
      body:
        'Teste chaque coin avec ▶ Play avant de passer au suivant. Les vérifications regardent ce qui se passe, et deux règles du cahier des charges : l’alarme ne connaît aucun gyrophare, le disjoncteur ne fait pas de Cast.\n\n' +
        'Aide du niveau Confirmé : pas de liste de nœuds, les indices s’ouvrent après un premier essai.',
    },
  ],
  objectives: [
    'A : la borne met la Sante du joueur à 100.',
    'B : l’alarme allume les trois gyrophares, qui clignotent, sans rien savoir d’eux.',
    'C : le disjoncteur coupe la lampe, le ventilateur et l’écran, sans Cast.',
  ],
  hints: [
    'A : la borne reçoit un Other Actor et a besoin d’une variable de BP_Joueur. B : les gyrophares s’abonnent à l’alarme au BeginPlay. C : le disjoncteur a ses cibles (Appareils), mais pas leur classe.',
    'A : ActorBeginOverlap, Cast To BP_Joueur, Set Sante. B : Event Dispatcher (Call / Bind Event), Custom Event, Set Visibility, Set Timer by Event, Toggle Visibility, une référence vers l’alarme dans chaque gyrophare. C : Blueprint Interface, For Each Loop, message d’interface, Set Visibility, Set bTourne, Set Text.',
    'Solution. A : BP_Borne : ActorBeginOverlap → Cast To BP_Joueur (Object = Other Actor) → Set Sante = 100 (Target = As BP Joueur).\n' +
      'B : BP_Alarme : Event Dispatcher OnAlarme ; ActorBeginOverlap → Call OnAlarme. BP_Gyrophare : variable Alarme (BP_Alarme, Instance Editable, réglée sur les trois) ; BeginPlay → Bind Event to OnAlarme (Target = Alarme) ← Custom Event → Set Visibility (Lumiere, cochée) → Set Timer by Event (0,5 s, Looping, Event = Custom Event Clignote) ; Clignote → Toggle Visibility (Lumiere).\n' +
      'C : BPI_Coupure avec la fonction Couper, implémentée par BP_Lampe, BP_Ventilateur et BP_Ecran. BP_Disjoncteur : ActorBeginOverlap → For Each Loop (Appareils) → Couper (Message), Target = Array Element. Event Couper : Set Visibility (Lumiere, décochée), Set bTourne = false, Set Text « HORS LIGNE ».',
  ],
  challenge: 'Pose un quatrième gyrophare et un deuxième écran : ni l’alarme ni le disjoncteur ne doivent changer, seulement les Details des acteurs posés.',
  setup: toolsProject,
  scenario: [
    { wait: 0.2 },
    { checkpoint: 'debut' },
    ...goTo(...BORNE, 0.3),
    { checkpoint: 'borne' },
    ...goTo(...ALARME, 0.3),
    { checkpoint: 'alarme' },
    { wait: 0.5 },
    { checkpoint: 'clignote' },
    ...goTo(...DISJONCTEUR, 0.3),
  ],
  checks: [
    {
      id: 'heal',
      label: 'A : la borne met la Sante du joueur à 100',
      at: 'borne',
      test: (cx) => {
        const v = cx.variable('Joueur', 'Sante');
        return v === 100 ? true : `Après la borne, la Sante du joueur vaut ${v ?? '?'} au lieu de 100.`;
      },
    },
    {
      id: 'beacons-off',
      label: 'B : les gyrophares attendent l’alarme',
      at: 'borne',
      test: (cx) => (lit(cx).length ? `Allumé(s) avant l’alarme : ${lit(cx).join(', ')}.` : true),
    },
    {
      id: 'beacons-on',
      label: 'B : l’alarme allume les trois gyrophares',
      at: 'alarme',
      test: (cx) => {
        const off = beacons.filter((l) => !lit(cx).includes(l));
        return off.length ? `Encore éteint(s) après l’alarme : ${off.join(', ')}.` : true;
      },
    },
    {
      id: 'beacons-blink',
      label: 'B : les gyrophares clignotent',
      at: 'clignote',
      test: (cx) =>
        lit(cx).length
          ? `Une demi-seconde plus tard, encore allumé(s) : ${lit(cx).join(', ')}. Les gyrophares doivent basculer toutes les 0,5 s (un timer en Looping).`
          : true,
    },
    {
      id: 'alarm-blind',
      label: 'B : l’alarme ne connaît aucun gyrophare',
      test: (cx) => alarmKnowsListeners(cx) ?? true,
    },
    offAt('alarme'),
    {
      id: 'breaker',
      label: 'C : le disjoncteur coupe la lampe, le ventilateur et l’écran',
      test: (cx) => {
        const left: string[] = [];
        if (cx.component('BP_Lampe', 'Lumiere')?.props.visible !== false) left.push('la lampe est encore allumée');
        if (cx.variable('BP_Ventilateur', 'bTourne') !== false) left.push('bTourne du ventilateur vaut encore true');
        const text = String(cx.component('BP_Ecran', 'Texte')?.props.text ?? '');
        if (text.trim().toUpperCase() !== 'HORS LIGNE') left.push(`l’écran affiche « ${text} »`);
        return left.length ? `Après le disjoncteur : ${left.join(', ')}.` : true;
      },
    },
    notUsing('breaker-nocast', 'BP_Disjoncteur', ['cast.to'], 'C : aucun Cast dans le disjoncteur', 'BP_Disjoncteur utilise un Cast : avec trois classes à prévenir, il lui en faudrait un par classe, et un de plus pour chaque nouvel appareil.'),
    notion(usesNode('cast', 'BP_Borne', ['cast.to'], 'A : un Cast To dans la borne', 'La borne n’a pas de Cast To : c’est l’outil le plus direct quand on connaît la classe et qu’on veut une de ses variables.')),
    notion(usesNode('call', 'BP_Alarme', ['dispatcher.call'], 'B : l’alarme annonce avec un Event Dispatcher', 'L’alarme n’appelle aucun Event Dispatcher : c’est l’outil fait pour prévenir sans savoir qui écoute.')),
    notion(usesNode('message', 'BP_Disjoncteur', ['iface.message'], 'C : le disjoncteur envoie un message d’interface', 'Le disjoncteur n’envoie aucun message d’interface : c’est l’outil fait pour des cibles de classes différentes.')),
    noRuntimeErrors(),
  ],
  solve(p) {
    // A. Cast To BP_Joueur, then its variable.
    const player = edit(p, 'BP_Joueur');
    const borne = edit(p, 'BP_Borne');
    const e1 = borne.node('event.actorBeginOverlap', {}, {}, [64, 96]);
    const cast = borne.node('cast.to', { class: player.cls.id }, {}, [360, 96]);
    const set = borne.node('var.setExternal', { owner: player.cls.id, variable: varId(player, 'Sante') }, { value: 100 }, [680, 96]);
    borne.link(e1, 'then', cast, 'exec').link(e1, 'other', cast, 'object').link(cast, 'then', set, 'exec').link(cast, 'as', set, 'target');

    // B. The alarm announces, the beacons subscribe.
    const alarm = edit(p, 'BP_Alarme');
    const d = addDispatcher(alarm.cls, 'OnAlarme');
    const e2 = alarm.node('event.actorBeginOverlap', {}, {}, [64, 96]);
    const call = alarm.node('dispatcher.call', { owner: alarm.cls.id, dispatcher: d.id }, {}, [400, 96]);
    alarm.link(e2, 'then', call, 'exec');
    const beacon = edit(p, 'BP_Gyrophare');
    const ref = editable(beacon, 'Alarme', T.object('BP_Alarme'));
    const alarmActor = levelOf(p).actors.find((a) => a.classId === alarm.cls.id)!;
    for (const a of levelOf(p).actors.filter((x) => x.classId === beacon.cls.id)) a.overrides[ref] = `actor:${alarmActor.id}`;
    const begin = beacon.node('event.beginPlay', {}, {}, [64, 96]);
    const get = beacon.node('var.get', { variable: ref }, {}, [160, 300]);
    const bind = beacon.node('dispatcher.bind', { owner: alarm.cls.id, dispatcher: d.id }, {}, [400, 96]);
    const ev = beacon.node('event.custom', { name: 'SurAlarme', signature: d.id, signatureOwner: alarm.cls.id }, {}, [64, 480]);
    const on = beacon.node('component.setVisibility', {}, { visible: true }, [440, 480]);
    beacon.link(begin, 'then', bind, 'exec').link(get, 'value', bind, 'target').link(ev, 'delegate', bind, 'event');
    const timer = beacon.node('time.setTimerByEvent', {}, { time: 0.5, looping: true }, [760, 480]);
    const blink = beacon.node('event.custom', { name: 'Clignote' }, {}, [64, 800]);
    const toggle = beacon.node('component.toggleVisibility', {}, {}, [440, 800]);
    beacon.link(ev, 'then', on, 'exec').target('Lumiere', on).link(on, 'then', timer, 'exec').link(blink, 'delegate', timer, 'event');
    beacon.link(blink, 'then', toggle, 'exec').target('Lumiere', toggle);

    // C. An interface: the breaker knows its targets, not their classes.
    const r = addInterface(p, 'BPI_Coupure');
    if (!r.ok) throw new Error(r.reason);
    addInterfaceFunction(p, r.value.id, 'Couper');
    const iface = r.value.id;
    const fn = r.value.functions[0].id;
    const breaker = edit(p, 'BP_Disjoncteur');
    const e3 = breaker.node('event.actorBeginOverlap', {}, {}, [64, 96]);
    const list = breaker.node('var.get', { variable: varId(breaker, 'Appareils') }, {}, [160, 300]);
    const loop = breaker.node('flow.forEachLoop', {}, {}, [400, 96]);
    const msg = breaker.node('iface.message', { interface: iface, fn }, {}, [720, 96]);
    breaker.link(e3, 'then', loop, 'exec').link(list, 'value', loop, 'array').link(loop, 'body', msg, 'exec').link(loop, 'element', msg, 'target');

    const reacts = (name: string, build: (b: ClassBuilder, ev: string) => void) => {
      const b = edit(p, name);
      implementInterface(b.cls, iface);
      build(b, b.node('event.interface', { interface: iface, fn }, {}, [64, 520]));
    };
    reacts('BP_Lampe', (b, ev) => {
      const off = b.node('component.setVisibility', {}, { visible: false }, [400, 520]);
      b.link(ev, 'then', off, 'exec').target('Lumiere', off);
    });
    reacts('BP_Ventilateur', (b, ev) => {
      const stop = b.node('var.set', { variable: varId(b, 'bTourne') }, { value: false }, [400, 520]);
      b.link(ev, 'then', stop, 'exec');
    });
    reacts('BP_Ecran', (b, ev) => {
      const text = b.node('component.setText', {}, { value: 'HORS LIGNE' }, [400, 520]);
      b.link(ev, 'then', text, 'exec').target('Texte', text);
    });
  },
};
