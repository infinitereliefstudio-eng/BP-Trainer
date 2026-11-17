/**
 * V2, Débutant: counting with an Integer variable, hiding versus collision,
 * and the first "Complète" exercise (a torch whose graph has three gaps).
 */
import { T } from '../../types/pins';
import { edit, ProjectBuilder } from '../builder';
import { noRuntimeErrors, normText as norm, printedNumbers as numbers, usesNode, visible, notion } from '../checks';
import type { Check, CheckContext, Lesson } from '../types';

/** An Integer variable named `name` in `className`, or why not. */
function intVariable(id: string, className: string, name: string): Check {
  return {
    id,
    label: `${className} a une variable Integer ${name}`,
    test: (cx) => {
      const v = cx.project.classes.find((c) => c.name === className)?.variables.find((x) => x.name === name);
      if (!v) return `Crée dans ${className} une variable nommée ${name} (Variables › +), de type Integer.`;
      return v.type.category === 'int' && !v.type.container ? true : `${name} doit être de type Integer (un nombre entier).`;
    },
  };
}

// ------------------------------------------------------------ Le compteur

function counterProject() {
  const pb = new ProjectBuilder('Le compteur');
  const b = pb.blueprint('BP_Compteur');
  b.component('StaticMesh', 'Socle', { sizeX: 60, sizeY: 60, color: '#64748b', blocks: false });
  b.component('BoxCollision', 'Zone', { sizeX: 220, sizeY: 220 });
  pb.place(b, 0, 0);
  pb.playerStart(-500, 0);
  return pb.project;
}

const pass = [{ teleport: [0, 0] as [number, number] }, { wait: 0.3 }, { teleport: [-500, 0] as [number, number] }, { wait: 0.3 }];

