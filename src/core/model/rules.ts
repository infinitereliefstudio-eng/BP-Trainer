/**
 * Versions of the simulation rules, apart from the file format.
 *
 * The file format (PROJECT_FORMAT) says how a project is written. The rules
 * say how a graph behaves: when a default changes (Gate Start Closed,
 * Consume Input), a graph saved earlier can behave differently without any
 * visible change. Each such change is listed here; a project remembers the
 * rules it was last opened under, and the learner is told what changed.
 */
import type { Project } from './project';

export interface RuleChange {
  version: number;
  /** When the change was published: a project saved before it was made under the older rules. */
  since: number;
  app: string;
  text: string;
}

export const RULE_CHANGES: readonly RuleChange[] = [
  {
    version: 2,
    since: Date.parse('2026-11-17T15:49:02+01:00'),
    app: '6.2',
    text:
      'Gate : Start Closed est coché par défaut, comme dans UE (un Gate dont tu n’avais pas touché la case démarre fermé). Physics Only ne bloque plus le joueur. Destroy Actor laisse finir le fil en cours. Les Float s’affichent comme dans UE (1.5 au lieu de 1.500000).',
  },
  {
    version: 3,
    since: Date.parse('2026-11-17T17:26:04+01:00'),
    app: '7.1',
    text:
      'Touches : Consume Input est coché par défaut. Si plusieurs acteurs écoutent la même touche, seul le dernier posé la reçoit ; décoche Consume Input pour que tous la reçoivent.',
  },
  {
    version: 4,
    since: Date.parse('2026-11-19T16:40:00+01:00'),
    app: '7.23',
    text:
      'Enhanced Input : Add et Remove Mapping Context ont l’option Ignore All Pressed Keys Until Release, cochée par défaut comme dans UE. Une touche déjà enfoncée au moment où un contexte est ajouté ou retiré ne compte pour les associations qui deviennent actives qu’une fois relâchée.',
  },
];

export const RULES_VERSION = RULE_CHANGES[RULE_CHANGES.length - 1].version;

/** The rules a project was last opened under (guessed from its last save for projects older than this field). */
export function projectRules(p: Pick<Project, 'rules' | 'updatedAt'>): number {
  if (typeof p.rules === 'number') return p.rules;
  let version = 1;
  for (const c of RULE_CHANGES) if (p.updatedAt >= c.since) version = c.version;
  return version;
}

/** The changes a project has not been opened under yet. */
export function rulesChangedSince(p: Pick<Project, 'rules' | 'updatedAt'>): RuleChange[] {
  const from = projectRules(p);
  return RULE_CHANGES.filter((c) => c.version > from);
}

/** The message for the learner, or undefined when nothing changed. */
export function rulesNotice(changes: readonly RuleChange[]): string | undefined {
  if (!changes.length) return undefined;
  const list = changes.map((c) => `(v${c.app}) ${c.text}`).join(' ');
  return `Ce projet a été enregistré avant un changement des règles de simulation, il peut se comporter autrement : ${list}`;
}
