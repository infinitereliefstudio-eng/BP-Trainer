/**
 * V7.36, UMG at Confirmé (docs/PLAN_UMG.md):
 *
 * - « Le menu qui rend le contrôle » (E10 of the exercise collection): F
 *   opens a menu; while it is shown the cursor is visible and the character
 *   does not move (UI Only); its Fermer button gives control back (Remove
 *   from Parent, Game Only, cursor hidden). Opening it again never makes two
 *   menus: the menu is kept in a variable and created once (Is Valid).
 * - D24 « Le menu qui ne part pas »: F toggles a panel with a FlipFlop, but
 *   the B side removes a widget it has just created: the one on the screen
 *   stays. The fix is the variable that remembers the widget shown.
 */
import type { Project } from '../../model/project';
import { removeNodes } from '../../operations/graphOps';
import { T } from '../../types/pins';
import { edit, ProjectBuilder } from '../builder';
import { noRuntimeErrors, notion } from '../checks';
import type { Check, CheckContext, Lesson, ScenarioStep } from '../types';
import { ensurePlayerInput, PLAYER_CONTROLLER } from '../ue5Input';
import { DEBUG_METHOD, nodeOf, nodesOf, tap } from './kit';
import { playerBlueprint } from './props';
import { UMG_MODULE } from './umgCounter';
import { actionId, addW, button, controller, menuPanel, ignoredTouch, made, modeLabel, newClass, onButton, plural, shown } from './umgKit';

// ------------------------------------------------ E10 : le menu qui rend le contrôle

const MENU = 'WBP_Menu';

/** The level of both steps: the player and the template's input, with `action` on F. */
function base(name: string, action: string): Project {
  const pb = new ProjectBuilder(name);
  playerBlueprint(pb);
  const crate = pb.blueprint('BP_Caisse');
  crate.component('StaticMesh', 'Caisse', { sizeX: 80, sizeY: 80, color: '#a16207' });
  pb.place(crate, 500, -250);
  pb.playerStart(0, 0);
  const p = pb.project;
  ensurePlayerInput(p, ['F'], { F: action });
  return p;
}

/** WBP_Menu: a dark panel, a title and the Fermer button. Nothing in its Graph yet. */
function menuWidget(p: Project) {
  const w = newClass(p, MENU, 'UserWidget');
  button(p, w.cls, menuPanel(p, w.cls, 'Menu'), 'Btn_Fermer', 'Fermer', 0, 120);
  return w;
}

const STILL = 5;
const player = (cx: CheckContext) => cx.sim.player;

function menuShown(id: string, label: string, at: string): Check {
  return {
    id,
    label,
    at,
    test: (cx) => {
      const n = shown(cx, MENU).length;
      if (n === 1) return true;
      if (n > 1) return `${plural(n, 'menu')} à l’écran : chaque appui sur F en crée un de plus. Garde le menu dans une variable et ne le crée que s’il n’existe pas encore (Is Valid).`;
      if (!made(cx, MENU).length) return `Après F, aucun ${MENU} n’a été créé : IA_Menu (Started) → Create Widget, dans ${PLAYER_CONTROLLER}.`;
      return `Le menu existe mais n’est pas à l’écran : Add to Viewport.`;
    },
  };
}

function closed(id: string, label: string, at: string): Check {
  return {
    id,
    label,
    at,
    test: (cx) => {
      if (!made(cx, MENU).length) return 'Le menu ne s’est jamais ouvert : commence par F.';
      const n = shown(cx, MENU).length;
      if (!n) return true;
      const why = ignoredTouch(cx, 'Btn_Fermer');
      if (why) return why;
      if (!cx.sim.record.buttons.includes(`${MENU}/Btn_Fermer`)) return 'Le toucher sur Fermer n’a rien déclenché : ajoute On Clicked (Btn_Fermer) dans le Graph de WBP_Menu (Details du bouton › Events › +).';
      return 'Fermer a répondu, mais le menu est resté à l’écran : dans On Clicked, Remove from Parent (Target self, le menu lui-même).';
    },
  };
}

