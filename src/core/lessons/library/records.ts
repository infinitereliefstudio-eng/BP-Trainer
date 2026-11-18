/**
 * V3, step B: Structure assets. "La fiche de l'objet" (Confirmé: change one
 * member with Set Members in; Make builds a whole new structure) and "Débogue
 * D5" (Set Members on For Each's Array Element changes a copy).
 */
import type { Project } from '../../model/project';
import { addStruct, addStructMember, updateStructMember } from '../../operations/structOps';
import { T } from '../../types/pins';
import { memberValue } from '../../types/structs';
import { edit, ProjectBuilder } from '../builder';
import { countPrints, noRuntimeErrors, printedNumbers } from '../checks';
import type { CheckContext, Lesson } from '../types';
import { DEBUG_METHOD } from './kit';

/** S_Objet { Nom: String, Poids: Integer } (plus Charge in D5). */
function objectStruct(pb: ProjectBuilder, withCharge: boolean) {
  const r = addStruct(pb.project, 'S_Objet');
  if (!r.ok) throw new Error(r.reason);
  const s = r.value;
  const nom = s.members[0];
  updateStructMember(pb.project, s.id, nom.id, { name: 'Nom', type: T.string });
  const poids = addStructMember(pb.project, s.id, T.int)!;
  updateStructMember(pb.project, s.id, poids.id, { name: 'Poids' });
  const charge = withCharge ? addStructMember(pb.project, s.id, T.int) : undefined;
  if (charge) updateStructMember(pb.project, s.id, charge.id, { name: 'Charge' });
  return { s, nom, poids, charge };
}

const member = (p: Project, name: string) => p.structs.find((s) => s.name === 'S_Objet')?.members.find((m) => m.name === name);

// ---------------------------------------------------- La fiche de l'objet

function recordProject() {
  const pb = new ProjectBuilder('La fiche de l’objet');
  const { nom, poids } = objectStruct(pb, false);
  const b = pb.blueprint('BP_Lampe');
  b.component('StaticMesh', 'Pied', { shape: 'cylinder', sizeX: 40, sizeY: 40, color: '#6b7280' });
  b.component('PointLight', 'Lumiere', { radius: 260 });
  b.variable('Fiche', T.struct('S_Objet'), { [nom.id]: 'Lampe', [poids.id]: 2 });
  pb.place(b, 0, 0);
  pb.playerStart(-300, 0);
  return pb.project;
}

function ficheOf(cx: CheckContext) {
  const v = cx.variable('BP_Lampe', 'Fiche');
  const get = (name: string) => {
    const m = member(cx.project, name);
    return m ? memberValue(v, m) : undefined;
  };
  return { nom: get('Nom'), poids: get('Poids') };
}

