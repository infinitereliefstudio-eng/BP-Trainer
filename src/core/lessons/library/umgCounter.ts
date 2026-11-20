/**
 * V7.36, UMG discovery (docs/PLAN_UMG.md):
 *
 * - « Le compteur à l'écran », end of Intermédiaire, right after « Les
 *   contrôles au Player Controller »: the first Widget Blueprint. Designer
 *   (Canvas Panel, a Text ticked Is Variable), Create Widget owned by the
 *   Player Controller, its Return Value kept in a variable, Add to Viewport,
 *   then SetText from the widget's own Graph, called by the controller.
 * - P16 « Combien de Construct ? », Confirmé: Event Construct comes back at
 *   each Add to Viewport, Event On Initialized only once at Create Widget.
 */
import type { Project } from '../../model/project';
import { T } from '../../types/pins';
import { ProjectBuilder } from '../builder';
import { noRuntimeErrors, notion } from '../checks';
import type { CheckContext, Lesson } from '../types';
import { ensurePlayerInput, PLAYER_CONTROLLER } from '../ue5Input';
import { lessonInputController } from './enhancedInput';
import { PREDICT_METHOD, say, tap } from './kit';
import { predictLesson } from './predicts';
import { playerBlueprint } from './props';
import { actionId, addW, anyShown, controller, getW, made, newClass, plural, screenTexts, widgetClasses } from './umgKit';

export const UMG_MODULE = 'Interfaces (UMG)';

// ------------------------------------------------- Le compteur à l'écran

/** Does a text drawn on the screen show this whole number (« Appuis : 3 », « 3 »)? */
const shows = (cx: CheckContext, n: number) => screenTexts(cx).some((t) => new RegExp(`(^|\\D)${n}(\\D|$)`).test(t));

/** Why nothing is on the screen, from what the project and the game did. */
function whyNotShown(cx: CheckContext): string | undefined {
  if (anyShown(cx).length) return undefined;
  const wbps = widgetClasses(cx);
  if (!wbps.length) return 'Le projet n’a pas de Widget Blueprint : Content Drawer › + Add › User Interface › Widget Blueprint.';
  const created = wbps.flatMap((c) => made(cx, c.name));
  if (!created.length) return `${wbps[0].name} existe, mais aucun widget n’a été créé : il faut Create Widget, au BeginPlay de ${PLAYER_CONTROLLER}.`;
  return `Un ${created[0].className} a été créé, mais il n’est pas à l’écran : Create Widget ne l’affiche pas, il faut Add to Viewport.`;
}

function counted(id: string, n: number, label: string, at: string) {
  return {
    id,
    label,
    at,
    test: (cx: CheckContext) => {
      const none = whyNotShown(cx);
      if (none) return none;
      if (shows(cx, n)) return true;
      const texts = screenTexts(cx);
      if (!texts.length) return 'Le widget est à l’écran, mais il ne dessine aucun texte : pose un Text dans son Canvas Panel.';
      return `L’écran affiche ${texts.map((t) => `« ${t} »`).join(', ')} : on attend ${n}.${n > 0 ? ' Après chaque appui sur E, SetText doit écrire le nouveau nombre.' : ''}`;
    },
  };
}

/** WBP_Compteur as the lesson asks for it: its Designer and its Graph (Custom Event Compter). */
function buildCounter(p: Project) {
  const b = newClass(p, 'WBP_Compteur', 'UserWidget');
  const canvas = addW(p, b.cls, 'CanvasPanel', undefined);
  addW(p, b.cls, 'TextBlock', canvas.id, { name: 'Txt_Compteur', isVariable: true, props: { text: 'Appuis : 0', fontSize: 28 }, slot: { offsets: [48, 40, 320, 48] } });
  const count = b.variable('Appuis', T.int, 0);
  const ev = b.node('event.custom', { name: 'Compter' }, {}, [64, 96]);
  const inc = b.node('var.incrementInt', {}, {}, [340, 96]);
  const toText = b.node('conv.intToText', {}, {}, [560, 340]);
  const fmt = b.node('text.format', {}, { format: 'Appuis : {N}' }, [760, 340]);
  const set = b.node('widget.setText', {}, {}, [900, 96]);
  b.link(ev, 'then', inc, 'exec').link(b.node('var.get', { variable: count }, {}, [200, 300]), 'value', inc, 'value');
  b.link(inc, 'result', toText, 'in').link(toText, 'result', fmt, 'arg:N').link(fmt, 'result', set, 'text');
  b.link(inc, 'then', set, 'exec').link(getW(b, 'Txt_Compteur', [700, 220]), 'value', set, 'target');
  return b;
}

