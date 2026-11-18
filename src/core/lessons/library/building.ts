/**
 * Lot 2 of the path plan (docs/PLAN_PARCOURS.md), Débutant: building an
 * actor yourself. « Construis ta lampe » makes a Blueprint from nothing
 * (Content Drawer, components, Viewport, Place Actors); P12 « Où est la
 * lumière ? » reads a component's place through a turned parent.
 */
import { componentInActor } from '../../operations/viewportOps';
import { addClass } from '../../operations/projectOps';
import { addComponent, updateComponentProps } from '../../operations/classOps';
import { placeActor } from '../../operations/levelOps';
import type { BlueprintClass, Project } from '../../model/project';
import { ProjectBuilder } from '../builder';
import { noRuntimeErrors } from '../checks';
import type { Check, CheckContext, Lesson } from '../types';
import { PREDICT_METHOD } from './kit';
import { predictLesson } from './predicts';

// ------------------------------------------------------- Construis ta lampe

/** The wall already in the level: the learner's Blueprint is any other. */
const WALL = 'BP_Mur';
const made = (p: Project) => p.classes.filter((c) => c.name !== WALL && c.parent === 'Actor');

/** The Blueprints the learner made that have a Static Mesh and a Point Light. */
function lamps(p: Project): BlueprintClass[] {
  return made(p).filter((c) => c.components.some((k) => k.kind === 'StaticMesh') && c.components.some((k) => k.kind === 'PointLight'));
}

/** How far the light is from the mesh, in the actor's frame (the Viewport). */
function lightOffset(c: BlueprintClass): number {
  const mesh = c.components.find((k) => k.kind === 'StaticMesh');
  const light = c.components.find((k) => k.kind === 'PointLight');
  if (!mesh || !light) return 0;
  const a = componentInActor(c.components, mesh.id);
  const b = componentInActor(c.components, light.id);
  return Math.hypot(b.x - a.x, b.y - a.y);
}

const placedCount = (p: Project, c: BlueprintClass) => p.level.actors.filter((a) => a.classId === c.id).length;

/** The learner's lamp: the one placed most often, to judge it fairly. */
const bestLamp = (p: Project) => [...lamps(p)].sort((a, b) => placedCount(p, b) - placedCount(p, a))[0];

const buildChecks: Check[] = [
  {
    id: 'blueprint',
    label: 'Un Blueprint Actor a un Static Mesh et une Point Light',
    test: (cx: CheckContext) => {
      if (!made(cx.project).length) return 'Crée un Blueprint : Content Drawer › + Add › Blueprint Class › Actor.';
      return lamps(cx.project).length ? true : 'Ton Blueprint doit avoir deux composants : un Static Mesh (le pied) et une Point Light (la lumière). Components › +.';
    },
  },
  {
    id: 'viewport',
    label: 'Dans le Viewport, la lumière est à 40 cm au moins du pied',
    test: (cx) => {
      const lamp = bestLamp(cx.project);
      if (!lamp) return 'Il faut d’abord le Blueprint avec ses deux composants.';
      const d = Math.round(lightOffset(lamp));
      return d >= 40 ? true : `La lumière est à ${d} cm du pied. Ouvre l’onglet Viewport et fais-la glisser à côté (ou Details › Transform › Location X).`;
    },
  },
  {
    id: 'placed',
    label: 'Deux lampes sont posées dans le niveau',
    test: (cx) => {
      const lamp = bestLamp(cx.project);
      if (!lamp) return 'Il faut d’abord le Blueprint avec ses deux composants.';
      const n = placedCount(cx.project, lamp);
      return n >= 2 ? true : `${n} ${lamp.name} dans le niveau. Pose-en deux : Content Drawer › touche le Blueprint › Placer dans le niveau, ou Niveau › + Place Actors.`;
    },
  },
  {
    id: 'lit',
    label: 'En Play, les deux lampes éclairent',
    test: (cx) => {
      const lamp = bestLamp(cx.project);
      const lit = cx.sim.actors.filter((a) => a.classId === lamp?.id && a.components.some((k) => k.kind === 'PointLight' && k.props.visible && k.props.intensity > 0));
      return lit.length >= 2 ? true : 'Une lampe n’éclaire pas : sa Point Light doit être Visible, avec une Intensity au-dessus de 0 (Details › Light).';
    },
  },
  noRuntimeErrors(),
];

