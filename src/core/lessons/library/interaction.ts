/**
 * V3 step D, interaction: "Regarder et interagir" (Line Trace and an
 * interface message), "La caisse qu’on pousse" (Event Hit fires every frame)
 * and "Refactor R3 — Le bon bouton" (overlap and Cast replaced by a trace).
 */
import { implementInterface } from '../../operations/classOps';
import { addInterface, addInterfaceFunction, setPlayerClass } from '../../operations/projectOps';
import { T } from '../../types/pins';
import { edit, ProjectBuilder, type ClassBuilder } from '../builder';
import { countPrints, noRuntimeErrors, notUsing, PRESS_E, usesNode, notion } from '../checks';
import type { CheckContext, Lesson } from '../types';

const REACH = 300;

/** BPI_Interactif with its single function Interagir. */
function interactInterface(pb: ProjectBuilder): { iface: string; fn: string } {
  const r = addInterface(pb.project, 'BPI_Interactif');
  if (!r.ok) throw new Error(r.reason);
  addInterfaceFunction(pb.project, r.value.id, 'Interagir');
  return { iface: r.value.id, fn: r.value.functions[0].id };
}

/** A solid prop that answers Interagir by printing its name (and toggling its light, if it has one). */
function interactive(pb: ProjectBuilder, name: string, said: string, color: string, ids: { iface: string; fn: string }, light = false): ClassBuilder {
  const b = pb.blueprint(name);
  b.component('StaticMesh', 'Corps', { sizeX: 70, sizeY: 70, color });
  if (light) b.component('PointLight', 'Voyant', { visible: false, radius: 160, color: '#22c55e' });
  implementInterface(b.cls, ids.iface);
  const ev = b.node('event.interface', { interface: ids.iface, fn: ids.fn }, {}, [64, 96]);
  const say = b.node('debug.printString', {}, { text: said }, [400, 96]);
  b.link(ev, 'then', say, 'exec');
  if (light) {
    const toggle = b.node('component.toggleVisibility', {}, {}, [760, 96]);
    b.link(say, 'then', toggle, 'exec').target('Voyant', toggle);
  }
  return b;
}

/**
 * E → Line Trace from the actor, `REACH` cm ahead → Interagir (Message) to the
 * Hit Actor. `addStart: false` builds the classic mistake: End = direction only.
 */
export function traceAndInteract(b: ClassBuilder, ids: { iface: string; fn: string }, addStart = true, key?: string): void {
  const e = key ?? b.node('event.inputKey', { key: 'E' }, {}, [64, 96]);
  const loc = b.node('actor.getLocation', {}, {}, [64, 330]);
  const fwd = b.node('actor.getForward', {}, {}, [64, 470]);
  const mul = b.node('math.multiplyVectorFloat', {}, { b: REACH }, [330, 470]);
  const trace = b.node('trace.lineByChannel', {}, { debug: 2 }, [760, 96]);
  const msg = b.node('iface.message', { interface: ids.iface, fn: ids.fn }, {}, [1180, 96]);
  b.link(e, 'pressed', trace, 'exec').link(loc, 'result', trace, 'start').link(fwd, 'result', mul, 'a');
  if (addStart) {
    const add = b.node('math.addVector', {}, {}, [540, 400]);
    b.link(loc, 'result', add, 'a').link(mul, 'result', add, 'b').link(add, 'result', trace, 'end');
  } else b.link(mul, 'result', trace, 'end');
  b.link(trace, 'then', msg, 'exec').link(trace, 'hitActor', msg, 'target');
}

// ---------------------------------------------------- Regarder et interagir

const HOME: [number, number] = [-600, 400];

function lookProject() {
  const pb = new ProjectBuilder('Regarder et interagir');
  const player = pb.blueprint('BP_Joueur', 'Pawn');
  setPlayerClass(pb.project, player.cls.id);
  player.node('event.inputKey', { key: 'E' }, {}, [64, 96]);
  const ids = interactInterface(pb);
  const lever = interactive(pb, 'BP_Levier', 'Levier actionné', '#f59e0b', ids, true);
  const chest = interactive(pb, 'BP_Coffre', 'Coffre ouvert', '#92400e', ids);
  const rock = pb.blueprint('BP_Rocher');
  rock.component('StaticMesh', 'Rocher', { shape: 'cylinder', sizeX: 80, sizeY: 80, color: '#78716c' });
  pb.place(lever, HOME[0] + 220, HOME[1]);
  pb.place(chest, HOME[0], HOME[1] + 220);
  pb.place(rock, HOME[0] - 220, HOME[1]);
  // A second chest behind the lever: the ray stops at the first thing it meets.
  pb.place(chest, HOME[0] + 420, HOME[1]);
  pb.playerStart(HOME[0], HOME[1], 0);
  return pb.project;
}

