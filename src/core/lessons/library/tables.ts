/**
 * V7, Data Tables: « Le catalogue » (Confirmé: Get Data Table Row, Row Found
 * and Row Not Found), « Débogue D16 — Le terminal muet » (both outputs on the
 * same Print String: an empty line for a missing row) and « Le dialogue en
 * Data Table » (Avancé: each row names the next one, E advances).
 */
import type { Project } from '../../model/project';
import { addDataTable, addDataTableRow } from '../../operations/dataTableOps';
import { removeNodes } from '../../operations/graphOps';
import { addStruct, addStructMember, updateStructMember } from '../../operations/structOps';
import { T, type PinType } from '../../types/pins';
import { edit, ProjectBuilder, type ClassBuilder } from '../builder';
import { countPrints, noRuntimeErrors, normText, notion, PRESS_E, usesNode } from '../checks';
import type { CheckContext, Lesson } from '../types';
import { DEBUG_METHOD, editable, getVar, say, setVar } from './kit';

/** A structure with these members; returns the member ids by name. */
export function makeStruct(p: Project, name: string, members: [string, PinType][]): Record<string, string> {
  const r = addStruct(p, name);
  if (!r.ok) throw new Error(r.reason);
  const s = r.value;
  const ids: Record<string, string> = {};
  members.forEach(([n, t], i) => {
    const m = i === 0 ? s.members[0] : addStructMember(p, s.id, t)!;
    updateStructMember(p, s.id, m.id, { name: n, type: t });
    ids[n] = m.id;
  });
  return ids;
}

/** A Data Table of `struct`, rows given as [Row Name, { member: value }]. */
export function makeTable(p: Project, name: string, struct: string, ids: Record<string, string>, rows: [string, Record<string, string>][]): string {
  const r = addDataTable(p, struct, name);
  if (!r.ok) throw new Error(r.reason);
  for (const [row, values] of rows) {
    const value: Record<string, string> = {};
    for (const [k, v] of Object.entries(values)) value[ids[k]] = v;
    addDataTableRow(p, r.value.id, row, value);
  }
  return r.value.id;
}

const tableId = (p: Project, name: string) => p.dataTables.find((t) => t.name === name)!.id;
const memberId = (p: Project, struct: string, member: string) => p.structs.find((s) => s.name === struct)!.members.find((m) => m.name === member)!.id;

/** No line printed empty: what reading Out Row on Row Not Found gives. */
const noEmptyLine = (why: string) => ({
  id: 'no-empty',
  label: 'Aucune ligne vide dans l’Output Log',
  test: (cx: CheckContext) => (cx.prints().some((t) => t.trim() === '') ? why : true),
});

// ------------------------------------------------------------ Le catalogue

const ITEMS = [
  ['Lampe', 'Lampe torche', 'La pile est à moitié vide.'],
  ['Cle', 'Clé rouillée', 'Elle ouvre sans doute la réserve.'],
  ['Carte', 'Carte d’accès', 'Niveau 2 : couloirs techniques.'],
] as const;
/** What each object on the floor asks for: the second has its case changed, the third a typo. */
const ASKED = ['lampe', 'Cle', 'Cartes'];

function catalogProject() {
  const pb = new ProjectBuilder('Le catalogue');
  const ids = makeStruct(pb.project, 'S_Fiche', [
    ['Nom', T.string],
    ['Description', T.string],
  ]);
  makeTable(
    pb.project,
    'DT_Objets',
    'S_Fiche',
    ids,
    ITEMS.map(([row, nom, desc]) => [row, { Nom: nom, Description: desc }]),
  );
  const b = pb.blueprint('BP_Examinable');
  b.component('StaticMesh', 'Objet', { shape: 'cylinder', sizeX: 30, sizeY: 30, color: '#f5c542', blocks: false });
  b.component('BoxCollision', 'Zone', { sizeX: 120, sizeY: 120 });
  const id = editable(b, 'IdObjet', T.name, '');
  ASKED.forEach((asked, i) => {
    const a = pb.place(b, -300 + i * 300, 0);
    pb.project.level.actors.find((x) => x.id === a)!.overrides[id] = asked;
  });
  pb.playerStart(-300, 300);
  return pb.project;
}

