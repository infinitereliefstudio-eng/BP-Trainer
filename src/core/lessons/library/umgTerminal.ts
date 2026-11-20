/**
 * V7.37, UMG: the last two steps of the chantier.
 *
 * - A3 « Le terminal de la station » (Confirmé, chain ui-input, autonomy,
 *   two days after « Le menu qui rend le contrôle »): a brief only. E near
 *   the console opens a panel of buttons that command two doors; Quitter
 *   gives control back. The learner makes the Widget Blueprint.
 * - T4 « La jauge d'énergie » (Avancé, chain umg, transfer): the method of
 *   « La barre de vie » on an Actor Component. The player carries
 *   BP_Batterie, which announces its Charge; the HUD finds it with Get
 *   Component by Class on its Owning Player Pawn.
 */
import type { Project } from '../../model/project';
import { T } from '../../types/pins';
import { edit, ProjectBuilder, type ClassBuilder } from '../builder';
import { noRuntimeErrors, notion } from '../checks';
import type { CheckContext, Lesson } from '../types';
import { ensurePlayerInput } from '../ue5Input';
import { classBuilder } from './health';
import { goTo, tap, varId } from './kit';
import { playerBlueprint } from './props';
import { UMG_MODULE } from './umgCounter';
import { dispatcherWith, showAtStart } from './umgHealth';
import { actionId, addW, button, drawnProp, eventDriven, getW, ignoredTouch, made, menuPanel, modeLabel, newClass, onButton, pct, shown, widgetClasses } from './umgKit';

// ------------------------------------------------------------ A3 : le terminal

const CONSOLE: [number, number] = [0, -220];
const START: [number, number] = [0, 260];
const TERMINAL = 'WBP_Terminal';

function door(pb: ProjectBuilder, name: string, x: number, y: number): ClassBuilder {
  const d = pb.blueprint(name);
  d.component('StaticMesh', 'Porte', { shape: 'door', sizeX: 200, sizeY: 16, color: '#a0703c' });
  const open = d.variable('Ouverte', T.bool, false);
  const ev = d.node('event.custom', { name: 'Ouvrir' }, {}, [64, 96]);
  const rot = d.node('component.setRelativeRotation', {}, { rotation: { x: 0, y: 0, z: 90 } }, [360, 96]);
  const set = d.node('var.set', { variable: open }, { value: true }, [700, 96]);
  d.link(ev, 'then', rot, 'exec').target('Porte', rot).link(rot, 'then', set, 'exec');
  pb.place(d, x, y, 90);
  return d;
}

function terminalProject(): Project {
  const pb = new ProjectBuilder('Le terminal de la station');
  playerBlueprint(pb);
  const c = pb.blueprint('BP_Console');
  c.component('StaticMesh', 'Pupitre', { sizeX: 90, sizeY: 60, color: '#334155' });
  c.component('BoxCollision', 'Zone', { sizeX: 240, sizeY: 240 });
  pb.place(c, ...CONSOLE);
  door(pb, 'BP_PorteNord', 520, -320);
  door(pb, 'BP_PorteSud', 520, 320);
  pb.playerStart(...START);
  const p = pb.project;
  ensurePlayerInput(p, ['E'], { E: 'IA_Interagir' });
  return p;
}

const isOpen = (cx: CheckContext, cls: string) => {
  const a = cx.sim.actors.find((x) => x.className === cls);
  const v = a && cx.sim.classOf(a)?.variables.find((x) => x.name === 'Ouverte');
  return !!(a && v && a.vars[v.id]);
};

const noTerminal = (cx: CheckContext): string | undefined => {
  if (!widgetClasses(cx).some((c) => c.name === TERMINAL)) return `Le projet n’a pas de ${TERMINAL} : crée-le (Content Drawer › + Add › User Interface › Widget Blueprint), avec Btn_Nord, Btn_Sud et Btn_Quitter.`;
  return undefined;
};

