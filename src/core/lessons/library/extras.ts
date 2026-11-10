/**
 * V3 exercises on the new nodes: "Prédis P5 — Avant ou après ?" (Construction
 * Script, BeginPlay, Tick and a Timeline's Finished, in order) and "Débogue D6
 * — La tourelle aveugle" (a Line Trace that hits the actor casting it).
 */
import { readTimeline, timelineConfig } from '../../nodes/library/timeline';
import { edit, ProjectBuilder } from '../builder';
import { noRuntimeErrors, normText } from '../checks';
import type { CheckContext, Lesson } from '../types';

// ------------------------------------------------------------- Prédis P5

const ORDER = ['Construction', 'BeginPlay', 'Tick', 'Fini'];

export const predict5: Lesson = {
  id: 'p5-ordre',
  kind: 'predict',
  code: 'P5',
  module: 'Mouvement',
  level: 'confirme',
  number: 0,
  title: 'Avant ou après ?',
  situation: 'BP_Balise affiche un mot dans son Construction Script, un à son BeginPlay, un à son premier Tick, et un quand son Timeline de 0,2 s se termine.',
  notions: ['Construction Script', 'BeginPlay', 'Event Tick', 'Timeline › Finished'],
  remember: 'Un acteur se construit (Construction Script), puis commence à jouer (BeginPlay), puis vit image après image (Tick). Un Timeline lancé au BeginPlay se termine plus tard, par Finished.',
  cards: [
    {
      title: 'À lire',
      body:
        '**BP_Balise** a deux graphes : **ConstructionScript** (My Blueprint › Graphs) et l’**Event Graph**.\n\n' +
        'Dans l’Event Graph : BeginPlay affiche un mot puis lance le Timeline **Signal** (0,2 s) ; **Finished** affiche « Fini » ; Tick passe par un **Do Once** pour n’afficher « Tick » qu’à la première image.',
    },
  ],
  objectives: ['Lis les deux graphes sans lancer Play.', 'Choisis l’ordre des quatre mots dans l’onglet Prédis.', 'Puis lance ▶ Play et regarde l’Output Log pour vérifier.'],
  hints: [
    'Lequel des deux graphes s’exécute avant même que la partie commence ?',
    'Le Timeline dure 0,2 s : une douzaine d’images. Le premier Tick arrive dès la première.',
    'Réponse : Construction, BeginPlay, Tick, Fini.',
  ],
  setup() {
    const pb = new ProjectBuilder('Prédis P5');
    const b = pb.blueprint('BP_Balise');
    b.component('StaticMesh', 'Socle', { shape: 'cylinder', sizeX: 60, sizeY: 60, color: '#0ea5e9', blocks: false });
    const { b: cs, entry } = b.construction();
    cs.link(entry, 'then', cs.node('debug.printString', {}, { text: ORDER[0] }, [400, 96]), 'exec');
    const begin = b.node('event.beginPlay', {}, {}, [64, 96]);
    const sayBegin = b.node('debug.printString', {}, { text: ORDER[1] }, [360, 96]);
    const tl = b.node('timeline.node', {}, {}, [700, 96]);
    const data = readTimeline(b.graph.nodes[tl]);
    data.name = 'Signal';
    data.length = 0.2;
    data.tracks[0].keys = [{ t: 0, v: 0 }, { t: 0.2, v: 1 }];
    Object.assign(b.graph.nodes[tl].config, timelineConfig(data));
    const sayEnd = b.node('debug.printString', {}, { text: ORDER[3] }, [1080, 160]);
    const tick = b.node('event.tick', {}, {}, [64, 480]);
    const once = b.node('flow.doOnce', {}, {}, [360, 480]);
    const sayTick = b.node('debug.printString', {}, { text: ORDER[2] }, [700, 480]);
    b.link(begin, 'then', sayBegin, 'exec').link(sayBegin, 'then', tl, 'play').link(tl, 'finished', sayEnd, 'exec');
    b.link(tick, 'then', once, 'exec').link(once, 'completed', sayTick, 'exec');
    pb.place(b, 0, 0);
    pb.playerStart(-300, 0);
    return pb.project;
  },
  scenario: [{ wait: 0.6 }],
  checks: [],
  solve() {},
  predict: {
    question: 'Dans quel ordre les quatre mots s’affichent-ils ?',
    options: [
      'BeginPlay, Construction, Tick, Fini',
      'Construction, BeginPlay, Tick, Fini',
      'Construction, BeginPlay, Fini, Tick',
      'BeginPlay, Tick, Fini : le Construction Script n’affiche rien en jeu',
    ],
    answer: 1,
    explanation:
      'Le Construction Script s’exécute quand l’acteur est construit, avant tout BeginPlay. BeginPlay lance ensuite le Timeline, qui ne fait que démarrer : la chaîne se termine. Le premier Tick arrive à l’image suivante, et Finished 0,2 s plus tard.',
    verify: (prints) => prints.join(', ') === ORDER.join(', '),
  },
};

// ------------------------------------------------------------ Débogue D6

const SEEN = 'Cible en vue';
const NOTHING = 'Rien';
const HIDDEN: [number, number] = [300, 300];

