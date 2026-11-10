/**
 * V3 step C, movement: "La porte qui glisse" (Timeline: Play and Reverse),
 * "Complète C3 — Le projecteur" (a Timeline graph with gaps) and "La rangée
 * de lampes" (Construction Script).
 */
import { readTimeline, timelineConfig, trackPin } from '../../nodes/library/timeline';
import { T } from '../../types/pins';
import { edit, ProjectBuilder, type ClassBuilder } from '../builder';
import { noRuntimeErrors, PRESS_E, usesNode, notion } from '../checks';
import type { CheckContext, Lesson } from '../types';

// ------------------------------------------------------ La porte qui glisse

const SLIDE = 200;

function slidingDoorProject() {
  const pb = new ProjectBuilder('La porte qui glisse');
  const door = pb.blueprint('BP_PorteCoulissante');
  door.component('StaticMesh', 'Panneau', { sizeX: 200, sizeY: 20, color: '#0ea5e9' });
  door.component('BoxCollision', 'Zone', { sizeX: 320, sizeY: 520 });
  const wall = pb.blueprint('BP_Mur');
  wall.component('StaticMesh', 'Mur', { sizeX: 500, sizeY: 40, color: '#4b5563' });
  pb.place(door, 0, 0);
  pb.place(wall, -350, 0);
  pb.place(wall, 350, 0);
  pb.playerStart(0, 600, -90);
  // The starting point: the door jumps open, and never closes.
  const enter = door.node('event.actorBeginOverlap', {}, {}, [64, 96]);
  const move = door.node('component.setRelativeLocation', {}, { location: { x: SLIDE, y: 0, z: 0 } }, [760, 96]);
  door.link(enter, 'then', move, 'exec').target('Panneau', move);
  door.node('event.actorEndOverlap', {}, {}, [64, 420]);
  return pb.project;
}

const panelX = (cx: CheckContext) => Math.round(cx.component('BP_PorteCoulissante', 'Panneau')?.props.x ?? 0);
const IN: [number, number] = [0, 150];
const OUT: [number, number] = [0, 600];

/** `enter`/`leave`: the Timeline input each overlap event is wired to. */
export function solveSlidingDoor(p: ReturnType<typeof slidingDoorProject>, enter = 'play', leave = 'reverse'): void {
  const b = edit(p, 'BP_PorteCoulissante');
  const nodes = Object.values(b.graph.nodes);
  const begin = nodes.find((n) => n.def === 'event.actorBeginOverlap')!.id;
  const end = nodes.find((n) => n.def === 'event.actorEndOverlap')!.id;
  const move = nodes.find((n) => n.def === 'component.setRelativeLocation')!.id;
  for (const l of Object.values(b.graph.links)) if (l.from.node === begin) delete b.graph.links[l.id];
  const tl = b.node('timeline.node', {}, {}, [360, 96]);
  const alpha = readTimeline(b.graph.nodes[tl]).tracks[0].id;
  const lerp = b.node('math.lerp', {}, { a: 0, b: SLIDE }, [560, 420]);
  const vec = b.node('math.makeVector', {}, {}, [760, 420]);
  b.link(begin, 'then', tl, enter).link(end, 'then', tl, leave).link(tl, 'update', move, 'exec');
  b.link(tl, trackPin(alpha), lerp, 'alpha').link(lerp, 'result', vec, 'x').link(vec, 'result', move, 'location');
}

