/**
 * V2, Avancé: the control room (an interface to act, an Enum for the mode,
 * an Event Dispatcher to tell the lamps) and the "Refactor" exercise that
 * moves Get All Actors Of Class out of Tick.
 */
import { addDispatcher, addDispatcherParam, implementInterface } from '../../operations/classOps';
import { addEnum } from '../../operations/enumOps';
import { removeNodes } from '../../operations/graphOps';
import { addInterface, addInterfaceFunction } from '../../operations/projectOps';
import { T } from '../../types/pins';
import { edit, ProjectBuilder } from '../builder';
import { noRuntimeErrors, PRESS_E, usesNode, notion } from '../checks';
import type { CheckContext, Lesson } from '../types';
import { playerInteracts } from './module3';
import { lampBlueprint, playerBlueprint } from './props';

// --------------------------------------------------------- La salle de contrôle

const MODES = ['Arret', 'Eco', 'Plein'];
const LAMPS = ['BP_Lampe', 'BP_Lampe2', 'BP_Lampe3'];

function controlRoomProject() {
  const pb = new ProjectBuilder('La salle de contrôle');
  const iface = addInterface(pb.project, 'BPI_Interactif');
  if (!iface.ok) throw new Error(iface.reason);
  addInterfaceFunction(pb.project, iface.value.id, 'Interagir');
  const modes = addEnum(pb.project, 'E_Mode');
  if (!modes.ok) throw new Error(modes.reason);
  modes.value.entries = [...MODES];
  // V7.22: the player's graph is the learner's again (a recall of the input, the loop and the interface message).
  playerBlueprint(pb);
  const console = pb.blueprint('BP_Console');
  console.component('StaticMesh', 'Pupitre', { sizeX: 120, sizeY: 60, color: '#334155' });
  console.component('BoxCollision', 'Zone', { sizeX: 320, sizeY: 260 });
  console.component('TextRender', 'Ecran', { y: -60, text: 'Arret' });
  console.variable('Mode', T.enum('E_Mode'), 0);
  const d = addDispatcher(console.cls, 'OnModeChange');
  addDispatcherParam(console.cls, d.id, T.enum('E_Mode'));
  d.params[0].name = 'NouveauMode';
  const lamp = lampBlueprint(pb);
  pb.place(console, 0, 0);
  for (const x of [-300, 0, 300]) pb.place(lamp, x, -300);
  pb.playerStart(0, 80);
  return pb.project;
}

function lampsAre(cx: CheckContext, on: boolean, intensity?: number): true | string {
  for (const label of LAMPS) {
    const c = cx.component(label, 'Lumiere');
    if (!c) return `${label} n’a plus de composant Lumiere.`;
    if (c.props.visible !== on) return `${label} est ${on ? 'éteinte' : 'allumée'} au lieu d’être ${on ? 'allumée' : 'éteinte'}.`;
    if (on && intensity !== undefined && Math.abs(c.props.intensity - intensity) > 1) return `${label} a une intensité de ${c.props.intensity} au lieu de ${intensity}.`;
  }
  return true;
}

const modeIs = (cx: CheckContext, mode: string) => {
  const m = MODES[Number(cx.variable('BP_Console', 'Mode'))];
  return m === mode ? true : `Le Mode de la console vaut ${m ?? '?'} au lieu de ${mode}.`;
};