function clickOpens(id: string, which: 'Nord' | 'Sud', at: string) {
  const mine = `BP_Porte${which}`;
  const other = which === 'Nord' ? 'BP_PorteSud' : 'BP_PorteNord';
  return {
    id,
    label: `Btn_${which} ouvre la porte ${which.toLowerCase()}`,
    at,
    test: (cx: CheckContext) => {
      const none = noTerminal(cx);
      if (none) return none;
      if (isOpen(cx, mine)) return which === 'Nord' && isOpen(cx, other) ? 'Btn_Nord a ouvert les deux portes : chaque bouton commande la sienne.' : true;
      const why = ignoredTouch(cx, `Btn_${which}`);
      if (why) return why;
      if (!shown(cx, TERMINAL).length && !cx.sim.record.buttons.some((b) => b.startsWith(TERMINAL))) return 'Le terminal n’était pas à l’écran pour qu’on touche ses boutons.';
      return `La porte ${which.toLowerCase()} est restée fermée : Btn_${which} doit appeler Ouvrir sur ${mine}.`;
    },
  };
}

export const autonomyTerminal: Lesson = {
  id: 'a3-terminal',
  code: 'A3',
  chain: { notion: 'ui-input', step: 'autonomy', after: { lesson: 'l-menu-controle', days: 2 } },
  module: UMG_MODULE,
  level: 'confirme',
  number: 0,
  title: 'Le terminal de la station',
  situation:
    'La console de la station commande deux portes. Près d’elle, E ouvre un terminal à l’écran : un bouton par porte, et Quitter. Tant que le terminal est ouvert, le personnage ne bouge pas.',
  notions: ['Widget Blueprint', 'On Clicked', 'Set Input Mode UI Only', 'Set Input Mode Game Only', 'Set Show Mouse Cursor'],
  remember:
    'Un menu complet, c’est trois parties : l’ouvrir là où arrive l’entrée (et seulement si c’est permis ici), le laisser agir par ses boutons, puis le refermer dans l’ordre en rendant le contrôle. Le widget ne fait qu’annoncer ou appeler ; les portes savent s’ouvrir.',
  cards: [
    {
      title: 'Cahier des charges',
      body:
        '**BP_Console** (un Pupitre et une **Zone**) est près du joueur ; **BP_PorteNord** et **BP_PorteSud** ont chacune un Custom Event **Ouvrir**. **IA_Interagir** est sur E, dans IMC_Joueur. Pas encore de widget.\n\n' +
        '- Crée **WBP_Terminal**, avec trois boutons : **Btn_Nord**, **Btn_Sud** et **Btn_Quitter** (ces noms-là : le test les touche).\n' +
        '- **E près de la console** ouvre le terminal, avec le curseur. **Loin d’elle**, E ne fait rien.\n' +
        '- Terminal ouvert : le personnage ne bouge pas.\n' +
        '- Btn_Nord ouvre la porte nord, Btn_Sud la porte sud, et rien d’autre.\n' +
        '- **Btn_Quitter** referme le terminal et rend le contrôle : Game Only, curseur caché. On peut ensuite le rouvrir, un seul à la fois.',
    },
    {
      title: 'Comment t’y prendre',
      body:
        'Pas de liste de nœuds : c’est le but de l’exercice. Avant d’en poser un, réponds :\n\n' +
        '1. Qui reçoit E, et comment sait-il que la console est à portée ?\n2. Qui crée le terminal, et quand ? Comment éviter d’en empiler deux ?\n3. Quel mode d’entrée fige le personnage tout en laissant toucher les boutons ?\n4. Dans quel ordre refermer ?\n\n' +
        'Les indices s’ouvrent après un premier essai.',
    },
    {
      title: 'Pourquoi quelques jours plus tard',
      body:
        'Cet exercice arrive deux jours après « Le menu qui rend le contrôle » : refaire un menu de mémoire, après une pause, est ce qui fixe la méthode. Si ça bloque, note ce qui manquait : c’est ce qu’il faut revoir.',
    },
  ],
  objectives: [
    'E près de la console ouvre WBP_Terminal ; loin, rien. Le personnage ne bouge pas tant qu’il est ouvert.',
    'Btn_Nord et Btn_Sud ouvrent chacun leur porte.',
    'Btn_Quitter rend le contrôle (Game Only, curseur caché).',
  ],
  hints: [
    'Le joueur reçoit E et sait ce qu’il chevauche (Get Overlapping Actors) : c’est là que tout commence. Le terminal, lui, ne connaît que ses boutons.',
    'Get Overlapping Actors, For Each Loop, Cast To BP_Console, Create Widget, Add to Viewport, Set Input Mode UI Only, Set Show Mouse Cursor ; dans WBP_Terminal : On Clicked, Get Actor Of Class, Ouvrir, Remove from Parent, Get Owning Player, Set Input Mode Game Only.',
    'Solution : BP_Joueur : BeginPlay → Create WBP_Terminal (Owning Player = Get Player Controller) → Set Terminal. IA_Interagir (Started) → Get Overlapping Actors → For Each Loop → Cast To BP_Console → Add to Viewport (Terminal) → Set Input Mode UI Only (Get Player Controller, Focus = Terminal) → Set Show Mouse Cursor (coché). WBP_Terminal : On Clicked (Btn_Nord) → Get Actor Of Class (BP_PorteNord) → Ouvrir ; de même pour Btn_Sud ; On Clicked (Btn_Quitter) → Remove from Parent → Set Input Mode Game Only (Get Owning Player) → Set Show Mouse Cursor (décoché).',
  ],
  challenge: 'Grise le bouton d’une porte déjà ouverte (Set Is Enabled), et garde-le grisé si on rouvre le terminal. Où faut-il le décider pour que ça marche aussi à la réouverture ?',
  setup: terminalProject,
  scenario: [
    { wait: 0.2 },
    ...tap('E'),
    { wait: 0.1 },
    { checkpoint: 'loin' },
    ...goTo(...CONSOLE),
    ...tap('E'),
    { wait: 0.1 },
    { checkpoint: 'ouvert' },
    { walk: [1, 0], seconds: 0.4 },
    { checkpoint: 'immobile' },
    { click: `${TERMINAL}/Btn_Nord` },
    { wait: 0.1 },
    { checkpoint: 'nord' },
    { click: `${TERMINAL}/Btn_Sud` },
    { wait: 0.1 },
    { checkpoint: 'sud' },
    { click: `${TERMINAL}/Btn_Quitter` },
    { wait: 0.1 },
    { checkpoint: 'quitte' },
    { walk: [1, 0], seconds: 0.4 },
    { checkpoint: 'marche' },
    ...goTo(...CONSOLE),
    ...tap('E'),
    { wait: 0.1 },
    { checkpoint: 'rouvert' },
    { click: `${TERMINAL}/Btn_Quitter` },
    { wait: 0.1 },
  ],
  checks: [
    {
      id: 'far',
      label: 'Loin de la console, E ne fait rien',
      at: 'loin',
      test: (cx) => (shown(cx, TERMINAL).length || made(cx, TERMINAL).some((o) => o.widget?.inViewport) ? 'Le terminal s’est ouvert alors que le joueur était loin de la console.' : true),
    },
    {
      id: 'opens',
      label: 'Près de la console, E ouvre le terminal avec le curseur',
      at: 'ouvert',
      test: (cx) => {
        const none = noTerminal(cx);
        if (none) return none;
        const n = shown(cx, TERMINAL).length;
        if (n !== 1) return n > 1 ? `${n} terminaux à l’écran.` : 'Près de la console, E n’a pas affiché WBP_Terminal.';
        return cx.sim.showMouseCursor ? true : 'Le terminal est ouvert, mais le curseur est caché.';
      },
    },
    {
      id: 'still',
      label: 'Terminal ouvert, le personnage ne bouge pas',
      at: 'immobile',
      test: (cx) => {
        if (!shown(cx, TERMINAL).length) return 'Le terminal n’est pas ouvert à ce moment-là.';
        const moved = Math.hypot(cx.sim.player.x - CONSOLE[0], cx.sim.player.y - CONSOLE[1]);
        return moved <= 5 ? true : `Le personnage a bougé de ${Math.round(moved)} avec le terminal ouvert : le jeu est en ${modeLabel(cx)}.`;
      },
    },
    clickOpens('north', 'Nord', 'nord'),
    {
      ...clickOpens('south', 'Sud', 'sud'),
      label: 'Btn_Sud ouvre la porte sud',
    },
    {
      id: 'quit',
      label: 'Btn_Quitter referme et rend le contrôle',
      at: 'quitte',
      test: (cx) => {
        const none = noTerminal(cx);
        if (none) return none;
        if (shown(cx, TERMINAL).length) return ignoredTouch(cx, 'Btn_Quitter') ?? 'Après Btn_Quitter, le terminal est encore à l’écran.';
        if (cx.sim.inputMode !== 'GameOnly') return `Après Btn_Quitter, le jeu est resté en ${modeLabel(cx)}.`;
        return cx.sim.showMouseCursor ? 'Après Btn_Quitter, le curseur est resté visible.' : true;
      },
    },
    {
      id: 'walks',
      label: 'Le personnage remarche',
      at: 'marche',
      test: (cx) => (cx.sim.player.x - CONSOLE[0] > 40 ? true : 'Après Btn_Quitter, le personnage ne bouge plus.'),
    },
    {
      id: 'again',
      label: 'Le terminal se rouvre, un seul',
      at: 'rouvert',
      test: (cx) => {
        const n = shown(cx, TERMINAL).length;
        return n === 1 ? true : n ? `${n} terminaux à l’écran à la réouverture.` : 'E près de la console n’a pas rouvert le terminal.';
      },
    },
    noRuntimeErrors(),
  ],
  solve(p) {
    const w = newClass(p, TERMINAL, 'UserWidget');
    const canvas = menuPanel(p, w.cls, 'Terminal de la station', { back: '#052e16', title: '#86efac' });
    button(p, w.cls, canvas, 'Btn_Nord', 'Porte nord', 0, -50);
    button(p, w.cls, canvas, 'Btn_Sud', 'Porte sud', 0, 40);
    button(p, w.cls, canvas, 'Btn_Quitter', 'Quitter', 0, 130);
    const opens = (btn: string, cls: string, y: number) => {
      const target = p.classes.find((c) => c.name === cls)!;
      const click = onButton(w, btn);
      const find = w.node('actor.getOfClass', {}, { class: target.id }, [400, y]);
      const call = w.node('call.custom', { owner: target.id, event: 'Ouvrir' }, {}, [760, y]);
      w.link(click, 'then', find, 'exec').link(find, 'then', call, 'exec').link(find, 'result', call, 'target');
    };
    opens('Btn_Nord', 'BP_PorteNord', 600);
    opens('Btn_Sud', 'BP_PorteSud', 900);
    const quit = onButton(w, 'Btn_Quitter');
    const remove = w.node('widget.removeFromParent', {}, {}, [400, 1200]);
    const game = w.node('input.setModeGameOnly', {}, {}, [700, 1200]);
    const off = w.node('input.setShowMouseCursor', {}, { show: false }, [1040, 1200]);
    const owner = w.node('widget.getOwningPlayer', {}, {}, [500, 1400]);
    w.link(quit, 'then', remove, 'exec').link(remove, 'then', game, 'exec').link(game, 'then', off, 'exec').link(owner, 'result', game, 'controller').link(owner, 'result', off, 'target');

    const player = edit(p, 'BP_Joueur');
    const term = player.variable('Terminal', T.object(TERMINAL));
    const pc = () => player.node('player.getController', {}, {}, [900, 300]);
    const begin = player.node('event.beginPlay', {}, {}, [64, 96]);
    const create = player.node('widget.create', {}, { class: w.cls.id }, [360, 96]);
    const keep = player.node('var.set', { variable: term }, {}, [700, 96]);
    player.link(begin, 'then', create, 'exec').link(pc(), 'result', create, 'owner').link(create, 'then', keep, 'exec').link(create, 'result', keep, 'value');
    const console = p.classes.find((c) => c.name === 'BP_Console')!;
    const ev = player.node('input.action', { action: actionId(p, 'IA_Interagir') }, {}, [64, 520]);
    const over = player.node('actor.getOverlappingActors', {}, {}, [340, 520]);
    const loop = player.node('flow.forEachLoop', {}, {}, [660, 520]);
    const cast = player.node('cast.to', { class: console.id }, {}, [980, 520]);
    const show = player.node('widget.addToViewport', {}, {}, [1300, 520]);
    const mode = player.node('input.setModeUIOnly', {}, {}, [1600, 520]);
    const on = player.node('input.setShowMouseCursor', {}, { show: true }, [1940, 520]);
    const get = (x: number) => player.node('var.get', { variable: term }, {}, [x, 760]);
    player.link(ev, 'started', over, 'exec').link(over, 'then', loop, 'exec').link(over, 'actors', loop, 'array');
    player.link(loop, 'body', cast, 'exec').link(loop, 'element', cast, 'object').link(cast, 'then', show, 'exec').link(get(1200), 'value', show, 'target');
    const controller = pc();
    player.link(show, 'then', mode, 'exec').link(controller, 'result', mode, 'controller').link(get(1500), 'value', mode, 'focus');
    player.link(mode, 'then', on, 'exec').link(controller, 'result', on, 'target');
  },
};

