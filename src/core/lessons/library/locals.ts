/**
 * V3, Confirmé: Local Variables. "Le ticket de caisse" (a local for a value
 * used only during one call, a Blueprint variable for what must last) and
 * "Prédis P4" (a local counter starts again at each call).
 */
import { addFunction, addFunctionParam } from '../../operations/functionOps';
import { disconnectPin } from '../../operations/graphOps';
import { addLocalVariable } from '../../operations/localOps';
import { T } from '../../types/pins';
import { edit, ProjectBuilder } from '../builder';
import { noRuntimeErrors, printedNumbers } from '../checks';
import type { CheckContext, Lesson } from '../types';

const fnGraph = (cx: CheckContext, className: string, name: string) =>
  cx.project.classes.find((c) => c.name === className)?.graphs.find((g) => g.kind === 'function' && g.name === name);

// --------------------------------------------------------- Le ticket de caisse

/** Ids of the starting project, found again by name in solve(). */
const ARTICLE = { fn: 'AjouterArticle', prix: 'Prix', quantite: 'Quantite', sousTotal: 'TotalLigne', total: 'TotalTicket' };

function registerProject() {
  const pb = new ProjectBuilder('Le ticket de caisse');
  const b = pb.blueprint('BP_Caisse');
  b.component('StaticMesh', 'Caisse', { sizeX: 120, sizeY: 70, color: '#0f766e' });
  b.component('TextRender', 'Etiquette', { y: -60, text: 'Caisse' });
  const g = addFunction(b.cls, ARTICLE.fn);
  const prix = addFunctionParam(pb.project, b.cls, g.id, 'inputs', T.int)!;
  const qte = addFunctionParam(pb.project, b.cls, g.id, 'inputs', T.int)!;
  const st = addFunctionParam(pb.project, b.cls, g.id, 'outputs', T.int)!;
  const total = addFunctionParam(pb.project, b.cls, g.id, 'outputs', T.int)!;
  prix.name = ARTICLE.prix;
  qte.name = ARTICLE.quantite;
  st.name = ARTICLE.sousTotal;
  total.name = ARTICLE.total;
  g.fn!.description = 'Ajoute une ligne au ticket et renvoie son sous-total et le total du ticket.';
  // BeginPlay: two lines, each followed by its sub-total and the ticket's total.
  const begin = b.node('event.beginPlay', {}, {}, [64, 96]);
  const l1 = b.node('call.function', { graph: g.id }, { [prix.id]: 5, [qte.id]: 2 }, [320, 96]);
  const p1 = b.node('debug.printString', {}, {}, [640, 96]);
  const p2 = b.node('debug.printString', {}, {}, [940, 96]);
  const l2 = b.node('call.function', { graph: g.id }, { [prix.id]: 4, [qte.id]: 3 }, [1240, 96]);
  const p3 = b.node('debug.printString', {}, {}, [1560, 96]);
  const p4 = b.node('debug.printString', {}, {}, [1860, 96]);
  b.link(begin, 'then', l1, 'exec').link(l1, 'then', p1, 'exec').link(l1, st.id, p1, 'text');
  b.link(p1, 'then', p2, 'exec').link(l1, total.id, p2, 'text').link(p2, 'then', l2, 'exec');
  b.link(l2, 'then', p3, 'exec').link(l2, st.id, p3, 'text').link(p3, 'then', p4, 'exec').link(l2, total.id, p4, 'text');
  pb.place(b, 0, 0);
  pb.playerStart(-300, 0);
  return pb.project;
}

const usesLocal = (cx: CheckContext) => {
  const g = fnGraph(cx, 'BP_Caisse', ARTICLE.fn);
  return !!g && (g.fn?.locals?.length ?? 0) > 0 && Object.values(g.nodes).some((n) => n.def === 'var.getLocal');
};