export const lessonBuildLamp: Lesson = {
  id: 'l-construis-lampe',
  module: 'Premiers pas',
  level: 'debutant',
  number: 0,
  title: 'Construis ta lampe',
  situation: 'Le niveau est presque vide. Fabrique toi-même une lampe : un Blueprint, un pied, une lumière à côté, puis pose-en deux dans le niveau.',
  notions: ['Blueprint Class', 'Composants', 'Viewport', 'Place Actors'],
  remember:
    'Un Blueprint est un modèle : ses composants et leur place se règlent dans son Viewport, une fois. Chaque acteur posé dans le niveau en est une instance, et reçoit tout ce que le modèle contient.',
  cards: [
    {
      title: 'Ce qui est en place',
      body:
        'Un niveau presque vide : le **Player Start** et un mur, **BP_Mur**, en haut. Jusqu’ici, les lampes étaient déjà construites : cette fois, tu fais ce que tu feras en premier dans Unreal, construire un acteur de zéro.',
    },
    {
      title: '1. Créer le Blueprint',
      body:
        'Ouvre le **Content Drawer** (en bas à gauche) › **+ Add** › **Blueprint Class**. La fenêtre **Pick Parent Class** demande de quoi il hérite : choisis **Actor**, ce qui peut être posé dans le niveau.\n\n' +
        'Nomme-le `BP_Lampe` (dans UE, le préfixe BP_ dit « Blueprint »). Une fois nommé, il s’ouvre dans son propre onglet.',
    },
    {
      title: '2. Ajouter les composants',
      body:
        'Un Blueprint neuf n’a qu’une **DefaultSceneRoot** : un point, son origine. Ouvre **Components · My Blueprint** (bord gauche) › Components › **+** :\n\n' +
        '- un **Static Mesh**, le pied : dans Details › Static Mesh, une forme Cylindre fait un bon pied ;\n- une **Point Light**, la lumière.\n\n' +
        'Les deux s’accrochent à la racine : leur **Location** est relative à elle.',
    },
    {
      title: '3. Les placer dans le Viewport',
      body:
        'L’onglet **Viewport** (à gauche de Construction Script) montre l’acteur seul, vu de dessus, à l’origine. La flèche rouge **X** montre où il regarde.\n\n' +
        'Touche la lumière et fais-la **glisser** à côté du pied, à 40 cm au moins. Ou règle-la au chiffre près dans Details › **Transform** › Location X.\n\n' +
        'Ce placement vaut pour **toutes** les lampes, celles déjà posées comme les futures.',
    },
    {
      title: '4. Poser deux lampes',
      body:
        'Retourne sur l’onglet **Niveau**. Deux façons de poser un acteur :\n\n' +
        '- **Content Drawer** › touche BP_Lampe › **Placer dans le niveau** ;\n- **+ Place Actors** dans la barre d’outils du niveau.\n\n' +
        'Glisse ensuite chaque lampe où tu veux. L’**Outliner** (bord droit) liste ce qui est posé.',
    },
    {
      title: 'Dans UE',
      body:
        'Même chemin : Content Browser › Add › Blueprint Class, Components › Add, le Viewport en 3D avec ses flèches de déplacement (le gizmo), puis on fait glisser le Blueprint du Content Browser dans le niveau. Le Static Mesh y demande un asset (un cylindre, un modèle 3D).',
    },
  ],
  objectives: [
    'Crée un Blueprint Actor avec un Static Mesh et une Point Light.',
    'Dans son Viewport, écarte la lumière du pied (40 cm au moins).',
    'Pose deux de ces lampes dans le niveau.',
    'Touche Vérifier.',
  ],
  hints: [
    'Trois endroits, dans l’ordre : le Content Drawer pour créer, le Blueprint (Components puis Viewport) pour construire, le niveau pour poser.',
    'Content Drawer › + Add › Blueprint Class › Actor. Components › + › Static Mesh, puis + › Point Light. Viewport : glisser la lumière. Niveau : + Place Actors › BP_Lampe, deux fois.',
    'Solution : un Blueprint BP_Lampe (parent Actor) avec un Static Mesh et une Point Light à Location X = 60, posé deux fois dans le niveau. Aucun nœud : tout est dans la construction.',
  ],
  challenge: 'Ajoute à BP_Lampe une Box Collision autour du pied, puis reprends le graphe de « L’interrupteur » : chaque lampe s’allume quand le joueur approche.',
  setup() {
    const pb = new ProjectBuilder('Construis ta lampe');
    const wall = pb.blueprint(WALL);
    wall.component('StaticMesh', 'Mur', { sizeX: 1200, sizeY: 40, color: '#64748b', blocks: true, collision: 3 });
    pb.place(wall, 0, -420);
    pb.playerStart(-400, 0);
    return pb.project;
  },
  scenario: [{ wait: 0.2 }],
  checks: buildChecks,
  solve(p) {
    const r = addClass(p, 'BP_Lampe', 'Actor');
    if (!r.ok) throw new Error(r.reason);
    const cls = r.value;
    const mesh = addComponent(cls, 'StaticMesh');
    mesh.name = 'Pied';
    updateComponentProps(cls, mesh.id, { shape: 'cylinder', sizeX: 40, sizeY: 40 });
    const light = addComponent(cls, 'PointLight');
    light.name = 'Lumiere';
    updateComponentProps(cls, light.id, { x: 60 });
    placeActor(p, cls.id, 0, -200);
    placeActor(p, cls.id, 0, 200);
  },
};

