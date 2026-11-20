/**
 * Lot 3a of the path plan: « Le menu pause ». The pause belongs to the
 * player, not to an actor of the level: the Player Controller receives
 * IA_Pause and calls Set Game Paused. The UE trap it teaches: once the game
 * is paused, an Input Action only arrives if Trigger when Paused is ticked,
 * otherwise nothing can end the pause. The « menu » is a message here, to
 * keep to the pause; « Le vrai menu pause » (V7.36) makes it a widget.
 */
import type { Project } from '../../model/project';
import { addInputAction, addMapping, setTriggerWhenPaused } from '../../operations/inputOps';
import { T } from '../../types/pins';
import { edit, ProjectBuilder } from '../builder';
import { countPrints, noRuntimeErrors, notion } from '../checks';
import type { CheckContext, Lesson } from '../types';
import { PLAYER_CONTEXT, PLAYER_CONTROLLER, ensurePlayerInput } from '../ue5Input';
import { say, tap } from './kit';
import { playerBlueprint } from './props';

function project(): Project {
  const pb = new ProjectBuilder('Le menu pause');
  playerBlueprint(pb);
  // A beacon that blinks and ticks every second: what the pause must freeze.
  const b = pb.blueprint('BP_Minuteur');
  b.component('StaticMesh', 'Socle', { shape: 'cylinder', sizeX: 50, sizeY: 50, color: '#374151' });
  b.component('PointLight', 'Voyant', { visible: false, radius: 180, color: '#ef4444' });
  const handle = b.variable('Minuteur', T.struct('TimerHandle'));
  const begin = b.node('event.beginPlay', {}, {}, [64, 96]);
  const timer = b.node('time.setTimerByEvent', {}, { time: 1, looping: true }, [360, 96]);
  const keep = b.node('var.set', { variable: handle }, {}, [700, 96]);
  b.link(begin, 'then', timer, 'exec').link(timer, 'then', keep, 'exec').link(timer, 'handle', keep, 'value');
  const tic = b.node('event.custom', { name: 'Tic' }, {}, [64, 420]);
  b.link(tic, 'delegate', timer, 'event');
  const toggle = b.node('component.toggleVisibility', {}, {}, [380, 420]);
  b.link(tic, 'then', toggle, 'exec').target('Voyant', toggle);
  b.link(toggle, 'then', say(b, [700, 420], 'Tic'), 'exec');
  pb.place(b, 300, -200);
  pb.playerStart(-200, 100);
  const p = pb.project;
  // The UE5 template: IMC_Joueur (E → IA_Interagir), added by BP_PlayerController. IA_Pause is the learner's to make.
  ensurePlayerInput(p, ['E'], { E: 'IA_Interagir' });
  return p;
}

const tics = (cx: CheckContext) => cx.prints().filter((t) => t.trim() === 'Tic').length;

