/**
 * Runs a lesson's scenario on the learner's project, headless and fast,
 * then evaluates the checks. Same interpreter as Play.
 *
 * UE does not guarantee the order actors run BeginPlay (or Tick) in, so a
 * passing run is replayed with the order reversed: a solution that only works
 * in one order fails, with the reason. It is replayed once more with each key
 * held a moment, as a finger does (the scenario presses and releases within
 * one frame): a solution that only works with instant presses fails too.
 */
import { runMilestones } from './milestones';
import { compileClass, type CompileMessage } from '../compiler/validate';
import { defaultLevel, findLevelByName, type Project } from '../model/project';
import { Game } from '../runtime/game';
import { type ActorOrder, Simulation, STEP } from '../runtime/simulation';
import type { Check, CheckContext, Lesson, RobustnessCase, ScenarioStep } from './types';

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
  /** The run reported, for "why did this node not run?" after a check. */
  sim?: Simulation;
}

export function runLesson(lesson: Lesson, project: Project): LessonRun {
  // A project in milestones: each one up to the open one, in order (V7.65).
  if (lesson.milestones) return runMilestones(lesson, project, runLesson).run;
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
  if (!reversed.passed) return { ...reversed, notes: [ORDER_NOTE, ...reversed.notes] };
  if (lesson.kind === 'predict') return inOrder;
  const scenario = heldTaps(lesson.scenario);
  if (scenario === lesson.scenario) return inOrder;
  const held = playScenario({ ...lesson, scenario }, project, 'level');
  return held.passed ? inOrder : { ...held, notes: [HOLD_NOTE, ...held.notes] };
}

/** How long a finger holds a key, in seconds. */
export const HOLD_SECONDS = 0.1;

/**
 * The scenario with each tap (a press, then the release of the same key) held
 * HOLD_SECONDS. When a wait follows the tap, the hold is taken from it, so
 * that the scenario keeps its timing. Returns the same array when there is no
 * tap.
 */
export function heldTaps(scenario: ScenarioStep[]): ScenarioStep[] {
  const out: ScenarioStep[] = [];
  let changed = false;
  for (let i = 0; i < scenario.length; i++) {
    const s = scenario[i];
    const release = scenario[i + 1];
    if (!('press' in s) || !release || !('release' in release) || release.release !== s.press) {
      out.push(s);
      continue;
    }
    out.push(s, { wait: HOLD_SECONDS }, release);
    const after = scenario[i + 2];
    if (after && 'wait' in after && after.wait >= HOLD_SECONDS - 1e-9) {
      out.push({ wait: after.wait - HOLD_SECONDS });
      i += 2;
    } else i += 1;
    changed = true;
  }
  return changed ? out : scenario;
}

/** Shown when a solution passes with instant presses only. */
export const HOLD_NOTE =
  'Ta solution marche quand la touche est relâchée aussitôt, mais pas quand on la tient un instant, comme avec le doigt (0,1 s). Souvent : Triggered, sans déclencheur, se répète à chaque image tant que la touche est tenue ; Started ne part qu’une fois par appui.';

/** Shown when a solution passes in level order only. */
export const ORDER_NOTE =
  'Ta solution marche quand les acteurs font leur BeginPlay dans l’ordre du niveau, mais pas dans l’ordre inverse. Dans UE cet ordre n’est pas garanti : un Blueprint ne doit pas compter sur le fait qu’un autre a déjà fait son BeginPlay.';

