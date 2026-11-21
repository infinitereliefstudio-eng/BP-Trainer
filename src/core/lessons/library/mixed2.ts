/**
 * V7.61, review of the path's progression: three more mixed practices
 * (entrelacement), so that each level has one and the notions of November
 * meet each other. As in M1 and M2, the brief never names a tool; the
 * checks look at what happens, not how.
 *
 * - M3 « Le monte-charge », end of the Intermédiaire: an Input Action, a list
 *   of heights, a smooth move (Timeline), a press ignored while it moves.
 * - M4 « Le stand de tir », Confirmé after the Save Game: targets that
 *   announce without knowing who counts (Event Dispatcher), a score and a
 *   record on the screen (UMG), the record kept between games (Save Game).
 * - M5 « Le marché de la station », Avancé after A4: two kinds of goods that
 *   share one behaviour (Actor Component), credits that cross a door
 *   (GameInstance), the total shown above the counter (Widget Component).
 */
import { levelOf, type Project } from '../../model/project';
import { readTimeline, timelineConfig, trackPin } from '../../nodes/library/timeline';
import { addDispatcher, addDispatcherParam } from '../../operations/classOps';
import { setGameInstanceClass } from '../../operations/levelAssetOps';
import { addClass } from '../../operations/projectOps';
import { T } from '../../types/pins';
import { ClassBuilder, edit, ProjectBuilder } from '../builder';
import { noRuntimeErrors, normText, notion } from '../checks';
import type { CheckContext, Lesson, LessonCard } from '../types';
import { ensurePlayerInput } from '../ue5Input';
import { editable, fnDef, fnOf, goTo, override, tap, varId } from './kit';
import { playerBlueprint } from './props';
import { actionId, addW, controller, newClass, screenTexts } from './umgKit';

const MODULE = 'Entraînement mélangé';

const MIXED: LessonCard = {
  title: 'Un entraînement mélangé',
  body:
    'Ici, rien ne dit quels nœuds utiliser : c’est le travail. Pour chaque règle du cahier des charges, demande-toi quel outil tu connais déjà qui fait exactement ça, et pourquoi pas un autre. Plusieurs solutions marchent ; les vérifications regardent ce qui se passe, pas comment.',
};

const cls = (p: Project, name: string) => p.classes.find((c) => c.name === name)!;

// ------------------------------------------------------------ M3 Le monte-charge

const FLOORS = [0, 200, 400];

function liftProject(): Project {
  const pb = new ProjectBuilder('Le monte-charge');
  playerBlueprint(pb);
  const lift = pb.blueprint('BP_MonteCharge');
  lift.component('StaticMesh', 'Cage', { sizeX: 200, sizeY: 560, color: '#1f2937', blocks: false, y: 200 });
  lift.component('StaticMesh', 'Plateau', { sizeX: 160, sizeY: 60, color: '#d97706', blocks: false });
  lift.variable('Hauteurs', T.array(T.float), [...FLOORS]);
  lift.cls.autoReceiveInput = true;
  pb.place(lift, 0, -260);
  pb.playerStart(-300, 0);
  ensurePlayerInput(pb.project, ['E'], { E: 'IA_Appeler' });
  return pb.project;
}

const plateau = (cx: CheckContext) => Math.round(cx.component('BP_MonteCharge', 'Plateau')?.props.y ?? 0);
const at = (h: number, label: string, where: string) => ({
  id: `at-${h}`,
  label,
  at: where,
  test: (cx: CheckContext) => (Math.abs(plateau(cx) - h) <= 2 ? true : `Le plateau est à ${plateau(cx)} au lieu de ${h} : chaque appui l’envoie à l’étage suivant de Hauteurs (0, 200, 400, puis de nouveau 0).`),
});

