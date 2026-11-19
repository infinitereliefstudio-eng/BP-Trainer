/**
 * Enhanced Input (V7.4): trigger states and events as UE computes them,
 * contexts and priorities, the input stack, the assets and their checks,
 * and the traps of the three new steps.
 */
import { describe, expect, it } from 'vitest';
import { compileClass } from '../src/core/compiler/validate';
import { edit } from '../src/core/lessons/builder';
import { debugMappingContext, lessonInputHold, lessonInputLamp } from '../src/core/lessons/library/enhancedInput';
import { runLesson } from '../src/core/lessons/runner';
import { createClass, createProject, type Project } from '../src/core/model/project';
import { addInputAction, addMapping, addMappingContext, removeInputAction } from '../src/core/operations/inputOps';
import { STEP, Simulation } from '../src/core/runtime/simulation';
import { type ActionEvent, EnhancedInput, transitionEvents } from '../src/core/runtime/enhancedInput';
import { parseProject, serializeProject } from '../src/core/serialization/serialize';

function assets(trigger?: { kind: 'Down' | 'Pressed' | 'Released' | 'Hold'; holdTime?: number; oneShot?: boolean }) {
  const p = createProject();
  p.classes.push(createClass('BP_A'));
  const a = addInputAction(p, 'IA_Test');
  const c = addMappingContext(p, 'IMC_Test');
  if (!a.ok || !c.ok) throw new Error('assets');
  addMapping(p, c.value.id, a.value.id, 'E');
  if (trigger) c.value.mappings[0].triggers = [trigger];
  return { p, action: a.value.id, context: c.value.id };
}

/** BeginPlay → Add Mapping Context, on the subsystem of Get Player Controller. */
function addAtBeginPlay(b: ReturnType<typeof edit>, context: string): void {
  const begin = b.node('event.beginPlay', {}, {}, [64, 96]);
  const add = b.node('input.addMappingContext', { context }, {}, [700, 96]);
  const pc = b.node('player.getController', {}, {}, [64, 260]);
  const sub = b.node('input.subsystem', {}, {}, [380, 260]);
  b.link(begin, 'then', add, 'exec').link(pc, 'result', sub, 'controller').link(sub, 'result', add, 'target');
}

/** Events of each frame, as "started+triggered", "" for none. */
function frames(input: EnhancedInput, p: Project, steps: ('press' | 'release' | 'hold')[]): string[] {
  return steps.map((s) => {
    if (s === 'press') input.press('E');
    if (s === 'release') input.release('E');
    return input
      .process(p, STEP)
      .map((f) => f.event)
      .join('+');
  });
}

describe('trigger states and events', () => {
  it('follows UE’s table of transitions', () => {
    const t = (a: Parameters<typeof transitionEvents>[0], b: Parameters<typeof transitionEvents>[1]) => transitionEvents(a, b);
    expect(t('None', 'Triggered')).toEqual<ActionEvent[]>(['started', 'triggered']);
    expect(t('None', 'Ongoing')).toEqual(['started']);
    expect(t('Ongoing', 'Ongoing')).toEqual(['ongoing']);
    expect(t('Ongoing', 'Triggered')).toEqual(['triggered']);
    expect(t('Ongoing', 'None')).toEqual(['canceled']);
    expect(t('Triggered', 'Triggered')).toEqual(['triggered']);
    expect(t('Triggered', 'None')).toEqual(['completed']);
    expect(t('None', 'None')).toEqual([]);
  });

  it('no trigger (Down): Triggered every frame while held, Completed at release', () => {
    const { p, context } = assets();
    const input = new EnhancedInput();
    input.addContext(context, 0);
    expect(frames(input, p, ['press', 'hold', 'hold', 'release', 'hold'])).toEqual(['started+triggered', 'triggered', 'triggered', 'completed', '']);
  });

  it('Pressed: once at the press, then Completed though the key is still held', () => {
    const { p, context } = assets({ kind: 'Pressed' });
    const input = new EnhancedInput();
    input.addContext(context, 0);
    expect(frames(input, p, ['press', 'hold', 'hold', 'release'])).toEqual(['started+triggered', 'completed', '', '']);
  });

  it('Released: Ongoing while held, Triggered at the release', () => {
    const { p, context } = assets({ kind: 'Released' });
    const input = new EnhancedInput();
    input.addContext(context, 0);
    expect(frames(input, p, ['press', 'hold', 'release', 'hold'])).toEqual(['started', 'ongoing', 'triggered', 'completed']);
  });

  it('Hold: Ongoing until the threshold, Canceled if released before', () => {
    const { p, context } = assets({ kind: 'Hold', holdTime: 3 * STEP, oneShot: true });
    const input = new EnhancedInput();
    input.addContext(context, 0);
    expect(frames(input, p, ['press', 'hold', 'release'])).toEqual(['started', 'ongoing', 'canceled']);
    expect(frames(input, p, ['press', 'hold', 'hold', 'hold', 'release'])).toEqual(['started', 'ongoing', 'triggered', 'completed', '']);
  });

  it('a tap shorter than a frame still counts', () => {
    const { p, context } = assets({ kind: 'Pressed' });
    const input = new EnhancedInput();
    input.addContext(context, 0);
    input.press('E');
    input.release('E');
    expect(input.process(p, STEP).map((f) => f.event)).toEqual(['started', 'triggered']);
  });

  it('nothing fires without an active context, nor after it is removed', () => {
    const { p, context } = assets();
    const input = new EnhancedInput();
    expect(frames(input, p, ['press', 'release'])).toEqual(['', '']);
    input.addContext(context, 0);
    input.removeContext(context);
    expect(frames(input, p, ['press', 'release'])).toEqual(['', '']);
  });

  it('a key used by a higher priority context is consumed for the lower ones', () => {
    const { p, context, action } = assets();
    const other = addInputAction(p, 'IA_Autre');
    const low = addMappingContext(p, 'IMC_Bas');
    if (!other.ok || !low.ok) throw new Error('assets');
    addMapping(p, low.value.id, other.value.id, 'E');
    const input = new EnhancedInput();
    input.addContext(low.value.id, 0);
    input.addContext(context, 1);
    input.press('E');
    expect(new Set(input.process(p, STEP).map((f) => f.action))).toEqual(new Set([action]));
  });
});

