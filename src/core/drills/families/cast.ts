/**
 * Family « Cast To » : make sure who touched is the player, and reach his
 * variables (or those of the actor a reference points to). Three situations:
 * - the bonus: points added to the player's, the bonus destroyed (a crate
 *   touches it from the start, or there are two bonuses);
 * - the badge terminal: the answer depends on the player's own variable
 *   (he has the badge or not; a crate may stand in front of it);
 * - the lever and its airlock: the lever opens the door its reference
 *   points to (two levers, two doors: the right one only).
 */
import { noRuntimeErrors } from '../../lessons/checks';
import { edit, ProjectBuilder } from '../../lessons/builder';
import { playerBlueprint } from '../../lessons/library/props';
import type { Check } from '../../lessons/types';
import type { Project } from '../../model/project';
import { removeNodes } from '../../operations/graphOps';
import { T } from '../../types/pins';
import { cut, norm, wire } from '../edit';
import type { Family, Situation } from '../types';

const count = (prints: string[], text: string) => prints.filter((p) => norm(p).includes(norm(text))).length;
const go = (x: number, y = 0) => [{ teleport: [x, y] as [number, number] }, { wait: 0.3 }];
const varOf = (p: Project, cls: string, name: string) => p.classes.find((c) => c.name === cls)!.variables.find((v) => v.name === name)!.id;
const clsId = (p: Project, name: string) => p.classes.find((c) => c.name === name)!.id;
const graph = (p: Project, name: string) => p.classes.find((c) => c.name === name)!.graphs[0];

function crateAt(pb: ProjectBuilder, x: number, y = 0) {
  const c = pb.blueprint('BP_Caisse');
  c.component('StaticMesh', 'Caisse', { sizeX: 70, sizeY: 70, color: '#8b5a2b', blocks: false });
  c.component('BoxCollision', 'Contact', { sizeX: 90, sizeY: 90 });
  pb.place(c, x, y);
}

const CRATE_WHY = ' Une caisse touche l’objet dès le lancement : Other Actor n’est pas toujours le joueur.';

// --------------------------------------------------------------- the bonus

interface BonusP {
  points: number;
  variant: 'crate' | 'two';
}