export const lessonLocals: Lesson = {
  id: 'l-locales',
  module: 'Fonctions',
  level: 'confirme',
  number: 0,
  title: 'Le ticket de caisse',
  situation:
    'La caisse ajoute deux lignes : 2 articles à 5, puis 3 articles à 4 (le troisième est offert). Après chaque ligne, elle affiche le sous-total de la ligne puis le total du ticket.',
  notions: ['Variable locale', 'Variable du Blueprint', 'Portée'],
  remember:
    'Une variable locale vit le temps d’un appel et repart de sa valeur par défaut au suivant : parfait pour un calcul intermédiaire. Ce qui doit durer d’un appel à l’autre est une variable du Blueprint.',
  cards: [
    {
      title: 'Une variable pour un seul appel',
      body:
        'Ouvre la fonction **AjouterArticle**. Dans My Blueprint apparaît **Local Variables (AjouterArticle)** : touche **+** pour en créer une.\n\n' +
        'Une variable **locale** n’existe que pendant un appel de la fonction. Elle est remise à sa **valeur par défaut** au début de chaque appel, et aucun autre graphe ne la voit.',
    },
    {
      title: 'Pourquoi pas une variable du Blueprint ?',
      body:
        'Un calcul intermédiaire (le sous-total d’une ligne) n’a aucun sens hors de l’appel. En variable du Blueprint, il traînerait d’un appel à l’autre et encombrerait la liste des variables.\n\n' +
        'À l’inverse, le **total du ticket** doit survivre d’une ligne à la suivante : lui ne peut **pas** être local.',
    },
    {
      title: 'Le calcul',
      body:
        'Sous-total = Prix × Quantite. À partir de 3 articles, un est offert : on retire un Prix. Le total du ticket augmente du sous-total.\n\n' +
        'Avec une locale `SousTotal` : **Set** SousTotal (Prix × Quantite), puis, si Quantite ≥ 3, **Set** SousTotal (SousTotal − Prix). Un Set peut se lire plusieurs fois : c’est tout l’intérêt.',
    },
  ],
  objectives: [
    'Dans AjouterArticle, calcule le sous-total dans une variable locale SousTotal (un article offert à partir de 3).',
    'Garde le total du ticket dans une variable qui dure d’une ligne à l’autre.',
    'Le Return Node renvoie TotalLigne (le sous-total) et TotalTicket. Il faut voir 10, 10, puis 8, 18.',
  ],
  hints: [
    'Ce qui ne sert qu’au calcul d’une ligne est local ; ce qui s’additionne de ligne en ligne ne l’est pas.',
    'Nœuds : Local Variables › + SousTotal (Integer) ; Set SousTotal, Multiply, Branch (Quantite ≥ 3), Subtract ; une variable Ticket (Integer) dans Variables, Set Ticket = Ticket + SousTotal.',
    'Solution : Entry → Set SousTotal (Prix × Quantite) → Branch (Quantite ≥ 3) : True → Set SousTotal (SousTotal − Prix) → Set Ticket (Ticket + SousTotal) ; False → le même Set Ticket. Puis Return Node (TotalLigne = SousTotal, TotalTicket = Ticket).',
  ],
  challenge: 'Ajoute une troisième ligne (1 article à 7) : que vaut le total ? Et si Ticket était une variable locale ?',
  setup: registerProject,
  scenario: [{ wait: 0.3 }],
  checks: [
    {
      id: 'values',
      label: 'Affiché : 10, 10, puis 8, 18',
      test: (cx) => {
        const n = printedNumbers(cx);
        if (n.join() === '10,10,8,18') return true;
        if (n.join() === '10,10,8,8') {
          return 'Le total repart de zéro à la deuxième ligne : il est dans une variable locale, remise à sa valeur par défaut à chaque appel. Le total du ticket doit être une variable du Blueprint.';
        }
        if (n[2] === '12') return 'La deuxième ligne vaut 12 au lieu de 8 : à partir de 3 articles, un est offert (retire un Prix au sous-total).';
        return `Affiché : ${n.join(', ') || 'rien'}. Il fallait 10, 10, puis 8, 18.`;
      },
    },
    {
      id: 'local',
      label: 'Le sous-total est une variable locale d’AjouterArticle',
      test: (cx) =>
        usesLocal(cx) ? true : 'Le résultat est juste, mais le sous-total n’est pas dans une variable locale (My Blueprint › Local Variables, avec la fonction ouverte).',
    },
    noRuntimeErrors(),
  ],
  solve(p) {
    const b = edit(p, 'BP_Caisse');
    const g = b.cls.graphs.find((x) => x.name === ARTICLE.fn)!;
    const param = (name: string) => [...g.fn!.inputs, ...g.fn!.outputs].find((x) => x.name === name)!.id;
    const ticket = b.variable('Ticket', T.int, 0);
    const st = addLocalVariable(p, b.cls, g.id, T.int, 'SousTotal')!;
    const f = b.inGraph(g.id);
    const entry = Object.values(g.nodes).find((n) => n.def === 'fn.entry')!.id;
    const ret = Object.values(g.nodes).find((n) => n.def === 'fn.return')!.id;
    disconnectPin(g, { node: entry, pin: 'then' });
    const set1 = f.node('var.setLocal', { variable: st.id }, {}, [300, 96]);
    const mul = f.node('math.multiplyInt', {}, {}, [200, 360]);
    const ge = f.node('math.greaterEqualInt', {}, { b: 3 }, [500, 360]);
    const br = f.node('flow.branch', {}, {}, [600, 96]);
    const set2 = f.node('var.setLocal', { variable: st.id }, {}, [900, 20]);
    const sub = f.node('math.subtractInt', {}, {}, [800, 300]);
    const setT = f.node('var.set', { variable: ticket }, {}, [1200, 96]);
    const add = f.node('math.addInt', {}, {}, [1100, 360]);
    f.link(entry, 'then', set1, 'exec').link(entry, param(ARTICLE.prix), mul, 'a').link(entry, param(ARTICLE.quantite), mul, 'b').link(mul, 'result', set1, 'value');
    f.link(set1, 'then', br, 'exec').link(entry, param(ARTICLE.quantite), ge, 'a').link(ge, 'result', br, 'condition');
    f.link(br, 'true', set2, 'exec').link(f.node('var.getLocal', { variable: st.id }, {}, [600, 300]), 'value', sub, 'a').link(entry, param(ARTICLE.prix), sub, 'b').link(sub, 'result', set2, 'value');
    f.link(set2, 'then', setT, 'exec').link(br, 'false', setT, 'exec');
    f.link(f.node('var.get', { variable: ticket }, {}, [900, 460]), 'value', add, 'a').link(f.node('var.getLocal', { variable: st.id }, {}, [900, 560]), 'value', add, 'b').link(add, 'result', setT, 'value');
    f.link(setT, 'then', ret, 'exec').link(f.node('var.getLocal', { variable: st.id }, {}, [1300, 360]), 'value', ret, param(ARTICLE.sousTotal)).link(setT, 'out', ret, param(ARTICLE.total));
  },
};

