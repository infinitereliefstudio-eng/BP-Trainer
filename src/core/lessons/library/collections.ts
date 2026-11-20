/**
 * V3, step B: Maps and Sets. "Les codes des portes" (Intermédiaire: Find on a
 * missing key returns the default value) and "Les badges" (Confirmé: a Set
 * keeps each Name once, and a Name ignores case).
 */
import { setVariableType } from '../../operations/classOps';
import { T } from '../../types/pins';
import { edit, ProjectBuilder, type ClassBuilder } from '../builder';
import { countPrints, noRuntimeErrors, printedNumbers, usesNode, notion } from '../checks';
import type { Lesson } from '../types';
import { playerBlueprint } from './props';
import { levelOf } from '../../model/project';

const editable = (b: ClassBuilder, id: string) => {
  b.cls.variables.find((v) => v.id === id)!.instanceEditable = true;
};
const varId = (b: ClassBuilder, name: string) => b.cls.variables.find((v) => v.name === name)!.id;

// ----------------------------------------------------- Les codes des portes

const DOORS: [string, number][] = [
  ['Atelier', 1234],
  ['Reserve', 1111],
  ['Cave', 0],
];

function codesProject() {
  const pb = new ProjectBuilder('Les codes des portes');
  const b = pb.blueprint('BP_Digicode');
  b.component('StaticMesh', 'Boitier', { sizeX: 50, sizeY: 30, color: '#334155' });
  b.component('TextRender', 'Ecran', { y: -40, text: '----' });
  b.variable('Codes', T.map(T.name, T.int), [
    ['Atelier', 1234],
    ['Reserve', 5678],
  ]);
  const nom = b.variable('NomPorte', T.name, '');
  const tape = b.variable('CodeTape', T.int, 0);
  editable(b, nom);
  editable(b, tape);
  DOORS.forEach(([name, code], i) => {
    const id = pb.place(b, -300 + i * 300, 0);
    Object.assign(levelOf(pb.project).actors.find((a) => a.id === id)!.overrides, { [nom]: name, [tape]: code });
  });
  pb.playerStart(0, 300);
  return pb.project;
}

/** Atelier opens, the two others are refused: "<Nom> : ouverte" or "<Nom> : refusée". */
function verdict(door: string, expected: 'ouverte' | 'refusée', trap?: string): Lesson['checks'][number] {
  return {
    id: door.toLowerCase(),
    label: `${door} : ${expected}`,
    test: (cx) => {
      if (countPrints(cx, `${door} : ${expected}`)) return true;
      const other = expected === 'ouverte' ? 'refusée' : 'ouverte';
      if (countPrints(cx, `${door} : ${other}`)) return trap ?? `${door} est ${other} : il fallait « ${door} : ${expected} ».`;
      return `Rien n’a été affiché pour ${door}. Chaque digicode affiche « NomPorte : ouverte » ou « NomPorte : refusée » au BeginPlay.`;
    },
  };
}

