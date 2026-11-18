/**
 * The Cast To chain (lot 2, pilot of the chains guided → transfer → autonomy).
 * Guided: « Ramasser un objet » and « La porte verrouillée » (module2.ts).
 * Transfer T1 « Le terminal à badge »: the same path, in another situation,
 * without a plan. Autonomy A1 « Le piège »: a brief only, offered two days
 * after T1; it also asks to write into the player, not only read.
 */
import type { Project } from '../../model/project';
import { T } from '../../types/pins';
import { edit, ProjectBuilder } from '../builder';
import { noRuntimeErrors, notion, usesNode } from '../checks';
import type { Check, CheckContext, Lesson } from '../types';
import { playerBlueprint } from './props';

const MODULE = 'Cast To';

// --------------------------------------------------------------------- T1

const TERMINAL_Y = 220;

function terminalProject(): Project {
  const pb = new ProjectBuilder('Le terminal à badge');
  const { b: player } = playerBlueprint(pb);
  player.variable('NiveauBadge', T.int, 2);
  const t = pb.blueprint('BP_Terminal');
  t.component('StaticMesh', 'Borne', { x: 60, sizeX: 40, sizeY: 70, color: '#64748b', blocks: false });
  t.component('PointLight', 'Vert', { x: 60, visible: false, radius: 120, color: '#22c55e' });
  t.component('PointLight', 'Rouge', { x: 60, visible: false, radius: 120, color: '#ef4444' });
  t.component('BoxCollision', 'Zone', { x: -40, sizeX: 160, sizeY: 160 });
  const required = t.variable('NiveauRequis', T.int, 1);
  t.cls.variables.find((v) => v.id === required)!.instanceEditable = true;
  pb.place(t, 300, -TERMINAL_Y);
  const second = pb.place(t, 300, TERMINAL_Y);
  pb.project.level.actors.find((a) => a.id === second)!.overrides[required] = 3;
  const crate = pb.blueprint('BP_Caisse');
  crate.component('StaticMesh', 'Caisse', { sizeX: 60, sizeY: 60, color: '#8b5a2b', blocks: false });
  crate.component('BoxCollision', 'Contact', { sizeX: 80, sizeY: 80 });
  pb.place(crate, 260, TERMINAL_Y + 40);
  pb.playerStart(-400, 0);
  return pb.project;
}

function lit(cx: CheckContext, actor: string, light: 'Vert' | 'Rouge'): boolean | undefined {
  return cx.component(actor, light)?.props.visible;
}

/** One terminal shows `expected` (or nothing), and not the other colour. */
function shows(id: string, actor: string, expected: 'Vert' | 'Rouge', label: string, at?: string): Check {
  const other = expected === 'Vert' ? 'Rouge' : 'Vert';
  return {
    id,
    label,
    at,
    test: (cx) => {
      if (lit(cx, actor, expected) === undefined) return `Le voyant ${expected} de ${actor} est introuvable (renommé ou supprimé ?).`;
      if (lit(cx, actor, other)) return `${actor} allume ${other} : compare le badge du joueur au NiveauRequis de ce terminal.`;
      return lit(cx, actor, expected) ? true : `${actor} n’a rien allumé quand le joueur est entré dans sa zone.`;
    },
  };
}

function solveTerminal(p: Project): void {
  const player = edit(p, 'BP_Joueur');
  const badge = player.cls.variables.find((v) => v.name === 'NiveauBadge')!.id;
  const b = edit(p, 'BP_Terminal');
  const required = b.cls.variables.find((v) => v.name === 'NiveauRequis')!.id;
  const e = b.node('event.actorBeginOverlap', {}, {}, [64, 96]);
  const cast = b.node('cast.to', { class: player.cls.id }, {}, [360, 96]);
  const get = b.node('var.getExternal', { owner: player.cls.id, variable: badge }, {}, [420, 360]);
  const need = b.node('var.get', { variable: required }, {}, [420, 500]);
  const ge = b.node('math.greaterEqualInt', {}, {}, [720, 400]);
  const br = b.node('flow.branch', {}, {}, [760, 96]);
  const green = b.node('component.setVisibility', {}, { visible: true }, [1060, 0]);
  const red = b.node('component.setVisibility', {}, { visible: true }, [1060, 320]);
  b.link(e, 'then', cast, 'exec').link(e, 'other', cast, 'object').link(cast, 'then', br, 'exec');
  b.link(cast, 'as', get, 'target').link(get, 'value', ge, 'a').link(need, 'value', ge, 'b').link(ge, 'result', br, 'condition');
  b.link(br, 'true', green, 'exec').target('Vert', green).link(br, 'false', red, 'exec').target('Rouge', red);
}