export const lessonCounter: Lesson = {
  id: 'l-compteur',
  module: 'Variables',
  level: 'debutant',
  number: 0,
  title: 'Le compteur',
  situation: 'Une borne compte les passages du joueur et affiche le total. Au 3e passage, elle affiche « Trop de passages ! ».',
  notions: ['Variable Integer', 'Get / Set', 'Increment Int', '>= (Integer)', 'Branch'],
  remember: 'Un Set ne change la variable que quand le fil blanc passe par lui : posé seul, il ne s’exécute jamais. Lire la variable (Get) donne sa valeur du moment.',
  cards: [
    {
      title: 'Ce qui est en place',
      body:
        '**BP_Compteur** est une borne au milieu du niveau : un **Socle** et une **Zone** (Box Collision) autour. Le joueur part à gauche. Le graphe est vide, et il n’y a pas encore de variable : c’est à toi de la créer.\n\n' +
        'À chaque fois que le joueur entre dans la Zone, la borne doit compter ce passage, afficher le total, et lancer une alerte à partir du 3e.',
    },
    {
      title: 'Une variable Integer',
      body:
        'Un nombre que l’on veut garder d’un passage à l’autre se range dans une **variable**. Dans My Blueprint, Variables › **+**, nomme-la `Passages`, type **Integer** (un nombre entier, pin verte). Sa valeur par défaut, 0, est sa valeur au lancement.\n\n' +
        '- **Get Passages** (sans fil blanc) lit la valeur **au moment** où un nœud exécuté la demande.\n- **Set Passages** (fil blanc) range une nouvelle valeur.\n- **Increment Int** (fil blanc) ajoute 1 à la variable branchée sur sa pin en **losange**, et redonne la nouvelle valeur. Le losange veut dire « par référence » : le nœud écrit dans la variable elle-même, pas dans une copie. Branche-y **Get Passages**.\n\n' +
        '`Set Passages` avec `Passages + 1` fait la même chose, en trois nœuds.',
    },
    {
      title: 'Comparer et choisir',
      body:
        '**>= (Integer)** compare A et B et donne un **Boolean** (pin rouge) : vrai si A est plus grand ou égal à B. Avec A = Passages et B = 3, il est vrai au 3e passage, et à tous les suivants.\n\n' +
        '**Branch** lit ce Boolean sur **Condition** et envoie le fil blanc par **True** ou par **False**. Rien n’oblige à relier les deux sorties : ici, False ne fait rien.',
    },
    {
      title: 'Le plan',
      body:
        'Tout ce qui arrive à chaque passage est sur **un seul fil blanc**, dans cet ordre :\n\n' +
        '1. **Event ActorBeginOverlap**.\n2. **Increment Int** (Passages).\n3. **Print String**, In String = Get Passages.\n4. **Branch**, Condition = Passages >= 3.\n5. True : **Print String** « Trop de passages ! ».\n\n' +
        'Relier un Integer (vert) à In String (magenta, une String) pose automatiquement une **conversion** : c’est normal.',
    },
    {
      title: 'Les deux pièges',
      body:
        '**Un Increment posé à côté du fil.** Il ne s’exécute jamais et Passages reste à 0, sans erreur à l’exécution (Compile l’avertit). Tout nœud à pins blanches doit être traversé par le fil.\n\n' +
        '**Afficher avant de compter.** Si le Print String vient avant l’Increment, il lit l’ancienne valeur : on voit 0, 1, 2 au lieu de 1, 2, 3. Un Get donne la valeur du moment, pas celle de la fin de l’événement.',
    },
  ],
  objectives: [
    'Crée une variable Integer `Passages` dans BP_Compteur.',
    'À chaque entrée du joueur dans la Zone : ajoute 1 à Passages, puis affiche sa valeur avec Print String.',
    'Si Passages vaut 3 ou plus, affiche aussi « Trop de passages ! ».',
    'Touche Vérifier.',
  ],
  hints: [
    'L’événement est On Actor Begin Overlap. Tout ce qui doit se passer à chaque passage est sur son fil blanc.',
    'Nœuds : Event ActorBeginOverlap, Increment Int (Get Passages sur la pin en losange), Print String, >= (Integer), Branch, un second Print String.',
    'Solution : BeginOverlap → Increment Int (Passages) → Print String (Passages) → Branch (Passages >= 3) → True : Print String « Trop de passages ! ».',
  ],
  challenge: 'Affiche le total sur la borne elle-même : ajoute un Text Render et utilise Set Text.',
  setup: counterProject,
  scenario: [{ wait: 0.2 }, ...pass, ...pass, { checkpoint: 'deux' }, ...pass, { checkpoint: 'trois' }],
  checks: [
    intVariable('var', 'BP_Compteur', 'Passages'),
    {
      id: 'count',
      label: 'Après 3 passages, Passages vaut 3',
      at: 'trois',
      test: (cx) => {
        const v = cx.variable('BP_Compteur', 'Passages');
        if (v === 3) return true;
        if (v === 0 || v === undefined) {
          return 'Passages vaut toujours 0 : le nœud qui l’augmente ne s’exécute pas. Il doit être sur le fil blanc qui part de l’overlap.';
        }
        return `Passages vaut ${v} après 3 passages : ajoute exactement 1 par entrée dans la Zone.`;
      },
    },
    {
      id: 'shown',
      label: 'Le total s’affiche à chaque passage : 1, 2, 3',
      at: 'trois',
      test: (cx) => {
        const n = numbers(cx);
        if (n.join() === '1,2,3') return true;
        if (n.join() === '0,1,2') return 'Les nombres affichés sont 0, 1, 2 : le Print String lit Passages avant qu’il soit augmenté. Affiche-le après.';
        return n.length ? `Nombres affichés : ${n.join(', ')}. Il fallait 1, 2, 3.` : 'Aucun nombre affiché : relie Get Passages à In String d’un Print String.';
      },
    },
    {
      id: 'not-yet',
      label: 'Pas d’alerte aux deux premiers passages',
      at: 'deux',
      test: (cx) =>
        cx.prints().some((p) => norm(p).includes('trop'))
          ? '« Trop de passages » s’affiche déjà avant le 3e passage : la condition doit être Passages >= 3.'
          : true,
    },
    {
      id: 'alarm',
      label: 'Au 3e passage, « Trop de passages ! » s’affiche',
      at: 'trois',
      test: (cx) => (cx.prints().some((p) => norm(p).includes('trop')) ? true : 'Aucun message « Trop de passages ! » au 3e passage.'),
    },
    notion(usesNode('branch', 'BP_Compteur', ['flow.branch'], 'Le graphe utilise un Branch', 'Choisis d’afficher l’alerte avec un Branch.')),
    noRuntimeErrors(),
  ],
  solve(p) {
    const b = edit(p, 'BP_Compteur');
    const v = b.variable('Passages', T.int, 0);
    const ev = b.node('event.actorBeginOverlap');
    const inc = b.node('var.incrementInt');
    const pr = b.node('debug.printString');
    const br = b.node('flow.branch');
    const alarm = b.node('debug.printString', {}, { text: 'Trop de passages !' });
    const ge = b.node('math.greaterEqualInt', {}, { b: 3 }, [700, 300]);
    b.link(ev, 'then', inc, 'exec').link(b.node('var.get', { variable: v }, {}, [300, 300]), 'value', inc, 'value');
    b.link(inc, 'then', pr, 'exec').link(inc, 'result', pr, 'text');
    b.link(pr, 'then', br, 'exec').link(b.node('var.get', { variable: v }, {}, [600, 400]), 'value', ge, 'a').link(ge, 'result', br, 'condition');
    b.link(br, 'true', alarm, 'exec');
  },
};

