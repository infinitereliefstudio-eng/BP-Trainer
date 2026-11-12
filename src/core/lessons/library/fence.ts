/**
 * V5, Confirmé: a row of posts created by a For Loop. Five copied Spawn
 * Actor nodes pass the lesson, then fail its robustness case (another
 * number of posts) and weigh twice the reference: the point of the lesson.
 */
import { T } from '../../types/pins';
import { edit, ProjectBuilder } from '../builder';
import { noRuntimeErrors, notion, usesNode } from '../checks';
import type { CheckContext, Lesson } from '../types';

const GAP = 150;

function fenceProject() {
  const pb = new ProjectBuilder('La clôture');
  const post = pb.blueprint('BP_Poteau');
  post.component('StaticMesh', 'Poteau', { shape: 'cylinder', sizeX: 36, sizeY: 36, color: '#b45309' });
  const site = pb.blueprint('BP_Chantier');
  site.component('StaticMesh', 'Plan', { sizeX: 60, sizeY: 60, color: '#64748b', blocks: false });
  const n = site.variable('Nombre', T.int, 5);
  site.cls.variables.find((v) => v.id === n)!.instanceEditable = true;
  pb.place(site, 0, -200);
  pb.playerStart(-300, 200);
  return pb.project;
}

const posts = (cx: CheckContext) => cx.sim.actors.filter((a) => a.className === 'BP_Poteau' && !a.destroyed).sort((a, b) => a.x - b.x);

/** `count` posts, one every 150 cm from X = 0, all at Y = 0. */
function rowOf(count: number): (cx: CheckContext) => true | string {
  return (cx) => {
    const list = posts(cx);
    if (!list.length) return 'Aucun poteau n’a été créé : au BeginPlay de BP_Chantier, fais un Spawn Actor de BP_Poteau.';
    if (list.length !== count) return `${list.length} poteau(x) au lieu de ${count}. De 0 à Nombre − 1, la boucle fait exactement Nombre tours.`;
    const xs = list.map((a) => Math.round(a.x));
    if (xs.every((x) => x === xs[0])) return `Les ${count} poteaux sont au même endroit (X = ${xs[0]}) : la position doit dépendre de Index (X = Index × ${GAP}).`;
    const wanted = Array.from({ length: count }, (_, i) => i * GAP);
    if (xs.join() !== wanted.join()) return `Les poteaux sont en X = ${xs.join(', ')}. Il fallait ${wanted.join(', ')} : X = Index × ${GAP}, en partant de 0.`;
    return list.every((a) => Math.abs(a.y) < 1) ? true : 'Les poteaux doivent rester sur la ligne Y = 0.';
  };
}

