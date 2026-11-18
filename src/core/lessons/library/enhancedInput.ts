/**
 * Enhanced Input (lot 3, first part): the lamp of lesson 4 moved to an Input
 * Action, the classic forgotten Add Mapping Context (Débogue D20), and a
 * door that opens only when E is held (Hold trigger, Triggered and Canceled).
 */
import type { Project } from '../../model/project';
import { addInputAction, addMapping, addMappingContext } from '../../operations/inputOps';
import { removeNodes } from '../../operations/graphOps';
import { addClass, setPlayerClass } from '../../operations/projectOps';
import { edit, ProjectBuilder } from '../builder';
import { noRuntimeErrors, normText, notion, usesNode, visible } from '../checks';
import type { Check, CheckContext, Lesson, ScenarioStep } from '../types';
import { lesson4 } from './module1';
import { doorBlueprint, playerBlueprint } from './props';

const MODULE = 'Enhanced Input';

/** Hold E for `seconds`, then release it. */
const hold = (seconds: number): ScenarioStep[] => [{ press: 'E' }, { wait: seconds }, { release: 'E' }, { wait: 0.1 }];

function ensurePlayer(p: Project): string {
  const existing = p.classes.find((c) => c.name === 'BP_Joueur');
  if (existing) return existing.id;
  const r = addClass(p, 'BP_Joueur', 'Pawn');
  if (!r.ok) throw new Error(r.reason);
  setPlayerClass(p, r.value.id);
  return r.value.id;
}

/** IA_<action> and IMC_Joueur with E → the action (no trigger: Down). */
function inputAssets(p: Project, action: string): { action: string; context: string } {
  const a = addInputAction(p, action);
  const c = addMappingContext(p, 'IMC_Joueur');
  if (!a.ok || !c.ok) throw new Error('assets');
  addMapping(p, c.value.id, a.value.id, 'E');
  return { action: a.value.id, context: c.value.id };
}

/** BP_Joueur: BeginPlay → Add Mapping Context (IMC_Joueur). */
function addContextAtBeginPlay(p: Project, context: string): void {
  const b = edit(p, 'BP_Joueur');
  const begin = b.node('event.beginPlay', {}, {}, [64, 96]);
  const add = b.node('input.addMappingContext', { context }, {}, [380, 96]);
  b.link(begin, 'then', add, 'exec');
}

/** Replace the lamp's E key event by the action event, Started into what Pressed fed. */
function lampOnAction(p: Project, action: string): void {
  const b = edit(p, 'BP_Lampe');
  const key = Object.values(b.graph.nodes).find((n) => n.def === 'event.inputKey')!;
  const next = Object.values(b.graph.links).find((l) => l.from.node === key.id && l.from.pin === 'pressed')!.to.node;
  removeNodes(b.graph, [key.id]);
  const ev = b.node('input.action', { action, consumeInput: true }, {}, [64, 200]);
  b.link(ev, 'started', next, 'exec');
}

const usesKeyEvent = (cx: CheckContext) =>
  cx.project.classes.some((c) => c.graphs.some((g) => Object.values(g.nodes).some((n) => n.def === 'event.inputKey' && Object.values(g.links).some((l) => l.from.node === n.id))));

const TOGGLE_REASON =
  ' Sans déclencheur, l’action est Triggered à chaque image tant que E est enfoncée : la lampe bascule des dizaines de fois. Utilise Started (une fois à l’appui), ou mets le déclencheur Pressed.';

function lampAfter(id: string, expected: boolean, label: string, at: string): Check {
  const base = visible(id, 'BP_Lampe', 'Lumiere', expected, label, at);
  return {
    ...base,
    test: (cx) => {
      const r = base.test(cx);
      if (r === true) return true;
      const anyEvent = cx.project.classes.some((c) => c.graphs.some((g) => Object.values(g.nodes).some((n) => n.def === 'input.action')));
      return anyEvent ? r + TOGGLE_REASON : r;
    },
  };
}

// ------------------------------------------------------------ the lamp