// ------------------------------------------------- Visible, caché, traversable

function barrierProject() {
  const pb = new ProjectBuilder('Visible, caché, traversable');
  const b = pb.blueprint('BP_Barriere');
  b.component('StaticMesh', 'Barriere', { sizeX: 40, sizeY: 1600, color: '#b45309', blocks: true, collision: 3 });
  b.cls.autoReceiveInput = true;
  pb.place(b, 0, 0);
  pb.playerStart(-400, 0);
  return pb.project;
}

const barrierShown = (cx: CheckContext) => {
  const a = cx.actor('BP_Barriere');
  const mesh = cx.component('BP_Barriere', 'Barriere');
  return !!a && !a.hidden && !!mesh?.props.visible;
};

export const lessonBarrier: Lesson = {
  id: 'l-barriere',
  module: 'Collisions',
  level: 'debutant',
  number: 0,
  title: 'Visible, caché, traversable',
  situation: 'Une barrière bloque le passage. La touche E doit la faire disparaître : invisible, et traversable.',
  notions: ['Set Actor Hidden In Game', 'Set Visibility', 'Set Collision Enabled', 'ECollisionEnabled'],
  remember: 'Cacher (Hidden, Visible) ne change que l’affichage : la collision reste. Pour laisser passer, c’est Set Collision Enabled.',
  cards: [
    {
      title: 'Ce qui est en place',
      body:
        '**BP_Barriere** est un long mur orange qui coupe le niveau en deux. Le joueur part à gauche et ne peut pas passer. **Auto Receive Input** est activé : la barrière entend la touche E.\n\n' +
        'Le but : sur E, la barrière disparaît **et** laisse passer. Ce sont deux choses différentes pour le moteur, et c’est tout le sujet de la leçon.',
    },
    {
      title: 'Ce qu’on voit',
      body:
        'Deux nœuds cachent, à deux niveaux :\n\n' +
        '- **Set Actor Hidden In Game** : cache **tout l’acteur**, tous ses composants. Pin **New Hidden** : coché = caché. Sans Target relié, il agit sur l’acteur lui-même (self).\n- **Set Visibility** : cache **un seul composant**, branché sur Target.\n\n' +
        'Attention au sens des cases : Hidden coché = caché, Visibility coché = visible.\n\n' +
        'Dans les deux cas, seul **l’affichage** change. Le mur caché est toujours là pour le moteur.',
    },
    {
      title: 'Ce qui bloque',
      body:
        'Un mesh bloque le joueur à cause de sa **collision**, réglée par **Collision Enabled**. La valeur qui nous intéresse :\n\n' +
        '- **No Collision** : le composant n’existe plus pour les collisions. Ni blocage, ni overlap.\n- **Query and Physics** (Collision Enabled) : il bloque et il détecte. C’est le réglage de départ de la barrière.\n\n' +
        '**Set Collision Enabled** change ce réglage pendant le jeu. **Target** attend le **composant** (Get Barriere), pas l’acteur : la collision appartient à chaque composant. **New Type** est une liste : choisis No Collision.',
    },
    {
      title: 'Le plan',
      body:
        '**E** (Pressed) → **Set Actor Hidden In Game** (New Hidden coché) → **Set Collision Enabled** (Target = Barriere, New Type = No Collision).\n\n' +
        'L’ordre des deux nœuds n’a pas d’importance : ils s’exécutent dans la même image.\n\n' +
        'Le piège : s’arrêter au premier nœud. Le mur disparaît, le joueur avance… et se cogne à un mur invisible. C’est un bug classique dans un vrai jeu.',
    },
    {
      title: 'Dans UE',
      body:
        'Dans UE, Collision Enabled se règle dans Details › Collision, souvent par un **preset** (BlockAll, OverlapAll, NoCollision…) qui règle aussi la réponse à chaque type d’objet. Pour cacher et couper d’un coup tout un acteur, **Set Actor Enable Collision** existe aussi.\n\n' +
        'Pour une porte, un piège ou un passage secret, retiens le réflexe : se demander séparément « est-ce qu’on le voit ? » et « est-ce qu’on peut le traverser ? ».',
    },
  ],
  objectives: [
    'Quand on appuie sur E, la barrière devient invisible.',
    'Et le joueur peut la traverser.',
    'Touche Vérifier : le test essaie d’abord de passer avant E (bloqué), puis appuie sur E et avance.',
  ],
  hints: [
    'Deux choses distinctes à changer : l’affichage, et la collision.',
    'Nœuds : Input E, Set Actor Hidden In Game (ou Set Visibility sur Barriere), Set Collision Enabled (Target = Barriere, New Type = No Collision).',
    'Solution : E Pressed → Set Actor Hidden In Game (New Hidden coché) → Set Collision Enabled (Barriere, No Collision).',
  ],
  challenge: 'Fais réapparaître la barrière à un second appui sur E, solide à nouveau (un FlipFlop aide).',
  setup: barrierProject,
  scenario: [
    { wait: 0.2 },
    { walk: [1, 0], seconds: 1 },
    { checkpoint: 'avant' },
    { press: 'E' },
    { release: 'E' },
    { checkpoint: 'cachee' },
    { walk: [1, 0], seconds: 1.2 },
    { checkpoint: 'passe' },
  ],
  checks: [
    {
      id: 'blocks',
      label: 'Avant E, la barrière bloque le joueur',
      at: 'avant',
      test: (cx) => (cx.sim.player.x < 0 ? true : 'Le joueur a traversé la barrière avant même l’appui sur E : elle doit bloquer jusque-là.'),
    },
    {
      id: 'hidden',
      label: 'Après E, la barrière est invisible',
      at: 'cachee',
      test: (cx) => (barrierShown(cx) ? 'La barrière est encore visible après l’appui sur E.' : true),
    },
    {
      id: 'through',
      label: 'Après E, le joueur la traverse',
      at: 'passe',
      test: (cx) => {
        if (cx.sim.player.x > 60) return true;
        return barrierShown(cx)
          ? 'Le joueur reste bloqué derrière la barrière.'
          : 'La barrière est cachée, mais le joueur reste bloqué : cacher ne coupe pas la collision. Ajoute Set Collision Enabled (No Collision) sur Barriere.';
      },
    },
    noRuntimeErrors(),
  ],
  solve(p) {
    const b = edit(p, 'BP_Barriere');
    const key = b.node('event.inputKey', { key: 'E' });
    const hide = b.node('actor.setHidden', {}, { hidden: true });
    const col = b.node('component.setCollisionEnabled', {}, { collision: 0 });
    b.link(key, 'pressed', hide, 'exec').link(hide, 'then', col, 'exec').target('Barriere', col);
  },
};

