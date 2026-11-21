/**
 * V2, Confirmé: who changes what between Blueprints (Private, a function of
 * the owner), BeginPlay order between actors, and two debugging exercises
 * (a reference to a destroyed actor, a level that works one game out of two).
 */
import { disconnectPin, removeNodes } from '../../operations/graphOps';
import { addFunction, addFunctionParam } from '../../operations/functionOps';
import { T } from '../../types/pins';
import { edit, ProjectBuilder } from '../builder';
import { countPrints, noRuntimeErrors, notUsing, PRESS_E, printedNumbers, usesNode, visible } from '../checks';
import type { Lesson } from '../types';
import { DEBUG_METHOD } from './kit';
import { generatorBlueprint, lampBlueprint, referenceVariable } from './props';

// ------------------------------------------------------------ Qui modifie quoi

function batteryProject() {
  const pb = new ProjectBuilder('Qui modifie quoi');
  const batt = pb.blueprint('BP_Batterie');
  batt.component('StaticMesh', 'Corps', { sizeX: 60, sizeY: 90, color: '#475569' });
  batt.component('PointLight', 'Voyant', { visible: false, radius: 200, color: '#22c55e' });
  const charge = batt.variable('Charge', T.int, 0);
  batt.cls.variables[0].private = true;
  const borne = pb.blueprint('BP_Borne');
  borne.component('StaticMesh', 'Borne', { sizeX: 50, sizeY: 50, color: '#1e3a8a' });
  borne.cls.autoReceiveInput = true;
  const bId = pb.place(batt, 300, 0);
  const tId = pb.place(borne, 0, 0);
  const ref = referenceVariable(pb, borne, 'Batterie', batt, [[tId, bId]]);
  // The direct way: Borne sets the battery's Charge itself. Charge is Private, so it does not compile.
  const key = borne.node('event.inputKey', { key: 'E' }, {}, [64, 96]);
  const set = borne.node('var.setExternal', { owner: batt.cls.id, variable: charge }, {}, [700, 96]);
  const add = borne.node('math.addInt', {}, { b: 40 }, [520, 320]);
  const read = borne.node('var.getExternal', { owner: batt.cls.id, variable: charge }, {}, [300, 320]);
  borne.link(key, 'pressed', set, 'exec').link(borne.node('var.get', { variable: ref }, {}, [300, 200]), 'value', set, 'target');
  borne.link(borne.node('var.get', { variable: ref }, {}, [100, 320]), 'value', read, 'target').link(read, 'value', add, 'a').link(add, 'result', set, 'value');
  pb.playerStart(-300, 0);
  return pb.project;
}