/** The trap: the ticket's total kept in a local. Exported for the tests. */
export function solveLocalsWithLocalTotal(p: Parameters<Lesson['solve']>[0]): void {
  lessonLocals.solve(p);
  const b = edit(p, 'BP_Caisse');
  const g = b.cls.graphs.find((x) => x.name === ARTICLE.fn)!;
  const ticket = b.cls.variables.find((v) => v.name === 'Ticket')!;
  const local = addLocalVariable(p, b.cls, g.id, T.int, 'TotalLocal')!;
  for (const n of Object.values(g.nodes)) {
    if (n.def === 'var.get' && n.config.variable === ticket.id) n.def = 'var.getLocal';
    if (n.def === 'var.set' && n.config.variable === ticket.id) n.def = 'var.setLocal';
    if (n.def === 'var.getLocal' || n.def === 'var.setLocal') {
      if (n.config.variable === ticket.id) n.config.variable = local.id;
    }
  }
  b.cls.variables = b.cls.variables.filter((v) => v.id !== ticket.id);
}

// ------------------------------------------------------------------- Prédis P4

export const predict4: Lesson = {
  id: 'p4-locale',
  kind: 'predict',
  code: 'P4',
  module: 'Fonctions',
  level: 'confirme',
  number: 0,
  title: 'Locale ou pas',
  situation: 'La fonction Ajouter est appelée trois fois. Elle compte ses appels dans une variable locale, et additionne ce compte dans Total, une variable du Blueprint.',
  notions: ['Variable locale', 'Increment Int', 'Variable du Blueprint'],
  remember: 'Une variable locale repart de sa valeur par défaut à chaque appel ; une variable du Blueprint garde sa valeur entre les appels.',
  cards: [
    {
      title: 'À lire',
      body:
        'Ouvre la fonction **Ajouter** de **BP_Compteur**. `Appels` est une variable **locale** (valeur par défaut 0) ; `Total` est une variable du Blueprint (0 au départ).\n\n' +
        '**Increment Int** ajoute 1 à la variable reliée et renvoie sa nouvelle valeur. Le BeginPlay appelle Ajouter trois fois.',
    },
  ],
  objectives: [
    'Lis le graphe sans lancer Play : suis le fil blanc depuis l’événement.',
    'Choisis ta réponse dans l’onglet Prédis.',
    'Puis lance ▶ Play et regarde l’Output Log pour vérifier.',
  ],
  hints: [
    'Que vaut Appels au début du deuxième appel ?',
    'Appels vaut 1 à chaque appel, après l’Increment. Total, lui, garde sa valeur.',
    'Réponse : 1, 2, 3.',
  ],
  setup() {
    const pb = new ProjectBuilder('Prédis P4');
    const b = pb.blueprint('BP_Compteur');
    b.component('TextRender', 'Etiquette', { text: 'Compteur' });
    const total = b.variable('Total', T.int, 0);
    const g = addFunction(b.cls, 'Ajouter');
    const appels = addLocalVariable(pb.project, b.cls, g.id, T.int, 'Appels')!;
    const f = b.inGraph(g.id);
    const entry = Object.values(g.nodes).find((n) => n.def === 'fn.entry')!.id;
    const inc = f.node('var.incrementInt', {}, {}, [320, 96]);
    const set = f.node('var.set', { variable: total }, {}, [640, 96]);
    const add = f.node('math.addInt', {}, {}, [500, 340]);
    const pr = f.node('debug.printString', {}, {}, [960, 96]);
    f.link(entry, 'then', inc, 'exec').link(f.node('var.getLocal', { variable: appels.id }, {}, [100, 300]), 'value', inc, 'value');
    f.link(inc, 'then', set, 'exec').link(f.node('var.get', { variable: total }, {}, [300, 420]), 'value', add, 'a').link(inc, 'result', add, 'b').link(add, 'result', set, 'value');
    f.link(set, 'then', pr, 'exec').link(set, 'out', pr, 'text');
    const begin = b.node('event.beginPlay', {}, {}, [64, 96]);
    const calls = [0, 1, 2].map((i) => b.node('call.function', { graph: g.id }, {}, [340 + i * 300, 96]));
    b.link(begin, 'then', calls[0], 'exec').link(calls[0], 'then', calls[1], 'exec').link(calls[1], 'then', calls[2], 'exec');
    pb.place(b, 0, 0);
    pb.playerStart(-300, 0);
    return pb.project;
  },
  scenario: [{ wait: 0.3 }],
  checks: [],
  solve: () => {},
  predict: {
    question: 'Qu’affichent les trois appels ?',
    options: ['1, 2, 3', '1, 3, 6', '1, 1, 1', '0, 0, 0'],
    answer: 0,
    explanation:
      'Appels est locale : chaque appel la remet à 0, l’Increment la passe à 1. Total, variable du Blueprint, garde sa valeur : 0 + 1, puis 1 + 1, puis 2 + 1. Avec Appels en variable du Blueprint, on aurait eu 1, 3, 6.',
    verify: (p) => p.join(',') === '1,2,3',
  },
};
