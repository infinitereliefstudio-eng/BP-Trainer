/**
 * V7.43, the Widget Component at Avancé (docs/PLAN_ANNEXE_WIDGET_PROJETS.md).
 * Three enemies carry BP_Sante (the health component of « La santé est
 * partout »): each pass of the player takes 25, at 0 the enemy goes.
 *
 * - « La barre au-dessus de l'ennemi » (discover): a Widget Component on
 *   BP_Ennemi, its Widget Class, Draw Size and place: one bar per enemy.
 * - « Une barre par ennemi » (guided): after each hit, Get User Widget Object
 *   → Cast To WBP_BarreVie → AfficherVie: each bar follows its own enemy.
 * - D26 « La barre figée » (debug): the Widget Class was changed for a copy,
 *   the Cast To fails without a word, the bars stay full.
 */
import type { Project } from '../../model/project';
import { setWidgetClass } from '../../operations/classOps';
import { T } from '../../types/pins';
import { type ClassBuilder, edit, ProjectBuilder } from '../builder';
import { noRuntimeErrors, notion } from '../checks';
import type { Check, CheckContext, Lesson } from '../types';
import { healthComponent } from './health';
import { fnDef, goTo } from './kit';
import { UMG_MODULE } from './umgCounter';
import { addW, newClass } from './umgKit';

export const ENEMIES = ['BP_Ennemi', 'BP_Ennemi2', 'BP_Ennemi3'];
const AT: [number, number][] = [
  [-380, -170],
  [0, -170],
  [380, -170],
];
export const OUT: [number, number] = [0, 260];
const HIT = 25;
/** One pass of the player through an enemy's zone: one hit. */
export const pass = (i: number) => [...goTo(...AT[i]), ...goTo(...OUT)];

/** A bar Widget Blueprint: a Canvas Panel, PB_Vie stretched over all of it, and AfficherVie(Vie) that sets its Percent (Vie ÷ 100). */
export function barWidget(p: Project, name: string, fill: string): ClassBuilder {
  const w = newClass(p, name, 'UserWidget');
  const canvas = addW(p, w.cls, 'CanvasPanel', undefined);
  addW(p, w.cls, 'ProgressBar', canvas.id, {
    name: 'PB_Vie',
    isVariable: true,
    props: { percent: 1, fillColor: fill },
    slot: { anchors: { minX: 0, minY: 0, maxX: 1, maxY: 1 }, offsets: [0, 0, 0, 0] },
  });
  const fn = fnDef(p, w, 'AfficherVie', [['Vie', T.int]], []);
  const toFloat = fn.f.node('conv.intToFloat', {}, {}, [260, 260]);
  const div = fn.f.node('math.divideFloat', {}, { b: 100 }, [460, 260]);
  const set = fn.f.node('widget.setPercent', {}, {}, [700, 96]);
  const bar = w.cls.widgets!.find((x) => x.name === 'PB_Vie')!;
  fn.f
    .link(fn.entry, 'then', set, 'exec')
    .link(fn.entry, fn.pin.Vie, toFloat, 'in')
    .link(toFloat, 'result', div, 'a')
    .link(div, 'result', set, 'percent')
    .link(fn.f.node('var.widget', { widget: bar.id }, {}, [460, 420]), 'value', set, 'target');
  return w;
}

/**
 * The starting project: BP_Sante (Vie 100), WBP_BarreVie, and BP_Ennemi:
 * a body, a zone, BP_Sante; ActorBeginOverlap → InfligerDegats (25);
 * On OnMort (BP_Sante) → Delay 0.3 → Destroy Actor. Three of them.
 */
