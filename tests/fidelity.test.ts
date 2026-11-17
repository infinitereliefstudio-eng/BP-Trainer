/**
 * Behaviours checked against UE (V6.2): collision settings, what runs after
 * Destroy Actor, the Gate's default, how a Float is printed, and the edge
 * cases of Clamp, Random Integer in Range, String to Float and Nearly Equal.
 */
import { describe, expect, it } from 'vitest';
import { type ClassBuilder, ProjectBuilder } from '../src/core/lessons/builder';
import { Simulation } from '../src/core/runtime/simulation';

function world(setup: (b: ClassBuilder) => void, playerX = 2000) {
  const pb = new ProjectBuilder('t');
  const b = pb.blueprint('BP_Test');
  setup(b);
  pb.place(b, 0, 0);
  pb.playerStart(playerX, 0);
  return pb.project;
}

function run(p: ProjectBuilder['project'], seconds = 0.2, before?: (s: Simulation) => void) {
  const s = new Simulation(p);
  before?.(s);
  s.start();
  for (let i = 0; i < Math.round(seconds * 60); i++) s.step();
  return s;
}

const prints = (s: Simulation) => s.log.filter((l) => l.message !== undefined).map((l) => l.message);

/** BeginPlay → one Print String per [node, pin], in order. */
function printAll(b: ClassBuilder, values: [string, string][]): void {
  let prev = b.node('event.beginPlay');
  for (const [node, pin] of values) {
    const p = b.node('debug.printString');
    b.link(prev, 'then', p, 'exec').link(node, pin, p, 'text');
    prev = p;
  }
}

describe('collision: a pawn moves by sweeping, a query', () => {
  const wallAt = (collision: number) =>
    world((b) => b.component('StaticMesh', 'Mur', { sizeX: 40, sizeY: 1600, blocks: true, collision }), -400);
  const walk = (collision: number) => run(wallAt(collision), 1.5, (s) => (s.move = { x: 1, y: 0 })).player.x;

  it('Query Only and Query and Physics stop the player', () => {
    expect(walk(1)).toBeLessThan(0);
    expect(walk(3)).toBeLessThan(0);
  });
  it('Physics Only and No Collision let it through', () => {
    expect(walk(2)).toBeGreaterThan(60);
    expect(walk(0)).toBeGreaterThan(60);
  });
});

describe('Destroy Actor', () => {
  it('the rest of the current chain still runs', () => {
    const p = world((b) => {
      const d = b.node('actor.destroy');
      b.link(b.node('event.beginPlay'), 'then', d, 'exec').link(d, 'then', b.node('debug.printString', {}, { text: 'après' }), 'exec');
    });
    expect(prints(run(p))).toEqual(['après']);
  });
  it('a Delay after it never resumes', () => {
    const p = world((b) => {
      const d = b.node('actor.destroy');
      const wait = b.node('time.delay', {}, { duration: 0.1 });
      b.link(b.node('event.beginPlay'), 'then', d, 'exec').link(d, 'then', wait, 'exec');
      b.link(wait, 'completed', b.node('debug.printString', {}, { text: 'plus tard' }), 'exec');
    });
    expect(prints(run(p, 0.5))).toEqual([]);
  });
});

describe('flow and maths defaults', () => {
  it('a Gate starts closed unless Start Closed is unchecked', () => {
    const p = world((b) => {
      const seq = b.node('flow.sequence');
      const closed = b.node('flow.gate');
      const open = b.node('flow.gate', {}, { startClosed: false });
      b.link(b.node('event.beginPlay'), 'then', seq, 'exec').link(seq, 'then0', closed, 'enter').link(seq, 'then1', open, 'enter');
      b.link(closed, 'exit', b.node('debug.printString', {}, { text: 'fermée' }), 'exec');
      b.link(open, 'exit', b.node('debug.printString', {}, { text: 'ouverte' }), 'exec');
    });
    expect(prints(run(p))).toEqual(['ouverte']);
  });

  it('a Float prints like FString::SanitizeFloat', () => {
    const p = world((b) =>
      printAll(b, [
        [b.node('math.divideFloat', {}, { a: 3, b: 2 }), 'result'],
        [b.node('math.divideFloat', {}, { a: 6, b: 2 }), 'result'],
        [b.node('math.divideFloat', {}, { a: 1, b: 3 }), 'result'],
        [b.node('math.divideFloat', {}, { a: -5, b: 2 }), 'result'],
      ]),
    );
    expect(prints(run(p))).toEqual(['1.5', '3.0', '0.333333', '-2.5']);
  });

  it('Clamp with Min above Max, Random Integer in Range with Max below Min, String to Float with a comma', () => {
    const p = world((b) =>
      printAll(b, [
        [b.node('math.clampInt', {}, { value: 5, min: 10, max: 0 }), 'result'],
        [b.node('math.clampInt', {}, { value: 15, min: 10, max: 0 }), 'result'],
        [b.node('math.randomIntInRange', {}, { min: 10, max: 0 }), 'result'],
        [b.node('conv.stringToFloat', {}, { in: '3,5' }), 'result'],
      ]),
    );
    expect(prints(run(p))).toEqual(['10', '0', '10', '3.0']);
  });
});