export const lessonCodes: Lesson = {
  id: 'l-codes',
  module: 'Données',
  level: 'intermediaire',
  number: 0,
  title: 'Les codes des portes',
  situation:
    'Chaque digicode garde la liste des codes dans une Map : le nom d’une porte donne son code. Au lancement, chacun compare le code tapé (CodeTape) à celui de sa porte. Atelier a le bon code, Reserve un mauvais, et Cave n’a pas de code du tout.',
  notions: ['Map', 'Find', 'Name', 'Valeur par défaut'],
  remember: 'Find sur une clé absente ne fait pas d’erreur : Return Value est faux et Value vaut la valeur par défaut. Teste toujours Return Value.',
  cards: [
    {
      title: 'Ce qui est en place',
      body:
        '**BP_Digicode** : un boîtier et un écran. Trois variables :\n\n' +
        '- **Codes** : une **Map** qui associe un nom de porte à son code. Elle contient Atelier → 1234 et Reserve → 5678.\n- **NomPorte** (Name) et **CodeTape** (Integer), **Instance Editable**.\n\n' +
        'Trois digicodes sont posés : **Atelier** (CodeTape 1234), **Reserve** (CodeTape 1111) et **Cave** (CodeTape 0). La Cave n’est **pas** dans Codes.\n\n' +
        'Au lancement, chacun doit afficher « NomPorte : ouverte » ou « NomPorte : refusée ».',
    },
    {
      title: 'Une Map',
      body:
        'Une **Map** est une liste de paires **clé → valeur**. Ici la clé est un **Name** (le nom de la porte) et la valeur un Integer (le code).\n\n' +
        '- On cherche **par la clé**, pas par une position : « le code de l’Atelier », pas « le 2e élément ».\n- Chaque clé n’y est **qu’une fois**. Ajouter une clé existante remplace sa valeur.\n\n' +
        'Sélectionne la variable Codes : dans Details, tu peux lire, ajouter ou retirer des paires.',
    },
    {
      title: 'Find',
      body:
        '**Find** (Utilities › Map) cherche **Key** dans la Map branchée sur **Target Map**. Il a deux sorties :\n\n' +
        '- **Value** : la valeur trouvée ;\n- **Return Value** : un Boolean, **vrai si la clé existe**.\n\n' +
        'Si la clé n’y est pas, il n’y a **pas d’erreur** : Return Value est faux, et Value vaut la **valeur par défaut** du type. Pour un Integer, **0**.',
    },
    {
      title: 'Le plan',
      body:
        'Au **BeginPlay** :\n\n' +
        '1. **Find** (Target Map = Codes, Key = NomPorte).\n2. **Branch**, Condition = Return Value **AND** (Value **==** CodeTape).\n3. True : Print String de **Append** (NomPorte, « : ouverte »).\n4. False : Print String de **Append** (NomPorte, « : refusée »).\n\n' +
        '**AND Boolean** est vrai seulement si ses deux entrées le sont. **Append** colle des textes bout à bout ; un Name relié à une pin String est converti automatiquement.',
    },
    {
      title: 'Le piège',
      body:
        'Comparer Value à CodeTape **sans** regarder Return Value. Pour l’Atelier et la Réserve, ça marche. Pour la Cave : Find ne trouve rien et rend Value = 0… et son CodeTape vaut 0. La comparaison est vraie, la Cave s’ouvre.\n\n' +
        'C’est un vrai bug de jeu : une valeur par défaut prise pour une vraie réponse. Dès qu’un nœud a une sortie « trouvé ? » (Find, Get Actor Of Class, Cast), lis-la avant d’utiliser le résultat.',
    },
  ],
  objectives: [
    'Au BeginPlay, cherche NomPorte dans Codes avec Find.',
    'La porte s’ouvre si la clé existe et si le code trouvé est égal à CodeTape.',
    'Affiche « NomPorte : ouverte » ou « NomPorte : refusée » (Append).',
  ],
  hints: [
    'Que vaut CodeTape pour la Cave ? Et que donne Find pour une porte qui n’est pas dans la Map ?',
    'Nœuds : Find (Target Map = Codes, Key = NomPorte), Equal (Integer), AND Boolean, Branch, Append, Print String.',
    'Solution : BeginPlay → Branch (Return Value de Find AND Value == CodeTape) → Print « NomPorte : ouverte », sinon Print « NomPorte : refusée ».',
  ],
  challenge: 'Ajoute la Cave à Codes dans Details, avec le code 4321. Que devient son message ?',
  setup: codesProject,
  scenario: [{ wait: 0.3 }],
  checks: [
    verdict('Atelier', 'ouverte'),
    verdict('Reserve', 'refusée'),
    verdict(
      'Cave',
      'refusée',
      'La Cave s’ouvre : elle n’est pas dans Codes, donc Find renvoie Value = 0 (valeur par défaut)… égal à son CodeTape, 0. Teste Return Value de Find avant de comparer.',
    ),
    notion(usesNode('find', 'BP_Digicode', ['map.find'], 'Le code est cherché dans la Map avec Find', 'BP_Digicode doit chercher le code de sa porte dans Codes avec Find.')),
    noRuntimeErrors(),
  ],
  solve: (p) => solveCodes(p, true),
};

