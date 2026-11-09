/**
 * V2, Avancé: pure and impure functions, cleaning up after a Destroy Actor
 * (Event Destroyed, a list that keeps a dead reference), and the "Complète"
 * exercise on a recursive function's stop condition.
 */
import { addFunction, addFunctionParam, setFunctionPure } from '../../operations/functionOps';
import { disconnectPin } from '../../operations/graphOps';
import { T } from '../../types/pins';
import { edit, ProjectBuilder } from '../builder';
import { noRuntimeErrors, printedNumbers, usesNode } from '../checks';
import type { CheckContext, Lesson } from '../types';

const fnGraph = (cx: CheckContext, className: string, name: string) =>
  cx.project.classes.find((c) => c.name === className)?.graphs.find((g) => g.kind === 'function' && g.name === name);

// ------------------------------------------------- Fonctions pures et impures

function characterProject() {
  const pb = new ProjectBuilder('Fonctions pures et impures');
  const b = pb.blueprint('BP_Personnage');
  b.component('StaticMesh', 'Corps', { shape: 'cylinder', sizeX: 60, sizeY: 60, color: '#7c3aed' });
  b.variable('PV', T.int, 100);
  pb.place(b, 0, 0);
  pb.playerStart(-300, 0);
  return pb.project;
}

export const lessonPureFunctions: Lesson = {
  id: 'l-fonctions',
  module: 'Fonctions',
  level: 'avance',
  number: 0,
  title: 'Fonctions pures et impures',
  situation: 'Le personnage (100 PV) prend un coup critique de base 10, puis se soigne de 15. Le calcul des dégâts est une fonction pure ; le soin, une fonction impure qui modifie PV.',
  notions: ['Fonction', 'Pure', 'Entrées et sorties', 'Return Node'],
  remember: 'Une fonction pure calcule et rend un résultat, sans rien modifier ; elle s’exécute à chaque lecture de sa sortie. Une fonction impure agit (Set, Spawn…) et s’exécute une fois, quand le fil blanc passe.',
  cards: [
    {
      title: 'Deux sortes de fonctions',
      body:
        'Une fonction **impure** a des pins blanches : elle s’exécute quand le fil d’exécution passe par son nœud, une seule fois. Elle peut modifier des variables.\n\n' +
        'Une fonction **pure** (case **Pure** dans Details de la fonction) n’a pas de pin blanche, comme Add ou Get : elle ne fait que **calculer** à partir de ses entrées, et ne doit rien modifier.',
    },
    {
      title: 'Le piège de la fonction pure',
      body:
        'Une fonction pure **s’exécute à chaque lecture de sa sortie**. Reliée à deux nœuds, elle tourne deux fois. Avec un Random dedans, elle donne deux résultats différents ; avec un Set dedans, elle modifierait deux fois.',
    },
    {
      title: 'Entrées, sorties, Return Node',
      body:
        'Dans My Blueprint › Functions › +, crée la fonction puis, dans Details, ajoute ses **Inputs** et **Outputs**. Le **Return Node** rend les sorties ; une fonction peut en avoir plusieurs (un par chemin d’un Branch).',
    },
  ],
  objectives: [
    'Fonction pure CalculerDegats : entrées Base (Integer) et Critique (Boolean), sortie Degats (Integer) : Base × 2 si Critique, sinon Base.',
    'Fonction impure Soigner : entrée Montant (Integer), ajoute Montant à PV sans dépasser 100.',
    'Au BeginPlay : PV = PV − CalculerDegats (10, critique), affiche PV ; puis Soigner (15), affiche PV.',
    'Touche Vérifier : il faut voir 80, puis 95.',
  ],
  hints: [
    'CalculerDegats ne touche pas à PV : elle rend un nombre. C’est le BeginPlay qui fait le Set.',
    'Dans CalculerDegats : Branch (Critique) → deux Return Node (Base × 2, et Base). Dans Soigner : Set PV = Min (PV + Montant, 100). Au BeginPlay : Set PV (PV − CalculerDegats) → Print → Soigner → Print.',
    'Solution : BeginPlay → Set PV = PV − CalculerDegats(10, true) → Print PV (80) → Soigner(15) → Print PV (95).',
  ],
  challenge: 'Ajoute un Random Integer in Range à CalculerDegats et lis sa sortie dans deux Print String : deux nombres différents. Pourquoi ?',
  setup: characterProject,
  scenario: [{ wait: 0.3 }],
  checks: [
    {
      id: 'pure',
      label: 'CalculerDegats est une fonction pure, sans Set',
      test: (cx) => {
        const g = fnGraph(cx, 'BP_Personnage', 'CalculerDegats');
        if (!g?.fn) return 'Crée dans BP_Personnage une fonction nommée CalculerDegats.';
        if (!g.fn.pure) return 'Coche Pure dans Details de CalculerDegats : elle ne fait que calculer.';
        if (Object.values(g.nodes).some((n) => n.def === 'var.set' || n.def === 'var.setExternal')) {
          return 'CalculerDegats contient un Set : une fonction pure ne doit rien modifier, elle s’exécute à chaque lecture de sa sortie.';
        }
        return g.fn.outputs.some((o) => o.type.category === 'int') ? true : 'Ajoute à CalculerDegats une sortie Integer (Degats).';
      },
    },
    {
      id: 'impure',
      label: 'Soigner est une fonction impure',
      test: (cx) => {
        const g = fnGraph(cx, 'BP_Personnage', 'Soigner');
        if (!g?.fn) return 'Crée dans BP_Personnage une fonction nommée Soigner.';
        return g.fn.pure ? 'Soigner modifie PV : elle doit rester impure (Pure décoché).' : true;
      },
    },
    {
      id: 'values',
      label: 'PV affiché : 80, puis 95',
      test: (cx) => {
        const n = printedNumbers(cx);
        if (n.join() === '80,95') return true;
        if (n[0] === '90') return 'Le premier PV affiché est 90 : le coup est critique, Degats doit valoir Base × 2.';
        return `Nombres affichés : ${n.join(', ') || 'aucun'}. Il fallait 80, puis 95.`;
      },
    },
    noRuntimeErrors(),
  ],
  solve(p) {
    const b = edit(p, 'BP_Personnage');
    const pv = b.cls.variables[0].id;
    // CalculerDegats (pure): Critique ? Base × 2 : Base
    const dmg = addFunction(b.cls, 'CalculerDegats');
    const base = addFunctionParam(p, b.cls, dmg.id, 'inputs', T.int)!;
    const crit = addFunctionParam(p, b.cls, dmg.id, 'inputs', T.bool)!;
    const out = addFunctionParam(p, b.cls, dmg.id, 'outputs', T.int)!;
    base.name = 'Base';
    crit.name = 'Critique';
    out.name = 'Degats';
    setFunctionPure(p, b.cls, dmg.id, true);
    const f = b.inGraph(dmg.id);
    const entry = Object.values(dmg.nodes).find((n) => n.def === 'fn.entry')!.id;
    const ret = Object.values(dmg.nodes).find((n) => n.def === 'fn.return')!.id;
    disconnectPin(dmg, { node: entry, pin: 'then' });
    const br = f.node('flow.branch', {}, {}, [300, 96]);
    const twice = f.node('math.multiplyInt', {}, { b: 2 }, [500, 300]);
    const plain = f.node('fn.return', { graph: dmg.id }, {}, [700, 420]);
    f.link(entry, 'then', br, 'exec').link(entry, crit.id, br, 'condition');
    f.link(br, 'true', ret, 'exec').link(entry, base.id, twice, 'a').link(twice, 'result', ret, out.id);
    f.link(br, 'false', plain, 'exec').link(entry, base.id, plain, out.id);
    // Soigner (impure): PV = Min(PV + Montant, 100)
    const heal = addFunction(b.cls, 'Soigner');
    const amount = addFunctionParam(p, b.cls, heal.id, 'inputs', T.int)!;
    amount.name = 'Montant';
    const h = b.inGraph(heal.id);
    const hEntry = Object.values(heal.nodes).find((n) => n.def === 'fn.entry')!.id;
    const add = h.node('math.addInt', {}, {}, [300, 300]);
    const min = h.node('math.minInt', {}, { b: 100 }, [500, 300]);
    const set = h.node('var.set', { variable: pv }, {}, [400, 96]);
    h.link(h.node('var.get', { variable: pv }, {}, [100, 300]), 'value', add, 'a').link(hEntry, amount.id, add, 'b').link(add, 'result', min, 'a');
    h.link(hEntry, 'then', set, 'exec').link(min, 'result', set, 'value');
    // BeginPlay
    const begin = b.node('event.beginPlay', {}, {}, [64, 96]);
    const calc = b.node('call.pureFunction', { graph: dmg.id }, { [base.id]: 10, [crit.id]: true }, [200, 360]);
    const minus = b.node('math.subtractInt', {}, {}, [440, 360]);
    const hit = b.node('var.set', { variable: pv }, {}, [400, 96]);
    const say1 = b.node('debug.printString', {}, {}, [700, 96]);
    const care = b.node('call.function', { graph: heal.id }, { [amount.id]: 15 }, [1000, 96]);
    const say2 = b.node('debug.printString', {}, {}, [1300, 96]);
    b.link(b.node('var.get', { variable: pv }, {}, [200, 240]), 'value', minus, 'a').link(calc, out.id, minus, 'b').link(minus, 'result', hit, 'value');
    b.link(begin, 'then', hit, 'exec').link(hit, 'then', say1, 'exec').link(hit, 'out', say1, 'text');
    b.link(say1, 'then', care, 'exec').link(care, 'then', say2, 'exec').link(b.node('var.get', { variable: pv }, {}, [1100, 300]), 'value', say2, 'text');
  },
};

