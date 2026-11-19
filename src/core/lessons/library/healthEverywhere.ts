/**
 * V7.20, Actor Components, guided rung: Refactor R5 « La santé est
 * partout ». A crate, a drone and a turret each copy the same health logic
 * (a Vie, an overlap that lowers it, destruction at 0). The learner writes
 * it once, in an Actor Component BP_Sante, adds it to the three, and keeps
 * in each actor only what is its own: how much life it has, how it dies.
 */
import type { Project } from '../../model/project';
import { removeVariable } from '../../operations/classOps';
import { addClass } from '../../operations/projectOps';
import { T } from '../../types/pins';
import { ClassBuilder, edit, ProjectBuilder } from '../builder';
import { noRuntimeErrors, notion } from '../checks';
import type { CheckContext, Lesson } from '../types';
import { carries, isComponentClass, writeHealth } from './health';
import { goTo, wipe } from './kit';

/** The three actors, their life, where they stand and the colour of their body. */
const ACTORS: { name: string; label: string; dead: string; life: number; at: [number, number]; color: string; shape: 'cube' | 'cylinder' }[] = [
  { name: 'BP_Caisse', label: 'la caisse', dead: 'détruite', life: 40, at: [-350, 0], color: '#a16207', shape: 'cube' },
  { name: 'BP_Drone', label: 'le drone', dead: 'détruit', life: 80, at: [0, 0], color: '#0ea5e9', shape: 'cylinder' },
  { name: 'BP_Tourelle', label: 'la tourelle', dead: 'détruite', life: 120, at: [350, 0], color: '#64748b', shape: 'cylinder' },
];
/** « La caisse est détruite », « Le drone est détruit »… */
const deathText = (a: (typeof ACTORS)[number]) => `${a.label[0].toUpperCase()}${a.label.slice(1)} est ${a.dead}`;
const HIT = 40;
const OUT: [number, number] = [0, 320];

/** The copied logic: Vie, ActorBeginOverlap → Vie − 40 → Branch (Vie <= 0) → « … détruit » → Destroy Actor. */
function copied(b: ClassBuilder, life: number, text: string): void {
  const vie = b.variable('Vie', T.int, life);
  const ev = b.node('event.actorBeginOverlap', {}, {}, [64, 96]);
  const sub = b.node('math.subtractInt', {}, { b: HIT }, [260, 320]);
  const set = b.node('var.set', { variable: vie }, {}, [380, 96]);
  const le = b.node('math.lessEqualInt', {}, {}, [600, 320]);
  const branch = b.node('flow.branch', {}, {}, [700, 96]);
  const say = b.node('debug.printString', {}, { text }, [1000, 60]);
  const kill = b.node('actor.destroy', {}, {}, [1300, 60]);
  b.link(b.node('var.get', { variable: vie }, {}, [64, 320]), 'value', sub, 'a').link(sub, 'result', set, 'value');
  b.link(ev, 'then', set, 'exec').link(set, 'out', le, 'a').link(le, 'result', branch, 'condition').link(set, 'then', branch, 'exec');
  b.link(branch, 'true', say, 'exec').link(say, 'then', kill, 'exec');
}

function project(): Project {
  const pb = new ProjectBuilder('La santé est partout');
  for (const a of ACTORS) {
    const b = pb.blueprint(a.name);
    b.component('StaticMesh', 'Corps', { shape: a.shape, sizeX: 90, sizeY: 90, color: a.color, blocks: false });
    b.component('BoxCollision', 'Zone', { sizeX: 160, sizeY: 160 });
    copied(b, a.life, deathText(a));
    pb.place(b, ...a.at);
  }
  pb.playerStart(...OUT);
  return pb.project;
}

const alive = (cx: CheckContext, name: string) => !!cx.actor(name);
const state = (cx: CheckContext) => ACTORS.map((a) => `${a.label} ${alive(cx, a.name) ? 'debout' : a.dead}`).join(', ');
const pass = (at: [number, number]) => [...goTo(...at), ...goTo(...OUT)];

/** The refactor's constraint: the rule lives in one Actor Component, carried by the three. */
function writtenOnce(cx: CheckContext): true | string {
  if (!isComponentClass(cx.project, 'BP_Sante')) return 'Crée BP_Sante : Content Drawer › + Add › Blueprint Class › Actor Component.';
  for (const a of ACTORS) {
    if (!carries(cx.project, a.name, 'BP_Sante')) return `${a.name} ne porte pas de BP_Sante : Components › + Add › BP_Sante.`;
    const cls = cx.project.classes.find((c) => c.name === a.name)!;
    if (cls.variables.some((v) => v.name === 'Vie')) return `${a.name} a encore sa propre variable Vie : la vie est dans BP_Sante, réglée dans les Details du composant.`;
    if (cx.nodes(a.name).some((n) => n.def === 'math.subtractInt' || n.def === 'math.subtractFloat')) {
      return `${a.name} retire encore la vie lui-même : la soustraction s’écrit une seule fois, dans BP_Sante.`;
    }
  }
  return true;
}

