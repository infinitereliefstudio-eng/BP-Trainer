/**
 * V7.36, UMG at Confirmé (docs/PLAN_UMG.md):
 *
 * - « Le vrai menu pause », the sequel of « Le menu pause » and of « Le
 *   menu qui rend le contrôle »: Space pauses the game and shows WBP_Pause;
 *   its Reprendre button still answers while the game is paused (widgets
 *   are not frozen by Set Game Paused), closes the menu in order and
 *   resumes the game.
 * - D25 « Le bouton qui ne répond pas »: a terminal opened with F, whose
 *   button does nothing. The game stays in Game Only, where touches never
 *   reach the widgets. Fixing it with UI Only makes F unable to close the
 *   terminal; Game and UI is the mode that fits.
 */
import type { Project } from '../../model/project';
import { T } from '../../types/pins';
import { edit, ProjectBuilder } from '../builder';
import { noRuntimeErrors, notion } from '../checks';
import type { Check, CheckContext, Lesson } from '../types';
import { ensurePlayerInput, PLAYER_CONTROLLER } from '../ue5Input';
import { DEBUG_METHOD, nodeOf, nodesOf, say, tap } from './kit';
import { lessonPauseMenu } from './pauseMenu';
import { playerBlueprint } from './props';
import { UMG_MODULE } from './umgCounter';
import { actionId, button, controller, ignoredTouch, made, menuPanel, modeLabel, newClass, onButton, shown } from './umgKit';

// ------------------------------------------------------- Le vrai menu pause

const PAUSE = 'WBP_Pause';
const tics = (cx: CheckContext) => cx.prints().filter((t) => t.trim() === 'Tic').length;

function pauseShown(id: string, label: string, at: string): Check {
  return {
    id,
    label,
    at,
    test: (cx) => {
      if (!cx.sim.gamePaused) return 'Après Espace, le jeu n’est pas en pause.';
      const n = shown(cx, PAUSE).length;
      if (n === 1) return true;
      if (n > 1) return `${n} menus pause à l’écran : crée-le une seule fois et garde-le dans une variable.`;
      if (!made(cx, PAUSE).length) return `Le jeu est en pause, mais aucun ${PAUSE} n’a été créé : Create Widget, dans ${PLAYER_CONTROLLER}.`;
      return 'Le menu pause existe mais n’est pas à l’écran : Add to Viewport quand le jeu passe en pause.';
    },
  };
}

function resumed(id: string, label: string, at: string): Check {
  return {
    id,
    label,
    at,
    test: (cx) => {
      if (!made(cx, PAUSE).length) return 'Le menu pause ne s’est jamais affiché.';
      const why = ignoredTouch(cx, 'Btn_Reprendre');
      if (why) return why;
      if (!cx.sim.record.buttons.includes(`${PAUSE}/Btn_Reprendre`))
        return 'Le toucher sur Reprendre n’a rien déclenché : ajoute On Clicked (Btn_Reprendre) dans le Graph de WBP_Pause.';
      if (cx.sim.gamePaused) return 'Reprendre a répondu, mais le jeu est resté en pause : Set Game Paused (décoché) dans son On Clicked.';
      if (shown(cx, PAUSE).length) return 'Le jeu a repris, mais le menu est resté à l’écran : Remove from Parent.';
      if (cx.sim.inputMode !== 'GameOnly') return `Le jeu a repris en ${modeLabel(cx)} : Set Input Mode Game Only en fermant le menu.`;
      if (cx.sim.showMouseCursor) return 'Le jeu a repris, mais le curseur est resté visible : Set Show Mouse Cursor décoché.';
      return true;
    },
  };
}

