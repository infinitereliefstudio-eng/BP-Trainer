/**
 * V6, Confirmé: two lessons on a deck of cards (E36).
 * "Les cartes tirées sans remise": draw at random without ever drawing the
 * same card twice; the trap is a pure Random node read by two nodes.
 * "La même donne": the same seed must give the same game again, which
 * needs a Random Stream kept in a variable.
 */
import { removeNodes } from '../../operations/graphOps';
import { T } from '../../types/pins';
import type { RandomStreamValue } from '../../types/values';
import { edit, ProjectBuilder, type ClassBuilder } from '../builder';
import { countPrints, noRuntimeErrors, notion, printedNumbers, usesNode } from '../checks';
import type { CheckContext, Lesson, ScenarioStep } from '../types';
import { editable, getVar, nodeOf, say, setVar, tap, varOf } from './kit';

const DECK = Array.from({ length: 12 }, (_, i) => i + 1);
const EMPTY = 'Paquet vide';
const NEW_GAME = 'Nouvelle partie';
const draws = (n: number): ScenarioStep[] => Array.from({ length: n }, () => tap('E')).flat();

function deckBlueprint(name: string) {
  const pb = new ProjectBuilder(name);
  const b = pb.blueprint('BP_Paquet');
  b.component('StaticMesh', 'Paquet', { sizeX: 70, sizeY: 100, color: '#1e40af', blocks: false });
  b.component('PointLight', 'Voyant', { visible: true, radius: 220, intensity: 3000, color: '#e0e7ff' });
  b.cls.autoReceiveInput = true;
  b.variable('Cartes', T.array(T.int), DECK);
  b.variable('Index', T.int, 0);
  pb.place(b, 0, 0);
  pb.playerStart(-300, 0);
  return { pb, b };
}

/** E: an empty deck says so; otherwise pick an index once, show that card, remove it. */
function drawGraph(b: ClassBuilder, key: string): { pick: string; remove: string } {
  const empty = b.node('array.isEmpty', {}, {}, [200, 320]);
  const br = b.node('flow.branch', {}, {}, [360, 96]);
  const none = say(b, [660, -40], EMPTY);
  const rnd = b.node('math.randomIntInRange', {}, { min: 0 }, [520, 400]);
  const last = b.node('array.lastIndex', {}, {}, [340, 440]);
  const pick = setVar(b, 'Index', [700, 200]);
  const card = b.node('array.get', {}, {}, [900, 420]);
  const show = say(b, [1040, 200]);
  const remove = b.node('array.removeIndex', {}, {}, [1360, 200]);
  b.link(key, 'pressed', br, 'exec').link(getVar(b, 'Cartes', [40, 330]), 'value', empty, 'array').link(empty, 'result', br, 'condition').link(br, 'true', none, 'exec');
  b.link(getVar(b, 'Cartes', [180, 450]), 'value', last, 'array').link(last, 'result', rnd, 'max').link(br, 'false', pick, 'exec').link(rnd, 'result', pick, 'value');
  b.link(getVar(b, 'Cartes', [740, 430]), 'value', card, 'array').link(pick, 'out', card, 'index').link(pick, 'then', show, 'exec').link(card, 'item', show, 'text');
  b.link(show, 'then', remove, 'exec').link(getVar(b, 'Cartes', [1200, 400]), 'value', remove, 'array').link(getVar(b, 'Index', [1200, 470]), 'value', remove, 'index');
  return { pick, remove };
}

function cardsProject() {
  const { pb, b } = deckBlueprint('Les cartes tirées sans remise');
  b.node('event.inputKey', { key: 'E' }, {}, [64, 96]);
  return pb.project;
}

const numbers = (cx: CheckContext) => printedNumbers(cx).map(Number);
const isDeck = (list: number[]) => list.length === DECK.length && [...list].sort((a, b) => a - b).join() === DECK.join();

