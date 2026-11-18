/**
 * How much help a step gives, set by its level and not lesson by lesson:
 * open up to Intermédiaire, locked from Confirmé (Tristan's choice, 18
 * November 2026). A step has up to three helps, in order: a hint, the nodes
 * to use, the solution. A level can leave one out (no node list from
 * Confirmé) or open it only after trying (Vérifier), after failing, or after
 * succeeding. Transfer and autonomy steps of a chain are stricter still:
 * no hint before a first try, and no node list in autonomy.
 */
import type { Level } from './levels';
import type { Lesson } from './types';

export type HelpKind = 'hint' | 'nodes' | 'solution';

/** When a help opens. */
export type Gate =
  | { open: true }
  /** After Vérifier was pressed once. */
  | { afterTry: true }
  /** After the step is passed, or after `fails` failed checks. */
  | { afterSuccess: true; orFails?: number }
  /** Never offered at this level. */
  | { absent: true };

export type HelpRule = Record<HelpKind, Gate>;

const OPEN: HelpRule = { hint: { open: true }, nodes: { open: true }, solution: { open: true } };

export const HELP_RULES: Record<Level, HelpRule> = {
  debutant: OPEN,
  intermediaire: OPEN,
  confirme: { hint: { afterTry: true }, nodes: { absent: true }, solution: { afterSuccess: true, orFails: 3 } },
  avance: { hint: { afterTry: true }, nodes: { absent: true }, solution: { afterSuccess: true } },
  expert: { hint: { absent: true }, nodes: { absent: true }, solution: { afterSuccess: true } },
};

/** What the learner did on the step so far (kept in the progress). */
export interface HelpState {
  /** Vérifier pressed at least once. */
  tried: boolean;
  /** Failed checks since the step was (re)started. */
  fails: number;
  done: boolean;
}

export interface HelpOffer {
  kind: HelpKind;
  /** Position in `Lesson.hints` (0 hint, 1 nodes, 2 solution). */
  index: number;
  available: boolean;
  /** Why it is not open yet, for the learner. */
  locked?: string;
}

const INDEX: Record<HelpKind, number> = { hint: 0, nodes: 1, solution: 2 };
const KINDS: HelpKind[] = ['hint', 'nodes', 'solution'];

/** The rule of a step: its level's, made stricter by its place in a chain. */
export function ruleFor(lesson: Lesson): HelpRule {
  // A « Prédis » is the first rung of a notion (discover): answered, not checked, its help stays open.
  if (lesson.kind === 'predict') return OPEN;
  const rule: HelpRule = { ...HELP_RULES[lesson.level] };
  const step = lesson.chain?.step;
  if (step === 'transfer' || step === 'autonomy') {
    for (const k of KINDS) if ('open' in rule[k]) rule[k] = { afterTry: true };
  }
  if (step === 'autonomy') rule.nodes = { absent: true };
  return rule;
}

function open(gate: Gate, s: HelpState): { available: boolean; locked?: string } {
  if ('open' in gate) return { available: true };
  if ('afterTry' in gate) return s.tried || s.done ? { available: true } : { available: false, locked: 'après un premier essai : construis ce que tu peux, puis touche Vérifier' };
  if ('afterSuccess' in gate) {
    if (s.done) return { available: true };
    if (gate.orFails !== undefined && s.fails >= gate.orFails) return { available: true };
    if (gate.orFails === undefined) return { available: false, locked: 'après la réussite, pour comparer avec ta solution' };
    const left = gate.orFails - s.fails;
    return { available: false, locked: `après la réussite, ou après ${gate.orFails} vérifications ratées (encore ${left})` };
  }
  return { available: false };
}

/** The helps this step offers, in order, each open or with the reason it is not yet. */
export function helpOffers(lesson: Lesson, state: HelpState): HelpOffer[] {
  const rule = ruleFor(lesson);
  return KINDS.filter((k) => !('absent' in rule[k])).map((kind) => ({ kind, index: INDEX[kind], ...open(rule[kind], state) }));
}
