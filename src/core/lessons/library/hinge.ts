/**
 * Lot 2b of the path plan: « La porte sur son gond ». A component turns
 * around its own origin; to turn a door around its hinge, it hangs from a
 * Scene component placed at the hinge (Attach Parent), and the Scene turns.
 */
import type { Project } from '../../model/project';
import { addComponent, updateComponentProps } from '../../operations/classOps';
import { componentTransform } from '../../runtime/world';
import { edit, ProjectBuilder } from '../builder';
import { noRuntimeErrors } from '../checks';
import type { Check, CheckContext, Lesson } from '../types';

function hingeProject(): Project {
  const pb = new ProjectBuilder('La porte sur son gond');
  const door = pb.blueprint('BP_Porte');
  door.component('StaticMesh', 'Porte', { sizeX: 200, sizeY: 16, color: '#a0703c', blocks: true, collision: 3 });
  door.component('BoxCollision', 'Zone', { sizeX: 300, sizeY: 360 });
  const e = door.node('event.actorBeginOverlap', {}, {}, [64, 96]);
  const rot = door.node('component.setRelativeRotation', {}, { rotation: { x: 0, y: 0, z: 90 } }, [380, 96]);
  door.link(e, 'then', rot, 'exec').target('Porte', rot);
  const wall = pb.blueprint('BP_Mur');
  wall.component('StaticMesh', 'Mur', { sizeX: 40, sizeY: 600, color: '#4b5563' });
  // Yaw 90: the door's X runs along the world's Y, across the doorway (y from -100 to 100).
  pb.place(door, 0, 0, 90);
  pb.place(wall, 0, -400);
  pb.place(wall, 0, 400);
  pb.playerStart(-500, 0);
  return pb.project;
}

/** The door leaf in the world, during Play. */
function leaf(cx: CheckContext) {
  const a = cx.actor('BP_Porte');
  const c = cx.component('BP_Porte', 'Porte');
  return a && c ? componentTransform(a, c) : undefined;
}

/** Does the leaf run along the world's Y (across the doorway)? */
const across = (yaw: number) => Math.abs(Math.sin((yaw * Math.PI) / 180)) > 0.99;

const hingeChecks: Check[] = [
  {
    id: 'closed',
    label: 'Au lancement, la porte ferme le passage',
    at: 'fermee',
    test: (cx) => {
      const t = leaf(cx);
      if (!t) return 'La Porte de BP_Porte est introuvable.';
      if (!across(t.yaw)) return 'Au lancement, la porte n’est plus en travers du passage : laisse la Rotation du Gond et de la Porte à 0 dans le Viewport.';
      return Math.hypot(t.x, t.y) < 5
        ? true
        : `Au lancement, le centre de la porte est à ${Math.round(Math.hypot(t.x, t.y))} cm du milieu du passage : avec le Gond à X = -100, la Porte se place à X = 100 depuis lui.`;
    },
  },
  {
    id: 'turned',
    label: 'Quand le joueur arrive, la porte pivote de 90°',
    at: 'ouverte',
    test: (cx) => {
      const t = leaf(cx);
      return t && !across(t.yaw) ? true : 'La porte n’a pas pivoté : Set Relative Rotation doit tourner le composant qui porte la Porte.';
    },
  },
  {
    id: 'aside',
    label: 'Ouverte, elle dégage le passage : elle a tourné autour de son gond',
    at: 'ouverte',
    test: (cx) => {
      const t = leaf(cx);
      if (!t) return 'La Porte de BP_Porte est introuvable.';
      return Math.hypot(t.x, t.y) >= 90
        ? true
        : 'La porte a tourné autour de son propre centre : elle barre toujours le milieu du passage. Fais-la pendre à un Gond placé au bout du battant, et fais tourner le Gond.';
    },
  },
  {
    id: 'pass',
    label: 'Le joueur traverse',
    at: 'passe',
    test: (cx) => (cx.sim.player.x > 120 ? true : 'Le joueur reste bloqué par la porte ouverte.'),
  },
  noRuntimeErrors(),
];

