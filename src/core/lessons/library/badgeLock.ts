/**
 * V7.20, Actor Components: « Le verrou à badge », parent or component. The
 * doors already share a parent (a door « is a » door: BP_PorteBase opens).
 * A badge lock is wanted on the armoured door and on a terminal, which is
 * no door: the lock is something they « have », so an Actor Component,
 * written once, set per actor (the level needed), binding itself to its
 * owner's overlaps and telling the owner by a dispatcher.
 */
import type { Project } from '../../model/project';
import { addDispatcher } from '../../operations/classOps';
import { addFunction } from '../../operations/functionOps';
import { addClass, setParentClass } from '../../operations/projectOps';
import { T } from '../../types/pins';
import { ClassBuilder, edit, ProjectBuilder } from '../builder';
import { countPrints, noRuntimeErrors, notion, usesNode } from '../checks';
import type { CheckContext, Lesson } from '../types';
import { carries, isComponentClass } from './health';
import { goTo } from './kit';
import { playerBlueprint } from './props';

const SIMPLE: [number, number] = [-400, 0];
const ARMOURED: [number, number] = [0, 0];
const TERMINAL: [number, number] = [400, 0];
const OUT: [number, number] = [0, 360];
const DENIED = 'Accès refusé';
const GRANTED = 'Accès autorisé';

function project(): Project {
  const pb = new ProjectBuilder('Le verrou à badge');
  const { b: player } = playerBlueprint(pb);
  player.variable('NiveauBadge', T.int, 2);

  const base = pb.blueprint('BP_PorteBase');
  base.component('StaticMesh', 'Porte', { shape: 'door', sizeX: 160, sizeY: 16, color: '#a0703c', blocks: false });
  base.component('BoxCollision', 'Zone', { x: 80, sizeX: 220, sizeY: 220 });
  const open = base.inGraph(addFunction(base.cls, 'Ouvrir').id);
  const entry = Object.values(open.graph.nodes).find((n) => n.def === 'fn.entry')!.id;
  const rot = open.node('component.setRelativeRotation', {}, { rotation: { x: 0, y: 0, z: 90 } }, [360, 96]);
  open.link(entry, 'then', rot, 'exec').target('Porte', rot);

  const simple = pb.blueprint('BP_PorteSimple');
  const armoured = pb.blueprint('BP_PorteBlindee');
  for (const b of [simple, armoured]) {
    const r = setParentClass(pb.project, b.cls.id, base.cls.id);
    if (!r.ok) throw new Error(r.reason);
  }
  // The simple door opens for anyone: its overlap calls the parent's Ouvrir.
  simple.link(simple.node('event.actorBeginOverlap', {}, {}, [64, 96]), 'then', simple.node('call.function', { graph: open.graph.id }, {}, [400, 96]), 'exec');
  armoured.component('StaticMesh', 'Blindage', { x: 80, sizeX: 170, sizeY: 30, color: '#334155', blocks: false });

  const terminal = pb.blueprint('BP_Terminal');
  terminal.component('StaticMesh', 'Ecran', { sizeX: 90, sizeY: 50, color: '#0f766e', blocks: false });
  terminal.component('BoxCollision', 'Zone', { sizeX: 220, sizeY: 220 });

  pb.place(simple, ...SIMPLE);
  pb.place(armoured, ...ARMOURED);
  pb.place(terminal, ...TERMINAL);
  pb.playerStart(...OUT);
  return pb.project;
}

const opened = (cx: CheckContext, label: string) => Math.abs(Math.abs(cx.component(label, 'Porte')?.props.yaw ?? 0) - 90) < 1;
const state = (cx: CheckContext) =>
  `porte simple ${opened(cx, 'BP_PorteSimple') ? 'ouverte' : 'fermée'}, porte blindée ${opened(cx, 'BP_PorteBlindee') ? 'ouverte' : 'fermée'}, « ${DENIED} » ${countPrints(cx, DENIED)} fois`;

/** Where the lock lives: one Actor Component, on the armoured door and the terminal only. */
function lockPlaced(cx: CheckContext): true | string {
  const p = cx.project;
  if (!isComponentClass(p, 'BP_Verrou')) return 'Crée BP_Verrou, un Actor Component (Content Drawer › + Add › Blueprint Class › Actor Component).';
  for (const name of ['BP_PorteBlindee', 'BP_Terminal']) if (!carries(p, name, 'BP_Verrou')) return `${name} ne porte pas de BP_Verrou : Components › + Add.`;
  for (const name of ['BP_PorteBase', 'BP_PorteSimple']) if (carries(p, name, 'BP_Verrou')) return `${name} porte un BP_Verrou : la porte simple s’ouvre pour tout le monde, le verrou n’est que sur la porte blindée.`;
  const terminal = p.classes.find((c) => c.name === 'BP_Terminal');
  const base = p.classes.find((c) => c.name === 'BP_PorteBase');
  if (terminal?.parentClassId && terminal.parentClassId === base?.id) return 'BP_Terminal hérite de BP_PorteBase : un terminal n’est pas une porte. Il a un verrou, il n’en est pas un.';
  for (const name of ['BP_PorteBase', 'BP_PorteBlindee', 'BP_Terminal']) {
    if (cx.nodes(name).some((n) => n.def === 'cast.to')) return `${name} fait un Cast : la vérification du badge s’écrit une fois, dans BP_Verrou.`;
  }
  return true;
}

