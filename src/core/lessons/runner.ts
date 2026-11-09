/**
 * Runs a lesson's scenario on the learner's project, headless and fast,
 * then evaluates the checks. Same interpreter as Play.
 *
 * UE does not guarantee the order actors run BeginPlay (or Tick) in, so a
 * passing run is replayed with the order reversed: a solution that only works
 * in one order fails, with the reason.
 */
import { compileClass, type CompileMessage } from '../compiler/validate';
import type { Project } from '../model/project';
import { type ActorOrder, Simulation, STEP } from '../runtime/simulation';
import type { Check, CheckContext, Lesson } from './types';

export interface CheckResult {
  check: Check;
  ok: boolean;
  reason?: string;
}

export interface LessonRun {
  /** Compilation errors stop the run before the scenario. */
  compileErrors: CompileMessage[];
  results: CheckResult[];
  passed: boolean;
  runtimeErrors: string[];
  notes: string[];
  /** Everything printed during the scenario. */
  prints: string[];
}

export function runLesson(lesson: Lesson, project: Project): LessonRun {
  const compileErrors: CompileMessage[] = [];
  for (const cls of project.classes) {
    for (const m of compileClass(cls, project).messages) {
      if (m.severity === 'error') compileErrors.push({ ...m, text: `${cls.name} : ${m.text}` });
    }
  }
  if (compileErrors.length) return { compileErrors, results: [], passed: false, runtimeErrors: [], notes: [], prints: [] };

  const inOrder = playScenario(lesson, project, 'level');
  if (!inOrder.passed) return inOrder;
  const reversed = playScenario(lesson, project, 'reversed');
  if (reversed.passed) return inOrder;
  return { ...reversed, notes: [ORDER_NOTE, ...reversed.notes] };
}

/** Shown when a solution passes in level order only. */
export const ORDER_NOTE =
  'Ta solution marche quand les acteurs font leur BeginPlay dans l’ordre du niveau, mais pas dans l’ordre inverse. Dans UE cet ordre n’est pas garanti : un Blueprint ne doit pas compter sur le fait qu’un autre a déjà fait son BeginPlay.';

function playScenario(lesson: Lesson, source: Project, order: ActorOrder): LessonRun {
  const project = structuredClone(source);
  const sim = new Simulation(project, { order });
  const cx: CheckContext = {
    sim,
    project,
    actor: (label) => sim.actors.find((a) => a.label === label),
    component: (label, name) => sim.actors.find((a) => a.label === label)?.components.find((c) => c.name === name),
    prints: () => sim.log.filter((l) => l.message !== undefined).map((l) => l.message!),
    variable: (label, name) => {
      const a = label === 'Joueur' ? sim.player : sim.actors.find((x) => x.label === label);
      const cls = a?.classId ? project.classes.find((c) => c.id === a.classId) : undefined;
      const v = cls?.variables.find((x) => x.name === name);
      return a && v ? a.vars[v.id] : undefined;
    },
    nodes: (className) => Object.values(project.classes.find((c) => c.name === className)?.graphs.flatMap((g) => Object.values(g.nodes)) ?? []),
  };

  const results = new Map<string, CheckResult>();
  const evaluate = (at?: string) => {
    for (const check of lesson.checks) {
      if (check.at !== at || results.has(check.id)) continue;
      let out: true | string;
      try {
        out = check.test(cx);
      } catch (e) {
        out = `Vérification impossible : ${(e as Error).message}`;
      }
      results.set(check.id, out === true ? { check, ok: true } : { check, ok: false, reason: out });
    }
  };

  const notes: string[] = [];
  sim.start();
  for (const step of lesson.scenario) {
    if ('wait' in step) for (let t = 0; t < step.wait - 1e-9; t += STEP) sim.step();
    else if ('teleport' in step) {
      sim.teleportPlayer(step.teleport[0], step.teleport[1]);
      sim.step();
    } else if ('walk' in step) {
      sim.move = { x: step.walk[0], y: step.walk[1] };
      for (let t = 0; t < step.seconds - 1e-9; t += STEP) sim.step();
      sim.move = { x: 0, y: 0 };
    } else if ('press' in step) {
      if (sim.deafActors(step.press).length && !notes.length) {
        notes.push(
          'Un Blueprint a un événement de touche mais ne reçoit pas les entrées : active « Auto Receive Input » dans Class Settings.',
        );
      }
      sim.pressKey(step.press);
      sim.step();
    } else if ('release' in step) {
      sim.releaseKey(step.release);
      sim.step();
    } else evaluate(step.checkpoint);
  }
  evaluate(undefined);

  const ordered = lesson.checks.map((c) => results.get(c.id) ?? { check: c, ok: false, reason: 'Non vérifié.' });
  const runtimeErrors = sim.log.filter((l) => l.level === 'error').map((l) => l.text);
  return {
    compileErrors: [],
    results: ordered,
    passed: ordered.every((r) => r.ok),
    runtimeErrors,
    notes,
    prints: cx.prints(),
  };
}