export const mixedLift: Lesson = {
  id: 'm3-monte-charge',
  code: 'M3',
  module: MODULE,
  level: 'intermediaire',
  number: 0,
  title: 'Le monte-charge',
  recalls: ['enhanced-input', 'arrays', 'timeline', 'branch'],
  situation:
    'Un monte-charge dessert trois étages. Chaque appui sur E l’envoie à l’étage suivant, en douceur ; après le dernier, il redescend au premier. Tant qu’il roule, il ne prend pas de nouvel ordre.',
  notions: ['Entraînement mélangé'],
  remember:
    'Une liste dit où aller (un tableau et un index qui tourne avec un modulo), un Timeline dit comment y aller (de la position de départ à celle d’arrivée), et un Boolean dit si on peut accepter un ordre : trois questions, trois outils.',
  cards: [
    {
      title: 'Cahier des charges',
      body:
        'Déjà là : **IA_Appeler** (E), ajoutée par BP_PlayerController ; **BP_MonteCharge** a une **Cage** et un **Plateau**, et une liste **Hauteurs** (0, 200, 400) : la position Y du Plateau à chaque étage. Il entend les actions du joueur (Auto Receive Input). Son graphe est vide ; le Plateau part de 0.\n\n' +
        '1. Chaque appui sur **E** envoie le Plateau à l’**étage suivant** : 0, puis 200, puis 400, puis de nouveau 0, et ainsi de suite.\n' +
        '2. Il y va **en douceur**, en **1 seconde**, quel que soit l’écart.\n' +
        '3. **Pendant** qu’il roule, un appui sur E ne fait **rien**.',
    },
    MIXED,
  ],
  objectives: [
    'Chaque E envoie le Plateau à l’étage suivant de Hauteurs, puis revient au premier.',
    'Il y va en douceur, en 1 seconde.',
    'Un appui pendant le trajet ne fait rien.',
  ],
  hints: [
    'Trois questions : comment savoir où est l’étage suivant, et revenir au premier après le dernier ? Comment faire glisser une valeur d’un point à un autre en 1 seconde ? Comment refuser un ordre tant que le précédent n’est pas fini ?',
    'Un Integer Index et un modulo (%) ; Get (a copy) sur Hauteurs ; deux Float, Depart et Cible ; un Timeline d’une seconde, Lerp, Make Vector, Set Relative Location ; un Boolean, Branch, la sortie Finished du Timeline.',
    'Solution : variables Index (Integer), Depart et Cible (Float), bRoule (Boolean). IA_Appeler (Started) → Branch (NOT bRoule) → Set bRoule (coché) → Set Depart = Hauteurs[Index] → Set Index = (Index + 1) % 3 → Set Cible = Hauteurs[Index] → Timeline (1 s, Alpha de 0 à 1) Play from Start. Update → Set Relative Location (Plateau, Make Vector (0, Lerp (Depart, Cible, Alpha), 0)). Finished → Set bRoule (décoché).',
  ],
  challenge: 'Ajoute un quatrième étage à 600 dans Hauteurs : ton graphe doit suivre sans changer. (Le 3 du modulo vient-il de Length ?)',
  setup: liftProject,
  scenario: [
    { wait: 0.2 },
    ...tap('E'),
    { wait: 0.5 },
    { checkpoint: 'mi-chemin' },
    ...tap('E'),
    { wait: 0.7 },
    { checkpoint: 'premier' },
    ...tap('E'),
    { wait: 1.2 },
    { checkpoint: 'deuxieme' },
    ...tap('E'),
    { wait: 1.2 },
    { checkpoint: 'retour' },
  ],
  checks: [
    {
      id: 'smooth',
      label: 'Il roule en douceur : à mi-chemin après une demi-seconde',
      at: 'mi-chemin',
      test: (cx) => {
        const y = plateau(cx);
        if (y > 20 && y < 180) return true;
        return y >= 180 ? 'Le Plateau saute d’un coup à l’étage : il doit y aller en 1 seconde, en douceur.' : 'Une demi-seconde après E, le Plateau n’a pas bougé.';
      },
    },
    { ...at(200, 'Premier appui : il arrive à 200, et l’appui pendant le trajet n’a rien fait', 'premier') },
    at(400, 'Deuxième appui : il arrive à 400', 'deuxieme'),
    at(0, 'Troisième appui : il redescend à 0', 'retour'),
    noRuntimeErrors(),
  ],
  solve(p) {
    const b = edit(p, 'BP_MonteCharge');
    const heights = varId(b, 'Hauteurs');
    const index = b.variable('Index', T.int, 0);
    const from = b.variable('Depart', T.float, 0);
    const to = b.variable('Cible', T.float, 0);
    const moving = b.variable('bRoule', T.bool, false);
    const get = (v: string, at: [number, number]) => b.node('var.get', { variable: v }, {}, at);
    const pick = (at: [number, number]) => {
      const n = b.node('array.get', {}, {}, at);
      b.link(get(heights, [at[0] - 200, at[1]]), 'value', n, 'array').link(get(index, [at[0] - 200, at[1] + 100]), 'value', n, 'index');
      return n;
    };
    const ev = b.node('input.action', { action: actionId(p, 'IA_Appeler') }, {}, [64, 96]);
    const not = b.node('logic.not', {}, {}, [240, 300]);
    const br = b.node('flow.branch', {}, {}, [360, 96]);
    const busy = b.node('var.set', { variable: moving }, { value: true }, [600, 96]);
    const setFrom = b.node('var.set', { variable: from }, {}, [900, 96]);
    const mod = b.node('math.moduloInt', {}, { b: FLOORS.length }, [1100, 360]);
    const plus = b.node('math.addInt', {}, { b: 1 }, [950, 360]);
    const setIndex = b.node('var.set', { variable: index }, {}, [1200, 96]);
    const setTo = b.node('var.set', { variable: to }, {}, [1500, 96]);
    b.link(ev, 'started', br, 'exec').link(get(moving, [80, 300]), 'value', not, 'a').link(not, 'result', br, 'condition');
    b.link(br, 'true', busy, 'exec').link(busy, 'then', setFrom, 'exec').link(pick([760, 300]), 'item', setFrom, 'value');
    b.link(setFrom, 'then', setIndex, 'exec').link(get(index, [800, 460]), 'value', plus, 'a').link(plus, 'result', mod, 'a').link(mod, 'result', setIndex, 'value');
    b.link(setIndex, 'then', setTo, 'exec').link(pick([1400, 300]), 'item', setTo, 'value');
    const tl = b.node('timeline.node', {}, {}, [1800, 96]);
    const data = readTimeline(b.graph.nodes[tl]);
    data.name = 'Trajet';
    data.length = 1;
    data.tracks[0].keys = [
      { t: 0, v: 0 },
      { t: 1, v: 1 },
    ];
    Object.assign(b.graph.nodes[tl].config, timelineConfig(data));
    const lerp = b.node('math.lerp', {}, {}, [2100, 360]);
    const vec = b.node('math.makeVector', {}, {}, [2300, 360]);
    const move = b.node('component.setRelativeLocation', {}, {}, [2500, 96]);
    const free = b.node('var.set', { variable: moving }, { value: false }, [2500, 300]);
    b.link(setTo, 'then', tl, 'playFromStart').link(tl, 'update', move, 'exec').target('Plateau', move);
    b.link(get(from, [1900, 420]), 'value', lerp, 'a').link(get(to, [1900, 500]), 'value', lerp, 'b').link(tl, trackPin(data.tracks[0].id), lerp, 'alpha');
    b.link(lerp, 'result', vec, 'y').link(vec, 'result', move, 'location').link(tl, 'finished', free, 'exec');
  },
};

