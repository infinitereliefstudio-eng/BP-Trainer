/**
 * V7.37, UMG at the end of the Confirmé: Complète C7 « La playlist » (E27 of
 * the exercise collection). One row widget per song (Expose on Spawn: its
 * Titre), built by the playlist with Add Child to Vertical Box. The rows only
 * announce (OnLire, OnRetirer, with their Titre); the playlist decides and
 * keeps the one list (Morceaux). Each button acts on its own song even after
 * a removal or a swap, because a row carries the song's identity, not its
 * position; refreshing rebuilds the rows, so it never multiplies actions.
 * Three gaps: the row's announcement, the playlist's subscription, the
 * removal from the list.
 */
import type { BlueprintClass, Project } from '../../model/project';
import { removeNodes } from '../../operations/graphOps';
import { T } from '../../types/pins';
import { edit, ProjectBuilder, type ClassBuilder } from '../builder';
import { noRuntimeErrors, notion } from '../checks';
import type { Check, CheckContext, Lesson, ScenarioStep } from '../types';
import { ensurePlayerInput } from '../ue5Input';
import { gap, nodeOf, varId } from './kit';
import { playerBlueprint } from './props';
import { UMG_MODULE } from './umgCounter';
import { dispatcherWith } from './umgHealth';
import { addW, controller, drawnProp, getW, newClass, onButton, widgetNamed } from './umgKit';

const SONGS = ['Aube', 'Brume', 'Cendre', 'Dune', 'Écho'];
const NONE = 'En lecture : —';

/** A Button with its Text, placed in a Canvas Panel from the top left. */
function topButton(p: Project, cls: BlueprintClass, canvas: string, name: string, label: string, x: number, y: number) {
  const btn = addW(p, cls, 'Button', canvas, { name, slot: { offsets: [x, y, 260, 64] } });
  addW(p, cls, 'TextBlock', btn.id, { name: `Txt_${name.replace(/^Btn_/, '')}`, props: { text: label, fontSize: 20, color: '#111827' } });
}

/** A Button with its Text, in a Horizontal Box (a row). */
function rowButton(p: Project, cls: BlueprintClass, box: string, name: string, label: string) {
  const btn = addW(p, cls, 'Button', box, { name, slot: { padding: [8, 6, 8, 6], vAlign: 'Center' } });
  addW(p, cls, 'TextBlock', btn.id, { name: `Txt_${name.replace(/^Btn_/, '')}`, props: { text: label, fontSize: 22, color: '#111827' }, slot: { padding: [18, 10, 18, 10] } });
}

interface Built {
  /** Nodes the gaps take out, by role. */
  roles: Record<string, string>;
}

