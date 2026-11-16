/**
 * V6, Débutant: "Débogue D10 — Le compteur qui ment" (exercise E04 of the
 * collection). A pass counter tests its threshold before counting: the
 * message comes one pass late, then again at every pass. The fix is an
 * order, not a new node.
 */
import { disconnectPin } from '../../operations/graphOps';
import { T } from '../../types/pins';
import { edit, ProjectBuilder } from '../builder';
import { countPrints, noRuntimeErrors, printedNumbers } from '../checks';
import type { CheckContext, Lesson, ScenarioStep } from '../types';
import { DEBUG_METHOD, nodeOf, nodesOf, varOf } from './kit';

const GOAL = 'Objectif atteint';
const pass: ScenarioStep[] = [{ teleport: [0, 0] }, { wait: 0.2 }, { teleport: [-500, 0] }, { wait: 0.2 }];

function gateProject() {
  const pb = new ProjectBuilder('Débogue D10');
  const b = pb.blueprint('BP_Portique');
  b.component('StaticMesh', 'Borne', { shape: 'cylinder', sizeX: 40, sizeY: 40, y: -140, color: '#0e7490', blocks: false });
  b.component('BoxCollision', 'Zone', { sizeX: 220, sizeY: 220 });
  const passages = b.variable('Passages', T.int, 0);
  pb.place(b, 0, 0);
  pb.playerStart(-500, 0);
  const over = b.node('event.actorBeginOverlap', {}, {}, [64, 96]);
  const br = b.node('flow.branch', {}, {}, [380, 96]);
  const eq = b.node('math.equalInt', {}, { b: 3 }, [220, 320]);
  const goal = b.node('debug.printString', {}, { text: GOAL }, [700, 40]);
  const inc = b.node('var.incrementInt', {}, {}, [700, 280]);
  const show = b.node('debug.printString', {}, {}, [1020, 280]);
  b.link(over, 'then', br, 'exec').link(b.node('var.get', { variable: passages }, {}, [64, 330]), 'value', eq, 'a').link(eq, 'result', br, 'condition');
  b.link(br, 'true', goal, 'exec').link(br, 'false', inc, 'exec');
  b.link(b.node('var.get', { variable: passages }, {}, [520, 440]), 'value', inc, 'value').link(inc, 'then', show, 'exec').link(inc, 'result', show, 'text');
  return pb.project;
}

const goals = (cx: CheckContext) => countPrints(cx, GOAL);