export const lessonInputLamp: Lesson = {
  id: 'l-ei-lampe',
  module: MODULE,
  level: 'intermediaire',
  number: 0,
  title: 'La lampe en Enhanced Input',
  situation:
    'La lampe de la leçon 4 s’allume et s’éteint avec E, par un événement de touche. Dans UE5, on passe par Enhanced Input : fais-la marcher pareil, avec une Input Action.',
  notions: ['Input Action', 'Input Mapping Context', 'Add Mapping Context', 'Started / Triggered / Completed'],
  remember:
    'Enhanced Input en trois pièces : une Input Action (ce que le joueur fait), un Mapping Context (quelle touche la déclenche), et Add Mapping Context au BeginPlay pour l’activer. Pour « une fois à l’appui », Started.',
  cards: [
    {
      title: 'Ce qui est en place',
      body:
        '- **BP_Lampe** : la solution de la leçon 4. Son graphe commence par l’événement de touche **E** (Pressed), puis le Branch sur `bEstAllumee`. Auto Receive Input est sur Player 0.\n' +
        '- **BP_Joueur** : le pion du joueur, graphe vide.\n\n' +
        'Le test appuie sur E en la **tenant une demi-seconde**, deux fois : la lampe doit s’allumer, puis s’éteindre.',
    },
    {
      title: 'Pourquoi Enhanced Input',
      body:
        'Un événement de touche relie un Blueprint à **une touche précise**. Changer de touche, ajouter la manette, désactiver les contrôles dans un menu : il faudrait retoucher chaque graphe.\n\n' +
        'Enhanced Input sépare les deux :\n\n' +
        '- une **Input Action** dit **ce que** fait le joueur (`IA_Interagir`), sans touche ;\n' +
        '- un **Input Mapping Context** dit **quelle touche** déclenche quelle action (`IMC_Joueur` : E → IA_Interagir) ;\n' +
        '- **Add Mapping Context** active ce contexte pour le joueur pendant le jeu.\n\n' +
        'C’est le système par défaut des projets UE5.',
    },
    {
      title: 'Créer les deux assets',
      body:
        'Ouvre le **Content Drawer** (bouton en bas à gauche, comme dans UE5) :\n\n' +
        '1. **+ Input Action**, nomme-la `IA_Interagir`.\n' +
        '2. **+ Mapping Context**, nomme-le `IMC_Joueur`. Dans son Details, **+ Mapping** : action IA_Interagir, touche **E**, déclencheur **Aucun**.\n\n' +
        'Dans UE, c’est clic droit dans le Content Browser › Input › Input Action ou Input Mapping Context, et le contexte s’édite dans sa propre fenêtre.',
    },
    {
      title: 'Activer le contexte',
      body:
        'Un Mapping Context ne fait rien tant qu’il n’est pas **ajouté** pendant le jeu. Dans BP_Joueur : **Event BeginPlay** → **Add Mapping Context (IMC_Joueur)** (palette › Input › Enhanced Input).\n\n' +
        'Dans UE, le nœud se branche sur l’**Enhanced Input Local Player Subsystem**, obtenu depuis **Get Player Controller** : BeginPlay → Get Player Controller → Enhanced Input Local Player Subsystem → Add Mapping Context. L’appli fait ce chemin pour toi.',
    },
    {
      title: 'Remplacer l’événement',
      body:
        'Dans BP_Lampe, supprime l’événement **E** et pose l’événement **IA_Interagir** (palette › Input › Enhanced Action Events). Il a cinq sorties blanches :\n\n' +
        '- **Started** : l’appui commence (une fois) ;\n' +
        '- **Triggered** : l’action a lieu. Sans déclencheur, c’est **à chaque image** tant que la touche est enfoncée ;\n' +
        '- **Completed** : elle s’arrête (touche relâchée) ;\n' +
        '- **Ongoing** et **Canceled** : pour les déclencheurs qui demandent d’attendre (leçon suivante).\n\n' +
        'Relie **Started** au Branch. Brancher **Triggered** ferait basculer la lampe à chaque image tant que E est tenue.',
    },
  ],
  objectives: [
    'Crée IA_Interagir et IMC_Joueur (E → IA_Interagir).',
    'Dans BP_Joueur, ajoute le contexte au BeginPlay.',
    'Dans BP_Lampe, remplace l’événement de touche E par l’événement IA_Interagir.',
    'E tenue une demi-seconde : la lampe change d’état une seule fois.',
  ],
  hints: [
    'Trois pièces : l’action, le contexte qui relie E à l’action, et Add Mapping Context au BeginPlay du joueur. Sans cette dernière, rien ne se passe, sans erreur.',
    'Nœuds : Event BeginPlay et Add Mapping Context (IMC_Joueur) dans BP_Joueur ; l’événement IA_Interagir (sortie Started) dans BP_Lampe, relié au Branch existant.',
    'Solution : Content Browser › IA_Interagir, puis IMC_Joueur avec la ligne E → IA_Interagir. BP_Joueur : BeginPlay → Add Mapping Context (IMC_Joueur). BP_Lampe : supprime E, pose IA_Interagir, Started → Branch.',
  ],
  challenge: 'Ajoute F au même contexte, vers la même action : les deux touches allument la lampe, sans toucher au graphe de la lampe.',
  setup() {
    const p = lesson4.setup();
    lesson4.solve(p);
    p.name = 'La lampe en Enhanced Input';
    ensurePlayer(p);
    return p;
  },
  scenario: [{ wait: 0.2 }, ...hold(0.45), { checkpoint: 'un' }, ...hold(0.45), { checkpoint: 'deux' }],
  checks: [
    lampAfter('on', true, '1er appui (tenu) : la lampe s’allume', 'un'),
    lampAfter('off', false, '2e appui (tenu) : elle s’éteint', 'deux'),
    {
      id: 'no-key',
      label: 'L’événement de touche E n’est plus utilisé',
      test: (cx) => (usesKeyEvent(cx) ? 'Un événement de touche E est encore relié : remplace-le par l’événement IA_Interagir.' : true),
    },
    notion(usesNode('action', 'BP_Lampe', ['input.action'], 'BP_Lampe utilise l’événement d’une Input Action', 'Pose l’événement IA_Interagir dans BP_Lampe.')),
    notion(usesNode('context', 'BP_Joueur', ['input.addMappingContext'], 'BP_Joueur ajoute le Mapping Context', 'Ajoute IMC_Joueur au BeginPlay de BP_Joueur.')),
    noRuntimeErrors(),
  ],
  solve(p) {
    const { action, context } = inputAssets(p, 'IA_Interagir');
    addContextAtBeginPlay(p, context);
    lampOnAction(p, action);
  },
};

