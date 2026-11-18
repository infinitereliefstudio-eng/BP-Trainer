/**
 * V6, Avancé: "Complète C6 — Annuler et refaire" (E41). Every move is
 * recorded as an action (who, from where, to where) in a history, with a
 * position in it. Undo steps back, redo steps forward, and a new move after
 * an undo throws away the actions that could have been redone.
 */
import { addStruct, addStructMember, updateStructMember } from '../../operations/structOps';
import { T } from '../../types/pins';
import { edit, ProjectBuilder } from '../builder';
import { noRuntimeErrors } from '../checks';
import type { CheckContext, Lesson, ScenarioStep } from '../types';
import { editable, fnDef, fnOf, gap, getVar, nodeOf, nodesOf, override, ref, tap, varOf } from './kit';

const STEP = 100;

function undoProject() {
  const pb = new ProjectBuilder('Annuler et refaire');
  const p = pb.project;
  const piece = pb.blueprint('BP_Meuble');
  piece.component('StaticMesh', 'Meuble', { sizeX: 70, sizeY: 70, color: '#a16207', blocks: false });
  const r = addStruct(p, 'S_Action');
  if (!r.ok) throw new Error(r.reason);
  const who = r.value.members[0];
  updateStructMember(p, r.value.id, who.id, { name: 'Cible', type: T.object('BP_Meuble') });
  const before = addStructMember(p, r.value.id, T.vector)!;
  updateStructMember(p, r.value.id, before.id, { name: 'Avant' });
  const after = addStructMember(p, r.value.id, T.vector)!;
  updateStructMember(p, r.value.id, after.id, { name: 'Apres' });

  const tool = pb.blueprint('BP_Outil');
  tool.component('StaticMesh', 'Outil', { shape: 'cylinder', sizeX: 50, sizeY: 50, color: '#0369a1', blocks: false });
  tool.component('TextRender', 'Etiquette', { y: -60, text: 'E déplacer · F annuler · Espace refaire' });
  tool.cls.autoReceiveInput = true;
  tool.variable('Historique', T.array(T.struct('S_Action')), []);
  tool.variable('Position', T.int, 0);
  const sel = editable(tool, 'Selection', T.object('BP_Meuble'));
  const g = (name: string, at: [number, number]) => getVar(tool, name, at);

  // Enregistrer: the new action goes at the end, and Position moves past it. The gap comes first.
  const rec = fnDef(p, tool, 'Enregistrer', [['Action', T.struct('S_Action')]], []);
  const rf = rec.f;
  const push = rf.node('array.add', {}, {}, [900, 0]);
  const next = rf.node('var.incrementInt', {}, {}, [1200, 0]);
  rf.link(rec.entry, 'then', push, 'exec').link(getVar(rf, 'Historique', [720, 200]), 'value', push, 'array').link(rec.entry, rec.pin.Action, push, 'item');
  rf.link(push, 'then', next, 'exec').link(getVar(rf, 'Position', [1040, 200]), 'value', next, 'value').link(next, 'then', rec.ret, 'exec');
  rf.graph.nodes[rec.ret].x = 1500;
  gap(rf, 'Trou 1 : retirer les actions annulées (après Position)', [300, -80], 480, 320);

  // E: move the selected piece 100 cm to the right, and record it.
  const e = tool.node('event.inputKey', { key: 'E' }, {}, [64, 96]);
  const from = tool.node('actor.getLocation', {}, {}, [300, 320]);
  const to = tool.node('math.addVector', {}, { b: { x: STEP, y: 0, z: 0 } }, [520, 400]);
  const action = tool.node('struct.make', { struct: 'S_Action' }, {}, [700, 300]);
  const keep = tool.node('call.function', { graph: rec.graph.id }, {}, [960, 96]);
  const move = tool.node('actor.setLocation', {}, {}, [1280, 96]);
  tool.link(g('Selection', [100, 330]), 'value', from, 'target').link(from, 'result', to, 'a');
  tool.link(g('Selection', [520, 260]), 'value', action, who.id).link(from, 'result', action, before.id).link(to, 'result', action, after.id);
  tool.link(e, 'pressed', keep, 'exec').link(action, 'struct', keep, rec.pin.Action).link(keep, 'then', move, 'exec').link(g('Selection', [1100, 300]), 'value', move, 'target').link(to, 'result', move, 'location');

  // Space: redo, the model for undo.
  const space = tool.node('event.inputKey', { key: 'SpaceBar' }, {}, [64, 760]);
  const can = tool.node('flow.branch', {}, {}, [560, 760]);
  const len = tool.node('array.length', {}, {}, [220, 1000]);
  const lt = tool.node('math.lessInt', {}, {}, [400, 960]);
  const item = tool.node('array.get', {}, {}, [560, 1080]);
  const parts = tool.node('struct.break', { struct: 'S_Action' }, {}, [760, 1080]);
  const alive = tool.node('flow.isValid', {}, {}, [860, 760]);
  const redo = tool.node('actor.setLocation', {}, {}, [1160, 700]);
  const forward = tool.node('var.incrementInt', {}, {}, [1500, 760]);
  tool.link(space, 'pressed', can, 'exec').link(g('Position', [220, 920]), 'value', lt, 'a').link(g('Historique', [40, 1010]), 'value', len, 'array').link(len, 'result', lt, 'b').link(lt, 'result', can, 'condition');
  tool.link(g('Historique', [380, 1090]), 'value', item, 'array').link(g('Position', [380, 1160]), 'value', item, 'index').link(item, 'item', parts, 'struct');
  tool.link(can, 'true', alive, 'exec').link(parts, who.id, alive, 'object').link(alive, 'valid', redo, 'exec').link(parts, who.id, redo, 'target').link(parts, after.id, redo, 'location');
  tool.link(redo, 'then', forward, 'exec').link(alive, 'notValid', forward, 'exec').link(g('Position', [1340, 940]), 'value', forward, 'value');

  // F: undo, to write.
  tool.node('event.inputKey', { key: 'F' }, {}, [64, 1500]);
  gap(tool, 'Trou 2 : Annuler (reculer Position, remettre le meuble à Avant)', [340, 1420], 900, 420);

  const m = pb.place(piece, 0, 0);
  const t = pb.place(tool, -200, -260);
  override(pb, t, sel, ref(m));
  pb.playerStart(-200, 300);
  return pb.project;
}