export const lessonBadgeLock: Lesson = {
  id: 'l-verrou-badge',
  module: 'Composition',
  level: 'avance',
  number: 0,
  title: 'Le verrou à badge',
  situation:
    'Les portes de la station ont un parent commun, BP_PorteBase, qui sait s’ouvrir. Il faut maintenant un verrou à badge sur la porte blindée, et le même sur le terminal du poste de garde, qui n’est pas une porte. Parent ou composant ?',
  recalls: ['cast', 'dispatchers', 'inheritance'],
  notions: ['Parent ou composant', 'Actor Component', 'On Actor Begin Overlap', 'On … (Composant)', 'Instance Editable'],
  remember:
    'Un parent dit ce qu’un acteur est (une porte), un composant ce qu’il a (un verrou). Le verrou, écrit une fois dans un Actor Component, se pose sur une porte comme sur un terminal ; il écoute les overlaps de son acteur et le prévient par un Event Dispatcher.',
  cards: [
    {
      title: 'Cahier des charges',
      body:
        'Déjà là : **BP_PorteBase** (une Porte, une Zone, une fonction **Ouvrir**), et ses deux enfants : **BP_PorteSimple**, qui s’ouvre dès qu’on entre dans sa zone, et **BP_PorteBlindee**, au graphe vide. **BP_Terminal** (un Ecran, une Zone) n’est pas une porte. **BP_Joueur** a une variable **NiveauBadge** (2).\n\n' +
        '- Crée **BP_Verrou**, un Actor Component, avec un **niveau requis** réglable sur chaque acteur qui le porte.\n' +
        '- Le joueur entre dans la zone d’un acteur verrouillé : si son badge est assez haut, **l’acteur est prévenu** qu’il est déverrouillé ; sinon le verrou affiche « Accès refusé ».\n' +
        '- **Porte blindée** : niveau 2 ; déverrouillée, elle **cache son Blindage**, puis s’ouvre comme toute porte (Ouvrir, qu’elle hérite).\n' +
        '- **Terminal** : niveau 3 ; déverrouillé, il affiche « Accès autorisé ».\n' +
        '- La porte simple ne change pas : pas de verrou.\n' +
        '- La vérification du badge s’écrit **une fois** : ni BP_PorteBase, ni la porte blindée, ni le terminal ne font de Cast. Le terminal ne devient pas une porte.',
    },
    {
      title: 'Ce qui est nouveau',
      body:
        'Un Actor Component n’a pas de forme : il ne reçoit pas d’overlap lui-même. Mais il peut **s’abonner** à ceux de l’acteur qui le porte : au BeginPlay du composant, **Bind Event to On Actor Begin Overlap**, Target = **Get Owner**. Le Custom Event relié (« Add Custom Event for On Actor Begin Overlap ») reçoit **Overlapped Actor** et **Other Actor**.\n\n' +
        'Pour prévenir l’acteur, un **Event Dispatcher** du composant : dans l’acteur, le **+** vert des Details du composant ajoute « On … (BP_Verrou) ».',
    },
    {
      title: 'Le plan',
      body:
        '1. **BP_Verrou** : variable **NiveauRequis** (Integer, Instance Editable), Event Dispatcher **OnDeverrouille**.\n' +
        '2. Son BeginPlay → **Bind Event to On Actor Begin Overlap** (Target = Get Owner) ← Custom Event **Entree**.\n' +
        '3. Entree → **Cast To BP_Joueur** (Other Actor) → **Branch** (NiveauBadge >= NiveauRequis) : True → **Call OnDeverrouille** ; False → Print « Accès refusé ».\n' +
        '4. Porte blindée et terminal : + Add › BP_Verrou, NiveauRequis 2 et 3 dans les Details du composant.\n' +
        '5. Porte blindée : redéfinis **Ouvrir** (My Blueprint › Functions › une fonction du même nom) : Set Visibility (Blindage, décoché) → **Parent: Ouvrir**. Puis **On OnDeverrouille (BP_Verrou)** → Ouvrir.\n' +
        '6. Terminal : **On OnDeverrouille (BP_Verrou)** → Print « Accès autorisé ».',
    },
  ],
  objectives: [
    'Crée l’Actor Component BP_Verrou ; pose-le sur la porte blindée (niveau 2) et sur le terminal (niveau 3).',
    'La porte simple s’ouvre toujours ; avec un badge 2, la porte blindée cache son Blindage et s’ouvre.',
    'Le terminal refuse un badge 2 : « Accès refusé ».',
    'La vérification du badge s’écrit une fois ; le terminal n’est pas une porte.',
  ],
  hints: [
    'Le terminal et la porte blindée ont-ils un parent commun qui ait un sens ? Ce qu’ils partagent, est-ce ce qu’ils sont, ou ce qu’ils ont ? Et comment un composant, qui n’a pas de forme, sait-il que le joueur entre dans la zone de son acteur ?',
    'Actor Component BP_Verrou ; NiveauRequis (Instance Editable) ; Event Dispatcher OnDeverrouille ; Bind Event to On Actor Begin Overlap ; Get Owner ; Cast To BP_Joueur ; >= ; Branch ; On OnDeverrouille (BP_Verrou) ; Ouvrir redéfinie, Parent: Ouvrir, Set Visibility.',
    'Solution : BP_Verrou : BeginPlay → Bind Event to On Actor Begin Overlap (Target = Get Owner, Event = Custom Event Entree). Entree → Cast To BP_Joueur (Other Actor) → Branch (NiveauBadge >= NiveauRequis) : True → Call OnDeverrouille ; False → Print « Accès refusé ». Porte blindée : BP_Verrou (NiveauRequis 2) ; sa fonction Ouvrir redéfinie : Set Visibility (Blindage, décoché) → Parent: Ouvrir ; On OnDeverrouille → Ouvrir. Terminal : BP_Verrou (NiveauRequis 3), On OnDeverrouille → Print « Accès autorisé ».',
  ],
  challenge: 'Donne le badge au joueur sous la forme d’un Actor Component BP_Badge (Niveau) : le verrou le trouve avec Get Component by Class, plus de Cast To BP_Joueur. Un drone qui porterait un badge passerait aussi.',
  setup: project,
  scenario: [
    { wait: 0.2 },
    ...goTo(...SIMPLE, 0.3),
    { checkpoint: 'simple' },
    ...goTo(...OUT),
    ...goTo(...ARMOURED, 0.3),
    { checkpoint: 'blindee' },
    ...goTo(...OUT),
    ...goTo(...TERMINAL, 0.3),
  ],
  checks: [
    { id: 'lock', label: 'BP_Verrou, un Actor Component, est sur la porte blindée et le terminal, et nulle part ailleurs', test: lockPlaced },
    { id: 'simple', label: 'La porte simple s’ouvre', at: 'simple', test: (cx) => (opened(cx, 'BP_PorteSimple') ? true : `Dans la zone de la porte simple : ${state(cx)}.`) },
    {
      id: 'armoured',
      label: 'La porte blindée s’ouvre avec un badge 2, sans « Accès refusé »',
      at: 'blindee',
      test: (cx) => (opened(cx, 'BP_PorteBlindee') && countPrints(cx, DENIED) === 0 ? true : `Dans la zone de la porte blindée : ${state(cx)}.`),
    },
    {
      id: 'shield',
      label: 'Déverrouillée, la porte blindée cache son Blindage',
      at: 'blindee',
      test: (cx) => (cx.component('BP_PorteBlindee', 'Blindage')?.props.visible === false ? true : 'Le Blindage de la porte blindée est encore visible : déverrouillée, elle le cache avant de s’ouvrir.'),
    },
    {
      id: 'shield-closed',
      label: 'Avant le passage du joueur, le Blindage est en place',
      at: 'simple',
      test: (cx) => (cx.component('BP_PorteBlindee', 'Blindage')?.props.visible !== false ? true : 'Le Blindage a disparu avant que le joueur arrive : il ne se cache qu’au déverrouillage.'),
    },
    {
      id: 'terminal',
      label: 'Le terminal refuse un badge 2 : « Accès refusé », une fois',
      test: (cx) =>
        countPrints(cx, DENIED) === 1 && countPrints(cx, GRANTED) === 0 ? true : `Au terminal : « ${DENIED} » ${countPrints(cx, DENIED)} fois, « ${GRANTED} » ${countPrints(cx, GRANTED)} fois. Il faut le niveau 3.`,
    },
    notion(usesNode('dispatch', 'BP_Verrou', ['dispatcher.call'], 'Le verrou prévient son acteur par un Event Dispatcher', 'Ajoute un Event Dispatcher à BP_Verrou et appelle-le quand le badge suffit.')),
    noRuntimeErrors(),
  ],
  robustness: [
    {
      id: 'badge-3',
      label: 'le joueur a un badge 3',
      mutate: (p) => {
        const v = p.classes.find((c) => c.name === 'BP_Joueur')?.variables.find((x) => x.name === 'NiveauBadge');
        if (v) v.defaultValue = 3;
      },
      scenario: [{ wait: 0.2 }, ...goTo(...TERMINAL, 0.3)],
      checks: [
        {
          id: 'granted',
          label: 'le terminal affiche « Accès autorisé »',
          test: (cx) => (countPrints(cx, GRANTED) === 1 && countPrints(cx, DENIED) === 0 ? true : `Avec un badge 3, le terminal affiche « ${GRANTED} » ${countPrints(cx, GRANTED)} fois.`),
        },
      ],
      advice: 'Le terminal doit réagir à On OnDeverrouille de son BP_Verrou en affichant « Accès autorisé ».',
    },
  ],
  solve(p) {
    const made = addClass(p, 'BP_Verrou', 'ActorComponent');
    if (!made.ok) throw new Error(made.reason);
    const lock = new ClassBuilder(made.value, p);
    const level = lock.variable('NiveauRequis', T.int, 1);
    made.value.variables.find((v) => v.id === level)!.instanceEditable = true;
    const unlocked = addDispatcher(made.value, 'OnDeverrouille').id;
    const player = p.classes.find((c) => c.name === 'BP_Joueur')!;
    const badge = player.variables.find((v) => v.name === 'NiveauBadge')!.id;

    const bind = lock.node('dispatcher.bindNative', { dispatcher: 'OnActorBeginOverlap' }, {}, [360, 96]);
    const enter = lock.node('event.custom', { name: 'Entree', signature: 'OnActorBeginOverlap', signatureOwner: 'Actor' }, {}, [64, 420]);
    lock.link(lock.node('event.beginPlay', {}, {}, [64, 96]), 'then', bind, 'exec').link(lock.node('component.getOwner', {}, {}, [200, 260]), 'result', bind, 'target').link(enter, 'delegate', bind, 'event');
    const cast = lock.node('cast.to', { class: player.id }, {}, [380, 420]);
    const ge = lock.node('math.greaterEqualInt', {}, {}, [640, 640]);
    const branch = lock.node('flow.branch', {}, {}, [760, 420]);
    const call = lock.node('dispatcher.call', { owner: made.value.id, dispatcher: unlocked }, {}, [1060, 380]);
    const no = lock.node('debug.printString', {}, { text: DENIED }, [1060, 560]);
    lock.link(enter, 'then', cast, 'exec').link(enter, 'other', cast, 'object').link(cast, 'then', branch, 'exec');
    lock.link(cast, 'as', lock.node('var.getExternal', { owner: player.id, variable: badge }, {}, [440, 640]), 'target');
    const read = Object.values(lock.graph.nodes).find((n) => n.def === 'var.getExternal')!.id;
    lock.link(read, 'value', ge, 'a').link(lock.node('var.get', { variable: level }, {}, [460, 800]), 'value', ge, 'b').link(ge, 'result', branch, 'condition');
    lock.link(branch, 'true', call, 'exec').link(branch, 'false', no, 'exec');

    const openFn = p.classes.find((c) => c.name === 'BP_PorteBase')!.graphs.find((g) => g.name === 'Ouvrir')!.id;
    // The armoured door's own Ouvrir: hide the shield, then the parent's version.
    const armoured = edit(p, 'BP_PorteBlindee');
    const own = addFunction(armoured.cls, 'Ouvrir');
    const f = armoured.inGraph(own.id);
    const ownEntry = Object.values(own.nodes).find((n) => n.def === 'fn.entry')!.id;
    const hide = f.node('component.setVisibility', {}, { visible: false }, [360, 96]);
    const up = f.node('call.function', { graph: openFn, parent: true }, {}, [680, 96]);
    f.link(ownEntry, 'then', hide, 'exec').link(hide, 'then', up, 'exec').target('Blindage', hide);
    for (const [name, needed, react] of [
      ['BP_PorteBlindee', 2, 'open'],
      ['BP_Terminal', 3, 'say'],
    ] as const) {
      const b = edit(p, name);
      const comp = b.logic(lock, 'BP_Verrou', { [level]: needed });
      const ev = b.node('event.componentDispatcher', { component: comp, dispatcher: unlocked }, {}, [64, 96]);
      const act = react === 'open' ? b.node('call.function', { graph: openFn }, {}, [400, 96]) : b.node('debug.printString', {}, { text: GRANTED }, [400, 96]);
      b.link(ev, 'then', act, 'exec');
    }
  },
};
