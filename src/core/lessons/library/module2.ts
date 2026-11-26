/** Module 2 — Portes et objets. */
import { edit, ProjectBuilder } from '../builder';
import { noRuntimeErrors, usesNode, notion } from '../checks';
import type { Check, CheckContext, Lesson } from '../types';
import { doorBlueprint, keyBlueprint, playerBlueprint, solveKey } from './props';

const MODULE = 'Portes et objets';

/** Door angle in [-180, 180). */
function doorYaw(cx: CheckContext): number {
  const yaw = cx.component('BP_Porte', 'Porte')?.props.yaw ?? 0;
  return ((((yaw + 180) % 360) + 360) % 360) - 180;
}

/**
 * The door is open (Yaw ±90) or closed (Yaw 0) at a checkpoint. `closedReason`
 * replaces "it did not move" when the door is expected open but found closed
 * after having opened earlier in the scenario.
 */
/** Did any rotation node of BP_Porte run during the scenario? */
function doorEverTurned(cx: CheckContext): boolean {
  const cls = cx.project.classes.find((c) => c.name === 'BP_Porte');
  const turns = new Set(['component.setRelativeRotation', 'component.addRelativeRotation', 'actor.setRotation']);
  return !!cls?.graphs.some((g) => Object.values(g.nodes).some((n) => turns.has(n.def) && cx.sim.record.runsOf(g.id, n.id)));
}

function doorOpen(id: string, open: boolean, label: string, at?: string, closedReason?: string): Check {
  return {
    id,
    label,
    at,
    test: (cx) => {
      const yaw = doorYaw(cx);
      const isOpen = Math.abs(Math.abs(yaw) - 90) < 1;
      if (open) {
        if (isOpen) return true;
        if (yaw === 0) return closedReason && doorEverTurned(cx) ? closedReason : 'La porte n’a pas bougé.';
        return `La porte a tourné de ${yaw}° au lieu de 90°.`;
      }
      return Math.abs(yaw) < 1 ? true : 'La porte est ouverte à ce moment-là.';
    },
  };
}

/** Door logic of lesson 5 without DoOnce: overlap → rotate to 90°. */
function openOnOverlap(p: Parameters<typeof edit>[0]): void {
  const b = edit(p, 'BP_Porte');
  const e = b.node('event.actorBeginOverlap', {}, {}, [64, 96]);
  const rot = b.node('component.setRelativeRotation', {}, { rotation: { x: 0, y: 0, z: 90 } }, [380, 96]);
  b.link(e, 'then', rot, 'exec').target('Porte', rot);
}

