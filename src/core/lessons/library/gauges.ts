/**
 * V5, numbers that stay in bounds: a battery gauge kept between 0 and 100
 * with Clamp (Débutant), and a fan whose speed cycles with the modulo
 * (Intermédiaire, a variation on the key switch).
 */
import { T } from '../../types/pins';
import { edit, ProjectBuilder } from '../builder';
import { noRuntimeErrors, notion, printedNumbers as numbers, usesNode } from '../checks';
import type { ClassBuilder } from '../builder';
import type { Lesson, ScenarioStep } from '../types';

const press = (key: 'E' | 'F'): ScenarioStep[] => [{ press: key }, { release: key }];

// ------------------------------------------------------- La jauge d’énergie

function gaugeProject() {
  const pb = new ProjectBuilder('La jauge d’énergie');
  const b = pb.blueprint('BP_Batterie');
  b.component('StaticMesh', 'Boitier', { sizeX: 80, sizeY: 120, color: '#0f766e', blocks: false });
  b.variable('Energie', T.int, 50);
  b.cls.autoReceiveInput = true;
  pb.place(b, 0, 0);
  pb.playerStart(-300, 0);
  return pb.project;
}

/** Key → Set Energie (bounded) → Print String. `bound` wires the sum to the Set's value through the bounding nodes. */
function gaugeBranch(b: ClassBuilder, key: 'E' | 'F', y: number, amount: number, bound: (sum: string, y: number) => { node: string; pin: string }) {
  const energie = b.cls.variables.find((v) => v.name === 'Energie')!.id;
  const ev = b.node('event.inputKey', { key }, {}, [64, y]);
  const get = b.node('var.get', { variable: energie }, {}, [120, y + 200]);
  const add = b.node(amount > 0 ? 'math.addInt' : 'math.subtractInt', {}, { b: Math.abs(amount) }, [320, y + 200]);
  const set = b.node('var.set', { variable: energie }, {}, [840, y]);
  const say = b.node('debug.printString', {}, {}, [1140, y]);
  const out = bound(add, y + 200);
  b.link(get, 'value', add, 'a').link(out.node, out.pin, set, 'value');
  b.link(ev, 'pressed', set, 'exec').link(set, 'then', say, 'exec').link(set, 'out', say, 'text');
}