/** Reference solution; without `testFound`, the trap (Value compared without Return Value). */
export function solveCodes(p: Parameters<Lesson['solve']>[0], testFound: boolean): void {
  const b = edit(p, 'BP_Digicode');
  const find = b.node('map.find', {}, {}, [340, 320]);
  b.link(b.node('var.get', { variable: varId(b, 'Codes') }, {}, [100, 320]), 'value', find, 'map');
  b.link(b.node('var.get', { variable: varId(b, 'NomPorte') }, {}, [100, 440]), 'value', find, 'key');
  const eq = b.node('math.equalInt', {}, {}, [620, 360]);
  b.link(find, 'value', eq, 'a').link(b.node('var.get', { variable: varId(b, 'CodeTape') }, {}, [400, 520]), 'value', eq, 'b');
  const br = b.node('flow.branch', {}, {}, [900, 96]);
  if (testFound) {
    const and = b.node('logic.and', {}, {}, [780, 300]);
    b.link(find, 'result', and, 'a').link(eq, 'result', and, 'b').link(and, 'result', br, 'condition');
  } else b.link(eq, 'result', br, 'condition');
  b.link(b.node('event.beginPlay', {}, {}, [64, 96]), 'then', br, 'exec');
  for (const [pin, word, y] of [
    ['true', 'ouverte', 96],
    ['false', 'refusée', 260],
  ] as const) {
    const text = b.node('string.append', {}, { in1: ` : ${word}` }, [1100, y + 160]);
    const say = b.node('debug.printString', {}, {}, [1200, y]);
    b.link(b.node('var.get', { variable: varId(b, 'NomPorte') }, {}, [900, y + 200]), 'value', text, 'in0');
    b.link(br, pin, say, 'exec').link(text, 'result', say, 'text');
  }
}

// ----------------------------------------------------------------- Les badges

const BADGES = ['Rouge', 'Bleu', 'rouge'];

function badgesProject() {
  const pb = new ProjectBuilder('Les badges');
  const { b: player } = playerBlueprint(pb);
  const badges = player.variable('Badges', T.array(T.name), []);
  const badge = pb.blueprint('BP_Badge');
  badge.component('StaticMesh', 'Carte', { sizeX: 40, sizeY: 26, color: '#dc2626', blocks: false });
  badge.component('BoxCollision', 'Zone', { sizeX: 90, sizeY: 90 });
  const couleur = badge.variable('Couleur', T.name, '');
  editable(badge, couleur);
  // Overlap → Cast To BP_Joueur → Add Couleur to its Badges → print how many → Destroy.
  const over = badge.node('event.actorBeginOverlap', {}, {}, [64, 96]);
  const cast = badge.node('cast.to', { class: player.cls.id }, {}, [340, 96]);
  const add = badge.node('array.add', {}, {}, [700, 96]);
  const len = badge.node('array.length', {}, {}, [900, 360]);
  const say = badge.node('debug.printString', {}, {}, [1020, 96]);
  const kill = badge.node('actor.destroy', {}, {}, [1320, 96]);
  const get1 = badge.node('var.getExternal', { owner: player.cls.id, variable: badges }, {}, [600, 360]);
  const get2 = badge.node('var.getExternal', { owner: player.cls.id, variable: badges }, {}, [700, 480]);
  badge.link(over, 'then', cast, 'exec').link(over, 'other', cast, 'object').link(cast, 'then', add, 'exec');
  badge.link(cast, 'as', get1, 'target').link(get1, 'value', add, 'array').link(badge.node('var.get', { variable: couleur }, {}, [500, 520]), 'value', add, 'item');
  badge.link(add, 'then', say, 'exec').link(cast, 'as', get2, 'target').link(get2, 'value', len, 'array').link(len, 'result', say, 'text');
  badge.link(say, 'then', kill, 'exec');
  BADGES.forEach((c, i) => {
    const id = pb.place(badge, -400 + i * 250, 0);
    levelOf(pb.project).actors.find((a) => a.id === id)!.overrides[couleur] = c;
  });
  // The reader at the blue door: Contains (BLEU) → "Accès autorisé".
  const reader = pb.blueprint('BP_Lecteur');
  reader.component('StaticMesh', 'Lecteur', { sizeX: 40, sizeY: 40, color: '#1d4ed8' });
  reader.component('BoxCollision', 'Zone', { sizeX: 120, sizeY: 120 });
  reader.component('StaticMesh', 'Porte', { shape: 'door', x: 80, y: -100, sizeX: 200, sizeY: 16, color: '#1d4ed8' });
  const wanted = reader.variable('Couleur', T.name, 'BLEU');
  const rOver = reader.node('event.actorBeginOverlap', {}, {}, [64, 96]);
  const rCast = reader.node('cast.to', { class: player.cls.id }, {}, [340, 96]);
  const has = reader.node('array.contains', {}, {}, [640, 360]);
  const br = reader.node('flow.branch', {}, {}, [700, 96]);
  const ok = reader.node('debug.printString', {}, { text: 'Accès autorisé' }, [1000, 96]);
  const rGet = reader.node('var.getExternal', { owner: player.cls.id, variable: badges }, {}, [420, 360]);
  reader.link(rOver, 'then', rCast, 'exec').link(rOver, 'other', rCast, 'object').link(rCast, 'then', br, 'exec');
  reader.link(rCast, 'as', rGet, 'target').link(rGet, 'value', has, 'array').link(reader.node('var.get', { variable: wanted }, {}, [420, 480]), 'value', has, 'item');
  reader.link(has, 'result', br, 'condition').link(br, 'true', ok, 'exec');
  pb.place(reader, 500, 0);
  pb.playerStart(-700, 0);
  return pb.project;
}

