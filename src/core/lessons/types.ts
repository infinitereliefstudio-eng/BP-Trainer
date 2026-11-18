/** Lesson format: explanations, a starting project, a scenario and checks. */
import type { NodeInstance, Project, SavedGame } from '../model/project';
import type { Level } from './levels';
import type { InputKey, Simulation } from '../runtime/simulation';
import type { ActorRT, ComponentRT, RValue } from '../runtime/world';

export interface LessonCard {
  title: string;
  /** Paragraphs separated by blank lines; **bold** and `code` are rendered. */
  body: string;
}

/** What the automatic test does, step by step, like a player would. */
export type ScenarioStep =
  | { wait: number }
  | { teleport: [number, number] }
  | { walk: [number, number]; seconds: number }
  | { press: InputKey }
  | { release: InputKey }
  | { checkpoint: string }
  /** Turn the player to face this yaw, in degrees (0 = +X, 90 = +Y, towards the bottom of the screen). */
  | { look: number }
  /** Frames per second from here on (60 by default): Delta Seconds changes with it, as on a slower device. */
  | { fps: number }
  /**
   * Stop the game and press Play again: a new game on the same project, whose
   * save slots are kept (Save Game). Checks after it see the new game.
   */
  | { restart: true };

export interface CheckContext {
  /** The game being played: the latest one after a restart step. */
  sim: Simulation;
  project: Project;
  actor(label: string): ActorRT | undefined;
  component(actorLabel: string, componentName: string): ComponentRT | undefined;
  /** Texts printed with Print String so far (every game of the scenario, after a restart too). */
  prints(): string[];
  /** Runtime errors so far, every game of the scenario. */
  errors(): string[];
  /** A variable of an actor (level label, or "Joueur" for the player), by name. */
  variable(actorLabel: string, name: string): RValue | undefined;
  nodes(className: string): NodeInstance[];
  /**
   * The level as the editor shows it before Play: Construction Scripts have
   * run, no BeginPlay has. Built on first use.
   */
  preview(): Simulation;
}

export interface Check {
  id: string;
  /** Shown in the checklist: what is verified, in plain words. */
  label: string;
  /** Checkpoint at which to evaluate; the end of the scenario if absent. */
  at?: string;
  /** true when satisfied, otherwise the reason shown to the learner. */
  test(cx: CheckContext): true | string;
  /**
   * The notion the lesson is about (a Branch, no Tick…), checked on the graph.
   * Shown apart and never blocking: another working solution still passes.
   */
  notion?: boolean;
}

/**
 * Played after the lesson is passed: the same solution in a situation the
 * lesson did not ask for (two instances, another actor in the zone, quick
 * back and forth). Never blocking: "works too when…" or "does not when…".
 */
export interface RobustnessCase {
  id: string;
  /** The situation, completing "Et si… ?" : « un autre acteur entre dans la zone ». */
  label: string;
  /** Changes to the learner's project before playing (more instances…). */
  mutate?(p: Project): void;
  scenario: ScenarioStep[];
  checks: Check[];
  /** What to change when it fails, shown under the reason. */
  advice: string;
}

/** Another way to solve the lesson, opened read-only once it is passed. */
export interface Alternative {
  title: string;
  /** What this way does better, and what it costs. */
  gains: string;
  loses: string;
  /** Builds it on the lesson's setup project. It must pass the lesson's checks (tested). */
  build(p: Project): void;
}

/**
 * Nodes that work but are a poor fit for this lesson's situation: found in
 * the learner's solution, they are pointed out once the lesson is passed.
 */
export interface Avoid {
  /** Node definitions concerned. */
  defs: string[];
  /** Only in this Blueprint (any when absent). */
  in?: string;
  /** What was found, in a few words: « Event Tick pour surveiller ». */
  label: string;
  /** Why it is not the best here, and what to use instead. */
  why: string;
}

/**
 * build: make something work. predict: read a Blueprint and choose what it
 * will print, then check with Play. debug: a broken Blueprint to repair.
 * complete: a graph with gaps, the nodes to place are named. refactor: a
 * working but clumsy graph to rewrite, same behaviour plus a constraint.
 */
/**
 * `synthesis`: the project that ends a level, mixing its notions with a
 * brief only (advised before the next level, never required).
 */
