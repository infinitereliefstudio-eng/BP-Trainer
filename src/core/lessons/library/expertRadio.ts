/**
 * Lot 4b of the path plan: Expert project X1 « La radio de la station »,
 * the first piece of the narrative-game suite modelled on Station enterrée
 * (BACKLOG: dialogue in a Data Table, facts learned, a code door). Built
 * from the scenery: the writer's data (DT_Radio) and the UE5 template are
 * there, every Blueprint, interface and Input asset is the learner's. During
 * the conversation the Player Controller's subsystem gets a dialogue
 * Mapping Context of higher priority, the real UE5 pattern.
 */
import type { Project } from '../../model/project';
import { implementInterface } from '../../operations/classOps';
import { addInputAction, addMapping, addMappingContext } from '../../operations/inputOps';
import { placeActor } from '../../operations/levelOps';
import { addClass, addInterface, addInterfaceFunction } from '../../operations/projectOps';
import { T } from '../../types/pins';
import { ClassBuilder, edit, ProjectBuilder } from '../builder';
import { countPrints, noRuntimeErrors, normText, notion, usesNode } from '../checks';
import type { CheckContext, Lesson, LessonCard } from '../types';
import { ensurePlayerInput } from '../ue5Input';
import { goTo, tap } from './kit';
import { playerBlueprint } from './props';
import { makeStruct, makeTable } from './tables';
import { playerTells } from './universalLever';

const RADIO_AT: [number, number] = [-350, -200];
const DOOR_AT: [number, number] = [350, -200];
const LINES: [string, string, string, string, string][] = [
  ['R1', 'Opératrice', 'Ici le poste de surface. Vous m’entendez ?', 'R2', ''],
  ['R2', 'Opératrice', 'Le code de la porte est 4-1-7.', 'R3', 'CodePorte'],
  ['R3', 'Opératrice', 'Bonne chance là-dessous.', '', ''],
];
const lineText = (i: number) => `${LINES[i][1]} : ${LINES[i][2]}`;

/** Scenery: walls, and a plot marking where each Blueprint goes. */
export function expertScenery(pb: ProjectBuilder, plots: [[number, number], string][]): void {
  const wall = pb.blueprint('BP_Decor');
  wall.component('StaticMesh', 'Mur', { sizeX: 40, sizeY: 900, color: '#374151' });
  pb.place(wall, -800, 0);
  pb.place(wall, 800, 0);
  const plot = pb.blueprint('BP_Plot');
  plot.component('StaticMesh', 'Marque', { shape: 'cylinder', sizeX: 90, sizeY: 90, color: '#334155', blocks: false });
  plot.component('TextRender', 'Lettre', { y: -70, text: '?' });
  const label = plot.variable('Lettre', T.string, '?');
  plot.cls.variables[0].instanceEditable = true;
  const { b: cs, entry } = plot.construction();
  const set = cs.node('component.setText', {}, {}, [360, 96]);
  cs.link(entry, 'then', set, 'exec').link(cs.node('var.get', { variable: label }, {}, [200, 300]), 'value', set, 'value').target('Lettre', set);
  for (const [at, letter] of plots) {
    const id = pb.place(plot, ...at);
    pb.project.level.actors.find((a) => a.id === id)!.overrides[label] = letter;
  }
}

/** The card every Expert project shares. */
export const EXPERT_RULES: LessonCard = {
  title: 'Un projet Expert',
  body:
    'Un projet long, à faire en plusieurs séances : ton travail est gardé entre deux ouvertures. Il n’y a ni indice ni liste de nœuds. Après une vérification ratée, « Montre-moi » dit où la partie s’est arrêtée ; après la réussite, la solution de référence et le bilan s’ouvrent pour comparer.\n\n' +
    'Les vérifications cherchent les Blueprints par le nom que donne le cahier des charges, et les acteurs posés près des plots.',
};

