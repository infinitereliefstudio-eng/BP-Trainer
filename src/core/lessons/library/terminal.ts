/**
 * V3, Avancé: "Le terminal" — an interface function with an input and an
 * output. UE then implements it as a function (My Blueprint › Interfaces),
 * not an event, and a message to an actor that does not implement it
 * returns the default value without any error.
 */
import { implementInterface } from '../../operations/classOps';
import { addInterfaceParam, syncInterfaceGraphs } from '../../operations/interfaceOps';
import { addInterface, addInterfaceFunction } from '../../operations/projectOps';
import { removeNodes } from '../../operations/graphOps';
import { T } from '../../types/pins';
import { edit, ProjectBuilder, type ClassBuilder } from '../builder';
import { noRuntimeErrors, notUsing, PRESS_E, notion } from '../checks';
import type { CheckContext, Lesson } from '../types';
import { playerInteracts } from './module3';
import { doorBlueprint, playerBlueprint } from './props';
import { afficher, countTold, messageWidget, onScreen, ownMessages, told } from './messageHud';

const AUTORISE = 'Accès autorisé';
const REFUSE = 'Accès refusé';
const OUVERTE = 'Porte ouverte';

function terminalProject() {
  const pb = new ProjectBuilder('Le terminal');
  const { b: player } = playerBlueprint(pb);
  player.variable('NiveauBadge', T.int, 2);
  const door = doorBlueprint(pb);
  const term = pb.blueprint('BP_Terminal');
  term.component('StaticMesh', 'Ecran', { sizeX: 70, sizeY: 50, color: '#1d4ed8' });
  term.component('TextRender', 'Etiquette', { y: -50, text: 'Terminal' });
  term.component('BoxCollision', 'Zone', { sizeX: 200, sizeY: 200 });
  const rock = pb.blueprint('BP_Rocher');
  rock.component('StaticMesh', 'Rocher', { shape: 'cylinder', sizeX: 70, sizeY: 70, color: '#78716c' });
  rock.component('BoxCollision', 'Zone', { sizeX: 200, sizeY: 200 });
  pb.place(term, -500, 300);
  pb.place(rock, -500, -300);
  pb.playerStart(-800, 0);
  // Lesson 11's interaction, as the starting point: an interface with no inputs or outputs.
  const r = addInterface(pb.project, 'BPI_Interactif');
  if (!r.ok) throw new Error(r.reason);
  addInterfaceFunction(pb.project, r.value.id, 'Interagir');
  const iface = r.value.id;
  const fn = r.value.functions[0].id;
  playerInteracts(player, iface, fn);
  // V7.59: the answer goes to the screen (WBP_Messages, made by the player), not to the Output Log.
  ownMessages(player, messageWidget(pb.project));
  for (const b of [door, term]) implementInterface(b.cls, iface);
  const de = door.node('event.interface', { interface: iface, fn }, {}, [64, 520]);
  const rot = door.node('component.setRelativeRotation', {}, { rotation: { x: 0, y: 0, z: 90 } }, [400, 520]);
  door.link(de, 'then', rot, 'exec').target('Porte', rot);
  const te = term.node('event.interface', { interface: iface, fn }, {}, [64, 96]);
  const tp = term.node('debug.printString', {}, { text: 'Terminal' }, [400, 96]);
  term.link(te, 'then', tp, 'exec');
  return pb.project;
}

const fnOf = (cx: CheckContext) => cx.project.interfaces.find((i) => i.name === 'BPI_Interactif')?.functions.find((f) => f.name === 'Interagir');