const bonus: Situation<BonusP> = {
  id: 'bonus',
  title: 'Le bonus',
  className: 'BP_Bonus',
  params: (r) => ({ points: r.pick([1, 5, 10]), variant: r.pick(['crate', 'two'] as const) }),
  base({ variant }) {
    const pb = new ProjectBuilder('Mini-exercice');
    const { b: player } = playerBlueprint(pb);
    player.variable('Points', T.int, 0);
    const b = pb.blueprint('BP_Bonus');
    b.component('StaticMesh', 'Gemme', { shape: 'cylinder', sizeX: 30, sizeY: 30, color: '#22d3ee', blocks: false });
    b.component('BoxCollision', 'Zone', { sizeX: 90, sizeY: 90 });
    pb.place(b, 300, 0);
    if (variant === 'two') pb.place(b, 600, 0);
    else crateAt(pb, 380);
    pb.playerStart(-300, 0);
    return pb.project;
  },
  chain(b, p, { points }) {
    const player = clsId(p, 'BP_Joueur');
    const v = varOf(p, 'BP_Joueur', 'Points');
    const event = b.node('event.actorBeginOverlap', {}, {}, [64, 96]);
    const cast = b.node('cast.to', { class: player }, {}, [360, 96]);
    const get = b.node('var.getExternal', { owner: player, variable: v }, {}, [560, 340]);
    const add = b.node('math.addInt', {}, { b: points }, [820, 340]);
    const set = b.node('var.setExternal', { owner: player, variable: v }, {}, [700, 96]);
    const destroy = b.node('actor.destroy', {}, {}, [1040, 96]);
    b.link(event, 'then', cast, 'exec').link(event, 'other', cast, 'object');
    b.link(cast, 'then', set, 'exec').link(cast, 'as', set, 'target').link(cast, 'as', get, 'target').link(get, 'value', add, 'a').link(add, 'result', set, 'value');
    b.link(set, 'then', destroy, 'exec');
    return { event, cast, get, add, set, destroy };
  },
  situation: ({ points, variant }) =>
    `Quand le joueur touche **BP_Bonus**, ses **Points** (une variable de **BP_Joueur**) augmentent de ${points}, puis le bonus disparaît. ${
      variant === 'two' ? 'Il y a **deux** bonus sur le chemin : chacun compte.' : 'Une **caisse** est posée contre le bonus : elle le touche dès le lancement, mais ne doit pas le prendre.'
    }`,
  objectives: ({ points, variant }) => [
    `Quand le joueur touche un bonus, ses Points augmentent de ${points} et le bonus disparaît.`,
    variant === 'two' ? `Après les deux bonus, le joueur a ${points * 2} points.` : 'La caisse, qui touche le bonus, ne le prend pas.',
  ],
  hints: ({ points }) => [
    'Other Actor est un simple Actor : comment savoir que c’est le joueur, et atteindre ses Points ?',
    `Nœuds : Event ActorBeginOverlap, Cast To BP_Joueur, Get Points et Set Points (tirés depuis As BP_Joueur), + (Integer), Destroy Actor.`,
    `BeginOverlap → Cast To BP_Joueur (Object = Other Actor) → Set Points (Target = As BP_Joueur, valeur = Points + ${points}) → Destroy Actor.`,
  ],
  remember: 'Cast To vérifie que Other Actor est bien le joueur et donne la référence typée (As BP_Joueur) qui ouvre ses variables. Ajouter, c’est Set avec Get + valeur.',
  notions: ['Cast To', 'Variable d’un autre Blueprint', 'Destroy Actor'],
  scenario: ({ variant }) => [{ wait: 0.3 }, { checkpoint: 'debut' }, ...go(300), ...(variant === 'two' ? go(600) : []), ...go(-300)],
  checks: ({ points, variant }): Check[] => {
    const n = variant === 'two' ? 2 : 1;
    const out: Check[] = [];
    if (variant === 'crate')
      out.push({
        id: 'crate',
        label: 'La caisse, qui touche le bonus, ne le prend pas',
        at: 'debut',
        test: (cx) => (cx.actor('BP_Bonus') ? true : `Le bonus a disparu dès le lancement.${CRATE_WHY}`),
      });
    out.push(
      {
        id: 'points',
        label: `Le joueur a ${points * n} points`,
        test: (cx) => {
          const v = cx.variable('Joueur', 'Points');
          if (v === points * n) return true;
          if (!v) return 'Les Points du joueur n’ont pas bougé : le Set n’a pas été atteint, ou il ne vise pas le joueur.';
          return `Le joueur a ${v} points : il en fallait ${points * n}. Chaque bonus ajoute ${points} à ce qu’il a déjà (Get + ${points}).`;
        },
      },
      {
        id: 'gone',
        label: n === 2 ? 'Les deux bonus ont disparu' : 'Le bonus a disparu',
        test: (cx) => (cx.sim.actors.some((a) => a.className === 'BP_Bonus' && !a.destroyed) ? 'Un bonus est toujours là après le passage du joueur : Destroy Actor, au bout du fil.' : true),
      },
      noRuntimeErrors(),
    );
    return out;
  },
  gaps: [
    [
      { role: 'cast', label: 'Cast To BP_Joueur' },
      { role: 'set', label: 'Set Points (Target = As BP_Joueur)' },
    ],
    [
      { role: 'add', label: '+ (Integer)' },
      { role: 'destroy', label: 'Destroy Actor' },
    ],
    [
      { role: 'cast', label: 'Cast To BP_Joueur' },
      { role: 'destroy', label: 'Destroy Actor' },
    ],
  ],
  mistakes: [
    {
      id: 'object-self',
      what: 'Object du Cast est Self (l’objet lui-même) au lieu de Other Actor',
      apply(p, r) {
        cut(p, 'BP_Bonus', r.cast, 'object');
        const b = edit(p, 'BP_Bonus');
        b.link(b.node('actor.self', {}, {}, [200, 300]), 'self', r.cast, 'object');
      },
    },
    {
      id: 'failed-path',
      what: 'la suite part de Cast Failed',
      apply(p, r) {
        cut(p, 'BP_Bonus', r.set, 'exec');
        wire(p, 'BP_Bonus', r.cast, 'failed', r.set, 'exec');
      },
    },
    {
      id: 'set-not-add',
      what: 'Points reçoit la valeur du bonus au lieu de l’ajouter',
      applies: ({ variant }) => variant === 'two',
      apply(p, r, { points }) {
        cut(p, 'BP_Bonus', r.set, 'value');
        graph(p, 'BP_Bonus').nodes[r.set].defaults.value = points;
      },
    },
  ],
};