export const lessonSlidingDoor: Lesson = {
  id: 'l-porte-glisse',
  module: 'Mouvement',
  level: 'intermediaire',
  number: 0,
  title: 'La porte qui glisse',
  situation:
    'La porte coulissante s’ouvre d’un coup, et ne se referme jamais. Elle doit glisser en 1 seconde quand le joueur approche, et se refermer en douceur quand il s’éloigne.',
  notions: ['Timeline', 'Play et Reverse', 'Lerp', 'Update et Finished'],
  remember:
    'Un Timeline fait aller une valeur de 0 à 1 dans le temps ; Lerp la transforme en position. Play reprend là où il en est, Reverse revient en arrière : à eux deux, ils ouvrent et ferment sans à-coup.',
  cards: [
    {
      title: 'Une valeur qui avance dans le temps',
      body:
        'Un **Timeline** (palette : *Add Timeline*) contient une **piste** : ici **Alpha**, qui va de 0 à 1 en 1 seconde. Tant qu’il joue, sa sortie **Update** s’exécute à chaque image, avec la valeur de la piste à cet instant.\n\n' +
        'Sélectionne le nœud puis *Éditer la piste* (Details) pour voir sa courbe, changer la durée ou ajouter des points clés.',
    },
    {
      title: 'De 0–1 à une position',
      body:
        '**Lerp** donne le point entre A et B à la proportion Alpha : avec A = 0 et B = 200, Alpha = 0,5 donne 100.\n\n' +
        'Branche la piste sur **Alpha**, puis le résultat sur le X d’un **Make Vector**, relié à **Set Relative Location** du Panneau. Le fil blanc de Set Relative Location part de **Update**.',
    },
    {
      title: 'Play, Reverse, Play from Start',
      body:
        '**Play** avance depuis la position actuelle. **Reverse** recule depuis la position actuelle. Si le joueur fait demi-tour au milieu, la porte repart donc de là où elle est.\n\n' +
        '**Play from Start** remet d’abord à 0 : la porte sauterait à sa position fermée. Et **Play** quand le Timeline est déjà à la fin ne rejoue rien : pour revenir, c’est Reverse.',
    },
  ],
  objectives: [
    'Dans BP_PorteCoulissante, ajoute un Timeline (palette › Add Timeline).',
    'ActorBeginOverlap → Play ; ActorEndOverlap → Reverse.',
    'Update → Set Relative Location (Panneau), avec X = Lerp (0, 200, Alpha).',
    'Touche Vérifier : le joueur entre, ressort, puis revient avant la fermeture complète.',
  ],
  hints: [
    'Le Set Relative Location existe déjà : débranche-le de ActorBeginOverlap et fais-le partir de Update.',
    'Nœuds : Timeline, Lerp (A 0, B 200), Make Vector. BeginOverlap → Play, EndOverlap → Reverse, Update → Set Relative Location.',
    'Solution : BeginOverlap → Timeline.Play ; EndOverlap → Timeline.Reverse ; Timeline.Update → Set Relative Location (Panneau, Make Vector (Lerp (0, 200, Alpha), 0, 0)).',
  ],
  challenge: 'Ouvre l’éditeur de piste : passe la durée à 2 s et ajoute un point clé (0,5 s ; 0,8) pour que la porte parte vite et finisse lentement.',
  setup: slidingDoorProject,
  scenario: [
    { wait: 0.2 },
    { checkpoint: 'depart' },
    { teleport: IN },
    { wait: 0.5 },
    { checkpoint: 'mi-ouverte' },
    { wait: 0.8 },
    { checkpoint: 'ouverte' },
    { teleport: OUT },
    { wait: 0.5 },
    { checkpoint: 'mi-fermee' },
    { teleport: IN },
    { wait: 0.2 },
    { checkpoint: 'retour' },
    { teleport: OUT },
    { wait: 1.5 },
    { checkpoint: 'fermee' },
  ],
  checks: [
    {
      id: 'closed-first',
      label: 'Au départ, la porte est fermée',
      at: 'depart',
      test: (cx) => (Math.abs(panelX(cx)) < 2 ? true : `Le panneau est déjà à X = ${panelX(cx)} avant que le joueur approche.`),
    },
    {
      id: 'slides',
      label: 'Une demi-seconde après l’entrée du joueur, elle est à mi-course',
      at: 'mi-ouverte',
      test: (cx) => {
        const x = panelX(cx);
        if (x >= 70 && x <= 130) return true;
        if (x >= SLIDE - 2) return 'La porte est déjà grande ouverte : elle a sauté au lieu de glisser. Le Set Relative Location doit partir de Update, avec la valeur de la piste.';
        if (x === 0) return 'La porte n’a pas bougé : ActorBeginOverlap doit entrer dans le Timeline par Play, et Update doit déplacer le Panneau.';
        return `Le panneau est à X = ${x} au bout de 0,5 s, au lieu d’environ 100. Lerp va-t-il bien de 0 à 200 avec la piste sur Alpha ?`;
      },
    },
    {
      id: 'open',
      label: 'Après 1 seconde, elle est ouverte (X = 200)',
      at: 'ouverte',
      test: (cx) => (Math.abs(panelX(cx) - SLIDE) <= 2 ? true : `Le panneau s’est arrêté à X = ${panelX(cx)} au lieu de 200.`),
    },
    {
      id: 'closing',
      label: 'Une demi-seconde après la sortie du joueur, elle se referme en douceur',
      at: 'mi-fermee',
      test: (cx) => {
        const x = panelX(cx);
        if (x >= 70 && x <= 130) return true;
        if (x >= SLIDE - 2) return 'La porte est restée ouverte. Si ActorEndOverlap entre par Play, rien ne se passe : le Timeline est déjà à la fin. Pour revenir en arrière, entre par Reverse.';
        if (x <= 2) return 'La porte s’est refermée d’un coup : fais-la revenir avec Reverse, pas avec un Set Relative Location direct.';
        return `Le panneau est à X = ${x} une demi-seconde après la sortie, au lieu d’environ 100.`;
      },
    },
    {
      id: 'resume',
      label: 'Si le joueur revient à mi-fermeture, elle repart de là où elle est',
      at: 'retour',
      test: (cx) => {
        const x = panelX(cx);
        if (x >= 120 && x <= 160) return true;
        if (x < 80) return `Le panneau a sauté à sa position fermée avant de se rouvrir (X = ${x}) : Play from Start repart de 0. Play, lui, reprend là où le Timeline en est.`;
        return `Le panneau est à X = ${x} juste après le retour du joueur, au lieu d’environ 140.`;
      },
    },
    {
      id: 'closed',
      label: 'Le joueur parti, elle finit fermée',
      at: 'fermee',
      test: (cx) => (Math.abs(panelX(cx)) <= 2 ? true : `Le panneau est resté à X = ${panelX(cx)}.`),
    },
    notion(usesNode('timeline', 'BP_PorteCoulissante', ['timeline.node'], 'Le mouvement passe par un Timeline', 'Le mouvement fonctionne, mais sans Timeline : c’est l’outil prévu pour une valeur qui évolue dans le temps.')),
    noRuntimeErrors(),
  ],
  solve: (p) => solveSlidingDoor(p),
  robustness: [
    {
      id: 'in-out',
      label: 'le joueur entre et ressort trois fois très vite',
      advice: 'Play et Reverse reprennent toujours depuis la position actuelle : évite Play from Start, Reverse from End et les Set directs.',
      scenario: [
        { wait: 0.1 },
        { teleport: IN },
        { wait: 0.15 },
        { teleport: OUT },
        { wait: 0.1 },
        { teleport: IN },
        { wait: 0.15 },
        { teleport: OUT },
        { wait: 0.1 },
        { teleport: IN },
        { wait: 0.2 },
        { checkpoint: 'vite' },
        { wait: 1.2 },
        { checkpoint: 'fin' },
      ],
      checks: [
        {
          id: 'smooth',
          label: 'pas de saut',
          at: 'vite',
          test: (cx) => (panelX(cx) > 30 && panelX(cx) < 110 ? true : `Après trois allers-retours rapides, le panneau est à X = ${panelX(cx)} : il a sauté.`),
        },
        { id: 'ends-open', label: 'ouverte', at: 'fin', test: (cx) => (Math.abs(panelX(cx) - SLIDE) <= 2 ? true : `La porte finit à X = ${panelX(cx)} alors que le joueur est devant.`) },
      ],
    },
  ],
};

