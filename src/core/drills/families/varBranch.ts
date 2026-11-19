/**
 * Family « Variables et Branch » : keep a number or a Boolean between two
 * events, and choose a path with it. Three situations:
 * - the pass counter: alert from the Nth pass on, or only at the Nth (== or >=);
 * - the vending machine: a credit spent per pass, then a refusal (Branch with two outputs);
 * - the switch: a Boolean toggled with NOT, the light following it (lit or off at the start).
 */
import { noRuntimeErrors, printedNumbers } from '../../lessons/checks';
import { ProjectBuilder } from '../../lessons/builder';
import type { Check } from '../../lessons/types';
import { T } from '../../types/pins';
import { cut, norm, passThrough, replaceNode, wire } from '../edit';
import type { Family, Situation } from '../types';

const count = (prints: string[], text: string) => prints.filter((p) => norm(p).includes(norm(text))).length;
const nth = (n: number) => (n === 1 ? '1er' : `${n}e`);

// ------------------------------------------------------------ the counter

interface CounterP {
  n: number;
  /** Only at the Nth pass (==), rather than from the Nth on (>=). */
  exact: boolean;
}

const counter: Situation<CounterP> = {
  id: 'compteur',
  title: 'Le compteur de passages',
  className: 'BP_Borne',
  params: (r) => ({ n: r.int(2, 4), exact: r.next() < 0.5 }),
  base() {
    const pb = new ProjectBuilder('Mini-exercice');
    const b = pb.blueprint('BP_Borne');
    b.component('StaticMesh', 'Socle', { sizeX: 60, sizeY: 60, color: '#64748b', blocks: false });
    b.component('BoxCollision', 'Zone', { sizeX: 220, sizeY: 220 });
    b.variable('Passages', T.int, 0);
    pb.place(b, 0, 0);
    pb.playerStart(-500, 0);
    return pb.project;
  },
  chain(b, _p, { n, exact }) {
    const v = b.cls.variables.find((x) => x.name === 'Passages')!.id;
    const event = b.node('event.actorBeginOverlap', {}, {}, [64, 96]);
    const inc = b.node('var.incrementInt', {}, {}, [380, 96]);
    const print = b.node('debug.printString', {}, {}, [680, 96]);
    const branch = b.node('flow.branch', {}, {}, [1000, 96]);
    const alarm = b.node('debug.printString', {}, { text: 'Alerte !' }, [1300, 96]);
    const compare = b.node(exact ? 'math.equalInt' : 'math.greaterEqualInt', {}, { b: n }, [760, 330]);
    b.link(event, 'then', inc, 'exec').link(b.node('var.get', { variable: v }, {}, [300, 300]), 'value', inc, 'value');
    b.link(inc, 'then', print, 'exec').link(inc, 'result', print, 'text');
    b.link(print, 'then', branch, 'exec').link(b.node('var.get', { variable: v }, {}, [560, 400]), 'value', compare, 'a').link(compare, 'result', branch, 'condition');
    b.link(branch, 'true', alarm, 'exec');
    return { event, inc, print, branch, alarm, compare };
  },
  situation: ({ n, exact }) =>
    `**BP_Borne** compte les passages du joueur dans sa Zone, dans sa variable **Passages**, et affiche le total à chaque fois. ${
      exact ? `Au ${nth(n)} passage, et **seulement** à celui-là, elle affiche « Alerte ! ».` : `À partir du ${nth(n)} passage, et à **chacun** des suivants, elle affiche aussi « Alerte ! ».`
    }`,
  objectives: ({ n, exact }) => [
    'À chaque entrée dans la Zone, Passages augmente de 1 et son total s’affiche.',
    exact ? `« Alerte ! » s’affiche au ${nth(n)} passage seulement.` : `« Alerte ! » s’affiche à partir du ${nth(n)} passage.`,
  ],
  hints: ({ n, exact }) => [
    exact ? `Au ${nth(n + 1)} passage, l’alerte doit-elle revenir ? Quelle comparaison dit « exactement » ?` : `Au ${nth(n + 1)} passage, l’alerte doit-elle revenir ? Quelle comparaison dit « au moins » ?`,
    `Nœuds : Event ActorBeginOverlap, Increment Int (Get Passages sur le losange), Print String, ${exact ? '== (Integer)' : '>= (Integer)'}, Branch, Print String « Alerte ! ».`,
    `BeginOverlap → Increment Int (Passages) → Print String (sa Return Value) → Branch (Passages ${exact ? '==' : '>='} ${n}) → True : Print String « Alerte ! ».`,
  ],
  remember: 'Un Get donne la valeur du moment : compter d’abord, afficher et comparer ensuite. == vaut pour une seule valeur, >= pour toutes les suivantes.',
  notions: ['Variable Integer', 'Increment Int', 'Branch'],
  scenario: ({ n }) => [
    { wait: 0.2 },
    ...Array.from({ length: n - 1 }, () => passThrough()).flat(),
    { checkpoint: 'avant' },
    ...passThrough(),
    { checkpoint: 'nieme' },
    ...passThrough(),
  ],
  checks: ({ n, exact }): Check[] => [
    {
      id: 'count',
      label: `Après ${n + 1} passages, Passages vaut ${n + 1}`,
      test: (cx) => {
        const v = cx.variable('BP_Borne', 'Passages');
        if (v === n + 1) return true;
        if (!v) return 'Passages vaut toujours 0 : le nœud qui l’augmente n’est pas sur le fil blanc de l’overlap.';
        return `Passages vaut ${v} après ${n + 1} passages : ajoute exactement 1 par entrée.`;
      },
    },
    {
      id: 'shown',
      label: 'Le total s’affiche à chaque passage, à partir de 1',
      test: (cx) => {
        const got = printedNumbers(cx).join(', ');
        const want = Array.from({ length: n + 1 }, (_, i) => i + 1).join(', ');
        if (got === want) return true;
        if (got.startsWith('0')) return `Affiché : ${got}. Le Print String lit Passages avant qu’il soit augmenté : affiche-le après l’Increment.`;
        return got ? `Affiché : ${got}. Il fallait ${want}.` : 'Aucun total affiché : relie la valeur de Passages à In String d’un Print String sur le fil.';
      },
    },
    {
      id: 'quiet',
      label: `Pas d’alerte avant le ${nth(n)} passage`,
      at: 'avant',
      test: (cx) => (count(cx.prints(), 'alerte') === 0 ? true : `« Alerte ! » s’affiche déjà avant le ${nth(n)} passage : regarde le nombre comparé.`),
    },
    {
      id: 'on-time',
      label: `L’alerte s’affiche au ${nth(n)} passage`,
      at: 'nieme',
      test: (cx) => (count(cx.prints(), 'alerte') === 1 ? true : `Pas d’alerte au ${nth(n)} passage : la condition du Branch doit être vraie quand Passages vaut ${n}, et l’alerte partir de True.`),
    },
    {
      id: 'after',
      label: exact ? `Plus d’alerte au ${nth(n + 1)} passage` : `L’alerte revient au ${nth(n + 1)} passage`,
      test: (cx) => {
        const k = count(cx.prints(), 'alerte');
        if (k === (exact ? 1 : 2)) return true;
        return exact
          ? `L’alerte revient au ${nth(n + 1)} passage : il la fallait seulement au ${nth(n)}. == (égal) plutôt que >= (au moins).`
          : `L’alerte ne revient pas au ${nth(n + 1)} passage : elle doit rester à partir du ${nth(n)}. >= (au moins) plutôt que == (égal).`;
      },
    },
    noRuntimeErrors(),
  ],
  gaps: [
    [
      { role: 'inc', label: 'Increment Int (Passages)' },
      { role: 'compare', label: 'Comparaison (Integer)' },
    ],
    [
      { role: 'print', label: 'Print String (le total)' },
      { role: 'branch', label: 'Branch' },
    ],
    [
      { role: 'compare', label: 'Comparaison (Integer)' },
      { role: 'branch', label: 'Branch' },
      { role: 'alarm', label: 'Print String « Alerte ! »' },
    ],
  ],
  mistakes: [
    {
      id: 'inc-off-wire',
      what: 'l’Increment est posé à côté du fil blanc',
      apply(p, r) {
        cut(p, 'BP_Borne', r.inc, 'exec');
        cut(p, 'BP_Borne', r.inc, 'then');
        cut(p, 'BP_Borne', r.inc, 'result');
        wire(p, 'BP_Borne', r.event, 'then', r.print, 'exec');
      },
    },
    {
      id: 'print-before',
      what: 'le total est affiché avant d’être augmenté',
      apply(p, r) {
        const g = p.classes.find((c) => c.name === 'BP_Borne')!.graphs[0];
        const read = Object.values(g.links).find((l) => l.to.node === r.compare && l.to.pin === 'a')!.from.node;
        for (const [n, pin] of [
          [r.event, 'then'],
          [r.inc, 'then'],
          [r.print, 'then'],
          [r.print, 'text'],
        ] as const)
          cut(p, 'BP_Borne', n, pin);
        wire(p, 'BP_Borne', r.event, 'then', r.print, 'exec');
        wire(p, 'BP_Borne', r.print, 'then', r.inc, 'exec');
        wire(p, 'BP_Borne', r.inc, 'then', r.branch, 'exec');
        wire(p, 'BP_Borne', read, 'value', r.print, 'text');
      },
    },
    {
      id: 'off-by-one',
      what: 'le seuil comparé est décalé d’un',
      apply(p, r, { n }) {
        p.classes.find((c) => c.name === 'BP_Borne')!.graphs[0].nodes[r.compare].defaults.b = n + 1;
      },
    },
    {
      id: 'wrong-compare',
      what: '== et >= sont inversés',
      apply(p, r, { exact }) {
        replaceNode(p, 'BP_Borne', r.compare, exact ? 'math.greaterEqualInt' : 'math.equalInt');
      },
    },
    {
      id: 'false-branch',
      what: 'l’alerte part de False',
      apply(p, r) {
        cut(p, 'BP_Borne', r.alarm, 'exec');
        wire(p, 'BP_Borne', r.branch, 'false', r.alarm, 'exec');
      },
    },
  ],
};