/** The whole exercise, solved: WBP_Ligne, WBP_Playlist and the Player Controller that shows it. */
function build(p: Project): Built {
  // ---- WBP_Ligne: a row that only announces.
  const row = newClass(p, 'WBP_Ligne', 'UserWidget');
  const hbox = addW(p, row.cls, 'HorizontalBox', undefined);
  addW(p, row.cls, 'TextBlock', hbox.id, { name: 'Txt_Titre', isVariable: true, props: { text: 'Titre', fontSize: 28 }, slot: { sizeRule: 'Fill', padding: [8, 4, 8, 4], vAlign: 'Center' } });
  rowButton(p, row.cls, hbox.id, 'Btn_Lire', 'Lire');
  rowButton(p, row.cls, hbox.id, 'Btn_Retirer', 'Retirer');
  const titre = row.variable('Titre', T.string, '');
  const tv = row.cls.variables.find((v) => v.id === titre)!;
  tv.instanceEditable = true;
  tv.exposeOnSpawn = true;
  const onLire = dispatcherWith(row, 'OnLire', 'Titre', T.string);
  const onRetirer = dispatcherWith(row, 'OnRetirer', 'Titre', T.string);
  const construct = row.node('event.construct', {}, {}, [64, 96]);
  const toText = row.node('conv.stringToText', {}, {}, [300, 300]);
  const st = row.node('widget.setText', {}, {}, [520, 96]);
  row.link(construct, 'then', st, 'exec').link(row.node('var.get', { variable: titre }, {}, [100, 300]), 'value', toText, 'in').link(toText, 'result', st, 'text');
  row.link(getW(row, 'Txt_Titre', [360, 220]), 'value', st, 'target');
  const announce = (button: string, d: { id: string; param: string }, y: number) => {
    const click = onButton(row, button);
    row.graph.nodes[click].x = 64;
    row.graph.nodes[click].y = y;
    const call = row.node('dispatcher.call', { owner: row.cls.id, dispatcher: d.id }, {}, [420, y]);
    row.link(click, 'then', call, 'exec').link(row.node('var.get', { variable: titre }, {}, [220, y + 180]), 'value', call, d.param);
    return call;
  };
  const callLire = announce('Btn_Lire', onLire, 520);
  announce('Btn_Retirer', onRetirer, 860);

  // ---- WBP_Playlist: the one list, and the decisions.
  const pl = newClass(p, 'WBP_Playlist', 'UserWidget');
  const canvas = addW(p, pl.cls, 'CanvasPanel', undefined);
  addW(p, pl.cls, 'Image', canvas.id, { name: 'Img_Fond', props: { color: '#111827' }, slot: { offsets: [30, 20, 1220, 680] } });
  addW(p, pl.cls, 'TextBlock', canvas.id, { name: 'Txt_EnLecture', isVariable: true, props: { text: NONE, fontSize: 26, color: '#fde68a' }, slot: { offsets: [60, 40, 760, 44] } });
  addW(p, pl.cls, 'VerticalBox', canvas.id, { name: 'VB_Lignes', isVariable: true, slot: { offsets: [60, 110, 760, 560] } });
  topButton(p, pl.cls, canvas.id, 'Btn_Rafraichir', 'Rafraîchir', 900, 120);
  topButton(p, pl.cls, canvas.id, 'Btn_Inverser', 'Inverser 1 et 2', 900, 210);
  const songs = pl.variable('Morceaux', T.array(T.string), [...SONGS]);
  const playing = pl.variable('EnLecture', T.string, '');
  const tmp = pl.variable('Premier', T.string, '');
  const call = (name: string, at: [number, number]) => pl.node('call.custom', { owner: pl.cls.id, event: name }, {}, at);

  // Rafraichir: Clear Children → For Each Morceaux: Create WBP_Ligne (Titre) → Bind OnLire → Bind OnRetirer → Add Child.
  const refresh = pl.node('event.custom', { name: 'Rafraichir' }, {}, [64, 96]);
  const clear = pl.node('widget.clearChildren', {}, {}, [340, 96]);
  const loop = pl.node('flow.forEachLoop', {}, {}, [640, 96]);
  const create = pl.node('widget.create', {}, { class: row.cls.id }, [960, 96]);
  const lire = pl.node('event.custom', { name: 'Lire', signature: onLire.id, signatureOwner: row.cls.id }, {}, [64, 720]);
  const retirer = pl.node('event.custom', { name: 'Retirer', signature: onRetirer.id, signatureOwner: row.cls.id }, {}, [64, 1160]);
  const bindLire = pl.node('dispatcher.bind', { owner: row.cls.id, dispatcher: onLire.id }, {}, [1360, 96]);
  const bindRetirer = pl.node('dispatcher.bind', { owner: row.cls.id, dispatcher: onRetirer.id }, {}, [1700, 96]);
  const add = pl.node('widget.addChildToVerticalBox', {}, {}, [2040, 96]);
  pl.link(refresh, 'then', clear, 'exec').link(getW(pl, 'VB_Lignes', [200, 260]), 'value', clear, 'target');
  pl.link(clear, 'then', loop, 'exec').link(pl.node('var.get', { variable: songs }, {}, [480, 300]), 'value', loop, 'array');
  pl.link(loop, 'body', create, 'exec').link(loop, 'element', create, `expose:${titre}`).link(pl.node('widget.getOwningPlayer', {}, {}, [800, 360]), 'result', create, 'owner');
  pl.link(create, 'then', bindLire, 'exec').link(create, 'result', bindLire, 'target').link(lire, 'delegate', bindLire, 'event');
  pl.link(bindLire, 'then', bindRetirer, 'exec').link(create, 'result', bindRetirer, 'target').link(retirer, 'delegate', bindRetirer, 'event');
  pl.link(bindRetirer, 'then', add, 'exec').link(getW(pl, 'VB_Lignes', [1900, 300]), 'value', add, 'target').link(create, 'result', add, 'content');
  pl.link(pl.node('event.construct', {}, {}, [64, 460]), 'then', call('Rafraichir', [340, 460]), 'exec');

  // Lire (Titre): remember it, show it, and say it in the Output Log.
  const setPlaying = pl.node('var.set', { variable: playing }, {}, [360, 720]);
  const toTextP = pl.node('conv.stringToText', {}, {}, [560, 900]);
  const fmt = pl.node('text.format', {}, { format: 'En lecture : {T}' }, [760, 900]);
  const show = pl.node('widget.setText', {}, {}, [700, 720]);
  const append = pl.node('string.append', {}, { in0: 'Lecture : ' }, [1000, 900]);
  const say = pl.node('debug.printString', {}, { toScreen: false }, [1040, 720]);
  pl.link(lire, 'then', setPlaying, 'exec').link(lire, onLire.param, setPlaying, 'value');
  pl.link(setPlaying, 'then', show, 'exec').link(lire, onLire.param, toTextP, 'in').link(toTextP, 'result', fmt, 'arg:T').link(fmt, 'result', show, 'text');
  pl.link(getW(pl, 'Txt_EnLecture', [540, 820]), 'value', show, 'target');
  pl.link(show, 'then', say, 'exec').link(lire, onLire.param, append, 'in1').link(append, 'result', say, 'text');

  // Retirer (Titre): out of the list; if it was playing, nothing plays any more; then rebuild.
  const remove = pl.node('array.removeItem', {}, {}, [360, 1160]);
  const same = pl.node('string.equal', {}, {}, [600, 1360]);
  const branch = pl.node('flow.branch', {}, {}, [700, 1160]);
  const stop = pl.node('var.set', { variable: playing }, { value: '' }, [1000, 1100]);
  const reset = pl.node('widget.setText', {}, { text: NONE }, [1300, 1100]);
  pl.link(retirer, 'then', remove, 'exec').link(pl.node('var.get', { variable: songs }, {}, [200, 1340]), 'value', remove, 'array').link(retirer, onRetirer.param, remove, 'item');
  pl.link(remove, 'then', branch, 'exec').link(pl.node('var.get', { variable: playing }, {}, [420, 1420]), 'value', same, 'a').link(retirer, onRetirer.param, same, 'b').link(same, 'result', branch, 'condition');
  pl.link(branch, 'true', stop, 'exec').link(stop, 'then', reset, 'exec').link(getW(pl, 'Txt_EnLecture', [1140, 1240]), 'value', reset, 'target');
  pl.link(reset, 'then', call('Rafraichir', [1640, 1100]), 'exec').link(branch, 'false', call('Rafraichir', [1000, 1300]), 'exec');

  // The two buttons of the playlist (written): refresh, and swap the first two songs.
  pl.link(onButton(pl, 'Btn_Rafraichir'), 'then', call('Rafraichir', [400, 1600]), 'exec');
  const swap = onButton(pl, 'Btn_Inverser');
  const first = pl.node('array.get', {}, { index: 0 }, [300, 1960]);
  const keep = pl.node('var.set', { variable: tmp }, {}, [400, 1800]);
  const drop = pl.node('array.removeIndex', {}, { index: 0 }, [700, 1800]);
  const insert = pl.node('array.insert', {}, { index: 1 }, [1000, 1800]);
  pl.link(swap, 'then', keep, 'exec').link(pl.node('var.get', { variable: songs }, {}, [100, 1960]), 'value', first, 'array').link(first, 'item', keep, 'value');
  pl.link(keep, 'then', drop, 'exec').link(pl.node('var.get', { variable: songs }, {}, [560, 1960]), 'value', drop, 'array');
  pl.link(drop, 'then', insert, 'exec').link(pl.node('var.get', { variable: songs }, {}, [860, 1960]), 'value', insert, 'array').link(pl.node('var.get', { variable: tmp }, {}, [860, 2040]), 'value', insert, 'item');
  pl.link(insert, 'then', call('Rafraichir', [1300, 1800]), 'exec');

  // ---- BP_PlayerController: show the playlist, UI Only, the cursor.
  const { b: pc, last } = controller(p);
  const self = pc.node('actor.self', {}, {}, [1000, 300]);
  const make = pc.node('widget.create', {}, { class: pl.cls.id }, [1100, 96]);
  const view = pc.node('widget.addToViewport', {}, {}, [1440, 96]);
  const mode = pc.node('input.setModeUIOnly', {}, {}, [1740, 96]);
  const cursor = pc.node('input.setShowMouseCursor', {}, { show: true }, [2080, 96]);
  pc.link(last, 'then', make, 'exec').link(self, 'self', make, 'owner').link(make, 'then', view, 'exec').link(make, 'result', view, 'target');
  pc.link(view, 'then', mode, 'exec').link(self, 'self', mode, 'controller').link(make, 'result', mode, 'focus').link(mode, 'then', cursor, 'exec');

  return { roles: { callLire, bindLire, remove } };
}

