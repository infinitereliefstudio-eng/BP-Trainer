/**
 * V6, Avancé: "Complète C4 — La bonne cible dans le viseur" (E07). The
 * player's crosshair names the interactive object in front of him, within
 * two metres, and nothing else: not a wall, not an object behind it, not a
 * target that has just been destroyed.
 */
import { implementInterface } from '../../operations/classOps';
import { addInterface, addInterfaceFunction, setPlayerClass } from '../../operations/projectOps';
import { T } from '../../types/pins';
import { edit, ProjectBuilder, type ClassBuilder } from '../builder';
import { noRuntimeErrors, normText } from '../checks';
import type { CheckContext, Lesson } from '../types';
import { gap, getVar, nodeOf, nodesOf, say, tap, SHARED_KEYS } from './kit';

const REACH = 200;

function crosshairProject() {
  const pb = new ProjectBuilder('La bonne cible dans le viseur');
  const p = pb.project;
  const r = addInterface(p, 'BPI_Interactif');
  if (!r.ok) throw new Error(r.reason);
  addInterfaceFunction(p, r.value.id, 'Interagir');
  const iface = r.value.id;
  const fn = r.value.functions[0].id;
  const thing = (name: string, color: string): ClassBuilder => {
    const b = pb.blueprint(name);
    b.component('StaticMesh', 'Corps', { sizeX: 60, sizeY: 60, color });
    implementInterface(b.cls, iface);
    const ev = b.node('event.interface', { interface: iface, fn }, {}, [64, 96]);
    b.link(ev, 'then', say(b, [400, 96], `${name.slice(3)} utilisé`), 'exec');
    return b;
  };
  const lever = thing('BP_Levier', '#f59e0b');
  const chest = thing('BP_Coffre', '#92400e');
  // F breaks the chest that can be broken.
  chest.cls.autoReceiveInput = true;
  const fragile = chest.variable('Fragile', T.bool, false);
  chest.cls.variables.find((v) => v.id === fragile)!.instanceEditable = true;
  const key = chest.node('event.inputKey', { key: 'F', consumeInput: false }, {}, [64, 400]);
  const can = chest.node('flow.branch', {}, {}, [340, 400]);
  chest.link(key, 'pressed', can, 'exec').link(getVar(chest, 'Fragile', [160, 580]), 'value', can, 'condition').link(can, 'true', chest.node('actor.destroy', {}, {}, [640, 400]), 'exec');
  const wall = pb.blueprint('BP_Mur');
  wall.component('StaticMesh', 'Mur', { sizeX: 24, sizeY: 220, color: '#4b5563' });

  const player = pb.blueprint('BP_Joueur', 'Pawn');
  setPlayerClass(p, player.cls.id);
  player.component('TextRender', 'Viseur', { y: -70, text: '' });
  player.variable('Portee', T.float, REACH);
  const begin = player.node('event.beginPlay', {}, {}, [64, 96]);
  const timer = player.node('time.setTimerByEvent', {}, { time: 0.1, looping: true }, [360, 96]);
  const aim = player.node('event.custom', { name: 'Viser' }, {}, [64, 420]);
  const trace = player.node('trace.lineByChannel', {}, {}, [760, 420]);
  const from = player.node('actor.getLocation', {}, {}, [200, 640]);
  const name = player.node('component.setText', {}, {}, [1700, 320]);
  const none = player.node('component.setText', {}, { value: '' }, [1700, 620]);
  player.link(begin, 'then', timer, 'exec').link(aim, 'delegate', timer, 'event').link(aim, 'then', trace, 'exec').link(from, 'result', trace, 'start');
  player.target('Viseur', name).target('Viseur', none);
  gap(player, 'Trou 1 : End = Start + avant × Portee', [330, 760], 400, 240);
  gap(player, 'Trou 2 : touché ET interactif ?', [1180, 380], 420, 300);
  gap(player, 'Trou 3 : le nom de l’objet touché', [1400, 100], 280, 180);

  const far = pb.place(chest, 0, 150);
  pb.project.level.actors.find((a) => a.id === far)!.overrides[fragile] = true;
  pb.place(lever, 150, 0);
  pb.place(wall, -100, 0);
  pb.place(lever, -165, 0); // behind the wall
  pb.place(chest, 0, -420); // too far
  pb.playerStart(0, 0, 0);
  return pb.project;
}

const label = (cx: CheckContext) => String(cx.sim.player.components.find((c) => c.name === 'Viseur')?.props.text ?? '');

function reads(id: string, at: string | undefined, text: string, word: string, why: string) {
  return {
    id,
    label: text,
    at,
    test: (cx: CheckContext) => {
      const got = label(cx);
      if (word === '' ? got === '' : normText(got).includes(normText(word))) return true;
      return `Le viseur affiche ${got ? `« ${got} »` : 'un texte vide'}. ${why}`;
    },
  };
}

