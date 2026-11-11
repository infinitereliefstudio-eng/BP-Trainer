/**
 * The node index: every node of the palette with its description, its
 * "Piège" and "Dans UE" notes, and the lessons whose reference solution
 * uses it. Readable outside the editor, from the home screen.
 */
import { inUeOf, trapOf } from '../explain/notes';
import { LESSONS } from '../lessons';
import type { NodeDefinition } from '../nodes/definition';
import { allDefinitions } from '../nodes/registry';

export interface NodeCard {
  id: string;
  title: string;
  /** "Utilities › Flow Control". */
  category: string;
  kind: NodeDefinition['kind'];
  description: string;
  keywords: string[];
  trap?: string;
  inUe?: string;
}

/** Names for nodes whose title depends on the project (variables, structures…). */
const GENERIC_TITLES: Record<string, string> = {
  'var.get': 'Get (variable)',
  'var.set': 'Set (variable)',
  'var.getLocal': 'Get (variable locale)',
  'var.setLocal': 'Set (variable locale)',
  'var.component': 'Get (composant)',
  'var.getExternal': 'Get (variable d’un autre Blueprint)',
  'var.setExternal': 'Set (variable d’un autre Blueprint)',
  'flow.switchEnum': 'Switch on Enum',
  'struct.make': 'Make (structure)',
  'struct.break': 'Break (structure)',
  'struct.setMembers': 'Set Members in (structure)',
};

const titleOf = (d: NodeDefinition): string | undefined => GENERIC_TITLES[d.id] ?? (typeof d.title === 'string' ? d.title : undefined);

let cards: NodeCard[] | undefined;

/** Every node that has a fixed name, sorted by category then title. */
export function nodeCards(): NodeCard[] {
  cards ??= allDefinitions()
    .flatMap((d): NodeCard[] => {
      const title = titleOf(d);
      if (!title || d.kind === 'comment' || !d.description) return [];
      return [
        {
          id: d.id,
          title,
          category: d.category.replace(/\|/g, ' › '),
          kind: d.kind,
          description: d.description,
          keywords: d.keywords ?? [],
          trap: trapOf(d.id),
          inUe: inUeOf(d.id),
        },
      ];
    })
    .sort((a, b) => a.category.localeCompare(b.category) || a.title.localeCompare(b.title));
  return cards;
}

let usage: Map<string, string[]> | undefined;

/**
 * Node id → ids of the lessons where it appears, in the starting project or
 * in the reference solution. Built once, on first use (it builds every lesson).
 */
export function lessonsByNode(): Map<string, string[]> {
  if (usage) return usage;
  usage = new Map();
  for (const lesson of LESSONS) {
    const seen = new Set<string>();
    try {
      const p = lesson.setup();
      lesson.solve(p);
      for (const cls of p.classes) for (const g of cls.graphs) for (const n of Object.values(g.nodes)) seen.add(n.def);
    } catch {
      /* a lesson that cannot be built is simply not listed */
    }
    for (const def of seen) usage.set(def, [...(usage.get(def) ?? []), lesson.id]);
  }
  return usage;
}