export const lessonRecord: Lesson = {
  id: 'l-fiche',
  module: 'Données',
  level: 'confirme',
  number: 0,
  title: 'La fiche de l’objet',
  situation:
    'Chaque objet de la station a une fiche, la structure S_Objet : son nom et son poids. La lampe a besoin d’un troisième membre, sa charge (100 au départ). Au lancement, elle consomme deux fois 30 de charge et affiche la charge restante. Sa fiche doit garder son nom et son poids.',
  notions: ['Structure', 'Membre', 'Break', 'Set Members in', 'Make'],
  remember:
    'Pour changer un membre d’une structure, Set Members in : les autres gardent leur valeur. Make construit une structure entière : chaque membre non relié repart de sa valeur par défaut.',
  cards: [
    {
      title: 'Ce qui est en place',
      body:
        '- Une **structure** **S_Objet**, dans le Content Browser, avec deux membres : **Nom** (String) et **Poids** (Integer).\n- **BP_Lampe** a une variable **Fiche** de type S_Objet, qui vaut Nom = « Lampe », Poids = 2. Le graphe est vide.\n\n' +
        'La lampe a besoin d’un troisième membre, **Charge** (100 au départ). Au lancement, elle consomme deux fois 30 et affiche 70, puis 40. Sa fiche doit garder son nom et son poids.',
    },
    {
      title: 'Une structure',
      body:
        'Une **structure** regroupe plusieurs valeurs sous **un seul type**. Une variable S_Objet contient un Nom **et** un Poids : on la passe, on la range dans un tableau, on la renvoie d’une fonction, d’un seul fil.\n\n' +
        'Ouvre S_Objet (bouton Content Drawer, en bas à gauche) et touche **+ Membre** : `Charge`, type Integer, valeur par défaut **100**. Toutes les variables S_Objet du projet ont aussitôt ce membre, à sa valeur par défaut.',
    },
    {
      title: 'Trois nœuds',
      body:
        '- **Break S_Objet** : sépare une valeur en ses membres, pour les **lire**. Nœud pur.\n- **Set Members in S_Objet** : change **certains** membres d’une variable, et laisse les autres tels quels. Coche dans Details ceux à changer : ils gagnent une pin. Sa pin **Struct Ref**, en losange, se relie au **Get Fiche** : c’est la variable qui change.\n- **Make S_Objet** : construit une structure **neuve**, membre par membre. Nœud pur.',
    },
    {
      title: 'Le plan',
      body:
        'Au **BeginPlay**, deux fois de suite :\n\n' +
        '1. **Set Members in S_Objet** (Struct Ref = Get Fiche, Charge coché) avec Charge = Break(Fiche).Charge **−** 30.\n2. **Print String** de Break(Fiche).Charge.\n\n' +
        'Le deuxième Break lit la Fiche **après** le premier changement : 70, puis 40.',
    },
    {
      title: 'Le piège de Make',
      body:
        '**Set Fiche** avec un **Make S_Objet** dont seul Charge est relié paraît plus court. Mais Make construit une fiche **entière** : les membres non reliés prennent leur valeur par défaut. Nom devient vide, Poids devient 0. La lampe a perdu son identité.\n\n' +
        'Règle : pour changer un membre, Set Members in. Make, c’est pour créer une fiche de zéro.\n\n' +
        'Dans UE, les structures définies dans le Content Browser s’appellent des **User Defined Structures**. Les plus courantes viennent du moteur : Vector, Rotator, Transform, Linear Color.',
    },
  ],
  objectives: [
    'Ajoute à S_Objet le membre Charge (Integer, 100 par défaut).',
    'Au BeginPlay, retire 30 à la Charge de Fiche, affiche-la, deux fois : 70, puis 40.',
    'La fiche garde son Nom (Lampe) et son Poids (2).',
  ],
  hints: [
    'Charge − 30 se calcule à partir de la Charge actuelle : Break Fiche, puis Subtract.',
    'Nœuds : Get Fiche, Break S_Objet, Subtract (Integer), Set Members in S_Objet (Charge coché), Print String.',
    'Solution : BeginPlay → Set Members in S_Objet (Struct Ref = Fiche, Charge = Break(Fiche).Charge − 30) → Print Break(Fiche).Charge → la même chose une seconde fois.',
  ],
  challenge: 'Remplace un Set Members par Set Fiche (Make S_Objet, seulement Charge relié) : que devient le Nom ?',
  setup: recordProject,
  scenario: [{ wait: 0.3 }],
  checks: [
    {
      id: 'member',
      label: 'S_Objet a un membre Charge (Integer, 100 par défaut)',
      test: (cx) => {
        const m = member(cx.project, 'Charge');
        if (!m) return 'Ajoute à S_Objet un membre Charge (Content Drawer › S_Objet › + Membre).';
        if (m.type.category !== 'int' || m.type.container) return 'Le membre Charge doit être un Integer.';
        return m.defaultValue === 100 ? true : 'Mets la valeur par défaut de Charge à 100 : c’est la charge de départ de toutes les lampes.';
      },
    },
    {
      id: 'values',
      label: 'Charge affichée : 70, puis 40',
      test: (cx) => {
        const n = printedNumbers(cx);
        if (n.join() === '70,40') return true;
        if (n.join() === '70,70') return 'La seconde charge vaut encore 70 : le premier changement n’a pas été gardé dans Fiche. Relie la pin en losange de Set Members au Get Fiche.';
        return `Charge affichée : ${n.join(', ') || 'rien'}. Il fallait 70, puis 40.`;
      },
    },
    {
      id: 'fiche',
      label: 'La fiche garde son Nom et son Poids',
      test: (cx) => {
        const f = ficheOf(cx);
        if (f.nom === 'Lampe' && f.poids === 2) return true;
        return `La fiche vaut maintenant Nom « ${f.nom ?? ''} », Poids ${f.poids ?? 0} : un Make S_Objet a reconstruit toute la structure, et les membres non reliés sont revenus à leur valeur par défaut. Change seulement Charge avec Set Members in.`;
      },
    },
    noRuntimeErrors(),
  ],
  solve: (p) => solveRecord(p, false),
};

