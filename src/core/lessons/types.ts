/** Lesson format: explanations, a starting project, a scenario and checks. */
import type { NodeInstance, Project } from '../model/project';
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
  | { checkpoint: string };

export interface CheckContext {
  sim: Simulation;
  project: Project;
  actor(label: string): ActorRT | undefined;
  component(actorLabel: string, componentName: string): ComponentRT | undefined;
  /** Texts printed with Print String so far. */
  prints(): string[];
  /** A variable of an actor (level label, or "Joueur" for the player), by name. */
  variable(actorLabel: string, name: string): RValue | undefined;
  nodes(className: string): NodeInstance[];
}

export interface Check {
  id: string;
  /** Shown in the checklist: what is verified, in plain words. */
  label: string;
  /** Checkpoint at which to evaluate; the end of the scenario if absent. */
  at?: string;
  /** true when satisfied, otherwise the reason shown to the learner. */
  test(cx: CheckContext): true | string;
}

/**
 * build: make something work. predict: read a Blueprint and choose what it
 * will print, then check with Play. debug: a broken Blueprint to repair.
 */
export type LessonKind = 'build' | 'predict' | 'debug';

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
  module: string;
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
}

/** "Leçon 4", "Prédis P1", "Débogue D1". */
export function lessonLabel(l: Lesson): string {
  if (l.kind === 'predict') return `Prédis ${l.code ?? ''}`.trim();
  if (l.kind === 'debug') return `Débogue ${l.code ?? ''}`.trim();
  return `Leçon ${l.number}`;
}
