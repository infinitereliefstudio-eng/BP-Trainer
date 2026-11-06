/** Lesson format: explanations, a starting project, a scenario and checks. */
import type { NodeInstance, Project } from '../model/project';
import type { InputKey, Simulation } from '../runtime/simulation';
import type { ActorRT, ComponentRT } from '../runtime/world';

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

export interface Lesson {
  id: string;
  module: string;
  number: number;
  title: string;
  situation: string;
  notions: string[];
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
}