export const lessonGauge: Lesson = {
  id: 'l-jauge',
  module: 'Variables',
  level: 'debutant',
  number: 0,
  title: 'La jauge d’énergie',
  situation: 'La batterie a 50 d’énergie. E la recharge de 30, F en consomme 45. Elle ne doit jamais dépasser 100 ni descendre sous 0, et affiche sa valeur après chaque appui.',
  notions: ['Variable Integer', 'Clamp (Integer)', 'Get / Set'],
  remember: 'Calcule, borne, puis range : Clamp ramène un résultat entre Min et Max en un seul nœud. Il ne change pas la variable : c’est le Set qui le fait.',
  cards: [
    {
      title: 'Une valeur qui a des limites',
      body:
        'Une jauge (vie, énergie, carburant) a presque toujours un minimum et un maximum. Sans précaution, `Energie + 30` donne 110 : le calcul ne connaît pas tes limites.\n\n' +
        'On pourrait tester avec un **Branch** : si le résultat dépasse 100, ranger 100, sinon ranger le résultat. Puis recommencer pour 0. Cela marche, mais demande deux Branch et quatre Set.',
    },
    {
      title: 'Clamp',
      body:
        '**Clamp (Integer)** fait ce travail seul : il reçoit une valeur, un **Min** et un **Max**, et rend la valeur ramenée entre les deux. `Clamp(110, 0, 100)` rend 100 ; `Clamp(-35, 0, 100)` rend 0 ; `Clamp(55, 0, 100)` rend 55.\n\n' +
        'C’est un nœud **pur** (sans pin blanche) : il calcule, il ne range rien. Relie sa sortie au **Set Energie**.',
    },
    {
      title: 'L’ordre du calcul',
      body:
        'Lis de gauche à droite : **Get Energie** → **+ 30** → **Clamp (0, 100)** → **Set Energie** → **Print String**.\n\n' +
        'Le Set a une pin de sortie qui redonne la valeur qu’il vient de ranger : relie-la au Print String, pour afficher la valeur après le changement.',
    },
  ],
  objectives: [
    'Touche E : ajoute 30 à Energie, sans dépasser 100.',
    'Touche F : retire 45 à Energie, sans descendre sous 0.',
    'Après chaque appui, affiche la nouvelle valeur d’Energie avec Print String.',
    'Touche Vérifier.',
  ],
  hints: [
    'Les deux touches font la même chose, avec un calcul différent : calculer, borner, ranger, afficher.',
    'Nœuds, pour chaque touche : l’événement de touche, Get Energie, + ou − (Integer), Clamp (Integer) avec Min 0 et Max 100, Set Energie, Print String.',
    'Solution : E Pressed → Set Energie (Clamp(Energie + 30, 0, 100)) → Print String. F Pressed → Set Energie (Clamp(Energie − 45, 0, 100)) → Print String.',
  ],
  challenge: 'Affiche « Pleine » quand la jauge atteint 100 et « Vide » quand elle tombe à 0.',
  setup: gaugeProject,
  scenario: [{ wait: 0.2 }, ...press('E'), ...press('E'), { checkpoint: 'haut' }, ...press('F'), ...press('F'), ...press('F'), { checkpoint: 'bas' }, ...press('E')],
  checks: [
    {
      id: 'max',
      label: 'Deux recharges : 80, puis 100 (pas 110)',
      at: 'haut',
      test: (cx) => {
        const n = numbers(cx);
        if (n.join() === '80,100') return true;
        if (n.includes('110')) return 'La batterie affiche 110 : le résultat n’est pas borné. Fais passer Energie + 30 par un Clamp (Min 0, Max 100) avant le Set.';
        if (n.join() === '50,80') return 'Les valeurs affichées sont 50 puis 80 : le Print String lit Energie avant le Set. Affiche-la après.';
        return n.length ? `Nombres affichés : ${n.join(', ')}. Il fallait 80, puis 100.` : 'Rien ne s’affiche quand on appuie sur E : relie E (Pressed) au Set, puis à un Print String.';
      },
    },
    {
      id: 'min',
      label: 'Trois consommations : 55, 10, puis 0 (pas −35)',
      at: 'bas',
      test: (cx) => {
        const n = numbers(cx).slice(2);
        if (n.join() === '55,10,0') return true;
        if (n.some((v) => Number(v) < 0)) return `La batterie affiche ${n.find((v) => Number(v) < 0)} : une énergie négative. Borne aussi le résultat de la soustraction (Min 0).`;
        return n.length ? `Après les appuis sur F : ${n.join(', ')}. Il fallait 55, 10, puis 0.` : 'Rien ne s’affiche quand on appuie sur F.';
      },
    },
    {
      id: 'again',
      label: 'Depuis 0, une recharge donne 30',
      test: (cx) => (cx.variable('BP_Batterie', 'Energie') === 30 ? true : `Energie vaut ${cx.variable('BP_Batterie', 'Energie')} à la fin : depuis 0, une recharge doit donner 30.`),
    },
    notion(usesNode('clamp', 'BP_Batterie', ['math.clampInt', 'math.clampFloat', 'math.minInt', 'math.maxInt'], 'Les limites sont tenues par Clamp (ou Min et Max)', 'Des Branch tiennent les limites : un Clamp le fait en un nœud par touche.')),
    noRuntimeErrors(),
  ],
  solve(p) {
    const b = edit(p, 'BP_Batterie');
    const clamp = (sum: string, y: number) => {
      const c = b.node('math.clampInt', {}, { min: 0, max: 100 }, [560, y]);
      b.link(sum, 'result', c, 'value');
      return { node: c, pin: 'result' };
    };
    gaugeBranch(b, 'E', 96, 30, clamp);
    gaugeBranch(b, 'F', 520, -45, clamp);
  },
  alternatives: [
    {
      title: 'Avec Min et Max',
      gains: 'Chaque touche ne borne que le côté qu’elle peut dépasser : Min (résultat, 100) pour la recharge, Max (résultat, 0) pour la consommation.',
      loses: 'Le jour où une recharge négative ou un autre bonus existe, la limite oubliée manque : Clamp tient les deux côtés sans y penser.',
      build(p) {
        const b = edit(p, 'BP_Batterie');
        const bound = (def: string, limit: number) => (sum: string, y: number) => {
          const c = b.node(def, {}, { b: limit }, [560, y]);
          b.link(sum, 'result', c, 'a');
          return { node: c, pin: 'result' };
        };
        gaugeBranch(b, 'E', 96, 30, bound('math.minInt', 100));
        gaugeBranch(b, 'F', 520, -45, bound('math.maxInt', 0));
      },
    },
  ],
};

// ------------------------------------------------------------ Le ventilateur

function fanProject() {
  const pb = new ProjectBuilder('Le ventilateur');
  const b = pb.blueprint('BP_Ventilateur');
  b.component('StaticMesh', 'Socle', { shape: 'cylinder', sizeX: 90, sizeY: 90, color: '#475569', blocks: false });
  b.variable('Vitesse', T.int, 0);
  b.cls.autoReceiveInput = true;
  pb.place(b, 0, 0);
  pb.playerStart(-300, 0);
  return pb.project;
}