function project(): Project {
  const pb = new ProjectBuilder('La playlist');
  playerBlueprint(pb);
  pb.playerStart(0, 0);
  const p = pb.project;
  ensurePlayerInput(p, []);
  const { roles } = build(p);
  // The three gaps: the row's announcement, the subscription, the removal.
  const row = edit(p, 'WBP_Ligne');
  const pl = edit(p, 'WBP_Playlist');
  const cut = (b: ClassBuilder, id: string, label: string, w = 360, h = 240) => {
    const n = b.graph.nodes[id];
    removeNodes(b.graph, [id]);
    gap(b, label, [n.x - 20, n.y - 40], w, h);
  };
  cut(row, roles.callLire, 'Trou 1 : annoncer la lecture, avec le Titre de cette ligne');
  cut(pl, roles.bindLire, 'Trou 2 : s’abonner à OnLire de la nouvelle ligne (Event = Lire)');
  // The rows still appear without it: Create Widget goes straight on to the OnRetirer subscription.
  const create = nodeOf(pl.graph, 'widget.create');
  pl.link(create, 'then', Object.values(pl.graph.nodes).find((n) => n.def === 'dispatcher.bind')!.id, 'exec');
  cut(pl, roles.remove, 'Trou 3 : retirer ce Titre de Morceaux');
  return p;
}

