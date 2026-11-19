/**
 * How a lesson was passed, from the least help to the most. Never a penalty:
 * a fact to come back to.
 */
export type HelpLevel = 'alone' | 'hints' | 'solution';
export const HELP_RANK: Record<HelpLevel, number> = { alone: 0, hints: 1, solution: 2 };
export const HELP_LEVELS = Object.keys(HELP_RANK) as HelpLevel[];
