/**
 * Lot 3b of the path plan: synthesis S3 « Le poste de garde », the end of
 * the Confirmé. A brief that cannot be met without choosing the right tool
 * at each link (the player does not know the console's class: interface;
 * the console does not know who reacts to the alert: dispatcher; the badge
 * and the console need the player's variable: Cast), plus what the level
 * revisited: a component to add, a DoOnce, Destroy Actor, a Timeline.
 */
import type { Project } from '../../model/project';
import { readTimeline } from '../../nodes/library/timeline';
import { addDispatcher, addDispatcherParam, implementInterface } from '../../operations/classOps';
import { addInterface, addInterfaceFunction } from '../../operations/projectOps';
import { trackPin } from '../../nodes/library/timeline';
import { T } from '../../types/pins';
import { edit, ProjectBuilder, type ClassBuilder } from '../builder';
import { countPrints, noRuntimeErrors, notion, usesNode } from '../checks';
import type { CheckContext, Lesson } from '../types';
import { ensurePlayerInput } from '../ue5Input';
import { editable, goTo, tap, varId } from './kit';
import { playerBlueprint } from './props';
import { levelOf } from '../../model/project';
import { updateVariable } from '../../operations/classOps';
import { button, menuPanel, modeLabel, newClass, onButton, shown as shownW } from './umgKit';

const PANEL = 'WBP_Alerte';

const CONSOLE: [number, number] = [300, 0];
const BADGE: [number, number] = [-300, 260];
const BEACONS = [0, 300, 600];

function project(): Project {
  const pb = new ProjectBuilder('Synthèse S3');
  playerBlueprint(pb);
  const badge = pb.blueprint('BP_Badge');
  badge.component('StaticMesh', 'Carte', { sizeX: 40, sizeY: 26, color: '#1d4ed8', blocks: false });
  badge.component('BoxCollision', 'Zone', { sizeX: 90, sizeY: 90 });
  pb.place(badge, ...BADGE);
  const desk = pb.blueprint('BP_Pupitre');
  desk.component('StaticMesh', 'Console', { sizeX: 100, sizeY: 60, color: '#1f2937' });
  desk.component('BoxCollision', 'Zone', { sizeX: 220, sizeY: 220 });
  pb.place(desk, ...CONSOLE);
  const beacon = pb.blueprint('BP_Gyrophare');
  beacon.component('StaticMesh', 'Pied', { shape: 'cylinder', sizeX: 30, sizeY: 30, color: '#6b7280' });
  for (const x of BEACONS) pb.place(beacon, x, -350);
  const door = pb.blueprint('BP_Porte');
  door.component('StaticMesh', 'Porte', { shape: 'door', yaw: 90, sizeX: 180, sizeY: 16, color: '#a0703c' });
  pb.place(door, 750, 150);
  pb.playerStart(-300, -100);
  const p = pb.project;
  ensurePlayerInput(p, ['E'], { E: 'IA_Interagir' });
  // V7.60: the alert ends from a panel on the screen. Its Designer is drawn; its graph is the learner's.
  const w = newClass(p, PANEL, 'UserWidget');
  button(p, w.cls, menuPanel(p, w.cls, 'Alerte', { back: '#450a0a', title: '#fca5a5' }), 'Btn_Fin', 'Fin d’alerte', 0, 100);
  return p;
}

// ------------------------------------------------------------------ checks

const beaconLabels = ['BP_Gyrophare', 'BP_Gyrophare2', 'BP_Gyrophare3'];
/** Beacons whose light (any Point Light the learner added) is on. */
const lit = (cx: CheckContext) =>
  beaconLabels.filter((label) => cx.actor(label)?.components.some((c) => c.kind === 'PointLight' && c.props.visible));
const hasLight = (cx: CheckContext) => cx.project.classes.find((c) => c.name === 'BP_Gyrophare')?.components.some((c) => c.kind === 'PointLight');
const doorYaw = (cx: CheckContext) => Math.abs(cx.component('BP_Porte', 'Porte')?.props.yaw ?? 90);