export const complete4: Lesson = {
  id: 'c4-viseur',
  kind: 'complete',
  code: 'C4',
  module: 'Interaction',
  level: 'avance',
  number: 0,
  title: 'La bonne cible dans le viseur',
  situation:
    'Dix fois par seconde, le joueur lance un rayon devant lui. Son viseur (un Text Render) doit afficher le nom de l’objet interactif qu’il regarde, à 2 mètres au plus, et rester vide dans tous les autres cas : rien devant lui, un mur, un objet derrière le mur, un objet trop loin. Trois morceaux du graphe manquent, dans les cadres jaunes.',
  notions: ['Line Trace By Channel', 'Out Hit', 'Get Actor Forward Vector', 'Does Implement Interface', 'Get Display Name', 'Set Timer by Event', 'Set Text'],
  remember:
    'Le viseur d’un jeu, c’est un Line Trace répété (un timer suffit, pas besoin de Tick) dont on lit deux choses : a-t-il touché quelque chose, et ce quelque chose est-il de ceux qui m’intéressent. On remet l’affichage à vide à chaque fois que la réponse est non, sinon il garde le dernier nom vu.',
  cards: [
    {
      title: 'Ce qui est en place',
      body:
        'Dans **BP_Joueur** : au BeginPlay, un **Set Timer by Event** en Looping appelle `Viser` toutes les 0,1 s. `Viser` lance un **Line Trace By Channel** dont **Start** est déjà relié à la position du joueur.\n\n' +
        'Deux **Set Text** attendent, reliés au Text Render `Viseur` : celui du haut pour écrire un nom, celui du bas pour vider le viseur.\n\n' +
        'Dans le niveau : un levier devant le joueur, un coffre sur le côté, un mur avec un second levier caché derrière, un second coffre au loin. Levier et coffre implémentent **BPI_Interactif** ; le mur, non.\n\n' +
        'Pourquoi un timer et pas Event Tick ? Viser 10 fois par seconde suffit pour un affichage, et coûte six fois moins que 60 fois.\n\n' + SHARED_KEYS,
    },
    {
      title: 'Trou 1 : où finit le rayon',
      body:
        'Un Line Trace va d’une **position** à une autre. **End** n’est pas une direction : c’est le point au bout du rayon.\n\n' +
        '- **Get Actor Forward Vector** : la direction « devant le joueur », de longueur 1.\n' +
        '- **Multiply (Vector * Float)** par `Portee` (200) : la même direction, longue de 2 mètres.\n' +
        '- **Add (Vector)** avec la position du joueur : le point situé 2 mètres devant lui.\n\n' +
        'Relie le résultat à **End**. Le Get Actor Location déjà posé peut servir aux deux : Start et l’addition.\n\n' +
        'Pour voir le rayon en Play, règle **Draw Debug Type** du Line Trace sur For One Frame.',
    },
    {
      title: 'Trou 2 : qu’a-t-on touché ?',
      body:
        'Le Line Trace sort un Boolean, **Return Value** : vrai si le rayon a rencontré quelque chose qui bloque. Et **Out Hit Hit Actor** : l’acteur rencontré.\n\n' +
        'Vrai ne suffit pas : le rayon s’arrête aussi sur le mur. Il faut savoir si l’acteur touché est interactif. **Does Implement Interface** (choisis BPI_Interactif dans ses Details) répond vrai ou faux pour l’objet relié à sa pin Object. Sur None il répond faux, sans erreur.\n\n' +
        'Assemble les deux avec **AND Boolean**, puis un **Branch** : True vers le Set Text du haut, False vers celui du bas.\n\n' +
        'C’est le mur qui protège le levier caché : le rayon renvoie le **premier** objet rencontré, et s’arrête là.',
    },
    {
      title: 'Trou 3 : son nom',
      body:
        '**Get Display Name** donne le nom affiché d’un objet (`BP_Levier`, `BP_Coffre2`…) sous forme de String. Relie Out Hit Hit Actor à son entrée et sa sortie à la pin **Value** du Set Text du haut.\n\n' +
        'Dans un vrai jeu on afficherait plutôt un texte choisi par l’objet (« Ouvrir le coffre ») : une fonction de l’interface qui renvoie ce texte, comme dans la leçon « Le terminal ».\n\n' +
        'Dernier cas du test : le coffre est détruit pendant que le joueur le regarde. Rien à ajouter pour lui : au tir suivant, le rayon ne rencontre plus rien et la sortie False vide le viseur. C’est l’avantage de **tout recalculer à chaque tir** plutôt que de garder la cible en mémoire.',
    },
  ],
  objectives: [
    'Trou 1 : End = position du joueur + Get Actor Forward Vector × Portee.',
    'Trou 2 : un Branch sur « Return Value AND Does Implement Interface (BPI_Interactif) », True vers le Set Text du haut, False vers celui du bas.',
    'Trou 3 : Get Display Name de Out Hit Hit Actor, vers Value du Set Text du haut.',
    'Touche Vérifier : le joueur regarde le levier, le coffre, le mur, le coffre lointain, le vide, puis le coffre est détruit sous ses yeux.',
  ],
  hints: [
    'Fais les trous dans l’ordre et lance Play après le premier, avec Draw Debug Type sur For One Frame : le rayon doit partir du joueur vers l’avant, long de 2 mètres.',
    'Nœuds : Get Actor Forward Vector, Get Portee, Multiply (Vector * Float), Add (Vector) ; Does Implement Interface, AND Boolean, Branch ; Get Display Name.',
    'Solution : End = Get Actor Location + Get Actor Forward Vector × Portee. Line Trace → Branch (Return Value AND Does Implement Interface (Hit Actor)) → True : Set Text (Viseur, Get Display Name (Hit Actor)) ; False : Set Text (Viseur, vide).',
  ],
  challenge: 'Ajoute une action IA_Interagir sur E dans IMC_Joueur : si le viseur n’est pas vide, envoie Interagir (Message) à l’objet visé. Il te faudra garder Hit Actor dans une variable… et vérifier qu’il est encore valide (Is Valid).',
  setup: crosshairProject,
  scenario: [
    { wait: 0.3 },
    { checkpoint: 'levier' },
    { look: 90 },
    { wait: 0.25 },
    { checkpoint: 'coffre' },
    { look: 180 },
    { wait: 0.25 },
    { checkpoint: 'mur' },
    { look: -90 },
    { wait: 0.25 },
    { checkpoint: 'loin' },
    { look: 45 },
    { wait: 0.25 },
    { checkpoint: 'vide' },
    { look: 90 },
    { wait: 0.25 },
    ...tap('F'),
    { wait: 0.25 },
  ],
  checks: [
    reads('lever', 'levier', 'Face au levier : le viseur affiche son nom', 'Levier', 'Le rayon doit partir du joueur et finir 2 mètres devant lui (End = Start + avant × Portee), puis le nom de Hit Actor aller dans le Set Text du haut.'),
    reads('chest', 'coffre', 'Tourné vers le coffre : « BP_Coffre »', 'Coffre', 'End doit suivre le regard du joueur : Get Actor Forward Vector, pas une direction fixe.'),
    reads('wall', 'mur', 'Face au mur (un levier est derrière) : viseur vide', '', 'Le rayon s’arrête sur le mur, qui n’est pas interactif : la condition doit aussi demander Does Implement Interface, et la sortie False vider le viseur.'),
    reads('far', 'loin', 'Un coffre à plus de 2 mètres : viseur vide', '', 'Le rayon ne doit pas dépasser Portee (200 cm).'),
    reads('void', 'vide', 'Rien devant le joueur : viseur vide', '', 'Quand le rayon ne touche rien, la sortie False du Branch doit mener au Set Text du bas.'),
    reads('gone', undefined, 'Le coffre regardé est détruit : le viseur se vide', '', 'Le viseur garde le nom d’un objet qui n’existe plus : il doit être recalculé à chaque tir.'),
    noRuntimeErrors(),
  ],
  solve(p) {
    const b = edit(p, 'BP_Joueur');
    const g = b.graph;
    const trace = nodeOf(g, 'trace.lineByChannel');
    const from = nodeOf(g, 'actor.getLocation');
    const [name, none] = nodesOf(g, 'component.setText').sort((x, y) => x.y - y.y).map((n) => n.id);
    const fwd = b.node('actor.getForward', {}, {}, [360, 820]);
    const reach = b.node('math.multiplyVectorFloat', {}, {}, [520, 860]);
    const end = b.node('math.addVector', {}, {}, [640, 800]);
    b.link(fwd, 'result', reach, 'a').link(getVar(b, 'Portee', [360, 920]), 'value', reach, 'b').link(from, 'result', end, 'a').link(reach, 'result', end, 'b').link(end, 'result', trace, 'end');
    const can = b.node('iface.doesImplement', { interface: p.interfaces[0].id }, {}, [1200, 560]);
    const both = b.node('logic.and', {}, {}, [1420, 520]);
    const br = b.node('flow.branch', {}, {}, [1440, 420]);
    b.link(trace, 'hitActor', can, 'object').link(trace, 'result', both, 'a').link(can, 'result', both, 'b').link(both, 'result', br, 'condition');
    b.link(trace, 'then', br, 'exec').link(br, 'true', name, 'exec').link(br, 'false', none, 'exec');
    const text = b.node('conv.objectToString', {}, {}, [1440, 180]);
    b.link(trace, 'hitActor', text, 'in').link(text, 'result', name, 'value');
  },
};