// ------------------------------------------------------ Détruire proprement

function guardProject() {
  const pb = new ProjectBuilder('Détruire proprement');
  const crate = pb.blueprint('BP_Caisse');
  crate.component('StaticMesh', 'Caisse', { sizeX: 60, sizeY: 60, color: '#a16207', blocks: false });
  crate.component('BoxCollision', 'Zone', { sizeX: 100, sizeY: 100 });
  crate.link(crate.node('event.actorBeginOverlap'), 'then', crate.node('actor.destroy'), 'exec');
  for (const y of [0, -300, 300]) pb.place(crate, 0, y);
  const guard = pb.blueprint('BP_Gardien');
  guard.component('StaticMesh', 'Gardien', { shape: 'cylinder', sizeX: 50, sizeY: 50, color: '#1d4ed8' });
  const list = guard.variable('Caisses', T.array(T.object('BP_Caisse')));
  const begin = guard.node('event.beginPlay', {}, {}, [64, 96]);
  const all = guard.node('actor.getAllOfClass', {}, { class: crate.cls.id }, [320, 96]);
  const keep = guard.node('var.set', { variable: list }, {}, [640, 96]);
  const timer = guard.node('time.setTimerByEvent', {}, { time: 0.5, looping: true }, [940, 96]);
  guard.link(begin, 'then', all, 'exec').link(all, 'then', keep, 'exec').link(all, 'actors', keep, 'value').link(keep, 'then', timer, 'exec');
  const round = guard.node('event.custom', { name: 'Ronde' }, {}, [64, 460]);
  const loop = guard.node('flow.forEachLoop', {}, {}, [360, 460]);
  const where = guard.node('actor.getLocation', {}, {}, [560, 700]);
  const split = guard.node('math.breakVector', {}, {}, [760, 700]);
  const text = guard.node('string.append', {}, { in0: 'Caisse en Y = ' }, [960, 700]);
  const say = guard.node('debug.printString', {}, {}, [760, 460]);
  guard.link(round, 'delegate', timer, 'event').link(round, 'then', loop, 'exec').link(guard.node('var.get', { variable: list }, {}, [200, 640]), 'value', loop, 'array');
  guard.link(loop, 'body', say, 'exec').link(loop, 'element', where, 'target').link(where, 'result', split, 'in').link(split, 'y', text, 'in1').link(text, 'result', say, 'text');
  pb.place(guard, -400, -300);
  pb.playerStart(-300, 0);
  return pb.project;
}