function control(id: string, label: string, at: string): Check {
  return {
    id,
    label,
    at,
    test: (cx) => {
      if (!made(cx, MENU).length) return 'Le menu ne s’est jamais ouvert : commence par F.';
      if (cx.sim.inputMode !== 'GameOnly') return `Après Fermer, le jeu est resté en ${modeLabel(cx)} : Set Input Mode Game Only (Player Controller = Get Owning Player).`;
      if (cx.sim.showMouseCursor) return 'Après Fermer, le curseur est resté visible : Game Only ne le cache pas, il faut Set Show Mouse Cursor décoché.';
      return true;
    },
  };
}

export const lessonMenuControl: Lesson = {
  id: 'l-menu-controle',
  module: UMG_MODULE,
  level: 'confirme',
  number: 0,
  title: 'Le menu qui rend le contrôle',
  situation:
    'F doit ouvrir un menu. Tant qu’il est affiché, le curseur apparaît et le personnage ne bouge plus. Son bouton Fermer le retire et rend le contrôle au joueur. Appuyer plusieurs fois ne doit jamais empiler deux menus.',
  chain: { notion: 'ui-input', step: 'guided' },
  recalls: ['player-controller'],
  notions: ['On Clicked', 'Set Input Mode UI Only', 'Set Input Mode Game Only', 'Set Show Mouse Cursor', 'Remove from Parent', 'Get Owning Player'],
  remember:
    'Un menu se ferme dans l’ordre : Remove from Parent, Set Input Mode Game Only, Set Show Mouse Cursor décoché (Game Only ne cache pas le curseur). En UI Only, le jeu ne reçoit plus rien, ni touche, ni action, ni joystick : seul le menu peut rendre la main. Créé une fois et gardé dans une variable, le menu ne s’empile jamais.',
  cards: [
    {
      title: 'Ce qui est en place',
      body:
        '- **IA_Menu**, sur **F** dans IMC_Joueur, ajouté par **BP_PlayerController** au BeginPlay.\n' +
        '- **WBP_Menu**, déjà dessiné : un fond, un titre et le bouton **Btn_Fermer** (avec un Text). Un Button est coché Is Variable d’office. Son Graph est vide.\n\n' +
        'Le test ouvre le menu, essaie de marcher, rappuie sur F, touche Fermer, remarche, puis recommence deux fois.',
    },
    {
      title: 'Ce qui est nouveau : qui reçoit les entrées ?',
      body:
        'Trois nœuds, appelés sur le **Player Controller**, décident où vont les entrées :\n\n' +
        '- **Set Input Mode Game Only** : tout va au jeu, les boutons ne reçoivent rien. C’est le mode du lancement.\n' +
        '- **Set Input Mode UI Only** : tout va à l’interface. Le jeu ne reçoit plus ni touche, ni Input Action, ni joystick.\n' +
        '- **Set Input Mode Game and UI** : l’interface d’abord, le reste passe au jeu.\n\n' +
        '**Set Show Mouse Cursor** montre ou cache le curseur, à part : changer de mode ne le fait pas. Sur le téléphone, le curseur est une pastille « Curseur » pendant Play.',
    },
    {
      title: 'Ouvrir',
      body:
        'Dans **BP_PlayerController** : **IA_Menu** (Started) → **Is Valid** (variable `Menu`, de type WBP_Menu) :\n\n' +
        '- **Is Not Valid** : **Create Widget** (WBP_Menu, Owning Player = Self) → Set Menu ;\n' +
        '- puis, dans les deux cas : **Add to Viewport** (Menu) → **Set Input Mode UI Only** (Player Controller = Self, In Widget to Focus = Menu) → **Set Show Mouse Cursor** (coché).\n\n' +
        'L’Owning Player compte : c’est par lui que le menu retrouvera le joueur pour lui rendre la main.',
    },
    {
      title: 'Fermer',
      body:
        'Dans **WBP_Menu**, choisis Btn_Fermer dans la Hierarchy : Details › **Events** › **+** à côté de **On Clicked** ajoute l’événement au Graph. Puis :\n\n' +
        '**Remove from Parent** (Target self) → **Set Input Mode Game Only** (Player Controller = **Get Owning Player**) → **Set Show Mouse Cursor** (décoché, Target = Get Owning Player).\n\n' +
        'Retiré, le menu n’est pas détruit : la variable Menu le garde pour la prochaine ouverture.',
    },
  ],
  objectives: [
    'F ouvre WBP_Menu, avec le curseur ; le personnage ne bouge plus.',
    'Fermer retire le menu, cache le curseur et rend le contrôle.',
    'Un seul menu, même après plusieurs ouvertures.',
  ],
  hints: [
    'L’ouverture se fait là où arrive F, la fermeture là où est le bouton. Le mode d’entrée qui fige le personnage est aussi celui qui empêche F d’arriver une seconde fois.',
    'Is Valid, Create Widget, Promote to Variable, Add to Viewport, Set Input Mode UI Only, Set Show Mouse Cursor ; dans WBP_Menu : On Clicked (Btn_Fermer), Remove from Parent, Get Owning Player, Set Input Mode Game Only.',
    'Solution : BP_PlayerController : IA_Menu (Started) → Is Valid (Menu) ; Is Not Valid → Create WBP_Menu Widget (Owning Player = Self) → Set Menu ; puis Add to Viewport (Menu) → Set Input Mode UI Only (Self, Focus = Menu) → Set Show Mouse Cursor (coché). WBP_Menu : On Clicked (Btn_Fermer) → Remove from Parent → Set Input Mode Game Only (Get Owning Player) → Set Show Mouse Cursor (décoché, Get Owning Player).',
  ],
  challenge: 'Fais aussi fermer le menu par F. En UI Only, F n’arrive plus : quel mode faut-il, et que devient alors le personnage pendant que le menu est ouvert ?',
  setup() {
    const p = base('Le menu qui rend le contrôle', 'IA_Menu');
    menuWidget(p);
    return p;
  },
  scenario: [
    { wait: 0.2 },
    ...tap('F'),
    { wait: 0.1 },
    { checkpoint: 'ouvert' },
    { walk: [1, 0], seconds: 0.5 },
    { checkpoint: 'immobile' },
    ...tap('F'),
    { wait: 0.1 },
    { checkpoint: 'double' },
    { click: `${MENU}/Btn_Fermer` },
    { wait: 0.1 },
    { checkpoint: 'ferme' },
    { teleport: [0, 0] },
    { walk: [1, 0], seconds: 0.5 },
    { checkpoint: 'marche' },
    ...tap('F'),
    { wait: 0.1 },
    { click: `${MENU}/Btn_Fermer` },
    { wait: 0.1 },
    ...tap('F'),
    { wait: 0.1 },
    { checkpoint: 'troisieme' },
    { click: `${MENU}/Btn_Fermer` },
    { wait: 0.1 },
    { checkpoint: 'fin' },
  ] satisfies ScenarioStep[],
  checks: [
    menuShown('opens', 'F ouvre le menu', 'ouvert'),
    {
      id: 'cursor',
      label: 'Le curseur apparaît avec le menu',
      at: 'ouvert',
      test: (cx) => (cx.sim.showMouseCursor ? true : 'Le menu est ouvert mais le curseur est caché : Set Show Mouse Cursor (coché) sur le Player Controller.'),
    },
    {
      id: 'still',
      label: 'Menu ouvert, le personnage ne bouge pas',
      at: 'immobile',
      test: (cx) => {
        if (!shown(cx, MENU).length) return 'Le menu n’est pas à l’écran à ce moment-là : commence par l’ouvrir avec F.';
        const moved = Math.hypot(player(cx).x, player(cx).y);
        if (moved <= STILL) return true;
        return cx.sim.inputMode === 'GameAndUI'
          ? `Le personnage a avancé de ${Math.round(moved)} pendant que le menu était ouvert : en Game and UI, le jeu reçoit encore le joystick. UI Only le lui coupe.`
          : `Le personnage a avancé de ${Math.round(moved)} pendant que le menu était ouvert : le jeu est resté en ${modeLabel(cx)}.`;
      },
    },
    menuShown('double', 'Un 2e appui sur F n’empile pas un 2e menu', 'double'),
    closed('closes', 'Fermer retire le menu', 'ferme'),
    control('control', 'Fermer rend le contrôle et cache le curseur', 'ferme'),
    {
      id: 'walks',
      label: 'Après Fermer, le personnage remarche',
      at: 'marche',
      test: (cx) =>
        player(cx).x > 40
          ? true
          : cx.sim.inputMode === 'UIOnly'
            ? 'Après Fermer, le personnage ne bouge plus : le jeu est resté en UI Only.'
            : 'Après Fermer, le personnage ne bouge plus.',
    },
    menuShown('again', 'Le menu se rouvre, toujours un seul', 'troisieme'),
    closed('closes-again', 'Et se referme', 'fin'),
    notion({
      id: 'once',
      label: 'Le menu est créé une fois, puis réutilisé',
      test: (cx) => {
        const n = made(cx, MENU).length;
        return n <= 1 ? true : `Trois ouvertures ont créé ${plural(n, 'menu')} : garde-le dans une variable et ne le crée que s’il n’est pas encore valide (Is Valid).`;
      },
    }),
    noRuntimeErrors(),
  ],
  solve(p) {
    const w = edit(p, MENU);
    const click = onButton(w, 'Btn_Fermer');
    const remove = w.node('widget.removeFromParent', {}, {}, [400, 96]);
    const game = w.node('input.setModeGameOnly', {}, {}, [700, 96]);
    const cursor = w.node('input.setShowMouseCursor', {}, { show: false }, [1040, 96]);
    const owner = w.node('widget.getOwningPlayer', {}, {}, [500, 320]);
    w.link(click, 'then', remove, 'exec').link(remove, 'then', game, 'exec').link(game, 'then', cursor, 'exec');
    w.link(owner, 'result', game, 'controller').link(owner, 'result', cursor, 'target');

    const { b: pc } = controller(p);
    const menu = pc.variable('Menu', T.object(MENU));
    const get = (x: number, y: number) => pc.node('var.get', { variable: menu }, {}, [x, y]);
    const ev = pc.node('input.action', { action: actionId(p, 'IA_Menu') }, {}, [64, 520]);
    const valid = pc.node('flow.isValid', {}, {}, [360, 520]);
    const create = pc.node('widget.create', {}, { class: w.cls.id }, [660, 700]);
    const set = pc.node('var.set', { variable: menu }, {}, [980, 700]);
    const show = pc.node('widget.addToViewport', {}, {}, [1300, 520]);
    const mode = pc.node('input.setModeUIOnly', {}, {}, [1600, 520]);
    const cursorOn = pc.node('input.setShowMouseCursor', {}, { show: true }, [1960, 520]);
    const self = pc.node('actor.self', {}, {}, [1400, 760]);
    pc.link(ev, 'started', valid, 'exec').link(get(200, 700), 'value', valid, 'object');
    pc.link(valid, 'notValid', create, 'exec').link(self, 'self', create, 'owner').link(create, 'then', set, 'exec').link(create, 'result', set, 'value');
    pc.link(valid, 'valid', show, 'exec').link(set, 'then', show, 'exec').link(get(1160, 700), 'value', show, 'target');
    pc.link(show, 'then', mode, 'exec').link(self, 'self', mode, 'controller').link(get(1480, 760), 'value', mode, 'focus');
    pc.link(mode, 'then', cursorOn, 'exec');
  },
};

