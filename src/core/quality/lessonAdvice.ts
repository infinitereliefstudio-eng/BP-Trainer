/** Construction advice for a lesson: only what the learner added to the starting project. */
import type { Lesson } from '../lessons/types';
import type { Project } from '../model/project';
import { adviceFor, type Advice } from './advice';

const key = (a: Advice) => `${a.className}|${a.rule}`;

/**
 * Advice on `project` at the lesson's level, minus what the lesson's own
 * starting project already triggers (props given with their logic).
 */
export function newAdvice(lesson: Lesson, project: Project): Advice[] {
  const given = new Map<string, number>();
  for (const a of adviceFor(lesson.setup(), lesson.level)) given.set(key(a), (given.get(key(a)) ?? 0) + 1);
  const out: Advice[] = [];
  for (const a of adviceFor(project, lesson.level)) {
    const left = given.get(key(a)) ?? 0;
    if (left > 0) given.set(key(a), left - 1);
    else out.push(a);
  }
  return out;
}