// ------------------------------------------------------------ M4 Le stand de tir

const TARGETS: [number, number, number][] = [
  [-300, -200, 10],
  [0, -200, 20],
  [300, -200, 30],
];
const STAND_SLOT = 'Stand';
const OUT: [number, number] = [0, 200];

function standProject(): Project {
  const pb = new ProjectBuilder('Le stand de tir');
  playerBlueprint(pb);
  const target = pb.blueprint('BP_Cible');
  target.component('StaticMesh', 'Disque', { shape: 'cylinder', sizeX: 60, sizeY: 60, color: '#dc2626', blocks: false });
  target.component('BoxCollision', 'Zone', { sizeX: 110, sizeY: 110 });
  const points = editable(target, 'Points', T.int, 10);
  for (const [x, y, v] of TARGETS) override(pb, pb.place(target, x, y), points, v);
  pb.playerStart(...OUT);
  ensurePlayerInput(pb.project, ['E'], { E: 'IA_Score' });
  return pb.project;
}

const onScreenNow = (cx: CheckContext, words: string[]) => screenTexts(cx).some((t) => words.every((w) => normText(t).includes(normText(w))));
const scoreIs = (cx: CheckContext, n: number) => screenTexts(cx).some((t) => /score/i.test(t) && new RegExp(`(^|\\D)${n}(\\D|$)`).test(t));
const recordIs = (cx: CheckContext, n: number) => screenTexts(cx).some((t) => /record/i.test(t) && new RegExp(`(^|\\D)${n}(\\D|$)`).test(t));

/** Does a target hold or look for who counts the points (the Player Controller, a widget)? */
function targetKnowsCounter(cx: CheckContext): string | undefined {
  const t = cx.project.classes.find((c) => c.name === 'BP_Cible');
  if (!t) return 'BP_Cible est introuvable (renommé ou supprimé ?).';
  const others = cx.project.classes.filter((c) => c.parent === 'PlayerController' || c.parent === 'UserWidget').map((c) => c.id);
  const nodes = t.graphs.flatMap((g) => Object.values(g.nodes));
  if (nodes.some((n) => n.def === 'player.getController' || n.def === 'actor.getAllOfClass' || n.def === 'actor.getOfClass' || others.some((o) => Object.values(n.config).includes(o))))
    return 'BP_Cible va chercher qui compte les points : une cible annonce qu’elle est touchée, sans savoir qui écoute.';
  return undefined;
}

