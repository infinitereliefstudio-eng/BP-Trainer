/**
 * V5, three more "Débogue" exercises, one per level below Avancé:
 * D7 a pin left checked (Débutant), D8 a DoOnce nobody resets
 * (Intermédiaire), D9 a looping timer nobody stops (Confirmé).
 */
import { T } from '../../types/pins';
import { edit, ProjectBuilder } from '../builder';
import { countPrints, noRuntimeErrors, notion, printedNumbers as numbers, usesNode, visible } from '../checks';
import type { CheckContext, Lesson, ScenarioStep } from '../types';
import { doorBlueprint } from './props';

const METHOD =
  '**Reproduis** le problème avec ▶ Play, **observe** (le niveau, l’Output Log), puis **remonte le fil blanc** depuis l’événement concerné en te demandant à chaque nœud : « fait-il ce que j’attends ? ».\n\n' +
  'Touche un nœud, puis Details › « Pourquoi ce nœud ne s’est pas exécuté ? » : l’appli te dit où le fil s’est arrêté. Corrige une seule chose à la fois, puis revérifie.';

// ----------------------------------------------------------------------- D7

export const debug7: Lesson = {
  id: 'd7-lampe-allumee',
  kind: 'debug',
  code: 'D7',
  module: 'Premiers pas',
  level: 'debutant',
  number: 0,
  title: 'La lampe qui ne s’éteint plus',
  situation: 'La lampe s’allume bien quand le joueur entre dans sa zone. Mais quand il ressort, elle reste allumée.',
  notions: ['Begin / End Overlap', 'Set Visibility', 'Valeur par défaut'],
  remember: 'Deux nœuds identiques ne font pas la même chose si leurs pins n’ont pas les mêmes valeurs : quand un nœud « ne marche pas », lis ses valeurs avant de refaire le graphe.',
  cards: [
    { title: 'Ta première enquête', body: METHOD },
    {
      title: 'Ce que tu sais déjà',
      body:
        'L’allumage marche : l’événement d’entrée et son **Set Visibility** sont donc bons. Le problème est du côté de la **sortie**.\n\n' +
        'Deux questions, dans l’ordre : l’événement de sortie se déclenche-t-il ? Si oui, que fait exactement le nœud qu’il exécute ?',
    },
  ],
  objectives: ['La lampe s’allume quand le joueur entre dans la zone.', 'Elle s’éteint quand il en sort.'],
  hints: [
    'Le fil blanc de End Overlap est bien relié : le nœud s’exécute. Regarde ce qu’il demande.',
    'Compare les deux Set Visibility, pin par pin.',
    'Solution : sur le Set Visibility relié à Event ActorEndOverlap, décoche New Visibility.',
  ],
  setup() {
    const pb = new ProjectBuilder('Débogue D7');
    const lamp = pb.blueprint('BP_Lampe');
    lamp.component('StaticMesh', 'Pied', { shape: 'cylinder', sizeX: 40, sizeY: 40, color: '#6b7280' });
    lamp.component('PointLight', 'Lumiere', { visible: false, radius: 380 });
    lamp.component('BoxCollision', 'Zone', { sizeX: 300, sizeY: 300 });
    pb.place(lamp, 0, 0);
    pb.playerStart(-500, 0);
    const begin = lamp.node('event.actorBeginOverlap', {}, {}, [64, 96]);
    const on = lamp.node('component.setVisibility', {}, { visible: true }, [380, 96]);
    const end = lamp.node('event.actorEndOverlap', {}, {}, [64, 420]);
    const off = lamp.node('component.setVisibility', {}, { visible: true }, [380, 420]);
    lamp.link(begin, 'then', on, 'exec').target('Lumiere', on);
    lamp.link(end, 'then', off, 'exec').target('Lumiere', off);
    return pb.project;
  },
  scenario: [{ wait: 0.3 }, { teleport: [-60, 0] }, { wait: 0.3 }, { checkpoint: 'dedans' }, { teleport: [-500, 0] }, { wait: 0.3 }, { checkpoint: 'apres' }],
  checks: [
    visible('inside', 'BP_Lampe', 'Lumiere', true, 'Allumée quand le joueur est dans la zone', 'dedans'),
    visible('after', 'BP_Lampe', 'Lumiere', false, 'Éteinte quand il en ressort', 'apres'),
    noRuntimeErrors(),
  ],
  solve(p) {
    const b = edit(p, 'BP_Lampe');
    const end = Object.values(b.graph.nodes).find((n) => n.def === 'event.actorEndOverlap')!.id;
    const link = Object.values(b.graph.links).find((l) => l.from.node === end)!;
    b.graph.nodes[link.to.node].defaults.visible = false;
  },
};

