/**
 * Lot 2b of the path plan: « Une valeur par lampe ». The guided rung of
 * Instance Editable: one Blueprint, three lamps, a value set per lamp in
 * the level's Details.
 */
import type { Project } from '../../model/project';
import { T } from '../../types/pins';
import { edit, ProjectBuilder } from '../builder';
import { noRuntimeErrors, notion } from '../checks';
import type { Check, CheckContext, Lesson } from '../types';
import { levelOf } from '../../model/project';

/** The lamps' places, left to right: the first and the last must start lit. */
const LAMPS = [-250, 0, 250];
const LIT = [true, false, true];

function lampsProject(): Project {
  const pb = new ProjectBuilder('Une valeur par lampe');
  const lamp = pb.blueprint('BP_Lampe');
  lamp.component('StaticMesh', 'Pied', { shape: 'cylinder', sizeX: 40, sizeY: 40, color: '#6b7280' });
  lamp.component('PointLight', 'Lumiere', { visible: false, radius: 200 });
  for (const x of LAMPS) pb.place(lamp, x, -150);
  pb.playerStart(-400, 150);
  return pb.project;
}

/** Is the lamp placed at `x` lit, during Play? */
function litAt(cx: CheckContext, x: number): boolean | undefined {
  const cls = cx.project.classes.find((c) => c.name === 'BP_Lampe');
  const a = cx.sim.actors.find((k) => k.classId === cls?.id && Math.abs(k.x - x) < 1);
  return a?.components.find((c) => c.name === 'Lumiere')?.props.visible;
}

const NAMES = ['de gauche', 'du milieu', 'de droite'];

const checks: Check[] = [
  ...LAMPS.map(
    (x, i): Check => ({
      id: `lamp-${i}`,
      label: `La lampe ${NAMES[i]} est ${LIT[i] ? 'allumée' : 'éteinte'} au lancement`,
      test: (cx) => (litAt(cx, x) === LIT[i] ? true : `La lampe ${NAMES[i]} est ${LIT[i] ? 'éteinte' : 'allumée'} au lancement.`),
    }),
  ),
  notion({
    id: 'per-instance',
    label: 'Le choix vient d’une variable Instance Editable, réglée lampe par lampe',
    test: (cx) => {
      const cls = cx.project.classes.find((c) => c.name === 'BP_Lampe');
      const v = cls?.variables.find((k) => k.instanceEditable);
      if (!v) return 'Crée une variable Boolean dans BP_Lampe et coche Instance Editable (l’œil) : chaque lampe posée pourra avoir sa valeur.';
      const values = levelOf(cx.project).actors.filter((a) => a.classId === cls?.id).map((a) => a.overrides[v.id] ?? v.defaultValue);
      return new Set(values.map(String)).size > 1 ? true : `Toutes les lampes ont la même valeur de ${v.name}. Règle-la dans le niveau, lampe par lampe (Details de l’instance).`;
    },
  }),
  noRuntimeErrors(),
];

export const lessonPerLamp: Lesson = {
  id: 'l-valeur-lampe',
  module: 'Variables',
  level: 'intermediaire',
  number: 0,
  title: 'Une valeur par lampe',
  situation: 'Trois lampes, un seul Blueprint. Au lancement, celles de gauche et de droite s’allument, celle du milieu reste éteinte.',
  recalls: ['events', 'visibility', 'branch'],
  notions: ['Instance Editable', 'Details d’une instance'],
  remember:
    'Une variable Instance Editable se règle sur chaque acteur posé, dans les Details du niveau. Le graphe est le même pour toutes les instances ; ce qui change, c’est la valeur qu’il lit.',
  cards: [
    {
      title: 'Ce qui est en place',
      body:
        '**BP_Lampe** : un Pied et une **Lumiere** éteinte. Trois lampes sont posées en ligne. Le graphe est vide et la lampe n’a pas de variable.\n\n' +
        'Le problème : le graphe est **le même** pour les trois. Comment l’une peut-elle s’allumer et pas l’autre ?',
    },
    {
      title: 'Instance Editable',
      body:
        'Crée une variable **Boolean** dans BP_Lampe, par exemple `bAllumeeAuDepart`. Puis coche **Instance Editable** dans ses Details (dans UE, l’**œil** à côté de la variable s’ouvre).\n\n' +
        'Elle apparaît alors dans les **Details de chaque lampe posée** (onglet Niveau, touche une lampe). Chaque instance garde sa propre valeur ; la valeur par défaut du Blueprint ne sert qu’à celles qu’on n’a pas réglées.',
    },
    {
      title: 'Le plan',
      body:
        '1. Dans BP_Lampe : **Event BeginPlay** → **Branch** (Condition = **Get bAllumeeAuDepart**) → True : **Set Visibility** (Target = Lumiere, coché).\n' +
        '2. Dans le niveau : coche bAllumeeAuDepart sur la lampe de gauche et sur celle de droite.\n\n' +
        'Plus court, une fois que ça marche : sans Branch, relie Get bAllumeeAuDepart directement à **New Visibility**. La pin attend un Boolean, la variable en est un.',
    },
    {
      title: 'Dans UE',
      body:
        'C’est ainsi qu’on règle les acteurs d’un niveau sans dupliquer de Blueprint : la couleur d’une lampe, le code d’une porte, la cible d’un interrupteur. Une variable cochée **Expose on Spawn** se règle, elle, au moment où un graphe crée l’acteur (Spawn Actor).',
    },
  ],
  objectives: [
    'Crée une variable Boolean Instance Editable dans BP_Lampe.',
    'Au lancement, chaque lampe allume ou non sa Lumiere selon sa valeur.',
    'Règle les lampes : gauche et droite allumées, milieu éteinte.',
  ],
  hints: [
    'Le graphe ne peut pas savoir quelle lampe il est : il faut une valeur que chaque lampe porte, réglée dans le niveau.',
    'Variable Boolean avec Instance Editable coché. Nœuds : Event BeginPlay, Branch, Set Visibility, Get de la variable. Puis les Details de chaque lampe dans le niveau.',
    'Solution : variable bAllumeeAuDepart (Boolean, Instance Editable) ; BeginPlay → Branch (Get bAllumeeAuDepart) → True : Set Visibility (Lumiere, coché) ; cochée sur les lampes de gauche et de droite.',
  ],
  challenge: 'Ajoute une variable Float Instance Editable pour la puissance de chaque lumière, et applique-la au BeginPlay avec Set Intensity.',
  setup: lampsProject,
  scenario: [{ wait: 0.3 }],
  checks,
  solve(p) {
    const b = edit(p, 'BP_Lampe');
    const v = b.variable('bAllumeeAuDepart', T.bool, false);
    b.cls.variables.find((k) => k.id === v)!.instanceEditable = true;
    const begin = b.node('event.beginPlay', {}, {}, [64, 96]);
    const br = b.node('flow.branch', {}, {}, [360, 96]);
    const get = b.node('var.get', { variable: v }, {}, [200, 300]);
    const set = b.node('component.setVisibility', {}, { visible: true }, [660, 96]);
    b.link(begin, 'then', br, 'exec').link(get, 'value', br, 'condition').link(br, 'true', set, 'exec').target('Lumiere', set);
    const lamps = levelOf(p).actors.filter((a) => a.classId === b.cls.id).sort((a, c) => a.x - c.x);
    lamps.forEach((a, i) => {
      if (LIT[i]) a.overrides[v] = true;
    });
  },
};
