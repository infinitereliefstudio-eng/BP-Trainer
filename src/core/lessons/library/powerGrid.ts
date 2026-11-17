/**
 * V6, Avancé: "Le réseau en boucle" (E42). Which nodes of a circuit can the
 * source reach? A breadth-first walk with a work list and a Set of the
 * nodes already seen: without the Set, the loop A–B–C never ends.
 */
import { T } from '../../types/pins';
import { edit, ProjectBuilder } from '../builder';
import { noRuntimeErrors, notion, usesNode } from '../checks';
import type { CheckContext, Lesson } from '../types';
import { editable, fnDef, fnOf, getVar, nodeOf, override, ref, say, setVar, tap, varId, SHARED_KEYS } from './kit';

/** Position of each node; N1 is the source's start, N4 the switch, N6 stands alone. */
const NODES: [string, number, number][] = [
  ['N1', -400, 0],
  ['N2', -130, -200],
  ['N3', -130, 200],
  ['N4', 150, 200],
  ['N5', 420, -200],
  ['N6', 420, 20],
  ['N7', 420, 220],
];
/** Wires, by node index. 0-1-2 is a loop; 4 is reached two ways. */
const WIRES: [number, number][] = [
  [0, 1],
  [1, 2],
  [2, 0],
  [2, 3],
  [3, 4],
  [1, 4],
  [3, 6],
];

function gridProject() {
  const pb = new ProjectBuilder('Le réseau en boucle');
  const p = pb.project;
  const node = pb.blueprint('BP_Noeud');
  node.component('StaticMesh', 'Borne', { shape: 'cylinder', sizeX: 44, sizeY: 44, color: '#475569', blocks: false });
  node.component('PointLight', 'Voyant', { visible: false, radius: 150, color: '#fde047' });
  node.component('TextRender', 'Etiquette', { y: -44, text: '' });
  node.cls.autoReceiveInput = true;
  const name = editable(node, 'Nom', T.string, '');
  const links = editable(node, 'Voisins', T.array(T.object('BP_Noeud')), []);
  editable(node, 'Ferme', T.bool, true);
  const switchable = editable(node, 'Commutable', T.bool, false);
  node.variable('Alimente', T.bool, false);
  // SetAlimente: changes the light and says so only when the state really changes.
  const power = fnDef(p, node, 'SetAlimente', [['Etat', T.bool]], [], false);
  for (const l of Object.values(power.graph.links)) delete power.graph.links[l.id];
  const f = power.f;
  const differs = f.node('logic.xor', {}, {}, [200, 200]);
  const changed = f.node('flow.branch', {}, {}, [360, 0]);
  const keep = setVar(f, 'Alimente', [640, 0]);
  const light = f.node('component.setVisibility', {}, {}, [920, 0]);
  const which = f.node('flow.branch', {}, {}, [1220, 0]);
  f.link(power.entry, 'then', changed, 'exec').link(power.entry, power.pin.Etat, differs, 'a').link(getVar(f, 'Alimente', [40, 260]), 'value', differs, 'b').link(differs, 'result', changed, 'condition');
  f.link(changed, 'true', keep, 'exec').link(power.entry, power.pin.Etat, keep, 'value').link(keep, 'then', light, 'exec').link(keep, 'out', light, 'visible').target('Voyant', light);
  f.link(light, 'then', which, 'exec').link(keep, 'out', which, 'condition');
  for (const [pin, word, y] of [
    ['true', ' : alimenté', -120],
    ['false', ' : coupé', 160],
  ] as const) {
    const text = f.node('string.append', {}, { in1: word }, [1400, y + 180]);
    const tell = say(f, [1560, y]);
    f.link(which, pin, tell, 'exec').link(getVar(f, 'Nom', [1240, y + 200]), 'value', text, 'in0').link(text, 'result', tell, 'text');
  }
  // Its name on its label, from the Construction Script: visible in the level before Play.
  const cs = node.construction();
  const label = cs.b.node('component.setText', {}, {}, [360, 96]);
  cs.b.link(cs.entry, 'then', label, 'exec').target('Etiquette', label).link(getVar(cs.b, 'Nom', [160, 300]), 'value', label, 'value');
  // F opens or closes the switchable node.
  const key = node.node('event.inputKey', { key: 'F', consumeInput: false }, {}, [64, 96]);
  const can = node.node('flow.branch', {}, {}, [340, 96]);
  const flip = setVar(node, 'Ferme', [640, 96]);
  const not = node.node('logic.not', {}, {}, [480, 300]);
  node.link(key, 'pressed', can, 'exec').link(getVar(node, 'Commutable', [160, 280]), 'value', can, 'condition').link(can, 'true', flip, 'exec');
  node.link(getVar(node, 'Ferme', [320, 310]), 'value', not, 'a').link(not, 'result', flip, 'value');

  const src = pb.blueprint('BP_Source');
  src.component('StaticMesh', 'Groupe', { sizeX: 90, sizeY: 70, color: '#15803d', blocks: false });
  src.component('TextRender', 'Etiquette', { y: -60, text: 'Source' });
  src.cls.autoReceiveInput = true;
  const start = editable(src, 'Depart', T.object('BP_Noeud'));
  src.variable('Tous', T.array(T.object('BP_Noeud')), []);
  src.variable('Visites', T.set(T.object('BP_Noeud')), []);
  src.variable('AFaire', T.array(T.object('BP_Noeud')), []);
  src.variable('Courant', T.object('BP_Noeud'));
  const e = src.node('event.inputKey', { key: 'E' }, {}, [64, 96]);
  src.node('event.custom', { name: 'Recalculer' }, {}, [64, 360]);
  const go = src.node('call.custom', { event: 'Recalculer' }, {}, [360, 96]);
  src.link(e, 'pressed', go, 'exec');
  // The list of every node, found once at the start.
  const begin = src.node('event.beginPlay', {}, {}, [64, -220]);
  const find = src.node('actor.getAllOfClass', {}, { class: node.cls.id }, [360, -220]);
  const list = setVar(src, 'Tous', [760, -220]);
  src.link(begin, 'then', find, 'exec').link(find, 'then', list, 'exec').link(find, 'actors', list, 'value');

  const ids = NODES.map(([n, x, y]) => {
    const id = pb.place(node, x, y);
    override(pb, id, name, n);
    return id;
  });
  ids.forEach((id, i) => {
    const near = WIRES.filter(([a, b]) => a === i || b === i).map(([a, b]) => ref(ids[a === i ? b : a]));
    override(pb, id, links, near);
  });
  override(pb, ids[3], switchable, true);
  const s = pb.place(src, -620, 0);
  override(pb, s, start, ref(ids[0]));
  pb.playerStart(-620, 260);
  return pb.project;
}