export const lessonScreenCounter: Lesson = {
  id: 'l-compteur-ecran',
  module: UMG_MODULE,
  level: 'intermediaire',
  number: 0,
  title: 'Le compteur à l’écran',
  situation:
    'Jusqu’ici, tout ce que le jeu avait à dire passait par Print String, dans l’Output Log. Un vrai jeu l’affiche à l’écran, par-dessus le niveau : c’est le rôle d’un Widget Blueprint. Affiche le nombre d’appuis sur E, mis à jour à chaque appui.',
  chain: { notion: 'umg', step: 'discover' },
  recalls: ['variables'],
  notions: ['Widget Blueprint', 'Designer', 'Is Variable', 'Create Widget', 'Add to Viewport', 'SetText (Text)'],
  remember:
    'Un widget s’affiche en deux temps : Create Widget crée l’objet, Add to Viewport le dessine. On garde la Return Value dans une variable pour le retrouver ensuite. Seul un widget coché Is Variable devient une variable du Graph, sur laquelle on peut appeler SetText.',
  cards: [
    {
      title: 'Ce qui est en place',
      body:
        'Le projet de la leçon précédente : **BP_PlayerController** ajoute **IMC_Joueur** au BeginPlay, et **BP_Lampe** bascule sur **IA_Interagir** (E).\n\n' +
        'Le test attend un compteur affiché dès le lancement, qui vaut **0**, puis **1** après un appui sur E, puis **3** après deux autres.',
    },
    {
      title: 'Ce qui est nouveau : le Widget Blueprint',
      body:
        'Une interface UE5 (UMG) est un **Widget Blueprint**, parent **User Widget**. Ce n’est pas un acteur : il n’est pas dans le niveau, il est dessiné par-dessus la vue.\n\n' +
        'Il s’ouvre sur l’onglet **Designer** : la **Palette** (les widgets à poser), la **Hierarchy** (l’arbre), les **Details** du widget choisi et l’aperçu de l’écran. L’onglet **Event Graph** est un graphe comme les autres, sans BeginPlay : un widget a ses propres événements (Event Construct…).\n\n' +
        'Depuis UE5, un Widget Blueprint neuf est vide : pose d’abord un **Canvas Panel**, qui place ses enfants librement sur l’écran.',
    },
    {
      title: 'Dessiner le compteur',
      body:
        '1. **Content Drawer** › **+ Add** › **User Interface** › **Widget Blueprint**, nomme-le `WBP_Compteur`.\n' +
        '2. Dans le Designer : Palette › **Canvas Panel**, puis un **Text** dedans. Nomme-le `Txt_Compteur` et écris `Appuis : 0` dans son Text (Details › Content).\n' +
        '3. Coche **Is Variable** en haut de ses Details : sans elle, le Text n’existe pas dans le Graph.',
    },
    {
      title: 'Afficher et mettre à jour',
      body:
        '- Dans le Graph de WBP_Compteur : une variable **Appuis** (Integer) et un **Custom Event** `Compter` : **Increment Int** (Appuis), puis **SetText (Text)** sur **Get Txt_Compteur**. Pour le texte : **To Text (Integer)**, ou **Format Text** avec `Appuis : {N}`.\n' +
        '- Dans **BP_PlayerController**, après Add Mapping Context : **Create Widget** (Class WBP_Compteur, **Owning Player** = Self), garde sa Return Value dans une variable `Compteur` (appui long sur la pin › Promote to Variable), puis **Add to Viewport** sur cette variable.\n' +
        '- Toujours dans BP_PlayerController : **IA_Interagir** (Started) → Get Compteur → **Compter**. La lampe entend aussi E : une Input Action n’a pas de Consume Input.',
    },
  ],
  objectives: [
    'Crée WBP_Compteur : un Canvas Panel et un Text Is Variable.',
    'BP_PlayerController le crée et l’affiche au lancement.',
    'Chaque appui sur E met le nombre à jour à l’écran.',
  ],
  hints: [
    'Deux Blueprints travaillent : le Player Controller crée et garde le widget ; le widget sait se mettre à jour. Et un Text n’est utilisable dans le Graph que coché Is Variable.',
    'Widget Blueprint (Canvas Panel, Text Is Variable), Create Widget, Promote to Variable, Add to Viewport, Custom Event, Increment Int, To Text (Integer), SetText (Text), IA_Interagir (Started).',
    'Solution : WBP_Compteur avec un Canvas Panel et Txt_Compteur (Is Variable, « Appuis : 0 »). Son Graph : variable Appuis, Custom Event Compter → Increment Int (Appuis) → SetText (Target Txt_Compteur, In Text = Format Text « Appuis : {N} », N = To Text (Integer)). BP_PlayerController : après Add Mapping Context → Create WBP_Compteur Widget (Owning Player = Self) → Set Compteur → Add to Viewport (Compteur). IA_Interagir (Started) → Compter (Target Compteur).',
  ],
  challenge: 'Fais compter au widget les allumages de la lampe plutôt que les appuis. Qui doit prévenir qui, et comment BP_Lampe peut-elle trouver le compteur ?',
  setup() {
    const p = lessonInputController.setup();
    lessonInputController.solve(p);
    p.name = 'Le compteur à l’écran';
    return p;
  },
  scenario: [{ wait: 0.3 }, { checkpoint: 'debut' }, ...tap('E'), { wait: 0.1 }, { checkpoint: 'un' }, ...tap('E'), { wait: 0.1 }, ...tap('E'), { wait: 0.2 }, { checkpoint: 'trois' }],
  checks: [
    {
      id: 'shown',
      label: 'Un widget est à l’écran dès le lancement',
      at: 'debut',
      test: (cx) => whyNotShown(cx) ?? true,
    },
    counted('zero', 0, 'Au lancement, il affiche 0', 'debut'),
    counted('one', 1, 'Après un appui sur E, il affiche 1', 'un'),
    counted('three', 3, 'Après trois appuis, il affiche 3', 'trois'),
    {
      id: 'single',
      label: 'Un seul compteur à l’écran',
      test: (cx) => {
        const n = anyShown(cx).length;
        return n <= 1 ? true : `${plural(n, 'widget')} à l’écran : Create Widget ne doit s’exécuter qu’une fois, au BeginPlay. Chaque appel crée un nouveau widget.`;
      },
    },
    notion({
      id: 'in-pc',
      label: 'Le Player Controller crée le widget',
      test: (cx) =>
        cx.nodes(PLAYER_CONTROLLER).some((n) => n.def === 'widget.create')
          ? true
          : 'Create Widget n’est pas dans BP_PlayerController : l’interface appartient au joueur, c’est son Player Controller qui la crée.',
    }),
    noRuntimeErrors(),
  ],
  solve(p) {
    const wbp = buildCounter(p);
    const { b: pc, last } = controller(p);
    const counter = pc.variable('Compteur', T.object(wbp.cls.name));
    const create = pc.node('widget.create', {}, { class: wbp.cls.id }, [1100, 96]);
    const set = pc.node('var.set', { variable: counter }, {}, [1440, 96]);
    const show = pc.node('widget.addToViewport', {}, {}, [1760, 96]);
    pc.link(last, 'then', create, 'exec').link(pc.node('actor.self', {}, {}, [1000, 300]), 'self', create, 'owner');
    pc.link(create, 'then', set, 'exec').link(create, 'result', set, 'value');
    pc.link(set, 'then', show, 'exec').link(pc.node('var.get', { variable: counter }, {}, [1600, 300]), 'value', show, 'target');
    const ev = pc.node('input.action', { action: actionId(p, 'IA_Interagir') }, {}, [64, 520]);
    const call = pc.node('call.custom', { owner: wbp.cls.id, event: 'Compter' }, {}, [420, 520]);
    pc.link(ev, 'started', call, 'exec').link(pc.node('var.get', { variable: counter }, {}, [200, 700]), 'value', call, 'target');
  },
};