export function enemiesProject(name: string): Project {
  const pb = new ProjectBuilder(name);
  const health = healthComponent(pb, 100);
  barWidget(pb.project, 'WBP_BarreVie', '#e5484d');
  const e = pb.blueprint('BP_Ennemi');
  e.component('StaticMesh', 'Corps', { shape: 'cylinder', sizeX: 80, sizeY: 80, color: '#a855f7', blocks: false });
  e.component('BoxCollision', 'Zone', { sizeX: 150, sizeY: 150 });
  const comp = e.logic(health.b, 'BP_Sante', { [health.vie]: 100 });
  const ev = e.node('event.actorBeginOverlap', {}, {}, [64, 96]);
  const hit = e.node('call.function', { owner: health.b.cls.id, graph: health.hit.graph.id }, { [health.hit.pin.Montant]: HIT }, [400, 96]);
  e.link(ev, 'then', hit, 'exec').link(e.node('var.component', { component: comp }, {}, [220, 300]), 'value', hit, 'target');
  const dead = e.node('event.componentDispatcher', { component: comp, dispatcher: health.mort }, {}, [64, 560]);
  const wait = e.node('time.delay', {}, { duration: 0.3 }, [400, 560]);
  e.link(dead, 'then', wait, 'exec').link(wait, 'completed', e.node('actor.destroy', {}, {}, [700, 560]), 'exec');
  for (const at of AT) pb.place(e, ...at);
  pb.playerStart(...OUT);
  return pb.project;
}

// ---------------------------------------------------------------- reading

/** The Widget Components of a class. */
const widgetComps = (p: Project, className: string) => p.classes.find((c) => c.name === className)?.components.filter((k) => k.kind === 'Widget') ?? [];
const className = (p: Project, id: string | undefined) => p.classes.find((c) => c.id === id)?.name;

/** The Percent of PB_Vie in the widget an enemy carries, while the scenario plays (undefined: no widget). */
export function barOf(cx: CheckContext, label: string): number | undefined {
  const a = cx.actor(label);
  const id = a?.components.find((k) => k.kind === 'Widget' && k.widget)?.widget;
  const obj = id ? cx.sim.objectById(id) : undefined;
  const bar = obj && cx.sim.classOf(obj)?.widgets?.find((w) => w.name === 'PB_Vie');
  return obj && bar ? Number(cx.sim.umg.prop({ obj, id: bar.id }, 'percent')) : undefined;
}

const pctText = (v: number | undefined) => (v === undefined ? 'pas de barre' : `${Math.round(v * 100)} %`);
const bars = (cx: CheckContext) => ENEMIES.map((e) => `${e} ${pctText(barOf(cx, e))}`).join(', ');

/** The widgets of a Widget Blueprint drawn over actors now. */
export const drawnOver = (cx: CheckContext, widget: string) => cx.sim.umg.componentLayer().filter((s) => s.obj.className === widget);

/**
 * The Widget Component of `cls` shows `widget`, at a sensible size, above
 * its actor: what a first Widget Component needs (Draw Size starts at
 * 500 × 500, Location at the actor's centre).
 */
export function placedWidget(cx: CheckContext, cls: string, widget: string, max: [number, number]): true | string {
  const comps = widgetComps(cx.project, cls);
  if (!comps.length) return `${cls} n’a pas de Widget Component : ouvre-le, Components › + Add › Widget.`;
  const c = comps.find((k) => className(cx.project, k.classId) === widget) ?? comps[0];
  if (!c.classId) return `${c.name} a un Widget Class à None : il n’affiche rien. Dans ses Details › User Interface, choisis ${widget}.`;
  if (className(cx.project, c.classId) !== widget) return `${c.name} affiche ${className(cx.project, c.classId)} : choisis ${widget} dans Widget Class.`;
  const { sizeX: w, sizeY: h } = c.props;
  if (w > max[0] || h > max[1]) return `Draw Size ${w} × ${h} : le widget couvre ${cls} et ses voisins. Réduis-la (Details › User Interface), vers ${max[0] / 2} × ${Math.round(max[1] / 3)}.`;
  if (w < 20 || h < 4) return `Draw Size ${w} × ${h} : trop petit pour se voir.`;
  if (c.props.y > -40) return `${c.name} est sur ${cls}, pas au-dessus : une Location Y négative (vers −80) le remonte à l’écran, comme Location Z dans UE.`;
  return true;
}