/** Does the console hold or look for the actors that react to it? */
function consoleKnowsListeners(cx: CheckContext): string | undefined {
  const desk = cx.project.classes.find((c) => c.name === 'BP_Pupitre');
  if (!desk) return 'BP_Pupitre est introuvable (renommé ou supprimé ?).';
  const listeners = cx.project.classes.filter((c) => c.name === 'BP_Gyrophare' || c.name === 'BP_Porte');
  const known = desk.variables.find((v) => v.type.category === 'object' && (v.type.subtype === 'Actor' || listeners.some((l) => l.name === v.type.subtype)));
  if (known) return `BP_Pupitre garde une référence (${known.name}) : le pupitre ne doit connaître ni les gyrophares ni la porte. Ce sont eux qui viennent l’écouter.`;
  const nodes = cx.nodes('BP_Pupitre');
  if (nodes.some((n) => n.def === 'actor.getAllOfClass')) return 'BP_Pupitre cherche des acteurs (Get All Actors Of Class) : il ne doit pas savoir qui réagit à l’alerte.';
  if (nodes.some((n) => listeners.some((l) => Object.values(n.config).includes(l.id) || Object.values(n.defaults).includes(l.id))))
    return 'BP_Pupitre s’adresse directement aux gyrophares ou à la porte : il ne doit pas savoir qui réagit à l’alerte.';
  return undefined;
}

