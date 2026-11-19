/**
 * The attempt log: one compact line per attempt at a step, kept in the
 * progress. It is what the spaced Blueprint reviews will be planned from
 * (chantier n° 2): which steps were tried, passed or not, with how much help,
 * and which kinds of error the checker met on the way.
 *
 * An attempt starts at the first Vérifier on a step and gathers every
 * Vérifier that follows, until the step is passed, started over
 * (Recommencer), changed by an update of the app, or left for ATTEMPT_GAP.
 * Nothing else is logged: no gestures, no graphs.
 *
 * The log is versioned on its own (`AttemptLog.v`): a log written by a newer
 * app is kept as it is, never rewritten by an older one.
 */
import { type HelpLevel, HELP_LEVELS } from './helpLevel';

/** The kinds of error the checker already tells apart, from the most blocking. */
export type ErrorKind =
  /** Compilation errors: the scenario did not run. */
  | 'compile'
  /** Accessed None (an empty reference, or an actor destroyed earlier). */
  | 'accessed-none'
  /** Any other runtime error (infinite loop, wrong index…). */
  | 'runtime'
  /** An event with wires never fired during the check. */
  | 'never-fired'
  /** A node ran, but the white wire never reached the next one. */
  | 'not-reached'
  /** Passed in level order only (BeginPlay order). */
  | 'order'
  /** Passed with instant key presses only. */
  | 'hold';

export const ERROR_KINDS: ErrorKind[] = ['compile', 'accessed-none', 'runtime', 'never-fired', 'not-reached', 'order', 'hold'];

/** What one Vérifier found, as the log keeps it. */
export interface CheckOutcome {
  passed: boolean;
  /** Each kind of error met at least once in this run. */
  errors: ErrorKind[];
  /** Ids of the blocking checks that failed. */
  failed: string[];
  /** Ids of the notion checks (never blocking) that were not met. */
  missed: string[];
}

export interface Attempt {
  /** The step (lesson id). */
  lesson: string;
  /** The step's content revision (Lesson.revision, 1 when absent). */
  rev: number;
  /** First and last Vérifier of the attempt (ms). */
  start: number;
  end: number;
  /** How many times Vérifier was pressed. */
  checks: number;
  passed: boolean;
  /** The step was already passed when this attempt started (a replay). */
  again?: boolean;
  /** Redone from scratch from the « À retravailler en Blueprint » queue, apart from the lesson's own project. */
  practice?: boolean;
  /** The help used by the last Vérifier (the help of a step only grows until Recommencer). */
  help: HelpLevel;
  /** Hints shown (3 = the solution's text). */
  hints: number;
  /** How many Vérifier met each kind of error. */
  errors: Partial<Record<ErrorKind, number>>;
  /** How many Vérifier failed each blocking check, by id. */
  failed: Record<string, number>;
  /** How many Vérifier missed each notion check, by id. */
  missed?: Record<string, number>;
  /** Ended without success: started over, or the step changed. */
  closed?: boolean;
  /** In a Débogue: the hypothesis given before the first hint, and where the check pointed (`found`). */
  hypothesis?: { choice: string; found?: string };
}

export const ATTEMPT_LOG_VERSION = 1;

export interface AttemptLog {
  v: number;
  attempts: Attempt[];
}

/** A step left this long counts as a new attempt when it is tried again. */
export const ATTEMPT_GAP = 2 * 60 * 60 * 1000;

/** The oldest attempts are dropped beyond this many (about 200 bytes each). */
export const MAX_ATTEMPTS = 1500;

/** The help of the step when Vérifier was pressed. */
export interface HelpAtCheck {
  level: HelpLevel;
  hints: number;
  hypothesis?: { choice: string; found?: string };
}

/** True when this app can read and extend the log. */
export const readableLog = (log: AttemptLog | undefined): log is AttemptLog => !!log && log.v === ATTEMPT_LOG_VERSION;

/** Where an attempt was made: the lesson's own project, or a practice from scratch. */
export interface StepRef {
  lesson: string;
  practice?: boolean;
}

const sameStep = (a: Attempt, s: StepRef) => a.lesson === s.lesson && !!a.practice === !!s.practice;

/** Whether an attempt is over: passed, started over, or left for ATTEMPT_GAP. */
export const attemptOver = (a: Attempt, now: number) => a.passed || !!a.closed || now - a.end >= ATTEMPT_GAP;

/** The open attempt on a step, if the next Vérifier still belongs to it. */
function openIndex(attempts: Attempt[], step: StepRef, rev: number, now: number): number {
  for (let i = attempts.length - 1; i >= 0; i--) {
    const a = attempts[i];
    if (!sameStep(a, step)) continue;
    const open = !a.passed && !a.closed && a.rev === rev && now - a.end < ATTEMPT_GAP;
    return open ? i : -1;
  }
  return -1;
}

const count = (into: Record<string, number>, keys: string[]) => {
  for (const k of keys) into[k] = (into[k] ?? 0) + 1;
};

