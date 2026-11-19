/**
 * Lot 4a of the path plan: mixed practice (entrelacement). Each step mixes
 * several notions already met, and its brief never says which one to use:
 * choosing the tool is the exercise. They also bring back notions that the
 * end of the path no longer wrote (Construction Script, Timeline, timers,
 * random, Map, Spawn Actor).
 */
import type { Project } from '../../model/project';
import { readTimeline, trackPin } from '../../nodes/library/timeline';
import { updateVariable } from '../../operations/classOps';
import { implementInterface } from '../../operations/classOps';
import { addClass, addInterface, addInterfaceFunction } from '../../operations/projectOps';
import { T } from '../../types/pins';
import { ClassBuilder, edit, ProjectBuilder } from '../builder';
import { countPrints, noRuntimeErrors } from '../checks';
import type { CheckContext, Lesson, LessonCard } from '../types';
import { ensurePlayerInput } from '../ue5Input';
import { editable, goTo, tap, varId } from './kit';
import { playerBlueprint } from './props';

const MODULE = 'Entraînement mélangé';

const MIXED: LessonCard = {
  title: 'Un entraînement mélangé',
  body:
    'Ici, rien ne dit quels nœuds utiliser : c’est le travail. Pour chaque règle du cahier des charges, demande-toi quel outil tu connais déjà qui fait exactement ça, et pourquoi pas un autre. Plusieurs solutions marchent ; les vérifications regardent ce qui se passe, pas comment.',
};

// ------------------------------------------------------------------ M1 Le sas

const SAS_AT: [number, number] = [0, 0];

function sasProject(): Project {
  const pb = new ProjectBuilder('Le sas');
  playerBlueprint(pb);
  const sas = pb.blueprint('BP_Sas');
  sas.component('StaticMesh', 'PorteAvant', { shape: 'door', x: -150, y: -80, yaw: 90, sizeX: 160, sizeY: 16, color: '#a0703c', blocks: false });
  sas.component('StaticMesh', 'PorteArriere', { shape: 'door', x: 150, y: -80, sizeX: 160, sizeY: 16, color: '#a0703c', blocks: false });
  sas.component('BoxCollision', 'Zone', { sizeX: 200, sizeY: 160 });
  sas.component('TextRender', 'Ecran', { y: -120, text: '' });
  pb.place(sas, ...SAS_AT);
  pb.playerStart(-400, 0);
  return pb.project;
}

const yawOf = (cx: CheckContext, comp: string) => Math.abs(cx.component('BP_Sas', comp)?.props.yaw ?? 0);
const screen = (cx: CheckContext) => String(cx.component('BP_Sas', 'Ecran')?.props.text ?? '').trim();