export const lessonWhoChanges: Lesson = {
  id: 'l-qui-modifie',
  module: 'Communication',
  level: 'confirme',
  number: 0,
  title: 'Qui modifie quoi',
  situation:
    'La borne recharge la batterie de 40 à chaque appui sur E, jusqu’à 100 ; pleine, son voyant s’allume. La borne modifie Charge directement… mais Charge est Private : ça ne compile pas.',
  notions: ['Private', 'Fonction d’un autre Blueprint', 'Instance Editable', 'Event Dispatcher'],
  remember: 'Chaque Blueprint garde la main sur ses propres variables : les autres lui demandent par une fonction (« fais ceci ») ou l’écoutent par un Event Dispatcher (« préviens-moi »).',
  cards: [
    {
      title: 'Ce qui est en place',
      body:
        '- **BP_Batterie** : un corps, un **Voyant** vert éteint, et une variable **Charge** (Integer, 0) cochée **Private**.\n- **BP_Borne** : entend IA_Interagir (la touche E), et a une variable **Batterie** (référence, Instance Editable) déjà réglée sur la batterie du niveau.\n\n' +
        'Le graphe de la borne fait le travail elle-même : **IA_Interagir** → **Set Charge** (sur la Batterie) = Charge + 40. Mais Charge est Private : **ça ne compile pas**. Touche **Pourquoi ?** sous l’erreur.',
    },
    {
      title: 'Private, et pourquoi',
      body:
        'La case **Private** d’une variable interdit aux autres Blueprints de la lire ou de l’écrire. Seul son propriétaire y touche.\n\n' +
        'L’intérêt : la batterie a des **règles** (pas plus de 100, voyant allumé à plein). Si n’importe qui peut écrire Charge, chaque Blueprint qui recharge doit recopier ces règles, et le jour où l’un les oublie, la batterie affiche 140.\n\n' +
        '**Instance Editable** n’a rien à voir : c’est le droit de **régler** la valeur dans le niveau, acteur par acteur, avant le jeu.',
    },
    {
      title: 'Trois façons de communiquer',
      body:
        '1. **Set direct** : l’autre écrit la variable. Simple, mais les règles s’éparpillent.\n2. **Fonction** : le propriétaire offre une fonction (« recharge-toi de 40 »), l’autre l’appelle. La règle vit à **un seul** endroit.\n3. **Event Dispatcher** : le propriétaire **annonce** ce qui lui arrive, ceux que ça intéresse écoutent. Pour prévenir, pas pour demander.\n\n' +
        'Ici, la borne **demande** quelque chose : c’est une fonction.',
    },
    {
      title: 'La fonction Recharger',
      body:
        'Dans BP_Batterie, My Blueprint › Functions › **+**, nomme-la `Recharger`. Dans Details, ajoute une entrée **Quantite** (Integer). Le graphe de la fonction s’ouvre, avec son nœud d’entrée qui donne Quantite.\n\n' +
        'Dedans :\n\n' +
        '1. **Set Charge** = **Min** (Charge + Quantite, 100). **Min (Integer)** rend le plus petit des deux : il plafonne à 100.\n2. → **Branch** (Charge >= 100) → True : **Set Visibility** (Voyant, coché).\n\n' +
        'Une fonction s’exécute **en entier, tout de suite**, puis rend la main à celui qui l’a appelée.',
    },
    {
      title: 'Côté borne',
      body:
        'Supprime le Set Charge et ses nœuds de calcul. Puis :\n\n' +
        '**IA_Interagir** (Started) → **Recharger** (Target = Get Batterie, Quantite = 40).\n\n' +
        'Pour trouver le nœud : tire un fil depuis Get Batterie et cherche « Recharger ». La pin **Target** dit sur **quelle** batterie appeler la fonction ; une fonction appelée de l’extérieur en a toujours une.\n\n' +
        'La borne ne sait plus rien du plafond ni du voyant : elle demande, la batterie décide.',
    },
  ],
  objectives: [
    'Dans BP_Batterie : une fonction Recharger (entrée Quantite, Integer) qui ajoute Quantite à Charge sans dépasser 100.',
    'Dans Recharger : si Charge atteint 100, le Voyant s’allume.',
    'Dans BP_Borne : sur IA_Interagir, appelle Recharger (40) sur la Batterie, à la place du Set direct.',
    'Charge reste Private. Touche Vérifier : 3 appuis sur E.',
  ],
  hints: [
    'Toute la règle (ajouter, plafonner, allumer) va dans la fonction de la batterie. La borne ne fait que demander. Pour trouver qui écrit Charge : appui long sur Set Charge › Find References, puis All Blueprints.',
    'Dans Recharger : Get Charge + Quantite → Min (Integer) avec 100 → Set Charge → Branch (Charge >= 100) → Set Visibility (Voyant). Dans BP_Borne : supprime le Set, puis IA_Interagir → Recharger (Target = Batterie, Quantite = 40).',
    'Solution : Recharger : Set Charge = Min(Charge + Quantite, 100) → Branch(Charge >= 100) → True : Set Visibility (Voyant, coché). BP_Borne : IA_Interagir Started → Recharger (Target = Batterie, Quantite 40).',
  ],
  challenge: 'Ajoute à la batterie un Event Dispatcher OnPleine, appelé à 100, et fais réagir un autre Blueprint sans qu’il lise Charge.',
  setup: batteryProject,
  scenario: [{ wait: 0.2 }, ...PRESS_E, { checkpoint: 'un' }, ...PRESS_E, { checkpoint: 'deux' }, ...PRESS_E, { checkpoint: 'trois' }],
  checks: [
    {
      id: 'private',
      label: 'Charge reste Private',
      test: (cx) =>
        cx.project.classes.find((c) => c.name === 'BP_Batterie')?.variables.find((v) => v.name === 'Charge')?.private
          ? true
          : 'Charge n’est plus Private : laisse-la Private, c’est la batterie qui décide de sa charge.',
    },
    {
      id: 'fn',
      label: 'BP_Batterie a une fonction Recharger avec une entrée Integer',
      test: (cx) => {
        const g = cx.project.classes.find((c) => c.name === 'BP_Batterie')?.graphs.find((x) => x.kind === 'function' && x.name === 'Recharger');
        if (!g) return 'Crée dans BP_Batterie une fonction nommée Recharger.';
        return g.fn?.inputs.some((p) => p.type.category === 'int') ? true : 'Ajoute à Recharger une entrée Integer (Quantite).';
      },
    },
    {
      id: 'one',
      label: '1er appui : Charge vaut 40',
      at: 'un',
      test: (cx) => {
        const v = cx.variable('BP_Batterie', 'Charge');
        return v === 40 ? true : `Charge vaut ${v} après un appui au lieu de 40.`;
      },
    },
    visible('not-yet', 'BP_Batterie', 'Voyant', false, 'À 80, le voyant reste éteint', 'deux'),
    {
      id: 'cap',
      label: '3e appui : Charge plafonne à 100',
      at: 'trois',
      test: (cx) => {
        const v = Number(cx.variable('BP_Batterie', 'Charge'));
        if (v === 100) return true;
        return v > 100 ? `Charge vaut ${v} : c’est à la batterie de plafonner à 100, dans Recharger (Min ou Clamp).` : `Charge vaut ${v} après 3 appuis au lieu de 100.`;
      },
    },
    visible('full', 'BP_Batterie', 'Voyant', true, 'Pleine, le voyant s’allume', 'trois'),
    usesNode('call', 'BP_Borne', ['call.function'], 'La borne appelle Recharger', 'BP_Borne doit appeler la fonction Recharger de la batterie.'),
    notUsing('no-set', 'BP_Borne', ['var.setExternal'], 'La borne ne modifie plus Charge elle-même', 'Supprime le Set Charge de BP_Borne : c’est Recharger qui s’en charge.'),
    noRuntimeErrors(),
  ],
  solve(p) {
    const batt = edit(p, 'BP_Batterie');
    const borne = edit(p, 'BP_Borne');
    const charge = batt.cls.variables[0].id;
    const g = addFunction(batt.cls, 'Recharger');
    const q = addFunctionParam(p, batt.cls, g.id, 'inputs', T.int)!;
    q.name = 'Quantite';
    const f = batt.inGraph(g.id);
    const entry = Object.values(g.nodes).find((n) => n.def === 'fn.entry')!.id;
    const add = f.node('math.addInt', {}, {}, [300, 300]);
    const min = f.node('math.minInt', {}, { b: 100 }, [500, 300]);
    const set = f.node('var.set', { variable: charge }, {}, [400, 96]);
    const ge = f.node('math.greaterEqualInt', {}, { b: 100 }, [700, 300]);
    const br = f.node('flow.branch', {}, {}, [760, 96]);
    const on = f.node('component.setVisibility', {}, { visible: true }, [1060, 96]);
    f.link(f.node('var.get', { variable: charge }, {}, [100, 300]), 'value', add, 'a').link(entry, q.id, add, 'b').link(add, 'result', min, 'a');
    f.link(entry, 'then', set, 'exec').link(min, 'result', set, 'value').link(set, 'then', br, 'exec');
    f.link(set, 'out', ge, 'a').link(ge, 'result', br, 'condition').link(br, 'true', on, 'exec').target('Voyant', on);
    const ref = borne.cls.variables[0].id;
    const nodes = Object.values(borne.graph.nodes);
    const key = nodes.find((n) => n.def === 'event.inputKey')!.id;
    removeNodes(
      borne.graph,
      nodes.filter((n) => n.def !== 'event.inputKey').map((n) => n.id),
    );
    const call = borne.node('call.function', { graph: g.id, owner: batt.cls.id }, { [q.id]: 40 }, [400, 96]);
    borne.link(key, 'pressed', call, 'exec').link(borne.node('var.get', { variable: ref }, {}, [200, 300]), 'value', call, 'target');
  },
};