export const transferBadge: Lesson = {
  id: 't1-badge',
  code: 'T1',
  chain: { notion: 'cast', step: 'transfer' },
  module: MODULE,
  level: 'intermediaire',
  number: 0,
  title: 'Le terminal à badge',
  situation:
    'Deux terminaux contrôlent l’accès. Quand le joueur s’en approche, chacun allume son voyant vert si le badge du joueur est d’un niveau suffisant, rouge sinon.',
  notions: ['Cast To', 'Lire la variable d’un autre Blueprint', 'Comparer deux Integer'],
  remember: 'Cast To, puis lire la variable : le même chemin sert partout où un acteur doit réagir à ce que possède le joueur.',
  cards: [
    {
      title: 'Ce qui est en place',
      body:
        '- **BP_Joueur** : le joueur, avec une variable `NiveauBadge` (Integer, 2).\n' +
        '- **BP_Terminal** : une Borne, une **Zone** devant elle et deux voyants, **Vert** et **Rouge**, éteints au départ. Une variable `NiveauRequis`, **Instance Editable** : chaque terminal posé a la sienne. Le premier demande 1, le second 3 (touche un terminal dans le niveau pour voir sa valeur dans Details).\n' +
        '- **BP_Caisse** : une caisse posée devant le second terminal, dans sa zone, dès le lancement.\n\n' +
        'Le graphe de BP_Terminal est vide. Le test amène le joueur au premier terminal, puis au second.',
    },
    {
      title: 'Ce que tu sais déjà',
      body:
        'C’est la situation de la clé et de la porte verrouillée, dans un autre décor : un acteur entre dans une zone, et la décision dépend d’une donnée qui vit **dans un autre Blueprint**.\n\n' +
        'Cette fois, pas de plan. Avant de poser un nœud, réponds à trois questions :\n\n' +
        '1. Qui vient d’entrer dans la zone, et comment en être sûr ?\n2. La donnée dont tu as besoin, où vit-elle ?\n3. À quoi la compares-tu ?',
    },
    {
      title: 'Pourquoi un transfert',
      body:
        'On sait vraiment une notion quand on la reconnaît **ailleurs** que là où on l’a apprise. Cet exercice te demande de retrouver le chemin seul.\n\n' +
        'Les indices s’ouvrent après un premier essai : construis ce que tu peux, touche **Vérifier**, et le résultat te dira ce qui manque.',
    },
  ],
  objectives: [
    'Quand le joueur entre dans la zone d’un terminal : Vert si son NiveauBadge est au moins égal au NiveauRequis du terminal, sinon Rouge.',
    'La caisse ne doit rien allumer.',
    'Un seul graphe pour les deux terminaux : leur différence vient de NiveauRequis.',
  ],
  hints: [
    'Qui entre ? Pas toujours le joueur : la caisse touche déjà la zone du second terminal au lancement. Comme pour la clé, vérifie d’abord.',
    'Nœuds : Event ActorBeginOverlap, Cast To BP_Joueur, Get NiveauBadge (tiré depuis As BP_Joueur), Get NiveauRequis, >= (Integer), Branch, deux Set Visibility.',
    'Solution : Overlap → Cast To BP_Joueur (Object = Other Actor) → Branch (Condition = Get NiveauBadge >= Get NiveauRequis). True → Set Visibility (Vert, coché). False → Set Visibility (Rouge, coché).',
  ],
  challenge: 'Éteins les deux voyants quand le joueur ressort de la zone.',
  setup: terminalProject,
  scenario: [
    { wait: 0.3 },
    { checkpoint: 'debut' },
    { teleport: [240, -TERMINAL_Y] },
    { wait: 0.3 },
    { checkpoint: 'premier' },
    { teleport: [-300, 0] },
    { wait: 0.2 },
    { teleport: [240, TERMINAL_Y] },
    { wait: 0.3 },
  ],
  checks: [
    {
      id: 'crate',
      label: 'La caisse, dans la zone du second terminal, n’allume rien',
      at: 'debut',
      test: (cx) =>
        lit(cx, 'BP_Terminal2', 'Vert') || lit(cx, 'BP_Terminal2', 'Rouge')
          ? 'Un voyant du second terminal s’allume dès le lancement : la caisse l’a déclenché. Vérifie qui entre dans la zone.'
          : true,
    },
    shows('first', 'BP_Terminal', 'Vert', 'Premier terminal (niveau 1) : vert pour un badge de niveau 2', 'premier'),
    shows('second', 'BP_Terminal2', 'Rouge', 'Second terminal (niveau 3) : rouge pour un badge de niveau 2'),
    notion(usesNode('cast', 'BP_Terminal', ['cast.to'], 'Le graphe utilise Cast To BP_Joueur', 'Vérifie qui entre avec un Cast To BP_Joueur, comme pour la clé.')),
    noRuntimeErrors(),
  ],
  robustness: [
    {
      id: 'badge-3',
      label: 'le joueur a un badge de niveau 3',
      advice: 'Compare la valeur lue sur le joueur (Get NiveauBadge depuis As BP_Joueur) au NiveauRequis du terminal, sans écrire de nombre en dur.',
      mutate: (p) => {
        const v = p.classes.find((c) => c.name === 'BP_Joueur')?.variables.find((x) => x.name === 'NiveauBadge');
        if (v) v.defaultValue = 3;
      },
      scenario: [{ wait: 0.3 }, { teleport: [240, TERMINAL_Y] }, { wait: 0.3 }],
      checks: [shows('both-green', 'BP_Terminal2', 'Vert', 'le second terminal passe au vert')],
    },
  ],
  solve: solveTerminal,
};