const visit = (x: number) => [{ teleport: [x, 0] as [number, number] }, { wait: 0.2 }, { teleport: [x, 300] as [number, number] }, { wait: 0.2 }];

/** Overlap → Get Data Table Row (IdObjet) → Found: Print Description ; Not Found: Print « Objet inconnu ». `split: false` is the trap: one Print for both. */
export function solveCatalog(p: Project, split = true): void {
  const b = edit(p, 'BP_Examinable');
  const ev = b.node('event.actorBeginOverlap', {}, {}, [64, 96]);
  const get = b.node('dataTable.getRow', { table: tableId(p, 'DT_Objets') }, {}, [360, 96]);
  const brk = b.node('struct.break', { struct: 'S_Fiche' }, {}, [700, 320]);
  const show = say(b, [1000, 40]);
  b.link(ev, 'then', get, 'exec').link(getVar(b, 'IdObjet', [200, 300]), 'value', get, 'rowName');
  b.link(get, 'found', show, 'exec').link(get, 'row', brk, 'struct').link(brk, memberId(p, 'S_Fiche', 'Description'), show, 'text');
  if (split) b.link(get, 'notFound', say(b, [1000, 300], 'Objet inconnu'), 'exec');
  else b.link(get, 'notFound', show, 'exec');
}