export const lessonFence: Lesson = {
  id: 'l-cloture',
  module: 'Le temps',
  level: 'confirme',
  number: 0,
  title: 'La clôture',
  situation: `Au lancement, le chantier plante une rangée de poteaux : autant que sa variable Nombre (5), un tous les ${GAP} cm à partir de X = 0, sur la ligne Y = 0.`,
  notions: ['For Loop', 'Sortie Index', 'Spawn Actor', 'Make Vector'],
  remember: 'Dès qu’une suite de nœuds se répète avec un nombre qui change, c’est une boucle : For Loop, et Index dans le calcul. Changer le nombre de tours ne demande alors aucun nœud de plus.',
  cards: [
    {
      title: 'Répéter sans copier',
      body:
        'Cinq poteaux, c’est cinq fois **Spawn Actor**, chacun avec sa position. On peut poser cinq nœuds à la suite… jusqu’au jour où il en faut huit, ou cinquante.\n\n' +
        '**For Loop** exécute sa sortie **Loop Body** une fois pour chaque nombre de **First Index** à **Last Index** compris, puis sort par **Completed**. Le nombre du tour en cours est sur la pin **Index**.',
    },
    {
      title: 'Se servir de Index',
      body:
        `Chaque tour doit produire une position différente : X = **Index × ${GAP}**. Au tour 0, X = 0 ; au tour 1, X = ${GAP} ; au tour 4, X = ${GAP * 4}.\n\n` +
        '**Make Vector** fabrique la position à partir de X, Y et Z ; relie-le à **Spawn Transform Location** du Spawn Actor.',
    },
    {
      title: 'Le piège du dernier tour',
      body:
        'De 0 à 5, la boucle fait **six** tours (0, 1, 2, 3, 4, 5). Pour en faire `Nombre`, elle va de 0 à **Nombre − 1**.\n\n' +
        'Lis `Nombre` dans la variable plutôt que d’écrire 4 dans Last Index : le chantier pourra alors planter une autre quantité sans qu’on touche au graphe.',
    },
  ],
  objectives: [
    'Dans BP_Chantier, au BeginPlay : un For Loop de 0 à Nombre − 1.',
    `Dans Loop Body : Spawn Actor de BP_Poteau, à X = Index × ${GAP}, Y = 0.`,
    'Touche Vérifier, puis regarde « Et si… » : la clôture doit suivre Nombre.',
  ],
  hints: [
    'La boucle donne Index ; la position se calcule à partir de lui.',
    'Nœuds : Event BeginPlay, For Loop, Get Nombre, − (Integer), Spawn Actor (Class = BP_Poteau), × (Integer), Make Vector.',
    `Solution : BeginPlay → For Loop (First 0, Last = Nombre − 1) → Loop Body : Spawn Actor BP_Poteau, Location = Make Vector (X = Index × ${GAP}).`,
  ],
  challenge: 'Ajoute une variable Ecart (Instance Editable) et utilise-la à la place de 150.',
  setup: fenceProject,
  scenario: [{ wait: 0.3 }],
  checks: [
    { id: 'row', label: `Cinq poteaux, un tous les ${GAP} cm à partir de X = 0`, test: rowOf(5) },
    notion(usesNode('loop', 'BP_Chantier', ['flow.forLoop', 'flow.forLoopWithBreak', 'flow.whileLoop'], 'Les poteaux sont créés par une boucle', 'Les Spawn Actor sont copiés à la main : une boucle en garde un seul.')),
    noRuntimeErrors(),
  ],
  solve(p) {
    const b = edit(p, 'BP_Chantier');
    const post = p.classes.find((c) => c.name === 'BP_Poteau')!.id;
    const begin = b.node('event.beginPlay', {}, {}, [64, 96]);
    const loop = b.node('flow.forLoop', {}, { first: 0 }, [360, 96]);
    const get = b.node('var.get', { variable: b.cls.variables[0].id }, {}, [64, 320]);
    const minus = b.node('math.subtractInt', {}, { b: 1 }, [220, 320]);
    const spawn = b.node('actor.spawn', {}, { class: post }, [1000, 96]);
    const times = b.node('math.multiplyInt', {}, { b: GAP }, [600, 320]);
    const vec = b.node('math.makeVector', {}, {}, [780, 320]);
    b.link(begin, 'then', loop, 'exec').link(get, 'value', minus, 'a').link(minus, 'result', loop, 'last');
    b.link(loop, 'body', spawn, 'exec').link(loop, 'index', times, 'a').link(times, 'result', vec, 'x').link(vec, 'result', spawn, 'location');
  },
  robustness: [
    {
      id: 'eight',
      label: 'Nombre vaut 8 au lieu de 5',
      advice: 'Lis Nombre dans la boucle (Last Index = Nombre − 1) au lieu d’un nombre écrit à la main ou de Spawn Actor copiés.',
      mutate: (p) => {
        const v = p.classes.find((c) => c.name === 'BP_Chantier')?.variables.find((x) => x.name === 'Nombre');
        if (v) v.defaultValue = 8;
      },
      scenario: [{ wait: 0.3 }],
      checks: [{ id: 'row8', label: 'huit poteaux', test: rowOf(8) }],
    },
  ],
  avoid: [
    {
      defs: ['time.delay', 'time.setTimerByEvent'],
      in: 'BP_Chantier',
      label: 'Delay ou timer pour répéter',
      why: 'Rien ne demande d’étaler la création dans le temps : une boucle crée tous les poteaux dans la même image, sans variable de comptage ni timer à arrêter.',
    },
  ],
};
