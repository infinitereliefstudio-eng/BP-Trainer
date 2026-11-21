/**
 * Level syntheses (lot 2 of docs/PLAN_PARCOURS.md): at the end of a level, a
 * specification that mixes what the level taught, with no node list. They are
 * advised before the next level, never required (Home.tsx).
 */
import { T } from '../../types/pins';
import { edit, ProjectBuilder } from '../builder';
import { noRuntimeErrors, normText, visible } from '../checks';
import type { CheckContext, Lesson } from '../types';
import { readTimeline, timelineConfig, trackPin } from '../../nodes/library/timeline';
import { ensurePlayerInput } from '../ue5Input';
import { told } from './messageHud';
import { addW, controller, newClass, screenTexts } from './umgKit';
import { doorBlueprint, keyBlueprint, playerBlueprint } from './props';

// ------------------------------------------------------- S1 Le passage (Débutant)

function passageProject() {
  const pb = new ProjectBuilder('Synthèse S1');
  const lamp = pb.blueprint('BP_Lampe');
  lamp.component('StaticMesh', 'Pied', { shape: 'cylinder', sizeX: 40, sizeY: 40, color: '#6b7280' });
  lamp.component('PointLight', 'Lumiere', { visible: false, radius: 380 });
  pb.place(lamp, -400, 320);
  const bar = pb.blueprint('BP_Barriere');
  bar.component('StaticMesh', 'Barriere', { sizeX: 40, sizeY: 1600, color: '#b45309', blocks: true, collision: 3 });
  bar.component('BoxCollision', 'Zone', { x: -150, sizeX: 120, sizeY: 160 });
  pb.place(bar, 0, 0);
  pb.playerStart(-500, 0);
  return pb.project;
}

/** The barrier still stands: visible and blocking. */
const barrierUp = (cx: CheckContext) => {
  const a = cx.actor('BP_Barriere');
  const wall = cx.component('BP_Barriere', 'Barriere');
  return !!a && !a.hidden && !!wall?.props.visible && Number(wall.props.collision) !== 0;
};

/** One way in and out of the zone in front of the barrier. */
const passage = [{ teleport: [-150, 0] as [number, number] }, { wait: 0.3 }, { teleport: [-500, 0] as [number, number] }, { wait: 0.3 }];

