/**
 * Runs a lesson's scenario on the learner's project, headless and fast,
 * then evaluates the checks. Same interpreter as Play.
 */
import { compileClass, type CompileMessage } from '../compiler/validate';
import type { Project } from '../model/project';
import { Simulation, STEP } from '../runtime/simulation';
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
}

export function runLesson(lesson: Lesson, project: Project): LessonRun {
  const compileErrors: CompileMessage[] = [];
  for (const cls of project.classes) {
    for (const m of compileClass(cls, project).messages) {
      if (m.severity === 'error') compileErrors.push({ ...m, text: `${cls.name} : ${m.text}` });
    }
  }
  if (compileErrors.length) return { compileErrors, results: [], passed: false, runtimeErrors: [], notes: [] };

  const sim = new Simulation(project);
  const cx: CheckContext = {
    sim,
    project,
    actor: (label) => sim.actors.find((a) => a.label === label),
    component: (label, name) => sim.actors.find((a) => a.label === label)?.components.find((c) => c.name === name),
    prints: () => sim.log.filter((l) => l.message !== undefined).map((l) => l.message!),
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
    compileErrors,
    results: ordered,
    passed: ordered.every((r) => r.ok),
    runtimeErrors,
    notes,
  };
}