/** Reference solution; with `make`, the trap: Set Fiche with a Make that only wires Charge. */
export function solveRecord(p: Project, make: boolean): void {
  const s = p.structs.find((x) => x.name === 'S_Objet')!;
  const charge = addStructMember(p, s.id, T.int)!;
  updateStructMember(p, s.id, charge.id, { name: 'Charge', defaultValue: 100 });
  const b = edit(p, 'BP_Lampe');
  const fiche = b.cls.variables.find((v) => v.name === 'Fiche')!.id;
  let prev = b.node('event.beginPlay', {}, {}, [64, 96]);
  let prevPin = 'then';
  for (const x of [0, 1]) {
    const brk = b.node('struct.break', { struct: 'S_Objet' }, {}, [300 + x * 900, 360]);
    const sub = b.node('math.subtractInt', {}, { b: 30 }, [500 + x * 900, 360]);
    b.link(b.node('var.get', { variable: fiche }, {}, [100 + x * 900, 360]), 'value', brk, 'struct').link(brk, charge.id, sub, 'a');
    let change: string;
    if (make) {
      const mk = b.node('struct.make', { struct: 'S_Objet' }, {}, [600 + x * 900, 300]);
      change = b.node('var.set', { variable: fiche }, {}, [700 + x * 900, 96]);
      b.link(sub, 'result', mk, charge.id).link(mk, 'struct', change, 'value');
    } else {
      change = b.node('struct.setMembers', { struct: 'S_Objet', fields: charge.id }, {}, [700 + x * 900, 96]);
      b.link(b.node('var.get', { variable: fiche }, {}, [600 + x * 900, 300]), 'value', change, 'struct').link(sub, 'result', change, charge.id);
    }
    const brk2 = b.node('struct.break', { struct: 'S_Objet' }, {}, [900 + x * 900, 300]);
    const say = b.node('debug.printString', {}, {}, [1000 + x * 900, 96]);
    b.link(prev, prevPin, change, 'exec').link(change, 'then', say, 'exec');
    b.link(b.node('var.get', { variable: fiche }, {}, [800 + x * 900, 420]), 'value', brk2, 'struct').link(brk2, charge.id, say, 'text');
    prev = say;
    prevPin = 'then';
  }
}

// ------------------------------------------------------------------- D5

function bagProject() {
  const pb = new ProjectBuilder('Débogue D5');
  const { nom, charge } = objectStruct(pb, true);
  const b = pb.blueprint('BP_Chargeur');
  b.component('StaticMesh', 'Socle', { sizeX: 120, sizeY: 60, color: '#065f46' });
  b.component('TextRender', 'Etiquette', { y: -50, text: 'Chargeur' });
  const lamps = b.variable(
    'Lampes',
    T.array(T.struct('S_Objet')),
    ['Torche', 'Frontale', 'Lanterne'].map((n) => ({ [nom.id]: n, [charge!.id]: 10 })),
  );
  const total = b.variable('Total', T.int, 0);
  // BeginPlay → For Each Lampes → Set Members (Charge = 100) on Array Element → then add up the charges.
  const begin = b.node('event.beginPlay', {}, {}, [64, 96]);
  const loop = b.node('flow.forEachLoop', {}, {}, [320, 96]);
  const set = b.node('struct.setMembers', { struct: 'S_Objet', fields: charge!.id }, { [charge!.id]: 100 }, [700, 96]);
  b.link(begin, 'then', loop, 'exec').link(b.node('var.get', { variable: lamps }, {}, [100, 300]), 'value', loop, 'array');
  b.link(loop, 'body', set, 'exec').link(loop, 'element', set, 'struct');
  const sum = b.node('flow.forEachLoop', {}, {}, [700, 520]);
  const brk = b.node('struct.break', { struct: 'S_Objet' }, {}, [900, 760]);
  const add = b.node('math.addInt', {}, {}, [1100, 760]);
  const keep = b.node('var.set', { variable: total }, {}, [1100, 520]);
  const text = b.node('string.append', {}, { in0: 'Charge totale : ' }, [1300, 760]);
  const say = b.node('debug.printString', {}, {}, [1400, 520]);
  b.link(loop, 'completed', sum, 'exec').link(b.node('var.get', { variable: lamps }, {}, [500, 760]), 'value', sum, 'array');
  b.link(sum, 'body', keep, 'exec').link(sum, 'element', brk, 'struct').link(brk, charge!.id, add, 'b');
  b.link(b.node('var.get', { variable: total }, {}, [900, 900]), 'value', add, 'a').link(add, 'result', keep, 'value');
  b.link(sum, 'completed', say, 'exec').link(b.node('var.get', { variable: total }, {}, [1200, 900]), 'value', text, 'in1').link(text, 'result', say, 'text');
  pb.place(b, 0, 0);
  pb.playerStart(-300, 0);
  return pb.project;
}