export const synthesis1: Lesson = {
  id: 's1-passage',
  code: 'S1',
  kind: 'synthesis',
  module: 'Synthèse',
  level: 'debutant',
  number: 0,
  title: 'Le passage',
  situation:
    'Une lampe éteinte et une barrière qui coupe le niveau. La touche E allume et éteint la lampe ; la barrière compte les passages devant elle et s’ouvre au troisième.',
  notions: ['Input E', 'Variable Integer', 'Branch', 'Set Collision Enabled'],
  remember:
    'Un cahier des charges se découpe en règles : pour chacune, quel événement la déclenche, quel état il faut garder (une variable), quelle condition décide (un Branch), et ce qui change à l’écran comme pour le moteur.',
  cards: [
    {
      title: 'Cahier des charges',
      body:
        '**BP_Lampe** (un Pied, une Lumiere éteinte) et **BP_Barriere** (le mur **Barriere** et une **Zone** devant lui, côté joueur). Les deux graphes sont vides, aucune variable, aucun réglage fait.\n\n' +
        '- Au **lancement**, la barrière affiche `Trois passages pour ouvrir`.\n' +
        '- La touche **E** allume la lampe, puis l’éteint, puis la rallume…\n' +
        '- Chaque fois que le joueur **entre** dans la Zone, le jeu **affiche** le nombre de passages : 1, 2, 3.\n' +
        '- Au **3e** passage, la barrière **disparaît** et le joueur peut la **traverser**.\n' +
        '- Avant, elle reste visible et bloque.',
    },
    {
      title: 'Comment t’y prendre',
      body:
        'Une synthèse reprend tout le niveau Débutant, sans liste de nœuds. Une règle à la fois, et pour chacune :\n\n' +
        '1. Quel événement la déclenche, et quel Blueprint l’écoute ?\n2. Qu’est-ce qui doit être gardé d’une fois à l’autre ?\n3. Quelle condition décide ?\n4. Que faut-il changer, pour l’œil et pour le moteur ?\n\n' +
        'Teste chaque règle avec ▶ Play avant de passer à la suivante. Les indices s’ouvrent après un premier essai.',
    },
    {
      title: 'Conseillée, pas obligatoire',
      body:
        'Rien n’est bloqué si tu passes à l’Intermédiaire sans elle. Mais si une règle résiste, c’est la leçon à revoir : la liste des leçons dit laquelle.',
    },
  ],
  objectives: [
    'Au lancement, la barrière affiche « Trois passages pour ouvrir ».',
    'E allume, éteint et rallume la lampe.',
    'Chaque entrée dans la Zone affiche le nombre de passages.',
    'Au 3e passage, la barrière disparaît et se laisse traverser.',
  ],
  hints: [
    'Deux Blueprints, deux graphes : la lampe pour E (pense à ce qui lui permet d’entendre les touches), la barrière pour les passages.',
    'La lampe : comme « Interrupteur à touche ». La barrière : comme « Le compteur », puis comme « Visible, caché, traversable » quand le compte arrive à 3.',
    'Solution — BP_Lampe : Auto Receive Input, E Pressed → Toggle Visibility (Lumiere). BP_Barriere : BeginPlay → Print String « Trois passages pour ouvrir ». Variable Passages (Integer) ; ActorBeginOverlap → Increment Int → Print String → Branch (Passages >= 3) → True : Set Actor Hidden In Game (coché) → Set Collision Enabled (Barriere, No Collision).',
  ],
  challenge: 'Fais que la lampe s’allume aussi toute seule quand la barrière s’ouvre. Il faudra parler d’un Blueprint à l’autre : c’est le sujet de l’Intermédiaire.',
  setup: passageProject,
  scenario: [
    { wait: 0.2 },
    { press: 'E' },
    { release: 'E' },
    { checkpoint: 'allumee' },
    { press: 'E' },
    { release: 'E' },
    { checkpoint: 'eteinte' },
    ...passage,
    ...passage,
    { checkpoint: 'deux' },
    { teleport: [-150, 0] },
    { wait: 0.3 },
    { checkpoint: 'ouverte' },
    { walk: [1, 0], seconds: 1.5 },
    { checkpoint: 'passe' },
  ],
  checks: [
    {
      id: 'start',
      label: 'Au lancement : « Trois passages pour ouvrir »',
      test: (cx) =>
        cx.prints().some((t) => t.trim().toLowerCase() === 'trois passages pour ouvrir')
          ? true
          : 'Au lancement, la barrière doit afficher « Trois passages pour ouvrir ». Quel événement part au lancement ?',
    },
    visible('on', 'BP_Lampe', 'Lumiere', true, '1er appui sur E : la lampe s’allume', 'allumee'),
    visible('off', 'BP_Lampe', 'Lumiere', false, '2e appui : elle s’éteint', 'eteinte'),
    {
      id: 'count',
      label: 'Chaque passage affiche le nombre : 1, 2, 3',
      test: (cx) => {
        const texts = cx.prints().map((t) => t.trim());
        const at = [1, 2, 3].map((n) => texts.indexOf(String(n)));
        if (at.every((i, k) => i >= 0 && (k === 0 || i > at[k - 1]))) return true;
        return texts.length
          ? `L’Output Log montre ${texts.slice(0, 4).join(', ')} : on attend 1, puis 2, puis 3, un nombre par passage.`
          : 'Rien ne s’affiche quand le joueur entre dans la Zone.';
      },
    },
    {
      id: 'holds',
      label: 'Après deux passages, la barrière est toujours là et bloque',
      at: 'deux',
      test: (cx) => (barrierUp(cx) ? true : 'La barrière s’ouvre trop tôt : elle doit tenir jusqu’au 3e passage.'),
    },
    {
      id: 'hidden',
      label: 'Au 3e passage, la barrière disparaît',
      at: 'ouverte',
      test: (cx) => {
        const a = cx.actor('BP_Barriere');
        const wall = cx.component('BP_Barriere', 'Barriere');
        return a?.hidden || wall?.props.visible === false ? true : 'Au 3e passage, la barrière est toujours visible.';
      },
    },
    {
      id: 'through',
      label: 'Puis le joueur la traverse',
      at: 'passe',
      test: (cx) => {
        if (cx.sim.player.x > 60) return true;
        return barrierUp(cx) ? 'Le joueur reste bloqué : la barrière ne s’est pas ouverte.' : 'Le joueur reste bloqué : une barrière cachée garde sa collision. C’est un nœud de plus, sur le mur.';
      },
    },
    noRuntimeErrors(),
  ],
  solve(p) {
    const lamp = edit(p, 'BP_Lampe');
    lamp.cls.autoReceiveInput = true;
    const key = lamp.node('event.inputKey', { key: 'E' }, {}, [64, 120]);
    const toggle = lamp.node('component.toggleVisibility', {}, {}, [360, 120]);
    lamp.link(key, 'pressed', toggle, 'exec').target('Lumiere', toggle);

    const b = edit(p, 'BP_Barriere');
    const v = b.variable('Passages', T.int, 0);
    const begin = b.node('event.beginPlay', {}, {}, [64, -160]);
    const hello = b.node('debug.printString', {}, { text: 'Trois passages pour ouvrir' }, [340, -160]);
    b.link(begin, 'then', hello, 'exec');
    const ev = b.node('event.actorBeginOverlap', {}, {}, [64, 96]);
    const inc = b.node('var.incrementInt', {}, {}, [340, 96]);
    const pr = b.node('debug.printString', {}, {}, [620, 96]);
    const br = b.node('flow.branch', {}, {}, [900, 96]);
    const ge = b.node('math.greaterEqualInt', {}, { b: 3 }, [700, 340]);
    const hide = b.node('actor.setHidden', {}, { hidden: true }, [1180, 96]);
    const col = b.node('component.setCollisionEnabled', {}, { collision: 0 }, [1460, 96]);
    b.link(ev, 'then', inc, 'exec').link(b.node('var.get', { variable: v }, {}, [300, 300]), 'value', inc, 'value');
    b.link(inc, 'then', pr, 'exec').link(inc, 'result', pr, 'text');
    b.link(pr, 'then', br, 'exec').link(b.node('var.get', { variable: v }, {}, [560, 400]), 'value', ge, 'a').link(ge, 'result', br, 'condition');
    b.link(br, 'true', hide, 'exec').link(hide, 'then', col, 'exec').target('Barriere', col);
  },
};