// --------------------------------------------------------------------- A1

function trapProject(): Project {
  const pb = new ProjectBuilder('Le piège');
  const { b: player } = playerBlueprint(pb);
  player.variable('Vie', T.int, 3);
  const trap = pb.blueprint('BP_Piege');
  trap.component('StaticMesh', 'Plaque', { sizeX: 120, sizeY: 120, color: '#7f1d1d', blocks: false });
  trap.component('BoxCollision', 'Zone', { sizeX: 140, sizeY: 140 });
  pb.place(trap, 200, 0);
  const crate = pb.blueprint('BP_Caisse');
  crate.component('StaticMesh', 'Caisse', { sizeX: 60, sizeY: 60, color: '#8b5a2b', blocks: false });
  crate.component('BoxCollision', 'Contact', { sizeX: 80, sizeY: 80 });
  pb.place(crate, 250, 40);
  pb.playerStart(-300, 0);
  return pb.project;
}

const life = (cx: CheckContext) => cx.variable('Joueur', 'Vie');

function lifeIs(id: string, expected: number, label: string, why: (v: unknown) => string, at?: string): Check {
  return { id, label, at, test: (cx) => (life(cx) === expected ? true : why(life(cx))) };
}

function solveTrap(p: Project): void {
  const player = edit(p, 'BP_Joueur');
  const vie = player.cls.variables.find((v) => v.name === 'Vie')!.id;
  const b = edit(p, 'BP_Piege');
  const e = b.node('event.actorBeginOverlap', {}, {}, [64, 96]);
  const cast = b.node('cast.to', { class: player.cls.id }, {}, [360, 96]);
  const get = b.node('var.getExternal', { owner: player.cls.id, variable: vie }, {}, [420, 360]);
  const minus = b.node('math.subtractInt', {}, { b: 1 }, [720, 360]);
  const set = b.node('var.setExternal', { owner: player.cls.id, variable: vie }, {}, [760, 96]);
  const say = b.node('debug.printString', {}, {}, [1080, 96]);
  b.link(e, 'then', cast, 'exec').link(e, 'other', cast, 'object').link(cast, 'then', set, 'exec').link(cast, 'as', set, 'target');
  b.link(cast, 'as', get, 'target').link(get, 'value', minus, 'a').link(minus, 'result', set, 'value');
  b.link(set, 'then', say, 'exec').link(set, 'out', say, 'text');
}