export const mixedStand: Lesson = {
  id: 'm4-stand-tir',
  code: 'M4',
  module: MODULE,
  level: 'confirme',
  number: 0,
  title: 'Le stand de tir',
  recalls: ['dispatchers', 'umg', 'save-game', 'loops', 'destroy', 'overlap', 'enhanced-input', 'flow-memory'],
  situation:
    'Trois cibles valent 10, 20 et 30 points. Le joueur les touche pour marquer ; son score s’affiche à l’écran, avec le meilleur score jamais fait, qui reste d’une partie à l’autre.',
  notions: ['Entraînement mélangé'],
  remember:
    'Une cible annonce (Event Dispatcher), un seul objet compte (le Player Controller), l’écran montre (un widget qu’il garde), et ce qui doit survivre à la partie va dans une sauvegarde, relue au lancement : chaque outil répond à une question.',
  cards: [
    {
      title: 'Cahier des charges',
      body:
        'Déjà là : trois **BP_Cible** (un Disque, une Zone, et **Points**, réglé dans le niveau : 10, 20, 30) au graphe vide ; **BP_PlayerController**, le Player Controller du jeu ; **IA_Score** (E). Aucun Widget Blueprint, aucune sauvegarde.\n\n' +
        '1. Une cible touchée par le joueur **disparaît** et ajoute ses **Points** au score.\n' +
        '2. À l’**écran**, en permanence : `Score : 40` et `Record : 40`, par exemple.\n' +
        '3. Le **record** est le meilleur score jamais fait : il **reste** d’une partie à l’autre (Stop, puis Play), et s’affiche dès le lancement.\n' +
        '4. Une cible ne sait **pas** qui compte les points : on doit pouvoir en ajouter sans rien changer ailleurs.\n' +
        '5. **E** cache le tableau des scores ; E de nouveau le remontre.',
    },
    MIXED,
  ],
  objectives: [
    'Une cible touchée disparaît et ajoute ses Points ; le score s’affiche à l’écran.',
    'Le record s’affiche à l’écran, et suit le score quand il le dépasse.',
    'Après Stop et Play : le score repart de 0, le record est toujours là.',
    'Les cibles ne connaissent pas celui qui compte.',
    'E cache le tableau, E le remontre.',
  ],
  hints: [
    'Quatre questions : qui compte (un seul objet, pour toute la partie à l’écran) ? Comment une cible prévient-elle sans savoir qui l’écoute ? Où vit ce qui doit survivre à Stop ? Et qui montre les deux nombres, et les cache sur E ?',
    'Un Event Dispatcher sur BP_Cible, avec Points ; dans BP_PlayerController : Get All Actors Of Class, For Each Loop, Bind Event, Score et Record, Create Widget, Add to Viewport ; un Widget Blueprint avec deux Text ; un SaveGame, Create Save Game Object, Save Game to Slot, Load Game from Slot, Cast To ; IA_Score, Flip Flop, Remove from Parent, Add to Viewport.',
    'Solution. BP_Cible : Event Dispatcher OnTouchee (Points) ; ActorBeginOverlap → Cast To BP_Joueur → Call OnTouchee (Points) → Destroy Actor. WBP_Stand : Txt_Score, Txt_Record (Is Variable), Custom Event Montrer (Score, Record) → deux SetText. BP_Sauvegarde (SaveGame) : Record. BP_PlayerController, après Add Mapping Context : Create WBP_Stand (Self) → Set Hud → Add to Viewport → Load Game from Slot (Stand) → Cast To BP_Sauvegarde → Set Record ; puis Get All Actors Of Class (BP_Cible) → For Each Loop → Bind Event to OnTouchee ← Custom Event Marquer (Points) ; puis Montrer. Marquer : Score + Points → Branch (Score > Record) : True → Set Record → Create Save Game Object → Set Record (sur l’objet) → Save Game to Slot (Stand) ; puis Montrer (Score, Record). IA_Score (Started) → Flip Flop : A → Remove from Parent (Hud), B → Add to Viewport (Hud).',
  ],
  challenge: 'Ajoute une quatrième cible de 50 points : que faut-il changer en dehors du niveau ? (Rien.)',
  setup: standProject,
  scenario: [
    { wait: 0.3 },
    { checkpoint: 'debut' },
    ...goTo(TARGETS[0][0], TARGETS[0][1]),
    ...goTo(...OUT),
    ...goTo(TARGETS[2][0], TARGETS[2][1]),
    ...goTo(...OUT),
    { checkpoint: 'quarante' },
    { restart: true },
    { wait: 0.3 },
    { checkpoint: 'reprise' },
    ...goTo(TARGETS[1][0], TARGETS[1][1]),
    ...goTo(...OUT),
    { checkpoint: 'vingt' },
    ...tap('E'),
    { wait: 0.1 },
    { checkpoint: 'cache' },
    ...tap('E'),
    { wait: 0.1 },
    { checkpoint: 'montre' },
  ],
  checks: [
    {
      id: 'hud',
      label: 'Au lancement : le score et le record à l’écran, à 0',
      at: 'debut',
      test: (cx) => {
        if (!cx.sim.umg.viewport().length) return 'Rien à l’écran : un widget doit montrer le score et le record dès le lancement (Create Widget, Add to Viewport).';
        return scoreIs(cx, 0) && recordIs(cx, 0) ? true : 'Au lancement, l’écran doit montrer « Score : 0 » et « Record : 0 ».';
      },
    },
    {
      id: 'gone',
      label: 'Une cible touchée disparaît',
      at: 'quarante',
      test: (cx) => (['BP_Cible', 'BP_Cible3'].some((l) => cx.actor(l) && !cx.actor(l)!.destroyed) ? 'Le joueur a touché les cibles de 10 et de 30, et au moins l’une est toujours là.' : true),
    },
    {
      id: 'score',
      label: 'Deux cibles touchées : « Score : 40 » et « Record : 40 » à l’écran',
      at: 'quarante',
      test: (cx) => {
        if (!scoreIs(cx, 40)) return onScreenNow(cx, ['score']) ? 'Le score à l’écran ne dit pas 40 : 10 + 30. Chaque cible touchée doit ajouter ses Points, et l’écran suivre.' : 'L’écran ne montre plus de score.';
        return recordIs(cx, 40) ? true : 'Le score (40) dépasse le record : le record doit le suivre, à l’écran aussi.';
      },
    },
    {
      id: 'saved',
      label: 'Le record est sauvé (slot « Stand »)',
      at: 'quarante',
      test: (cx) => (cx.sim.slots[`${STAND_SLOT}|0`] ? true : 'Aucun slot « Stand » : le record doit être sauvé quand il change, sous ce nom.'),
    },
    {
      id: 'resume',
      label: 'Nouvelle partie : « Score : 0 » et « Record : 40 » dès le lancement',
      at: 'reprise',
      test: (cx) => (scoreIs(cx, 0) && recordIs(cx, 40) ? true : 'Après Stop et Play, l’écran doit montrer « Score : 0 » et « Record : 40 » : le record se relit au lancement.'),
    },
    {
      id: 'keep',
      label: 'Un score plus petit ne touche pas au record',
      at: 'vingt',
      test: (cx) => (scoreIs(cx, 20) && recordIs(cx, 40) ? true : 'Après la cible de 20, l’écran doit montrer « Score : 20 » et toujours « Record : 40 ».'),
    },
    {
      id: 'toggle',
      label: 'E cache le tableau des scores, E le remontre',
      at: 'cache',
      test: (cx) => (scoreIs(cx, 20) ? 'E n’a pas caché le tableau des scores : IA_Score doit le retirer de l’écran (Remove from Parent).' : true),
    },
    {
      id: 'toggle-back',
      label: 'E de nouveau : le tableau revient, toujours à 20 et 40',
      at: 'montre',
      test: (cx) => (scoreIs(cx, 20) && recordIs(cx, 40) ? true : 'Le second E doit remonter le même tableau (Add to Viewport), avec « Score : 20 » et « Record : 40 ».'),
    },
    notion({ id: 'blind', label: 'Les cibles ne connaissent pas celui qui compte', test: (cx) => targetKnowsCounter(cx) ?? true }),
    noRuntimeErrors(),
  ],
  solve(p) {
    const player = cls(p, 'BP_Joueur');
    const target = edit(p, 'BP_Cible');
    const d = addDispatcher(target.cls, 'OnTouchee');
    addDispatcherParam(target.cls, d.id, T.int);
    d.params[0].name = 'Points';
    const param = d.params[0].id;
    const touch = target.node('event.actorBeginOverlap', {}, {}, [64, 96]);
    const isPlayer = target.node('cast.to', { class: player.id }, {}, [340, 96]);
    const call = target.node('dispatcher.call', { owner: target.cls.id, dispatcher: d.id }, {}, [660, 96]);
    const gone = target.node('actor.destroy', {}, {}, [980, 96]);
    target.link(touch, 'then', isPlayer, 'exec').link(touch, 'other', isPlayer, 'object').link(isPlayer, 'then', call, 'exec');
    target.link(target.node('var.get', { variable: varId(target, 'Points') }, {}, [480, 300]), 'value', call, param).link(call, 'then', gone, 'exec');

    // The screen.
    const w = newClass(p, 'WBP_Stand', 'UserWidget');
    const canvas = addW(p, w.cls, 'CanvasPanel', undefined);
    const ts = addW(p, w.cls, 'TextBlock', canvas.id, { name: 'Txt_Score', isVariable: true, props: { text: 'Score : 0', fontSize: 28 }, slot: { offsets: [40, 30, 320, 44] } });
    const tr = addW(p, w.cls, 'TextBlock', canvas.id, { name: 'Txt_Record', isVariable: true, props: { text: 'Record : 0', fontSize: 22 }, slot: { offsets: [40, 80, 320, 36] } });
    const show = fnDef(p, w, 'Montrer', [['Score', T.int], ['Record', T.int]], [], false);
    const line = (txt: string, label: string, pin: string, x: number) => {
      const set = show.f.node('widget.setText', {}, {}, [x, 96]);
      const text = show.f.node('string.append', {}, { in0: label }, [x - 200, 300]);
      const str = show.f.node('conv.intToString', {}, {}, [x - 400, 300]);
      show.f.link(show.entry, pin, str, 'in').link(str, 'result', text, 'in1').link(text, 'result', set, 'text');
      show.f.link(show.f.node('var.widget', { widget: txt }, {}, [x - 200, 460]), 'value', set, 'target');
      return set;
    };
    const s1 = line(ts.id, 'Score : ', show.pin.Score, 600);
    const s2 = line(tr.id, 'Record : ', show.pin.Record, 1100);
    show.f.link(show.entry, 'then', s1, 'exec').link(s1, 'then', s2, 'exec').link(s2, 'then', show.ret, 'exec');

    // The save.
    const made = addClass(p, 'BP_Sauvegarde', 'SaveGame');
    if (!made.ok) throw new Error(made.reason);
    const save = new ClassBuilder(made.value, p);
    const saved = save.variable('Record', T.int, 0);

    // The Player Controller counts, shows, saves.
    const { b: pc, last } = controller(p);
    const hud = pc.variable('Hud', T.object('WBP_Stand'));
    const score = pc.variable('Score', T.int, 0);
    const record = pc.variable('Record', T.int, 0);
    const get = (v: string, at: [number, number]) => pc.node('var.get', { variable: v }, {}, at);
    const montrer = (at: [number, number]) => {
      const c = pc.node('call.function', { owner: w.cls.id, graph: show.graph.id }, {}, at);
      pc.link(get(hud, [at[0] - 200, at[1] + 200]), 'value', c, 'target').link(get(score, [at[0] - 200, at[1] + 280]), 'value', c, show.pin.Score).link(get(record, [at[0] - 200, at[1] + 360]), 'value', c, show.pin.Record);
      return c;
    };
    const create = pc.node('widget.create', {}, { class: w.cls.id }, [1100, 96]);
    const keepHud = pc.node('var.set', { variable: hud }, {}, [1400, 96]);
    const add = pc.node('widget.addToViewport', {}, {}, [1700, 96]);
    pc.link(last, 'then', create, 'exec').link(pc.node('actor.self', {}, {}, [1000, 300]), 'self', create, 'owner').link(create, 'then', keepHud, 'exec').link(create, 'result', keepHud, 'value');
    pc.link(keepHud, 'then', add, 'exec').link(get(hud, [1550, 300]), 'value', add, 'target');
    const load = pc.node('save.fromSlot', {}, { slot: STAND_SLOT }, [2000, 96]);
    const castS = pc.node('cast.to', { class: made.value.id }, {}, [2300, 96]);
    const readRec = pc.node('var.getExternal', { owner: made.value.id, variable: saved }, {}, [2450, 300]);
    const setRec = pc.node('var.set', { variable: record }, {}, [2600, 96]);
    pc.link(add, 'then', load, 'exec').link(load, 'then', castS, 'exec').link(load, 'result', castS, 'object').link(castS, 'as', readRec, 'target').link(castS, 'then', setRec, 'exec').link(readRec, 'value', setRec, 'value');
    // Subscribe to every target, then show the start (with or without a save).
    const all = pc.node('actor.getAllOfClass', {}, { class: target.cls.id }, [2900, 96]);
    const loop = pc.node('flow.forEachLoop', {}, {}, [3200, 96]);
    const bind = pc.node('dispatcher.bind', { owner: target.cls.id, dispatcher: d.id }, {}, [3500, 96]);
    const scored = pc.node('event.custom', { name: 'Marquer', signature: d.id, signatureOwner: target.cls.id }, {}, [64, 900]);
    pc.link(setRec, 'then', all, 'exec').link(castS, 'failed', all, 'exec').link(all, 'then', loop, 'exec').link(all, 'actors', loop, 'array');
    pc.link(loop, 'body', bind, 'exec').link(loop, 'element', bind, 'target').link(scored, 'delegate', bind, 'event');
    pc.link(loop, 'completed', montrer([3800, 300]), 'exec');
    const plus = pc.node('math.addInt', {}, {}, [300, 1100]);
    const setScore = pc.node('var.set', { variable: score }, {}, [400, 900]);
    const better = pc.node('math.greaterInt', {}, {}, [600, 1100]);
    const br = pc.node('flow.branch', {}, {}, [700, 900]);
    const setBest = pc.node('var.set', { variable: record }, {}, [1000, 800]);
    const createS = pc.node('save.create', {}, { saveClass: made.value.id }, [1300, 800]);
    const fill = pc.node('var.setExternal', { owner: made.value.id, variable: saved }, {}, [1600, 800]);
    const write = pc.node('save.toSlot', {}, { slot: STAND_SLOT }, [1900, 800]);
    pc.link(scored, 'then', setScore, 'exec').link(get(score, [100, 1100]), 'value', plus, 'a').link(scored, param, plus, 'b').link(plus, 'result', setScore, 'value');
    pc.link(setScore, 'then', br, 'exec').link(get(score, [450, 1200]), 'value', better, 'a').link(get(record, [450, 1280]), 'value', better, 'b').link(better, 'result', br, 'condition');
    pc.link(br, 'true', setBest, 'exec').link(get(score, [850, 1000]), 'value', setBest, 'value').link(setBest, 'then', createS, 'exec');
    pc.link(createS, 'then', fill, 'exec').link(createS, 'result', fill, 'target').link(get(record, [1450, 1000]), 'value', fill, 'value');
    pc.link(fill, 'then', write, 'exec').link(createS, 'result', write, 'object');
    const after = montrer([2200, 900]);
    pc.link(write, 'then', after, 'exec').link(br, 'false', after, 'exec');
    const key = pc.node('input.action', { action: actionId(p, 'IA_Score') }, {}, [64, 1500]);
    const flip = pc.node('flow.flipFlop', {}, {}, [360, 1500]);
    const hide = pc.node('widget.removeFromParent', {}, {}, [700, 1400]);
    const back = pc.node('widget.addToViewport', {}, {}, [700, 1600]);
    pc.link(key, 'started', flip, 'exec').link(flip, 'a', hide, 'exec').link(flip, 'b', back, 'exec').link(get(hud, [500, 1700]), 'value', hide, 'target').link(get(hud, [500, 1800]), 'value', back, 'target');
  },
};