function playScenario(lesson: Pick<Lesson, 'scenario' | 'checks' | 'slots' | 'kind'>, source: Project, order: ActorOrder): LessonRun {
  const project = structuredClone(source);
  // The slots are those of the lesson, shared by every game of the scenario (restart keeps them).
  const slots = lesson.slots?.() ?? {};
  // The game starts in the Game Default Map, whatever level the editor shows (a packaged game, not Play In Editor).
  const levelId = defaultLevel(project).id;
  // A game, as Play makes one: Open Level replaces its world (`game.world`), the Output Log stays.
  let game = new Game(project, { order, slots, levelId, logTexts: true });
  // Prints and errors of the games before a restart.
  const earlier: { prints: string[]; shown: string[]; errors: string[] } = { prints: [], shown: [], errors: [] };
  const cx: CheckContext = {
    get sim() {
      return game.world;
    },
    level: () => game.level.name,
    levels: () => [...game.visited],
    gameInstance: (name) => {
      const gi = game.gameInstance;
      const v = gi.classId ? game.world.classOf(gi)?.variables.find((x) => x.name === name) : undefined;
      return v ? gi.vars[v.id] : undefined;
    },
    quitted: () => game.quitted,
    project,
    actor: (label) => game.world.actors.find((a) => a.label === label),
    component: (label, name) => game.world.actors.find((a) => a.label === label)?.components.find((c) => c.name === name),
    prints: () => [...earlier.prints, ...game.world.log.filter((l) => l.message !== undefined).map((l) => l.message!)],
    shown: () => [...earlier.shown, ...game.world.umg.shownTexts()],
    errors: () => [...earlier.errors, ...game.world.log.filter((l) => l.level === 'error').map((l) => l.text)],
    variable: (label, name) => {
      const a = label === 'Joueur' ? game.world.player : game.world.actors.find((x) => x.label === label);
      const cls = a ? game.world.classOf(a) : undefined;
      const v = cls?.variables.find((x) => x.name === name);
      return a && v ? a.vars[v.id] : undefined;
    },
    nodes: (className) => Object.values(project.classes.find((c) => c.name === className)?.graphs.flatMap((g) => Object.values(g.nodes)) ?? []),
    preview: () => {
      preview ??= new Simulation(structuredClone(source), { levelId });
      return preview;
    },
  };
  let preview: Simulation | undefined;

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
  game.start();
  let dt = STEP;
  // After "Infinite loop detected" (or an infinite recursion) the rest of the scenario is not played: every further event
  // would run to the step limit again, seconds each on a phone. Checkpoints are still evaluated.
  let seen = 0;
  let runaway = false;
  const ranAway = () => {
    for (; seen < game.world.log.length; seen++) if (game.world.log[seen].level === 'error' && (game.world.log[seen].text.includes('Infinite loop detected') || game.world.log[seen].text.includes('Infinite script recursion'))) return true;
    return false;
  };
  for (const step of lesson.scenario) {
    // An Open Level of the last frame travels before anything else happens, as at the start of UE's next frame.
    game.settle();
    if ('checkpoint' in step) {
      evaluate(step.checkpoint);
      continue;
    }
    if (runaway) continue;
    if ('restart' in step) {
      // Stop, then Play: the game closes first, as Stop does (End Play, then the GameInstance's Event Shutdown).
      game.shutdown();
      earlier.prints = cx.prints();
      earlier.shown = cx.shown();
      earlier.errors.push(...game.world.log.filter((l) => l.level === 'error').map((l) => l.text));
      const into = step.level ? findLevelByName(project, step.level)?.id : undefined;
      game = new Game(project, { order, slots, levelId: into ?? levelId, logTexts: true });
      game.start();
      seen = 0;
    } else if ('fps' in step) dt = 1 / step.fps;
    else if ('look' in step) game.world.player.yaw = step.look;
    else if ('wait' in step) for (let t = 0; t < step.wait - 1e-9; t += dt) game.step(dt);
    else if ('teleport' in step) {
      game.world.teleportPlayer(step.teleport[0], step.teleport[1]);
      game.step(dt);
    } else if ('walk' in step) {
      game.move = { x: step.walk[0], y: step.walk[1] };
      for (let t = 0; t < step.seconds - 1e-9; t += dt) game.step(dt);
      game.move = { x: 0, y: 0 };
    } else if ('press' in step) {
      if (game.world.deafActors(step.press).length && !notes.length) {
        notes.push(
          'Un Blueprint a un événement de touche mais ne reçoit pas les entrées : active « Auto Receive Input » dans Class Settings.',
        );
      }
      const kept = lesson.kind === 'debug' ? undefined : game.world.keyKeptFrom(step.press);
      const keyNote = 'Consume Input';
      if (kept && !notes.some((n) => n.includes(keyNote))) {
        const name = step.press === 'SpaceBar' ? 'Espace' : step.press;
        notes.push(
          `${kept.by.label} garde la touche ${name} (${keyNote} coché dans le Details de son événement) : ${kept.missed.map((a) => a.label).join(', ')} ne la ${kept.missed.length > 1 ? 'reçoivent' : 'reçoit'} pas. Si plusieurs acteurs doivent l’entendre, décoche ${keyNote}.`,
        );
      }
      game.world.pressKey(step.press);
      game.step(dt);
    } else if ('release' in step) {
      game.world.releaseKey(step.release);
      game.step(dt);
    } else if ('click' in step) {
      const [widget, button] = step.click.split('/');
      game.world.tapButton(widget, button, step.nth);
      game.step(dt);
    }
    runaway = ranAway();
  }
  game.settle();
  evaluate(undefined);

  const ordered = lesson.checks.map((c) => results.get(c.id) ?? { check: c, ok: false, reason: 'Non vérifié.' });
  const runtimeErrors = [...earlier.errors, ...game.world.log.filter((l) => l.level === 'error').map((l) => l.text)];
  return {
    compileErrors: [],
    results: ordered,
    // A notion check is advice: the lesson is passed when the behaviour is right.
    passed: ordered.every((r) => r.ok || !!r.check.notion),
    runtimeErrors,
    notes,
    prints: cx.prints(),
    sim: game.world,
  };
}

export interface RobustnessResult {
  case: RobustnessCase;
  ok: boolean;
  /** Why it does not hold, when it fails. */
  reason?: string;
}

/**
 * Once a lesson is passed: does the same solution hold in situations the
 * lesson did not ask for? Each case is played in both actor orders.
 */
export function runRobustness(lesson: Lesson, project: Project): RobustnessResult[] {
  return (lesson.robustness ?? []).map((c) => {
    const p = structuredClone(project);
    c.mutate?.(p);
    for (const order of ['level', 'reversed'] as const) {
      const bad = playScenario({ ...c, slots: lesson.slots }, p, order).results.find((r) => !r.ok);
      if (bad) return { case: c, ok: false, reason: bad.reason };
    }
    return { case: c, ok: true };
  });
}
