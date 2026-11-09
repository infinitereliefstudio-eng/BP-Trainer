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
      title: 'Une structure',
      body:
        'Ouvre **S_Objet** dans le Content Browser (☰ du menu ⋮). Une structure regroupe plusieurs valeurs sous un seul type : une variable S_Objet contient un Nom **et** un Poids.\n\n' +
        'Touche **+ Membre** pour ajouter `Charge` : type Integer, valeur par défaut 100. Toutes les variables S_Objet du projet l’ont aussitôt.',
    },
    {
      title: 'Lire et changer',
      body:
        '**Break S_Objet** sépare une valeur en ses membres, pour les lire. **Set Members in S_Objet** en change certains : coche dans Details ceux à changer, ils ont alors une pin. Relie sa pin en losange au **Get Fiche** : c’est la variable qui change.',
    },
    {
      title: 'Le piège de Make',
      body:
        '**Make S_Objet** construit une structure neuve. Si tu ne relies que Charge, Nom et Poids prennent leur valeur par défaut : vide et 0. Un Set Fiche avec ce Make efface donc le nom de la lampe.',
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
        if (!m) return 'Ajoute à S_Objet un membre Charge (Content Browser › S_Objet › + Membre).';
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
    {
      title: 'Enquêter',
      body:
        'Mets un breakpoint sur **Set Members in S_Objet** et regarde les valeurs : la Charge passe bien à 100… sur quoi ?\n\n' +
        'Dans UE, **Array Element** de For Each Loop est une **copie** de l’élément, comme **Get (a copy)**. Set Members la change, puis elle est oubliée.',
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