const LABELS = NODES.map((_, i) => (i ? `BP_Noeud${i + 1}` : 'BP_Noeud'));
const powered = (cx: CheckContext) => LABELS.map((l) => cx.variable(l, 'Alimente') === true);
const names = (flags: boolean[]) => flags.map((on, i) => (on ? NODES[i][0] : '')).filter(Boolean).join(', ') || 'aucun';

function state(id: string, at: string | undefined, label: string, want: boolean[], why: string) {
  return {
    id,
    label,
    at,
    test: (cx: CheckContext) => {
      const errs = cx.sim.log.filter((l) => l.level === 'error');
      if (errs.some((l) => /infinite|boucle/i.test(l.text))) {
        return 'Le jeu s’est arrêté sur « Infinite loop detected » : N1, N2 et N3 forment une boucle, et le parcours y tourne sans fin. Avant d’ajouter un voisin à la liste de travail, vérifie qu’il n’est pas déjà dans Visites.';
      }
      const got = powered(cx);
      if (got.every((v, i) => v === want[i])) return true;
      return `Alimentés : ${names(got)}. Attendu : ${names(want)}. ${why}`;
    },
  };
}

const ALL_BUT_6 = [true, true, true, true, true, false, true];
const CUT = [true, true, true, false, true, false, false];

