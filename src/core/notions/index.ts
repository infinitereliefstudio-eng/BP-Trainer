/** The notions of the path: what each step teaches and needs, what the learner has acquired. */
import { getNotion, type Notion } from './catalogue';
import { LESSON_NOTIONS, type StepNotions } from './lessonNotions';

export { getNotion, NOTIONS, type Notion } from './catalogue';
export type { StepNotions } from './lessonNotions';

const NONE: StepNotions = { teaches: [], requires: [] };

export function stepNotions(lessonId: string): StepNotions {
  return LESSON_NOTIONS[lessonId] ?? NONE;
}

/** Notions taught by the steps already passed. */
export function acquiredNotions(done: Iterable<string>): Set<string> {
  const out = new Set<string>();
  for (const id of done) for (const n of stepNotions(id).teaches) out.add(n);
  return out;
}

/** The notions a step needs that no passed step has taught yet. */
export function missingNotions(lessonId: string, acquired: ReadonlySet<string>): Notion[] {
  const own = new Set(stepNotions(lessonId).teaches);
  return stepNotions(lessonId)
    .requires.filter((n) => !acquired.has(n) && !own.has(n))
    .map((n) => getNotion(n))
    .filter((n): n is Notion => !!n);
}