export const lessonRealPauseMenu: Lesson = {
  id: 'l-vrai-menu-pause',
  module: UMG_MODULE,
  level: 'confirme',
  number: 0,
  title: 'Le vrai menu pause',
  situation:
    'Dans « Le menu pause », le menu n’était qu’un message. Cette fois, Espace met le jeu en pause et affiche un vrai menu, avec un bouton Reprendre qui le ferme et relance le jeu.',
  recalls: ['player-controller'],
  notions: ['Set Game Paused', 'On Clicked', 'Set Input Mode UI Only', 'Set Show Mouse Cursor', 'Remove from Parent'],
  remember:
    'Set Game Paused fige le monde, pas l’interface : les boutons et l’Event Tick d’un widget marchent pendant la pause. Un menu pause s’ouvre comme tout menu (Add to Viewport, mode d’entrée, curseur) et son bouton Reprendre fait le chemin inverse, plus Set Game Paused décoché.',
  cards: [
    {
      title: 'Ce qui est en place',
      body:
        'La solution du « Menu pause » : **IA_Pause** sur Espace (Trigger when Paused coché) ; dans **BP_PlayerController**, Espace bascule la pause et affiche « Jeu en pause » ou « Jeu en reprise ». **BP_Minuteur** affiche `Tic` chaque seconde.\n\n' +
        '**WBP_Pause** est déjà dessiné : un fond, le titre « Pause » et le bouton **Btn_Reprendre**. Son Graph est vide.',
    },
    {
      title: 'Ce qui est nouveau : l’interface ne se fige pas',
      body:
        'Set Game Paused arrête le temps du **monde** : acteurs, Tick, timers, déplacements. Les widgets, eux, continuent : leur Event Tick passe, leurs boutons répondent. C’est ce qui rend un menu pause possible.\n\n' +
        'En revanche, un **Delay** posé dans un widget attend la fin de la pause, comme dans un acteur.',
    },
    {
      title: 'Cahier des charges',
      body:
        '- Espace met en pause **et** affiche WBP_Pause, avec le curseur et un mode d’entrée qui laisse toucher le bouton.\n' +
        '- Pendant la pause, plus aucun `Tic`.\n' +
        '- **Reprendre** retire le menu, relance le jeu, remet Game Only et cache le curseur.\n' +
        '- Une seconde pause réaffiche **le même** menu, un seul.\n\n' +
        'Même méthode que dans « Le menu qui rend le contrôle ». Ici, le plus simple est de créer le menu une fois au BeginPlay du Player Controller, et de seulement l’afficher en pause.',
    },
  ],
  objectives: [
    'Espace met en pause et affiche WBP_Pause, avec le curseur.',
    'Reprendre ferme le menu et relance le jeu, en Game Only, sans curseur.',
    'Une seconde pause affiche de nouveau le menu, un seul.',
  ],
  hints: [
    'L’ouverture va là où le Player Controller met déjà la pause ; la reprise, dans le bouton. La pause ne bloque ni les boutons, ni le Set Game Paused qu’ils appellent.',
    'Create Widget, Promote to Variable, Add to Viewport, Set Input Mode UI Only, Set Show Mouse Cursor ; dans WBP_Pause : On Clicked (Btn_Reprendre), Remove from Parent, Set Game Paused, Get Owning Player, Set Input Mode Game Only.',
    'Solution : BP_PlayerController, après Add Mapping Context : Create WBP_Pause Widget (Owning Player = Self) → Set MenuPause. Après « Jeu en pause » : Add to Viewport (MenuPause) → Set Input Mode UI Only (Self, Focus = MenuPause) → Set Show Mouse Cursor (coché). WBP_Pause : On Clicked (Btn_Reprendre) → Remove from Parent → Set Game Paused (décoché) → Set Input Mode Game Only (Get Owning Player) → Set Show Mouse Cursor (décoché, Get Owning Player).',
  ],
  challenge: 'Fais aussi reprendre le jeu par Espace, menu compris. En UI Only, Espace n’arrive plus : quel mode faut-il, et qui retire alors le menu ?',
  setup() {
    const p = lessonPauseMenu.setup();
    lessonPauseMenu.solve(p);
    p.name = 'Le vrai menu pause';
    const w = newClass(p, PAUSE, 'UserWidget');
    button(p, w.cls, menuPanel(p, w.cls, 'Pause', { back: '#0f172a' }), 'Btn_Reprendre', 'Reprendre', 0, 120);
    return p;
  },
  scenario: [
    { wait: 1.5 },
    ...tap('SpaceBar'),
    { wait: 0.1 },
    { checkpoint: 'pause' },
    { wait: 2 },
    { checkpoint: 'pendant' },
    { click: `${PAUSE}/Btn_Reprendre` },
    { wait: 0.1 },
    { checkpoint: 'reprise' },
    { wait: 1.2 },
    { checkpoint: 'tic' },
    ...tap('SpaceBar'),
    { wait: 0.1 },
    { checkpoint: 'pause2' },
    { click: `${PAUSE}/Btn_Reprendre` },
    { wait: 0.1 },
    { checkpoint: 'reprise2' },
  ],
  checks: [
    pauseShown('menu', 'Espace met en pause et affiche le menu', 'pause'),
    {
      id: 'reachable',
      label: 'Le curseur est visible et le bouton peut être touché',
      at: 'pause',
      test: (cx) => {
        if (!shown(cx, PAUSE).length) return 'Le menu pause n’est pas à l’écran.';
        if (cx.sim.inputMode === 'GameOnly') return 'Le menu est affiché, mais le jeu est en Game Only : un toucher sur Reprendre partirait au jeu. Set Input Mode UI Only (ou Game and UI).';
        return cx.sim.showMouseCursor ? true : 'Le menu est affiché, mais le curseur est caché : Set Show Mouse Cursor (coché).';
      },
    },
    {
      id: 'frozen',
      label: 'Pendant la pause, le minuteur est figé',
      at: 'pendant',
      test: (cx) => (tics(cx) > 1 || cx.sim.time > 1.7 ? `Deux secondes après la pause, le temps de jeu a continué (${tics(cx)} Tic) : le jeu n’est pas resté en pause.` : true),
    },
    resumed('resumes', 'Reprendre ferme le menu et relance le jeu', 'reprise'),
    {
      id: 'goes-on',
      label: 'Après la reprise, le minuteur repart',
      at: 'tic',
      test: (cx) => (tics(cx) >= 2 ? true : 'Après la reprise, le minuteur n’a plus affiché « Tic ».'),
    },
    pauseShown('menu2', 'Une seconde pause réaffiche le menu, un seul', 'pause2'),
    resumed('resumes2', 'Et Reprendre referme tout', 'reprise2'),
    notion({
      id: 'once',
      label: 'Le menu pause est créé une fois, puis réutilisé',
      test: (cx) => (made(cx, PAUSE).length <= 1 ? true : `Deux pauses ont créé ${made(cx, PAUSE).length} menus : crée-le une fois et garde-le dans une variable.`),
    }),
    noRuntimeErrors(),
  ],
  solve(p) {
    const w = edit(p, PAUSE);
    const click = onButton(w, 'Btn_Reprendre');
    const remove = w.node('widget.removeFromParent', {}, {}, [400, 96]);
    const resume = w.node('game.setGamePaused', {}, { paused: false }, [700, 96]);
    const game = w.node('input.setModeGameOnly', {}, {}, [1000, 96]);
    const cursor = w.node('input.setShowMouseCursor', {}, { show: false }, [1340, 96]);
    const owner = w.node('widget.getOwningPlayer', {}, {}, [800, 320]);
    w.link(click, 'then', remove, 'exec').link(remove, 'then', resume, 'exec').link(resume, 'then', game, 'exec').link(game, 'then', cursor, 'exec');
    w.link(owner, 'result', game, 'controller').link(owner, 'result', cursor, 'target');

    const { b: pc, last } = controller(p);
    const menu = pc.variable('MenuPause', T.object(PAUSE));
    const get = (x: number, y: number) => pc.node('var.get', { variable: menu }, {}, [x, y]);
    const self = (x: number, y: number) => pc.node('actor.self', {}, {}, [x, y]);
    const create = pc.node('widget.create', {}, { class: w.cls.id }, [1100, 96]);
    const set = pc.node('var.set', { variable: menu }, {}, [1440, 96]);
    pc.link(last, 'then', create, 'exec').link(self(1000, 300), 'self', create, 'owner').link(create, 'then', set, 'exec').link(create, 'result', set, 'value');
    const branch = nodeOf(pc.graph, 'flow.branch');
    const announce = Object.values(pc.graph.links).find((l) => l.from.node === branch && l.from.pin === 'true')!.to.node;
    const show = pc.node('widget.addToViewport', {}, {}, [1540, 460]);
    const mode = pc.node('input.setModeUIOnly', {}, {}, [1840, 460]);
    const cursorOn = pc.node('input.setShowMouseCursor', {}, { show: true }, [2200, 460]);
    pc.link(announce, 'then', show, 'exec').link(get(1400, 640), 'value', show, 'target');
    pc.link(show, 'then', mode, 'exec').link(self(1700, 700), 'self', mode, 'controller').link(get(1720, 800), 'value', mode, 'focus');
    pc.link(mode, 'then', cursorOn, 'exec');
  },
};