export const lessonPauseMenu: Lesson = {
  id: 'l-menu-pause',
  module: 'Le joueur',
  level: 'confirme',
  number: 0,
  title: 'Le menu pause',
  situation:
    'Le minuteur clignote et affiche « Tic » chaque seconde. Espace doit mettre le jeu en pause (tout se fige, un message l’annonce), puis Espace à nouveau doit le relancer.',
  recalls: ['enhanced-input', 'branch'],
  notions: ['Set Game Paused', 'Is Game Paused', 'Trigger when Paused'],
  remember:
    'Set Game Paused arrête le temps de jeu : Tick, Delay, timers et déplacements attendent. Les entrées aussi : seule une Input Action marquée Trigger when Paused arrive encore, et c’est elle qui permet de sortir de la pause.',
  cards: [
    {
      title: 'Ce qui est en place',
      body:
        'Le projet est réglé comme le template UE5 : **IMC_Joueur** (E → IA_Interagir), ajouté par **BP_PlayerController** au BeginPlay.\n\n' +
        '**BP_Minuteur** lance un timer d’une seconde en boucle : à chaque fois, son Voyant bascule et il affiche `Tic`.\n\n' +
        'Il n’y a pas encore d’action pour la pause.',
    },
    {
      title: 'Ce qui est nouveau : la pause',
      body:
        '**Set Game Paused** (Paused coché) fige le monde : plus de Tick, les Delay, timers et Timelines attendent, le joueur ne bouge plus, **Get Game Time in Seconds** s’arrête. Décoché, tout repart là où il en était. **Is Game Paused** dit si le jeu est en pause : avec un **NOT**, un seul Set Game Paused suffit pour basculer.\n\n' +
        '**Où la mettre ?** La pause concerne le joueur, pas un objet du niveau : on la gère dans le **Player Controller**, qui reste là même si le pion change.\n\n' +
        '**Le piège.** En pause, les entrées n’arrivent plus non plus : une Input Action n’atteint les graphes que si **Trigger when Paused** est coché dans ses Details. Sans lui, l’action qui a mis la pause ne peut plus l’enlever. Pendant Play, l’écran affiche **PAUSED** tant que le jeu est en pause.',
    },
    {
      title: 'Cahier des charges',
      body:
        '- Une Input Action **IA_Pause**, sur **Espace** dans IMC_Joueur (Content Drawer › + Add › Input).\n- Dans **BP_PlayerController** : Espace met le jeu en pause s’il tourne, le relance s’il est en pause.\n- En entrant en pause, un message avec le mot « pause » ; en reprenant, un message avec le mot « reprise ».\n- Pendant la pause, plus aucun `Tic`.\n\n' +
        'Ici, le menu est un simple message : on se concentre sur la pause. Dans UE, ce serait un **Widget Blueprint** affiché par Create Widget et Add to Viewport ; c’est l’étape « Le vrai menu pause », un peu plus loin.',
    },
  ],
  objectives: [
    'Espace met le jeu en pause : le minuteur se fige, un message dit « pause ».',
    'Espace à nouveau relance le jeu : un message dit « reprise », les Tic reprennent.',
    'La pause est gérée dans BP_PlayerController.',
  ],
  hints: [
    'Une Input Action de plus, gérée là où vit le joueur. Et une case à cocher, sans laquelle la seconde pression n’arrive jamais.',
    'Input Action (Trigger when Paused), une ligne dans IMC_Joueur, IA_Pause (Started), Is Game Paused, NOT, Set Game Paused, Branch, Print String.',
    'Solution : IA_Pause avec Trigger when Paused coché ; IMC_Joueur : Space Bar → IA_Pause. BP_PlayerController : IA_Pause (Started) → Set Game Paused (Paused = NOT Is Game Paused) → Branch (Is Game Paused) : True → Print String « Jeu en pause », False → Print String « Jeu en reprise ».',
  ],
  challenge: 'Pendant la pause, fais clignoter un message toutes les 0,5 s. Pourquoi un timer ne marche-t-il pas, et qu’est-ce qui pourrait le faire ?',
  setup: project,
  scenario: [{ wait: 1.5 }, ...tap('SpaceBar'), { checkpoint: 'pause' }, { wait: 2 }, { checkpoint: 'pendant' }, ...tap('SpaceBar'), { checkpoint: 'reprise' }, { wait: 1.2 }],
  checks: [
    {
      id: 'paused',
      label: 'Espace met le jeu en pause',
      at: 'pause',
      test: (cx) => (cx.sim.gamePaused ? true : 'Après Espace, le jeu n’est pas en pause : il faut une Input Action sur Espace, et Set Game Paused derrière.'),
    },
    {
      id: 'menu',
      label: 'Un message annonce la pause',
      at: 'pause',
      test: (cx) => (countPrints(cx, 'pause') > 0 ? true : 'Aucun message avec le mot « pause » en entrant en pause.'),
    },
    {
      id: 'frozen',
      label: 'Pendant la pause, le minuteur est figé',
      at: 'pendant',
      test: (cx) =>
        tics(cx) > 1 || cx.sim.time > 1.7
          ? `Deux secondes après la pause, le temps de jeu a continué (${cx.sim.time.toFixed(1).replace('.', ',')} s, ${tics(cx)} Tic) : le jeu n’est pas resté en pause.`
          : true,
    },
    {
      id: 'resumes',
      label: 'Espace à nouveau relance le jeu',
      at: 'reprise',
      test: (cx) =>
        !cx.sim.gamePaused
          ? true
          : cx.project.inputActions.some((a) => a.triggerWhenPaused)
            ? 'Le jeu est resté en pause après le second appui sur Espace.'
            : 'Le jeu est resté en pause : en pause, une Input Action n’arrive que si Trigger when Paused est coché dans ses Details.',
    },
    {
      id: 'resume-msg',
      label: 'Un message annonce la reprise',
      at: 'reprise',
      test: (cx) => (countPrints(cx, 'reprise') > 0 ? true : 'Aucun message avec le mot « reprise » en sortant de la pause.'),
    },
    {
      id: 'goes-on',
      label: 'Après la reprise, le minuteur repart',
      test: (cx) => (tics(cx) >= 2 ? true : 'Après la reprise, le minuteur n’a plus affiché « Tic ».'),
    },
    notion({
      id: 'in-controller',
      label: 'La pause est gérée dans BP_PlayerController',
      test: (cx) =>
        cx.nodes(PLAYER_CONTROLLER).some((n) => n.def === 'game.setGamePaused')
          ? true
          : 'Set Game Paused n’est pas dans BP_PlayerController : la pause concerne le joueur, c’est là qu’on la gère dans UE.',
    }),
    noRuntimeErrors(),
  ],
  solve(p) {
    const r = addInputAction(p, 'IA_Pause');
    if (!r.ok) throw new Error(r.reason);
    const action = r.value.id;
    setTriggerWhenPaused(p, action, true);
    addMapping(p, p.mappingContexts.find((c) => c.name === PLAYER_CONTEXT)!.id, action, 'SpaceBar');
    const pc = edit(p, PLAYER_CONTROLLER);
    const ev = pc.node('input.action', { action }, {}, [64, 520]);
    const is = pc.node('game.isGamePaused', {}, {}, [200, 760]);
    const not = pc.node('logic.not', {}, {}, [400, 760]);
    const pause = pc.node('game.setGamePaused', {}, {}, [560, 520]);
    const branch = pc.node('flow.branch', {}, {}, [900, 520]);
    const now = pc.node('game.isGamePaused', {}, {}, [760, 760]);
    pc.link(ev, 'started', pause, 'exec').link(is, 'result', not, 'a').link(not, 'result', pause, 'paused');
    pc.link(pause, 'then', branch, 'exec').link(now, 'result', branch, 'condition');
    pc.link(branch, 'true', say(pc, [1220, 460], 'Jeu en pause'), 'exec').link(branch, 'false', say(pc, [1220, 640], 'Jeu en reprise'), 'exec');
  },
};