/** Each enemy's bar, after the scenario's hits: `expected` (Percent) by enemy, undefined when it is gone. */
function barsAre(expected: (number | undefined)[], when: string): Check['test'] {
  return (cx) => {
    const got = ENEMIES.map((e) => barOf(cx, e));
    if (got.every((v, i) => (expected[i] === undefined ? !cx.actor(ENEMIES[i]) : v !== undefined && Math.abs(v - expected[i]!) < 0.001))) return true;
    if (got.some((v, i) => v === undefined && cx.actor(ENEMIES[i]))) return `${when}, un ennemi n’a pas de barre : ${bars(cx)}. Le Widget Component de BP_Ennemi doit afficher WBP_BarreVie.`;
    if (got.every((v) => v === undefined || v === 1)) {
      return `${when}, toutes les barres sont encore pleines (${bars(cx)}). Après InfligerDegats, il faut dire au widget de CET ennemi d’afficher sa Vie : Get User Widget Object (Barre) → Cast To WBP_BarreVie → AfficherVie.`;
    }
    return `${when} : ${bars(cx)}. Attendu : ${ENEMIES.map((e, i) => `${e} ${expected[i] === undefined ? 'détruit' : pctText(expected[i])}`).join(', ')}. Chaque barre doit suivre la Vie de son propre ennemi.`;
  };
}

// ---------------------------------------------- the discover step

export const lessonEnemyBar: Lesson = {
  id: 'l-barre-ennemi',
  module: UMG_MODULE,
  level: 'avance',
  number: 0,
  title: 'La barre au-dessus de l’ennemi',
  situation:
    'Trois ennemis portent BP_Sante, la santé en composant : chaque passage du joueur leur retire 25. Mais rien ne montre combien il leur reste. Pose une barre de vie au-dessus de chacun : pas une sur l’écran, une par ennemi, qui le suit.',
  chain: { notion: 'widget-component', step: 'discover' },
  notions: ['Widget Component', 'Draw Size'],
  remember:
    'Un widget qui appartient à un acteur se pose avec un Widget Component : chaque acteur a son propre exemplaire, qui le suit et disparaît avec lui. Draw Size part de 500 × 500 : on la règle toujours.',
  cards: [
    {
      title: 'Ce qui est en place',
      body:
        '**BP_Sante** (la santé de « La santé est partout ») : Vie 100, **InfligerDegats** (Montant), **OnMort** à 0.\n\n' +
        '**BP_Ennemi** : un Corps, une Zone, BP_Sante. **ActorBeginOverlap** → InfligerDegats (25). **On OnMort (BP_Sante)** → Delay 0.3 → Destroy Actor. Trois sont posés.\n\n' +
        '**WBP_BarreVie** : un Canvas Panel et **PB_Vie**, une Progress Bar qui le remplit. Sa fonction **AfficherVie** (Vie) règle le Percent : elle servira à l’étape suivante.',
    },
    {
      title: 'Ce qui est nouveau : le Widget Component',
      body:
        'Un HUD (Create Widget, Add to Viewport) appartient à l’écran : il y en a un. Une barre au-dessus d’un ennemi appartient à l’**ennemi** : il en faut une par ennemi, qui le suit et part avec lui.\n\n' +
        'C’est le rôle du **Widget Component** : un composant qu’on ajoute à l’acteur, comme un Static Mesh. Ses Details › **User Interface** :\n\n' +
        '- **Widget Class** : le Widget Blueprint à afficher ;\n- **Draw Size** : sa taille à l’écran, en pixels ;\n- **Space** : **Screen** le dessine par-dessus la vue, toujours lisible ; **World** le poserait comme un panneau dans la scène 3D (non simulé ici).\n\n' +
        'Chaque ennemi posé aura **son propre exemplaire** du widget. Pas de Create Widget, pas d’Add to Viewport : le composant s’en charge au lancement.',
    },
    {
      title: 'Les pièges du premier essai',
      body:
        '- **Draw Size** vaut 500 × 500 au départ : la barre couvrirait l’ennemi et ses voisins. Une barre de vie fait plutôt 120 × 14.\n' +
        '- Le composant est placé au centre de l’acteur : dans UE, on le remonte avec **Location Z**. Le niveau de l’appli n’a pas encore de hauteur : ici, c’est **Location Y négative** (vers −80) qui le place au-dessus.\n' +
        '- **Widget Class** laissé à None : rien ne s’affiche.',
    },
    {
      title: 'Pas à pas',
      body:
        '1. Ouvre **BP_Ennemi**. Dans Components, **+ Add › Widget** ; nomme-le **Barre**.\n' +
        '2. Dans ses Details : Widget Class **WBP_BarreVie**, Draw Size **120 × 14**, Location Y **−80**.\n' +
        '3. Compile, puis Play : une barre au-dessus de chaque ennemi. Traverse-en un quatre fois : il disparaît, sa barre aussi.',
    },
  ],
  objectives: [
    'BP_Ennemi porte un Widget Component qui affiche WBP_BarreVie.',
    'La barre est petite (Draw Size) et au-dessus de l’ennemi, pas sur lui.',
    'En Play, chacun des trois ennemis a sa barre.',
  ],
  hints: [
    'Cette barre appartient-elle à l’écran ou à chaque ennemi ? Si c’est à l’ennemi, où se pose-t-elle : dans son graphe, ou dans ses Components ?',
    'Components › + Add › Widget ; Details › User Interface : Widget Class, Draw Size ; Transform : Location Y.',
    'Solution : dans BP_Ennemi, + Add › Widget (Barre). Widget Class = WBP_BarreVie, Draw Size = 120 × 14, Location Y = −80. Aucun nœud à ajouter.',
  ],
  challenge: 'Ajoute un quatrième ennemi dans le niveau : il a sa barre sans rien changer d’autre. Pourquoi ?',
  setup: () => enemiesProject('La barre au-dessus de l’ennemi'),
  scenario: [{ wait: 0.3 }, { checkpoint: 'debut' }, ...pass(0), ...pass(0), ...pass(0), ...pass(0), { wait: 0.5 }],
  checks: [
    { id: 'component', label: 'BP_Ennemi porte un Widget Component : WBP_BarreVie, petit, au-dessus de lui', test: (cx) => placedWidget(cx, 'BP_Ennemi', 'WBP_BarreVie', [300, 60]) },
    {
      id: 'three',
      label: 'En Play, chaque ennemi a sa barre',
      at: 'debut',
      test: (cx) => {
        const n = drawnOver(cx, 'WBP_BarreVie').length;
        return n === 3 ? true : `${n} barre${n > 1 ? 's' : ''} à l’écran au lieu de 3 : une par ennemi, c’est le Widget Component de BP_Ennemi qui la fait.`;
      },
    },
    {
      id: 'gone',
      label: 'L’ennemi détruit emporte sa barre',
      test: (cx) => (cx.actor('BP_Ennemi') ? 'Le premier ennemi tient encore après quatre passages : ne change pas sa santé.' : drawnOver(cx, 'WBP_BarreVie').length === 2 ? true : 'Il reste trois barres : celle de l’ennemi détruit devrait être partie avec lui.'),
    },
    noRuntimeErrors(),
  ],
  solve(p) {
    edit(p, 'BP_Ennemi').widgetComponent('Barre', edit(p, 'WBP_BarreVie'), { y: -80, sizeX: 120, sizeY: 14 });
  },
};