// ----------------------------------------------------------------------- D8

const doorYaw = (cx: CheckContext) => Math.abs(cx.component('BP_Porte', 'Porte')?.props.yaw ?? 0);
const pass: ScenarioStep[] = [{ teleport: [150, 0] }, { wait: 0.3 }];
const leave: ScenarioStep[] = [{ teleport: [600, 0] }, { wait: 0.3 }];

function doorIs(id: string, open: boolean, label: string, at: string, why: string) {
  return { id, label, at, test: (cx: CheckContext) => (Math.abs(doorYaw(cx) - (open ? 90 : 0)) < 1 ? true : why) };
}

export const debug8: Lesson = {
  id: 'd8-do-once',
  kind: 'debug',
  code: 'D8',
  module: 'Portes et objets',
  level: 'intermediaire',
  number: 0,
  title: 'La porte d’un seul passage',
  situation: 'La porte s’ouvre à l’approche du joueur, annonce « Ouverture », et se referme quand il s’éloigne. La première fois, tout va bien. La deuxième fois, elle reste fermée, sans aucune erreur.',
  notions: ['DoOnce', 'Event ActorEndOverlap', 'Start Closed'],
  remember: 'Un DoOnce se ferme après le premier passage et le reste tant que le fil blanc n’entre pas par Reset. « Ça marche une fois, puis plus jamais, sans erreur » : cherche un DoOnce.',
  cards: [
    { title: 'Enquêter', body: METHOD },
    {
      title: 'Une panne sans erreur',
      body:
        'L’Output Log est vide : aucun nœud n’a planté. Un nœud a simplement **refusé de laisser passer** le fil blanc.\n\n' +
        'Fais deux passages en Play, puis touche le **Set Relative Rotation** d’ouverture › « Pourquoi ce nœud ne s’est pas exécuté ? ». Quel nœud, juste avant lui, garde le fil ?',
    },
  ],
  objectives: ['La porte s’ouvre à chaque approche, pas seulement à la première.', '« Ouverture » s’affiche une fois par passage.', 'Elle se referme toujours quand le joueur s’éloigne.'],
  hints: [
    'Le DoOnce évite d’annoncer « Ouverture » plusieurs fois pendant un même passage. Mais qui le rouvre ?',
    'La pin Reset du DoOnce n’est reliée à rien. Quel événement marque la fin d’un passage ?',
    'Solution : après le Set Relative Rotation de fermeture (End Overlap), relie le fil blanc à Reset du DoOnce.',
  ],
  setup() {
    const pb = new ProjectBuilder('Débogue D8');
    const door = doorBlueprint(pb);
    pb.playerStart(600, 0);
    const begin = door.node('event.actorBeginOverlap', {}, {}, [64, 96]);
    const once = door.node('flow.doOnce', {}, {}, [360, 96]);
    const say = door.node('debug.printString', {}, { text: 'Ouverture' }, [640, 96]);
    const open = door.node('component.setRelativeRotation', {}, { rotation: { x: 0, y: 0, z: 90 } }, [940, 96]);
    const end = door.node('event.actorEndOverlap', {}, {}, [64, 460]);
    const close = door.node('component.setRelativeRotation', {}, { rotation: { x: 0, y: 0, z: 0 } }, [360, 460]);
    door.link(begin, 'then', once, 'exec').link(once, 'completed', say, 'exec').link(say, 'then', open, 'exec').target('Porte', open);
    door.link(end, 'then', close, 'exec').target('Porte', close);
    return pb.project;
  },
  scenario: [{ wait: 0.3 }, ...pass, { checkpoint: 'un' }, ...leave, { checkpoint: 'loin' }, ...pass, { checkpoint: 'deux' }, ...leave, { checkpoint: 'fin' }],
  checks: [
    doorIs('first', true, 'Premier passage : la porte s’ouvre', 'un', 'La porte ne s’ouvre plus au premier passage : le fil Begin Overlap → DoOnce → Set Relative Rotation doit rester.'),
    doorIs('closed', false, 'Elle se referme quand le joueur s’éloigne', 'loin', 'La porte reste ouverte quand le joueur s’éloigne.'),
    doorIs('second', true, 'Deuxième passage : elle s’ouvre encore', 'deux', 'Au deuxième passage, la porte reste fermée : le DoOnce est resté fermé depuis le premier. Il faut le rouvrir (Reset) quand le passage est fini.'),
    {
      id: 'said',
      label: '« Ouverture » s’affiche une fois par passage',
      at: 'fin',
      test: (cx) => {
        const n = countPrints(cx, 'Ouverture');
        return n === 2 ? true : `« Ouverture » s’est affiché ${n} fois pour deux passages.`;
      },
    },
    noRuntimeErrors(),
  ],
  solve(p) {
    const b = edit(p, 'BP_Porte');
    const nodes = Object.values(b.graph.nodes);
    const once = nodes.find((n) => n.def === 'flow.doOnce')!.id;
    const close = nodes.find((n) => n.def === 'component.setRelativeRotation' && (n.defaults.rotation as { z: number }).z === 0)!.id;
    b.link(close, 'then', once, 'reset');
  },
};