// ------------------------------------------------- Complète C3 : le projecteur

const MAX_INTENSITY = 5000;

function spotProject(): { pb: ProjectBuilder; b: ClassBuilder } {
  const pb = new ProjectBuilder('Le projecteur');
  const b = pb.blueprint('BP_Projecteur');
  b.component('StaticMesh', 'Pied', { shape: 'cylinder', sizeX: 50, sizeY: 50, color: '#6b7280' });
  b.component('PointLight', 'Lumiere', { intensity: 0, radius: 400 });
  b.cls.autoReceiveInput = true;
  pb.place(b, 0, 0);
  pb.playerStart(-250, 150);
  const key = b.node('event.inputKey', { key: 'E' }, {}, [64, 140]);
  const tl = b.node('timeline.node', {}, {}, [760, 96]);
  const data = readTimeline(b.graph.nodes[tl]);
  data.name = 'Fondu';
  data.length = 2;
  data.tracks[0].keys = [{ t: 0, v: 0 }, { t: 2, v: 1 }];
  Object.assign(b.graph.nodes[tl].config, timelineConfig(data));
  b.node('var.component', { component: b.componentId('Lumiere') }, {}, [1180, 420]);
  b.node('util.comment', { text: 'Trou 1 : un appui allume, le suivant éteint', w: 300, h: 220, color: '#f2c014' }, {}, [370, 60]);
  b.node('util.comment', { text: 'Trou 2 : de 0–1 à 0–5000', w: 280, h: 200, color: '#f2c014' }, {}, [1100, 560]);
  b.node('util.comment', { text: 'Trou 3 : règle la Lumiere', w: 320, h: 220, color: '#f2c014' }, {}, [1440, 60]);
  void key;
  return { pb, b };
}

