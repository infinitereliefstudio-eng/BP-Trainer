/**
 * V7.20, Actor Components, transfer rung: T3 « Le piège qui blesse tout ».
 * The health component is there, carried by a crate, a drone and the
 * player; a wall has none. The learner writes the trap: whatever enters it
 * and has a health loses 50, whatever it is, without a Cast to each kind.
 */
import type { Project } from '../../model/project';
import { ProjectBuilder, edit } from '../builder';
import { noRuntimeErrors, notion, notUsing, usesNode } from '../checks';
import type { CheckContext, Lesson } from '../types';
import { healthComponent, lifeOf } from './health';
import { goTo } from './kit';
import { playerBlueprint } from './props';

const DAMAGE = 50;
const TRAPS: [number, number][] = [
  [-350, -150],
  [0, -150],
  [350, -150],
  [0, 220],
];

function project(): Project {
  const pb = new ProjectBuilder('Le piège qui blesse tout');
  const { b: player } = playerBlueprint(pb);
  const health = healthComponent(pb, 100);
  player.logic(health.b, 'BP_Sante');

  const target = (name: string, color: string, life?: number) => {
    const b = pb.blueprint(name);
    b.component('StaticMesh', 'Corps', { sizeX: 80, sizeY: 80, color, blocks: false });
    b.component('BoxCollision', 'Contact', { sizeX: 90, sizeY: 90 });
    if (life !== undefined) {
      const comp = b.logic(health.b, 'BP_Sante', { [health.vie]: life });
      // Each one reacts to its death its own way: here, it disappears.
      const dead = b.node('event.componentDispatcher', { component: comp, dispatcher: health.mort }, {}, [64, 96]);
      b.link(dead, 'then', b.node('actor.destroy', {}, {}, [400, 96]), 'exec');
    }
    return b;
  };
  const crate = target('BP_Caisse', '#a16207', 40);
  const drone = target('BP_Drone', '#0ea5e9', 80);
  const wall = target('BP_Mur', '#4b5563');

  const trap = pb.blueprint('BP_Piege');
  trap.component('StaticMesh', 'Pointes', { sizeX: 150, sizeY: 150, color: '#7f1d1d', blocks: false });
  trap.component('BoxCollision', 'Zone', { sizeX: 160, sizeY: 160 });
  for (const at of TRAPS) pb.place(trap, ...at);
  pb.place(crate, ...TRAPS[0]);
  pb.place(drone, ...TRAPS[1]);
  pb.place(wall, ...TRAPS[2]);
  pb.playerStart(0, 480);
  return pb.project;
}

const report = (cx: CheckContext) =>
  `caisse ${cx.actor('BP_Caisse') ? `debout (Vie ${lifeOf(cx, 'BP_Caisse')})` : 'détruite'}, drone ${cx.actor('BP_Drone') ? `Vie ${lifeOf(cx, 'BP_Drone')}` : 'détruit'}, joueur Vie ${lifeOf(cx, 'Joueur')}`;