export const lessonCatalog: Lesson = {
  id: 'l-catalogue',
  module: 'Données',
  level: 'confirme',
  number: 0,
  title: 'Le catalogue',
  situation:
    'Trois objets traînent au sol. Chacun connaît seulement son identifiant (IdObjet) ; leurs fiches, nom et description, sont rangées dans une Data Table. Quand le joueur s’approche, l’objet affiche sa description, ou « Objet inconnu » si sa fiche n’existe pas.',
  notions: ['Data Table', 'Row Name', 'Get Data Table Row', 'Break'],
  remember:
    'Une Data Table garde les données hors des graphes : le Blueprint ne connaît qu’un Row Name, Get Data Table Row va chercher le reste. Row Found et Row Not Found sont deux chemins à traiter chacun.',
  cards: [
    {
      title: 'Ce qui est en place',
      body:
        'Dans le Content Browser (touche le nom du Blueprint en haut) :\n\n' +
        '- la structure **S_Fiche** : Nom et Description, deux String ;\n- la Data Table **DT_Objets**, dont chaque ligne est une S_Fiche : **Lampe**, **Cle** et **Carte**.\n\n' +
        '**BP_Examinable** est un petit objet jaune avec une Zone, et une variable **IdObjet** (Name, Instance Editable). Trois sont posés, réglés sur « lampe », « Cle » et « Cartes ». Le graphe est vide.',
    },
    {
      title: 'Une Data Table',
      body:
        'Une **Data Table** est un tableau de données. Chaque ligne suit une **structure** (ici S_Fiche) et porte un nom unique, son **Row Name**.\n\n' +
        'Touche DT_Objets dans le Content Browser : Details montre ses lignes, et tu peux les modifier, en ajouter, en retirer. Les données vivent là, pas dans les nœuds.\n\n' +
        'L’intérêt : cent objets, c’est cent lignes, pas cent Blueprints. Et changer une description ne touche à aucun graphe.',
    },
    {
      title: 'Get Data Table Row',
      body:
        'Dans la palette, tape « row » : **Get Data Table Row (DT_Objets)**. La table se choisit dans Details.\n\n' +
        '- **Row Name** : la ligne cherchée. C’est un **Name** : la casse est ignorée, « lampe » trouve la ligne Lampe.\n- **Row Found** : la ligne existe. **Out Row** la donne, une S_Fiche entière.\n- **Row Not Found** : elle n’existe pas. Pas d’erreur, juste l’autre chemin.\n\n' +
        'Pour lire un membre d’Out Row : **Break S_Fiche**, comme pour toute structure.',
    },
    {
      title: 'Le plan',
      body:
        '1. **Event ActorBeginOverlap** → **Get Data Table Row** (Row Name = Get IdObjet).\n2. **Row Found** → **Print String** de la Description (Break S_Fiche sur Out Row).\n3. **Row Not Found** → **Print String** « Objet inconnu ».\n\n' +
        'Le test passe devant les trois objets. Le troisième, « Cartes », n’a pas de ligne : c’est une faute de frappe, typique quand les identifiants sont tapés à la main.',
    },
    {
      title: 'Le piège',
      body:
        'Relier **Row Found** et **Row Not Found** au **même** Print String. Pour la ligne absente, Out Row ne contient rien d’utile : le Print String affiche une ligne vide, sans la moindre erreur. On croit que l’objet n’a « pas de description », alors que son identifiant est faux.\n\n' +
        'Dans UE, Out Row n’est même pas garanti sur Row Not Found : ne le lis jamais de ce côté-là.',
    },
  ],
  objectives: [
    'Dans BP_Examinable, sur ActorBeginOverlap : Get Data Table Row (DT_Objets), Row Name = IdObjet.',
    'Row Found : affiche la Description de la ligne.',
    'Row Not Found : affiche « Objet inconnu ».',
    'Touche Vérifier : le joueur passe devant les trois objets.',
  ],
  hints: [
    'La table et la structure existent déjà : il ne reste que le graphe de BP_Examinable.',
    'Nœuds : Event ActorBeginOverlap, Get IdObjet, Get Data Table Row (DT_Objets), Break S_Fiche, deux Print String.',
    'Solution : ActorBeginOverlap → Get Data Table Row (Row Name = IdObjet) ; Row Found → Print String (Break S_Fiche › Description) ; Row Not Found → Print String « Objet inconnu ».',
  ],
  challenge: 'Corrige la faute : passe IdObjet du troisième objet à « Carte » dans son Details. Puis ajoute une ligne Fusible à DT_Objets et un quatrième objet, sans toucher au graphe.',
  setup: catalogProject,
  scenario: [{ wait: 0.2 }, ...visit(-300), { checkpoint: 'un' }, ...visit(0), { checkpoint: 'deux' }, ...visit(300)],
  checks: [
    {
      id: 'lampe',
      label: '« lampe » trouve la ligne Lampe (la casse ne compte pas)',
      at: 'un',
      test: (cx) => (countPrints(cx, ITEMS[0][2]) ? true : 'Rien de la Description de la lampe : l’objet doit chercher son IdObjet dans DT_Objets et afficher la Description de la ligne trouvée.'),
    },
    { id: 'cle', label: 'La clé affiche sa description', at: 'deux', test: (cx) => (countPrints(cx, ITEMS[1][2]) ? true : 'La clé n’affiche pas sa Description.') },
    {
      id: 'inconnu',
      label: '« Cartes » n’a pas de fiche : « Objet inconnu »',
      test: (cx) => (countPrints(cx, 'objet inconnu') ? true : 'Rien pour « Cartes », qui n’a pas de ligne : la sortie Row Not Found doit afficher « Objet inconnu ».'),
    },
    noEmptyLine('Une ligne vide s’affiche : Row Not Found est relié au Print String de la description, et Out Row ne contient rien quand la ligne manque. Donne à Row Not Found son propre Print String.'),
    notion(usesNode('row', 'BP_Examinable', ['dataTable.getRow'], 'Les fiches sont lues avec Get Data Table Row', 'Lis la fiche dans DT_Objets avec Get Data Table Row.')),
    noRuntimeErrors(),
  ],
  solve: (p) => solveCatalog(p),
};

// ------------------------------------------------------- Débogue D16

const MESSAGES: [string, string][] = [
  ['Accueil', 'Bienvenue dans la station.'],
  ['Alerte', 'Pression anormale en zone B.'],
];

