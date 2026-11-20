/**
 * V7.21, Actor Components, usage: Débogue D23 « La batterie qui ne sait pas
 * où elle est ». The drain of a battery was moved out of the drone into an
 * Actor Component, BP_Batterie, carried by a drone and a robot. It no
 * longer compiles: Get Distance To, its Target left empty, means self, and
 * self is now the component, which has no place in the world. The fix is
 * Get Owner. A component works for its actor: where it is, is where its
 * actor is.
 */
import type { Project } from '../../model/project';
import { T } from '../../types/pins';
import { ProjectBuilder } from '../builder';
import { noRuntimeErrors, notion, usesNode } from '../checks';
import type { CheckContext, Lesson } from '../types';
import { classBuilder, componentVar } from './health';
import { DEBUG_METHOD, nodeOf } from './kit';
import { playerBlueprint } from './props';
import { levelOf } from '../../model/project';

const CHARGER: [number, number] = [0, 0];
const RANGE = 300;
const DRAIN = 10;

function project(): Project {
  const pb = new ProjectBuilder('La batterie qui ne sait pas où elle est');
  playerBlueprint(pb);
  const charger = pb.blueprint('BP_Chargeur');
  charger.component('StaticMesh', 'Socle', { shape: 'cylinder', sizeX: 120, sizeY: 120, color: '#15803d', blocks: false });

  const battery = pb.blueprint('BP_Batterie', 'ActorComponent');
  const charge = battery.variable('Charge', T.float, 100);
  // Event Tick → Get Actor Of Class (BP_Chargeur) → (Get Distance To the charger > 300) → Charge = Charge − 10 × Delta Seconds. Target left empty: self.
  const tick = battery.node('event.tick', {}, {}, [64, 96]);
  const find = battery.node('actor.getOfClass', {}, { class: charger.cls.id }, [300, 96]);
  const dist = battery.node('actor.distanceTo', {}, {}, [520, 300]);
  const far = battery.node('math.greaterFloat', {}, { b: RANGE }, [740, 300]);
  const branch = battery.node('flow.branch', {}, {}, [900, 96]);
  const per = battery.node('math.multiplyFloat', {}, { b: DRAIN }, [960, 460]);
  const sub = battery.node('math.subtractFloat', {}, {}, [1160, 360]);
  const set = battery.node('var.set', { variable: charge }, {}, [1300, 96]);
  battery
    .link(find, 'result', dist, 'other')
    .link(dist, 'result', far, 'a')
    .link(far, 'result', branch, 'condition')
    .link(tick, 'then', find, 'exec')
    .link(find, 'then', branch, 'exec')
    .link(tick, 'delta', per, 'a')
    .link(battery.node('var.get', { variable: charge }, {}, [960, 300]), 'value', sub, 'a')
    .link(per, 'result', sub, 'b')
    .link(sub, 'result', set, 'value')
    .link(branch, 'true', set, 'exec');

  const carrier = (name: string, color: string) => {
    const b = pb.blueprint(name);
    b.component('StaticMesh', 'Corps', { sizeX: 70, sizeY: 70, color, blocks: false });
    b.logic(battery, 'BP_Batterie');
    return b;
  };
  pb.place(charger, ...CHARGER);
  pb.place(carrier('BP_Drone', '#0ea5e9'), 120, 0);
  pb.place(carrier('BP_Robot', '#f97316'), 800, 0);
  pb.playerStart(0, 420);
  return pb.project;
}

const chargeOf = (cx: CheckContext, label: string) => {
  const v = componentVar(cx, label, 'BP_Batterie', 'Charge');
  return v === undefined ? undefined : Number(v);
};
const fmt = (v: number | undefined) => (v === undefined ? '?' : String(Math.round(v * 10) / 10));
const state = (cx: CheckContext) => `drone ${fmt(chargeOf(cx, 'BP_Drone'))}, robot ${fmt(chargeOf(cx, 'BP_Robot'))}`;

