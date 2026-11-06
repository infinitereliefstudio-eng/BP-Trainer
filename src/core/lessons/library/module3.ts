/** Module 3 — Faire communiquer les Blueprints: references, dispatchers, interfaces. */
import type { Project } from '../../model/project';
import { addDispatcher, addDispatcherParam, implementInterface } from '../../operations/classOps';
import { addInterface, addInterfaceFunction } from '../../operations/projectOps';
import { T } from '../../types/pins';
import { edit, ProjectBuilder, type ClassBuilder } from '../builder';
import { noRuntimeErrors, usesNode, visible } from '../checks';
import type { Check, Lesson } from '../types';
import { doorBlueprint, generatorBlueprint, lampBlueprint, playerBlueprint, referenceVariable } from './props';

const MODULE = 'Faire communiquer les Blueprints';

/** Point an instance's reference variable at another placed actor (or None). */
export function setReference(p: Project, fromLabel: string, variableId: string, toLabel: string | null): void {
  const from = p.level.actors.find((a) => a.name === fromLabel)!;
  const to = toLabel ? p.level.actors.find((a) => a.name === toLabel) : undefined;
  from.overrides[variableId] = to ? `actor:${to.id}` : null;
}

function varId(b: ClassBuilder, name: string): string {
  return b.cls.variables.find((v) => v.name === name)!.id;
}

function notUsing(id: string, className: string, defs: string[], label: string, reason: string): Check {
  return { id, label, test: (cx) => (cx.nodes(className).some((n) => defs.includes(n.def)) ? reason : true) };
}

/** Lamp logic of lesson 9: Tick → Is Valid → Set Visibility(bEnMarche of the generator). */
export function lampFollowsGenerator(lamp: ClassBuilder, gen: ClassBuilder, ref: string, withIsValid: boolean): void {
  const running = varId(gen, 'bEnMarche');
  const tick = lamp.node('event.tick', {}, {}, [64, 96]);
  const g1 = lamp.node('var.get', { variable: ref }, {}, [200, 300]);
  const g2 = lamp.node('var.get', { variable: ref }, {}, [560, 420]);
  const read = lamp.node('var.getExternal', { owner: gen.cls.id, variable: running }, {}, [760, 420]);
  const vis = lamp.node('component.setVisibility', {}, {}, [1000, 96]);
  if (withIsValid) {
    const valid = lamp.node('flow.isValid', {}, {}, [400, 96]);
    lamp.link(tick, 'then', valid, 'exec').link(g1, 'value', valid, 'object').link(valid, 'valid', vis, 'exec');
  } else {
    lamp.link(tick, 'then', vis, 'exec');
  }
  lamp.link(g2, 'value', read, 'target').link(read, 'value', vis, 'visible').target('Lumiere', vis);
}

// ------------------------------------------------------------------ lesson 9

function generatorAndLamps(name: string, lamps: number) {
  const pb = new ProjectBuilder(name);
  const { b: gen } = generatorBlueprint(pb);
  const lamp = lampBlueprint(pb);
  const genId = pb.place(gen, 0, -260);
  const ids = Array.from({ length: lamps }, (_, i) => pb.place(lamp, -300 + i * 300, 80));
  pb.playerStart(-600, 300);
  return { pb, gen, lamp, genId, ids };
}