// ---------------------------------------------- the guided step

/** After InfligerDegats in BP_Ennemi: Get User Widget Object (Barre) → Cast To WBP_BarreVie → AfficherVie (Vie of BP_Sante). */
export function followLife(p: Project, castTo = 'WBP_BarreVie'): void {
  const e = edit(p, 'BP_Ennemi');
  const health = p.classes.find((c) => c.name === 'BP_Sante')!;
  const wbp = edit(p, castTo);
  const afficher = wbp.cls.graphs.find((g) => g.name === 'AfficherVie')!;
  const g = e.graph;
  const hit = Object.values(g.nodes).find((n) => n.def === 'call.function')!.id;
  const barre = e.componentId('Barre');
  const sante = e.componentId('BP_Sante');
  const get = e.node('widgetComponent.getUserWidgetObject', {}, {}, [700, 300]);
  const cast = e.node('cast.to', { class: wbp.cls.id }, {}, [760, 96]);
  const vie = e.node('var.getExternal', { owner: health.id, variable: health.variables.find((v) => v.name === 'Vie')!.id }, {}, [1000, 300]);
  const show = e.node('call.function', { owner: wbp.cls.id, graph: afficher.id }, {}, [1100, 96]);
  const param = afficher.fn!.inputs[0].id;
  e.link(e.node('var.component', { component: barre }, {}, [540, 380]), 'value', get, 'target').link(get, 'result', cast, 'object');
  e.link(hit, 'then', cast, 'exec').link(cast, 'then', show, 'exec').link(cast, 'as', show, 'target');
  e.link(e.node('var.component', { component: sante }, {}, [840, 420]), 'value', vie, 'target').link(vie, 'value', show, param);
}