export const refactor5: Lesson = {
  id: 'r5-sante-partout',
  kind: 'refactor',
  code: 'R5',
  module: 'Composition',
  level: 'avance',
  number: 0,
  title: 'La santé est partout',
  situation:
    'La caisse, le drone et la tourelle ont chacun recopié la même santé : une Vie, un passage qui en retire 40, la destruction à 0. Ils ne sont pas de la même famille. Écris la santé une seule fois, dans un Actor Component, et donne-le aux trois.',
  chain: { notion: 'actor-components', step: 'guided' },
  recalls: ['functions', 'dispatchers'],
  notions: ['Actor Component', 'Parent ou composant', 'On … (Composant)', 'Refactor'],
  remember:
    'Une logique que des acteurs sans lien de parenté partagent va dans un Actor Component : écrite une fois, chacun en a sa copie, réglée dans les Details du composant. L’acteur ne garde que ce qui lui est propre, comme sa façon de réagir à OnMort.',
  cards: [
    {
      title: 'Ce qui est en place',
      body:
        '**BP_Caisse** (Vie 40), **BP_Drone** (Vie 80) et **BP_Tourelle** (Vie 120) ont chacun : un Corps, une Zone, une variable **Vie**, et le même graphe : **ActorBeginOverlap** → Set Vie = Vie − 40 → **Branch** (Vie <= 0) → Print « … est détruit(e) » → **Destroy Actor**.\n\n' +
        'Chaque passage du joueur dans une Zone retire 40. Lance Play et traverse-les : tout marche.',
    },
    {
      title: 'Ce qui cloche',
      body:
        'Trois copies de la même règle. Si les dégâts doivent un jour tenir compte d’une armure, il faudra la corriger à trois endroits, et un quatrième objet en demanderait une quatrième.\n\n' +
        'Un **parent commun** ne convient pas : une caisse, un drone et une tourelle ne sont pas « une sorte de » la même chose, et chacun pourrait déjà avoir son propre parent. Ce qu’ils partagent, c’est d’**avoir** une santé.',
    },
    {
      title: 'Le cahier des charges',
      body:
        '- Crée **BP_Sante**, un **Actor Component** (Content Drawer › + Add › Blueprint Class › Actor Component). Il garde la **Vie** (Instance Editable), la retire, et prévient son acteur quand elle tombe à 0.\n' +
        '- Ajoute-le aux trois (Components › + Add). Chacun garde **sa** vie : 40, 80, 120, réglée dans les Details du composant.\n' +
        '- Chaque passage retire toujours 40 ; à 0, l’acteur affiche son message et disparaît.\n' +
        '- **Plus aucun des trois n’a de variable Vie ni ne fait la soustraction** : la règle s’écrit une fois.',
    },
    {
      title: 'La réécriture',
      body:
        '1. **BP_Sante** : variable **Vie** (Integer, Instance Editable), Event Dispatcher **OnMort**, fonction **InfligerDegats** (entrée Montant) : Set Vie = Vie − Montant → Branch (Vie <= 0) → **Call OnMort**.\n' +
        '2. Dans chaque acteur : Components › + Add › BP_Sante. Dans ses Details, règle Vie.\n' +
        '3. **ActorBeginOverlap** → **InfligerDegats** (Target = le composant, Montant 40).\n' +
        '4. Le **+** vert de l’Event OnMort, dans les Details du composant, ajoute **On OnMort (BP_Sante)** : → Print → Destroy Actor.\n' +
        '5. Supprime l’ancienne variable Vie et l’ancienne chaîne de chaque acteur.',
    },
  ],
  objectives: [
    'Crée l’Actor Component BP_Sante et ajoute-le aux trois acteurs.',
    'Chacun garde sa vie : 40, 80, 120 ; chaque passage retire 40.',
    'La caisse disparaît au premier passage, le drone au deuxième, la tourelle au troisième.',
    'Plus aucun des trois n’a de variable Vie ni de soustraction.',
  ],
  hints: [
    'Qu’est-ce qui est pareil dans les trois graphes, et qu’est-ce qui change d’un acteur à l’autre ? Où ranger ce qui est pareil, sans changer la classe parente de personne ?',
    'Actor Component BP_Sante ; variable Vie (Instance Editable) ; Event Dispatcher OnMort ; fonction InfligerDegats (Montant) ; Subtract, Less Equal, Branch, Call OnMort ; dans les acteurs : Get du composant, InfligerDegats, On OnMort (BP_Sante), Destroy Actor.',
    'Solution : BP_Sante : InfligerDegats(Montant) → Set Vie = Vie − Montant → Branch (Vie <= 0) → Call OnMort. Chaque acteur porte BP_Sante (Vie 40, 80 ou 120 dans ses Details) : ActorBeginOverlap → InfligerDegats (Target = BP_Sante, Montant 40) ; On OnMort (BP_Sante) → Print « … est détruit(e) » → Destroy Actor. Leurs variables Vie et leurs anciennes chaînes sont supprimées.',
  ],
  challenge: 'Ajoute à BP_Sante une variable Armure (Instance Editable) retirée de chaque coup, et donne 20 d’armure à la tourelle : une seule modification, et les trois en profitent.',
  setup: project,
  scenario: [
    { wait: 0.2 },
    ...pass(ACTORS[0].at),
    ...pass(ACTORS[1].at),
    ...pass(ACTORS[2].at),
    { checkpoint: 'un' },
    ...pass(ACTORS[1].at),
    { checkpoint: 'deux' },
    ...pass(ACTORS[2].at),
    ...pass(ACTORS[2].at),
  ],
  checks: [
    { id: 'once', label: 'La santé est écrite une fois, dans l’Actor Component BP_Sante, porté par les trois', test: writtenOnce },
    {
      id: 'first',
      label: 'Un passage chacun : la caisse disparaît, le drone et la tourelle tiennent',
      at: 'un',
      test: (cx) => (!alive(cx, 'BP_Caisse') && alive(cx, 'BP_Drone') && alive(cx, 'BP_Tourelle') ? true : `Après un passage dans chaque zone : ${state(cx)}.`),
    },
    {
      id: 'second',
      label: 'Au deuxième passage, le drone disparaît, la tourelle tient',
      at: 'deux',
      test: (cx) => (!alive(cx, 'BP_Drone') && alive(cx, 'BP_Tourelle') ? true : `Après le deuxième passage dans le drone : ${state(cx)}. Chacun doit garder sa propre vie.`),
    },
    {
      id: 'third',
      label: 'Au troisième passage, la tourelle disparaît',
      test: (cx) => (!alive(cx, 'BP_Tourelle') ? true : `La tourelle tient encore après trois passages : sa vie doit être 120, et chaque passage retirer 40.`),
    },
    notion({
      id: 'event',
      label: 'Chaque acteur réagit à OnMort de son composant',
      test: (cx) => {
        const missing = ACTORS.filter((a) => !cx.nodes(a.name).some((n) => n.def === 'event.componentDispatcher' || n.def === 'dispatcher.bind'));
        return missing.length ? `${missing.map((a) => a.name).join(', ')} : ajoute On OnMort (BP_Sante) depuis les Details du composant.` : true;
      },
    }),
    noRuntimeErrors(),
  ],
  solve(p) {
    const made = addClass(p, 'BP_Sante', 'ActorComponent');
    if (!made.ok) throw new Error(made.reason);
    const health = writeHealth(new ClassBuilder(made.value, p), p, 100);
    for (const a of ACTORS) {
      const b = edit(p, a.name);
      wipe(b.graph);
      removeVariable(b.cls, b.cls.variables.find((v) => v.name === 'Vie')!.id);
      const comp = b.logic(health.b, 'BP_Sante', { [health.vie]: a.life });
      const ev = b.node('event.actorBeginOverlap', {}, {}, [64, 96]);
      const call = b.node('call.function', { owner: made.value.id, graph: health.hit.graph.id }, { [health.hit.pin.Montant]: HIT }, [400, 96]);
      b.link(ev, 'then', call, 'exec').link(b.node('var.component', { component: comp }, {}, [220, 300]), 'value', call, 'target');
      const dead = b.node('event.componentDispatcher', { component: comp, dispatcher: health.mort }, {}, [64, 480]);
      const say = b.node('debug.printString', {}, { text: deathText(a) }, [400, 480]);
      b.link(dead, 'then', say, 'exec').link(say, 'then', b.node('actor.destroy', {}, {}, [700, 480]), 'exec');
    }
  },
};