export const lesson9: Lesson = {
  id: 'l09-generateur',
  module: MODULE,
  number: 9,
  title: 'Générateur et lampe',
  situation: 'La première lampe ne s’allume que si le générateur tourne. La seconde n’est reliée à rien : elle reste éteinte, sans erreur.',
  notions: ['Variable Object Reference', 'Instance Editable', 'Is Valid'],
  cards: [
    {
      title: 'Une référence',
      body:
        'Pour lire `bEnMarche`, la lampe doit savoir **quel** générateur regarder. Crée dans BP_Lampe une variable de type **BP_Generateur (Object Reference)**, par exemple `Generateur`.\\n\\n' +
        'Coche **Instance Editable** : la variable apparaît alors dans le Details de chaque lampe placée dans le niveau.',
    },
    {
      title: 'Régler l’instance',
      body:
        'Dans l’onglet **Niveau**, touche la première lampe : dans Details, choisis le générateur pour `Generateur`. La seconde lampe garde **None** : elle n’est reliée à rien.\\n\\n' +
        'Dans le graphe, **Get Generateur** puis, en tirant un fil depuis sa sortie, **Get bEnMarche**.',
    },
    {
      title: 'Accessed None',
      body:
        'Lire une variable à travers une référence vide (None) produit l’erreur **Accessed None trying to read property…** dans l’Output Log.\\n\\n' +
        '**Is Valid** vérifie la référence avant de s’en servir : **Is Valid** d’un côté, **Is Not Valid** de l’autre.',
    },
  ],
  objectives: [
    'Dans BP_Lampe : à chaque frame (Event Tick), la Lumière suit bEnMarche du générateur.',
    'Relie la première lampe au générateur dans le niveau. Laisse la seconde sur None.',
    'Aucune erreur Accessed None.',
  ],
  hints: [
    'La lampe a besoin d’une variable qui pointe vers le générateur, réglée dans le Details de l’instance.',
    'Nœuds : Event Tick, Is Valid, Get Generateur, Get bEnMarche (depuis Generateur), Set Visibility (Lumiere).',
    'Solution : Tick → Is Valid (Generateur) → Set Visibility (Target Lumiere, New Visibility = Generateur › bEnMarche).',
  ],
  challenge: 'Le Tick vérifie le générateur 60 fois par seconde, même quand rien ne change. La leçon 10 montre mieux.',
  setup: () => generatorAndLamps('Leçon 9', 2).pb.project,
  scenario: [{ wait: 0.5 }, { checkpoint: 'arret' }, { press: 'E' }, { release: 'E' }, { wait: 0.1 }, { checkpoint: 'marche' }, { press: 'E' }, { release: 'E' }, { wait: 0.1 }],
  checks: [
    visible('off', 'BP_Lampe', 'Lumiere', false, 'Générateur arrêté : la lampe est éteinte', 'arret'),
    visible('on', 'BP_Lampe', 'Lumiere', true, 'Générateur en marche : la lampe s’allume', 'marche'),
    visible('alone', 'BP_Lampe2', 'Lumiere', false, 'La seconde lampe, reliée à rien, reste éteinte', 'marche'),
    visible('off2', 'BP_Lampe', 'Lumiere', false, 'Générateur arrêté de nouveau : la lampe s’éteint'),
    noRuntimeErrors(),
  ],
  solve(p) {
    const lamp = edit(p, 'BP_Lampe');
    const gen = edit(p, 'BP_Generateur');
    const ref = lamp.variable('Generateur', T.object('BP_Generateur'));
    lamp.cls.variables.find((v) => v.id === ref)!.instanceEditable = true;
    setReference(p, 'BP_Lampe', ref, 'BP_Generateur');
    lampFollowsGenerator(lamp, gen, ref, true);
  },
};

// ----------------------------------------------------------------- lesson 10