export type LessonKind = 'build' | 'predict' | 'debug' | 'complete' | 'refactor' | 'synthesis';

export interface Prediction {
  question: string;
  options: string[];
  /** Index of the right option. */
  answer: number;
  explanation: string;
  /** True when what the scenario printed confirms the answer (used by tests). */
  verify(prints: string[]): boolean;
}

export interface Lesson {
  id: string;
  kind?: LessonKind;
  /** Short label for exercises ("P1", "D1"); lessons show their number. */
  code?: string;
  /** The theme, shown beside the label ("Premiers pas"). */
  module: string;
  level: Level;
  /** Position among the lessons of the path, set by core/lessons/index.ts. */
  number: number;
  title: string;
  situation: string;
  notions: string[];
  /** The one line to keep, shown once the lesson is passed. */
  remember: string;
  cards: LessonCard[];
  objectives: string[];
  /** Three levels of help: a hint, the nodes to use, the solution. */
  hints: [string, string, string];
  challenge?: string;
  setup(): Project;
  scenario: ScenarioStep[];
  checks: Check[];
  /** Builds a correct answer on the setup project (used by tests). */
  solve(p: Project): void;
  /** For "predict" exercises. */
  predict?: Prediction;
  robustness?: RobustnessCase[];
  alternatives?: Alternative[];
  avoid?: Avoid[];
  /** Its place in a chain guided → transfer → autonomy on one notion (see LessonChain). */
  chain?: LessonChain;
  /**
   * Notions taught earlier that this step makes the learner write again, in
   * a small part of it (one or two nodes): spaced practice, so nothing is
   * forgotten. Ids of core/notions; tests/spacing.test.ts checks that the
   * reference solution really writes them.
   */
  recalls?: string[];
  /**
   * Revision of the starting project and of the checks (1 when absent). Raise
   * it when a change would leave work already started out of step: the
   * learner is then told the lesson changed and can start it again.
   */
  revision?: number;
  /**
   * Save slots the lesson starts with (a game saved "before"). A check run
   * starts from these, not from the slots the learner's own Play left.
   */
  slots?: () => Record<string, SavedGame>;
}

/**
 * Learning one notion in three steps: guided (every explanation and hint),
 * transfer (the same notion in another situation, no list of nodes, hints
 * only after a first check), autonomy (a brief only, offered a few days
 * later: coming back to it after a while is what makes it stick).
 */
/**
 * The rungs of a notion's ladder, from the most help to none: discover
 * (predict, read and run), guided (step by step), modify (complete or
 * rework a graph), transfer (another situation, hints after a try),
 * autonomy (a brief only, a few days later).
 */
export type ChainStep = 'discover' | 'guided' | 'modify' | 'transfer' | 'autonomy';

export const LADDER: ChainStep[] = ['discover', 'guided', 'modify', 'transfer', 'autonomy'];

export interface LessonChain {
  /** The notion the chain works on (an id of core/notions). */
  notion: string;
  step: ChainStep;
  /** A delayed step: offered `days` days after `lesson` is passed (still open before, if the learner insists). */
  after?: { lesson: string; days: number };
}

/** Transfer and autonomy exercises have a code (T1, A1) and no lesson number; so has a synthesis (S1). */
export const isChainExercise = (l: Lesson) => l.chain?.step === 'transfer' || l.chain?.step === 'autonomy';

/** "Leçon 4", "Prédis P1", "Débogue D1", "Complète C1", "Refactor R1". */
export function lessonLabel(l: Lesson): string {
  if (l.kind === 'predict') return `Prédis ${l.code ?? ''}`.trim();
  if (l.kind === 'debug') return `Débogue ${l.code ?? ''}`.trim();
  if (l.kind === 'complete') return `Complète ${l.code ?? ''}`.trim();
  if (l.kind === 'refactor') return `Refactor ${l.code ?? ''}`.trim();
  if (l.kind === 'synthesis') return `Synthèse ${l.code ?? ''}`.trim();
  if (l.chain?.step === 'transfer') return `Transfert ${l.code ?? ''}`.trim();
  if (l.chain?.step === 'autonomy') return `Autonomie ${l.code ?? ''}`.trim();
  return `Leçon ${l.number}`;
}
