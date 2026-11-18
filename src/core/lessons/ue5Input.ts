/**
 * UE5 input for the steps after « Les contrôles au Player Controller » (lot
 * 1 of the path plan): a step written with key events (E, F, Space Bar) is
 * presented as a UE5 project is set up, like the Third Person template:
 *
 * - one Input Action per key it uses (IA_Interagir for E…), mapped in
 *   IMC_Joueur with no trigger, so Started is the old Pressed and Completed
 *   the old Released;
 * - BP_PlayerController, set as Player Controller Class, adds IMC_Joueur to
 *   the Enhanced Input Local Player Subsystem at BeginPlay (Self →
 *   Subsystem → Add Mapping Context);
 * - every key event becomes the action event of its key, keeping Consume
 *   Input. Actors that listened to a key keep Auto Receive Input: in UE an
 *   actor with input enabled receives action events too.
 *
 * The lesson keeps its own code: `asEnhancedInput` converts its starting
 * project, and runs its solution and alternatives on the key-event form
 * before converting them, so lesson code that looks for a key event still
 * finds one.
 */
import { addClass, setPlayerControllerClass } from '../operations/projectOps';
import { addInputAction, addMapping, addMappingContext } from '../operations/inputOps';
import { addNode, connect, removeNodes } from '../operations/graphOps';
import { contextFor } from '../nodes/registry';
import type { Graph, KeyName, Project } from '../model/project';
import type { Lesson, LessonCard } from './types';

const KEY_LABEL: Record<KeyName, string> = { E: 'E', F: 'F', SpaceBar: 'Espace' };

/** The card that says how the project's input is set up, from its own actions. */
function inputCard(p: Project, keys: Iterable<KeyName>, names: Partial<Record<KeyName, string>>): LessonCard {
  const pairs = [...keys].map((k) => `**${KEY_LABEL[k]}** → **${names[k] ?? DEFAULT_ACTIONS[k]}**`).join(', ');
  const listening = p.classes.filter((c) => c.autoReceiveInput).map((c) => c.name);
  return {
    title: 'Les touches, comme dans UE5',
    body:
      `Le projet est réglé comme le template Third Person d’UE5 : **${PLAYER_CONTROLLER}** (Player Controller Class) ajoute **${PLAYER_CONTEXT}** au BeginPlay, et ${PLAYER_CONTEXT} relie ${pairs}, sans déclencheur.\n\n` +
      'Dans un graphe, l’événement d’une action (palette › Input › Enhanced Action Events) sort par **Started** quand on appuie, une fois, et par **Completed** quand on relâche. **Triggered**, sans déclencheur, se répète à chaque image tant que la touche est tenue.' +
      (listening.length
        ? `\n\n${listening.join(', ')} ${listening.length > 1 ? 'ont' : 'a'} **Auto Receive Input** sur Player 0 : dans UE, un acteur qui reçoit les entrées entend aussi les actions. Dans un vrai jeu, c’est plutôt le joueur qui reçoit l’action et prévient l’objet visé (« Interagir avec tout »).`
        : ''),
  };
}

export const PLAYER_CONTEXT = 'IMC_Joueur';
export const PLAYER_CONTROLLER = 'BP_PlayerController';

/** The Input Action of each key, unless a lesson names its own (`IA_Annuler` for F…). */
export const DEFAULT_ACTIONS: Record<KeyName, string> = { E: 'IA_Interagir', F: 'IA_Utiliser', SpaceBar: 'IA_Sauter' };

const KEY_PIN: Record<string, string> = { pressed: 'started', released: 'completed' };
const ACTION_PIN: Record<string, string> = { started: 'pressed', completed: 'released' };

function keysIn(p: Project): Set<KeyName> {
  const keys = new Set<KeyName>();
  for (const c of p.classes) for (const g of c.graphs) for (const n of Object.values(g.nodes)) if (n.def === 'event.inputKey') keys.add((n.config.key as KeyName) ?? 'E');
  return keys;
}

/**
 * The template's input set-up, made once: the actions of `keys`, the
 * Mapping Context, and the Player Controller that adds it. Returns the action
 * id of each key.
 */