export const lesson5: Lesson = {
  id: 'l05-porte',
  module: MODULE,
  level: 'intermediaire',
  number: 5,
  title: 'Ouvrir une porte',
  situation: 'La porte pivote de 90° quand le joueur s’approche, une seule fois, et le laisse passer.',
  notions: ['Set Relative Rotation', 'Rotator', 'DoOnce'],
  remember: 'Do Once laisse passer le premier passage, puis plus rien jusqu’à Reset : c’est le moyen simple d’empêcher une action de se répéter.',
  cards: [
    {
      title: 'Ce qui est en place',
      body:
        'Un mur coupe le niveau en deux, avec une ouverture fermée par **BP_Porte**. Elle a deux composants :\n\n' +
        '- **Porte**, un Static Mesh en forme de battant, qui pivote sur son gond comme une vraie porte ;\n- **Zone**, une Box Collision devant le passage.\n\n' +
        'Le joueur part à gauche et avance vers la porte. Le graphe de BP_Porte est vide.',
    },
    {
      title: 'Tourner un composant',
      body:
        '**Set Relative Rotation** donne une nouvelle rotation à un composant :\n\n' +
        '- **Target** : le composant à tourner (Get Porte) ;\n- **New Rotation** : un **Rotator**, trois angles en degrés : Roll (X), Pitch (Y) et Yaw (Z).\n\n' +
        'Le niveau de l’appli n’a pas de hauteur : seul **Yaw** compte : c’est la rotation autour de l’axe vertical. Écris 90 dans la case Z.\n\n' +
        '**Relative** veut dire « par rapport à l’acteur » : 0 est la position fermée de la porte telle qu’on l’a posée, quelle que soit l’orientation de l’acteur dans le niveau. Ce n’est pas un ajout : Set Relative Rotation à 90 deux fois de suite laisse la porte à 90.',
    },
    {
      title: 'DoOnce',
      body:
        '**DoOnce** est une porte sur le fil blanc qui ne s’ouvre qu’une fois :\n\n' +
        '- le premier passage entre et ressort par **Completed** ;\n- les suivants s’arrêtent là, sans erreur ;\n- un passage par l’entrée **Reset** le rouvre pour un nouveau coup.\n\n' +
        '**Start Closed** coché le fait démarrer fermé : il faudra un Reset avant le premier passage.',
    },
    {
      title: 'Le plan',
      body:
        '**Event ActorBeginOverlap** → **DoOnce** → **Set Relative Rotation** (Target = Porte, New Rotation = 0, 0, 90).\n\n' +
        'Sans DoOnce, la porte s’ouvre aussi. Mais chaque nouvel overlap relancerait l’ouverture : sans effet visible ici, gênant dès que l’ouverture joue un son, compte un passage ou lance une animation. DoOnce dit clairement « une seule fois ».',
    },
    {
      title: 'Dans UE',
      body:
        'Une vraie porte ne pivote pas d’un coup : on anime la rotation avec une **Timeline** (voir « La porte qui glisse »). Le principe Target + New Rotation reste le même.\n\n' +
        'DoOnce est une **macro** fournie par le moteur (dans StandardMacros) : un Branch et une variable cachée. Tu peux l’ouvrir dans UE par un double-clic pour voir comment elle est faite.',
    },
  ],
  objectives: [
    'Quand le joueur entre dans la Zone, la Porte tourne de 90° (Yaw).',
    'Passe par un DoOnce pour qu’elle ne s’ouvre qu’une fois.',
    'Vérifie que le joueur peut traverser.',
  ],
  hints: [
    'La porte réagit au même genre d’événement que l’interrupteur de la leçon « L’interrupteur ».',
    'Nœuds : Event ActorBeginOverlap, DoOnce, Set Relative Rotation (Target = Porte, New Rotation Yaw = 90).',
    'Solution : ActorBeginOverlap → DoOnce → Set Relative Rotation (Porte, 0 / 0 / 90).',
  ],
  challenge: 'Fais refermer la porte 3 secondes après le départ du joueur. Indice : Delay et l’entrée Reset du DoOnce.',
  setup() {
    const pb = new ProjectBuilder('Leçon 5');
    doorBlueprint(pb);
    pb.playerStart(-500, 0);
    return pb.project;
  },
  scenario: [
    { wait: 0.2 },
    { teleport: [-150, 0] },
    { wait: 0.3 },
    { checkpoint: 'ouverte' },
    { teleport: [-600, 0] },
    { wait: 0.3 },
    { teleport: [-150, 0] },
    { wait: 0.3 },
    { walk: [1, 0], seconds: 1 },
  ],
  checks: [
    doorOpen('open', true, 'La porte a tourné de 90° quand le joueur est arrivé', 'ouverte'),
    notion(usesNode('once', 'BP_Porte', ['flow.doOnce'], 'Le graphe utilise un DoOnce', 'Fais passer l’ouverture par un DoOnce.')),
    {
      id: 'pass',
      label: 'Le joueur traverse la porte',
      test: (cx) => (cx.sim.player.x > 120 ? true : 'Le joueur reste bloqué : la porte ne s’est pas écartée du passage.'),
    },
    noRuntimeErrors(),
  ],
  solve(p) {
    const b = edit(p, 'BP_Porte');
    const e = b.node('event.actorBeginOverlap');
    const once = b.node('flow.doOnce');
    const rot = b.node('component.setRelativeRotation', {}, { rotation: { x: 0, y: 0, z: 90 } });
    b.link(e, 'then', once, 'exec').link(once, 'completed', rot, 'exec').target('Porte', rot);
  },
};

// ------------------------------------------------------------------ lesson 6