describe('Ignore All Pressed Keys Until Release (V7.23)', () => {
  /** IMC_Test (E → IA_Test) at 0, IMC_Haut (E → IA_Haut) to add above it. */
  function twoContexts() {
    const { p, context, action } = assets();
    const upper = addInputAction(p, 'IA_Haut');
    const high = addMappingContext(p, 'IMC_Haut');
    if (!upper.ok || !high.ok) throw new Error('assets');
    addMapping(p, high.value.id, upper.value.id, 'E');
    return { p, low: context, lowAction: action, high: high.value.id, highAction: upper.value.id };
  }
  const fired = (input: EnhancedInput, p: Project) => input.process(p, STEP).map((f) => `${f.action}:${f.event}`);

  it('a context added while E is held ignores E until it is released, and still keeps it from the context below', () => {
    const { p, low, lowAction, high, highAction } = twoContexts();
    const input = new EnhancedInput();
    input.addContext(low, 0, p);
    input.press('E');
    expect(fired(input, p)).toEqual([`${lowAction}:started`, `${lowAction}:triggered`]);
    input.addContext(high, 1, p);
    // E is still down: the new mapping waits, the lower one has lost the key.
    expect(fired(input, p)).toEqual([`${lowAction}:completed`]);
    expect(fired(input, p)).toEqual([]);
    input.release('E');
    expect(fired(input, p)).toEqual([]);
    input.press('E');
    expect(fired(input, p)).toEqual([`${highAction}:started`, `${highAction}:triggered`]);
  });

  it('unchecked, the held key reaches the new context at once', () => {
    const { p, low, high, highAction } = twoContexts();
    const input = new EnhancedInput();
    input.addContext(low, 0, p);
    input.press('E');
    fired(input, p);
    input.addContext(high, 1, p, false);
    expect(fired(input, p)).toContain(`${highAction}:started`);
  });

  it('removing a context makes the one below wait for the held key too', () => {
    const { p, low, lowAction, high } = twoContexts();
    const input = new EnhancedInput();
    input.addContext(low, 0, p);
    input.addContext(high, 1, p);
    input.press('E');
    fired(input, p);
    input.removeContext(high, p);
    expect(fired(input, p).filter((f) => f.startsWith(lowAction))).toEqual([]);
    input.release('E');
    fired(input, p);
    input.press('E');
    expect(fired(input, p)).toContain(`${lowAction}:started`);
  });

  it('a mapping already active is not affected: a held key keeps working', () => {
    const { p, low, lowAction } = twoContexts();
    const other = addInputAction(p, 'IA_F');
    const onlyF = addMappingContext(p, 'IMC_F');
    if (!other.ok || !onlyF.ok) throw new Error('assets');
    addMapping(p, onlyF.value.id, other.value.id, 'F');
    const input = new EnhancedInput();
    input.addContext(low, 0, p);
    input.press('E');
    fired(input, p);
    // A context that does not map E: E keeps its mapping, held, and keeps triggering.
    input.addContext(onlyF.value.id, 2, p);
    expect(fired(input, p)).toEqual([`${lowAction}:triggered`]);
  });
});