// ------------------------------------------------------- L'ordre des BeginPlay

/** Three lamps that switch on at BeginPlay, and a board that counts them at its own BeginPlay. */
function boardProject() {
  const pb = new ProjectBuilder('L’ordre des BeginPlay');
  const lamp = lampBlueprint(pb);
  const on = lamp.variable('bAllumee', T.bool, false);
  const begin = lamp.node('event.beginPlay', {}, {}, [64, 96]);
  const set = lamp.node('var.set', { variable: on }, { value: true }, [360, 96]);
  const show = lamp.node('component.setVisibility', {}, { visible: true }, [660, 96]);
  lamp.link(begin, 'then', set, 'exec').link(set, 'then', show, 'exec').target('Lumiere', show);
  for (const x of [-300, 0, 300]) pb.place(lamp, x, -250);
  const board = pb.blueprint('BP_Tableau');
  board.component('StaticMesh', 'Panneau', { sizeX: 160, sizeY: 40, color: '#1f2937' });
  board.component('TextRender', 'Ecran', { y: -50, text: '?' });
  const count = board.variable('Allumees', T.int, 0);
  const b0 = board.node('event.beginPlay', {}, {}, [64, 96]);
  const all = board.node('actor.getAllOfClass', {}, { class: lamp.cls.id }, [360, 96]);
  const loop = board.node('flow.forEachLoop', {}, {}, [680, 96]);
  const read = board.node('var.getExternal', { owner: lamp.cls.id, variable: on }, {}, [900, 380]);
  const br = board.node('flow.branch', {}, {}, [1000, 96]);
  const inc = board.node('var.incrementInt', {}, {}, [1300, 96]);
  const say = board.node('debug.printString', {}, {}, [1000, 560]);
  const text = board.node('component.setText', {}, {}, [1300, 560]);
  board.link(b0, 'then', all, 'exec').link(all, 'then', loop, 'exec').link(all, 'actors', loop, 'array');
  board.link(loop, 'body', br, 'exec').link(loop, 'element', read, 'target').link(read, 'value', br, 'condition');
  board.link(br, 'true', inc, 'exec').link(board.node('var.get', { variable: count }, {}, [1300, 300]), 'value', inc, 'value');
  board.link(loop, 'completed', say, 'exec').link(board.node('var.get', { variable: count }, {}, [800, 680]), 'value', say, 'text');
  board.link(say, 'then', text, 'exec').link(board.node('var.get', { variable: count }, {}, [1100, 760]), 'value', text, 'value').target('Ecran', text);
  // Placed after the lamps: in level order it counts 3, in the other order 0.
  pb.place(board, 0, 150);
  pb.playerStart(-400, 150);
  return pb.project;
}

