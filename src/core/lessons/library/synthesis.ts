/**
 * Level syntheses (lot 2 of docs/PLAN_PARCOURS.md): at the end of a level, a
 * specification that mixes what the level taught, with no node list. They are
 * advised before the next level, never required (Home.tsx).
 */
import { T } from '../../types/pins';
import { edit, ProjectBuilder } from '../builder';
import { noRuntimeErrors, visible } from '../checks';
import type { CheckContext, Lesson } from '../types';

// ------------------------------------------------------- S1 Le passage (Débutant)

function passageProject() {
  const pb = new ProjectBuilder('Synthèse S1');
  const lamp = pb.blueprint('BP_Lampe');
  lamp.component('StaticMesh', 'Pied', { shape: 'cylinder', sizeX: 40, sizeY: 40, color: '#6b7280' });
  lamp.component('PointLight', 'Lumiere', { visible: false, radius: 380 });
  pb.place(lamp, -400, 320);
  const bar = pb.blueprint('BP_Barriere');
  bar.component('StaticMesh', 'Barriere', { sizeX: 40, sizeY: 1600, color: '#b45309', blocks: true, collision: 3 });
  bar.component('BoxCollision', 'Zone', { x: -150, sizeX: 120, sizeY: 160 });
  pb.place(bar, 0, 0);
  pb.playerStart(-500, 0);
  return pb.project;
}

/** The barrier still stands: visible and blocking. */
const barrierUp = (cx: CheckContext) => {
  const a = cx.actor('BP_Barriere');
  const wall = cx.component('BP_Barriere', 'Barriere');
  return !!a && !a.hidden && !!wall?.props.visible && Number(wall.props.collision) !== 0;
};

/** One way in and out of the zone in front of the barrier. */
const passage = [{ teleport: [-150, 0] as [number, number] }, { wait: 0.3 }, { teleport: [-500, 0] as [number, number] }, { wait: 0.3 }];

