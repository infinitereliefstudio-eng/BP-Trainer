/**
 * Which step to redo for a notion of the « À retravailler en Blueprint »
 * queue, and how to tell the learner why it is there. Until the short
 * exercises with variants exist (chantier n° 2, étape C), a practice is a
 * passed step redone from scratch.
 */
import { estimatedMinutes } from '../lessons/duration';
import type { Lesson } from '../lessons/types';
import { getNotion } from '../notions/catalogue';
import { LESSON_NOTIONS } from '../notions/lessonNotions';
import { DAY } from '../review/schedule';
import { dueRework, type NotionSchedule, REWORK_INTERVALS, stepsFor } from './schedule';
import type { Progress } from '../progress/progress';

/** Formats that make the learner do more than redo the same build. */
const varied = (l: Lesson) => (l.kind && l.kind !== 'build') || l.chain?.step === 'transfer' || l.chain?.step === 'autonomy';

/**
 * The steps to offer, the best first: not the one practised last time when
 * there is another; early on, the shortest; later, a repair or a transfer
 * before a plain build.
 */
export function suggestedSteps(s: NotionSchedule, done: readonly string[]): Lesson[] {
  const all = stepsFor(s.notion, done);
  const order = new Map(all.map((l, i) => [l.id, i]));
  const score = (l: Lesson) => [l.id === s.last.step && all.length > 1 ? 1 : 0, s.box >= 2 && !varied(l) ? 1 : 0, estimatedMinutes(l), order.get(l.id) ?? 0];
  return [...all].sort((a, b) => {
    const x = score(a);
    const y = score(b);
    for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) return x[i] - y[i];
    return 0;
  });
}

const ago = (t: number, now: number) => {
  const d = Math.floor((now - t) / DAY);
  return d <= 0 ? 'aujourd’hui' : d === 1 ? 'hier' : `il y a ${d} jours`;
};

const HOW: Record<NotionSchedule['last']['result'], string> = {
  alone: 'réussie sans aide',
  hints: 'réussie avec des indices',
  solution: 'réussie après avoir vu la solution',
  failed: 'pas réussie',
};

/** One line on why the notion is in the queue today. */
export function whyNow(s: NotionSchedule, now: number): string {
  const what = s.last.practice ? 'Dernière reprise' : 'Dernière pratique';
  if (!s.last.t) return 'Apprise avant le journal des essais : un premier rappel, pour voir si elle tient.';
  const when = `${what} ${ago(s.last.t, now)}, ${HOW[s.last.result]}`;
  const next = s.last.result === 'failed' || s.last.result === 'solution' ? 'on revient vite dessus' : s.box === 0 ? 'premier rappel le lendemain' : `rappel à J+${REWORK_INTERVALS[s.box]}`;
  return `${when} : ${next}.`;
}

export const notionTitle = (id: string) => getNotion(id)?.title ?? id;

/**
 * One card of the queue: the notions due that the same step practises
 * together (Leçon 1 covers Événements, Fil d'exécution and Print String at
 * once), the most overdue first. Redoing the step counts for each of them.
 */
export interface ReworkCard {
  notions: NotionSchedule[];
  /** The steps to offer, the best first (for the first notion). */
  steps: Lesson[];
}

export function reworkCards(p: Progress, now: number): ReworkCard[] {
  const cards = new Map<string, ReworkCard>();
  for (const s of dueRework(p, now)) {
    const steps = suggestedSteps(s, p.done);
    const card = cards.get(steps[0].id);
    if (card) card.notions.push(s);
    else cards.set(steps[0].id, { notions: [s], steps });
  }
  // Within a card, the steps that practise the most of its notions first (stable: the best suggestion stays first).
  for (const card of cards.values()) {
    const covers = (l: Lesson) => card.notions.filter((n) => (LESSON_NOTIONS[l.id]?.teaches ?? []).includes(n.notion)).length;
    card.steps = [...card.steps].sort((a, b) => covers(b) - covers(a));
  }
  return [...cards.values()];
}