export function ensurePlayerInput(p: Project, keys: Iterable<KeyName>, names: Partial<Record<KeyName, string>> = {}): Map<KeyName, string> {
  p.inputActions ??= [];
  p.mappingContexts ??= [];
  let context = p.mappingContexts.find((c) => c.name === PLAYER_CONTEXT);
  if (!context) {
    const r = addMappingContext(p, PLAYER_CONTEXT);
    if (!r.ok) throw new Error(r.reason);
    context = r.value;
  }
  const byKey = new Map<KeyName, string>();
  for (const key of keys) {
    const name = names[key] ?? DEFAULT_ACTIONS[key];
    let action = p.inputActions.find((a) => a.name === name);
    if (!action) {
      const r = addInputAction(p, name);
      if (!r.ok) throw new Error(r.reason);
      action = r.value;
    }
    if (!context.mappings.some((m) => m.action === action.id && m.key === key)) addMapping(p, context.id, action.id, key);
    byKey.set(key, action.id);
  }
  if (!p.classes.some((c) => c.name === PLAYER_CONTROLLER)) {
    const r = addClass(p, PLAYER_CONTROLLER, 'PlayerController');
    if (!r.ok) throw new Error(r.reason);
    const g = r.value.graphs[0];
    const ctx = contextFor(r.value, p);
    const node = (def: string, x: number, y: number, config = {}) => {
      const a = addNode(g, def, x, y, config);
      if (!a.ok) throw new Error(a.reason);
      return a.value.id;
    };
    const begin = node('event.beginPlay', 64, 96);
    const add = node('input.addMappingContext', 720, 96, { context: context.id });
    const self = node('actor.self', 64, 300);
    const sub = node('input.subsystem', 380, 300);
    connect(g, { node: begin, pin: 'then' }, { node: add, pin: 'exec' }, ctx);
    connect(g, { node: self, pin: 'self' }, { node: sub, pin: 'controller' }, ctx);
    connect(g, { node: sub, pin: 'result' }, { node: add, pin: 'target' }, ctx);
    const set = setPlayerControllerClass(p, r.value.id);
    if (!set.ok) throw new Error(set.reason);
  }
  return byKey;
}

/** Replace one kind of event node by another in a graph, carrying its wires across by pin. */
function swap(g: Graph, from: string, make: (config: Record<string, unknown>) => { def: string; config: Record<string, unknown> } | undefined, pins: Record<string, string>): void {
  for (const n of Object.values(g.nodes)) {
    if (n.def !== from) continue;
    const next = make(n.config);
    if (!next) continue;
    const added = addNode(g, next.def, n.x, n.y, next.config as never);
    if (!added.ok) throw new Error(added.reason);
    for (const l of Object.values(g.links)) {
      if (l.from.node === n.id && pins[l.from.pin]) l.from = { node: added.value.id, pin: pins[l.from.pin] };
    }
    removeNodes(g, [n.id]);
  }
}

/** Every key event of the project becomes the action event of its key. */
export function keyEventsToActions(p: Project, actions: Map<KeyName, string>): void {
  for (const c of p.classes) {
    for (const g of c.graphs) {
      swap(
        g,
        'event.inputKey',
        (config) => {
          const action = actions.get((config.key as KeyName) ?? 'E');
          return action ? { def: 'input.action', config: { action, consumeInput: config.consumeInput !== false } } : undefined;
        },
        KEY_PIN,
      );
    }
  }
}

/** Back to key events (to run lesson code written for them). */
function actionsToKeyEvents(p: Project, actions: Map<KeyName, string>): void {
  const keyOf = new Map([...actions].map(([k, a]) => [a, k]));
  for (const c of p.classes) {
    for (const g of c.graphs) {
      swap(
        g,
        'input.action',
        (config) => {
          const key = keyOf.get(String(config.action));
          return key ? { def: 'event.inputKey', config: { key, consumeInput: config.consumeInput !== false } } : undefined;
        },
        ACTION_PIN,
      );
    }
  }
}

/**
 * The lesson presented with UE5 input. `names` renames the action of a key
 * when the lesson gives it a meaning (F → IA_Annuler). Raise the lesson's
 * revision when wrapping it: its starting project changes.
 */
export function asEnhancedInput(lesson: Lesson, names: Partial<Record<KeyName, string>> = {}): Lesson {
  const probe = lesson.setup();
  const keys = keysIn(probe);
  lesson.solve(probe);
  for (const k of keysIn(probe)) keys.add(k);
  /** Run lesson code written for key events on a converted project. */
  const onKeys = (p: Project, run: (p: Project) => void) => {
    const actions = ensurePlayerInput(p, keys, names);
    actionsToKeyEvents(p, actions);
    run(p);
    keyEventsToActions(p, actions);
  };
  return {
    ...lesson,
    // The starting project changed: work started on the old one is flagged.
    revision: (lesson.revision ?? 1) + 1,
    setup() {
      const p = lesson.setup();
      keyEventsToActions(p, ensurePlayerInput(p, keys, names));
      return p;
    },
    cards: [...lesson.cards, inputCard(lesson.setup(), keys, names)],
    solve: (p) => onKeys(p, (q) => lesson.solve(q)),
    alternatives: lesson.alternatives?.map((alt) => ({ ...alt, build: (p: Project) => onKeys(p, (q) => alt.build(q)) })),
    robustness: lesson.robustness?.map((r) => (r.mutate ? { ...r, mutate: (p: Project) => onKeys(p, (q) => r.mutate?.(q)) } : r)),
  };
}