// ------------------------------------------- D25 : le bouton qui ne répond pas

const TERMINAL = 'WBP_Terminal';

function terminalProject(): Project {
  const pb = new ProjectBuilder('Le bouton qui ne répond pas');
  playerBlueprint(pb);
  const door = pb.blueprint('BP_Porte');
  door.component('StaticMesh', 'Porte', { shape: 'door', sizeX: 200, sizeY: 16, color: '#a0703c' });
  const open = door.variable('Ouverte', T.bool, false);
  const ev = door.node('event.custom', { name: 'Ouvrir' }, {}, [64, 96]);
  const rot = door.node('component.setRelativeRotation', {}, { rotation: { x: 0, y: 0, z: 90 } }, [360, 96]);
  const set = door.node('var.set', { variable: open }, { value: true }, [700, 96]);
  door.link(ev, 'then', rot, 'exec').target('Porte', rot).link(rot, 'then', set, 'exec').link(set, 'then', say(door, [1000, 96], 'Porte ouverte'), 'exec');
  pb.place(door, 400, -200, 90);
  const console = pb.blueprint('BP_Console');
  console.component('StaticMesh', 'Pupitre', { sizeX: 70, sizeY: 50, color: '#334155' });
  pb.place(console, 0, -120);
  pb.playerStart(0, 0);
  const p = pb.project;
  ensurePlayerInput(p, ['F'], { F: 'IA_Terminal' });

  // WBP_Terminal: its button opens the door (that part works).
  const w = newClass(p, TERMINAL, 'UserWidget');
  button(p, w.cls, menuPanel(p, w.cls, 'Terminal de la station', { back: '#052e16', title: '#86efac' }), 'Btn_Ouvrir', 'Ouvrir la porte', 0, 120);
  const click = onButton(w, 'Btn_Ouvrir');
  const find = w.node('actor.getOfClass', {}, { class: door.cls.id }, [400, 96]);
  const call = w.node('call.custom', { owner: door.cls.id, event: 'Ouvrir' }, {}, [760, 96]);
  w.link(click, 'then', find, 'exec').link(find, 'then', call, 'exec').link(find, 'result', call, 'target');

  // BP_PlayerController: the terminal created once; F shows or removes it, with the cursor. No input mode: the bug.
  const { b: pc, last } = controller(p);
  const term = pc.variable('Terminal', T.object(TERMINAL));
  const get = (x: number, y: number) => pc.node('var.get', { variable: term }, {}, [x, y]);
  const create = pc.node('widget.create', {}, { class: w.cls.id }, [1100, 96]);
  const keep = pc.node('var.set', { variable: term }, {}, [1440, 96]);
  pc.link(last, 'then', create, 'exec').link(pc.node('actor.self', {}, {}, [1000, 300]), 'self', create, 'owner').link(create, 'then', keep, 'exec').link(create, 'result', keep, 'value');
  const ev2 = pc.node('input.action', { action: actionId(p, 'IA_Terminal') }, {}, [64, 520]);
  const branch = pc.node('flow.branch', {}, {}, [560, 520]);
  const isIn = pc.node('widget.isInViewport', {}, {}, [360, 700]);
  const show = pc.node('widget.addToViewport', {}, {}, [900, 640]);
  const on = pc.node('input.setShowMouseCursor', {}, { show: true }, [1220, 640]);
  const hide = pc.node('widget.removeFromParent', {}, {}, [900, 420]);
  const off = pc.node('input.setShowMouseCursor', {}, { show: false }, [1220, 420]);
  pc.link(ev2, 'started', branch, 'exec').link(get(200, 760), 'value', isIn, 'target').link(isIn, 'result', branch, 'condition');
  pc.link(branch, 'false', show, 'exec').link(get(760, 820), 'value', show, 'target').link(show, 'then', on, 'exec');
  pc.link(branch, 'true', hide, 'exec').link(get(760, 560), 'value', hide, 'target').link(hide, 'then', off, 'exec');
  return p;
}

