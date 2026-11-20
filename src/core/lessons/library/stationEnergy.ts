/**
 * V7.21, Actor Components, autonomy rung: A2 « L’énergie de la station ».
 * A brief only, a few days after T3: lamps and a door run on a charge that
 * drains by itself. One Actor Component, written once, set per placed actor
 * (two lamps, two charges), telling its actor once when it is empty; each
 * actor goes off its own way.
 */
import type { Project } from '../../model/project';
import { addDispatcher } from '../../operations/classOps';
import { setComponentOverride } from '../../operations/levelOps';
import { addClass } from '../../operations/projectOps';
import { T } from '../../types/pins';
import { ClassBuilder, edit, ProjectBuilder } from '../builder';
import { countPrints, noRuntimeErrors, notion, notUsing, usesNode } from '../checks';
import type { CheckContext, Lesson } from '../types';
import { carries, componentVar, isComponentClass } from './health';
import { playerBlueprint } from './props';
import { levelOf } from '../../model/project';

const LAMP_A: [number, number] = [-350, -150];
const LAMP_B: [number, number] = [0, -150];
const DOOR: [number, number] = [350, -150];
const LAMP_OFF = 'Lampe éteinte';
const DOOR_SHUT = 'Porte fermée';

function project(): Project {
  const pb = new ProjectBuilder('L’énergie de la station');
  playerBlueprint(pb);
  const lamp = pb.blueprint('BP_Lampe');
  lamp.component('StaticMesh', 'Pied', { shape: 'cylinder', sizeX: 40, sizeY: 40, color: '#6b7280', blocks: false });
  lamp.component('PointLight', 'Lumiere', { radius: 200, color: '#facc15' });
  const door = pb.blueprint('BP_Porte');
  door.component('StaticMesh', 'Porte', { shape: 'door', sizeX: 160, sizeY: 16, color: '#a0703c', blocks: false, yaw: 90 });
  pb.place(lamp, ...LAMP_A);
  pb.place(lamp, ...LAMP_B);
  pb.place(door, ...DOOR);
  pb.playerStart(0, 300);
  return pb.project;
}

/** The placed lamp at `at` (the learner may rename or re-place nothing: the lamps are given). */
const lampLabel = (cx: CheckContext, at: [number, number]) =>
  cx.sim.actors.find((a) => a.className === 'BP_Lampe' && Math.hypot(a.x - at[0], a.y - at[1]) < 60)?.label ?? '?';
const lit = (cx: CheckContext, at: [number, number]) => cx.component(lampLabel(cx, at), 'Lumiere')?.props.visible !== false;
const open = (cx: CheckContext) => Math.abs(Math.abs(cx.component('BP_Porte', 'Porte')?.props.yaw ?? 0) - 90) < 1;
const state = (cx: CheckContext) =>
  `lampe A ${lit(cx, LAMP_A) ? 'allumée' : 'éteinte'}, lampe B ${lit(cx, LAMP_B) ? 'allumée' : 'éteinte'}, porte ${open(cx) ? 'ouverte' : 'fermée'} ; « ${LAMP_OFF} » ${countPrints(cx, LAMP_OFF)} fois, « ${DOOR_SHUT} » ${countPrints(cx, DOOR_SHUT)} fois`;

/** The energy component: an Actor Component carried by both lamps' class and the door. */
function placed(cx: CheckContext): true | string {
  const p = cx.project;
  const comp = p.classes.find((c) => c.parent === 'ActorComponent');
  if (!comp || !isComponentClass(p, comp.name)) return 'Crée un Actor Component pour l’énergie (Content Drawer › + Add › Blueprint Class › Actor Component).';
  for (const name of ['BP_Lampe', 'BP_Porte']) if (!carries(p, name, comp.name)) return `${name} ne porte pas de ${comp.name} : Components › + Add.`;
  return true;
}

/** The lowest charge of the energy components (its first float variable), for « never below 0 ». */
function lowest(cx: CheckContext): number | undefined {
  const comp = cx.project.classes.find((c) => c.parent === 'ActorComponent');
  const v = comp?.variables.find((x) => x.type.category === 'float' || x.type.category === 'int');
  if (!comp || !v) return undefined;
  const values = cx.sim.actors.flatMap((a) => {
    const got = componentVar(cx, a.label, comp.name, v.name);
    return got === undefined ? [] : [Number(got)];
  });
  return values.length ? Math.min(...values) : undefined;
}