export const lesson6: Lesson = {
  id: 'l06-cle',
  chain: { notion: 'cast', step: 'guided' },
  module: MODULE,
  level: 'intermediaire',
  number: 6,
  title: 'Ramasser un objet',
  situation: 'La clé disparaît quand le joueur la touche, et le joueur la possède. La caisse posée à côté, elle, ne doit pas la ramasser.',
  recalls: ['destroy'],
  notions: ['Cast To', 'Variable d’un autre Blueprint'],
  remember: 'Other Actor est un simple Actor : Cast To vérifie que c’est bien le joueur et donne accès à ses variables. Un Cast raté part par Cast Failed, sans erreur.',
  cards: [
    {
      title: 'Ce qui est en place',
      body:
        '- **BP_Joueur** : le joueur, avec une variable `bHasKey` (Boolean, faux au départ).\n- **BP_Cle** : une petite clé jaune avec une **Zone** autour.\n- **BP_Caisse** : une caisse posée **contre** la clé, avec sa propre zone de contact. Elle touche la clé dès le lancement.\n\n' +
        'Le graphe de BP_Cle est vide. Le joueur part à gauche et marche vers la clé.',
    },
    {
      title: 'Qui me touche ?',
      body:
        'C’est ce que montrait le détecteur de « Qui est entré ? » : **Other Actor** est de type **Actor**, le plus général. Ce peut être le joueur, la caisse, un projectile… Le moteur ne fait pas le tri.\n\n' +
        'Si la clé réagit à n’importe quel overlap, la caisse la « ramasse » au lancement. La clé doit d’abord vérifier **qui** la touche.',
    },
    {
      title: 'Cast To',
      body:
        '**Cast To BP_Joueur** pose la question « cet objet est-il un BP_Joueur ? » :\n\n' +
        '- **Object** : l’objet à tester (Other Actor) ;\n- sortie blanche du haut : oui, c’est un BP_Joueur ;\n- **Cast Failed** : non. Pas d’erreur, juste l’autre chemin ;\n- **As BP_Joueur** : la même référence, mais **typée** BP_Joueur. C’est elle qui donne accès aux variables du joueur.\n\n' +
        'Tire un fil depuis As BP_Joueur et cherche « bHasKey » : la palette propose **Set bHasKey** avec Target déjà relié.\n\n' +
        'Puis **Destroy Actor**, comme pour les pièces : Target non reliée, la clé se détruit elle-même.',
    },
    {
      title: 'Le plan',
      body:
        '**Event ActorBeginOverlap** → **Cast To BP_Joueur** (Object = Other Actor) → **Set bHasKey** (Target = As BP_Joueur, coché) → **Destroy Actor**.\n\n' +
        'Cast Failed ne mène nulle part : la caisse entre, le Cast échoue, il ne se passe rien.\n\n' +
        'Destroy Actor en dernier, par habitude. Dans UE, la suite du fil s’exécute encore (l’acteur ne disparaît vraiment qu’en fin d’image), mais un Delay placé après ne reprendra jamais, et l’acteur ne compte déjà plus pour Is Valid.',
    },
    {
      title: 'Dans UE',
      body:
        'Cast To n’est pas gratuit : il crée une **dépendance dure**. BP_Cle charge BP_Joueur en mémoire avec lui, même si le joueur n’est jamais là. Sur un petit projet c’est sans importance ; sur un gros, on préfère une **interface** (voir « Interagir avec tout ») ou un **tag** (Actor Has Tag).',
    },
  ],
  objectives: [
    'Dans BP_Cle : quand le joueur touche la zone, mets bHasKey du joueur à true.',
    'Puis détruis la clé.',
    'La caisse ne doit pas déclencher le ramassage.',
  ],
  hints: [
    'Il faut d’abord savoir si Other Actor est le joueur, avant de toucher à quoi que ce soit.',
    'Nœuds : Event ActorBeginOverlap, Cast To BP_Joueur, Set bHasKey (tiré depuis As BP_Joueur), Destroy Actor.',
    'Solution : ActorBeginOverlap → Cast To BP_Joueur (Object = Other Actor) → Set bHasKey (Target = As BP_Joueur, coché) → Destroy Actor.',
  ],
  challenge: 'Affiche « Clé ramassée » à l’écran, et « Ce n’est pas le joueur » quand le Cast échoue.',
  setup() {
    const pb = new ProjectBuilder('Leçon 6');
    playerBlueprint(pb, true);
    const key = keyBlueprint(pb, false);
    const crate = pb.blueprint('BP_Caisse');
    crate.component('StaticMesh', 'Caisse', { sizeX: 90, sizeY: 90, color: '#8b5a2b' });
    crate.component('BoxCollision', 'Contact', { sizeX: 110, sizeY: 110 });
    pb.place(key, 300, 0);
    pb.place(crate, 390, 0);
    pb.playerStart(-300, 0);
    return pb.project;
  },
  scenario: [{ wait: 0.5 }, { checkpoint: 'debut' }, { walk: [1, 0], seconds: 1.2 }, { wait: 0.2 }],
  checks: [
    {
      id: 'crate',
      label: 'La caisse, qui touche la clé, ne la ramasse pas',
      at: 'debut',
      test: (cx) => (cx.actor('BP_Cle') ? true : 'La clé a disparu dès le lancement : la caisse l’a « ramassée ». Vérifie qui la touche avec un Cast.'),
    },
    {
      id: 'gone',
      label: 'La clé disparaît quand le joueur la touche',
      test: (cx) => (cx.actor('BP_Cle') ? 'La clé est toujours là après le passage du joueur.' : true),
    },
    {
      id: 'has',
      label: 'Le joueur possède la clé (bHasKey = true)',
      test: (cx) => (cx.variable('Joueur', 'bHasKey') === true ? true : 'bHasKey du joueur vaut toujours false.'),
    },
    notion(usesNode('cast', 'BP_Cle', ['cast.to'], 'Le graphe utilise Cast To BP_Joueur', 'Utilise Cast To BP_Joueur pour vérifier qui touche la clé.')),
    noRuntimeErrors(),
  ],
  solve(p) {
    const player = edit(p, 'BP_Joueur');
    const hasKey = player.cls.variables.find((v) => v.name === 'bHasKey')!.id;
    solveKey(edit(p, 'BP_Cle'), player, hasKey);
  },
};