export const lessonGrid: Lesson = {
  id: 'l-reseau',
  module: 'Données',
  level: 'avance',
  number: 0,
  title: 'Le réseau en boucle',
  situation:
    'Sept bornes reliées par des câbles, une source branchée sur N1. E recalcule le réseau : une borne s’allume si le courant peut l’atteindre depuis la source, de borne fermée en borne fermée. N1, N2 et N3 forment une boucle, N6 n’est reliée à rien, et F ouvre ou ferme l’interrupteur N4. L’événement Recalculer est vide.',
  notions: ['Parcours de graphe', 'While Loop', 'Set', 'Contains', 'File de travail', 'Variable d’un autre Blueprint', 'Infinite loop detected'],
  remember:
    'Pour parcourir un réseau : une liste de travail (ce qu’il reste à visiter) et un Set des éléments déjà vus. On ne remet jamais dans la liste un élément déjà vu : c’est ce qui garantit que le parcours se termine, même si le réseau boucle.',
  cards: [
    {
      title: 'La situation',
      body:
        'Chaque **BP_Noeud** connaît ses `Voisins` (un tableau de références, réglé dans le niveau : les flèches du niveau les montrent hors Play), sait s’il est `Ferme` (il laisse passer le courant) et s’il est `Alimente`.\n\n' +
        'Sa fonction **SetAlimente** (déjà écrite) allume ou éteint son voyant, et affiche « N3 : alimenté » ou « N3 : coupé », **seulement si son état change**.\n\n' +
        '**BP_Source** connaît `Depart` (la borne N1) et `Tous` (les sept bornes, trouvées une fois au BeginPlay). Trois variables de travail l’attendent, vides : `Visites` (un **Set** de bornes), `AFaire` (un **Array** de bornes) et `Courant` (une borne).\n\n' +
        'Ton travail : l’événement **Recalculer** de BP_Source.\n\n' + SHARED_KEYS,
    },
    {
      title: 'L’idée du parcours',
      body:
        'On part de la borne de départ et on avance de proche en proche :\n\n' +
        '1. Vide `Visites` et `AFaire` (**Clear**). Si `Depart` est fermée : ajoute-la aux deux.\n' +
        '2. **Tant que** `AFaire` n’est pas vide : prends sa première borne (`Courant`), retire-la de la liste, et regarde chacun de ses voisins.\n' +
        '3. Un voisin **fermé** et **pas encore dans Visites** : ajoute-le à `Visites` et à `AFaire`. Il sera traité à son tour.\n' +
        '4. Quand `AFaire` est vide, `Visites` contient exactement les bornes atteignables.\n\n' +
        'Fais-le d’abord sur papier avec N1, N2, N3 : que contient `AFaire` après chaque tour ?',
    },
    {
      title: 'Les nœuds du parcours',
      body:
        '**While Loop** : exécute **Loop Body** tant que **Condition** est vraie, puis **Completed**. La condition est relue avant chaque tour : ici `Length (AFaire) > 0`.\n\n' +
        '**Get (a copy)** avec Index 0 : la première borne de `AFaire`. Range-la dans `Courant` (Set), **puis** fais **Remove Index** 0 sur `AFaire`.\n\n' +
        '**For Each Loop** sur les `Voisins` de `Courant` : tire un fil depuis Get Courant et cherche `Voisins`, c’est la lecture d’une variable d’un autre acteur. Même chose pour `Ferme` sur chaque voisin (Array Element).\n\n' +
        '**Contains** (Utilities › Set) : vrai si la borne est déjà dans `Visites`. Il te faut son contraire : **NOT Boolean**, puis **AND Boolean** avec `Ferme`.\n\n' +
        '**Add** existe pour les Set et pour les Array : `Visites` est un Set (sans doublon), `AFaire` un Array.',
    },
    {
      title: 'Pourquoi le Set est vital',
      body:
        'N1 a pour voisine N2, qui a pour voisine N1. Sans mémoire de ce qui a été vu, N1 ajoute N2, N2 rajoute N1, N1 rajoute N2… `AFaire` ne se vide jamais et le While Loop tourne jusqu’à ce que le moteur l’arrête : **Infinite loop detected**.\n\n' +
        'Avec « pas déjà dans Visites », chaque borne entre dans `AFaire` **une seule fois** : au pire sept tours, quel que soit le câblage.\n\n' +
        'Dans UE, la limite se règle dans Project Settings (Maximum Loop Iteration Count). La monter ne répare rien : une boucle qui n’a pas de raison de finir ne finira pas.',
    },
    {
      title: 'Appliquer le résultat',
      body:
        'Sur **Completed** du While Loop : un **For Each Loop** sur `Tous`, et pour chaque borne **SetAlimente**, avec pour `Etat` : « est-elle dans Visites ? » (Contains).\n\n' +
        'On **calcule d’abord, on applique ensuite**. Éteindre toutes les bornes puis rallumer les bonnes donnerait le même état final, mais chaque borne annoncerait « coupé » puis « alimenté » à chaque calcul. Ici, seules celles dont l’état change vraiment préviennent.\n\n' +
        'N’oublie pas le cas où `Depart` est ouverte : rien n’est atteignable, mais il faut tout de même passer par cette dernière boucle pour tout éteindre.',
    },
  ],
  objectives: [
    'E : les bornes atteignables depuis N1 s’allument (N1, N2, N3, N4, N5, N7), N6 reste éteinte, sans boucle infinie.',
    'Un second E sans changement n’annonce rien.',
    'F ouvre N4 puis E : N4 et N7 s’éteignent, N5 reste alimentée par N2.',
    'F referme N4 puis E : tout se rallume.',
  ],
  hints: [
    'Avance par étapes et lance Play à chaque fois, avec ☷ (Outliner) ouvert sur BP_Source : d’abord N1 dans Visites, puis ses voisines, puis le While Loop.',
    'Nœuds : Clear (Set et Array), Branch, Add (Set et Array), While Loop, Length, Greater (Integer), Get (a copy), Set Courant, Remove Index, For Each Loop (deux), Get Voisins et Get Ferme sur une autre borne, Contains, NOT Boolean, AND Boolean, SetAlimente.',
    'Solution : Recalculer → Clear Visites → Clear AFaire → Branch (Depart.Ferme) → True : Add Depart à Visites et à AFaire → While (Length (AFaire) > 0) : Courant = AFaire[0] → Remove Index 0 → For Each (Courant.Voisins) : Branch (Ferme AND NOT Contains (Visites)) → Add à Visites → Add à AFaire. Completed (et False du premier Branch) → For Each (Tous) : SetAlimente (Contains (Visites)).',
  ],
  challenge: 'Ajoute à BP_Source un Integer Distance et affiche, pour chaque borne alimentée, en combien de câbles le courant l’atteint : une Map de BP_Noeud vers Integer, remplie au moment où la borne entre dans Visites.',
  setup: gridProject,
  scenario: [{ wait: 0.2 }, ...tap('E'), { checkpoint: 'un' }, ...tap('E'), { checkpoint: 'deux' }, ...tap('F'), ...tap('E'), { checkpoint: 'coupe' }, ...tap('F'), ...tap('E')],
  checks: [
    state('reach', 'un', 'E : N1, N2, N3, N4, N5 et N7 alimentées, N6 non', ALL_BUT_6, 'Une borne est alimentée si on peut la rejoindre depuis N1 en passant de voisine fermée en voisine fermée.'),
    {
      id: 'quiet',
      label: 'Un second E sans changement n’annonce rien',
      at: 'deux',
      test: (cx) => {
        const n = cx.prints().length;
        return n === 6 ? true : n > 6 ? `${n} annonces après deux calculs identiques, au lieu de 6 : n’éteins pas tout avant de rallumer. Calcule Visites, puis appelle SetAlimente une fois par borne.` : `${n} annonce(s) au lieu de 6 après le premier calcul.`;
      },
    },
    state('cut', 'coupe', 'N4 ouverte : N4 et N7 coupées, N5 toujours alimentée par N2', CUT, 'Une borne ouverte ne transmet rien et n’est pas alimentée ; N5 garde un chemin par N2.'),
    state('back', undefined, 'N4 refermée : tout se rallume', ALL_BUT_6, 'Chaque calcul repart de zéro : Visites et AFaire doivent être vidées au début de Recalculer.'),
    notion(usesNode('seen', 'BP_Source', ['set.contains'], 'Le parcours se souvient des bornes déjà vues', 'Teste « déjà dans Visites ? » (Contains) avant d’ajouter une borne à la liste de travail.')),
    noRuntimeErrors(),
  ],
  solve(p) {
    const b = edit(p, 'BP_Source');
    const node = edit(p, 'BP_Noeud');
    const ext = (name: string, at: [number, number]) => b.node('var.getExternal', { owner: node.cls.id, variable: varId(node, name) }, {}, at);
    const g = (name: string, at: [number, number]) => getVar(b, name, at);
    const start = nodeOf(b.graph, 'event.custom');
    const clearSeen = b.node('set.clear', {}, {}, [340, 360]);
    const clearTodo = b.node('array.clear', {}, {}, [640, 360]);
    const open = b.node('flow.branch', {}, {}, [940, 360]);
    const startClosed = ext('Ferme', [760, 560]);
    const seeStart = b.node('set.add', {}, {}, [1240, 360]);
    const queueStart = b.node('array.add', {}, {}, [1540, 360]);
    b.link(start, 'then', clearSeen, 'exec').link(g('Visites', [180, 540]), 'value', clearSeen, 'set');
    b.link(clearSeen, 'then', clearTodo, 'exec').link(g('AFaire', [480, 540]), 'value', clearTodo, 'array');
    b.link(clearTodo, 'then', open, 'exec').link(g('Depart', [600, 570]), 'value', startClosed, 'target').link(startClosed, 'value', open, 'condition');
    b.link(open, 'true', seeStart, 'exec').link(g('Visites', [1080, 540]), 'value', seeStart, 'set').link(g('Depart', [1080, 620]), 'value', seeStart, 'item');
    b.link(seeStart, 'then', queueStart, 'exec').link(g('AFaire', [1380, 540]), 'value', queueStart, 'array').link(g('Depart', [1380, 620]), 'value', queueStart, 'item');
    // While there is work: take the first, look at its neighbours.
    const loop = b.node('flow.whileLoop', {}, {}, [1860, 360]);
    const left = b.node('array.length', {}, {}, [1560, 760]);
    const more = b.node('math.greaterInt', {}, { b: 0 }, [1720, 760]);
    const first = b.node('array.get', {}, { index: 0 }, [2040, 760]);
    const take = setVar(b, 'Courant', [2200, 480]);
    const pop = b.node('array.removeIndex', {}, { index: 0 }, [2500, 480]);
    const each = b.node('flow.forEachLoop', {}, {}, [2820, 480]);
    const near = ext('Voisins', [2640, 760]);
    const closed = ext('Ferme', [3000, 760]);
    const seen = b.node('set.contains', {}, {}, [3000, 900]);
    const not = b.node('logic.not', {}, {}, [3180, 900]);
    const both = b.node('logic.and', {}, {}, [3340, 800]);
    const fresh = b.node('flow.branch', {}, {}, [3500, 480]);
    const see = b.node('set.add', {}, {}, [3800, 480]);
    const queue = b.node('array.add', {}, {}, [4100, 480]);
    b.link(queueStart, 'then', loop, 'exec').link(g('AFaire', [1400, 770]), 'value', left, 'array').link(left, 'result', more, 'a').link(more, 'result', loop, 'condition');
    b.link(loop, 'body', take, 'exec').link(g('AFaire', [1880, 770]), 'value', first, 'array').link(first, 'item', take, 'value');
    b.link(take, 'then', pop, 'exec').link(g('AFaire', [2340, 680]), 'value', pop, 'array').link(pop, 'then', each, 'exec');
    b.link(g('Courant', [2480, 780]), 'value', near, 'target').link(near, 'value', each, 'array');
    b.link(each, 'body', fresh, 'exec').link(each, 'element', closed, 'target').link(g('Visites', [2820, 920]), 'value', seen, 'set').link(each, 'element', seen, 'item');
    b.link(seen, 'result', not, 'a').link(closed, 'value', both, 'a').link(not, 'result', both, 'b').link(both, 'result', fresh, 'condition');
    b.link(fresh, 'true', see, 'exec').link(g('Visites', [3640, 680]), 'value', see, 'set').link(each, 'element', see, 'item');
    b.link(see, 'then', queue, 'exec').link(g('AFaire', [3940, 680]), 'value', queue, 'array').link(each, 'element', queue, 'item');
    // Then tell every node whether it was reached.
    const apply = b.node('flow.forEachLoop', {}, {}, [2200, 1080]);
    const power = fnOf(node, 'SetAlimente');
    const tell = b.node('call.function', { graph: power.graph.id, owner: node.cls.id }, {}, [2560, 1080]);
    const reached = b.node('set.contains', {}, {}, [2400, 1320]);
    b.link(loop, 'completed', apply, 'exec').link(open, 'false', apply, 'exec').link(g('Tous', [2040, 1280]), 'value', apply, 'array');
    b.link(apply, 'body', tell, 'exec').link(apply, 'element', tell, 'target').link(g('Visites', [2220, 1330]), 'value', reached, 'set').link(apply, 'element', reached, 'item').link(reached, 'result', tell, power.pin.Etat);
  },
  robustness: [
    {
      id: 'order',
      label: 'les voisins de chaque borne sont listés dans l’ordre inverse',
      advice: 'Le résultat ne doit pas dépendre de l’ordre des voisins : chaque borne fermée et pas encore vue entre dans la liste, les autres jamais.',
      mutate: (p) => {
        const cls = p.classes.find((c) => c.name === 'BP_Noeud');
        const v = cls?.variables.find((x) => x.name === 'Voisins');
        if (!v) return;
        for (const a of p.level.actors) if (a.classId === cls!.id && Array.isArray(a.overrides[v.id])) a.overrides[v.id] = [...(a.overrides[v.id] as string[])].reverse();
      },
      scenario: [{ wait: 0.2 }, ...tap('E')],
      checks: [state('order', undefined, 'mêmes bornes alimentées', ALL_BUT_6, 'Le parcours ne doit pas dépendre de l’ordre des voisins.')],
    },
  ],
};