const intensity = (cx: CheckContext) => Math.round(cx.component('BP_Projecteur', 'Lumiere')?.props.intensity ?? 0);

export const complete3: Lesson = {
  id: 'c3-projecteur',
  kind: 'complete',
  code: 'C3',
  module: 'Mouvement',
  level: 'intermediaire',
  number: 0,
  title: 'Le projecteur',
  situation: 'E allume le projecteur en fondu (2 secondes), E de nouveau l’éteint en fondu. Le Timeline est déjà là ; trois nœuds manquent, dans les cadres jaunes.',
  notions: ['Timeline', 'FlipFlop', 'Lerp', 'Set Intensity'],
  remember: 'Un Timeline ne change rien tout seul : il donne une valeur à chaque image par Update. C’est le nœud branché sur Update qui agit, avec cette valeur.',
  cards: [
    {
      title: 'Ce qui est déjà là',
      body:
        'Le Timeline **Fondu** dure 2 s ; sa piste **Alpha** va de 0 à 1. La touche **E** et le Get **Lumiere** sont posés.\n\n' +
        'Les nœuds à placer : **FlipFlop**, **Lerp**, **Set Intensity**.',
    },
    {
      title: 'Trois branchements',
      body:
        '**FlipFlop** sort par A, puis B, puis A… : A va sur **Play**, B sur **Reverse**.\n\n' +
        '**Lerp** (A = 0, B = 5000) reçoit la piste sur Alpha. **Set Intensity** part de **Update**, avec la Lumiere en Target et le Lerp en New Intensity.',
    },
  ],
  objectives: [
    'Trou 1 : un FlipFlop entre E et le Timeline (A → Play, B → Reverse).',
    'Trou 2 : un Lerp de 0 à 5000, piloté par la piste Alpha.',
    'Trou 3 : un Set Intensity sur la Lumiere, exécuté par Update.',
    'Touche Vérifier : E, 2 secondes, E, 2 secondes.',
  ],
  hints: [
    'Le fil blanc va de E au FlipFlop, puis au Timeline. Un second fil blanc part de Update.',
    'FlipFlop.A → Play, FlipFlop.B → Reverse ; Alpha → Lerp.Alpha ; Update → Set Intensity ; Lerp → New Intensity ; Lumiere → Target.',
    'Solution : E Pressed → FlipFlop ; A → Fondu.Play, B → Fondu.Reverse ; Fondu.Update → Set Intensity (Lumiere, Lerp (0, 5000, Alpha)).',
  ],
  challenge: 'Dans l’éditeur de piste, coche Loop et ajoute un point clé (1 s ; 1) puis (2 s ; 0) : le projecteur pulse sans fin dès le premier appui.',
  setup: () => spotProject().pb.project,
  scenario: [{ wait: 0.2 }, ...PRESS_E, { wait: 1 }, { checkpoint: 'monte' }, { wait: 1.3 }, { checkpoint: 'allume' }, ...PRESS_E, { wait: 1 }, { checkpoint: 'descend' }, { wait: 1.3 }, { checkpoint: 'eteint' }],
  checks: [
    {
      id: 'up',
      label: '1 seconde après E, l’intensité est à mi-chemin (environ 2500)',
      at: 'monte',
      test: (cx) => {
        const i = intensity(cx);
        if (i >= 2200 && i <= 2800) return true;
        if (i === 0) return 'L’intensité est restée à 0 : le fil blanc va-t-il de E au Timeline (Play), et de Update à Set Intensity ?';
        if (i >= MAX_INTENSITY) return 'La lumière est déjà au maximum : Set Intensity doit recevoir le Lerp piloté par Alpha, pas une valeur fixe.';
        return `L’intensité vaut ${i} au bout d’une seconde au lieu d’environ 2500 : vérifie A = 0 et B = 5000 sur le Lerp.`;
      },
    },
    { id: 'on', label: 'Après 2 secondes, elle est à 5000', at: 'allume', test: (cx) => (Math.abs(intensity(cx) - MAX_INTENSITY) < 5 ? true : `L’intensité s’arrête à ${intensity(cx)} au lieu de 5000.`) },
    {
      id: 'down',
      label: '1 seconde après le 2e appui, elle redescend (environ 2500)',
      at: 'descend',
      test: (cx) => {
        const i = intensity(cx);
        if (i >= 2200 && i <= 2800) return true;
        if (i >= MAX_INTENSITY - 5) return 'La lumière est restée au maximum au 2e appui : la sortie B du FlipFlop doit entrer par Reverse. Play, à la fin du Timeline, ne rejoue rien.';
        return `L’intensité vaut ${i} une seconde après le 2e appui, au lieu d’environ 2500.`;
      },
    },
    { id: 'off', label: 'Puis elle s’éteint', at: 'eteint', test: (cx) => (intensity(cx) < 5 ? true : `L’intensité est restée à ${intensity(cx)}.`) },
    noRuntimeErrors(),
  ],
  solve(p) {
    const b = edit(p, 'BP_Projecteur');
    const nodes = Object.values(b.graph.nodes);
    const key = nodes.find((n) => n.def === 'event.inputKey')!.id;
    const tl = nodes.find((n) => n.def === 'timeline.node')!.id;
    const light = nodes.find((n) => n.def === 'var.component')!.id;
    const alpha = readTimeline(b.graph.nodes[tl]).tracks[0].id;
    const flip = b.node('flow.flipFlop', {}, {}, [420, 140]);
    const lerp = b.node('math.lerp', {}, { a: 0, b: MAX_INTENSITY }, [1130, 620]);
    const set = b.node('component.setIntensity', {}, {}, [1480, 120]);
    b.link(key, 'pressed', flip, 'exec').link(flip, 'a', tl, 'play').link(flip, 'b', tl, 'reverse');
    b.link(tl, 'update', set, 'exec').link(tl, trackPin(alpha), lerp, 'alpha').link(lerp, 'result', set, 'intensity').link(light, 'value', set, 'target');
  },
};