export const lessonBeginPlayOrder: Lesson = {
  id: 'l-ordre-beginplay',
  module: 'Communication',
  level: 'confirme',
  number: 0,
  title: 'L’ordre des BeginPlay',
  situation:
    'Au démarrage, chaque lampe s’allume à son BeginPlay, et le tableau compte les lampes allumées à son BeginPlay. Parfois il affiche 3, parfois 0. Lance Play plusieurs fois pour le voir.',
  notions: ['BeginPlay', 'Ordre entre acteurs', 'Valeur par défaut', 'Delay 0'],
  remember: 'UE ne garantit pas l’ordre des BeginPlay entre acteurs : un Blueprint ne doit jamais compter sur le fait qu’un autre a déjà fait le sien.',
  cards: [
    {
      title: 'Ce qui est en place',
      body:
        '- Trois **BP_Lampe** : chacune, à son **BeginPlay**, met sa variable **bAllumee** à vrai et s’allume.\n- **BP_Tableau** : à son BeginPlay, **Get All Actors Of Class** (BP_Lampe) → **For Each Loop** → compte celles dont bAllumee est vrai → affiche le total (Print String et l’écran du tableau).\n\n' +
        'Lance Play plusieurs fois : parfois 3, parfois 0.',
    },
    {
      title: 'Qui commence ?',
      body:
        'Au lancement, chaque acteur du niveau fait son BeginPlay, **l’un après l’autre**. Dans UE, cet ordre **n’est pas garanti** : il peut changer d’une partie à l’autre, d’une machine à l’autre, ou dès qu’on déplace un acteur dans le niveau.\n\n' +
        'Ici, Play le tire au hasard et l’écrit en tête de l’Output Log. Menu ⋮ › **Ordre des BeginPlay** › fixe, pour le figer pendant que tu cherches.\n\n' +
        'Si le tableau passe **avant** les lampes, il les compte alors qu’aucune n’a encore mis bAllumee à vrai : 0.',
    },
    {
      title: 'Trois façons de s’en sortir',
      body:
        '1. **La valeur par défaut.** Ce qui est vrai dès le départ (la lampe est allumée au démarrage) va dans la **valeur par défaut** de la variable. Elle est posée avant tout BeginPlay.\n2. **Prévenir.** Celui qui change prévient : la lampe appelle une fonction du tableau, ou un Event Dispatcher. Plus personne ne lit au mauvais moment.\n3. **Attendre.** Celui qui lit attend que tout le monde ait démarré : un **Delay** de **0** seconde reporte la suite à l’image suivante, quand tous les BeginPlay sont passés.',
    },
    {
      title: 'Le plan le plus court',
      body:
        'Dans BP_Tableau : **Event BeginPlay** → **Delay** (Duration 0) → Get All Actors Of Class → … (le reste ne change pas).\n\n' +
        'La vérification joue la partie dans l’ordre du niveau, **puis** dans l’ordre inverse : la solution doit tenir dans les deux.\n\n' +
        'Le Delay 0 est un pansement pratique. Dans un vrai jeu, préfère la solution 1 ou 2 : un Delay 0 suppose que « une image plus tard » suffit, ce qui cesse d’être vrai dès que des acteurs apparaissent plus tard (Spawn).',
    },
  ],
  objectives: [
    'Le tableau doit afficher 3 (Print String et son Ecran), quel que soit l’ordre des BeginPlay.',
    'Touche Vérifier : le test essaie l’ordre du niveau, puis l’ordre inverse.',
  ],
  hints: [
    'Dans l’ordre inverse, le tableau compte avant que les lampes aient mis bAllumee à true.',
    'Le plus simple : un Delay (Duration 0) entre Event BeginPlay et Get All Actors Of Class dans BP_Tableau. Ou : bAllumee coché par défaut dans BP_Lampe.',
    'Solution : BP_Tableau : Event BeginPlay → Delay (0) → Get All Actors Of Class → … (le reste ne change pas).',
  ],
  challenge: 'Fais-le sans Delay : chaque lampe prévient le tableau qu’elle s’allume (une fonction du tableau, appelée depuis le BeginPlay de la lampe).',
  setup: boardProject,
  scenario: [{ wait: 0.5 }],
  checks: [
    {
      id: 'count',
      label: 'Le tableau affiche 3',
      test: (cx) => {
        const n = printedNumbers(cx);
        if (n.at(-1) === '3') return true;
        if (n.at(-1) === '0') return 'Le tableau affiche 0 : il a compté les lampes avant qu’elles aient fait leur BeginPlay.';
        return n.length ? `Le tableau affiche ${n.join(', ')} au lieu de 3.` : 'Le tableau n’affiche aucun nombre.';
      },
    },
    noRuntimeErrors(),
  ],
  solve(p) {
    const board = edit(p, 'BP_Tableau');
    const nodes = Object.values(board.graph.nodes);
    const begin = nodes.find((n) => n.def === 'event.beginPlay')!.id;
    const all = nodes.find((n) => n.def === 'actor.getAllOfClass')!.id;
    disconnectPin(board.graph, { node: begin, pin: 'then' });
    const wait = board.node('time.delay', {}, { duration: 0 }, [200, -100]);
    board.link(begin, 'then', wait, 'exec').link(wait, 'completed', all, 'exec');
  },
};