// ---------------------------------------------------------- T4 : la jauge d'énergie

const DRAIN = 10;

function energyProject(): Project {
  const pb = new ProjectBuilder('La jauge d’énergie');
  // BP_Batterie: Charge drops by 10 every second, and the change is announced.
  const battery = pb.blueprint('BP_Batterie', 'ActorComponent');
  // It starts at 70: the HUD must not wait for the first change.
  const charge = battery.variable('Charge', T.float, 70);
  const change = dispatcherWith(battery, 'OnChargeChange', 'Charge');
  const begin = battery.node('event.beginPlay', {}, {}, [64, 96]);
  const timer = battery.node('time.setTimerByEvent', {}, { time: 1, looping: true }, [360, 96]);
  const use = battery.node('event.custom', { name: 'Consommer' }, {}, [64, 360]);
  const sub = battery.node('math.subtractFloat', {}, { b: DRAIN }, [380, 560]);
  const set = battery.node('var.set', { variable: charge }, {}, [640, 360]);
  const call = battery.node('dispatcher.call', { owner: battery.cls.id, dispatcher: change.id }, {}, [960, 360]);
  battery.link(begin, 'then', timer, 'exec').link(use, 'delegate', timer, 'event');
  battery.link(use, 'then', set, 'exec').link(battery.node('var.get', { variable: charge }, {}, [200, 560]), 'value', sub, 'a').link(sub, 'result', set, 'value');
  battery.link(set, 'then', call, 'exec').link(set, 'out', call, change.param);
  const { b: player } = playerBlueprint(pb);
  player.logic(battery, 'BP_Batterie');
  const lamp = pb.blueprint('BP_Balise');
  lamp.component('StaticMesh', 'Socle', { shape: 'cylinder', sizeX: 50, sizeY: 50, color: '#334155' });
  pb.place(lamp, 400, -200);
  pb.playerStart(0, 0);
  const p = pb.project;
  ensurePlayerInput(p, []);
  const w = newClass(p, 'WBP_Energie', 'UserWidget');
  const canvas = addW(p, w.cls, 'CanvasPanel', undefined);
  addW(p, w.cls, 'TextBlock', canvas.id, { name: 'Txt_Energie', props: { text: 'Énergie', fontSize: 20, color: '#fde047' }, slot: { offsets: [40, 32, 200, 32] } });
  addW(p, w.cls, 'ProgressBar', canvas.id, { name: 'PB_Energie', isVariable: true, props: { percent: 0, fillColor: '#eab308' }, slot: { offsets: [40, 68, 360, 28] } });
  showAtStart(p, w);
  return p;
}