// ------------------------------------------------------ La rangée de lampes

const LAMPS: { label: string; color: string; on: boolean }[] = [
  { label: 'BP_Lampe', color: '#ff3b30', on: true },
  { label: 'BP_Lampe2', color: '#34c759', on: false },
  { label: 'BP_Lampe3', color: '#0a84ff', on: true },
];

function lampRowProject() {
  const pb = new ProjectBuilder('La rangée de lampes');
  const b = pb.blueprint('BP_Lampe');
  b.component('StaticMesh', 'Pied', { shape: 'cylinder', sizeX: 40, sizeY: 40, color: '#6b7280' });
  b.component('PointLight', 'Lumiere', { visible: false, radius: 260 });
  const color = b.variable('Couleur', T.struct('LinearColor'), '#ffffff');
  const on = b.variable('Allumee', T.bool, false);
  for (const v of b.cls.variables) v.instanceEditable = true;
  LAMPS.forEach((l, i) => {
    const id = pb.place(b, -300 + i * 300, 0);
    Object.assign(pb.project.level.actors.find((a) => a.id === id)!.overrides, { [color]: l.color, [on]: l.on });
  });
  pb.playerStart(0, 350, -90);
  return pb.project;
}

/** The lamps as (colour, lit) in the given simulation, with what is wrong if anything. */
function lampsWrong(cx: CheckContext, editor: boolean): string | undefined {
  const sim = editor ? cx.preview() : cx.sim;
  for (const l of LAMPS) {
    const c = sim.actors.find((a) => a.label === l.label)?.components.find((k) => k.name === 'Lumiere');
    if (!c) return `La Lumiere de ${l.label} est introuvable (renommée ou supprimée ?).`;
    if (c.props.visible !== l.on) return `${l.label} est réglée sur Allumee = ${l.on ? 'vrai' : 'faux'}, mais sa Lumiere est ${c.props.visible ? 'allumée' : 'éteinte'}.`;
    if (l.on && c.props.color.toLowerCase() !== l.color) return `${l.label} est allumée, mais pas de la couleur réglée dans sa variable Couleur.`;
  }
  return undefined;
}

