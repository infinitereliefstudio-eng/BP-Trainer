/**
 * Lot 4a of the path plan: « Le levier universel », the first Avancé step
 * built from the level: the learner creates the lever Blueprint (its
 * components, its variables), the interface it speaks, and places two
 * levers on the marked plots. One Blueprint for every lever of the station:
 * each placed lever has its own list of targets (Instance Editable), and
 * the targets each react their own way (interface with a parameter).
 */
import type { Project } from '../../model/project';
import { implementInterface } from '../../operations/classOps';
import { addInterfaceParam } from '../../operations/interfaceOps';
import { placeActor } from '../../operations/levelOps';
import { addClass, addInterface, addInterfaceFunction } from '../../operations/projectOps';
import { T } from '../../types/pins';
import { ClassBuilder, edit, ProjectBuilder } from '../builder';
import { noRuntimeErrors, notion, usesNode } from '../checks';
import type { CheckContext, Lesson } from '../types';
import { ensurePlayerInput } from '../ue5Input';
import { goTo, tap } from './kit';
import { playerBlueprint } from './props';

const PLOT_A: [number, number] = [-300, 0];
const PLOT_B: [number, number] = [300, 0];
const TARGETS = ['BP_Porte', 'BP_Lampe', 'BP_Pont'];

/** The player's side, as built at the end of the Confirmé: IA_Interagir → Get Overlapping Actors → For Each → Interagir (Message). */
export function playerTells(player: ClassBuilder, action: string, iface: string, fn: string): void {
  const ev = player.node('input.action', { action }, {}, [64, 96]);
  const over = player.node('actor.getOverlappingActors', {}, {}, [340, 96]);
  const loop = player.node('flow.forEachLoop', {}, {}, [660, 96]);
  const msg = player.node('iface.message', { interface: iface, fn }, {}, [980, 96]);
  player.link(ev, 'started', over, 'exec').link(over, 'then', loop, 'exec').link(over, 'actors', loop, 'array');
  player.link(loop, 'body', msg, 'exec').link(loop, 'element', msg, 'target');
}

function project(): Project {
  const pb = new ProjectBuilder('Le levier universel');
  const { b: player } = playerBlueprint(pb);
  const p = pb.project;
  // The interface the player speaks exists (it is the station's); the player's graph is the learner's.
  const r = addInterface(p, 'BPI_Interactif');
  if (!r.ok) throw new Error(r.reason);
  addInterfaceFunction(p, r.value.id, 'Interagir');
  ensurePlayerInput(p, ['E'], { E: 'IA_Interagir' });
  void player;

  const plot = pb.blueprint('BP_Plot');
  plot.component('StaticMesh', 'Marque', { shape: 'cylinder', sizeX: 90, sizeY: 90, color: '#334155', blocks: false });
  plot.component('TextRender', 'Lettre', { y: -70, text: '?' });
  const label = plot.variable('Lettre', T.string, '?');
  plot.cls.variables[0].instanceEditable = true;
  const { b: cs, entry } = plot.construction();
  const set = cs.node('component.setText', {}, {}, [360, 96]);
  cs.link(entry, 'then', set, 'exec').link(cs.node('var.get', { variable: label }, {}, [200, 300]), 'value', set, 'value').target('Lettre', set);
  for (const [at, letter] of [
    [PLOT_A, 'A'],
    [PLOT_B, 'B'],
  ] as const) {
    const id = pb.place(plot, ...at);
    p.level.actors.find((a) => a.id === id)!.overrides[label] = letter;
  }

  const door = pb.blueprint('BP_Porte');
  door.component('StaticMesh', 'Porte', { shape: 'door', sizeX: 180, sizeY: 16, color: '#a0703c' });
  pb.place(door, -450, -420);
  const lamp = pb.blueprint('BP_Lampe');
  lamp.component('StaticMesh', 'Pied', { shape: 'cylinder', sizeX: 40, sizeY: 40, color: '#6b7280' });
  lamp.component('PointLight', 'Lumiere', { visible: false, radius: 260 });
  pb.place(lamp, -150, -420);
  const bridge = pb.blueprint('BP_Pont');
  bridge.component('StaticMesh', 'Tablier', { sizeX: 300, sizeY: 120, color: '#78716c', visible: false, blocks: false });
  pb.place(bridge, 400, -420);
  pb.playerStart(0, 250);
  return p;
}

