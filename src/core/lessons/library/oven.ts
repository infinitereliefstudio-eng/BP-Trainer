/**
 * V6, Confirmé: "Débogue D11 — Le four qui oublie son annulation" (E09).
 * The cooking time is a Delay: it cannot be cancelled, and a relaunch during
 * the old wait is ignored, so the new cooking ends with the old clock. The
 * fix is a timer kept by its handle.
 */
import { removeNodes } from '../../operations/graphOps';
import { T } from '../../types/pins';
import { edit, ProjectBuilder } from '../builder';
import { countPrints, noRuntimeErrors, notion, usesNode } from '../checks';
import type { CheckContext, Lesson } from '../types';
import { DEBUG_METHOD, getVar, nodeOf, nodesOf, say, setVar, tap } from './kit';

const TIME = 3;
const START = 'Cuisson lancée';
const READY = 'C’est prêt';
const CANCEL = 'Cuisson annulée';

function ovenProject() {
  const pb = new ProjectBuilder('Débogue D11');
  const b = pb.blueprint('BP_Four');
  b.component('StaticMesh', 'Four', { sizeX: 120, sizeY: 90, color: '#44403c' });
  b.component('PointLight', 'Voyant', { visible: false, radius: 260, color: '#f97316' });
  b.cls.autoReceiveInput = true;
  b.variable('EnCuisson', T.bool, false);
  pb.place(b, 0, 0);
  pb.playerStart(-300, 0);
  // E: start, if nothing is cooking.
  const e = b.node('event.inputKey', { key: 'E' }, {}, [64, 96]);
  const free = b.node('flow.branch', {}, {}, [340, 96]);
  const not = b.node('logic.not', {}, {}, [200, 300]);
  const on = setVar(b, 'EnCuisson', [620, 96], true);
  const lit = b.node('component.setVisibility', {}, { visible: true }, [900, 96]);
  const started = say(b, [1200, 96], START);
  const wait = b.node('time.delay', {}, { duration: TIME }, [1500, 96]);
  const still = b.node('flow.branch', {}, {}, [1780, 96]);
  const ready = say(b, [2060, 96], `${READY} !`);
  const off = setVar(b, 'EnCuisson', [2340, 96], false);
  const dark = b.node('component.setVisibility', {}, { visible: false }, [2620, 96]);
  b.link(e, 'pressed', free, 'exec').link(getVar(b, 'EnCuisson', [40, 310]), 'value', not, 'a').link(not, 'result', free, 'condition');
  b.link(free, 'true', on, 'exec').link(on, 'then', lit, 'exec').target('Voyant', lit).link(lit, 'then', started, 'exec').link(started, 'then', wait, 'exec');
  b.link(wait, 'completed', still, 'exec').link(getVar(b, 'EnCuisson', [1600, 310]), 'value', still, 'condition');
  b.link(still, 'true', ready, 'exec').link(ready, 'then', off, 'exec').link(off, 'then', dark, 'exec').target('Voyant', dark);
  // F: cancel, if something is cooking.
  const f = b.node('event.inputKey', { key: 'F' }, {}, [64, 620]);
  const busy = b.node('flow.branch', {}, {}, [340, 620]);
  const stop = setVar(b, 'EnCuisson', [620, 620], false);
  const dark2 = b.node('component.setVisibility', {}, { visible: false }, [900, 620]);
  const cancelled = say(b, [1200, 620], CANCEL);
  b.link(f, 'pressed', busy, 'exec').link(getVar(b, 'EnCuisson', [160, 820]), 'value', busy, 'condition');
  b.link(busy, 'true', stop, 'exec').link(stop, 'then', dark2, 'exec').target('Voyant', dark2).link(dark2, 'then', cancelled, 'exec');
  return pb.project;
}

const ready = (cx: CheckContext) => countPrints(cx, READY);