const doorOpen = (cx: CheckContext) => {
  const a = cx.sim.actors.find((x) => x.className === 'BP_Porte');
  const v = a && cx.sim.classOf(a)?.variables.find((x) => x.name === 'Ouverte');
  return !!(a && v && a.vars[v.id]);
};

function terminalShown(id: string, n: 0 | 1, label: string, at: string): Check {
  return {
    id,
    label,
    at,
    test: (cx) => {
      const on = shown(cx, TERMINAL).length;
      if (on === n) return true;
      if (n === 1) return 'F n’a pas affiché le terminal.';
      const action = cx.project.inputActions.find((a) => a.name === 'IA_Terminal')?.id ?? '';
      if (cx.sim.record.uiOnlyBlocked.has(action))
        return 'Le terminal est resté ouvert : le second appui sur F n’est jamais arrivé au Player Controller. En UI Only, aucune Input Action n’atteint le jeu.';
      return 'Le second appui sur F n’a pas retiré le terminal.';
    },
  };
}

export const debug25: Lesson = {
  id: 'd25-bouton-muet',
  kind: 'debug',
  code: 'D25',
  module: UMG_MODULE,
  level: 'confirme',
  number: 0,
  title: 'Le bouton qui ne répond pas',
  situation:
    'F ouvre le terminal de la station, F le referme. Son bouton « Ouvrir la porte » marchait dans l’éditeur de widgets, mais en jeu, le toucher ne fait rien. Trouve pourquoi et corrige, sans casser la fermeture par F.',
  notions: ['Set Input Mode Game and UI', 'Set Input Mode UI Only', 'Set Input Mode Game Only', 'Set Show Mouse Cursor'],
  remember:
    'En Game Only, le mode du lancement, les touchers partent au jeu : aucun bouton ne répond. UI Only rend les boutons, mais coupe le jeu de toutes ses entrées, y compris la touche qui devait refermer le menu. Game and UI donne les deux : l’interface d’abord, le reste au jeu.',
  cards: [
    {
      title: 'Ce qui est en place',
      body:
        '- **WBP_Terminal** : un bouton **Btn_Ouvrir**, dont On Clicked appelle **Ouvrir** sur BP_Porte (cette partie est juste).\n' +
        '- **BP_PlayerController** : au BeginPlay, crée le terminal et le garde dans la variable **Terminal**. Sur **IA_Terminal** (F) : s’il n’est pas à l’écran (Is In Viewport), Add to Viewport puis curseur visible ; sinon Remove from Parent puis curseur caché.',
    },
    {
      title: 'Ce qu’on attend',
      body:
        '- F affiche le terminal.\n- Un toucher sur « Ouvrir la porte » ouvre la porte.\n- F referme le terminal ; le jeu revient en **Game Only**, curseur caché.\n- Et la même chose une seconde fois.\n\nPendant Play, un toucher ignoré affiche un message en haut, avec **Pourquoi ?**, et les pastilles du mode d’entrée sont en haut à droite.',
    },
    DEBUG_METHOD,
  ],
  objectives: ['Reproduis : que dit le message quand tu touches le bouton ?', 'Corrige BP_PlayerController : le bouton ouvre la porte et F referme le terminal.', 'Après fermeture : Game Only, curseur caché.'],
  hints: [
    'Le curseur visible ne suffit pas : qui reçoit les touchers dépend du mode d’entrée. Et attention au mode qui donne tout à l’interface : F doit encore pouvoir refermer.',
    'Set Input Mode Game and UI, Set Input Mode Game Only.',
    'Solution : dans BP_PlayerController, après le Set Show Mouse Cursor coché : Set Input Mode Game and UI (Player Controller = Self, In Widget to Focus = Terminal). Après le Set Show Mouse Cursor décoché : Set Input Mode Game Only (Self).',
  ],
  challenge: 'Avec Game and UI, le personnage peut s’éloigner du terminal ouvert. Referme-le tout seul quand il s’éloigne de plus de 300 de la console.',
  setup: terminalProject,
  scenario: [
    { wait: 0.2 },
    ...tap('F'),
    { wait: 0.1 },
    { checkpoint: 'ouvert' },
    { click: `${TERMINAL}/Btn_Ouvrir` },
    { wait: 0.1 },
    { checkpoint: 'clic' },
    ...tap('F'),
    { wait: 0.1 },
    { checkpoint: 'ferme' },
    ...tap('F'),
    { wait: 0.1 },
    { checkpoint: 'rouvert' },
    ...tap('F'),
    { wait: 0.1 },
    { checkpoint: 'referme' },
  ],
  checks: [
    terminalShown('opens', 1, 'F affiche le terminal', 'ouvert'),
    {
      id: 'door',
      label: 'Le bouton ouvre la porte',
      at: 'clic',
      test: (cx) => (doorOpen(cx) ? true : (ignoredTouch(cx, 'Btn_Ouvrir') ?? 'Le toucher sur « Ouvrir la porte » n’a pas ouvert la porte.')),
    },
    terminalShown('closes', 0, 'F referme le terminal', 'ferme'),
    {
      id: 'back',
      label: 'Fermé : Game Only, curseur caché',
      at: 'ferme',
      test: (cx) => {
        if (cx.sim.inputMode !== 'GameOnly') return `Le terminal fermé, le jeu est resté en ${modeLabel(cx)} : remets Game Only en le fermant.`;
        return cx.sim.showMouseCursor ? 'Le terminal fermé, le curseur est resté visible.' : true;
      },
    },
    terminalShown('again', 1, 'F le rouvre', 'rouvert'),
    terminalShown('again-closed', 0, 'Et le referme', 'referme'),
    notion({
      id: 'game-and-ui',
      label: 'Le terminal s’ouvre en Game and UI',
      test: (cx) =>
        cx.nodes(PLAYER_CONTROLLER).some((n) => n.def === 'input.setModeGameAndUI')
          ? true
          : 'Pour qu’à la fois le bouton réponde et que F arrive encore au jeu, le mode qui convient est Game and UI.',
    }),
    noRuntimeErrors(),
  ],
  solve(p) {
    const { b: pc } = controller(p);
    const g = pc.graph;
    const [on, off] = nodesOf(g, 'input.setShowMouseCursor').sort((a, b) => Number(b.defaults.show) - Number(a.defaults.show));
    const term = pc.cls.variables.find((v) => v.name === 'Terminal')!.id;
    const ui = pc.node('input.setModeGameAndUI', {}, {}, [1560, 640]);
    const game = pc.node('input.setModeGameOnly', {}, {}, [1560, 420]);
    const self = pc.node('actor.self', {}, {}, [1400, 860]);
    pc.link(on.id, 'then', ui, 'exec').link(self, 'self', ui, 'controller').link(pc.node('var.get', { variable: term }, {}, [1400, 940]), 'value', ui, 'focus');
    pc.link(off.id, 'then', game, 'exec').link(self, 'self', game, 'controller');
  },
};