export const mixedSas: Lesson = {
  id: 'm1-sas',
  module: MODULE,
  level: 'avance',
  number: 0,
  title: 'Le sas',
  recalls: ['construction', 'timeline', 'timers', 'flow-memory'],
  situation:
    'Le sas affiche sa durée dès l’éditeur. Quand le joueur y entre, la porte avant se ferme en douceur, l’écran compte les secondes, puis la porte arrière s’ouvre. Une seule fois.',
  notions: ['Entraînement mélangé'],
  remember:
    'Un cahier des charges se lit règle par règle, et chaque règle a son outil : ce qui se voit dans l’éditeur va au Construction Script, un mouvement doux à un Timeline, un rythme régulier à un timer, « une seule fois » à un DoOnce.',
  cards: [
    {
      title: 'Cahier des charges',
      body:
        '**BP_Sas** est posé : une **PorteAvant** ouverte (Yaw 90), une **PorteArriere** fermée (Yaw 0), une **Zone** et un **Ecran** (Text Render). Graphes vides, aucune variable.\n\n' +
        '1. Une **Duree** en secondes, réglable sur chaque sas posé ; ici **3**. **Dans l’éditeur**, avant Play, l’Écran affiche `Sas : 3 s`.\n' +
        '2. Quand le joueur entre dans la Zone, la PorteAvant se **ferme en 0,5 s**, en douceur (Yaw 90 → 0).\n' +
        '3. Une fois fermée, l’Écran affiche **3**, puis **2**, puis **1**, une seconde chacun.\n' +
        '4. Après le 1, l’Écran affiche `Ouvert` et la PorteArriere s’ouvre (Yaw 90).\n' +
        '5. Si le joueur ressort et revient pendant ce temps, **rien ne recommence**.',
    },
    MIXED,
  ],
  objectives: [
    'Dans l’éditeur, l’Écran affiche « Sas : 3 s » (Duree réglable sur le sas posé).',
    'Le joueur entre : la porte avant se ferme en 0,5 s, en douceur.',
    'L’Écran compte 3, 2, 1, puis affiche « Ouvert » et la porte arrière s’ouvre.',
    'Ressortir et revenir ne recommence rien.',
  ],
  hints: [
    'Pour chaque règle : à quel moment doit-elle s’exécuter (éditeur, entrée, chaque seconde), et quel outil connu fait exactement ça ?',
    'Construction Script, Append, Set Text ; DoOnce ; Timeline, Lerp, Make Rotator, Set Relative Rotation ; Set Timer by Event, Decrement Int, Branch, Clear and Invalidate Timer by Handle.',
    'Solution : variable Duree (Integer, Instance Editable, 3). Construction Script → Set Text (Ecran, « Sas : » + Duree + « s »). ActorBeginOverlap → DoOnce → Timeline (0,5 s) Play ; Update → Set Relative Rotation (PorteAvant, Yaw = Lerp (90, 0, Alpha)) ; Finished → Set Restant = Duree → Set Text (Restant) → Set Timer by Event (1 s, Looping, Compte) → Set Minuteur. Compte → Decrement Restant → Branch (> 0) : True → Set Text (Restant) ; False → Clear Timer → Set Text « Ouvert » → Set Relative Rotation (PorteArriere, Yaw 90).',
  ],
  challenge: 'Pose un second sas avec une Duree de 5 : sans toucher au graphe, il doit afficher « Sas : 5 s » et compter jusqu’à 5.',
  setup: sasProject,
  scenario: [
    { wait: 0.2 },
    ...goTo(...SAS_AT, 0.05),
    { wait: 0.2 },
    { checkpoint: 'mi' },
    { wait: 0.5 },
    { checkpoint: 'trois' },
    { teleport: [-400, 0] },
    { wait: 0.3 },
    { teleport: SAS_AT },
    { wait: 0.7 },
    { checkpoint: 'deux' },
    { wait: 2.3 },
    { checkpoint: 'fin' },
  ],
  checks: [
    {
      id: 'editor',
      label: 'Dans l’éditeur, l’Écran affiche « Sas : 3 s »',
      test: (cx) => {
        const t = String(cx.preview().actors.find((a) => a.label === 'BP_Sas')?.components.find((c) => c.name === 'Ecran')?.props.text ?? '');
        if (t.replace(/\s+/g, ' ').trim() === 'Sas : 3 s') return true;
        return t ? `Dans l’éditeur, l’Écran affiche « ${t} » au lieu de « Sas : 3 s ».` : 'Dans l’éditeur, avant Play, l’Écran est vide : ce qui doit se voir dans le niveau s’écrit dans le Construction Script.';
      },
    },
    {
      id: 'smooth',
      label: 'La porte avant se ferme en douceur',
      at: 'mi',
      test: (cx) => {
        const y = yawOf(cx, 'PorteAvant');
        if (y > 85) return 'Le joueur est entré, mais la porte avant n’a pas commencé à se fermer.';
        return y < 5 ? 'La porte avant s’est fermée d’un coup : elle doit mettre 0,5 s.' : true;
      },
    },
    {
      id: 'closed-3',
      label: 'Fermée, l’Écran affiche 3',
      at: 'trois',
      test: (cx) => (yawOf(cx, 'PorteAvant') > 5 ? 'La porte avant n’est pas fermée 0,7 s après l’entrée.' : screen(cx) === '3' ? true : `0,7 s après l’entrée, l’Écran affiche « ${screen(cx)} » au lieu de 3.`),
    },
    {
      id: 'count-2',
      label: 'Une seconde plus tard, 2, sans recommencer malgré l’aller-retour',
      at: 'deux',
      test: (cx) => (screen(cx) === '2' ? true : `1,7 s après l’entrée (le joueur est ressorti puis revenu), l’Écran affiche « ${screen(cx)} » au lieu de 2.`),
    },
    {
      id: 'open',
      label: 'Après le 1 : « Ouvert », la porte arrière s’ouvre',
      at: 'fin',
      test: (cx) => {
        if (screen(cx) !== 'Ouvert') return `À la fin, l’Écran affiche « ${screen(cx)} » au lieu de « Ouvert ».`;
        return Math.abs(yawOf(cx, 'PorteArriere') - 90) < 1 ? true : 'L’Écran dit « Ouvert », mais la porte arrière n’a pas tourné de 90°.';
      },
    },
    {
      id: 'once',
      label: 'Rien n’a recommencé',
      at: 'fin',
      test: (cx) => (yawOf(cx, 'PorteAvant') < 5 ? true : 'À la fin, la porte avant n’est pas fermée : elle s’est rouverte, ou le sas a recommencé quand le joueur est revenu.'),
    },
    noRuntimeErrors(),
  ],
  solve(p) {
    const b = edit(p, 'BP_Sas');
    const duree = editable(b, 'Duree', T.int, 3);
    const left = b.variable('Restant', T.int, 0);
    const handle = b.variable('Minuteur', T.struct('TimerHandle'));
    const { b: cs, entry } = b.construction();
    const a1 = cs.node('string.append', {}, { in0: 'Sas : ' }, [300, 300]);
    const a2 = cs.node('string.append', {}, { in1: ' s' }, [520, 300]);
    const show = cs.node('component.setText', {}, {}, [700, 96]);
    cs.link(entry, 'then', show, 'exec').link(cs.node('var.get', { variable: duree }, {}, [100, 360]), 'value', a1, 'in1').link(a1, 'result', a2, 'in0').link(a2, 'result', show, 'value').target('Ecran', show);

    const enter = b.node('event.actorBeginOverlap', {}, {}, [64, 96]);
    const once = b.node('flow.doOnce', {}, {}, [300, 96]);
    const tl = b.node('timeline.node', {}, {}, [560, 96]);
    const data = readTimeline(b.graph.nodes[tl]);
    data.length = 0.5;
    data.tracks[0].keys = [
      { t: 0, v: 0 },
      { t: 0.5, v: 1 },
    ];
    Object.assign(b.graph.nodes[tl].config, { length: 0.5, tracks: [{ id: data.tracks[0].id, name: data.tracks[0].name, keys: data.tracks[0].keys }] });
    const lerp = b.node('math.lerp', {}, { a: 90, b: 0 }, [800, 420]);
    const rot = b.node('math.makeRotator', {}, {}, [1000, 420]);
    const close = b.node('component.setRelativeRotation', {}, {}, [1000, 96]);
    b.link(enter, 'then', once, 'exec').link(once, 'completed', tl, 'play').link(tl, 'update', close, 'exec');
    b.link(tl, trackPin(data.tracks[0].id), lerp, 'alpha').link(lerp, 'result', rot, 'yaw').link(rot, 'result', close, 'rotation').target('PorteAvant', close);

    const start = b.node('var.set', { variable: left }, {}, [800, 700]);
    const first = b.node('component.setText', {}, {}, [1100, 700]);
    const timer = b.node('time.setTimerByEvent', {}, { time: 1, looping: true }, [1400, 700]);
    const keep = b.node('var.set', { variable: handle }, {}, [1700, 700]);
    b.link(tl, 'finished', start, 'exec').link(b.node('var.get', { variable: duree }, {}, [640, 880]), 'value', start, 'value');
    b.link(start, 'then', first, 'exec').link(start, 'out', first, 'value').target('Ecran', first);
    b.link(first, 'then', timer, 'exec').link(timer, 'then', keep, 'exec').link(timer, 'handle', keep, 'value');

    const tick = b.node('event.custom', { name: 'Compte' }, {}, [64, 1100]);
    const dec = b.node('var.decrementInt', {}, {}, [340, 1100]);
    const more = b.node('math.greaterInt', {}, { b: 0 }, [560, 1300]);
    const br = b.node('flow.branch', {}, {}, [640, 1100]);
    const again = b.node('component.setText', {}, {}, [960, 1040]);
    const stop = b.node('time.clearTimer', {}, {}, [960, 1300]);
    const done = b.node('component.setText', {}, { value: 'Ouvert' }, [1260, 1300]);
    const open = b.node('component.setRelativeRotation', {}, { rotation: { x: 0, y: 0, z: 90 } }, [1560, 1300]);
    b.link(tick, 'delegate', timer, 'event').link(tick, 'then', dec, 'exec').link(b.node('var.get', { variable: left }, {}, [200, 1300]), 'value', dec, 'value');
    b.link(dec, 'then', br, 'exec').link(dec, 'result', more, 'a').link(more, 'result', br, 'condition');
    b.link(br, 'true', again, 'exec').link(dec, 'result', again, 'value').target('Ecran', again);
    b.link(br, 'false', stop, 'exec').link(b.node('var.get', { variable: handle }, {}, [800, 1480]), 'value', stop, 'handle');
    b.link(stop, 'then', done, 'exec').target('Ecran', done).link(done, 'then', open, 'exec').target('PorteArriere', open);
  },
};

