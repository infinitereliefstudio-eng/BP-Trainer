/**
 * V7.21, Actor Components, usage: « Interagir par composant ». After
 * « Regarder et interagir »: the player's E asks every actor in reach
 * whether it has a BP_Interaction, and calls it. The component prints its
 * own Action (set per carrier) and tells its actor by a dispatcher; each
 * actor reacts its own way. No interface to implement, no Cast.
 */
import type { Project } from '../../model/project';
import { addDispatcher } from '../../operations/classOps';
import { placeActor } from '../../operations/levelOps';
import { addClass } from '../../operations/projectOps';
import { T } from '../../types/pins';
import { ClassBuilder, edit, ProjectBuilder } from '../builder';
import { countPrints, noRuntimeErrors, notion, notUsing, usesNode } from '../checks';
import type { CheckContext, Lesson } from '../types';
import { carries, isComponentClass } from './health';
import { fnDef, goTo, tap } from './kit';
import { playerBlueprint } from './props';

const LAMP: [number, number] = [-450, 0];
const DOOR: [number, number] = [0, 0];
const CHEST: [number, number] = [450, 0];
const CRATE: [number, number] = [0, -380];
const START: [number, number] = [0, 380];
const SAY = { lamp: 'Basculer la lampe', door: 'Ouvrir la porte', chest: 'Fouiller le coffre' } as const;
const CARRIERS = ['BP_Lampe', 'BP_Porte', 'BP_Coffre'];

function project(): Project {
  const pb = new ProjectBuilder('Interagir par composant');
  playerBlueprint(pb);
  const zone = (b: ClassBuilder) => b.component('BoxCollision', 'Zone', { sizeX: 220, sizeY: 220 });

  const lamp = pb.blueprint('BP_Lampe');
  lamp.component('StaticMesh', 'Pied', { shape: 'cylinder', sizeX: 40, sizeY: 40, color: '#6b7280', blocks: false });
  lamp.component('PointLight', 'Lumiere', { visible: false, radius: 220, color: '#facc15' });
  zone(lamp);
  const door = pb.blueprint('BP_Porte');
  door.component('StaticMesh', 'Porte', { shape: 'door', sizeX: 160, sizeY: 16, color: '#a0703c', blocks: false });
  zone(door);
  const chest = pb.blueprint('BP_Coffre');
  chest.component('StaticMesh', 'Coffre', { sizeX: 90, sizeY: 60, color: '#92400e', blocks: false });
  chest.component('StaticMesh', 'Couvercle', { sizeX: 96, sizeY: 20, y: -30, color: '#b45309', blocks: false });
  zone(chest);
  const crate = pb.blueprint('BP_Caisse');
  crate.component('StaticMesh', 'Caisse', { sizeX: 70, sizeY: 70, color: '#a16207', blocks: false });
  zone(crate);

  pb.place(lamp, ...LAMP);
  pb.place(door, ...DOOR);
  pb.place(chest, ...CHEST);
  pb.place(crate, ...CRATE);
  pb.playerStart(...START);
  return pb.project;
}

const lampOn = (cx: CheckContext) => cx.component('BP_Lampe', 'Lumiere')?.props.visible === true;
const doorOpen = (cx: CheckContext) => Math.abs(Math.abs(cx.component('BP_Porte', 'Porte')?.props.yaw ?? 0) - 90) < 1;
const lidOff = (cx: CheckContext) => cx.component('BP_Coffre', 'Couvercle')?.props.visible === false;
const state = (cx: CheckContext) =>
  `lampe ${lampOn(cx) ? 'allumée' : 'éteinte'}, porte ${doorOpen(cx) ? 'ouverte' : 'fermée'}, couvercle ${lidOff(cx) ? 'enlevé' : 'en place'}`;
const said = (cx: CheckContext) => (Object.values(SAY) as string[]).map((t) => `« ${t} » ${countPrints(cx, t)}`).join(', ');

/** BP_Interaction exists, as an Actor Component, on the lamp, the door and the chest only. */
function placed(cx: CheckContext): true | string {
  const p = cx.project;
  if (!isComponentClass(p, 'BP_Interaction')) return 'Crée BP_Interaction, un Actor Component (Content Drawer › + Add › Blueprint Class › Actor Component).';
  for (const name of CARRIERS) if (!carries(p, name, 'BP_Interaction')) return `${name} ne porte pas de BP_Interaction : Components › + Add.`;
  for (const name of ['BP_Caisse', 'BP_Joueur']) if (carries(p, name, 'BP_Interaction')) return `${name} porte un BP_Interaction : seuls la lampe, la porte et le coffre réagissent à E.`;
  return true;
}