export const lessonBadges: Lesson = {
  id: 'l-badges',
  module: 'Données',
  level: 'confirme',
  number: 0,
  title: 'Les badges',
  situation:
    'Le joueur ramasse des badges de couleur et les range dans sa variable Badges. Le compteur affiché devrait dire combien de couleurs il possède : il ramasse Rouge, Bleu, puis un second badge rouge. Le lecteur de la porte bleue vérifie qu’il a le badge BLEU.',
  notions: ['Set', 'Name', 'Doublons', 'Changer le conteneur d’une variable'],
  recalls: ['rotation'],
  revision: 2,
  remember: 'Un Set garde chaque valeur une seule fois, et un Name ignore les majuscules : « rouge » et « Rouge » sont le même badge.',
  cards: [
    {
      title: 'Ce qui est en place',
      body:
        '- **BP_Joueur** a une variable **Badges** : un **tableau de Name**, vide.\n- Trois **BP_Badge** sont posés sur la route, avec une variable **Couleur** réglée sur « Rouge », « Bleu » et « rouge » (minuscule). Leur graphe est fait : au contact, **Add** la Couleur aux Badges du joueur, affiche **Length**, puis disparaît.\n- **BP_Lecteur**, devant la porte bleue : il vérifie avec **Contains** que les Badges du joueur contiennent **BLEU** (majuscules), et affiche « Accès autorisé ».\n\n' +
        'Lance Play : le compteur affiche 1, 2, puis **3**. Le joueur n’a pourtant que deux couleurs.',
    },
    {
      title: 'Tableau ou Set ?',
      body:
        '- Un **tableau** (Array) garde **tout**, dans l’ordre d’ajout, doublons compris. Deux fois « rouge » fait deux éléments.\n- Un **Set** garde chaque valeur **une seule fois**, sans ordre. Ajouter une valeur déjà présente ne change rien.\n\n' +
        'Pour une liste de « ce que je possède » (badges, succès débloqués, zones visitées), on veut un Set : la question est « l’ai-je ? », pas « combien de fois ? ».',
    },
    {
      title: 'Le Name',
      body:
        'Un **Name** est un identifiant, pensé pour être comparé vite. Il **ignore les majuscules** : « rouge », « Rouge » et « ROUGE » sont le même Name. C’est pour ça que le lecteur trouve BLEU alors que le badge s’appelle « Bleu ».\n\n' +
        'Un **String** est un texte qu’on manipule (découper, coller) ; un **Text** est un texte affiché au joueur, traduisible. Pour un identifiant, c’est le Name.',
    },
    {
      title: 'Changer le conteneur',
      body:
        '1. Sélectionne **Badges** dans BP_Joueur. Dans Details, la liste à côté du type choisit **Single**, **Array**, **Set** ou **Map** : passe-la à **Set**.\n2. Les nœuds de tableau qui la recevaient ne lui conviennent plus : un Set n’a pas d’index, ni d’ordre.\n3. Remplace-les par ceux de **Utilities › Set** : **Add**, **Length** dans BP_Badge ; **Contains** dans BP_Lecteur. Mêmes fils, mêmes rôles. Compile ensuite chacun des deux Blueprints.\n\n' +
        'Relance Play : 1, 2, puis 2.',
    },
    {
      title: 'Rappel : ouvrir la porte',
      body: 'BP_Lecteur a aussi un composant **Porte**, fermé. Après « Accès autorisé », ouvre-le : un quart de tour (Yaw de 0 à 90). Tu connais le nœud qui règle la rotation d’un composant.',
    },
  ],
  objectives: [
    'Badges devient un Set of Name.',
    'Après les trois badges, le compteur affiche 2.',
    'Le lecteur de la porte bleue affiche « Accès autorisé ».',
    'Rappel : il ouvre sa Porte (Yaw 90).',
  ],
  hints: [
    'Combien d’éléments a le tableau après Rouge, Bleu et rouge ?',
    'Details de Badges : conteneur Set. Puis, dans BP_Badge : Add (Set) et Length (Set) ; dans BP_Lecteur : Contains (Set).',
    'Solution : Badges en Set of Name ; BP_Badge : Cast → Add (Target Set = Badges, New Item = Couleur) → Print Length (Set) → Destroy ; BP_Lecteur : Contains (Set) → Branch → Print → Set Relative Rotation (Porte, Yaw 90).',
  ],
  challenge: 'Ajoute un badge « BLEU » : le compteur bouge-t-il ?',
  setup: badgesProject,
  scenario: [
    { wait: 0.2 },
    { teleport: [-400, 0] },
    { wait: 0.15 },
    { teleport: [-150, 0] },
    { wait: 0.15 },
    { teleport: [100, 0] },
    { wait: 0.15 },
    { checkpoint: 'badges' },
    { teleport: [500, 0] },
    { wait: 0.15 },
  ],
  checks: [
    {
      id: 'set',
      label: 'Badges est un Set of Name',
      test: (cx) => {
        const v = cx.project.classes.find((c) => c.name === 'BP_Joueur')?.variables.find((x) => x.name === 'Badges');
        return v?.type.container === 'set' && v.type.category === 'name' ? true : 'Dans Details de la variable Badges (BP_Joueur), choisis le conteneur Set.';
      },
    },
    {
      id: 'count',
      label: 'Après les trois badges, le compteur affiche 2',
      at: 'badges',
      test: (cx) => {
        const n = printedNumbers(cx);
        const last = n[n.length - 1];
        if (last === '2') return true;
        if (last === '3') return 'Le compteur affiche 3 : le second badge rouge compte double. Un tableau garde les doublons ; un Set ne garde chaque Name qu’une fois, et « rouge » est le même Name que « Rouge ».';
        return `Le compteur affiche ${last ?? 'rien'} après les trois badges. Il fallait 2.`;
      },
    },
    {
      id: 'reader',
      label: 'Le lecteur de la porte bleue : « Accès autorisé »',
      test: (cx) => (countPrints(cx, 'Accès autorisé') ? true : 'Le lecteur n’a pas affiché « Accès autorisé » : il doit trouver BLEU dans les Badges du joueur (Contains).'),
    },
    {
      id: 'door',
      label: 'Rappel : la Porte du lecteur s’ouvre',
      test: (cx) => {
        const yaw = cx.component('BP_Lecteur', 'Porte')?.props.yaw ?? 0;
        return Math.abs(Math.abs(yaw) - 90) < 1 ? true : `La Porte du lecteur a un Yaw de ${Math.round(yaw)} : après « Accès autorisé », donne-lui un Yaw de 90 (Set Relative Rotation).`;
      },
    },
    noRuntimeErrors(),
  ],
  solve(p) {
    const player = edit(p, 'BP_Joueur');
    const badges = varId(player, 'Badges');
    setVariableType(player.cls, badges, T.set(T.name));
    // The array nodes become their Set counterparts, on the same wires (pins have the same ids).
    const swap: Record<string, [string, Record<string, string>]> = {
      'array.add': ['set.add', { array: 'set' }],
      'array.length': ['set.length', { array: 'set' }],
      'array.contains': ['set.contains', { array: 'set' }],
    };
    for (const name of ['BP_Badge', 'BP_Lecteur']) {
      const b = edit(p, name);
      for (const n of Object.values(b.graph.nodes)) {
        const to = swap[n.def];
        if (!to) continue;
        n.def = to[0];
        delete n.wild;
        for (const l of Object.values(b.graph.links)) {
          if (l.to.node === n.id && to[1][l.to.pin]) l.to.pin = to[1][l.to.pin];
        }
      }
      // Type the generic Set nodes again from their wires.
      for (const l of Object.values(b.graph.links)) {
        const n = b.graph.nodes[l.to.node];
        if (n?.def.startsWith('set.') && l.to.pin === 'set') n.wild = { default: 'name' };
      }
    }
    const reader = edit(p, 'BP_Lecteur');
    const ok = Object.values(reader.graph.nodes).find((n) => n.def === 'debug.printString')!.id;
    const open = reader.node('component.setRelativeRotation', {}, { rotation: { x: 0, y: 0, z: 90 } }, [1300, 96]);
    reader.link(ok, 'then', open, 'exec').target('Porte', open);
  },
};