// ------------------------------------------------------------------ lesson 7

export const lesson7: Lesson = {
  id: 'l07-verrou',
  chain: { notion: 'cast', step: 'guided' },
  module: MODULE,
  level: 'intermediaire',
  number: 7,
  title: 'La porte verrouillée',
  situation: 'La porte ne s’ouvre que si le joueur a la clé. Sinon, un message le prévient.',
  notions: ['Lire la variable d’un autre Blueprint', 'Branch'],
  remember: 'Lire la variable d’un autre Blueprint demande une référence vers lui. La lecture se fait au moment où le nœud qui l’utilise s’exécute.',
  cards: [
    {
      title: 'Ce qui est en place',
      body:
        'Trois Blueprints :\n\n' +
        '- **BP_Joueur** avec `bHasKey` ;\n- **BP_Cle**, posée en haut à gauche, **déjà programmée** : la toucher met bHasKey à vrai et la fait disparaître (c’est la solution de « Ramasser un objet ») ;\n- **BP_Porte**, avec sa Porte et sa Zone, graphe vide.\n\n' +
        'Le test fait venir le joueur à la porte **sans** la clé, puis va chercher la clé, puis revient.',
    },
    {
      title: 'Lire la variable d’un autre Blueprint',
      body:
        'L’information « a-t-il la clé ? » n’est pas dans la porte, elle est dans le joueur. Pour la lire, la porte a besoin d’une **référence** vers le joueur, typée BP_Joueur.\n\n' +
        'C’est le même chemin que pour la clé : **Cast To BP_Joueur** sur Other Actor, puis depuis **As BP_Joueur**, tire un fil et cherche **Get bHasKey**.\n\n' +
        'Ce Get lit la valeur **au moment** où le Branch la demande, pas au lancement : quand le joueur revient avec la clé, la porte voit le nouveau vrai.',
    },
    {
      title: 'Le plan',
      body:
        '**Event ActorBeginOverlap** → **Cast To BP_Joueur** (Object = Other Actor) → **Branch** (Condition = Get bHasKey, depuis As BP_Joueur).\n\n' +
        '- **True** : **Set Relative Rotation** (Target = Porte, Yaw 90).\n- **False** : **Print String** « Il faut une clé ».\n\n' +
        'Le message doit contenir le mot « clé » : c’est ce que la vérification cherche.',
    },
    {
      title: 'Les pièges',
      body:
        '**Brancher Get bHasKey sans Target.** Un Get de la variable d’un autre Blueprint demande sur **quel** joueur la lire. Sans Target relié, il n’a personne à qui demander.\n\n' +
        '**Oublier le Cast.** Other Actor n’est qu’un Actor : la palette ne propose pas bHasKey depuis lui. Le Cast transforme « un acteur quelconque » en « le joueur, avec ses variables ».',
    },
  ],
  objectives: [
    'Dans BP_Porte : quand le joueur arrive, ouvre la porte (Yaw 90) seulement s’il a la clé.',
    'Sans clé, affiche un message qui parle de la clé.',
    'Le test passe d’abord sans clé, puis avec.',
  ],
  hints: [
    'C’est un mélange de « Ouvrir une porte » et de « Ramasser un objet » (Cast vers le joueur).',
    'Nœuds : Event ActorBeginOverlap, Cast To BP_Joueur, Get bHasKey, Branch, Set Relative Rotation, Print String.',
    'Solution : Overlap → Cast To BP_Joueur → Branch (Get bHasKey depuis As BP_Joueur). True → Set Relative Rotation (Porte, Yaw 90). False → Print « Il faut une clé ».',
  ],
  challenge: 'Fais disparaître la clé du joueur quand la porte s’ouvre (bHasKey = false) : elle ne sert qu’une fois.',
  setup() {
    const pb = new ProjectBuilder('Leçon 7');
    const { b: player, hasKey } = playerBlueprint(pb, true);
    doorBlueprint(pb);
    const key = keyBlueprint(pb, true, player, hasKey);
    pb.place(key, -400, 300);
    pb.playerStart(-500, 0);
    return pb.project;
  },
  scenario: [
    { wait: 0.2 },
    { teleport: [-150, 0] },
    { wait: 0.3 },
    { checkpoint: 'sans' },
    { teleport: [-400, 300] },
    { wait: 0.3 },
    { teleport: [-600, 0] },
    { wait: 0.3 },
    { teleport: [-150, 0] },
    { wait: 0.3 },
  ],
  checks: [
    doorOpen('closed', false, 'Sans clé, la porte reste fermée', 'sans'),
    {
      id: 'msg',
      label: 'Sans clé, un message parle de la clé',
      at: 'sans',
      test: (cx) =>
        cx.prints().some((t) => /cl[eé]/i.test(t)) ? true : 'Aucun message contenant « clé » quand le joueur arrive sans la clé.',
    },
    doorOpen('open', true, 'Avec la clé, la porte s’ouvre'),
    notion(usesNode('branch', 'BP_Porte', ['flow.branch'], 'Le graphe utilise un Branch', 'Choisis entre ouvrir et prévenir avec un Branch.')),
    noRuntimeErrors(),
  ],
  solve(p) {
    const player = edit(p, 'BP_Joueur');
    const hasKey = player.cls.variables.find((v) => v.name === 'bHasKey')!.id;
    const b = edit(p, 'BP_Porte');
    const e = b.node('event.actorBeginOverlap', {}, {}, [64, 96]);
    const cast = b.node('cast.to', { class: player.cls.id }, {}, [360, 96]);
    const get = b.node('var.getExternal', { owner: player.cls.id, variable: hasKey }, {}, [420, 340]);
    const br = b.node('flow.branch', {}, {}, [700, 96]);
    const rot = b.node('component.setRelativeRotation', {}, { rotation: { x: 0, y: 0, z: 90 } }, [1000, 0]);
    const say = b.node('debug.printString', {}, { text: 'Il faut une clé' }, [1000, 300]);
    b.link(e, 'then', cast, 'exec').link(e, 'other', cast, 'object').link(cast, 'then', br, 'exec');
    b.link(cast, 'as', get, 'target').link(get, 'value', br, 'condition');
    b.link(br, 'true', rot, 'exec').target('Porte', rot).link(br, 'false', say, 'exec');
  },
};