// ------------------------------------------------------------- Débogue D3

function turretProject() {
  const pb = new ProjectBuilder('La tourelle');
  const target = pb.blueprint('BP_Cible');
  target.component('StaticMesh', 'Cible', { shape: 'cylinder', sizeX: 60, sizeY: 60, color: '#dc2626' });
  target.cls.autoReceiveInput = true;
  target.link(target.node('event.inputKey', { key: 'E' }), 'pressed', target.node('actor.destroy'), 'exec');
  const turret = pb.blueprint('BP_Tourelle');
  turret.component('StaticMesh', 'Socle', { sizeX: 70, sizeY: 70, color: '#334155' });
  const cId = pb.place(target, 400, 0);
  const tId = pb.place(turret, 0, 0);
  const ref = referenceVariable(pb, turret, 'Cible', target, [[tId, cId]]);
  const begin = turret.node('event.beginPlay', {}, {}, [64, 96]);
  const timer = turret.node('time.setTimerByEvent', {}, { time: 0.5, looping: true }, [360, 96]);
  const aim = turret.node('event.custom', { name: 'Viser' }, {}, [64, 420]);
  const where = turret.node('actor.getLocation', {}, {}, [360, 600]);
  const split = turret.node('math.breakVector', {}, {}, [600, 600]);
  const text = turret.node('string.append', {}, { in0: 'Cible visée en X = ' }, [820, 600]);
  const say = turret.node('debug.printString', {}, {}, [1000, 420]);
  turret.link(begin, 'then', timer, 'exec').link(aim, 'delegate', timer, 'event');
  turret.link(aim, 'then', say, 'exec').link(turret.node('var.get', { variable: ref }, {}, [160, 600]), 'value', where, 'target');
  turret.link(where, 'result', split, 'in').link(split, 'x', text, 'in1').link(text, 'result', say, 'text');
  pb.playerStart(-300, 0);
  return pb.project;
}