export const lesson10: Lesson = {
  id: 'l10-dispatcher',
  module: MODULE,
  number: 10,
  title: 'Le générateur prévient',
  situation: 'Démarrer le générateur allume les trois lampes d’un coup, sans qu’aucune lampe ne surveille le générateur à chaque frame.',
  notions: ['Event Dispatcher', 'Call', 'Bind Event', 'Paramètre'],
  cards: [
    {
      title: 'Annoncer plutôt que surveiller',
      body:
        'À la leçon 9, la lampe interrogeait le générateur à chaque Tick. Avec un **Event Dispatcher**, c’est le générateur qui **annonce** son changement, une seule fois, à tous ceux qui écoutent.\\n\\n' +
        'Dans BP_Generateur : My Blueprint › Event Dispatchers › **+**, nomme-le `OnEtatChange` et ajoute-lui un paramètre Boolean dans Details.',
    },
    {
      title: 'Call',
      body:
        'Après le Set de `bEnMarche`, ajoute **Call OnEtatChange** et donne-lui la nouvelle valeur. Tous les événements abonnés s’exécutent **immédiatement**, avant la suite du graphe.',
    },
    {
      title: 'Bind',
      body:
        'Dans BP_Lampe, au **BeginPlay** : **Bind Event to OnEtatChange**, avec Target = `Generateur` (la référence est déjà réglée sur les trois lampes).\\n\\n' +
        'Tire un fil depuis la pin rouge **Event** et choisis **Add Custom Event for OnEtatChange** : ce Custom Event reçoit le paramètre et s’exécutera à chaque Call.',
    },
  ],
  objectives: [
    'BP_Generateur annonce chaque changement avec un Event Dispatcher (Call).',
    'Chaque lampe s’y abonne au BeginPlay (Bind) et règle sa Lumière avec le paramètre.',
    'Pas d’Event Tick dans BP_Lampe.',
  ],
  hints: [
    'Le générateur ne connaît pas les lampes : ce sont elles qui s’abonnent à lui.',
    'Nœuds : Call OnEtatChange (générateur), Event BeginPlay, Bind Event to OnEtatChange, Custom Event, Set Visibility (lampe).',
    'Solution : générateur : Set bEnMarche → Call OnEtatChange (bEnMarche). Lampe : BeginPlay → Bind (Target Generateur, Event ← Custom Event) ; Custom Event → Set Visibility (Lumiere, paramètre).',
  ],
  challenge: 'Ajoute une lampe dans le niveau : il suffit de régler sa référence, sans toucher au générateur.',
  setup() {
    const { pb, gen, lamp, genId, ids } = generatorAndLamps('Leçon 10', 3);
    referenceVariable(pb, lamp, 'Generateur', gen, ids.map((id) => [id, genId] as [string, string]));
    return pb.project;
  },
  scenario: [{ wait: 0.3 }, { checkpoint: 'arret' }, { press: 'E' }, { checkpoint: 'marche' }, { release: 'E' }, { press: 'E' }, { checkpoint: 'stop' }, { release: 'E' }],
  checks: [
    visible('off', 'BP_Lampe', 'Lumiere', false, 'Au départ, les lampes sont éteintes', 'arret'),
    {
      id: 'all',
      label: 'Au démarrage, les 3 lampes s’allument à la même frame',
      at: 'marche',
      test: (cx) => {
        const off = ['BP_Lampe', 'BP_Lampe2', 'BP_Lampe3'].filter((l) => !cx.component(l, 'Lumiere')?.props.visible);
        return off.length ? `Encore éteinte(s) juste après l’appui : ${off.join(', ')}.` : true;
      },
    },
    visible('stop', 'BP_Lampe3', 'Lumiere', false, 'À l’arrêt, elles s’éteignent', 'stop'),
    usesNode('call', 'BP_Generateur', ['dispatcher.call'], 'Le générateur utilise Call', 'Le générateur doit annoncer le changement avec Call.'),
    usesNode('bind', 'BP_Lampe', ['dispatcher.bind'], 'La lampe utilise Bind Event', 'Chaque lampe doit s’abonner avec Bind Event.'),
    notUsing('tick', 'BP_Lampe', ['event.tick'], 'Pas d’Event Tick dans BP_Lampe', 'BP_Lampe utilise encore Event Tick : le but est de s’en passer.'),
    noRuntimeErrors(),
  ],
  solve(p) {
    const gen = edit(p, 'BP_Generateur');
    const lamp = edit(p, 'BP_Lampe');
    const d = addDispatcher(gen.cls, 'OnEtatChange');
    addDispatcherParam(gen.cls, d.id, T.bool);
    d.params[0].name = 'bEnMarche';
    const param = d.params[0].id;
    const say = Object.values(gen.graph.nodes).find((n) => n.def === 'debug.printString')!.id;
    const set = Object.values(gen.graph.nodes).find((n) => n.def === 'var.set')!.id;
    const call = gen.node('dispatcher.call', { owner: gen.cls.id, dispatcher: d.id }, {}, [1080, 96]);
    gen.link(say, 'then', call, 'exec').link(set, 'out', call, param);

    const ref = varId(lamp, 'Generateur');
    const bp = lamp.node('event.beginPlay', {}, {}, [64, 96]);
    const get = lamp.node('var.get', { variable: ref }, {}, [160, 300]);
    const bind = lamp.node('dispatcher.bind', { owner: gen.cls.id, dispatcher: d.id }, {}, [400, 96]);
    const ev = lamp.node('event.custom', { name: 'OnEtatChange_Event', signature: d.id, signatureOwner: gen.cls.id }, {}, [64, 480]);
    const vis = lamp.node('component.setVisibility', {}, {}, [440, 480]);
    lamp.link(bp, 'then', bind, 'exec').link(get, 'value', bind, 'target').link(ev, 'delegate', bind, 'event');
    lamp.link(ev, 'then', vis, 'exec').link(ev, param, vis, 'visible').target('Lumiere', vis);
  },
};

