/**
 * V6, Avancé: "Complète C5 — Le sac de randonnée" (E13). An inventory of
 * stacks: picking something up first tops up the stacks of that object, then
 * opens new ones while there is room, and hands back what did not fit.
 * Nothing may be lost or made up on the way.
 */
import { addLocalVariable } from '../../operations/localOps';
import { addStruct, addStructMember, updateStructMember } from '../../operations/structOps';
import { T } from '../../types/pins';
import { edit, ProjectBuilder } from '../builder';
import { noRuntimeErrors, notion, usesNode } from '../checks';
import type { CheckContext, Lesson } from '../types';
import { editable, fnDef, fnOf, gap, getVar, goTo, nodeOf, override, ref, setVar } from './kit';

/** Objects on the ground: name, quantity, how many fit in one stack, x. */
const ITEMS: [string, number, number, number][] = [
  ['Eau', 3, 5, 200],
  ['Outil', 1, 1, 400],
  ['Eau', 10, 5, 600],
  ['Outil', 1, 1, 800],
];

function bagProject() {
  const pb = new ProjectBuilder('Le sac de randonnée');
  const p = pb.project;
  const r = addStruct(p, 'S_Pile');
  if (!r.ok) throw new Error(r.reason);
  const what = r.value.members[0];
  updateStructMember(p, r.value.id, what.id, { name: 'Objet', type: T.name });
  const qty = addStructMember(p, r.value.id, T.int)!;
  updateStructMember(p, r.value.id, qty.id, { name: 'Quantite' });

  const bag = pb.blueprint('BP_Sac');
  bag.component('StaticMesh', 'Sac', { shape: 'cylinder', sizeX: 70, sizeY: 70, color: '#166534', blocks: false });
  bag.component('TextRender', 'Etiquette', { y: -60, text: 'Sac' });
  bag.variable('Piles', T.array(T.struct('S_Pile')), [{ [what.id]: 'Eau', [qty.id]: 4 }]);
  bag.variable('Capacite', T.int, 4);
  // Ajouter: the part that opens new stacks is written; topping up the existing ones is the gap.
  const add = fnDef(p, bag, 'Ajouter', [['Objet', T.name], ['Quantite', T.int], ['MaxPile', T.int]], [['Reste', T.int]]);
  const left = addLocalVariable(p, bag.cls, add.graph.id, T.int, 'Restant')!;
  addLocalVariable(p, bag.cls, add.graph.id, T.int, 'Place');
  const f = add.f;
  const getLeft = (at: [number, number]) => f.node('var.getLocal', { variable: left.id }, {}, at);
  const init = f.node('var.setLocal', { variable: left.id }, {}, [300, 0]);
  const loop = f.node('flow.whileLoop', {}, {}, [1500, 0]);
  const some = f.node('math.greaterInt', {}, { b: 0 }, [1140, 240]);
  const count = f.node('array.length', {}, {}, [1000, 380]);
  const room = f.node('math.lessInt', {}, {}, [1160, 380]);
  const go = f.node('logic.and', {}, {}, [1320, 280]);
  const size = f.node('math.minInt', {}, {}, [1640, 420]);
  const pile = f.node('struct.make', { struct: 'S_Pile' }, {}, [1800, 300]);
  const push = f.node('array.add', {}, {}, [1960, 60]);
  const less = f.node('math.subtractInt', {}, {}, [2100, 420]);
  const spend = f.node('var.setLocal', { variable: left.id }, {}, [2280, 60]);
  f.link(add.entry, 'then', init, 'exec').link(add.entry, add.pin.Quantite, init, 'value').link(init, 'then', loop, 'exec');
  f.link(getLeft([980, 250]), 'value', some, 'a').link(getVar(f, 'Piles', [840, 390]), 'value', count, 'array').link(count, 'result', room, 'a').link(getVar(f, 'Capacite', [1000, 470]), 'value', room, 'b');
  f.link(some, 'result', go, 'a').link(room, 'result', go, 'b').link(go, 'result', loop, 'condition');
  f.link(add.entry, add.pin.MaxPile, size, 'a').link(getLeft([1480, 500]), 'value', size, 'b');
  f.link(add.entry, add.pin.Objet, pile, what.id).link(size, 'result', pile, qty.id);
  f.link(loop, 'body', push, 'exec').link(getVar(f, 'Piles', [1800, 180]), 'value', push, 'array').link(pile, 'struct', push, 'item');
  f.link(push, 'then', spend, 'exec').link(getLeft([1940, 440]), 'value', less, 'a').link(size, 'result', less, 'b').link(less, 'result', spend, 'value');
  f.graph.nodes[add.ret].x = 2000;
  f.graph.nodes[add.ret].y = -200;
  f.link(loop, 'completed', add.ret, 'exec').link(getLeft([1800, -100]), 'value', add.ret, add.pin.Reste);
  gap(f, 'À écrire : compléter d’abord les piles du même objet', [560, -80], 380, 300);

  const item = pb.blueprint('BP_Objet');
  item.component('StaticMesh', 'Objet', { sizeX: 40, sizeY: 40, color: '#0ea5e9', blocks: false });
  item.component('BoxCollision', 'Zone', { sizeX: 90, sizeY: 90 });
  const name = editable(item, 'Nom', T.name, '');
  const amount = editable(item, 'Quantite', T.int, 1);
  const max = editable(item, 'MaxPile', T.int, 1);
  const where = editable(item, 'Sac', T.object('BP_Sac'));
  const over = item.node('event.actorBeginOverlap', {}, {}, [64, 96]);
  const give = item.node('call.function', { graph: add.graph.id, owner: bag.cls.id }, {}, [400, 96]);
  const keep = setVar(item, 'Quantite', [780, 96]);
  const none = item.node('math.equalInt', {}, { b: 0 }, [960, 300]);
  const empty = item.node('flow.branch', {}, {}, [1100, 96]);
  item.link(over, 'then', give, 'exec').link(getVar(item, 'Sac', [200, 260]), 'value', give, 'target');
  item.link(getVar(item, 'Nom', [200, 330]), 'value', give, add.pin.Objet).link(getVar(item, 'Quantite', [200, 400]), 'value', give, add.pin.Quantite).link(getVar(item, 'MaxPile', [200, 470]), 'value', give, add.pin.MaxPile);
  item.link(give, 'then', keep, 'exec').link(give, add.pin.Reste, keep, 'value').link(keep, 'then', empty, 'exec').link(keep, 'out', none, 'a').link(none, 'result', empty, 'condition');
  item.link(empty, 'true', item.node('actor.destroy', {}, {}, [1400, 96]), 'exec');

  const b = pb.place(bag, 0, -220);
  for (const [n, q, m, x] of ITEMS) {
    const a = pb.place(item, x, 0);
    override(pb, a, name, n);
    override(pb, a, amount, q);
    override(pb, a, max, m);
    override(pb, a, where, ref(b));
  }
  pb.playerStart(0, 0);
  return pb.project;
}

