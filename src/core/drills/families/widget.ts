/**
 * Family « Interfaces (UMG) » (V7.37): the reflexes of a Widget Blueprint's
 * Graph. Three situations, each in the widget's own Graph:
 * - closing a menu: Remove from Parent, Game Only, cursor hidden (and the
 *   pause lifted, when the menu paused the game);
 * - the counter: a Custom Event called by the Player Controller, Increment,
 *   SetText (a plain number, or « Appuis : N »);
 * - the welcome banner: Event Construct, a Delay, Remove from Parent (shown
 *   once, or twice: Construct comes back, On Initialized does not).
 */
import { noRuntimeErrors } from '../../lessons/checks';
import { edit, ProjectBuilder } from '../../lessons/builder';
import { tap } from '../../lessons/library/kit';
import { playerBlueprint } from '../../lessons/library/props';
import { actionId, addW, button, controller, drawnProp, getW, menuPanel, newClass, onButton, screenTexts, shown } from '../../lessons/library/umgKit';
import type { Check, CheckContext } from '../../lessons/types';
import { ensurePlayerInput } from '../../lessons/ue5Input';
import type { Project } from '../../model/project';
import { connect, removeNodes } from '../../operations/graphOps';
import { contextFor } from '../../nodes/registry';
import { T } from '../../types/pins';
import { cut, replaceNode } from '../edit';
import type { Family, Situation } from '../types';

/** Take a node off the white wire: what came into it goes on to what came after it. */
function bypass(p: Project, cls: string, node: string): void {
  const b = edit(p, cls);
  const g = b.graph;
  const into = Object.values(g.links).filter((l) => l.to.node === node && l.to.pin === 'exec').map((l) => l.from);
  const next = Object.values(g.links).find((l) => l.from.node === node && (l.from.pin === 'then' || l.from.pin === 'completed'))?.to;
  removeNodes(g, [node]);
  if (next) for (const from of into) connect(g, from, next, contextFor(b.cls, p));
}

/** The player and the template's input; the Player Controller's BeginPlay goes on from `controller(p).last`. */
function level(keys: ('E' | 'F')[] = []): Project {
  const pb = new ProjectBuilder('Mini-exercice');
  playerBlueprint(pb);
  pb.playerStart(0, 0);
  const p = pb.project;
  ensurePlayerInput(p, keys, { E: 'IA_Interagir' });
  return p;
}

// ---------------------------------------------------------------- closing a menu

interface CloseP {
  /** The menu paused the game: closing must lift the pause. */
  pause: boolean;
}