// ------------------------------------------------------- the vending machine

interface VendingP {
  credits: number;
  drink: string;
}

const vending: Situation<VendingP> = {
  id: 'distributeur',
  title: 'Le distributeur',
  className: 'BP_Distributeur',
  params: (r) => ({ credits: r.int(2, 4), drink: r.pick(['Café', 'Thé', 'Soupe']) }),
  base({ credits }) {
    const pb = new ProjectBuilder('Mini-exercice');
    const b = pb.blueprint('BP_Distributeur');
    b.component('StaticMesh', 'Caisson', { sizeX: 70, sizeY: 90, color: '#7c3aed', blocks: false });
    b.component('BoxCollision', 'Zone', { sizeX: 220, sizeY: 220 });
    b.variable('Credits', T.int, credits);
    pb.place(b, 0, 0);
    pb.playerStart(-500, 0);
    return pb.project;
  },
  chain(b, _p, { drink }) {
    const v = b.cls.variables.find((x) => x.name === 'Credits')!.id;
    const event = b.node('event.actorBeginOverlap', {}, {}, [64, 96]);
    const branch = b.node('flow.branch', {}, {}, [380, 96]);
    const compare = b.node('math.greaterInt', {}, { b: 0 }, [200, 330]);
    const dec = b.node('var.decrementInt', {}, {}, [680, 40]);
    const serve = b.node('debug.printString', {}, { text: drink }, [980, 40]);
    const empty = b.node('debug.printString', {}, { text: 'Plus de crédit' }, [680, 300]);
    b.link(event, 'then', branch, 'exec').link(b.node('var.get', { variable: v }, {}, [40, 360]), 'value', compare, 'a').link(compare, 'result', branch, 'condition');
    b.link(branch, 'true', dec, 'exec').link(b.node('var.get', { variable: v }, {}, [560, 220]), 'value', dec, 'value').link(dec, 'then', serve, 'exec');
    b.link(branch, 'false', empty, 'exec');
    return { event, branch, compare, dec, serve, empty };
  },
  situation: ({ credits, drink }) =>
    `**BP_Distributeur** a **${credits} crédits** (sa variable Credits). À chaque passage du joueur dans sa Zone, s’il reste au moins un crédit, il en retire un et affiche « ${drink} ». Sinon, il affiche « Plus de crédit », sans rien retirer.`,
  objectives: ({ drink }) => [`Tant qu’il reste des crédits, chaque passage retire 1 crédit et affiche « ${drink} ».`, 'Ensuite, chaque passage affiche « Plus de crédit », et Credits ne descend jamais sous 0.'],
  hints: ({ drink }) => [
    'Deux cas, deux chemins : lequel des deux retire un crédit ? Que doit valoir la condition quand Credits vaut 0 ?',
    `Nœuds : Event ActorBeginOverlap, > (Integer), Branch, Decrement Int (Get Credits sur le losange), deux Print String (« ${drink} », « Plus de crédit »).`,
    `BeginOverlap → Branch (Credits > 0) → True : Decrement Int (Credits) → Print String « ${drink} » ; False : Print String « Plus de crédit ».`,
  ],
  remember: 'Un Branch a deux sorties : chacune mène à sa propre suite. La condition se lit au moment où le Branch s’exécute.',
  notions: ['Variable Integer', 'Branch', 'Decrement Int', 'Comparer deux Integer'],
  scenario: ({ credits }) => [{ wait: 0.2 }, ...Array.from({ length: credits + 2 }, () => passThrough()).flat()],
  checks: ({ credits, drink }): Check[] => [
    {
      id: 'served',
      label: `« ${drink} » s’affiche ${credits} fois`,
      test: (cx) => {
        const k = count(cx.prints(), drink);
        if (k === credits) return true;
        return k > credits ? `« ${drink} » s’affiche ${k} fois pour ${credits} crédits : un passage sans crédit sert quand même.` : `« ${drink} » s’affiche ${k} fois : il fallait ${credits}, un par crédit.`;
      },
    },
    {
      id: 'refused',
      label: 'Puis « Plus de crédit », deux fois',
      test: (cx) => {
        const k = count(cx.prints(), 'plus de credit');
        return k === 2 ? true : `« Plus de crédit » s’affiche ${k} fois : il fallait 2 (les deux passages après le dernier crédit).`;
      },
    },
    {
      id: 'left',
      label: 'Credits finit à 0',
      test: (cx) => {
        const v = cx.variable('BP_Distributeur', 'Credits');
        if (v === 0) return true;
        if (v === credits) return 'Credits n’a pas bougé : le Decrement n’est pas sur le fil blanc qui sert la boisson.';
        return `Credits vaut ${v} : il ne doit retirer un crédit que quand il en reste.`;
      },
    },
    noRuntimeErrors(),
  ],
  gaps: [
    [
      { role: 'branch', label: 'Branch' },
      { role: 'dec', label: 'Decrement Int (Credits)' },
    ],
    [
      { role: 'compare', label: '> (Integer)' },
      { role: 'empty', label: 'Print String « Plus de crédit »' },
    ],
    [
      { role: 'dec', label: 'Decrement Int (Credits)' },
      { role: 'serve', label: 'Print String (la boisson)' },
      { role: 'empty', label: 'Print String « Plus de crédit »' },
    ],
  ],
  mistakes: [
    {
      id: 'dec-off-wire',
      what: 'le Decrement est posé à côté du fil',
      apply(p, r) {
        cut(p, 'BP_Distributeur', r.dec, 'exec');
        cut(p, 'BP_Distributeur', r.dec, 'then');
        wire(p, 'BP_Distributeur', r.branch, 'true', r.serve, 'exec');
      },
    },
    {
      id: 'ge-zero',
      what: 'la condition laisse passer Credits = 0',
      apply(p, r) {
        replaceNode(p, 'BP_Distributeur', r.compare, 'math.greaterEqualInt');
      },
    },
    {
      id: 'swapped',
      what: 'True et False sont inversés',
      apply(p, r) {
        cut(p, 'BP_Distributeur', r.dec, 'exec');
        cut(p, 'BP_Distributeur', r.empty, 'exec');
        wire(p, 'BP_Distributeur', r.branch, 'false', r.dec, 'exec');
        wire(p, 'BP_Distributeur', r.branch, 'true', r.empty, 'exec');
      },
    },
  ],
};