function terminalGraph(b: ClassBuilder, p: Project, fixed: boolean): void {
  const ev = b.node('event.beginPlay', {}, {}, [64, 96]);
  const get = b.node('dataTable.getRow', { table: tableId(p, 'DT_Messages') }, {}, [360, 96]);
  const brk = b.node('struct.break', { struct: 'S_Message' }, {}, [700, 320]);
  const show = say(b, [1000, 96]);
  b.link(ev, 'then', get, 'exec').link(getVar(b, 'Ecran', [200, 300]), 'value', get, 'rowName');
  b.link(get, 'found', show, 'exec').link(get, 'row', brk, 'struct').link(brk, memberId(p, 'S_Message', 'Texte'), show, 'text');
  b.link(get, 'notFound', fixed ? say(b, [1000, 360], 'Aucun message') : show, 'exec');
}

function mutedProject(fixed = false) {
  const pb = new ProjectBuilder('Débogue D16');
  const ids = makeStruct(pb.project, 'S_Message', [['Texte', T.string]]);
  makeTable(
    pb.project,
    'DT_Messages',
    'S_Message',
    ids,
    MESSAGES.map(([r, t]) => [r, { Texte: t }]),
  );
  const b = pb.blueprint('BP_Terminal');
  b.component('StaticMesh', 'Console', { sizeX: 70, sizeY: 50, color: '#1d4ed8' });
  const ecran = editable(b, 'Ecran', T.name, '');
  for (const [i, v] of ['Accueil', 'Maintenance'].entries()) {
    const a = pb.place(b, -200 + i * 400, 0);
    pb.project.level.actors.find((x) => x.id === a)!.overrides[ecran] = v;
  }
  pb.playerStart(0, 300);
  terminalGraph(b, pb.project, fixed);
  return pb.project;
}

export const debug16: Lesson = {
  id: 'd16-terminal-muet',
  kind: 'debug',
  code: 'D16',
  module: 'Données',
  level: 'confirme',
  number: 0,
  title: 'Le terminal muet',
  situation:
    'Deux terminaux affichent au lancement le message de leur écran, lu dans la Data Table DT_Messages. Le premier affiche « Bienvenue dans la station. ». Le second n’affiche… rien : une ligne vide dans l’Output Log, sans erreur.',
  notions: ['Get Data Table Row', 'Row Not Found', 'Row Name'],
  remember: 'Out Row ne vaut quelque chose que sur Row Found. Une ligne vide, sans erreur, après une Data Table : c’est souvent un Row Name absent, lu par le mauvais chemin.',
  cards: [
    DEBUG_METHOD,
    {
      title: 'Ce qui est en place',
      body:
        '- La structure **S_Message** (un Texte) et la Data Table **DT_Messages**, avec deux lignes : **Accueil** et **Alerte**.\n- **BP_Terminal** a une variable **Ecran** (Name, Instance Editable). Le terminal de gauche est réglé sur « Accueil », celui de droite sur « Maintenance ».\n\n' +
        'Au **BeginPlay** : **Get Data Table Row** (DT_Messages, Row Name = Ecran) → **Print String** du Texte de Out Row.',
    },
    {
      title: 'Où regarder',
      body:
        'Le graphe est le même pour les deux terminaux : la différence vient de leur **réglage** dans le niveau, et de ce que la table contient.\n\n' +
        'Deux vérifications :\n1. Quelles lignes a DT_Messages ? (Content Browser › DT_Messages.)\n2. Get Data Table Row a **deux** sorties blanches. Suis le fil de chacune : où va-t-il ?\n\n' +
        'Un breakpoint sur le Print String (appui long), puis Play : pour chaque terminal, regarde par quelle sortie le fil est arrivé.',
    },
    {
      title: 'Ce qu’on attend',
      body:
        'Le terminal d’Accueil affiche son message. Celui dont l’écran n’a pas de ligne dans la table affiche « Aucun message » : un texte qu’on remarque, au lieu d’une ligne vide qu’on ne voit pas.\n\n' +
        'Ne rajoute pas de ligne Maintenance à la table pour « réparer » : un autre terminal mal réglé retomberait dans le même silence.',
    },
  ],
  objectives: ['Le terminal Accueil affiche « Bienvenue dans la station. ».', 'Le terminal Maintenance affiche « Aucun message ».', 'Plus aucune ligne vide.'],
  hints: [
    'La table n’a pas de ligne Maintenance : pour ce terminal, Get Data Table Row sort par Row Not Found.',
    'Row Not Found et Row Found mènent au même Print String, qui lit Out Row.',
    'Solution : débranche Row Not Found de ce Print String et relie-le à un second Print String « Aucun message ».',
  ],
  setup: () => mutedProject(),
  scenario: [{ wait: 0.3 }],
  checks: [
    { id: 'accueil', label: 'Accueil : « Bienvenue dans la station. »', test: (cx) => (countPrints(cx, MESSAGES[0][1]) ? true : 'Le terminal Accueil n’affiche plus son message.') },
    {
      id: 'maintenance',
      label: 'Maintenance : « Aucun message »',
      test: (cx) => (countPrints(cx, 'aucun message') ? true : 'Le terminal Maintenance n’affiche pas « Aucun message » : son écran n’a pas de ligne dans DT_Messages, il passe par Row Not Found.'),
    },
    {
      ...noEmptyLine('Une ligne vide s’affiche encore : un Print String lit Out Row sur le chemin Row Not Found.'),
    },
    noRuntimeErrors(),
  ],
  solve(p) {
    const b = edit(p, 'BP_Terminal');
    removeNodes(
      b.graph,
      Object.keys(b.graph.nodes),
    );
    terminalGraph(b, p, true);
  },
};