const said = (cx: CheckContext) => ({ lever: countPrints(cx, 'Levier actionné'), chest: countPrints(cx, 'Coffre ouvert') });
const NO_HIT =
  'Le rayon part-il bien du joueur, vers l’avant ? Start = Get Actor Location ; End = Start + Get Actor Forward Vector × 300. Avec la direction seule sur End, le rayon vise un point près de l’origine du niveau. Mets Draw Debug Type sur For Duration et lance Play pour le voir.';

export const lessonLook: Lesson = {
  id: 'l-regarder',
  module: 'Interaction',
  level: 'avance',
  number: 0,
  title: 'Regarder et interagir',
  situation:
    'Le joueur est entouré d’un levier, d’un coffre et d’un rocher, sans aucune zone de collision. E doit agir sur l’objet qu’il regarde, à 3 mètres au plus, et sur lui seul.',
  notions: ['Line Trace By Channel', 'Out Hit', 'Get Actor Forward Vector', 'Interface Message'],
  remember:
    'Un Line Trace va de Start à End, deux positions dans le monde : End = Start + direction × distance. Il renvoie le premier objet qui bloque le rayon ; un message d’interface vers cet objet le fait réagir, sans savoir ce qu’il est.',
  cards: [
    {
      title: 'Viser au lieu de toucher',
      body:
        'Une zone de collision dit « le joueur est près ». Elle ne dit pas ce qu’il **regarde**. Un jeu à la première personne lance un **rayon** depuis le joueur, droit devant : le premier objet touché est celui qu’il vise.\n\n' +
        '**Line Trace By Channel** fait cela. **Return Value** dit si quelque chose a été touché ; **Out Hit Hit Actor** dit quoi.',
    },
    {
      title: 'Start et End',
      body:
        '**Start** : **Get Actor Location**.\n\n' +
        '**End** : la même position, plus **Get Actor Forward Vector** (longueur 1) **× 300**. Il faut donc un **× (Vector * Float)** puis un **+ (Vector)**.\n\n' +
        'End est une **position**, pas une direction : oublier le « + Start » est l’erreur la plus fréquente.',
    },
    {
      title: 'Voir le rayon, puis agir',
      body:
        'Règle **Draw Debug Type** sur *For Duration* : pendant Play, le rayon se dessine en rouge jusqu’au point touché, en vert au-delà.\n\n' +
        'Relie **Out Hit Hit Actor** au Target de **Interagir (Message)** : le levier et le coffre implémentent déjà BPI_Interactif. Le rocher ne l’implémente pas, et un rayon dans le vide donne None : dans les deux cas le message ne fait rien, sans erreur.',
    },
  ],
  objectives: [
    'Dans BP_Joueur, sur E : Line Trace By Channel.',
    'Start = Get Actor Location ; End = Start + Get Actor Forward Vector × 300.',
    'Envoie Interagir (Message) à Out Hit Hit Actor.',
    'Touche Vérifier : le joueur regarde le levier, le coffre, le rocher, puis le vide.',
  ],
  hints: [
    'Trois nœuds de calcul entre le joueur et End : Get Actor Forward Vector, × (Vector * Float) avec 300, + (Vector) avec Get Actor Location.',
    'Nœuds : Input E, Line Trace By Channel, Get Actor Location, Get Actor Forward Vector, Multiply (Vector * Float), Add (Vector), Interagir (Message).',
    'Solution : E → Line Trace By Channel (Start = Get Actor Location ; End = Get Actor Location + Get Actor Forward Vector × 300) → Interagir (Message), Target = Out Hit Hit Actor.',
  ],
  challenge: 'Passe la portée dans une variable Portee, puis affiche Out Hit Distance : à quelle distance est le levier ?',
  setup: lookProject,
  scenario: [
    { wait: 0.2 },
    { look: 0 },
    ...PRESS_E,
    { checkpoint: 'levier' },
    { look: 90 },
    ...PRESS_E,
    { checkpoint: 'coffre' },
    { look: 180 },
    ...PRESS_E,
    { look: 270 },
    ...PRESS_E,
    { checkpoint: 'vide' },
  ],
  checks: [
    {
      id: 'lever',
      label: 'Face au levier, E l’actionne, et lui seul',
      at: 'levier',
      test: (cx) => {
        const s = said(cx);
        if (s.lever === 1 && s.chest === 0) return true;
        if (s.lever === 0 && s.chest === 0) return `Rien n’a réagi. ${NO_HIT}`;
        if (s.chest > 0) return 'Un coffre s’est ouvert alors que le joueur regarde le levier : le message doit aller au seul Out Hit Hit Actor, le premier objet sur le rayon.';
        return `Le levier a été actionné ${s.lever} fois pour un seul appui.`;
      },
    },
    {
      id: 'chest',
      label: 'Tourné vers le coffre, E l’ouvre',
      at: 'coffre',
      test: (cx) => {
        const s = said(cx);
        if (s.chest === 1 && s.lever === 1) return true;
        if (s.lever > 1) return 'Le levier a encore été actionné alors que le joueur s’est tourné vers le coffre : le rayon doit suivre le regard (Get Actor Forward Vector), pas une direction fixe.';
        return `Le coffre ne s’est pas ouvert. ${NO_HIT}`;
      },
    },
    {
      id: 'nothing',
      label: 'Face au rocher, puis au vide : rien ne se passe, sans erreur',
      at: 'vide',
      test: (cx) => {
        const s = said(cx);
        return s.chest === 1 && s.lever === 1 ? true : 'Un objet a réagi alors que le joueur regardait le rocher ou le vide.';
      },
    },
    notion(usesNode('trace', 'BP_Joueur', ['trace.lineByChannel'], 'L’objet visé est trouvé par un Line Trace', 'Cela fonctionne ici sans Line Trace ; c’est pourtant lui qui dit ce que le joueur regarde.')),
    noRuntimeErrors(),
  ],
  solve(p) {
    const b = edit(p, 'BP_Joueur');
    const key = Object.values(b.graph.nodes).find((n) => n.def === 'event.inputKey')!.id;
    const iface = p.interfaces[0];
    traceAndInteract(b, { iface: iface.id, fn: iface.functions[0].id }, true, key);
  },
  robustness: [
    {
      id: 'moved',
      label: 'le joueur se déplace ailleurs dans le niveau avant de viser',
      advice: 'Start et End doivent être calculés à partir de la position du joueur au moment de l’appui (Get Actor Location), jamais de coordonnées fixes.',
      scenario: [{ wait: 0.1 }, { teleport: [HOME[0] + 420, HOME[1] + 200] }, { look: -90 }, ...PRESS_E, { checkpoint: 'la' }],
      checks: [
        {
          id: 'far-chest',
          label: 'le second coffre',
          at: 'la',
          test: (cx) => (said(cx).chest === 1 && said(cx).lever === 0 ? true : 'Depuis un autre endroit, le joueur regarde le second coffre et rien ne s’ouvre (ou autre chose réagit).'),
        },
      ],
    },
  ],
};