function project(): Project {
  const pb = new ProjectBuilder('La radio de la station');
  playerBlueprint(pb);
  expertScenery(pb, [
    [RADIO_AT, 'R'],
    [DOOR_AT, 'P'],
  ]);
  const p = pb.project;
  const ids = makeStruct(p, 'S_Replique', [
    ['Personnage', T.string],
    ['Texte', T.string],
    ['Suivante', T.name],
    ['Donne', T.name],
  ]);
  makeTable(
    p,
    'DT_Radio',
    'S_Replique',
    ids,
    LINES.map(([row, who, text, next, gives]) => [row, { Personnage: who, Texte: text, Suivante: next, Donne: gives }]),
  );
  ensurePlayerInput(p, ['E'], { E: 'IA_Interagir' });
  pb.playerStart(0, 250);
  return p;
}

// ------------------------------------------------------------------ checks

const classIs = (cx: CheckContext, name: string, at: [number, number]) =>
  cx.project.level.actors.some((a) => cx.project.classes.find((c) => c.id === a.classId)?.name === name && Math.hypot(a.x - at[0], a.y - at[1]) <= 80);
const said = (cx: CheckContext, i: number) => cx.prints().filter((t) => normText(t) === normText(lineText(i))).length;
const doorOpen = (cx: CheckContext) => {
  const a = cx.sim.actors.find((x) => x.className === 'BP_PorteCode');
  return !!a?.components.some((c) => c.kind === 'StaticMesh' && Math.abs(Math.abs(c.props.yaw) - 90) < 1);
};