export const debug3: Lesson = {
  id: 'd3-tourelle',
  // 2: the Player Controller's line checks the target with Is Valid (V7.62); asPlayerCommands adds one more.
  revision: 2,
  kind: 'debug',
  code: 'D3',
  module: 'Communication',
  level: 'confirme',
  number: 0,
  title: 'La tourelle',
  situation: 'La tourelle vise sa cible toutes les 0,5 s. Quand on détruit la cible (E), l’Output Log se remplit d’erreurs. La tourelle doit plutôt dire « Plus de cible ».',
  notions: ['Destroy Actor', 'Is Valid', 'Accessed None', 'Référence vers un acteur détruit'],
  remember: 'Détruire un acteur ne vide pas les références vers lui : elles pointent vers un acteur qui n’existe plus. Is Valid le détecte avant l’erreur.',
  cards: [
    DEBUG_METHOD,
    {
      title: 'Ce qui est en place',
      body:
        '- **BP_Cible** : une cible rouge. Sur IA_Interagir (la touche E), elle se détruit (Destroy Actor).\n- **BP_Tourelle** : une variable **Cible** (référence, réglée sur la cible du niveau). Au BeginPlay, **Set Timer by Event** (0,5 s, Looping) appelle le Custom Event **Viser** → Print String « Cible visée en X = … », avec la position lue par **Get Actor Location** sur la Cible.\n\n' +
        'Lance Play, attends, appuie sur E : l’Output Log se remplit d’erreurs, deux par seconde.',
    },
    {
      title: 'Une référence vers un acteur détruit',
      body:
        '**Destroy Actor** retire l’acteur du niveau. Mais il **ne vide pas** les variables qui pointaient vers lui : la variable Cible de la tourelle désigne toujours « la cible »… qui n’existe plus.\n\n' +
        'Lire sa position donne alors une erreur, la même famille qu’Accessed None : la référence ne mène plus à rien d’utilisable. Touche **Pourquoi ?** sous l’erreur : l’appli dit que l’acteur a été détruit.',
    },
    {
      title: 'Is Valid',
      body:
        '**Is Valid**, la version à pins blanches, examine **Input Object** et choisit un chemin :\n\n' +
        '- **Is Valid** : la référence désigne un acteur qui existe encore ;\n- **Is Not Valid** : elle est vide (None), **ou** l’acteur a été détruit.\n\n' +
        'C’est le seul test qui couvre les deux cas. Ce qu’attend la tourelle après la destruction : « Plus de cible », et aucune erreur.',
    },
    {
      title: 'Dans UE',
      body:
        'Toute référence gardée longtemps (une cible, un objet porté, un ennemi suivi) peut devenir invalide pendant qu’on la garde. Le réflexe : Is Valid avant de s’en servir, surtout dans un Tick ou un timer qui revient sans cesse.',
    },
  ],
  objectives: [
    'Tant que la cible existe, la tourelle affiche « Cible visée en X = … ».',
    'Une fois la cible détruite : plus aucune erreur, la tourelle affiche « Plus de cible ».',
    'Touche Vérifier.',
  ],
  hints: [
    'Avant de lire la position de la cible, vérifie qu’elle existe encore.',
    'Nœud : Is Valid (la version avec deux sorties d’exécution), entre Viser et Print String, avec Get Cible sur Input Object.',
    'Solution : Viser → Is Valid (Cible) ; Is Valid → Print « Cible visée… » ; Is Not Valid → Print « Plus de cible ».',
  ],
  challenge: 'Arrête aussi le timer quand la cible a disparu : garde le Return Value de Set Timer by Event dans une variable et utilise Clear and Invalidate Timer by Handle.',
  setup: turretProject,
  scenario: [{ wait: 1.2 }, { checkpoint: 'avant' }, ...PRESS_E, { wait: 1.5 }],
  checks: [
    {
      id: 'aim',
      label: 'La tourelle vise tant que la cible existe',
      at: 'avant',
      test: (cx) => (countPrints(cx, 'cible visee') > 0 ? true : 'La tourelle n’affiche plus « Cible visée » avant la destruction : garde ce chemin quand la cible est valide.'),
    },
    {
      id: 'told',
      label: 'Après la destruction : « Plus de cible »',
      test: (cx) => (countPrints(cx, 'plus de cible') > 0 ? true : 'Après la destruction, la tourelle n’affiche jamais « Plus de cible ».'),
    },
    noRuntimeErrors(),
  ],
  solve(p) {
    const t = edit(p, 'BP_Tourelle');
    const nodes = Object.values(t.graph.nodes);
    const aim = nodes.find((n) => n.def === 'event.custom')!.id;
    const say = nodes.find((n) => n.def === 'debug.printString')!.id;
    disconnectPin(t.graph, { node: aim, pin: 'then' });
    const valid = t.node('flow.isValid', {}, {}, [400, 420]);
    const none = t.node('debug.printString', {}, { text: 'Plus de cible' }, [1000, 260]);
    t.link(aim, 'then', valid, 'exec').link(t.node('var.get', { variable: t.cls.variables[0].id }, {}, [300, 560]), 'value', valid, 'object');
    t.link(valid, 'valid', say, 'exec').link(valid, 'notValid', none, 'exec');
  },
};