export const autonomyEnergy: Lesson = {
  id: 'a2-energie',
  code: 'A2',
  chain: { notion: 'actor-components', step: 'autonomy', after: { lesson: 't3-piege', days: 2 } },
  module: 'Composition',
  level: 'avance',
  number: 0,
  title: 'L’énergie de la station',
  situation:
    'Les générateurs sont coupés : les lampes et la porte du couloir tournent sur leur réserve, qui se vide toute seule. Quand la réserve d’un appareil est vide, il s’arrête, chacun à sa façon.',
  recalls: ['tick', 'dispatchers'],
  notions: ['Actor Component', 'Instance Editable', 'On … (Composant)', 'Event Tick'],
  remember:
    'Ce qui se répète d’un acteur à l’autre (une réserve qui se vide) s’écrit une fois, dans un Actor Component, réglé acteur par acteur. Ce qui diffère (s’éteindre, se fermer) reste dans chaque acteur, qui écoute son composant.',
  cards: [
    {
      title: 'Cahier des charges',
      body:
        'Deux **BP_Lampe** allumées (la lampe A à gauche, la lampe B au milieu) et une **BP_Porte** ouverte. Leurs graphes sont vides.\n\n' +
        '- Chaque appareil a une **réserve d’énergie** qui baisse de **1 par seconde**. Lampe A : **3**. Lampe B : **1**. Porte : **2**.\n' +
        '- La réserve ne passe **jamais sous 0**.\n' +
        '- Réserve vide : une lampe **s’éteint** et affiche « Lampe éteinte » ; la porte **se ferme** (Yaw 0) et affiche « Porte fermée ». **Une seule fois** chacun.\n' +
        '- Le code de la réserve s’écrit **une fois** ; BP_Lampe et BP_Porte n’ont pas d’Event Tick.',
    },
    {
      title: 'Comment t’y prendre',
      body:
        'Pas de liste de nœuds. Avant d’en poser un, réponds :\n\n' +
        '1. Qu’est-ce qui est pareil pour les trois appareils, et qu’est-ce qui change ?\n2. Où vit la réserve, et comment régler 3 et 1 sur deux lampes du même Blueprint ?\n3. Comment l’appareil apprend-il que sa réserve est vide, et une seule fois ?\n4. Comment le vérifier avec ▶ Play (Live Outliner, Debug) avant de toucher Vérifier ?\n\n' +
        'Les indices s’ouvrent après un premier essai.',
    },
    {
      title: 'Pourquoi quelques jours plus tard',
      body:
        'Cet exercice arrive deux jours après « Le piège qui blesse tout » : refaire de mémoire, après une pause, est ce qui fixe une notion. Si ça bloque, note ce qui manquait, c’est exactement ce qu’il faut revoir.',
    },
  ],
  objectives: ['Lampe B éteinte vers 1 s, porte fermée vers 2 s, lampe A éteinte vers 3 s.', 'Un seul message par appareil ; aucune réserve sous 0.', 'Pas d’Event Tick dans les lampes ni la porte.'],
  hints: [
    'Ce qui se vide est pareil pour tous : où l’écrire une fois ? Et chaque lampe posée a sa propre réserve : où la régler ?',
    'Un Actor Component : une Charge Instance Editable, Event Tick, Max (Float), un booléen ou un Do Once, un Event Dispatcher ; dans chaque acteur, On … (le composant), Set Visibility ou Set Relative Rotation, Print String.',
    'Solution : BP_Energie (Actor Component) : Charge (Float, Instance Editable), Vide (Boolean), OnVide. Event Tick → Branch (Vide) False → Set Charge = Max (Charge − Delta Seconds, 0) → Branch (Charge <= 0) → Set Vide (vrai) → Call OnVide. Lampes et porte : + Add › BP_Energie ; Charge 2 sur la porte, 3 et 1 sur les lampes posées (Details du niveau). On OnVide (BP_Energie) → Set Visibility (Lumiere, décoché) → Print « Lampe éteinte » ; porte : Set Relative Rotation (Yaw 0) → Print « Porte fermée ».',
  ],
  challenge: 'Un générateur de secours : quand le joueur entre dans sa zone, il recharge tout ce qui a un BP_Energie autour de lui (Get Overlapping Actors, Get Component by Class).',
  setup: project,
  scenario: [{ wait: 1.5 }, { checkpoint: 'un' }, { wait: 1 }, { checkpoint: 'deux' }, { wait: 1.2 }],
  checks: [
    { id: 'placed', label: 'Un Actor Component pour l’énergie, porté par les lampes et la porte', test: placed },
    {
      id: 'lamp-b',
      label: 'Vers 1 s, la lampe B s’éteint ; la lampe A et la porte tiennent',
      at: 'un',
      test: (cx) => (!lit(cx, LAMP_B) && lit(cx, LAMP_A) && open(cx) ? true : `À 1,5 s : ${state(cx)}.`),
    },
    {
      id: 'door',
      label: 'Vers 2 s, la porte se ferme ; la lampe A tient',
      at: 'deux',
      test: (cx) => (!open(cx) && lit(cx, LAMP_A) ? true : `À 2,5 s : ${state(cx)}.`),
    },
    {
      id: 'lamp-a',
      label: 'Vers 3 s, la lampe A s’éteint',
      test: (cx) => (!lit(cx, LAMP_A) ? true : `À 3,7 s : ${state(cx)}.`),
    },
    {
      id: 'once',
      label: 'Un seul message par appareil',
      test: (cx) => (countPrints(cx, LAMP_OFF) === 2 && countPrints(cx, DOOR_SHUT) === 1 ? true : `En fin de parcours : ${state(cx)}. Chaque appareil prévient une fois.`),
    },
    {
      id: 'floor',
      label: 'Aucune réserve sous 0',
      test: (cx) => {
        const v = lowest(cx);
        return v === undefined || v >= 0 ? true : `Une réserve est à ${Math.round(v * 10) / 10} : elle ne doit pas passer sous 0.`;
      },
    },
    notUsing('no-tick-lamp', 'BP_Lampe', ['event.tick'], 'BP_Lampe n’a pas d’Event Tick', 'BP_Lampe a un Event Tick : la réserve se vide dans le composant, écrit une fois.'),
    notUsing('no-tick-door', 'BP_Porte', ['event.tick'], 'BP_Porte n’a pas d’Event Tick', 'BP_Porte a un Event Tick : la réserve se vide dans le composant, écrit une fois.'),
    notion(usesNode('listen', 'BP_Lampe', ['event.componentDispatcher'], 'La lampe écoute son composant', 'Le composant prévient son acteur par un Event Dispatcher ; la lampe y réagit par On … (le composant).')),
    noRuntimeErrors(),
  ],
  solve(p) {
    const made = addClass(p, 'BP_Energie', 'ActorComponent');
    if (!made.ok) throw new Error(made.reason);
    const e = new ClassBuilder(made.value, p);
    const charge = e.variable('Charge', T.float, 5);
    made.value.variables.find((v) => v.id === charge)!.instanceEditable = true;
    const empty = e.variable('Vide', T.bool, false);
    const told = addDispatcher(made.value, 'OnVide').id;
    const tick = e.node('event.tick', {}, {}, [64, 96]);
    const done = e.node('flow.branch', {}, {}, [320, 96]);
    const sub = e.node('math.subtractFloat', {}, {}, [420, 360]);
    const floor = e.node('math.maxFloat', {}, { b: 0 }, [620, 360]);
    const set = e.node('var.set', { variable: charge }, {}, [640, 96]);
    const zero = e.node('math.lessEqualFloat', {}, { b: 0 }, [900, 300]);
    const now = e.node('flow.branch', {}, {}, [960, 96]);
    const mark = e.node('var.set', { variable: empty }, { value: true }, [1240, 96]);
    const call = e.node('dispatcher.call', { owner: made.value.id, dispatcher: told }, {}, [1520, 96]);
    e.link(tick, 'then', done, 'exec').link(e.node('var.get', { variable: empty }, {}, [120, 300]), 'value', done, 'condition');
    e.link(e.node('var.get', { variable: charge }, {}, [220, 420]), 'value', sub, 'a').link(tick, 'delta', sub, 'b').link(sub, 'result', floor, 'a').link(floor, 'result', set, 'value');
    e.link(done, 'false', set, 'exec').link(set, 'out', zero, 'a').link(zero, 'result', now, 'condition').link(set, 'then', now, 'exec');
    e.link(now, 'true', mark, 'exec').link(mark, 'then', call, 'exec');

    const lamp = edit(p, 'BP_Lampe');
    const lc = lamp.logic(e, 'BP_Energie');
    const lev = lamp.node('event.componentDispatcher', { component: lc, dispatcher: told }, {}, [64, 96]);
    const off = lamp.node('component.setVisibility', {}, { visible: false }, [400, 96]);
    lamp.link(lev, 'then', off, 'exec').target('Lumiere', off).link(off, 'then', lamp.node('debug.printString', {}, { text: LAMP_OFF }, [760, 96]), 'exec');

    const door = edit(p, 'BP_Porte');
    const dc = door.logic(e, 'BP_Energie', { [charge]: 2 });
    const dev = door.node('event.componentDispatcher', { component: dc, dispatcher: told }, {}, [64, 96]);
    const shut = door.node('component.setRelativeRotation', {}, { rotation: { x: 0, y: 0, z: 0 } }, [400, 96]);
    door.link(dev, 'then', shut, 'exec').target('Porte', shut).link(shut, 'then', door.node('debug.printString', {}, { text: DOOR_SHUT }, [760, 96]), 'exec');

    for (const a of levelOf(p).actors) {
      if (a.classId !== lamp.cls.id) continue;
      setComponentOverride(p, a.id, lc, charge, a.x === LAMP_A[0] ? 3 : 1);
    }
  },
};