function gauge(id: string, charge: number, label: string, at?: string) {
  return {
    id,
    label,
    at,
    test: (cx: CheckContext) => {
      const b = drawnProp(cx, 'PB_Energie');
      if (!b?.drawn) return 'La jauge d’énergie n’est pas à l’écran.';
      if (Math.abs(b.percent - charge / 100) < 0.01) return true;
      if (b.percent > 1.001) return `La jauge reçoit ${b.percent} : Percent va de 0 à 1.`;
      if (b.percent === 0 && charge === 70) return 'Au lancement, la jauge est vide alors que la batterie a 70 : mets-la à jour une fois tout de suite, avec la Charge actuelle du composant.';
      return `La jauge montre ${pct(b.percent)}, la batterie a ${charge} : on attend ${pct(charge / 100)}.`;
    },
  };
}

export const transferEnergy: Lesson = {
  id: 't4-energie',
  code: 'T4',
  chain: { notion: 'umg', step: 'transfer' },
  module: UMG_MODULE,
  level: 'avance',
  number: 0,
  title: 'La jauge d’énergie',
  situation:
    'L’énergie du joueur est dans un Actor Component, BP_Batterie, qui baisse toutes les secondes et l’annonce. La jauge est à l’écran mais vide. Fais-la suivre la Charge, comme la barre de vie suivait la santé.',
  recalls: ['actor-components', 'dispatchers'],
  notions: ['Get Component by Class', 'Get Owning Player Pawn', 'Event Dispatcher', 'Set Percent'],
  remember:
    'La méthode ne change pas quand la donnée vit dans un composant : dans Event Construct, trouver qui la porte (Get Owning Player Pawn), puis le composant (Get Component by Class, Is Valid), s’abonner à son annonce, et se mettre à jour une fois tout de suite. Pas de Cast vers le joueur : le widget ne dépend que du composant.',
  cards: [
    {
      title: 'Cahier des charges',
      body:
        '- **BP_Batterie** (Actor Component, porté par **BP_Joueur**) a une **Charge** (Float, **70** au départ) qui baisse de 10 chaque seconde ; à chaque fois, il appelle **OnChargeChange** (Charge).\n' +
        '- **WBP_Energie** : **PB_Energie**, une Progress Bar cochée Is Variable, vide. BP_PlayerController l’affiche au lancement. Son Graph est vide.\n\n' +
        'La jauge doit montrer **70 %** dès le lancement, puis **60 %**, puis **50 %**, sans Binding ni Event Tick. Le widget ne doit pas dépendre de BP_Joueur : n’importe quel pion qui porte une batterie doit marcher.',
    },
    {
      title: 'Comme la barre de vie, mais…',
      body: 'Dans « La barre de vie », la santé était une variable du joueur, trouvée par un Cast To BP_Joueur. Ici, elle est dans un composant : qu’est-ce qui change dans le chemin qui y mène ? Le reste est identique.',
    },
  ],
  objectives: ['La jauge montre 70 % au lancement, puis suit la Charge : 60 %, 50 %.', 'WBP_Energie trouve BP_Batterie sans connaître BP_Joueur.', 'Ni Binding ni Event Tick.'],
  hints: [
    'Qui porte la batterie, et comment trouver un composant sur un acteur sans connaître son Blueprint ? Get Owning Player Pawn mène au pion ; un nœud de « La santé est partout » fait le reste.',
    'Event Construct, Get Owning Player Pawn, Get Component by Class (BP_Batterie), Is Valid, Bind Event to OnChargeChange, Custom Event, Set Percent, ÷ (Float).',
    'Solution, dans WBP_Energie : Event Construct → Is Valid (Get Component by Class (Target = Get Owning Player Pawn, BP_Batterie)) → Bind Event to OnChargeChange (Target = le composant, Event = MettreAJour) → Set Percent (PB_Energie, Charge du composant ÷ 100). MettreAJour (Charge) → Set Percent (PB_Energie, Charge ÷ 100).',
  ],
  challenge: 'Sous 30, fais passer la jauge au rouge. Puis pose une borne de recharge qui remet la Charge à 100 : la jauge suit-elle sans rien changer au widget ?',
  setup: energyProject,
  scenario: [{ wait: 0.3 }, { checkpoint: 'debut' }, { wait: 1 }, { checkpoint: 'une' }, { wait: 1 }],
  checks: [
    gauge('start', 70, 'Au lancement : 70 %', 'debut'),
    gauge('one', 60, 'Après une seconde : 60 %', 'une'),
    gauge('two', 50, 'Après deux secondes : 50 %'),
    { id: 'event-driven', label: 'Ni Binding ni Event Tick', test: (cx) => eventDriven(cx, 'WBP_Energie') },
    notion({
      id: 'component',
      label: 'Le widget trouve le composant, pas le joueur',
      test: (cx) => {
        const nodes = cx.nodes('WBP_Energie');
        if (!nodes.some((n) => n.def === 'actor.getComponentByClass')) return 'Get Component by Class, sur Get Owning Player Pawn, trouve BP_Batterie sans connaître le Blueprint du joueur.';
        return nodes.some((n) => n.def === 'cast.to') ? 'Le Cast vers le joueur n’est plus utile : Get Component by Class suffit, et le widget marche pour tout pion qui porte une batterie.' : true;
      },
    }),
    noRuntimeErrors(),
  ],
  solve(p) {
    const w = edit(p, 'WBP_Energie');
    const battery = classBuilder(p, 'BP_Batterie');
    const d = battery.cls.dispatchers[0];
    const charge = varId(battery, 'Charge');
    const construct = w.node('event.construct', {}, {}, [64, 96]);
    const find = w.node('actor.getComponentByClass', {}, { componentClass: battery.cls.id }, [300, 320]);
    const valid = w.node('flow.isValid', {}, {}, [400, 96]);
    const bind = w.node('dispatcher.bind', { owner: battery.cls.id, dispatcher: d.id }, {}, [700, 96]);
    const ev = w.node('event.custom', { name: 'MettreAJour', signature: d.id, signatureOwner: battery.cls.id }, {}, [64, 560]);
    w.link(w.node('widget.getOwningPlayerPawn', {}, {}, [64, 320]), 'result', find, 'target');
    w.link(construct, 'then', valid, 'exec').link(find, 'result', valid, 'object').link(valid, 'valid', bind, 'exec').link(find, 'result', bind, 'target').link(ev, 'delegate', bind, 'event');
    const update = (value: [string, string], after: [string, string], y: number) => {
      const div = w.node('math.divideFloat', {}, { b: 100 }, [1100, y + 220]);
      const set = w.node('widget.setPercent', {}, {}, [1300, y]);
      w.link(value[0], value[1], div, 'a').link(div, 'result', set, 'percent').link(after[0], after[1], set, 'exec').link(getW(w, 'PB_Energie', [1100, y + 120]), 'value', set, 'target');
    };
    const now = w.node('var.getExternal', { owner: battery.cls.id, variable: charge }, {}, [800, 320]);
    w.link(find, 'result', now, 'target');
    update([now, 'value'], [bind, 'then'], 96);
    update([ev, d.params[0].id], [ev, 'then'], 560);
  },
};