// ------------------------------------------------------- Complète C1

/** A torch with 3 charges: E uses one, prints what is left, and at 0 the light goes out. */
function torchProject(withGaps: boolean) {
  const pb = new ProjectBuilder('La lampe torche');
  const b = pb.blueprint('BP_Torche');
  b.component('StaticMesh', 'Corps', { shape: 'cylinder', sizeX: 36, sizeY: 36, color: '#94a3b8' });
  b.component('PointLight', 'Lumiere', { visible: true, radius: 320, color: '#fde68a' });
  b.cls.autoReceiveInput = true;
  const charges = b.variable('Charges', T.int, 3);
  const key = b.node('event.inputKey', { key: 'E' }, {}, [64, 120]);
  const pr = b.node('debug.printString', {}, {}, [700, 120]);
  const off = b.node('component.setVisibility', {}, { visible: false }, [1460, 120]);
  b.target('Lumiere', off);
  const get = b.node('var.get', { variable: charges }, {}, [560, 330]);
  b.link(get, 'value', pr, 'text');
  if (withGaps) {
    b.node('util.comment', { text: 'Trou 1 : retire 1 à Charges', w: 280, h: 200, color: '#f2c014' }, {}, [370, 40]);
    b.node('util.comment', { text: 'Trou 2 : Charges vaut-il 0 ?', w: 280, h: 200, color: '#f2c014' }, {}, [960, 300]);
    b.node('util.comment', { text: 'Trou 3 : choisis le chemin', w: 280, h: 200, color: '#f2c014' }, {}, [1100, 40]);
  }
  pb.place(b, 0, 0);
  pb.playerStart(-300, 0);
  return { pb, b, key, pr, off, charges };
}