// --------------------------------------------------------- Débogue D20

export const debugMappingContext: Lesson = {
  id: 'd20-contexte',
  kind: 'debug',
  code: 'D20',
  module: MODULE,
  level: 'intermediaire',
  number: 0,
  title: 'La touche qui ne répond plus',
  situation: 'Le projet est passé à Enhanced Input. Tout compile, l’Output Log est vide… et E n’allume plus la lampe.',
  notions: ['Add Mapping Context', 'Input Mapping Context'],
  remember:
    'Un Mapping Context ne sert à rien tant qu’on ne l’a pas ajouté pendant le jeu (Add Mapping Context, en général au BeginPlay du joueur). Son oubli ne produit aucune erreur : les événements d’action ne se déclenchent simplement jamais.',
  cards: [
    {
      title: 'Ce qui est en place',
      body:
        '- **IA_Interagir** (Input Action) et **IMC_Joueur** (Mapping Context : E → IA_Interagir).\n' +
        '- **BP_Lampe** : l’événement **IA_Interagir**, sortie Started → le Branch qui allume ou éteint.\n' +
        '- **BP_Joueur** : le pion du joueur.\n\n' +
        'Lance ▶ Play et appuie sur E : rien. Aucune erreur dans l’Output Log.',
    },
    {
      title: 'Enquêter',
      body:
        'Rien ne plante : un nœud ne s’exécute simplement jamais. Touche l’événement IA_Interagir puis Details › « Pourquoi ce nœud ne s’est pas exécuté ? ».\n\n' +
        'Remonte la chaîne : la touche est-elle reliée à l’action ? Et le contexte qui fait ce lien, quelqu’un l’a-t-il **activé** ?',
    },
    {
      title: 'Ce qu’il faut savoir',
      body:
        'Un Input Mapping Context est un asset : il existe dans le projet, mais le joueur ne l’utilise que si un Blueprint l’ajoute pendant le jeu. Dans UE aussi, l’oubli est silencieux. C’est l’erreur la plus fréquente en passant à Enhanced Input.',
    },
  ],
  objectives: ['E allume la lampe, puis l’éteint.', 'Sans toucher au graphe de la lampe.'],
  hints: [
    'La lampe est juste : c’est le contexte IMC_Joueur qui n’est jamais activé.',
    'Nœuds : Event BeginPlay et Add Mapping Context (IMC_Joueur), dans BP_Joueur.',
    'Solution : BP_Joueur : Event BeginPlay → Add Mapping Context (IMC_Joueur).',
  ],
  setup() {
    const p = lesson4.setup();
    lesson4.solve(p);
    p.name = 'La touche qui ne répond plus';
    ensurePlayer(p);
    const { action } = inputAssets(p, 'IA_Interagir');
    lampOnAction(p, action);
    return p;
  },
  scenario: [{ wait: 0.2 }, ...hold(0.2), { checkpoint: 'un' }, ...hold(0.2), { checkpoint: 'deux' }],
  checks: [
    visible('on', 'BP_Lampe', 'Lumiere', true, '1er appui : la lampe s’allume', 'un'),
    visible('off', 'BP_Lampe', 'Lumiere', false, '2e appui : elle s’éteint', 'deux'),
    noRuntimeErrors(),
  ],
  solve(p) {
    const context = p.mappingContexts[0].id;
    addContextAtBeginPlay(p, context);
  },
};