// ----------------------------------------------------------------- lesson 11

/** World of lesson 11 and of exercise D2: player, door, lamp and generator with zones. */
export function interactionWorld(name: string) {
  const pb = new ProjectBuilder(name);
  const { b: player } = playerBlueprint(pb);
  doorBlueprint(pb);
  const lamp = lampBlueprint(pb, true);
  const { b: gen } = generatorBlueprint(pb, { logic: false, zone: true });
  pb.place(lamp, -500, 300);
  pb.place(gen, -500, -300);
  pb.playerStart(-800, 0);
  return { pb, player, lamp, gen };
}

/** The player's side: E → Get Overlapping Actors → For Each → Interagir (Message). */
export function playerInteracts(player: ClassBuilder, ifaceId: string, fnId: string): void {
  const key = player.node('event.inputKey', { key: 'E' }, {}, [64, 96]);
  const over = player.node('actor.getOverlappingActors', {}, {}, [340, 96]);
  const loop = player.node('flow.forEachLoop', {}, {}, [660, 96]);
  const msg = player.node('iface.message', { interface: ifaceId, fn: fnId }, {}, [980, 96]);
  player.link(key, 'pressed', over, 'exec').link(over, 'then', loop, 'exec').link(over, 'actors', loop, 'array');
  player.link(loop, 'body', msg, 'exec').link(loop, 'element', msg, 'target');
}

function interfaceEvent(b: ClassBuilder, ifaceId: string, fnId: string): string {
  implementInterface(b.cls, ifaceId);
  return b.node('event.interface', { interface: ifaceId, fn: fnId }, {}, [64, 520]);
}