// ------------------------------------------------- La caisse qu’on pousse

function crateProject() {
  const pb = new ProjectBuilder('La caisse qu’on pousse');
  const b = pb.blueprint('BP_Caisse');
  b.component('StaticMesh', 'Caisse', { sizeX: 100, sizeY: 100, color: '#b45309' });
  b.variable('Vitesse', T.float, 150);
  pb.place(b, 150, 0);
  pb.playerStart(0, 0);
  const hit = b.node('event.hit', {}, {}, [64, 96]);
  const say = b.node('debug.printString', {}, { text: 'Poussée !' }, [420, 96]);
  b.link(hit, 'then', say, 'exec');
  return pb.project;
}

const crateX = (cx: CheckContext) => Math.round(cx.actor('BP_Caisse')?.x ?? 0);
const pushes = (cx: CheckContext) => countPrints(cx, 'Poussée');

/**
 * Event Hit → Sequence: move along Hit Normal, and print once per contact
 * (Do Once, reopened by a Retriggerable Delay when the hits stop).
 * `once: false` prints at every hit; `perSecond: false` moves a fixed 2.5 cm per hit.
 */
export function solveCrate(p: ReturnType<typeof crateProject>, opts: { once?: boolean; perSecond?: boolean; reopen?: boolean } = {}): void {
  const { once = true, perSecond = true, reopen = true } = opts;
  const b = edit(p, 'BP_Caisse');
  const speed = b.cls.variables[0].id;
  const nodes = Object.values(b.graph.nodes);
  const hit = nodes.find((n) => n.def === 'event.hit')!.id;
  const say = nodes.find((n) => n.def === 'debug.printString')!.id;
  for (const l of Object.values(b.graph.links)) delete b.graph.links[l.id];
  b.graph.nodes[say].x = 1040;
  const seq = b.node('flow.sequence', {}, {}, [360, 96]);
  const move = b.node('actor.addOffset', {}, {}, [1040, 420]);
  const mul = b.node('math.multiplyVectorFloat', {}, perSecond ? {} : { b: 2.5 }, [760, 560]);
  b.link(hit, 'then', seq, 'exec').link(seq, 'then1', move, 'exec').link(hit, 'normal', mul, 'a').link(mul, 'result', move, 'delta');
  if (perSecond) {
    const step = b.node('math.multiplyFloat', {}, {}, [480, 660]);
    b.link(b.node('var.get', { variable: speed }, {}, [260, 620]), 'value', step, 'a');
    b.link(b.node('time.getWorldDeltaSeconds', {}, {}, [200, 740]), 'result', step, 'b').link(step, 'result', mul, 'b');
  }
  if (!once) {
    b.link(seq, 'then0', say, 'exec');
    return;
  }
  const doOnce = b.node('flow.doOnce', {}, {}, [700, 96]);
  b.link(seq, 'then0', doOnce, 'exec').link(doOnce, 'completed', say, 'exec');
  if (!reopen) return;
  const wait = b.node('time.retriggerableDelay', {}, { duration: 0.2 }, [700, 300]);
  // A third output of the Sequence restarts the wait at every hit.
  b.graph.nodes[seq].config.outputs = 3;
  b.link(seq, 'then2', wait, 'exec').link(wait, 'completed', doOnce, 'reset');
}