export const debug23: Lesson = {
  id: 'd23-batterie',
  kind: 'debug',
  code: 'D23',
  module: 'Composition',
  level: 'avance',
  number: 0,
  title: 'La batterie qui ne sait pas où elle est',
  situation:
    'La batterie du drone se vidait loin du chargeur. Pour la donner aussi au robot, son graphe a été déplacé dans un Actor Component, BP_Batterie. Depuis, plus rien ne compile. Trouve pourquoi et corrige.',
  notions: ['Get Owner', 'Actor Component', 'Event Tick'],
  remember:
    'Dans un Actor Component, self est le composant, pas l’acteur : il n’a ni position ni forme. Un nœud d’acteur dont la Target est vide ne compile pas ; on lui donne Get Owner, l’acteur qui porte le composant.',
  cards: [
    {
      title: 'Ce qui est en place',
      body:
        '**BP_Batterie**, un Actor Component, a une **Charge** (100). Son **Event Tick** : **Get Actor Of Class** (BP_Chargeur), puis, si **Get Distance To** (Other Actor = le chargeur trouvé) dépasse **300**, la Charge baisse de **10 par seconde** (× Delta Seconds).\n\n' +
        'Ce graphe était dans BP_Drone ; il a été déplacé tel quel. **BP_Drone** (à côté du chargeur) et **BP_Robot** (loin) portent chacun un BP_Batterie.',
    },
    {
      title: 'Ce qu’on attend',
      body: '- Tout compile.\n- Au bout de 2 secondes : le drone, près du chargeur, est toujours à **100** ; le robot, loin, est descendu vers **80**.\n- Aucune erreur dans l’Output Log.',
    },
    DEBUG_METHOD,
  ],
  objectives: ['Compile et lis l’erreur : quel nœud, quelle pin ?', 'Corrige BP_Batterie : le drone reste à 100, le robot descend vers 80 en 2 secondes.', 'Plus aucune erreur.'],
  hints: [
    'Quand la Target d’un nœud est vide, de qui parle-t-il ? Dans BP_Drone, c’était le drone. Et dans BP_Batterie ?',
    'Get Owner.',
    'Solution : dans BP_Batterie, relie Get Owner à la Target de Get Distance To. La distance est alors celle de l’acteur qui porte la batterie.',
  ],
  challenge: 'À 0, la batterie devrait prévenir son acteur (Event Dispatcher OnVide), une seule fois, et la Charge ne jamais passer sous 0 (Clamp).',
  setup: project,
  scenario: [{ wait: 2 }],
  checks: [
    {
      id: 'drone',
      label: 'Le drone, près du chargeur, reste à 100',
      test: (cx) => (chargeOf(cx, 'BP_Drone') === 100 ? true : `Au bout de 2 s : ${state(cx)}. Le drone est à côté du chargeur, il ne devrait rien perdre.`),
    },
    {
      id: 'robot',
      label: 'Le robot, loin du chargeur, descend vers 80 en 2 s',
      test: (cx) => {
        const v = chargeOf(cx, 'BP_Robot') ?? 100;
        return v > 75 && v < 85 ? true : `Au bout de 2 s : ${state(cx)}. Le robot est loin du chargeur : 10 par seconde, il devrait être vers 80.`;
      },
    },
    notion(usesNode('owner', 'BP_Batterie', ['component.getOwner'], 'La batterie mesure la distance de son Owner', 'Relie Get Owner à la Target de Get Distance To.')),
    noRuntimeErrors(),
  ],
  robustness: [
    {
      id: 'charger-moved',
      label: 'le chargeur est déplacé près du robot',
      mutate: (p) => {
        const cls = p.classes.find((c) => c.name === 'BP_Chargeur');
        const a = levelOf(p).actors.find((x) => x.classId === cls?.id);
        if (a) a.x = 800;
      },
      scenario: [{ wait: 2 }],
      checks: [
        {
          id: 'swapped',
          label: 'le robot reste à 100, le drone se vide',
          test: (cx) => ((chargeOf(cx, 'BP_Robot') ?? 0) === 100 && (chargeOf(cx, 'BP_Drone') ?? 100) < 85 ? true : `Au bout de 2 s : ${state(cx)}.`),
        },
      ],
      advice: 'La distance doit être celle de l’acteur qui porte la batterie (Get Owner), pas d’un acteur choisi à l’avance.',
    },
  ],
  solve(p) {
    const b = classBuilder(p, 'BP_Batterie');
    const dist = nodeOf(b.graph, 'actor.distanceTo');
    b.link(b.node('component.getOwner', {}, {}, [120, 300]), 'result', dist, 'target');
  },
};
