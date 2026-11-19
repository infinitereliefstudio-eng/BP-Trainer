/**
 * Family « Overlaps et événements » : which event starts which chain. Three
 * situations:
 * - the pressure plate: light on entering, off on leaving (or the reverse:
 *   a light that goes out when stepped on);
 * - the gate: a message at BeginPlay, another on entering, another on
 *   leaving (or only on leaving);
 * - who is in the zone: a count up on entering and down on leaving, with a
 *   crate already inside at the start (an overlap is any actor, not only the
 *   player).
 */
import { noRuntimeErrors, printedNumbers } from '../../lessons/checks';
import { edit, ProjectBuilder } from '../../lessons/builder';
import type { Check } from '../../lessons/types';
import type { Project } from '../../model/project';
import { removeNodes } from '../../operations/graphOps';
import { T } from '../../types/pins';
import { cut, norm, replaceNode, wire } from '../edit';
import type { Family, Situation } from '../types';

const count = (prints: string[], text: string) => prints.filter((p) => norm(p).includes(norm(text))).length;
const enter = (x = 0) => [{ teleport: [x, 0] as [number, number] }, { wait: 0.3 }];
const leave = () => [{ teleport: [-500, 0] as [number, number] }, { wait: 0.3 }];
const graph = (p: Project, name: string) => p.classes.find((c) => c.name === name)!.graphs[0];

// ------------------------------------------------------- the pressure plate

interface PlateP {
  /** Stepping on it turns the light off (lit at the start). */
  inverse: boolean;
}

const plate: Situation<PlateP> = {
  id: 'plaque',
  title: 'La plaque de pression',
  className: 'BP_Plaque',
  params: (r) => ({ inverse: r.next() < 0.4 }),
  base({ inverse }) {
    const pb = new ProjectBuilder('Mini-exercice');
    const b = pb.blueprint('BP_Plaque');
    b.component('StaticMesh', 'Plaque', { sizeX: 120, sizeY: 120, color: '#6b7280', blocks: false });
    b.component('PointLight', 'Lumiere', { visible: inverse, radius: 280 });
    b.component('BoxCollision', 'Zone', { sizeX: 160, sizeY: 160 });
    pb.place(b, 0, 0);
    pb.playerStart(-500, 0);
    return pb.project;
  },
  chain(b, _p, { inverse }) {
    const begin = b.node('event.actorBeginOverlap', {}, {}, [64, 96]);
    const on = b.node('component.setVisibility', {}, { visible: !inverse }, [380, 96]);
    const end = b.node('event.actorEndOverlap', {}, {}, [64, 420]);
    const off = b.node('component.setVisibility', {}, { visible: inverse }, [380, 420]);
    b.link(begin, 'then', on, 'exec').target('Lumiere', on);
    b.link(end, 'then', off, 'exec').target('Lumiere', off);
    return { begin, on, end, off };
  },
  situation: ({ inverse }) =>
    inverse
      ? '**BP_Plaque** est une plaque au sol avec une **Lumiere**, allumée au départ. Quand le joueur marche sur la plaque, la lumière **s’éteint** ; quand il en descend, elle **se rallume**.'
      : '**BP_Plaque** est une plaque au sol avec une **Lumiere**, éteinte au départ. Quand le joueur marche sur la plaque, la lumière **s’allume** ; quand il en descend, elle **s’éteint**.',
  objectives: ({ inverse }) => [inverse ? 'Sur la plaque, la Lumiere est éteinte.' : 'Sur la plaque, la Lumiere est allumée.', inverse ? 'En dehors, elle est allumée, à chaque passage.' : 'En dehors, elle est éteinte, à chaque passage.'],
  hints: ({ inverse }) => [
    'Deux moments, deux événements : lequel dit « il arrive » et lequel dit « il repart » ?',
    'Nœuds : Event ActorBeginOverlap, Event ActorEndOverlap, deux Set Visibility (Target = Lumiere).',
    `BeginOverlap → Set Visibility (Lumiere, ${inverse ? 'décoché' : 'coché'}) ; EndOverlap → Set Visibility (Lumiere, ${inverse ? 'coché' : 'décoché'}).`,
  ],
  remember: 'Begin Overlap part quand un acteur entre, End Overlap quand il ressort : chacun a son propre fil blanc.',
  notions: ['Event ActorBeginOverlap', 'Event ActorEndOverlap', 'Set Visibility'],
  scenario: () => [{ wait: 0.2 }, ...enter(), { checkpoint: 'dessus' }, ...leave(), { checkpoint: 'dehors' }, ...enter(), { checkpoint: 'encore' }, ...leave()],
  checks: ({ inverse }): Check[] => {
    const lit = (id: string, label: string, on: boolean, at?: string): Check => ({
      id,
      label,
      at,
      test: (cx) => {
        const c = cx.component('BP_Plaque', 'Lumiere');
        if (c?.props.visible === on) return true;
        return `La Lumiere est ${c?.props.visible ? 'allumée' : 'éteinte'} à ce moment-là : elle devait être ${on ? 'allumée' : 'éteinte'}.`;
      },
    });
    return [
      lit('on', inverse ? 'Sur la plaque : éteinte' : 'Sur la plaque : allumée', !inverse, 'dessus'),
      lit('off', inverse ? 'En descendant : rallumée' : 'En descendant : éteinte', inverse, 'dehors'),
      lit('again', 'Au 2e passage, pareil', !inverse, 'encore'),
      lit('end', 'Et en redescendant', inverse),
      noRuntimeErrors(),
    ];
  },
  gaps: [
    [
      { role: 'begin', label: 'Event ActorBeginOverlap' },
      { role: 'end', label: 'Event ActorEndOverlap' },
    ],
    [
      { role: 'on', label: 'Set Visibility (en montant)' },
      { role: 'off', label: 'Set Visibility (en descendant)' },
    ],
    [
      { role: 'end', label: 'Event ActorEndOverlap' },
      { role: 'off', label: 'Set Visibility (en descendant)' },
    ],
  ],
  mistakes: [
    {
      id: 'no-end',
      what: 'rien ne se passe en descendant (pas d’End Overlap)',
      apply(p, r) {
        removeNodes(graph(p, 'BP_Plaque'), [r.end]);
      },
    },
    {
      id: 'same-value',
      what: 'les deux Set Visibility donnent la même valeur',
      apply(p, r, { inverse }) {
        graph(p, 'BP_Plaque').nodes[r.off].defaults.visible = !inverse;
      },
    },
    {
      id: 'events-swapped',
      what: 'Begin et End sont inversés',
      apply(p, r) {
        cut(p, 'BP_Plaque', r.begin, 'then');
        cut(p, 'BP_Plaque', r.end, 'then');
        wire(p, 'BP_Plaque', r.begin, 'then', r.off, 'exec');
        wire(p, 'BP_Plaque', r.end, 'then', r.on, 'exec');
      },
    },
  ],
};