// --------------------------------------------------- M5 Le marché de la station

const MARKET = 'Lvl_Marche';
const COUNTER_LEVEL = 'Lvl_Comptoir';
const GOODS: { cls: string; at: [number, number]; value: number }[] = [
  { cls: 'BP_Caisse', at: [-260, -160], value: 12 },
  { cls: 'BP_Bidon', at: [60, 160], value: 5 },
];
const MARKET_DOOR: [number, number] = [420, 0];
const MARKET_AWAY: [number, number] = [-520, 0];

function marketProject(): Project {
  const pb = new ProjectBuilder('Le marché de la station');
  const p = pb.project;
  levelOf(p).name = MARKET;
  playerBlueprint(pb);
  const crate = pb.blueprint('BP_Caisse');
  crate.component('StaticMesh', 'Caisse', { sizeX: 60, sizeY: 60, color: '#a16207', blocks: false });
  crate.component('BoxCollision', 'Zone', { sizeX: 110, sizeY: 110 });
  const can = pb.blueprint('BP_Bidon');
  can.component('StaticMesh', 'Bidon', { shape: 'cylinder', sizeX: 40, sizeY: 40, color: '#0369a1', blocks: false });
  can.component('BoxCollision', 'Zone', { sizeX: 100, sizeY: 100 });
  pb.place(crate, ...GOODS[0].at);
  pb.place(can, ...GOODS[1].at);
  const door = pb.blueprint('BP_Porte');
  door.component('StaticMesh', 'Cadre', { sizeX: 40, sizeY: 150, color: '#c08a3e', blocks: false });
  door.component('BoxCollision', 'Zone', { sizeX: 120, sizeY: 170 });
  door.link(door.node('event.actorBeginOverlap', {}, {}, [64, 96]), 'then', door.node('level.open', {}, { level: COUNTER_LEVEL }, [400, 96]), 'exec');
  pb.place(door, ...MARKET_DOOR);
  pb.playerStart(...MARKET_AWAY);

  // The label above the counter: drawn, with its function; no Widget Component yet.
  const w = newClass(p, 'WBP_Total', 'UserWidget');
  const canvas = addW(p, w.cls, 'CanvasPanel', undefined);
  addW(p, w.cls, 'Image', canvas.id, { name: 'Img_Fond', props: { color: '#111827' }, slot: { anchors: { minX: 0, minY: 0, maxX: 1, maxY: 1 }, offsets: [0, 0, 0, 0] } });
  const txt = addW(p, w.cls, 'TextBlock', canvas.id, {
    name: 'Txt_Total',
    isVariable: true,
    props: { text: '?', fontSize: 18, justification: 'Center' },
    slot: { anchors: { minX: 0, minY: 0, maxX: 1, maxY: 1 }, offsets: [0, 2, 0, 0] },
  });
  const fn = fnDef(p, w, 'Afficher', [['Texte', T.string]], [], false);
  const set = fn.f.node('widget.setText', {}, {}, [500, 96]);
  fn.f.link(fn.entry, 'then', set, 'exec').link(fn.entry, fn.pin.Texte, set, 'text').link(fn.f.node('var.widget', { widget: txt.id }, {}, [300, 300]), 'value', set, 'target').link(set, 'then', fn.ret, 'exec');
  const counter = pb.blueprint('BP_Comptoir');
  counter.component('StaticMesh', 'Comptoir', { sizeX: 160, sizeY: 60, color: '#475569' });
  pb.level(COUNTER_LEVEL, (q) => {
    q.place(counter, 0, -160);
    q.playerStart(-300, 0);
  });
  return p;
}

