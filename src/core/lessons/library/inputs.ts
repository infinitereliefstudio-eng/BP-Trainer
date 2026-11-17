/**
 * « Débogue D19 — Seule la dernière porte s'ouvre »: three doors listen to E
 * and open when the player is close. With Consume Input checked (UE's
 * default), the last placed door keeps the key: the others never hear it.
 */
import type { Project } from '../../model/project';
import { edit, ProjectBuilder, type ClassBuilder } from '../builder';
import { noRuntimeErrors } from '../checks';
import type { CheckContext, Lesson } from '../types';
import { DEBUG_METHOD, nodeOf, tap } from './kit';

const DOORS: [number, number][] = [
  [0, -250],
  [350, -250],
  [700, -250],
];
const LABELS = ['BP_Porte', 'BP_Porte2', 'BP_Porte3'];

function doorGraph(b: ClassBuilder): void {
  const key = b.node('event.inputKey', { key: 'E' }, {}, [64, 96]);
  const br = b.node('flow.branch', {}, {}, [700, 96]);
  const open = b.node('component.setRelativeRotation', {}, { rotation: { x: 0, y: 0, z: 90 } }, [980, 96]);
  const near = b.node('math.lessFloat', {}, { b: 250 }, [520, 300]);
  const dist = b.node('math.vectorDistance', {}, {}, [340, 300]);
  const self = b.node('actor.getLocation', {}, {}, [100, 300]);
  const player = b.node('actor.getLocation', {}, {}, [100, 460]);
  b.link(key, 'pressed', br, 'exec').link(near, 'result', br, 'condition').link(br, 'true', open, 'exec').target('Porte', open);
  b.link(self, 'result', dist, 'a').link(player, 'result', dist, 'b').link(dist, 'result', near, 'a');
  b.link(b.node('actor.getPlayerPawn', {}, {}, [-140, 520]), 'result', player, 'target');
}

function doorsProject(): Project {
  const pb = new ProjectBuilder('Débogue D19');
  const b = pb.blueprint('BP_Porte');
  b.component('StaticMesh', 'Porte', { shape: 'door', sizeX: 160, sizeY: 16, color: '#a0703c' });
  b.cls.autoReceiveInput = true;
  doorGraph(b);
  for (const [x, y] of DOORS) pb.place(b, x, y);
  pb.playerStart(0, -100);
  return pb.project;
}

const isOpen = (cx: CheckContext, label: string) => Math.abs(Math.abs(cx.component(label, 'Porte')?.props.yaw ?? 0) - 90) < 1;