// -------------------------------------------------------------- checks

/** The titles of the rows on the screen, top to bottom. */
function rows(cx: CheckContext): string[] {
  return cx.sim.umg
    .layer(1280)
    .flatMap((s) => s.laid)
    .filter((l) => l.widget.name === 'Txt_Titre' && l.drawn)
    .sort((a, b) => a.rect.y - b.rect.y)
    .map((l) => String(l.props.text));
}

const playingText = (cx: CheckContext) => String(drawnProp(cx, 'Txt_EnLecture')?.text ?? '');
const reads = (cx: CheckContext) => cx.prints().filter((t) => t.startsWith('Lecture')).length;
const list = (titles: string[]) => (titles.length ? titles.join(', ') : 'aucune ligne');

function playing(id: string, title: string, label: string, at: string, why: string): Check {
  const want = `En lecture : ${title}`;
  return {
    id,
    label,
    at,
    test: (cx) => {
      const now = playingText(cx);
      if (now === want) return true;
      if (now === NONE && !reads(cx)) return 'Lire n’a rien déclenché : la ligne doit annoncer OnLire (Trou 1), et la playlist s’y abonner pour chaque ligne qu’elle crée (Trou 2).';
      return `On lit « ${now} », on attend « ${want} ». ${why}`;
    },
  };
}