/**
 * The log once Vérifier was pressed on a step: added to its open attempt, or
 * as a new one. Unchanged when the log was written by a newer app.
 */
export function logCheck(
  log: AttemptLog | undefined,
  step: StepRef & { rev: number; wasDone: boolean },
  outcome: CheckOutcome,
  help: HelpAtCheck,
  now: number,
): AttemptLog | undefined {
  if (log && !readableLog(log)) return log;
  const attempts = [...(log?.attempts ?? [])];
  const i = openIndex(attempts, step, step.rev, now);
  const before: Attempt =
    i >= 0
      ? attempts[i]
      : { lesson: step.lesson, rev: step.rev, start: now, end: now, checks: 0, passed: false, help: 'alone', hints: 0, errors: {}, failed: {}, ...(step.wasDone ? { again: true } : {}), ...(step.practice ? { practice: true } : {}) };
  const errors = { ...before.errors };
  count(errors, outcome.errors);
  const failed = { ...before.failed };
  count(failed, outcome.failed);
  const missed = { ...before.missed };
  count(missed, outcome.missed);
  const after: Attempt = {
    ...before,
    end: now,
    checks: before.checks + 1,
    passed: outcome.passed,
    help: help.level,
    hints: help.hints,
    errors,
    failed,
    ...(Object.keys(missed).length ? { missed } : {}),
    ...(help.hypothesis && !before.hypothesis ? { hypothesis: { choice: help.hypothesis.choice, ...(help.hypothesis.found ? { found: help.hypothesis.found } : {}) } } : {}),
  };
  if (i >= 0) attempts[i] = after;
  else attempts.push(after);
  return { v: ATTEMPT_LOG_VERSION, attempts: attempts.slice(-MAX_ATTEMPTS) };
}

/** The log once a step is started over: its open attempt ends there, unfinished. */
export function closeAttempt(log: AttemptLog | undefined, step: StepRef): AttemptLog | undefined {
  if (!readableLog(log)) return log;
  for (let i = log.attempts.length - 1; i >= 0; i--) {
    const a = log.attempts[i];
    if (!sameStep(a, step)) continue;
    if (a.passed || a.closed) return log;
    const attempts = [...log.attempts];
    attempts[i] = { ...a, closed: true };
    return { ...log, attempts };
  }
  return log;
}

// ------------------------------------------------------------- validation

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const counts = (v: unknown) => isObj(v) && Object.values(v).every((n) => isNum(n) && n >= 0);
const optBool = (v: unknown) => v === undefined || typeof v === 'boolean';

/** Whether one logged attempt is well formed. */
export function isAttempt(v: unknown): v is Attempt {
  return (
    isObj(v) &&
    typeof v.lesson === 'string' &&
    isNum(v.rev) &&
    isNum(v.start) &&
    isNum(v.end) &&
    isNum(v.checks) &&
    typeof v.passed === 'boolean' &&
    optBool(v.again) &&
    optBool(v.practice) &&
    optBool(v.closed) &&
    HELP_LEVELS.includes(v.help as HelpLevel) &&
    isNum(v.hints) &&
    counts(v.errors) &&
    Object.keys(v.errors as Obj).every((k) => ERROR_KINDS.includes(k as ErrorKind)) &&
    counts(v.failed) &&
    (v.missed === undefined || counts(v.missed)) &&
    (v.hypothesis === undefined || (isObj(v.hypothesis) && typeof v.hypothesis.choice === 'string' && (v.hypothesis.found === undefined || typeof v.hypothesis.found === 'string')))
  );
}

/** What is wrong in a stored log (empty when nothing is). A newer log is not judged. */
export function checkLog(v: unknown): string[] {
  if (!isObj(v) || !isNum(v.v) || !Array.isArray(v.attempts)) return ['le journal des essais est mal formé'];
  if (v.v > ATTEMPT_LOG_VERSION) return [];
  if (v.v !== ATTEMPT_LOG_VERSION) return ['le journal des essais a une version inconnue'];
  const bad = v.attempts.filter((a) => !isAttempt(a)).length;
  return bad ? [`${bad} essai(s) mal formé(s) dans le journal`] : [];
}

/**
 * The usable part of a stored log: the well-formed attempts (a damaged line
 * does not cost the others). A log from a newer app is kept untouched.
 */
export function sanitizeLog(v: unknown): { log?: AttemptLog; complete: boolean } {
  if (!isObj(v) || !isNum(v.v) || !Array.isArray(v.attempts)) return { complete: false };
  if (v.v > ATTEMPT_LOG_VERSION) return { log: v as unknown as AttemptLog, complete: true };
  if (v.v !== ATTEMPT_LOG_VERSION) return { complete: false };
  const attempts = v.attempts.filter(isAttempt);
  return { log: { v: ATTEMPT_LOG_VERSION, attempts }, complete: attempts.length === v.attempts.length };
}
