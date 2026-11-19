/**
 * Lot 4a of the path plan (V7.17): the Avancé as a brief. Step-by-step
 * cards wait for success, first hints are questions, and four new steps:
 * the universal lever, two mixed-practice steps, the synthesis S4.
 */
import { describe, expect, it } from 'vitest';
import { getLesson, LESSONS } from '../src/core/lessons';
import { edit } from '../src/core/lessons/builder';
import { cardsFor, PLAN_CARD_TITLES } from '../src/core/lessons/helpPolicy';
import { runLesson } from '../src/core/lessons/runner';
import type { Lesson } from '../src/core/lessons/types';
import type { Project } from '../src/core/model/project';
import { removeNodes } from '../src/core/operations/graphOps';

const lesson = (id: string) => getLesson(id)!;
const solved = (l: Lesson, tweak?: (p: Project) => void) => {
  const p = l.setup();
  l.solve(p);
  tweak?.(p);
  return p;
};
const failed = (l: Lesson, p: Project) =>
  runLesson(l, p)
    .results.filter((r) => !r.ok && !r.check.notion)
    .map((r) => r.check.id);

describe('the Avancé as a brief', () => {
  it('step-by-step cards wait for success in Avancé, not before', () => {
    const crate = lesson('l-caisse');
    expect(crate.cards.some((c) => c.title === 'Le plan')).toBe(true);
    expect(cardsFor(crate, false).shown.some((c) => PLAN_CARD_TITLES.has(c.title))).toBe(false);
    expect(cardsFor(crate, false).held).toBe(1);
    expect(cardsFor(crate, true).shown).toEqual(crate.cards);
    const confirmed = LESSONS.find((l) => l.level === 'confirme' && l.cards.some((c) => c.title === 'Le plan'))!;
    expect(cardsFor(confirmed, false).held).toBe(0);
  });

  it('every Avancé step keeps at least one card before success', () => {
    for (const l of LESSONS.filter((x) => x.level === 'avance')) expect(cardsFor(l, false).shown.length, l.id).toBeGreaterThan(0);
  });

  it('the first hint of every Avancé build or repair step asks where to look', () => {
    const plain = LESSONS.filter((l) => l.level === 'avance' && l.kind !== 'predict' && !l.hints[0].includes('?')).map((l) => l.id);
    expect(plain).toEqual([]);
  });

  it('the new steps sit in the Avancé, S4 last', () => {
    const avance = LESSONS.filter((l) => l.level === 'avance').map((l) => l.id);
    for (const id of ['l-levier-universel', 'm1-sas', 'm2-distributeur']) expect(avance, id).toContain(id);
    expect(avance[avance.length - 1]).toBe('s4-fusibles');
  });
});

describe('Le levier universel', () => {
  const l = lesson('l-levier-universel');

  it('a lever that holds a BP_Porte reference is not universal', () => {
    const p = solved(l, (p) => {
      edit(p, 'BP_Levier').variable('Porte', { category: 'object', subtype: 'BP_Porte' });
    });
    expect(failed(l, p)).toEqual(['universal']);
  });

  it('a single lever is not enough', () => {
    const p = solved(l, (p) => {
      const lever = p.classes.find((c) => c.name === 'BP_Levier')!;
      p.level.actors = p.level.actors.filter((a, i, all) => a.classId !== lever.id || all.findIndex((x) => x.classId === lever.id) === i);
    });
    expect(failed(l, p)).toContain('placed');
  });
});

describe('Le sas', () => {
  it('without « une seule fois », coming back restarts the airlock', () => {
    const l = lesson('m1-sas');
    const p = solved(l, (p) => {
      const b = edit(p, 'BP_Sas');
      const once = Object.values(b.graph.nodes).find((n) => n.def === 'flow.doOnce')!.id;
      const enter = Object.values(b.graph.nodes).find((n) => n.def === 'event.actorBeginOverlap')!.id;
      const tl = Object.values(b.graph.nodes).find((n) => n.def === 'timeline.node')!.id;
      removeNodes(b.graph, [once]);
      b.link(enter, 'then', tl, 'playFromStart');
    });
    expect(failed(l, p).length).toBeGreaterThan(0);
  });
});

describe('Les fusibles (S4)', () => {
  it('a fuse that trusts the player to have loaded first comes back in one of the two orders', () => {
    const l = lesson('s4-fusibles');
    const p = solved(l, (p) => {
      // The fuse reads the player's list instead of the save.
      const fuse = edit(p, 'BP_Fusible');
      const load = Object.values(fuse.graph.nodes).find((n) => n.def === 'save.fromSlot')!;
      const player = p.classes.find((c) => c.name === 'BP_Joueur')!;
      const mine = player.variables.find((v) => v.name === 'Fusibles')!.id;
      const cast = Object.values(fuse.graph.nodes).find((n) => n.def === 'cast.to' && n.config.class !== player.id)!;
      const has = Object.values(fuse.graph.nodes).find((n) => n.def === 'set.contains')!;
      const begin = Object.values(fuse.graph.nodes).find((n) => n.def === 'event.beginPlay')!;
      const br = Object.values(fuse.graph.nodes).find((n) => n.def === 'flow.branch')!;
      const saved = Object.values(fuse.graph.nodes).find((n) => n.def === 'var.getExternal' && n.config.owner !== player.id)!;
      removeNodes(fuse.graph, [load.id, cast.id, saved.id]);
      const pawn = fuse.node('actor.getPlayerPawn', {}, {}, [200, 300]);
      const castP = fuse.node('cast.to', { class: player.id }, {}, [400, 96]);
      const read = fuse.node('var.getExternal', { owner: player.id, variable: mine }, {}, [600, 320]);
      fuse.link(begin.id, 'then', castP, 'exec').link(pawn, 'result', castP, 'object').link(castP, 'then', br.id, 'exec').link(castP, 'as', read, 'target').link(read, 'value', has.id, 'set');
    });
    const run = runLesson(l, p);
    expect(run.compileErrors).toEqual([]);
    expect(run.results.filter((r) => !r.ok).map((r) => r.check.id)).toContain('resume');
  });
});
