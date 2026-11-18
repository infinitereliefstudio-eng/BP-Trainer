/** Module 3 — Faire communiquer les Blueprints: references, dispatchers, interfaces. */
import type { Project } from '../../model/project';
import { addDispatcher, addDispatcherParam, implementInterface } from '../../operations/classOps';
import { addInterface, addInterfaceFunction } from '../../operations/projectOps';
import { T } from '../../types/pins';
import { edit, ProjectBuilder, type ClassBuilder } from '../builder';
import { noRuntimeErrors, notUsing, usesNode, visible, notion } from '../checks';
import type { Lesson } from '../types';
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
  level: 'confirme',
  number: 9,
  title: 'Générateur et lampe',
  situation: 'La première lampe ne s’allume que si le générateur tourne. La seconde n’est reliée à rien : elle reste éteinte, sans erreur.',
  notions: ['Variable Object Reference', 'Instance Editable', 'Is Valid'],
  remember: 'Une variable de référence est vide (None) tant qu’on ne lui donne pas d’acteur. Is Valid évite Accessed None quand elle peut l’être.',
  cards: [
    {
      title: 'Ce qui est en place',
      body:
        '- **BP_Generateur**, en haut : sa variable **bEnMarche** (Boolean) bascule à chaque appui sur E, et il affiche son état.\n- Deux lampes, **BP_Lampe** et **BP_Lampe2**, instances du même Blueprint **BP_Lampe**, éteintes au départ. Leur graphe est vide.\n\n' +
        'La lampe doit suivre le générateur. Mais BP_Lampe ne sait pas encore **quel** générateur regarder : c’est tout le sujet.',
    },
    {
      title: 'Une variable de référence',
      body:
        'Dans BP_Lampe, crée une variable `Generateur`, de type **BP_Generateur** › **Object Reference** (pin bleue). Elle ne contient pas un générateur : elle contient l’**adresse** d’un générateur du niveau. Au départ elle vaut **None** : aucune.\n\n' +
        'Coche **Instance Editable** : chaque lampe posée dans le niveau peut alors avoir sa propre valeur, réglée dans son Details.\n\n' +
        'Dans le graphe : **Get Generateur**, puis tire un fil depuis sa sortie et cherche **Get bEnMarche**. Ce Get lit la variable **du générateur désigné**.',
    },
    {
      title: 'Régler les instances',
      body:
        'Onglet **Niveau**, touche la première lampe : dans Details, choisis le générateur pour `Generateur`. Une flèche relie alors la lampe au générateur.\n\n' +
        'Laisse la **seconde** sur None : elle représente un oubli de réglage, courant dans un vrai niveau. Elle doit rester éteinte sans faire d’erreur.',
    },
    {
      title: 'Is Valid',
      body:
        'Lire bEnMarche à travers une référence vide produit **Accessed None** dans l’Output Log : le nœud n’a personne à qui demander.\n\n' +
        '**Is Valid** (la version avec des pins blanches) vérifie une référence avant de s’en servir :\n\n' +
        '- **Is Valid** : elle désigne un acteur qui existe ;\n- **Is Not Valid** : elle est vide, ou l’acteur a été détruit.',
    },
    {
      title: 'Le plan',
      body:
        '**Event Tick** → **Is Valid** (Input Object = Get Generateur) → (Is Valid) **Set Visibility** (Target = Lumiere, New Visibility = Generateur › bEnMarche).\n\n' +
        'Event Tick s’exécute **à chaque image** : la lampe recopie l’état du générateur 60 fois par seconde. Ça marche, mais c’est du travail pour rien quand le générateur ne change pas. « Le générateur prévient » montre la bonne façon.',
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
  challenge: 'Le Tick vérifie le générateur 60 fois par seconde, même quand rien ne change. La leçon « Le générateur prévient » montre mieux.',
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
  level: 'confirme',
  number: 10,
  title: 'Le générateur prévient',
  situation: 'Démarrer le générateur allume les trois lampes d’un coup, sans qu’aucune lampe ne surveille le générateur à chaque frame.',
  notions: ['Event Dispatcher', 'Call', 'Bind Event', 'Paramètre'],
  remember: 'Celui qui change annonce (Call) ; ceux que ça intéresse s’abonnent (Bind), avant l’annonce. Le générateur n’a pas besoin de connaître les lampes.',
  cards: [
    {
      title: 'Ce qui est en place',
      body:
        '- **BP_Generateur** : E bascule bEnMarche et affiche l’état, comme avant.\n- Trois lampes **BP_Lampe**, éteintes. Leur variable **Generateur** est **déjà réglée** sur le générateur, pour les trois. Le graphe de BP_Lampe est vide.\n\n' +
        'Le but : quand le générateur démarre, les trois lampes s’allument **dans la même image**, sans Tick.',
    },
    {
      title: 'Annoncer plutôt que surveiller',
      body:
        'Avec un Tick, chaque lampe demande à chaque image « tu tournes ? ». Avec un **Event Dispatcher**, c’est l’inverse : le générateur **annonce** son changement une seule fois, et tous ceux qui se sont abonnés sont prévenus.\n\n' +
        'Le générateur n’a pas besoin de connaître les lampes. Ajouter une quatrième lampe ne demande aucun changement de son côté.',
    },
    {
      title: 'Côté générateur : déclarer et appeler',
      body:
        '1. My Blueprint › Event Dispatchers › **+**, nomme-le `OnEtatChange`.\n2. Dans Details, ajoute-lui un **paramètre** Boolean : la nouvelle valeur, transmise aux abonnés.\n3. À la fin de la chaîne de IA_Interagir (après le Print String) : **Call OnEtatChange**, avec la sortie du Set bEnMarche sur le paramètre.\n\n' +
        '**Call** exécute **immédiatement** tous les événements abonnés, l’un après l’autre, avant de rendre la main à la suite du graphe.',
    },
    {
      title: 'Côté lampe : s’abonner',
      body:
        'Au **BeginPlay** de BP_Lampe :\n\n' +
        '1. **Bind Event to OnEtatChange**, Target = **Get Generateur** : « je m’abonne aux annonces de ce générateur-là ».\n2. Depuis sa pin rouge **Event**, tire un fil et choisis **Add Custom Event for OnEtatChange** : un Custom Event avec le même paramètre.\n3. Ce Custom Event → **Set Visibility** (Target = Lumiere, New Visibility = le paramètre).\n\n' +
        'Le Bind ne fait rien sur le moment : il branche le Custom Event pour **les prochains** Call.',
    },
    {
      title: 'Les pièges',
      body:
        '**S’abonner trop tard.** Un Call sans abonné ne fait rien, et un abonné arrivé après n’entend pas les annonces passées. BeginPlay est le bon moment.\n\n' +
        '**Utiliser la variable plutôt que le paramètre.** Le paramètre donne la nouvelle valeur au moment de l’annonce ; inutile de relire bEnMarche à travers la référence.\n\n' +
        'Dans UE, un Dispatcher est un **délégué multicast** : en C++, c’est `DECLARE_DYNAMIC_MULTICAST_DELEGATE` et `Broadcast`. Les boutons des widgets (OnClicked) fonctionnent ainsi.',
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
    notion(usesNode('call', 'BP_Generateur', ['dispatcher.call'], 'Le générateur utilise Call', 'Le générateur doit annoncer le changement avec Call.')),
    notion(usesNode('bind', 'BP_Lampe', ['dispatcher.bind'], 'La lampe utilise Bind Event', 'Chaque lampe doit s’abonner avec Bind Event.')),
    notion(notUsing('tick', 'BP_Lampe', ['event.tick'], 'Pas d’Event Tick dans BP_Lampe', 'BP_Lampe utilise encore Event Tick : le but est de s’en passer.')),
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
  level: 'confirme',
  number: 11,
  title: 'Interagir avec tout',
  situation: 'La touche E agit sur l’objet à portée, quel qu’il soit : la porte s’ouvre, la lampe bascule, le générateur démarre. Sans aucun Cast.',
  notions: ['Blueprint Interface', 'Interface Message', 'Get Overlapping Actors', 'For Each Loop'],
  remember: 'Un message d’interface part vers n’importe quel acteur : seuls ceux qui implémentent l’interface réagissent, les autres l’ignorent sans erreur.',
  cards: [
    {
      title: 'Ce qui est en place',
      body:
        '- **BP_Joueur** : le joueur, graphe vide.\n- **BP_Porte**, **BP_Lampe** et **BP_Generateur**, chacun avec une zone autour de lui, graphes vides (le générateur n’écoute plus IA_Interagir).\n\n' +
        'Le but : E agit sur l’objet à portée, quel qu’il soit. Le joueur ne doit pas avoir à savoir si c’est une porte ou une lampe : pas de Cast.',
    },
    {
      title: 'Une interface, un contrat',
      body:
        'Une **Blueprint Interface** est une liste de fonctions **sans contenu**. Elle dit « je sais répondre à Interagir », pas comment.\n\n' +
        'Crée-la dans le **Content Drawer** (bouton en bas à gauche) › **+ Add** › Blueprint › **Blueprint Interface** : `BPI_Interactif`, avec une fonction `Interagir`.\n\n' +
        'Chaque Blueprint qui l’**implémente** décide de ce que fait Interagir chez lui. Le joueur, lui, n’a qu’à envoyer le message.',
    },
    {
      title: 'Implémenter, objet par objet',
      body:
        'Dans BP_Porte, BP_Lampe et BP_Generateur :\n\n' +
        '1. **Class Settings** (dans Details) › Interfaces › **Add** › BPI_Interactif.\n2. My Blueprint › Interfaces › Interagir › **Event** : pose **Event Interagir**.\n3. Mets l’action derrière : la porte **Set Relative Rotation** (Yaw 90), la lampe **Toggle Visibility** (Lumiere), le générateur **Set bEnMarche** = NOT bEnMarche.',
    },
    {
      title: 'Envoyer le message',
      body:
        'Dans BP_Joueur, sur **IA_Interagir** (Started) :\n\n' +
        '1. **Get Overlapping Actors** : la liste (un tableau) des acteurs dont la zone touche le joueur.\n2. **For Each Loop** sur ce tableau : **Loop Body** s’exécute pour chaque élément, donné par **Array Element**.\n3. Dans Loop Body : **Interagir (Message)**, Target = Array Element.\n\n' +
        'Un message envoyé à un acteur qui n’implémente pas l’interface (un mur, le sol) **ne fait rien, sans erreur**.',
    },
    {
      title: 'Pourquoi c’est mieux qu’un Cast',
      body:
        'Avec des Cast, le joueur devrait tester chaque type un par un, et être modifié à chaque nouvel objet interactif. Avec l’interface, ajouter un coffre demande seulement de l’implémenter dans le coffre.\n\n' +
        'Attention au nom : un **Custom Event** appelé « Interagir » n’est pas l’événement de l’interface et ne reçoit pas le message. Le débogue « Le message qui se perd » repose sur ce piège.',
    },
  ],
  objectives: [
    'Crée BPI_Interactif avec la fonction Interagir.',
    'La porte s’ouvre, la lampe bascule et le générateur démarre quand on appuie sur E à côté d’eux.',
    'Seul l’objet à portée réagit. Aucun Cast dans BP_Joueur.',
  ],
  hints: [
    'Le joueur ne connaît pas le type de ce qu’il touche : il envoie un message, et chacun y répond à sa façon.',
    'Nœuds : (joueur) IA_Interagir, Get Overlapping Actors, For Each Loop, Interagir (Message). (objets) Event Interagir, puis Set Relative Rotation / Toggle Visibility / Set bEnMarche.',
    'Solution : joueur : IA_Interagir (Started) → Get Overlapping Actors → For Each Loop → Interagir (Message), Target = Array Element. Chaque objet implémente BPI_Interactif et réagit dans Event Interagir.',
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
    notion(usesNode('msg', 'BP_Joueur', ['iface.message'], 'Le joueur envoie un message d’interface', 'BP_Joueur doit envoyer Interagir (Message).')),
    notion(notUsing('nocast', 'BP_Joueur', ['cast.to'], 'Aucun Cast dans BP_Joueur', 'BP_Joueur utilise un Cast : avec une interface, il n’en a pas besoin.')),
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