const x = (cx: CheckContext) => Math.round(cx.actor('BP_Meuble')?.x ?? Number.NaN);
const many = (key: 'E' | 'F' | 'SpaceBar', n: number): ScenarioStep[] => Array.from({ length: n }, () => tap(key)).flat();

function at(id: string, when: string | undefined, label: string, want: number, why: string) {
  return { id, label, at: when, test: (cx: CheckContext) => (x(cx) === want ? true : `Le meuble est à X = ${x(cx)} ; attendu : ${want}. ${why}`) };
}

export const complete6: Lesson = {
  id: 'c6-annuler',
  kind: 'complete',
  code: 'C6',
  module: 'Données',
  level: 'avance',
  number: 0,
  title: 'Annuler et refaire',
  situation:
    'Un outil de décor : E déplace le meuble de 100 cm vers la droite et note ce déplacement dans un historique. Espace refait un déplacement annulé (c’est écrit). F doit annuler le dernier déplacement, et un nouveau déplacement fait après une annulation doit effacer ce qui pouvait encore être refait. Deux trous, dans les cadres jaunes.',
  notions: ['Historique d’actions', 'Structure', 'Tableau (Array)', 'Get (a copy)', 'Remove Index', 'Last Index', 'While Loop', 'Is Valid'],
  remember:
    'Annuler et refaire, c’est un tableau d’actions et un seul nombre : la position où on en est. Chaque action retient de quoi revenir en arrière (l’état d’avant) et de quoi repartir en avant (l’état d’après). Annuler recule la position, refaire l’avance, et une nouvelle action coupe tout ce qui se trouve après elle.',
  cards: [
    {
      title: 'Le modèle',
      body:
        'Une **S_Action** retient un déplacement : `Cible` (le meuble), `Avant` (sa position avant) et `Apres` (sa position après). Avec ces trois valeurs, on peut le défaire comme le refaire, sans rien recalculer.\n\n' +
        '**BP_Outil** garde `Historique`, un tableau de S_Action, et `Position`, un Integer : **le nombre d’actions actuellement appliquées**.\n\n' +
        'Après trois déplacements : Historique = [A0, A1, A2], Position = 3. Après une annulation : le tableau n’a pas changé, Position = 2. L’action A2 est toujours là, « devant » la position : c’est elle que Refaire rejouera.\n\n' +
        'Retiens ce dessin : les actions **avant** Position sont faites, celles **à partir de** Position sont annulées.',
    },
    {
      title: 'Lire Refaire, écrire Annuler',
      body:
        '**Refaire** (IA_Refaire, Espace) est écrit, lis-le d’abord. S’il reste une action devant (`Position < Length`), il prend l’action à l’index `Position` (**Get (a copy)**), l’éclate avec **Break S_Action**, vérifie que la `Cible` existe encore (**Is Valid**), la met à `Apres`, puis avance `Position` (**Increment Int**).\n\n' +
        '**Annuler** (IA_Annuler, F) est son miroir, à écrire dans le Trou 2 :\n\n' +
        '1. Rien à annuler si `Position` vaut 0 : un **Branch** sur `Position > 0`.\n' +
        '2. **Recule d’abord** : **Decrement Int** sur `Position`. La dernière action faite est maintenant à l’index `Position`.\n' +
        '3. Get (a copy) à cet index, Break S_Action, Is Valid sur `Cible`, puis **Set Actor Location** avec `Avant`.\n\n' +
        'L’ordre « reculer puis lire » compte : les index commencent à 0, donc avec Position = 3, la dernière action faite est à l’index 2.',
    },
    {
      title: 'Couper la branche',
      body:
        'Trois déplacements, une annulation, puis un **nouveau** déplacement. L’ancienne action A2 n’a plus de sens : on ne « refait » pas quelque chose qui partait d’un état qui n’existe plus.\n\n' +
        'Dans la fonction **Enregistrer**, le Trou 1 passe avant le Add : tant que le tableau est plus long que `Position`, retire son dernier élément.\n\n' +
        '- **While Loop**, avec pour Condition `Length (Historique) > Position`.\n' +
        '- Dans Loop Body : **Remove Index** avec **Last Index** (Historique).\n' +
        '- **Completed** rejoint le Add déjà en place.\n\n' +
        'Sans cette coupe, la nouvelle action s’ajoute après A2 et `Position` ne désigne plus la bonne case : les annulations suivantes remettent le meuble au mauvais endroit.',
    },
    {
      title: 'Pourquoi Is Valid',
      body:
        'L’historique garde des **références** vers des acteurs. Si un meuble est détruit entre-temps, son action pointe vers un acteur qui n’existe plus : s’en servir provoque une erreur Accessed None.\n\n' +
        '**Is Valid** (la version avec fil blanc) a deux sorties : Is Valid et Is Not Valid. Sur Is Not Valid, on ne déplace rien, mais on **change quand même** `Position` : l’action est passée, même si elle n’a plus d’effet.\n\n' +
        'Dans UE, un vrai historique ne garderait pas la référence mais un identifiant stable de l’objet, pour survivre à une sauvegarde. Le principe du tableau et de la position reste le même.',
    },
  ],
  objectives: [
    'Trou 2, sur IA_Annuler (F) : si Position > 0, recule Position (Decrement Int), puis remets la Cible de l’action à cet index à sa position Avant (si elle est valide).',
    'Trou 1, dans Enregistrer : avant le Add, retire la dernière action tant que Length (Historique) > Position.',
    'Touche Vérifier : deux déplacements, deux annulations, deux rétablissements, puis une annulation suivie d’un nouveau déplacement.',
  ],
  hints: [
    'Commence par le Trou 2 en t’inspirant de Refaire, nœud pour nœud : seuls changent le sens (Decrement, et avant la lecture) et la position appliquée (Avant).',
    'Nœuds. Trou 2 : Get Position, Greater (Integer), Branch, Decrement Int, Get Historique, Get (a copy), Break S_Action, Is Valid, Set Actor Location. Trou 1 : While Loop, Length, Get Position, Greater (Integer), Remove Index, Last Index.',
    'Solution. IA_Annuler → Branch (Position > 0) → Decrement Int (Position) → Is Valid (Cible de Historique[Position]) → Set Actor Location (Cible, Avant). Enregistrer : entrée → While Loop (Length (Historique) > Position) → Loop Body : Remove Index (Historique, Last Index (Historique)) ; Completed → Add.',
  ],
  challenge: 'Limite l’historique à 10 actions : dans Enregistrer, après le Add, si Length dépasse 10, retire l’action d’index 0 et recule Position de 1.',
  setup: undoProject,
  scenario: [
    { wait: 0.2 },
    ...many('E', 2),
    { checkpoint: 'deux' },
    ...many('F', 2),
    { checkpoint: 'annule' },
    ...tap('F'),
    ...many('SpaceBar', 2),
    { checkpoint: 'refait' },
    ...tap('F'),
    ...tap('E'),
    ...tap('SpaceBar'),
    { checkpoint: 'branche' },
    ...many('F', 2),
  ],
  checks: [
    at('moved', 'deux', 'Deux déplacements : le meuble est à X = 200', 2 * STEP, 'Le déplacement sur E ne doit pas changer.'),
    at('undone', 'annule', 'Deux annulations : retour à X = 0', 0, 'F doit reculer Position puis remettre la Cible à la position Avant de l’action à cet index.'),
    at('redone', 'refait', 'Une annulation de trop ne fait rien, puis deux rétablissements : X = 200', 2 * STEP, 'Avec Position à 0, F ne doit rien faire (ni reculer Position sous 0) ; Espace rejoue ensuite les deux actions.'),
    {
      id: 'cut',
      label: 'Annuler, puis un nouveau déplacement : l’historique ne garde que 2 actions',
      at: 'branche',
      test: (cx) => {
        const n = (varOf(cx, 'BP_Outil', 'Historique') as unknown[] | undefined)?.length ?? 0;
        if (n !== 2) return `L’historique contient ${n} actions au lieu de 2 : avant d’ajouter la nouvelle, Enregistrer doit retirer celles qui se trouvent après Position.`;
        return x(cx) === 2 * STEP ? true : `Le meuble est à X = ${x(cx)} au lieu de 200 : après un nouveau déplacement, il n’y a plus rien à refaire.`;
      },
    },
    at('back', undefined, 'Deux annulations ramènent le meuble à X = 0', 0, 'Les annulations ne suivent plus les bons déplacements : une action annulée est restée dans l’historique, devant la nouvelle.'),
    noRuntimeErrors(),
  ],
  solve(p) {
    const tool = edit(p, 'BP_Outil');
    const s = p.structs.find((v) => v.name === 'S_Action')!;
    const who = s.members.find((m) => m.name === 'Cible')!.id;
    const before = s.members.find((m) => m.name === 'Avant')!.id;
    const g = (name: string, pos: [number, number]) => getVar(tool, name, pos);
    // Trou 2: undo.
    const f = nodesOf(tool.graph, 'event.inputKey').find((n) => n.config.key === 'F')!.id;
    const some = tool.node('math.greaterInt', {}, { b: 0 }, [400, 1700]);
    const can = tool.node('flow.branch', {}, {}, [560, 1500]);
    const back = tool.node('var.decrementInt', {}, {}, [840, 1500]);
    const item = tool.node('array.get', {}, {}, [840, 1760]);
    const parts = tool.node('struct.break', { struct: 'S_Action' }, {}, [1040, 1760]);
    const alive = tool.node('flow.isValid', {}, {}, [1140, 1500]);
    const undo = tool.node('actor.setLocation', {}, {}, [1440, 1500]);
    tool.link(f, 'pressed', can, 'exec').link(g('Position', [240, 1710]), 'value', some, 'a').link(some, 'result', can, 'condition');
    tool.link(can, 'true', back, 'exec').link(g('Position', [680, 1680]), 'value', back, 'value');
    tool.link(g('Historique', [660, 1770]), 'value', item, 'array').link(g('Position', [660, 1840]), 'value', item, 'index').link(item, 'item', parts, 'struct');
    tool.link(back, 'then', alive, 'exec').link(parts, who, alive, 'object').link(alive, 'valid', undo, 'exec').link(parts, who, undo, 'target').link(parts, before, undo, 'location');
    // Trou 1: drop what could have been redone.
    const rec = fnOf(tool, 'Enregistrer');
    const rf = rec.f;
    const push = nodeOf(rec.graph, 'array.add');
    for (const l of Object.values(rec.graph.links)) if (l.from.node === rec.entry && l.from.pin === 'then') delete rec.graph.links[l.id];
    const loop = rf.node('flow.whileLoop', {}, {}, [340, 0]);
    const len = rf.node('array.length', {}, {}, [60, 220]);
    const longer = rf.node('math.greaterInt', {}, {}, [200, 220]);
    const drop = rf.node('array.removeIndex', {}, {}, [600, 60]);
    const last = rf.node('array.lastIndex', {}, {}, [440, 300]);
    rf.link(rec.entry, 'then', loop, 'exec').link(getVar(rf, 'Historique', [-100, 230]), 'value', len, 'array').link(len, 'result', longer, 'a').link(getVar(rf, 'Position', [40, 320]), 'value', longer, 'b').link(longer, 'result', loop, 'condition');
    rf.link(loop, 'body', drop, 'exec').link(getVar(rf, 'Historique', [440, 220]), 'value', drop, 'array').link(getVar(rf, 'Historique', [280, 310]), 'value', last, 'array').link(last, 'result', drop, 'index');
    rf.link(loop, 'completed', push, 'exec');
  },
};