function fullRound(list: number[]): true | string {
  if (isDeck(list)) return true;
  if (!list.length) return 'Aucune carte affichée : sur E, affiche la carte tirée avec Print String.';
  const twice = list.find((v, i) => list.indexOf(v) !== i);
  if (twice !== undefined) {
    return `La carte ${twice} est sortie deux fois (tirages : ${list.join(', ')}). La carte affichée n’est pas celle qui a été retirée : Random Integer in Range est un nœud pur, recalculé pour chaque nœud qui le lit. Range son résultat dans Index, puis sers-toi d’Index pour afficher et pour retirer.`;
  }
  if (list.some((v) => !DECK.includes(v))) return `Une valeur affichée n’est pas une carte du paquet (tirages : ${list.join(', ')}). L’index va de 0 à Last Index, pas jusqu’à Length.`;
  return `${list.length} cartes tirées en 12 appuis (${list.join(', ')}) : chaque appui doit tirer une carte tant que le paquet n’est pas vide.`;
}

export const lessonCards: Lesson = {
  id: 'l-cartes',
  module: 'Données',
  level: 'confirme',
  number: 0,
  title: 'Les cartes tirées sans remise',
  situation:
    'Un paquet de 12 cartes numérotées de 1 à 12. Chaque appui sur E tire une carte au hasard, l’affiche et la retire du paquet : aucune ne peut sortir deux fois. Au 13e appui, le paquet répond « Paquet vide ».',
  notions: ['Tableau (Array)', 'Random Integer in Range', 'Nœud pur', 'Last Index', 'Get (a copy)', 'Remove Index', 'Is Empty'],
  remember:
    'Tirer sans remise, c’est tirer un index au hasard, lire l’élément, puis le retirer du tableau. Le hasard se tire une seule fois : un nœud Random relié à deux nœuds donne deux nombres différents, donc range-le dans une variable avant de t’en servir.',
  cards: [
    {
      title: 'L’idée',
      body:
        'Le paquet est un tableau, `Cartes`, qui contient 1, 2, 3… 12. Tirer une carte « sans remise » veut dire qu’elle **quitte** le paquet : le tirage suivant se fait parmi celles qui restent.\n\n' +
        'On ne tire donc pas « un nombre entre 1 et 12 » (on retomberait sur les mêmes). On tire **une position** dans le tableau, on lit la carte qui s’y trouve, et on retire cette position. Le tableau raccourcit d’un élément à chaque tirage, jusqu’à être vide.\n\n' +
        'La variable `Index` (Integer) est déjà créée pour retenir la position tirée.',
    },
    {
      title: 'Les nœuds du tableau',
      body:
        'Tous prennent `Cartes` en entrée (Get Cartes).\n\n' +
        '- **Is Empty** : vrai quand le tableau ne contient plus rien. À tester en premier, avec un **Branch**.\n' +
        '- **Last Index** : la position du dernier élément. Les positions commencent à **0** : avec 12 cartes, elles vont de 0 à 11, et Last Index vaut 11 (Length, lui, vaut 12).\n' +
        '- **Get (a copy)** : l’élément à la position Index.\n' +
        '- **Remove Index** (fil blanc, pin en losange) : retire l’élément à cette position ; les suivants reculent d’un cran.\n\n' +
        '**Random Integer in Range** donne un entier entre Min et Max **compris** : de 0 à Last Index, toutes les positions, et seulement elles.',
    },
    {
      title: 'Le piège du nœud vert',
      body:
        'Random Integer in Range est un **nœud pur** (vert, sans fil blanc). Un nœud pur n’a pas de mémoire : il est **recalculé pour chaque nœud qui le lit**.\n\n' +
        'Si tu relies sa sortie à la fois à Get (a copy) et à Remove Index, il tire **deux** nombres : tu affiches la carte de la position 4 et tu retires celle de la position 9. La carte affichée reste dans le paquet et ressortira.\n\n' +
        'La parade : un **Set Index** sur le fil blanc, qui lit le Random **une fois**. Ensuite, Get (a copy) et Remove Index lisent tous deux la variable `Index`, qui ne bouge plus.\n\n' +
        'L’exercice « Un nœud pur lu deux fois » montrait ce comportement ; ici il coûte un bug.',
    },
    {
      title: 'L’ordre des opérations',
      body:
        'Sur **IA_Tirer** (Started, la touche E) :\n\n' +
        '1. **Branch** sur Is Empty. True : Print String « Paquet vide », et c’est tout.\n' +
        '2. False : **Set Index** = Random Integer in Range (Min 0, Max = Last Index).\n' +
        '3. **Print String** de la carte : Get (a copy) à la position `Index`.\n' +
        '4. **Remove Index** à la position `Index`.\n\n' +
        'Afficher **avant** de retirer : après Remove Index, la position `Index` contient déjà la carte suivante.',
    },
  ],
  objectives: [
    'Sur IA_Tirer, si le paquet est vide : affiche « Paquet vide ».',
    'Sinon : tire une position au hasard (de 0 à Last Index) et range-la dans Index.',
    'Affiche la carte à cette position, puis retire-la du paquet.',
    'Touche Vérifier : 13 appuis sur E.',
  ],
  hints: [
    'Le Random ne doit être lu qu’une fois par tirage : par le Set Index, et par lui seul.',
    'Nœuds : Get Cartes, Is Empty, Branch, Print String, Last Index, Random Integer in Range, Set Index, Get (a copy), Print String, Remove Index, Get Index.',
    'Solution : IA_Tirer → Branch (Is Empty (Cartes)) → True : Print « Paquet vide ». False : Set Index = Random Integer in Range (0, Last Index (Cartes)) → Print String (Get (a copy) (Cartes, Index)) → Remove Index (Cartes, Index).',
  ],
  challenge: 'Ajoute une action IA_Remettre sur F dans IMC_Joueur : elle remet les 12 cartes dans le paquet. Il te faut un second tableau, Depart, et un Set Cartes.',
  setup: cardsProject,
  scenario: [{ wait: 0.2 }, ...draws(12), { checkpoint: 'douze' }, ...tap('E')],
  checks: [
    { id: 'round', label: '12 appuis : les 12 cartes sortent, chacune une fois', at: 'douze', test: (cx) => fullRound(numbers(cx)) },
    {
      id: 'emptied',
      label: 'Après 12 tirages, le paquet est vide',
      at: 'douze',
      test: (cx) => {
        const left = (varOf(cx, 'BP_Paquet', 'Cartes') as unknown[] | undefined)?.length ?? 0;
        return left === 0 ? true : `Il reste ${left} carte(s) dans Cartes : chaque carte tirée doit être retirée avec Remove Index.`;
      },
    },
    {
      id: 'thirteenth',
      label: '13e appui : « Paquet vide », et aucune carte',
      test: (cx) => {
        if (countPrints(cx, EMPTY) !== 1) return `« Paquet vide » s’est affiché ${countPrints(cx, EMPTY)} fois : teste Is Empty avant de tirer.`;
        return numbers(cx).length === 12 ? true : 'Une 13e carte est sortie d’un paquet vide.';
      },
    },
    notion(usesNode('remove', 'BP_Paquet', ['array.removeIndex'], 'La carte tirée quitte le paquet', 'Retire la carte tirée avec Remove Index.')),
    noRuntimeErrors(),
  ],
  solve(p) {
    const b = edit(p, 'BP_Paquet');
    drawGraph(b, nodeOf(b.graph, 'event.inputKey'));
  },
};