export const lesson11: Lesson = {
  id: 'l11-interface',
  module: MODULE,
  number: 11,
  title: 'Interagir avec tout',
  situation: 'La touche E agit sur l’objet à portée, quel qu’il soit : la porte s’ouvre, la lampe bascule, le générateur démarre. Sans aucun Cast.',
  notions: ['Blueprint Interface', 'Interface Message', 'Get Overlapping Actors', 'For Each Loop'],
  cards: [
    {
      title: 'Un contrat commun',
      body:
        'Une **Blueprint Interface** est une liste de fonctions sans contenu. Crée-la dans le **Content Browser** (☰ du menu ⋮ › + Interface) : `BPI_Interactif`, avec la fonction `Interagir`.\\n\\n' +
        'Chaque Blueprint qui l’**implémente** (Class Settings › Implemented Interfaces) décide de ce que fait Interagir chez lui.',
    },
    {
      title: 'Implémenter',
      body:
        'Dans BP_Porte, BP_Lampe et BP_Generateur : Class Settings › **+ Implemented Interface**. Puis My Blueprint › Interfaces › **Event** pour poser **Event Interagir** et y mettre l’action : tourner la porte, **Toggle Visibility** de la lumière, inverser `bEnMarche`.',
    },
    {
      title: 'Envoyer le message',
      body:
        'Dans BP_Joueur, sur **E** : **Get Overlapping Actors** donne la liste des acteurs qui le touchent. **For Each Loop** les parcourt, et **Interagir (Message)** est envoyé à chacun.\\n\\n' +
        'Un message envoyé à un acteur qui n’implémente pas l’interface ne fait **rien**, sans erreur. C’est ce qui évite tout Cast.',
    },
  ],
  objectives: [
    'Crée BPI_Interactif avec la fonction Interagir.',
    'La porte s’ouvre, la lampe bascule et le générateur démarre quand on appuie sur E à côté d’eux.',
    'Seul l’objet à portée réagit. Aucun Cast dans BP_Joueur.',
  ],
  hints: [
    'Le joueur ne connaît pas le type de ce qu’il touche : il envoie un message, et chacun y répond à sa façon.',
    'Nœuds : (joueur) Input E, Get Overlapping Actors, For Each Loop, Interagir (Message). (objets) Event Interagir, puis Set Relative Rotation / Toggle Visibility / Set bEnMarche.',
    'Solution : joueur : E → Get Overlapping Actors → For Each Loop → Interagir (Message), Target = Array Element. Chaque objet implémente BPI_Interactif et réagit dans Event Interagir.',
  ],
  challenge: 'Ajoute un Blueprint de ton choix (un coffre ?) qui réagit à E, sans modifier BP_Joueur.',
  setup: () => interactionWorld('Leçon 11').pb.project,
  scenario: [
    { wait: 0.2 },
    { teleport: [-500, 180] },
    { wait: 0.1 },
    { press: 'E' },
    { release: 'E' },
    { checkpoint: 'lampe' },
    { teleport: [-500, -180] },
    { wait: 0.1 },
    { press: 'E' },
    { release: 'E' },
    { checkpoint: 'generateur' },
    { teleport: [-150, 0] },
    { wait: 0.1 },
    { press: 'E' },
    { release: 'E' },
  ],
  checks: [
    visible('lamp', 'BP_Lampe', 'Lumiere', true, 'E près de la lampe : elle s’allume', 'lampe'),
    {
      id: 'only',
      label: 'Seul l’objet à portée réagit',
      at: 'lampe',
      test: (cx) => (cx.variable('BP_Generateur', 'bEnMarche') === true ? 'Le générateur a démarré alors que le joueur était près de la lampe.' : true),
    },
    {
      id: 'gen',
      label: 'E près du générateur : il démarre',
      at: 'generateur',
      test: (cx) => (cx.variable('BP_Generateur', 'bEnMarche') === true ? true : 'bEnMarche du générateur vaut toujours false.'),
    },
    {
      id: 'door',
      label: 'E près de la porte : elle s’ouvre',
      test: (cx) => {
        const yaw = cx.component('BP_Porte', 'Porte')?.props.yaw ?? 0;
        return Math.abs(Math.abs(yaw) - 90) < 1 ? true : 'La porte n’a pas tourné de 90°.';
      },
    },
    usesNode('msg', 'BP_Joueur', ['iface.message'], 'Le joueur envoie un message d’interface', 'BP_Joueur doit envoyer Interagir (Message).'),
    notUsing('nocast', 'BP_Joueur', ['cast.to'], 'Aucun Cast dans BP_Joueur', 'BP_Joueur utilise un Cast : avec une interface, il n’en a pas besoin.'),
    noRuntimeErrors(),
  ],
  solve(p) {
    const r = addInterface(p, 'BPI_Interactif');
    if (!r.ok) throw new Error(r.reason);
    addInterfaceFunction(p, r.value.id, 'Interagir');
    const iface = r.value.id;
    const fn = r.value.functions[0].id;
    playerInteracts(edit(p, 'BP_Joueur'), iface, fn);

    const door = edit(p, 'BP_Porte');
    const de = interfaceEvent(door, iface, fn);
    const rot = door.node('component.setRelativeRotation', {}, { rotation: { x: 0, y: 0, z: 90 } }, [400, 520]);
    door.link(de, 'then', rot, 'exec').target('Porte', rot);

    const lamp = edit(p, 'BP_Lampe');
    const le = interfaceEvent(lamp, iface, fn);
    const tog = lamp.node('component.toggleVisibility', {}, {}, [400, 520]);
    lamp.link(le, 'then', tog, 'exec').target('Lumiere', tog);

    const gen = edit(p, 'BP_Generateur');
    const running = varId(gen, 'bEnMarche');
    const ge = interfaceEvent(gen, iface, fn);
    const get = gen.node('var.get', { variable: running }, {}, [200, 700]);
    const not = gen.node('logic.not', {}, {}, [360, 700]);
    const set = gen.node('var.set', { variable: running }, {}, [480, 520]);
    gen.link(ge, 'then', set, 'exec').link(get, 'value', not, 'a').link(not, 'result', set, 'value');
  },
};
