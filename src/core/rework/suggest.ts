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
import { familiesFor, getDrill, nextDrillId, parseDrillId } from '../drills';
import type { Family } from '../drills/types';
import { readableLog } from '../progress/attempts';
import type { Progress } from '../progress/progress';
import { dueRework, type NotionSchedule, REWORK_INTERVALS, stepsFor } from './schedule';

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

/** The drill to offer for a family: the one left unfinished, or the next one, in the format the notion is at. */
export function drillFor(family: Family, box: number, p: Pick<Progress, 'log' | 'rework'>): Lesson {
  const open = p.rework?.open?.find((id) => parseDrillId(id)?.family === family.id);
  if (open) {
    const drill = getDrill(open);
    if (drill) return drill;
  }
  const attempts = readableLog(p.log) ? p.log.attempts : [];
  const tried = new Set(attempts.filter((a) => parseDrillId(a.lesson)?.family === family.id).map((a) => a.lesson)).size;
  return getDrill(nextDrillId(family, box, tried))!;
}

/**
 * One card of the queue: the notions due that one practice covers at once,
 * the most overdue first. Notions of a drill family (Variables and Branch…)
 * share a card, and its first suggestion is a drill of the family; other
 * notions share a card when the same step practises them (Leçon 1 covers
 * Fil d'exécution and Print String at once).
 */
export interface ReworkCard {
  notions: NotionSchedule[];
  /** What to practise, the best first: a drill, then passed steps. */
  steps: Lesson[];
}

export function reworkCards(p: Progress, now: number): ReworkCard[] {
  const groups = new Map<string, { family?: Family; notions: NotionSchedule[] }>();
  for (const s of dueRework(p, now)) {
    const family = familiesFor(s.notion)[0];
    const key = family ? `family:${family.id}` : suggestedSteps(s, p.done)[0].id;
    const group = groups.get(key);
    if (group) group.notions.push(s);
    else groups.set(key, { family, notions: [s] });
  }
  return [...groups.values()].map(({ family, notions }) => {
    // The steps that practise the most of the card's notions first (stable: the best suggestion stays first).
    const covers = (l: Lesson) => notions.filter((n) => (LESSON_NOTIONS[l.id]?.teaches ?? []).includes(n.notion)).length;
    const steps = [...suggestedSteps(notions[0], p.done)].sort((a, b) => covers(b) - covers(a));
    if (!family) return { notions, steps };
    // A drill at the pace of the least advanced notion of the card.
    const box = Math.min(...notions.map((n) => n.box));
    return { notions, steps: [drillFor(family, box, p), ...steps] };
  });
}
