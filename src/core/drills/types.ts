/**
 * Short drills with variants (chantier n° 2, étape C): 2 to 5 minutes on one
 * small Blueprint, offered by the « À retravailler en Blueprint » queue.
 *
 * A family gathers a few situations on the same notions. Each situation
 * knows how to build its starting level and its reference chain, how to
 * check the behaviour, and the typical mistakes it can be broken with. A
 * drill is one situation, in one format, with numbers and a mistake drawn
 * from a seed:
 * - complete: the reference chain with two or three nodes taken out, their
 *   places framed in yellow and named;
 * - repair: the reference chain with one typical mistake in it;
 * - rebuild: an empty graph, the variables in place.
 * Variants change the reasoning (a second instance, an actor that must not
 * count, an exact count rather than "from then on"), not only the numbers.
 */
import type { Project } from '../model/project';
import type { ClassBuilder } from '../lessons/builder';
import type { Check, ScenarioStep } from '../lessons/types';
import type { Rng } from './rng';

export type DrillFormat = 'complete' | 'repair' | 'rebuild';
export const DRILL_FORMATS: DrillFormat[] = ['complete', 'repair', 'rebuild'];

/** A node of the reference chain that a "complete" drill can take out. */
export interface Gap {
  /** The role given by `chain` to the node. */
  role: string;
  /** What to place there, as the yellow frame says it: « Increment Int (Passages) ». */
  label: string;
}

/** A typical mistake, applied to a project holding the reference chain. */
export interface Mistake<P> {
  id: string;
  /** What it is, for the docs and the tests: « l’Increment est posé à côté du fil ». */
  what: string;
  apply(p: Project, roles: Record<string, string>, params: P): void;
  /** Only in some variants: where the mistake would still pass (a plain Set where only one bonus is taken). */
  applies?(params: P): boolean;
}

export interface Situation<P> {
  id: string;
  title: string;
  /** Draws the numbers and the variant. */
  params(r: Rng): P;
  /** The level, the classes and their variables, with empty graphs. */
  base(params: P): Project;
  /** The class whose Event Graph the learner works in. */
  className: string;
  /** Builds the reference chain in that graph; returns its nodes by role. */
  chain(b: ClassBuilder, p: Project, params: P): Record<string, string>;
  /** What the Blueprint must do, for the learner (one paragraph). */
  situation(params: P): string;
  objectives(params: P): string[];
  /** A hint (a question), then the nodes, then the solution in words. */
  hints(params: P): [string, string, string];
  remember: string;
  /** Labels of the glossary (Lesson.notions). */
  notions: string[];
  scenario(params: P): ScenarioStep[];
  checks(params: P): Check[];
  /** Sets of two or three nodes a "complete" drill can take out. */
  gaps: Gap[][];
  mistakes: Mistake<P>[];
}

export interface Family {
  id: string;
  title: string;
  /** Notions of core/notions the family practises. */
  notions: string[];
  level: 'debutant' | 'intermediaire';
  // biome-ignore lint/suspicious/noExplicitAny: each situation has its own parameters.
  situations: Situation<any>[];
}