export const transferTrap: Lesson = {
  id: 't3-piege',
  code: 'T3',
  module: 'Composition',
  level: 'avance',
  number: 0,
  title: 'Le piège qui blesse tout',
  situation:
    'Des pièges à pointes sont posés dans la station : un sous une caisse, un sous un drone, un contre un mur, un dans le couloir. Tout ce qui entre dans un piège et a une santé doit perdre 50. Le reste n’a rien.',
  chain: { notion: 'actor-components', step: 'transfer' },
  recalls: ['overlap', 'functions'],
  notions: ['Get Component by Class', 'Actor Component', 'Is Valid'],
  remember:
    'Pour agir sur « tout ce qui a une santé », on ne demande pas à l’acteur ce qu’il est (Cast) mais ce qu’il a : Get Component by Class, puis Is Valid. Un nouvel ennemi qui porte BP_Sante est blessé sans changer le piège.',
  cards: [
    {
      title: 'Cahier des charges',
      body:
        'Déjà là : **BP_Sante** (Vie Instance Editable, **InfligerDegats** (Montant), OnMort), porté par **BP_Caisse** (Vie 40), **BP_Drone** (Vie 80) et **BP_Joueur** (Vie 100). La caisse et le drone disparaissent à OnMort. **BP_Mur** n’a pas de santé. Quatre **BP_Piege** sont posés, au graphe vide.\n\n' +
        '- Tout ce qui entre dans un piège **et a une santé** perd **50**.\n' +
        '- Ce qui n’a pas de santé (le mur) n’a rien, et aucune erreur ne s’affiche.\n' +
        '- **BP_Piege ne connaît aucune classe d’acteur** : pas de Cast vers BP_Caisse, BP_Drone ou BP_Joueur.\n\n' +
        'Au lancement, les trois premiers pièges touchent ce qui est posé dessus ; puis tu traverses le quatrième.',
    },
  ],
  objectives: ['La caisse (40) disparaît, le drone (80) tombe à 30.', 'Le mur n’a rien, sans erreur.', 'Quand tu traverses le piège du couloir, ta Vie tombe à 50.', 'BP_Piege ne fait aucun Cast.'],
  hints: [
    'Le piège ne sait pas ce qui entre : comment lui demander s’il a une santé, sans demander ce qu’il est ? Et que se passe-t-il s’il n’en a pas ?',
    'Event ActorBeginOverlap, Get Component by Class (BP_Sante), Is Valid, InfligerDegats.',
    'Solution : BP_Piege : ActorBeginOverlap → Get Component by Class (Target = Other Actor, Component Class = BP_Sante) → Is Valid → InfligerDegats (Target = le composant trouvé, Montant 50).',
  ],
  challenge: 'Un piège qui ne blesse qu’une fois par acteur : comment s’en souvenir, sans variable par victime ? (Indice : un Set d’Actor dans le piège.)',
  setup: project,
  scenario: [{ wait: 0.3 }, { checkpoint: 'pose' }, ...goTo(...TRAPS[3], 0.3)],
  checks: [
    {
      id: 'crate',
      label: 'La caisse (Vie 40) disparaît',
      at: 'pose',
      test: (cx) => (!cx.actor('BP_Caisse') ? true : `Au lancement : ${report(cx)}. La caisse aurait dû perdre 50 et disparaître.`),
    },
    {
      id: 'drone',
      label: 'Le drone (Vie 80) tombe à 30 et reste',
      at: 'pose',
      test: (cx) => (lifeOf(cx, 'BP_Drone') === 30 ? true : `Au lancement : ${report(cx)}. Le drone devrait être à 30.`),
    },
    {
      id: 'player',
      label: 'Dans le piège du couloir, la Vie du joueur tombe à 50',
      test: (cx) => (lifeOf(cx, 'Joueur') === 100 - DAMAGE ? true : `Après ton passage : ${report(cx)}. Ta Vie devrait être à 50, une seule fois.`),
    },
    {
      id: 'wall',
      label: 'Le mur reste',
      test: (cx) => (cx.actor('BP_Mur') ? true : 'Le mur a disparu : il n’a pas de santé, le piège ne doit rien lui faire.'),
    },
    notUsing('no-cast', 'BP_Piege', ['cast.to'], 'BP_Piege ne fait aucun Cast', 'BP_Piege fait un Cast : demande plutôt à l’acteur s’il a un BP_Sante (Get Component by Class).'),
    notion(usesNode('find', 'BP_Piege', ['actor.getComponentByClass', 'actor.getComponentsByClass'], 'Le piège cherche le composant BP_Sante', 'Utilise Get Component by Class sur Other Actor.')),
    noRuntimeErrors(),
  ],
  solve(p) {
    const b = edit(p, 'BP_Piege');
    const sante = p.classes.find((c) => c.name === 'BP_Sante')!;
    const hit = sante.graphs.find((g) => g.name === 'InfligerDegats')!;
    const montant = hit.fn!.inputs[0].id;
    const ev = b.node('event.actorBeginOverlap', {}, {}, [64, 96]);
    const find = b.node('actor.getComponentByClass', {}, { componentClass: sante.id }, [300, 320]);
    const valid = b.node('flow.isValid', {}, {}, [440, 96]);
    const call = b.node('call.function', { owner: sante.id, graph: hit.id }, { [montant]: DAMAGE }, [760, 96]);
    b.link(ev, 'then', valid, 'exec').link(ev, 'other', find, 'target').link(find, 'result', valid, 'object');
    b.link(valid, 'valid', call, 'exec').link(find, 'result', call, 'target');
  },
};