// ------------------------------------------------------------------ checks

const doorOpen = (cx: CheckContext) => Math.abs(Math.abs(cx.component('BP_Porte', 'Porte')?.props.yaw ?? 0) - 90) < 1;
const lampOn = (cx: CheckContext) => cx.component('BP_Lampe', 'Lumiere')?.props.visible === true;
const bridgeUp = (cx: CheckContext) => cx.component('BP_Pont', 'Tablier')?.props.visible === true;
const state = (cx: CheckContext) => `porte ${doorOpen(cx) ? 'ouverte' : 'fermée'}, lampe ${lampOn(cx) ? 'allumée' : 'éteinte'}, pont ${bridgeUp(cx) ? 'visible' : 'caché'}`;

/** The placed levers, and whether each plot has one. */
function levers(cx: CheckContext): string | undefined {
  const all = cx.project.level.actors.filter((a) => cx.project.classes.find((c) => c.id === a.classId)?.name === 'BP_Levier');
  if (!cx.project.classes.some((c) => c.name === 'BP_Levier')) return 'Crée le Blueprint BP_Levier (Content Drawer › + Add › Blueprint Class › Actor).';
  if (all.length !== 2) return `${all.length} BP_Levier posé(s) dans le niveau : il en faut deux, un sur chaque plot.`;
  for (const [at, letter] of [
    [PLOT_A, 'A'],
    [PLOT_B, 'B'],
  ] as const) {
    if (!all.some((a) => Math.hypot(a.x - at[0], a.y - at[1]) <= 80)) return `Aucun levier sur le plot ${letter} : pose un BP_Levier dessus (à moins de 80 cm de son centre).`;
  }
  return undefined;
}