// ---------------------------------------------------------------- the gate

interface GateP {
  hello: string;
  bye: string;
  /** Nothing on entering: only on leaving. */
  leaveOnly: boolean;
}

const gate: Situation<GateP> = {
  id: 'portique',
  title: 'Le portique',
  className: 'BP_Portique',
  params: (r) => ({ hello: r.pick(['Bonjour', 'Bienvenue', 'Entrée']), bye: r.pick(['Au revoir', 'À bientôt', 'Sortie']), leaveOnly: r.next() < 0.35 }),
  base() {
    const pb = new ProjectBuilder('Mini-exercice');
    const b = pb.blueprint('BP_Portique');
    b.component('StaticMesh', 'Arche', { sizeX: 30, sizeY: 220, color: '#0ea5e9', blocks: false });
    b.component('BoxCollision', 'Zone', { sizeX: 160, sizeY: 220 });
    pb.place(b, 0, 0);
    pb.playerStart(-500, 0);
    return pb.project;
  },
  chain(b, _p, { hello, bye, leaveOnly }) {
    const start = b.node('event.beginPlay', {}, {}, [64, 40]);
    const ready = b.node('debug.printString', {}, { text: 'Prêt' }, [380, 40]);
    b.link(start, 'then', ready, 'exec');
    const roles: Record<string, string> = { start, ready };
    if (!leaveOnly) {
      roles.begin = b.node('event.actorBeginOverlap', {}, {}, [64, 260]);
      roles.hello = b.node('debug.printString', {}, { text: hello }, [380, 260]);
      b.link(roles.begin, 'then', roles.hello, 'exec');
    }
    roles.end = b.node('event.actorEndOverlap', {}, {}, [64, 480]);
    roles.bye = b.node('debug.printString', {}, { text: bye }, [380, 480]);
    b.link(roles.end, 'then', roles.bye, 'exec');
    return roles;
  },
  situation: ({ hello, bye, leaveOnly }) =>
    `**BP_Portique** affiche « Prêt » une fois, au lancement du jeu. ${leaveOnly ? `Il ne dit rien quand le joueur le traverse en entrant, mais affiche « ${bye} » quand il en ressort.` : `Il affiche « ${hello} » quand le joueur y entre, et « ${bye} » quand il en ressort.`}`,
  objectives: ({ hello, bye, leaveOnly }) => [
    '« Prêt » s’affiche une fois, au lancement, avant tout passage.',
    leaveOnly ? `« ${bye} » s’affiche à chaque sortie du portique, et rien à l’entrée.` : `« ${hello} » à chaque entrée, « ${bye} » à chaque sortie.`,
  ],
  hints: ({ leaveOnly }) => [
    'Trois moments : le lancement du jeu, l’entrée, la sortie. Lequel ne dépend pas du joueur ?',
    `Nœuds : Event BeginPlay, ${leaveOnly ? '' : 'Event ActorBeginOverlap, '}Event ActorEndOverlap, Print String${leaveOnly ? ' (deux)' : ' (trois)'}.`,
    `BeginPlay → Print String « Prêt »${leaveOnly ? '' : ' ; BeginOverlap → Print String (entrée)'} ; EndOverlap → Print String (sortie).`,
  ],
  remember: 'Event BeginPlay part une fois, au lancement de l’acteur ; un overlap part à chaque fois qu’un acteur entre ou ressort.',
  notions: ['Event BeginPlay', 'Event ActorBeginOverlap', 'Event ActorEndOverlap'],
  scenario: () => [{ wait: 0.2 }, { checkpoint: 'debut' }, ...enter(), { checkpoint: 'dedans' }, ...leave(), ...enter(), ...leave()],
  checks: ({ hello, bye, leaveOnly }): Check[] => [
    {
      id: 'ready',
      label: '« Prêt » au lancement, et rien d’autre',
      at: 'debut',
      test: (cx) => {
        const all = cx.prints();
        if (count(all, 'pret') !== 1) return count(all, 'pret') ? '« Prêt » s’affiche plusieurs fois au lancement.' : '« Prêt » ne s’affiche pas au lancement : quel événement part au début du jeu ?';
        return all.length === 1 ? true : `Au lancement, avant tout passage, on voit aussi : ${all.filter((p) => !norm(p).includes('pret')).join(', ')}.`;
      },
    },
    {
      id: 'enter',
      label: leaveOnly ? 'Rien à l’entrée' : `« ${hello} » à l’entrée`,
      at: 'dedans',
      test: (cx) => {
        const after = cx.prints().slice(1);
        if (leaveOnly) return after.length === 0 ? true : `À l’entrée, on voit « ${after.join(', ')} » : le portique ne doit rien dire en entrant.`;
        return after.length === 1 && norm(after[0]) === norm(hello) ? true : `À l’entrée, on voit ${after.length ? `« ${after.join(', ')} »` : 'rien'} : il fallait « ${hello} ».`;
      },
    },
    {
      id: 'twice',
      label: 'Deux passages : chaque message deux fois, « Prêt » une seule',
      test: (cx) => {
        const all = cx.prints();
        if (count(all, 'pret') !== 1) return `« Prêt » s’affiche ${count(all, 'pret')} fois : une seule, au lancement.`;
        if (count(all, bye) !== 2) return `« ${bye} » s’affiche ${count(all, bye)} fois pour deux sorties.`;
        if (!leaveOnly && count(all, hello) !== 2) return `« ${hello} » s’affiche ${count(all, hello)} fois pour deux entrées.`;
        return true;
      },
    },
    noRuntimeErrors(),
  ],
  gaps: [
    [
      { role: 'start', label: 'Event BeginPlay' },
      { role: 'end', label: 'Event ActorEndOverlap' },
    ],
    [
      { role: 'ready', label: 'Print String « Prêt »' },
      { role: 'bye', label: 'Print String (sortie)' },
    ],
    [
      { role: 'start', label: 'Event BeginPlay' },
      { role: 'end', label: 'Event ActorEndOverlap' },
      { role: 'bye', label: 'Print String (sortie)' },
    ],
  ],
  mistakes: [
    {
      id: 'ready-on-enter',
      what: '« Prêt » part d’un overlap au lieu de BeginPlay',
      apply(p, r) {
        cut(p, 'BP_Portique', r.start, 'then');
        if (r.begin) {
          cut(p, 'BP_Portique', r.begin, 'then');
          wire(p, 'BP_Portique', r.begin, 'then', r.ready, 'exec');
          wire(p, 'BP_Portique', r.start, 'then', r.hello, 'exec');
        } else {
          cut(p, 'BP_Portique', r.end, 'then');
          wire(p, 'BP_Portique', r.end, 'then', r.ready, 'exec');
          wire(p, 'BP_Portique', r.ready, 'then', r.bye, 'exec');
        }
      },
    },
    {
      id: 'bye-on-begin',
      what: 'la sortie est branchée sur Begin Overlap',
      apply(p, r) {
        removeNodes(graph(p, 'BP_Portique'), [r.end]);
        if (r.begin) wire(p, 'BP_Portique', r.hello, 'then', r.bye, 'exec');
        else wire(p, 'BP_Portique', edit(p, 'BP_Portique').node('event.actorBeginOverlap', {}, {}, [64, 480]), 'then', r.bye, 'exec');
      },
    },
    {
      id: 'print-off-wire',
      what: 'le message de sortie est posé à côté du fil',
      apply(p, r) {
        cut(p, 'BP_Portique', r.bye, 'exec');
      },
    },
  ],
};