const press = [{ press: 'E' as const }, { release: 'E' as const }];

export const complete1: Lesson = {
  id: 'c1-torche',
  kind: 'complete',
  code: 'C1',
  module: 'Variables',
  level: 'debutant',
  number: 0,
  title: 'La lampe torche',
  situation: 'La torche a 3 charges. Chaque appui sur E en use une et affiche ce qui reste ; à 0, elle s’éteint. Trois nœuds manquent, dans les cadres jaunes.',
  notions: ['Decrement Int', 'Comparer deux Integer', 'Branch', 'Types des pins'],
  remember: 'La couleur d’une pin dit son type : vert pour Integer, rouge pour Boolean. Un fil ne relie que des pins compatibles, c’est le premier indice pour savoir quel nœud placer.',
  cards: [
    {
      title: 'Compléter un graphe',
      body:
        'Un exercice **Complète** donne un graphe presque fini. Les **cadres jaunes** (des Comments) marquent où il manque un nœud, et la consigne dit lesquels poser. À toi de trouver où chacun se branche.\n\n' +
        'Le meilleur indice est la **couleur des pins** : un fil ne relie que des pins de types compatibles. Vert d’eau = Integer, rouge = Boolean, blanc = exécution, bleu = référence.',
    },
    {
      title: 'Ce qui est en place',
      body:
        '**BP_Torche** a une **Lumiere** allumée et une variable **Charges** (Integer, 3). Dans le graphe :\n\n' +
        '- l’événement **E** ;\n- un **Print String** qui lit Get Charges ;\n- un **Set Visibility** qui éteint Lumiere ;\n- trois cadres jaunes, et aucun fil blanc entre ces nœuds.',
    },
    {
      title: 'Les trois nœuds à placer',
      body:
        '- **Decrement Int** : retire 1 à la variable branchée sur sa pin en losange (Get Charges). Fil blanc : il doit être traversé pour agir.\n- **== (Integer)** : vrai si A et B sont égaux. Sa sortie est un Boolean rouge. **<= (Integer)** marche aussi (Charges <= 0).\n- **Branch** : envoie le fil blanc par True ou False selon sa Condition, le Boolean rouge.',
    },
    {
      title: 'Le plan',
      body:
        'Sur le fil blanc : **E** → Decrement Int → Print String → Branch → (True) Set Visibility.\n\n' +
        'La Condition du Branch vient de **Charges == 0**, avec un second Get Charges.\n\n' +
        'Avec cet ordre : 1er appui, 2 s’affiche ; 2e appui, 1 ; 3e appui, 0, et la lumière s’éteint.\n\n' +
        'Le piège : placer le Decrement après le Print String. On verrait 3, 2, 1 : l’affichage lirait la charge avant qu’elle soit retirée.',
    },
  ],
  objectives: [
    'Trou 1 : Decrement Int retire 1 à Charges (Get Charges sur sa pin en losange), sur le fil après E.',
    'Trou 2 : compare Charges à 0.',
    'Trou 3 : un Branch qui n’éteint la Lumiere que si Charges est à 0.',
    'Touche Vérifier : 3 appuis sur E, la torche affiche 2, 1, 0 et s’éteint au 3e.',
  ],
  hints: [
    'L’ordre sur le fil blanc : E → retirer une charge → afficher → choisir → éteindre.',
    'Decrement Int entre E et Print String ; == (Integer) entre Get Charges et la Condition du Branch ; Branch entre Print String et Set Visibility (True).',
    'Solution : E Pressed → Decrement Int (Charges) → Print String (Charges) → Branch (Charges == 0) → True : Set Visibility (Lumiere, décoché).',
  ],
  challenge: 'Ajoute un Clamp, ou un second Branch, pour que Charges ne descende jamais sous 0 si on continue d’appuyer.',
  setup: () => torchProject(true).pb.project,
  scenario: [{ wait: 0.2 }, ...press, { checkpoint: 'un' }, ...press, { checkpoint: 'deux' }, ...press, { checkpoint: 'trois' }],
  checks: [
    {
      id: 'charges',
      label: 'Chaque appui retire une charge : 2, 1, 0',
      at: 'trois',
      test: (cx) => {
        const v = cx.variable('BP_Torche', 'Charges');
        if (v === 0) return true;
        return v === 3 ? 'Charges vaut toujours 3 : Decrement Int n’est pas sur le fil blanc, ou sa pin en losange n’est pas reliée à Get Charges.' : `Charges vaut ${v} après 3 appuis.`;
      },
    },
    {
      id: 'shown',
      label: 'La torche affiche 2, puis 1, puis 0',
      at: 'trois',
      test: (cx) => {
        const n = numbers(cx);
        if (n.join() === '2,1,0') return true;
        if (n.join() === '3,2,1') return 'Affiché : 3, 2, 1. Print String lit Charges avant le Decrement : place le Decrement avant.';
        return `Nombres affichés : ${n.join(', ') || 'aucun'}. Il fallait 2, 1, 0.`;
      },
    },
    visible('still-on', 'BP_Torche', 'Lumiere', true, 'Après 2 appuis, la torche éclaire encore', 'deux'),
    visible('off', 'BP_Torche', 'Lumiere', false, 'Au 3e appui, elle s’éteint', 'trois'),
    notion(usesNode('branch', 'BP_Torche', ['flow.branch'], 'Un Branch choisit le chemin', 'Le trou 3 attend un Branch.')),
    noRuntimeErrors(),
  ],
  solve(p) {
    const b = edit(p, 'BP_Torche');
    const charges = b.cls.variables[0].id;
    const nodes = Object.values(b.graph.nodes);
    const key = nodes.find((n) => n.def === 'event.inputKey')!.id;
    const pr = nodes.find((n) => n.def === 'debug.printString')!.id;
    const off = nodes.find((n) => n.def === 'component.setVisibility')!.id;
    const dec = b.node('var.decrementInt', {}, {}, [400, 120]);
    const eq = b.node('math.equalInt', {}, { b: 0 }, [990, 340]);
    const br = b.node('flow.branch', {}, {}, [1130, 120]);
    b.link(key, 'pressed', dec, 'exec').link(b.node('var.get', { variable: charges }, {}, [400, 330]), 'value', dec, 'value');
    b.link(dec, 'then', pr, 'exec').link(pr, 'then', br, 'exec').link(br, 'true', off, 'exec');
    b.link(b.node('var.get', { variable: charges }, {}, [990, 460]), 'value', eq, 'a').link(eq, 'result', br, 'condition');
  },
};