export const expertRadio: Lesson = {
  id: 'x1-radio',
  module: 'Projet Expert',
  level: 'expert',
  number: 0,
  title: 'La radio de la station',
  situation:
    'Une radio et une porte à code. La radio diffuse un dialogue écrit dans une Data Table ; pendant la conversation, E fait avancer les répliques et F raccroche. Ce qu’on y apprend est noté dans le journal du joueur, et la porte ne s’ouvre qu’à qui connaît le code.',
  recalls: ['player-controller', 'enhanced-input', 'data-tables', 'structs', 'sets', 'interfaces', 'cast', 'other-bp'],
  notions: ['Projet Expert', 'Mapping Context de dialogue', 'Journal de faits', 'Dialogue par les données'],
  remember:
    'Un mode de jeu (dialogue, menu, véhicule) est un Mapping Context de plus haute priorité, ajouté puis retiré par le Subsystem du Player Controller : la même touche change de sens sans qu’aucun Blueprint ne teste dans quel mode il est.',
  cards: [
    {
      title: 'Cahier des charges',
      body:
        'Déjà là : le projet UE5 (IMC_Joueur : E → IA_Interagir, ajouté par BP_PlayerController), **S_Replique** (Personnage, Texte, Suivante, Donne) et **DT_Radio** (R1, R2, R3 : la ligne R2 donne le fait `CodePorte`), un BP_Joueur au graphe vide, deux plots **R** et **P**. Tout le reste est à créer.\n\n' +
        '1. **BP_Radio**, posée sur le plot R. E près d’elle **ouvre la conversation** à la réplique R1 et l’affiche : `Personnage : Texte`.\n' +
        '2. **Pendant la conversation**, E affiche la réplique **suivante**, et F **raccroche**. E ne doit plus rien faire d’autre (ne pas relancer la conversation).\n' +
        '3. Une réplique qui **donne un fait** le note dans le **journal** du joueur (sans doublon) et affiche `Noté : CodePorte`.\n' +
        '4. Après la dernière réplique, ou sur F : `Fin de la conversation`, et E redevient la touche d’interaction.\n' +
        '5. **BP_PorteCode**, posée sur le plot P. E près d’elle : si le journal contient `CodePorte`, elle s’ouvre (un Static Mesh à Yaw 90) ; sinon `Code inconnu`.\n\n' +
        'Contrainte UE5 : les touches arrivent au joueur ; **le changement de sens de E et F passe par un Mapping Context** ajouté puis retiré pendant la conversation, pas par des Branch qui testent un mode.',
    },
    {
      title: 'Le scénario de test',
      body:
        '1. E à la porte (plot P) : `Code inconnu`, elle reste fermée.\n2. E à la radio (plot R) : R1.\n3. E : R2 et `Noté : CodePorte` (R1 ne revient pas).\n4. F : `Fin de la conversation`.\n5. E : la conversation recommence à R1 ; F.\n6. E à la porte : elle s’ouvre.',
    },
    EXPERT_RULES,
  ],
  objectives: [
    'E à la radio ouvre la conversation (R1) ; pendant la conversation, E avance et F raccroche.',
    'Le fait CodePorte est noté dans le journal du joueur (« Noté : CodePorte »).',
    'Après la conversation, E interagit de nouveau.',
    'La porte à code s’ouvre seulement si le journal contient CodePorte.',
  ],
  hints: [
    'Qui reçoit les touches pendant la conversation, et comment E peut-il changer de sens sans que personne ne teste un mode ?',
    'Get Player Controller, Enhanced Input Local Player Subsystem, Add / Remove Mapping Context (Priority), Input Actions et un second Mapping Context ; Get Data Table Row, Break S_Replique, Is None ; Set of Name ; Blueprint Interfaces.',
    'Solution : IMC_Dialogue (E → IA_Suivant, F → IA_Quitter). BPI_Interactif (Interagir) et BPI_Dialogue (Suivant, Quitter). BP_Joueur : Faits (Set of Name), Interlocuteur (Actor) ; IA_Interagir → Get Overlapping Actors → For Each → Interagir ; IA_Suivant → Suivant (Message, Interlocuteur) ; IA_Quitter → Quitter (Message, Interlocuteur).\n' +
      'BP_Radio : Ligne (Name). Interagir → Cast du Player Pawn → Set Interlocuteur = Self → Set Ligne = R1 → Get Player Controller → Subsystem → Add Mapping Context (IMC_Dialogue, Priority 1) → Afficher. Suivant → Afficher. Quitter → Terminer. Afficher : Get Data Table Row (Ligne) ; Found → Print « Personnage : Texte » → Branch (Donne is None) : False → Add (Faits, Donne) → Print « Noté : » + Donne ; puis Set Ligne = Suivante ; Not Found → Terminer. Terminer : Print « Fin de la conversation » → Remove Mapping Context (IMC_Dialogue).\n' +
      'BP_PorteCode : Interagir → Cast du Player Pawn → Branch (Contains (Faits, CodePorte)) : True → Set Relative Rotation (Yaw 90) ; False → Print « Code inconnu ».',
  ],
  challenge: 'Ajoute une seconde radio sur une autre fréquence (DT_Radio2) qui ne parle que si le journal contient déjà CodePorte, sans copier le graphe de BP_Radio (héritage, ou une variable de la table).',
  setup: project,
  scenario: [
    { wait: 0.2 },
    ...goTo(...DOOR_AT),
    ...tap('E'),
    { wait: 0.1 },
    { checkpoint: 'porte-1' },
    ...goTo(...RADIO_AT),
    ...tap('E'),
    { wait: 0.1 },
    { checkpoint: 'r1' },
    ...tap('E'),
    { wait: 0.1 },
    { checkpoint: 'r2' },
    ...tap('F'),
    { wait: 0.1 },
    { checkpoint: 'fin-1' },
    ...tap('E'),
    { wait: 0.1 },
    { checkpoint: 'relance' },
    ...tap('F'),
    { wait: 0.1 },
    ...goTo(...DOOR_AT),
    ...tap('E'),
    { wait: 0.1 },
  ],
  checks: [
    {
      id: 'placed',
      label: 'BP_Radio sur le plot R, BP_PorteCode sur le plot P',
      test: (cx) => {
        if (!classIs(cx, 'BP_Radio', RADIO_AT)) return 'Pose une BP_Radio sur le plot R (à moins de 80 cm de son centre).';
        return classIs(cx, 'BP_PorteCode', DOOR_AT) ? true : 'Pose une BP_PorteCode sur le plot P (à moins de 80 cm de son centre).';
      },
    },
    {
      id: 'locked',
      label: 'Sans le code : « Code inconnu », la porte reste fermée',
      at: 'porte-1',
      test: (cx) => (doorOpen(cx) ? 'La porte s’est ouverte sans que le joueur connaisse le code.' : countPrints(cx, 'Code inconnu') ? true : 'E à la porte sans le code : aucun « Code inconnu ».'),
    },
    {
      id: 'opens',
      label: 'E à la radio : la conversation commence à R1',
      at: 'r1',
      test: (cx) => (said(cx, 0) === 1 ? true : `E à la radio : « ${lineText(0)} » affiché ${said(cx, 0)} fois au lieu d’une.`),
    },
    {
      id: 'next',
      label: 'Pendant la conversation, E affiche la suivante, sans relancer',
      at: 'r2',
      test: (cx) => {
        if (said(cx, 0) > 1) return 'Le second E a aussi relancé la conversation (R1 à nouveau) : pendant la conversation, E ne doit plus interagir. Un Mapping Context de plus haute priorité garde la touche.';
        return said(cx, 1) === 1 ? true : `Le second E n’a pas affiché « ${lineText(1)} ».`;
      },
    },
    {
      id: 'fact',
      label: 'R2 note le fait : « Noté : CodePorte »',
      at: 'r2',
      test: (cx) => (countPrints(cx, 'Noté : CodePorte') === 1 ? true : 'R2 donne le fait CodePorte : il doit être noté dans le journal du joueur, avec le message « Noté : CodePorte ».'),
    },
    {
      id: 'hang-up',
      label: 'F raccroche : « Fin de la conversation »',
      at: 'fin-1',
      test: (cx) => (countPrints(cx, 'Fin de la conversation') === 1 ? true : 'F pendant la conversation : aucun « Fin de la conversation ».'),
    },
    {
      id: 'back',
      label: 'Après la conversation, E interagit de nouveau (R1)',
      at: 'relance',
      test: (cx) => (said(cx, 0) === 2 ? true : 'Après avoir raccroché, E près de la radio ne relance pas la conversation : le Mapping Context du dialogue est-il retiré ?'),
    },
    {
      id: 'door',
      label: 'Avec le code dans le journal, la porte s’ouvre',
      test: (cx) => (doorOpen(cx) ? true : 'Le joueur connaît CodePorte, et la porte reste fermée.'),
    },
    {
      id: 'context',
      label: 'Le dialogue passe par un Mapping Context ajouté pendant la conversation',
      test: (cx) => (cx.project.mappingContexts.length >= 2 ? true : 'Il n’y a qu’un Mapping Context : le sens de E et F pendant la conversation doit venir d’un second Mapping Context, de plus haute priorité.'),
    },
    notion(usesNode('pc', 'BP_Radio', ['player.getController', 'input.addMappingContext'], 'La radio passe par le Player Controller pour changer de contrôles', 'Le Mapping Context du dialogue s’ajoute par Get Player Controller → Enhanced Input Local Player Subsystem → Add Mapping Context.')),
    noRuntimeErrors(),
  ],
  solve(p) {
    // Input assets of the dialogue mode.
    const ctx = addMappingContext(p, 'IMC_Dialogue');
    const next = addInputAction(p, 'IA_Suivant');
    const quit = addInputAction(p, 'IA_Quitter');
    if (!ctx.ok || !next.ok || !quit.ok) throw new Error('input assets');
    addMapping(p, ctx.value.id, next.value.id, 'E');
    addMapping(p, ctx.value.id, quit.value.id, 'F');

    const iface = (name: string, fns: string[]) => {
      const r = addInterface(p, name);
      if (!r.ok) throw new Error(r.reason);
      for (const f of fns) addInterfaceFunction(p, r.value.id, f);
      return { id: r.value.id, fn: (n: string) => r.value.functions.find((f) => f.name === n)!.id };
    };
    const interact = iface('BPI_Interactif', ['Interagir']);
    const dialogue = iface('BPI_Dialogue', ['Suivant', 'Quitter']);

    // The player: interaction, and the dialogue keys sent to whoever he talks to.
    const player = edit(p, 'BP_Joueur');
    const facts = player.variable('Faits', T.set(T.name), []);
    const other = player.variable('Interlocuteur', T.object('Actor'));
    playerTells(player, p.inputActions.find((a) => a.name === 'IA_Interagir')!.id, interact.id, interact.fn('Interagir'));
    for (const [action, fn, y] of [
      [next.value.id, 'Suivant', 500],
      [quit.value.id, 'Quitter', 800],
    ] as const) {
      const ev = player.node('input.action', { action }, {}, [64, y]);
      const msg = player.node('iface.message', { interface: dialogue.id, fn: dialogue.fn(fn) }, {}, [400, y]);
      player.link(ev, 'started', msg, 'exec').link(player.node('var.get', { variable: other }, {}, [240, y + 200]), 'value', msg, 'target');
    }

    /** Get Player Pawn → Cast To BP_Joueur, after `from`. */
    const thePlayer = (b: ClassBuilder, from: string, pin: string, at: [number, number]) => {
      const cast = b.node('cast.to', { class: player.cls.id }, {}, at);
      b.link(from, pin, cast, 'exec').link(b.node('actor.getPlayerPawn', {}, {}, [at[0] - 160, at[1] + 220]), 'result', cast, 'object');
      return cast;
    };
    /** Get Player Controller → Subsystem → Add or Remove IMC_Dialogue, after `from`. */
    const dialogueContext = (b: ClassBuilder, def: 'input.addMappingContext' | 'input.removeMappingContext', from: string, pin: string, at: [number, number]) => {
      const node = b.node(def, { context: ctx.value.id }, def === 'input.addMappingContext' ? { priority: 1 } : {}, at);
      const sub = b.node('input.subsystem', {}, {}, [at[0] - 200, at[1] + 220]);
      b.link(b.node('player.getController', {}, {}, [at[0] - 420, at[1] + 220]), 'result', sub, 'controller').link(sub, 'result', node, 'target').link(from, pin, node, 'exec');
      return node;
    };

    const radioCls = addClass(p, 'BP_Radio', 'Actor');
    if (!radioCls.ok) throw new Error(radioCls.reason);
    const radio = new ClassBuilder(radioCls.value, p);
    radio.component('StaticMesh', 'Poste', { sizeX: 80, sizeY: 50, color: '#1f2937' });
    radio.component('BoxCollision', 'Zone', { sizeX: 200, sizeY: 200 });
    implementInterface(radioCls.value, interact.id);
    implementInterface(radioCls.value, dialogue.id);
    const line = radio.variable('Ligne', T.name, 'R1');
    const table = p.dataTables.find((t) => t.name === 'DT_Radio')!.id;
    const member = (n: string) => p.structs.find((s) => s.name === 'S_Replique')!.members.find((m) => m.name === n)!.id;

    const show = radio.node('event.custom', { name: 'Afficher' }, {}, [64, 1100]);
    const end = radio.node('event.custom', { name: 'Terminer' }, {}, [64, 1700]);
    const call = (name: string, from: string, pin: string, at: [number, number]) => {
      const c = radio.node('call.custom', { owner: radioCls.value.id, event: name }, {}, at);
      radio.link(from, pin, c, 'exec');
      return c;
    };

    // Interagir: who is talking, from the first line, in dialogue controls.
    const asked = radio.node('event.interface', { interface: interact.id, fn: interact.fn('Interagir') }, {}, [64, 96]);
    const castA = thePlayer(radio, asked, 'then', [320, 96]);
    const setOther = radio.node('var.setExternal', { owner: player.cls.id, variable: other }, {}, [620, 96]);
    radio.link(castA, 'then', setOther, 'exec').link(castA, 'as', setOther, 'target').link(radio.node('actor.self', {}, {}, [480, 320]), 'self', setOther, 'value');
    const first = radio.node('var.set', { variable: line }, { value: 'R1' }, [920, 96]);
    radio.link(setOther, 'then', first, 'exec');
    const add = dialogueContext(radio, 'input.addMappingContext', first, 'then', [1460, 96]);
    call('Afficher', add, 'then', [1760, 96]);
    call('Afficher', radio.node('event.interface', { interface: dialogue.id, fn: dialogue.fn('Suivant') }, {}, [64, 500]), 'then', [400, 500]);
    call('Terminer', radio.node('event.interface', { interface: dialogue.id, fn: dialogue.fn('Quitter') }, {}, [64, 760]), 'then', [400, 760]);

    // Afficher: the current line, the fact it gives, then the next one.
    const row = radio.node('dataTable.getRow', { table }, {}, [360, 1100]);
    const brk = radio.node('struct.break', { struct: 'S_Replique' }, {}, [560, 1360]);
    const text = radio.node('string.append', { inputs: 3 }, { in1: ' : ' }, [860, 1380]);
    const say = radio.node('debug.printString', {}, {}, [760, 1100]);
    radio.link(show, 'then', row, 'exec').link(radio.node('var.get', { variable: line }, {}, [200, 1300]), 'value', row, 'rowName');
    radio.link(row, 'row', brk, 'struct').link(brk, member('Personnage'), text, 'in0').link(brk, member('Texte'), text, 'in2').link(text, 'result', say, 'text').link(row, 'found', say, 'exec');
    const none = radio.node('name.isNone', {}, {}, [1000, 1300]);
    const gives = radio.node('flow.branch', {}, {}, [1060, 1100]);
    radio.link(say, 'then', gives, 'exec').link(brk, member('Donne'), none, 'in').link(none, 'result', gives, 'condition');
    const castF = thePlayer(radio, gives, 'false', [1360, 1240]);
    const getFacts = radio.node('var.getExternal', { owner: player.cls.id, variable: facts }, {}, [1560, 1460]);
    const note = radio.node('set.add', {}, {}, [1660, 1240]);
    const t2 = radio.node('string.append', {}, { in0: 'Noté : ' }, [1900, 1440]);
    const noted = radio.node('debug.printString', {}, {}, [1960, 1240]);
    radio.link(castF, 'then', note, 'exec').link(castF, 'as', getFacts, 'target').link(getFacts, 'value', note, 'set').link(brk, member('Donne'), note, 'item');
    radio.link(note, 'then', noted, 'exec').link(brk, member('Donne'), t2, 'in1').link(t2, 'result', noted, 'text');
    const move = radio.node('var.set', { variable: line }, {}, [2260, 1100]);
    radio.link(gives, 'true', move, 'exec').link(noted, 'then', move, 'exec').link(brk, member('Suivante'), move, 'value');
    call('Terminer', row, 'notFound', [760, 1500]);

    // Terminer: back to the normal controls.
    const bye = radio.node('debug.printString', {}, { text: 'Fin de la conversation' }, [360, 1700]);
    radio.link(end, 'then', bye, 'exec');
    dialogueContext(radio, 'input.removeMappingContext', bye, 'then', [1000, 1700]);
    placeActor(p, radioCls.value.id, ...RADIO_AT);

    // The code door.
    const doorCls = addClass(p, 'BP_PorteCode', 'Actor');
    if (!doorCls.ok) throw new Error(doorCls.reason);
    const door = new ClassBuilder(doorCls.value, p);
    door.component('StaticMesh', 'Battant', { shape: 'door', sizeX: 160, sizeY: 16, color: '#a0703c' });
    door.component('BoxCollision', 'Zone', { sizeX: 220, sizeY: 220 });
    implementInterface(doorCls.value, interact.id);
    const knock = door.node('event.interface', { interface: interact.id, fn: interact.fn('Interagir') }, {}, [64, 96]);
    const castD = thePlayer(door, knock, 'then', [320, 96]);
    const knows = door.node('set.contains', {}, { item: 'CodePorte' }, [560, 320]);
    const br = door.node('flow.branch', {}, {}, [640, 96]);
    const gd = door.node('var.getExternal', { owner: player.cls.id, variable: facts }, {}, [400, 320]);
    const open = door.node('component.setRelativeRotation', {}, { rotation: { x: 0, y: 0, z: 90 } }, [940, 40]);
    door.link(castD, 'then', br, 'exec').link(castD, 'as', gd, 'target').link(gd, 'value', knows, 'set').link(knows, 'result', br, 'condition');
    door.link(br, 'true', open, 'exec').target('Battant', open).link(br, 'false', door.node('debug.printString', {}, { text: 'Code inconnu' }, [940, 260]), 'exec');
    placeActor(p, doorCls.value.id, ...DOOR_AT);
  },
};
