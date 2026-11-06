/** Module 2 — Portes et objets. */
import { edit, ProjectBuilder } from '../builder';
import { noRuntimeErrors, usesNode } from '../checks';
import type { Lesson } from '../types';

const MODULE = 'Portes et objets';

export const lesson5: Lesson = {
  id: 'l05-porte',
  module: MODULE,
  number: 5,
  title: 'Ouvrir une porte',
  situation: 'La porte pivote de 90° quand le joueur s’approche, une seule fois, et le laisse passer.',
  notions: ['Set Relative Rotation', 'Rotator', 'DoOnce'],
  cards: [
    {
      title: 'Tourner un composant',
      body:
        'La **Porte** est un Static Mesh qui pivote sur ses gonds. **Set Relative Rotation** la tourne par rapport à l’acteur.\n\n' +
        'Une rotation est un **Rotator** : Roll (X), Pitch (Y) et Yaw (Z), en degrés. Vue de dessus, seul **Yaw** compte : règle-le à 90 dans Details, ou utilise **Make Rotator**.',
    },
    {
      title: 'Une seule fois',
      body:
        '**DoOnce** laisse passer l’exécution la première fois, puis plus jamais, jusqu’à ce qu’on passe par son entrée **Reset**.\n\n' +
        'Place-le entre l’événement et Set Relative Rotation : la porte ne s’ouvrira qu’au premier passage.',
    },
  ],
  objectives: [
    'Quand le joueur entre dans la Zone, la Porte tourne de 90° (Yaw).',
    'Passe par un DoOnce pour qu’elle ne s’ouvre qu’une fois.',
    'Vérifie que le joueur peut traverser.',
  ],
  hints: [
    'La porte réagit au même genre d’événement que l’interrupteur de la leçon 3.',
    'Nœuds : Event ActorBeginOverlap, DoOnce, Set Relative Rotation (Target = Porte, New Rotation Yaw = 90).',
    'Solution : ActorBeginOverlap → DoOnce → Set Relative Rotation (Porte, 0 / 0 / 90).',
  ],
  challenge: 'Fais refermer la porte 3 secondes après le départ du joueur. Indice : Delay et l’entrée Reset du DoOnce.',
  setup() {
    const pb = new ProjectBuilder('Leçon 5');
    const door = pb.blueprint('BP_Porte');
    door.component('StaticMesh', 'Porte', { shape: 'door', sizeX: 200, sizeY: 16, color: '#a0703c' });
    door.component('BoxCollision', 'Zone', { x: 100, y: 0, sizeX: 300, sizeY: 360 });
    const wall = pb.blueprint('BP_Mur');
    wall.component('StaticMesh', 'Mur', { sizeX: 40, sizeY: 600, color: '#4b5563' });
    // The doorway runs from y = -100 to 100 at x = 0, walls above and below.
    pb.place(door, 0, -100, 90);
    pb.place(wall, 0, -400);
    pb.place(wall, 0, 400);
    pb.playerStart(-500, 0);
    return pb.project;
  },
  scenario: [
    { wait: 0.2 },
    { teleport: [-150, 0] },
    { wait: 0.3 },
    { checkpoint: 'ouverte' },
    { teleport: [-600, 0] },
    { wait: 0.3 },
    { teleport: [-150, 0] },
    { wait: 0.3 },
    { walk: [1, 0], seconds: 1 },
  ],
  checks: [
    {
      id: 'open',
      label: 'La porte a tourné de 90° quand le joueur est arrivé',
      at: 'ouverte',
      test: (cx) => {
        const yaw = cx.component('BP_Porte', 'Porte')?.props.yaw ?? 0;
        const wrapped = ((((yaw + 180) % 360) + 360) % 360) - 180; // in [-180, 180)
        if (Math.abs(Math.abs(wrapped) - 90) < 1) return true;
        return yaw === 0 ? 'La porte n’a pas bougé.' : `La porte a tourné de ${yaw}° au lieu de 90°.`;
      },
    },
    usesNode('once', 'BP_Porte', ['flow.doOnce'], 'Le graphe utilise un DoOnce', 'Fais passer l’ouverture par un DoOnce.'),
    {
      id: 'pass',
      label: 'Le joueur traverse la porte',
      test: (cx) => (cx.sim.player.x > 120 ? true : 'Le joueur reste bloqué : la porte ne s’est pas écartée du passage.'),
    },
    noRuntimeErrors(),
  ],
  solve(p) {
    const b = edit(p, 'BP_Porte');
    const e = b.node('event.actorBeginOverlap');
    const once = b.node('flow.doOnce');
    const rot = b.node('component.setRelativeRotation', {}, { rotation: { x: 0, y: 0, z: 90 } });
    b.link(e, 'then', once, 'exec').link(once, 'completed', rot, 'exec').target('Porte', rot);
  },
};
