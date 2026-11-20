/**
 * The free-play projects as a list (V7.41): what a saved project text says
 * about itself without opening it, and the rules for project names. Pure:
 * storage lives in `storage/projects.ts`.
 */

export interface ProjectSummary {
  name: string;
  /** Last change to the model (ms since 1970). */
  updatedAt: number;
  /** Blueprints in the project (classes, interfaces aside). */
  blueprints: number;
  /** Set when the text is not a readable project: why. */
  damaged?: string;
}

/** Reads the name, date and size of a saved project, without migrating it. */
export function summarizeProjectText(text: string, fallbackName: string): ProjectSummary {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { name: fallbackName, updatedAt: 0, blueprints: 0, damaged: 'illisible' };
  }
  const file = data as { kind?: unknown; project?: { name?: unknown; updatedAt?: unknown; classes?: unknown } } | null;
  const p = file?.project;
  if (!p || typeof p !== 'object') return { name: fallbackName, updatedAt: 0, blueprints: 0, damaged: 'pas un projet BP Trainer' };
  return {
    name: typeof p.name === 'string' && p.name.trim() ? p.name : fallbackName,
    updatedAt: typeof p.updatedAt === 'number' ? p.updatedAt : 0,
    blueprints: Array.isArray(p.classes) ? p.classes.length : 0,
  };
}

export const MAX_NAME_LENGTH = 60;

/** The name as it will be kept, or an error message for the learner. */
export function checkProjectName(raw: string, taken: string[]): { name: string } | { error: string } {
  const name = raw.trim().replace(/\s+/g, ' ');
  if (!name) return { error: 'Donne un nom au projet.' };
  if (name.length > MAX_NAME_LENGTH) return { error: `${MAX_NAME_LENGTH} caractères au plus.` };
  if (taken.some((t) => t.toLocaleLowerCase('fr') === name.toLocaleLowerCase('fr'))) return { error: 'Un autre projet porte déjà ce nom.' };
  return { name };
}

/** `base`, or `base 2`, `base 3`… : the first one no project uses. */
export function uniqueName(base: string, taken: string[]): string {
  const used = new Set(taken.map((t) => t.toLocaleLowerCase('fr')));
  const clean = base.trim() || 'Projet';
  if (!used.has(clean.toLocaleLowerCase('fr'))) return clean;
  for (let i = 2; ; i++) {
    const candidate = `${clean} ${i}`;
    if (!used.has(candidate.toLocaleLowerCase('fr'))) return candidate;
  }
}

/** The name of a copy: « Mon projet (copie) », then « Mon projet (copie) 2 »… */
export const copyName = (name: string, taken: string[]): string => uniqueName(`${name} (copie)`, taken);