/** `where`: the graph the two Set nodes are built in. */
export function solveLampRow(p: ReturnType<typeof lampRowProject>, where: 'construction' | 'beginPlay' = 'construction'): void {
  const b = edit(p, 'BP_Lampe');
  const [color, on] = b.cls.variables.map((v) => v.id);
  const cs = where === 'construction' ? b.construction() : { b, entry: b.node('event.beginPlay', {}, {}, [64, 96]) };
  const g = cs.b;
  const setColor = g.node('component.setLightColor', {}, {}, [420, 96]);
  const setVis = g.node('component.setVisibility', {}, {}, [800, 96]);
  g.link(cs.entry, 'then', setColor, 'exec').link(setColor, 'then', setVis, 'exec');
  g.link(g.node('var.get', { variable: color }, {}, [200, 330]), 'value', setColor, 'color');
  g.link(g.node('var.get', { variable: on }, {}, [600, 330]), 'value', setVis, 'visible');
  g.target('Lumiere', setColor).target('Lumiere', setVis);
}

export const lessonLampRow: Lesson = {
  id: 'l-rangee-lampes',
  module: 'Mouvement',
  level: 'confirme',
  number: 0,
  title: 'La rangée de lampes',
  situation:
    'Trois lampes, chacune réglée dans le niveau : une Couleur, et Allumee ou non. Elles doivent montrer leurs réglages dès l’éditeur, avant même de lancer Play.',
  notions: ['Construction Script', 'Instance Editable', 'Set Light Color', 'Éditeur ou jeu'],
  remember:
    'Le Construction Script s’exécute dans l’éditeur à chaque placement ou réglage d’une instance, puis à l’apparition de l’acteur, avant BeginPlay. Il prépare l’acteur à partir de ses variables ; il ne tourne plus pendant la partie.',
  cards: [
    {
      title: 'Avant le jeu',
      body:
        'Chaque Blueprint a un second graphe : **ConstructionScript** (My Blueprint › Graphs). Il s’exécute **dans l’éditeur**, à chaque fois qu’une instance est placée, déplacée ou qu’une de ses variables **Instance Editable** change.\n\n' +
        'C’est là qu’un acteur applique ses réglages : le niveau montre alors le résultat sans lancer Play.',
    },
    {
      title: 'Ce qu’il ne fait pas',
      body:
        'Il **ne tourne pas pendant la partie** : changer Allumee en jeu ne rallume rien, c’est le rôle de l’Event Graph.\n\n' +
        'Quand il s’exécute, **aucun acteur n’a encore fait son BeginPlay** : ne lis pas dans un autre acteur une variable qu’il règle au BeginPlay. Et il n’accepte ni Delay, ni Timeline, ni événement.',
    },
    {
      title: 'À faire',
      body:
        'Dans le ConstructionScript de **BP_Lampe** : **Set Light Color** (Lumiere) avec **Get Couleur**, puis **Set Visibility** (Lumiere) avec **Get Allumee**.\n\n' +
        'Reviens sur l’onglet Niveau : les lampes changent aussitôt. Sélectionne une lampe et modifie Allumee dans Details pour voir le script se relancer.',
    },
  ],
  objectives: [
    'Ouvre le ConstructionScript de BP_Lampe (My Blueprint › Graphs).',
    'Set Light Color (Lumiere) avec la variable Couleur.',
    'Set Visibility (Lumiere) avec la variable Allumee.',
    'Touche Vérifier : le niveau est contrôlé avant Play, puis en jeu.',
  ],
  hints: [
    'Les deux nœuds se suivent sur le fil blanc qui part de Construction Script, pas de BeginPlay.',
    'Nœuds : Set Light Color, Set Visibility, Get Lumiere (deux fois), Get Couleur, Get Allumee.',
    'Solution : Construction Script → Set Light Color (Lumiere, Couleur) → Set Visibility (Lumiere, Allumee).',
  ],
  challenge: 'Ajoute une variable Rayon (Float, Instance Editable) et… regarde la palette : il n’y a pas de Set pour le rayon ici. Dans UE, ce serait Set Attenuation Radius.',
  setup: lampRowProject,
  scenario: [{ wait: 0.3 }, { checkpoint: 'jeu' }],
  checks: [
    {
      id: 'editor',
      label: 'Dans l’éditeur, avant Play, chaque lampe montre ses réglages',
      test: (cx) => {
        const wrong = lampsWrong(cx, true);
        if (!wrong) return true;
        const inGame = !lampsWrong(cx, false);
        return inGame
          ? `En jeu c’est bon, mais pas dans l’éditeur : ${wrong} BeginPlay ne s’exécute qu’au lancement de la partie ; ce qui doit se voir dans le niveau se fait dans le ConstructionScript.`
          : wrong;
      },
    },
    { id: 'game', label: 'En jeu aussi', at: 'jeu', test: (cx) => lampsWrong(cx, false) ?? true },
    noRuntimeErrors(),
  ],
  solve: (p) => solveLampRow(p),
  robustness: [
    {
      id: 'fourth',
      label: 'on place une quatrième lampe, jaune et allumée',
      advice: 'Le script doit lire les variables de l’instance (Get Couleur, Get Allumee), pas des valeurs fixes.',
      mutate(p) {
        const cls = p.classes.find((c) => c.name === 'BP_Lampe')!;
        const [color, on] = cls.variables.map((v) => v.id);
        p.level.actors.push({ id: 'robust-lamp', classId: cls.id, name: 'BP_Lampe4', x: 600, y: 0, yaw: 0, overrides: { [color]: '#ffd60a', [on]: true } });
      },
      scenario: [{ wait: 0.1 }],
      checks: [
        {
          id: 'yellow',
          label: 'jaune',
          test: (cx) => {
            const c = cx.preview().actors.find((a) => a.label === 'BP_Lampe4')?.components.find((k) => k.name === 'Lumiere');
            return c?.props.visible && c.props.color.toLowerCase() === '#ffd60a' ? true : 'La quatrième lampe ne montre pas ses réglages dans l’éditeur.';
          },
        },
      ],
    },
  ],
};