// ---------------------------------------------------------- M2 Le distributeur

const STOCK = ['Pile', 'Fusible', 'Pile', 'Cle', 'Pile'];
const DISPENSER: [number, number] = [0, -200];
const BIN_AT: [number, number] = [0, 40];
const BIN = 'Poubelle';
const REACH = 300;

function dispenserProject(): Project {
  const pb = new ProjectBuilder('Le distributeur');
  playerBlueprint(pb);
  const p = pb.project;
  const r = addInterface(p, 'BPI_Interactif');
  if (!r.ok) throw new Error(r.reason);
  addInterfaceFunction(p, r.value.id, 'Interagir');
  // V7.22: the player's graph is the learner's (a Line Trace, recalled); E acts on what the player looks at.
  ensurePlayerInput(p, ['E'], { E: 'IA_Interagir' });
  const box = pb.blueprint('BP_Distributeur');
  box.component('StaticMesh', 'Caisson', { sizeX: 120, sizeY: 80, color: '#475569' });
  box.component('BoxCollision', 'Zone', { sizeX: 260, sizeY: 260 });
  box.variable('Stock', T.array(T.name), [...STOCK]);
  // Right behind the player, within reach: it must not hear an E aimed at the dispenser.
  const bin = pb.blueprint('BP_Poubelle');
  bin.component('StaticMesh', 'Bac', { shape: 'cylinder', sizeX: 50, sizeY: 50, color: '#3f6212', blocks: false });
  bin.component('BoxCollision', 'Zone', { sizeX: 220, sizeY: 220 });
  implementInterface(bin.cls, r.value.id);
  bin.link(bin.node('event.interface', { interface: r.value.id, fn: r.value.functions[0].id }, {}, [64, 96]), 'then', bin.node('debug.printString', {}, { text: BIN }, [400, 96]), 'exec');
  pb.place(box, ...DISPENSER);
  pb.place(bin, ...BIN_AT);
  pb.playerStart(0, -60, 270);
  return p;
}