const close: Situation<CloseP> = {
  id: 'fermer',
  title: 'Fermer le menu',
  className: 'WBP_Menu',
  params: (r) => ({ pause: r.next() < 0.5 }),
  base({ pause }) {
    const p = level();
    const w = newClass(p, 'WBP_Menu', 'UserWidget');
    button(p, w.cls, menuPanel(p, w.cls, pause ? 'Pause' : 'Menu'), 'Btn_Fermer', pause ? 'Reprendre' : 'Fermer', 0, 120);
    const { b: pc, last } = controller(p);
    const self = pc.node('actor.self', {}, {}, [1000, 300]);
    const make = pc.node('widget.create', {}, { class: w.cls.id }, [1100, 96]);
    const view = pc.node('widget.addToViewport', {}, {}, [1440, 96]);
    const mode = pc.node('input.setModeUIOnly', {}, {}, [1740, 96]);
    const cursor = pc.node('input.setShowMouseCursor', {}, { show: true }, [2080, 96]);
    pc.link(last, 'then', make, 'exec').link(self, 'self', make, 'owner').link(make, 'then', view, 'exec').link(make, 'result', view, 'target');
    pc.link(view, 'then', mode, 'exec').link(self, 'self', mode, 'controller').link(make, 'result', mode, 'focus').link(mode, 'then', cursor, 'exec');
    if (pause) pc.link(cursor, 'then', pc.node('game.setGamePaused', {}, { paused: true }, [2400, 96]), 'exec');
    return p;
  },
  chain(b, _p, { pause }) {
    const click = onButton(b, 'Btn_Fermer');
    b.graph.nodes[click].x = 64;
    b.graph.nodes[click].y = 96;
    const remove = b.node('widget.removeFromParent', {}, {}, [360, 96]);
    const game = b.node('input.setModeGameOnly', {}, {}, [1000, 96]);
    const cursor = b.node('input.setShowMouseCursor', {}, { show: false }, [1340, 96]);
    const owner = b.node('widget.getOwningPlayer', {}, {}, [800, 320]);
    b.link(click, 'then', remove, 'exec');
    const roles: Record<string, string> = { click, remove, game, cursor, owner };
    if (pause) {
      const unpause = b.node('game.setGamePaused', {}, { paused: false }, [660, 96]);
      b.link(remove, 'then', unpause, 'exec').link(unpause, 'then', game, 'exec');
      roles.unpause = unpause;
    } else b.link(remove, 'then', game, 'exec');
    b.link(game, 'then', cursor, 'exec').link(owner, 'result', game, 'controller').link(owner, 'result', cursor, 'target');
    return roles;
  },
  situation: ({ pause }) =>
    `**WBP_Menu** est ouvert dès le lancement par BP_PlayerController : UI Only, curseur visible${pause ? ', et le jeu **en pause**' : ''}. Son bouton **Btn_Fermer** doit le refermer et rendre le contrôle au joueur${pause ? ', en relançant le jeu' : ''}.`,
  objectives: ({ pause }) => [
    `Btn_Fermer retire le menu${pause ? ' et relance le jeu' : ''}.`,
    'Le jeu revient en Game Only, curseur caché : le personnage remarche.',
  ],
  hints: ({ pause }) => [
    'Retirer le widget suffit-il pour que le joueur reprenne la main ? Et que dit-on au Player Controller, que le widget connaît par son Owning Player ?',
    `Nœuds : On Clicked (Btn_Fermer), Remove from Parent${pause ? ', Set Game Paused' : ''}, Get Owning Player, Set Input Mode Game Only, Set Show Mouse Cursor.`,
    `On Clicked (Btn_Fermer) → Remove from Parent${pause ? ' → Set Game Paused (décoché)' : ''} → Set Input Mode Game Only (Get Owning Player) → Set Show Mouse Cursor (décoché, Target = Get Owning Player).`,
  ],
  remember: 'Fermer un menu, c’est trois choses : Remove from Parent, Set Input Mode Game Only, et Set Show Mouse Cursor décoché (Game Only ne cache pas le curseur). Le widget atteint le Player Controller par Get Owning Player.',
  notions: ['On Clicked', 'Remove from Parent', 'Set Input Mode Game Only', 'Set Show Mouse Cursor', 'Get Owning Player'],
  scenario: () => [{ wait: 0.2 }, { click: 'WBP_Menu/Btn_Fermer' }, { wait: 0.1 }, { checkpoint: 'ferme' }, { walk: [1, 0], seconds: 0.4 }],
  checks: ({ pause }): Check[] => {
    const out: Check[] = [
      {
        id: 'closed',
        label: 'Btn_Fermer retire le menu',
        at: 'ferme',
        test: (cx) => (shown(cx, 'WBP_Menu').length ? 'Après Btn_Fermer, le menu est encore à l’écran.' : true),
      },
    ];
    if (pause)
      out.push({ id: 'resumed', label: 'Le jeu reprend', at: 'ferme', test: (cx) => (cx.sim.gamePaused ? 'Le menu est fermé, mais le jeu est resté en pause.' : true) });
    out.push(
      {
        id: 'control',
        label: 'Game Only, curseur caché',
        at: 'ferme',
        test: (cx) => (cx.sim.inputMode !== 'GameOnly' ? 'Le jeu n’est pas revenu en Game Only.' : cx.sim.showMouseCursor ? 'Le curseur est resté visible : Game Only ne le cache pas.' : true),
      },
      { id: 'walks', label: 'Le personnage remarche', test: (cx) => (cx.sim.player.x > 40 ? true : 'Le personnage ne bouge pas après la fermeture.') },
      noRuntimeErrors(),
    );
    return out;
  },
  gaps: [
    [
      { role: 'remove', label: 'Remove from Parent' },
      { role: 'game', label: 'Set Input Mode Game Only (Get Owning Player)' },
    ],
    [
      { role: 'game', label: 'Set Input Mode Game Only (Get Owning Player)' },
      { role: 'cursor', label: 'Set Show Mouse Cursor (décoché)' },
    ],
    [
      { role: 'remove', label: 'Remove from Parent' },
      { role: 'cursor', label: 'Set Show Mouse Cursor (décoché)' },
    ],
  ],
  mistakes: [
    { id: 'no-game-only', what: 'le mode d’entrée n’est pas rendu au jeu', apply: (p, r) => bypass(p, 'WBP_Menu', r.game) },
    {
      id: 'cursor-left',
      what: 'Set Show Mouse Cursor reste coché',
      apply(p, r) {
        edit(p, 'WBP_Menu').graph.nodes[r.cursor].defaults.show = true;
      },
    },
    { id: 'no-remove', what: 'le menu n’est pas retiré', apply: (p, r) => bypass(p, 'WBP_Menu', r.remove) },
    {
      id: 'still-paused',
      what: 'Set Game Paused reste coché',
      applies: ({ pause }) => pause,
      apply(p, r) {
        edit(p, 'WBP_Menu').graph.nodes[r.unpause].defaults.paused = true;
      },
    },
  ],
};