// ------------------------------------------------------------ La même donne

function seedProject() {
  const { pb, b } = deckBlueprint('La même donne');
  b.variable('Depart', T.array(T.int), DECK);
  editable(b, 'Graine', T.int, 42);
  const { remove } = drawGraph(b, b.node('event.inputKey', { key: 'E' }, {}, [64, 96]));
  // A cosmetic flicker that also draws from the global random.
  const glow = b.node('component.setIntensity', {}, {}, [1680, 200]);
  const flick = b.node('math.randomFloatInRange', {}, { min: 2000, max: 5000 }, [1500, 420]);
  b.link(remove, 'then', glow, 'exec').link(flick, 'result', glow, 'intensity').target('Voyant', glow);
  const space = b.node('event.inputKey', { key: 'SpaceBar' }, {}, [64, 760]);
  const fill = setVar(b, 'Cartes', [360, 760]);
  b.link(space, 'pressed', fill, 'exec').link(getVar(b, 'Depart', [180, 940]), 'value', fill, 'value').link(fill, 'then', say(b, [680, 760], NEW_GAME), 'exec');
  return pb.project;
}

function streamOf(cx: CheckContext): RandomStreamValue | undefined | null {
  const a = cx.sim.actors.find((x) => x.className === 'BP_Paquet');
  const cls = a ? cx.sim.classOf(a) : undefined;
  const v = cls?.variables.find((x) => x.type.category === 'struct' && x.type.subtype === 'RandomStream' && !x.type.container);
  if (!a || !v) return undefined;
  return (a.vars[v.id] as unknown as RandomStreamValue | null) ?? null;
}