export const autonomyTrap: Lesson = {
  id: 'a1-piege',
  code: 'A1',
  chain: { notion: 'cast', step: 'autonomy', after: { lesson: 't1-badge', days: 2 } },
  module: MODULE,
  level: 'intermediaire',
  number: 0,
  title: 'Le piège',
  situation: 'Une plaque piégée au sol. Le joueur qui marche dessus perd un point de vie ; la caisse posée dessus, elle, ne déclenche rien.',
  notions: ['Cast To', 'Écrire la variable d’un autre Blueprint'],
  remember: 'Cast To donne accès à ce que possède le joueur : le lire, mais aussi le modifier. La donnée reste chez lui ; le piège ne fait que la changer.',
  cards: [
    {
      title: 'Cahier des charges',
      body:
        'Le joueur a 3 points de **Vie** (variable `Vie` de BP_Joueur). Le piège, **BP_Piege**, a une Plaque et une **Zone** ; son graphe est vide. Une **caisse** est posée sur le piège depuis le début.\n\n' +
        '- Chaque fois que le joueur **marche sur** le piège, il perd 1 point de Vie.\n' +
        '- Le jeu **affiche** alors la Vie qui lui reste.\n' +
        '- Rester sur le piège ne fait perdre qu’un point : il faut en ressortir et revenir.\n' +
        '- La caisse ne fait rien perdre à personne.',
    },
    {
      title: 'Comment t’y prendre',
      body:
        'Pas de liste de nœuds : c’est le but de l’exercice. Avant d’en poser un, réponds :\n\n' +
        '1. Quel événement déclenche la règle ?\n2. Qui est concerné, et comment en être sûr ?\n3. La donnée à changer, où vit-elle, et comment l’atteindre ?\n4. Comment le vérifier avec ▶ Play avant de toucher Vérifier ?\n\n' +
        'Les indices s’ouvrent après un premier essai.',
    },
    {
      title: 'Pourquoi quelques jours plus tard',
      body:
        'Cet exercice arrive après le terminal à badge, avec un délai voulu : refaire de mémoire, après une pause, est ce qui fixe une notion. Si ça bloque, c’est utile aussi : note ce qui manquait, c’est exactement ce qu’il faut revoir.',
    },
  ],
  objectives: [
    'Le joueur perd 1 point de Vie chaque fois qu’il marche sur le piège.',
    'La Vie qui reste s’affiche.',
    'La caisse ne fait rien perdre.',
  ],
  hints: [
    'Comme pour le terminal, vérifie d’abord qui entre. Mais cette fois, il ne suffit pas de lire la Vie du joueur : il faut l’écrire.',
    'Nœuds : Event ActorBeginOverlap, Cast To BP_Joueur, Get Vie et Set Vie (tirés depuis As BP_Joueur), - (Integer), Print String.',
    'Solution : Overlap → Cast To BP_Joueur (Object = Other Actor) → Set Vie (Target = As BP_Joueur, valeur = Get Vie - 1) → Print String (la sortie du Set).',
  ],
  challenge: 'À 0 point de Vie, affiche « Game Over » au lieu du nombre.',
  setup: trapProject,
  scenario: [
    { wait: 0.3 },
    { checkpoint: 'debut' },
    { teleport: [200, 0] },
    { wait: 0.3 },
    { checkpoint: 'une-fois' },
    { teleport: [-300, 0] },
    { wait: 0.3 },
    { teleport: [200, 0] },
    { wait: 1.5 },
  ],
  checks: [
    lifeIs('crate', 3, 'La caisse posée sur le piège ne fait rien perdre', (v) => `La Vie vaut ${String(v)} dès le lancement : la caisse a déclenché le piège.`, 'debut'),
    lifeIs('once', 2, 'Un passage sur le piège : 1 point perdu', (v) => `Après un passage, la Vie vaut ${String(v)} au lieu de 2.`, 'une-fois'),
    lifeIs('twice', 1, 'Deux passages : 2 points perdus, et rester dessus n’en fait pas perdre plus', (v) =>
      Number(v) < 1 ? `La Vie vaut ${String(v)} : rester sur le piège en fait perdre encore. Un point par entrée, pas par image.` : `Après deux passages, la Vie vaut ${String(v)} au lieu de 1.`,
    ),
    {
      id: 'shown',
      label: 'La Vie qui reste s’affiche (2, puis 1)',
      test: (cx) => {
        const texts = cx.prints();
        const two = texts.findIndex((t) => /\b2\b/.test(t));
        const one = texts.findIndex((t, i) => i > two && /\b1\b/.test(t));
        return two >= 0 && one >= 0 ? true : 'Aucun message n’affiche la Vie qui reste (2 après le premier passage, 1 après le second).';
      },
    },
    notion(usesNode('cast', 'BP_Piege', ['cast.to'], 'Le graphe utilise Cast To BP_Joueur', 'Vérifie qui marche sur le piège avec un Cast To BP_Joueur.')),
    noRuntimeErrors(),
  ],
  robustness: [
    {
      id: 'two-traps',
      label: 'il y a un second piège',
      advice: 'La Vie doit être lue et écrite sur le joueur (depuis As BP_Joueur), pas gardée dans le piège : chaque piège enlève alors son point.',
      mutate: (p) => {
        const cls = p.classes.find((c) => c.name === 'BP_Piege');
        if (cls) p.level.actors.push({ id: 'robust-piege2', classId: cls.id, name: 'BP_Piege2', x: 200, y: 320, yaw: 0, overrides: {} });
      },
      scenario: [{ wait: 0.3 }, { teleport: [200, 0] }, { wait: 0.3 }, { teleport: [200, 320] }, { wait: 0.3 }],
      checks: [lifeIs('two-traps-life', 1, 'chaque piège enlève un point', (v) => `Après deux pièges différents, la Vie vaut ${String(v)} au lieu de 1.`)],
    },
  ],
  solve: solveTrap,
};