function rowsAre(id: string, titles: string[], label: string, at: string, why: string): Check {
  return {
    id,
    label,
    at,
    test: (cx) => {
      const now = rows(cx);
      return now.join('|') === titles.join('|') ? true : `Lignes à l’écran : ${list(now)}. On attend : ${list(titles)}. ${why}`;
    },
  };
}

const AFTER_REMOVE = ['Brume', 'Cendre', 'Dune', 'Écho'];
const AFTER_SWAP = ['Cendre', 'Brume', 'Dune', 'Écho'];

const SCENARIO: ScenarioStep[] = [
  { wait: 0.3 },
  { checkpoint: 'debut' },
  { click: 'WBP_Ligne/Btn_Lire', nth: 1 },
  { wait: 0.1 },
  { checkpoint: 'lire' },
  { click: 'WBP_Ligne/Btn_Retirer', nth: 0 },
  { wait: 0.1 },
  { checkpoint: 'retire' },
  { click: 'WBP_Ligne/Btn_Lire', nth: 1 },
  { wait: 0.1 },
  { checkpoint: 'suivant' },
  { click: 'WBP_Playlist/Btn_Inverser' },
  { wait: 0.1 },
  { click: 'WBP_Ligne/Btn_Lire', nth: 1 },
  { wait: 0.1 },
  { checkpoint: 'inverse' },
  { click: 'WBP_Playlist/Btn_Rafraichir' },
  { click: 'WBP_Playlist/Btn_Rafraichir' },
  { click: 'WBP_Playlist/Btn_Rafraichir' },
  { wait: 0.1 },
  { click: 'WBP_Ligne/Btn_Lire', nth: 2 },
  { wait: 0.1 },
  { checkpoint: 'rafraichi' },
  { click: 'WBP_Ligne/Btn_Retirer', nth: 2 },
  { wait: 0.1 },
  { checkpoint: 'courant' },
];