export const synthesis1: Lesson = {
  id: 's1-passage',
  code: 'S1',
  kind: 'synthesis',
  module: 'Synthèse',
  level: 'debutant',
  number: 0,
  title: 'Le passage',
  situation:
    'Une lampe éteinte et une barrière qui coupe le niveau. La touche E allume et éteint la lampe ; la barrière compte les passages devant elle et s’ouvre au troisième.',
  notions: ['Input E', 'Variable Integer', 'Branch', 'Set Collision Enabled'],
  remember:
    'Un cahier des charges se découpe en règles : pour chacune, quel événement la déclenche, quel état il faut garder (une variable), quelle condition décide (un Branch), et ce qui change à l’écran comme pour le moteur.',
  cards: [
    {
      title: 'Cahier des charges',
      body:
        '**BP_Lampe** (un Pied, une Lumiere éteinte) et **BP_Barriere** (le mur **Barriere** et une **Zone** devant lui, côté joueur). Les deux graphes sont vides, aucune variable, aucun réglage fait.\n\n' +
        '- Au **lancement**, la barrière affiche `Trois passages pour ouvrir`.\n' +
        '- La touche **E** allume la lampe, puis l’éteint, puis la rallume…\n' +
        '- Chaque fois que le joueur **entre** dans la Zone, le jeu **affiche** le nombre de passages : 1, 2, 3.\n' +
        '- Au **3e** passage, la barrière **disparaît** et le joueur peut la **traverser**.\n' +
        '- Avant, elle reste visible et bloque.',
    },
    {
      title: 'Comment t’y prendre',
      body:
        'Une synthèse reprend tout le niveau Débutant, sans liste de nœuds. Une règle à la fois, et pour chacune :\n\n' +
        '1. Quel événement la déclenche, et quel Blueprint l’écoute ?\n2. Qu’est-ce qui doit être gardé d’une fois à l’autre ?\n3. Quelle condition décide ?\n4. Que faut-il changer, pour l’œil et pour le moteur ?\n\n' +
        'Teste chaque règle avec ▶ Play avant de passer à la suivante. Les indices s’ouvrent après un premier essai.',
    },
    {
      title: 'Conseillée, pas obligatoire',
      body:
        'Rien n’est bloqué si tu passes à l’Intermédiaire sans elle. Mais si une règle résiste, c’est la leçon à revoir : la liste des leçons dit laquelle.',
    },
  ],
  objectives: [
    'Au lancement, la barrière affiche « Trois passages pour ouvrir ».',
    'E allume, éteint et rallume la lampe.',
    'Chaque entrée dans la Zone affiche le nombre de passages.',
    'Au 3e passage, la barrière disparaît et se laisse traverser.',
  ],
  hints: [
    'Deux Blueprints, deux graphes : la lampe pour E (pense à ce qui lui permet d’entendre les touches), la barrière pour les passages.',
    'La lampe : comme « Interrupteur à touche ». La barrière : comme « Le compteur », puis comme « Visible, caché, traversable » quand le compte arrive à 3.',
    'Solution — BP_Lampe : Auto Receive Input, E Pressed → Toggle Visibility (Lumiere). BP_Barriere : BeginPlay → Print String « Trois passages pour ouvrir ». Variable Passages (Integer) ; ActorBeginOverlap → Increment Int → Print String → Branch (Passages >= 3) → True : Set Actor Hidden In Game (coché) → Set Collision Enabled (Barriere, No Collision).',
  ],
  challenge: 'Fais que la lampe s’allume aussi toute seule quand la barrière s’ouvre. Il faudra parler d’un Blueprint à l’autre : c’est le sujet de l’Intermédiaire.',
  setup: passageProject,
  scenario: [
    { wait: 0.2 },
    { press: 'E' },
    { release: 'E' },
    { checkpoint: 'allumee' },
    { press: 'E' },
    { release: 'E' },
    { checkpoint: 'eteinte' },
    ...passage,
    ...passage,
    { checkpoint: 'deux' },
    { teleport: [-150, 0] },
    { wait: 0.3 },
    { checkpoint: 'ouverte' },
    { walk: [1, 0], seconds: 1.5 },
    { checkpoint: 'passe' },
  ],
  checks: [
    {
      id: 'start',
      label: 'Au lancement : « Trois passages pour ouvrir »',
      test: (cx) =>
        cx.prints().some((t) => t.trim().toLowerCase() === 'trois passages pour ouvrir')
          ? true
          : 'Au lancement, la barrière doit afficher « Trois passages pour ouvrir ». Quel événement part au lancement ?',
    },
    visible('on', 'BP_Lampe', 'Lumiere', true, '1er appui sur E : la lampe s’allume', 'allumee'),
    visible('off', 'BP_Lampe', 'Lumiere', false, '2e appui : elle s’éteint', 'eteinte'),
    {
      id: 'count',
      label: 'Chaque passage affiche le nombre : 1, 2, 3',
      test: (cx) => {
        const texts = cx.prints().map((t) => t.trim());
        const at = [1, 2, 3].map((n) => texts.indexOf(String(n)));
        if (at.every((i, k) => i >= 0 && (k === 0 || i > at[k - 1]))) return true;
        return texts.length
          ? `L’Output Log montre ${texts.slice(0, 4).join(', ')} : on attend 1, puis 2, puis 3, un nombre par passage.`
          : 'Rien ne s’affiche quand le joueur entre dans la Zone.';
      },
    },
    {
      id: 'holds',
      label: 'Après deux passages, la barrière est toujours là et bloque',
      at: 'deux',
      test: (cx) => (barrierUp(cx) ? true : 'La barrière s’ouvre trop tôt : elle doit tenir jusqu’au 3e passage.'),
    },
    {
      id: 'hidden',
      label: 'Au 3e passage, la barrière disparaît',
      at: 'ouverte',
      test: (cx) => {
        const a = cx.actor('BP_Barriere');
        const wall = cx.component('BP_Barriere', 'Barriere');
        return a?.hidden || wall?.props.visible === false ? true : 'Au 3e passage, la barrière est toujours visible.';
      },
    },
    {
      id: 'through',
      label: 'Puis le joueur la traverse',
      at: 'passe',
      test: (cx) =>
        cx.sim.player.x > 60 ? true : 'Le joueur reste bloqué : une barrière cachée garde sa collision. C’est un nœud de plus, sur le mur.',
    },
    noRuntimeErrors(),
  ],
  solve(p) {
    const lamp = edit(p, 'BP_Lampe');
    lamp.cls.autoReceiveInput = true;
    const key = lamp.node('event.inputKey', { key: 'E' }, {}, [64, 120]);
    const toggle = lamp.node('component.toggleVisibility', {}, {}, [360, 120]);
    lamp.link(key, 'pressed', toggle, 'exec').target('Lumiere', toggle);

    const b = edit(p, 'BP_Barriere');
    const v = b.variable('Passages', T.int, 0);
    const begin = b.node('event.beginPlay', {}, {}, [64, -160]);
    const hello = b.node('debug.printString', {}, { text: 'Trois passages pour ouvrir' }, [340, -160]);
    b.link(begin, 'then', hello, 'exec');
    const ev = b.node('event.actorBeginOverlap', {}, {}, [64, 96]);
    const inc = b.node('var.incrementInt', {}, {}, [340, 96]);
    const pr = b.node('debug.printString', {}, {}, [620, 96]);
    const br = b.node('flow.branch', {}, {}, [900, 96]);
    const ge = b.node('math.greaterEqualInt', {}, { b: 3 }, [700, 340]);
    const hide = b.node('actor.setHidden', {}, { hidden: true }, [1180, 96]);
    const col = b.node('component.setCollisionEnabled', {}, { collision: 0 }, [1460, 96]);
    b.link(ev, 'then', inc, 'exec').link(b.node('var.get', { variable: v }, {}, [300, 300]), 'value', inc, 'value');
    b.link(inc, 'then', pr, 'exec').link(inc, 'result', pr, 'text');
    b.link(pr, 'then', br, 'exec').link(b.node('var.get', { variable: v }, {}, [560, 400]), 'value', ge, 'a').link(ge, 'result', br, 'condition');
    b.link(br, 'true', hide, 'exec').link(hide, 'then', col, 'exec').target('Barriere', col);
  },
};