// ---------------------------------------------------------------- the counter

interface CounterP {
  presses: number;
  /** « Appuis : N » rather than the bare number. */
  label: boolean;
}

const counter: Situation<CounterP> = {
  id: 'compteur',
  title: 'Le compteur à l’écran',
  className: 'WBP_Compteur',
  params: (r) => ({ presses: r.pick([2, 3, 4]), label: r.next() < 0.5 }),
  base({ label }) {
    const p = level(['E']);
    const w = newClass(p, 'WBP_Compteur', 'UserWidget');
    const canvas = addW(p, w.cls, 'CanvasPanel', undefined);
    addW(p, w.cls, 'TextBlock', canvas.id, { name: 'Txt_Compteur', isVariable: true, props: { text: label ? 'Appuis : 0' : '0', fontSize: 28 }, slot: { offsets: [48, 40, 320, 48] } });
    w.variable('Appuis', T.int, 0);
    const { b: pc, last } = controller(p);
    const ref = pc.variable('Compteur', T.object('WBP_Compteur'));
    const make = pc.node('widget.create', {}, { class: w.cls.id }, [1100, 96]);
    const set = pc.node('var.set', { variable: ref }, {}, [1440, 96]);
    const view = pc.node('widget.addToViewport', {}, {}, [1760, 96]);
    pc.link(last, 'then', make, 'exec').link(pc.node('actor.self', {}, {}, [1000, 300]), 'self', make, 'owner').link(make, 'then', set, 'exec').link(make, 'result', set, 'value');
    pc.link(set, 'then', view, 'exec').link(pc.node('var.get', { variable: ref }, {}, [1600, 300]), 'value', view, 'target');
    const ev = pc.node('input.action', { action: actionId(p, 'IA_Interagir') }, {}, [64, 520]);
    const call = pc.node('call.custom', { owner: w.cls.id, event: 'Compter' }, {}, [420, 520]);
    pc.link(ev, 'started', call, 'exec').link(pc.node('var.get', { variable: ref }, {}, [200, 700]), 'value', call, 'target');
    return p;
  },
  chain(b, _p, { label }) {
    const count = b.cls.variables.find((v) => v.name === 'Appuis')!.id;
    const ev = b.node('event.custom', { name: 'Compter' }, {}, [64, 96]);
    const inc = b.node('var.incrementInt', {}, {}, [340, 96]);
    const toText = b.node('conv.intToText', {}, {}, [560, 340]);
    const set = b.node('widget.setText', {}, {}, [900, 96]);
    b.link(ev, 'then', inc, 'exec').link(b.node('var.get', { variable: count }, {}, [200, 300]), 'value', inc, 'value').link(inc, 'result', toText, 'in');
    b.link(inc, 'then', set, 'exec').link(getW(b, 'Txt_Compteur', [700, 220]), 'value', set, 'target');
    const roles: Record<string, string> = { ev, inc, toText, set };
    if (label) {
      const fmt = b.node('text.format', {}, { format: 'Appuis : {N}' }, [760, 340]);
      b.link(toText, 'result', fmt, 'arg:N').link(fmt, 'result', set, 'text');
      roles.fmt = fmt;
    } else b.link(toText, 'result', set, 'text');
    return roles;
  },
  situation: ({ label }) =>
    `**BP_PlayerController** affiche **WBP_Compteur** et, à chaque appui sur E, appelle son Custom Event **Compter**. Dans le widget, Compter doit ajouter 1 à **Appuis** et l’écrire dans **Txt_Compteur**${label ? ', sous la forme « Appuis : N »' : ''}.`,
  objectives: ({ presses, label }) => [`Chaque appui sur E ajoute 1 à Appuis et l’affiche${label ? ' (« Appuis : N »)' : ''}.`, `Après ${presses} appuis, l’écran affiche ${presses}.`],
  hints: ({ label }) => [
    'Le nombre à afficher, c’est la valeur après l’ajout ou avant ? Et un Text n’apparaît dans le Graph que s’il est coché Is Variable.',
    `Nœuds : Custom Event Compter, Increment Int (Appuis), To Text (Integer)${label ? ', Format Text' : ''}, SetText (Text), Get Txt_Compteur.`,
    `Compter → Increment Int (Get Appuis) → SetText (Target = Txt_Compteur, In Text = ${label ? 'Format Text « Appuis : {N} », N = ' : ''}To Text (Integer) de la Return Value d’Increment).`,
  ],
  remember: 'Un widget sait se mettre à jour : le Player Controller l’appelle, le widget change sa valeur puis écrit le nouveau texte avec SetText. Écrire après l’ajout, avec la valeur qu’il rend.',
  notions: ['SetText (Text)', 'Is Variable', 'Increment Int'],
  scenario: ({ presses }) => [{ wait: 0.3 }, ...Array.from({ length: presses }, () => [...tap('E'), { wait: 0.1 }]).flat(), { wait: 0.1 }],
  checks: ({ presses, label }): Check[] => [
    {
      id: 'shows',
      label: `Après ${presses} appuis, l’écran affiche ${presses}`,
      test: (cx: CheckContext) => {
        const t = String(drawnProp(cx, 'Txt_Compteur')?.text ?? '');
        const want = label ? `Appuis : ${presses}` : String(presses);
        if (t === want) return true;
        if (!screenTexts(cx).length) return 'Le compteur n’est pas à l’écran.';
        return `L’écran affiche « ${t} », on attend « ${want} ».`;
      },
    },
    noRuntimeErrors(),
  ],
  gaps: [
    [
      { role: 'inc', label: 'Increment Int (Appuis)' },
      { role: 'set', label: 'SetText (Txt_Compteur)' },
    ],
    [
      { role: 'toText', label: 'To Text (Integer)' },
      { role: 'set', label: 'SetText (Txt_Compteur)' },
    ],
    [
      { role: 'inc', label: 'Increment Int (Appuis)' },
      { role: 'toText', label: 'To Text (Integer)' },
    ],
  ],
  mistakes: [
    {
      id: 'off-wire',
      what: 'l’Increment n’est pas sur le fil blanc',
      apply(p, r) {
        bypass(p, 'WBP_Compteur', r.inc);
        const b = edit(p, 'WBP_Compteur');
        const count = b.cls.variables.find((v) => v.name === 'Appuis')!.id;
        const inc = b.node('var.incrementInt', {}, {}, [340, 300]);
        b.link(b.node('var.get', { variable: count }, {}, [200, 460]), 'value', inc, 'value').link(inc, 'result', r.toText, 'in');
      },
    },
    {
      id: 'fixed-text',
      what: 'SetText écrit un texte fixe',
      apply(p, r, { label }) {
        cut(p, 'WBP_Compteur', r.set, 'text');
        edit(p, 'WBP_Compteur').graph.nodes[r.set].defaults.text = label ? 'Appuis : 1' : '1';
      },
    },
  ],
};