export const debug19: Lesson = {
  id: 'd19-derniere-porte',
  kind: 'debug',
  code: 'D19',
  module: 'Choisir un chemin',
  level: 'intermediaire',
  number: 0,
  title: 'Seule la dernière porte s’ouvre',
  situation:
    'Trois portes du même Blueprint. Chacune écoute E et s’ouvre si le joueur est à moins de 2,5 m. Devant la troisième, ça marche. Devant la première, rien, sans aucune erreur. Le graphe est le même pour les trois.',
  notions: ['Consume Input', 'Auto Receive Input', 'Get Player Pawn'],
  remember:
    'Un événement de touche a Consume Input coché par défaut : le premier acteur qui reçoit la touche la garde. Le dernier acteur posé passe en premier. Pour que plusieurs acteurs l’entendent, décoche Consume Input ; mieux, écoute la touche dans le joueur et parle à l’objet visé.',
  cards: [
    DEBUG_METHOD,
    {
      title: 'Ce qui est en place',
      body:
        '**BP_Porte** : un battant (Porte), **Auto Receive Input** sur Player 0. Sur **E** : Branch, condition = la distance entre la porte (Get Actor Location) et le joueur (Get Player Pawn → Get Actor Location) est inférieure à 250. Si oui, Set Relative Rotation de la Porte à 90°.\n\n' +
        'Trois portes dans le niveau, posées de gauche à droite. Le joueur démarre devant la première.\n\n' +
        'Le test : E devant la première porte, puis E devant la troisième.',
    },
    {
      title: 'Enquêter',
      body:
        'Mets un breakpoint sur le **Branch** et appuie sur E devant la première porte. Le fil s’arrête-t-il ? Pour **quelle** porte ? Regarde le nom de l’acteur dans la barre de débogage.\n\n' +
        'Puis lance Play sans breakpoint et va devant la troisième : elle s’ouvre. Le graphe n’est donc pas faux. La question est : **qui reçoit E** ?',
    },
    {
      title: 'Qui reçoit une touche',
      body:
        'Dans UE, les acteurs qui reçoivent les touches forment une **pile**. La touche part du haut : le dernier acteur à s’être abonné aux entrées, ici la dernière porte posée. Le pion du joueur est tout en bas.\n\n' +
        'Chaque événement de touche a une case **Consume Input**, dans son Details, **cochée par défaut**. Cochée, l’acteur qui a cette touche la **garde** : ceux d’en dessous ne la voient jamais. La troisième porte reçoit E, la garde, teste sa distance (trop loin), et ne fait rien. Les deux autres n’ont rien reçu.\n\n' +
        'Aucune erreur : tout fonctionne comme prévu par le moteur.',
    },
    {
      title: 'Deux corrections',
      body:
        '- **La rapide** : sélectionne l’événement E et décoche **Consume Input**. La touche descend toute la pile : chaque porte teste sa propre distance.\n' +
        '- **Celle d’un vrai jeu** : la touche n’est écoutée qu’à un endroit, le joueur. Il cherche l’objet devant lui (overlap ou Line Trace) et lui envoie un message d’interface (Interact). C’est la leçon « Interagir avec tout ».\n\n' +
        'Avec trois portes, la correction rapide suffit. Avec cent objets qui écoutent tous E, chacun calcule sa distance à chaque appui, et l’ordre de la pile décide en silence de qui répond.',
    },
  ],
  objectives: ['Devant la première porte, E l’ouvre, et elle seule.', 'Devant la troisième, E l’ouvre aussi.'],
  hints: [
    'Breakpoint sur le Branch, E devant la première porte : c’est BP_Porte3 qui s’arrête. Les deux autres ne reçoivent rien.',
    'L’événement E a Consume Input coché : la dernière porte posée garde la touche.',
    'Solution : sélectionne l’événement E de BP_Porte, et dans Details décoche Consume Input.',
  ],
  setup: doorsProject,
  scenario: [{ wait: 0.2 }, ...tap('E'), { wait: 0.1 }, { checkpoint: 'premiere' }, { teleport: [700, -100] }, { wait: 0.1 }, ...tap('E'), { wait: 0.1 }],
  checks: [
    {
      id: 'first',
      label: 'Devant la première porte, E l’ouvre',
      at: 'premiere',
      test: (cx) => (isOpen(cx, LABELS[0]) ? true : 'La première porte ne s’est pas ouverte : elle n’a jamais reçu E. Mets un breakpoint sur le Branch : quelle porte s’arrête ?'),
    },
    {
      id: 'only',
      label: 'Les portes éloignées restent fermées',
      at: 'premiere',
      test: (cx) => (LABELS.slice(1).some((l) => isOpen(cx, l)) ? 'Une porte éloignée s’est ouverte : chacune doit garder son test de distance.' : true),
    },
    {
      id: 'last',
      label: 'Devant la troisième porte, E l’ouvre',
      test: (cx) => (isOpen(cx, LABELS[2]) ? true : 'La troisième porte ne s’ouvre plus devant elle.'),
    },
    noRuntimeErrors(),
  ],
  solve(p) {
    const b = edit(p, 'BP_Porte');
    b.graph.nodes[nodeOf(b.graph, 'event.inputKey')].config.consumeInput = false;
  },
};