export const lessonFan: Lesson = {
  id: 'l-ventilateur',
  module: 'Choisir un chemin',
  level: 'intermediaire',
  number: 0,
  title: 'Le ventilateur',
  situation: 'Le ventilateur a quatre réglages : 0 (arrêt), 1, 2, 3. Chaque appui sur E passe au suivant, et après 3 on revient à 0. Il affiche sa vitesse à chaque appui.',
  notions: ['% (Integer)', 'Variable Integer', 'Cycle'],
  remember: 'Pour faire tourner une valeur en rond, ajoute 1 puis prends le reste de la division par la taille du cycle : (Vitesse + 1) % 4 donne 1, 2, 3, 0, 1…',
  cards: [
    {
      title: 'Plus que deux états',
      body:
        'L’interrupteur à touche alternait entre deux états avec un Boolean. Ici il y en a quatre : il faut un **Integer**, et une façon de revenir à 0 après 3.\n\n' +
        'On peut l’écrire avec un **Branch** : si Vitesse vaut 3, ranger 0, sinon ranger Vitesse + 1. Cela marche. Mais il existe une opération faite pour ça.',
    },
    {
      title: 'Le modulo',
      body:
        '**% (Integer)** rend le **reste** de la division entière. `1 % 4` = 1, `3 % 4` = 3, et `4 % 4` = **0** : le reste retombe à zéro dès qu’on atteint la taille du cycle.\n\n' +
        'Donc `(Vitesse + 1) % 4` donne exactement la suite voulue : 1, 2, 3, 0, 1, 2… sans aucun Branch.',
    },
    {
      title: 'Pourquoi c’est mieux',
      body:
        'Le jour où le ventilateur a six vitesses, il suffit de changer le 4 en 6. Avec des Branch, il faudrait retoucher la condition, et ne pas se tromper d’un cran.\n\n' +
        'Le même calcul sert partout où quelque chose boucle : l’objet suivant d’un inventaire, le point suivant d’une patrouille, une action une fois sur trois.',
    },
  ],
  objectives: [
    'À chaque appui sur E : Vitesse passe à la suivante (0 → 1 → 2 → 3 → 0…).',
    'Affiche la nouvelle Vitesse avec Print String.',
    'Touche Vérifier.',
  ],
  hints: ['Il faut ajouter 1, puis faire revenir 4 à 0.', 'Nœuds : E (Pressed), Get Vitesse, + (Integer), % (Integer) avec 4, Set Vitesse, Print String.', 'Solution : E Pressed → Set Vitesse ((Vitesse + 1) % 4) → Print String (la sortie du Set).'],
  challenge: 'Ajoute la touche F pour revenir à la vitesse précédente : (Vitesse + 3) % 4. Pourquoi + 3 et pas − 1 ?',
  setup: fanProject,
  scenario: [{ wait: 0.2 }, ...press('E'), ...press('E'), ...press('E'), { checkpoint: 'trois' }, ...press('E'), ...press('E')],
  checks: [
    {
      id: 'up',
      label: 'Trois appuis : 1, 2, 3',
      at: 'trois',
      test: (cx) => {
        const n = numbers(cx);
        if (n.join() === '1,2,3') return true;
        if (n.join() === '0,1,2') return 'Les vitesses affichées sont 0, 1, 2 : le Print String lit Vitesse avant le Set. Affiche-la après.';
        return n.length ? `Vitesses affichées : ${n.join(', ')}. Il fallait 1, 2, 3.` : 'Rien ne s’affiche quand on appuie sur E.';
      },
    },
    {
      id: 'wrap',
      label: 'Le 4e appui revient à 0, le 5e repart à 1',
      test: (cx) => {
        const n = numbers(cx).slice(3);
        if (n.join() === '0,1') return true;
        if (n[0] === '4') return 'Le 4e appui affiche 4 : la vitesse ne revient pas à 0. Prends le reste de la division par 4 : (Vitesse + 1) % 4.';
        return `Après le 3e appui : ${n.join(', ') || 'rien'}. Il fallait 0, puis 1.`;
      },
    },
    notion(usesNode('modulo', 'BP_Ventilateur', ['math.moduloInt'], 'Le retour à 0 est fait par % (Integer)', 'Un Branch ramène la vitesse à 0 : le modulo le fait sans condition, et s’adapte en changeant un seul nombre.')),
    noRuntimeErrors(),
  ],
  solve(p) {
    const b = edit(p, 'BP_Ventilateur');
    const v = b.cls.variables[0].id;
    const ev = b.node('event.inputKey', { key: 'E' }, {}, [64, 96]);
    const get = b.node('var.get', { variable: v }, {}, [120, 300]);
    const add = b.node('math.addInt', {}, { b: 1 }, [320, 300]);
    const mod = b.node('math.moduloInt', {}, { b: 4 }, [540, 300]);
    const set = b.node('var.set', { variable: v }, {}, [800, 96]);
    const say = b.node('debug.printString', {}, {}, [1100, 96]);
    b.link(get, 'value', add, 'a').link(add, 'result', mod, 'a').link(mod, 'result', set, 'value');
    b.link(ev, 'pressed', set, 'exec').link(set, 'then', say, 'exec').link(set, 'out', say, 'text');
  },
  robustness: [
    {
      id: 'held',
      label: 'on appuie douze fois de suite',
      advice: 'La vitesse doit rester entre 0 et 3 quel que soit le nombre d’appuis : (Vitesse + 1) % 4.',
      scenario: [{ wait: 0.2 }, ...Array.from({ length: 12 }, () => press('E')).flat()],
      checks: [
        {
          id: 'cycle',
          label: 'trois tours complets',
          test: (cx) => (numbers(cx).join() === '1,2,3,0,1,2,3,0,1,2,3,0' ? true : `Après douze appuis, les vitesses affichées sont ${numbers(cx).join(', ')}.`),
        },
      ],
    },
  ],
};