// ------------------------------------------------ Le dialogue en Data Table

const LINES: [string, string, string, string][] = [
  ['Debut', 'Oren', 'Tu es réveillé ? Enfin.', 'Station'],
  ['Station', 'Oren', 'La station tourne sur réserve depuis trois jours.', 'Fenetre'],
  ['Fenetre', 'Oren', 'Ne regarde pas trop la fenêtre.', ''],
];
const SPOKEN = LINES.map(([, who, text]) => `${who} : ${text}`);

function dialogueProject() {
  const pb = new ProjectBuilder('Le dialogue en Data Table');
  const ids = makeStruct(pb.project, 'S_Replique', [
    ['Personnage', T.string],
    ['Texte', T.string],
    ['Suivante', T.name],
  ]);
  makeTable(
    pb.project,
    'DT_Dialogue',
    'S_Replique',
    ids,
    LINES.map(([row, who, text, next]) => [row, { Personnage: who, Texte: text, Suivante: next }]),
  );
  const b = pb.blueprint('BP_Radio');
  b.component('StaticMesh', 'Radio', { sizeX: 60, sizeY: 40, color: '#475569' });
  b.cls.autoReceiveInput = true;
  b.variable('Ligne', T.name, 'Debut');
  pb.place(b, 0, 0);
  pb.playerStart(-300, 0);
  return pb.project;
}

/**
 * E → Get Data Table Row (Ligne) → Found: Print « Personnage : Texte » → Set Ligne = Suivante ;
 * Not Found: « Fin de la conversation ». `endEarly` is the trap: the end is tested on the
 * current line's Suivante (Is None) before it is said, so the last line is never heard.
 */