// ------------------------------------------------ D24 : le menu qui ne part pas

const PANEL = 'WBP_Objectifs';

function debugProject(): Project {
  const p = base('Le menu qui ne part pas', 'IA_Objectifs');
  const w = newClass(p, PANEL, 'UserWidget');
  const canvas = addW(p, w.cls, 'CanvasPanel', undefined);
  addW(p, w.cls, 'Image', canvas.id, { name: 'Img_Fond', props: { color: '#1f2937' }, slot: { offsets: [40, 40, 420, 160] } });
  addW(p, w.cls, 'TextBlock', canvas.id, { name: 'Txt_Titre', props: { text: 'Objectifs', fontSize: 28 }, slot: { offsets: [64, 56, 360, 48] } });
  addW(p, w.cls, 'TextBlock', canvas.id, { name: 'Txt_Objectif', props: { text: '- Rétablir le courant', fontSize: 20 }, slot: { offsets: [64, 120, 360, 40] } });
  // F → FlipFlop. A: Create Widget → Add to Viewport. B: Create Widget → Remove from Parent (the bug: a new widget).
  const { b: pc } = controller(p);
  const ev = pc.node('input.action', { action: actionId(p, 'IA_Objectifs') }, {}, [64, 520]);
  const flip = pc.node('flow.flipFlop', {}, {}, [360, 520]);
  const self = pc.node('actor.self', {}, {}, [560, 900]);
  const createA = pc.node('widget.create', {}, { class: w.cls.id }, [660, 520]);
  const show = pc.node('widget.addToViewport', {}, {}, [1020, 520]);
  const createB = pc.node('widget.create', {}, { class: w.cls.id }, [660, 760]);
  const hide = pc.node('widget.removeFromParent', {}, {}, [1020, 760]);
  pc.link(ev, 'started', flip, 'exec');
  pc.link(flip, 'a', createA, 'exec').link(self, 'self', createA, 'owner').link(createA, 'then', show, 'exec').link(createA, 'result', show, 'target');
  pc.link(flip, 'b', createB, 'exec').link(self, 'self', createB, 'owner').link(createB, 'then', hide, 'exec').link(createB, 'result', hide, 'target');
  return p;
}