export const debug10: Lesson = {
  id: 'd10-compteur-ment',
  kind: 'debug',
  code: 'D10',
  module: 'Premiers pas',
  level: 'debutant',
  number: 0,
  title: 'Le compteur qui ment',
  situation:
    'Le portique compte les passages du joueur et affiche le total. Au 3e passage, il doit annoncer « Objectif atteint », une seule fois. Aujourd’hui l’annonce arrive un passage trop tard, puis se répète à chaque passage, et le compteur reste bloqué.',
  notions: ['Ordre lecture / écriture', 'Increment Int', 'Equal (Integer)', 'Branch', 'Print String'],
  remember:
    'Une variable vaut ce qu’elle vaut au moment où le fil blanc passe : tester avant de compter, ou compter avant de tester, ne donne pas le même résultat. Quand un seuil se déclenche « un coup trop tard », regarde l’ordre.',
  cards: [
    DEBUG_METHOD,
    {
      title: 'Ce que fait chaque nœud',
      body:
        '**Event ActorBeginOverlap** : le point de départ, une fois par entrée du joueur dans la Zone.\n\n' +
        '**Increment Int** : ajoute 1 à la variable reliée à sa pin en losange (ici `Passages`), et donne la nouvelle valeur sur sa pin de sortie. C’est lui qui **écrit**.\n\n' +
        '**Equal (Integer)** (`==`) : un nœud vert, sans fil blanc. Il **lit** `Passages` au moment où le Branch lui demande le résultat, pas avant.\n\n' +
        '**Branch** : envoie le fil blanc sur True ou sur False selon ce résultat. Une seule des deux sorties s’exécute.',
    },
    {
      title: 'Suivre la valeur, passage après passage',
      body:
        'Fais le tableau à la main avant de lancer Play. Au 1er passage, `Passages` vaut 0 quand le Branch pose sa question : 0 == 3 ? Non. La sortie False compte : `Passages` passe à 1.\n\n' +
        'Continue jusqu’au 4e passage. À quel passage la réponse devient-elle « oui » ? Et ce passage-là, est-il compté ?\n\n' +
        'Pour vérifier ton tableau : place un **breakpoint** sur le Branch (appui long), lance Play et regarde la valeur de `Passages` à chaque arrêt.',
    },
    {
      title: 'Ce qu’on attend',
      body:
        'À chaque passage : d’abord **compter**, puis **afficher** le total, puis seulement **se demander** si l’objectif est atteint.\n\n' +
        'Avec cet ordre, le 3e passage affiche 3 puis l’annonce ; le 4e affiche 4 et la comparaison (4 == 3) est fausse : l’annonce ne revient pas, sans rien ajouter au graphe.\n\n' +
        'Tous les nœuds nécessaires sont déjà là. Il s’agit de changer des fils, pas d’en poser de nouveaux.',
    },
  ],
  objectives: [
    'Chaque passage est compté et son total affiché : 1, 2, 3, 4, 5.',
    '« Objectif atteint » s’affiche au 3e passage, pas au 4e.',
    'Il ne s’affiche qu’une fois, même si le joueur repasse.',
  ],
  hints: [
    'Le Branch pose sa question avant que le passage soit compté. Que vaut Passages à ce moment-là, au 3e passage ?',
    'Aucun nœud à ajouter : Event ActorBeginOverlap, Increment Int, Print String, Equal (Integer), Branch, Print String. Seul l’ordre des fils blancs change.',
    'Solution : Event ActorBeginOverlap → Increment Int → Print String (le total) → Branch (Passages == 3) → True : Print String « Objectif atteint ». La sortie False ne mène plus à rien.',
  ],
  challenge: 'Remplace == par >= : que se passe-t-il au 4e passage ? Ajoute alors un DoOnce pour garder une seule annonce.',
  setup: gateProject,
  scenario: [{ wait: 0.2 }, ...pass, ...pass, ...pass, { checkpoint: 'trois' }, ...pass, ...pass],
  checks: [
    {
      id: 'count',
      label: 'Chaque passage est compté et affiché : 1, 2, 3, 4, 5',
      test: (cx) => {
        const n = printedNumbers(cx);
        if (n.join() === '1,2,3,4,5') return true;
        return `Totaux affichés : ${n.join(', ') || 'aucun'}. Il fallait 1, 2, 3, 4, 5 : chaque passage doit passer par Increment Int puis par le Print String du total, y compris celui de l’annonce.`;
      },
    },
    {
      id: 'third',
      label: '« Objectif atteint » s’affiche au 3e passage',
      at: 'trois',
      test: (cx) =>
        goals(cx) >= 1
          ? true
          : 'Après trois passages, toujours pas d’annonce : le Branch compare Passages à 3 avant que le 3e passage soit compté. À ce moment, Passages vaut encore 2.',
    },
    {
      id: 'once',
      label: 'Une seule annonce, même aux passages suivants',
      test: (cx) => (goals(cx) === 1 ? true : goals(cx) === 0 ? 'L’annonce ne s’est jamais affichée.' : `L’annonce s’est affichée ${goals(cx)} fois : un passage qui annonce sans compter laisse Passages à 3, et la question « == 3 ? » reste vraie pour toujours.`),
    },
    {
      id: 'value',
      label: 'Après 5 passages, Passages vaut 5',
      test: (cx) => (varOf(cx, 'BP_Portique', 'Passages') === 5 ? true : `Passages vaut ${String(varOf(cx, 'BP_Portique', 'Passages'))} après 5 passages : un passage n’a pas été compté.`),
    },
    noRuntimeErrors(),
  ],
  solve(p) {
    const b = edit(p, 'BP_Portique');
    const g = b.graph;
    const over = nodeOf(g, 'event.actorBeginOverlap');
    const br = nodeOf(g, 'flow.branch');
    const inc = nodeOf(g, 'var.incrementInt');
    const show = nodesOf(g, 'debug.printString').find((n) => n.defaults.text !== GOAL)!.id;
    disconnectPin(g, { node: over, pin: 'then' });
    disconnectPin(g, { node: br, pin: 'false' });
    b.link(over, 'then', inc, 'exec').link(show, 'then', br, 'exec');
  },
};