export const lessonCleanDestroy: Lesson = {
  id: 'l-detruire',
  module: 'Fonctions',
  level: 'avance',
  number: 0,
  title: 'Détruire proprement',
  situation: 'Le gardien fait sa ronde toutes les 0,5 s sur la liste des caisses. Quand le joueur en ramasse une (elle est détruite), la ronde tombe sur une référence morte : Accessed None.',
  notions: ['Destroy Actor', 'Event Destroyed', 'Remove Item', 'Référence morte'],
  remember: 'Un acteur détruit reste dans les listes et variables qui le désignent. Event Destroyed est le moment de dire aux autres de l’oublier.',
  cards: [
    {
      title: 'Une liste qui ment',
      body:
        'Le gardien remplit `Caisses` une fois, au BeginPlay. Quand une caisse est détruite, la liste la contient toujours : la ronde lit sa position… et obtient **Accessed None** (touche **Pourquoi ?** dans l’Output Log).',
    },
    {
      title: 'Prévenir en partant',
      body:
        '**Event Destroyed** s’exécute juste avant que l’acteur disparaisse. C’est là que la caisse dit au gardien de la retirer : **Get Actor Of Class** (BP_Gardien), puis **Remove Item** sur sa liste `Caisses`, avec **Self** comme Item.\n\n' +
        '**Is Valid** dans la ronde évite l’erreur, mais la liste garde la caisse morte : on ne règle que le symptôme.',
    },
  ],
  objectives: ['Quand une caisse est détruite, elle est retirée de la liste Caisses du gardien.', 'Plus aucune erreur pendant la ronde.', 'Touche Vérifier.'],
  hints: [
    'Le changement se fait dans BP_Caisse, pas dans le gardien.',
    'Nœuds : Event Destroyed, Get Actor Of Class (BP_Gardien), Get Caisses (Target = le gardien), Remove Item, Self.',
    'Solution : BP_Caisse : Event Destroyed → Remove Item (Target Array = Caisses du gardien, Item = Self).',
  ],
  challenge: 'Affiche aussi « Il reste N caisses » à chaque ronde, avec Length.',
  setup: guardProject,
  scenario: [{ wait: 0.2 }, { walk: [1, 0], seconds: 0.6 }, { wait: 1.5 }],
  checks: [
    {
      id: 'gone',
      label: 'La caisse touchée est détruite',
      test: (cx) => (cx.sim.actors.filter((a) => a.className === 'BP_Caisse' && !a.destroyed).length === 2 ? true : 'La caisse touchée par le joueur devrait être détruite.'),
    },
    {
      id: 'list',
      label: 'La liste du gardien ne contient plus que 2 caisses',
      test: (cx) => {
        const list = cx.variable('BP_Gardien', 'Caisses');
        const n = Array.isArray(list) ? list.length : 0;
        if (n === 2) return true;
        return n === 3 ? 'Caisses contient toujours 3 caisses, dont une détruite : retire-la de la liste dans son Event Destroyed.' : `Caisses contient ${n} caisse(s) au lieu de 2.`;
      },
    },
    usesNode('destroyed', 'BP_Caisse', ['event.destroyed'], 'La caisse utilise Event Destroyed', 'Prévenir le gardien se fait dans Event Destroyed de BP_Caisse.'),
    noRuntimeErrors(),
  ],
  solve(p) {
    const crate = edit(p, 'BP_Caisse');
    const guard = p.classes.find((c) => c.name === 'BP_Gardien')!;
    const list = guard.variables[0].id;
    const ev = crate.node('event.destroyed', {}, {}, [64, 400]);
    const find = crate.node('actor.getOfClass', {}, { class: guard.id }, [300, 400]);
    const remove = crate.node('array.removeItem', {}, {}, [900, 400]);
    const read = crate.node('var.getExternal', { owner: guard.id, variable: list }, {}, [600, 600]);
    crate.link(ev, 'then', find, 'exec').link(find, 'then', remove, 'exec').link(find, 'result', read, 'target');
    crate.link(read, 'value', remove, 'array').link(crate.node('actor.self', {}, {}, [700, 760]), 'self', remove, 'item');
  },
};