/** The project of the guided step, solved (the starting project of D26). */
export function barsFollowing(name: string): Project {
  const p = enemiesProject(name);
  lessonEnemyBar.solve(p);
  followLife(p);
  return p;
}

const lifeScenario = [{ wait: 0.3 }, ...pass(0), { checkpoint: 'un' }, ...pass(1), ...pass(1), { checkpoint: 'deux' }, ...pass(0), ...pass(0), ...pass(0), { wait: 0.6 }];

const lifeChecks: Check[] = [
  { id: 'one', label: 'Un coup au premier ennemi : sa barre à 75 %, les autres pleines', at: 'un', test: barsAre([0.75, 1, 1], 'Après un coup au premier ennemi') },
  { id: 'two', label: 'Deux coups au deuxième : sa barre à 50 %, le premier reste à 75 %', at: 'deux', test: barsAre([0.75, 0.5, 1], 'Après deux coups au deuxième') },
  { id: 'dead', label: 'Le premier, à 0, disparaît avec sa barre ; les autres gardent la leur', test: barsAre([undefined, 0.5, 1], 'Après quatre coups au premier') },
];

export const lessonBarPerEnemy: Lesson = {
  id: 'l-barre-par-ennemi',
  module: UMG_MODULE,
  level: 'avance',
  number: 0,
  title: 'Une barre par ennemi',
  situation:
    'Chaque ennemi a sa barre au-dessus de lui, mais elles restent pleines. Après chaque coup, l’ennemi touché doit mettre à jour SA barre, et seulement la sienne.',
  chain: { notion: 'widget-component', step: 'guided' },
  recalls: ['cast', 'functions', 'other-bp'],
  notions: ['Get User Widget Object', 'Cast To', 'Widget Component'],
  remember:
    'Get User Widget Object donne le widget de CE composant, sur CET acteur. Il est typé User Widget : un Cast To vers le Widget Blueprint ouvre ses fonctions et ses variables. Chaque acteur parle à son propre widget.',
  cards: [
    {
      title: 'Ce qui est en place',
      body:
        'La solution de « La barre au-dessus de l’ennemi » : **BP_Ennemi** porte **BP_Sante** et **Barre**, un Widget Component qui affiche **WBP_BarreVie** (120 × 14, au-dessus).\n\n' +
        '**ActorBeginOverlap** → **InfligerDegats** (25). À 0, On OnMort → Delay → Destroy Actor.\n\n' +
        '**WBP_BarreVie** a une fonction **AfficherVie** (Vie, Integer) : elle règle PB_Vie à Vie ÷ 100.',
    },
    {
      title: 'Ce qui est nouveau : Get User Widget Object',
      body:
        'Le Widget Component a créé un widget pour cet ennemi-là. **Get User Widget Object** (Target : le composant **Barre**) le donne.\n\n' +
        'Mais il est typé **User Widget**, le type de tous les widgets : UE ne sait pas que c’est un WBP_BarreVie, donc AfficherVie n’apparaît pas. Un **Cast To WBP_BarreVie** le vérifie et donne la référence typée (**As WBP_BarreVie**), comme pour Other Actor → Cast To BP_Joueur.\n\n' +
        'Comme Barre est le composant de **cet** ennemi, le widget obtenu est **le sien** : les trois ennemis exécutent le même graphe, chacun sur sa barre.',
    },
    {
      title: 'Pas à pas',
      body:
        '1. Dans **BP_Ennemi**, après **InfligerDegats** : glisse le composant **Barre** depuis Components (Get), puis **Get User Widget Object**.\n' +
        '2. **Cast To WBP_BarreVie** (Object = sa Return Value), branché après InfligerDegats.\n' +
        '3. Depuis **As WBP_BarreVie** : **AfficherVie**. Sa Vie : Get **BP_Sante** → **Get Vie**.\n' +
        '4. Play : traverse un ennemi, sa barre seule descend.',
    },
  ],
  objectives: [
    'Après un coup, la barre de l’ennemi touché descend : 75 %, 50 %…',
    'Les barres des autres ennemis ne bougent pas.',
    'Un ennemi à 0 disparaît avec sa barre.',
  ],
  hints: [
    'L’ennemi touché sait sa Vie, et il porte le composant qui a fait sa barre. Que donne ce composant ? Et que manque-t-il pour appeler AfficherVie dessus ?',
    'Get Barre ; Get User Widget Object ; Cast To WBP_BarreVie ; AfficherVie ; Get BP_Sante ; Get Vie.',
    'Solution : dans BP_Ennemi, InfligerDegats → Cast To WBP_BarreVie (Object = Get User Widget Object, Target = Barre) → AfficherVie (Target = As WBP_BarreVie, Vie = Get Vie de BP_Sante).',
  ],
  challenge: 'Donne 200 de vie au troisième ennemi (Details de son BP_Sante, dans le niveau ou dans le Blueprint) : sa barre affiche-t-elle juste ? Que faudrait-il donner à AfficherVie pour qu’elle marche avec n’importe quel maximum ?',
  setup() {
    const p = enemiesProject('Une barre par ennemi');
    lessonEnemyBar.solve(p);
    return p;
  },
  scenario: lifeScenario,
  checks: [
    ...lifeChecks,
    notion({
      id: 'own-widget',
      label: 'L’ennemi passe par Get User Widget Object et Cast To WBP_BarreVie',
      test: (cx) => {
        const defs = cx.nodes('BP_Ennemi');
        if (!defs.some((n) => n.def === 'widgetComponent.getUserWidgetObject')) return 'Le widget de l’ennemi se trouve avec Get User Widget Object, sur son composant Barre.';
        const wbp = cx.project.classes.find((c) => c.name === 'WBP_BarreVie')?.id;
        return defs.some((n) => n.def === 'cast.to' && n.config.class === wbp) ? true : 'Get User Widget Object rend un User Widget : Cast To WBP_BarreVie donne accès à AfficherVie.';
      },
    }),
    noRuntimeErrors(),
  ],
  solve(p) {
    followLife(p);
  },
  alternatives: [
    {
      title: 'Caster une fois, à l’Event BeginPlay',
      gains:
        'Le Cast se fait une seule fois par ennemi, au lancement : la référence typée (variable BarreVie, de type WBP_BarreVie) sert ensuite à chaque coup, et à toute autre fonction du widget. C’est l’habitude dans UE : on garde la référence plutôt que de recaster à chaque fois.',
      loses:
        'Une variable de plus à tenir. Si le Cast échoue au lancement, rien ne le dit : BarreVie reste None, et chaque coup donne Accessed None. Et si le Widget Class changeait en jeu, la variable garderait l’ancien widget.',
      build(p) {
        const e = edit(p, 'BP_Ennemi');
        const health = p.classes.find((c) => c.name === 'BP_Sante')!;
        const wbp = edit(p, 'WBP_BarreVie');
        const afficher = wbp.cls.graphs.find((g) => g.name === 'AfficherVie')!;
        const ref = e.variable('BarreVie', T.object('WBP_BarreVie'));
        // Event BeginPlay → Cast To WBP_BarreVie (Get User Widget Object) → Set BarreVie.
        const begin = e.node('event.beginPlay', {}, {}, [64, 820]);
        const get = e.node('widgetComponent.getUserWidgetObject', {}, {}, [240, 1000]);
        const cast = e.node('cast.to', { class: wbp.cls.id }, {}, [420, 820]);
        const set = e.node('var.set', { variable: ref }, {}, [760, 820]);
        e.link(e.node('var.component', { component: e.componentId('Barre') }, {}, [64, 1000]), 'value', get, 'target').link(get, 'result', cast, 'object');
        e.link(begin, 'then', cast, 'exec').link(cast, 'then', set, 'exec').link(cast, 'as', set, 'value');
        // After each hit: AfficherVie on the kept reference.
        const hit = Object.values(e.graph.nodes).find((n) => n.def === 'call.function')!.id;
        const show = e.node('call.function', { owner: wbp.cls.id, graph: afficher.id }, {}, [760, 96]);
        const vie = e.node('var.getExternal', { owner: health.id, variable: health.variables.find((v) => v.name === 'Vie')!.id }, {}, [560, 300]);
        e.link(hit, 'then', show, 'exec').link(e.node('var.get', { variable: ref }, {}, [560, 220]), 'value', show, 'target');
        e.link(e.node('var.component', { component: e.componentId('BP_Sante') }, {}, [400, 380]), 'value', vie, 'target').link(vie, 'value', show, afficher.fn!.inputs[0].id);
      },
    },
  ],
};