function piles(cx: CheckContext): string[] {
  const s = cx.project.structs.find((x) => x.name === 'S_Pile');
  const what = s?.members.find((m) => m.name === 'Objet')?.id ?? '';
  const qty = s?.members.find((m) => m.name === 'Quantite')?.id ?? '';
  const list = (cx.variable('BP_Sac', 'Piles') as Record<string, unknown>[] | undefined) ?? [];
  return list.map((x) => `${String(x[what] ?? '?')} ×${Number(x[qty] ?? 0)}`);
}
const leftOn = (cx: CheckContext, label: string) => (cx.actor(label)?.destroyed === false ? Number(cx.variable(label, 'Quantite')) : 0);

function bagIs(id: string, at: string | undefined, label: string, want: string[], why: string) {
  return {
    id,
    label,
    at,
    test: (cx: CheckContext) => {
      const got = piles(cx);
      return got.join() === want.join() ? true : `Le sac contient : ${got.join(', ') || 'rien'}. Attendu : ${want.join(', ')}. ${why}`;
    },
  };
}

export const complete5: Lesson = {
  id: 'c5-sac',
  kind: 'complete',
  code: 'C5',
  module: 'Données',
  level: 'avance',
  number: 0,
  title: 'Le sac de randonnée',
  situation:
    'Le sac a 4 emplacements et contient déjà une pile de 4 gourdes d’eau (5 au plus par pile ; un outil ne s’empile pas). Le joueur marche sur 3 gourdes, un outil, 10 gourdes, puis un second outil. Aujourd’hui les 3 gourdes ouvrent une nouvelle pile au lieu de compléter celle de 4. La fonction Ajouter doit d’abord compléter les piles existantes.',
  notions: ['Tableau (Array)', 'Structure', 'Get (a ref)', 'Set Members in', 'For Each Loop', 'Variable locale', 'Min (Integer)', 'Rien perdu, rien créé'],
  remember:
    'Une fonction qui déplace des quantités renvoie ce qu’elle n’a pas pu placer : celui qui l’appelle sait alors quoi garder, et rien ne se perd. Pour changer un élément d’un tableau de structures, c’est Get (a ref) puis Set Members in : un Get (a copy) ou l’Array Element d’une boucle ne modifient qu’une copie.',
  cards: [
    {
      title: 'Le modèle',
      body:
        'Une **pile** est une structure **S_Pile** : `Objet` (Name) et `Quantite` (Integer). Le sac, **BP_Sac**, a un tableau `Piles` et une `Capacite` de 4 piles.\n\n' +
        'Sa fonction **Ajouter** reçoit `Objet`, `Quantite` et `MaxPile` (combien de cet objet tiennent dans une pile : 5 pour l’eau, 1 pour l’outil) et renvoie **Reste** : ce qui n’est pas entré.\n\n' +
        'Chaque **BP_Objet** au sol appelle Ajouter quand le joueur marche dessus, garde le Reste comme nouvelle quantité, et se détruit seulement s’il ne reste rien. C’est déjà écrit : ouvre-le pour voir comment on se sert d’une fonction qui « rend la monnaie ».',
    },
    {
      title: 'Ce que fait déjà Ajouter',
      body:
        'Ouvre **Ajouter** dans BP_Sac. Deux **variables locales** (My Blueprint › Local Variables) : `Restant`, ce qu’il reste à placer, et `Place`, pour toi.\n\n' +
        'Au début : `Restant = Quantite`. Puis un **While Loop** : tant qu’il reste quelque chose **et** qu’il y a un emplacement libre (`Length (Piles) < Capacite`), il ouvre une pile de `Min (MaxPile, Restant)` (**Make S_Pile**, **Add**) et retire cette quantité de `Restant`. À la fin, le **Return Node** renvoie `Restant` dans la sortie **Reste**.\n\n' +
        '**Min (Integer)** donne le plus petit de deux nombres : « autant que possible, sans dépasser ce qu’il reste ».\n\n' +
        'Il manque l’étape d’avant, dans le cadre jaune : entre le Set de `Restant` et le While Loop.',
    },
    {
      title: 'Compléter une pile : le calcul',
      body:
        'Pour chaque pile du sac (**For Each Loop** sur `Piles`), **Break S_Pile** sur Array Element donne son `Objet` et sa `Quantite`.\n\n' +
        'La pile nous intéresse si c’est **le même objet** (**Equal (Name)**) **et** qu’elle n’est **pas pleine** (`Quantite < MaxPile`). Un **AND**, un **Branch**.\n\n' +
        'Combien y mettre ? `Min (MaxPile − Quantite, Restant)` : la place libre dans la pile, sans dépasser ce qu’il reste. Range ce nombre dans la locale **`Place`** tout de suite (Set), et sers-toi de `Place` pour la suite.\n\n' +
        'Pourquoi le ranger ? Les nœuds verts sont **recalculés à chaque lecture**. Dès que la pile ou `Restant` auront changé, le même calcul donnerait un autre résultat.',
    },
    {
      title: 'Compléter une pile : l’écriture',
      body:
        'Array Element est une **copie** de la pile : la modifier ne change pas le tableau (c’était le bug de « Le chargeur qui ne charge pas »).\n\n' +
        '**Get (a ref)** (Utilities › Array), avec `Piles` et **Array Index** de la boucle, donne la pile **elle-même** : sa sortie est en losange.\n\n' +
        '**Set Members in S_Pile** : relie ce losange à **Struct Ref**. Dans ses Details, coche `Quantite` pour faire apparaître la pin, et donne-lui `Quantite + Place`.\n\n' +
        'Puis `Restant = Restant − Place`. Sur **Completed** de la boucle, rejoins le While Loop : ce qui reste après avoir complété les piles ouvre de nouvelles piles, comme avant.',
    },
    {
      title: 'Vérifier comme un comptable',
      body:
        'Le test fait le total de l’eau avant et après : 4 dans le sac, 3 et 10 au sol, soit 17. À la fin il doit toujours y en avoir 17, réparties entre le sac et le sol.\n\n' +
        'C’est le meilleur réflexe pour ce genre de système : une quantité qui se **conserve**. Si le total change, un chemin du graphe ajoute sans retirer, ou l’inverse.\n\n' +
        'Suis le troisième ramassage (10 gourdes) à la main : la pile de 2 en prend 3, une nouvelle pile en prend 5, le sac est plein, il en reste 2 au sol.',
    },
  ],
  objectives: [
    'Dans Ajouter, avant le While Loop : pour chaque pile du même Objet et pas pleine, calcule Place = Min (MaxPile − Quantite, Restant).',
    'Ajoute Place à la Quantite de cette pile (Get (a ref), Set Members in S_Pile) et retire Place de Restant.',
    'Touche Vérifier : 3 gourdes, un outil, 10 gourdes, un outil.',
  ],
  hints: [
    'La boucle s’insère entre le Set de Restant et le While Loop : Set Restant → For Each Loop ; Completed → While Loop.',
    'Nœuds : For Each Loop, Get Piles, Break S_Pile, Equal (Name), Less (Integer), AND Boolean, Branch, Subtract (Integer), Min (Integer), Set Place, Get (a ref), Set Members in S_Pile (Quantite cochée), Add (Integer), Set Restant.',
    'Solution : For Each (Piles) → Branch (Objet == Objet de la pile AND Quantite < MaxPile) → Set Place = Min (MaxPile − Quantite, Restant) → Set Members in S_Pile (Struct Ref = Get (a ref) (Piles, Array Index), Quantite = Quantite + Place) → Set Restant = Restant − Place. Completed → While Loop.',
  ],
  challenge: 'Remplace For Each Loop par For Each Loop with Break et sors de la boucle dès que Restant vaut 0 : inutile de regarder les piles suivantes.',
  setup: bagProject,
  scenario: [{ wait: 0.2 }, ...goTo(200, 0), { checkpoint: 'eau' }, ...goTo(400, 0), { checkpoint: 'outil' }, ...goTo(600, 0), { checkpoint: 'plein' }, ...goTo(800, 0)],
  checks: [
    bagIs('top-up', 'eau', '3 gourdes : la pile de 4 passe à 5, le reste ouvre une pile de 2', ['Eau ×5', 'Eau ×2'], 'Les gourdes doivent d’abord compléter la pile d’eau qui n’est pas pleine.'),
    bagIs('tool', 'outil', 'L’outil ouvre sa propre pile', ['Eau ×5', 'Eau ×2', 'Outil ×1'], 'Un outil ne complète pas une pile d’eau : compare l’Objet de la pile à celui qu’on ajoute.'),
    bagIs('full', 'plein', '10 gourdes : 3 complètent la pile de 2, 5 ouvrent la dernière pile', ['Eau ×5', 'Eau ×5', 'Outil ×1', 'Eau ×5'], 'Ce qui reste après avoir complété les piles doit encore passer par le While Loop.'),
    {
      id: 'left',
      label: 'Il reste 2 gourdes au sol, et le second outil n’entre pas',
      test: (cx) => {
        const water = leftOn(cx, 'BP_Objet3');
        const tool = leftOn(cx, 'BP_Objet4');
        if (water !== 2) return `Il reste ${water} gourde(s) au sol au lieu de 2 : Restant doit diminuer de ce qui a complété les piles.`;
        return tool === 1 ? true : 'Le second outil a disparu alors que le sac est plein.';
      },
    },
    {
      id: 'total',
      label: 'Rien perdu, rien créé : 17 gourdes au total',
      test: (cx) => {
        const inBag = piles(cx).filter((x) => x.startsWith('Eau')).reduce((n, x) => n + Number(x.split('×')[1]), 0);
        const total = inBag + leftOn(cx, 'BP_Objet') + leftOn(cx, 'BP_Objet3');
        return total === 17 ? true : `Il y a ${total} gourdes au total (sac et sol) au lieu de 17 : une quantité est ajoutée au sac sans être retirée de Restant, ou l’inverse.`;
      },
    },
    notion(usesNode('ref', 'BP_Sac', ['array.getRef', 'array.set'], 'La pile est modifiée dans le tableau, pas sur une copie', 'Modifie la pile du tableau avec Get (a ref) et Set Members in (ou Set Array Elem).')),
    noRuntimeErrors(),
  ],
  solve(p) {
    const bag = edit(p, 'BP_Sac');
    const add = fnOf(bag, 'Ajouter');
    const f = add.f;
    const g = add.graph;
    const s = p.structs.find((x) => x.name === 'S_Pile')!;
    const what = s.members.find((m) => m.name === 'Objet')!.id;
    const qty = s.members.find((m) => m.name === 'Quantite')!.id;
    const local = (name: string) => g.fn!.locals!.find((l) => l.name === name)!.id;
    const getL = (name: string, at: [number, number]) => f.node('var.getLocal', { variable: local(name) }, {}, at);
    const init = Object.values(g.nodes).find((n) => n.def === 'var.setLocal' && Object.values(g.links).some((l) => l.from.node === add.entry && l.to.node === n.id))!.id;
    const loop = nodeOf(g, 'flow.whileLoop');
    for (const l of Object.values(g.links)) if (l.from.node === init && l.from.pin === 'then') delete g.links[l.id];
    const each = f.node('flow.forEachLoop', {}, {}, [580, 0]);
    const pile = f.node('struct.break', { struct: 'S_Pile' }, {}, [580, 300]);
    const same = f.node('name.equal', {}, {}, [760, 300]);
    const notFull = f.node('math.lessInt', {}, {}, [760, 420]);
    const ok = f.node('logic.and', {}, {}, [900, 340]);
    const br = f.node('flow.branch', {}, {}, [860, 60]);
    const free = f.node('math.subtractInt', {}, {}, [760, 540]);
    const fit = f.node('math.minInt', {}, {}, [900, 560]);
    const keep = f.node('var.setLocal', { variable: local('Place') }, {}, [1040, 60]);
    const slot = f.node('array.getRef', {}, {}, [1040, 700]);
    const more = f.node('math.addInt', {}, {}, [1100, 820]);
    const write = f.node('struct.setMembers', { struct: 'S_Pile', fields: qty }, {}, [1260, 600]);
    const less = f.node('math.subtractInt', {}, {}, [1260, 900]);
    const spend = f.node('var.setLocal', { variable: local('Restant') }, {}, [1440, 760]);
    f.link(init, 'then', each, 'exec').link(getVar(f, 'Piles', [420, 200]), 'value', each, 'array').link(each, 'completed', loop, 'exec');
    f.link(each, 'element', pile, 'struct').link(pile, what, same, 'a').link(add.entry, add.pin.Objet, same, 'b').link(pile, qty, notFull, 'a').link(add.entry, add.pin.MaxPile, notFull, 'b');
    f.link(same, 'result', ok, 'a').link(notFull, 'result', ok, 'b').link(each, 'body', br, 'exec').link(ok, 'result', br, 'condition');
    f.link(add.entry, add.pin.MaxPile, free, 'a').link(pile, qty, free, 'b').link(free, 'result', fit, 'a').link(getL('Restant', [740, 640]), 'value', fit, 'b');
    f.link(br, 'true', keep, 'exec').link(fit, 'result', keep, 'value');
    f.link(getVar(f, 'Piles', [880, 710]), 'value', slot, 'array').link(each, 'index', slot, 'index').link(slot, 'item', write, 'struct');
    f.link(pile, qty, more, 'a').link(getL('Place', [940, 860]), 'value', more, 'b').link(more, 'result', write, qty);
    f.link(keep, 'then', write, 'exec').link(write, 'then', spend, 'exec');
    f.link(getL('Restant', [1100, 920]), 'value', less, 'a').link(getL('Place', [1100, 990]), 'value', less, 'b').link(less, 'result', spend, 'value');
  },
};
