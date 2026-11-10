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
import { countPrints, noRuntimeErrors, notUsing, PRESS_E, notion } from '../checks';
import type { CheckContext, Lesson } from '../types';
import { playerInteracts } from './module3';
import { doorBlueprint, playerBlueprint } from './props';

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
  situation:
    'E près du terminal : il lit le badge du joueur et répond « Accès autorisé » ou « Accès refusé ». E près de la porte : elle s’ouvre et répond « Porte ouverte ». Le rocher, lui, ne répond rien. Le joueur affiche la réponse.',
  notions: ['Interface avec entrée et sortie', 'Implémentation en fonction', 'Valeur par défaut d’un message'],
  remember:
    'Une fonction d’interface qui renvoie une valeur s’implémente comme une fonction, pas comme un événement. Envoyée à un acteur qui ne l’implémente pas, elle renvoie la valeur par défaut, sans erreur : teste la réponse avant de t’en servir.',
  cards: [
    {
      title: 'Donner et recevoir',
      body:
        'Ouvre **BPI_Interactif** (Content Browser) : la fonction **Interagir** peut avoir des **Inputs** et des **Outputs**, comme une fonction.\n\n' +
        'Ajoute l’entrée `Niveau` (Integer) et la sortie `Reponse` (String). Le nœud **Interagir (Message)** du joueur gagne aussitôt ces pins.',
    },
    {
      title: 'Un événement ne rend rien',
      body:
        'Dès qu’Interagir a une sortie, **Event Interagir** ne compile plus : un événement ne peut rien renvoyer à celui qui envoie le message. UE implémente alors la fonction comme une **fonction**.\n\n' +
        'Dans BP_Terminal et BP_Porte : My Blueprint › **Interfaces** › **Interagir** ouvre cette fonction, avec son **Return Node**. Déplace-y la logique, et supprime l’ancien Event Interagir.',
    },
    {
      title: 'Le silence du rocher',
      body:
        'Le message part aussi vers le rocher, qui n’implémente pas l’interface. Rien ne s’exécute chez lui, aucune erreur… et `Reponse` vaut sa **valeur par défaut** : un texte vide.\n\n' +
        'Avant d’afficher, vérifie que la réponse n’est pas vide (**!=** String) ou que la cible implémente l’interface (**Does Implement Interface**).',
    },
  ],
  objectives: [
    'Ajoute à Interagir l’entrée Niveau (Integer) et la sortie Reponse (String).',
    'Le terminal répond « Accès autorisé » si Niveau ≥ 2, sinon « Accès refusé ». La porte s’ouvre et répond « Porte ouverte ».',
    'Le joueur envoie son NiveauBadge et affiche la réponse, seulement si elle n’est pas vide.',
  ],
  hints: [
    'Une fois la sortie ajoutée, l’implémentation se trouve dans My Blueprint › Interfaces, pas dans l’Event Graph.',
    'Nœuds : (terminal) Niveau ≥ 2 → Select String ou Branch, Return Node ; (porte) Set Relative Rotation puis Return Node « Porte ouverte » ; (joueur) Get NiveauBadge → Niveau, Branch (Reponse != vide) → Print String.',
    'Solution : terminal : Entry → Branch (Niveau ≥ 2) → Return « Accès autorisé » / Return « Accès refusé ». Porte : Entry → Set Relative Rotation (Z 90) → Return « Porte ouverte ». Joueur : Interagir (Message, Niveau = NiveauBadge) → Branch (Reponse != "") → Print Reponse.',
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
        if (countPrints(cx, AUTORISE)) return true;
        if (countPrints(cx, REFUSE)) return 'Le terminal répond « Accès refusé » : le joueur a NiveauBadge = 2. Relie Get NiveauBadge à l’entrée Niveau du message.';
        if (countPrints(cx, 'Terminal')) return 'Le terminal affiche encore « Terminal » : sa réponse doit sortir par le Return Node de sa fonction Interagir, et le joueur l’afficher.';
        return 'Rien n’a été affiché près du terminal : le joueur doit afficher la Reponse renvoyée par le message.';
      },
    },
    {
      id: 'rocher',
      label: 'E près du rocher : rien ne s’affiche',
      at: 'rocher',
      test: (cx) =>
        cx.prints().filter((p) => p.trim() === '').length === 0
          ? true
          : 'Une ligne vide s’affiche près du rocher : il n’implémente pas l’interface, le message renvoie donc un texte vide. Teste la réponse (!= "") avant le Print String.',
    },
    {
      id: 'porte',
      label: 'E près de la porte : elle s’ouvre et répond « Porte ouverte »',
      test: (cx) => {
        const yaw = cx.component('BP_Porte', 'Porte')?.props.yaw ?? 0;
        if (Math.abs(Math.abs(yaw) - 90) > 1) return 'La porte n’a pas tourné de 90°.';
        return countPrints(cx, OUVERTE) ? true : 'La porte s’ouvre mais sa réponse « Porte ouverte » ne s’affiche pas.';
      },
    },
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
    removeNodes(d.b.graph, Object.values(d.b.graph.nodes).filter((n) => n.def === 'component.setRelativeRotation').map((n) => n.id));
    const rot = d.f.node('component.setRelativeRotation', {}, { rotation: { x: 0, y: 0, z: 90 } }, [300, 96]);
    d.f.link(d.entry, 'then', rot, 'exec').target('Porte', rot).link(rot, 'then', d.ret, 'exec');
    d.f.graph.nodes[d.ret].defaults[reponse.id] = OUVERTE;
    // Player: send NiveauBadge, print the answer only when there is one.
    const pl = edit(p, 'BP_Joueur');
    const msg = Object.values(pl.graph.nodes).find((n) => n.def === 'iface.message')!.id;
    const badge = pl.cls.variables.find((v) => v.name === 'NiveauBadge')!.id;
    const ne = pl.node('string.notEqual', {}, {}, [1300, 300]);
    const br2 = pl.node('flow.branch', {}, {}, [1300, 96]);
    const pr = pl.node('debug.printString', {}, {}, [1600, 96]);
    pl.link(pl.node('var.get', { variable: badge }, {}, [800, 300]), 'value', msg, niveau.id);
    pl.link(msg, 'then', br2, 'exec').link(msg, reponse.id, ne, 'a').link(ne, 'result', br2, 'condition');
    pl.link(br2, 'true', pr, 'exec').link(msg, reponse.id, pr, 'text');
  },
};

/** The trap: the answer printed without testing it (an empty line for the rock). For the tests. */
export function solveTerminalWithoutTest(p: Parameters<Lesson['solve']>[0]): void {
  lessonTerminal.solve(p);
  const pl = edit(p, 'BP_Joueur');
  const nodes = Object.values(pl.graph.nodes);
  const msg = nodes.find((n) => n.def === 'iface.message')!.id;
  const br = nodes.find((n) => n.def === 'flow.branch')!.id;
  const pr = nodes.find((n) => n.def === 'debug.printString')!.id;
  removeNodes(pl.graph, [br, ...nodes.filter((n) => n.def === 'string.notEqual').map((n) => n.id)]);
  pl.link(msg, 'then', pr, 'exec');
}