// ----------------------------------------------------------------------- D9

export const debug9: Lesson = {
  id: 'd9-minuteur',
  kind: 'debug',
  code: 'D9',
  module: 'Le temps',
  level: 'confirme',
  number: 0,
  title: 'Le compte à rebours sans fin',
  situation: 'La fusée compte 3, 2, 1 puis annonce « Décollage ». Sauf que « Décollage » se répète ensuite chaque seconde, indéfiniment.',
  notions: ['Set Timer by Event', 'Clear and Invalidate Timer by Handle', 'Branch'],
  remember: 'Un timer en Looping ne s’arrête jamais de lui-même : celui qui le lance garde son Handle et l’arrête (Clear and Invalidate Timer by Handle) quand le travail est fini.',
  cards: [
    { title: 'Enquêter', body: METHOD },
    {
      title: 'Ce qui tourne encore',
      body:
        'Le graphe n’a pas d’erreur de logique dans son calcul : 3, 2, 1, Décollage est juste. Le défaut, c’est ce qui se passe **après**.\n\n' +
        'Le **Set Timer by Event** est en **Looping** : il rappelle `Tic` chaque seconde, pour toujours. Son Handle est déjà rangé dans la variable `Minuteur` : il ne manque que le nœud qui s’en sert.',
    },
    {
      title: 'Masquer n’est pas arrêter',
      body:
        'Un DoOnce devant le Print String ferait disparaître les messages en trop… mais le timer continuerait de tourner et d’exécuter `Tic` chaque seconde, pour rien, jusqu’à la fin de la partie.\n\n' +
        'Corriger un bug, c’est arrêter sa cause, pas cacher son effet.',
    },
  ],
  objectives: ['La fusée affiche 3, 2, 1, puis « Décollage » une seule fois.', 'Le timer est arrêté après le décollage.'],
  hints: [
    'Suis la sortie False du Branch : après « Décollage », rien n’arrête le timer.',
    'Nœuds : Clear and Invalidate Timer by Handle, et un Get de la variable Minuteur.',
    'Solution : Print String « Décollage » → Clear and Invalidate Timer by Handle (Handle = Get Minuteur).',
  ],
  setup() {
    const pb = new ProjectBuilder('Débogue D9');
    const b = pb.blueprint('BP_Fusee');
    b.component('StaticMesh', 'Corps', { shape: 'cylinder', sizeX: 70, sizeY: 70, color: '#e11d48', blocks: false });
    const compte = b.variable('Compte', T.int, 3);
    const handle = b.variable('Minuteur', T.struct('TimerHandle'));
    pb.place(b, 0, 0);
    pb.playerStart(-300, 0);
    const begin = b.node('event.beginPlay', {}, {}, [64, 96]);
    const timer = b.node('time.setTimerByEvent', {}, { time: 1, looping: true }, [360, 96]);
    const keep = b.node('var.set', { variable: handle }, {}, [700, 96]);
    b.link(begin, 'then', timer, 'exec').link(timer, 'then', keep, 'exec').link(timer, 'handle', keep, 'value');
    const tic = b.node('event.custom', { name: 'Tic' }, {}, [64, 440]);
    b.link(tic, 'delegate', timer, 'event');
    const br = b.node('flow.branch', {}, {}, [360, 440]);
    const gt = b.node('math.greaterInt', {}, { b: 0 }, [200, 660]);
    const say = b.node('debug.printString', {}, {}, [660, 380]);
    const dec = b.node('var.decrementInt', {}, {}, [960, 380]);
    const go = b.node('debug.printString', {}, { text: 'Décollage' }, [660, 640]);
    b.link(tic, 'then', br, 'exec').link(b.node('var.get', { variable: compte }, {}, [64, 660]), 'value', gt, 'a').link(gt, 'result', br, 'condition');
    b.link(br, 'true', say, 'exec').link(b.node('var.get', { variable: compte }, {}, [500, 520]), 'value', say, 'text');
    b.link(say, 'then', dec, 'exec').link(b.node('var.get', { variable: compte }, {}, [800, 560]), 'value', dec, 'value');
    b.link(br, 'false', go, 'exec');
    return pb.project;
  },
  scenario: [{ wait: 7.5 }],
  checks: [
    {
      id: 'count',
      label: 'Le compte à rebours s’affiche : 3, 2, 1',
      test: (cx) => (numbers(cx).join() === '3,2,1' ? true : `Nombres affichés : ${numbers(cx).join(', ') || 'aucun'}. Le compte 3, 2, 1 doit rester.`),
    },
    {
      id: 'once',
      label: '« Décollage » s’affiche une seule fois',
      test: (cx) => {
        const n = countPrints(cx, 'Décollage');
        if (n === 1) return true;
        return n ? `« Décollage » s’est affiché ${n} fois en 7,5 s : le timer tourne toujours.` : '« Décollage » ne s’affiche plus.';
      },
    },
    {
      id: 'stopped',
      label: 'Le timer est arrêté, pas seulement masqué',
      test: (cx) => {
        // The Branch behind Tic runs once per call of the timer.
        let runs = 0;
        for (const g of cx.project.classes.find((c) => c.name === 'BP_Fusee')?.graphs ?? []) {
          for (const n of Object.values(g.nodes)) if (n.def === 'flow.branch') runs = Math.max(runs, cx.sim.record.runsOf(g.id, n.id)?.count ?? 0);
        }
        return runs <= 4 ? true : `Tic s’est exécuté ${runs} fois en 7,5 s : le timer continue de tourner derrière. Arrête-le avec Clear and Invalidate Timer by Handle.`;
      },
    },
    notion(usesNode('clear', 'BP_Fusee', ['time.clearTimer'], 'Le timer est arrêté par Clear and Invalidate Timer by Handle', 'Arrête le timer avec son Handle (variable Minuteur).')),
    noRuntimeErrors(),
  ],
  solve(p) {
    const b = edit(p, 'BP_Fusee');
    const go = Object.values(b.graph.nodes).find((n) => n.def === 'debug.printString' && n.defaults.text === 'Décollage')!.id;
    const handle = b.cls.variables.find((v) => v.name === 'Minuteur')!.id;
    const stop = b.node('time.clearTimer', {}, {}, [960, 640]);
    b.link(go, 'then', stop, 'exec').link(b.node('var.get', { variable: handle }, {}, [800, 800]), 'value', stop, 'handle');
  },
};