// ------------------------------------------------------- S2 La réserve (Intermédiaire)

const KEY_AT: [number, number] = [-100, 260];

function storeroomProject() {
  const pb = new ProjectBuilder('Synthèse S2');
  const { b: player } = playerBlueprint(pb);
  player.variable('bACle', T.bool, false);
  pb.place(keyBlueprint(pb, false), ...KEY_AT);
  doorBlueprint(pb);
  pb.playerStart(-500, 0);
  // V7.60: the project is set up as UE5's template (BP_PlayerController), where the learner makes the widget.
  ensurePlayerInput(pb.project, []);
  return pb.project;
}

/** On the screen, a text that speaks of the key and says `word` (« oui », « non »). */
const keyOnScreen = (cx: CheckContext, word: string) => screenTexts(cx).some((t) => normText(t).includes('cle') && normText(t).includes(word));

/** Door angle in [-180, 180). */
function doorYaw(cx: CheckContext): number {
  const yaw = cx.component('BP_Porte', 'Porte')?.props.yaw ?? 0;
  return ((((yaw + 180) % 360) + 360) % 360) - 180;
}
const doorIsOpen = (cx: CheckContext) => Math.abs(Math.abs(doorYaw(cx)) - 90) < 1;
const doorIsClosed = (cx: CheckContext) => Math.abs(doorYaw(cx)) < 1;

