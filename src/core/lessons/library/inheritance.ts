/**
 * V2, step E (Avancé): Blueprint inheritance. A blinking lamp is a child of
 * the base lamp: it inherits its components, variables and BeginPlay, and
 * overrides BeginPlay without losing the parent's logic (Parent: BeginPlay).
 */
import { addFunction } from '../../operations/functionOps';
import { setParentClass } from '../../operations/projectOps';
import { T } from '../../types/pins';
import { edit, ProjectBuilder } from '../builder';
import { noRuntimeErrors, printedNumbers, usesNode, notion } from '../checks';
import type { CheckContext, Lesson } from '../types';

function familyProject() {
  const pb = new ProjectBuilder('L’héritage');
  const base = pb.blueprint('BP_LampeBase');
  base.component('StaticMesh', 'Pied', { shape: 'cylinder', sizeX: 40, sizeY: 40, color: '#6b7280' });
  base.component('PointLight', 'Lumiere', { visible: false, radius: 300, intensity: 1000 });
  const power = base.variable('Puissance', T.float, 3000);
  // Allumer: show the light at Puissance.
  const fn = addFunction(base.cls, 'Allumer');
  const f = base.inGraph(fn.id);
  const entry = Object.values(fn.nodes).find((n) => n.def === 'fn.entry')!.id;
  const show = f.node('component.setVisibility', {}, { visible: true }, [320, 96]);
  const level = f.node('component.setIntensity', {}, {}, [640, 96]);
  f.link(entry, 'then', show, 'exec').link(show, 'then', level, 'exec').target('Lumiere', show).target('Lumiere', level);
  f.link(f.node('var.get', { variable: power }, {}, [460, 320]), 'value', level, 'intensity');
  base.link(base.node('event.beginPlay', {}, {}, [64, 96]), 'then', base.node('call.function', { graph: fn.id }, {}, [360, 96]), 'exec');

  const blink = pb.blueprint('BP_Clignotante');
  const r = setParentClass(pb.project, blink.cls.id, base.cls.id);
  if (!r.ok) throw new Error(r.reason);

  const board = pb.blueprint('BP_Tableau');
  board.component('StaticMesh', 'Panneau', { sizeX: 160, sizeY: 40, color: '#1f2937' });
  const all = board.node('actor.getAllOfClass', {}, { class: base.cls.id }, [360, 96]);
  const len = board.node('array.length', {}, {}, [640, 300]);
  const say = board.node('debug.printString', {}, {}, [700, 96]);
  board.link(board.node('event.beginPlay', {}, {}, [64, 96]), 'then', all, 'exec').link(all, 'then', say, 'exec').link(all, 'actors', len, 'array').link(len, 'result', say, 'text');

  pb.place(base, -250, -150);
  pb.place(blink, 250, -150);
  pb.place(board, 0, 150);
  pb.playerStart(-400, 150);
  return pb.project;
}

const light = (cx: CheckContext, label: string) => cx.component(label, 'Lumiere');