// ------------------------------------------------------------------- P16

const SAY = { init: 'On Initialized', construct: 'Construct', destruct: 'Destruct' };

export const predictConstruct: Lesson = predictLesson({
  id: 'p16-construct',
  code: 'P16',
  module: UMG_MODULE,
  level: 'confirme',
  title: 'Combien de Construct ?',
  situation:
    'Au lancement, le panneau d’accueil s’affiche, disparaît une demi-seconde plus tard, puis revient. Chaque événement de son Widget Blueprint affiche son nom. Que lit-on dans l’Output Log ?',
  notions: ['Event Construct', 'Event On Initialized', 'Event Destruct', 'Remove from Parent'],
  remember:
    'Event Construct n’est pas un BeginPlay : il revient à chaque Add to Viewport, et Event Destruct à chaque Remove from Parent. Ce qui ne doit arriver qu’une fois, à la création, va dans Event On Initialized. Retirer un widget ne le détruit pas : on peut le réafficher.',
  cards: [
    {
      title: 'À lire',
      body:
        '**WBP_Accueil** (un Canvas Panel et un Text « Bienvenue ») a trois événements, qui affichent chacun leur nom avec Print String :\n\n' +
        '- **Event On Initialized** → « On Initialized » ;\n- **Event Construct** → « Construct » ;\n- **Event Destruct** → « Destruct ».\n\n' +
        '**BP_PlayerController**, au BeginPlay : **Create Widget** (WBP_Accueil) → Set **Accueil** → **Add to Viewport** → Delay 0,5 s → **Remove from Parent** → Delay 0,5 s → **Add to Viewport**. Les trois derniers nœuds visent la même variable Accueil.',
    },
    {
      title: 'La question',
      body:
        'Trois idées circulent :\n\n' +
        '- Event Construct est le BeginPlay d’un widget : il ne passe qu’une fois ;\n' +
        '- Remove from Parent détruit le widget, le réafficher le recrée ;\n' +
        '- le widget existe toujours après Remove from Parent, il revient seulement à l’écran.\n\n' +
        'Qu’est-ce qui arrive à la création, et qu’est-ce qui arrive à chaque arrivée à l’écran ?',
    },
    PREDICT_METHOD,
  ],
  hints: [
    'Create Widget n’est appelé qu’une fois : il n’y a qu’un seul objet WBP_Accueil pendant toute la partie.',
    'On Initialized suit Create Widget ; Construct suit chaque Add to Viewport ; Destruct suit chaque Remove from Parent.',
    `Réponse : ${SAY.init}, ${SAY.construct}, ${SAY.destruct}, ${SAY.construct}.`,
  ],
  setup() {
    const pb = new ProjectBuilder('Prédis P16');
    playerBlueprint(pb);
    pb.playerStart(0, 0);
    const p = pb.project;
    const w = newClass(p, 'WBP_Accueil', 'UserWidget');
    const canvas = addW(p, w.cls, 'CanvasPanel', undefined);
    addW(p, w.cls, 'TextBlock', canvas.id, { name: 'Txt_Bienvenue', props: { text: 'Bienvenue dans la station', fontSize: 32 }, slot: { offsets: [380, 300, 560, 60] } });
    w.link(w.node('event.onInitialized', {}, {}, [64, 96]), 'then', say(w, [400, 96], SAY.init), 'exec');
    w.link(w.node('event.construct', {}, {}, [64, 300]), 'then', say(w, [400, 300], SAY.construct), 'exec');
    w.link(w.node('event.destruct', {}, {}, [64, 500]), 'then', say(w, [400, 500], SAY.destruct), 'exec');
    ensurePlayerInput(p, []);
    const { b: pc, last } = controller(p);
    const accueil = pc.variable('Accueil', T.object('WBP_Accueil'));
    const get = (x: number) => pc.node('var.get', { variable: accueil }, {}, [x, 320]);
    const create = pc.node('widget.create', {}, { class: w.cls.id }, [1000, 96]);
    const set = pc.node('var.set', { variable: accueil }, {}, [1320, 96]);
    const show = pc.node('widget.addToViewport', {}, {}, [1620, 96]);
    const wait1 = pc.node('time.delay', {}, { duration: 0.5 }, [1920, 96]);
    const hide = pc.node('widget.removeFromParent', {}, {}, [2200, 96]);
    const wait2 = pc.node('time.delay', {}, { duration: 0.5 }, [2480, 96]);
    const again = pc.node('widget.addToViewport', {}, {}, [2760, 96]);
    pc.link(last, 'then', create, 'exec').link(pc.node('actor.self', {}, {}, [900, 320]), 'self', create, 'owner');
    pc.link(create, 'then', set, 'exec').link(create, 'result', set, 'value').link(set, 'then', show, 'exec').link(get(1500), 'value', show, 'target');
    pc.link(show, 'then', wait1, 'exec').link(wait1, 'completed', hide, 'exec').link(get(2100), 'value', hide, 'target');
    pc.link(hide, 'then', wait2, 'exec').link(wait2, 'completed', again, 'exec').link(get(2660), 'value', again, 'target');
    return p;
  },
  scenario: [{ wait: 1.4 }],
  predict: {
    question: 'Que lit-on dans l’Output Log, dans l’ordre ?',
    options: [
      `${SAY.init}, ${SAY.construct}`,
      `${SAY.init}, ${SAY.construct}, ${SAY.destruct}, ${SAY.init}, ${SAY.construct}`,
      `${SAY.init}, ${SAY.construct}, ${SAY.destruct}, ${SAY.construct}`,
      `${SAY.init}, ${SAY.construct}, ${SAY.construct}`,
    ],
    answer: 2,
    explanation:
      'Il n’y a qu’un seul widget, créé une fois : On Initialized ne passe qu’une fois. Construct passe à chaque Add to Viewport, Destruct à chaque Remove from Parent. Le widget retiré existe toujours dans la variable Accueil : le réafficher relance Construct, pas On Initialized. Un compteur remis à 0 dans Event Construct le serait donc à chaque réaffichage.',
    verify: (p) => p.join('|') === [SAY.init, SAY.construct, SAY.destruct, SAY.construct].join('|'),
  },
});