export const lessonSeed: Lesson = {
  id: 'l-meme-donne',
  module: 'Données',
  level: 'confirme',
  number: 0,
  title: 'La même donne',
  situation:
    'Le paquet de la leçon précédente, avec une touche Espace : « Nouvelle partie », qui remet les 12 cartes. Pour rejouer une partie à l’identique (une énigme, un replay, un test), la même Graine doit redonner les cartes dans le même ordre. Aujourd’hui, chaque partie est différente.',
  notions: ['Random Stream', 'Graine (Seed)', 'Set Random Stream Seed', 'Random Integer in Range from Stream', 'Hasard reproductible', 'Instance Editable'],
  remember:
    'Le hasard « ordinaire » (Random Integer in Range) est partagé par tout le jeu et ne se rembobine pas. Un Random Stream est une suite de nombres qui ne dépend que de sa graine : même graine, mêmes tirages. Garde-le dans une variable, redonne-lui sa graine au début de la partie, et ne fais tirer dedans que ce qui doit être reproductible.',
  cards: [
    {
      title: 'Pourquoi le hasard change',
      body:
        '**Random Integer in Range** puise dans le générateur global du jeu. Tout le monde y puise : ton paquet, mais aussi le clignotement du voyant (regarde la fin du graphe : un **Random Float in Range** règle son intensité à chaque tirage), et dans un vrai jeu les particules, les sons, l’IA…\n\n' +
        'Deux conséquences : on ne peut pas le « remettre au début », et le moindre tirage ajouté ailleurs décale tous les suivants.\n\n' +
        'Lance Play : E douze fois, Espace, E douze fois. Les deux suites sont différentes.',
    },
    {
      title: 'Le Random Stream',
      body:
        'Un **Random Stream** est un petit générateur à toi : une suite de nombres entièrement déterminée par un entier de départ, la **graine** (seed). Graine 42 : toujours la même suite. Graine 43 : une autre, toujours la même aussi.\n\n' +
        'Crée une variable `Hasard`, de type **Random Stream** (dans le sélecteur de type, sous Structures).\n\n' +
        '- **Set Random Stream Seed** (fil blanc) : donne une graine au stream et le remet au début de sa suite. Sa pin Stream est en losange : relie-y **Get Hasard**.\n' +
        '- **Random Integer in Range from Stream** : comme Random Integer in Range, avec une pin **Stream** en plus. Chaque lecture fait **avancer** le stream d’un cran.',
    },
    {
      title: 'Le brancher',
      body:
        'Deux changements :\n\n' +
        '1. Sur **IA_NouvellePartie** (Espace), après avoir remis les cartes : **Set Random Stream Seed** sur `Hasard`, avec la variable `Graine` (42, réglable sur l’instance). Chaque nouvelle partie repart ainsi du début de la même suite.\n' +
        '2. Dans le tirage, remplace **Random Integer in Range** par **Random Integer in Range from Stream**, avec Min 0, Max = Last Index, et Stream = **Get Hasard**.\n\n' +
        'Ne touche pas au Random Float du voyant : c’est de la décoration, elle peut rester sur le hasard global. Mieux, elle **doit** y rester : si elle tirait dans `Hasard`, activer ou couper l’effet changerait l’ordre des cartes.',
    },
    {
      title: 'Les deux pièges',
      body:
        '**Refabriquer le stream à chaque tirage.** Relier **Make Random Stream** directement à la pin Stream semble plus court. Mais c’est un nœud pur : il refabrique un stream tout neuf à chaque lecture, qui donne donc toujours son **premier** nombre. Le stream doit vivre dans une **variable**, pour que son avancée soit gardée d’un tirage à l’autre.\n\n' +
        '**Le lire deux fois.** Random Integer in Range from Stream reste un nœud pur : relié à deux nœuds, il tire deux fois et avance de deux crans. Le Set Index de la leçon précédente protège toujours de cela.\n\n' +
        'Dans UE, la graine d’un stream se règle aussi dans Details de la variable (Initial Seed), et **Reset Random Stream** le ramène à cette graine.',
    },
  ],
  objectives: [
    'Crée une variable Hasard de type Random Stream.',
    'Sur IA_NouvellePartie (Espace) : Set Random Stream Seed (Hasard, Graine), après la remise des cartes.',
    'Le tirage utilise Random Integer in Range from Stream, avec Get Hasard.',
    'Touche Vérifier : deux parties de 12 tirages, qui doivent donner le même ordre.',
  ],
  hints: [
    'Le stream doit être une variable, remise à sa graine au début de chaque partie, et le tirage doit puiser dedans.',
    'Nœuds : une variable Random Stream, Set Random Stream Seed, Get Graine, Random Integer in Range from Stream, Get Hasard.',
    'Solution : IA_NouvellePartie → Set Cartes → Print → Set Random Stream Seed (Stream = Hasard, New Seed = Graine). Tirage : Set Index = Random Integer in Range from Stream (0, Last Index (Cartes), Hasard).',
  ],
  challenge: 'Change Graine sur l’instance (Details, dans le niveau) : l’ordre change, mais reste le même d’une partie à l’autre. Puis fais afficher la graine au début de chaque partie.',
  setup: seedProject,
  scenario: [{ wait: 0.2 }, ...tap('SpaceBar'), ...draws(12), { checkpoint: 'une' }, ...tap('SpaceBar'), ...draws(12)],
  checks: [
    { id: 'round', label: 'Première partie : les 12 cartes, chacune une fois', at: 'une', test: (cx) => fullRound(numbers(cx)) },
    {
      id: 'same',
      label: 'La seconde partie donne les cartes dans le même ordre',
      test: (cx) => {
        const all = numbers(cx);
        const a = all.slice(0, 12);
        const b = all.slice(12);
        const second = fullRound(b);
        if (second !== true) return `Seconde partie : ${second}`;
        if (a.join() === b.join()) return true;
        return `Première partie : ${a.join(', ')}. Seconde : ${b.join(', ')}. Le tirage puise encore dans le hasard global, qu’on ne peut pas remettre au début : tire dans un Random Stream, et redonne-lui sa graine sur Espace.`;
      },
    },
    {
      id: 'stream',
      label: 'Le tirage fait avancer un Random Stream gardé dans une variable',
      test: (cx) => {
        const s = streamOf(cx);
        if (s === undefined) return 'BP_Paquet n’a pas de variable de type Random Stream : crée Hasard.';
        if (!s || s.seed >>> 0 === s.initial >>> 0) {
          return 'La variable Random Stream n’a pas avancé : aucun tirage ne s’est fait dedans. Si le tirage est relié à Make Random Stream, il refabrique le stream à chaque fois et redonne toujours le premier nombre ; relie Get Hasard à la pin Stream.';
        }
        return true;
      },
    },
    notion(usesNode('from', 'BP_Paquet', ['random.intInRangeFromStream'], 'Le tirage utilise Random Integer in Range from Stream', 'Remplace Random Integer in Range par Random Integer in Range from Stream.')),
    noRuntimeErrors(),
  ],
  solve(p) {
    const b = edit(p, 'BP_Paquet');
    const g = b.graph;
    const stream = b.variable('Hasard', T.struct('RandomStream'));
    const old = nodeOf(g, 'math.randomIntInRange');
    const last = nodeOf(g, 'array.lastIndex');
    const pick = Object.values(g.links).find((l) => l.from.node === old)!.to.node;
    removeNodes(g, [old]);
    const rnd = b.node('random.intInRangeFromStream', {}, { min: 0 }, [520, 400]);
    b.link(last, 'result', rnd, 'max').link(b.node('var.get', { variable: stream }, {}, [340, 540]), 'value', rnd, 'stream').link(rnd, 'result', pick, 'value');
    const told = Object.values(g.nodes).find((n) => n.def === 'debug.printString' && n.defaults.text === NEW_GAME)!.id;
    const seed = b.node('random.setSeed', {}, {}, [1000, 760]);
    b.link(told, 'then', seed, 'exec').link(b.node('var.get', { variable: stream }, {}, [840, 940]), 'value', seed, 'stream').link(getVar(b, 'Graine', [840, 1010]), 'value', seed, 'seed');
  },
};