// ------------------------------------------------------ the badge terminal

interface BadgeP {
  /** The player carries the badge (his bBadge is true at the start). */
  has: boolean;
  crate: boolean;
}

const badge: Situation<BadgeP> = {
  id: 'terminal',
  title: 'Le terminal à badge',
  className: 'BP_Terminal',
  params: (r) => ({ has: r.next() < 0.5, crate: r.next() < 0.5 }),
  base({ has, crate }) {
    const pb = new ProjectBuilder('Mini-exercice');
    const { b: player } = playerBlueprint(pb);
    player.variable('bBadge', T.bool, has);
    const b = pb.blueprint('BP_Terminal');
    b.component('StaticMesh', 'Ecran', { sizeX: 40, sizeY: 80, color: '#0f766e', blocks: false });
    b.component('BoxCollision', 'Zone', { sizeX: 160, sizeY: 160 });
    pb.place(b, 300, 0);
    if (crate) crateAt(pb, 360, 40);
    pb.playerStart(-300, 0);
    return pb.project;
  },
  chain(b, p) {
    const player = clsId(p, 'BP_Joueur');
    const event = b.node('event.actorBeginOverlap', {}, {}, [64, 96]);
    const cast = b.node('cast.to', { class: player }, {}, [360, 96]);
    const get = b.node('var.getExternal', { owner: player, variable: varOf(p, 'BP_Joueur', 'bBadge') }, {}, [460, 340]);
    const branch = b.node('flow.branch', {}, {}, [700, 96]);
    const granted = b.node('debug.printString', {}, { text: 'Accès autorisé' }, [1000, 20]);
    const denied = b.node('debug.printString', {}, { text: 'Accès refusé' }, [1000, 260]);
    b.link(event, 'then', cast, 'exec').link(event, 'other', cast, 'object').link(cast, 'then', branch, 'exec');
    b.link(cast, 'as', get, 'target').link(get, 'value', branch, 'condition');
    b.link(branch, 'true', granted, 'exec').link(branch, 'false', denied, 'exec');
    return { event, cast, get, branch, granted, denied };
  },
  situation: ({ has, crate }) =>
    `**BP_Terminal** laisse passer qui porte un badge. Quand le **joueur** entre dans sa Zone, il lit **bBadge**, une variable du joueur (**BP_Joueur**), et affiche « Accès autorisé » ou « Accès refusé ». Cette fois, le joueur ${has ? '**a**' : '**n’a pas**'} le badge.${
      crate ? ' Une **caisse** est posée devant le terminal : elle ne doit recevoir aucune réponse.' : ''
    }`,
  objectives: ({ has, crate }) => [
    `Quand le joueur entre, le terminal lit bBadge du joueur et affiche ${has ? '« Accès autorisé »' : '« Accès refusé »'}.`,
    crate ? 'Rien ne s’affiche pour la caisse, au lancement.' : 'Une seule réponse par entrée.',
  ],
  hints: () => [
    'bBadge appartient au joueur, pas au terminal : par où passer pour le lire sur lui ?',
    'Nœuds : Event ActorBeginOverlap, Cast To BP_Joueur, Get bBadge (tiré depuis As BP_Joueur), Branch, deux Print String.',
    'BeginOverlap → Cast To BP_Joueur (Object = Other Actor) → Branch (Condition = bBadge, Target = As BP_Joueur) → True : « Accès autorisé » ; False : « Accès refusé ».',
  ],
  remember: 'Lire la variable d’un autre Blueprint demande une référence vers lui : ici, As BP_Joueur, la sortie du Cast. Cast Failed n’a pas à afficher quoi que ce soit.',
  notions: ['Cast To', 'Lire la variable d’un autre Blueprint', 'Branch'],
  scenario: () => [{ wait: 0.3 }, { checkpoint: 'debut' }, ...go(300), ...go(-300)],
  checks: ({ has }): Check[] => [
    {
      id: 'quiet',
      label: 'Aucune réponse avant que le joueur arrive',
      at: 'debut',
      test: (cx) => (count(cx.prints(), 'acces') === 0 ? true : `« ${cx.prints().find((x) => norm(x).includes('acces'))} » s’affiche dès le lancement, avant le joueur.${CRATE_WHY}`),
    },
    {
      id: 'answer',
      label: `Le joueur reçoit « ${has ? 'Accès autorisé' : 'Accès refusé'} »`,
      test: (cx) => {
        const answers = cx.prints().filter((x) => norm(x).includes('acces'));
        const want = has ? 'Accès autorisé' : 'Accès refusé';
        if (answers.length === 1 && norm(answers[0]) === norm(want)) return true;
        if (!answers.length) return 'Le terminal ne répond pas au joueur : le Cast réussit-il ? Object doit être Other Actor.';
        if (answers.length > 1) return `Le terminal répond ${answers.length} fois : ${answers.join(', ')}.`;
        return `Le joueur reçoit « ${answers[0]} » alors qu’il ${has ? 'a' : 'n’a pas'} le badge : la condition doit être bBadge du joueur, lu sur As BP_Joueur.`;
      },
    },
    noRuntimeErrors(),
  ],
  gaps: [
    [
      { role: 'cast', label: 'Cast To BP_Joueur' },
      { role: 'branch', label: 'Branch' },
    ],
    [
      { role: 'get', label: 'Get bBadge (Target = As BP_Joueur)' },
      { role: 'branch', label: 'Branch' },
    ],
    [
      { role: 'cast', label: 'Cast To BP_Joueur' },
      { role: 'denied', label: 'Print String « Accès refusé »' },
    ],
  ],
  mistakes: [
    {
      id: 'own-variable',
      what: 'le terminal lit son propre bBadge au lieu de celui du joueur',
      apply(p, r, { has }) {
        const t = edit(p, 'BP_Terminal');
        const own = t.variable('bBadge', T.bool, !has);
        removeNodes(t.graph, [r.get]);
        t.link(t.node('var.get', { variable: own }, {}, [460, 340]), 'value', r.branch, 'condition');
      },
    },
    {
      id: 'swapped',
      what: 'True et False sont inversés',
      apply(p, r) {
        cut(p, 'BP_Terminal', r.granted, 'exec');
        cut(p, 'BP_Terminal', r.denied, 'exec');
        wire(p, 'BP_Terminal', r.branch, 'true', r.denied, 'exec');
        wire(p, 'BP_Terminal', r.branch, 'false', r.granted, 'exec');
      },
    },
    {
      id: 'failed-refuses',
      what: 'Cast Failed affiche « Accès refusé »',
      applies: ({ crate }) => crate,
      apply(p, r) {
        const t = edit(p, 'BP_Terminal');
        t.link(r.cast, 'failed', t.node('debug.printString', {}, { text: 'Accès refusé' }, [700, 420]), 'exec');
      },
    },
    {
      id: 'object-self',
      what: 'Object du Cast est Self (l’objet lui-même) au lieu de Other Actor',
      apply(p, r) {
        cut(p, 'BP_Terminal', r.cast, 'object');
        const b = edit(p, 'BP_Terminal');
        b.link(b.node('actor.self', {}, {}, [200, 300]), 'self', r.cast, 'object');
      },
    },
  ],
};