export const lessonCrate: Lesson = {
  id: 'l-caisse',
  module: 'Interaction',
  level: 'avance',
  number: 0,
  title: 'La caisse qu’on pousse',
  situation:
    'La caisse bloque le joueur. Quand il la pousse, elle doit avancer à 150 cm/s dans le sens de la poussée, et afficher « Poussée ! » une seule fois par contact.',
  notions: ['Event Hit', 'Hit Normal', 'Do Once et Retriggerable Delay', 'Get World Delta Seconds'],
  remember:
    'Event Hit se redéclenche à chaque image tant que le contact dure, et il n’existe pas d’événement de fin de contact. Un Do Once rouvert par un Retriggerable Delay donne « une fois par contact ».',
  cards: [
    {
      title: 'Bloquer n’est pas chevaucher',
      body:
        'Une Box Collision se **traverse** : elle donne des overlaps. Un Static Mesh qui **bloque** arrête le joueur : il donne **Event Hit**, chez les deux acteurs.\n\n' +
        '**Other** est l’acteur d’en face. **Hit Normal** est un vecteur de longueur 1 : pour la caisse, la direction dans laquelle on la pousse.',
    },
    {
      title: 'À chaque image',
      body:
        'Tant que le joueur pousse, Event Hit arrive **à chaque image** : 60 fois par seconde. Le Print String du projet de départ le montre.\n\n' +
        'Pour le déplacement, c’est parfait : **Add Actor World Offset** avec Hit Normal × Vitesse × **Get World Delta Seconds** (le Delta Seconds des événements qui ne sont pas Tick).',
    },
    {
      title: 'Une fois par contact',
      body:
        'Il n’y a **pas d’événement « fin de Hit »**. L’astuce : un **Do Once** laisse passer le premier Hit. À chaque Hit, un **Retriggerable Delay** (0,2 s) repart de zéro ; quand les Hits cessent, il arrive enfin au bout et entre dans le **Reset** du Do Once.\n\n' +
        'Un **Sequence** en tête permet de faire les trois choses à chaque Hit.',
    },
  ],
  objectives: [
    'Event Hit → Sequence.',
    'Then 0 : Do Once → Print String « Poussée ! ».',
    'Then 1 : Add Actor World Offset, Delta Location = Hit Normal × Vitesse × Get World Delta Seconds.',
    'Then 2 : Retriggerable Delay (0,2) → Reset du Do Once.',
    'Touche Vérifier : deux poussées, la seconde à 30 images par seconde.',
  ],
  hints: [
    'Sélectionne le Sequence : dans Details, passe « Nombre de sorties » à 3.',
    'Nœuds : Sequence, Do Once, Retriggerable Delay, Add Actor World Offset, Multiply (Vector * Float), × (Float), Get Vitesse, Get World Delta Seconds.',
    'Solution : Hit → Sequence. Then 0 → Do Once → Print. Then 1 → Add Actor World Offset (Hit Normal × (Vitesse × Get World Delta Seconds)). Then 2 → Retriggerable Delay 0,2 → Do Once.Reset.',
  ],
  challenge: 'Ne laisse pousser que le joueur : Cast To Pawn sur Other, ou compare Other à Get Player Pawn.',
  setup: crateProject,
  scenario: [
    { wait: 0.2 },
    { walk: [1, 0], seconds: 1 },
    { checkpoint: 'un' },
    { wait: 0.6 },
    { fps: 30 },
    { walk: [1, 0], seconds: 1 },
    { checkpoint: 'deux' },
  ],
  checks: [
    {
      id: 'moves',
      label: 'Poussée 1 seconde, la caisse avance d’environ 130 cm',
      at: 'un',
      test: (cx) => {
        const d = crateX(cx) - 150;
        if (d >= 105 && d <= 150) return true;
        if (d === 0) return 'La caisse n’a pas bougé : Add Actor World Offset, sur le fil d’Event Hit, avec Hit Normal pour direction.';
        if (d < 0) return 'La caisse est partie vers le joueur : Hit Normal donne déjà le sens de la poussée, ne l’inverse pas.';
        return `La caisse a avancé de ${d} cm en poussant 1 s, au lieu d’environ 130 : la vitesse voulue est Vitesse (150 cm/s) × Get World Delta Seconds.`;
      },
    },
    {
      id: 'once',
      label: '« Poussée ! » ne s’affiche qu’une fois pour ce contact',
      at: 'un',
      test: (cx) => {
        const n = pushes(cx);
        if (n === 1) return true;
        if (n === 0) return 'Rien ne s’est affiché : le Print String doit rester sur le fil d’Event Hit.';
        return `« Poussée ! » s’est affiché ${n} fois : Event Hit se redéclenche à chaque image tant que le joueur pousse. Fais passer le Print par un Do Once.`;
      },
    },
    {
      id: 'again',
      label: 'À la seconde poussée, il s’affiche une seconde fois',
      at: 'deux',
      test: (cx) => {
        const n = pushes(cx);
        if (n === 2) return true;
        if (n === 1) return 'Le message n’est pas revenu à la seconde poussée : le Do Once est resté fermé. Rouvre-le quand le contact cesse : Retriggerable Delay (0,2 s) à chaque Hit, puis Reset.';
        return `« Poussée ! » s’est affiché ${n} fois en deux poussées.`;
      },
    },
    {
      id: 'slow',
      label: 'À 30 images par seconde, la caisse va à la même vitesse',
      at: 'deux',
      test: (cx) => {
        const d = crateX(cx) - 150;
        if (d >= 240 && d <= 300) return true;
        return `En deux poussées d’une seconde, la caisse a parcouru ${d} cm au lieu d’environ 270 : la seconde tournait à 30 images par seconde. Une distance fixe par Hit dépend du nombre d’images ; multiplie Vitesse par Get World Delta Seconds.`;
      },
    },
    notion(usesNode('hit', 'BP_Caisse', ['event.hit'], 'La poussée est détectée par Event Hit', 'La caisse avance, mais sans Event Hit : c’est lui qui signale un contact bloquant.')),
    noRuntimeErrors(),
  ],
  solve: (p) => solveCrate(p),
  robustness: [
    {
      id: 'two',
      label: 'il y a une seconde caisse, que le joueur pousse ensuite',
      advice: 'Chaque caisse a son propre Do Once et sa propre position : n’utilise ni Get Actor Of Class ni référence fixe, seulement Self.',
      mutate(p) {
        const cls = p.classes.find((c) => c.name === 'BP_Caisse')!;
        p.level.actors.push({ id: 'robust-crate', classId: cls.id, name: 'BP_Caisse2', x: 0, y: 300, yaw: 0, overrides: {} });
      },
      scenario: [{ wait: 0.1 }, { walk: [1, 0], seconds: 0.6 }, { wait: 0.4 }, { teleport: [0, 150] }, { walk: [0, 1], seconds: 0.6 }, { checkpoint: 'fin' }],
      checks: [
        {
          id: 'second',
          label: 'la seconde avance',
          at: 'fin',
          test: (cx) => {
            const y = Math.round(cx.actor('BP_Caisse2')?.y ?? 0);
            if (y < 330) return 'La seconde caisse n’avance pas quand on la pousse.';
            return pushes(cx) === 2 ? true : `Deux caisses poussées l’une après l’autre : « Poussée ! » s’est affiché ${pushes(cx)} fois au lieu de 2.`;
          },
        },
      ],
    },
  ],
};