// ------------------------------------------------------------- Débogue D4

function flakyProject() {
  const pb = new ProjectBuilder('Une partie sur deux');
  const { b: gen, running } = generatorBlueprint(pb, { logic: false });
  gen.link(gen.node('event.beginPlay'), 'then', gen.node('var.set', { variable: running }, { value: true }), 'exec');
  const lamp = lampBlueprint(pb);
  const gId = pb.place(gen, -300, 0);
  const lId = pb.place(lamp, 200, 0);
  const ref = referenceVariable(pb, lamp, 'Generateur', gen, [[lId, gId]]);
  const begin = lamp.node('event.beginPlay', {}, {}, [64, 96]);
  const br = lamp.node('flow.branch', {}, {}, [560, 96]);
  const read = lamp.node('var.getExternal', { owner: gen.cls.id, variable: running }, {}, [360, 300]);
  const on = lamp.node('component.setVisibility', {}, { visible: true }, [860, 96]);
  lamp.link(begin, 'then', br, 'exec').link(lamp.node('var.get', { variable: ref }, {}, [160, 300]), 'value', read, 'target');
  lamp.link(read, 'value', br, 'condition').link(br, 'true', on, 'exec').target('Lumiere', on);
  pb.playerStart(-300, 250);
  return pb.project;
}