// --------------------------------------------------- the lever and its airlock

interface LeverP {
  /** Two levers, each with its own airlock; the player uses the second one. */
  two: boolean;
}

const lever: Situation<LeverP> = {
  id: 'levier',
  title: 'Le levier et son sas',
  className: 'BP_Levier',
  params: (r) => ({ two: r.next() < 0.6 }),
  base({ two }) {
    const pb = new ProjectBuilder('Mini-exercice');
    playerBlueprint(pb);
    const door = pb.blueprint('BP_Sas');
    door.component('StaticMesh', 'Porte', { sizeX: 30, sizeY: 160, color: '#a0703c', blocks: false });
    door.variable('bOuvert', T.bool, false);
    const b = pb.blueprint('BP_Levier');
    b.component('StaticMesh', 'Poignee', { sizeX: 24, sizeY: 60, color: '#dc2626', blocks: false });
    b.component('BoxCollision', 'Zone', { sizeX: 120, sizeY: 120 });
    const porte = b.variable('Porte', T.object('BP_Sas'));
    b.cls.variables.find((v) => v.id === porte)!.instanceEditable = true;
    const d1 = pb.place(door, 600, -200);
    const l1 = pb.place(b, 300, -200);
    pb.project.level.actors.find((a) => a.id === l1)!.overrides[porte] = `actor:${d1}`;
    if (two) {
      const d2 = pb.place(door, 600, 200);
      const l2 = pb.place(b, 300, 200);
      pb.project.level.actors.find((a) => a.id === l2)!.overrides[porte] = `actor:${d2}`;
    }
    pb.playerStart(-300, two ? 200 : -200);
    return pb.project;
  },
  chain(b, p) {
    const player = clsId(p, 'BP_Joueur');
    const doorCls = clsId(p, 'BP_Sas');
    const event = b.node('event.actorBeginOverlap', {}, {}, [64, 96]);
    const cast = b.node('cast.to', { class: player }, {}, [360, 96]);
    const porte = b.node('var.get', { variable: varOf(p, 'BP_Levier', 'Porte') }, {}, [460, 320]);
    const set = b.node('var.setExternal', { owner: doorCls, variable: varOf(p, 'BP_Sas', 'bOuvert') }, { value: true }, [700, 96]);
    b.link(event, 'then', cast, 'exec').link(event, 'other', cast, 'object').link(cast, 'then', set, 'exec').link(porte, 'value', set, 'target');
    return { event, cast, porte, set };
  },
  situation: ({ two }) =>
    `**BP_Levier** a une variable **Porte** (Instance Editable) qui désigne, dans le niveau, le **BP_Sas** qu’il commande. Quand le **joueur** touche le levier, ce sas passe **bOuvert** à vrai. ${
      two ? 'Il y a **deux** leviers, chacun relié à son sas : le joueur utilise celui du bas, et seul **son** sas doit s’ouvrir.' : ''
    }`,
  objectives: ({ two }) => ['Quand le joueur touche le levier, le sas désigné par sa variable Porte passe bOuvert à vrai.', two ? 'L’autre sas reste fermé.' : 'Le sas reste fermé tant que personne n’a touché le levier.'],
  hints: ({ two }) => [
    two ? 'Deux sas dans le niveau : lequel ouvrir ? Le levier sait déjà lequel est le sien.' : 'Le levier ne sait pas ouvrir lui-même : à qui appartient bOuvert, et quelle variable mène à lui ?',
    'Nœuds : Event ActorBeginOverlap, Cast To BP_Joueur, Get Porte, Set bOuvert (tiré depuis Porte).',
    'BeginOverlap → Cast To BP_Joueur (Object = Other Actor) → Set bOuvert (Target = Get Porte, coché).',
  ],
  remember: 'Une variable de référence Instance Editable désigne, pour chaque acteur posé, l’acteur précis qu’il commande : deux leviers, deux sas, chacun le sien.',
  notions: ['Cast To', 'Variable d’un autre Blueprint', 'Instance Editable'],
  scenario: ({ two }) => [{ wait: 0.3 }, { checkpoint: 'debut' }, ...go(300, two ? 200 : -200), ...go(-300, two ? 200 : -200)],
  checks: ({ two }): Check[] => {
    const mine = two ? 'BP_Sas2' : 'BP_Sas';
    const out: Check[] = [
      {
        id: 'closed',
        label: 'Au lancement, le sas est fermé',
        at: 'debut',
        test: (cx) => (cx.sim.actors.some((a) => a.className === 'BP_Sas' && cx.variable(a.label, 'bOuvert')) ? 'Un sas est déjà ouvert au lancement, avant que le joueur touche le levier.' : true),
      },
      {
        id: 'open',
        label: 'Le joueur touche le levier : son sas s’ouvre',
        test: (cx) => (cx.variable(mine, 'bOuvert') === true ? true : 'Le sas du levier touché est resté fermé : Set bOuvert doit viser le sas désigné par la variable Porte.'),
      },
    ];
    if (two)
      out.push({
        id: 'other',
        label: 'L’autre sas reste fermé',
        test: (cx) => (cx.variable('BP_Sas', 'bOuvert') ? 'Le sas de l’autre levier s’est ouvert aussi : vise celui de la variable Porte, pas le premier trouvé.' : true),
      });
    out.push(noRuntimeErrors());
    return out;
  },
  gaps: [
    [
      { role: 'cast', label: 'Cast To BP_Joueur' },
      { role: 'porte', label: 'Get Porte' },
    ],
    [
      { role: 'porte', label: 'Get Porte' },
      { role: 'set', label: 'Set bOuvert' },
    ],
    [
      { role: 'cast', label: 'Cast To BP_Joueur' },
      { role: 'set', label: 'Set bOuvert' },
    ],
  ],
  mistakes: [
    {
      id: 'first-door',
      what: 'le sas visé est le premier trouvé (Get Actor Of Class), pas celui du levier',
      applies: ({ two }) => two,
      apply(p, r) {
        const b = edit(p, 'BP_Levier');
        removeNodes(b.graph, [r.porte]);
        const find = b.node('actor.getOfClass', {}, { class: clsId(p, 'BP_Sas') }, [520, 96]);
        cut(p, 'BP_Levier', r.cast, 'then');
        b.link(r.cast, 'then', find, 'exec').link(find, 'then', r.set, 'exec').link(find, 'result', r.set, 'target');
      },
    },
    {
      id: 'failed-path',
      what: 'la suite part de Cast Failed',
      apply(p, r) {
        cut(p, 'BP_Levier', r.set, 'exec');
        wire(p, 'BP_Levier', r.cast, 'failed', r.set, 'exec');
      },
    },
    {
      id: 'unchecked',
      what: 'Set bOuvert laisse la case décochée',
      apply(p, r) {
        graph(p, 'BP_Levier').nodes[r.set].defaults.value = false;
      },
    },
  ],
};

export const CAST: Family = {
  id: 'cast',
  title: 'Cast To',
  notions: ['cast', 'other-bp'],
  level: 'intermediaire',
  situations: [bonus, badge, lever],
};

