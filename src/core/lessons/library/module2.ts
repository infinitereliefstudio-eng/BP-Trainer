/** Module 2 — Portes et objets. */
import { edit, ProjectBuilder } from '../builder';
import { noRuntimeErrors, usesNode } from '../checks';
import type { Check, CheckContext, Lesson } from '../types';
import { doorBlueprint, keyBlueprint, playerBlueprint, solveKey } from './props';

const MODULE = 'Portes et objets';

/** Door angle in [-180, 180). */
function doorYaw(cx: CheckContext): number {
  const yaw = cx.component('BP_Porte', 'Porte')?.props.yaw ?? 0;
  return ((((yaw + 180) % 360) + 360) % 360) - 180;
}

function doorOpen(id: string, open: boolean, label: string, at?: string): Check {
  return {
    id,
    label,
    at,
    test: (cx) => {
      const yaw = doorYaw(cx);
      const isOpen = Math.abs(Math.abs(yaw) - 90) < 1;
      if (open) return isOpen ? true : yaw === 0 ? 'La porte n’a pas bougé.' : `La porte a tourné de ${yaw}° au lieu de 90°.`;
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
  number: 5,
  title: 'Ouvrir une porte',
  situation: 'La porte pivote de 90° quand le joueur s’approche, une seule fois, et le laisse passer.',
  notions: ['Set Relative Rotation', 'Rotator', 'DoOnce'],
  cards: [
    {
      title: 'Tourner un composant',
      body:
        'La **Porte** est un Static Mesh qui pivote sur ses gonds. **Set Relative Rotation** la tourne par rapport à l’acteur.\n\n' +
        'Une rotation est un **Rotator** : Roll (X), Pitch (Y) et Yaw (Z), en degrés. Vue de dessus, seul **Yaw** compte : règle-le à 90 dans Details, ou utilise **Make Rotator**.',
    },
    {
      title: 'Une seule fois',
      body:
        '**DoOnce** laisse passer l’exécution la première fois, puis plus jamais, jusqu’à ce qu’on passe par son entrée **Reset**.\n\n' +
        'Place-le entre l’événement et Set Relative Rotation : la porte ne s’ouvrira qu’au premier passage.',
    },
  ],
  objectives: [
    'Quand le joueur entre dans la Zone, la Porte tourne de 90° (Yaw).',
    'Passe par un DoOnce pour qu’elle ne s’ouvre qu’une fois.',
    'Vérifie que le joueur peut traverser.',
  ],
  hints: [
    'La porte réagit au même genre d’événement que l’interrupteur de la leçon 3.',
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
    usesNode('once', 'BP_Porte', ['flow.doOnce'], 'Le graphe utilise un DoOnce', 'Fais passer l’ouverture par un DoOnce.'),
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
  module: MODULE,
  number: 6,
  title: 'Ramasser un objet',
  situation: 'La clé disparaît quand le joueur la touche, et le joueur la possède. La caisse posée à côté, elle, ne doit pas la ramasser.',
  notions: ['Cast To', 'Variable d’un autre Blueprint', 'Destroy Actor'],
  cards: [
    {
      title: 'Qui me touche ?',
      body:
        'Event ActorBeginOverlap donne **Other Actor** : l’acteur qui est entré dans la zone. Son type est simplement **Actor** : ce peut être le joueur… ou n’importe quoi d’autre, comme la caisse posée contre la clé.\n\n' +
        'Ici, la caisse touche la clé dès le début : si la clé disparaît au lancement, c’est qu’elle ne vérifie pas qui la touche.',
    },
    {
      title: 'Cast To',
      body:
        '**Cast To BP_Joueur** vérifie que l’objet est bien un BP_Joueur. Si oui, l’exécution sort par le haut et **As BP_Joueur** donne une référence vers lui, avec accès à ses variables. Sinon, elle sort par **Cast Failed**.\n\n' +
        'Tire un fil depuis **As BP_Joueur** et cherche `bHasKey` : tu peux lire ou changer la variable du joueur.',
    },
    {
      title: 'Disparaître',
      body: '**Destroy Actor** retire un acteur du niveau. Sa Target vaut **self** par défaut : la clé se détruit elle-même.',
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
    usesNode('cast', 'BP_Cle', ['cast.to'], 'Le graphe utilise Cast To BP_Joueur', 'Utilise Cast To BP_Joueur pour vérifier qui touche la clé.'),
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
  module: MODULE,
  number: 7,
  title: 'La porte verrouillée',
  situation: 'La porte ne s’ouvre que si le joueur a la clé. Sinon, un message le prévient.',
  notions: ['Lire la variable d’un autre Blueprint', 'Branch'],
  cards: [
    {
      title: 'Demander au joueur',
      body:
        'La porte doit savoir si le joueur a la clé. Cette information est dans **BP_Joueur** (`bHasKey`) : comme pour la clé, un **Cast To BP_Joueur** sur Other Actor donne accès à ses variables.\n\n' +
        'Depuis **As BP_Joueur**, tire un fil et cherche **Get bHasKey**.',
    },
    {
      title: 'Deux chemins',
      body:
        '**Branch** envoie l’exécution vers **True** ou **False** selon la condition. True : la porte tourne. False : un **Print String** dit qu’il faut une clé.\n\n' +
        'La clé de la leçon 6 est déjà en place et fonctionne.',
    },
  ],
  objectives: [
    'Dans BP_Porte : quand le joueur arrive, ouvre la porte (Yaw 90) seulement s’il a la clé.',
    'Sans clé, affiche un message qui parle de la clé.',
    'Le test passe d’abord sans clé, puis avec.',
  ],
  hints: [
    'C’est un mélange de la leçon 5 (ouvrir la porte) et de la leçon 6 (Cast vers le joueur).',
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
    usesNode('branch', 'BP_Porte', ['flow.branch'], 'Le graphe utilise un Branch', 'Choisis entre ouvrir et prévenir avec un Branch.'),
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
  number: 8,
  title: 'La porte qui se referme',
  situation: 'La porte se referme 3 secondes après le départ du joueur. S’il repasse entre-temps, le compte repart de zéro.',
  notions: ['Event ActorEndOverlap', 'Delay', 'Retriggerable Delay'],
  cards: [
    {
      title: 'Attendre',
      body:
        '**Delay** met la suite en attente pendant une durée, sans bloquer le jeu. Les nœuds avec une petite horloge sont **latents** : ils reprennent plus tard.\n\n' +
        'Piège : un Delay déjà en cours **ignore** les nouveaux appels. Si le joueur ressort une 2e fois, le Delay lancé à la 1re sortie continue et ferme la porte trop tôt.',
    },
    {
      title: 'Recommencer le compte',
      body:
        '**Retriggerable Delay** fait l’inverse : chaque nouvel appel **remet le compte à zéro**. La porte se ferme 3 s après la **dernière** sortie.\n\n' +
        'L’ouverture est déjà faite. Ajoute la fermeture sur **Event ActorEndOverlap** (le joueur quitte la zone).',
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
    doorOpen('again', true, '3 s après la 1re sortie, elle reste ouverte car le joueur est repassé', 'retour'),
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