// ---------------------------------------------------------- Complète C2

function factorialProject() {
  const pb = new ProjectBuilder('La factorielle');
  const b = pb.blueprint('BP_Calcul');
  b.component('StaticMesh', 'Boitier', { sizeX: 80, sizeY: 60, color: '#0f766e' });
  const g = addFunction(b.cls, 'Factorielle');
  const n = addFunctionParam(pb.project, b.cls, g.id, 'inputs', T.int)!;
  const r = addFunctionParam(pb.project, b.cls, g.id, 'outputs', T.int)!;
  n.name = 'N';
  r.name = 'Resultat';
  const f = b.inGraph(g.id);
  const entry = Object.values(g.nodes).find((x) => x.def === 'fn.entry')!.id;
  const ret = Object.values(g.nodes).find((x) => x.def === 'fn.return')!.id;
  disconnectPin(g, { node: entry, pin: 'then' });
  g.nodes[ret].x = 1500;
  g.nodes[ret].y = 96;
  const minus = f.node('math.subtractInt', {}, { b: 1 }, [700, 320]);
  const call = f.node('call.function', { graph: g.id }, {}, [900, 96]);
  const mul = f.node('math.multiplyInt', {}, {}, [1240, 320]);
  f.node('util.comment', { text: 'Trou : la condition d’arrêt', w: 420, h: 300, color: '#f2c014' }, {}, [330, 20]);
  f.link(entry, 'then', call, 'exec').link(entry, n.id, minus, 'a').link(minus, 'result', call, n.id);
  f.link(call, 'then', ret, 'exec').link(entry, n.id, mul, 'a').link(call, r.id, mul, 'b').link(mul, 'result', ret, r.id);
  const begin = b.node('event.beginPlay', {}, {}, [64, 96]);
  const use = b.node('call.function', { graph: g.id }, { [n.id]: 5 }, [360, 96]);
  const say = b.node('debug.printString', {}, {}, [680, 96]);
  b.link(begin, 'then', use, 'exec').link(use, 'then', say, 'exec').link(use, r.id, say, 'text');
  pb.place(b, 0, 0);
  pb.playerStart(-300, 0);
  return pb.project;
}