export const lessonInheritance: Lesson = {
  id: 'l-heritage',
  module: 'Héritage',
  level: 'avance',
  // The first meeting with inheritance: its method stays in view (helpPolicy, first rung).
  chain: { notion: 'inheritance', step: 'guided' },
  number: 0,
  title: 'L’héritage',
  situation:
    'BP_Clignotante est un enfant de BP_LampeBase : il a déjà son pied, sa Lumiere, sa variable Puissance et son BeginPlay qui l’allume. Fais-la clignoter toutes les 0,5 s, sans perdre ce qu’elle hérite.',
  notions: ['Classe parente', 'Hériter', 'Redéfinir un événement', 'Parent: BeginPlay', 'Un enfant est un parent'],
  remember: 'Un Blueprint enfant a tout ce qu’a son parent. Redéfinir un événement remplace la version du parent : Parent: … la rappelle, à l’endroit voulu.',
  cards: [
    {
      title: 'Ce qui est en place',
      body:
        '- **BP_LampeBase** : un pied, une **Lumiere** (éteinte), une variable **Puissance** (3000) et une fonction **Allumer** (Set Visibility puis Set Intensity = Puissance). Son **BeginPlay** appelle Allumer.\n- **BP_Clignotante** : graphe vide, mais sa **Parent Class** est BP_LampeBase.\n- **BP_Tableau** : au BeginPlay, compte les BP_LampeBase du niveau et affiche le nombre.\n\n' +
        'Une lampe de chaque est posée. Lance Play : les deux s’allument, le tableau affiche 2.',
    },
    {
      title: 'Un Blueprint enfant',
      body:
        '**BP_Clignotante** est un **enfant** de BP_LampeBase (Class Settings › Parent Class). Il **hérite** de tout ce qu’a son parent : composants, variables, fonctions, événements. Ouvre-le : My Blueprint les montre, marqués « hérité ».\n\n' +
        'C’est pour ça qu’il s’allume sans une ligne de graphe : le BeginPlay du parent s’exécute pour lui.\n\n' +
        'Un enfant **est** aussi un parent : le tableau, qui cherche des BP_LampeBase, trouve les deux lampes. Un Cast To BP_LampeBase réussit sur une BP_Clignotante.',
    },
    {
      title: 'Redéfinir un événement',
      body:
        'Si BP_Clignotante a son **propre** Event BeginPlay, celui du parent **ne s’exécute plus** pour elle : il est **remplacé** (redéfini).\n\n' +
        'Pour garder les deux, place **Parent: BeginPlay** sur le fil, à l’endroit voulu : appui long sur ton BeginPlay › **Ajouter l’appel au parent**. Il exécute la version du parent, puis le fil continue.\n\n' +
        'Pareil pour une fonction : une fonction **Allumer** dans l’enfant remplace celle du parent, **même** quand c’est le graphe du parent qui l’appelle. **Parent: Allumer** rappelle l’originale.',
    },
    {
      title: 'Le plan',
      body:
        'Dans **BP_Clignotante** :\n\n' +
        '1. **Event BeginPlay** → **Parent: BeginPlay** (la lampe s’allume, comme avant).\n2. → **Set Timer by Event** (Time 0,5, **Looping**), Event = un Custom Event `Clignoter`.\n3. **Clignoter** → **Toggle Visibility** (Target = Lumiere, le composant hérité).\n\n' +
        'BP_LampeBase ne change pas : elle reste allumée, sans clignoter.',
    },
    {
      title: 'Le piège',
      body:
        'Oublier Parent: BeginPlay. La lampe clignote… à partir d’une lumière éteinte, et sans sa Puissance : Allumer n’a jamais été appelé pour elle.\n\n' +
        'Dans UE, l’héritage sert à partager une base commune (un ennemi de base, des variantes rapides ou lourdes ; un objet ramassable, puis une clé, une pile).',
    },
    {
      title: 'Est un, ou a un ?',
      body:
        'L’héritage répond à « qu’est-ce que c’est ? » : une lampe clignotante **est une** lampe. Un Blueprint n’a qu’**un** parent : il ne peut pas être à la fois une lampe et une porte.\n\n' +
        'Quand des Blueprints sans rapport partagent un **comportement** (une caisse, un drone et une tourelle qui ont tous une santé), ce n’est pas ce qu’ils sont, c’est ce qu’ils **ont** : un **Actor Component**, écrit une fois et posé sur chacun. C’est l’objet des étapes qui suivent.',
    },
  ],
  objectives: [
    'BP_Clignotante fait tout ce que fait BP_Lampe : elle s’allume au lancement.',
    'Puis elle clignote : sa Lumiere bascule toutes les 0,5 s.',
    'La lampe de base reste allumée sans clignoter. Touche Vérifier.',
  ],
  hints: [
    'Quand l’enfant redéfinit BeginPlay, qu’advient-il du BeginPlay du parent ? Qui appelle Allumer maintenant ?',
    'Nœuds : Event BeginPlay, Parent: BeginPlay, Set Timer by Event (0,5, Looping), Custom Event Clignoter, Toggle Visibility (Target = Lumiere, héritée).',
    'Solution : BeginPlay → Parent: BeginPlay → Set Timer by Event (Clignoter, 0,5, Looping). Clignoter → Toggle Visibility (Lumiere).',
  ],
  challenge: 'Redéfinis Allumer dans BP_Clignotante (même entrées et sorties) pour qu’elle éclaire en rouge (Set Light Color), puis appelle Parent: Allumer.',
  setup: familyProject,
  scenario: [{ wait: 0.2 }, { checkpoint: 'debut' }, { wait: 0.5 }, { checkpoint: 'a' }, { wait: 0.5 }, { checkpoint: 'b' }],
  checks: [
    {
      id: 'inherits',
      label: 'BP_Clignotante hérite de BP_LampeBase',
      test: (cx) => {
        const base = cx.project.classes.find((c) => c.name === 'BP_LampeBase');
        return cx.project.classes.find((c) => c.name === 'BP_Clignotante')?.parentClassId === base?.id
          ? true
          : 'Remets BP_LampeBase comme Parent Class de BP_Clignotante (Class Settings).';
      },
    },
    {
      id: 'parent',
      label: 'Au départ, la lampe clignotante s’allume à sa Puissance (BeginPlay du parent)',
      at: 'debut',
      test: (cx) => {
        const c = light(cx, 'BP_Clignotante');
        if (c?.props.visible && Math.abs(c.props.intensity - 3000) < 1) return true;
        return 'La lampe clignotante ne s’est pas allumée : son Event BeginPlay remplace celui de BP_LampeBase. Ajoute Parent: BeginPlay sur son fil.';
      },
    },
    {
      id: 'blink',
      label: 'Elle s’éteint vers 0,5 s puis se rallume vers 1 s',
      at: 'b',
      test: (cx) => (light(cx, 'BP_Clignotante')?.props.visible ? true : 'À 1,2 s, la lampe clignotante devrait être rallumée (deuxième bascule).'),
    },
    {
      id: 'blink-off',
      label: 'À 0,7 s, la lampe clignotante est éteinte',
      at: 'a',
      test: (cx) => (light(cx, 'BP_Clignotante')?.props.visible ? 'À 0,7 s, la lampe clignotante est encore allumée : le timer (0,5 s, Looping) la bascule-t-il ?' : true),
    },
    {
      id: 'base',
      label: 'La lampe de base reste allumée',
      at: 'a',
      test: (cx) => (light(cx, 'BP_LampeBase')?.props.visible ? true : 'La lampe de base s’est éteinte : le clignotement doit être dans BP_Clignotante seulement, pas dans le parent.'),
    },
    {
      id: 'count',
      label: 'Le tableau compte 2 BP_LampeBase',
      test: (cx) => (printedNumbers(cx).includes('2') ? true : `Le tableau affiche ${printedNumbers(cx).join(', ') || 'rien'} au lieu de 2.`),
    },
    notion(usesNode('call', 'BP_Clignotante', ['call.parentEvent'], 'BP_Clignotante appelle Parent: BeginPlay', 'Place Parent: BeginPlay dans BP_Clignotante.')),
    noRuntimeErrors(),
  ],
  solve(p) {
    const b = edit(p, 'BP_Clignotante');
    const begin = b.node('event.beginPlay', {}, {}, [64, 96]);
    const up = b.node('call.parentEvent', { event: 'event.beginPlay' }, {}, [340, 96]);
    const timer = b.node('time.setTimerByEvent', {}, { time: 0.5, looping: true }, [640, 96]);
    const ev = b.node('event.custom', { name: 'Clignoter' }, {}, [64, 420]);
    const toggle = b.node('component.toggleVisibility', {}, {}, [360, 420]);
    b.link(begin, 'then', up, 'exec').link(up, 'then', timer, 'exec').link(ev, 'delegate', timer, 'event');
    const lumiere = p.classes.find((c) => c.name === 'BP_LampeBase')!.components.find((c) => c.name === 'Lumiere')!.id;
    b.link(ev, 'then', toggle, 'exec').link(b.node('var.component', { component: lumiere }, {}, [200, 600]), 'value', toggle, 'target');
  },
};
