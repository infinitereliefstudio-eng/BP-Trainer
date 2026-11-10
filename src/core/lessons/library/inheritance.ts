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
  number: 0,
  title: 'L’héritage',
  situation:
    'BP_Clignotante est un enfant de BP_LampeBase : il a déjà son pied, sa Lumiere, sa variable Puissance et son BeginPlay qui l’allume. Fais-la clignoter toutes les 0,5 s, sans perdre ce qu’elle hérite.',
  notions: ['Classe parente', 'Hériter', 'Redéfinir un événement', 'Parent: BeginPlay', 'Un enfant est un parent'],
  remember: 'Un Blueprint enfant a tout ce qu’a son parent. Redéfinir un événement remplace la version du parent : Parent: … la rappelle, à l’endroit voulu.',
  cards: [
    {
      title: 'Un Blueprint enfant',
      body:
        'Dans **Class Settings**, la **Parent Class** de BP_Clignotante est **BP_LampeBase**. Ouvre-le : My Blueprint montre ses composants, variables et fonctions **hérités**. Lance Play : elle s’allume déjà, grâce au BeginPlay du parent.\n\n' +
        'Le tableau compte les **BP_LampeBase** du niveau et trouve 2 : un enfant **est** aussi un BP_LampeBase (Cast To BP_LampeBase réussit sur lui).',
    },
    {
      title: 'Redéfinir un événement',
      body:
        'Si BP_Clignotante a son propre **Event BeginPlay**, celui du parent **ne s’exécute plus** pour elle : il est remplacé. Pour garder les deux, place **Parent: BeginPlay** sur le fil (appui long sur ton BeginPlay › Ajouter l’appel au parent).\n\n' +
        'Pareil pour une fonction : une fonction **Allumer** dans l’enfant remplace celle du parent, même quand c’est le graphe du parent qui l’appelle.',
    },
  ],
  objectives: [
    'Dans BP_Clignotante : un Event BeginPlay qui appelle d’abord Parent: BeginPlay.',
    'Puis un timer en Looping toutes les 0,5 s qui bascule la Lumiere (Toggle Visibility).',
    'La lampe de base, elle, reste allumée sans clignoter. Touche Vérifier.',
  ],
  hints: [
    'Sans Parent: BeginPlay, la lampe clignotante ne s’allume plus : Allumer n’est plus appelé pour elle.',
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