export const lessonTerminal: Lesson = {
  id: 'l-terminal',
  module: 'Communication',
  level: 'avance',
  number: 0,
  title: 'Le terminal',
  // V7.59: WBP_Messages made by BP_Joueur, the answer shown on the screen.
  revision: 2,
  situation:
    'E près du terminal : il lit le badge du joueur et répond « Accès autorisé » ou « Accès refusé ». E près de la porte : elle s’ouvre et répond « Porte ouverte ». Le rocher, lui, ne répond rien. Le joueur affiche la réponse à l’écran.',
  notions: ['Interface avec entrée et sortie', 'Implémentation en fonction', 'Valeur par défaut d’un message'],
  remember:
    'Une fonction d’interface qui renvoie une valeur s’implémente comme une fonction, pas comme un événement. Envoyée à un acteur qui ne l’implémente pas, elle renvoie la valeur par défaut, sans erreur : teste la réponse avant de t’en servir.',
  cards: [
    {
      title: 'Ce qui est en place',
      body:
        'Le monde de « Interagir avec tout », en plus riche :\n\n' +
        '- **BPI_Interactif** avec sa fonction **Interagir**, sans entrée ni sortie pour l’instant.\n- **BP_Joueur** : sur IA_Interagir (la touche E), envoie Interagir (Message) à tout ce qu’il touche. Il a une variable **NiveauBadge** (Integer, 2). Au BeginPlay, il crée **WBP_Messages**, une ligne de texte en bas de l’écran, et la garde dans sa variable **Messages**.\n- **BP_Terminal** : implémente l’interface ; son Event Interagir affiche « Terminal ».\n- **BP_Porte** : implémente l’interface ; son Event Interagir l’ouvre.\n- **BP_Rocher** : n’implémente rien.\n\n' +
        'Le but : un vrai échange. Le joueur **donne** son niveau de badge, l’objet **répond** un texte, et le joueur affiche la réponse **à l’écran**.',
    },
    {
      title: 'Une interface qui donne et reçoit',
      body:
        'Ouvre **BPI_Interactif** (Content Drawer) : la fonction Interagir peut avoir des **Inputs** et des **Outputs**, comme une fonction ordinaire. Ajoute :\n\n' +
        '- l’entrée **Niveau** (Integer) ;\n- la sortie **Reponse** (String).\n\n' +
        'Le nœud **Interagir (Message)** du joueur gagne aussitôt une pin Niveau en entrée et une pin Reponse en sortie.',
    },
    {
      title: 'Un événement ne rend rien',
      body:
        'Dès qu’Interagir a une **sortie**, les **Event Interagir** ne compilent plus. Un événement ne peut rien renvoyer : il part, et celui qui l’a déclenché n’attend pas de réponse.\n\n' +
        'UE implémente alors la fonction d’interface comme une **fonction** : dans BP_Terminal et BP_Porte, My Blueprint › **Interfaces** › **Interagir** ouvre son graphe, avec un nœud d’entrée (qui donne Niveau) et un **Return Node** (qui prend Reponse). Déplace la logique dedans, et supprime l’ancien Event Interagir.\n\n' +
        '- **Terminal** : Branch (Niveau **>=** 2) → Return Node « Accès autorisé » / un second Return Node « Accès refusé ».\n- **Porte** : Set Relative Rotation (Yaw 90) → Return Node « Porte ouverte ».',
    },
    {
      title: 'Le silence du rocher',
      body:
        'Le message part aussi vers le rocher. Il n’implémente pas l’interface : rien ne s’exécute chez lui, aucune erreur… et **Reponse** vaut sa **valeur par défaut**, un texte vide. Afficher sans tester donne une ligne vide.\n\n' +
        'Côté joueur :\n\n' +
        '1. Interagir (Message), **Niveau** = Get NiveauBadge.\n2. → **Branch** (Reponse **!=** "") : le texte n’est pas vide.\n3. True → **Afficher** (Texte = Reponse), la fonction de WBP_Messages : Get **Messages**, tire un fil et cherche « Afficher ».\n\n' +
        'Pourquoi pas Print String ? Dans UE, Print String sert à déboguer : il n’apparaît pas dans un jeu livré. Ce que le joueur doit lire passe par un widget.\n\n' +
        'C’est la même règle que pour Find sur une Map : une réponse par défaut n’est pas une vraie réponse.',
    },
    {
      title: 'Dans UE',
      body:
        'Dans UE aussi, une fonction d’interface avec une valeur de retour apparaît sous Interfaces dans My Blueprint et s’implémente en double-cliquant dessus. **Does Implement Interface** permet de tester une cible avant de lui écrire, quand la réponse vide pourrait être une vraie réponse.',
    },
  ],
  objectives: [
    'Ajoute à Interagir l’entrée Niveau (Integer) et la sortie Reponse (String).',
    'Le terminal répond « Accès autorisé » si Niveau ≥ 2, sinon « Accès refusé ». La porte s’ouvre et répond « Porte ouverte ».',
    'Le joueur envoie son NiveauBadge et affiche la réponse à l’écran (Afficher, sur Messages), seulement si elle n’est pas vide.',
  ],
  hints: [
    'Une fonction d’interface qui rend une valeur : où se trouve son implémentation, dans l’Event Graph ou dans My Blueprint › Interfaces ?',
    'Nœuds : (terminal) Niveau ≥ 2 → Select String ou Branch, Return Node ; (porte) Set Relative Rotation puis Return Node « Porte ouverte » ; (joueur) Get NiveauBadge → Niveau, Branch (Reponse != vide), Get Messages → Afficher.',
    'Solution : terminal : Entry → Branch (Niveau ≥ 2) → Return « Accès autorisé » / Return « Accès refusé ». Porte : Entry → Set Relative Rotation (Z 90) → Return « Porte ouverte ». Joueur : Interagir (Message, Niveau = NiveauBadge) → Branch (Reponse != "") → Afficher (Target = Messages, Texte = Reponse).',
  ],
  challenge: 'Mets NiveauBadge à 1 sur le joueur : que répond le terminal ? Ajoute un BP_Coffre qui répond « Verrouillé » sans toucher au joueur.',
  setup: terminalProject,
  scenario: [
    { wait: 0.2 },
    { teleport: [-500, 180] },
    { wait: 0.1 },
    ...PRESS_E,
    { checkpoint: 'terminal' },
    { teleport: [-500, -180] },
    { wait: 0.1 },
    ...PRESS_E,
    { checkpoint: 'rocher' },
    { teleport: [-150, 0] },
    { wait: 0.1 },
    ...PRESS_E,
  ],
  checks: [
    {
      id: 'signature',
      label: 'Interagir a l’entrée Niveau (Integer) et la sortie Reponse (String)',
      test: (cx) => {
        const fn = fnOf(cx);
        if (!fn) return 'BPI_Interactif doit garder sa fonction Interagir.';
        if (!fn.inputs?.some((p) => p.type.category === 'int')) return 'Ajoute à Interagir une entrée Integer (Niveau), dans BPI_Interactif.';
        if (!fn.outputs?.some((p) => p.type.category === 'string')) return 'Ajoute à Interagir une sortie String (Reponse), dans BPI_Interactif.';
        return true;
      },
    },
    {
      id: 'terminal',
      label: 'E près du terminal : « Accès autorisé »',
      at: 'terminal',
      test: (cx) => {
        if (countTold(cx, AUTORISE)) return true;
        if (countTold(cx, REFUSE)) return 'Le terminal répond « Accès refusé » : le joueur a NiveauBadge = 2. Relie Get NiveauBadge à l’entrée Niveau du message.';
        if (countTold(cx, 'Terminal')) return 'Le terminal affiche encore « Terminal » : sa réponse doit sortir par le Return Node de sa fonction Interagir, et le joueur l’afficher.';
        return 'Rien n’a été affiché près du terminal : le joueur doit afficher la Reponse renvoyée par le message.';
      },
    },
    {
      id: 'rocher',
      label: 'E près du rocher : rien ne s’affiche',
      at: 'rocher',
      test: (cx) =>
        told(cx).filter((p) => p.trim() === '').length === 0
          ? true
          : 'Une ligne vide s’affiche près du rocher : il n’implémente pas l’interface, le message renvoie donc un texte vide. Teste la réponse (!= "") avant de l’afficher.',
    },
    {
      id: 'porte',
      label: 'E près de la porte : elle s’ouvre et répond « Porte ouverte »',
      test: (cx) => {
        const yaw = cx.component('BP_Porte', 'Porte')?.props.yaw ?? 0;
        if (Math.abs(Math.abs(yaw) - 90) > 1) return 'La porte n’a pas tourné de 90°.';
        return countTold(cx, OUVERTE) ? true : 'La porte s’ouvre mais sa réponse « Porte ouverte » ne s’affiche pas.';
      },
    },
    notion({
      id: 'ecran',
      label: 'La réponse s’affiche à l’écran (WBP_Messages)',
      test: (cx) => (onScreen(cx, AUTORISE) ? true : 'La réponse passe par Print String : le joueur ne la verrait pas dans un jeu livré. Envoie-la à Afficher, sur la variable Messages.'),
    }),
    notion(notUsing('nocast', 'BP_Joueur', ['cast.to'], 'Aucun Cast dans BP_Joueur', 'BP_Joueur utilise un Cast : le message d’interface suffit.')),
    noRuntimeErrors(),
  ],
  solve(p) {
    const iface = p.interfaces.find((i) => i.name === 'BPI_Interactif')!;
    const fn = iface.functions[0];
    const niveau = addInterfaceParam(p, iface.id, fn.id, 'inputs', T.int)!;
    const reponse = addInterfaceParam(p, iface.id, fn.id, 'outputs', T.string)!;
    niveau.name = 'Niveau';
    reponse.name = 'Reponse';
    const implement = (name: string): { b: ClassBuilder; f: ClassBuilder; entry: string; ret: string } => {
      const b = edit(p, name);
      removeNodes(b.graph, Object.values(b.graph.nodes).filter((n) => n.def === 'event.interface').map((n) => n.id));
      syncInterfaceGraphs(p, b.cls);
      const g = b.cls.graphs.find((x) => x.iface)!;
      const entry = Object.values(g.nodes).find((n) => n.def === 'fn.entry')!.id;
      const ret = Object.values(g.nodes).find((n) => n.def === 'fn.return')!.id;
      for (const l of Object.values(g.links)) if (l.from.node === entry) delete g.links[l.id];
      return { b, f: b.inGraph(g.id), entry, ret };
    };
    // Terminal: Niveau >= 2 ? autorisé : refusé
    const t = implement('BP_Terminal');
    for (const n of Object.values(t.b.graph.nodes)) if (n.def === 'debug.printString') removeNodes(t.b.graph, [n.id]);
    const br = t.f.node('flow.branch', {}, {}, [300, 96]);
    const ge = t.f.node('math.greaterEqualInt', {}, { b: 2 }, [200, 300]);
    const no = t.f.node('fn.return', { graph: t.b.cls.graphs.find((x) => x.iface)!.id }, { [reponse.id]: REFUSE }, [700, 300]);
    t.f.link(t.entry, 'then', br, 'exec').link(t.entry, niveau.id, ge, 'a').link(ge, 'result', br, 'condition');
    t.f.link(br, 'true', t.ret, 'exec').link(br, 'false', no, 'exec');
    t.f.graph.nodes[t.ret].defaults[reponse.id] = AUTORISE;
    // Door: rotate, then answer.
    const d = implement('BP_Porte');
    removeNodes(d.b.graph, Object.values(d.b.graph.nodes).filter((n) => n.def === 'component.setRelativeRotation' || n.def === 'var.component').map((n) => n.id));
    const rot = d.f.node('component.setRelativeRotation', {}, { rotation: { x: 0, y: 0, z: 90 } }, [300, 96]);
    d.f.link(d.entry, 'then', rot, 'exec').target('Porte', rot).link(rot, 'then', d.ret, 'exec');
    d.f.graph.nodes[d.ret].defaults[reponse.id] = OUVERTE;
    // Player: send NiveauBadge, print the answer only when there is one.
    const pl = edit(p, 'BP_Joueur');
    const msg = Object.values(pl.graph.nodes).find((n) => n.def === 'iface.message')!.id;
    const badge = pl.cls.variables.find((v) => v.name === 'NiveauBadge')!.id;
    const ne = pl.node('string.notEqual', {}, {}, [1300, 300]);
    const br2 = pl.node('flow.branch', {}, {}, [1300, 96]);
    const show = afficher(p, pl, [1600, 96]);
    pl.link(pl.node('var.get', { variable: badge }, {}, [800, 300]), 'value', msg, niveau.id);
    pl.link(msg, 'then', br2, 'exec').link(msg, reponse.id, ne, 'a').link(ne, 'result', br2, 'condition');
    pl.link(br2, 'true', show.call, 'exec').link(msg, reponse.id, show.call, show.pin);
  },
};

/** The trap: the answer printed without testing it (an empty line for the rock). For the tests. */
export function solveTerminalWithoutTest(p: Parameters<Lesson['solve']>[0]): void {
  lessonTerminal.solve(p);
  const pl = edit(p, 'BP_Joueur');
  const nodes = Object.values(pl.graph.nodes);
  const msg = nodes.find((n) => n.def === 'iface.message')!.id;
  const br = nodes.find((n) => n.def === 'flow.branch')!.id;
  const pr = nodes.find((n) => n.def === 'call.function')!.id;
  removeNodes(pl.graph, [br, ...nodes.filter((n) => n.def === 'string.notEqual').map((n) => n.id)]);
  pl.link(msg, 'then', pr, 'exec');
}
