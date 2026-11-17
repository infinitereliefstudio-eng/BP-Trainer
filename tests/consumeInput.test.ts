import { describe, expect, it } from 'vitest';
import { getLesson } from '../src/core/lessons';
import { ProjectBuilder } from '../src/core/lessons/builder';
import { editable, getVar, nodeOf, override } from '../src/core/lessons/library/kit';
import { T } from '../src/core/types/pins';
import { runLesson } from '../src/core/lessons/runner';
import { setPlayerClass } from '../src/core/operations/projectOps';
import { Simulation } from '../src/core/runtime/simulation';

const prints = (s: Simulation) => s.log.filter((l) => l.message !== undefined).map((l) => l.message);

/** Two placed "BP_Lampe" that print their label on E, and optionally a player Blueprint that prints too. */
function project(opts: { consume?: boolean; player?: boolean; wired?: boolean } = {}) {
  const pb = new ProjectBuilder('t');
  const b = pb.blueprint('BP_Lampe');
  b.cls.autoReceiveInput = true;
  const key = b.node('event.inputKey', opts.consume === undefined ? { key: 'E' } : { key: 'E', consumeInput: opts.consume }, {}, [0, 0]);
  const say = b.node('debug.printString', {}, {}, [300, 0]);
  if (opts.wired !== false) b.link(key, 'pressed', say, 'exec');
  const nom = editable(b, 'Nom', T.string, '');
  b.link(getVar(b, 'Nom', [100, 200]), 'value', say, 'text');
  override(pb, pb.place(b, 0, 0), nom, 'BP_Lampe');
  override(pb, pb.place(b, 200, 0), nom, 'BP_Lampe2');
  if (opts.player) {
    const pl = pb.blueprint('BP_Joueur', 'Pawn');
    setPlayerClass(pb.project, pl.cls.id);
    pl.link(pl.node('event.inputKey', { key: 'E', consumeInput: false }, {}, [0, 0]), 'pressed', pl.node('debug.printString', {}, { text: 'Joueur' }, [300, 0]), 'exec');
  }
  return pb.project;
}

const press = (p: ReturnType<typeof project>) => {
  const sim = new Simulation(p);
  sim.pressKey('E');
  sim.step(1 / 60);
  return prints(sim);
};

describe('Consume Input', () => {
  it('is checked by default: only the last placed actor hears the key', () => {
    expect(press(project())).toEqual(['BP_Lampe2']);
  });

  it('unchecked, the key goes down the stack: last placed first', () => {
    expect(press(project({ consume: false }))).toEqual(['BP_Lampe2', 'BP_Lampe']);
  });

  it('the possessed pawn is at the bottom of the stack', () => {
    expect(press(project({ player: true }))).toEqual(['BP_Lampe2']);
    expect(press(project({ player: true, consume: false }))).toEqual(['BP_Lampe2', 'BP_Lampe', 'Joueur']);
  });

  it('an event whose Pressed is not wired does not keep the key', () => {
    const p = project({ wired: false, player: true });
    expect(press(p)).toEqual(['Joueur']);
  });

  it('old projects (no setting) behave as checked', () => {
    const p = project();
    for (const n of Object.values(p.classes[0].graphs[0].nodes)) if (n.def === 'event.inputKey') delete n.config.consumeInput;
    expect(press(p)).toEqual(['BP_Lampe2']);
  });

  it('D19: the buggy doors fail at the first door, the fix passes', () => {
    const lesson = getLesson('d19-derniere-porte')!;
    const run = runLesson(lesson, lesson.setup());
    expect(run.results.filter((r) => !r.ok).map((r) => r.check.id)).toEqual(['first']);
  });

  it('a lesson tells which actor kept the key', () => {
    const lesson = getLesson('l-etats-porte')!;
    const p = lesson.setup();
    lesson.solve(p);
    const door = p.classes.find((c) => c.name === 'BP_Porte')!;
    door.graphs[0].nodes[nodeOf(door.graphs[0], 'event.inputKey')].config.consumeInput = true;
    const run = runLesson(lesson, p);
    expect(run.passed).toBe(false);
    expect(run.notes.join(' ')).toContain('Consume Input');
  });
});
