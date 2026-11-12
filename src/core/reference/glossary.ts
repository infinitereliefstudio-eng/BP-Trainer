/**
 * Help on a notion named by a lesson: a glossary entry when there is one,
 * otherwise the node of that name (its description and its "Piège" note).
 * Also tells where in the path a notion was first met.
 */
import { trapOf } from '../explain/notes';
import { LESSONS } from '../lessons';
import type { Lesson } from '../lessons/types';
import { allDefinitions } from '../nodes/registry';
import { GLOSSARY } from './glossaryData';

export interface NotionHelp {
  title: string;
  what: string;
  when?: string;
  trap?: string;
  pattern?: string;
}

const norm = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/’/g, "'")
    .toLowerCase()
    .trim();

let byName: Map<string, NotionHelp> | undefined;

function index(): Map<string, NotionHelp> {
  if (byName) return byName;
  byName = new Map();
  // Nodes first, so that a glossary entry of the same name replaces the bare description.
  for (const d of allDefinitions()) {
    if (typeof d.title !== 'string' || !d.description) continue;
    byName.set(norm(d.title), { title: d.title, what: d.description, trap: trapOf(d.id) });
  }
  for (const e of GLOSSARY) {
    const help: NotionHelp = { title: e.title, what: e.what, when: e.when, trap: e.trap, pattern: e.pattern };
    for (const n of e.names) byName.set(norm(n), help);
  }
  return byName;
}

export function notionHelp(notion: string): NotionHelp | undefined {
  return index().get(norm(notion));
}

/** The first lesson of the path, before `lesson`, that names this notion (same help card). */
export function firstSeen(notion: string, lesson: Lesson): Lesson | undefined {
  const help = notionHelp(notion);
  for (const l of LESSONS) {
    if (l === lesson) return undefined;
    if (l.notions.some((n) => norm(n) === norm(notion) || (help && notionHelp(n) === help))) return l;
  }
  return undefined;
}