// ------------------------------------------------------------ the switch

interface SwitchP {
  /** The light is on at the start (bAllume true): the first pass turns it off. */
  startOn: boolean;
}

const lightSwitch: Situation<SwitchP> = {
  id: 'interrupteur',
  title: 'L’interrupteur',
  className: 'BP_Interrupteur',
  params: (r) => ({ startOn: r.next() < 0.5 }),
  base({ startOn }) {
    const pb = new ProjectBuilder('Mini-exercice');
    const b = pb.blueprint('BP_Interrupteur');
    b.component('StaticMesh', 'Socle', { sizeX: 50, sizeY: 50, color: '#475569', blocks: false });
    b.component('PointLight', 'Lumiere', { visible: startOn, radius: 260 });
    b.component('BoxCollision', 'Zone', { sizeX: 200, sizeY: 200 });
    b.variable('bAllume', T.bool, startOn);
    pb.place(b, 0, 0);
    pb.playerStart(-500, 0);
    return pb.project;
  },
  chain(b) {
    const v = b.cls.variables.find((x) => x.name === 'bAllume')!.id;
    const event = b.node('event.actorBeginOverlap', {}, {}, [64, 96]);
    const set = b.node('var.set', { variable: v }, {}, [380, 96]);
    const not = b.node('logic.not', {}, {}, [300, 300]);
    const show = b.node('component.setVisibility', {}, {}, [700, 96]);
    b.link(event, 'then', set, 'exec').link(b.node('var.get', { variable: v }, {}, [120, 300]), 'value', not, 'a').link(not, 'result', set, 'value');
    b.link(set, 'then', show, 'exec').link(b.node('var.get', { variable: v }, {}, [560, 330]), 'value', show, 'visible').target('Lumiere', show);
    return { event, set, not, show };
  },
  situation: ({ startOn }) =>
    `**BP_Interrupteur** garde l’état de sa lumière dans **bAllume** (${startOn ? 'vrai : elle est allumée au départ' : 'faux : elle est éteinte au départ'}). À chaque passage du joueur dans la Zone, l’état s’inverse, et la **Lumiere** suit : visible quand bAllume est vrai.`,
  objectives: () => ['À chaque passage, bAllume s’inverse.', 'La Lumiere est visible exactement quand bAllume est vrai.'],
  hints: () => [
    'Inverser, c’est ranger dans bAllume le contraire de ce qu’il vaut. Et la lumière : faut-il la régler avant ou après ?',
    'Nœuds : Event ActorBeginOverlap, Set bAllume, NOT Boolean, Get bAllume (deux fois), Set Visibility (Target = Lumiere).',
    'BeginOverlap → Set bAllume (NOT bAllume) → Set Visibility (Target = Lumiere, New Visibility = bAllume).',
  ],
  remember: 'Inverser un Boolean : Set avec NOT de lui-même. Ce qui dépend de la nouvelle valeur vient après le Set, sur le même fil.',
  notions: ['Variable Boolean', 'NOT Boolean', 'Set Visibility'],
  scenario: () => [{ wait: 0.2 }, ...passThrough(), { checkpoint: 'un' }, ...passThrough(), { checkpoint: 'deux' }, ...passThrough()],
  checks: ({ startOn }): Check[] => {
    const at = (id: string, label: string, on: boolean, cp?: string): Check => ({
      id,
      label,
      at: cp,
      test: (cx) => {
        const c = cx.component('BP_Interrupteur', 'Lumiere');
        const v = cx.variable('BP_Interrupteur', 'bAllume');
        if (v !== on) return `bAllume vaut ${v ? 'vrai' : 'faux'} : il devait valoir ${on ? 'vrai' : 'faux'}. Il doit s’inverser à chaque passage (NOT de lui-même).`;
        if (c?.props.visible !== on) return `bAllume vaut ${on ? 'vrai' : 'faux'}, mais la Lumiere est ${c?.props.visible ? 'visible' : 'cachée'} : elle doit suivre la nouvelle valeur, réglée après le Set, sur la Lumiere.`;
        return true;
      },
    });
    return [
      at('first', `Après le 1er passage : ${startOn ? 'éteinte' : 'allumée'}`, !startOn, 'un'),
      at('second', `Après le 2e : ${startOn ? 'allumée' : 'éteinte'}`, startOn, 'deux'),
      at('third', `Après le 3e : ${startOn ? 'éteinte' : 'allumée'}`, !startOn),
      noRuntimeErrors(),
    ];
  },
  gaps: [
    [
      { role: 'not', label: 'NOT Boolean' },
      { role: 'show', label: 'Set Visibility (Lumiere)' },
    ],
    [
      { role: 'set', label: 'Set bAllume' },
      { role: 'show', label: 'Set Visibility (Lumiere)' },
    ],
    [
      { role: 'set', label: 'Set bAllume' },
      { role: 'not', label: 'NOT Boolean' },
    ],
  ],
  mistakes: [
    {
      id: 'no-not',
      what: 'bAllume reçoit sa propre valeur, sans NOT',
      apply(p, r) {
        const g = p.classes.find((c) => c.name === 'BP_Interrupteur')!.graphs[0];
        const src = Object.values(g.links).find((l) => l.to.node === r.not && l.to.pin === 'a')!.from;
        cut(p, 'BP_Interrupteur', r.not, 'result');
        wire(p, 'BP_Interrupteur', src.node, src.pin, r.set, 'value');
      },
    },
    {
      id: 'show-before',
      what: 'la lumière est réglée avant l’inversion',
      apply(p, r) {
        cut(p, 'BP_Interrupteur', r.event, 'then');
        cut(p, 'BP_Interrupteur', r.set, 'then');
        wire(p, 'BP_Interrupteur', r.event, 'then', r.show, 'exec');
        wire(p, 'BP_Interrupteur', r.show, 'then', r.set, 'exec');
      },
    },
    {
      id: 'wrong-target',
      what: 'Set Visibility vise le Socle au lieu de la Lumiere',
      apply(p, r) {
        const cls = p.classes.find((c) => c.name === 'BP_Interrupteur')!;
        const g = cls.graphs[0];
        const get = Object.values(g.links).find((l) => l.to.node === r.show && l.to.pin === 'target')!.from.node;
        g.nodes[get].config.component = cls.components.find((c) => c.name === 'Socle')!.id;
      },
    },
  ],
};

export const VARIABLES_BRANCH: Family = {
  id: 'variables-branch',
  title: 'Variables et Branch',
  notions: ['variables', 'branch'],
  level: 'debutant',
  situations: [counter, vending, lightSwitch],
};