const keyLeft = (cx: CheckContext) => {
  const cls = cx.project.classes.find((c) => c.name === 'BP_Cle');
  return cx.sim.actors.some((a) => a.classId === cls?.id && !a.destroyed);
};

const away: [number, number] = [-500, 0];
const atDoor: [number, number] = [-150, 0];

export const synthesis2: Lesson = {
  id: 's2-reserve',
  code: 'S2',
  kind: 'synthesis',
  module: 'Synthèse',
  level: 'intermediaire',
  number: 0,
  title: 'La réserve',
  // V7.60 (review of the path's progression): the key on the screen, the door turns smoothly (Timeline).
  revision: 2,
  situation:
    'La porte de la réserve ne s’ouvre qu’au joueur qui a la clé : elle pivote en douceur, puis se referme d’elle-même. La clé traîne un peu plus loin, et un petit texte à l’écran dit au joueur s’il l’a.',
  notions: ['Cast To', 'Variable d’un autre Blueprint', 'Destroy Actor', 'Delay', 'Timeline', 'Widget Blueprint'],
  remember:
    'Une règle qui dépend de qui agit commence par un Cast. Ce que le joueur possède vit chez lui (une variable de BP_Joueur) : la clé l’écrit, la porte le lit. Ce qui doit arriver plus tard passe par un Delay, sur le même fil.',
  cards: [
    {
      title: 'Cahier des charges',
      body:
        '**BP_Joueur** a une variable `bACle` (Boolean, faux au départ). **BP_Cle** (la Cle et sa Zone) et **BP_Porte** (la Porte, qui pivote sur son gond, et sa Zone) ont des graphes vides. **BP_PlayerController** est le Player Controller du jeu, comme dans le template d’UE5. Aucun Widget Blueprint.\n\n' +
        '- Le joueur qui arrive à la porte **sans la clé** voit un message avec le mot « clé », et la porte reste fermée. Ce message ne s’affiche **qu’une fois**, même s’il revient.\n' +
        '- Quand le joueur touche la clé, elle **disparaît** et il la **possède**.\n' +
        '- **Avec la clé**, la porte s’ouvre quand il arrive : elle **pivote en douceur** jusqu’à Yaw 90, en une demi-seconde.\n' +
        '- **2 secondes** après s’être ouverte, elle se **referme** toute seule, en douceur aussi (Yaw 0).\n' +
        '- Dès le lancement, un texte **à l’écran** dit `Clé : non` ; quand le joueur prend la clé, il dit `Clé : oui`.',
    },
    {
      title: 'Comment t’y prendre',
      body:
        'Une synthèse reprend l’Intermédiaire, sans liste de nœuds. Une règle à la fois :\n\n' +
        '1. Quel Blueprint réagit, et à quel événement ?\n2. Comment être sûr que c’est le joueur ?\n3. Où vit l’information « il a la clé », et qui l’écrit, qui la lit ?\n4. Que faut-il faire attendre, et sur quel fil ?\n5. Qui crée le texte à l’écran, et comment la clé le prévient-elle ?\n\n' +
        'Teste chaque règle avec ▶ Play. Les indices s’ouvrent après un premier essai.',
    },
    {
      title: 'Conseillée, pas obligatoire',
      body: 'Rien n’est bloqué si tu passes au Confirmé sans elle. Si une règle résiste, la leçon à revoir est dans les indices.',
    },
  ],
  objectives: [
    'Sans la clé : un message avec le mot « clé », une seule fois, et la porte reste fermée.',
    'La clé disparaît quand le joueur la touche, et il la possède.',
    'Avec la clé : la porte pivote en douceur jusqu’à 90°, puis se referme seule, en douceur, 2 s plus tard.',
    'À l’écran : « Clé : non » dès le lancement, puis « Clé : oui ».',
  ],
  hints: [
    'Trois Blueprints à écrire et un à créer : la clé (comme « Ramasser un objet »), la porte (comme « La porte verrouillée », puis « La porte qui glisse » ; pour lancer le pivot et l’attente côte à côte, un Sequence, comme dans le Prédis P1 « Sequence et Delay »), le widget et le Player Controller (comme « Le compteur à l’écran »).',
    'La clé : overlap, Cast To BP_Joueur, Set bACle, Get Player Controller, Cast To BP_PlayerController, un Custom Event du widget, Destroy Actor. La porte : overlap, Cast To BP_Joueur, Branch, Sequence, Timeline, Lerp, Make Rotator, Set Relative Rotation, Delay, DoOnce, Print String. Le widget : Text (Is Variable), Custom Event, SetText. BP_PlayerController : Create Widget, Set, Add to Viewport.',
    'Solution — WBP_Cle : Txt_Cle (Is Variable, « Clé : non ») ; Custom Event AvoirCle → SetText (Txt_Cle, « Clé : oui »). BP_PlayerController : après Add Mapping Context → Create WBP_Cle Widget (Owning Player = Self) → Set Hud → Add to Viewport. BP_Cle : ActorBeginOverlap → Cast To BP_Joueur → Set bACle (coché) → Cast To BP_PlayerController (Get Player Controller) → AvoirCle (Target = Hud) → Destroy Actor. BP_Porte : ActorBeginOverlap → Cast To BP_Joueur → Branch (As BP_Joueur › bACle) ; True → Sequence : Then 0 → Timeline (0,5 s, Alpha de 0 à 1) Play from Start, Update → Set Relative Rotation (Porte, Make Rotator (Yaw = Lerp (0, 90, Alpha))) ; Then 1 → Delay 2,5 → Reverse ; False → DoOnce → Print String « Il faut la clé ».',
  ],
  challenge: 'Fais que la porte reste ouverte tant que le joueur est dans sa Zone, et ne se referme que 2 s après son départ (Event ActorEndOverlap, Retriggerable Delay).',
  setup: storeroomProject,
  scenario: [
    { wait: 0.2 },
    { teleport: atDoor },
    { wait: 0.3 },
    { checkpoint: 'sans-cle' },
    { teleport: away },
    { wait: 0.3 },
    { teleport: atDoor },
    { wait: 0.3 },
    { checkpoint: 'encore' },
    { teleport: away },
    { wait: 0.3 },
    { teleport: KEY_AT },
    { wait: 0.3 },
    { checkpoint: 'cle' },
    { teleport: away },
    { wait: 0.3 },
    { teleport: atDoor },
    { wait: 0.15 },
    { checkpoint: 'pivote' },
    { wait: 0.55 },
    { checkpoint: 'ouverte' },
    { teleport: away },
    { wait: 2.6 },
    { checkpoint: 'refermee' },
  ],
  checks: [
    {
      id: 'locked',
      label: 'Sans la clé : un message avec le mot « clé », et la porte reste fermée',
      at: 'sans-cle',
      test: (cx) => {
        if (!doorIsClosed(cx)) return 'La porte s’ouvre au joueur qui n’a pas la clé.';
        return told(cx).some((t) => normText(t).includes('cle') && !normText(t).includes('cle : ')) ? true : 'Le joueur arrive sans la clé, mais aucun message ne parle de la clé.';
      },
    },
    {
      id: 'once',
      label: 'Revenu sans la clé : pas de second message',
      at: 'encore',
      test: (cx) => {
        const n = told(cx).filter((t) => normText(t).includes('cle') && !normText(t).includes('cle : ')).length;
        return n <= 1 ? true : `Le message sur la clé s’est affiché ${n} fois : une seule suffit.`;
      },
    },
    {
      id: 'picked',
      label: 'La clé disparaît quand le joueur la touche, et il la possède',
      at: 'cle',
      test: (cx) => {
        if (keyLeft(cx)) return 'Le joueur a touché la clé, mais elle est toujours là.';
        return cx.variable('Joueur', 'bACle') === true ? true : 'La clé a disparu, mais bACle du joueur est toujours faux : c’est chez lui que l’information doit vivre.';
      },
    },
    {
      id: 'hud',
      label: 'Dès le lancement, l’écran dit « Clé : non »',
      at: 'sans-cle',
      test: (cx) => {
        if (keyOnScreen(cx, 'non')) return true;
        if (!cx.project.classes.some((c) => c.parent === 'UserWidget')) return 'Aucun Widget Blueprint : crée-en un (Content Drawer › + Add › User Interface), avec un Text « Clé : non ».';
        return cx.sim.umg.viewport().length ? 'Un widget est à l’écran, mais aucun texte n’y dit « Clé : non ».' : 'Le widget n’est pas à l’écran : BP_PlayerController le crée (Create Widget) et l’ajoute au viewport (Add to Viewport) à son BeginPlay.';
      },
    },
    {
      id: 'hud-yes',
      label: 'Clé prise : l’écran dit « Clé : oui »',
      at: 'cle',
      test: (cx) => (keyOnScreen(cx, 'oui') ? true : 'Le joueur a pris la clé, mais l’écran ne dit pas « Clé : oui » : la clé doit prévenir le widget (un de ses Custom Events, que le Player Controller garde dans une variable).'),
    },
    {
      id: 'smooth',
      label: 'Avec la clé, la porte pivote en douceur',
      at: 'pivote',
      test: (cx) => {
        const yaw = Math.abs(doorYaw(cx));
        if (yaw > 3 && yaw < 87) return true;
        return yaw >= 87 ? 'La porte saute d’un coup à 90° : fais-la pivoter en une demi-seconde, avec un Timeline (Alpha de 0 à 1, Lerp de 0 à 90).' : 'Le joueur a la clé, mais la porte n’a pas commencé à s’ouvrir.';
      },
    },
    {
      id: 'opens',
      label: 'Avec la clé, la porte s’ouvre',
      at: 'ouverte',
      test: (cx) => (doorIsOpen(cx) ? true : `Le joueur a la clé, mais la porte est à ${doorYaw(cx)}° au lieu de 90°.`),
    },
    {
      id: 'closes',
      label: '2 secondes plus tard, elle s’est refermée toute seule',
      at: 'refermee',
      test: (cx) => (doorIsClosed(cx) ? true : 'Plus de 2 s après s’être ouverte, la porte est toujours ouverte.'),
    },
    noRuntimeErrors(),
  ],
  solve(p) {
    const player = edit(p, 'BP_Joueur');
    const has = player.cls.variables.find((v) => v.name === 'bACle')!.id;
    const key = edit(p, 'BP_Cle');
    const ke = key.node('event.actorBeginOverlap', {}, {}, [64, 96]);
    const kc = key.node('cast.to', { class: player.cls.id }, {}, [360, 96]);
    const ks = key.node('var.setExternal', { owner: player.cls.id, variable: has }, { value: true }, [680, 96]);
    const kd = key.node('actor.destroy', {}, {}, [1000, 96]);
    key.link(ke, 'then', kc, 'exec').link(ke, 'other', kc, 'object').link(kc, 'then', ks, 'exec').link(kc, 'as', ks, 'target').link(ks, 'then', kd, 'exec');

    const d = edit(p, 'BP_Porte');
    const e = d.node('event.actorBeginOverlap', {}, {}, [64, 96]);
    const cast = d.node('cast.to', { class: player.cls.id }, {}, [360, 96]);
    const get = d.node('var.getExternal', { owner: player.cls.id, variable: has }, {}, [420, 340]);
    const br = d.node('flow.branch', {}, {}, [720, 96]);
    const seq = d.node('flow.sequence', {}, {}, [1000, 0]);
    const tl = d.node('timeline.node', {}, {}, [1300, -200]);
    const data = readTimeline(d.graph.nodes[tl]);
    data.name = 'Pivot';
    data.length = 0.5;
    data.tracks[0].keys = [
      { t: 0, v: 0 },
      { t: 0.5, v: 1 },
    ];
    Object.assign(d.graph.nodes[tl].config, timelineConfig(data));
    const lerp = d.node('math.lerp', {}, { a: 0, b: 90 }, [1600, 0]);
    const rot = d.node('math.makeRotator', {}, {}, [1800, 0]);
    const turn = d.node('component.setRelativeRotation', {}, {}, [2000, -200]);
    const wait = d.node('time.delay', {}, { duration: 2.5 }, [1300, 160]);
    const once = d.node('flow.doOnce', {}, {}, [1000, 360]);
    const say = d.node('debug.printString', {}, { text: 'Il faut la clé' }, [1300, 360]);
    d.link(e, 'then', cast, 'exec').link(e, 'other', cast, 'object').link(cast, 'then', br, 'exec');
    d.link(cast, 'as', get, 'target').link(get, 'value', br, 'condition');
    d.link(br, 'true', seq, 'exec').link(seq, 'then0', tl, 'playFromStart').link(seq, 'then1', wait, 'exec').link(wait, 'completed', tl, 'reverse');
    d.link(tl, 'update', turn, 'exec').target('Porte', turn).link(tl, trackPin(data.tracks[0].id), lerp, 'alpha').link(lerp, 'result', rot, 'yaw').link(rot, 'result', turn, 'rotation');
    // The widget, made by the Player Controller; the key tells it.
    const w = newClass(p, 'WBP_Cle', 'UserWidget');
    const canvas = addW(p, w.cls, 'CanvasPanel', undefined);
    const txt = addW(p, w.cls, 'TextBlock', canvas.id, { name: 'Txt_Cle', isVariable: true, props: { text: 'Clé : non', fontSize: 26 }, slot: { offsets: [40, 30, 300, 50] } });
    const got = w.node('event.custom', { name: 'AvoirCle' }, {}, [64, 96]);
    const yes = w.node('widget.setText', {}, { text: 'Clé : oui' }, [400, 96]);
    w.link(got, 'then', yes, 'exec').link(w.node('var.widget', { widget: txt.id }, {}, [200, 300]), 'value', yes, 'target');
    const { b: pc, last } = controller(p);
    const hud = pc.variable('Hud', T.object('WBP_Cle'));
    const create = pc.node('widget.create', {}, { class: w.cls.id }, [1100, 96]);
    const keep = pc.node('var.set', { variable: hud }, {}, [1440, 96]);
    const show = pc.node('widget.addToViewport', {}, {}, [1760, 96]);
    pc.link(last, 'then', create, 'exec').link(pc.node('actor.self', {}, {}, [1000, 300]), 'self', create, 'owner');
    pc.link(create, 'then', keep, 'exec').link(create, 'result', keep, 'value');
    pc.link(keep, 'then', show, 'exec').link(pc.node('var.get', { variable: hud }, {}, [1600, 300]), 'value', show, 'target');
    const pcId = pc.cls.id;
    for (const l of Object.values(key.graph.links)) if (l.from.node === ks && l.from.pin === 'then') delete key.graph.links[l.id];
    const castPc = key.node('cast.to', { class: pcId }, {}, [1000, 300]);
    const tell = key.node('call.custom', { owner: w.cls.id, event: 'AvoirCle' }, {}, [1400, 300]);
    key.link(ks, 'then', castPc, 'exec').link(key.node('player.getController', {}, {}, [800, 500]), 'result', castPc, 'object');
    key.link(castPc, 'as', key.node('var.getExternal', { owner: pcId, variable: hud }, {}, [1200, 500]), 'target');
    const readHud = Object.values(key.graph.nodes).find((n) => n.def === 'var.getExternal' && n.config.variable === hud)!.id;
    key.link(readHud, 'value', tell, 'target').link(castPc, 'then', tell, 'exec').link(tell, 'then', kd, 'exec');
    d.link(br, 'false', once, 'exec').link(once, 'completed', say, 'exec');
  },
};
