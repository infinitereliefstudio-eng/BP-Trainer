/**
 * The search and filters of Apprendre › Parcours (UI-2, V7.85), without the DOM: a few words matched against the
 * title, the situation, the code and the notions of each step; its state (to do, passed, to take up again), its
 * format and its length.
 */
import { chapterOf } from '@core/lessons/chapters';
import { estimatedMinutes } from '@core/lessons/duration';
import { type Lesson, lessonLabel } from '@core/lessons/types';
import { getNotion } from '@core/notions';
import { LESSON_NOTIONS } from '@core/notions/lessonNotions';
import type { Progress } from '@core/progress/progress';

export type StateFilter = 'all' | 'todo' | 'done' | 'redo';
export type FormatFilter = 'all' | 'lesson' | 'exercise' | 'chain' | 'mixed' | 'project';
export type LengthFilter = 'all' | 'short' | 'medium' | 'long';

export interface PathFilter {
  query: string;
  state: StateFilter;
  format: FormatFilter;
  length: LengthFilter;
}

export const NO_FILTER: PathFilter = { query: '', state: 'all', format: 'all', length: 'all' };

export const STATE_LABEL: Record<StateFilter, string> = { all: 'Toutes', todo: 'À faire', done: 'Réussies', redo: 'À reprendre' };
export const FORMAT_LABEL: Record<FormatFilter, string> = {
  all: 'Tous',
  lesson: 'Leçons',
  exercise: 'Exercices P D C R',
  chain: 'Transferts T A',
  mixed: 'Mélanges M S',
  project: 'Projets X',
};
export const LENGTH_LABEL: Record<LengthFilter, string> = { all: 'Toutes', short: '≤ 10 min', medium: '15 à 20 min', long: 'Plus de 20 min' };

/** Whether anything narrows the path (then it shows every match, unfolded). */
export function isFiltered(f: PathFilter): boolean {
  return f.query.trim() !== '' || f.state !== 'all' || f.format !== 'all' || f.length !== 'all';
}

export function formatOf(l: Lesson): Exclude<FormatFilter, 'all'> {
  if (l.code?.startsWith('X')) return 'project';
  if (l.code?.startsWith('M') || l.kind === 'synthesis') return 'mixed';
  if (l.chain?.step === 'transfer' || l.chain?.step === 'autonomy') return 'chain';
  if (l.kind && l.kind !== 'build') return 'exercise';
  return 'lesson';
}

/**
 * À reprendre: a step begun and not passed (help asked, a Vérifier pressed, a milestone passed), or passed only
 * after seeing its solution.
 */
export function toTakeUp(l: Lesson, p: Progress): boolean {
  if (p.done.includes(l.id)) return p.passedWith?.[l.id] === 'solution';
  return !!p.help?.[l.id] || !!p.milestones?.[l.id] || !!p.log?.attempts.some((a) => a.lesson === l.id && !a.again);
}

function lengthOf(l: Lesson): Exclude<LengthFilter, 'all'> {
  const m = estimatedMinutes(l);
  return m <= 10 ? 'short' : m <= 20 ? 'medium' : 'long';
}

/** Lower case, without accents or typographic apostrophes: « Mémo », « memo » and « MÉMO » are the same. */
export const fold = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’‘]/g, "'")
    .toLowerCase();

const haystacks = new Map<string, string>();

/** Everything the search reads for a step, folded once. */
function haystack(l: Lesson): string {
  const known = haystacks.get(l.id);
  if (known) return known;
  const notions = (LESSON_NOTIONS[l.id]?.teaches ?? []).map((id) => getNotion(id)?.title ?? '');
  const text = fold([l.title, l.situation, l.code ?? '', lessonLabel(l), ...(l.notions ?? []), ...notions, chapterOf(l.id)?.title ?? ''].join(' \n '));
  haystacks.set(l.id, text);
  return text;
}

export function matches(l: Lesson, f: PathFilter, p: Progress): boolean {
  const words = fold(f.query).split(/\s+/).filter(Boolean);
  if (words.length && !words.every((w) => haystack(l).includes(w))) return false;
  const done = p.done.includes(l.id);
  if (f.state === 'todo' && done) return false;
  if (f.state === 'done' && !done) return false;
  if (f.state === 'redo' && !toTakeUp(l, p)) return false;
  if (f.format !== 'all' && formatOf(l) !== f.format) return false;
  if (f.length !== 'all' && lengthOf(l) !== f.length) return false;
  return true;
}