export const lessonComponentInteraction: Lesson = {
  id: 'l-interaction-composant',
  module: 'Interaction',
  level: 'avance',
  number: 0,
  title: 'Interagir par composant',
  situation:
    'Une lampe, une porte, un coffre et une caisse. E doit agir sur ce qui est à portée et sait réagir, chacun à sa façon ; la caisse, elle, ne fait rien. Cette fois, ni interface à implémenter, ni Cast : ce qui sait réagir porte un composant.',
  recalls: ['input', 'enhanced-input', 'loops'],
  notions: ['Actor Component', 'Get Component by Class', 'Is Valid', 'On … (Composant)', 'Instance Editable'],
  remember:
    'Le joueur ne demande pas « qu’es-tu ? » mais « as-tu un BP_Interaction ? » : Get Component by Class sur chaque acteur proche, puis Is Valid. Le composant fait la part commune (afficher son Action) et prévient son acteur, qui fait sa part à lui.',
  cards: [
    {
      title: 'Cahier des charges',
      body:
        'Déjà là : **BP_Lampe** (une Lumiere éteinte), **BP_Porte**, **BP_Coffre** (un Couvercle), **BP_Caisse**, chacun avec une **Zone**. **BP_Joueur** a un graphe vide.\n\n' +
        '- Crée **BP_Interaction**, un Actor Component : une variable **Action** (String, Instance Editable) et une fonction **Interagir** qui l’affiche puis **prévient l’acteur** (Event Dispatcher **OnInteragir**).\n' +
        '- Pose-le sur la lampe (Action « Basculer la lampe »), la porte (« Ouvrir la porte ») et le coffre (« Fouiller le coffre »). Pas sur la caisse.\n' +
        '- **E** : pour chaque acteur qui chevauche le joueur, s’il a un BP_Interaction, appelle son Interagir. Rien pour les autres, sans erreur.\n' +
        '- Chacun réagit à sa façon : la lampe **bascule** sa Lumiere, la porte **s’ouvre** (Set Relative Rotation, Yaw 90), le coffre **cache son Couvercle**.\n' +
        '- BP_Joueur ne fait **aucun Cast**.',
    },
    {
      title: 'Interface ou composant ?',
      body:
        'Dans « Regarder et interagir », chaque objet implémentait **BPI_Interactif** et écrivait toute sa réaction. Ce qui est **pareil pour tous** (afficher l’action, plus tard jouer un son, refuser si c’est verrouillé…) était alors à recopier dans chacun.\n\n' +
        'Avec un composant, ce code commun s’écrit **une fois** dans BP_Interaction ; l’acteur n’ajoute que ce qui lui est propre, par **On OnInteragir (BP_Interaction)** (le **+** vert des Details du composant). Les deux se rencontrent dans UE : une interface quand chacun fait tout à sa façon, un composant quand il y a une part commune.',
    },
    {
      title: 'Le plan',
      body:
        '1. **BP_Interaction** : Action (String, Instance Editable), Event Dispatcher **OnInteragir**, fonction **Interagir** : Print String (Action) → **Call OnInteragir**.\n' +
        '2. Lampe, porte, coffre : **+ Add › BP_Interaction**, et leur Action dans les Details du composant.\n' +
        '3. BP_Joueur : **IA_Interagir** (Started) → **Get Overlapping Actors** → **For Each Loop** → **Get Component by Class** (Target = Array Element, Component Class = BP_Interaction) → **Is Valid** → **Interagir** (Target = le composant trouvé).\n' +
        '4. Lampe : **On OnInteragir (BP_Interaction)** → Toggle Visibility (Lumiere). Porte : → Set Relative Rotation (Porte, Yaw 90). Coffre : → Set Visibility (Couvercle, décoché).',
    },
  ],
  objectives: [
    'BP_Interaction, un Actor Component, est sur la lampe, la porte et le coffre.',
    'E bascule la lampe (deux fois : allumée puis éteinte), ouvre la porte, ouvre le coffre ; chacun affiche son Action.',
    'Près de la caisse, E ne fait rien, sans erreur.',
    'BP_Joueur ne fait aucun Cast.',
  ],
  hints: [
    'Qu’ont en commun la lampe, la porte et le coffre, que la caisse n’a pas ? Comment le joueur peut-il le demander à chaque acteur proche, sans savoir ce qu’il est ?',
    'Actor Component, Event Dispatcher, Get Overlapping Actors, For Each Loop, Get Component by Class, Is Valid, On OnInteragir (BP_Interaction), Toggle Visibility, Set Relative Rotation, Set Visibility.',
    'Solution : BP_Interaction : Interagir = Print String (Action) → Call OnInteragir. BP_Joueur : IA_Interagir (Started) → Get Overlapping Actors → For Each Loop → Get Component by Class (Array Element, BP_Interaction) → Is Valid → Interagir. Chaque acteur : On OnInteragir (BP_Interaction) → sa réaction.',
  ],
  challenge: 'Ajoute à BP_Interaction un booléen Verrouille (Instance Editable) : verrouillé, Interagir affiche « Verrouillé » et ne prévient pas l’acteur. Une seule modification, et tout ce qui s’utilise peut être verrouillé.',
  setup: project,
  scenario: [
    { wait: 0.2 },
    ...goTo(...LAMP),
    ...tap('E'),
    { checkpoint: 'lampe' },
    ...tap('E'),
    { checkpoint: 'lampe-2' },
    ...goTo(...DOOR),
    ...tap('E'),
    { checkpoint: 'porte' },
    ...goTo(...CHEST),
    ...tap('E'),
    { checkpoint: 'coffre' },
    ...goTo(...CRATE),
    ...tap('E'),
    { wait: 0.2 },
  ],
  checks: [
    { id: 'placed', label: 'BP_Interaction, un Actor Component, est sur la lampe, la porte et le coffre', test: placed },
    {
      id: 'lamp',
      label: 'Près de la lampe, E l’allume, et elle seule ; « Basculer la lampe » s’affiche',
      at: 'lampe',
      test: (cx) =>
        lampOn(cx) && !doorOpen(cx) && !lidOff(cx) && countPrints(cx, SAY.lamp) === 1 ? true : `Après E près de la lampe : ${state(cx)} ; ${said(cx)}.`,
    },
    {
      id: 'lamp-off',
      label: 'Un second E l’éteint',
      at: 'lampe-2',
      test: (cx) => (!lampOn(cx) && countPrints(cx, SAY.lamp) === 2 ? true : `Après un second E près de la lampe : ${state(cx)} ; ${said(cx)}. Elle doit basculer (Toggle Visibility).`),
    },
    {
      id: 'door',
      label: 'Près de la porte, E l’ouvre ; « Ouvrir la porte »',
      at: 'porte',
      test: (cx) => (doorOpen(cx) && countPrints(cx, SAY.door) === 1 && !lampOn(cx) ? true : `Après E près de la porte : ${state(cx)} ; ${said(cx)}.`),
    },
    {
      id: 'chest',
      label: 'Près du coffre, E enlève le Couvercle ; « Fouiller le coffre »',
      at: 'coffre',
      test: (cx) => (lidOff(cx) && countPrints(cx, SAY.chest) === 1 ? true : `Après E près du coffre : ${state(cx)} ; ${said(cx)}.`),
    },
    {
      id: 'crate',
      label: 'Près de la caisse, E ne fait rien',
      test: (cx) => {
        const total = (Object.values(SAY) as string[]).reduce((n, t) => n + countPrints(cx, t), 0);
        return total === 4 && !lampOn(cx) ? true : `En fin de parcours : ${said(cx)} ; ${state(cx)}. Près de la caisse, rien ne doit s’afficher.`;
      },
    },
    notUsing('no-cast', 'BP_Joueur', ['cast.to'], 'BP_Joueur ne fait aucun Cast', 'BP_Joueur fait un Cast : demande à chaque acteur s’il a un BP_Interaction (Get Component by Class).'),
    notion(usesNode('find', 'BP_Joueur', ['actor.getComponentByClass', 'actor.getComponentsByClass'], 'Le joueur cherche le composant BP_Interaction', 'Utilise Get Component by Class sur chaque acteur proche.')),
    noRuntimeErrors(),
  ],
  robustness: [
    {
      id: 'terminal',
      label: 'un terminal reçoit aussi un BP_Interaction',
      mutate: (p) => {
        const comp = p.classes.find((c) => c.name === 'BP_Interaction');
        const action = comp?.variables.find((v) => v.name === 'Action');
        const made = addClass(p, 'BP_Terminal', 'Actor');
        if (!comp || !action || !made.ok) return;
        const b = new ClassBuilder(made.value, p);
        b.component('StaticMesh', 'Ecran', { sizeX: 90, sizeY: 50, color: '#0f766e', blocks: false });
        b.component('BoxCollision', 'Zone', { sizeX: 220, sizeY: 220 });
        b.logic(new ClassBuilder(comp, p), 'BP_Interaction', { [action.id]: 'Lire le terminal' });
        placeActor(p, made.value.id, -450, -380);
      },
      scenario: [{ wait: 0.2 }, ...goTo(-450, -380), ...tap('E'), { wait: 0.2 }],
      checks: [
        {
          id: 'terminal-said',
          label: 'E près du terminal affiche « Lire le terminal », sans toucher au joueur',
          test: (cx) => (countPrints(cx, 'Lire le terminal') === 1 ? true : `« Lire le terminal » s’affiche ${countPrints(cx, 'Lire le terminal')} fois.`),
        },
      ],
      advice: 'Le joueur doit chercher BP_Interaction sur tout acteur proche, quel qu’il soit, et Interagir doit afficher l’Action du composant (sa variable, pas un texte fixe).',
    },
  ],
  solve(p) {
    const made = addClass(p, 'BP_Interaction', 'ActorComponent');
    if (!made.ok) throw new Error(made.reason);
    const comp = new ClassBuilder(made.value, p);
    const action = comp.variable('Action', T.string, 'Interagir');
    made.value.variables.find((v) => v.id === action)!.instanceEditable = true;
    const told = addDispatcher(made.value, 'OnInteragir').id;
    const use = fnDef(p, comp, 'Interagir', [], []);
    const print = use.f.node('debug.printString', {}, {}, [360, 96]);
    const call = use.f.node('dispatcher.call', { owner: made.value.id, dispatcher: told }, {}, [700, 96]);
    use.f.link(use.entry, 'then', print, 'exec').link(use.f.node('var.get', { variable: action }, {}, [120, 300]), 'value', print, 'text').link(print, 'then', call, 'exec');

    const player = edit(p, 'BP_Joueur');
    const e = player.node('event.inputKey', { key: 'E' }, {}, [64, 96]);
    const over = player.node('actor.getOverlappingActors', {}, {}, [340, 96]);
    const loop = player.node('flow.forEachLoop', {}, {}, [660, 96]);
    const find = player.node('actor.getComponentByClass', {}, { componentClass: made.value.id }, [900, 320]);
    const valid = player.node('flow.isValid', {}, {}, [1180, 96]);
    const run = player.node('call.function', { owner: made.value.id, graph: use.graph.id }, {}, [1480, 96]);
    player.link(e, 'pressed', over, 'exec').link(over, 'then', loop, 'exec').link(over, 'actors', loop, 'array');
    player.link(loop, 'element', find, 'target').link(loop, 'body', valid, 'exec').link(find, 'result', valid, 'object');
    player.link(valid, 'valid', run, 'exec').link(find, 'result', run, 'target');

    const react: [string, string, (b: ClassBuilder, ev: string) => void][] = [
      [
        'BP_Lampe',
        SAY.lamp,
        (b, ev) => {
          const t = b.node('component.toggleVisibility', {}, {}, [400, 96]);
          b.link(ev, 'then', t, 'exec').target('Lumiere', t);
        },
      ],
      [
        'BP_Porte',
        SAY.door,
        (b, ev) => {
          const r = b.node('component.setRelativeRotation', {}, { rotation: { x: 0, y: 0, z: 90 } }, [400, 96]);
          b.link(ev, 'then', r, 'exec').target('Porte', r);
        },
      ],
      [
        'BP_Coffre',
        SAY.chest,
        (b, ev) => {
          const h = b.node('component.setVisibility', {}, { visible: false }, [400, 96]);
          b.link(ev, 'then', h, 'exec').target('Couvercle', h);
        },
      ],
    ];
    for (const [name, text, how] of react) {
      const b = edit(p, name);
      const id = b.logic(comp, 'BP_Interaction', { [action]: text });
      how(b, b.node('event.componentDispatcher', { component: id, dispatcher: told }, {}, [64, 96]));
    }
  },
};