/** IA_Interagir (Started) → Line Trace, 300 cm ahead of the player → Interagir (Message) to the Hit Actor. */
function aimAndInteract(b: ClassBuilder, action: string, iface: string, fn: string): void {
  const ev = b.node('input.action', { action }, {}, [64, 96]);
  const loc = b.node('actor.getLocation', {}, {}, [64, 330]);
  const fwd = b.node('actor.getForward', {}, {}, [64, 470]);
  const mul = b.node('math.multiplyVectorFloat', {}, { b: REACH }, [330, 470]);
  const add = b.node('math.addVector', {}, {}, [540, 400]);
  const trace = b.node('trace.lineByChannel', {}, {}, [760, 96]);
  const msg = b.node('iface.message', { interface: iface, fn }, {}, [1180, 96]);
  b.link(ev, 'started', trace, 'exec').link(loc, 'result', trace, 'start').link(fwd, 'result', mul, 'a');
  b.link(loc, 'result', add, 'a').link(mul, 'result', add, 'b').link(add, 'result', trace, 'end');
  b.link(trace, 'then', msg, 'exec').link(trace, 'hitActor', msg, 'target');
}

const dispensed = (cx: CheckContext) => cx.sim.actors.filter((a) => a.className === 'BP_Objet' && !a.destroyed);