export const debug11: Lesson = {
  id: 'd11-four',
  kind: 'debug',
  code: 'D11',
  module: 'Le temps',
  level: 'confirme',
  number: 0,
  title: 'Le four qui oublie son annulation',
  situation: `E lance une cuisson de ${TIME} secondes, F l’annule. Une cuisson seule marche. Mais si on annule puis qu’on relance aussitôt, « C’est prêt ! » arrive bien trop tôt : la nouvelle cuisson finit à l’heure de l’ancienne.`,
  notions: ['Delay', 'Set Timer by Event', 'Timer Handle', 'Clear and Invalidate Timer by Handle', 'Annuler une action en attente'],
  remember:
    'Un Delay ne s’annule pas et ignore les appels qui arrivent pendant son attente. Dès qu’une attente doit pouvoir être annulée ou relancée, c’est un timer : Set Timer by Event, son Timer Handle gardé dans une variable, et Clear and Invalidate Timer by Handle pour l’arrêter.',
  cards: [
    DEBUG_METHOD,
    {
      title: 'Ce que fait le graphe',
      body:
        '**E** : si rien ne cuit (`EnCuisson` faux), la cuisson démarre : `EnCuisson` passe à vrai, le voyant s’allume, puis un **Delay** de 3 secondes. Au bout du Delay, si `EnCuisson` est toujours vrai : « C’est prêt ! ».\n\n' +
        '**F** : si une cuisson est en cours, `EnCuisson` repasse à faux et le voyant s’éteint. L’idée : au bout du Delay, le Branch verra `EnCuisson` faux et n’annoncera rien.\n\n' +
        'L’idée marche tant qu’on ne relance pas. Reproduis : E, attends 1 seconde, F, puis E tout de suite. Chronomètre l’arrivée de « C’est prêt ! ».',
    },
    {
      title: 'Ce qu’un Delay ne sait pas faire',
      body:
        '**Delay** est un nœud **latent** (l’horloge sur son en-tête) : le fil blanc y entre, attend, puis ressort par Completed. Deux limites :\n\n' +
        '- Rien ne peut l’**arrêter**. F change une variable, mais l’attente continue.\n' +
        '- Un nouvel appel **pendant l’attente est ignoré** : le compte ne repart pas de zéro.\n\n' +
        'Donc après E, F, E : le second E arrive pendant l’ancienne attente, son Delay est ignoré, et c’est l’**ancien** compte qui se termine… alors que `EnCuisson` est redevenu vrai. Touche le Delay › « Pourquoi ? » après ton essai : l’appli te montre l’appel ignoré.',
    },
    {
      title: 'Le timer : une attente qu’on tient en main',
      body:
        '**Set Timer by Event** lance un compte à rebours et appelle un **Custom Event** à la fin. Ses pins :\n\n' +
        '- **Event** (carré rouge) : relie-y le carré rouge d’un Custom Event, par exemple `FinCuisson`.\n' +
        '- **Time** : la durée, en secondes. **Looping** : décoché ici, la cuisson ne finit qu’une fois.\n' +
        '- **Return Value** : un **Timer Handle**, le « ticket » de ce timer. Range-le dans une variable de type Timer Handle.\n\n' +
        '**Clear and Invalidate Timer by Handle** arrête le timer dont on lui donne le ticket (pin en losange : relie-y le Get de ta variable). Arrêté, il n’appellera jamais son événement.',
    },
    {
      title: 'Le plan',
      body:
        '1. Crée une variable `Minuteur` de type **Timer Handle**.\n' +
        '2. Remplace le Delay par **Set Timer by Event** (Time 3), et garde son Return Value dans `Minuteur`.\n' +
        '3. Ajoute un Custom Event `FinCuisson`, relié à la pin Event du timer : c’est lui qui annonce « C’est prêt ! », remet `EnCuisson` à faux et éteint le voyant.\n' +
        '4. Sur F : **Clear and Invalidate Timer by Handle** avec `Minuteur`.\n\n' +
        'Garde le Branch « rien ne cuit ? » sur E : relancer un timer déjà en route le ferait repartir de zéro, et un second appui pendant la cuisson la retarderait.',
    },
  ],
  objectives: [
    'Une cuisson annulée ne se termine jamais.',
    `Une cuisson relancée après une annulation dure ses ${TIME} secondes entières.`,
    'Un second appui sur E pendant une cuisson ne la retarde pas.',
  ],
  hints: [
    'F ne peut pas arrêter un Delay, et un Delay déjà en attente ignore le E suivant. Il faut une attente qu’on peut arrêter.',
    'Nœuds : Set Timer by Event, un Custom Event, une variable Timer Handle (Set puis Get), Clear and Invalidate Timer by Handle. Le Delay et le Branch qui le suit disparaissent.',
    'Solution : E → Branch (NOT EnCuisson) → Set EnCuisson → voyant → Print → Set Timer by Event (Time 3, Event = FinCuisson) → Set Minuteur. FinCuisson → Print « C’est prêt ! » → Set EnCuisson faux → voyant éteint. F → … → Clear and Invalidate Timer by Handle (Minuteur).',
  ],
  challenge: 'Ajoute un Text Render et affiche le temps restant deux fois par seconde : Get Timer Remaining Time by Handle sur Minuteur.',
  setup: ovenProject,
  scenario: [
    { wait: 0.2 },
    ...tap('E'),
    { wait: 1 },
    ...tap('F'),
    { wait: 0.5 },
    ...tap('E'),
    { wait: 2 },
    { checkpoint: 'tot' },
    { wait: 1.3 },
    { checkpoint: 'pret' },
    ...tap('E'),
    { wait: 1 },
    ...tap('E'),
    { wait: 2.3 },
  ],
  checks: [
    {
      id: 'early',
      label: '2 secondes après la relance, rien n’est encore prêt',
      at: 'tot',
      test: (cx) =>
        ready(cx) === 0
          ? true
          : '« C’est prêt ! » s’est affiché 1,5 seconde après la relance : c’est l’attente de la première cuisson, jamais arrêtée, qui vient de finir. Le Delay de la relance, lui, a été ignoré.',
    },
    {
      id: 'lit',
      label: 'Le voyant reste allumé pendant la cuisson relancée',
      at: 'tot',
      test: (cx) => (cx.component('BP_Four', 'Voyant')?.props.visible ? true : 'Le voyant est éteint alors que la cuisson relancée devrait être en cours.'),
    },
    {
      id: 'full',
      label: `La cuisson relancée se termine après ses ${TIME} secondes`,
      at: 'pret',
      test: (cx) => (ready(cx) === 1 ? true : ready(cx) === 0 ? 'Plus de 3 secondes après la relance, toujours pas de « C’est prêt ! » : le timer est-il bien lancé à chaque cuisson, et son événement relié ?' : `« C’est prêt ! » s’est affiché ${ready(cx)} fois pour une seule cuisson menée au bout.`),
    },
    {
      id: 'repeat',
      label: 'Un second appui sur E pendant la cuisson ne la retarde pas',
      test: (cx) =>
        ready(cx) === 2
          ? true
          : ready(cx) < 2
            ? 'La dernière cuisson n’est pas prête 3,3 secondes après son lancement : le second appui sur E a relancé le timer. Laisse le Branch « rien ne cuit ? » avant Set Timer by Event.'
            : `« C’est prêt ! » s’est affiché ${ready(cx)} fois pour deux cuissons menées au bout.`,
    },
    {
      id: 'cancel',
      label: 'L’annulation est annoncée une fois, et le voyant finit éteint',
      test: (cx) => (countPrints(cx, CANCEL) !== 1 ? `« Cuisson annulée » s’est affiché ${countPrints(cx, CANCEL)} fois au lieu d’une.` : cx.component('BP_Four', 'Voyant')?.props.visible ? 'Le voyant est encore allumé à la fin.' : true),
    },
    notion(usesNode('timer', 'BP_Four', ['time.setTimerByEvent'], 'La cuisson est un timer', 'La durée de cuisson doit pouvoir être arrêtée : utilise Set Timer by Event.')),
    notion(usesNode('clear', 'BP_Four', ['time.clearTimer'], 'L’annulation arrête le timer', 'Arrête le timer avec Clear and Invalidate Timer by Handle, plutôt que de le laisser finir dans le vide.')),
    noRuntimeErrors(),
  ],
  solve(p) {
    const b = edit(p, 'BP_Four');
    const g = b.graph;
    const delay = nodeOf(g, 'time.delay');
    const started = nodesOf(g, 'debug.printString').find((n) => n.defaults.text === START)!.id;
    const readyNode = nodesOf(g, 'debug.printString').find((n) => String(n.defaults.text).startsWith(READY))!.id;
    const cancelled = nodesOf(g, 'debug.printString').find((n) => n.defaults.text === CANCEL)!.id;
    // The Branch after the Delay, and the Get it reads, go with it.
    const still = Object.values(g.links).find((l) => l.from.node === delay && l.from.pin === 'completed')!.to.node;
    const stillGet = Object.values(g.links).find((l) => l.to.node === still && l.to.pin === 'condition')!.from.node;
    removeNodes(g, [delay, still, stillGet]);
    const handle = b.variable('Minuteur', T.struct('TimerHandle'));
    const timer = b.node('time.setTimerByEvent', {}, { time: TIME, looping: false }, [1500, 96]);
    const keep = b.node('var.set', { variable: handle }, {}, [1820, 96]);
    const done = b.node('event.custom', { name: 'FinCuisson' }, {}, [1500, 360]);
    b.link(started, 'then', timer, 'exec').link(done, 'delegate', timer, 'event').link(timer, 'then', keep, 'exec').link(timer, 'handle', keep, 'value');
    b.link(done, 'then', readyNode, 'exec');
    const clear = b.node('time.clearTimer', {}, {}, [1500, 620]);
    b.link(cancelled, 'then', clear, 'exec').link(b.node('var.get', { variable: handle }, {}, [1340, 820]), 'value', clear, 'handle');
  },
};