// ------------------------------------------------------------ the hold

function doorYaw(cx: CheckContext): number {
  const yaw = cx.component('BP_Porte', 'Porte')?.props.yaw ?? 0;
  return ((((yaw + 180) % 360) + 360) % 360) - 180;
}

function holdProject(): Project {
  const pb = new ProjectBuilder('Maintenir pour ouvrir');
  playerBlueprint(pb);
  const door = doorBlueprint(pb);
  door.cls.autoReceiveInput = true;
  pb.playerStart(-300, 0);
  const p = pb.project;
  const { context } = inputAssets(p, 'IA_Ouvrir');
  addContextAtBeginPlay(p, context);
  return p;
}

export const lessonInputHold: Lesson = {
  id: 'l-ei-maintien',
  module: MODULE,
  level: 'intermediaire',
  number: 0,
  title: 'Maintenir pour ouvrir',
  situation: 'La porte lourde ne s’ouvre que si l’on tient E une seconde. Un appui trop bref affiche « Maintiens E pour ouvrir ».',
  notions: ['Déclencheur Hold', 'Started / Triggered / Completed', 'Canceled'],
  remember:
    'Le déclencheur se règle dans le Mapping Context, pas dans le graphe. Avec Hold : Started à l’appui, Ongoing pendant l’attente, Triggered une fois le seuil atteint, Canceled si la touche est relâchée avant.',
  cards: [
    {
      title: 'Ce qui est en place',
      body:
        '- **IA_Ouvrir** et **IMC_Joueur** (E → IA_Ouvrir, **sans déclencheur** pour l’instant). BP_Joueur ajoute déjà le contexte au BeginPlay.\n' +
        '- **BP_Porte** : la Porte et sa Zone, graphe vide. Auto Receive Input est sur Player 0.\n\n' +
        'Le test fait d’abord un appui bref (0,3 s), puis tient E 1,3 s.',
    },
    {
      title: 'Les déclencheurs',
      body:
        'Dans le Mapping Context, chaque ligne peut avoir un **déclencheur** (Trigger) qui décide **quand** l’action a lieu :\n\n' +
        '- **aucun** (Down implicite) : à chaque image tant que la touche est enfoncée ;\n' +
        '- **Pressed** : une fois, à l’appui ;\n' +
        '- **Released** : une fois, au relâchement ;\n' +
        '- **Hold** : après avoir tenu la touche **Hold Time Threshold** secondes. **Is One Shot** coché : une seule fois.\n\n' +
        'Le graphe ne change pas : c’est le contexte qui décide. Un designer peut régler la durée sans toucher au Blueprint.',
    },
    {
      title: 'Les sorties avec Hold',
      body:
        '- **Started** : la touche vient d’être enfoncée, l’attente commence.\n' +
        '- **Ongoing** : à chaque image pendant l’attente (Elapsed Seconds dit depuis combien de temps).\n' +
        '- **Triggered** : le seuil est atteint, l’action a lieu.\n' +
        '- **Canceled** : la touche a été relâchée **avant** le seuil.\n' +
        '- **Completed** : l’action avait eu lieu et se termine.',
    },
    {
      title: 'Le plan',
      body:
        '1. Dans **IMC_Joueur**, ligne E → IA_Ouvrir : déclencheur **Hold**, Hold Time Threshold **1** s, Is One Shot coché.\n' +
        '2. Dans BP_Porte : l’événement **IA_Ouvrir**.\n' +
        '   - **Triggered** → **Set Relative Rotation** (Target = Porte, Yaw 90).\n' +
        '   - **Canceled** → **Print String** « Maintiens E pour ouvrir ».',
    },
  ],
  objectives: [
    'Règle le déclencheur Hold (1 s) sur la ligne E → IA_Ouvrir.',
    'Tenue assez longtemps, E ouvre la porte (Yaw 90).',
    'Un appui trop bref ne l’ouvre pas et affiche un message qui parle de maintenir.',
  ],
  hints: [
    'La durée ne se compte pas dans le graphe : c’est le rôle du déclencheur Hold, dans le Mapping Context.',
    'Réglage : IMC_Joueur › ligne E → IA_Ouvrir › déclencheur Hold (1 s). Nœuds : événement IA_Ouvrir, Set Relative Rotation, Print String.',
    'Solution : déclencheur Hold 1 s, One Shot. BP_Porte : IA_Ouvrir Triggered → Set Relative Rotation (Porte, Yaw 90) ; Canceled → Print String « Maintiens E pour ouvrir ».',
  ],
  challenge: 'Pendant l’attente (Ongoing), affiche le temps déjà tenu avec Elapsed Seconds.',
  setup: holdProject,
  scenario: [{ wait: 0.2 }, ...hold(0.3), { checkpoint: 'bref' }, ...hold(1.3)],
  checks: [
    {
      id: 'short-closed',
      label: 'Un appui bref ne l’ouvre pas',
      at: 'bref',
      test: (cx) => (Math.abs(Math.abs(doorYaw(cx)) - 90) < 1 ? 'La porte s’est ouverte dès un appui de 0,3 s : règle le déclencheur Hold (1 s) dans IMC_Joueur.' : true),
    },
    {
      id: 'short-msg',
      label: 'Un appui bref affiche un message qui parle de maintenir',
      at: 'bref',
      test: (cx) => (cx.prints().some((t) => normText(t).includes('maintien')) ? true : 'Aucun message contenant « maintiens » après l’appui bref : branche Canceled sur un Print String.'),
    },
    {
      id: 'held-open',
      label: 'Tenue 1 s, E ouvre la porte',
      test: (cx) => (Math.abs(Math.abs(doorYaw(cx)) - 90) < 1 ? true : 'La porte est restée fermée après 1,3 s d’appui : relie Triggered à Set Relative Rotation (Yaw 90).'),
    },
    notion({
      id: 'hold',
      label: 'La ligne E → IA_Ouvrir a un déclencheur Hold',
      test: (cx) =>
        cx.project.mappingContexts.some((c) => c.mappings.some((m) => m.triggers.some((t) => t.kind === 'Hold')))
          ? true
          : 'Mets la durée dans le déclencheur Hold du Mapping Context, plutôt que dans le graphe.',
    }),
    noRuntimeErrors(),
  ],
  solve(p) {
    const context = p.mappingContexts[0];
    context.mappings[0].triggers = [{ kind: 'Hold', holdTime: 1, oneShot: true }];
    const action = p.inputActions[0].id;
    const b = edit(p, 'BP_Porte');
    const ev = b.node('input.action', { action, consumeInput: true }, {}, [64, 96]);
    const rot = b.node('component.setRelativeRotation', {}, { rotation: { x: 0, y: 0, z: 90 } }, [420, 0]);
    const say = b.node('debug.printString', {}, { text: 'Maintiens E pour ouvrir' }, [420, 320]);
    b.link(ev, 'triggered', rot, 'exec').target('Porte', rot).link(ev, 'canceled', say, 'exec');
  },
};