export const lessonUniversalLever: Lesson = {
  id: 'l-levier-universel',
  module: 'Communication',
  level: 'avance',
  number: 0,
  title: 'Le levier universel',
  situation:
    'Un seul Blueprint de levier pour toute la station. Le levier du plot A commande la porte et la lampe, celui du plot B le pont. Chacun connaît ses cibles, sans savoir ce qu’elles sont.',
  recalls: ['loops', 'rotation', 'enhanced-input', 'input'],
  notions: ['Levier réutilisable', 'Interface avec entrée et sortie', 'Instance Editable', 'Tableau de références'],
  remember:
    'Un Blueprint réutilisable ne connaît pas ses cibles par leur classe : une liste Instance Editable, réglée sur chaque acteur posé, et un message d’interface avec un paramètre. Ajouter un levier ou une cible ne demande aucune ligne de graphe.',
  cards: [
    {
      title: 'Cahier des charges',
      body:
        'Déjà là : le projet UE5 (IMC_Joueur : E → IA_Interagir), l’interface **BPI_Interactif** (fonction Interagir), un **BP_Joueur** au graphe vide. **BP_Porte**, **BP_Lampe** (éteinte) et **BP_Pont** (son Tablier est caché) ont leurs composants, et des graphes vides. Deux **BP_Plot**, A et B, marquent où poser les leviers.\n\n' +
        '- E prévient ce qui est à portée du joueur, quoi que ce soit (comme à la fin du Confirmé).\n' +
        '- Crée **BP_Levier** : un manche que l’on voit, une **Zone** qui couvre le plot, et une liste de cibles **réglable sur chaque levier posé**.\n' +
        '- **Pose deux leviers**, un sur chaque plot. Celui de A commande la **porte** et la **lampe** ; celui de B le **pont**.\n' +
        '- E près d’un levier le **bascule** et prévient ses cibles du nouvel état : **activé**, la porte s’ouvre (Yaw 90), la lampe s’allume, le pont apparaît ; **désactivé**, tout revient.\n' +
        '- **BP_Levier ne connaît aucune cible par sa classe** : pas de Cast, pas de variable de type BP_Porte, BP_Lampe ou BP_Pont.',
    },
    {
      title: 'Ce qui est nouveau',
      body:
        'Jusqu’ici, les Blueprints étaient prêts : tu les remplissais. En Avancé, tu les **crées** : la classe, ses composants, ses variables, l’interface qu’ils parlent, et les acteurs posés dans le niveau.\n\n' +
        'Les vérifications cherchent **BP_Levier** par son nom, et les leviers posés près des plots.',
    },
  ],
  objectives: [
    'E prévient ce qui est à portée du joueur (BPI_Interactif).',
    'Crée BP_Levier et pose-en un sur chaque plot.',
    'E au plot A : la porte s’ouvre et la lampe s’allume ; le pont ne bouge pas.',
    'E au plot B : le pont apparaît. E à nouveau au plot A : porte fermée, lampe éteinte.',
    'BP_Levier ne connaît ses cibles par aucune classe.',
  ],
  hints: [
    'Comment un même Blueprint peut-il viser des cibles différentes selon l’endroit où il est posé ? Et comment prévenir des acteurs de classes différentes, en leur passant le nouvel état ?',
    'IA_Interagir, Get Overlapping Actors, For Each Loop, Interagir (Message) dans BP_Joueur ; BPI_Activable (fonction Activer, entrée Etat), BP_Levier (Static Mesh, Box Collision, variable Cibles tableau d’Actor Instance Editable, variable bActive), Event Interagir, NOT, For Each Loop, Activer (Message), Branch, Set Relative Rotation, Set Visibility.',
    'Solution : BP_Joueur : IA_Interagir (Started) → Get Overlapping Actors → For Each Loop → Interagir (Message). BPI_Activable avec Activer (entrée Boolean Etat), implémentée par les trois cibles (porte : Branch Etat → Set Relative Rotation Yaw 90 ou 0 ; lampe : Set Visibility Lumiere = Etat ; pont : Set Visibility Tablier = Etat). BP_Levier implémente BPI_Interactif : Event Interagir → Set bActive = NOT bActive → For Each Loop (Cibles) → Activer (Message), Target = Array Element, Etat = bActive. Levier A : Cibles = porte, lampe ; levier B : Cibles = pont.',
  ],
  challenge: 'Pose un troisième levier qui commande la lampe aussi : que se passe-t-il quand deux leviers se contredisent ? Comment la lampe pourrait-elle compter ses demandes ?',
  setup: project,
  scenario: [{ wait: 0.2 }, ...goTo(...PLOT_A), ...tap('E'), { wait: 0.1 }, { checkpoint: 'a1' }, ...goTo(...PLOT_B), ...tap('E'), { wait: 0.1 }, { checkpoint: 'b1' }, ...goTo(...PLOT_A), ...tap('E'), { wait: 0.1 }],
  checks: [
    { id: 'placed', label: 'BP_Levier existe, un levier sur chaque plot', test: (cx) => levers(cx) ?? true },
    {
      id: 'a-on',
      label: 'E au plot A : la porte s’ouvre et la lampe s’allume, le pont ne bouge pas',
      at: 'a1',
      test: (cx) => (doorOpen(cx) && lampOn(cx) && !bridgeUp(cx) ? true : `Après E au plot A : ${state(cx)}.`),
    },
    {
      id: 'b-on',
      label: 'E au plot B : le pont apparaît, la porte et la lampe restent',
      at: 'b1',
      test: (cx) => (doorOpen(cx) && lampOn(cx) && bridgeUp(cx) ? true : `Après E au plot B : ${state(cx)}.`),
    },
    {
      id: 'a-off',
      label: 'E à nouveau au plot A : porte fermée, lampe éteinte, le pont reste',
      test: (cx) => (!doorOpen(cx) && !lampOn(cx) && bridgeUp(cx) ? true : `Après le second E au plot A : ${state(cx)}. Le levier doit basculer, et envoyer son nouvel état.`),
    },
    {
      id: 'universal',
      label: 'BP_Levier ne connaît ses cibles par aucune classe',
      test: (cx) => {
        const lever = cx.project.classes.find((c) => c.name === 'BP_Levier');
        if (!lever) return 'BP_Levier est introuvable.';
        if (cx.nodes('BP_Levier').some((n) => n.def === 'cast.to')) return 'BP_Levier fait un Cast : avec un message d’interface, il n’a pas besoin de savoir ce qu’est sa cible.';
        const typed = lever.variables.find((v) => v.type.category === 'object' && TARGETS.includes(String(v.type.subtype)));
        return typed ? `La variable ${typed.name} de BP_Levier est de type ${typed.type.subtype} : un levier universel garde des Actor, pas une classe précise.` : true;
      },
    },
    notion(usesNode('message', 'BP_Levier', ['iface.message'], 'Le levier prévient ses cibles par un message d’interface', 'BP_Levier doit envoyer un message d’interface à chacune de ses cibles.')),
    noRuntimeErrors(),
  ],
  solve(p) {
    const r = addInterface(p, 'BPI_Activable');
    if (!r.ok) throw new Error(r.reason);
    addInterfaceFunction(p, r.value.id, 'Activer');
    const iface = r.value.id;
    const fn = r.value.functions[0].id;
    const etat = addInterfaceParam(p, iface, fn, 'inputs', T.bool)!;
    etat.name = 'Etat';
    const interact = p.interfaces.find((i) => i.name === 'BPI_Interactif')!;
    playerTells(edit(p, 'BP_Joueur'), p.inputActions.find((a) => a.name === 'IA_Interagir')!.id, interact.id, interact.functions[0].id);

    const reacts = (name: string, build: (b: ClassBuilder, ev: string) => void) => {
      const b = edit(p, name);
      implementInterface(b.cls, iface);
      build(b, b.node('event.interface', { interface: iface, fn }, {}, [64, 96]));
    };
    reacts('BP_Porte', (b, ev) => {
      const br = b.node('flow.branch', {}, {}, [360, 96]);
      const open = b.node('component.setRelativeRotation', {}, { rotation: { x: 0, y: 0, z: 90 } }, [700, 40]);
      const close = b.node('component.setRelativeRotation', {}, { rotation: { x: 0, y: 0, z: 0 } }, [700, 300]);
      b.link(ev, 'then', br, 'exec').link(ev, etat.id, br, 'condition').link(br, 'true', open, 'exec').link(br, 'false', close, 'exec').target('Porte', open).target('Porte', close);
    });
    for (const [name, comp] of [
      ['BP_Lampe', 'Lumiere'],
      ['BP_Pont', 'Tablier'],
    ] as const) {
      reacts(name, (b, ev) => {
        const vis = b.node('component.setVisibility', {}, {}, [400, 96]);
        b.link(ev, 'then', vis, 'exec').link(ev, etat.id, vis, 'visible').target(comp, vis);
      });
    }

    const made = addClass(p, 'BP_Levier', 'Actor');
    if (!made.ok) throw new Error(made.reason);
    const b = new ClassBuilder(made.value, p);
    b.component('StaticMesh', 'Manche', { sizeX: 20, sizeY: 70, color: '#eab308', blocks: false });
    b.component('BoxCollision', 'Zone', { sizeX: 180, sizeY: 180 });
    const cibles = b.variable('Cibles', T.array(T.object('Actor')), []);
    const active = b.variable('bActive', T.bool, false);
    made.value.variables.find((v) => v.id === cibles)!.instanceEditable = true;
    implementInterface(made.value, interact.id);
    const ev = b.node('event.interface', { interface: interact.id, fn: interact.functions[0].id }, {}, [64, 96]);
    const not = b.node('logic.not', {}, {}, [240, 320]);
    const set = b.node('var.set', { variable: active }, {}, [360, 96]);
    const loop = b.node('flow.forEachLoop', {}, {}, [680, 96]);
    const msg = b.node('iface.message', { interface: iface, fn }, {}, [1000, 96]);
    b.link(b.node('var.get', { variable: active }, {}, [64, 320]), 'value', not, 'a').link(not, 'result', set, 'value');
    b.link(ev, 'then', set, 'exec').link(set, 'then', loop, 'exec').link(b.node('var.get', { variable: cibles }, {}, [520, 320]), 'value', loop, 'array');
    b.link(loop, 'body', msg, 'exec').link(loop, 'element', msg, 'target').link(b.node('var.get', { variable: active }, {}, [860, 340]), 'value', msg, etat.id);

    const id = (name: string) => `actor:${p.level.actors.find((a) => p.classes.find((c) => c.id === a.classId)?.name === name)!.id}`;
    for (const [at, targets] of [
      [PLOT_A, ['BP_Porte', 'BP_Lampe']],
      [PLOT_B, ['BP_Pont']],
    ] as const) {
      const placed = placeActor(p, made.value.id, at[0], at[1]);
      if (!placed.ok) throw new Error(placed.reason);
      placed.value.overrides[cibles] = targets.map(id);
    }
  },
};