export const lessonHinge: Lesson = {
  id: 'l-gond',
  module: 'Portes et objets',
  level: 'intermediaire',
  number: 0,
  title: 'La porte sur son gond',
  situation:
    'Cette porte pivote bien de 90°, mais autour de son milieu : ouverte, elle barre encore le passage. Fais-la tourner autour de son gond, sans toucher au graphe… ou presque.',
  notions: ['Scene Component', 'Attach Parent', 'Repère local et repère monde'],
  remember:
    'Un composant tourne autour de sa propre origine. Pour un autre pivot (un gond, un axe), on le fait pendre à un Scene placé au pivot (Attach Parent), et c’est ce Scene qu’on fait tourner.',
  cards: [
    {
      title: 'Ce qui est en place',
      body:
        '**BP_Porte** : un battant, **Porte** (un Static Mesh de 200 × 16 cm), et une **Zone** devant le passage. Son graphe fait déjà le travail de « Ouvrir une porte » : à l’overlap, **Set Relative Rotation** (Target = Porte, Yaw 90).\n\n' +
        'Lance Play et approche : la porte tourne, mais sur place, comme un tourniquet. Le joueur bute contre elle.',
    },
    {
      title: 'Pourquoi au milieu',
      body:
        'Un composant tourne autour de **sa propre origine**, son point (0, 0). Pour un Static Mesh, c’est son centre : le battant pivote en son milieu.\n\n' +
        'Dans UE, c’est le même problème avec un mesh dont le pivot est au centre. Deux solutions : déplacer le pivot dans le modèle 3D, ou faire comme ici, ce qu’on fait dans un Blueprint.',
    },
    {
      title: 'Un gond',
      body:
        'Ouvre l’onglet **Viewport** de BP_Porte. Le battant va de X = -100 à X = 100.\n\n' +
        '1. Components › **+** › **Scene** : un composant invisible, un simple repère. Nomme-le `Gond`.\n' +
        '2. Place-le au bout du battant : Details › Transform › Location **X = -100**.\n' +
        '3. Sélectionne **Porte**, et dans Details › **Attach Parent**, choisis **Gond** : la Porte pend maintenant au Gond. Sa Location devient **relative au Gond** : mets **X = 100** pour qu’elle reste à sa place.\n\n' +
        'Le Viewport ne change pas d’aspect. Mais si le Gond tourne, la Porte tourne avec lui, autour de lui.',
    },
    {
      title: 'Faire tourner le Gond',
      body:
        'Dans le graphe, **Set Relative Rotation** tourne ce qui est branché sur sa Target. Remplace **Get Porte** par **Get Gond** (My Blueprint › Components, glisse Gond dans le graphe).\n\n' +
        'Teste avec ▶ Play : la porte doit s’ouvrir comme une vraie porte, en dégageant le passage.',
    },
  ],
  objectives: [
    'Ajoute un Scene « Gond » au bout du battant et fais-y pendre la Porte (Attach Parent).',
    'La porte fermée reste à sa place.',
    'Ouverte, elle dégage le passage et le joueur traverse.',
  ],
  hints: [
    'La rotation se fait autour de l’origine du composant tourné. Il faut un composant dont l’origine est au gond.',
    'Viewport : + Scene (Gond, X = -100) ; Porte : Attach Parent = Gond, X = 100. Graphe : la Target de Set Relative Rotation devient Gond.',
    'Solution : Gond (Scene) à Location X = -100 ; Porte accrochée au Gond à Location X = 100 ; Set Relative Rotation (Target = Gond, Yaw 90).',
  ],
  challenge: 'Fais ouvrir la porte vers l’autre côté (Yaw -90). Que faut-il changer, et que ne faut-il surtout pas changer ?',
  setup: hingeProject,
  scenario: [
    { wait: 0.2 },
    { checkpoint: 'fermee' },
    { teleport: [-150, 0] },
    { wait: 0.3 },
    { checkpoint: 'ouverte' },
    { walk: [1, 0], seconds: 1.2 },
    { checkpoint: 'passe' },
  ],
  checks: hingeChecks,
  solve(p) {
    const b = edit(p, 'BP_Porte');
    const gond = addComponent(b.cls, 'Scene');
    gond.name = 'Gond';
    updateComponentProps(b.cls, gond.id, { x: -100 });
    const porte = b.cls.components.find((c) => c.name === 'Porte')!;
    porte.parent = gond.id;
    updateComponentProps(b.cls, porte.id, { x: 100 });
    for (const n of Object.values(b.graph.nodes)) if (n.def === 'var.component' && n.config.component === porte.id) n.config.component = gond.id;
  },
};