function panels(id: string, n: 0 | 1, label: string, at: string, press: string): Check {
  return {
    id,
    label,
    at,
    test: (cx) => {
      const on = shown(cx, PANEL).length;
      if (on === n) return true;
      const total = made(cx, PANEL).length;
      return `Après le ${press} appui sur F : ${plural(on, 'panneau', 'panneaux')} à l’écran, ${plural(total, 'widget')} ${PANEL} ${total > 1 ? 'créés' : 'créé'} depuis le lancement. On en attend ${n} à l’écran.`;
    },
  };
}

export const debug24: Lesson = {
  id: 'd24-menu-reste',
  kind: 'debug',
  code: 'D24',
  module: UMG_MODULE,
  level: 'confirme',
  number: 0,
  title: 'Le menu qui ne part pas',
  situation: 'F doit afficher le panneau des objectifs, puis le cacher au deuxième appui. Il s’affiche bien, mais ne part plus jamais. Trouve pourquoi et corrige.',
  notions: ['Remove from Parent', 'Create Widget', 'FlipFlop'],
  remember:
    'Chaque Create Widget fabrique un nouvel objet. Pour retirer le widget affiché, il faut une référence vers celui-là : la Return Value du premier Create Widget, gardée dans une variable. Un Remove from Parent sur un widget tout neuf ne retire rien.',
  cards: [
    {
      title: 'Ce qui est en place',
      body:
        '**IA_Objectifs**, sur **F**. Dans **BP_PlayerController** : IA_Objectifs (Started) → **FlipFlop**.\n\n' +
        '- **A** : Create Widget (WBP_Objectifs) → **Add to Viewport** (sa Return Value).\n' +
        '- **B** : Create Widget (WBP_Objectifs) → **Remove from Parent** (sa Return Value).',
    },
    {
      title: 'Ce qu’on attend',
      body: '- 1er appui sur F : le panneau s’affiche.\n- 2e appui : il disparaît.\n- 3e appui : il revient, un seul.\n- 4e appui : il disparaît.\n- Aucune erreur.\n\nPendant Play, le **Live Outliner** (☷) liste les widgets créés, rubrique « Widgets (UMG) » : regarde combien il y en a.',
    },
    DEBUG_METHOD,
  ],
  objectives: ['Reproduis : combien de widgets existent après deux appuis ?', 'Corrige BP_PlayerController : F affiche puis cache le panneau, à chaque fois.', 'Un seul panneau à l’écran au plus.'],
  hints: [
    'Le côté B retire bien un widget. Lequel ? Est-ce celui qui est à l’écran ?',
    'Promote to Variable, Get, Remove from Parent.',
    'Solution : sur le côté A, garde la Return Value de Create Widget dans une variable Objectifs (Set) avant Add to Viewport. Sur le côté B, supprime Create Widget et relie FlipFlop B → Remove from Parent, Target = Get Objectifs.',
  ],
  challenge: 'Le côté A crée encore un widget à chaque ouverture. Crée-le une seule fois (au BeginPlay, ou avec Is Valid) et vérifie dans le Live Outliner qu’il n’en existe plus qu’un.',
  setup: debugProject,
  scenario: [
    { wait: 0.2 },
    ...tap('F'),
    { wait: 0.1 },
    { checkpoint: 'un' },
    ...tap('F'),
    { wait: 0.1 },
    { checkpoint: 'deux' },
    ...tap('F'),
    { wait: 0.1 },
    { checkpoint: 'trois' },
    ...tap('F'),
    { wait: 0.1 },
    { checkpoint: 'quatre' },
  ],
  checks: [
    panels('one', 1, '1er appui : le panneau s’affiche', 'un', '1er'),
    panels('two', 0, '2e appui : il disparaît', 'deux', '2e'),
    panels('three', 1, '3e appui : il revient, un seul', 'trois', '3e'),
    panels('four', 0, '4e appui : il disparaît', 'quatre', '4e'),
    notion({
      id: 'remove-variable',
      label: 'Remove from Parent vise le widget gardé dans une variable',
      test: (cx) => {
        const g = cx.project.classes.find((c) => c.name === PLAYER_CONTROLLER)?.graphs[0];
        if (!g) return 'BP_PlayerController a disparu.';
        const ok = nodesOf(g, 'widget.removeFromParent').some((n) =>
          Object.values(g.links).some((l) => l.to.node === n.id && l.to.pin === 'target' && g.nodes[l.from.node]?.def === 'var.get'),
        );
        return ok ? true : 'Relie la Target de Remove from Parent à la variable qui garde le panneau affiché.';
      },
    }),
    noRuntimeErrors(),
  ],
  solve(p) {
    const { b: pc } = controller(p);
    const g = pc.graph;
    const flip = nodeOf(g, 'flow.flipFlop');
    const hide = nodeOf(g, 'widget.removeFromParent');
    const show = nodeOf(g, 'widget.addToViewport');
    const createB = Object.values(g.links).find((l) => l.from.node === flip && l.from.pin === 'b')!.to.node;
    const createA = Object.values(g.links).find((l) => l.from.node === flip && l.from.pin === 'a')!.to.node;
    removeNodes(g, [createB]);
    for (const [id, l] of Object.entries(g.links)) if (l.from.node === createA && l.to.node === show) delete g.links[id];
    const panel = pc.variable('Objectifs', T.object(PANEL));
    const set = pc.node('var.set', { variable: panel }, {}, [880, 360]);
    pc.link(createA, 'then', set, 'exec').link(createA, 'result', set, 'value').link(set, 'then', show, 'exec');
    pc.link(pc.node('var.get', { variable: panel }, {}, [900, 640]), 'value', show, 'target');
    pc.link(flip, 'b', hide, 'exec').link(pc.node('var.get', { variable: panel }, {}, [880, 900]), 'value', hide, 'target');
  },
};