// ------------------------------------------------------- P12 Où est la lumière

export const predictWhereLight: Lesson = predictLesson({
  id: 'p12-ou-lumiere',
  code: 'P12',
  module: 'Premiers pas',
  level: 'debutant',
  title: 'Où est la lumière ?',
  situation:
    'La lampe est posée à X = 200, Y = 0. Sur elle, un Bras tourné de 90°, et sur le Bras, la Lumiere à Location X = 100. Au lancement, la lampe affiche la position de sa lumière dans le monde. Laquelle ?',
  notions: ['Composants', 'Repère local et repère monde'],
  remember:
    'La Location d’un composant est relative à son parent : elle tourne avec lui et se décale avec lui. Sa place dans le monde, c’est celle de l’acteur, plus chaque parent, avec leurs rotations.',
  cards: [
    {
      title: 'À lire',
      body:
        'Ouvre **BP_Lampe** et son onglet **Viewport**. Dans Components :\n\n' +
        '- **DefaultSceneRoot**, l’origine de l’acteur ;\n- **Bras**, un composant Scene (un simple repère, invisible), à Location 0, **Rotation Yaw 90** ;\n- **Lumiere**, une Point Light accrochée au **Bras** (Attach Parent), à **Location X = 100**.\n\n' +
        'Dans le niveau, la lampe est à **X = 200, Y = 0**, sans rotation. Au BeginPlay, **Get World Location** (Target = Lumiere) part dans un **Print String**.',
    },
    {
      title: 'Les axes',
      body:
        'Vue de dessus, comme dans l’appli : **X vers la droite**, **Y vers le bas**. Une Rotation Yaw de 90° fait tourner l’axe X d’un quart de tour, vers Y.\n\n' +
        'La question : X = 100, c’est 100 cm le long de quel axe, celui du monde ou celui du Bras ?',
    },
    PREDICT_METHOD,
  ],
  hints: [
    'La Location de la Lumiere est mesurée dans le repère de son parent, le Bras, pas dans celui du monde.',
    'Le Bras a tourné de 90° : son axe X pointe là où pointait Y.',
    'Réponse : X = 200, Y = 100. Les 100 cm partent le long de l’axe X du Bras, devenu l’axe Y du monde, depuis la position de la lampe (200, 0).',
  ],
  setup() {
    const pb = new ProjectBuilder('Prédis P12');
    const b = pb.blueprint('BP_Lampe');
    b.component('StaticMesh', 'Pied', { shape: 'cylinder', sizeX: 40, sizeY: 40, color: '#6b7280' });
    const arm = b.component('Scene', 'Bras', { yaw: 90 });
    const light = b.component('PointLight', 'Lumiere', { x: 100, radius: 200 });
    const comp = b.cls.components.find((c) => c.id === light);
    if (comp) comp.parent = arm;
    const begin = b.node('event.beginPlay', {}, {}, [64, 96]);
    const where = b.node('component.getWorldLocation', {}, {}, [300, 300]);
    const text = b.node('conv.vectorToString', {}, {}, [560, 300]);
    const print = b.node('debug.printString', {}, {}, [760, 96]);
    b.target('Lumiere', where);
    b.link(begin, 'then', print, 'exec').link(where, 'result', text, 'in').link(text, 'result', print, 'text');
    pb.place(b, 200, 0);
    pb.playerStart(-300, 0);
    return pb.project;
  },
  scenario: [{ wait: 0.2 }],
  predict: {
    question: 'Que voit-on dans l’Output Log ?',
    options: ['X=300 Y=0', 'X=200 Y=100', 'X=100 Y=0', 'X=200 Y=-100'],
    answer: 1,
    explanation:
      'La Lumiere est à X = 100 dans le repère du Bras. Le Bras a tourné de 90° : son X pointe vers le Y du monde. Les 100 cm partent donc vers Y, depuis la lampe : (200, 0) + (0, 100) = X=200 Y=100. Ouvre le Viewport : la lumière est sous le pied, pas à sa droite.',
    verify: (p) => p[0]?.startsWith('X=200.000 Y=100.000') ?? false,
  },
});