// ------------------------------------------------------------------ lesson 8

export const lesson8: Lesson = {
  id: 'l08-refermer',
  module: MODULE,
  level: 'intermediaire',
  number: 8,
  title: 'La porte qui se referme',
  situation: 'La porte se referme 3 secondes après le départ du joueur. S’il repasse entre-temps, le compte repart de zéro.',
  notions: ['Event ActorEndOverlap', 'Delay', 'Retriggerable Delay'],
  remember: 'Un Delay en cours ignore les nouveaux appels ; Retriggerable Delay recommence l’attente à chaque appel.',
  cards: [
    {
      title: 'Ce qui est en place',
      body:
        'La porte de « Ouvrir une porte », sans DoOnce : **Event ActorBeginOverlap** → Set Relative Rotation (Yaw 90) est déjà dans le graphe. Elle s’ouvre à chaque arrivée du joueur.\n\n' +
        'Il manque la fermeture. Le test fait arriver le joueur, le fait partir, revenir une seconde après, repartir, puis attend.',
    },
    {
      title: 'Attendre',
      body:
        '**Delay** suspend le fil blanc pendant **Duration** secondes, puis le reprend par **Completed**. Le jeu continue pendant ce temps : rien n’est gelé.\n\n' +
        'Les nœuds avec une petite **horloge** sont **latents** : ils reprennent plus tard. Ils n’existent que dans l’Event Graph, pas dans une fonction (une fonction doit finir tout de suite).\n\n' +
        'Le piège du Delay : **un Delay déjà en cours ignore les nouveaux appels**. Il ne repart pas, il ne s’empile pas.',
    },
    {
      title: 'Retriggerable Delay',
      body:
        '**Retriggerable Delay** a les mêmes pins, avec l’inverse pour la règle : chaque nouvel appel **remet le compte à zéro**.\n\n' +
        'Déroulons le test avec chacun :\n\n' +
        '- Le joueur sort (t = 0), revient à t = 1, ressort à t = 2.\n- **Delay** : l’attente lancée à t = 0 ignore la sortie de t = 2 et ferme la porte à t = 3, une seconde après le départ réel du joueur.\n- **Retriggerable Delay** : la sortie de t = 2 relance le compte ; la porte se ferme à t = 5, 3 secondes après la **dernière** sortie.',
    },
    {
      title: 'Le plan',
      body:
        '**Event ActorEndOverlap** → **Retriggerable Delay** (Duration 3) → **Set Relative Rotation** (Target = Porte, Yaw **0**).\n\n' +
        'Yaw 0 est la position fermée : la rotation relative revient à celle de départ.',
    },
    {
      title: 'Dans UE',
      body:
        'Delay et Retriggerable Delay sont pratiques mais anonymes : on ne peut ni les annuler ni savoir combien de temps il reste. Quand il faut annuler une attente (le joueur revient : ne pas fermer du tout), on utilise un **timer** : Set Timer by Event donne un **Timer Handle** qu’on peut arrêter avec Clear and Invalidate Timer. Voir « Le four qui oublie son annulation ».',
    },
  ],
  objectives: [
    'Quand le joueur quitte la zone, la porte se referme (Yaw 0) 3 secondes plus tard.',
    'S’il revient puis repart, les 3 secondes repartent de sa dernière sortie.',
  ],
  hints: [
    'Il faut un événement de sortie de zone, puis une attente, puis la rotation inverse.',
    'Nœuds : Event ActorEndOverlap, Retriggerable Delay (Duration 3), Set Relative Rotation (Yaw 0).',
    'Solution : ActorEndOverlap → Retriggerable Delay (3) → Set Relative Rotation (Porte, 0 / 0 / 0).',
  ],
  challenge: 'Remplace Retriggerable Delay par Delay, lance le test, et regarde quel objectif échoue et pourquoi.',
  setup() {
    const pb = new ProjectBuilder('Leçon 8');
    doorBlueprint(pb);
    pb.playerStart(-500, 0);
    const p = pb.project;
    openOnOverlap(p);
    return p;
  },
  scenario: [
    { wait: 0.2 },
    { teleport: [-150, 0] },
    { wait: 0.3 },
    { checkpoint: 'ouverte' },
    { teleport: [-600, 0] },
    { wait: 1 },
    { teleport: [-150, 0] },
    { wait: 1 },
    { teleport: [-600, 0] },
    { wait: 1.5 },
    { checkpoint: 'retour' },
    { wait: 2 },
  ],
  checks: [
    doorOpen('open', true, 'La porte s’ouvre quand le joueur arrive (déjà fait)', 'ouverte'),
    doorOpen(
      'again',
      true,
      '3 s après la 1re sortie, elle reste ouverte car le joueur est repassé',
      'retour',
      'La porte s’est déjà refermée, 3 s après la 1re sortie, alors que le joueur est repassé depuis : l’attente lancée à la 1re sortie n’a pas été remise à zéro par la 2e. Un Delay déjà en cours ignore les nouveaux appels.',
    ),
    doorOpen('closed', false, '3 s après la dernière sortie, elle est refermée'),
    noRuntimeErrors(),
  ],
  solve(p) {
    const b = edit(p, 'BP_Porte');
    const e = b.node('event.actorEndOverlap', {}, {}, [64, 400]);
    const wait = b.node('time.retriggerableDelay', {}, { duration: 3 }, [380, 400]);
    const rot = b.node('component.setRelativeRotation', {}, { rotation: { x: 0, y: 0, z: 0 } }, [700, 400]);
    b.link(e, 'then', wait, 'exec').link(wait, 'completed', rot, 'exec').target('Porte', rot);
  },
};