// ---------------------------------------------- D26

export const debug26: Lesson = {
  id: 'd26-barre-figee',
  kind: 'debug',
  code: 'D26',
  module: UMG_MODULE,
  level: 'avance',
  number: 0,
  title: 'La barre figée',
  situation:
    'Les barres des ennemis marchaient. Pour préparer un boss, quelqu’un a créé WBP_BarreBoss, une copie dorée de la barre, et l’a essayée sur BP_Ennemi. Depuis, les barres restent pleines quoi qu’il arrive, et l’Output Log n’affiche aucune erreur.',
  notions: ['Widget Component', 'Cast Failed', 'Get User Widget Object'],
  remember:
    'Un Cast To qui échoue ne dit rien : l’exécution part par Cast Failed, sans erreur. Quand Get User Widget Object suit un Cast, le Widget Class du composant et la classe du Cast doivent désigner le même Widget Blueprint.',
  cards: [
    {
      title: 'Ce qui est en place',
      body:
        'La solution d’« Une barre par ennemi » : après InfligerDegats, Get User Widget Object (Barre) → **Cast To WBP_BarreVie** → AfficherVie.\n\n' +
        'Et **WBP_BarreVie** a maintenant une copie, **WBP_BarreBoss** : même Designer, même fonction AfficherVie, barre dorée.',
    },
    {
      title: 'Ce qui cloche',
      body:
        'Les barres sont **dorées** et restent pleines. Aucune Accessed None : la référence n’est pas vide. Une exécution qui s’arrête sans bruit, c’est souvent une sortie qui ne mène nulle part.\n\n' +
        'Pose un breakpoint sur le Cast, ou un Print sur **Cast Failed**, et regarde quelle sortie est prise. Puis compare ce que le composant affiche (Details › Widget Class) à ce que le Cast attend.',
    },
  ],
  objectives: ['Trouver pourquoi les barres ne bougent plus.', 'Chaque barre suit de nouveau la vie de son ennemi.'],
  hints: [
    'Le Cast To s’exécute bien après chaque coup. Par quelle sortie repart-il ? Qu’est-ce que Get User Widget Object rend, maintenant ?',
    'Details de Barre (Widget Class) ; Cast To WBP_BarreVie ; sortie Cast Failed.',
    'Solution : le Widget Component Barre affiche WBP_BarreBoss, un autre Blueprint : Cast To WBP_BarreVie échoue à chaque coup, sans erreur. Remets Widget Class sur WBP_BarreVie (ou caste vers WBP_BarreBoss, si c’est la barre voulue).',
  ],
  challenge: 'Pour éviter ce piège, WBP_BarreBoss pourrait hériter de WBP_BarreVie, ou les deux implémenter une interface AfficherVie. Pourquoi l’interface marcherait-elle avec les deux, sans Cast ?',
  setup() {
    const p = barsFollowing('La barre figée');
    const boss = barWidget(p, 'WBP_BarreBoss', '#eab308');
    const e = edit(p, 'BP_Ennemi');
    const r = setWidgetClass(p, e.cls, e.componentId('Barre'), boss.cls.id);
    if (!r.ok) throw new Error(r.reason);
    return p;
  },
  scenario: lifeScenario,
  checks: [...lifeChecks, noRuntimeErrors()],
  solve(p) {
    const e = edit(p, 'BP_Ennemi');
    const r = setWidgetClass(p, e.cls, e.componentId('Barre'), p.classes.find((c) => c.name === 'WBP_BarreVie')!.id);
    if (!r.ok) throw new Error(r.reason);
  },
};