const goodsLeft = (cx: CheckContext) => GOODS.filter((g) => cx.sim.actors.some((a) => a.className === g.cls && !a.destroyed)).map((g) => g.cls);

export const mixedMarket: Lesson = {
  id: 'm5-marche',
  code: 'M5',
  module: MODULE,
  level: 'avance',
  number: 0,
  title: 'Le marché de la station',
  recalls: ['actor-components', 'game-instance', 'widget-component', 'cast', 'destroy'],
  situation:
    'Au marché, une caisse vaut 12 crédits et un bidon 5. Le joueur ramasse ce qu’il trouve, puis passe la porte : au comptoir, de l’autre côté, le total de ses crédits s’affiche au-dessus du comptoir.',
  notions: ['Entraînement mélangé'],
  remember:
    'Ce que plusieurs sortes d’acteurs savent faire va dans un Actor Component, ajouté à chacune ; ce qui doit traverser une porte vit dans le GameInstance ; ce qu’un acteur montre au-dessus de lui passe par son Widget Component.',
  cards: [
    {
      title: 'Cahier des charges',
      body:
        `Deux niveaux : **${MARKET}** (le départ) et **${COUNTER_LEVEL}**. La **BP_Porte** du marché mène au comptoir (Open Level, déjà écrit). Au marché, une **BP_Caisse** et un **BP_Bidon**, deux Blueprints différents, aux graphes vides. Au comptoir, **BP_Comptoir**, au graphe vide. **WBP_Total** est dessiné, avec sa fonction **Afficher (Texte)**.\n\n` +
        '1. La caisse vaut **12** crédits, le bidon **5**. Touchés par le joueur, ils **disparaissent** et leurs crédits s’ajoutent à ceux du joueur.\n' +
        '2. Ramasser s’écrit **une seule fois**, pour la caisse comme pour le bidon, et demain pour d’autres marchandises.\n' +
        '3. Les crédits **traversent la porte**.\n' +
        '4. Au comptoir, le total s’affiche **au-dessus du comptoir**, dans le monde (pas sur l’écran) : `17 crédits`.',
    },
    MIXED,
  ],
  objectives: [
    'La caisse (12) et le bidon (5) disparaissent quand le joueur les touche.',
    'Le ramassage est écrit une fois, pour les deux.',
    'Les crédits traversent la porte.',
    'Au comptoir, « 17 crédits » s’affiche au-dessus de lui.',
  ],
  hints: [
    'Trois questions : où écrire une fois un comportement que deux Blueprints différents partagent ? Où garder une valeur qui doit traverser Open Level ? Comment un acteur montre-t-il un texte au-dessus de lui ?',
    'Un Blueprint Actor Component avec une Valeur, ajouté à la caisse et au bidon (Get Owner, Bind Event to On Actor Begin Overlap) ; un GameInstance (Maps & Modes), Get Game Instance, Cast To ; un Widget Component (Widget Class = WBP_Total), Get User Widget Object, Cast To WBP_Total, Afficher.',
    'Solution. BP_Jeu (GameInstance, Credits : Integer), choisi dans Maps & Modes. BP_Ramassable (Actor Component, Valeur : Integer, Instance Editable) : BeginPlay → Bind Event to On Actor Begin Overlap (Target = Get Owner) ← Custom Event Ramasse → Cast To BP_Joueur → Cast To BP_Jeu (Get Game Instance) → Credits + Valeur → Destroy Actor (Get Owner). BP_Caisse et BP_Bidon : un BP_Ramassable, Valeur 12 et 5. BP_Comptoir : un Widget Component (WBP_Total) ; BeginPlay → Cast To BP_Jeu (Get Game Instance) → Get User Widget Object → Cast To WBP_Total → Afficher (Credits + « crédits »).',
  ],
  challenge: 'Ajoute un troisième article, une batterie à 8 crédits, en ne créant que son Blueprint et un composant : le total doit passer à 25.',
  setup: marketProject,
  scenario: [
    { wait: 0.2 },
    ...goTo(...GOODS[0].at),
    ...goTo(...MARKET_AWAY),
    ...goTo(...GOODS[1].at),
    ...goTo(...MARKET_AWAY),
    { checkpoint: 'ramasse' },
    { teleport: MARKET_DOOR },
    { wait: 0.5 },
    { checkpoint: 'comptoir' },
  ],
  checks: [
    {
      id: 'picked',
      label: 'La caisse et le bidon disparaissent quand le joueur les touche',
      at: 'ramasse',
      test: (cx) => {
        const left = goodsLeft(cx);
        return left.length ? `Le joueur a touché la caisse et le bidon, et ${left.join(' et ')} ${left.length > 1 ? 'sont' : 'est'} toujours là.` : true;
      },
    },
    {
      id: 'once',
      label: 'Le ramassage est écrit une fois, pour les deux',
      test: (cx) => {
        const comp = cx.project.classes.find((c) => c.parent === 'ActorComponent');
        if (!comp) return 'Aucun Actor Component : la caisse et le bidon recopient la même logique. Écris-la une fois, dans un composant ajouté aux deux.';
        const own = GOODS.filter((g) => !cx.project.classes.find((c) => c.name === g.cls)?.components.some((k) => k.classId === comp.id));
        return own.length ? `${own.map((g) => g.cls).join(' et ')} n’${own.length > 1 ? 'ont' : 'a'} pas ${comp.name} : ajoute-le aux deux.` : true;
      },
    },
    {
      id: 'counter',
      label: 'Au comptoir : « 17 crédits » au-dessus de lui',
      at: 'comptoir',
      test: (cx) => {
        if (cx.level() !== COUNTER_LEVEL) return `La partie est restée dans ${cx.level()} : la porte (déjà écrite) fait Open Level vers ${COUNTER_LEVEL}. L’as-tu modifiée ?`;
        const above = cx.sim.umg.componentLayer().filter((l) => l.obj.className === 'WBP_Total').length;
        if (!above) return 'Rien au-dessus du comptoir : ajoute-lui un Widget Component dont la Widget Class est WBP_Total.';
        const said = cx.shown().map(normText);
        if (said.some((t) => /(^|\D)17(\D|$)/.test(t))) return true;
        if (said.some((t) => /(^|\D)0(\D|$)/.test(t))) return 'Le comptoir affiche 0 : les crédits sont restés dans un objet du marché, refait à neuf derrière la porte. Garde-les dans le GameInstance.';
        return 'Le comptoir ne dit pas 17 : appelle Afficher sur son WBP_Total (Get User Widget Object, puis Cast To WBP_Total) avec les crédits du joueur.';
      },
    },
    noRuntimeErrors(),
  ],
  solve(p) {
    const r0 = addClass(p, 'BP_Jeu', 'GameInstance');
    if (!r0.ok) throw new Error(r0.reason);
    const jeu = new ClassBuilder(r0.value, p);
    const credits = jeu.variable('Credits', T.int, 0);
    const gi = setGameInstanceClass(p, jeu.cls.id);
    if (!gi.ok) throw new Error(gi.reason);

    // One component, for both goods.
    const r1 = addClass(p, 'BP_Ramassable', 'ActorComponent');
    if (!r1.ok) throw new Error(r1.reason);
    const comp = new ClassBuilder(r1.value, p);
    const value = comp.variable('Valeur', T.int, 1);
    r1.value.variables.find((v) => v.id === value)!.instanceEditable = true;
    const bind = comp.node('dispatcher.bindNative', { dispatcher: 'OnActorBeginOverlap' }, {}, [360, 96]);
    const picked = comp.node('event.custom', { name: 'Ramasse', signature: 'OnActorBeginOverlap', signatureOwner: 'Actor' }, {}, [64, 420]);
    comp.link(comp.node('event.beginPlay', {}, {}, [64, 96]), 'then', bind, 'exec').link(comp.node('component.getOwner', {}, {}, [200, 260]), 'result', bind, 'target').link(picked, 'delegate', bind, 'event');
    const isPlayer = comp.node('cast.to', { class: cls(p, 'BP_Joueur').id }, {}, [380, 420]);
    const castG = comp.node('cast.to', { class: jeu.cls.id }, {}, [700, 420]);
    const read = comp.node('var.getExternal', { owner: jeu.cls.id, variable: credits }, {}, [900, 640]);
    const plus = comp.node('math.addInt', {}, {}, [1100, 640]);
    const set = comp.node('var.setExternal', { owner: jeu.cls.id, variable: credits }, {}, [1020, 420]);
    const gone = comp.node('actor.destroy', {}, {}, [1340, 420]);
    comp.link(picked, 'then', isPlayer, 'exec').link(picked, 'other', isPlayer, 'object').link(isPlayer, 'then', castG, 'exec').link(comp.node('game.getGameInstance', {}, {}, [560, 640]), 'result', castG, 'object');
    comp.link(castG, 'then', set, 'exec').link(castG, 'as', set, 'target').link(castG, 'as', read, 'target').link(read, 'value', plus, 'a').link(comp.node('var.get', { variable: value }, {}, [900, 760]), 'value', plus, 'b').link(plus, 'result', set, 'value');
    comp.link(set, 'then', gone, 'exec').link(comp.node('component.getOwner', {}, {}, [1200, 640]), 'result', gone, 'target');
    for (const g of GOODS) edit(p, g.cls).logic(comp, 'BP_Ramassable', { [value]: g.value });

    // The counter shows the total above itself.
    const counter = edit(p, 'BP_Comptoir');
    const wbp = edit(p, 'WBP_Total');
    const afficher = fnOf(wbp, 'Afficher');
    const label = counter.widgetComponent('Etiquette', wbp, { y: -70, sizeX: 160, sizeY: 28 });
    const begin = counter.node('event.beginPlay', {}, {}, [64, 96]);
    const castC = counter.node('cast.to', { class: jeu.cls.id }, {}, [340, 96]);
    const obj = counter.node('widgetComponent.getUserWidgetObject', {}, {}, [500, 360]);
    const castW = counter.node('cast.to', { class: wbp.cls.id }, {}, [700, 96]);
    const call = counter.node('call.function', { owner: wbp.cls.id, graph: afficher.graph.id }, {}, [1060, 96]);
    const str = counter.node('conv.intToString', {}, {}, [800, 460]);
    const text = counter.node('string.append', {}, { in1: ' crédits' }, [960, 460]);
    counter.link(begin, 'then', castC, 'exec').link(counter.node('game.getGameInstance', {}, {}, [200, 300]), 'result', castC, 'object').link(castC, 'then', castW, 'exec');
    counter.link(counter.node('var.component', { component: label }, {}, [300, 460]), 'value', obj, 'target').link(obj, 'result', castW, 'object').link(castW, 'then', call, 'exec').link(castW, 'as', call, 'target');
    counter.link(castC, 'as', counter.node('var.getExternal', { owner: jeu.cls.id, variable: credits }, {}, [600, 560]), 'target');
    const readC = Object.values(counter.graph.nodes).find((n) => n.def === 'var.getExternal')!.id;
    counter.link(readC, 'value', str, 'in').link(str, 'result', text, 'in0').link(text, 'result', call, afficher.pin.Texte);
  },
};