// ------------------------------------------------ Refactor R3 : le bon bouton

function buttonsProject() {
  const pb = new ProjectBuilder('Le bon bouton');
  const player = pb.blueprint('BP_Joueur', 'Pawn');
  setPlayerClass(pb.project, player.cls.id);
  interactInterface(pb);
  const btn = pb.blueprint('BP_Bouton');
  btn.component('StaticMesh', 'Boitier', { sizeX: 60, sizeY: 60, color: '#475569' });
  btn.component('PointLight', 'Voyant', { visible: false, radius: 150, color: '#ef4444' });
  btn.component('BoxCollision', 'Zone', { sizeX: 420, sizeY: 420 });
  const ev = btn.node('event.custom', { name: 'Basculer' }, {}, [64, 96]);
  const toggle = btn.node('component.toggleVisibility', {}, {}, [400, 96]);
  btn.link(ev, 'then', toggle, 'exec').target('Voyant', toggle);
  // The starting graph: E toggles every button whose zone the player stands in.
  const key = player.node('event.inputKey', { key: 'E' }, {}, [64, 96]);
  const over = player.node('actor.getOverlappingActors', {}, {}, [340, 96]);
  const loop = player.node('flow.forEachLoop', {}, {}, [660, 96]);
  const cast = player.node('cast.to', { class: btn.cls.id }, {}, [980, 96]);
  const call = player.node('call.custom', { owner: btn.cls.id, event: 'Basculer' }, {}, [1320, 96]);
  player.link(key, 'pressed', over, 'exec').link(over, 'then', loop, 'exec').link(over, 'actors', loop, 'array');
  player.link(loop, 'body', cast, 'exec').link(loop, 'element', cast, 'object').link(cast, 'then', call, 'exec').link(cast, 'as', call, 'target');
  pb.place(btn, 250, -120);
  pb.place(btn, 250, 120);
  pb.playerStart(0, 0);
  return pb.project;
}