// ---------------------------------------------------------- the welcome banner

interface BannerP {
  seconds: number;
  /** The Player Controller shows the banner a second time. */
  twice: boolean;
}

const banner: Situation<BannerP> = {
  id: 'bandeau',
  title: 'Le bandeau d’accueil',
  className: 'WBP_Bandeau',
  params: (r) => ({ seconds: r.pick([1, 1.5]), twice: r.next() < 0.6 }),
  base({ seconds, twice }) {
    const p = level();
    const w = newClass(p, 'WBP_Bandeau', 'UserWidget');
    const canvas = addW(p, w.cls, 'CanvasPanel', undefined);
    addW(p, w.cls, 'TextBlock', canvas.id, { name: 'Txt_Accueil', props: { text: 'Bienvenue dans la station', fontSize: 32, justification: 'Center' }, slot: { offsets: [340, 120, 600, 56] } });
    const { b: pc, last } = controller(p);
    const ref = pc.variable('Bandeau', T.object('WBP_Bandeau'));
    const make = pc.node('widget.create', {}, { class: w.cls.id }, [1100, 96]);
    const set = pc.node('var.set', { variable: ref }, {}, [1440, 96]);
    const view = pc.node('widget.addToViewport', {}, {}, [1760, 96]);
    pc.link(last, 'then', make, 'exec').link(pc.node('actor.self', {}, {}, [1000, 300]), 'self', make, 'owner').link(make, 'then', set, 'exec').link(make, 'result', set, 'value');
    pc.link(set, 'then', view, 'exec').link(pc.node('var.get', { variable: ref }, {}, [1600, 300]), 'value', view, 'target');
    if (twice) {
      const wait = pc.node('time.delay', {}, { duration: seconds + 1 }, [2060, 96]);
      const again = pc.node('widget.addToViewport', {}, {}, [2360, 96]);
      pc.link(view, 'then', wait, 'exec').link(wait, 'completed', again, 'exec').link(pc.node('var.get', { variable: ref }, {}, [2200, 300]), 'value', again, 'target');
    }
    return p;
  },
  chain(b, _p, { seconds }) {
    const construct = b.node('event.construct', {}, {}, [64, 96]);
    const delay = b.node('time.delay', {}, { duration: seconds }, [360, 96]);
    const remove = b.node('widget.removeFromParent', {}, {}, [660, 96]);
    b.link(construct, 'then', delay, 'exec').link(delay, 'completed', remove, 'exec');
    return { construct, delay, remove };
  },
  situation: ({ seconds, twice }) =>
    `**BP_PlayerController** affiche **WBP_Bandeau** au lancement${twice ? ', puis **une seconde fois** un peu plus tard (le même widget, gardé dans une variable)' : ''}. Chaque fois qu’il arrive à l’écran, le bandeau doit se retirer tout seul au bout de ${String(seconds).replace('.', ',')} s.`,
  objectives: ({ seconds, twice }) => [`Le bandeau se retire tout seul ${String(seconds).replace('.', ',')} s après son arrivée à l’écran.`, twice ? 'Réaffiché, il se retire encore.' : 'Il est bien visible au lancement.'],
  hints: ({ twice }) => [
    twice ? 'Quel événement du widget passe à chaque arrivée à l’écran, et lequel une seule fois ?' : 'Un widget n’a pas de BeginPlay : quel événement passe quand il arrive à l’écran ?',
    'Nœuds : Event Construct, Delay, Remove from Parent.',
    'Event Construct → Delay → Remove from Parent (Target self).',
  ],
  remember: 'Event Construct passe à chaque Add to Viewport : c’est là qu’un widget commence ce qu’il fait à l’écran. Event On Initialized ne passe qu’une fois, à Create Widget ; Event Destruct, au retrait.',
  notions: ['Event Construct', 'Remove from Parent', 'Event On Initialized'],
  scenario: ({ seconds, twice }) => [
    { wait: 0.3 },
    { checkpoint: 'montre' },
    { wait: seconds },
    { checkpoint: 'parti' },
    ...(twice ? [{ wait: 0.9 }, { checkpoint: 'revenu' }, { wait: seconds + 0.1 }, { checkpoint: 'reparti' }] : []),
  ],
  checks: ({ twice }): Check[] => {
    const on = (cx: CheckContext) => shown(cx, 'WBP_Bandeau').length > 0;
    const out: Check[] = [
      { id: 'shown', label: 'Le bandeau est à l’écran au lancement', at: 'montre', test: (cx) => (on(cx) ? true : 'Le bandeau a déjà disparu au lancement : le Delay manque-t-il ?') },
      { id: 'gone', label: 'Il se retire tout seul', at: 'parti', test: (cx) => (on(cx) ? 'Le temps écoulé, le bandeau est toujours là.' : true) },
    ];
    if (twice)
      out.push(
        { id: 'back', label: 'Réaffiché, il revient', at: 'revenu', test: (cx) => (on(cx) ? true : 'Le bandeau ne revient pas à l’écran.') },
        { id: 'gone-again', label: 'Et se retire encore', at: 'reparti', test: (cx) => (on(cx) ? 'Réaffiché, le bandeau ne se retire plus : l’événement choisi ne passe qu’une fois.' : true) },
      );
    out.push(noRuntimeErrors());
    return out;
  },
  gaps: [
    [
      { role: 'delay', label: 'Delay' },
      { role: 'remove', label: 'Remove from Parent' },
    ],
    [
      { role: 'construct', label: 'Event Construct' },
      { role: 'delay', label: 'Delay' },
    ],
    [
      { role: 'construct', label: 'Event Construct' },
      { role: 'remove', label: 'Remove from Parent' },
    ],
  ],
  mistakes: [
    {
      id: 'initialized',
      what: 'Event On Initialized au lieu d’Event Construct',
      applies: ({ twice }) => twice,
      apply: (p, r) => {
        replaceNode(p, 'WBP_Bandeau', r.construct, 'event.onInitialized');
      },
    },
    { id: 'no-delay', what: 'le bandeau se retire sans attendre', apply: (p, r) => bypass(p, 'WBP_Bandeau', r.delay) },
    {
      id: 'destruct',
      what: 'Event Destruct au lieu d’Event Construct',
      apply: (p, r) => {
        replaceNode(p, 'WBP_Bandeau', r.construct, 'event.destruct');
      },
    },
  ],
};

export const WIDGET: Family = {
  id: 'widget',
  title: 'Interfaces (UMG)',
  notions: ['umg', 'ui-input'],
  level: 'intermediaire',
  situations: [close, counter, banner],
};