export function solveDialogue(p: Project, endEarly = false): void {
  const b = edit(p, 'BP_Radio');
  const key = b.node('event.inputKey', { key: 'E' }, {}, [64, 96]);
  const get = b.node('dataTable.getRow', { table: tableId(p, 'DT_Dialogue') }, {}, [360, 96]);
  const brk = b.node('struct.break', { struct: 'S_Replique' }, {}, [560, 400]);
  const text = b.node('string.append', { inputs: 3 }, { in1: ' : ' }, [860, 420]);
  const show = say(b, [1000, 96]);
  const next = setVar(b, 'Ligne', [1300, 96]);
  const m = (n: string) => memberId(p, 'S_Replique', n);
  b.link(key, 'pressed', get, 'exec').link(getVar(b, 'Ligne', [200, 300]), 'value', get, 'rowName');
  b.link(get, 'row', brk, 'struct').link(brk, m('Personnage'), text, 'in0').link(brk, m('Texte'), text, 'in2').link(text, 'result', show, 'text');
  b.link(brk, m('Suivante'), next, 'value');
  const end = say(b, [1000, 360], 'Fin de la conversation');
  if (endEarly) {
    const br = b.node('flow.branch', {}, {}, [700, 96]);
    const none = b.node('name.isNone', {}, {}, [700, 600]);
    b.link(get, 'found', br, 'exec').link(brk, m('Suivante'), none, 'in').link(none, 'result', br, 'condition');
    b.link(br, 'true', end, 'exec').link(br, 'false', show, 'exec').link(show, 'then', next, 'exec');
  } else b.link(get, 'found', show, 'exec').link(show, 'then', next, 'exec');
  b.link(get, 'notFound', end, 'exec');
}