export const lessonControlRoom: Lesson = {
  id: 'l-salle-controle',
  module: 'Projet',
  level: 'avance',
  number: 0,
  title: 'La salle de contrôle',
  revision: 2,
  recalls: ['input', 'enhanced-input', 'loops', 'interfaces'],
  situation:
    'Près de la console, E fait passer le mode de Arret à Eco, puis Plein, puis Arret. À chaque changement, la console prévient ; les trois lampes s’éteignent (Arret), éclairent à 1500 (Eco) ou à 5000 (Plein).',
  notions: ['Blueprint Interface', 'Enum et Switch on Enum', 'Event Dispatcher avec paramètre', 'Get Actor Of Class'],
  remember: 'Chaque outil à sa place : l’interface pour agir sur un objet sans le connaître, l’Enum pour son état, l’Event Dispatcher pour prévenir ceux qui écoutent.',
  cards: [
    {
      title: 'Ce qui est en place',
      body:
        'Cette leçon réunit trois outils déjà vus. Sont prêts :\n\n' +
        '- **BPI_Interactif** (Interagir) ; **BP_Joueur** a un graphe vide : à toi de lui faire envoyer Interagir (Message) à tout ce qu’il touche sur **IA_Interagir** (Started), comme dans « Interagir avec tout » ;\n- l’Enum **E_Mode** : Arret, Eco, Plein ;\n- **BP_Console** : un pupitre, une Zone, un écran, une variable **Mode** (E_Mode, Arret) et un Event Dispatcher **OnModeChange** avec un paramètre **NouveauMode** (E_Mode) ;\n- trois **BP_Lampe**, éteintes, sans logique.\n\n' +
        'E près de la console fait tourner le mode : Arret → Eco → Plein → Arret. Les lampes suivent : éteintes, 1500, 5000.',
    },
    {
      title: 'Chaque outil à sa place',
      body:
        '- **L’interface** pour **agir** : le joueur ne sait pas qu’il parle à une console. Il envoie Interagir, la console décide.\n- **L’Enum** pour l’**état** : trois noms clairs plutôt qu’un nombre, et un Switch qui a une sortie par état.\n- **L’Event Dispatcher** pour **prévenir** : la console n’a pas à connaître les lampes. Elle annonce, celles qui écoutent réagissent.\n\n' +
        'Personne ne lit l’état d’un autre à chaque image : chacun réagit au bon moment.',
    },
    {
      title: 'Le joueur',
      body: '**IA_Interagir** (Started) → **Get Overlapping Actors** → **For Each Loop** → **Interagir (Message)**, Target = Array Element. Le joueur ne sait rien de la console : il envoie, elle décide.',
    },
    {
      title: 'La console',
      body:
        '1. **Class Settings** › Interfaces › Add › BPI_Interactif.\n2. My Blueprint › Interfaces › Interagir › **Event**.\n3. **Event Interagir** → **Switch on E_Mode** (Selection = Get Mode).\n4. Arret → **Set Mode** = Eco ; Eco → Set Mode = Plein ; Plein → Set Mode = Arret.\n5. Les trois Set → **Call OnModeChange**, NouveauMode = Get Mode.\n\n' +
        'Un seul Call suffit : les trois chemins y convergent après leur Set.',
    },
    {
      title: 'Les lampes',
      body:
        'Au **BeginPlay** de BP_Lampe :\n\n' +
        '1. **Get Actor Of Class** (BP_Console) : il n’y a qu’une console, inutile de régler une référence par lampe.\n2. **Bind Event to OnModeChange**, Target = cette console ; depuis la pin Event, **Add Custom Event for OnModeChange**.\n3. Ce Custom Event → **Switch on E_Mode** (Selection = NouveauMode) :\n\n' +
        '- Arret → **Set Visibility** (Lumiere, décoché) ;\n- Eco → Set Visibility (coché) → **Set Intensity** (Lumiere, 1500) ;\n- Plein → Set Visibility (coché) → Set Intensity (5000).',
    },
    {
      title: 'Les pièges',
      body:
        '**Oublier un Set Mode.** Le Switch repasse sans cesse par la même sortie.\n\n' +
        '**Appeler OnModeChange avant le Set.** Les lampes reçoivent l’ancien mode, avec un cran de retard.\n\n' +
        '**Get Actor Of Class à chaque changement.** Ça marche, mais chercher la console une fois au BeginPlay suffit : la recherche parcourt tout le niveau.',
    },
  ],
  objectives: [
    'Sur IA_Interagir, BP_Joueur envoie Interagir à tout ce qu’il touche.',
    'BP_Console implémente BPI_Interactif ; sur Interagir, le Mode passe au suivant (Arret → Eco → Plein → Arret) puis Call OnModeChange.',
    'Chaque BP_Lampe s’abonne à OnModeChange au BeginPlay et règle sa Lumiere selon le mode : éteinte, 1500, 5000.',
    'Touche Vérifier : 3 appuis sur E près de la console.',
  ],
  hints: [
    'La console doit-elle connaître les lampes ? Comment une lampe trouve-t-elle la console sans variable réglée dans le niveau ?',
    'Joueur : IA_Interagir, Get Overlapping Actors, For Each Loop, Interagir (Message). Console : Event Interagir, Switch on E_Mode, 3 Set Mode, Call OnModeChange. Lampe : BeginPlay, Get Actor Of Class, Bind Event to OnModeChange, Custom Event, Switch on E_Mode, Set Visibility, Set Intensity.',
    'Solution : Joueur : IA_Interagir (Started) → Get Overlapping Actors → For Each Loop → Interagir (Message), Target = Array Element. Console : Interagir → Switch (Mode) → Set Mode (suivant) → Call OnModeChange (Mode). Lampe : BeginPlay → Bind (Target = Get Actor Of Class BP_Console) ← Custom Event (NouveauMode) → Switch (NouveauMode) → Set Visibility / Set Intensity.',
  ],
  challenge: 'Affiche le mode sur l’Ecran de la console avec Set Text, à chaque changement.',
  setup: controlRoomProject,
  scenario: [{ wait: 0.2 }, ...PRESS_E, { checkpoint: 'eco' }, ...PRESS_E, { checkpoint: 'plein' }, ...PRESS_E, { checkpoint: 'arret' }],
  checks: [
    { id: 'eco-mode', label: '1er appui : Mode = Eco', at: 'eco', test: (cx) => modeIs(cx, 'Eco') },
    { id: 'eco-lamps', label: 'En Eco, les trois lampes éclairent à 1500', at: 'eco', test: (cx) => lampsAre(cx, true, 1500) },
    { id: 'full', label: '2e appui : Plein, les lampes à 5000', at: 'plein', test: (cx) => (modeIs(cx, 'Plein') === true ? lampsAre(cx, true, 5000) : modeIs(cx, 'Plein')) },
    { id: 'off', label: '3e appui : Arret, les lampes éteintes', at: 'arret', test: (cx) => (modeIs(cx, 'Arret') === true ? lampsAre(cx, false) : modeIs(cx, 'Arret')) },
    notion(usesNode('iface', 'BP_Console', ['event.interface'], 'La console répond à Interagir', 'La console doit réagir à Event Interagir de BPI_Interactif.')),
    notion(usesNode('call', 'BP_Console', ['dispatcher.call'], 'La console prévient avec OnModeChange', 'La console doit annoncer le changement avec Call OnModeChange.')),
    notion(usesNode('bind', 'BP_Lampe', ['dispatcher.bind'], 'Les lampes s’abonnent', 'BP_Lampe doit s’abonner avec Bind Event to OnModeChange.')),
    noRuntimeErrors(),
  ],
  solve(p) {
    const con = edit(p, 'BP_Console');
    const iface = p.interfaces[0];
    playerInteracts(edit(p, 'BP_Joueur'), iface.id, iface.functions[0].id);
    implementInterface(con.cls, iface.id);
    const mode = con.cls.variables[0].id;
    const d = con.cls.dispatchers[0];
    const param = d.params[0].id;
    const ev = con.node('event.interface', { interface: iface.id, fn: iface.functions[0].id }, {}, [64, 96]);
    const sw = con.node('flow.switchEnum', { enum: 'E_Mode' }, {}, [360, 96]);
    con.link(ev, 'then', sw, 'exec').link(con.node('var.get', { variable: mode }, {}, [200, 300]), 'value', sw, 'selection');
    const call = con.node('dispatcher.call', { owner: con.cls.id, dispatcher: d.id }, {}, [1100, 96]);
    con.link(con.node('var.get', { variable: mode }, {}, [900, 300]), 'value', call, param);
    for (const [i, next] of [1, 2, 0].entries()) {
      const set = con.node('var.set', { variable: mode }, { value: next }, [700, i * 160]);
      con.link(sw, `case${i}`, set, 'exec').link(set, 'then', call, 'exec');
    }
    const lamp = edit(p, 'BP_Lampe');
    const begin = lamp.node('event.beginPlay', {}, {}, [64, 96]);
    const find = lamp.node('actor.getOfClass', {}, { class: con.cls.id }, [300, 96]);
    const bind = lamp.node('dispatcher.bind', { owner: con.cls.id, dispatcher: d.id }, {}, [640, 96]);
    const ce = lamp.node('event.custom', { name: 'ChangerMode', signature: d.id, signatureOwner: con.cls.id }, {}, [64, 420]);
    lamp.link(begin, 'then', find, 'exec').link(find, 'then', bind, 'exec').link(find, 'result', bind, 'target').link(ce, 'delegate', bind, 'event');
    const lsw = lamp.node('flow.switchEnum', { enum: 'E_Mode' }, {}, [360, 420]);
    lamp.link(ce, 'then', lsw, 'exec').link(ce, param, lsw, 'selection');
    const off = lamp.node('component.setVisibility', {}, { visible: false }, [700, 300]);
    lamp.link(lsw, 'case0', off, 'exec').target('Lumiere', off);
    for (const [i, power] of [1500, 5000].entries()) {
      const show = lamp.node('component.setVisibility', {}, { visible: true }, [700, 520 + i * 320]);
      const level = lamp.node('component.setIntensity', {}, { intensity: power }, [1000, 520 + i * 320]);
      lamp.link(lsw, `case${i + 1}`, show, 'exec').link(show, 'then', level, 'exec').target('Lumiere', show).target('Lumiere', level);
    }
  },
};