export const debug4: Lesson = {
  id: 'd4-une-sur-deux',
  kind: 'debug',
  code: 'D4',
  module: 'Communication',
  level: 'confirme',
  number: 0,
  title: 'Une partie sur deux',
  situation: 'Le générateur démarre au lancement, et la lampe s’allume s’il tourne. Ça marche… une partie sur deux. Aucune erreur dans l’Output Log.',
  notions: ['Ordre des BeginPlay', 'Valeur par défaut', 'Bug intermittent'],
  remember: 'Un bug qui n’arrive qu’une fois sur deux, sans erreur, vient souvent d’un ordre supposé entre acteurs. Ce qui est vrai au départ va dans la valeur par défaut.',
  cards: [
    DEBUG_METHOD,
    {
      title: 'Ce qui est en place',
      body:
        '- **BP_Generateur** : variable **bEnMarche** (Boolean, décochée par défaut). À son BeginPlay, il la met à vrai : il démarre au lancement.\n- **BP_Lampe** : variable **Generateur** (réglée sur le générateur). À son BeginPlay : **Branch** (Generateur › bEnMarche) → True : Set Visibility (allumée).\n\n' +
        'Lance Play plusieurs fois : la lampe s’allume une partie sur deux. Aucune erreur.',
    },
    {
      title: 'Un bug qui se cache',
      body:
        'Un bug **intermittent**, sans erreur, vient souvent d’un **ordre supposé** entre deux acteurs. Regarde la première ligne de l’Output Log : l’ordre des BeginPlay tiré pour cette partie. Compare-le avec le résultat, partie après partie.\n\n' +
        'Puis touche le Set Visibility de la lampe › Details › « Pourquoi ce nœud ne s’est pas exécuté ? » : quelle valeur le Branch a-t-il lue ?\n\n' +
        'Menu ⋮ › Ordre des BeginPlay › fixe, pour reproduire à coup sûr pendant que tu cherches.',
    },
    {
      title: 'Action ou état de départ ?',
      body:
        'Pose-toi la question : « le générateur tourne au lancement » est-il une **action** (quelque chose qui arrive pendant le jeu) ou un **état de départ** ?\n\n' +
        'Une action se fait dans un événement. Un état de départ se règle dans la **valeur par défaut** de la variable, posée avant tout BeginPlay, et donc vraie pour tout le monde, quel que soit l’ordre.\n\n' +
        'La leçon « L’ordre des BeginPlay » détaille les autres façons d’en sortir.',
    },
  ],
  objectives: ['La lampe est allumée au démarrage, dans les deux ordres possibles.', 'Touche Vérifier : le test essaie les deux ordres.'],
  hints: [
    'Quand la lampe fait son BeginPlay en premier, bEnMarche est encore à false.',
    'Le générateur tourne dès le départ : c’est une valeur de départ, pas une action. Regarde la valeur par défaut de bEnMarche.',
    'Solution : dans BP_Generateur, coche bEnMarche par défaut (Default Value), ou fais attendre la lampe avec un Delay de 0.',
  ],
  setup: flakyProject,
  scenario: [{ wait: 0.5 }],
  checks: [visible('lit', 'BP_Lampe', 'Lumiere', true, 'La lampe est allumée au démarrage'), noRuntimeErrors()],
  solve(p) {
    const gen = edit(p, 'BP_Generateur');
    gen.cls.variables[0].defaultValue = true;
  },
};