export const complete2: Lesson = {
  id: 'c2-factorielle',
  kind: 'complete',
  code: 'C2',
  module: 'Fonctions',
  level: 'avance',
  number: 0,
  title: 'La factorielle',
  situation:
    'Factorielle(N) = N × Factorielle(N − 1) : la fonction s’appelle elle-même. Mais rien ne l’arrête, et Play finit sur « Infinite loop detected ». Il manque la condition d’arrêt, dans le cadre jaune.',
  notions: ['Récursion', 'Condition d’arrêt', 'Return Node', 'Infinite loop detected'],
  remember: 'Une fonction qui s’appelle elle-même a besoin d’un cas où elle ne s’appelle plus : sans lui, elle tourne jusqu’à ce qu’UE l’arrête (Infinite loop detected).',
  cards: [
    {
      title: 'Une fonction qui s’appelle',
      body:
        'Ouvre la fonction **Factorielle** (My Blueprint › Functions). Elle calcule 5 × 4 × 3 × 2 × 1 en s’appelant avec N − 1. Chaque appel a ses propres entrées : le N du 3e appel ne remplace pas celui du 1er.\n\n' +
        'Il manque le cas où elle **ne s’appelle plus** : quand N vaut 1 (ou moins), le résultat est 1.',
    },
  ],
  objectives: [
    'Dans le cadre jaune, entre l’entrée de Factorielle et l’appel : un Branch sur N <= 1.',
    'True : un Return Node avec Resultat = 1. False : la suite déjà en place.',
    'Touche Vérifier : le BeginPlay doit afficher 120.',
  ],
  hints: [
    'Lance d’abord Play et touche Pourquoi ? sous l’erreur de l’Output Log.',
    'Nœuds à placer : <= (Integer), Branch, Return Node (appui long dans le vide du graphe de la fonction).',
    'Solution : Entrée → Branch (N <= 1) ; True → Return Node (Resultat = 1) ; False → Factorielle (N − 1) → Return Node (N × résultat).',
  ],
  setup: factorialProject,
  scenario: [{ wait: 0.3 }],
  checks: [
    {
      id: 'result',
      label: 'Factorielle(5) affiche 120',
      test: (cx) => {
        const n = printedNumbers(cx);
        if (n.at(-1) === '120') return true;
        return n.length ? `Affiché : ${n.join(', ')} au lieu de 120.` : 'Rien n’est affiché : la fonction ne s’arrête jamais, ou ne rend rien.';
      },
    },
    noRuntimeErrors(),
  ],
  solve(p) {
    const b = edit(p, 'BP_Calcul');
    const g = b.cls.graphs.find((x) => x.name === 'Factorielle')!;
    const f = b.inGraph(g.id);
    const entry = Object.values(g.nodes).find((x) => x.def === 'fn.entry')!.id;
    const call = Object.values(g.nodes).find((x) => x.def === 'call.function')!.id;
    const nId = g.fn!.inputs[0].id;
    const rId = g.fn!.outputs[0].id;
    disconnectPin(g, { node: entry, pin: 'then' });
    const le = f.node('math.lessEqualInt', {}, { b: 1 }, [380, 320]);
    const br = f.node('flow.branch', {}, {}, [500, 96]);
    const one = f.node('fn.return', { graph: g.id }, { [rId]: 1 }, [700, -150]);
    f.link(entry, 'then', br, 'exec').link(entry, nId, le, 'a').link(le, 'result', br, 'condition');
    f.link(br, 'true', one, 'exec').link(br, 'false', call, 'exec');
  },
};