// ---------------------------------------------------------- Refactor R1

function displayProject() {
  const pb = new ProjectBuilder('L’afficheur');
  const lamp = lampBlueprint(pb);
  for (const x of [-300, 0, 300]) pb.place(lamp, x, -250);
  const b = pb.blueprint('BP_Afficheur');
  b.component('StaticMesh', 'Panneau', { sizeX: 160, sizeY: 40, color: '#1f2937' });
  b.component('TextRender', 'Ecran', { y: -50, text: '?' });
  const tick = b.node('event.tick', {}, {}, [64, 96]);
  const all = b.node('actor.getAllOfClass', {}, { class: lamp.cls.id }, [360, 96]);
  const len = b.node('array.length', {}, {}, [680, 300]);
  const text = b.node('component.setText', {}, {}, [900, 96]);
  b.link(tick, 'then', all, 'exec').link(all, 'then', text, 'exec').link(all, 'actors', len, 'array').link(len, 'result', text, 'value').target('Ecran', text);
  pb.place(b, 0, 150);
  pb.playerStart(-400, 150);
  return pb.project;
}

/** Times Get All Actors Of Class ran in BP_Afficheur during the scenario. */
function searches(cx: CheckContext): number {
  const cls = cx.project.classes.find((c) => c.name === 'BP_Afficheur');
  let n = 0;
  for (const g of cls?.graphs ?? []) {
    for (const node of Object.values(g.nodes)) if (node.def === 'actor.getAllOfClass') n += cx.sim.record.runsOf(g.id, node.id)?.count ?? 0;
  }
  return n;
}