export const synthesis3: Lesson = {
  id: 's3-poste-garde',
  code: 'S3',
  kind: 'synthesis',
  module: 'Synthèse',
  level: 'confirme',
  number: 0,
  title: 'Le poste de garde',
  // V7.60 (review of the path's progression): the alert ends from a button on the screen, not a second E.
  revision: 2,
  situation:
    'Un badge au sol, un pupitre, trois gyrophares sans lumière et une porte ouverte. Avec le badge, E au pupitre déclenche l’alerte : les gyrophares s’allument, la porte se ferme en douceur, et un panneau s’affiche à l’écran. Son bouton « Fin d’alerte » remet tout en ordre.',
  recalls: ['destroy', 'cast', 'other-bp', 'flow-memory', 'timeline', 'rotation', 'interfaces', 'dispatchers', 'overlap', 'umg', 'ui-input'],
  notions: ['Choisir Cast, Dispatcher ou Interface', 'Timeline', 'DoOnce', 'Destroy Actor', 'Create Widget', 'Set Input Mode Game and UI', 'Expose on Spawn'],
  remember:
    'Pour chaque lien entre deux Blueprints, la même question : qui connaît qui ? Le joueur ne connaît pas le pupitre (interface), le pupitre ne connaît pas ceux qui réagissent (dispatcher), et celui qui a besoin d’une variable du joueur le reconnaît (Cast).',
  cards: [
    {
      title: 'Cahier des charges',
      body:
        'Le projet est réglé comme le template UE5 : **IMC_Joueur** (E → IA_Interagir), ajouté par BP_PlayerController. Tous les graphes sont vides, aucune variable n’existe. **WBP_Alerte** est dessiné (un panneau, un bouton **Btn_Fin**), son graphe est vide.\n\n' +
        '- **BP_Badge** : quand le joueur le touche, il **disparaît** et le joueur **l’a**.\n' +
        '- **BP_Pupitre** : **E** près de lui. Sans le badge : `Badge requis`, **une seule fois** dans la partie. Avec le badge : E déclenche l’alerte.\n' +
        '- **Pendant l’alerte**, WBP_Alerte est à l’écran et le **curseur** apparaît : le joueur peut cliquer. Son bouton **Fin d’alerte** y met fin : le panneau disparaît, le curseur se cache, le jeu reprend comme avant (Game Only).\n' +
        '- **BP_Gyrophare** (trois posés) : ajoute-lui une **Point Light**, éteinte au lancement. Pendant l’alerte elle est allumée, après l’alerte éteinte.\n' +
        '- **BP_Porte** : ouverte au lancement (Yaw 90). Au début de l’alerte, elle se **ferme en 1 seconde** (Yaw 0), en douceur ; à la fin, elle se rouvre de la même façon.',
    },
    {
      title: 'Trois règles',
      body:
        '- **BP_Joueur ne fait aucun Cast** : il ne sait pas ce qu’est le pupitre. Demain, d’autres objets réagiront à E sans le modifier.\n' +
        '- **BP_Pupitre ne connaît ni les gyrophares ni la porte** : on en ajoutera sans le toucher.\n' +
        '- Le pupitre, lui, a le droit de reconnaître le joueur pour savoir s’il a le badge, et le panneau a le droit de connaître le pupitre (il lui dit quand on clique).\n\n' +
        'Pour chaque lien, pose-toi la question de « Choisis ton outil » : qui connaît qui ?',
    },
    {
      title: 'Comment t’y prendre',
      body:
        'Une synthèse reprend le Confirmé, sans liste de nœuds. Une règle à la fois, et teste chacune avec ▶ Play avant de passer à la suivante : le badge, puis le pupitre et son message, puis l’alerte et les gyrophares, puis la porte, puis le panneau.\n\n' +
        'Conseillée, pas obligatoire : rien n’est bloqué si tu passes à l’Avancé sans elle. Les indices s’ouvrent après un premier essai.',
    },
  ],
  objectives: [
    'Le badge disparaît quand le joueur le touche, et le joueur l’a.',
    'Sans le badge, E au pupitre affiche « Badge requis », une seule fois.',
    'Avec le badge, E déclenche l’alerte : gyrophares allumés, porte fermée en douceur, panneau à l’écran et curseur visible.',
    'Le bouton Fin d’alerte : tout revient, le panneau disparaît, le jeu repasse en Game Only, curseur caché.',
    'Le joueur ne fait aucun Cast ; le pupitre ne connaît ni les gyrophares ni la porte.',
  ],
  hints: [
    'Cinq liens : badge → joueur (une variable du joueur), joueur → pupitre (sans savoir ce qu’il est), pupitre → gyrophares et porte (sans savoir qui écoute), un mouvement doux pour la porte, et panneau → pupitre (le panneau naît en sachant qui l’a créé).',
    'Cast To BP_Joueur et Destroy Actor (badge) ; une Blueprint Interface, Get Overlapping Actors et For Each Loop (joueur) ; Get Player Pawn, Cast, Branch, DoOnce, un Event Dispatcher avec un paramètre Boolean (pupitre) ; une Point Light et Bind Event (gyrophares) ; Bind Event, Timeline, Play et Reverse, Lerp, Make Rotator, Set Relative Rotation (porte) ; Create Widget avec une variable Expose on Spawn, Add to Viewport, Set Input Mode Game and UI, Set Show Mouse Cursor, On Clicked, Remove from Parent, Set Input Mode Game Only (panneau).',
    'Solution. BP_Joueur : variable bBadge ; IA_Interagir (Started) → Get Overlapping Actors → For Each Loop → Interagir (Message). BP_Badge : ActorBeginOverlap → Cast To BP_Joueur → Set bBadge (coché) → Destroy Actor.\n' +
      'BPI_Interactif (fonction Interagir), implémentée par BP_Pupitre : Event Interagir → Get Player Pawn → Cast To BP_Joueur → Branch (bBadge) ; True → Branch (NOT bAlerte) → Set bAlerte (coché) → Call OnAlerte (vrai) → Create WBP_Alerte Widget (Owning Player = Get Player Controller, Pupitre = Self) → Set Panneau → Add to Viewport → Set Input Mode Game and UI → Set Show Mouse Cursor (coché) ; False → DoOnce → Print String « Badge requis ». Custom Event FinAlerte → Set bAlerte (décoché) → Call OnAlerte (faux) → Remove from Parent (Panneau) → Set Input Mode Game Only → Set Show Mouse Cursor (décoché).\n' +
      'WBP_Alerte : variable Pupitre (BP_Pupitre, Instance Editable, Expose on Spawn) ; On Clicked (Btn_Fin) → FinAlerte (Target = Pupitre).\n' +
      'BP_Gyrophare : Point Light Lumiere (Visible décoché), variable Pupitre (Instance Editable, réglée sur les trois) ; BeginPlay → Bind Event to OnAlerte ← Custom Event → Set Visibility (Lumiere, le paramètre).\n' +
      'BP_Porte : variable Pupitre ; BeginPlay → Bind Event to OnAlerte ← Custom Event → Branch (paramètre) : True → Timeline Play, False → Reverse ; Update → Set Relative Rotation (Porte, Make Rotator Yaw = Lerp (90, 0, Alpha)).',
  ],
  challenge: 'Ajoute un quatrième gyrophare et une seconde porte : rien ne doit changer dans BP_Pupitre ni dans BP_Joueur.',
  setup: project,
  scenario: [
    { wait: 0.2 },
    ...goTo(...CONSOLE),
    ...tap('E'),
    { wait: 0.2 },
    ...tap('E'),
    { wait: 0.2 },
    { checkpoint: 'sans-badge' },
    ...goTo(...BADGE, 0.3),
    { checkpoint: 'badge' },
    ...goTo(...CONSOLE),
    ...tap('E'),
    { wait: 0.3 },
    { checkpoint: 'alerte' },
    { wait: 1 },
    { checkpoint: 'fermee' },
    { click: `${PANEL}/Btn_Fin` },
    { wait: 1.3 },
    { checkpoint: 'fin' },
  ],
  checks: [
    {
      id: 'refused',
      label: 'Sans le badge : « Badge requis », une seule fois, et pas d’alerte',
      at: 'sans-badge',
      test: (cx) => {
        const n = countPrints(cx, 'Badge requis');
        if (!n) return 'E au pupitre sans le badge : aucun message « Badge requis ».';
        if (n > 1) return `« Badge requis » s’affiche ${n} fois pour deux appuis : il ne doit passer qu’une fois.`;
        return lit(cx).length || doorYaw(cx) < 80 ? 'Sans le badge, l’alerte s’est déclenchée.' : true;
      },
    },
    {
      id: 'badge',
      label: 'Le badge disparaît quand le joueur le touche',
      at: 'badge',
      test: (cx) => (cx.actor('BP_Badge') && !cx.actor('BP_Badge')!.destroyed ? 'Le joueur est passé sur le badge, et il est toujours là.' : true),
    },
    {
      id: 'light',
      label: 'Chaque gyrophare a une Point Light, éteinte au lancement',
      at: 'sans-badge',
      test: (cx) => (!hasLight(cx) ? 'BP_Gyrophare n’a pas de lumière : ajoute-lui un composant Point Light (Components › +).' : lit(cx).length ? `Allumé(s) avant l’alerte : ${lit(cx).join(', ')}.` : true),
    },
    {
      id: 'alert',
      label: 'Avec le badge, E déclenche l’alerte : les trois gyrophares s’allument',
      at: 'alerte',
      test: (cx) => {
        const off = beaconLabels.filter((l) => !lit(cx).includes(l));
        return off.length ? `Après E avec le badge, encore éteint(s) : ${off.join(', ')}.` : true;
      },
    },
    {
      id: 'panel',
      label: 'Pendant l’alerte : le panneau à l’écran, le curseur visible',
      at: 'alerte',
      test: (cx) => {
        if (!shownW(cx, PANEL).length) return 'L’alerte a commencé, mais WBP_Alerte n’est pas à l’écran : le pupitre le crée (Create Widget) et l’ajoute (Add to Viewport) au début de l’alerte.';
        if (!cx.sim.showMouseCursor) return 'Le panneau est là, mais le curseur est caché : Set Show Mouse Cursor (coché) sur le Player Controller.';
        return cx.sim.inputMode === 'GameOnly' ? 'Le panneau est là, mais le jeu est resté en Game Only : ses boutons ne recevraient pas le doigt. Set Input Mode Game and UI.' : true;
      },
    },
    {
      id: 'smooth',
      label: 'La porte se ferme en douceur',
      at: 'alerte',
      test: (cx) => {
        const y = doorYaw(cx);
        if (y < 5) return 'La porte est déjà fermée 0,3 s après l’alerte : elle doit se fermer en 1 seconde, en douceur (un Timeline).';
        return y > 85 ? 'La porte n’a pas commencé à se fermer.' : true;
      },
    },
    {
      id: 'closed',
      label: 'Au bout d’une seconde, elle est fermée',
      at: 'fermee',
      test: (cx) => (doorYaw(cx) < 5 ? true : `Après plus d’une seconde d’alerte, la porte a un Yaw de ${Math.round(doorYaw(cx))} au lieu de 0.`),
    },
    {
      id: 'end',
      label: 'Fin d’alerte : gyrophares éteints et porte rouverte',
      at: 'fin',
      test: (cx) => {
        if (lit(cx).length) return `Après la fin d’alerte, encore allumé(s) : ${lit(cx).join(', ')}.`;
        return doorYaw(cx) > 85 ? true : `Après la fin d’alerte, la porte a un Yaw de ${Math.round(doorYaw(cx))} au lieu de 90.`;
      },
    },
    {
      id: 'back',
      label: 'Fin d’alerte : le panneau disparaît, Game Only, curseur caché',
      at: 'fin',
      test: (cx) => {
        if (shownW(cx, PANEL).length) return 'Après Fin d’alerte, le panneau est toujours à l’écran : Remove from Parent.';
        if (cx.sim.inputMode !== 'GameOnly') return `Après Fin d’alerte, le jeu est resté en ${modeLabel(cx)} : Set Input Mode Game Only.`;
        return cx.sim.showMouseCursor ? 'Après Fin d’alerte, le curseur est resté visible : Set Show Mouse Cursor (décoché).' : true;
      },
    },
    {
      id: 'player-nocast',
      label: 'BP_Joueur ne fait aucun Cast',
      test: (cx) => (cx.nodes('BP_Joueur').some((n) => n.def === 'cast.to') ? 'BP_Joueur utilise un Cast : il ne doit pas savoir ce qu’est le pupitre. Un message d’interface suffit.' : true),
    },
    { id: 'console-blind', label: 'BP_Pupitre ne connaît ni les gyrophares ni la porte', test: (cx) => consoleKnowsListeners(cx) ?? true },
    notion(usesNode('message', 'BP_Joueur', ['iface.message'], 'Le joueur prévient par un message d’interface', 'BP_Joueur doit envoyer un message d’interface à ce qui est à portée.')),
    notion(usesNode('call', 'BP_Pupitre', ['dispatcher.call'], 'Le pupitre annonce l’alerte avec un Event Dispatcher', 'Le pupitre n’appelle aucun Event Dispatcher : c’est l’outil pour prévenir sans savoir qui écoute.')),
    notion(usesNode('timeline', 'BP_Porte', ['timeline.node'], 'La porte bouge avec un Timeline', 'La porte bouge sans Timeline : c’est l’outil prévu pour un mouvement en douceur.')),
    noRuntimeErrors(),
  ],
  solve(p) {
    const player = edit(p, 'BP_Joueur');
    const has = player.variable('bBadge', T.bool, false);

    // The badge: Cast, then the player's variable, then gone.
    const badge = edit(p, 'BP_Badge');
    const touch = badge.node('event.actorBeginOverlap', {}, {}, [64, 96]);
    const castB = badge.node('cast.to', { class: player.cls.id }, {}, [340, 96]);
    const give = badge.node('var.setExternal', { owner: player.cls.id, variable: has }, { value: true }, [660, 96]);
    const gone = badge.node('actor.destroy', {}, {}, [980, 96]);
    badge.link(touch, 'then', castB, 'exec').link(touch, 'other', castB, 'object').link(castB, 'then', give, 'exec').link(castB, 'as', give, 'target').link(give, 'then', gone, 'exec');

    // The player tells what is within reach, through an interface.
    const r = addInterface(p, 'BPI_Interactif');
    if (!r.ok) throw new Error(r.reason);
    addInterfaceFunction(p, r.value.id, 'Interagir');
    const iface = r.value.id;
    const fn = r.value.functions[0].id;
    const action = p.inputActions.find((a) => a.name === 'IA_Interagir')!.id;
    const ev = player.node('input.action', { action }, {}, [64, 96]);
    const over = player.node('actor.getOverlappingActors', {}, {}, [340, 96]);
    const loop = player.node('flow.forEachLoop', {}, {}, [660, 96]);
    const msg = player.node('iface.message', { interface: iface, fn }, {}, [980, 96]);
    player.link(ev, 'started', over, 'exec').link(over, 'then', loop, 'exec').link(over, 'actors', loop, 'array').link(loop, 'body', msg, 'exec').link(loop, 'element', msg, 'target');

    // The console: badge or not, then the announcement.
    const desk = edit(p, 'BP_Pupitre');
    implementInterface(desk.cls, iface);
    const alert = desk.variable('bAlerte', T.bool, false);
    const d = addDispatcher(desk.cls, 'OnAlerte');
    addDispatcherParam(desk.cls, d.id, T.bool);
    d.params[0].name = 'bAlerte';
    const param = d.params[0].id;
    const asked = desk.node('event.interface', { interface: iface, fn }, {}, [64, 96]);
    const pawn = desk.node('actor.getPlayerPawn', {}, {}, [120, 300]);
    const castP = desk.node('cast.to', { class: player.cls.id }, {}, [340, 96]);
    const read = desk.node('var.getExternal', { owner: player.cls.id, variable: has }, {}, [520, 320]);
    const br = desk.node('flow.branch', {}, {}, [700, 96]);
    const not = desk.node('logic.not', {}, {}, [900, 320]);
    const idle = desk.node('flow.branch', {}, {}, [860, 40]);
    const set = desk.node('var.set', { variable: alert }, { value: true }, [1000, 40]);
    const call = desk.node('dispatcher.call', { owner: desk.cls.id, dispatcher: d.id }, { [d.params[0].id]: true }, [1320, 40]);
    const once = desk.node('flow.doOnce', {}, {}, [1000, 260]);
    const refuse = desk.node('debug.printString', {}, { text: 'Badge requis' }, [1320, 260]);
    desk.link(asked, 'then', castP, 'exec').link(pawn, 'result', castP, 'object').link(castP, 'then', br, 'exec');
    desk.link(castP, 'as', read, 'target').link(read, 'value', br, 'condition');
    desk.link(desk.node('var.get', { variable: alert }, {}, [760, 420]), 'value', not, 'a').link(not, 'result', idle, 'condition');
    desk.link(br, 'true', idle, 'exec').link(idle, 'true', set, 'exec').link(set, 'then', call, 'exec');
    // The panel: made with a reference to the console (Expose on Spawn), shown, the cursor and the clicks given to it.
    const w = edit(p, PANEL);
    const back = w.variable('Pupitre', T.object('BP_Pupitre'));
    updateVariable(w.cls, back, { instanceEditable: true, exposeOnSpawn: true });
    const panel = desk.variable('Panneau', T.object(PANEL));
    const create = desk.node('widget.create', {}, { class: w.cls.id }, [1640, 40]);
    const keep = desk.node('var.set', { variable: panel }, {}, [1960, 40]);
    const show = desk.node('widget.addToViewport', {}, {}, [2280, 40]);
    const ui = desk.node('input.setModeGameAndUI', {}, {}, [2600, 40]);
    const on = desk.node('input.setShowMouseCursor', {}, { show: true }, [2920, 40]);
    const pc = (x: number) => desk.node('player.getController', {}, {}, [x, 320]);
    const getPanel = (x: number, y: number) => desk.node('var.get', { variable: panel }, {}, [x, y]);
    desk.link(call, 'then', create, 'exec').link(pc(1500), 'result', create, 'owner').link(desk.node('actor.self', {}, {}, [1500, 440]), 'self', create, `expose:${back}`);
    desk.link(create, 'then', keep, 'exec').link(create, 'result', keep, 'value').link(keep, 'then', show, 'exec').link(getPanel(2120, 300), 'value', show, 'target');
    desk.link(show, 'then', ui, 'exec').link(pc(2440), 'result', ui, 'controller').link(ui, 'then', on, 'exec').link(pc(2760), 'result', on, 'target');
    const end = desk.node('event.custom', { name: 'FinAlerte' }, {}, [64, 700]);
    const off = desk.node('var.set', { variable: alert }, { value: false }, [360, 700]);
    const calm = desk.node('dispatcher.call', { owner: desk.cls.id, dispatcher: d.id }, { [d.params[0].id]: false }, [680, 700]);
    const remove = desk.node('widget.removeFromParent', {}, {}, [1000, 700]);
    const game = desk.node('input.setModeGameOnly', {}, {}, [1320, 700]);
    const hide = desk.node('input.setShowMouseCursor', {}, { show: false }, [1640, 700]);
    desk.link(end, 'then', off, 'exec').link(off, 'then', calm, 'exec').link(calm, 'then', remove, 'exec').link(getPanel(860, 900), 'value', remove, 'target');
    desk.link(remove, 'then', game, 'exec').link(desk.node('player.getController', {}, {}, [1180, 900]), 'result', game, 'controller').link(game, 'then', hide, 'exec').link(desk.node('player.getController', {}, {}, [1500, 900]), 'result', hide, 'target');
    const click = onButton(w, 'Btn_Fin');
    const tell = w.node('call.custom', { owner: desk.cls.id, event: 'FinAlerte' }, {}, [400, 96]);
    w.link(click, 'then', tell, 'exec').link(w.node('var.get', { variable: back }, {}, [200, 300]), 'value', tell, 'target');
    desk.link(br, 'false', once, 'exec').link(once, 'completed', refuse, 'exec');

    // Who reacts subscribes: a reference to the console, set on each placed actor.
    const deskActor = levelOf(p).actors.find((a) => a.classId === desk.cls.id)!;
    const listen = (b: ClassBuilder, act: (ev: string, on: string) => void) => {
      const ref = editable(b, 'Pupitre', T.object('BP_Pupitre'));
      for (const a of levelOf(p).actors.filter((x) => x.classId === b.cls.id)) a.overrides[ref] = `actor:${deskActor.id}`;
      const begin = b.node('event.beginPlay', {}, {}, [64, 96]);
      const bind = b.node('dispatcher.bind', { owner: desk.cls.id, dispatcher: d.id }, {}, [400, 96]);
      const cb = b.node('event.custom', { name: 'SurAlerte', signature: d.id, signatureOwner: desk.cls.id }, {}, [64, 480]);
      b.link(begin, 'then', bind, 'exec').link(b.node('var.get', { variable: varId(b, 'Pupitre') }, {}, [160, 300]), 'value', bind, 'target').link(cb, 'delegate', bind, 'event');
      act(cb, param);
    };

    const beacon = edit(p, 'BP_Gyrophare');
    beacon.component('PointLight', 'Lumiere', { visible: false, radius: 180, color: '#ef4444' });
    listen(beacon, (cb, on) => {
      const vis = beacon.node('component.setVisibility', {}, {}, [440, 480]);
      beacon.link(cb, 'then', vis, 'exec').link(cb, on, vis, 'visible').target('Lumiere', vis);
    });

    const door = edit(p, 'BP_Porte');
    listen(door, (cb, on) => {
      const choose = door.node('flow.branch', {}, {}, [400, 480]);
      const tl = door.node('timeline.node', {}, {}, [700, 480]);
      const alpha = readTimeline(door.graph.nodes[tl]).tracks[0].id;
      const lerp = door.node('math.lerp', {}, { a: 90, b: 0 }, [900, 760]);
      const rot = door.node('math.makeRotator', {}, {}, [1100, 760]);
      const turn = door.node('component.setRelativeRotation', {}, {}, [1100, 480]);
      door.link(cb, 'then', choose, 'exec').link(cb, on, choose, 'condition').link(choose, 'true', tl, 'play').link(choose, 'false', tl, 'reverse');
      door.link(tl, 'update', turn, 'exec').link(tl, trackPin(alpha), lerp, 'alpha').link(lerp, 'result', rot, 'yaw').link(rot, 'result', turn, 'rotation').target('Porte', turn);
    });
  },
};