export const mixedDispenser: Lesson = {
  id: 'm2-distributeur',
  module: MODULE,
  level: 'avance',
  number: 0,
  title: 'Le distributeur',
  revision: 2,
  recalls: ['random', 'arrays', 'spawn', 'maps', 'trace', 'input', 'enhanced-input'],
  situation:
    'Le distributeur garde cinq objets en stock. À chaque E sur le distributeur (celui que le joueur regarde, pas la poubelle derrière lui), il en tire un au hasard, le fait apparaître devant lui et le retire du stock ; il tient le compte de ce qu’il a donné, par sorte. Vide, il le dit.',
  notions: ['Entraînement mélangé'],
  remember:
    'Un rayon pour désigner ce qu’on regarde (Line Trace), une liste qu’on vide (tableau, Remove Index), un tirage (Random Integer in Range jusqu’au Last Index), un acteur qui naît avec ses données (Spawn Actor, Expose on Spawn), un compte par sorte (Map) : cinq outils, cinq questions différentes.',
  cards: [
    {
      title: 'Cahier des charges',
      body:
        'Déjà là : **BPI_Interactif** (Interagir), **IA_Interagir** (E) ; **BP_Joueur** a un graphe vide. **BP_Distributeur** a un **Stock** (tableau de Name) : Pile, Fusible, Pile, Cle, Pile. Juste derrière le joueur, à portée de main, **BP_Poubelle** répond « Poubelle » à Interagir.\n\n' +
        '0. E agit sur **ce que le joueur regarde**, à 3 m au plus : le distributeur. La poubelle ne reçoit rien.\n' +
        '1. Crée **BP_Objet** : une petite forme, et un **Nom** (Name) qu’il reçoit **à sa naissance** et affiche à son BeginPlay.\n' +
        '2. E près du distributeur : il tire **au hasard** un objet du Stock, le fait **apparaître** devant lui (un BP_Objet avec ce Nom), et le **retire** du Stock.\n' +
        '3. Il compte ce qu’il a donné **par sorte**, et l’affiche : par exemple `Pile x2`.\n' +
        '4. Stock vide : il affiche `Vide`, et ne crée plus rien.',
    },
    MIXED,
  ],
  objectives: [
    'E agit sur ce que le joueur regarde : la poubelle, derrière lui, ne dit jamais « Poubelle ».',
    'Cinq E : cinq BP_Objet apparaissent, chacun affiche son Nom à sa naissance ; le stock se vide.',
    'Chaque fois, le distributeur affiche combien il a donné de cette sorte (« Pile x2 »…).',
    'Au sixième E : « Vide », et rien de plus.',
  ],
  hints: [
    'Cinq questions : comment désigner ce que le joueur regarde, et pas tout ce qui est à portée ? Comment tirer une position au hasard dans une liste qui raccourcit ? Comment un acteur reçoit-il une valeur avant son BeginPlay ? Où ranger un nombre par sorte d’objet ?',
    'Line Trace By Channel, Get Actor Location, Get Actor Forward Vector, Interagir (Message) ; Is Empty, Random Integer in Range, Last Index, Get (a copy), Remove Index, Spawn Actor (Expose on Spawn), Map : Find, Add, Append, Print String.',
    'Solution : BP_Joueur : IA_Interagir (Started) → Line Trace By Channel (Start = Get Actor Location, End = Start + Get Actor Forward Vector × 300) → Interagir (Message), Target = Out Hit Hit Actor. BP_Objet : variable Nom (Name, Instance Editable, Expose on Spawn) ; BeginPlay → Print String (Nom). BP_Distributeur implémente BPI_Interactif ; variable Donnes (Map Name → Integer). Event Interagir → Branch (Is Empty (Stock)) : True → Print « Vide » ; False → Set Index = Random Integer in Range (0, Last Index) → Set Tire = Get (Stock, Index) → Remove Index → Spawn Actor BP_Objet (Nom = Tire, devant le distributeur) → Set Compte = Find (Donnes, Tire) + 1 → Add (Donnes, Tire, Compte) → Print (Tire + « x » + Compte).',
  ],
  challenge: 'Remets le stock à son contenu de départ quand il est vide, et fais que chaque objet apparaisse à côté du précédent plutôt qu’au même endroit.',
  setup: dispenserProject,
  scenario: [
    { wait: 0.2 },
    ...tap('E'),
    { wait: 0.1 },
    ...tap('E'),
    { wait: 0.1 },
    ...tap('E'),
    { wait: 0.1 },
    ...tap('E'),
    { wait: 0.1 },
    ...tap('E'),
    { wait: 0.1 },
    { checkpoint: 'cinq' },
    ...tap('E'),
    { wait: 0.1 },
  ],
  checks: [
    {
      id: 'aim',
      label: 'E n’agit que sur ce que le joueur regarde : la poubelle ne reçoit rien',
      test: (cx) =>
        countPrints(cx, BIN) === 0
          ? true
          : `La poubelle a dit « ${BIN} » ${countPrints(cx, BIN)} fois : elle est à portée, mais le joueur regarde le distributeur. Lance un rayon devant lui (Line Trace By Channel) et n’envoie Interagir qu’à ce qu’il touche.`,
    },
    {
      id: 'five',
      label: 'Cinq E : cinq objets, le stock est vide',
      at: 'cinq',
      test: (cx) => {
        const n = dispensed(cx).length;
        if (!cx.project.classes.some((c) => c.name === 'BP_Objet')) return 'Crée le Blueprint BP_Objet.';
        if (n !== 5) return `Après cinq E, ${n} BP_Objet dans le niveau au lieu de 5.`;
        const left = cx.sim.actors.find((a) => a.className === 'BP_Distributeur');
        const cls = left && cx.sim.classOf(left);
        const stock = cls && left!.vars[cls.variables.find((v) => v.name === 'Stock')!.id];
        return Array.isArray(stock) && stock.length === 0 ? true : 'Après cinq objets donnés, le Stock n’est pas vide : chaque objet donné doit en être retiré.';
      },
    },
    {
      id: 'names',
      label: 'Chaque objet affiche son Nom à sa naissance : trois Pile, un Fusible, une Cle',
      at: 'cinq',
      test: (cx) => {
        const said = cx.prints().map((t) => t.trim());
        const got = ['Pile', 'Fusible', 'Cle'].map((n) => said.filter((t) => t === n).length);
        if (got.join(',') === '3,1,1') return true;
        if (said.some((t) => t === 'None' || t === '')) return 'Un objet affiche un Nom vide à son BeginPlay : il doit le recevoir à sa naissance (Expose on Spawn), pas après.';
        return `Noms affichés par les objets : Pile ${got[0]}, Fusible ${got[1]}, Cle ${got[2]}. Il fallait 3, 1, 1 : chaque objet du Stock une fois.`;
      },
    },
    {
      id: 'count',
      label: 'Le compte par sorte : « Pile x3 » au bout du compte',
      at: 'cinq',
      test: (cx) =>
        countPrints(cx, 'Pile x3') && countPrints(cx, 'Fusible x1') && countPrints(cx, 'Cle x1') ? true : 'Le distributeur doit afficher, à chaque objet, combien il en a donné de cette sorte : « Pile x1 », « Pile x2 », « Pile x3 », « Fusible x1 », « Cle x1 ».',
    },
    {
      id: 'empty',
      label: 'Au sixième E : « Vide », et rien de plus',
      test: (cx) => (dispensed(cx).length === 5 && countPrints(cx, 'Vide') === 1 ? true : `Au sixième E : ${dispensed(cx).length} objets, ${countPrints(cx, 'Vide')} message « Vide ». Il fallait 5 objets et un « Vide ».`),
    },
    noRuntimeErrors(),
  ],
  solve(p) {
    const made = addClass(p, 'BP_Objet', 'Actor');
    if (!made.ok) throw new Error(made.reason);
    const obj = new ClassBuilder(made.value, p);
    obj.component('StaticMesh', 'Forme', { shape: 'cylinder', sizeX: 30, sizeY: 30, color: '#f5c542', blocks: false });
    const nom = editable(obj, 'Nom', T.name, '');
    updateVariable(made.value, nom, { exposeOnSpawn: true });
    obj.link(obj.node('event.beginPlay', {}, {}, [64, 96]), 'then', obj.node('debug.printString', {}, {}, [360, 96]), 'exec');
    obj.link(obj.node('var.get', { variable: nom }, {}, [160, 300]), 'value', Object.values(obj.graph.nodes).find((n) => n.def === 'debug.printString')!.id, 'text');

    const iface = p.interfaces.find((i) => i.name === 'BPI_Interactif')!;
    aimAndInteract(edit(p, 'BP_Joueur'), p.inputActions!.find((a) => a.name === 'IA_Interagir')!.id, iface.id, iface.functions[0].id);
    const b = edit(p, 'BP_Distributeur');
    implementInterface(b.cls, iface.id);
    const stock = varId(b, 'Stock');
    const index = b.variable('Index', T.int, 0);
    const tire = b.variable('Tire', T.name, '');
    const given = b.variable('Donnes', T.map(T.name, T.int), []);
    const get = (v: string, at: [number, number]) => b.node('var.get', { variable: v }, {}, at);
    const ev = b.node('event.interface', { interface: iface.id, fn: iface.functions[0].id }, {}, [64, 96]);
    const empty = b.node('array.isEmpty', {}, {}, [240, 300]);
    const br = b.node('flow.branch', {}, {}, [360, 96]);
    b.link(ev, 'then', br, 'exec').link(get(stock, [64, 300]), 'value', empty, 'array').link(empty, 'result', br, 'condition');
    b.link(br, 'true', b.node('debug.printString', {}, { text: 'Vide' }, [640, -60]), 'exec');
    const last = b.node('array.lastIndex', {}, {}, [520, 360]);
    const rand = b.node('math.randomIntInRange', {}, { min: 0 }, [720, 360]);
    const setI = b.node('var.set', { variable: index }, {}, [700, 96]);
    b.link(br, 'false', setI, 'exec').link(get(stock, [360, 420]), 'value', last, 'array').link(last, 'result', rand, 'max').link(rand, 'result', setI, 'value');
    const pick = b.node('array.get', {}, {}, [960, 360]);
    const setT = b.node('var.set', { variable: tire }, {}, [1000, 96]);
    b.link(setI, 'then', setT, 'exec').link(get(stock, [800, 460]), 'value', pick, 'array').link(get(index, [800, 540]), 'value', pick, 'index').link(pick, 'item', setT, 'value');
    const remove = b.node('array.removeIndex', {}, {}, [1300, 96]);
    b.link(setT, 'then', remove, 'exec').link(get(stock, [1160, 300]), 'value', remove, 'array').link(get(index, [1160, 380]), 'value', remove, 'index');
    const spawn = b.node('actor.spawn', {}, { class: made.value.id, location: { x: DISPENSER[0], y: DISPENSER[1] + 150, z: 0 } }, [1600, 96]);
    b.link(remove, 'then', spawn, 'exec').link(get(tire, [1450, 300]), 'value', spawn, `expose:${nom}`);
    const count = b.variable('Compte', T.int, 0);
    const find = b.node('map.find', {}, {}, [1800, 360]);
    const plus = b.node('math.addInt', {}, { b: 1 }, [2000, 420]);
    const keep = b.node('var.set', { variable: count }, {}, [1900, 96]);
    const add = b.node('map.add', {}, {}, [2200, 96]);
    b.link(get(given, [1650, 420]), 'value', find, 'map').link(get(tire, [1650, 500]), 'value', find, 'key').link(find, 'value', plus, 'a');
    b.link(spawn, 'then', keep, 'exec').link(plus, 'result', keep, 'value');
    b.link(keep, 'then', add, 'exec').link(get(given, [2050, 260]), 'value', add, 'map').link(get(tire, [2050, 300]), 'value', add, 'key').link(get(count, [2050, 340]), 'value', add, 'value');
    const t1 = b.node('string.append', {}, { in1: ' x' }, [2400, 360]);
    const t2 = b.node('string.append', {}, {}, [2600, 360]);
    const say = b.node('debug.printString', {}, {}, [2500, 96]);
    b.link(get(tire, [2250, 560]), 'value', t1, 'in0').link(t1, 'result', t2, 'in0').link(get(count, [2250, 640]), 'value', t2, 'in1').link(t2, 'result', say, 'text');
    b.link(add, 'then', say, 'exec');
  },
};