function turretProject() {
  const pb = new ProjectBuilder('La tourelle aveugle');
  const t = pb.blueprint('BP_Tourelle');
  t.component('StaticMesh', 'Base', { shape: 'cylinder', sizeX: 80, sizeY: 80, color: '#7f1d1d' });
  const wall = pb.blueprint('BP_Mur');
  wall.component('StaticMesh', 'Mur', { sizeX: 40, sizeY: 200, color: '#4b5563' });
  pb.place(t, 0, 0);
  pb.place(wall, 150, 150);
  pb.playerStart(300, 0, 180);
  // Every half second: a ray towards the player; "Cible en vue" if it is the first thing hit.
  const begin = t.node('event.beginPlay', {}, {}, [64, 96]);
  const timer = t.node('time.setTimerByEvent', {}, { time: 0.5, looping: true }, [360, 96]);
  const scan = t.node('event.custom', { name: 'Scanner' }, {}, [64, 420]);
  const here = t.node('actor.getLocation', {}, {}, [64, 640]);
  const pawn = t.node('actor.getPlayerPawn', {}, {}, [64, 780]);
  const there = t.node('actor.getLocation', {}, {}, [320, 760]);
  // Ignore Self unchecked: the ray starts inside the turret's own mesh.
  const trace = t.node('trace.lineByChannel', {}, { channel: 1, debug: 2, ignoreSelf: false }, [560, 420]);
  const same = t.node('logic.equalObject', {}, {}, [980, 640]);
  const br = t.node('flow.branch', {}, {}, [1080, 420]);
  const yes = t.node('debug.printString', {}, { text: SEEN }, [1360, 340]);
  const no = t.node('debug.printString', {}, { text: NOTHING }, [1360, 560]);
  t.link(begin, 'then', timer, 'exec').link(scan, 'delegate', timer, 'event');
  t.link(scan, 'then', trace, 'exec').link(here, 'result', trace, 'start').link(pawn, 'result', there, 'target').link(there, 'result', trace, 'end');
  t.link(trace, 'then', br, 'exec').link(trace, 'hitActor', same, 'a').link(pawn, 'result', same, 'b').link(same, 'result', br, 'condition');
  t.link(br, 'true', yes, 'exec').link(br, 'false', no, 'exec');
  return pb.project;
}

/** What the turret printed after `since` seconds of game time. */
const printedSince = (cx: CheckContext, since: number) => cx.sim.log.filter((l) => l.message !== undefined && l.time >= since - 1e-6).map((l) => normText(l.message!));

export const debug6: Lesson = {
  id: 'd6-tourelle-aveugle',
  kind: 'debug',
  code: 'D6',
  module: 'Interaction',
  level: 'avance',
  number: 0,
  title: 'La tourelle aveugle',
  situation: 'Deux fois par seconde, la tourelle lance un rayon vers le joueur et devrait annoncer « Cible en vue ». Le joueur est juste devant elle, et elle affiche toujours « Rien ».',
  notions: ['Line Trace By Channel', 'Ignore Self', 'Out Hit Distance', 'Draw Debug Type'],
  remember: 'Un rayon s’arrête au premier objet qui le bloque, y compris l’acteur qui le lance : parti de son centre avec Ignore Self décoché, il se touche lui-même à la distance 0.',
  cards: [
    {
      title: 'Ce que fait le graphe',
      body:
        'Un timer appelle **Scanner** toutes les 0,5 s. Scanner lance un **Line Trace By Channel** de la tourelle vers le joueur (canal **Camera**, que la capsule du joueur bloque), puis compare **Out Hit Hit Actor** à **Get Player Pawn**.',
    },
    {
      title: 'Enquêter',
      body:
        'Lance ▶ Play : **Draw Debug Type** est sur *For Duration*, le rayon devrait se dessiner jusqu’au joueur. Où est le carré rouge du point touché ?\n\n' +
        'Pour en avoir le cœur net, affiche **Out Hit Hit Actor** ou **Out Hit Distance** avec un Print String : qui est touché, et à quelle distance ?',
    },
  ],
  objectives: [
    'Trouve pourquoi le rayon ne touche jamais le joueur.',
    'Corrige : « Cible en vue » quand le joueur est visible.',
    'Derrière le mur, la tourelle doit afficher « Rien ».',
  ],
  hints: [
    'Le rayon part de Get Actor Location : le centre de la tourelle, à l’intérieur de son propre Static Mesh.',
    'Regarde les entrées du Line Trace : l’une d’elles dit s’il faut ignorer l’acteur qui lance le rayon.',
    'Solution : coche Ignore Self sur Line Trace By Channel.',
  ],
  challenge: 'Sans toucher à Ignore Self : fais partir le rayon de 60 cm devant la tourelle, dans la direction du joueur.',
  setup: turretProject,
  scenario: [{ wait: 1.2 }, { checkpoint: 'devant' }, { teleport: HIDDEN }, { wait: 1.2 }, { checkpoint: 'cache' }],
  checks: [
    {
      id: 'seen',
      label: 'Le joueur devant elle, la tourelle annonce « Cible en vue »',
      at: 'devant',
      test: (cx) => {
        const said = printedSince(cx, 0);
        if (said.includes(normText(SEEN))) return true;
        if (!said.length) return 'La tourelle n’affiche plus rien : le timer doit toujours appeler Scanner.';
        return 'La tourelle affiche toujours « Rien ». Le rayon touche quelque chose avant le joueur : affiche Out Hit Hit Actor et Out Hit Distance pour voir quoi, et à quelle distance.';
      },
    },
    {
      id: 'hidden',
      label: 'Le joueur derrière le mur, elle affiche « Rien »',
      at: 'cache',
      test: (cx) => {
        const said = printedSince(cx, 1.8);
        if (said.includes(normText(SEEN))) return 'La tourelle annonce « Cible en vue » alors que le mur cache le joueur : garde la comparaison entre Out Hit Hit Actor et Get Player Pawn.';
        return said.includes(normText(NOTHING)) ? true : 'Derrière le mur, la tourelle n’affiche plus rien.';
      },
    },
    noRuntimeErrors(),
  ],
  solve(p) {
    const b = edit(p, 'BP_Tourelle');
    Object.values(b.graph.nodes).find((n) => n.def === 'trace.lineByChannel')!.defaults.ignoreSelf = true;
  },
};