export const refactor1: Lesson = {
  id: 'r1-afficheur',
  kind: 'refactor',
  code: 'R1',
  module: 'Projet',
  level: 'avance',
  number: 0,
  title: 'L’afficheur',
  situation: 'L’afficheur montre le nombre de lampes. Il marche, mais il cherche toutes les lampes du niveau à chaque image, 60 fois par seconde. Fais-le chercher une seule fois.',
  notions: ['Refactor', 'Get All Actors Of Class', 'Event Tick', 'Garder une référence'],
  remember: 'Chercher des acteurs coûte cher : on le fait une fois, au BeginPlay, et on garde le résultat dans une variable. Le Tick ne fait que ce qui change à chaque image.',
  cards: [
    {
      title: 'Ce qui est en place',
      body:
        'Trois **BP_Lampe** et un **BP_Afficheur**. Le graphe de l’afficheur :\n\n' +
        '**Event Tick** → **Get All Actors Of Class** (BP_Lampe) → **Set Text** (Ecran) = **Length** du résultat.\n\n' +
        'L’écran affiche 3. Le graphe **marche**. Mais la recherche tourne **à chaque image** : 60 fois par seconde, pour un résultat qui ne change jamais.',
    },
    {
      title: 'Ce qui coûte',
      body:
        '**Get All Actors Of Class** parcourt **tout le niveau** pour trouver les acteurs d’une classe. Dans un vrai niveau de milliers d’acteurs, le faire à chaque image se voit dans les performances.\n\n' +
        '**Event Tick**, lui, est fait pour ce qui change **à chaque image** : un mouvement, un compte à rebours affiché. Une recherche dont le résultat ne bouge pas n’a rien à y faire.\n\n' +
        'La règle : on cherche **une fois**, au **BeginPlay**, et on **garde** le résultat dans une variable.',
    },
    {
      title: 'La réécriture',
      body:
        '1. Pose **Event BeginPlay** → Get All Actors Of Class (BP_Lampe) → **Set Lampes**, une variable **tableau de BP_Lampe**. Le plus rapide : appui long sur la pin **Out Actors** › **Promouvoir en variable**.\n2. Supprime le Get All Actors Of Class du Tick.\n3. **Set Text** (Ecran) = Length de **Get Lampes**.\n\n' +
        'Le Set Text peut rester sur le Tick, ou passer juste après le Set Lampes : les lampes ne changent pas, l’écran non plus. La vérification compte les recherches : une seule.',
    },
    {
      title: 'Et si les lampes changeaient ?',
      body:
        'Si des lampes apparaissaient ou disparaissaient pendant le jeu, on ne relancerait pas la recherche au Tick pour autant : la lampe qui naît s’ajoute à la liste (Add), celle qui meurt s’en retire (Remove Item, voir « Détruire proprement »).',
    },
  ],
  objectives: ['L’Ecran affiche toujours 3.', 'Get All Actors Of Class ne s’exécute qu’une fois.', 'Touche Vérifier.'],
  hints: [
    'Qu’est-ce qui coûte à chaque Tick ? Le résultat de cette recherche change-t-il pendant la partie ?',
    'Nœuds : Event BeginPlay, Get All Actors Of Class, Set Lampes (tableau de BP_Lampe), Get Lampes, Length, Set Text.',
    'Solution : BeginPlay → Get All Actors Of Class → Set Lampes. Tick (ou directement après le Set) → Set Text (Ecran, Length de Lampes).',
  ],
  setup: displayProject,
  scenario: [{ wait: 1 }],
  checks: [
    {
      id: 'same',
      label: 'L’Ecran affiche 3',
      test: (cx) => {
        const t = cx.component('BP_Afficheur', 'Ecran')?.props.text;
        return t === '3' ? true : `L’Ecran affiche « ${t ?? ''} » au lieu de 3.`;
      },
    },
    {
      id: 'once',
      label: 'Une seule recherche',
      test: (cx) => {
        const n = searches(cx);
        if (n === 1) return true;
        return n === 0
          ? 'Get All Actors Of Class ne s’exécute plus du tout : il faut chercher les lampes une fois, au BeginPlay.'
          : `Get All Actors Of Class s’est exécuté ${n} fois en 1 s : il est toujours appelé à chaque Tick. Appelle-le une fois au BeginPlay et garde le résultat dans une variable.`;
      },
    },
    noRuntimeErrors(),
  ],
  solve(p) {
    const b = edit(p, 'BP_Afficheur');
    const lamp = p.classes.find((c) => c.name === 'BP_Lampe')!;
    const nodes = Object.values(b.graph.nodes);
    removeNodes(
      b.graph,
      nodes.filter((n) => n.def === 'actor.getAllOfClass' || n.def === 'array.length' || n.def === 'conv.intToString').map((n) => n.id),
    );
    const tick = nodes.find((n) => n.def === 'event.tick')!.id;
    const text = nodes.find((n) => n.def === 'component.setText')!.id;
    const list = b.variable('Lampes', T.array(T.object('BP_Lampe')));
    const begin = b.node('event.beginPlay', {}, {}, [64, -200]);
    const all = b.node('actor.getAllOfClass', {}, { class: lamp.id }, [360, -200]);
    const keep = b.node('var.set', { variable: list }, {}, [680, -200]);
    const len = b.node('array.length', {}, {}, [680, 300]);
    b.link(begin, 'then', all, 'exec').link(all, 'then', keep, 'exec').link(all, 'actors', keep, 'value');
    b.link(tick, 'then', text, 'exec').link(b.node('var.get', { variable: list }, {}, [500, 300]), 'value', len, 'array').link(len, 'result', text, 'value');
  },
};