const lit = (cx: CheckContext, label: string) => !!cx.component(label, 'Voyant')?.props.visible;

export const refactor3: Lesson = {
  id: 'r3-bouton',
  kind: 'refactor',
  code: 'R3',
  module: 'Interaction',
  level: 'avance',
  number: 0,
  title: 'Le bon bouton',
  situation:
    'Deux boutons côte à côte. Aujourd’hui, E bascule tous ceux dont la zone contient le joueur : les deux à la fois. Réécris l’interaction pour que E n’agisse que sur le bouton regardé, sans zone ni Cast.',
  notions: ['Line Trace By Channel', 'Interface Message', 'Overlap ou visée', 'Découplage'],
  remember:
    'Une zone répond à « qui est près ? », un Line Trace à « que regarde-t-on ? ». Avec un message d’interface au bout du rayon, le joueur n’a plus besoin de connaître ni de Cast vers les objets avec lesquels il interagit.',
  cards: [
    {
      title: 'Ce qui cloche',
      body:
        'Le graphe de **BP_Joueur** parcourt les acteurs qui le chevauchent, fait un **Cast To BP_Bouton** et appelle **Basculer**. Entre les deux boutons, le joueur est dans les deux zones : les deux basculent.\n\n' +
        'Et chaque nouveau type d’objet demanderait un Cast de plus.',
    },
    {
      title: 'La réécriture',
      body:
        'Côté **BP_Joueur** : E → **Line Trace By Channel** (300 cm devant) → **Interagir (Message)** vers **Out Hit Hit Actor**. Plus de Get Overlapping Actors, plus de Cast.\n\n' +
        'Côté **BP_Bouton** : ajoute l’interface **BPI_Interactif** (Class Settings), puis **Event Interagir** → **Basculer**. La Zone ne sert plus : tu peux la supprimer.',
    },
  ],
  objectives: [
    'BP_Bouton implémente BPI_Interactif : Event Interagir appelle Basculer.',
    'BP_Joueur : E → Line Trace 300 cm devant → Interagir (Message) vers l’acteur touché.',
    'Plus de Cast ni de Get Overlapping Actors dans BP_Joueur.',
    'Touche Vérifier : le joueur vise le bouton du haut, puis celui du bas.',
  ],
  hints: [
    'End = Get Actor Location + Get Actor Forward Vector × 300.',
    'BP_Bouton : Class Settings › Interfaces › BPI_Interactif, puis My Blueprint › Interfaces › Interagir › Event. BP_Joueur : Line Trace By Channel, Add (Vector), Multiply (Vector * Float), Interagir (Message).',
    'Solution : BP_Bouton : Event Interagir → Basculer. BP_Joueur : E → Line Trace By Channel (Start = Get Actor Location, End = Start + Forward × 300) → Interagir (Message), Target = Out Hit Hit Actor.',
  ],
  setup: buttonsProject,
  scenario: [
    { wait: 0.2 },
    { teleport: [60, -120] },
    { look: 0 },
    ...PRESS_E,
    { checkpoint: 'haut' },
    { teleport: [60, 120] },
    { look: 0 },
    ...PRESS_E,
    { checkpoint: 'bas' },
    { look: 180 },
    ...PRESS_E,
    { checkpoint: 'dos' },
  ],
  checks: [
    {
      id: 'top',
      label: 'Face au bouton du haut, E n’allume que lui',
      at: 'haut',
      test: (cx) => {
        const [a, b] = [lit(cx, 'BP_Bouton'), lit(cx, 'BP_Bouton2')];
        if (a && !b) return true;
        if (a && b) return 'Les deux boutons se sont allumés : le joueur est dans les deux zones. Seul le bouton sur le rayon doit réagir.';
        return 'Le bouton regardé ne s’est pas allumé : implémente-t-il BPI_Interactif, avec Event Interagir → Basculer ? Le rayon part-il du joueur (End = Start + Forward × 300) ?';
      },
    },
    {
      id: 'bottom',
      label: 'Face au bouton du bas, E allume le second sans toucher au premier',
      at: 'bas',
      test: (cx) => (lit(cx, 'BP_Bouton') && lit(cx, 'BP_Bouton2') ? true : 'Après le second appui, les deux boutons devraient être allumés : chacun par son propre appui.'),
    },
    {
      id: 'back',
      label: 'Dos aux boutons, E ne fait rien',
      at: 'dos',
      test: (cx) => (lit(cx, 'BP_Bouton') && lit(cx, 'BP_Bouton2') ? true : 'Un bouton a basculé alors que le joueur lui tournait le dos : être près ne suffit plus, il faut le regarder.'),
    },
    notUsing('no-cast', 'BP_Joueur', ['cast.to'], 'BP_Joueur ne fait plus de Cast', 'Il reste un Cast To dans BP_Joueur : le message d’interface le remplace.'),
    notUsing('no-overlap', 'BP_Joueur', ['actor.getOverlappingActors', 'event.actorBeginOverlap', 'event.actorEndOverlap'], 'BP_Joueur ne s’appuie plus sur les zones', 'BP_Joueur utilise encore les overlaps : c’est le Line Trace qui désigne le bouton.'),
    noRuntimeErrors(),
  ],
  solve(p) {
    const iface = p.interfaces[0];
    const ids = { iface: iface.id, fn: iface.functions[0].id };
    const btn = edit(p, 'BP_Bouton');
    implementInterface(btn.cls, ids.iface);
    const ev = btn.node('event.interface', { interface: ids.iface, fn: ids.fn }, {}, [64, 400]);
    const call = btn.node('call.custom', { event: 'Basculer' }, {}, [400, 400]);
    btn.link(ev, 'then', call, 'exec');
    const player = edit(p, 'BP_Joueur');
    const key = Object.values(player.graph.nodes).find((n) => n.def === 'event.inputKey')!.id;
    for (const n of Object.values(player.graph.nodes)) if (n.id !== key) delete player.graph.nodes[n.id];
    player.graph.links = {};
    traceAndInteract(player, ids, true, key);
  },
};