export const lessonDialogueTable: Lesson = {
  id: 'l-dialogue-table',
  module: 'Données',
  level: 'avance',
  number: 0,
  title: 'Le dialogue en Data Table',
  situation:
    'La radio diffuse un dialogue écrit dans la Data Table DT_Dialogue : chaque réplique dit qui parle, ce qu’il dit, et le Row Name de la suivante. Chaque appui sur E affiche la réplique en cours et passe à la suivante. Après la dernière : « Fin de la conversation ».',
  notions: ['Data Table', 'Get Data Table Row', 'Name', 'Dialogue par les données'],
  remember:
    'Un dialogue en Data Table : le Blueprint ne garde que le Row Name de la réplique en cours. Chaque ligne nomme la suivante ; une ligne vide (None) finit la conversation. Ajouter des répliques ne demande aucun nœud.',
  cards: [
    {
      title: 'Ce qui est en place',
      body:
        '- La structure **S_Replique** : **Personnage** (String), **Texte** (String), **Suivante** (Name).\n- La Data Table **DT_Dialogue** : trois lignes, **Debut**, **Station** et **Fenetre**. Debut nomme Station comme suivante, Station nomme Fenetre, et Fenetre n’a pas de suivante (None).\n- **BP_Radio** entend E et a une variable **Ligne** (Name) qui vaut **Debut**.\n\n' +
        'Le graphe est vide. « L’interrogatoire » faisait la même chose avec une Map : c’est ici la façon de faire d’un vrai projet.',
    },
    {
      title: 'Une liste chaînée',
      body:
        'Le Blueprint ne connaît pas le dialogue. Il ne garde qu’**un Row Name** : celui de la réplique à dire. Tout le reste est dans la table.\n\n' +
        'Chaque ligne dit **où aller ensuite** (Suivante). Pour avancer, on range Suivante dans Ligne : au prochain appui, Get Data Table Row lira la ligne d’après.\n\n' +
        'Fin du dialogue : Suivante vaut **None** (un Name vide). Aucune ligne ne s’appelle None : Get Data Table Row sort alors par **Row Not Found**. Pas besoin de test spécial.',
    },
    {
      title: 'Les nœuds',
      body:
        '- **Get Data Table Row (DT_Dialogue)** : Row Name = Get Ligne.\n- **Break S_Replique** sur Out Row : Personnage, Texte, Suivante.\n- **Append** (trois entrées, réglables dans Details) : Personnage, « : », Texte.\n- **Set Ligne** = Suivante.',
    },
    {
      title: 'Le plan',
      body:
        '**E** (Pressed) → **Get Data Table Row** (Row Name = Ligne) :\n\n' +
        '1. **Row Found** → **Print String** (Personnage : Texte) → **Set Ligne** = Suivante.\n2. **Row Not Found** → **Print String** « Fin de la conversation ».\n\n' +
        'Le test appuie quatre fois : trois répliques, puis la fin.',
    },
    {
      title: 'Le piège',
      body:
        'Tester la fin **sur la réplique en cours** : « si Suivante est None, c’est fini » (Branch sur Is None), avant de l’afficher. La dernière réplique a justement Suivante = None : elle n’est jamais dite, le joueur entend « Fin » trop tôt.\n\n' +
        'La fin se constate au tour **d’après** : on dit la réplique, on avance sur None, et c’est le prochain Get Data Table Row qui ne trouve rien. Row Not Found fait ce travail tout seul.\n\n' +
        'Dans Station enterrée comme dans tout jeu narratif, la même table peut porter un son, une émotion, un choix : chaque colonne ajoutée à la structure arrive dans le Break, sans toucher au reste.',
    },
  ],
  objectives: [
    'Dans BP_Radio, sur E : Get Data Table Row (DT_Dialogue), Row Name = Ligne.',
    'Row Found : affiche « Personnage : Texte », puis range Suivante dans Ligne.',
    'Row Not Found : affiche « Fin de la conversation ».',
    'Touche Vérifier : quatre appuis sur E.',
  ],
  hints: [
    'Ligne est le seul état du dialogue : la table dit le reste.',
    'Nœuds : Input E, Get Ligne, Get Data Table Row (DT_Dialogue), Break S_Replique, Append (3 entrées), Print String, Set Ligne, un second Print String.',
    'Solution : E → Get Data Table Row (Ligne) ; Row Found → Print String (Append(Personnage, « : », Texte)) → Set Ligne = Suivante ; Row Not Found → Print String « Fin de la conversation ».',
  ],
  challenge: 'Ajoute à S_Replique un membre Duree (Float) et fais attendre la radio Duree secondes avant d’accepter l’appui suivant. Puis ajoute une réplique entre Station et Fenetre, sans toucher au graphe.',
  setup: dialogueProject,
  scenario: [{ wait: 0.2 }, ...PRESS_E, ...PRESS_E, ...PRESS_E, { checkpoint: 'trois' }, ...PRESS_E],
  checks: [
    {
      id: 'lines',
      label: 'Les trois répliques, dans l’ordre',
      at: 'trois',
      test: (cx) => {
        const said = cx.prints().map(normText);
        const want = SPOKEN.map(normText);
        if (said.slice(0, 3).join('|') === want.join('|')) return true;
        if (said[2] === normText('Fin de la conversation')) return 'La dernière réplique n’est jamais dite : la fin est testée sur sa Suivante (None) avant de l’afficher. Dis la réplique, avance, et laisse Row Not Found constater la fin au tour suivant.';
        return `Affiché : ${cx.prints().join(' / ') || 'rien'}. Il fallait « ${SPOKEN.join(' » puis « ')} ».`;
      },
    },
    {
      id: 'end',
      label: '4e appui : « Fin de la conversation »',
      test: (cx) => (countPrints(cx, 'fin de la conversation') === 1 ? true : 'Après la dernière réplique, Suivante vaut None : Get Data Table Row sort par Row Not Found, qui doit afficher « Fin de la conversation ».'),
    },
    noEmptyLine('Une ligne vide s’affiche : Out Row est lu sur le chemin Row Not Found.'),
    notion(usesNode('row', 'BP_Radio', ['dataTable.getRow'], 'Les répliques viennent de la Data Table', 'Lis la réplique dans DT_Dialogue avec Get Data Table Row.')),
    noRuntimeErrors(),
  ],
  solve: (p) => solveDialogue(p),
  avoid: [
    {
      defs: ['flow.switchString', 'map.find'],
      in: 'BP_Radio',
      label: 'Les répliques écrites dans le graphe',
      why: 'Le texte et l’ordre des répliques sont déjà dans DT_Dialogue : un Switch ou une Map dans le graphe les recopie, et il faudrait les retoucher à chaque réplique ajoutée.',
    },
  ],
};