export const debug5: Lesson = {
  id: 'd5-copie',
  kind: 'debug',
  code: 'D5',
  module: 'Données',
  level: 'confirme',
  number: 0,
  title: 'Le chargeur qui ne charge pas',
  situation:
    'Le chargeur doit remettre à 100 la Charge des trois lampes de sa liste, puis afficher la charge totale. Il affiche 30 : rien n’a été rechargé. Aucune erreur dans l’Output Log.',
  notions: ['Copie', 'Array Element', 'Get (a ref)', 'Set Array Elem'],
  remember:
    'Array Element (For Each) et Get (a copy) donnent une copie : la modifier ne change pas le tableau. Pour changer un élément, Get (a ref) ou Set Array Elem.',
  cards: [
    DEBUG_METHOD,
    {
      title: 'Ce qui est en place',
      body:
        '- La structure **S_Objet** : Nom, Poids, **Charge**.\n- **BP_Chargeur** a un tableau **Lampes** de trois S_Objet (Torche, Frontale, Lanterne), chacune à Charge 10.\n\n' +
        'Au BeginPlay :\n\n' +
        '1. **For Each Loop** sur Lampes → **Set Members in S_Objet** (Charge = 100), Struct Ref = **Array Element**.\n2. Puis un second For Each additionne les charges dans **Total** et affiche « Charge totale : … ».\n\n' +
        'On attend 300. Il affiche **30** : rien n’a été rechargé.',
    },
    {
      title: 'Enquêter',
      body:
        'Mets un **breakpoint** sur Set Members in S_Objet (appui long) et lance Play. À l’arrêt, regarde les valeurs : la Charge passe bien à 100… mais sur quoi ? Puis regarde le tableau Lampes lui-même, dans Details de l’acteur ou par un Print String.\n\n' +
        'Si les deux ne sont pas d’accord, c’est que Set Members n’a pas écrit dans le tableau.',
    },
    {
      title: 'Copie ou référence',
      body:
        'Dans UE, deux nœuds donnent un élément de tableau :\n\n' +
        '- **Array Element** de For Each Loop, et **Get (a copy)** : une **copie** de l’élément. La modifier change la copie, qui est ensuite oubliée. Le tableau ne bouge pas.\n- **Get (a ref)** : l’élément **lui-même**, dans le tableau. Le modifier modifie le tableau.\n\n' +
        '**Set Array Elem** est l’autre voie : il remplace l’élément à une position donnée par une nouvelle valeur.\n\n' +
        'Pour atteindre le bon élément pendant la boucle, For Each Loop donne aussi **Array Index**.',
    },
    {
      title: 'À retenir',
      body:
        'Aucune erreur ne signale ce bug : changer une copie est parfaitement légal. Le symptôme est toujours le même, « le changement ne tient pas ». Quand ça arrive avec un tableau ou une structure, demande-toi si le nœud modifié reçoit l’original ou une copie.',
    },
  ],
  objectives: ['La charge totale affichée est 300.', 'Toujours sans erreur dans l’Output Log.'],
  hints: [
    'Le tableau Lampes lui-même n’est jamais modifié : seule une copie l’est.',
    'Get (a ref) donne l’élément lui-même : relie-le (Target Array = Lampes, Index = Array Index) à la pin en losange de Set Members.',
    'Solution : remplace Array Element par Get (a ref) (Lampes, Array Index) sur la pin Struct Ref de Set Members in S_Objet.',
  ],
  setup: bagProject,
  scenario: [{ wait: 0.3 }],
  checks: [
    {
      id: 'total',
      label: 'Charge totale : 300',
      test: (cx) => {
        if (countPrints(cx, 'Charge totale : 300')) return true;
        if (countPrints(cx, 'Charge totale : 30')) {
          return 'La charge totale reste 30 : Set Members a changé une copie de chaque lampe. Array Element est une copie ; utilise Get (a ref) avec Array Index, ou Set Array Elem.';
        }
        return 'La charge totale n’est pas affichée, ou ne vaut pas 300.';
      },
    },
    noRuntimeErrors(),
  ],
  solve(p) {
    const b = edit(p, 'BP_Chargeur');
    const set = Object.values(b.graph.nodes).find((n) => n.def === 'struct.setMembers')!.id;
    const loop = Object.values(b.graph.nodes).find((n) => n.def === 'flow.forEachLoop' && Object.values(b.graph.links).some((l) => l.from.node === n.id && l.to.node === set))!.id;
    for (const l of Object.values(b.graph.links)) if (l.to.node === set && l.to.pin === 'struct') delete b.graph.links[l.id];
    const lamps = b.cls.variables.find((v) => v.name === 'Lampes')!.id;
    const ref = b.node('array.getRef', {}, {}, [520, 300]);
    b.link(b.node('var.get', { variable: lamps }, {}, [320, 420]), 'value', ref, 'array').link(loop, 'index', ref, 'index').link(ref, 'item', set, 'struct');
  },
};
