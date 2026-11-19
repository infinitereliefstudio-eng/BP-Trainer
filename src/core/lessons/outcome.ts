/**
 * What one Vérifier found, in the words of the attempt log
 * (core/progress/attempts.ts): the kinds of error the checker already tells
 * apart, and the checks that failed, by id. Taken from the run only, like
 * « Montre-moi » (explain/stops.ts), never from what the lesson expects.
 */
import { whereItStopped } from '../explain/stops';
import type { CheckOutcome, ErrorKind } from '../progress/attempts';
import { HOLD_NOTE, type LessonRun, ORDER_NOTE } from './runner';

/** The runtime message, as the Output Log writes it: Blueprint Runtime Error: "Accessed None trying…". */
const ACCESSED_NONE = /\bAccessed None trying\b/;

export function checkOutcome(run: LessonRun): CheckOutcome {
  const kinds = new Set<ErrorKind>();
  if (run.compileErrors.length) kinds.add('compile');
  for (const e of run.runtimeErrors) kinds.add(ACCESSED_NONE.test(e) ? 'accessed-none' : 'runtime');
  if (run.notes.includes(ORDER_NOTE)) kinds.add('order');
  if (run.notes.includes(HOLD_NOTE)) kinds.add('hold');
  if (!run.passed && run.sim) {
    for (const stop of whereItStopped(run.sim.project, run.sim)) {
      if (stop.kind === 'silent') kinds.add('never-fired');
      else if (stop.kind === 'stopped') kinds.add('not-reached');
    }
  }
  const failed: string[] = [];
  const missed: string[] = [];
  for (const r of run.results) {
    if (r.ok) continue;
    (r.check.notion ? missed : failed).push(r.check.id);
  }
  return { passed: run.passed, errors: [...kinds], failed, missed };
}