export const complete7: Lesson = {
  id: 'c7-playlist',
  kind: 'complete',
  code: 'C7',
  module: UMG_MODULE,
  level: 'confirme',
  number: 0,
  title: 'La playlist',
  situation:
    'Une playlist de cinq morceaux : une ligne par morceau, avec Lire et Retirer. Les lignes sont construites, la playlist sait jouer et retirer, mais rien ne relie encore les boutons aux décisions. Trois trous, dans les cadres jaunes. Chaque bouton doit agir sur son morceau, même après un retrait ou une inversion.',
  recalls: ['dispatchers', 'arrays'],
  notions: ['Add Child to Vertical Box', 'Clear Children', 'Expose on Spawn', 'Event Dispatcher', 'Remove Item'],
  remember:
    'Une ligne de liste ne décide rien : elle annonce (un Event Dispatcher) avec ce qui identifie son élément, ici le Titre, jamais sa position, qui change dès qu’on retire ou réordonne. Le parent, seul à garder la liste, s’abonne à chaque ligne qu’il crée, décide, puis reconstruit l’affichage depuis ses données.',
  cards: [
    {
      title: 'Ce qui est en place',
      body:
        '**WBP_Ligne** (une Horizontal Box : Txt_Titre, Btn_Lire, Btn_Retirer) a une variable **Titre** (String, **Expose on Spawn**) et deux Event Dispatchers, **OnLire** et **OnRetirer**, qui donnent un Titre. Event Construct écrit son Titre ; Btn_Retirer annonce déjà OnRetirer (Titre).\n\n' +
        '**WBP_Playlist** garde **Morceaux** (un tableau de String) et **EnLecture**. Son Custom Event **Rafraichir** vide **VB_Lignes** (Clear Children), puis pour chaque morceau : **Create WBP_Ligne Widget** (Titre = Array Element), s’abonne à OnRetirer, et **Add Child to Vertical Box**. Ses Custom Events **Lire** (qui écrit aussi « Lecture : … » dans l’Output Log) et **Retirer** reçoivent un Titre. Les boutons Rafraîchir et Inverser 1 et 2 sont écrits.',
    },
    {
      title: 'Qui décide ?',
      body:
        'Une ligne ne sait qu’une chose : son morceau. Elle ne touche pas à la liste, elle **annonce** : « on veut lire *ce Titre* ». La playlist, abonnée, décide.\n\n' +
        '**Le piège du recueil.** Donner à chaque ligne sa position (0, 1, 2…) au lieu de son Titre marche… jusqu’au premier retrait ou à la première inversion : les positions bougent, les lignes non. Le bouton Lire de la 2e ligne finit par lire le 3e morceau. Un identifiant (ici le Titre, unique) ne bouge pas.\n\n' +
        '**Rafraîchir** reconstruit tout : les anciennes lignes quittent l’écran (Clear Children) avec leurs abonnements. Trois rafraîchissements, puis un clic : une seule lecture.',
    },
    {
      title: 'Les trois trous',
      body:
        '1. **WBP_Ligne**, après On Clicked (Btn_Lire) : **Call OnLire**, Titre = Get Titre.\n' +
        '2. **WBP_Playlist**, dans Rafraichir, entre Create Widget et le Bind d’OnRetirer : **Bind Event to OnLire**, Target = la Return Value de Create Widget, Event = le Custom Event **Lire** (sa pin rouge).\n' +
        '3. **WBP_Playlist**, au début de Retirer : **Remove Item** (Target Array = Morceaux, Item = Titre).\n\n' +
        'Le test lit le 2e morceau, retire le 1er, lit le 2e, inverse 1 et 2, lit le 2e, rafraîchit trois fois, lit le 3e, puis retire le morceau en cours.',
    },
  ],
  objectives: [
    'Chaque Lire joue le morceau de sa ligne, même après un retrait ou une inversion.',
    'Retirer enlève le morceau de la liste ; retirer celui en lecture arrête la lecture.',
    'Trois rafraîchissements, puis un clic : une seule lecture.',
  ],
  hints: [
    'Que la ligne annonce-t-elle, et qui l’écoute ? Une ligne neuve n’est écoutée que si la playlist s’y abonne au moment où elle la crée.',
    'Call OnLire, Get Titre, Bind Event to OnLire, Remove Item, Get Morceaux.',
    'Solution : Trou 1, dans WBP_Ligne : On Clicked (Btn_Lire) → Call OnLire (Titre = Get Titre). Trou 2, dans Rafraichir : Create WBP_Ligne Widget → Bind Event to OnLire (Target = Return Value, Event = Lire) → Bind Event to OnRetirer. Trou 3, dans Retirer : Retirer → Remove Item (Morceaux, Titre) → Branch.',
  ],
  challenge: 'Ajoute à chaque ligne un bouton « Monter » qui échange le morceau avec celui du dessus. Qui fait l’échange, et que doit annoncer la ligne ?',
  setup: project,
  scenario: SCENARIO,
  checks: [
    rowsAre('start', SONGS, 'Cinq lignes au lancement', 'debut', 'Rafraichir doit construire une ligne par morceau.'),
    playing('read', 'Brume', 'Lire sur la 2e ligne : Brume', 'lire', 'Le Titre annoncé est celui de la ligne touchée.'),
    rowsAre('removed', AFTER_REMOVE, 'Retirer sur la 1re ligne : Aube disparaît', 'retire', 'Retirer doit enlever ce Titre de Morceaux (Trou 3) avant de reconstruire.'),
    playing('next', 'Cendre', 'Puis Lire sur la 2e ligne : Cendre', 'suivant', 'Après un retrait, chaque ligne doit encore lire son propre morceau : la ligne annonce son Titre, pas sa position.'),
    rowsAre('swap-rows', AFTER_SWAP, 'Inverser 1 et 2 échange les deux premières lignes', 'inverse', 'Le bouton Inverser est écrit : il échange les deux premiers Morceaux puis appelle Rafraichir.'),
    playing('swapped', 'Brume', 'Inverser 1 et 2, puis Lire sur la 2e ligne : Brume', 'inverse', 'Après l’inversion, la 2e ligne affiche Brume : c’est Brume qu’elle doit lire.'),
    {
      id: 'once',
      label: 'Trois rafraîchissements, puis un clic : une seule lecture',
      at: 'rafraichi',
      test: (cx) => {
        const n = reads(cx);
        if (n === 4 && playingText(cx) === 'En lecture : Dune') return true;
        if (n > 4) return `Le dernier clic a déclenché ${n - 3} lectures : des abonnements s’accumulent. Seules les lignes créées par Rafraichir doivent s’abonner, une fois chacune.`;
        return `On lit « ${playingText(cx)} » (${n} lectures en tout), on attend « En lecture : Dune » et 4 lectures.`;
      },
    },
    playing('stopped-label', '—', 'Retirer le morceau en cours arrête la lecture', 'courant', 'Retirer le morceau en cours doit vider EnLecture (c’est écrit, après Remove Item).'),
    rowsAre('stopped-rows', ['Cendre', 'Brume', 'Écho'], 'Et l’enlève de la liste', 'courant', 'Retirer doit enlever ce Titre de Morceaux.'),
    notion({
      id: 'title-not-index',
      label: 'La ligne annonce son Titre',
      test: (cx) => {
        const row = cx.project.classes.find((c) => c.name === 'WBP_Ligne');
        const d = row?.dispatchers.find((x) => x.name === 'OnLire');
        return d?.params.some((x) => x.type.category === 'string') ? true : 'OnLire doit donner le Titre (un String) : une position change dès qu’on retire ou réordonne.';
      },
    }),
    noRuntimeErrors(),
  ],
  solve(p) {
    const row = edit(p, 'WBP_Ligne');
    const pl = edit(p, 'WBP_Playlist');
    for (const b of [row, pl]) for (const n of Object.values(b.graph.nodes)) if (n.def === 'util.comment' && String(n.config.text).startsWith('Trou')) removeNodes(b.graph, [n.id]);
    // Trou 1: On Clicked (Btn_Lire) → Call OnLire (Titre).
    const onLire = row.cls.dispatchers.find((d) => d.name === 'OnLire')!;
    const click = Object.values(row.graph.nodes).find((n) => n.def === 'event.widgetButton' && n.config.widget === widgetNamed(row.cls, 'Btn_Lire').id)!;
    const call = row.node('dispatcher.call', { owner: row.cls.id, dispatcher: onLire.id }, {}, [420, click.y]);
    row.link(click.id, 'then', call, 'exec').link(row.node('var.get', { variable: varId(row, 'Titre') }, {}, [220, click.y + 180]), 'value', call, onLire.params[0].id);
    // Trou 2: Create Widget → Bind Event to OnLire (Lire) → Bind Event to OnRetirer.
    const create = nodeOf(pl.graph, 'widget.create');
    const binds = Object.values(pl.graph.nodes).filter((n) => n.def === 'dispatcher.bind');
    const lire = Object.values(pl.graph.nodes).find((n) => n.def === 'event.custom' && n.config.name === 'Lire')!;
    const bind = pl.node('dispatcher.bind', { owner: row.cls.id, dispatcher: onLire.id }, {}, [1360, 96]);
    pl.link(create, 'then', bind, 'exec').link(create, 'result', bind, 'target').link(lire.id, 'delegate', bind, 'event').link(bind, 'then', binds[0].id, 'exec');
    // Trou 3: Retirer → Remove Item (Morceaux, Titre) → Branch.
    const retirer = Object.values(pl.graph.nodes).find((n) => n.def === 'event.custom' && n.config.name === 'Retirer')!;
    const branch = Object.values(pl.graph.nodes).find((n) => n.def === 'flow.branch')!;
    const remove = pl.node('array.removeItem', {}, {}, [360, 1160]);
    const param = row.cls.dispatchers.find((d) => d.name === 'OnRetirer')!.params[0].id;
    pl.link(retirer.id, 'then', remove, 'exec').link(pl.node('var.get', { variable: varId(pl, 'Morceaux') }, {}, [200, 1340]), 'value', remove, 'array').link(retirer.id, param, remove, 'item');
    pl.link(remove, 'then', branch.id, 'exec');
  },
};