describe('in the simulation', () => {
  /** Two lamps listen to the same action, the context is added at BeginPlay. */
  function twoListeners(consume: boolean): Project {
    const { p, action, context } = assets();
    const lamp = createClass('BP_Lampe');
    lamp.autoReceiveInput = true;
    p.classes.push(lamp);
    const b = edit(p, 'BP_Lampe');
    const ev = b.node('input.action', { action, consumeInput: consume }, {}, [64, 96]);
    const say = b.node('debug.printString', {}, { text: 'reçu' }, [400, 96]);
    b.link(ev, 'started', say, 'exec');
    addAtBeginPlay(edit(p, 'BP_A'), context);
    p.level.actors.push(
      { id: 'a', classId: p.classes[0].id, name: 'BP_A', x: 0, y: 0, yaw: 0, overrides: {} },
      { id: 'l1', classId: lamp.id, name: 'BP_Lampe', x: 100, y: 0, yaw: 0, overrides: {} },
      { id: 'l2', classId: lamp.id, name: 'BP_Lampe2', x: 200, y: 0, yaw: 0, overrides: {} },
    );
    return p;
  }

  const received = (p: Project) => {
    const sim = new Simulation(p);
    sim.start();
    sim.step();
    sim.pressKey('E');
    sim.step();
    return sim.log.filter((l) => l.message === 'reçu').length;
  };

  it('the first actor of the input stack keeps the action (Consume Input), unless unchecked', () => {
    expect(received(twoListeners(true))).toBe(1);
    expect(received(twoListeners(false))).toBe(2);
  });

  it('gives Elapsed Seconds and Action Value to the event', () => {
    const { p, action, context } = assets();
    const a = edit(p, 'BP_A');
    a.cls.autoReceiveInput = true;
    addAtBeginPlay(a, context);
    const ev = a.node('input.action', { action }, {}, [64, 400]);
    const say = a.node('debug.printString', {}, {}, [400, 400]);
    a.link(ev, 'completed', say, 'exec').link(ev, 'elapsed', say, 'text');
    p.level.actors.push({ id: 'a', classId: a.cls.id, name: 'BP_A', x: 0, y: 0, yaw: 0, overrides: {} });
    const sim = new Simulation(p);
    sim.start();
    sim.pressKey('E');
    for (let i = 0; i < 59; i++) sim.step();
    sim.releaseKey('E');
    sim.step();
    expect(Number(sim.log.find((l) => l.message !== undefined)?.message)).toBeCloseTo(1, 1);
  });
});

describe('assets', () => {
  it('a project of format 8 opens with no Enhanced Input assets', () => {
    const p = createProject();
    p.classes.push(createClass('BP_A'));
    const file = JSON.parse(serializeProject(p));
    file.format = 8;
    delete file.project.inputActions;
    delete file.project.mappingContexts;
    const back = parseProject(JSON.stringify(file));
    expect(back.inputActions).toEqual([]);
    expect(back.mappingContexts).toEqual([]);
  });

  it('refuses a mapping with an unknown key or trigger', () => {
    const { p } = assets();
    (p.mappingContexts[0].mappings[0] as { key: string }).key = 'Q';
    expect(() => parseProject(serializeProject(p))).toThrow(/mal formée/);
    const other = assets();
    (other.p.mappingContexts[0].mappings[0].triggers as unknown[]) = [{ kind: 'Tap' }];
    expect(() => parseProject(serializeProject(other.p))).toThrow(/déclencheur/);
  });

  it('an action still used cannot be deleted, as in UE', () => {
    const { p, action } = assets();
    expect(removeInputAction(p, action).ok).toBe(false);
  });

  it('Compile asks to choose the action or the context', () => {
    const p = createProject();
    p.classes.push(createClass('BP_A'));
    const a = edit(p, 'BP_A');
    a.node('input.action', { action: '' }, {}, [64, 96]);
    const msgs = compileClass(a.cls, p).messages.map((m) => m.text).join(' ');
    expect(msgs).toMatch(/Input Action/);
  });
});

describe('the traps of the three steps', () => {
  it('La lampe : Triggered without trigger makes the lamp flicker, and the reason says why', () => {
    const p = lessonInputLamp.setup();
    lessonInputLamp.solve(p);
    const g = edit(p, 'BP_Lampe').graph;
    const link = Object.values(g.links).find((l) => l.from.pin === 'started')!;
    link.from.pin = 'triggered';
    const run = runLesson(lessonInputLamp, p);
    expect(run.passed).toBe(false);
    expect(run.results.find((r) => !r.ok)?.reason).toMatch(/Started/);
  });

  it('La lampe : Triggered with the Pressed trigger works too', () => {
    const p = lessonInputLamp.setup();
    lessonInputLamp.solve(p);
    const g = edit(p, 'BP_Lampe').graph;
    Object.values(g.links).find((l) => l.from.pin === 'started')!.from.pin = 'triggered';
    p.mappingContexts[0].mappings[0].triggers = [{ kind: 'Pressed' }];
    expect(runLesson(lessonInputLamp, p).passed).toBe(true);
  });

  it('La lampe : keeping the old E event as well fails', () => {
    const p = lessonInputLamp.setup();
    expect(runLesson(lessonInputLamp, p).results.find((r) => r.check.id === 'no-key')?.ok).toBe(false);
  });

  it('D20 : the starting project compiles, prints no error and does nothing', () => {
    const run = runLesson(debugMappingContext, debugMappingContext.setup());
    expect(run.compileErrors).toEqual([]);
    expect(run.runtimeErrors).toEqual([]);
    expect(run.passed).toBe(false);
  });

  it('Maintenir : without the Hold trigger, a short press opens the door', () => {
    const p = lessonInputHold.setup();
    lessonInputHold.solve(p);
    p.mappingContexts[0].mappings[0].triggers = [];
    const run = runLesson(lessonInputHold, p);
    expect(run.results.find((r) => r.check.id === 'short-closed')?.ok).toBe(false);
  });
});