// --------------------------------------------------- who is in the zone

interface ZoneP {
  /** A crate stands in the zone from the start: it counts too. */
  crate: boolean;
}

const zone: Situation<ZoneP> = {
  id: 'zone',
  title: 'Qui est dans la zone ?',
  className: 'BP_Zone',
  params: (r) => ({ crate: r.next() < 0.5 }),
  base({ crate }) {
    const pb = new ProjectBuilder('Mini-exercice');
    const b = pb.blueprint('BP_Zone');
    b.component('StaticMesh', 'Sol', { sizeX: 260, sizeY: 260, color: '#1e3a5f', blocks: false });
    b.component('BoxCollision', 'Zone', { sizeX: 260, sizeY: 260 });
    b.variable('Dedans', T.int, 0);
    pb.place(b, 0, 0);
    if (crate) {
      const c = pb.blueprint('BP_Caisse');
      c.component('StaticMesh', 'Caisse', { sizeX: 60, sizeY: 60, color: '#8b5a2b', blocks: false });
      c.component('BoxCollision', 'Contact', { sizeX: 70, sizeY: 70 });
      pb.place(c, 80, 80);
    }
    pb.playerStart(-500, 0);
    return pb.project;
  },
  chain(b) {
    const v = b.cls.variables.find((x) => x.name === 'Dedans')!.id;
    const begin = b.node('event.actorBeginOverlap', {}, {}, [64, 96]);
    const inc = b.node('var.incrementInt', {}, {}, [380, 96]);
    const shownIn = b.node('debug.printString', {}, {}, [680, 96]);
    const end = b.node('event.actorEndOverlap', {}, {}, [64, 420]);
    const dec = b.node('var.decrementInt', {}, {}, [380, 420]);
    const shownOut = b.node('debug.printString', {}, {}, [680, 420]);
    b.link(begin, 'then', inc, 'exec').link(b.node('var.get', { variable: v }, {}, [300, 280]), 'value', inc, 'value').link(inc, 'then', shownIn, 'exec').link(inc, 'result', shownIn, 'text');
    b.link(end, 'then', dec, 'exec').link(b.node('var.get', { variable: v }, {}, [300, 600]), 'value', dec, 'value').link(dec, 'then', shownOut, 'exec').link(dec, 'result', shownOut, 'text');
    return { begin, inc, shownIn, end, dec, shownOut };
  },
  situation: ({ crate }) =>
    `**BP_Zone** compte dans **Dedans** combien d’acteurs se trouvent sur elle : +1 quand un acteur entre, −1 quand il ressort, et elle affiche le compte à chaque fois.${
      crate ? ' Une **caisse** est posée dans la zone dès le lancement : elle compte aussi, comme tout acteur.' : ''
    }`,
  objectives: ({ crate }) => [
    'Dedans augmente de 1 quand un acteur entre, diminue de 1 quand il ressort, et s’affiche à chaque fois.',
    crate ? 'Avec la caisse, Dedans vaut 1 au lancement, 2 quand le joueur est dessus.' : 'Dedans vaut 1 quand le joueur est dans la zone, 0 quand il en est sorti.',
  ],
  hints: ({ crate }) => [
    crate ? 'Un overlap ne regarde pas qui entre : la caisse posée dedans déclenche-t-elle quelque chose au lancement ?' : 'Entrer et ressortir sont deux événements : que fait chacun à Dedans ?',
    'Nœuds : Event ActorBeginOverlap, Increment Int, Event ActorEndOverlap, Decrement Int (Get Dedans sur les losanges), deux Print String.',
    'BeginOverlap → Increment Int (Dedans) → Print String ; EndOverlap → Decrement Int (Dedans) → Print String.',
  ],
  remember: 'Un overlap part pour n’importe quel acteur qui entre, pas seulement le joueur : une caisse posée dans la zone le déclenche dès le lancement.',
  notions: ['Event ActorBeginOverlap', 'Event ActorEndOverlap', 'Increment Int', 'Decrement Int'],
  scenario: () => [{ wait: 0.2 }, { checkpoint: 'debut' }, ...enter(), { checkpoint: 'dedans' }, ...leave(), { checkpoint: 'sorti' }, ...enter(), ...leave()],
  checks: ({ crate }): Check[] => {
    const base = crate ? 1 : 0;
    const value = (id: string, label: string, want: number, at?: string, why = ''): Check => ({
      id,
      label,
      at,
      test: (cx) => {
        const v = cx.variable('BP_Zone', 'Dedans');
        return v === want ? true : `Dedans vaut ${v} à ce moment-là : il fallait ${want}.${why}`;
      },
    });
    return [
      value('start', crate ? 'Au lancement, la caisse compte : 1' : 'Au lancement : 0', base, 'debut', crate ? ' La caisse posée dans la zone déclenche Begin Overlap au lancement.' : ''),
      value('in', `Le joueur sur la zone : ${base + 1}`, base + 1, 'dedans', ' Begin Overlap doit ajouter 1.'),
      value('out', `Le joueur sorti : ${base}`, base, 'sorti', ' End Overlap doit retirer 1.'),
      {
        id: 'shown',
        label: 'Le compte s’affiche à chaque entrée et sortie',
        test: (cx) => {
          const got = printedNumbers(cx).join(', ');
          const want = [...(crate ? ['1'] : []), base + 1, base, base + 1, base].join(', ');
          return got === want ? true : `Affiché : ${got || 'rien'}. Il fallait ${want}.`;
        },
      },
      noRuntimeErrors(),
    ];
  },
  gaps: [
    [
      { role: 'inc', label: 'Increment Int (Dedans)' },
      { role: 'dec', label: 'Decrement Int (Dedans)' },
    ],
    [
      { role: 'end', label: 'Event ActorEndOverlap' },
      { role: 'dec', label: 'Decrement Int (Dedans)' },
    ],
    [
      { role: 'begin', label: 'Event ActorBeginOverlap' },
      { role: 'shownOut', label: 'Print String (en sortant)' },
    ],
  ],
  mistakes: [
    {
      id: 'inc-on-leave',
      what: 'la sortie ajoute 1 au lieu d’en retirer',
      apply(p, r) {
        replaceNode(p, 'BP_Zone', r.dec, 'var.incrementInt');
      },
    },
    {
      id: 'no-end',
      what: 'la sortie n’est pas branchée (End Overlap absent)',
      apply(p, r) {
        removeNodes(graph(p, 'BP_Zone'), [r.end]);
      },
    },
    {
      id: 'dec-off-wire',
      what: 'le Decrement est posé à côté du fil',
      apply(p, r) {
        cut(p, 'BP_Zone', r.end, 'then');
        cut(p, 'BP_Zone', r.dec, 'then');
        wire(p, 'BP_Zone', r.end, 'then', r.shownOut, 'exec');
      },
    },
  ],
};

export const OVERLAP_EVENTS: Family = {
  id: 'overlap-events',
  title: 'Overlaps et événements',
  notions: ['overlap', 'events'],
  level: 'debutant',
  situations: [plate, gate, zone],
};
